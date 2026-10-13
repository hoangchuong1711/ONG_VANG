import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';

const base = (process.env.API_BASE_URL || 'http://127.0.0.1:18081').replace(/\/$/, '');
const health = await (await fetch(`${base}/api/health`)).json();
assert.equal(health.databaseName, 'mini_ong_vang_test', 'Run against the isolated TX3 test DB');
let cookie = '', csrf = '';

async function call(path, body, expected = 200, extraHeaders = {}) {
  const response = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, ...extraHeaders },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  for (const value of response.headers.getSetCookie())
    if (value.startsWith('JSESSIONID=')) cookie = value.split(';')[0];
  const data = await response.json();
  assert.equal(response.status, expected, `${path}: HTTP ${response.status} ${JSON.stringify(data)}`);
  return data;
}

csrf = (await call('/api/auth/csrf')).csrfToken;
const username = `0${randomInt(100000000, 999999999)}`;
const password = randomUUID();
const registered = await fetch(`${base}/api/auth/register`, {
  method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
  body: JSON.stringify({ hoTen: 'TX3 Goong test', soDienThoai: username, password }),
});
assert.equal(registered.status, 201, await registered.text());
await call('/api/auth/login', { username, password });
csrf = (await call('/api/auth/csrf')).csrfToken;
const input = {
  diemLayHang: '2 Công xã Paris, Bến Nghé, Quận 1, Hồ Chí Minh',
  diemGiaoHang: 'Chợ Bến Thành, Lê Lợi, Quận 1, Hồ Chí Minh',
  kienHang: [{ loaiHangHoa: 'Tài liệu', khoiLuongKg: '1.00' }],
};
const quote = await call('/api/quotes', input);
assert.equal(quote.loTrinh.nguon, 'GOONG');
assert(Number(quote.loTrinh.quangDuongKm) > 0);
assert(Number(quote.loTrinh.thoiGianDuKienGiay) > 0);
assert(quote.loTrinh.diemLayHang && quote.loTrinh.diemGiaoHang);
const order = await call('/api/orders', {
  ...input, maBaoGia: quote.maBaoGia, tenNguoiNhan: 'Người nhận thử Goong', sdtNguoiNhan: '0901234567',
}, 201, { 'Idempotency-Key': randomUUID() });
assert.equal(order.trangThai, 'CHO_GAN');
assert.equal(order.nguonLoTrinh, 'GOONG');
assert.equal(order.cuoc.tongCuoc, quote.cuoc.tongCuoc);
console.log(`PASS: Goong quote/order, ${quote.loTrinh.quangDuongKm} km, ${quote.loTrinh.thoiGianDuKienGiay} s.`);
