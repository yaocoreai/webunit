import consentDefinition from '@/theme/datas/consent';
import documentInjectionDefinition from '@/theme/datas/document-injections';
import layoutDefinition from '@/theme/datas/layout';
import menuDefinition from '@/theme/datas/menus';
import siteDefinition from '@/theme/datas/site';
import storageDefinition, { translations as storageTranslations } from '@/theme/datas/storage';
import templateDefinition from '@/theme/datas/template';
import { datasModuleEntryTranslations, datasModules } from '@/platform/generated/datas-registry';
import { moduleEntriesKind, resolveDataDefinition, type AssetQueryEntries, type ContentTranslationInput, type DataDefinition, type DocumentInjectionDataInput, type ConsentDataInput, type LayoutDataInput, type MenuDataInput, type ModuleDataInput, type ModuleEntryData, type ModuleEntryQueryModel, type SiteDataInput, type StorageDataInput, type TemplateDataInput } from '@/platform/theme/define/datas';
import type { DataContext, ContentOwner, RequestContext } from '@/platform/theme/runtime/request-context';
import { createDatasRegistry } from './registry';
import type { DatasModule, ResolvedModuleDataInput } from './model';
import seoDefinition from '@/theme/datas/seo';
import manifestDefinition from '@/theme/datas/manifests';
import { hasDynamicDatasTranslations, resolveDatasTranslations, type DatasTranslation, type DatasTranslationCatalog, type DatasTranslationSources } from './translation-cache';
import type { SiteManifest } from '@/platform/manifest';
import { validateDatasComposition, validateDatasOwnerIds, validateDatasRuntimeExtras, validateLocalizedDatasFields, validatePartialDatasFields } from '@/platform/theme/validation/datas';
import { createDatasTranslationReader } from './translation-cache';
import { mergeLocalizedValue } from './localize';
import { localizeContentData } from './localize';
import { layoutSetting } from '@/platform/generated/theme/definition';
import { sectionSettings, templateSettings } from '@/platform/generated/theme/setting-runtime';
import { validatePresentationContent } from '@/platform/theme/validation/presentation';
import { datasTranslationIdentity, type DatasTranslationScope } from './translation-identity';

export type DatasGraph = Readonly<{
  site: SiteDataInput;
  consent: ConsentDataInput;
  documentInjections: readonly DocumentInjectionDataInput[];
  layout: LayoutDataInput;
  templates: Readonly<Record<string, Readonly<{ id: string; templateKey: string; contentJson: Omit<TemplateDataInput, 'id'> }>>>;
  seo: NonNullable<Parameters<typeof import('./seo/resolve').resolveDatasSeo>[1]>;
  manifests: import('@/platform/theme/define/datas').ManifestDataInput;
  translations: ReadonlyMap<string, DatasTranslation>;
  registry: ReturnType<typeof createDatasRegistry>;
  queryEntries: ReadonlyMap<string, ModuleEntryQueryModel>;
  assetQuery?: AssetQueryEntries;
  menuProperties: Readonly<Record<string, NonNullable<NonNullable<SiteManifest["menu"]>[number]["properties"]>>>;
}>;

type GraphContext = RequestContext & Pick<DataContext, 'dependency'>;
const contextFor = (context: GraphContext, owner: ContentOwner, definitionKey: string): DataContext => ({ ...context, owner, definitionKey });

export type DatasGraphDefinitions = Readonly<{
  site?: DataDefinition<SiteDataInput>;
  consent?: DataDefinition<ConsentDataInput>;
  documentInjections?: DataDefinition<readonly DocumentInjectionDataInput[]>;
  layout?: DataDefinition<LayoutDataInput>;
  menus?: DataDefinition<MenuDataInput>;
  storages?: DataDefinition<StorageDataInput>;
  templates?: Readonly<Record<string, DataDefinition<Readonly<{ templateKey: string; contentJson: TemplateDataInput }>>>>;
  seo?: DataDefinition<DatasGraph['seo']>;
  manifests?: DataDefinition<DatasGraph['manifests']>;
  modules?: Readonly<Record<string, DataDefinition<ModuleDataInput>>>;
  translations?: Partial<DatasTranslationSources>;
}>;

