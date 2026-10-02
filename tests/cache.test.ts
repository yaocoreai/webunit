import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import {
  createCache,
  maxCacheEncodedValueBytes,
  maxCacheTtlSeconds,
  resolveCacheKey,
} from '@/platform/cache';
import { createFileCache, createFileCachePath, pruneExpiredFileCache } from '@/platform/infrastructure/node/cache';
import { createKvCache } from '@/platform/infrastructure/workers/cache';
import {
  assertRedisCacheUrl,
  createRedisCache,
  createRedisCacheFromUrl,
  readRedisCacheMaxConnections,
  readRedisCacheTimeoutMs,
} from '@/platform/infrastructure/container/cache';
import { connectWebCache as connectNodeCache } from '@/platform/infrastructure/node/cache-runtime';
import { connectWebCache as connectContainerCache } from '@/platform/infrastructure/container/cache-runtime';
import { connectWebCache as connectWorkersCache } from '@/platform/infrastructure/workers/cache-runtime';

test('Web Cache uses the shared key, codec, TTL, and size contract', async () => {
  const records = new Map<string, unknown>();
  const options = new Map<string, Readonly<{ ttlSeconds?: number }>>();
  let encoded = 0;
  const cache = createCache({
    get: async (key) => records.get(key) as never,
    set: async (key, record, setOptions = {}) => {
      records.set(key, JSON.parse(record.raw)[0]);
      options.set(key, setOptions);
    },
    delete: async (key) => {
      records.delete(key);
    },
  });
  const value = { toJSON: () => { encoded += 1; return { enabled: true }; } };

  await cache.set({ namespace: 'site', key: 'feature.current' }, value, { ttlSeconds: 30 });
  assert.equal(encoded, 1);
  assert.deepEqual(await cache.get({ namespace: 'site', key: 'feature.current' }), { enabled: true });
  assert.deepEqual(options.get('4:site:feature.current'), { ttlSeconds: 30 });
  assert.equal(resolveCacheKey('site.title'), '7:default:site.title');
  assert.throws(() => cache.get('Site.Title'), /Invalid cache key/);
  assert.throws(() => cache.set('site.title', true, { ttlSeconds: 0 }), /Invalid cache ttlSeconds/);
  assert.throws(
    () => cache.set('site.title', true, { ttlSeconds: maxCacheTtlSeconds + 1 }),
    /Invalid cache ttlSeconds/,
  );
  assert.throws(() => cache.set('site.title', undefined), /Cannot encode undefined/);
  assert.throws(() => cache.set('site.title', 'x'.repeat(maxCacheEncodedValueBytes + 1)), /exceeds max encoded bytes/);
  assert.throws(
    () => cache.set('site.title', '\u754c'.repeat(Math.floor(maxCacheEncodedValueBytes / 3) + 1)),
    /exceeds max encoded bytes/,
  );

  let loads = 0;
  assert.equal(await cache.getOrSet('site.missing', () => { loads += 1; return 'loaded'; }), 'loaded');
  assert.equal(await cache.getOrSet('site.missing', () => { loads += 1; return 'other'; }), 'loaded');
  assert.equal(loads, 1);
  await cache.delete('site.missing');
  assert.equal(await cache.get('site.missing'), undefined);
});

