import assert from 'node:assert/strict';
import { createHmac, randomInt, randomUUID } from 'node:crypto';

const base = (process.env.API_BASE_URL || 'http://127.0.0.1:18081').replace(/\/$/, '');
const health = await (await fetch(base + '/api/health')).json();
assert.equal(health.databaseName, 'mini_ong_vang_test', 'Payment smoke requires the isolated test DB');
assert(process.env.DEMO_PASSWORD, 'Set DEMO_PASSWORD for seeded dispatcher and driver');
let checks = 0;

class Client {
  cookie = ''; csrf = '';
  async call(path, body, expected = 200, code, headers = {}) {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Cookie: this.cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': this.csrf, ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20000)
    });
    for (const cookie of response.headers.getSetCookie())
      if (cookie.startsWith('JSESSIONID=')) this.cookie = cookie.split(';')[0];
    const result = await response.json();
    assert.equal(response.status, expected, `${path}: ${JSON.stringify(result)}`);
    if (code) assert.equal(result.code, code);
    checks++; return result;
  }
  async login(username, password) {
    this.csrf = (await this.call('/api/auth/csrf')).csrfToken;
    await this.call('/api/auth/login', { username, password });
    this.csrf = (await this.call('/api/auth/csrf')).csrfToken;
  }
}

const customer = new Client(), dispatcher = new Client(), driver = new Client(), other = new Client();
customer.csrf = (await customer.call('/api/auth/csrf')).csrfToken;
const username = '0' + randomInt(100000000, 999999999), password = randomUUID();
await customer.call('/api/auth/register', { hoTen: 'T14 HTTP test', soDienThoai: username, password, email: `${username}@example.test` }, 201);
await customer.login(username, password);
await dispatcher.login('demo_dispatcher', process.env.DEMO_PASSWORD);
await driver.login('0800000001', process.env.DEMO_PASSWORD);
await other.login('0800000002', process.env.DEMO_PASSWORD);

const input = { diemLayHang: 'Điểm mẫu A', diemGiaoHang: 'Điểm mẫu B',
  kienHang: [{ loaiHangHoa: 'Hoa', khoiLuongKg: '1.00' }] };
const quote = await customer.call('/api/quotes', input);
const order = await customer.call('/api/orders', { ...input, maBaoGia: quote.maBaoGia,
  sdtNguoiNhan: '0901234567' }, 201, undefined, { 'Idempotency-Key': randomUUID() });
const path = '/api/orders/' + order.maDon;
const request = { phuongThuc: 'TIEN_MAT' }, key = randomUUID();
await customer.call(path + '/payments', request, 403, 'FORBIDDEN', { 'Idempotency-Key': key });
await dispatcher.call(path + '/assignments', { maTx: 'TX-DEMO-1' });
await driver.call(path + '/payments', request, 409, 'PAYMENT_MILESTONE_REQUIRED', { 'Idempotency-Key': key });
await driver.call(path + '/transitions', { trangThai: 'DA_LAY_HANG' });
await driver.call(path + '/transitions', { trangThai: 'DANG_GIAO' }, 409, 'PAYMENT_REQUIRED');
const payment = await driver.call(path + '/payments', request, 201, undefined, { 'Idempotency-Key': key });
assert.equal(payment.trangThai, 'CHO_XU_LY');
assert.equal((await driver.call(path + '/payments', request, 201, undefined,
  { 'Idempotency-Key': key })).maGiaoDich, payment.maGiaoDich);
await driver.call(path + '/payments', request, 409, 'PAYMENT_PENDING',
  { 'Idempotency-Key': randomUUID() });
assert.equal((await customer.call(path + '/payments')).totalElements, 1);
await customer.call('/api/payments/' + payment.maGiaoDich + '/confirm-cash',
  { soTienDaThu: payment.soTien }, 403, 'FORBIDDEN');
await other.call('/api/payments/' + payment.maGiaoDich + '/confirm-cash',
  { soTienDaThu: payment.soTien }, 403, 'FORBIDDEN');
const confirmed = await driver.call('/api/payments/' + payment.maGiaoDich + '/confirm-cash',
  { soTienDaThu: payment.soTien });
assert.equal(confirmed.daXacNhanDu, true);
assert.equal((await customer.call('/api/payments/' + payment.maGiaoDich)).soTienThucNhan, payment.soTien);
assert.equal((await customer.call(path)).thanhToan.trangThai, 'DA_THANH_TOAN');
await dispatcher.call('/api/payments/' + payment.maGiaoDich + '/confirm-cash',
  { soTienDaThu: payment.soTien }, 403, 'FORBIDDEN');
assert.equal((await driver.call('/api/payments/' + payment.maGiaoDich + '/confirm-cash',
  { soTienDaThu: payment.soTien })).maGiaoDich, payment.maGiaoDich);
await driver.call(path + '/payments', request, 409, 'PAYMENT_ALREADY_PAID',
  { 'Idempotency-Key': randomUUID() });
await driver.call(path + '/transitions', { trangThai: 'DANG_GIAO' });
await driver.call(path + '/arrival', {});
await driver.call(path + '/transitions', { trangThai: 'HOAN_TAT' });
if (process.env.VNPAY_HASH_SECRET) {
  const before = await dispatcher.call('/api/cod/drivers');
  const holding = before.find(item => item.maTx === 'TX-DEMO-1');
  assert(Number(holding.soTienDuDieuKienNop) >= Number(payment.soTien));
  const batch = await dispatcher.call('/api/cod/drivers/TX-DEMO-1/settlements', {}, 201, undefined,
    { 'Idempotency-Key': randomUUID() });
  assert(batch.paymentUrl.startsWith('https://sandbox.vnpayment.vn/'));
  assert(batch.items.some(item => item.maGiaoDich === payment.maGiaoDich));
  const checkout = new URL(batch.paymentUrl);
  const fields = Object.fromEntries(checkout.searchParams);
  for (const key of [...Object.keys(fields)]) if (!['vnp_TmnCode', 'vnp_TxnRef', 'vnp_Amount', 'vnp_OrderInfo'].includes(key)) delete fields[key];
  Object.assign(fields, { vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: randomUUID().replaceAll('-', '') });
  const canonical = new URLSearchParams(Object.entries(fields).sort(([a], [b]) => a.localeCompare(b))).toString();
  fields.vnp_SecureHash = createHmac('sha512', process.env.VNPAY_HASH_SECRET).update(canonical).digest('hex');
  const callback = new URLSearchParams(Object.entries(fields).sort(([a], [b]) => a.localeCompare(b))).toString();
  const returned = await fetch(base + '/api/payments/vnpay/return?' + callback, { redirect: 'manual' });
  assert.equal(returned.status, 302);
  assert.equal((await dispatcher.call('/api/cod/settlements/' + batch.maDot)).trangThai, 'CHO_XU_LY');
  const ipn = await (await fetch(base + '/api/payments/vnpay/ipn?' + callback)).json();
  assert.equal(ipn.RspCode, '00');
  assert.equal((await dispatcher.call('/api/cod/settlements/' + batch.maDot)).trangThai, 'THANH_CONG');
  const after = await dispatcher.call('/api/cod/drivers');
  assert(Number(after.find(item => item.maTx === 'TX-DEMO-1').soTienDangGiu) < Number(holding.soTienDangGiu));
}
console.log(`T14/TX7 main payment flow: ${checks} HTTP checks passed`);
