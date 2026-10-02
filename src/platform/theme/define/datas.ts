import { collectSeoTemplateExpressions, type SeoTemplateContent } from "@/platform/manifest";
import type { DataContext } from "@/platform/theme/runtime/request-context";
import type {
  ModelAggregateQuery,
  ModelAggregateResult,
  ModelCountQuery,
  ModelPage,
  ModelQuery,
} from "@/platform/theme/content/model";
import {
  formatAssetReference,
  type CmsAssetType,
} from "@/platform/schema";

type Fields = Readonly<Record<string, unknown>>;
type TranslationFields = Readonly<Record<string, unknown>>;
export const moduleEntriesKind = Symbol("platform.module-entries");

export type TranslationInput<TValue = unknown> = Readonly<{
  locale: string;
  namespace: string;
  key: string;
  value: TValue;
}>;
export type DataFactory<T> = (context: DataContext) => T | Promise<T>;
export type DataDefinition<T> = T | DataFactory<T>;
type TranslationDefinition<TContent> = Readonly<{
  locale: string;
  content: TContent;
}>;
type DefinitionValue<T> =
  T extends DataFactory<infer TValue> ? Awaited<TValue> : T;
type MappedDefinition<TDefinition, TValue> =
  TDefinition extends DataFactory<unknown> ? DataFactory<TValue> : TValue;

const mapDefinition = <TDefinition extends DataDefinition<unknown>, TOutput>(
  input: TDefinition,
  normalize: (value: DefinitionValue<TDefinition>) => TOutput,
): MappedDefinition<TDefinition, TOutput> =>
  (typeof input === "function"
    ? async (context: DataContext) =>
        normalize(
          await (input as DataFactory<DefinitionValue<TDefinition>>)(context),
        )
    : normalize(input as DefinitionValue<TDefinition>)) as MappedDefinition<
    TDefinition,
    TOutput
  >;
const normalizeCmsLocale = (value: string): string => {
  try {
    return new Intl.Locale(value.trim()).toString().toLowerCase();
  } catch {
    throw new TypeError(`Invalid CMS locale: ${value}`);
  }
};
const normalizeCmsLocaleScope = (value: string | undefined): string =>
  value?.trim() === "*" || value === undefined
    ? "*"
    : normalizeCmsLocale(value);
const translation = <TDefinition extends DataDefinition<unknown>>(
  locale: string,
  input: TDefinition,
): MappedDefinition<
  TDefinition,
  TranslationDefinition<DefinitionValue<TDefinition>>
> => {
  const normalizedLocale = normalizeCmsLocale(locale);
  return mapDefinition(input, (content) => ({
    locale: normalizedLocale,
    content,
  }));
};

export type SectionTranslationInput = Readonly<{
  id: string;
  settings?: TranslationFields;
  messages?: Readonly<Record<string, string>>;
}>;
export type ContentTranslationInput = Readonly<{
  settings?: TranslationFields;
  messages?: Readonly<Record<string, string>>;
  slots?: Readonly<Record<string, readonly SectionTranslationInput[]>>;
}>;

export type SectionDataInput = Readonly<{
  id: string;
  key: string;
  settings: Fields;
  settingBindings?: Readonly<Record<string, string>>;
  messages: Readonly<Record<string, string>>;
}>;

type ContentDataInput = Readonly<{
  settings: Fields;
  settingBindings?: Readonly<Record<string, string>>;
  messages?: Readonly<Record<string, string>>;
  slots?: Readonly<Record<string, readonly SectionDataInput[]>>;
}>;

export type LayoutDataInput = ContentDataInput & Readonly<{ id: string }>;
export type LayoutTranslationInput =
  TranslationDefinition<ContentTranslationInput>;

export type TemplateDataInput = Readonly<{
  id: string;
  settings?: Fields;
  settingBindings?: Readonly<Record<string, string>>;
  messages?: Readonly<Record<string, string>>;
  slots?: Readonly<Record<string, readonly SectionDataInput[]>>;
}>;
export type TemplateTranslationInput = TranslationDefinition<
  Readonly<Record<string, ContentTranslationInput>>
