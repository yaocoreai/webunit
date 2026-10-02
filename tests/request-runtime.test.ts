import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequestRuntime } from '@/platform/theme/runtime';
import { ApiError } from '@/platform/runtime/error';
import type { ContentsProvider } from '@/platform/theme/source/definition';
import { ContentSourceError } from '@/platform/theme/source/contracts';

test('request runtime bounds a ContentSource that ignores cancellation', async () => {
  const hanging: ContentsProvider = { kind: 'datas', load: async () => await new Promise(() => {}) };
  const request = new Request('https://example.com/');
  const runtime = await createRequestRuntime(request, hanging, { DEV: true, CMS_CONTENT_TIMEOUT_MS: '100' });
  await assert.rejects(
    runtime.site.resolveRenderRequest(request),
    (error: unknown) => error instanceof ApiError && error.status === 504 && error.kind === 'abort',
  );
});

test('request runtime maps ContentSource failures to the public HTTP boundary', async () => {
  const contents: ContentsProvider = { kind: 'function', load: async () => ({
    kind: 'function',
    site: {
      resolveRoute: async () => { throw new ContentSourceError('not_found', 'cms_route_not_found', 'CMS route not found'); },
    } as never,
    createPublicContent: () => ({}) as never,
  }) };
  const request = new Request('https://example.com/missing');
  const runtime = await createRequestRuntime(request, contents, { DEV: true });
  await assert.rejects(
    runtime.site.resolveRenderRequest(request),
    (error: unknown) => error instanceof ApiError
      && error.kind === 'response'
      && error.status === 404
      && error.code === 'cms_route_not_found',
  );
});

test('document renderer queries rely on the route cache envelope while protocol queries register dependencies', async () => {
  const dependency = { browserTtlSeconds: 30, sharedTtlSeconds: 60, staleWhileRevalidateSeconds: 10, surrogateKeys: ['module:blog'] };
  const contents: ContentsProvider = { kind: 'datas', load: async () => ({
    kind: 'datas',
    site: {} as never,
    createPublicContent: (context) => ({
      asset: async () => null,
      menu: async () => { context.registerDependency?.(dependency); return null; },
      module: () => ({ findOne: async () => null, findFirst: async () => null, findMany: async () => ({ items: [], nextCursor: null }), count: async () => 0, aggregate: async () => ({}) }),
    }),
  }) };
  const request = new Request('https://example.com/');
  const runtime = await createRequestRuntime(request, contents, { DEV: true });
  const web = runtime.createWebRuntime({ domain: { host: 'example.com' }, locale: 'en-us' } as never);
  assert.equal(web.cache, runtime.cache);
  await web.cache.set({ namespace: 'render', key: 'request-runtime' }, { ok: true });
  assert.deepEqual(
    await runtime.cache.get({ namespace: 'render', key: 'request-runtime' }),
    { ok: true },
  );
  await web.content.menu('40000000-0000-4000-8000-000000000001');
  assert.equal(runtime.responseDependencies.snapshot().count, 0);

  await runtime.createContentApi({ domainHost: 'example.com', locale: 'en-us' }).menu('40000000-0000-4000-8000-000000000001');
  assert.equal(runtime.responseDependencies.snapshot().count, 1);
});
