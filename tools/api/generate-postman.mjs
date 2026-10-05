import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const spec = JSON.parse(readFileSync(resolve(root, 'src/backend/src/main/webapp/openapi.json'), 'utf8'));
const target = resolve(root, 'tests/postman');
const check = process.argv.includes('--check');
const event = (listen, lines) => ({ listen, script: { type: 'text/javascript', exec: lines } });
const plannedGuard = event('prerequest', [
  "if (pm.environment.get('runPlanned') !== 'true') {",
  "  console.warn('SKIPPED: contract only. Set runPlanned=true only after the corresponding BE task is implemented.');",
  '  pm.execution.skipRequest();',
  '}'
]);
const variables = {
  maDon: 'orderId', maKh: 'customerId', maTx: 'driverId', maGiaoDich: 'paymentId', maBaoGia: 'quoteId',
  diemLayHang: 'pickupAddress', diemGiaoHang: 'deliveryAddress', sdtNguoiNhan: 'recipientPhone',
  username: 'username', password: 'password', soTienDaThu: 'amount'
};
function templatize(value, key) {
  if (variables[key]) return '{{' + variables[key] + '}}';
  if (Array.isArray(value)) return value.map(v => templatize(v));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, templatize(v, k)]));
  return value;
}
function makeItem(path, method, operation) {
  const parameters = operation.parameters || [];
  const headers = [{ key: 'Accept', value: operation.operationId === 'exportRevenueReport' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : operation.operationId === 'vnpayReturn' ? 'text/html' : 'application/json' }];
  if (operation.security.some(s => 'csrfToken' in s)) headers.push({ key: 'X-CSRF-Token', value: '{{csrfToken}}' });
  for (const p of parameters.filter(p => p.in === 'header')) headers.push({ key: p.name, value: operation.operationId === 'createOrder' ? '{{orderIdempotencyKey}}' : '{{paymentIdempotencyKey}}' });
  const query = parameters.filter(p => p.in === 'query').map(p => ({
    key: p.name,
    value: p.name.startsWith('vnp_') ? '{{' + p.name + '}}' : p.name === 'tuNgay' ? '{{fromDate}}' : p.name === 'denNgay' ? '{{toDate}}' : String(p.schema.default ?? p.schema.enum?.[0] ?? ''),
    disabled: !p.required && !['page', 'size', 'nhomTheo'].includes(p.name),
    description: p.description
  }));
  const route = path.replace(/\{(\w+)\}/g, (_, name) => '{{' + (variables[name] || name) + '}}');
  const rawQuery = query.filter(q => !q.disabled).map(q => q.key + '=' + q.value).join('&');
  const url = { raw: '{{baseUrl}}' + route + (rawQuery ? '?' + rawQuery : ''), host: ['{{baseUrl}}'], path: route.slice(1).split('/'), query };
  const request = { method: method.toUpperCase(), header: headers, url, description: `${operation.summary}\n\n${operation.description}\n\nStatus: ${operation['x-implementation-status']}; UC: ${operation['x-uc'].join(', ') || 'infrastructure'}; roles: ${operation['x-roles'].join(', ')}` };
  if (operation.requestBody) {
    headers.push({ key: 'Content-Type', value: 'application/json' });
    request.body = { mode: 'raw', raw: JSON.stringify(templatize(operation.requestBody.content['application/json'].example), null, 2), options: { raw: { language: 'json' } } };
  }
  const status = Number(Object.keys(operation.responses).find(s => /^2\d\d$/.test(s)));
  const scripts = [
    `pm.test('Expected HTTP ${status}', () => pm.response.to.have.status(${status}));`
  ];
  if (operation.responses[status].content?.['application/json']) {
    scripts.push("pm.test('JSON content type', () => pm.expect(pm.response.headers.get('Content-Type')).to.include('application/json'));", 'if (pm.response.code >= 200 && pm.response.code < 300) {', '  const body = pm.response.json();');
    const schemaName = operation.responses[status].content['application/json'].schema.$ref.split('/').at(-1);
    for (const field of spec.components.schemas[schemaName].required || []) scripts.push(`  pm.test('Response has ${field}', () => pm.expect(body).to.have.property('${field}'));`);
    if (operation.operationId === 'getCsrf') scripts.push("  pm.environment.set('csrfToken', body.csrfToken);");
    if (operation.operationId === 'createQuote') scripts.push("  pm.environment.set('quoteId', body.maBaoGia);", "  pm.environment.set('amount', body.cuoc.tongCuoc);");
    if (operation.operationId === 'createOrder') scripts.push("  pm.environment.set('orderId', body.maDon);", "  pm.test('New order waits for assignment', () => pm.expect(body.trangThai).to.eql('CHO_GAN'));");
    if (operation.operationId === 'createPayment') scripts.push("  pm.environment.set('paymentId', body.maGiaoDich);", "  if (body.paymentUrl) pm.environment.set('paymentUrl', body.paymentUrl);");
    if (operation.operationId === 'getHealth') scripts.push("  pm.test('Database is connected', () => pm.expect(body.database).to.eql('connected'));");
    const expectedState = { assignDriver: 'DA_GAN', rejectOrder: 'CHO_GAN', cancelOrder: 'DA_HUY' }[operation.operationId];
    if (expectedState) scripts.push(`  pm.test('Expected order state', () => pm.expect(body.trangThai).to.eql('${expectedState}'));`);
    if (operation.operationId === 'transitionOrder') scripts.push("  pm.test('Requested state reached', () => pm.expect(body.trangThai).to.eql(JSON.parse(pm.variables.replaceIn(pm.request.body.raw)).trangThai));");
    if (operation.operationId === 'confirmCash') scripts.push("  pm.test('Cash recorded once', () => { pm.expect(body.phuongThuc).to.eql('TIEN_MAT'); pm.expect(body.trangThai).to.eql('THANH_CONG'); pm.expect(body.thoiGianThanhToan).to.be.a('string'); });");
    if (schemaName.endsWith('Page')) scripts.push("  pm.test('Pagination is coherent', () => { pm.expect(body.items).to.be.an('array'); pm.expect(body.items.length).to.be.at.most(body.size); pm.expect(body.totalPages).to.eql(Math.ceil(body.totalElements / body.size)); });");
    scripts.push('}');
  }
  if (['login', 'logout'].includes(operation.operationId)) scripts.push("if (pm.response.code >= 200 && pm.response.code < 300) pm.environment.unset('csrfToken');");
  const events = [event('test', scripts)];
  const before = operation['x-implementation-status'] !== 'implemented' ? [...plannedGuard.script.exec] : [];
  if (parameters.some(p => p.name === 'Idempotency-Key')) {
    const name = operation.operationId === 'createOrder' ? 'orderIdempotencyKey' : 'paymentIdempotencyKey';
    before.push(`if (!pm.environment.get('${name}')) pm.environment.set('${name}', pm.variables.replaceIn('{{$guid}}'));`);
  }
  if (before.length) events.unshift(event('prerequest', before));
  return { name: operation.operationId, request, event: events, response: [] };
}
const implemented = [], planned = new Map(), byId = new Map();
for (const [path, methods] of Object.entries(spec.paths)) for (const [method, op] of Object.entries(methods)) {
  const item = makeItem(path, method, op);
  byId.set(op.operationId, item);
  if (op['x-implementation-status'] === 'implemented') implemented.push(item);
  else {
    const tag = op.tags[0];
    if (!planned.has(tag)) planned.set(tag, []);
    planned.get(tag).push(item);
  }
}
function negative(id, name, expected, code, mutate) {
  const item = structuredClone(byId.get(id));
  item.name = name;
  item.event = [plannedGuard, event('test', [
    `pm.test('Expected HTTP ${expected}', () => pm.response.to.have.status(${expected}));`,
    `pm.test('Expected ${code}', () => pm.expect(pm.response.json().code).to.eql('${code}'));`,
    "pm.test('Traceable error', () => { const body = pm.response.json(); pm.expect(body.fieldErrors).to.be.an('array'); pm.expect(body.traceId).to.be.a('string').and.not.empty; });"
  ])];
  mutate(item.request);
  return item;
}
const negatives = [
  negative('login', 'TC-01-02 - invalid credentials (getCsrf first)', 401, 'INVALID_CREDENTIALS', r => { r.body.raw = JSON.stringify({ username: '{{username}}', password: 'intentionally-invalid-password' }); }),
  negative('login', 'TC-01-03 - missing CSRF', 403, 'CSRF_INVALID', r => { r.header = r.header.filter(h => h.key !== 'X-CSRF-Token'); }),
  negative('listOrders', 'TC-19-02 - invalid page (login first)', 400, 'VALIDATION_ERROR', r => { r.url.query.find(q => q.key === 'page').value = '-1'; r.url.raw = r.url.raw.replace('page=0', 'page=-1'); }),
  negative('getOrder', 'TC-19-03 - other customer order (fixture required)', 404, 'RESOURCE_NOT_FOUND', r => { r.url.raw = r.url.raw.replace('{{orderId}}', '{{otherOrderId}}'); r.url.path = r.url.path.map(p => p.replace('{{orderId}}', '{{otherOrderId}}')); }),
  negative('cancelOrder', 'TC-14-02 - age 300 seconds (controlled clock fixture)', 409, 'CANCELLATION_WINDOW_EXPIRED', r => { r.url.raw = r.url.raw.replace('{{orderId}}', '{{expiredOrderId}}'); r.url.path = r.url.path.map(p => p.replace('{{orderId}}', '{{expiredOrderId}}')); })
];
const artifacts = [
  { name: 'getOpenApi', request: { method: 'GET', url: '{{baseUrl}}/openapi.json' }, event: [event('test', ["pm.test('OpenAPI served', () => { pm.response.to.have.status(200); pm.expect(pm.response.json().openapi).to.eql('3.1.0'); });"])] },
  { name: 'getSwaggerUi', request: { method: 'GET', url: '{{baseUrl}}/swagger-ui/' }, event: [event('test', ["pm.test('Swagger HTML served', () => { pm.response.to.have.status(200); pm.expect(pm.response.text()).to.include('swagger-ui-bundle.js'); });"])] }
];
const collection = {
  info: { name: 'Mini Ong Vang — T04', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json', description: 'Generated from openapi.json. Smoke runs now; planned requests are skipped unless runPlanned=true. Read tests/postman/README.md. Do not run all folders as one business scenario; switch roles and fixtures explicitly.' },
  item: [
    { name: '01 - Implemented smoke', item: [...artifacts, ...implemented] },
    { name: '02 - Contract reference (planned)', item: [...planned].map(([name, item]) => ({ name, item })) },
    { name: '03 - Negative fixtures (planned)', item: negatives }
  ]
};
const environment = {
  name: 'Mini Ong Vang Local (template)',
  values: Object.entries({
    baseUrl: 'http://localhost:8081', runPlanned: 'false', username: '', password: '', csrfToken: '',
    customerId: '', driverId: '', quoteId: '', orderId: '', paymentId: '', amount: '', paymentUrl: '',
    pickupAddress: 'Điểm mẫu A', deliveryAddress: 'Điểm mẫu B', recipientPhone: '0901234567',
    fromDate: '2026-10-05', toDate: '2026-10-06', otherOrderId: '', expiredOrderId: '',
    orderIdempotencyKey: '', paymentIdempotencyKey: '',
    ...Object.fromEntries(['vnp_TmnCode','vnp_Amount','vnp_BankCode','vnp_BankTranNo','vnp_CardType','vnp_PayDate','vnp_OrderInfo','vnp_TransactionNo','vnp_ResponseCode','vnp_TransactionStatus','vnp_TxnRef','vnp_SecureHash'].map(k => [k, '']))
  }).map(([key, value]) => ({ key, value, type: ['password','csrfToken','vnp_SecureHash'].includes(key) ? 'secret' : 'default', enabled: true })),
  _postman_variable_scope: 'environment'
};
mkdirSync(target, { recursive: true });
for (const [name, data] of [['mini-ong-vang.postman_collection.json', collection], ['local.postman_environment.json', environment]]) {
  const file = resolve(target, name), text = JSON.stringify(data, null, 2) + '\n';
  if (check) {
    if (readFileSync(file, 'utf8') !== text) throw new Error(`${name} is stale; run npm run generate --prefix tools/api`);
  } else writeFileSync(file, text);
}
console.log(check ? 'Postman artifacts are in sync.' : 'Generated Postman collection and empty-secret environment.');
