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
const detailSchema = ajv.compile({ $ref: '#/components/schemas/OrderDetail', components: spec.components });
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

await call('/api/orders', undefined, 401, 'AUTH_REQUIRED');
async function register() {
  cookie = ''; csrf = (await call('/api/auth/csrf', undefined, 200)).csrfToken;
  const username = '0' + String(randomInt(100000000, 999999999)), password = randomUUID();
  await call('/api/auth/register', { hoTen: 'T16 HTTP test', soDienThoai: username, password, email: `${username}@example.test` }, 201);
  const user = await call('/api/auth/login', { username, password }, 200);
  csrf = (await call('/api/auth/csrf', undefined, 200)).csrfToken;
  return user;
}
const user = await register();
const input = { diemLayHang:'Điểm mẫu A', diemGiaoHang:'Điểm mẫu B',
  kienHang:[{loaiHangHoa:'Hoa',khoiLuongKg:'1.00'},{loaiHangHoa:'Tài liệu',khoiLuongKg:'2.00'}] };
const ids = [];
for (let i=0; i<2; i++) {
  const quote = await call('/api/quotes', input, 200);
  ids.push((await call('/api/orders', {...input,maBaoGia:quote.maBaoGia,sdtNguoiNhan:'0901234567'},201,undefined,{'Idempotency-Key':randomUUID()})).maDon);
}
const first = await call('/api/orders?page=0&size=1', undefined, 200);
const second = await call('/api/orders?page=1&size=1', undefined, 200);
assert.equal(first.totalElements,2); assert.equal(first.items.length,1);
assert.notEqual(first.items[0].maDon,second.items[0].maDon);
assert.deepEqual(first.summary,second.summary);
const all = await call('/api/orders?trangThai=CHO_GAN', undefined, 200);
assert.equal(all.summary.tongSoDon,2);
assert.equal(Number(all.summary.tongCuoc),all.items.reduce((sum,o)=>sum+Number(o.cuoc.tongCuoc),0));
const detail = await call('/api/orders/'+ids[0], undefined, 200);
assert(detailSchema(detail),JSON.stringify(detailSchema.errors));
assert.equal(detail.maKh,user.maKh); assert.equal(detail.kienHang.length,2);
assert(detail.phienBanChinhSach.bieuPhi.maBieuPhi);
assert.equal(detail.nhatKy.length,1); assert.equal(detail.nhatKy[0].thuTu,1);
assert.equal(detail.xacNhanThanhToan,null); assert.deepEqual(detail.phanCong,[]);
await call('/api/orders?tuNgay=2026-02-30',undefined,400,'DATE_RANGE_INVALID');
await call('/api/orders?tuNgay=2026-02-02&denNgay=2026-02-01',undefined,400,'DATE_RANGE_INVALID');
await call('/api/orders?tuNgay=2026-02-01&denNgay=2026-02-01',undefined,400,'DATE_RANGE_INVALID');
await call('/api/orders?page=-1',undefined,400,'VALIDATION_ERROR');
await call('/api/orders?size=101',undefined,400,'VALIDATION_ERROR');
await call('/api/orders?page=1&page=2',undefined,400,'VALIDATION_ERROR');
const empty = await call('/api/orders?tuNgay=2099-01-01&denNgay=2099-01-02',undefined,200);
assert.deepEqual(empty.items,[]);assert.equal(empty.summary.tongCuoc,'0.00');
await register();
await call('/api/orders/'+ids[0],undefined,404,'RESOURCE_NOT_FOUND');
await call('/api/orders/'+ids[0]+'/events',undefined,404,'RESOURCE_NOT_FOUND');
const other = await call('/api/orders',undefined,200);
assert.equal(other.totalElements,0);assert.equal(other.summary.tongCuoc,'0.00');
console.log(`PASS: ${checks} T16 HTTP checks; ownership, pagination, filters, totals and OrderDetail schema.`);
