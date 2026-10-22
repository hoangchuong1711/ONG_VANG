import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import assert from 'node:assert/strict';
// Export report copies from the application, never rebuild from archived history.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'src/backend/src/main/resources/db/designV2/sqlserver');
const output = resolve(root, 'docs/database/design-v2-complete');
const check = process.argv.includes('--check');
for (const folder of ['schema', 'demo']) {
  for (const name of readdirSync(resolve(source, folder)).filter(n => /^V\d+__.*\.sql$/.test(n))) {
    const [, version, suffix] = name.match(/^V(\d+)__(.*)$/);
    const target = resolve(output, `${version.padStart(2, '0')}_${suffix}`);
    const text = readFileSync(resolve(source, folder, name), 'utf8').replace(/\r\n/g, '\n');
    if (check) assert.equal(readFileSync(target, 'utf8').replace(/\r\n/g, '\n'), text, `${target} is stale`);
    else { mkdirSync(output, {recursive: true}); writeFileSync(target, text); }
  }
}
console.log(check ? 'Report SQL matches application migrations.' : 'Exported application migrations for the report.');