>;
export type TemplateDataTranslationInput =
  TranslationDefinition<ContentTranslationInput>;

type DefinedTemplateDatas<
  T extends Readonly<Record<string, DataDefinition<TemplateDataInput>>>,
> = {
  readonly [K in keyof T]: MappedDefinition<
    T[K],
    Readonly<{
      id: string;
      templateKey: K extends `${infer TemplateKey}.${string}`
        ? TemplateKey
        : never;
      contentJson: Omit<DefinitionValue<T[K]>, "id">;
    }>
  >;
};

export type SiteDataInput = Readonly<{
  id: string;
  defaultLocale: string;
  supportedLocales: readonly string[];
  defaultCurrency: string;
  fields: Fields;
  domains: readonly Readonly<{
    host: string;
    defaultLocale: string;
    redirectTo?: string;
    redirectStatusCode?: 301 | 302;
  }>[];
  redirects: readonly Readonly<{
    path: string;
    location: string;
    status: 301 | 302;
  }>[];
  files: readonly Readonly<{
    path: string;
    type: "text" | "file" | "redirect";
    content: string;
  }>[];
}>;

export type SiteTranslationInput = TranslationDefinition<
  Readonly<{
    fields?: TranslationFields;
  }>
>;

export type ConsentPurpose =
  "analytics" | "marketing" | "preferences" | "saleOfData";
export type ConsentMessages = Readonly<{
  title: string;
  description: string;
  acceptAll: string;
  rejectOptional: string;
  managePreferences: string;
  savePreferences: string;
  necessary: string;
  analytics: string;
  marketing: string;
  preferences: string;
  saleOfData: string;
}>;
export type ConsentPolicyReference = Readonly<{
  reference: `module.${string}`;
  id: string;
}>;
export type ConsentDataInput = Readonly<{
  enabled: boolean;
  display: Readonly<
    | { mode: "always" }
    | { mode: "never" }
    | {
        mode: "regions";
        countryCodes: readonly string[];
        regionCodes?: readonly string[];
        unknownRegion: "show" | "hide";
      }
  >;
  privacyPolicy: ConsentPolicyReference;
  cookiePolicy?: ConsentPolicyReference;
  version: number;
  maxAgeDays: number;
  messages: ConsentMessages;
}>;
export type ConsentMessagesInput = TranslationDefinition<ConsentMessages>;

export type DocumentInjectionPlacement =
  "head-start" | "head-end" | "body-start" | "body-end";
export type DocumentInjectionSnippetInput = Readonly<{
  placement: DocumentInjectionPlacement;
  code: string;
}>;
export type DocumentInjectionDataInput = Readonly<{
  id: string;
  remark?: string;
  snippets: readonly DocumentInjectionSnippetInput[];
  requiredConsent: readonly ConsentPurpose[];
  status: "active" | "disabled";
  sortOrder: number;
}>;

export type CmsLinkInput =
  | Readonly<{
      type: "path";
      title: string;
      target: "_self" | "_blank";
      href: string;
    }>
  | Readonly<{
      type: "module";
      reference: `module.${string}`;
      id: string;
      target: "_self" | "_blank";
    }>;

export type MenuItemDataInput = Readonly<{
  id: string;
  link: CmsLinkInput;
  fields: Fields;
  children: readonly MenuItemDataInput[];
}>;

export type MenuDataInput = Readonly<
  Record<
    string,
    Readonly<{
      id: string;
      remark?: string;
      items: readonly MenuItemDataInput[];
    }>
  >
>;

export type MenuItemTranslationInput = Readonly<{
  id: string;
  link?: Readonly<{ title?: string }>;
  fields?: TranslationFields;
  children: readonly MenuItemTranslationInput[];
}>;

export type MenuTranslationInput = TranslationDefinition<
  Readonly<Record<string, readonly MenuItemTranslationInput[]>>
>;

