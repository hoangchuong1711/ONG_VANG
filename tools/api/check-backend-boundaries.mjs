import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../src/backend/src/main/java/com/miniongvang');

async function javaFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? javaFiles(file) : entry.name.endsWith('.java') ? [file] : [];
  }));
  return nested.flat();
}

const violations = [];
for (const file of await javaFiles(root)) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const source = await readFile(file, 'utf8');
  if (relative.startsWith('dto/')) {
    assert.match(source, /^package com\.miniongvang\.dto\./m, relative);
    if (/com\.miniongvang\.(?:service|dao|controller|web|config)\./.test(source)
        || /com\.miniongvang\.entity\.(?!enums\.)/.test(source)
        || /\bjakarta\.persistence\./.test(source)) {
      violations.push(`${relative}: DTO phụ thuộc vào tầng nghiệp vụ hoặc lưu trữ`);
    }
  }
  if (relative.startsWith('controller/') || relative.startsWith('web/')) {
    if (/com\.miniongvang\.dao\.|com\.miniongvang\.entity\.(?!enums\.)/.test(source))
      violations.push(`${relative}: HTTP handler truy cập entity/DAO`);
    if (/\b(?:Auth|Customer|Dispatch|Order|Payment|Quote|Report|Route)Servlet\.handle\(/.test(source))
      violations.push(`${relative}: HTTP handler gọi servlet khác`);
  }
  if (relative === 'security/ActorContext.java' && /com\.miniongvang\.dto\./.test(source))
    violations.push(`${relative}: ngữ cảnh nghiệp vụ phụ thuộc DTO công khai`);
  if (/com\.miniongvang\.DAO\.|^package com\.miniongvang\.DAO;/m.test(source))
    violations.push(`${relative}: package DAO cũ`);
}

assert.deepEqual(violations, [], violations.join('\n'));
console.log('Backend layer boundaries: PASS');
