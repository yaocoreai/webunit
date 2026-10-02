import { translations as layoutTranslations } from '@/theme/datas/layout';
import { translations as menuTranslations } from '@/theme/datas/menus';
import { translations as siteTranslations } from '@/theme/datas/site';
import { translations as consentTranslations } from '@/theme/datas/consent';
import { translations as storageTranslations } from '@/theme/datas/storage';
import { resolveDataDefinition, type ConsentMessagesInput, type DataDefinition, type ModuleTranslationInput, type PageEntryTranslationInput, type SiteTranslationInput, type TranslationInput } from '@/platform/theme/define/datas';
import { datasModuleEntryTranslations, datasModuleTranslations, datasTemplateTranslations } from '@/platform/generated/datas-registry';
import type { DataContext } from '@/platform/theme/runtime/request-context';
import siteData from '@/theme/datas/site';
import layoutData from '@/theme/datas/layout';
import menuData from '@/theme/datas/menus';
import storageData from '@/theme/datas/storage';
import templateData from '@/theme/datas/template';
import { datasModules } from '@/platform/generated/datas-registry';
import { datasTranslationIdentity } from './translation-identity';

export type DatasTranslation = TranslationInput<unknown>;
export type DatasTranslationReader = <T>(namespace: string, key: string, locale: string) => T | undefined;
type TranslationValue = Readonly<{ locale: string; content: unknown }>;
type TranslationDefinitions = readonly DataDefinition<TranslationValue>[];
type ResolvedTranslationSources = Readonly<{
  site: readonly TranslationValue[];
  consent: readonly TranslationValue[];
  layout: readonly TranslationValue[];
  templates: readonly TranslationValue[];
  menus: readonly TranslationValue[];
  storages: readonly TranslationValue[];
  modules: Readonly<Record<string, readonly TranslationValue[]>>;
  entries: Readonly<Record<string, Readonly<Record<string, readonly TranslationValue[]>>>>;
}>;

export type DatasTranslationCatalog = Readonly<{
  siteId: string;
  themeId: string;
  templates: Readonly<Record<string, string>>;
  menus: Readonly<Record<string, string>>;
  storages: Readonly<Record<string, string>>;
  modules: Readonly<Record<string, Readonly<{ id: string; entries: Readonly<Record<string, string>> }>>>;
}>;

export type DatasTranslationSources = Readonly<{
  site: TranslationDefinitions;
  consent: TranslationDefinitions;
  layout: TranslationDefinitions;
  templates: TranslationDefinitions;
  menus: TranslationDefinitions;
  storages: TranslationDefinitions;
  modules: Readonly<Record<string, TranslationDefinitions>>;
  entries: Readonly<Record<string, Readonly<Record<string, TranslationDefinitions>>>>;
}>;

const defaultSources: DatasTranslationSources = {
  site: siteTranslations as TranslationDefinitions,
  consent: consentTranslations as TranslationDefinitions,
  layout: layoutTranslations as TranslationDefinitions,
  templates: datasTemplateTranslations as TranslationDefinitions,
  menus: menuTranslations as TranslationDefinitions,
  storages: storageTranslations as TranslationDefinitions,
  modules: datasModuleTranslations as Readonly<Record<string, TranslationDefinitions>>,
  entries: datasModuleEntryTranslations as Readonly<Record<string, Readonly<Record<string, TranslationDefinitions>>>>,
};

export function hasDynamicDatasTranslations(overrides: Partial<DatasTranslationSources> = {}) {
  const sources = { ...defaultSources, ...overrides };
  return [sources.site, sources.consent, sources.layout, sources.templates, sources.menus, sources.storages].some(hasFactory)
    || Object.values(sources.modules).some(hasFactory)
    || Object.values(sources.entries).some((entries) => Object.values(entries).some(hasFactory));
}

const hasFactory = (definitions: TranslationDefinitions) => definitions.some((definition) => typeof definition === 'function');

