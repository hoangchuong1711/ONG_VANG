(function () {
  'use strict';
  const base = new URL('../', window.location.href);
  const csrfPath = new URL('api/auth/csrf', base).pathname;
  const loginPath = new URL('api/auth/login', base).pathname;
  const logoutPath = new URL('api/auth/logout', base).pathname;
  let csrfToken = '';

  function setToken(token) {
    csrfToken = typeof token === 'string' ? token : '';
    document.getElementById('csrf-status').textContent = csrfToken
      ? 'Đã có CSRF token cho phiên hiện tại.'
      : 'Chưa có CSRF token. Gọi getCsrf sau đăng nhập hoặc khi tải lại trang.';
  }

  window.ui = SwaggerUIBundle({
    url: new URL('openapi.json', base).href,
    dom_id: '#swagger-ui',
    deepLinking: true,
    displayOperationId: true,
    filter: true,
    showExtensions: true,
    persistAuthorization: false,
    validatorUrl: null,
    presets: [SwaggerUIBundle.presets.apis],
    requestInterceptor: function (request) {
      const url = new URL(request.url, base);
      if (url.origin === base.origin) {
        request.credentials = 'same-origin';
        if (!['GET', 'HEAD', 'OPTIONS'].includes((request.method || 'GET').toUpperCase()) && csrfToken) {
          request.headers = request.headers || {};
          request.headers['X-CSRF-Token'] = csrfToken;
        }
      }
      return request;
    },
    responseInterceptor: function (response) {
      if (!response.url) return response;
      const url = new URL(response.url, base);
      if (url.origin !== base.origin) return response;
      if (response.status === 401 || (response.status >= 200 && response.status < 300 && [loginPath, logoutPath].includes(url.pathname))) {
        setToken('');
      } else if (url.pathname === csrfPath && response.status === 200) {
        try {
          const body = response.obj || JSON.parse(response.text || '{}');
          setToken(body.csrfToken);
        } catch (_) {
          setToken('');
        }
      } else if (response.status === 403 && response.obj && response.obj.code === 'CSRF_INVALID') {
        setToken('');
      }
      return response;
    }
  });
}());
