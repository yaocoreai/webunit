import { ApiError } from '@/platform/runtime/error';
import type { ContentSource, RawContentInput } from '@/platform/theme/source/contracts';
import { adaptErrorRenderPayload, adaptResolveResult } from '@/platform/theme/source/site-client';
import { renderSiteFile } from '@/platform/theme/source/site-file';
import { createDatasPublicContent } from './content-api';
import { createDatasErrorRenderPayload, createDatasResolveRoute } from './resolver';
import type { SiteManifest } from '@/platform/manifest';
import siteDefinition from '@/theme/datas/site';
import type { ContentDependencyRegistrar, RequestContext } from '@/platform/theme/runtime/request-context';
import { isStaticDatasGraph, resolveDatasGraph, type DatasGraphDefinitions } from './graph';
import { createDatasSitemapDocument } from './site/sitemap';
import { resolveDatasManifest } from './manifests/resolve';
import { resolveDataDefinition } from '@/platform/theme/define/datas';
import { resolveDatasSiteContext } from './site/context';
import { resolveDatasSiteFile } from './site/files';
import { createLazyPublicContent } from '@/platform/theme/content/lazy';
import { resolveRenderPayloadSettingBindings } from '@/platform/theme/render/setting-bindings';

type DatasRuntime = Omit<RequestContext, 'locale' | 'domainHost'> & Readonly<{ locale: string; dependency: ContentDependencyRegistrar }>;
const defaultDefinitions: DatasGraphDefinitions = { site: siteDefinition };
const staticGraphs = new WeakMap<SiteManifest, Promise<Awaited<ReturnType<typeof resolveDatasGraph>>>>();
let staticGraphSignal: AbortSignal | undefined;

const readFile = async (input: RawContentInput & { path: string }, site: import('@/platform/theme/define/datas').SiteDataInput) => {
  const context = resolveDatasSiteContext({ host: input.host, path: input.path, query: '' }, site);
  const result = resolveDatasSiteFile(context, site);
  if (!result) throw new ApiError('response', 404, input.path);
  if (result.type !== 'file') throw new ApiError('contract', 502, input.path);
  return renderSiteFile(
    result.file,
    { ...result.cache, surrogateKeys: [...result.cache.surrogateKeys] },
    new Request(`https://${input.host}${input.path}`, { headers: input.headers, signal: input.signal }),
  );
};

