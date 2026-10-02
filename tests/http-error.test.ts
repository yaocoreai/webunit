import assert from 'node:assert/strict';
import test from 'node:test';
import { createPublicHttpErrorResponse, createUnhandledErrorResponse } from '@/platform/http/error-response';

test('neutral HTTP fallback stays independent from the Theme render chain', async () => {
  const response = await createPublicHttpErrorResponse(new Request('https://example.com/missing', {
    headers: { 'accept-language': 'zh-cn,zh;q=0.9', accept: 'text/html' },
  }), 404, { requestId: '<request-1>' });
  assert.equal(response.status, 404);
  const document = await response.text();
  assert.match(document, /<html lang="en">/);
  assert.match(document, /<h1>404<\/h1>/);
  assert.match(document, /Something went wrong\./);
  assert.doesNotMatch(document, /Page not found/);
  assert.match(document, /&lt;request-1&gt;/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex');
  assert.equal(response.headers.get('x-request-id'), '<request-1>');
  assert.match(response.headers.get('content-security-policy') ?? '', /default-src 'none'/);
});

test('public HTTP error HEAD and method responses preserve protocol semantics', async () => {
  const head = await createPublicHttpErrorResponse(new Request('https://example.com/missing', { method: 'HEAD' }), 404);
  assert.equal(await head.text(), '');
  const method = await createPublicHttpErrorResponse(new Request('https://example.com/', { method: 'POST' }), 405, { allow: 'GET, HEAD' });
  assert.equal(method.headers.get('allow'), 'GET, HEAD');
  assert.equal((await createPublicHttpErrorResponse(new Request('https://example.com/'), 418)).status, 418);
});

test('unhandled non-document failures stay machine-readable and do not expose error details', async () => {
  const response = await createUnhandledErrorResponse(new Request('https://example.com/_/public/cms/content/query', { headers: { accept: 'application/json' } }), 'request-2');
  assert.equal(response.status, 500);
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.deepEqual(await response.json(), { error: { code: 'internal_error', requestId: 'request-2' } });
});
