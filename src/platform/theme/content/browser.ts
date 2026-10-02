import type { ReadModel } from './model';
import type { ContentQueryRequest, ContentQueryTarget } from './protocol';
import type { CmsAsset, CmsMenu, ModuleEntry, ResourceAccessor } from '@/platform/theme/content/public';
import { readBoundedResponseJson } from '@/platform/http/read-body';
import { hasMediaType } from '@/platform/http/media-type';

const maxResponseBytes = 8_000_000;

type BrowserQueryOptions = Readonly<{
  endpoint?: string;
  host?: string;
  locale?: string;
  fetch?: typeof globalThis.fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
}>;

export function createBrowserContent(options: BrowserQueryOptions = {}) {
  const endpoint = options.endpoint ?? '/_/public/cms/content/query';
  const fetcher = options.fetch ?? globalThis.fetch;
  const locale = options.locale ?? (typeof document === 'undefined' ? 'en-us' : document.documentElement.lang.toLowerCase() || 'en-us');
  const host = options.host ?? (typeof location === 'undefined' ? 'localhost' : location.hostname);
  const execute = async <T>(request: ContentQueryRequest): Promise<T> => {
    const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? 15_000);
    const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
    if (signal.aborted) throw new Error(options.signal?.aborted ? 'Content query cancelled' : 'Content query timed out');
    let response: Response;
    try {
      response = await fetcher(endpoint, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json', 'x-platform-locale': locale },
        body: JSON.stringify({
          context: { host, locale },
          query: request,
        }),
        signal,
      });
    } catch (error) {
      if (options.signal?.aborted) throw new Error('Content query cancelled', { cause: error });
      if (timeoutSignal.aborted) throw new Error('Content query timed out', { cause: error });
      throw error;
    }
    let body: { data?: unknown; error?: { message?: string } } | undefined;
    if (!hasMediaType(response.headers, 'application/json')) {
      throw new Error(response.ok ? 'Invalid Content query response type' : `Content query failed with ${response.status}`);
    }
    try { body = await readBoundedResponseJson(response, maxResponseBytes) as typeof body; }
    catch (error) {
      if (options.signal?.aborted) throw new Error('Content query cancelled', { cause: error });
      if (timeoutSignal.aborted) throw new Error('Content query timed out', { cause: error });
    }
    if (!response.ok) throw new Error(body?.error?.message ?? `Content query failed with ${response.status}`);
    if (!body || !Object.hasOwn(body, 'data')) throw new Error('Invalid content query response');
    return body.data as T;
  };
  const model = <T>(target: Extract<ContentQueryTarget, { type: 'module' }>): ReadModel<T> => {
    return {
      findOne: (input) => execute({ target, operation: 'findOne', input }),
      findFirst: (input) => execute({ target, operation: 'findFirst', ...(input ? { input } : {}) }),
      findMany: (input) => execute({ target, operation: 'findMany', ...(input ? { input } : {}) }),
      count: (input) => execute({ target, operation: 'count', ...(input ? { input } : {}) }),
      aggregate: (input) => execute({ target, operation: 'aggregate', input }),
    };
  };
  const resource = <T>(type: 'menu' | 'asset'): ResourceAccessor<T> => {
    const get = (ids: string | readonly string[]) => {
      return execute<T | null | readonly (T | null)[]>({ target: { type }, operation: 'get', input: { ids } });
    };
    return get as ResourceAccessor<T>;
  };
  return {
    asset: resource<CmsAsset>('asset'),
    menu: resource<CmsMenu>('menu'),
    module<TEntry extends ModuleEntry = ModuleEntry>(key: string) {
      return model<TEntry>({ type: 'module', key });
    },
  } as const;
}
