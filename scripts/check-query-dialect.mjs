import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const root = new URL('../src/function/', import.meta.url);
const files = await collect(root);
const forbidden = [
  [/\$\d+\b/, 'PostgreSQL positional parameter'],
  [/::(?:jsonb?|uuid|text|timestamp)\b/i, 'PostgreSQL cast'],
  [/\b(?:ilike|serial|bigserial|jsonb)\b/i, 'PostgreSQL-only keyword'],
  [/\breturning\b/i, 'RETURNING clause'],
  [/\bnow\(\)/i, 'database clock function'],
];
const failures = [];
for (const file of files) {
  const source = await readFile(file, 'utf8');
  const queries = [...source.matchAll(/\.(?:prepare|execute)\(\s*(['"`])([\s\S]*?)\1\s*,?\s*\)/g)].map((match) => match[2]);
  for (const query of queries) {
    for (const [pattern, label] of forbidden) if (pattern.test(query)) failures.push(`${file.pathname}: ${label}`);
  }
}
assert.deepEqual(failures, [], `Service queries must use the SQLite/D1 common dialect:\n${failures.join('\n')}`);
console.info(`[db:check:dialect] status=completed dialect=sqlite-d1 files=${files.length}`);

async function collect(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
    if (entry.isDirectory()) output.push(...await collect(child));
    else if (entry.name.endsWith('.ts')) output.push(child);
  }
  return output;
}
