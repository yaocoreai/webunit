import type { ContentCacheDependency } from '@/platform/cache/contracts';
import type { RequestSignalsResolver } from '@/platform/runtime/request-signals';

export type RequestContext = Readonly<{
  request: Request;
  url: URL;
  requestId: string;
  signal: AbortSignal;
  locale: string;
  domainHost: string;
  signals: RequestSignalsResolver;
}>;

export type ContentDependencyRegistrar = (dependency: ContentCacheDependency) => void;
export type ContentOwner = 'site' | 'consent' | 'document-injections' | 'layout' | 'menu' | 'module' | 'entry' | 'seo' | 'storage' | 'template' | 'translation';

export type DataContext = RequestContext & Readonly<{
  dependency: ContentDependencyRegistrar;
  owner: ContentOwner;
  definitionKey: string;
}>;

const registerRequestDependency = (context: RequestContext) => {
  const data = context as Partial<DataContext>;
  if (typeof data.dependency !== 'function' || !data.owner || !data.definitionKey) return;
  data.dependency({
    browserTtlSeconds: 0,
    sharedTtlSeconds: 0,
    staleWhileRevalidateSeconds: 0,
    surrogateKeys: [`datas:${data.owner}:${data.definitionKey}`],
    noStore: true,
  });
};

export const useRequest = (context: RequestContext) => { registerRequestDependency(context); return context.request; };
export const useRequestGeo = (context: RequestContext) => { registerRequestDependency(context); return context.signals.geo(); };
export const useRequestBot = (context: RequestContext) => { registerRequestDependency(context); return context.signals.bot(); };
export const useRequestSignals = (context: RequestContext) => { registerRequestDependency(context); return context.signals.signals(); };
export const useLocale = (context: RequestContext) => context.locale;
