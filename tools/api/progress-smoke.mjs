import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const base = (process.env.API_BASE_URL || 'http://127.0.0.1:18081').replace(/\/$/, '');
const health = await (await fetch(base + '/api/health')).json();
assert.equal(health.databaseName, 'mini_ong_vang_test', 'Progress smoke writes fixtures: dedicated test DB required');
assert(process.env.DEMO_PASSWORD, 'Seed isolated DB with DEMO_PASSWORD before progress smoke');
const spec = JSON.parse(readFileSync(new URL('../../src/backend/src/main/webapp/openapi.json', import.meta.url), 'utf8'));
const ajv = new Ajv2020({ strict: false }); addFormats(ajv);
const schemas = Object.fromEntries(['Order', 'OrderPage', 'DriverPage', 'Error', 'Event', 'EventPage'].map(name => [name,
  ajv.compile({ $ref: '#/components/schemas/' + name, components: spec.components })]));
let checks = 0;
class Client {
  cookie = ''; csrf = '';
  async raw(path, body, headers = {}) {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Cookie: this.cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': this.csrf, ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(20000)
    });
    for (const cookie of response.headers.getSetCookie()) if (cookie.startsWith('JSESSIONID=')) this.cookie = cookie.split(';')[0];
    return { status: response.status, body: await response.json() };
  }
  async call(path, body, expected = 200, schema, code, headers) {
    const r = await this.raw(path, body, headers);
    assert.equal(r.status, expected, `${path}: ${JSON.stringify(r.body)}`);
    if (schema) assert(schemas[schema](r.body), `${path}: ${JSON.stringify(schemas[schema].errors)}`);
    if (code) assert.equal(r.body.code, code);
    checks++; return r.body;
  }
  async login(username, password) {
    this.csrf = (await this.call('/api/auth/csrf')).csrfToken;
    const user = await this.call('/api/auth/login', { username, password });
    this.csrf = (await this.call('/api/auth/csrf')).csrfToken; return user;
  }
  async headWithBody(path, body) {
    // fetch forbids HEAD bodies; raw HTTP reproduces Servlet HEAD -> doGet routing.
    const url = new URL(base + path), payload = JSON.stringify(body);
    const status = await new Promise((resolve, reject) => {
      const req = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
        method: 'HEAD', headers: { Cookie: this.cookie, 'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload) } // Deliberately no CSRF token.
      }, response => { response.resume(); response.on('end', () => resolve(response.statusCode)); });
      req.setTimeout(15000, () => req.destroy(new Error('HEAD regression request timed out')));
      req.on('error', reject); req.end(payload);
    });
    assert.equal(status, 404, 'HEAD on a write-only path must not run assignment/rejection'); checks++;
  }
}
const anon = new Client(), customer = new Client(), dispatcher = new Client(), driver = new Client(), other = new Client();
await dispatcher.login('demo_dispatcher', process.env.DEMO_PASSWORD);
await driver.login('0800000005', process.env.DEMO_PASSWORD);
await other.login('0800000002', process.env.DEMO_PASSWORD);
customer.csrf = (await customer.call('/api/auth/csrf')).csrfToken;
const username = '0' + randomInt(100000000, 999999999), password = randomUUID();
await customer.call('/api/auth/register', { hoTen: 'T12 HTTP test', soDienThoai: username, password }, 201);
await customer.login(username, password);
// Driver 5 starts delivering a seeded order; completing it makes this test independent of T11's drivers.
await driver.call('/api/orders/DH-DEMO-DELIVERING/transitions', { trangThai: 'HOAN_TAT' }, 200, 'Order');
const input = { diemLayHang: 'Điểm mẫu A', diemGiaoHang: 'Điểm mẫu B', kienHang: [{ loaiHangHoa: 'Hoa', khoiLuongKg: '1.00' }] };
async function create() {
  const quote = await customer.call('/api/quotes', input);
  return customer.call('/api/orders', { ...input, maBaoGia: quote.maBaoGia, sdtNguoiNhan: '0901234567' }, 201, 'Order', undefined, { 'Idempotency-Key': randomUUID() });
}
const order = await create(), path = '/api/orders/' + order.maDon;
await dispatcher.call(path + '/assignments', { maTx: 'TX-DEMO-5' }, 200, 'Order');
const incident = { loaiSuCo: 'KHONG_LIEN_LAC_DUOC', lyDo: 'Không nghe máy' };
await anon.call(path + '/events', undefined, 401, 'Error', 'AUTH_REQUIRED');
await anon.call(path + '/transitions', { trangThai: 'DA_LAY_HANG' }, 401, 'Error', 'AUTH_REQUIRED');
await customer.call(path + '/transitions', { trangThai: 'DA_LAY_HANG' }, 403, 'Error', 'FORBIDDEN');
await dispatcher.call(path + '/incidents', incident, 403, 'Error', 'FORBIDDEN');
await other.call(path + '/events', undefined, 404, 'Error', 'RESOURCE_NOT_FOUND');
await other.call(path + '/transitions', { trangThai: 'DA_LAY_HANG' }, 404, 'Error', 'RESOURCE_NOT_FOUND');
await other.call(path + '/incidents', incident, 404, 'Error', 'RESOURCE_NOT_FOUND');
await driver.call(path + '/events?size=101', undefined, 400, 'Error', 'VALIDATION_ERROR');
await driver.call(path + '/events?page=-1', undefined, 400, 'Error', 'VALIDATION_ERROR');
await driver.call(path + '/transitions', { trangThai: 'DA_LAY_HANG' }, 403, 'Error', 'CSRF_INVALID', { 'X-CSRF-Token': '' });
await driver.call(path + '/incidents', incident, 403, 'Error', 'CSRF_INVALID', { 'X-CSRF-Token': '' });
await driver.call(path + '/transitions', '{', 400, 'Error', 'JSON_INVALID');
for (const body of [{}, { trangThai: 'DA_HUY' }, { trangThai: null }, { trangThai: 'HOAN_TAT', force: true }])
  await driver.call(path + '/transitions', body, 400, 'Error', 'VALIDATION_ERROR');
