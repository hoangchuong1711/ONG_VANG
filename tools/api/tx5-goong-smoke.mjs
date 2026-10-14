import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';

const base = (process.env.API_BASE_URL || 'http://127.0.0.1:18081').replace(/\/$/, '');
const health = await (await fetch(base + '/api/health')).json();
assert.equal(health.databaseName, 'mini_ong_vang_test', 'Dedicated test DB required');
assert(process.env.DEMO_PASSWORD, 'DEMO_PASSWORD required');

class Client {
  cookie = ''; csrf = '';
  async call(path, body, expected = 200, headers = {}) {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Cookie: this.cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': this.csrf, ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    for (const value of response.headers.getSetCookie())
      if (value.startsWith('JSESSIONID=')) this.cookie = value.split(';')[0];
    const data = await response.json();
    assert.equal(response.status, expected, `${path}: HTTP ${response.status} ${JSON.stringify(data)}`);
    return data;
  }
  async login(username, password) {
    this.csrf = (await this.call('/api/auth/csrf')).csrfToken;
    await this.call('/api/auth/login', { username, password });
    this.csrf = (await this.call('/api/auth/csrf')).csrfToken;
  }
}

const customer = new Client(), dispatcher = new Client(), driver = new Client(), other = new Client();
const username = `0${randomInt(100000000, 999999999)}`, password = randomUUID();
customer.csrf = (await customer.call('/api/auth/csrf')).csrfToken;
await customer.call('/api/auth/register', { hoTen: 'TX5 Goong test', soDienThoai: username, password }, 201);
await customer.login(username, password);
await dispatcher.login('demo_dispatcher', process.env.DEMO_PASSWORD);
await driver.login('0800000001', process.env.DEMO_PASSWORD);
await other.login('0800000002', process.env.DEMO_PASSWORD);

const address = 'Bưu điện Trung tâm Sài Gòn, 2 Công xã Paris, Quận 1, Thành phố Hồ Chí Minh';
const pickup = 'Chợ Bến Thành, Lê Lợi, Quận 1, Thành phố Hồ Chí Minh';
const dropoff = 'Công viên Tao Đàn, Trương Định, Quận 3, Thành phố Hồ Chí Minh';
const position = await dispatcher.call('/api/drivers/TX-DEMO-1/demo-position', { diaChi: address });
assert.equal(position.nguon, 'DEMO_CO_DINH');
const input = { diemLayHang: pickup, diemGiaoHang: dropoff,
  kienHang: [{ loaiHangHoa: 'Tài liệu', khoiLuongKg: '1.00' }] };
const quote = await customer.call('/api/quotes', input);
assert.equal(quote.loTrinh.nguon, 'GOONG');
const order = await customer.call('/api/orders', { ...input, maBaoGia: quote.maBaoGia,
  sdtNguoiNhan: '0901234567' }, 201, { 'Idempotency-Key': randomUUID() });
const path = '/api/orders/' + order.maDon;
await dispatcher.call(path + '/assignments', { maTx: 'TX-DEMO-1' });
assert.equal((await other.call(path + '/driver-route', undefined, 404)).code, 'RESOURCE_NOT_FOUND');
const route = await driver.call(path + '/driver-route');
assert.equal(route.nguon, 'GOONG');
assert.equal(route.taiXe.nguon, 'DEMO_CO_DINH');
for (const leg of [route.denDiemLay, route.denDiemGiao]) {
  assert(leg.polyline.length > 0 && Number(leg.quangDuongKm) > 0);
  assert.equal(leg.nguon, 'GOONG');
}
assert.equal((await customer.call(path)).quangDuongKm, order.quangDuongKm,
  'Map preview must not change customer billable distance');
console.log(`TX5 Goong map smoke passed: pickup ${route.denDiemLay.quangDuongKm} km, delivery ${route.denDiemGiao.quangDuongKm} km.`);
