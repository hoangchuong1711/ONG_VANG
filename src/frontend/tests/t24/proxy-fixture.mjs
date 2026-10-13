// Deliberately a protocol fixture, not SQL Server or business-rule evidence.
import { createServer } from 'node:http';
const user = { maNguoiDung: 'TEST-TD', hoTen: 'Tổng đài kiểm thử proxy', vaiTro: 'TONG_DAI', maKh: null, maTx: null };
createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const send = (status, data) => { res.statusCode = status; res.end(JSON.stringify(data)); };
  const path = new URL(req.url, 'http://localhost').pathname;
  const logged = /JSESSIONID=fixture-auth/.test(req.headers.cookie ?? '');
  if (path === '/ready') return send(200, {});
  if (path === '/api/auth/csrf') {
    if (!logged) res.setHeader('Set-Cookie', 'JSESSIONID=fixture-anon; Path=/; HttpOnly; SameSite=Lax');
    return send(200, { csrfToken: logged ? 'fixture-new-token' : 'fixture-old-token', headerName: 'X-CSRF-Token' });
  }
  if (path === '/api/auth/me') return logged ? send(200, user) : send(401, { code: 'AUTH_REQUIRED' });
  if (path === '/api/auth/login') {
    let raw = ''; for await (const part of req) raw += part;
    const body = JSON.parse(raw);
    if (!/JSESSIONID=fixture-anon/.test(req.headers.cookie ?? '') || req.headers['x-csrf-token'] !== 'fixture-old-token' || body.username !== 'fixture-dispatcher' || body.password !== 'fixture-password') return send(403, { code: 'CSRF_INVALID' });
    res.setHeader('Set-Cookie', 'JSESSIONID=fixture-auth; Path=/; HttpOnly; SameSite=Lax');
    return send(200, user);
  }
  if (path === '/api/auth/logout') {
    if (!logged || req.headers['x-csrf-token'] !== 'fixture-new-token') return send(403, { code: 'CSRF_INVALID' });
    res.setHeader('Set-Cookie', 'JSESSIONID=; Path=/; HttpOnly; Max-Age=0'); res.statusCode = 204; return res.end();
  }
  if (path === '/api/orders') return logged ? send(200, { items: [], page: 0, size: 10, totalElements: 0, totalPages: 0, summary: { tongSoDon: 0, tongCuoc: '0.00' } }) : send(401, { code: 'AUTH_REQUIRED' });
  send(404, { code: 'RESOURCE_NOT_FOUND' });
}).listen(18082, '127.0.0.1');
