import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const source = dirname(require.resolve('swagger-ui-dist/package.json'));
const target = resolve(dirname(fileURLToPath(import.meta.url)), '../../src/backend/src/main/webapp/swagger-ui/vendor');
mkdirSync(target, { recursive: true });
for (const name of ['swagger-ui.css', 'swagger-ui-bundle.js', 'LICENSE', 'NOTICE']) {
  copyFileSync(resolve(source, name), resolve(target, name));
}
console.log('Vendored Swagger UI 5.33.1 (CSS, bundle and licenses).');