export function createDatasContentSource(theme: SiteManifest, runtime: DatasRuntime, definitions: DatasGraphDefinitions = defaultDefinitions): ContentSource {
  const requirements = theme.modules ?? [];
  const siteProperties = theme.site.properties ?? [];
  const graphs = new Map<string, Promise<Awaited<ReturnType<typeof resolveDatasGraph>>>>();
  const sites = new Map<string, Promise<import('@/platform/theme/define/datas').SiteDataInput>>();
  const resolveSite = (domainHost: string, signal: AbortSignal) => {
    const key = domainHost.toLowerCase();
    const cached = sites.get(key);
    if (cached) return cached;
    const pending = resolveDataDefinition(definitions.site ?? siteDefinition, {
      ...runtime,
      signal,
      domainHost,
      owner: 'site',
      definitionKey: 'default',
    });
    sites.set(key, pending);
    pending.catch(() => sites.delete(key));
    return pending;
  };
  const resolveLocale = async (input: { host: string; path: string; query?: string; origin?: string; signal: AbortSignal }) => {
    const site = await resolveSite(input.host, input.signal);
    const locale = resolveDatasSiteContext({ host: input.host, path: input.path, query: input.query ?? '', ...(input.origin ? { origin: input.origin } : {}) }, site).locale;
    return { locale, site } as const;
  };
  const resolveFinalSite = async (input: { host: string; path: string; query?: string; origin?: string; signal: AbortSignal }) => {
    const resolved = await resolveLocale(input);
    if (resolved.locale === runtime.locale) return resolved;
    const site = await resolveDataDefinition(definitions.site ?? siteDefinition, {
      ...runtime,
      signal: input.signal,
      locale: resolved.locale,
      domainHost: input.host,
      owner: 'site',
      definitionKey: 'default',
    });
    return { locale: resolved.locale, site } as const;
  };
  const resolveGraph = (domainHost: string, locale: string, signal: AbortSignal, resolvedSite?: import('@/platform/theme/define/datas').SiteDataInput) => {
    if (definitions === defaultDefinitions && isStaticDatasGraph(definitions)) {
      const cached = staticGraphs.get(theme);
      if (cached) return cached;
      const pending = resolveDatasGraph({
        ...runtime,
        signal: staticGraphSignal ??= new AbortController().signal,
        locale: 'en-us',
        domainHost: 'static.datas',
        dependency: () => {},
      }, definitions, theme);
      staticGraphs.set(theme, pending);
      pending.catch(() => staticGraphs.delete(theme));
      return pending;
    }
    const key = `${domainHost.toLowerCase()}\0${locale}`;
    const cached = graphs.get(key);
    if (cached) return cached;
    const pending = resolveDatasGraph(
      { ...runtime, signal, locale, domainHost },
      resolvedSite ? { ...definitions, site: resolvedSite } : definitions,
      theme,
    );
    graphs.set(key, pending);
    pending.catch(() => graphs.delete(key));
    return pending;
  };
  return {
    kind: 'datas',
    site: {
      async resolveRoute(input) {
        const { locale, site } = await resolveFinalSite(input);
        const graph = await resolveGraph(input.host, locale, input.signal, site);
        const raw = await createDatasResolveRoute(input, requirements, graph.site, siteProperties, graph);
        const result = adaptResolveResult(raw);
        return result.type === 'render' && raw.type === 'page'
          ? { ...result, payload: await resolveRenderPayloadSettingBindings(result.payload, raw.renderPayload) }
          : result;
      },
      async resolveError(input) {
        const { locale, site } = await resolveFinalSite(input);
        const [graph, { createDefaultErrorRenderPayload }, { errorSetting, layoutSetting }] = await Promise.all([
          resolveGraph(input.host, locale, input.signal, site),
          import('@/platform/theme/render/default-error-payload'),
          import('@/platform/generated/theme/definition'),
        ]);
        const [layoutDefinition, errorDefinition] = await Promise.all([layoutSetting(), errorSetting()]);
        const fallback = createDefaultErrorRenderPayload(input, layoutDefinition.default, errorDefinition.default);
        const payload = await createDatasErrorRenderPayload(input, requirements, siteProperties, site, graph);
        return resolveRenderPayloadSettingBindings(adaptErrorRenderPayload(payload, 'datas:error', input, fallback), payload);
      },
      async readManifest(input) {
        const { locale, site } = await resolveFinalSite({ ...input, path: '/' });
        const graph = await resolveGraph(input.host, locale, input.signal, site);
        return resolveDatasManifest({ ...input, locale, siteProperties, requirements }, graph);
      },
      async readSiteFile(input) {
        const { site } = await resolveFinalSite(input);
        return readFile(input, site);
      },
      async listSitemaps(input) {
        const { locale, site } = await resolveFinalSite({ ...input, path: '/' });
        const graph = await resolveGraph(input.host, locale, input.signal, site);
        const document = await createDatasSitemapDocument({
          host: input.host,
          path: '/sitemap.xml',
          site: graph.site,
          requirements,
          routes: graph.registry.pages.values(),
          graph,
        });
        if (document.type !== 'index') throw new ApiError('contract', 502, '/sitemap.xml');
        return document;
      },
      async findSitemap(input) {
        const { locale, site } = await resolveFinalSite(input);
        const graph = await resolveGraph(input.host, locale, input.signal, site);
        const document = await createDatasSitemapDocument({ host: input.host, path: input.path, site: graph.site, requirements, routes: graph.registry.pages.values(), graph });
        if (document.type !== 'urlset') throw new ApiError('contract', 502, input.path);
        return document;
      },
    },
    createPublicContent: (context) => {
      let resolved: Promise<ReturnType<typeof createDatasPublicContent>> | undefined;
      const content = () => resolved ??= resolveGraph(context.domainHost, context.locale, context.signal).then((graph) => createDatasPublicContent(context, requirements, graph.site, graph));
      return createLazyPublicContent(content);
    },
  };
}
