import { createMemoryReadModel, validateAggregateQuery, validateQuery, type ReadModel } from '@/platform/theme/content/model';
import siteData from '@/theme/datas/site';
import { ApiError } from '@/platform/runtime/error';
import type { CmsAsset, CmsMenu, ModuleEntry, PublicApiContext, PublicContentApi, ResourceAccessor } from '@/platform/theme/content/public';
import type { ManifestModule } from '@/platform/manifest';
import type { SiteDataInput } from '@/platform/theme/define/datas';
import type { DatasGraph } from './graph';
import { moduleDataByKey, publicEntryFields } from './registry';
import { getData } from './data';
import { mergeLocalizedValue } from './localize';
import { localizeResources } from './localize-resources';
import { normalizeDatasEntry, normalizeRoutePath } from './model';
import { createDatasTranslationReader, getDatasTranslation } from './translation-cache';
import { createDatasSearchDocuments, validateModuleQuery } from './search';
import { validateDatasEntryFields } from '@/platform/theme/validation/datas';
import type { ModuleEntryQueryModel, QueriedEntryData } from '@/platform/theme/define/datas';
import { collectAssetKeys, loadAssetResources } from './query-assets';
import type { ModelAggregateQuery, ModelAggregateResult } from '@/platform/theme/content/model';
import { isCmsEditorDocument, isCmsModuleRef, parseCmsReference } from '@/platform/schema';
import { datasTranslationIdentity } from './translation-identity';

const identityArgs = (identity: Readonly<{ namespace: string; key: string }>, locale: string) => [identity.namespace, identity.key, locale] as const;

const abortIfNeeded = (context: PublicApiContext) => {
  if (context.signal.aborted) throw new DOMException('Aborted', 'AbortError');
};

