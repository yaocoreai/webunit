import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import { applicationDatabaseSchema } from "../../database/schema/application";
import { renderSqlSchema } from '@/function/common/db/schema';
import { createFileCache } from '@/function/infrastructure/node/file-cache';
import { createFilesystemStorage } from '@/function/infrastructure/server/filesystem-storage';
import { createMemoryRateLimiter } from '@/function/infrastructure/node/memory-rate-limiter';
import { createSqliteDatabase } from '@/function/infrastructure/server/sqlite-database';

const budgets = {
  sqliteBatchMs: number('ENTERPRISE_SQLITE_BATCH_MS', 5_000),
  cacheRoundTripMs: number('ENTERPRISE_CACHE_ROUNDTRIP_MS', 5_000),
  storageRoundTripMs: number('ENTERPRISE_STORAGE_ROUNDTRIP_MS', 5_000),
  rateOperationsMs: number('ENTERPRISE_RATE_OPERATIONS_MS', 3_000),
};

test('Node and Container SQLite sustain atomic enterprise batch workloads', async () => {
  for (const topology of ['node', 'container']) {
    const database = createSqliteDatabase(':memory:');
    database.execute(renderSqlSchema(applicationDatabaseSchema));
    const statements = Array.from({ length: 2_000 }, (_, index) => database.prepare('insert into database_seed_records (seed_key,checksum,applied_at) values (?,?,?)').bind(`${topology}/load-${index}`, '01234567', '2026-01-01T00:00:00.000Z'));
    const duration = await measured(() => database.batch(statements));
    const count = await database.prepare('select count(*) as count from database_seed_records').first<{ count: number }>();
    assert.equal(count?.count, 2_000);
    assert.ok(duration <= budgets.sqliteBatchMs, `${topology} SQLite batch ${duration}ms > ${budgets.sqliteBatchMs}ms`);
    database.close();
  }
});

test('Node file Cache sustains concurrent durable round trips', async (context) => {
  const directory = await temporary(context, 'webunit-enterprise-cache-');
  const cache = createFileCache(directory);
  const duration = await measured(async () => {
    await Promise.all(Array.from({ length: 500 }, (_, index) => cache.put(`load/${index}`, JSON.stringify({ index }))));
    const values = await Promise.all(Array.from({ length: 500 }, (_, index) => cache.get(`load/${index}`)));
    assert.equal(values.filter(Boolean).length, 500);
  });
  assert.ok(duration <= budgets.cacheRoundTripMs, `file Cache ${duration}ms > ${budgets.cacheRoundTripMs}ms`);
});

test('Node filesystem Storage sustains concurrent object round trips', async (context) => {
  const directory = await temporary(context, 'webunit-enterprise-storage-');
  await mkdir(directory, { recursive: true });
  const storage = createFilesystemStorage(directory);
  const payload = new Uint8Array(64 * 1024).fill(7);
  const duration = await measured(async () => {
    await Promise.all(Array.from({ length: 128 }, (_, index) => storage.put(`load/${index}.bin`, payload)));
    const objects = await Promise.all(Array.from({ length: 128 }, (_, index) => storage.get(`load/${index}.bin`)));
    assert.equal(objects.reduce((total, object) => total + (object?.size ?? 0), 0), payload.byteLength * 128);
  });
  assert.ok(duration <= budgets.storageRoundTripMs, `filesystem Storage ${duration}ms > ${budgets.storageRoundTripMs}ms`);
});

test('Node Rate Limit remains deterministic under concurrent pressure', async () => {
  const limiter = createMemoryRateLimiter();
  const duration = await measured(async () => {
    const results = await Promise.all(Array.from({ length: 20_000 }, () => limiter.consume({ bucket: 'enterprise', key: 'shared', limit: 10_000, windowMs: 60_000 })));
    assert.equal(results.filter(({ allowed }) => allowed).length, 10_000);
    assert.equal(results.at(-1)?.remaining, 0);
  });
  assert.ok(duration <= budgets.rateOperationsMs, `memory Rate Limit ${duration}ms > ${budgets.rateOperationsMs}ms`);
});

async function measured(operation: () => unknown | Promise<unknown>) { const started = performance.now(); await operation(); return Math.round((performance.now() - started) * 100) / 100; }
async function temporary(context: test.TestContext, prefix: string) { const directory = await mkdtemp(join(tmpdir(), prefix)); context.after(() => rm(directory, { recursive: true, force: true })); return directory; }
function number(name: string, fallback: number) { const value = Number(process.env[name] ?? fallback); if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be positive`); return value; }
