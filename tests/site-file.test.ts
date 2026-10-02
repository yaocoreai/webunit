import assert from 'node:assert/strict';
import test from 'node:test';
import { renderSiteFile } from '@/platform/theme/source/site-file';
import { createCacheHeaders } from '@/platform/theme/source/site-file';
import type { ResponseCachePolicy } from '@/platform/theme/source/site';

const cache: ResponseCachePolicy = { mode: 'public', browserTtlSeconds: 60, sharedTtlSeconds: 300, staleWhileRevalidateSeconds: 900, surrogateKeys: ['file:test'] };
const textFile = { resourceType: 'text', path: '/robots.txt', contentType: 'text/plain; charset=utf-8', textContent: 'User-agent: *\n', etag: '"robots"', lastModified: 'Thu, 23 Jul 2026 00:00:00 GMT' } as const;

test('text SiteFile supports GET, HEAD and conditional 304', async () => {
  const get = await renderSiteFile(textFile, cache, new Request('https://northstar.local/robots.txt'));
  assert.equal(await get.text(), 'User-agent: *\n');
  assert.equal(get.headers.get('etag'), '"robots"');
  assert.equal(get.headers.get('cache-control'), 'public, max-age=60');
  assert.equal(get.headers.get('cloudflare-cdn-cache-control'), 'public, max-age=300, stale-while-revalidate=900');
  assert.equal(get.headers.get('cache-tag'), 'file:test');
  const head = await renderSiteFile(textFile, cache, new Request('https://northstar.local/robots.txt', { method: 'HEAD' }));
  assert.equal(await head.text(), '');
  const notModified = await renderSiteFile(textFile, cache, new Request('https://northstar.local/robots.txt', { headers: { 'if-none-match': '"robots"' } }));
  assert.equal(notModified.status, 304);
  assert.equal((await renderSiteFile(textFile, cache, new Request('https://northstar.local/robots.txt', { headers: { 'if-none-match': 'W/"robots"' } }))).status, 304);
  assert.equal((await renderSiteFile({ ...textFile, etag: undefined }, cache, new Request('https://northstar.local/robots.txt', { headers: { 'if-none-match': '*' } }))).status, 304);
  assert.equal((await renderSiteFile(textFile, cache, new Request('https://northstar.local/robots.txt', { headers: {
    'if-none-match': '"different"', 'if-modified-since': 'Thu, 23 Jul 2036 00:00:00 GMT',
  } }))).status, 200);
});

test('file SiteFile proxies a controlled data URL in Datas', async () => {
  const response = await renderSiteFile({
    resourceType: 'file', path: '/downloads/kit.txt', contentType: 'text/plain; charset=utf-8',
    fileUrl: 'data:text/plain;charset=utf-8,Northstar%20Kit', etag: '"kit"',
  }, cache, new Request('https://northstar.local/downloads/kit.txt'));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'Northstar Kit');
});

test('file SiteFile propagates request cancellation to the upstream fetch', async () => {
  const controller = new AbortController();
  let upstreamSignal: AbortSignal | undefined;
  const fetcher: typeof fetch = async (_input, init) => {
    upstreamSignal = init?.signal ?? undefined;
    return new Response('file');
  };
  const request = new Request('https://northstar.local/downloads/kit.txt', { signal: controller.signal });
  const response = await renderSiteFile({
    resourceType: 'file', path: '/downloads/kit.txt', contentType: 'text/plain', fileUrl: 'https://storage.example.com/kit.txt',
  }, cache, request, fetcher);
  assert.equal(upstreamSignal, request.signal);
  assert.equal(response.headers.get('content-type'), 'text/plain;charset=UTF-8');
  controller.abort();
  assert.equal(upstreamSignal?.aborted, true);
});

test('cache headers fail closed when surrogate keys are invalid or exceed header budgets', () => {
  const policy = { mode: 'public' as const, browserTtlSeconds: 60, sharedTtlSeconds: 300, staleWhileRevalidateSeconds: 60 };
  assert.equal(createCacheHeaders({ ...policy, surrogateKeys: ['valid:key'] }).get('surrogate-key'), 'valid:key');
  assert.equal(createCacheHeaders({ ...policy, surrogateKeys: ['valid:key'] }).get('cache-tag'), 'valid:key');
  assert.equal(createCacheHeaders({ ...policy, surrogateKeys: ['invalid key'] }).get('cache-control'), 'no-store');
  assert.equal(createCacheHeaders({ ...policy, surrogateKeys: ['x'.repeat(8_193)] }).get('cache-control'), 'no-store');
});
