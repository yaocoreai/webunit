import layoutData from "@/theme/datas/layout";
import consentData from "@/theme/datas/consent";
import documentInjectionsData from "@/theme/datas/document-injections";
import siteData from "@/theme/datas/site";
import templateData from "@/theme/datas/template";
import { ApiError } from "@/platform/runtime/error";
import type {
  ConsentMessages,
  ConsentPolicyReference,
  ContentTranslationInput,
  ModuleEntryData,
  SiteDataInput,
} from "@/platform/theme/define/datas";
import type {
  ErrorRenderPayload,
  SectionInstance,
} from "@/platform/theme/render/model";
import type { ManifestModule, ManifestProperty } from "@/platform/manifest";
import {
  assets,
  materializeCmsLinks,
  materializeResourceIds,
  moduleDataByKey,
  pageDataByPath,
  publicEntryFields,
  type ResourceMap,
} from "./registry";
import { localizeContentData, mergeLocalizedValue } from "./localize";
import { localizeResources } from "./localize-resources";
import {
  createDatasTranslationReader,
  getDatasTranslation,
  type DatasTranslationReader,
} from "./translation-cache";
import { normalizeDatasEntry, type DatasPageRoute } from "./model";
import { resolveDatasSeo } from "./seo/resolve";
import {
  resolveDatasSiteContext,
  scopeDatasPath,
  type DatasSiteContext,
} from "./site/context";
import { datasPublicCache, resolveDatasSiteFile } from "./site/files";
import { validateDatasPagePresentation, type DatasGraph } from "./graph";
import { collectAssetKeys, loadAssetResources } from "./query-assets";
import { materialize } from "@/platform/theme/source/site-adapter-values";
import { datasTranslationIdentity } from "./translation-identity";

function queryRecord(search: URLSearchParams) {
  const result: Record<string, string | string[]> = {};
  for (const key of new Set(search.keys())) {
    const values = search.getAll(key);
    result[key] = values.length > 1 ? values : (values[0] ?? "");
  }
  return result;
}

const identityArgs = (
  identity: Readonly<{ namespace: string; key: string }>,
  locale: string,
) => [identity.namespace, identity.key, locale] as const;

function readModuleTranslation(
  siteId: string,
  moduleId: string,
  locale: string,
  readTranslation: DatasTranslationReader,
) {
  return {
    moduleFields: readTranslation<
      Readonly<{ fields: Readonly<Record<string, unknown>> }>
    >(
      ...identityArgs(
        datasTranslationIdentity.moduleFields(siteId, moduleId),
        locale,
      ),
    )?.fields,
    entryFields: (entryId: string) =>
      readTranslation<Readonly<{ fields: Readonly<Record<string, unknown>> }>>(
        ...identityArgs(
          datasTranslationIdentity.entryFields(siteId, moduleId, entryId),
          locale,
        ),
      )?.fields,
    page: (entryId: string) =>
      readTranslation<ContentTranslationInput>(
        ...identityArgs(
          datasTranslationIdentity.page(siteId, moduleId, entryId),
          locale,
        ),
      ),
  };
}