export function isStaticDatasGraph(definitions: DatasGraphDefinitions = {}) {
  const values = [
    definitions.site ?? siteDefinition,
    definitions.consent ?? consentDefinition,
    definitions.documentInjections ?? documentInjectionDefinition,
    definitions.layout ?? layoutDefinition,
    definitions.menus ?? menuDefinition,
    definitions.storages ?? storageDefinition,
    definitions.seo ?? seoDefinition,
    definitions.manifests ?? manifestDefinition,
    ...Object.values(definitions.templates ?? templateDefinition),
  ];
  if (values.some((definition) => typeof definition === 'function') || hasDynamicDatasTranslations(definitions.translations)) return false;
  for (const definition of Object.values(definitions.modules ?? datasModules)) {
    if (typeof definition === 'function') return false;
    const entries = definition.entries;
    if (entries[moduleEntriesKind] !== 'query' && Object.values(entries).some((entry) => typeof entry === 'function')) return false;
  }
  return true;
}

export async function resolveDatasGraph(context: GraphContext, definitions: DatasGraphDefinitions = {}, theme?: SiteManifest): Promise<DatasGraph> {
  const site = await resolveDataDefinition(definitions.site ?? siteDefinition, contextFor(context, 'site', 'default'));
  const [consent, documentInjections, rawLayout, menus, storages] = await Promise.all([
    resolveDataDefinition(definitions.consent ?? consentDefinition, contextFor(context, 'consent', 'default')),
    resolveDataDefinition(definitions.documentInjections ?? documentInjectionDefinition, contextFor(context, 'document-injections', 'default')),
    resolveDataDefinition(definitions.layout ?? layoutDefinition, contextFor(context, 'layout', 'default')),
    resolveDataDefinition(definitions.menus ?? menuDefinition, contextFor(context, 'menu', 'default')),
    resolveDataDefinition(definitions.storages ?? storageDefinition, contextFor(context, 'storage', 'default')),
  ]);
  const rawTemplates = Object.fromEntries(await Promise.all(Object.entries(definitions.templates ?? templateDefinition).map(async ([instanceKey, definition]) => [
    instanceKey, await resolveDataDefinition(definition, contextFor(context, 'template', instanceKey)),
  ]))) as DatasGraph['templates'];
  const layout = theme
    ? materializeDatasMenuReferences(rawLayout, menus as MenuDataInput)
    : rawLayout;
  const templates = theme
    ? (Object.fromEntries(
        Object.entries(rawTemplates).map(([instanceKey, template]) => [
          instanceKey,
          {
            ...template,
            contentJson: materializeDatasMenuReferences(
              template.contentJson,
              menus as MenuDataInput,
            ),
          },
        ]),
      ) as DatasGraph["templates"])
    : rawTemplates;
  const [seo, manifests] = await Promise.all([
    resolveDataDefinition(definitions.seo ?? seoDefinition, contextFor(context, 'seo', 'default')) as Promise<DatasGraph['seo']>,
    resolveDataDefinition(definitions.manifests ?? manifestDefinition, contextFor(context, 'site', 'manifest')) as Promise<DatasGraph['manifests']>,
  ]);
  validateDatasOwnerIds({ seo, manifests: manifests.templates, documentInjections });
  const resolvedModules = await Promise.all(Object.entries(definitions.modules ?? datasModules).map(async ([moduleKey, definition]) => {
    const module = await resolveDataDefinition(definition as DataDefinition<ModuleDataInput>, contextFor(context, 'module', moduleKey));
    if (module.entries[moduleEntriesKind] === 'query') {
      const entryTranslations = (definitions.translations?.entries?.[moduleKey]
        ?? datasModuleEntryTranslations[moduleKey as keyof typeof datasModuleEntryTranslations]) as Readonly<Record<string, readonly unknown[]>> | undefined;
      if (entryTranslations && Object.values(entryTranslations).some((values) => values.length > 0)) throw new Error(`Query Entries cannot use static Entry translations: ${moduleKey}`);
      return [moduleKey, { module: { id: module.id, fields: module.fields, entries: {} }, query: module.entries }] as const;
    }
    const entries = Object.fromEntries(await Promise.all(Object.entries(module.entries).map(async ([entryId, entry]) => [
      entryId, await resolveDataDefinition(entry as DataDefinition<ModuleEntryData>, contextFor(context, 'entry', `${moduleKey}.${entryId}`)),
    ])));
    return [moduleKey, { module: { id: module.id, fields: module.fields, entries } }] as const;
  }));
  const modules = Object.fromEntries(resolvedModules.map(([key, value]) => [key, value.module]));
  const translationCatalog: DatasTranslationCatalog = {
    siteId: site.id,
    themeId: layout.id,
    templates: Object.fromEntries(Object.entries(templates).map(([key, value]) => [key, value.id])),
    menus: Object.fromEntries(Object.entries(menus as MenuDataInput).map(([key, menu]) => [key, menu.id])),
    storages: typeof storages.entries === 'function' ? {} : Object.fromEntries(Object.entries(storages.entries).map(([key, value]) => [key, value.id])),
    modules: Object.fromEntries(Object.entries(modules as Readonly<Record<string, ResolvedModuleDataInput>>).map(([key, value]) => [key, { id: value.id, entries: Object.fromEntries(Object.entries(value.entries).map(([entryId, entry]) => [entryId, entry.id])) }])),
  };
  const translations = await resolveDatasTranslations(contextFor(context, 'translation', 'default'), translationCatalog, definitions.translations);
  const queryEntries = new Map(resolvedModules.flatMap(([key, value]) => 'query' in value ? [[key, value.query] as const] : []));
  const assetQuery = typeof storages.entries === 'function' ? storages.entries : undefined;
  if (assetQuery && (definitions.translations?.storages ?? storageTranslations).length) throw new Error('Query Assets cannot use static Storage translations');
  const registry = createDatasRegistry({
    site,
    menus: menus as MenuDataInput,
    storages: typeof storages.entries === 'function' ? {} : storages.entries,
    templates,
    modules: modules as Readonly<Record<string, ResolvedModuleDataInput>>,
    requirements: theme?.modules ?? [],
  });
  if (theme) {
    validateDatasComposition({ theme, site, menus: menus as MenuDataInput, modules: registry.modules, templates, queryModuleKeys: new Set(queryEntries.keys()) });
    validateDatasRuntimeExtras({ consent, documentInjections, storages: typeof storages.entries === 'function' ? {} : storages.entries, modules: registry.modules });
    const readTranslation = createDatasTranslationReader(translations);
    const validationLocales = isStaticDatasGraph(definitions) ? site.supportedLocales : [context.locale];
    for (const locale of validationLocales) {
      const siteIdentity = datasTranslationIdentity.siteFields(site.id);
      const siteTranslation = readTranslation<{ fields?: unknown }>(siteIdentity.namespace, siteIdentity.key, locale)?.fields;
      if (siteTranslation !== undefined) validatePartialDatasFields(`site.${locale}`, siteTranslation, theme.site.properties);
      const localizedMenus = localizeMenusForValidation(menus as MenuDataInput, site.id, locale, readTranslation, theme);
      const localizedModules = new Map([...registry.modules].map(([moduleKey, module]) => [moduleKey, {
        ...module,
        fields: localizeValidatedFields(`module.${moduleKey}.${locale}`, module.fields, readTranslation<{ fields?: unknown }>(...identityArgs(datasTranslationIdentity.moduleFields(site.id, module.id), locale))?.fields, theme.modules?.find((candidate) => candidate.key === moduleKey)?.moduleProperties),
        entries: Object.fromEntries(Object.entries(module.entries).map(([entryId, entry]) => [entryId, {
          ...entry,
          fields: localizeValidatedFields(`module.${moduleKey}.${entryId}.${locale}`, entry.fields, readTranslation<{ fields?: unknown }>(...identityArgs(datasTranslationIdentity.entryFields(site.id, module.id, entry.id), locale))?.fields, theme.modules?.find((candidate) => candidate.key === moduleKey)?.entryProperties),
        }])),
      }]));
      validateLocalizedDatasFields({
        theme,
        siteFields: mergeLocalizedValue(site.fields, siteTranslation) as Readonly<Record<string, unknown>>,
        menus: localizedMenus,
        modules: localizedModules,
      });
    }
    await validatePresentationGraph({ site, translationScope: { siteId: site.id, themeId: layout.id }, layout, templates, modules: registry.modules, readTranslation, locales: validationLocales });
  }
  return { site, consent, documentInjections, layout, templates, seo, manifests, translations, registry, queryEntries, menuProperties: Object.fromEntries(Object.entries(menus as MenuDataInput).map(([key, menu]) => [menu.id, theme?.menu?.find((definition) => definition.key === key)?.properties ?? []])), ...(assetQuery ? { assetQuery } : {}) };
}