test('File Cache expires, prunes, and deletes values', async () => {
  const root = await mkdtemp(join(tmpdir(), 'webunit-site-cache-'));
  try {
    const cache = createFileCache(root, { cleanupIntervalMs: 0 });
    await cache.set('site.maximum-ttl', { value: 'valid' }, { ttlSeconds: maxCacheTtlSeconds });
    assert.deepEqual(await cache.get('site.maximum-ttl'), { value: 'valid' });
    await cache.set('site.current', { value: 1 }, { ttlSeconds: 60 });
    const currentPath = createFileCachePath(root, 'site.current');
    if (process.platform !== 'win32') {
      assert.equal((await stat(dirname(currentPath))).mode & 0o777, 0o700);
      assert.equal((await stat(currentPath)).mode & 0o777, 0o600);
    }
    assert.deepEqual(await cache.get('site.current'), { value: 1 });
    await cache.delete('site.current');
    assert.equal(await cache.get('site.current'), undefined);

    await cache.set('site.expired', { value: 2 }, { ttlSeconds: 60 });
    const path = createFileCachePath(root, 'site.expired');
    const record = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
    await writeFile(path, JSON.stringify({ ...record, expiresAt: Date.now() - 1 }));
    const operationNow = Date.now();
    const staleOperationPath = `${path}.${operationNow - 6 * 60_000}.00000000-0000-4000-8000-000000000001.tmp`;
    const recentOperationPath = `${path}.${operationNow}.00000000-0000-4000-8000-000000000003.tmp`;
    await writeFile(staleOperationPath, 'stale');
    await writeFile(recentOperationPath, 'recent');
    await pruneExpiredFileCache(root);
    assert.equal(await cache.get('site.expired'), undefined);
    assert.equal(await readFile(staleOperationPath, 'utf8').catch(() => undefined), undefined);
    assert.equal(await readFile(recentOperationPath, 'utf8'), 'recent');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('KV Cache preserves short logical TTLs without blind cleanup of stale reads', async () => {
  const originalDateNow = Date.now;
  const now = originalDateNow();
  const records = new Map<string, string>();
  const writes: Array<Readonly<{ key: string; expirationTtl?: number }>> = [];
  const deleted: string[] = [];
  const binding = {
    get: async (key: string) => records.get(key) ?? null,
    put: async (key: string, value: string, options?: Readonly<{ expirationTtl?: number }>) => {
      records.set(key, value);
      writes.push({ key, expirationTtl: options?.expirationTtl });
    },
    delete: async (key: string) => {
      records.delete(key);
      deleted.push(key);
    },
  };
  const cache = createKvCache(binding);
  try {
    Date.now = () => now;
    await cache.set('site.current', { value: 1 }, { ttlSeconds: 1 });
    assert.deepEqual(writes, [{ key: '7:default:site.current', expirationTtl: 60 }]);
    assert.deepEqual(JSON.parse(records.get('7:default:site.current') ?? ''), {
      encoding: 'json-row',
      raw: '[{"value":1}]',
      expiresAt: now + 1000,
    });
    assert.deepEqual(await cache.get('site.current'), { value: 1 });
    Date.now = () => now + 1001;
    assert.equal(await cache.get('site.current'), undefined);
    assert.equal(records.has('7:default:site.current'), true);
    records.set('7:default:site.corrupt', '{');
    assert.equal(await cache.get('site.corrupt'), undefined);
    assert.equal(records.has('7:default:site.corrupt'), true);
    records.set('7:default:site.oversized', JSON.stringify({
      encoding: 'json-row',
      raw: `["${'x'.repeat(maxCacheEncodedValueBytes)}"]`,
    }));
    assert.equal(await cache.get('site.oversized'), undefined);
    assert.equal(records.has('7:default:site.oversized'), true);
    assert.deepEqual(deleted, []);
    await cache.delete('site.corrupt');
    assert.equal(records.has('7:default:site.corrupt'), false);
    assert.deepEqual(deleted, ['7:default:site.corrupt']);
  } finally {
    Date.now = originalDateNow;
  }
});

test('Redis Cache preserves the codec contract', async () => {
  const records = new Map<string, string>();
  const cache = createRedisCache({
    get: async (key) => records.get(key) ?? null,
    set: async (key, value) => { records.set(key, value); },
    delete: async (key) => { records.delete(key); },
  });
  await cache.set('site.current', { value: 1 });
  assert.deepEqual(await cache.get('site.current'), { value: 1 });
  await cache.delete('site.current');
  assert.equal(await cache.get('site.current'), undefined);
  assert.equal(readRedisCacheMaxConnections(undefined), undefined);
  assert.equal(readRedisCacheMaxConnections('4'), 4);
  assert.equal(readRedisCacheTimeoutMs(undefined), undefined);
  assert.equal(readRedisCacheTimeoutMs('5000'), 5000);
  assert.throws(() => readRedisCacheMaxConnections('0'), /expected 1\.\.32/);
  assert.throws(() => readRedisCacheTimeoutMs('99'), /expected 100\.\.60000/);
  assert.throws(() => assertRedisCacheUrl('redis://cache.example.com/0?tls=true'), /query and fragment/);
  assert.throws(() => assertRedisCacheUrl('redis://user@cache.example.com/0'), /username requires a password/);
  assert.throws(() => assertRedisCacheUrl('redis:///0'), /hostname is required/);
  assert.throws(() => assertRedisCacheUrl('redis://cache.example.com:0/0'), /port must be 1\.\.65535/);
  assert.throws(() => assertRedisCacheUrl('redis://cache.example.com/1'), /only database 0 is supported/);

  records.set('7:default:site.oversized', `["${'x'.repeat(maxCacheEncodedValueBytes)}"]`);
  assert.equal(await cache.get('site.oversized'), undefined);
  assert.equal(records.has('7:default:site.oversized'), true);
});

test('Redis URL Cache bounds stalled, closed, oversized, malformed, and unexpected replies', { timeout: 2_000 }, async (context) => {
  let connectionCount = 0;
  const server = createServer((socket) => {
    const connectionIndex = connectionCount;
    connectionCount += 1;
    socket.once('data', () => {
      if (connectionIndex === 0) {
        socket.end();
        return;
      }
      if (connectionIndex === 1) {
        socket.write(`$${maxCacheEncodedValueBytes + 1}\r\n`);
        return;
      }
      if (connectionIndex === 2) {
        socket.write('$invalid\r\n');
        return;
      }
      if (connectionIndex === 3) {
        socket.write(Buffer.concat([
          Buffer.from('$5\r\n'),
          Buffer.from([0x5b, 0x22, 0xff, 0x22, 0x5d]),
          Buffer.from('\r\n'),
        ]));
        return;
      }
      if (connectionIndex === 4) {
        socket.write(':1\r\n');
      }
    });
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        server.off('listening', onListening);
        reject(error);
      };
      const onListening = () => {
        server.off('error', onError);
        resolve();
      };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(0, '127.0.0.1');
    });
  } catch (error) {
    if (isNodeErrorCode(error, 'EPERM')) {
      context.skip('sandbox disallows local TCP listen');
      return;
    }
    throw error;
  }

  try {
    const address = server.address();
    assert(address && typeof address === 'object');
    const cache = createRedisCacheFromUrl(`redis://127.0.0.1:${address.port}`, { timeoutMs: 100 });
    await assert.rejects(
      () => cache.get('site.closed'),
      /Redis connection (?:ended|closed) before a complete reply/,
    );
    await assert.rejects(
      () => cache.get('site.oversized'),
      /Redis bulk reply exceeds max encoded bytes/,
    );
    await assert.rejects(
      () => cache.get('site.malformed'),
      /Invalid Redis bulk length/,
    );
    await assert.rejects(
      () => cache.get('site.invalid-utf8'),
      /not valid for encoding utf-8/,
    );
    await assert.rejects(
      () => cache.get('site.unexpected'),
      /Unexpected Redis GET reply/,
    );
    await assert.rejects(
      () => cache.get('site.stalled'),
      /Redis cache operation timed out after 100ms/,
    );
  } finally {
    server.closeAllConnections?.();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

test('Redis URL Cache transparently reconnects after the backend closes an idle socket', async (context) => {
  const sockets = new Set<import('node:net').Socket>();
  const commands: string[] = [];
  let connectionCount = 0;
  const server = createServer((socket) => {
    connectionCount += 1;
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('data', (chunk) => {
      commands.push(chunk.toString('utf8'));
      socket.write('$6\r\n["ok"]\r\n');
    });
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        server.off('listening', onListening);
        reject(error);
      };
      const onListening = () => {
        server.off('error', onError);
        resolve();
      };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(0, '127.0.0.1');
    });
  } catch (error) {
    if (isNodeErrorCode(error, 'EPERM')) {
      context.skip('sandbox disallows local TCP listen');
      return;
    }
    throw error;
  }

  try {
    const address = server.address();
    assert(address && typeof address === 'object');
    const cache = connectContainerCache({
      WEB_CACHE_REDIS_URL: `redis://127.0.0.1:${address.port}/0`,
    });
    assert.equal(await cache.get('site.current'), 'ok');
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(await cache.get('site.current'), 'ok');
    assert.equal(connectionCount, 2);
    assert.equal(commands.length, 2);
    assert.equal(commands.some((command) => command.includes('SELECT')), false);
    assert.equal(
      commands.every((command) => command.includes('web:cache:7:default:site.current')),
      true,
    );
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

test('runtime adapters require the topology-owned backend and reuse it', async () => {
  const root = await mkdtemp(join(tmpdir(), 'webunit-site-runtime-cache-'));
  try {
    const nodeEnvironment = { WEB_DATA_DIR: root } as const;
    const first = connectNodeCache(nodeEnvironment);
    const second = connectNodeCache(nodeEnvironment);
    assert.equal(first, second);
    await first.set('site.current', 'single');
    assert.equal(await second.get('site.current'), 'single');

    assert.throws(
      () => connectContainerCache({}),
      /WEB_CACHE_REDIS_URL is required/,
    );
    assert.throws(
      () => connectContainerCache({
        WEB_CACHE_REDIS_URL: 'redis://127.0.0.1:6379/0',
        WEB_CACHE_REDIS_MAX_CONNECTIONS: '33',
      }),
      /expected 1\.\.32/,
    );
    assert.throws(
      () => connectContainerCache({
        WEB_CACHE_REDIS_URL: 'redis://127.0.0.1:6379/0',
        WEB_CACHE_REDIS_TIMEOUT_MS: '99',
      }),
      /expected 100\.\.60000/,
    );

    assert.throws(
      () => connectWorkersCache({}),
      /WEB_CACHE KV binding is required/,
    );
    const records = new Map<string, string>();
    const binding = {
      get: async (key: string) => records.get(key) ?? null,
      put: async (key: string, value: string) => { records.set(key, value); },
      delete: async (key: string) => { records.delete(key); },
    };
    const workers = connectWorkersCache(
      {},
      { WEB_CACHE: binding },
    );
    assert.equal(workers, connectWorkersCache(
      {},
      { WEB_CACHE: binding },
    ));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function isNodeErrorCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === code);
}