export type ModulePageData = Readonly<{
  routeKey?: string;
  instanceKey?: string;
  contentJson: Readonly<{
    slots: Readonly<Record<string, readonly SectionDataInput[]>>;
  }>;
  includeInSitemap?: boolean;
}>;

export type ModuleEntryData = Readonly<{
  parentId?: string;
  fields: Fields;
  page?: ModulePageData;
}>;

export type DefinedModuleEntryData = ModuleEntryData & Readonly<{ id: string }>;

export type QueriedEntryData<TEntry extends ModuleEntryData = ModuleEntryData> =
  Readonly<{
    id: string;
    value: TEntry;
  }>;

export type SitemapDescriptor = Readonly<{
  key: string;
  lastModified?: string;
}>;
export type SitemapEntryData = Readonly<{
  id: string;
  routeKey: string;
  locales: readonly string[] | "*";
  lastModified?: string;
}>;

export type ModuleEntryQueryModel<
  TEntry extends ModuleEntryData = ModuleEntryData,
> = Readonly<{
  [moduleEntriesKind]: "query";
  findOne(
    input: Readonly<{ id: string }>,
  ): Promise<QueriedEntryData<TEntry> | null>;
  findRoute?(
    input: Readonly<{ routeKey: string }>,
  ): Promise<QueriedEntryData<TEntry> | null>;
  findFirst?(
    input?: Omit<ModelQuery, "cursor" | "limit" | "includeTotal">,
  ): Promise<QueriedEntryData<TEntry> | null>;
  findMany(input?: ModelQuery): Promise<ModelPage<QueriedEntryData<TEntry>>>;
  count(input?: ModelCountQuery): Promise<number>;
  aggregate(input: ModelAggregateQuery): Promise<ModelAggregateResult>;
  listSitemaps?(): Promise<readonly SitemapDescriptor[]>;
  findSitemap?(
    input: Readonly<{ key: string }>,
  ): Promise<Readonly<{ items: readonly SitemapEntryData[] }> | null>;
}>;

export type DefinedModuleEntries<
  TEntry extends ModuleEntryData = ModuleEntryData,
> = Readonly<Record<string, DataDefinition<TEntry>>> &
  Readonly<{ [moduleEntriesKind]?: "record" }>;
export type ModuleEntries<TEntry extends ModuleEntryData = ModuleEntryData> =
  DefinedModuleEntries<TEntry> | ModuleEntryQueryModel<TEntry>;

export type ModuleDataInput = Readonly<{
  id: string;
  fields: Fields;
  entries: ModuleEntries;
}>;

export type PageEntryDataInput = Readonly<{
  parentId?: string;
  fields: Fields;
  routeKey?: string;
  instanceKey?: string;
  slots?: Readonly<Record<string, readonly SectionDataInput[]>>;
  includeInSitemap?: boolean;
}>;

export type PageEntryTranslationValue = Readonly<{
  fields?: TranslationFields;
  slots?: ContentTranslationInput["slots"];
}>;
export type PageEntryTranslationInput =
  TranslationDefinition<PageEntryTranslationValue>;

export type ModuleEntryDataInput = Readonly<{
  id: string;
  parentId?: string;
  fields: Fields;
  routeKey?: string;
  instanceKey?: string;
  slots?: Readonly<Record<string, readonly SectionDataInput[]>>;
  includeInSitemap?: boolean;
}>;

export type ModuleTranslationInput = TranslationDefinition<
  Readonly<{ fields: TranslationFields }>
>;

export type SeoDataInput = Readonly<{
  templates: readonly Readonly<{
    id: string;
    locale?: string;
    owner: Readonly<
      | { type: "site" }
      | { type: "module"; key: string }
      | { type: "page"; id: string }
    >;
    content: SeoTemplateContent;
  }>[];
}>;

export type ManifestDataInput = Readonly<{
  templates: readonly Readonly<{
    id: string;
    domain?: string;
    locale?: string;
    manifestJson: Readonly<Record<string, unknown>>;
  }>[];
}>;