async function parentContext(
  route: DatasPageRoute,
  context: DatasSiteContext,
  siteId: string,
  defaultCurrency: string,
  requirements: readonly ManifestModule[],
  resources: ResourceMap,
  readTranslation: DatasTranslationReader,
  graph?: DatasGraph,
) {
  const parentId = route.entry.parentId;
  if (!parentId) return { parentModule: null, parentEntry: null };
  if (!route.module.parentKey)
    throw new Error(
      `Unknown parent Datas Entry: ${route.module.key}.${route.entry.id} -> ${parentId}`,
    );
  const modules = graph?.registry.modules ?? moduleDataByKey;
  const pages = graph?.registry.pages ?? pageDataByPath;
  const templates = graph?.templates ?? templateData;
  const parentModule = modules.get(route.module.parentKey);
  const query = parentModule
    ? graph?.queryEntries.get(parentModule.key)
    : undefined;
  const queriedParent = query ? await query.findOne({ id: parentId }) : null;
  const parentRequirement = parentModule
    ? requirements.find((candidate) => candidate.key === parentModule.key)
    : undefined;
  const parentEntry =
    queriedParent && parentRequirement
      ? normalizeDatasEntry(
          parentModule!.key,
          parentRequirement,
          queriedParent.id,
          queriedParent.value,
        )
      : parentModule?.entries[parentId];
  if (!parentModule || !parentEntry)
    throw new Error(
      `Unknown parent Datas Entry: ${route.module.key}.${route.entry.id} -> ${parentId}`,
    );
  const parentRoute = [...pages.values()].find(
    (record) =>
      record.module.key === parentModule.key &&
      record.entry.id === parentEntry.id,
  );
  const parentTranslation = readModuleTranslation(
    siteId,
    parentModule.id,
    context.locale,
    readTranslation,
  );
  const localizedParentFields = mergeLocalizedValue(
    parentEntry.fields,
    parentTranslation.entryFields(parentEntry.id),
  ) as Readonly<Record<string, unknown>>;
  const parentResources = await loadAssetResources(
    graph?.assetQuery,
    collectAssetKeys(
      [localizedParentFields],
      parentRequirement?.entryProperties ?? [],
    ),
    resources,
  );
  return {
    parentModule: {
      key: parentModule.key,
      fields: materializeResourceIds(
        mergeLocalizedValue(parentModule.fields, parentTranslation?.moduleFields) as Readonly<Record<string, unknown>>,
        parentRequirement?.moduleProperties ?? [],
        resources,
        defaultCurrency,
      ),
    },
    parentEntry: {
      id: parentEntry.id,
      fields: publicEntryFields(
        parentModule.key,
        localizedParentFields,
        requirements,
        parentResources,
        defaultCurrency,
      ),
      page: parentRoute
        ? {
            routePrefix: parentModule.routePrefix!,
            routeKey: parentEntry.page!.routeKey,
            fullPath: parentRoute.path,
            templateKey:
              templates[parentEntry.page!.instanceKey as keyof typeof templates]
                .templateKey,
            canonical: `${context.origin}${scopeDatasPath(context, parentRoute.path)}`,
          }
        : null,
    },
  };
}

