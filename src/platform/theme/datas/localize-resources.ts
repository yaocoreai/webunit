import { parseCmsReference } from '@/platform/schema';
import type { MenuItemTranslationInput } from '@/platform/theme/define/datas';
import type { ManifestModule } from '@/platform/manifest';
import { mergeLocalizedValue } from './localize';
import { createDatasRegistry, materializeResourceIds, moduleDataByKey, publicEntryFields, resources } from './registry';
import { normalizeRoutePath } from './model';
import { getDatasTranslation, type DatasTranslationReader } from './translation-cache';
import siteData from '@/theme/datas/site';
import { datasTranslationIdentity } from './translation-identity';

type CmsMenuItem = Readonly<{
  id: string;
  link: Readonly<Record<string, unknown>>;
  fields: Readonly<Record<string, unknown>>;
  children: readonly CmsMenuItem[];
}>;

const identityArgs = (identity: Readonly<{ namespace: string; key: string }>, locale: string) => [identity.namespace, identity.key, locale] as const;
const resourceId = (value: Readonly<Record<string, unknown>>, owner: string) => {
  if (typeof value.id !== 'string' || !value.id) throw new Error(`Missing Datas ${owner} id`);
  return value.id;
};

function localizeLinkedResource(link: Readonly<Record<string, unknown>>, locale: string, siteId: string, requirements: readonly ManifestModule[], defaultCurrency: string, registry: ReturnType<typeof createDatasRegistry> | undefined, readTranslation: DatasTranslationReader) {
  if (link.type !== 'module' || typeof link.reference !== 'string' || typeof link.id !== 'string') return link.resource;
  const parsed = parseCmsReference(link.reference);
  const module = parsed?.kind === 'module' ? (registry?.modules ?? moduleDataByKey).get(parsed.moduleKey) : undefined;
  const entry = module?.entries[link.id];
  if (!entry) return link.resource;
  const fields = mergeLocalizedValue(
    entry.fields,
    readTranslation<Readonly<{ fields: Readonly<Record<string, unknown>> }>>(...identityArgs(datasTranslationIdentity.entryFields(siteId, module.id, entry.id), locale))?.fields,
  ) as Readonly<Record<string, unknown>>;
  return {
    id: entry.id,
    ...entry.parentId ? { parentId: entry.parentId } : {},
    fields: publicEntryFields(module.key, fields, requirements, undefined, defaultCurrency),
    page: entry.page ? { routeKey: entry.page.routeKey, path: normalizeRoutePath(module.routePrefix!, entry.page.routeKey) } : null,
  };
}

function localizeMenuItems(items: readonly CmsMenuItem[], translations: readonly MenuItemTranslationInput[], locale: string, siteId: string, requirements: readonly ManifestModule[], defaultCurrency: string, registry: ReturnType<typeof createDatasRegistry> | undefined, readTranslation: DatasTranslationReader): CmsMenuItem[] {
  for (const translation of translations) {
    if (!items.some((item) => item.id === translation.id)) throw new Error(`CmsMenu translation item must match the source level: ${translation.id}`);
  }
  return items.map((item) => {
    const translation = translations.find((candidate) => candidate.id === item.id);
    const resource = localizeLinkedResource(item.link, locale, siteId, requirements, defaultCurrency, registry, readTranslation);
    if (item.link.type === 'module') {
      const fields = (asRecord(resource)?.fields ?? {}) as Readonly<Record<string, unknown>>;
      const translatedTitle = typeof translation?.link?.title === 'string' ? translation.link.title.trim() : '';
      const fallback = typeof item.link.title === 'string' ? String(item.link.title) : String(item.link.id ?? '');
      const title = translatedTitle || datasLocalizedTitle(fields, fallback);
      return {
        ...item,
        link: { ...item.link, title, resource },
        fields: { ...item.fields, ...translation?.fields },
        children: localizeMenuItems(item.children, translation?.children ?? [], locale, siteId, requirements, defaultCurrency, registry, readTranslation),
      };
    }
    return {
      ...item,
      link: { ...item.link, ...(translation?.link?.title ? { title: translation.link.title } : {}), resource },
      fields: { ...item.fields, ...translation?.fields },
      children: localizeMenuItems(item.children, translation?.children ?? [], locale, siteId, requirements, defaultCurrency, registry, readTranslation),
    };
  });
}