export type AssetDataInput = Readonly<{
  id: string;
  type: "file" | "image" | "audio" | "video";
  title: string;
  alt?: string;
  delivery: Readonly<
    | { type: "file"; url: string; contentType?: string }
    | { type: "embed"; provider: string; url: string }
  >;
  width?: number;
  height?: number;
  duration?: number;
  publishedAt?: string;
  poster?: Readonly<{ url: string }>;
}>;
export type DefinedAssetEntries = Readonly<Record<string, AssetDataInput>>;
export type AssetQueryEntries = (
  keys: readonly string[],
) => Promise<readonly Readonly<{ key: string; value: AssetDataInput }>[]>;
export type StorageDataInput = Readonly<{
  entries: DefinedAssetEntries | AssetQueryEntries;
}>;
export type StorageTranslationInput = TranslationDefinition<
  Readonly<Record<string, Readonly<{ title: string }>>>
>;

export const defineSiteData = <const T extends DataDefinition<SiteDataInput>>(
  input: T,
) =>
  mapDefinition(input, (value) => ({
    ...value,
    defaultLocale: normalizeCmsLocale(value.defaultLocale),
    supportedLocales: value.supportedLocales.map(normalizeCmsLocale),
    domains: value.domains.map((domain) => ({
      ...domain,
      defaultLocale: normalizeCmsLocale(domain.defaultLocale),
    })),
  }));
export const defineManifestData = <
  const T extends DataDefinition<ManifestDataInput>,
>(
  input: T,
) =>
  mapDefinition(input, (value) => ({
    templates: value.templates.map((template) => ({
      ...template,
      locale: normalizeCmsLocaleScope(template.locale),
    })),
  }));
export const defineSiteDataTranslation = <
  const T extends DataDefinition<SiteTranslationInput["content"]>,
>(
  locale: string,
  content: T,
) => translation(locale, content);
export const defineConsentData = <
  const T extends DataDefinition<ConsentDataInput>,
>(
  input: T,
): T => input;
export const defineConsentDataTranslation = <
  const T extends DataDefinition<ConsentMessages>,
>(
  locale: string,
  content: T,
) => translation(locale, content);
export const defineDocumentInjectionsData = <
  const T extends DataDefinition<readonly DocumentInjectionDataInput[]>,
>(
  input: T,
): T => input;
export const defineLayoutData = <
  const T extends DataDefinition<LayoutDataInput>,
>(
  input: T,
) =>
  mapDefinition(input, (value) => ({
    id: value.id,
    settings: value.settings,
    settingBindings: value.settingBindings ?? {},
    messages: value.messages ?? {},
    slots: value.slots ?? {},
  }));
export const defineLayoutDataTranslation = <
  const T extends DataDefinition<LayoutTranslationInput["content"]>,
>(
  locale: string,
  content: T,
) => translation(locale, content);
export const defineModuleReferenceData = (
  type: CmsAssetType | "menu",
  id: string,
) =>
  type === "menu"
    ? ({ reference: "menu" as const, id } as const)
    : ({ reference: formatAssetReference(type), id } as const);
export const defineRichTextData = <const TValue extends readonly unknown[]>(
  value: TValue,
) => ({ content: value, references: [] as const });
export const defineTemplateData = <
  const T extends DataDefinition<TemplateDataInput>,
>(
  input: T,
) =>
  mapDefinition(input, (value) => ({
    id: value.id,
    settings: value.settings ?? {},
    settingBindings: value.settingBindings ?? {},
    messages: value.messages ?? {},
    slots: value.slots ?? {},
  }));
export const defineTemplateDatas = <
  const T extends Readonly<Record<string, DataDefinition<TemplateDataInput>>>,
>(
  input: T,
): DefinedTemplateDatas<T> =>
  Object.fromEntries(
    Object.entries(input).map(([instanceKey, definition]) => {
      const separator = instanceKey.lastIndexOf(".");
      if (separator < 1 || separator === instanceKey.length - 1)
        throw new Error(`Invalid Template instance key: ${instanceKey}`);
      return [
        instanceKey,
        mapDefinition(definition, ({ id, ...contentJson }) => ({
          id,
          templateKey: instanceKey.slice(0, separator),
          contentJson,
        })),
      ];
    }),
  ) as DefinedTemplateDatas<T>;