export function createDatasPublicContent(context: PublicApiContext, requirements: readonly ManifestModule[], site: SiteDataInput = siteData as SiteDataInput, graph?: DatasGraph): PublicContentApi {
  const memo = new Map<string, Promise<unknown>>();
  const once = <T>(key: string, load: () => Promise<T>) => {
    const cached = memo.get(key) as Promise<T> | undefined;
    if (cached) return cached;
    const pending = load();
    memo.set(key, pending);
    return pending;
  };
  const delay = async () => { abortIfNeeded(context); };
  const modules = graph?.registry.modules ?? moduleDataByKey;
  const readTranslation = graph ? createDatasTranslationReader(graph.translations) : getDatasTranslation;
  const localizedResources = localizeResources(context.locale, requirements, site.id, site.defaultCurrency, graph?.registry, readTranslation, graph?.menuProperties);
  const queryAssets = graph?.assetQuery
    ? (keys: readonly string[]) => once(`asset.query:${JSON.stringify(keys)}`, () => graph.assetQuery!(keys))
    : undefined;
  const searchDocuments = createDatasSearchDocuments(requirements, site, modules, readTranslation);
  const menus = localizedResources.menu as unknown as Record<string, CmsMenu>;
  const register = (surrogateKeys: string[], ttl = { browser: 60, shared: 300, stale: 60 }) => context.registerDependency?.({
    browserTtlSeconds: ttl.browser, sharedTtlSeconds: ttl.shared, staleWhileRevalidateSeconds: ttl.stale, surrogateKeys,
  });
  const wrapModel = <T extends Readonly<Record<string, unknown>>>(scope: string, model: ReadModel<T>): ReadModel<T> => ({
    findOne: (input) => once(`${scope}.findOne:${JSON.stringify(input)}`, async () => {
      await delay();
      const item = await model.findOne(input);
      register([scope, ...(item ? [`entry:${String(item.id ?? '')}`] : [])]);
      return item;
    }),
    findFirst: (input = {}) => once(`${scope}.findFirst:${JSON.stringify(input)}`, async () => {
      await delay();
      const item = await model.findFirst(input);
      register([scope, ...(item ? [`entry:${String(item.id ?? '')}`] : [])]);
      return item;
    }),
    findMany: (input = {}) => once(`${scope}.findMany:${JSON.stringify(input)}`, async () => {
      await delay();
      const page = await model.findMany(input);
      register([scope, ...page.items.map((item) => `entry:${String(item.id ?? '')}`)]);
      return page;
    }),
    count: (input = {}) => once(`${scope}.count:${JSON.stringify(input)}`, async () => {
      await delay();
      const count = await model.count(input);
      register([scope]);
      return count;
    }),
    aggregate: (input) => once(`${scope}.aggregate:${JSON.stringify(input)}`, async () => {
      await delay();
      const result = await model.aggregate(input);
      register([scope]);
      return result;
    }),
  });
  const moduleModels = new Map<string, ReadModel<ModuleEntry>>();
  const module = <TEntry extends ModuleEntry = ModuleEntry>(key: string) => {
    const existing = moduleModels.get(key);
    if (existing) return existing as ReadModel<TEntry>;
    const source = modules.get(key);
    if (!source) throw new ApiError('response', 404, `module:${key}`);
    const requirement = requirements.find((candidate) => candidate.key === key);
    if (!requirement) throw new ApiError('response', 404, `module:${key}`);
    const queryEntries = graph?.queryEntries.get(key);
    if (queryEntries) {
      const materializeMany = async (results: readonly QueriedEntryData[], expected?: Readonly<{ id?: string; routeKey?: string }>): Promise<ModuleEntry[]> => {
        const normalized = results.map((result) => {
          if (!result || typeof result.id !== 'string' || !result.id || !result.value || typeof result.value !== 'object') throw new TypeError(`Invalid queried Entry: ${key}`);
          if (expected?.id !== undefined && result.id !== expected.id) throw new TypeError(`Queried Entry id mismatch: ${key}.${result.id}`);
          const entry = normalizeDatasEntry(key, requirement, result.id, result.value);
          if (expected?.routeKey !== undefined && entry.page?.routeKey !== expected.routeKey) throw new TypeError(`Queried Entry routeKey mismatch: ${key}.${result.id}`);
          validateDatasEntryFields(key, result.id, entry.fields, requirement.entryProperties);
          return entry;
        });
        if (new Set(normalized.map((entry) => entry.id)).size !== normalized.length) throw new TypeError(`Duplicate queried Entry id: ${key}`);
        let resources = await loadAssetResources(queryAssets, collectAssetKeys(normalized.map((entry) => entry.fields), requirement.entryProperties ?? []), localizedResources);
        const references = collectModuleReferences(normalized.map((entry) => entry.fields), requirement.entryProperties ?? []);
        for (const [reference, ids] of references) {
          if (!graph?.queryEntries.has(reference)) continue;
          if (ids.length > 100) throw new TypeError(`Too many queried Module references: ${reference}`);
          const page = await module(reference).findMany({ where: { attributes: { id: { in: ids } } }, limit: ids.length });
          if (page.items.some((entry) => !ids.includes(entry.id))) throw new TypeError(`Invalid queried Module reference: ${reference}`);
          resources = { ...resources, [reference]: { ...(resources[reference] ?? {}), ...Object.fromEntries(page.items.map((entry) => [entry.id, entry])) } };
        }
        return normalized.map((entry) => ({
          id: entry.id,
          ...(entry.parentId ? { parentId: entry.parentId } : {}),
          fields: publicEntryFields(key, entry.fields, requirements, resources, site.defaultCurrency),
          page: entry.page ? { routeKey: entry.page.routeKey, path: normalizeRoutePath(requirement.routePrefix!, entry.page.routeKey) } : null,
        }));
      };
      const materialize = async (result: QueriedEntryData | null, expected?: Readonly<{ id?: string; routeKey?: string }>): Promise<ModuleEntry | null> => {
        if (result === null) return null;
        return (await materializeMany([result], expected))[0];
      };
      const queried = queryEntries as ModuleEntryQueryModel;
      const sourceModel: ReadModel<ModuleEntry> = {
        async findOne(input) {
          if (!input?.id) throw new TypeError('findOne requires exactly one non-empty id');
          return materialize(await queried.findOne(input), { id: input.id });
        },
        async findFirst(input = {}) {
          validateModuleQuery(input, requirement);
          validateQuery(input);
          const item = queried.findFirst
            ? await queried.findFirst(input)
            : (await queried.findMany({ ...input, limit: 1 })).items[0] ?? null;
          return materialize(item);
        },
        async findMany(input = {}) {
          validateModuleQuery(input, requirement);
          validateQuery(input);
          const page = await queried.findMany(input);
          if (!page || !Array.isArray(page.items) || page.items.length > (input.limit ?? 20) || (page.total !== undefined && (!Number.isSafeInteger(page.total) || page.total < page.items.length)) || (input.includeTotal === true && page.total === undefined) || typeof page.pageInfo?.hasNextPage !== 'boolean') throw new TypeError(`Invalid queried Entry page: ${key}`);
          return { ...page, items: await materializeMany(page.items) };
        },
        async count(input = {}) {
          validateModuleQuery(input, requirement);
          validateQuery(input);
          const count = await queried.count(input);
          if (!Number.isSafeInteger(count) || count < 0) throw new TypeError(`Invalid queried Entry count: ${key}`);
          return count;
        },
        async aggregate(input) {
          validateModuleQuery(input, requirement);
          validateAggregateQuery(input, (requirement.entryProperties ?? []).map((property) => property.key));
          return validateAggregateResult(input, await queried.aggregate(input));
        },
      };
      const model = wrapModel(`module:${key}`, sourceModel);
      moduleModels.set(key, model);
      return model as ReadModel<TEntry>;
    }
    const rows = Object.values(source.entries).map((entry) => {
      return {
        id: entry.id,
        ...entry.parentId ? { parentId: entry.parentId } : {},
        fields: publicEntryFields(key, mergeLocalizedValue(
          entry.fields,
          readTranslation<Readonly<{ fields: Readonly<Record<string, unknown>> }>>(...identityArgs(datasTranslationIdentity.entryFields(site.id, source.id, entry.id), context.locale))?.fields,
        ) as Readonly<Record<string, unknown>>, requirements, localizedResources, site.defaultCurrency),
        page: entry.page ? { routeKey: entry.page.routeKey, path: normalizeRoutePath(source.routePrefix!, entry.page.routeKey) } : null,
      } satisfies ModuleEntry;
    });
    const searchableTextByEntry = new Map(searchDocuments
      .filter((document) => document.moduleKey === key && document.locale === context.locale)
      .map((document) => [document.entryId, document.text]));
    const aggregatableFields = (requirement.entryProperties ?? []).map((property) => property.key);
    const sourceModel = createMemoryReadModel(rows, {
      searchText: (row) => searchableTextByEntry.get(row.id),
      aggregatableFields,
      aggregateValue: (row, field) => {
        const value = row.fields[field];
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const amountMinor = (value as { amountMinor?: unknown }).amountMinor;
          if (Number.isSafeInteger(amountMinor)) return Number(amountMinor);
        }
        return undefined;
      },
    });
    const model = wrapModel(`module:${key}`, {
      findOne: (input) => sourceModel.findOne(input),
      findFirst: (input = {}) => { validateModuleQuery(input, requirement); return sourceModel.findFirst(input); },
      findMany: (input = {}) => { validateModuleQuery(input, requirement); return sourceModel.findMany(input); },
      count: (input = {}) => { validateModuleQuery(input, requirement); return sourceModel.count(input); },
      aggregate: (input) => { validateModuleQuery(input, requirement); return sourceModel.aggregate(input); },
    });
    moduleModels.set(key, model);
    return model as ReadModel<TEntry>;
  };
  const assets = localizedResources.file as unknown as Record<string, CmsAsset>;
  const resource = <T>(scope: string, values: Readonly<Record<string, T>>, ttl?: { browser: number; shared: number; stale: number }): ResourceAccessor<T> => {
    const get = async (keys: string | readonly string[]) => {
      return await once(`${scope}.get:${JSON.stringify(keys)}`, async () => {
        await delay();
        const list = typeof keys === 'string' ? [keys] : keys;
        register(list.map((key) => `${scope}:${key}`), ttl);
        const result = list.map((key) => getData(values, key) ?? null);
        return typeof keys === 'string' ? result[0] ?? null : result;
      });
    };
    return get as ResourceAccessor<T>;
  };

  const asset = graph?.assetQuery ? (async (keys: string | readonly string[]) => {
    const requested = typeof keys === 'string' ? [keys] : [...keys];
    if (!requested.length || requested.length > 100 || requested.some((key) => typeof key !== 'string' || !key)) throw new TypeError('Asset query requires between 1 and 100 non-empty keys');
    const unique = [...new Set(requested)];
    const rows = await queryAssets!(unique);
    const values = new Map<string, CmsAsset>();
    for (const row of rows) {
      if (!row || !unique.includes(row.key) || values.has(row.key) || !row.value || typeof row.value !== 'object') throw new TypeError('Invalid queried Asset result');
      if (row.value.id !== row.key) throw new TypeError('Queried Asset id mismatch');
      values.set(row.value.id, row.value);
    }
    register(unique.map((key) => `asset:${key}`));
    const result = requested.map((key) => values.get(key) ?? null);
    return typeof keys === 'string' ? result[0] ?? null : result;
  }) as ResourceAccessor<CmsAsset> : resource('asset', assets);

  return {
    asset,
    menu: resource('menu', menus, { browser: 300, shared: 1800, stale: 300 }),
    module,
  };
}