function records(sources: ResolvedTranslationSources, catalog: DatasTranslationCatalog): DatasTranslation[] {
  const result: DatasTranslation[] = [];
  for (const translation of sources.site as readonly SiteTranslationInput[]) {
    if (translation.content.fields) result.push({ ...datasTranslationIdentity.siteFields(catalog.siteId), value: { fields: translation.content.fields }, locale: translation.locale });
  }
  for (const translation of sources.consent as readonly ConsentMessagesInput[]) {
    result.push({ ...datasTranslationIdentity.consent(catalog.siteId), value: translation.content, locale: translation.locale });
  }
  for (const translation of sources.layout) {
    result.push({ ...datasTranslationIdentity.layout(catalog), value: translation.content, locale: translation.locale });
  }
  for (const translation of sources.templates) {
    for (const [templateKey, value] of Object.entries(translation.content as Readonly<Record<string, unknown>>)) {
      result.push({ ...datasTranslationIdentity.template(catalog, requireIdentity(catalog.templates, templateKey, 'Template')), value, locale: translation.locale });
    }
  }
  for (const [moduleKey, translations] of Object.entries(sources.modules)) {
    for (const translation of translations as readonly ModuleTranslationInput[]) {
      result.push({ ...datasTranslationIdentity.moduleFields(catalog.siteId, requireModule(catalog, moduleKey).id), value: { fields: translation.content.fields }, locale: translation.locale });
    }
  }
  for (const [moduleKey, entries] of Object.entries(sources.entries)) {
    for (const [entryId, translations] of Object.entries(entries)) {
      for (const translation of translations as readonly PageEntryTranslationInput[]) {
        const module = requireModule(catalog, moduleKey);
        const resolvedEntryId = requireIdentity(module.entries, entryId, 'Entry');
        if (translation.content.fields) result.push({ ...datasTranslationIdentity.entryFields(catalog.siteId, module.id, resolvedEntryId), value: { fields: translation.content.fields }, locale: translation.locale });
        if (translation.content.slots) result.push({ ...datasTranslationIdentity.page(catalog.siteId, module.id, resolvedEntryId), value: { slots: translation.content.slots }, locale: translation.locale });
      }
    }
  }
  for (const translation of sources.menus) {
    for (const [menuKey, menu] of Object.entries(translation.content as Readonly<Record<string, unknown>>)) {
      validateMenuTranslationValue(menu, menuKey);
      result.push({ ...datasTranslationIdentity.menu(catalog.siteId, requireIdentity(catalog.menus, menuKey, 'CmsMenu')), value: menu, locale: translation.locale });
    }
  }
  for (const translation of sources.storages) {
    for (const [fileKey, file] of Object.entries(translation.content as Readonly<Record<string, Readonly<{ title: string }>>>)) {
      result.push({ ...datasTranslationIdentity.storage(catalog.siteId, requireIdentity(catalog.storages, fileKey, 'Storage')), value: { title: file.title }, locale: translation.locale });
    }
  }
  return result;
}

function validateMenuTranslationValue(value: unknown, menuKey: string) {
  if (!Array.isArray(value)) throw new Error(`Invalid CmsMenu translation array: ${menuKey}`);
  const ids = new Set<string>();
  let count = 0;
  const visit = (items: readonly unknown[], depth: number): void => {
    if (depth > 10) throw new Error(`CmsMenu translation exceeds maximum depth: ${menuKey}`);
    for (const item of items) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`Invalid CmsMenu translation item: ${menuKey}`);
      const record = item as Record<string, unknown>;
      if (Object.keys(record).some((key) => !['id', 'link', 'fields', 'children'].includes(key)) || typeof record.id !== 'string' || !record.id.trim()) throw new Error(`Invalid CmsMenu translation item: ${menuKey}`);
      if (ids.has(record.id)) throw new Error(`Duplicate CmsMenu translation item id: ${menuKey}.${record.id}`);
      ids.add(record.id);
      count += 1;
      if (count > 5_000) throw new Error(`CmsMenu translation exceeds maximum items: ${menuKey}`);
      if (record.link !== undefined) {
        if (!record.link || typeof record.link !== 'object' || Array.isArray(record.link)) throw new Error(`Invalid CmsMenu translation link: ${menuKey}.${record.id}`);
        const link = record.link as Record<string, unknown>;
        if (Object.keys(link).some((key) => key !== 'title') || typeof link.title !== 'string' || !link.title.trim()) throw new Error(`CmsMenu translation may only translate link title: ${menuKey}.${record.id}`);
      }
      if (record.fields !== undefined && (!record.fields || typeof record.fields !== 'object' || Array.isArray(record.fields))) throw new Error(`Invalid CmsMenu translation fields: ${menuKey}.${record.id}`);
      if (!Array.isArray(record.children)) throw new Error(`Invalid CmsMenu translation children: ${menuKey}.${record.id}`);
      visit(record.children, depth + 1);
    }
  };
  visit(value, 1);
}

function createCache(values: readonly DatasTranslation[]) {
  const cache = new Map<string, DatasTranslation>();
  for (const record of values) {
    const locale = normalizeCmsLocale(record.locale);
    const normalizedRecord = { ...record, locale };
    const cacheKey = `${record.namespace}\0${record.key}\0${locale}`;
    if (cache.has(cacheKey)) throw new Error(`Duplicate Datas translation: ${record.namespace} / ${record.key} / ${record.locale}`);
    cache.set(cacheKey, normalizedRecord);
  }
  return cache;
}