export const defineTemplateDataTranslation = <
  const T extends DataDefinition<TemplateDataTranslationInput["content"]>,
>(
  locale: string,
  content: T,
) => translation(locale, content);
export const defineMenuData = <const T extends DataDefinition<MenuDataInput>>(
  input: T,
): T => input;
export const defineMenuDataTranslation = <
  const T extends DataDefinition<MenuTranslationInput["content"]>,
>(
  locale: string,
  content: T,
) => translation(locale, content);
export const defineModuleData = <
  const T extends DataDefinition<ModuleDataInput>,
>(
  input: T,
): T => input;
export const defineModuleEntries = <
  const T extends Readonly<Record<string, DataDefinition<ModuleEntryData>>>,
>(
  input: T,
): T & Readonly<{ [moduleEntriesKind]: "record" }> =>
  Object.defineProperty(input, moduleEntriesKind, { value: "record" }) as T &
    Readonly<{ [moduleEntriesKind]: "record" }>;
export const defineModuleQueryEntries = <
  const T extends Omit<ModuleEntryQueryModel, typeof moduleEntriesKind>,
>(
  input: T,
): T & Readonly<{ [moduleEntriesKind]: "query" }> =>
  Object.defineProperty(input, moduleEntriesKind, { value: "query" }) as T &
    Readonly<{ [moduleEntriesKind]: "query" }>;
export const defineModuleEntryData = <
  const T extends DataDefinition<ModuleEntryDataInput>,
>(
  input: T,
) =>
  mapDefinition(input, (value) => {
    const hasPage = [
      "routeKey",
      "instanceKey",
      "slots",
      "includeInSitemap",
    ].some((key) => Object.hasOwn(value, key));
    return {
      id: value.id,
      ...("parentId" in value ? { parentId: value.parentId } : {}),
      fields: value.fields,
      ...(hasPage
        ? {
            page: {
              ...("routeKey" in value ? { routeKey: value.routeKey } : {}),
              ...("instanceKey" in value
                ? { instanceKey: value.instanceKey }
                : {}),
              contentJson: { slots: value.slots ?? {} },
              ...("includeInSitemap" in value
                ? { includeInSitemap: value.includeInSitemap }
                : {}),
            },
          }
        : {}),
    };
  });
export const defineModuleEntryDataTranslation = <
  const T extends DataDefinition<PageEntryTranslationInput["content"]>,
>(
  locale: string,
  content: T,
) => translation(locale, content);
export const defineModuleDataTranslation = <
  const T extends DataDefinition<ModuleTranslationInput["content"]>,
>(
  locale: string,
  content: T,
) => translation(locale, content);
export const defineSeoData = <const T extends DataDefinition<SeoDataInput>>(
  input: T,
) =>
  mapDefinition(input, (value) =>
    value.templates.map((template) => {
      collectSeoTemplateExpressions(template.content);
      return {
        ...template,
        name: template.id,
        locale: normalizeCmsLocaleScope(template.locale),
        schemaVersion: "2026-08-01",
        status: "active" as const,
      };
    }),
  );
export const defineStorageData = <
  const T extends DataDefinition<StorageDataInput>,
>(
  input: T,
): T => input;
export const defineAssetEntries = <const T extends DefinedAssetEntries>(
  input: T,
): T => input;
export const defineAssetQueryEntries = <const T extends AssetQueryEntries>(
  input: T,
): T => input;
export const defineStorageDataTranslation = <
  const T extends DataDefinition<StorageTranslationInput["content"]>,
>(
  locale: string,
  content: T,
) => translation(locale, content);

export async function resolveDataDefinition<T>(
  definition: DataDefinition<T>,
  context: DataContext,
): Promise<T> {
  return typeof definition === "function"
    ? await (definition as DataFactory<T>)(context)
    : definition;
}