function validateAggregateResult(input: ModelAggregateQuery, result: ModelAggregateResult): ModelAggregateResult {
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new TypeError('Invalid aggregate result');
  if (Object.keys(result).some((key) => !['currency', 'count', 'sum', 'avg', 'min', 'max'].includes(key))) throw new TypeError('Invalid aggregate result');
  if (result.currency !== undefined && (typeof result.currency !== 'string' || !/^[a-z]{3}$/.test(result.currency))) throw new TypeError('Invalid aggregate currency');
  if (input.count && (!Number.isSafeInteger(result.count) || result.count! < 0)) throw new TypeError('Invalid aggregate count');
  for (const operation of ['sum', 'avg', 'min', 'max'] as const) {
    const requested = input[operation];
    if (!requested) continue;
    const values = result[operation];
    if (!values || Object.keys(values).length !== requested.length || requested.some((field) => !Object.hasOwn(values, field))) throw new TypeError(`Invalid aggregate ${operation} result`);
    if (Object.values(values).some((value) => value !== null && (typeof value !== 'number' || !Number.isFinite(value)))) throw new TypeError(`Invalid aggregate ${operation} result`);
  }
  return result;
}

function collectModuleReferences(fields: readonly Readonly<Record<string, unknown>>[], properties: ManifestModule['entryProperties']) {
  const references = new Map<string, Set<string>>();
  const add = (reference: string, value: unknown) => {
    if (!isCmsModuleRef(value)) return;
    const parsed = parseCmsReference(value.reference);
    if (!parsed || parsed.kind !== 'module' || parsed.moduleKey !== reference) return;
    const ids = references.get(reference) ?? new Set<string>();
    ids.add(value.id);
    references.set(reference, ids);
  };
  const links = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(links);
    if (!value || typeof value !== 'object') return;
    const record = value as Readonly<Record<string, unknown>>;
    if (record.type === 'module' && typeof record.reference === 'string') {
      const parsed = parseCmsReference(record.reference);
      if (parsed?.kind === 'module') add(parsed.moduleKey, record);
    }
    else Object.values(record).forEach(links);
  };
  const visit = (value: unknown, node: import('@/platform/theme/define').ValueTypeNode, stack: readonly string[]) => {
    if (node.type === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Readonly<Record<string, unknown>>;
      for (const field of node.fields ?? []) if (Object.hasOwn(record, field.key)) visit(record[field.key], field, stack);
      return;
    }
    if (node.type === 'array' && Array.isArray(value) && node.items) return value.forEach((item) => visit(item, node.items!, stack));
    if (node.type === 'html' || node.type === 'rich') {
      collectEditorDocumentModuleRefs(value, add);
      return;
    }
    if (node.type === 'module' && node.reference) add(node.reference, value);
    else if (node.type === 'modules' && node.reference && Array.isArray(value)) value.forEach((item) => add(node.reference!, item));
    else if (node.type === 'link' || node.type === 'links') links(value);
  };
  const definitions = new Map((properties ?? []).map((property) => [property.key, property]));
  for (const values of fields) for (const [key, value] of Object.entries(values)) {
    const property = definitions.get(key);
    if (property) visit(value, property, []);
  }
  return new Map([...references].map(([reference, ids]) => [reference, [...ids]]));
}

function collectEditorDocumentModuleRefs(
  value: unknown,
  add: (reference: string, candidate: unknown) => void,
) {
  if (!isCmsEditorDocument(value)) return;
  for (const reference of value.references) {
    if ("type" in reference && reference.type === "link") {
      if (reference.value.type === "module") {
        const parsed = parseCmsReference(reference.value.reference);
        if (parsed?.kind === "module") add(parsed.moduleKey, reference.value);
      }
      continue;
    }
    const { key, ...resource } = reference;
    void key;
    if (!isCmsModuleRef(resource)) continue;
    const parsed = parseCmsReference(resource.reference);
    if (parsed?.kind === 'module') add(parsed.moduleKey, resource);
  }
}