function datasLocalizedTitle(fields: Readonly<Record<string, unknown>>, fallback: string) {
  for (const key of ['title', 'name', 'label'] as const) {
    const value = fields[key];
    if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 160);
  }
  return fallback;
}

function asRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Readonly<Record<string, unknown>> : undefined;
}

export function localizeResources(locale: string, requirements: readonly ManifestModule[], siteId = typeof siteData === 'function' ? '' : siteData.id, defaultCurrency?: string, registry?: ReturnType<typeof createDatasRegistry>, readTranslation: DatasTranslationReader = getDatasTranslation, menuProperties: Readonly<Record<string, readonly import('@/platform/manifest').ManifestProperty[]>> = {}) {
  const sourceModules = registry?.modules ?? moduleDataByKey;
  const sourceResources = registry?.resources ?? resources;
  const currency = defaultCurrency ?? (typeof siteData === 'function' ? undefined : siteData.defaultCurrency);
  if (!currency) throw new Error('Site defaultCurrency must resolve before resource localization');
  const localizedFields = (moduleKey: string, entryId: string) => {
    const entry = sourceModules.get(moduleKey)?.entries[entryId];
    if (!entry) return undefined;
    return mergeLocalizedValue(
      entry.fields,
      readTranslation<Readonly<{ fields: Readonly<Record<string, unknown>> }>>(...identityArgs(datasTranslationIdentity.entryFields(siteId, sourceModules.get(moduleKey)!.id, entry.id), locale))?.fields,
    ) as Readonly<Record<string, unknown>>;
  };
  const menu = Object.fromEntries(Object.entries(sourceResources.menu).map(([key, value]) => {
    const localized = readTranslation<readonly MenuItemTranslationInput[]>(...identityArgs(datasTranslationIdentity.menu(siteId, resourceId(value, 'CmsMenu')), locale));
    return [key, { ...value, items: localizeMenuItems(value.items as readonly CmsMenuItem[], localized ?? [], locale, siteId, requirements, currency, registry, readTranslation) }];
  }));

  const file = Object.fromEntries(Object.entries(sourceResources.file).map(([key, value]) => [key, {
    ...value,
    title: readTranslation<Readonly<{ title: string }>>(...identityArgs(datasTranslationIdentity.storage(siteId, resourceId(value, 'Storage')), locale))?.title ?? value.title,
  }]));

  const rawModules = Object.fromEntries([...sourceModules].map(([moduleKey, module]) => [moduleKey, Object.fromEntries(
    Object.entries(module.entries).map(([entryId, entry]) => [entryId, {
      id: entry.id,
      ...entry.parentId ? { parentId: entry.parentId } : {},
      fields: localizedFields(moduleKey, entryId) ?? entry.fields,
      page: entry.page ? { routeKey: entry.page.routeKey, path: normalizeRoutePath(module.routePrefix!, entry.page.routeKey) } : null,
    }]),
  )]));
  const localizedSource = { ...sourceResources, ...rawModules, menu, file };
  const materializedMenu = Object.fromEntries(Object.entries(menu).map(([key, value]) => {
    const visit = (items: readonly CmsMenuItem[]): CmsMenuItem[] => items.map((item) => ({
      ...item,
      fields: materializeResourceIds(item.fields, menuProperties[key] ?? [], localizedSource, currency),
      children: visit(item.children),
    }));
    return [key, { ...value, items: visit(value.items as readonly CmsMenuItem[]) }];
  }));
  const materializedSource = { ...localizedSource, menu: materializedMenu };
  const modules = Object.fromEntries(Object.entries(rawModules).map(([moduleKey, entries]) => [moduleKey, Object.fromEntries(
    Object.entries(entries).map(([entryId, entry]) => [entryId, { ...entry, fields: materializeResourceIds(entry.fields, requirements.find((module) => module.key === moduleKey)?.entryProperties ?? [], materializedSource, currency) }]),
  )]));
  return { ...sourceResources, ...modules, menu: materializedMenu, file };
}
