import assert from 'node:assert/strict';
import test from 'node:test';
import { ResponseDependencyCollector } from '@/platform/runtime/response-dependencies';

test('response dependencies merge TTLs and surrogate keys', () => {
  const collector = new ResponseDependencyCollector();
  collector.add({ mode: 'public', browserTtlSeconds: 120, sharedTtlSeconds: 600, staleWhileRevalidateSeconds: 90, surrogateKeys: ['site:1'] });
  collector.addApi({ browserTtlSeconds: 60, sharedTtlSeconds: 300, staleWhileRevalidateSeconds: 30, surrogateKeys: ['module:blog', 'site:1'] });
  assert.deepEqual(collector.seal(), {
    mode: 'public', browserTtlSeconds: 60, sharedTtlSeconds: 300, staleWhileRevalidateSeconds: 30,
    surrogateKeys: ['module:blog', 'site:1'],
  });
  assert.equal(collector.snapshot().sealed, true);
  collector.addApi({ browserTtlSeconds: 60, sharedTtlSeconds: 300, staleWhileRevalidateSeconds: 30, surrogateKeys: ['module:blog'] });
  assert.throws(() => collector.addApi({ browserTtlSeconds: 1, sharedTtlSeconds: 1, staleWhileRevalidateSeconds: 1, surrogateKeys: ['late:key'] }));
});

test('no-store dependency wins while preserving every key', () => {
  const collector = new ResponseDependencyCollector();
  collector.add({ mode: 'public', browserTtlSeconds: 120, sharedTtlSeconds: 600, staleWhileRevalidateSeconds: 90, surrogateKeys: ['page:1'] });
  collector.addApi({ browserTtlSeconds: 0, sharedTtlSeconds: 0, staleWhileRevalidateSeconds: 0, surrogateKeys: ['search:q'], noStore: true });
  assert.deepEqual(collector.seal(), { mode: 'no-store', visibility: 'public', surrogateKeys: ['page:1', 'search:q'] });
});

test('render dependencies can register until response finalization', async () => {
  const collector = new ResponseDependencyCollector();
  collector.add({ mode: 'public', browserTtlSeconds: 120, sharedTtlSeconds: 600, staleWhileRevalidateSeconds: 90, surrogateKeys: ['page:home'] });
  await Promise.resolve().then(() => collector.addApi({
    browserTtlSeconds: 300, sharedTtlSeconds: 1800, staleWhileRevalidateSeconds: 300, surrogateKeys: ['menu:main-menu'],
  }));
  assert.deepEqual(collector.seal(), {
    mode: 'public', browserTtlSeconds: 120, sharedTtlSeconds: 600, staleWhileRevalidateSeconds: 90,
    surrogateKeys: ['menu:main-menu', 'page:home'],
  });
});

test('equivalent late dependencies compare normalized surrogate keys', () => {
  const collector = new ResponseDependencyCollector();
  collector.add({ mode: 'public', browserTtlSeconds: 60, sharedTtlSeconds: 300, staleWhileRevalidateSeconds: 30, surrogateKeys: ['site:1', 'menu:main'] });
  collector.seal();
  assert.doesNotThrow(() => collector.add({ mode: 'public', browserTtlSeconds: 60, sharedTtlSeconds: 300, staleWhileRevalidateSeconds: 30, surrogateKeys: ['menu:main', 'site:1'] }));
});