async function createPageResult(
  route: DatasPageRoute,
  search: URLSearchParams,
  requirements: readonly ManifestModule[],
  siteProperties: readonly ManifestProperty[],
  site: SiteDataInput,
  context: DatasSiteContext,
  graph?: DatasGraph,
) {
  const { module, entry } = route;
  const templates = graph?.templates ?? templateData;
  const savedTemplate =
    templates[entry.page.instanceKey as keyof typeof templates];
  if (!savedTemplate)
    throw new Error(
      `Unknown Datas Template instance: ${entry.page.instanceKey}`,
    );
  if (graph?.queryEntries.has(module.key))
    await validateDatasPagePresentation(
      `page.${module.key}.${entry.id}.${context.locale}`,
      savedTemplate,
      entry.page.contentJson,
    );
  const preview = search.has("preview");
  const origin = context.origin;
  const locale = context.locale;
  const readTranslation = graph
    ? createDatasTranslationReader(graph.translations)
    : getDatasTranslation;
  const translationScope = {
    siteId: site.id,
    themeId: (graph?.layout ?? layoutData).id,
  };
  const moduleTranslation = readModuleTranslation(
    site.id,
    module.id,
    locale,
    readTranslation,
  );
  const queried = graph?.queryEntries.has(module.key) ?? false;
  const entryTranslation = queried
    ? undefined
    : moduleTranslation.entryFields(entry.id);
  const pageTranslation = queried
    ? undefined
    : moduleTranslation.page(entry.id);
  const layoutTranslation = readTranslation<ContentTranslationInput>(
    ...identityArgs(datasTranslationIdentity.layout(translationScope), locale),
  );
  const templateTranslation = readTranslation<ContentTranslationInput>(
    ...identityArgs(
      datasTranslationIdentity.template(translationScope, savedTemplate.id),
      locale,
    ),
  );
  const baseResources = localizeResources(
    locale,
    requirements,
    site.id,
    site.defaultCurrency,
    graph?.registry,
    readTranslation,
    graph?.menuProperties,
  );
  const baseUrl = `${origin}${context.scopePrefix}`;
  const page = {
    routePrefix: module.routePrefix!,
    routeKey: entry.page.routeKey,
    fullPath: route.path,
    templateKey: savedTemplate.templateKey,
    canonical: `${origin}${scopeDatasPath(context, route.path)}`,
  };
  const localizedEntryFields = mergeLocalizedValue(
    entry.fields,
    entryTranslation,
  ) as Readonly<Record<string, unknown>>;
  const localizedSiteValues = mergeLocalizedValue(
    site.fields,
    readTranslation<Readonly<{ fields: Readonly<Record<string, unknown>> }>>(
      ...identityArgs(datasTranslationIdentity.siteFields(site.id), locale),
    )?.fields,
  ) as Readonly<Record<string, unknown>>;
  const assetKeys = collectAssetKeys(
    [localizedEntryFields],
    requirements.find((candidate) => candidate.key === module.key)
      ?.entryProperties ?? [],
  ).concat(collectAssetKeys([localizedSiteValues], siteProperties));
  const localizedResources = await loadAssetResources(
    graph?.assetQuery,
    [...new Set(assetKeys)],
    baseResources,
  );
  const content = <T>(value: T): T =>
    materializeCmsLinks(value, localizedResources) as T;
  const localizedSiteFields = materializeResourceIds(
    localizedSiteValues,
    siteProperties,
    localizedResources,
    site.defaultCurrency,
  );
  const consent = graph?.consent ?? consentData;
  const consentMessages =
    context.locale === site.defaultLocale
      ? consent.messages
      : (readTranslation<ConsentMessages>(
          ...identityArgs(
            datasTranslationIdentity.consent(site.id),
            context.locale,
          ),
        ) ?? consent.messages);
  const policyLink = (reference: ConsentPolicyReference, _title: string) =>
    materializeCmsLinks(
      {
        type: "module",
        reference: reference.reference,
        id: reference.id,
        target: "_self",
      },
      localizedResources,
    );
  const publicEntry = {
    id: entry.id,
    fields: publicEntryFields(
      module.key,
      localizedEntryFields,
      requirements,
      localizedResources,
      site.defaultCurrency,
    ),
    page,
  };
  const parent = await parentContext(
    route,
    context,
    site.id,
    site.defaultCurrency,
    requirements,
    localizedResources,
    readTranslation,
    graph,
  );
  const surrogateKeys = [
    "site:datas",
    `module:${module.key}`,
    `entry:${entry.id}`,
    ...(parent.parentModule ? [`module:${parent.parentModule.key}`] : []),
    ...(parent.parentEntry ? [`entry:${parent.parentEntry.id}`] : []),
  ];

  return {
    type: "page",
    mode: preview ? "theme-preview" : "public",
    cache: preview
      ? { mode: "no-store", visibility: "preview", surrogateKeys }
      : { ...datasPublicCache(context.publicPath), surrogateKeys },
    renderPayload: {
      site: { fields: localizedSiteFields, defaultCurrency: site.defaultCurrency },
      domain: { host: context.host },
      module: {
        key: module.key,
        fields: materializeResourceIds(
          mergeLocalizedValue(module.fields, moduleTranslation?.moduleFields) as Readonly<Record<string, unknown>>,
          requirements.find((candidate) => candidate.key === module.key)?.moduleProperties ?? [],
          localizedResources,
          site.defaultCurrency,
        ),
      },
      entry: publicEntry,
      parentModule: parent.parentModule,
      parentEntry: parent.parentEntry,
      locale,
      route: { path: context.publicPath, query: queryRecord(search) },
      page: {
        instanceKey: entry.page.instanceKey,
        contentJson: content(
          localizeContentData(entry.page.contentJson, pageTranslation),
        ),
      },
      seo: resolveDatasSeo(
        {
          origin,
          baseUrl,
          path: scopeDatasPath(context, route.path),
          requestUrl: `${origin}${context.publicPath}`,
          locale,
          defaultLocale: site.defaultLocale,
          domainLocale: context.domainLocale,
          supportedLocales: site.supportedLocales,
          moduleKey: module.key,
          site: { fields: localizedSiteFields },
          entry: publicEntry,
          parentEntry: parent.parentEntry ?? undefined,
        },
        graph?.seo,
      ),
      consent: {
        ...consent,
        messages: consentMessages,
        privacyPolicy: policyLink(consent.privacyPolicy, consentMessages.title),
        ...(consent.cookiePolicy
          ? {
              cookiePolicy: policyLink(
                consent.cookiePolicy,
                consentMessages.managePreferences,
              ),
            }
          : {}),
      },
      documentInjections: (graph?.documentInjections ?? documentInjectionsData)
        .filter((injection) => injection.status === "active")
        .toSorted(
          (left, right) =>
            left.sortOrder - right.sortOrder || left.id.localeCompare(right.id),
        ),
      layout: {
        contentJson: content(
          localizeContentData(graph?.layout ?? layoutData, layoutTranslation),
        ),
      },
      template: {
        instanceKey: entry.page.instanceKey,
        templateKey: savedTemplate.templateKey,
        contentJson: content(
          localizeContentData(savedTemplate.contentJson, templateTranslation),
        ),
      },
      refs: localizedResources,
    },
  } as const;
}