const localizeValidatedFields = (owner: string, fields: Readonly<Record<string, unknown>>, translation: unknown, definitions: Parameters<typeof validatePartialDatasFields>[2]) => {
  if (translation !== undefined) validatePartialDatasFields(owner, translation, definitions);
  return mergeLocalizedValue(fields, translation) as Readonly<Record<string, unknown>>;
};

const identityArgs = (identity: Readonly<{ namespace: string; key: string }>, locale: string) => [identity.namespace, identity.key, locale] as const;

const localizeMenusForValidation = (menus: MenuDataInput, siteId: string, locale: string, readTranslation: ReturnType<typeof createDatasTranslationReader>, theme: SiteManifest): MenuDataInput => Object.fromEntries(
  Object.entries(menus).map(([menuKey, menu]) => {
    const translations = readTranslation<readonly Readonly<{ id: string; fields?: Readonly<Record<string, unknown>>; children?: readonly unknown[] }>[] >(...identityArgs(datasTranslationIdentity.menu(siteId, menu.id), locale)) ?? [];
    const localizeItems = (items: typeof menu.items, values: typeof translations): typeof menu.items => {
      for (const translated of values) if (!items.some((item) => item.id === translated.id)) throw new Error(`CmsMenu translation item must match the source level: ${menuKey}.${translated.id}`);
      return items.map((item) => {
      const translated = values.find((candidate) => candidate.id === item.id);
      if (translated?.fields !== undefined) validatePartialDatasFields(`menu.${menuKey}.${item.id}`, translated.fields, theme.menu?.find((menu) => menu.key === menuKey)?.properties);
      return {
        ...item,
        fields: mergeLocalizedValue(item.fields, translated?.fields) as typeof item.fields,
        children: localizeItems(item.children, (translated?.children ?? []) as typeof translations),
      };
      });
    };
    return [menuKey, { ...menu, items: localizeItems(menu.items, translations) }];
  }),
) as MenuDataInput;

