import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const base = (process.env.API_BASE_URL || 'http://127.0.0.1:18081').replace(/\/$/, '');
const health = await (await fetch(base + '/api/health')).json();
assert.equal(health.databaseName, 'mini_ong_vang_test', 'This test writes fixtures: dedicated test database required');
const spec = JSON.parse(readFileSync(new URL('../../src/backend/src/main/webapp/openapi.json', import.meta.url), 'utf8'));
const ajv = new Ajv2020({ strict: false }); addFormats(ajv);
const orderSchema = ajv.compile({ $ref: '#/components/schemas/Order', components: spec.components });
let cookie = '', csrf = '', checks = 0;
async function call(path, body, expected, code, headers = {}) {
  const response = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(15000)
  });
  const cookies = response.headers.getSetCookie();
  for (const item of cookies) if (item.startsWith('JSESSIONID=')) cookie = item.split(';')[0];
  const result = await response.json();
  assert.equal(response.status, expected, `${path}: ${JSON.stringify(result)}`);
  if (code) assert.equal(result.code, code);
  checks++;
  return result;
}
await call('/api/orders', {}, 401, 'AUTH_REQUIRED');
csrf = (await call('/api/auth/csrf', undefined, 200)).csrfToken;
const username = '0' + String(randomInt(100000000, 999999999));
const password = randomUUID();
await call('/api/auth/register', { hoTen: 'T10 HTTP test', soDienThoai: username, password }, 201);
const user = await call('/api/auth/login', { username, password }, 200);
csrf = (await call('/api/auth/csrf', undefined, 200)).csrfToken;
const quoteInput = { diemLayHang: 'Điểm mẫu A', diemGiaoHang: 'Điểm mẫu B', kienHang: [{ loaiHangHoa: 'Hoa', khoiLuongKg: '1.00' }] };
const quote = await call('/api/quotes', quoteInput, 200);
const input = { ...quoteInput, maBaoGia: quote.maBaoGia, sdtNguoiNhan: '0901234567' };
const key = randomUUID();
const headers = { 'Idempotency-Key': key };
await call('/api/orders', input, 403, 'CSRF_INVALID', { ...headers, 'X-CSRF-Token': '' });
await call('/api/orders', input, 400, 'VALIDATION_ERROR');
await call('/api/orders', '{', 400, 'JSON_INVALID', headers);
await call('/api/orders', { ...input, tongCuoc: '1.00' }, 400, 'VALIDATION_ERROR', headers);
await call('/api/orders', { ...input, maKh: 'KH-DEMO-2' }, 403, 'FORBIDDEN', headers);
await call('/api/orders', { ...input, sdtNguoiNhan: 'wrong' }, 400, 'VALIDATION_ERROR', headers);
await call('/api/orders', { ...input, diemGiaoHang: '' }, 400, 'VALIDATION_ERROR', headers);
await call('/api/orders', { ...input, kienHang: [{ loaiHangHoa: 'Hoa', khoiLuongKg: 1 }] }, 400, 'VALIDATION_ERROR', headers);
await call('/api/orders', { ...input, diemGiaoHang: 'Hà Nội' }, 422, 'OUT_OF_SERVICE_AREA', headers);
await call('/api/orders', { ...input, diemGiaoHang: 'Điểm mẫu C' }, 409, 'QUOTE_CHANGED', headers);
await call('/api/orders', { ...input, maBaoGia: randomUUID() }, 404, 'RESOURCE_NOT_FOUND', headers);
const created = await call('/api/orders', input, 201, undefined, headers);
assert(orderSchema(created), JSON.stringify(orderSchema.errors));
assert.equal(created.maKh, user.maKh); assert.equal(created.trangThai, 'CHO_GAN');
assert.deepEqual(created.cuoc, quote.cuoc);
const retried = await call('/api/orders', input, 201, undefined, headers);
assert.deepEqual(retried, created);
await call('/api/orders', { ...input, sdtNguoiNhan: '0901111111' }, 409, 'IDEMPOTENCY_CONFLICT', headers);
const concurrentKey = { 'Idempotency-Key': randomUUID() };
const concurrent = await Promise.all(Array.from({ length: 4 }, () => call('/api/orders', input, 201, undefined, concurrentKey)));
for (const result of concurrent) assert.deepEqual(result, concurrent[0]);
assert.notEqual(created.maDon, concurrent[0].maDon);
console.log(`PASS: ${checks} HTTP checks; session/CSRF, validation, quote checking, order schema, retries and concurrent creation.`);