export async function createDatasResolveRoute(
  input: {
    host: string;
    origin?: string;
    path: string;
    query: string;
    preview?: Readonly<{ themeId: string; ticket: string }>;
  },
  requirements: readonly ManifestModule[],
  site: SiteDataInput = siteData as SiteDataInput,
  siteProperties: readonly ManifestProperty[] = [],
  graph?: DatasGraph,
) {
  const search = new URLSearchParams(input.query);
  if (input.preview || search.has("preview") || search.has("ticket"))
    throw new ApiError("response", 404, "site:renders");
  const context = resolveDatasSiteContext(input, site);
  if (context.domainRedirect)
    return {
      type: "redirect",
      mode: "public",
      cache: datasPublicCache(context.publicPath),
      redirect: context.domainRedirect,
    } as const;
  const pages = graph?.registry.pages ?? pageDataByPath;
  const redirect = site.redirects.find(
    (record) => record.path === context.contentPath,
  );
  if (redirect)
    return {
      type: "redirect",
      mode: "public",
      cache: datasPublicCache(context.publicPath),
      redirect: {
        status: redirect.status,
        location: `${scopeDatasPath(context, redirect.location)}${input.query ? `?${input.query}` : ""}`,
      },
    } as const;
  const siteFile = resolveDatasSiteFile(context, site);
  if (siteFile) return siteFile;
  const route = await findRoute(
    context.contentPath,
    requirements,
    pages,
    graph,
  );
  if (!route) throw new ApiError("response", 404, "site:renders");
  return await createPageResult(
    route,
    search,
    requirements,
    siteProperties,
    site,
    context,
    graph,
  );
}

