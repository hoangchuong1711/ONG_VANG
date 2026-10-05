import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const base = (process.env.API_BASE_URL || 'http://localhost:8081').replace(/\/$/, '');
const local = JSON.parse(readFileSync(new URL('../../src/backend/src/main/webapp/openapi.json', import.meta.url), 'utf8'));
// Compose waits for PostgreSQL health, but Tomcat may still be deploying the WAR.
const deadline = Date.now() + 60000;
while (true) {
  try {
    const response = await fetch(base + '/api/health', { signal: AbortSignal.timeout(3000) });
    if (response.status === 200 && (await response.json()).database === 'connected') break;
  } catch (_) { /* Retry only during bounded startup, not the assertions below. */ }
  assert(Date.now() < deadline, 'Backend/DB did not become healthy within 60 seconds');
  await new Promise(resolve => setTimeout(resolve, 1000));
}
async function get(path, contentType) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  assert(response.headers.get('content-type')?.includes(contentType), `${path}: wrong content-type`);
  return response;
}
const served = await (await get('/openapi.json', 'application/json')).json();
assert(isDeepStrictEqual(served, local), 'Deployed spec differs from working tree; rebuild backend.');
const html = await (await get('/swagger-ui/', 'text/html')).text();
assert(html.includes('./vendor/swagger-ui-bundle.js'));
for (const [path, type] of [
  ['/swagger-ui/vendor/swagger-ui-bundle.js','javascript'],
  ['/swagger-ui/vendor/swagger-ui.css','text/css'],
  ['/swagger-ui/swagger-config.js','javascript'],
  ['/swagger-ui/style.css','text/css']
]) {
  const actual = Buffer.from(await (await get(path, type)).arrayBuffer());
  const expected = readFileSync(new URL('../../src/backend/src/main/webapp' + path, import.meta.url));
  assert(actual.equals(expected), `${path}: deployed asset differs`);
}
const health = await (await get('/api/health', 'application/json')).json();
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
assert(ajv.validate(local.components.schemas.Health, health), JSON.stringify(ajv.errors));
assert.equal(health.status, 'ok');
assert.equal(health.database, 'connected');
if (process.env.API_EXPECTED_DATABASE) {
  assert.equal(health.databaseName, process.env.API_EXPECTED_DATABASE, 'Smoke must target the isolated test database');
}
console.log('PASS: deployed spec matches source; Swagger HTML and all JS/CSS served; real BE/DB health=200 connected.');
console.log('Business endpoints and visual browser rendering are not covered by this smoke.');