const normalizeCmsLocale = (value: string) => {
  try { return new Intl.Locale(value.trim()).toString().toLowerCase(); } catch { throw new TypeError(`Invalid CMS locale: ${value}`); }
};

const staticSources = (sources: DatasTranslationSources): DatasTranslationSources => ({
  ...sources,
  site: sources.site.filter((value) => typeof value !== 'function'),
  consent: sources.consent.filter((value) => typeof value !== 'function'),
  layout: sources.layout.filter((value) => typeof value !== 'function'),
  templates: sources.templates.filter((value) => typeof value !== 'function'),
  menus: sources.menus.filter((value) => typeof value !== 'function'),
  storages: sources.storages.filter((value) => typeof value !== 'function'),
  modules: Object.fromEntries(Object.entries(sources.modules).map(([key, values]) => [key, values.filter((value) => typeof value !== 'function')])),
  entries: Object.fromEntries(Object.entries(sources.entries).map(([moduleKey, entries]) => [moduleKey, Object.fromEntries(Object.entries(entries).map(([entryId, values]) => [entryId, values.filter((value) => typeof value !== 'function')]))])),
});

const staticValue = <T>(value: T | ((...args: never[]) => T), owner: string): T => {
  if (typeof value === 'function') throw new Error(`Dynamic ${owner} cannot initialize the static translation cache`);
  return value;
};
const defaultCatalog: DatasTranslationCatalog = {
  siteId: staticValue(siteData, 'Site').id,
  themeId: staticValue(layoutData, 'Layout').id,
  templates: Object.fromEntries(Object.entries(templateData).map(([key, value]) => [key, staticValue(value, `Template ${key}`).id])),
  menus: Object.fromEntries(Object.entries(staticValue(menuData, 'CmsMenu')).map(([key, menu]) => [key, menu.id])),
  storages: Object.fromEntries(Object.entries(staticValue(storageData, 'Storage').entries).map(([key, value]) => [key, value.id])),
  modules: Object.fromEntries(Object.entries(datasModules).map(([key, value]) => {
    const module = staticValue(value, `Module ${key}`);
    return [key, { id: module.id, entries: Object.fromEntries(Object.entries(module.entries).map(([entryId, entry]) => [entryId, staticValue(entry, `Entry ${key}.${entryId}`).id])) }];
  })),
};
export const datasTranslationCache = createCache(records(staticSources(defaultSources) as ResolvedTranslationSources, defaultCatalog));
export const createDatasTranslationReader = (cache: ReadonlyMap<string, DatasTranslation>): DatasTranslationReader =>
  <T>(namespace: string, key: string, locale: string) => cache.get(`${namespace}\0${key}\0${locale}`)?.value as T | undefined;
export const getDatasTranslation: DatasTranslationReader = createDatasTranslationReader(datasTranslationCache);

export async function resolveDatasTranslations(context: DataContext, catalog: DatasTranslationCatalog, overrides: Partial<DatasTranslationSources> = {}) {
  const sources = { ...defaultSources, ...overrides };
  let index = 0;
  const resolveList = (scope: string, definitions: TranslationDefinitions) => Promise.all(definitions.map((definition) =>
    resolveDataDefinition(definition, { ...context, owner: 'translation', definitionKey: `${scope}.${index++}` }) as Promise<TranslationValue>,
  ));
  const resolved: ResolvedTranslationSources = {
    site: await resolveList('site', sources.site),
    consent: await resolveList('consent', sources.consent),
    layout: await resolveList('layout', sources.layout),
    templates: await resolveList('template', sources.templates),
    menus: await resolveList('menu', sources.menus),
    storages: await resolveList('storage', sources.storages),
    modules: Object.fromEntries(await Promise.all(Object.entries(sources.modules).map(async ([key, values]) => [key, await resolveList(`module.${key}`, values)]))),
    entries: Object.fromEntries(await Promise.all(Object.entries(sources.entries).map(async ([moduleKey, entries]) => [moduleKey, Object.fromEntries(await Promise.all(Object.entries(entries).map(async ([entryId, values]) => [entryId, await resolveList(`entry.${moduleKey}.${entryId}`, values)])))]))),
  };
  return createCache(records(resolved, catalog));
}

function requireIdentity(values: Readonly<Record<string, string>>, key: string, owner: string) {
  const id = values[key];
  if (!id) throw new Error(`Missing Datas ${owner} id: ${key}`);
  return id;
}

function requireModule(catalog: DatasTranslationCatalog, key: string) {
  const module = catalog.modules[key];
  if (!module) throw new Error(`Missing Datas Module id: ${key}`);
  return module;
}
