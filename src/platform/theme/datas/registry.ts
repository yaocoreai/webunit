import menusData from '@/theme/datas/menus';
import siteData from '@/theme/datas/site';
import storages from '@/theme/datas/storage';
import templateData from '@/theme/datas/template';
import { datasModules, datasModuleSchemas } from '@/platform/generated/datas-registry';
import type { CmsLinkInput, MenuItemDataInput } from '@/platform/theme/define/datas';
import type { AssetDataInput, DefinedAssetEntries, MenuDataInput, SiteDataInput } from '@/platform/theme/define/datas';
import type { DatasModuleSchema, ResolvedModuleDataInput } from './model';
import type { CmsLink, ModuleEntry } from '@/platform/theme/content/public';
import { isPublicContentUrl } from '@/platform/theme/content/url';
import type { ValueTypeNode } from '@/platform/theme/define';
import type { ManifestModule, ManifestProperty } from '@/platform/manifest';
import { createDatasModel, normalizeRoutePath, validateMenuData, validateSiteData } from './model';
import { isCmsLinkStored, isCmsResourceRef, isHtmlEditorDocument, isRichTextEditorDocument, parseCmsReference } from '@/platform/schema';
import { materialize } from '@/platform/theme/source/site-adapter-values';

type RegistryInput = Readonly<{ site: SiteDataInput; menus: MenuDataInput; storages: DefinedAssetEntries; templates: Readonly<Record<string, Readonly<{ id: string; templateKey: string }>>>; modules: Readonly<Record<string, ResolvedModuleDataInput>>; requirements: readonly DatasModuleSchema[] }>;
export type DatasRegistry = Readonly<{
  modules: Map<string, import('./model').DatasModule>;
  pages: Map<string, import('./model').DatasPageRoute>;
  assets: Readonly<Record<string, AssetDataInput & Readonly<{ id: string }>>>;
  menus: Readonly<Record<string, Readonly<{ id: string; items: readonly object[] }>>>;
  resources: ResourceMap;
  site: SiteDataInput;
}>;

export function createDatasRegistry(input: RegistryInput): DatasRegistry {
  validateSiteData(input.site);
  assertUniqueIds('Template', Object.values(input.templates).map((value) => value.id));
  assertUniqueIds('CmsMenu', Object.values(input.menus).map((value) => value.id));
  const model = createDatasModel(input.modules, input.templates, input.requirements);
  validateMenuData(input.menus, model.modules);
  validateStorageData(input.storages);
  const registryAssets = Object.fromEntries(Object.values(input.storages).map((value) => [value.id, value]));
  const registryMenus = Object.fromEntries(Object.values(input.menus).map((menu) => [menu.id, {
    id: menu.id,
    items: menu.items.map((item) => resolveMenuItem(item, model.modules)),
  }]));
  const rawModuleResources = Object.fromEntries([...model.modules].map(([moduleKey, module]) => [moduleKey, Object.fromEntries(
    Object.entries(module.entries).map(([entryId, entry]) => [entryId, {
      id: entry.id, ...entry.parentId ? { parentId: entry.parentId } : {}, fields: entry.fields,
      page: entry.page ? { routeKey: entry.page.routeKey, path: normalizeRoutePath(module.routePrefix!, entry.page.routeKey) } : null,
    }]),
  )]));
  const registryResources = { file: registryAssets, menu: registryMenus, ...rawModuleResources } as ResourceMap;
  return { ...model, assets: registryAssets, menus: registryMenus, resources: registryResources, site: input.site } as const;
}

const assertUniqueIds = (owner: string, ids: readonly string[]) => {
  if (ids.some((id) => !id.trim()) || new Set(ids).size !== ids.length) throw new Error(`Invalid or duplicate Datas ${owner} id`);
};

