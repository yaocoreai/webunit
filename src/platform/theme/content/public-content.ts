// Adapts Function content queries to the Astro SSR content facade.
import type { ContentQueryRequest, ContentQueryTarget } from '@/platform/theme/content/protocol';
import type { ModelAggregateResult, ModelPage, ReadModel } from '@/platform/theme/content/model';
import type { CmsAsset, CmsMenu, ModuleEntry, PublicApiContext, PublicContentApi, ResourceAccessor } from '@/platform/theme/content/public';
import { isPublicContentUrl, isTrustedCmsAssetEmbedType, isTrustedCmsAssetEmbedUrl } from '@/platform/theme/content/url';
import { ApiError } from '@/platform/runtime/error';

export type QueryEnvelope = Readonly<{
  data: unknown;
  dependency?: Readonly<{
    browserTtlSeconds: number;
    sharedTtlSeconds: number;
    staleWhileRevalidateSeconds: number;
    surrogateKeys: readonly string[];
    noStore?: boolean;
  }>;
}>;

export type ContentQueryExecutor = (request: ContentQueryRequest, signal: AbortSignal) => Promise<QueryEnvelope>;
export type ContentBatchResult = Readonly<{ ok: true; value: QueryEnvelope } | { ok: false; error: unknown }>;
export type ContentBatchExecutor = (requests: readonly ContentQueryRequest[], signal: AbortSignal) => Promise<readonly ContentBatchResult[]>;

export function createPublicContentApiFromQuery(executeQuery: ContentQueryExecutor, context: PublicApiContext, executeBatch?: ContentBatchExecutor): PublicContentApi {
  const requests = new Map<string, Promise<unknown>>();
  let queued: Array<Readonly<{ request: ContentQueryRequest; resolve(value: QueryEnvelope): void; reject(error: unknown): void }>> = [];
  let scheduled = false;
  const execute = executeBatch ? (request: ContentQueryRequest) => new Promise<QueryEnvelope>((resolve, reject) => {
    queued.push({ request, resolve, reject });
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(async () => {
      scheduled = false;
      const batches = queued;
      queued = [];
      for (let offset = 0; offset < batches.length; offset += 20) {
        const batch = batches.slice(offset, offset + 20);
        try {
          const results = await executeBatch(batch.map((item) => item.request), context.signal);
          if (results.length !== batch.length) throw contractError();
          batch.forEach((item, index) => {
            const result = results[index]!;
            if (result.ok) item.resolve(result.value);
            else item.reject(result.error);
          });
        } catch (error) {
          batch.forEach((item) => item.reject(error));
        }
      }
    });
  }) : (request: ContentQueryRequest) => executeQuery(request, context.signal);
  const executeRequest = (request: ContentQueryRequest) => {
    const cacheKey = JSON.stringify(request);
    const cached = requests.get(cacheKey);
    if (cached) return cached;
    const pending = execute(request).then((response) => {
      if (!Object.hasOwn(response, 'data')) throw new ApiError('contract', 502, '/public/cms/content/query');
      if (response.dependency) context.registerDependency?.(response.dependency);
      return response.data;
    });
    requests.set(cacheKey, pending);
    return pending;
  };
  const model = <T>(target: Extract<ContentQueryTarget, { type: 'module' }>, decode: (value: unknown) => T): ReadModel<T> => {
    const execute = (operation: 'findOne' | 'findFirst' | 'findMany' | 'count' | 'aggregate', input?: object) => executeRequest({ target, operation, ...(input ? { input: input as Readonly<Record<string, unknown>> } : {}) });
    return {
      findOne: async (input) => readNullable(await execute('findOne', input), decode),
      findFirst: async (input) => readNullable(await execute('findFirst', input), decode),
      findMany: async (input) => readModelPage(await execute('findMany', input), decode),
      count: async (input) => {
        const value = await execute('count', input);
        if (!Number.isInteger(value) || Number(value) < 0) throw contractError();
        return Number(value);
      },
      aggregate: async (input) => readAggregateResult(await execute('aggregate', input), input),
    };
  };
  const moduleModels = new Map<string, ReadModel<ModuleEntry>>();
  const module = <TEntry extends ModuleEntry = ModuleEntry>(key: string) => {
    const cached = moduleModels.get(key);
    if (cached) return cached as ReadModel<TEntry>;
    const value = model<ModuleEntry>({ type: 'module', key }, readModuleEntryResult);
    moduleModels.set(key, value);
    return value as ReadModel<TEntry>;
  };
  const resources = <T>(type: 'asset' | 'menu', decode: (value: unknown) => T): ResourceAccessor<T> => {
    const get = async (ids: string | readonly string[]) => {
      const value = await executeRequest({ target: { type }, operation: 'get', input: { ids } });
      if (typeof ids === 'string') return value === null ? null : decode(value);
      if (!Array.isArray(value) || value.length !== ids.length) throw contractError();
      return value.map((item) => item === null ? null : decode(item));
    };
    return get as ResourceAccessor<T>;
  };

  return {
    asset: resources('asset', readAssetResult),
    module,
    menu: resources('menu', readMenu),
  };
}