for (const body of [{}, { ...incident, loaiSuCo: 'OTHER' }, { ...incident, lyDo: ' ' }, { ...incident, lyDo: 'x'.repeat(501) }, { ...incident, force: true }])
  await driver.call(path + '/incidents', body, 400, 'Error', 'VALIDATION_ERROR');
await driver.headWithBody(path + '/transitions', { trangThai: 'DA_LAY_HANG' });
await driver.headWithBody(path + '/incidents', incident);
await driver.call(path + '/transitions', { trangThai: 'HOAN_TAT' }, 409, 'Error', 'ORDER_STATE_CONFLICT');
await driver.call(path + '/incidents', incident, 409, 'Error', 'ORDER_STATE_CONFLICT');
let count = (await customer.call(path + '/events', undefined, 200, 'EventPage')).totalElements;
for (const target of ['DA_LAY_HANG', 'DANG_GIAO', 'HOAN_TAT']) {
  if (target === 'HOAN_TAT') {
    for (const type of ['KHONG_LIEN_LAC_DUOC', 'TU_CHOI_NHAN']) {
      const event = await driver.call(path + '/incidents', { loaiSuCo: type, lyDo: '  ' + 'x'.repeat(500) + '  ' }, 201, 'Event');
      assert.equal(event.loaiSuCo, type); assert.equal(event.ghiChuSuCo, 'x'.repeat(500));
      assert.equal(event.tenTrangThai, 'DANG_GIAO'); count++;
    }
    assert.equal((await driver.call(path, undefined, 200, 'Order')).hoanTatLuc, null);
    const busy = await dispatcher.call('/api/drivers?dangBanChuyen=true', undefined, 200, 'DriverPage');
    assert(busy.items.some(d => d.maTx === 'TX-DEMO-5'));
  }
  const responses = await Promise.all(Array.from({ length: 8 }, () => driver.raw(path + '/transitions', { trangThai: target })));
  for (const r of responses) { assert.equal(r.status, 200, JSON.stringify(r)); assert(schemas.Order(r.body)); assert.equal(r.body.trangThai, target); checks++; }
  count++;
  const events = await customer.call(path + '/events', undefined, 200, 'EventPage');
  assert.equal(events.totalElements, count);
}
const done = await driver.call(path, undefined, 200, 'Order');
assert(done.hoanTatLuc); assert.equal(done.thanhToan.trangThai, 'CHUA_THANH_TOAN'); assert.deepEqual(done.cuoc, order.cuoc);
await other.call(path + '/transitions', { trangThai: 'HOAN_TAT' }, 404, 'Error', 'RESOURCE_NOT_FOUND');
await driver.call(path + '/transitions', { trangThai: 'DA_LAY_HANG' }, 409, 'Error', 'ORDER_STATE_CONFLICT');
await driver.call(path + '/incidents', incident, 409, 'Error', 'ORDER_STATE_CONFLICT');
const free = await dispatcher.call('/api/drivers?dangBanChuyen=false', undefined, 200, 'DriverPage');
assert(free.items.some(d => d.maTx === 'TX-DEMO-5'));
const all = await driver.call(path + '/events', undefined, 200, 'EventPage');
assert.equal(all.items.filter(e => e.tenTrangThai === 'HOAN_TAT').length, 1);
assert.equal(all.items.find(e => e.tenTrangThai === 'HOAN_TAT').thoiGianGhiNhan, done.hoanTatLuc);
for (let i = 0; i < all.items.length; i++) {
  const page = await customer.call(path + '/events?page=' + i + '&size=1', undefined, 200, 'EventPage');
  assert.deepEqual(page.items, [all.items[i]]); assert.equal(page.totalElements, count);
}
const next = await create();
await dispatcher.call('/api/orders/' + next.maDon + '/assignments', { maTx: 'TX-DEMO-5' }, 200, 'Order');
assert.deepEqual(await driver.call(path + '/transitions', { trangThai: 'HOAN_TAT' }, 200, 'Order'), done);
const busy = await dispatcher.call('/api/drivers?dangBanChuyen=true', undefined, 200, 'DriverPage');
assert(busy.items.some(d => d.maTx === 'TX-DEMO-5'));
assert.equal((await driver.call(path + '/events', undefined, 200, 'EventPage')).totalElements, count);
console.log(`T12 progress smoke: ${checks} HTTP checks passed`);