function validateStorageData(input: DefinedAssetEntries) {
const ids = new Set<string>();
for (const [key, storage] of Object.entries(input)) {
  if (!storage.id.trim() || ids.has(storage.id)) throw new Error(`Invalid or duplicate Datas Storage id: ${storage.id}`);
  ids.add(storage.id);
  const dimensions = storage as { width?: unknown; height?: unknown };
  for (const dimension of ['width', 'height'] as const) {
    const value = dimensions[dimension];
    if (value !== undefined && (storage.type !== 'image' || typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0)) throw new Error(`Storage ${dimension} requires a positive image dimension: ${key}`);
  }
}
}

const staticSiteData = typeof siteData === 'function' ? undefined : siteData;
const staticRegistry = staticSiteData && typeof storages.entries !== 'function' ? createDatasRegistry({ site: staticSiteData, menus: menusData, storages: storages.entries, templates: templateData, modules: datasModules as Readonly<Record<string, ResolvedModuleDataInput>>, requirements: datasModuleSchemas }) : undefined;
export const moduleDataByKey: Map<string, import('./model').DatasModule> = staticRegistry?.modules ?? new Map();
export const pageDataByPath: Map<string, import('./model').DatasPageRoute> = staticRegistry?.pages ?? new Map();

export const assets = staticRegistry?.assets ?? {};

function resolveMenuItem(item: MenuItemDataInput, modules: ReadonlyMap<string, import('./model').DatasModule> = moduleDataByKey): object {
  return { ...item, link: resolveCmsLink(item.link, undefined, modules), children: item.children.map((child) => resolveMenuItem(child, modules)) };
}

export const menus = staticRegistry?.menus ?? {};

export type ResourceMap = Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, unknown>>>>>>;

const rawResources = staticRegistry?.resources ?? { file: {}, menu: {} } as ResourceMap;

export function resolveCmsLink(link: CmsLinkInput, source?: ResourceMap, modules: ReadonlyMap<string, import('./model').DatasModule> = moduleDataByKey): CmsLink {
  if (link.type === 'path') {
    if (!link.href || !isPublicContentUrl(link.href)) throw new Error(`Invalid path CmsLink: ${link.title}`);
    return { ...link, href: link.href, resource: null };
  }
  const parsed = parseCmsReference(link.reference);
  if (!parsed || parsed.kind !== 'module') throw new Error(`Invalid Module CmsLink reference: ${link.reference}`);
  const moduleKey = parsed.moduleKey;
  const candidates = source ? Object.values(source[link.reference] ?? source[moduleKey] ?? {}) : [];
  const sourceResource = link.id ? candidates.find((candidate) => candidate.id === link.id) as (ModuleEntry & { title?: string }) | undefined : undefined;
  const module = modules.get(moduleKey);
  const entry = module && link.id ? module.entries[link.id] : undefined;
  const resource = sourceResource ?? (entry?.page ? {
    id: entry.id,
    ...entry.parentId ? { parentId: entry.parentId } : {},
    fields: entry.fields,
    page: { routeKey: entry.page.routeKey, path: normalizeRoutePath(module!.routePrefix!, entry.page.routeKey) },
  } : undefined);
  if (!resource?.page) throw new Error(`Unknown Module CmsLink: ${link.reference}.${link.id}`);
  const fields = (resource.fields ?? {}) as Readonly<Record<string, unknown>>;
  const fallback = link.id;
  const title =
    typeof sourceResource?.title === 'string' && sourceResource.title
      ? sourceResource.title
      : datasEntryTitle(fields, fallback);
  return {
    type: 'module',
    reference: link.reference,
    id: link.id,
    target: link.target,
    title,
    href: resource.page.path,
    resource,
  };
}

function datasEntryTitle(fields: Readonly<Record<string, unknown>>, fallback: string) {
  for (const key of ['title', 'name', 'label'] as const) {
    const value = fields[key];
    if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 160);
  }
  return fallback;
}

function isCmsLinkInput(value: Readonly<Record<string, unknown>>): value is CmsLinkInput {
  return isCmsLinkStored(value);
}

