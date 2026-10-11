import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const base = (process.env.API_BASE_URL || 'http://127.0.0.1:18081').replace(/\/$/, '');
const health = await (await fetch(base + '/api/health')).json();
assert.equal(health.databaseName, 'mini_ong_vang_test', 'Report smoke requires the isolated test DB');
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

const spec=JSON.parse(readFileSync(new URL('../../src/backend/src/main/webapp/openapi.json',import.meta.url),'utf8'));
const ajv=new Ajv2020({strict:false});addFormats(ajv);
const schema=ajv.compile({$ref:'#/components/schemas/Report',components:spec.components});
const anon=new Client(),admin=new Client(),customer=new Client(),dispatcher=new Client(),driver=new Client();
const query='?tuNgay=2026-10-01&denNgay=2026-10-03';
await anon.call('/api/reports/revenue'+query,undefined,401,'AUTH_REQUIRED');
await anon.call('/api/reports/revenue/export'+query,undefined,401,'AUTH_REQUIRED');
await admin.login('demo_admin',process.env.DEMO_PASSWORD);
await customer.login('0900000001',process.env.DEMO_PASSWORD);
await dispatcher.login('demo_dispatcher',process.env.DEMO_PASSWORD);
await driver.login('0800000001',process.env.DEMO_PASSWORD);
for(const client of [customer,dispatcher,driver]) {
  await client.call('/api/reports/revenue'+query,undefined,403,'FORBIDDEN');
  await client.call('/api/reports/revenue/export'+query,undefined,403,'FORBIDDEN');
}
for(const endpoint of ['/api/reports/revenue','/api/reports/revenue/export']) {
  await admin.call(endpoint,undefined,400,'VALIDATION_ERROR');
  await admin.call(endpoint+'?tuNgay=2026-02-30&denNgay=2026-03-02',undefined,400,'DATE_RANGE_INVALID');
  await admin.call(endpoint+'?tuNgay=2026-10-02&denNgay=2026-10-01',undefined,400,'DATE_RANGE_INVALID');
  await admin.call(endpoint+'?tuNgay=2026-10-01&denNgay=2026-10-01',undefined,400,'DATE_RANGE_INVALID');
  await admin.call(endpoint+query+'&nhomTheo=BAD',undefined,400,'VALIDATION_ERROR');
  await admin.call(endpoint+query+'&tuNgay=2026-10-01',undefined,400,'VALIDATION_ERROR');
}
const empty=await admin.call('/api/reports/revenue?tuNgay=2000-01-01&denNgay=2000-01-03');
assert(schema(empty),JSON.stringify(schema.errors));assert.equal(empty.items.length,2);
assert.equal(empty.tong.giaTriDonHoanTat,'0.00');assert.equal(empty.tong.tienThucThu,'0.00');
assert.equal(empty.tong.cuocConPhaiThuCuoiKy,'0.00');
const input={diemLayHang:'Điểm mẫu A',diemGiaoHang:'Điểm mẫu B',kienHang:[{loaiHangHoa:'Hoa',khoiLuongKg:'1.00'},{loaiHangHoa:'Tài liệu',khoiLuongKg:'2.00'}]};
const quote=await customer.call('/api/quotes',input);
const order=await customer.call('/api/orders',{...input,maBaoGia:quote.maBaoGia,sdtNguoiNhan:'0901234567'},201,undefined,{'Idempotency-Key':randomUUID()});
const path='/api/orders/'+order.maDon;
await dispatcher.call(path+'/assignments',{maTx:'TX-DEMO-1'});
for(const trangThai of ['DA_LAY_HANG','DANG_GIAO','HOAN_TAT']) await driver.call(path+'/transitions',{trangThai});
const partial=await customer.call(path+'/payments',{phuongThuc:'TIEN_MAT'},201,undefined,{'Idempotency-Key':randomUUID()});
await driver.call('/api/payments/'+partial.maGiaoDich+'/confirm-cash',{soTienDaThu:'5000.00'},422,'PAYMENT_AMOUNT_MISMATCH');
const full=await customer.call(path+'/payments',{phuongThuc:'TIEN_MAT'},201,undefined,{'Idempotency-Key':randomUUID()});
await driver.call('/api/payments/'+full.maGiaoDich+'/confirm-cash',{soTienDaThu:full.soTien});
const now=new Date(),day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const next=new Date(day+'T00:00:00Z');next.setUTCDate(next.getUTCDate()+1);
const period=`?tuNgay=${day}&denNgay=${next.toISOString().slice(0,10)}`;
const report=await admin.call('/api/reports/revenue'+period);
assert(schema(report),JSON.stringify(schema.errors));assert.equal(report.tong.giaTriDonHoanTat,order.cuoc.tongCuoc);
assert.equal(Number(report.tong.tienThucThu),Number(full.soTien)+5000);assert.equal(report.tong.tienThuChuaPhanBo,'5000.00');
assert.equal(report.tong.cuocConPhaiThuCuoiKy,'0.00');assert.equal(report.tong.soDonHoanTat,1);
function sheet(bytes) {
  let end=bytes.length-22;while(end>=0&&bytes.readUInt32LE(end)!==0x06054b50)end--;
  assert(end>=0);let offset=bytes.readUInt32LE(end+16);
  for(let i=0;i<bytes.readUInt16LE(end+10);i++) {
    assert.equal(bytes.readUInt32LE(offset),0x02014b50);
    const length=bytes.readUInt16LE(offset+28),name=bytes.subarray(offset+46,offset+46+length).toString();
    if(name==='xl/worksheets/sheet1.xml') {
      const local=bytes.readUInt32LE(offset+42),start=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28);
      const data=bytes.subarray(start,start+bytes.readUInt32LE(offset+20));
      return (bytes.readUInt16LE(offset+10)===8?inflateRawSync(data):data).toString();
    }
    offset+=46+length+bytes.readUInt16LE(offset+30)+bytes.readUInt16LE(offset+32);
  }
  throw new Error('Workbook sheet missing');
}
for(const group of ['NGAY','TUAN','THANG']) {
  const q=period+'&nhomTheo='+group;
  const json=await admin.call('/api/reports/revenue'+q);assert(schema(json),JSON.stringify(schema.errors));
  const response=await fetch(base+'/api/reports/revenue/export'+q,{headers:{Cookie:admin.cookie},signal:AbortSignal.timeout(20000)});
  assert.equal(response.status,200);assert(response.headers.get('content-type').includes('spreadsheetml.sheet'));
  assert(response.headers.get('content-disposition').includes('.xlsx'));
  const bytes=Buffer.from(await response.arrayBuffer()),xml=sheet(bytes);checks++;
  for(const [cell,value] of Object.entries({C5:json.tong.giaTriDonHoanTat,D5:json.tong.tienThucThu,E5:json.tong.tienThuChuaPhanBo,F5:json.tong.cuocConPhaiThuCuoiKy,G5:String(json.tong.soDonHoanTat),H5:String(json.tong.soDonHuy)}))
    assert(xml.includes(`<c r="${cell}" s="${cell[0]<'G'?1:0}"><v>${value}</v></c>`));
  if(process.env.REPORT_EXPORT_DIR) writeFileSync(process.env.REPORT_EXPORT_DIR+'/'+group+'.xlsx',bytes);
  assert.deepEqual(await admin.call('/api/reports/revenue'+q),json);
}
console.log(`PASS: ${checks} T17 HTTP checks; admin permissions, filters, actual receipts, unallocated receipts and matching XLSX.`);
