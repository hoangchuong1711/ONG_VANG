import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const file = resolve(root, 'src/backend/src/main/webapp/openapi.json');
const spec = JSON.parse(readFileSync(file, 'utf8'));
await SwaggerParser.validate(file, { resolve: { external: false } });
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
let exampleCount = 0;
function example(schema, value, label) {
  const validate = ajv.compile({ ...schema, components: spec.components });
  assert(validate(value), `${label}: ${JSON.stringify(validate.errors)}`);
  exampleCount++;
}
for (const [name, schema] of Object.entries(spec.components.schemas)) {
  assert(ajv.validateSchema(schema), `${name}: invalid JSON schema`);
  for (const value of schema.examples || []) example({ $ref: '#/components/schemas/' + name }, value, name);
}
const ids = new Set(), ucs = new Set();
for (const [path, methods] of Object.entries(spec.paths)) for (const [method, op] of Object.entries(methods)) {
  assert(!ids.has(op.operationId), 'Duplicate operationId'); ids.add(op.operationId);
  assert(['implemented', 'planned'].includes(op['x-implementation-status']));
  assert(op['x-roles'].length > 0);
  op['x-uc'].forEach(uc => ucs.add(uc));
  const parameters = op.parameters || [];
  for (const [, name] of path.matchAll(/\{(\w+)\}/g)) assert(parameters.some(p => p.in === 'path' && p.name === name && p.required), `${path}: missing path parameter`);
  if (method === 'post') assert(op.security.some(s => 'csrfToken' in s), `${op.operationId}: missing CSRF`);
  for (const [status, codes] of Object.entries(op['x-error-codes'] || {})) {
    const response = op.responses[status];
    assert(response, `${op.operationId}: missing status ${status}`);
    for (const code of codes) assert(response.content['application/json'].examples[code], `${op.operationId}: missing ${code} example`);
  }
  if (op.requestBody) {
    for (const media of Object.values(op.requestBody.content)) example(media.schema, media.example, `${op.operationId} request`);
  }
  for (const [status, response] of Object.entries(op.responses)) for (const media of Object.values(response.content || {})) {
    if ('example' in media) example(media.schema, media.example, `${op.operationId} ${status}`);
    for (const [name, e] of Object.entries(media.examples || {})) example(media.schema, e.value, `${op.operationId} ${status} ${name}`);
  }
}
assert.deepEqual([...ucs].sort(), ['UC-01','UC-02','UC-03','UC-04','UC-05','UC-08','UC-10','UC-12','UC-13','UC-14','UC-15','UC-19']);
// Check vendored files against the pinned package, including license attribution.
for (const name of ['swagger-ui.css','swagger-ui-bundle.js','LICENSE','NOTICE']) {
  assert(readFileSync(resolve(root, 'src/backend/src/main/webapp/swagger-ui/vendor', name)).equals(readFileSync(resolve(root, 'tools/api/node_modules/swagger-ui-dist', name))), `${name}: vendor drift`);
}
console.log(`OpenAPI valid: ${ids.size} operations, ${ucs.size} UCs, ${exampleCount} schema-checked examples.`);
