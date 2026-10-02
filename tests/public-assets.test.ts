import assert from 'node:assert/strict';
import test from 'node:test';
import { publicAssets, selectPublishedStoragePaths } from '@/platform/build/public-assets.mjs';

test('Datas storage publishes only files declared by index.ts', () => {
  assert.deepEqual(selectPublishedStoragePaths(`export default { delivery: { url: '/storage/used.svg' } };`, ['used.svg', 'unused.svg']), ['used.svg']);
  assert.throws(
    () => selectPublishedStoragePaths(`export default { delivery: { url: '/storage/missing.svg' } };`, ['unused.svg']),
    /Datas storage files are missing: missing\.svg/,
  );
});

test('Datas storage and every Theme asset are published at stable URLs', async () => {
  const plugin = publicAssets({ sourceProvider: 'datas' });
  let middleware: ((request: RequestInput, response: ResponseOutput, next: () => void) => Promise<void>) | undefined;
  let invalidate: ((event: string, path: string) => void) | undefined;
  plugin.configureServer({
    watcher: {
      add: () => undefined,
      on: (_event: string, handler: typeof invalidate) => { invalidate = handler; },
    },
    middlewares: { use: (handler: typeof middleware) => { middleware = handler; } },
  } as never);
  assert.ok(middleware);
  assert.ok(invalidate);

  const get = responseOutput();
  await middleware({ method: 'GET', url: '/storage/images/editorial/studio-cover.svg' }, get.response, () => assert.fail('storage asset was not handled'));
  assert.equal(get.response.statusCode, 200);
  assert.equal(get.headers.get('content-type'), 'image/svg+xml');
  assert.match(get.body.toString(), /Northstar editorial studio/);

  const favicon = responseOutput();
  await middleware({ method: 'GET', url: '/storage/images/brand/site-icon.svg' }, favicon.response, () => assert.fail('favicon asset was not handled'));
  assert.equal(favicon.response.statusCode, 200);
  assert.equal(favicon.headers.get('content-type'), 'image/svg+xml');

  const head = responseOutput();
  await middleware({ method: 'HEAD', url: '/storage/images/editorial/studio-cover.svg' }, head.response, () => assert.fail('storage asset was not handled'));
  assert.equal(head.headers.get('content-length'), String(get.body.byteLength));
  assert.equal(head.body.byteLength, 0);

  const themeCss = responseOutput();
  await middleware({ method: 'GET', url: '/assets/theme.css' }, themeCss.response, () => assert.fail('Theme asset was not handled'));
  assert.equal(themeCss.response.statusCode, 200);
  assert.equal(themeCss.headers.get('content-type'), 'text/css; charset=utf-8');
  assert.match(themeCss.body.toString(), /@import/);

  invalidate('change', '/unrelated/file.svg');
});

test('Function source keeps Theme assets but does not publish Datas storage', async () => {
  const plugin = publicAssets({ sourceProvider: 'function' });
  let middleware: ((request: RequestInput, response: ResponseOutput, next: () => void) => Promise<void>) | undefined;
  plugin.configureServer({
    watcher: { add: () => undefined, on: () => undefined },
    middlewares: { use: (handler: typeof middleware) => { middleware = handler; } },
  } as never);
  assert.ok(middleware);

  let storageContinued = false;
  await middleware({ method: 'GET', url: '/storage/images/brand/site-icon.svg' }, responseOutput().response, () => { storageContinued = true; });
  assert.equal(storageContinued, true);

  const themeCss = responseOutput();
  await middleware({ method: 'GET', url: '/assets/theme.css' }, themeCss.response, () => assert.fail('Theme asset was not handled'));
  assert.equal(themeCss.response.statusCode, 200);
});

type RequestInput = { method?: string; url?: string };
type ResponseOutput = { statusCode: number; setHeader(name: string, value: string): void; end(value?: Uint8Array): void };

function responseOutput() {
  const headers = new Map<string, string>();
  let body = Buffer.alloc(0);
  return {
    headers,
    get body() { return body; },
    response: {
      statusCode: 0,
      setHeader: (name: string, value: string) => headers.set(name, value),
      end: (value?: Uint8Array) => { body = value ? Buffer.from(value) : Buffer.alloc(0); },
    },
  };
}