function readAssetResult(value: unknown): CmsAsset {
  const item = readRecord(value);
  const delivery = readRecord(item.delivery);
  if (typeof item.id !== 'string' || typeof item.title !== 'string' || !['file', 'image', 'audio', 'video'].includes(String(item.type))) throw contractError();
  if (item.alt !== undefined && (item.type !== 'image' || typeof item.alt !== 'string')) throw contractError();
  const alt = typeof item.alt === 'string' ? { alt: item.alt } : {};
  const dimensions = readAssetDimensions(item);
  if (item.poster !== undefined && item.type !== 'video' && item.type !== 'audio') throw contractError();
  const poster = item.poster === undefined ? {} : readPoster(item.poster);
  if (delivery.type === 'file' && typeof delivery.url === 'string' && isPublicContentUrl(delivery.url) && (delivery.contentType === undefined || typeof delivery.contentType === 'string')) return { id: item.id, type: item.type as CmsAsset['type'], title: item.title, ...alt, ...dimensions, ...poster, delivery: { type: 'file', url: delivery.url, ...(delivery.contentType ? { contentType: delivery.contentType as string } : {}) } };
  if (delivery.type === 'embed' && typeof delivery.provider === 'string' && isTrustedCmsAssetEmbedType(delivery.provider, String(item.type)) && typeof delivery.url === 'string' && isTrustedCmsAssetEmbedUrl(delivery.provider, delivery.url)) return { id: item.id, type: item.type as 'video' | 'audio', title: item.title, ...alt, ...dimensions, ...poster, delivery: { type: 'embed', provider: delivery.provider, url: delivery.url } };
  throw contractError();
}

const readAssetDimensions = (item: Record<string, unknown>): Pick<CmsAsset, 'width' | 'height'> => {
  const hasWidth = item.width !== undefined;
  const hasHeight = item.height !== undefined;
  if (item.type !== 'image') {
    if (hasWidth || hasHeight) throw contractError();
    return {};
  }
  if (hasWidth !== hasHeight) throw contractError();
  if (!hasWidth) return {};
  const width = readPositiveInteger(item.width);
  const height = readPositiveInteger(item.height);
  if (!width || !height) throw contractError();
  return { width, height };
};

const readPoster = (value: unknown): Pick<CmsAsset, 'poster'> => {
  const poster = readRecord(value);
  if (typeof poster.url !== 'string' || !isPublicContentUrl(poster.url)) throw contractError();
  return { poster: { url: poster.url } };
};

const readPositiveInteger = (value: unknown) => Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : undefined;

function readModuleEntryResult(value: unknown): ModuleEntry {
  const item = readRecord(value);
  const fields = readRecord(item.fields);
  if (typeof item.id !== 'string' || (item.parentId !== undefined && typeof item.parentId !== 'string')) throw contractError();
  const page = item.page === null ? null : readRecord(item.page);
  if (page && (typeof page.routeKey !== 'string' || typeof page.path !== 'string')) throw contractError();
  return { id: item.id, ...(item.parentId ? { parentId: item.parentId } : {}), fields, page: page ? { routeKey: page.routeKey as string, path: page.path as string } : null };
}

