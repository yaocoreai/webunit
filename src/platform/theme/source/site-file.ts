import type { ResponseCachePolicy, SiteFile } from './site';
import { discardResponseBody } from '@/platform/http/stream-lifecycle';
import { isNotModified } from '@/platform/http/conditional-request';
import { applyRequestCacheSafety } from '@/platform/http/response-cache';
import { createCacheHeaders } from '@/platform/cache/headers';

export { createCacheHeaders } from '@/platform/cache/headers';

export const renderSiteFile = async (file: SiteFile, cache: ResponseCachePolicy, request: Request, fetcher: typeof globalThis.fetch = globalThis.fetch) => {
  const headers = createCacheHeaders(cache);
  applyRequestCacheSafety(headers, request);
  if (file.etag) headers.set('etag', file.etag);
  if (file.lastModified) headers.set('last-modified', file.lastModified);

  if (file.resourceType === 'text') {
    headers.set('content-type', file.contentType);
    if (isNotModified(request, { etag: file.etag, lastModified: file.lastModified })) return new Response(null, { status: 304, headers });
    return new Response(request.method === 'HEAD' ? null : file.textContent, { headers });
  }

  const upstream = await fetcher(new URL(file.fileUrl, request.url), {
    method: request.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: forwardFileRequestHeaders(request),
    signal: request.signal,
  });
  for (const name of ['accept-ranges', 'content-length', 'content-range', 'content-type', 'etag', 'last-modified']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has('content-type')) headers.set('content-type', file.contentType);
  if (request.method === 'HEAD') discardResponseBody(upstream.body, new DOMException('HEAD response body discarded', 'AbortError'));
  return new Response(request.method === 'HEAD' ? null : upstream.body, { headers, status: upstream.status, statusText: upstream.statusText });
};

const forwardFileRequestHeaders = (request: Request) => {
  const headers = new Headers();
  for (const name of ['if-modified-since', 'if-none-match', 'range']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
};
