import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';

const base = (process.env.API_BASE_URL || 'http://127.0.0.1:18081').replace(/\/$/, '');
const health = await (await fetch(base + '/api/health')).json();
assert.equal(health.databaseName, 'mini_ong_vang_test', 'T13 smoke writes data: dedicated test DB required');
assert(process.env.DEMO_PASSWORD, 'Seed isolated test DB before T13 smoke');
let checks = 0;
class Client {
  cookie = ''; csrf = '';
  async call(path, body, status = 200, code, headers = {}) {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Cookie: this.cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': this.csrf, ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(20000)
    });
    for (const cookie of response.headers.getSetCookie()) if (cookie.startsWith('JSESSIONID=')) this.cookie = cookie.split(';')[0];
    const result = await response.json();
    assert.equal(response.status, status, `${path}: ${JSON.stringify(result)}`);
    if (code) assert.equal(result.code, code);
    checks++; return result;
  }
  async login(username, password) {
    this.csrf = (await this.call('/api/auth/csrf')).csrfToken;
    await this.call('/api/auth/login', { username, password });
    this.csrf = (await this.call('/api/auth/csrf')).csrfToken;
  }
}
const anon = new Client(), customer = new Client(), other = new Client(), dispatcher = new Client(), driver = new Client();
await dispatcher.login('demo_dispatcher', process.env.DEMO_PASSWORD);
await driver.login('0800000001', process.env.DEMO_PASSWORD);
await other.login('0900000002', process.env.DEMO_PASSWORD);
customer.csrf = (await customer.call('/api/auth/csrf')).csrfToken;
const username = '0' + randomInt(100000000, 999999999), password = randomUUID();
await customer.call('/api/auth/register', { hoTen: 'T13 HTTP test', soDienThoai: username, password }, 201);
await customer.login(username, password);
const input = { diemLayHang: 'Điểm mẫu A', diemGiaoHang: 'Điểm mẫu B', kienHang: [{ loaiHangHoa: 'Hoa', khoiLuongKg: '1.00' }] };
async function create() {
  const quote = await customer.call('/api/quotes', input);
  return customer.call('/api/orders', { ...input, maBaoGia: quote.maBaoGia, sdtNguoiNhan: '0901234567' }, 201,
    undefined, { 'Idempotency-Key': randomUUID() });
}
const first = await create(), path = '/api/orders/' + first.maDon + '/cancel';
await anon.call(path, { lyDo: 'x' }, 401, 'AUTH_REQUIRED');
await driver.call(path, { lyDo: 'x' }, 403, 'FORBIDDEN');
await other.call(path, { lyDo: 'x' }, 404, 'RESOURCE_NOT_FOUND');
await customer.call(path, { lyDo: 'x' }, 403, 'CSRF_INVALID', { 'X-CSRF-Token': '' });
await customer.call(path, '{', 400, 'JSON_INVALID');
for (const body of [{}, { lyDo: ' ' }, { lyDo: 'x'.repeat(501) }, { lyDo: 'x', force: true }])
  await customer.call(path, body, 400, 'VALIDATION_ERROR');
const cancelled = await customer.call(path, { lyDo: '  Đổi kế hoạch  ' });
assert.equal(cancelled.trangThai, 'DA_HUY');assert(cancelled.huyLuc);assert.equal(cancelled.maTx, null);
await customer.call(path, { lyDo: 'lặp' }, 409, 'ORDER_STATE_CONFLICT');
const second = await create(), assigned = '/api/orders/' + second.maDon;
const freeBefore = await dispatcher.call('/api/drivers?trangThaiHoatDong=ONLINE&dangBanChuyen=false');
assert(freeBefore.items.length, 'A free demo driver is required for assigned cancellation');
const driverId = freeBefore.items[0].maTx;
await dispatcher.call(assigned + '/assignments', { maTx: driverId });
const assignedCancelled = await dispatcher.call(assigned + '/cancel', { lyDo: 'Khách đổi kế hoạch' });
assert.equal(assignedCancelled.trangThai, 'DA_HUY');assert.equal(assignedCancelled.maTx, null);
const drivers = await dispatcher.call('/api/drivers?dangBanChuyen=false');
assert(drivers.items.some(item => item.maTx === driverId));
const events = await customer.call(assigned + '/events');
assert.equal(events.items.at(-1).tenTrangThai, 'DA_HUY');
console.log(`T13 cancellation smoke: ${checks} HTTP checks passed`);
