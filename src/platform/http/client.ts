import { ApiError } from '@/platform/runtime/error';
import { withStreamLifecycle } from '@/platform/http/stream-lifecycle';
import { BodyTooLargeError, readBoundedResponseJson } from '@/platform/http/read-body';
import { isJsonMediaType } from '@/platform/http/media-type';

const maxJsonResponseBytes = 8_000_000;

export type HttpRequestConfig = {
  method?: string;
  query?: URLSearchParams | object;
  body?: unknown;
  signal?: AbortSignal;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
  cache?: RequestCache;
  responseType?: 'json' | 'blob';
};
export type HttpClient = {
  request<T>(path: string, config?: HttpRequestConfig): Promise<T>;
  requestRaw(path: string, config?: HttpRequestConfig): Promise<Response>;
  getJson(path: string, query: URLSearchParams, signal?: AbortSignal, config?: Pick<HttpRequestConfig, 'cache' | 'headers'>): Promise<unknown>;
};

export function createHttpClient(config: { origin: string; timeoutMs: number }, fetcher: typeof globalThis.fetch = globalThis.fetch): HttpClient {
  const withResponse = async <T>(path: string, requestConfig: HttpRequestConfig, read: (response: Response) => Promise<T>, stream = false): Promise<T> => {
      const controller = new AbortController();
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort(new DOMException('Request timed out', 'TimeoutError'));
      }, config.timeoutMs);
      const requestSignal = requestConfig.signal;
      const onAbort = () => controller.abort(requestSignal?.reason);
      requestSignal?.addEventListener('abort', onAbort, { once: true });
      if (requestSignal?.aborted) onAbort();
      let cleanupDeferred = false;
      const cleanup = () => {
        clearTimeout(timeout);
        requestSignal?.removeEventListener('abort', onAbort);
      };
      try {
        if (controller.signal.aborted) throw controller.signal.reason;
        const url = new URL(path, config.origin);
        const query = requestConfig.query;
        if (query instanceof URLSearchParams) url.search = query.toString();
        else for (const [key, value] of Object.entries(query ?? {})) {
          if (value === undefined) continue;
          if (Array.isArray(value)) for (const item of value) url.searchParams.append(key, String(item));
          else url.searchParams.set(key, String(value));
        }
        const isBodyInit = requestConfig.body instanceof Blob || requestConfig.body instanceof FormData || typeof requestConfig.body === 'string';
        const body = requestConfig.body === undefined ? undefined : isBodyInit ? requestConfig.body as BodyInit : JSON.stringify(requestConfig.body);
        const headers = new Headers();
        new Headers(requestConfig.headers).forEach((value, key) => headers.set(key, value));
        if (!headers.has('accept')) headers.set('accept', requestConfig.responseType === 'blob' ? '*/*' : 'application/json');
        if (body && !isBodyInit && !headers.has('content-type')) headers.set('content-type', 'application/json');
        const response = await fetcher(url, {
          method: requestConfig.method ?? 'GET', body, signal: controller.signal,
          headers, credentials: requestConfig.credentials, cache: requestConfig.cache,
        });
        const result = await read(response);
        if (stream && result instanceof Response && result.body) {
          clearTimeout(timeout);
          cleanupDeferred = true;
          return new Response(withStreamLifecycle(result.body, {
            onFinish: cleanup,
            onCancel: (reason) => controller.abort(reason),
          }), { status: result.status, statusText: result.statusText, headers: result.headers }) as T;
        }
        return result;
      } catch (error) {
        if (timedOut) throw new ApiError('abort', 504, path);
        if (requestSignal?.aborted) throw new ApiError('abort', 499, path);
        if (error instanceof BodyTooLargeError) throw new ApiError('contract', 502, path);
        if (error instanceof ApiError) throw error;
        throw new ApiError('network', 503, path, undefined, undefined, error);
      } finally {
        if (!cleanupDeferred) cleanup();
      }
  };

  return {
    async request<T>(path: string, requestConfig: HttpRequestConfig = {}): Promise<T> {
      return withResponse(path, requestConfig, async (response) => {
        if (requestConfig.responseType !== 'blob' && !isJsonMediaType(response.headers)) {
          throw new ApiError(response.ok ? 'contract' : 'response', response.ok ? 502 : response.status, path, response.headers.get('x-request-id') ?? undefined);
        }
        const responseBody = requestConfig.responseType === 'blob' ? await response.blob() : await readBoundedResponseJson(response, maxJsonResponseBytes).catch((error) => {
          if (error instanceof BodyTooLargeError) throw error;
          return undefined;
        });
        const record = responseBody && typeof responseBody === 'object' && !Array.isArray(responseBody) ? responseBody as Record<string, unknown> : undefined;
        const meta = record?.meta && typeof record.meta === 'object' ? record.meta as Record<string, unknown> : undefined;
        const error = record?.error && typeof record.error === 'object' ? record.error as Record<string, unknown> : undefined;
        const requestId = response.headers.get('x-request-id') ?? (typeof meta?.requestId === 'string' ? meta.requestId : undefined);
        if (!response.ok) throw new ApiError('response', response.status, path, requestId, typeof error?.code === 'string' ? error.code : undefined, error?.details);
        if (requestConfig.responseType !== 'blob' && !record) throw new ApiError('contract', 502, path, requestId);
        return responseBody as T;
      });
    },
    async requestRaw(path, requestConfig = {}) {
      return withResponse(path, { ...requestConfig, headers: new Headers({ accept: '*/*', ...Object.fromEntries(new Headers(requestConfig.headers)) }) }, async (response) => {
        if (response.ok || response.status === 304) return response;
        const body = await readBoundedResponseJson(response, maxJsonResponseBytes).catch((error) => {
          if (error instanceof BodyTooLargeError) throw error;
          return undefined;
        });
        const record = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : undefined;
        const meta = record?.meta && typeof record.meta === 'object' ? record.meta as Record<string, unknown> : undefined;
        const error = record?.error && typeof record.error === 'object' ? record.error as Record<string, unknown> : undefined;
        const requestId = response.headers.get('x-request-id') ?? (typeof meta?.requestId === 'string' ? meta.requestId : undefined);
        throw new ApiError('response', response.status, path, requestId, typeof error?.code === 'string' ? error.code : undefined, error?.details);
      }, true);
    },
    async getJson(path, query, signal, requestConfig = {}) {
      const body = await this.request<Record<string, unknown>>(path, { ...requestConfig, method: 'GET', query, signal });
      if (!Object.hasOwn(body, 'data')) throw new ApiError('contract', 502, path);
      return body.data;
    },
  };
}
