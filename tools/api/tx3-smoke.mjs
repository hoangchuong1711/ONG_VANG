import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const base = (process.env.API_BASE_URL || 'http://127.0.0.1:18081').replace(/\/$/, '');
const health = await (await fetch(base + '/api/health')).json();
assert.equal(health.databaseName, 'mini_ong_vang_test', 'TX3 smoke requires isolated test DB');
let checks = 0;

function session() {
  let cookie = '', csrf = '';
  return {
    async call(path, body, status = 200, code, headers = {}) {
      const response = await fetch(base + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      for (const item of response.headers.getSetCookie())
        if (item.startsWith('JSESSIONID=')) cookie = item.split(';')[0];
      const data = await response.json();
      assert.equal(response.status, status, `${path}: ${JSON.stringify(data)}`);
      if (code) assert.equal(data.code, code);
      checks++;
      return data;
    },
    async csrf() { csrf = (await this.call('/api/auth/csrf')).csrfToken; },
  };
}

const customer = session();
await customer.csrf();
const username = `0${String(Math.floor(100000000 + Math.random() * 900000000))}`;
const password = randomUUID();
await customer.call('/api/auth/register', { hoTen: 'TX3 test customer', soDienThoai: username, password, email: `${username}@example.test` }, 201);
const account = await customer.call('/api/auth/login', { username, password });
await customer.csrf();

const input = {
  diemLayHang: 'Điểm mẫu A', diemGiaoHang: 'Điểm mẫu B',
  kienHang: [{ loaiHangHoa: 'Tài liệu', khoiLuongKg: '1.00' }],
  benThanhToan: 'NGUOI_DAT', phuongThucThanhToan: 'TIEN_MAT',
};
const light = await customer.call('/api/quotes', input);
assert.equal(light.loTrinh.nguon, 'FAKE');
assert.equal(light.cuoc.cuocKhoiLuong, '0.00');
assert.equal(light.cuoc.tongKhoiLuongKg, '1.00');
const heavyInput = { ...input, kienHang: [{ ...input.kienHang[0], khoiLuongKg: '2.00' }] };
const heavy = await customer.call('/api/quotes', heavyInput);
assert.equal(Number(heavy.cuoc.cuocKhoiLuong) - Number(light.cuoc.cuocKhoiLuong), 3000);
await customer.call('/api/quotes', { ...input, kienHang: [{ ...input.kienHang[0], khoiLuongKg: '30.00' }] });
await customer.call('/api/quotes', { ...input, kienHang: [{ ...input.kienHang[0], khoiLuongKg: '30.01' }] }, 422, 'WEIGHT_LIMIT_EXCEEDED');
await customer.call('/api/quotes', { ...input, diemGiaoHang: 'Địa chỉ không có trong fixture' }, 422, 'ADDRESS_NOT_FOUND');
await customer.call('/api/quotes', { ...input, diemGiaoHang: 'Hà Nội' }, 422, 'OUT_OF_SERVICE_AREA');

const orderInput = { ...input, maBaoGia: light.maBaoGia, tenNguoiNhan: 'Người nhận TX3', sdtNguoiNhan: '0901234567' };
await customer.call('/api/orders', { ...orderInput, benThanhToan: 'NGUOI_NHAN' }, 409, 'QUOTE_CHANGED', { 'Idempotency-Key': randomUUID() });
await customer.call('/api/orders', { ...orderInput, phuongThucThanhToan: 'VNPAY_QR' }, 409, 'QUOTE_CHANGED', { 'Idempotency-Key': randomUUID() });
await customer.call('/api/orders', { ...orderInput, diemLayHang: 'Quận 1' }, 409, 'QUOTE_CHANGED', { 'Idempotency-Key': randomUUID() });
await customer.call('/api/orders', { ...orderInput, kienHang: heavyInput.kienHang }, 409, 'QUOTE_CHANGED', { 'Idempotency-Key': randomUUID() });
const key = randomUUID();
const created = await customer.call('/api/orders', orderInput, 201, undefined, { 'Idempotency-Key': key });
assert.equal(created.trangThai, 'CHO_GAN');
assert.equal(created.tenNguoiNhan, 'Người nhận TX3');
assert.equal(created.cuoc.tongCuoc, light.cuoc.tongCuoc);
assert.deepEqual(await customer.call('/api/orders', orderInput, 201, undefined, { 'Idempotency-Key': key }), created);
const ownList = await customer.call('/api/orders?size=100');
assert(ownList.items.some(item => item.maDon === created.maDon));
const detail = await customer.call(`/api/orders/${created.maDon}`);
assert.equal(detail.nhatKy[0].loaiSuKien, 'TAO_DON');

if (process.env.TX3_DEMO_PASSWORD) {
  const dispatcher = session();
  await dispatcher.csrf();
  await dispatcher.call('/api/auth/login', { username: 'demo_dispatcher', password: process.env.TX3_DEMO_PASSWORD });
  await dispatcher.csrf();
  const customerPage = await dispatcher.call(`/api/customers?q=${username}`);
  assert.equal(customerPage.items[0].maKh, account.maKh);
  const hotlineQuote = await dispatcher.call('/api/quotes', { ...heavyInput, maKh: account.maKh });
  const hotline = await dispatcher.call('/api/orders', {
    ...heavyInput, maKh: account.maKh, maBaoGia: hotlineQuote.maBaoGia,
    tenNguoiNhan: 'Người nhận hotline', sdtNguoiNhan: '0901234567',
  }, 201, undefined, { 'Idempotency-Key': randomUUID() });
  assert.equal(hotline.maKh, account.maKh);
  assert.notEqual(hotline.maTkTao, created.maTkTao);
  const dispatcherList = await dispatcher.call('/api/orders?trangThai=CHO_GAN&size=100');
  assert(dispatcherList.items.some(item => item.maDon === created.maDon));
  assert(dispatcherList.items.some(item => item.maDon === hotline.maDon));
  const refreshedOwnList = await customer.call('/api/orders?size=100');
  assert(refreshedOwnList.items.some(item => item.maDon === hotline.maDon));
}

if (process.env.TX3_DB_TESTS === '1') {
  const sqlContainer = process.env.TX3_SQL_CONTAINER || 'mini-ong-vang-tx3-sqlserver-1';
  function sql(command) {
    try {
      execFileSync('docker', ['exec', sqlContainer, 'sh', '-c',
        '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$SQLCMDPASSWORD" -C -b -d mini_ong_vang_test -Q "$1"',
        'tx3', command], { stdio: 'pipe' });
    } catch (failure) { throw new Error(failure.stdout?.toString('utf8') || failure.message); }
  }
  const expiring = await customer.call('/api/quotes', input);
  assert.match(expiring.maBaoGia, /^[a-f0-9-]{36}$/i);
  sql(`UPDATE dbo.bao_gia SET tao_luc=DATEADD(second,-301,SYSUTCDATETIME()),
    het_han_luc=DATEADD(second,-1,SYSUTCDATETIME()) WHERE ma_bao_gia='${expiring.maBaoGia}'`);
  await customer.call('/api/orders', { ...orderInput, maBaoGia: expiring.maBaoGia },
    409, 'QUOTE_EXPIRED', { 'Idempotency-Key': randomUUID() });

  if (process.env.TX3_DEMO_PASSWORD) {
    sql("UPDATE dbo.khach_hang SET thanh_vien_den=DATEADD(day,-1,SYSUTCDATETIME()) WHERE ma_kh='KH-DEMO-2'");
    const vip = session();
    await vip.csrf();
    await vip.call('/api/auth/login', { username: '0900000002', password: process.env.TX3_DEMO_PASSWORD });
    await vip.csrf();
    const expired = await vip.call('/api/quotes', input);
    assert.equal(expired.cuoc.tienGiamGia, '0.00');
    assert.equal(expired.hangThanhVien.conHieuLuc, false);
  }

  const oldPrice = await customer.call('/api/quotes', input);
  const zeroId = `CUOC-TX3-ZERO-${randomUUID().slice(0, 8)}`;
  sql(`DECLARE @cut datetime2=DATEADD(second,5,SYSUTCDATETIME());
    UPDATE dbo.cau_hinh_cuoc SET hieu_luc_den=@cut WHERE ma_bieu_phi='CUOC-DEMO-1';
    UPDATE dbo.cau_hinh_phu_thu SET hieu_luc_den=@cut WHERE ma_phu_thu='PHU-DEMO-1';
    INSERT INTO dbo.cau_hinh_cuoc(ma_bieu_phi,ten_bieu_phi,cuoc_co_ban,don_gia_km,
      km_toi_thieu,km_toi_da,hieu_luc_tu,hieu_luc_den,trang_thai,phien_ban,kg_bao_gom,don_gia_kg,kg_toi_da)
    VALUES ('${zeroId}',N'TX3 miễn cước',0,0,0,30,@cut,NULL,N'CONG_BO',2,1,0,30);`);
  await new Promise(resolve => setTimeout(resolve, 5500));
  await customer.call('/api/orders', { ...orderInput, maBaoGia: oldPrice.maBaoGia },
    409, 'QUOTE_CHANGED', { 'Idempotency-Key': randomUUID() });
  const free = await customer.call('/api/quotes', input);
  assert.equal(free.cuoc.tongCuoc, '0.00');
  assert.equal(free.cuoc.phienBanBieuPhi, 2);
  const freeOrder = await customer.call('/api/orders', { ...orderInput, maBaoGia: free.maBaoGia },
    201, undefined, { 'Idempotency-Key': randomUUID() });
  assert.equal(freeOrder.thanhToan.trangThai, 'MIEN_CUOC');
}

console.log(`PASS: ${checks} TX3 HTTP checks against isolated DB.`);
