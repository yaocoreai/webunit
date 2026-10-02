import { createCacheHeaders } from '@/platform/cache/headers';
import { applyDocumentCacheConfig } from './cache-config';
import { normalizeResponseBody } from '@/platform/http/response-body';
import { applyRequestCacheSafety, forceNoStore } from '@/platform/http/response-cache';

export function finalizeDocumentResponse(
  response: Response,
  request: Request | string,
  runtime: Readonly<{
    context: Readonly<{ environment: 'production' | 'public-preview' | 'editor-preview' }>;
    request: Readonly<{
      requestId: string;
      responseDependencies: Readonly<{
        seal(): import('@/platform/cache/contracts').ResponseCachePolicy;
      }>;
      environment: Readonly<Record<string, unknown>>;
    }>;
  }>,
  development: boolean,
) {
  const method = typeof request === 'string' ? request : request.method;
  const headers = new Headers(response.headers);
  applyPlatformHeaders(headers, runtime.request.requestId);
  applyDocumentSecurityHeaders(headers, runtime.request.environment);
  if (development) {
    forceNoStore(headers);
    headers.set('pragma', 'no-cache');
    headers.set('expires', '0');
  } else {
    const policy = applyDocumentCacheConfig(runtime.request.responseDependencies.seal(), runtime, runtime.request.environment);
    for (const [name, value] of createCacheHeaders(policy)) headers.set(name, value);
    if (response.headers.get('cache-control')?.toLowerCase().includes('no-store')) forceNoStore(headers);
    if (typeof request !== 'string') applyRequestCacheSafety(headers, request);
  }
  return copyResponse(response, method, headers);
}

export function finalizeWebDocumentResponse(
  response: Response,
  request: Request,
  runtime: Readonly<{
    environment: Readonly<Record<string, unknown>>;
    request: Readonly<{ requestId: string }>;
    responseDependencies: Readonly<{
      snapshot(): Readonly<{ count: number }>;
      seal(): import('@/platform/cache/contracts').ResponseCachePolicy;
    }>;
    responseEffects: Readonly<{ apply(headers: Headers): void }>;
  }>,
  development: boolean,
) {
  const headers = new Headers(response.headers);
  runtime.responseEffects.apply(headers);
  applyPlatformHeaders(headers, runtime.request.requestId);
  applyDocumentSecurityHeaders(headers, runtime.environment);
  if (development || runtime.responseDependencies.snapshot().count === 0) {
    forceNoStore(headers);
  } else {
    const policy = runtime.responseDependencies.seal();
    for (const [name, value] of createCacheHeaders(policy)) headers.set(name, value);
    if (response.headers.get('cache-control')?.toLowerCase().includes('no-store')) {
      forceNoStore(headers);
    }
    applyRequestCacheSafety(headers, request);
  }
  return copyResponse(response, request.method, headers);
}

export function finalizeProtocolResponse(response: Response, method: string, requestId = crypto.randomUUID()) {
  const headers = new Headers(response.headers);
  applyPlatformHeaders(headers, requestId);
  forceNoStore(headers);
  return copyResponse(response, method, headers);
}

function applyPlatformHeaders(headers: Headers, requestId: string) {
  if (!headers.has('x-request-id')) headers.set('x-request-id', requestId);
  if (!headers.has('x-content-type-options')) headers.set('x-content-type-options', 'nosniff');
  if (!headers.has('referrer-policy')) headers.set('referrer-policy', 'strict-origin-when-cross-origin');
}

function applyDocumentSecurityHeaders(headers: Headers, environment: Readonly<Record<string, unknown>>) {
  const csp = readHeaderEnvironment(environment, 'CMS_DOCUMENT_CSP');
  const permissions = readHeaderEnvironment(environment, 'CMS_PERMISSIONS_POLICY')
    ?? 'camera=(), microphone=(), geolocation=()';
  if (csp && !headers.has('content-security-policy')) headers.set('content-security-policy', csp);
  if (!headers.has('permissions-policy')) headers.set('permissions-policy', permissions);
}

function readHeaderEnvironment(environment: Readonly<Record<string, unknown>>, key: string) {
  const value = environment[key];
  if (typeof value !== 'string' || !value.trim()) return undefined;
  if (/[\r\n]/.test(value)) throw new Error(`${key} must be one HTTP header value`);
  return value.trim();
}

function copyResponse(response: Response, method: string, headers: Headers) {
  const normalized = normalizeResponseBody(response, method);
  for (const name of ['content-length', 'content-range']) {
    if (!normalized.headers.has(name)) headers.delete(name);
  }
  return new Response(normalized.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