export function materializeCmsLinks(value: unknown, source: ResourceMap = rawResources): unknown {
  if (Array.isArray(value)) return value.map((item) => materializeCmsLinks(item, source));
  if (!value || typeof value !== 'object') return value;
  const record = value as Readonly<Record<string, unknown>>;
  if (isCmsLinkInput(record)) return resolveCmsLink(record, source);
  return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, materializeCmsLinks(item, source)]));
}

const resolveReference = (value: unknown, resourceType: string, source: ResourceMap) => {
  if (!isCmsResourceRef(value)) return value;
  const parsed = parseCmsReference(value.reference);
  if (!parsed) return value;
  if (parsed.kind === 'module') {
    if (resourceType !== parsed.moduleKey) return value;
    return source[parsed.moduleKey]?.[value.id] ?? value;
  }
  if (parsed.kind === 'menu') {
    if (resourceType !== 'menu') return value;
    return source.menu?.[value.id] ?? value;
  }
  if (parsed.kind === 'form') return value;
  if (resourceType !== 'file') return value;
  return source.file?.[value.id] ?? value;
};

export function materializeResourceIds(fields: Readonly<Record<string, unknown>>, properties: readonly ManifestProperty[], source: ResourceMap = rawResources, defaultCurrency: string | undefined = staticSiteData?.defaultCurrency) {
  const definitions = new Map(properties.map((property) => [property.key, property]));
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => {
    const property = definitions.get(key);
    if (!property) return [key, value];
    return [key, materializeNodeResources(value, property, source, defaultCurrency, [])];
  }));
}

export const publicEntryFields = (moduleKey: string, fields: Readonly<Record<string, unknown>>, requirements: readonly ManifestModule[], source: ResourceMap = rawResources, defaultCurrency?: string) => (
  materializeCmsLinks(materializeResourceIds(fields, requirements.find((module) => module.key === moduleKey)?.entryProperties ?? [], source, defaultCurrency), source) as Readonly<Record<string, unknown>>
);

function materializeNodeResources(value: unknown, node: ValueTypeNode, source: ResourceMap, defaultCurrency: string | undefined, stack: readonly string[]): unknown {
  if (node.type === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
    const definitions = new Map((node.fields ?? []).map((field) => [field.key, field]));
    return Object.fromEntries(Object.entries(value as Readonly<Record<string, unknown>>).map(([key, item]) => [key, definitions.has(key) ? materializeNodeResources(item, definitions.get(key)!, source, defaultCurrency, stack) : item]));
  }
  if (node.type === 'array' && Array.isArray(value) && node.items) return value.map((item) => materializeNodeResources(item, node.items!, source, defaultCurrency, stack));
  if (['file', 'image', 'audio', 'video'].includes(node.type)) return resolveReference(value, 'file', source);
  if (['files', 'images', 'audios', 'videos'].includes(node.type)) return Array.isArray(value) ? value.map((item) => resolveReference(item, 'file', source)) : value;
  if (node.type === 'menu') return resolveReference(value, 'menu', source);
  if (node.type === 'menus') return Array.isArray(value) ? value.map((item) => resolveReference(item, 'menu', source)) : value;
  if (node.type === 'form' || node.type === 'forms') return value;
  if (node.type === 'module' && node.reference) return resolveReference(value, node.reference, source);
  if (node.type === 'modules' && node.reference) return Array.isArray(value) ? value.map((item) => resolveReference(item, node.reference!, source)) : value;
  if (node.type === 'html') return isHtmlEditorDocument(value) ? materialize(value, source, defaultCurrency) : undefined;
  if (node.type === 'rich') return isRichTextEditorDocument(value) ? materialize(value, source, defaultCurrency) : undefined;
  if (node.type === 'price' && value && typeof value === 'object' && !Array.isArray(value)) {
    const amountMinor = (value as { amountMinor?: unknown }).amountMinor;
    if (Number.isSafeInteger(amountMinor)) {
      if (!defaultCurrency) throw new Error('Site defaultCurrency must resolve before Price materialization');
      return { amountMinor: Number(amountMinor), currency: defaultCurrency.toLowerCase() };
    }
  }
  return value;
}

export const resources = rawResources;
