import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

function setup() {
  let config;
  const status = {};
  function SwaggerUIBundle(value) { config = value; return {}; }
  SwaggerUIBundle.presets = { apis: {} };
  vm.runInNewContext(readFileSync(new URL('../../src/backend/src/main/webapp/swagger-ui/swagger-config.js', import.meta.url), 'utf8'), {
    URL, SwaggerUIBundle, window: { location: { href: 'http://localhost:8081/backend/swagger-ui/' } },
    document: { getElementById: () => status }
  });
  return config;
}
test('resolves spec in deployed context, sends CSRF only on same-origin writes', () => {
  const config = setup();
  assert.equal(config.url, 'http://localhost:8081/backend/openapi.json');
  config.responseInterceptor({ url: 'http://localhost:8081/backend/api/auth/csrf', status: 200, obj: { csrfToken: 'test-token' } });
  const mutate = config.requestInterceptor({ url: '/backend/api/orders', method: 'POST', headers: {} });
  assert.equal(mutate.headers['X-CSRF-Token'], 'test-token');
  assert.equal(mutate.credentials, 'same-origin');
  const external = config.requestInterceptor({ url: 'https://example.com/api', method: 'POST', headers: {} });
  assert.equal(external.headers['X-CSRF-Token'], undefined);
  assert.equal(config.requestInterceptor({ url: '/backend/api/orders', method: 'GET', headers: {} }).headers['X-CSRF-Token'], undefined);
});
test('login, logout and expired session clear stale CSRF tokens', () => {
  for (const [path, code] of [['login',200],['logout',204],['me',401]]) {
    const config = setup();
    config.responseInterceptor({ url: '/backend/api/auth/csrf', status: 200, text: '{"csrfToken":"old"}' });
    config.responseInterceptor({ url: '/backend/api/auth/' + path, status: code });
    assert.equal(config.requestInterceptor({ url: '/backend/api/orders', method: 'POST', headers: {} }).headers['X-CSRF-Token'], undefined);
  }
});
