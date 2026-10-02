import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createFileCache } from '@/function/infrastructure/node/file-cache';

test('file Cache persists values, expires TTL records and supports deletion', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'webunit-cache-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const cache = createFileCache(root);
  await cache.put('site:settings', '{"enabled":true}');
  assert.equal(await cache.get('site:settings'), '{"enabled":true}');
  await cache.delete('site:settings');
  assert.equal(await cache.get('site:settings'), null);
  await assert.rejects(() => cache.put('expired', 'value', { expirationTtl: -1 }), /expiration TTL/);
});
