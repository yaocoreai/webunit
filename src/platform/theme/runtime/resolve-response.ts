import type { ResolveResult } from '@/platform/theme/source/site';
import { createCacheHeaders, renderSiteFile } from '@/platform/theme/source/site-file';
import { normalizeResponseBody } from '@/platform/http/response-body';
import { applyRequestCacheSafety } from '@/platform/http/response-cache';

export async function createResolveResponse(result: ResolveResult, request: Request) {
  if (result.type === 'response') return createPublicSiteResponse(result.response, request);
  if (result.type === 'redirect') {
    const headers = createCacheHeaders(result.cache);
    applyRequestCacheSafety(headers, request);
    headers.set('location', result.location);
    return new Response(null, { status: result.status, headers });
  }
  if (result.type === 'file') return await renderSiteFile(result.file, result.cache, request);
  return undefined;
}

const createPublicSiteResponse = (upstream: Response, request: Request) => {
  const headers = new Headers();
  for (const name of [
    'accept-ranges', 'cache-control', 'content-length', 'content-range', 'content-type',
    'cache-tag', 'cloudflare-cdn-cache-control', 'etag', 'last-modified', 'surrogate-key', 'vary',
  ]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  applyRequestCacheSafety(headers, request);
  const normalized = normalizeResponseBody(upstream, request.method);
  for (const name of ['content-length', 'content-range']) {
    if (!normalized.headers.has(name)) headers.delete(name);
  }
  return new Response(normalized.body, { headers, status: upstream.status, statusText: upstream.statusText });
};
