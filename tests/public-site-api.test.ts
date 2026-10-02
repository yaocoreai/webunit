import assert from 'node:assert/strict';
import test from 'node:test';
import { createResolveResponse } from '@/platform/theme/runtime/resolve-response';
import type { SiteContentSource } from '@/platform/theme/source/contracts';
import { createSiteClient } from '@/platform/theme/source/site-runtime';

const publicCache = {
  mode: 'public' as const,
  browserTtlSeconds: 60,
  sharedTtlSeconds: 60,
  staleWhileRevalidateSeconds: 30,
  surrogateKeys: [],
};

test('CMS public client maps website root resources to /public/cms APIs', async () => {
  const calls: Array<{ kind: string; path?: string; page?: number; ifNoneMatch?: string | null }> = [];
  const raw = (kind: string, input: { path?: string; page?: number; headers: HeadersInit }) => {
    calls.push({ kind, path: input.path, page: input.page, ifNoneMatch: new Headers(input.headers).get('if-none-match') });
    return Promise.resolve(new Response(kind, { headers: { 'cache-control': 'public, max-age=300', 'content-type': 'text/plain' } }));
  };
  const api: SiteContentSource = {
    resolveRoute: async () => ({ type: 'redirect', mode: 'public', redirect: { status: 301, location: '/next' }, cache: publicCache }),
    readManifest: async () => { calls.push({ kind: 'manifest' }); return { name: 'Site', icons: [] }; },
    readSiteFile: (input) => raw('file', input),
    listSitemaps: async () => ({ type: 'index', entries: [{ path: '/sitemap-product-a.xml' }] }),
    findSitemap: async (input) => {
      calls.push({ kind: 'sitemap', path: input.path, page: undefined, ifNoneMatch: null });
      return { type: 'urlset', defaultLocale: 'en-us', domainLocale: 'en-us', supportedLocales: ['en-us'], entries: [{ path: '/product/a', locales: ['en-us'] }] };
    },
  };
  const client = createSiteClient(api);

  await client.resolveRenderRequest(new Request('https://www.example.com/robots.txt', { headers: { 'if-none-match': '"robots"' } }));
  await client.resolveRenderRequest(new Request('https://www.example.com/manifest.webmanifest'));
  await client.resolveRenderRequest(new Request('https://www.example.com/sitemap-product-a.xml'));
  await client.resolveRenderRequest(new Request('https://www.example.com/favicon.ico'));
  const route = await client.resolveRenderRequest(new Request('https://www.example.com/blog'));

  assert.deepEqual(calls, [
    { kind: 'file', path: '/robots.txt', page: undefined, ifNoneMatch: '"robots"' },
    { kind: 'manifest' },
    { kind: 'sitemap', path: '/sitemap-product-a.xml', page: undefined, ifNoneMatch: null },
  ]);
  assert.equal(route.type, 'redirect');
});

test('Web generates default robots only when the exact SiteFile is missing', async () => {
  const api: SiteContentSource = {
    resolveRoute: async () => ({ type: 'redirect', mode: 'public', redirect: { status: 301, location: '/next' }, cache: publicCache }),
    readManifest: async () => ({ name: 'Site', icons: [] }),
    readSiteFile: async () => { throw new (await import('@/platform/runtime/error')).ApiError('response', 404, '/public/cms/files'); },
    listSitemaps: async () => ({ type: 'index', entries: [] }),
    findSitemap: async () => ({ type: 'urlset', defaultLocale: 'en-us', domainLocale: 'en-us', supportedLocales: ['en-us'], entries: [] }),
  };
  const result = await createSiteClient(api).resolveRenderRequest(new Request('https://www.example.com/robots.txt'));
  assert.equal(result.type, 'response');
  if (result.type === 'response') assert.equal(await result.response.text(), 'User-agent: *\nAllow: /\nSitemap: https://www.example.com/sitemap.xml\n');
});

test('Web passes through only public resource headers and strips HEAD bodies', async () => {
  let cancelled = false;
  const upstream = new Response(new ReadableStream({ cancel() { cancelled = true; } }), {
    headers: { 'cache-control': 'public, max-age=300', 'content-type': 'application/xml', 'x-private': 'secret' },
  });
  const response = await createResolveResponse({ type: 'response', response: upstream }, new Request('https://www.example.com/sitemap.xml', { method: 'HEAD' }));
  assert.ok(response);
  assert.equal(response.headers.get('content-type'), 'application/xml');
  assert.equal(response.headers.get('x-private'), null);
  assert.equal(await response.text(), '');
  assert.equal(cancelled, true);
});
