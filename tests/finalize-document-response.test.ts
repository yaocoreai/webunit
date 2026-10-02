import assert from 'node:assert/strict';
import test from 'node:test';
import { finalizeDocumentResponse, finalizeProtocolResponse, finalizeWebDocumentResponse } from '@/platform/runtime/finalize-document-response';
import { ResponseDependencyCollector } from '@/platform/runtime/response-dependencies';
import type { RenderRuntime } from '@/platform/theme/render/context';

const runtime = (options: { preview?: boolean } = {}) => {
  const responseDependencies = new ResponseDependencyCollector();
  responseDependencies.add({ mode: 'public', browserTtlSeconds: 120, sharedTtlSeconds: 600, staleWhileRevalidateSeconds: 60, surrogateKeys: ['site:1'] });
  return {
    request: { requestId: 'request-1', responseDependencies, environment: {} },
    context: options.preview ? { environment: 'editor-preview', preview: { type: 'section' } } : { environment: 'production' },
    payload: {},
  } as unknown as RenderRuntime;
};

test('document finalization keeps the body streaming and applies authoritative cache headers', async () => {
  let pulled = false;
  const body = new ReadableStream<Uint8Array>({ pull(controller) { pulled = true; controller.enqueue(new TextEncoder().encode('ok')); controller.close(); } });
  const response = finalizeDocumentResponse(new Response(body, { headers: { 'cache-control': 'public, max-age=9999' } }), 'GET', runtime(), false);
  assert.equal(pulled, false);
  assert.equal(response.headers.get('cache-control'), 'public, max-age=120');
  assert.equal(response.headers.get('cloudflare-cdn-cache-control'), 'public, max-age=600, stale-while-revalidate=60');
  assert.equal(response.headers.get('cache-tag'), 'site:1');
  assert.equal(response.headers.get('x-request-id'), 'request-1');
  assert.equal(response.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()');
  assert.equal(await response.text(), 'ok');
  assert.equal(pulled, true);
});

test('document finalization bypasses personalized requests and varies cacheable responses safely', () => {
  const publicResponse = finalizeDocumentResponse(new Response('ok'), new Request('https://site.example.com/'), runtime(), false);
  assert.equal(publicResponse.headers.get('vary'), 'Cookie, Authorization');
  const privateResponse = finalizeDocumentResponse(new Response('ok'), new Request('https://site.example.com/', { headers: { cookie: 'webunit_admin_session=secret' } }), runtime(), false);
  assert.equal(privateResponse.headers.get('cache-control'), 'no-store');
  assert.equal(privateResponse.headers.get('cache-tag'), null);
  const authorizedResponse = finalizeDocumentResponse(new Response('ok'), new Request('https://site.example.com/', { headers: { authorization: 'Bearer token' } }), runtime(), false);
  assert.equal(authorizedResponse.headers.get('cache-control'), 'no-store');
  const consentResponse = finalizeDocumentResponse(new Response('ok'), new Request('https://site.example.com/', { headers: { cookie: 'privacy_consent=value' } }), runtime(), false);
  assert.equal(consentResponse.headers.get('cache-control'), 'public, max-age=120');
  const cookieResponse = finalizeDocumentResponse(new Response('ok', { headers: { 'set-cookie': 'session=secret; Secure; HttpOnly' } }), new Request('https://site.example.com/'), runtime(), false);
  assert.equal(cookieResponse.headers.get('cache-control'), 'no-store');
  assert.equal(cookieResponse.headers.get('cloudflare-cdn-cache-control'), null);
  assert.equal(cookieResponse.headers.get('cache-tag'), null);
  assert.match(cookieResponse.headers.get('set-cookie') ?? '', /session=secret/);
});

test('Web finalization applies Direct Function response effects and disables caching', () => {
  const responseDependencies = new ResponseDependencyCollector();
  responseDependencies.add({ mode: 'public', browserTtlSeconds: 120, sharedTtlSeconds: 600, staleWhileRevalidateSeconds: 60, surrogateKeys: ['site:1'] });
  const response = finalizeWebDocumentResponse(
    new Response('ok'),
    new Request('https://site.example.com/'),
    {
      environment: {},
      request: { requestId: 'request-1' },
      responseDependencies,
      responseEffects: { apply(headers) { headers.append('set-cookie', 'session=secret; Path=/; HttpOnly'); } },
    },
    false,
  );
  assert.match(response.headers.get('set-cookie') ?? '', /session=secret/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('cache-tag'), null);
});

test('document security policy is configurable and cannot override a route-specific CSP', () => {
  const configured = runtime();
  (configured.request.environment as Record<string, unknown>).CMS_DOCUMENT_CSP = "default-src 'self'";
  const response = finalizeDocumentResponse(new Response('ok'), 'GET', configured, false);
  assert.equal(response.headers.get('content-security-policy'), "default-src 'self'");

  const preview = finalizeDocumentResponse(new Response('ok', { headers: { 'content-security-policy': "frame-ancestors 'none'" } }), 'GET', configured, false);
  assert.equal(preview.headers.get('content-security-policy'), "frame-ancestors 'none'");
});

test('document finalization never allows response headers to relax no-store', () => {
  const preview = finalizeDocumentResponse(new Response('preview', { headers: { 'cache-control': 'public, max-age=9999' } }), 'GET', runtime({ preview: true }), false);
  assert.equal(preview.headers.get('cache-control'), 'no-store');
  const explicitNoStore = finalizeDocumentResponse(new Response('private', { headers: { 'cache-control': 'no-store' } }), 'GET', runtime(), false);
  assert.equal(explicitNoStore.headers.get('cache-control'), 'no-store');
});

test('document and protocol HEAD finalization cancel discarded response streams', async () => {
  let documentCancelled = false;
  let protocolCancelled = false;
  const document = finalizeDocumentResponse(new Response(new ReadableStream({ cancel() { documentCancelled = true; } })), 'HEAD', runtime(), false);
  const protocol = finalizeProtocolResponse(new Response(new ReadableStream({ cancel() { protocolCancelled = true; } })), 'HEAD');
  await Promise.resolve();
  assert.equal(document.body, null);
  assert.equal(protocol.body, null);
  assert.equal(documentCancelled, true);
  assert.equal(protocolCancelled, true);
});

test('protocol finalization removes payload length headers forbidden on 204', () => {
  const response = finalizeProtocolResponse(new Response(null, {
    status: 204,
    headers: { 'content-length': '10', 'content-range': 'bytes 0-9/10', 'x-result': 'saved' },
  }), 'POST');
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('content-length'), null);
  assert.equal(response.headers.get('content-range'), null);
  assert.equal(response.headers.get('x-result'), 'saved');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('protocol finalization cannot opt API, Admin or Webhook responses into Workers Caching', () => {
  const response = finalizeProtocolResponse(new Response('private', {
    headers: {
      'cache-control': 'public, max-age=7200',
      'cache-tag': 'unsafe:protocol',
      'cloudflare-cdn-cache-control': 'public, max-age=7200',
    },
  }), 'GET');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('cache-tag'), null);
  assert.equal(response.headers.get('cloudflare-cdn-cache-control'), null);
});

test('document and protocol finalization discard 205 and 304 bodies consistently', async () => {
  let resetCancelled = false;
  let notModifiedCancelled = false;
  const resetSource = new Response(new ReadableStream({ cancel() { resetCancelled = true; } }));
  Object.defineProperty(resetSource, 'status', { value: 205 });
  const notModifiedSource = new Response(new ReadableStream({ cancel() { notModifiedCancelled = true; } }), {
    headers: { etag: '"page-1"', 'content-length': '42' },
  });
  Object.defineProperty(notModifiedSource, 'status', { value: 304 });

  const reset = finalizeProtocolResponse(resetSource, 'POST');
  const notModified = finalizeDocumentResponse(notModifiedSource, 'GET', runtime(), false);
  await Promise.resolve();
  assert.equal(reset.status, 205);
  assert.equal(reset.body, null);
  assert.equal(reset.headers.get('content-length'), null);
  assert.equal(resetCancelled, true);
  assert.equal(notModified.status, 304);
  assert.equal(notModified.body, null);
  assert.equal(notModified.headers.get('etag'), '"page-1"');
  assert.equal(notModified.headers.get('content-length'), '42');
  assert.equal(notModifiedCancelled, true);
});