function readMenu(value: unknown): CmsMenu {
  const menu = readRecord(value);
  if (typeof menu.id !== 'string' || !Array.isArray(menu.items)) throw contractError();
  const state = { count: 0, itemIds: new Set<string>() };
  return { id: menu.id, items: menu.items.map((item) => readMenuItem(item, 0, state)) };
}

function readMenuItem(value: unknown, depth: number, state: { count: number; itemIds: Set<string> }): CmsMenu['items'][number] {
  if (depth >= 10 || ++state.count > 5000) throw contractError();
  const item = readRecord(value);
  if (typeof item.id !== 'string' || !Array.isArray(item.children)) throw contractError();
  if (state.itemIds.has(item.id)) throw contractError();
  state.itemIds.add(item.id);
  const fields = readRecord(item.fields);
  const link = readRecord(item.link);
  if (typeof link.title !== 'string' || (link.target !== '_self' && link.target !== '_blank') || typeof link.href !== 'string' || !isPublicContentUrl(link.href)) throw contractError();
  if (link.type === 'path' && link.resource === null) return { id: item.id, fields, link: { type: 'path', title: link.title, target: link.target, href: link.href, resource: null }, children: item.children.map((child) => readMenuItem(child, depth + 1, state)) };
  if (link.type === 'module' && typeof link.reference === 'string' && typeof link.id === 'string') return { id: item.id, fields, link: { type: 'module', reference: link.reference, id: link.id, title: link.title, target: link.target, href: link.href, resource: readModuleEntryResult(link.resource) }, children: item.children.map((child) => readMenuItem(child, depth + 1, state)) };
  throw contractError();
}

function readNullable<T>(value: unknown, decode: (value: unknown) => T) {
  return value === null ? null : decode(value);
}

function readModelPage<T>(value: unknown, decode: (value: unknown) => T): ModelPage<T> {
  const page = readRecord(value);
  const pageInfo = readRecord(page.pageInfo);
  if (!Array.isArray(page.items) || (page.total !== undefined && (!Number.isInteger(page.total) || Number(page.total) < 0)) || typeof pageInfo.hasNextPage !== 'boolean' || (pageInfo.endCursor !== undefined && typeof pageInfo.endCursor !== 'string')) throw contractError();
  return {
    items: page.items.map(decode),
    ...(page.total === undefined ? {} : { total: Number(page.total) }),
    pageInfo: { hasNextPage: pageInfo.hasNextPage, ...(pageInfo.endCursor ? { endCursor: pageInfo.endCursor } : {}) },
  };
}

function readAggregateResult(value: unknown, input: Readonly<{ count?: boolean; sum?: readonly string[]; avg?: readonly string[]; min?: readonly string[]; max?: readonly string[] }>): ModelAggregateResult {
  const result = readRecord(value);
  if (Object.keys(result).some((key) => !['count', 'currency', 'sum', 'avg', 'min', 'max'].includes(key))) throw contractError();
  if (result.count !== undefined && (!Number.isInteger(result.count) || Number(result.count) < 0)) throw contractError();
  if (input.count === true && result.count === undefined) throw contractError();
  if (result.currency !== undefined && (typeof result.currency !== 'string' || !/^[a-z]{3}$/.test(result.currency))) throw contractError();
  const output: Record<string, unknown> = { ...(result.count === undefined ? {} : { count: Number(result.count) }), ...(result.currency === undefined ? {} : { currency: result.currency }) };
  for (const operation of ['sum', 'avg', 'min', 'max'] as const) {
    if (result[operation] === undefined) continue;
    const values = readRecord(result[operation]);
    const requested = new Set(input[operation] ?? []);
    if (!requested.size || Object.keys(values).length !== requested.size || Object.keys(values).some((key) => !requested.has(key))) throw contractError();
    if (Object.values(values).some((item) => item !== null && (typeof item !== 'number' || !Number.isFinite(item)))) throw contractError();
    output[operation] = values;
  }
  return output as ModelAggregateResult;
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw contractError();
  return value as Record<string, unknown>;
}

const contractError = (): never => { throw new ApiError('contract', 502, '/public/cms/content/query'); };
