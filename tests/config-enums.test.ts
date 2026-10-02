import assert from 'node:assert/strict';
import test from 'node:test';
import { applicationDatabaseSchema } from "../database/schema/application";
import { renderSqlSchema } from '@/function/common/db/schema';
import { createConfigService } from '@/function/common/config/service';
import { createFileCache } from '@/function/infrastructure/node/file-cache';
import { createSqliteDatabase } from '@/function/infrastructure/server/sqlite-database';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('Config persists JSON values, versions writes, invalidates cache and soft deletes', async (context) => {
  const database = createSqliteDatabase(':memory:');
  const cacheRoot = await mkdtemp(join(tmpdir(), 'webunit-config-cache-'));
  context.after(async () => { database.close(); await rm(cacheRoot, { recursive: true, force: true }); });
  database.execute(renderSqlSchema(applicationDatabaseSchema));
  const cache = createFileCache(cacheRoot);
  const service = createConfigService({ getDatabase: () => database, getCache: () => cache });

  assert.equal(await service.get('site', 'theme'), undefined);
  assert.equal((await service.set('site', 'theme', { value: { name: 'datas' } })).version, 1);
  assert.deepEqual((await service.get('site', 'theme'))?.value, { name: 'datas' });
  assert.equal((await service.set('site', 'theme', { value: { name: 'service' } })).version, 2);
  assert.deepEqual((await service.get('site', 'theme'))?.value, { name: 'service' });
  assert.deepEqual(await service.list({ page: 1, pageSize: 20 }), { items: [{ namespace: 'site', key: 'theme', value: { name: 'service' }, visibility: 'private', version: 2, updatedAt: (await service.get('site', 'theme'))!.updatedAt }], total: 1, page: 1, pageSize: 20 });
  assert.equal(await service.getPublic('site', 'theme'), undefined);
  assert.equal((await service.set('site', 'theme', { value: { name: 'public' }, visibility: 'public' })).visibility, 'public');
  assert.deepEqual((await service.getPublic('site', 'theme'))?.value, { name: 'public' });
  assert.equal((await service.set('site', 'theme', { value: { name: 'still-public' } })).visibility, 'public');
  assert.equal((await service.list({ namespace: 'missing', page: 1, pageSize: 20 })).total, 0);
  assert.equal(await service.delete('site', 'theme'), true);
  assert.equal(await service.get('site', 'theme'), undefined);
});