function materializeDatasMenuReferences<T>(content: T, menus: MenuDataInput): T {
  const uuidByKey = new Map(
    Object.entries(menus).map(([key, menu]) => [key, menu.id]),
  );
  const knownIds = new Set(Object.values(menus).map((menu) => menu.id));

  const rewrite = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(rewrite);
    if (!value || typeof value !== "object") return value;
    const record = value as Record<string, unknown>;
    if (
      record.reference === "menu" &&
      typeof record.id === "string" &&
      Object.keys(record).length === 2
    ) {
      const uuid =
        uuidByKey.get(record.id) ??
        (knownIds.has(record.id) ? record.id : undefined);
      if (!uuid) throw new Error(`Unknown Datas menu reference: ${record.id}`);
      return { reference: "menu" as const, id: uuid };
    }
    return Object.fromEntries(
      Object.entries(record).map(([key, item]) => [key, rewrite(item)]),
    );
  };

  return rewrite(structuredClone(content)) as T;
}

async function validatePresentationGraph(input: Readonly<{
  site: SiteDataInput;
  translationScope: DatasTranslationScope;
  layout: LayoutDataInput;
  templates: DatasGraph['templates'];
  modules: ReadonlyMap<string, DatasModule>;
  readTranslation: ReturnType<typeof createDatasTranslationReader>;
  locales: readonly string[];
}>) {
  const layoutDefinition = (await layoutSetting()).default;
  const sectionCache = new Map<string, Awaited<ReturnType<(typeof sectionSettings)[keyof typeof sectionSettings]>>['default']>();
  const loadSection = async (key: string) => {
    const cached = sectionCache.get(key);
    if (cached) return cached;
    const loader = sectionSettings[key as keyof typeof sectionSettings];
    if (!loader) return undefined;
    const definition = (await loader()).default;
    sectionCache.set(key, definition);
    return definition;
  };

  for (const locale of input.locales) {
    const layoutTranslation = input.readTranslation<ContentTranslationInput>(...identityArgs(datasTranslationIdentity.layout(input.translationScope), locale));
    await validatePresentationContent({ owner: `layout.${locale}`, definition: layoutDefinition, scope: 'layout', content: localizeContentData(input.layout, layoutTranslation), loadSection });
    for (const [instanceKey, savedTemplate] of Object.entries(input.templates)) {
      const loader = templateSettings[savedTemplate.templateKey as keyof typeof templateSettings];
      if (!loader) throw new Error(`Unknown Datas Template: ${instanceKey}`);
      const definition = (await loader()).default;
      const translation = input.readTranslation<ContentTranslationInput>(...identityArgs(datasTranslationIdentity.template(input.translationScope, savedTemplate.id), locale));
      await validatePresentationContent({ owner: `template.${instanceKey}.${locale}`, definition, scope: 'template', content: localizeContentData(savedTemplate.contentJson, translation), loadSection });
    }
    for (const [moduleKey, module] of input.modules) {
      for (const [entryId, entry] of Object.entries(module.entries)) {
        if (!entry.page) continue;
        const savedTemplate = input.templates[entry.page.instanceKey];
        if (!savedTemplate) continue;
        const loader = templateSettings[savedTemplate.templateKey as keyof typeof templateSettings];
        if (!loader) continue;
        const definition = (await loader()).default;
        const translation = input.readTranslation<ContentTranslationInput>(...identityArgs(datasTranslationIdentity.page(input.site.id, module.id, entry.id), locale));
        await validatePresentationContent({ owner: `page.${moduleKey}.${entryId}.${locale}`, definition, scope: 'page', content: localizeContentData(entry.page.contentJson, translation), loadSection });
      }
    }
  }
}

export async function validateDatasPagePresentation(owner: string, savedTemplate: Readonly<{ templateKey: string }>, content: NonNullable<ModuleEntryData['page']>['contentJson']) {
  const loader = templateSettings[savedTemplate.templateKey as keyof typeof templateSettings];
  if (!loader) throw new Error(`Unknown Datas Template: ${savedTemplate.templateKey}`);
  const definition = (await loader()).default;
  const sectionCache = new Map<string, Awaited<ReturnType<(typeof sectionSettings)[keyof typeof sectionSettings]>>['default']>();
  const loadSection = async (key: string) => {
    const cached = sectionCache.get(key);
    if (cached) return cached;
    const sectionLoader = sectionSettings[key as keyof typeof sectionSettings];
    if (!sectionLoader) return undefined;
    const section = (await sectionLoader()).default;
    sectionCache.set(key, section);
    return section;
  };
  await validatePresentationContent({ owner, definition, scope: 'page', content, loadSection });
}