export async function createDatasErrorRenderPayload(
  input: {
    host: string;
    origin?: string;
    path: string;
    query: string;
    status: number;
    requestId?: string;
  },
  requirements: readonly ManifestModule[],
  siteProperties: readonly ManifestProperty[],
  site: SiteDataInput,
  graph: DatasGraph,
): Promise<ErrorRenderPayload> {
  const context = resolveDatasSiteContext(input, site);
  const readTranslation = createDatasTranslationReader(graph.translations);
  const savedErrorTemplate = graph.templates["error.default"];
  if (!savedErrorTemplate || savedErrorTemplate.templateKey !== "error")
    throw new Error("Unknown Datas Error Template instance: error.default");
  const translationScope = { siteId: site.id, themeId: graph.layout.id };
  const layoutTranslation = readTranslation<ContentTranslationInput>(
    ...identityArgs(
      datasTranslationIdentity.layout(translationScope),
      context.locale,
    ),
  );
  const errorTranslation = readTranslation<ContentTranslationInput>(
    ...identityArgs(
      datasTranslationIdentity.template(
        translationScope,
        savedErrorTemplate.id,
      ),
      context.locale,
    ),
  );
  const resources = localizeResources(
    context.locale,
    requirements,
    site.id,
    site.defaultCurrency,
    graph.registry,
    readTranslation,
    graph.menuProperties,
  );
  const content = <T>(value: T): T =>
    materialize(materializeCmsLinks(value, resources), resources) as T;
  const localizedSiteValues = mergeLocalizedValue(
    site.fields,
    readTranslation<Readonly<{ fields: Readonly<Record<string, unknown>> }>>(
      ...identityArgs(
        datasTranslationIdentity.siteFields(site.id),
        context.locale,
      ),
    )?.fields,
  ) as Readonly<Record<string, unknown>>;
  const siteFields = materializeResourceIds(
    localizedSiteValues,
    siteProperties,
    resources,
    site.defaultCurrency,
  );
  const createTranslator =
    (messages: Readonly<Record<string, string>>) => (key: string) =>
      messages[key] ?? key;
  const sections = (
    slots: Readonly<
      Record<
        string,
        readonly Readonly<{
          id: string;
          key: string;
          settings?: Readonly<Record<string, unknown>>;
          messages?: Readonly<Record<string, string>>;
        }>[]
      >
    > = {},
  ) =>
    Object.fromEntries(
      Object.entries(slots).map(([slot, values]) => [
        slot,
        values.map((value) => {
          const messages = value.messages ?? {};
          return {
            id: value.id,
            key: value.key,
            settings: value.settings ?? {},
            messages,
            t: createTranslator(messages),
          } satisfies SectionInstance;
        }),
      ]),
    );
  const layout = content(localizeContentData(graph.layout, layoutTranslation));
  const layoutMessages = layout.messages ?? {};
  const errorContent = content(
    localizeContentData(savedErrorTemplate.contentJson, errorTranslation),
  );
  const errorMessages = errorContent.messages ?? {};
  return {
    type: "error",
    site: {
      fields: siteFields as import("@/platform/theme/render/model").Site["fields"],
      defaultCurrency: site.defaultCurrency,
    },
    domain: { host: context.host },
    locale: context.locale,
    route: {
      path: context.publicPath,
      query: queryRecord(new URLSearchParams(input.query)),
    },
    seo: {
      title: `${input.status} · Error`,
      robots: [{ name: "robots", content: "noindex,nofollow" }],
      canonical: `${input.origin ?? `https://${input.host}`}${context.publicPath}`,
      alternates: [],
      icons: [],
      meta: [],
      links: [],
      jsonLd: [],
    },
    documentInjections: [],
    layout: {
      settings: layout.settings ?? {},
      messages: layoutMessages,
      slots: sections(layout.slots),
      t: createTranslator(layoutMessages),
    },
    template: {
      instanceKey: "error.default",
      templateKey: "error",
      settings: errorContent.settings ?? {},
      messages: errorMessages,
      slots: sections(errorContent.slots),
      t: createTranslator(errorMessages),
    },
    error: {
      status: input.status,
      ...(input.requestId ? { requestId: input.requestId } : {}),
    },
  };
}

async function findRoute(
  path: string,
  requirements: readonly ManifestModule[],
  pages: ReadonlyMap<string, DatasPageRoute>,
  graph?: DatasGraph,
): Promise<DatasPageRoute | undefined> {
  const candidates = requirements
    .filter(
      (
        module,
      ):         module is ManifestModule &
        Readonly<{ kind: "page"; routePrefix: string }> =>
        (module.kind ?? "page") === "page" && typeof module.routePrefix === "string",
    )
    .map((module, order) => ({ module, order }))
    .filter(
      ({ module }) =>
        module.routePrefix === "" ||
        path === module.routePrefix ||
        path.startsWith(`${module.routePrefix}/`),
    )
    .sort(
      (left, right) =>
        right.module.routePrefix.length - left.module.routePrefix.length ||
        left.order - right.order,
    );
  for (const { module: requirement } of candidates) {
    const routeKey =
      requirement.routePrefix === ""
        ? path
        : path === requirement.routePrefix
          ? "/"
          : path.slice(requirement.routePrefix.length);
    const module =
      graph?.registry.modules.get(requirement.key) ??
      moduleDataByKey.get(requirement.key);
    if (!module) continue;
    const query = graph?.queryEntries.get(requirement.key);
    if (query) {
      if (!query.findRoute)
        throw new Error(
          `Page Query Entries requires findRoute: ${requirement.key}`,
        );
      const result = await query.findRoute({ routeKey });
      if (!result) continue;
      const entry = normalizeDatasEntry(
        requirement.key,
        requirement,
        result.id,
        result.value as ModuleEntryData,
      );
      if (entry.page?.routeKey !== routeKey)
        throw new TypeError(
          `Queried Entry routeKey mismatch: ${requirement.key}.${result.id}`,
        );
      return { path, module, entry: entry as DatasPageRoute["entry"] };
    }
    const entry = Object.values(module.entries).find(
      (candidate) => candidate.page?.routeKey === routeKey,
    );
    if (entry?.page)
      return { path, module, entry: entry as DatasPageRoute["entry"] };
  }
  return pages.get(path);
}

export { assets };
