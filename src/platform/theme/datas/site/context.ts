import type { SiteDataInput } from '@/platform/theme/define/datas';

export type DatasSiteContext = Readonly<{
  host: string;
  origin: string;
  locale: string;
  domainLocale: string;
  scopePrefix: string;
  publicPath: string;
  contentPath: string;
  query: string;
  domainRedirect?: { status: 301 | 302; location: string };
}>;

export function resolveDatasSiteContext(input: { host: string; origin?: string; path: string; query: string }, site: SiteDataInput): DatasSiteContext {
  const host = input.host.toLocaleLowerCase();
  const origin = input.origin ?? `https://${host}`;
  const publicPath = normalizePath(input.path);
  const domain = site.domains.find((item) => item.host.toLocaleLowerCase() === host);
  const localeByPrefix = new Map(site.supportedLocales.map((locale) => [locale.toLowerCase(), locale]));
  const [first = '', ...rest] = publicPath.split('/').filter(Boolean);
  const explicitLocale = localeByPrefix.get(first.toLowerCase());
  const scopePrefix = explicitLocale ? `/${explicitLocale.toLowerCase()}` : '';
  const contentPath = explicitLocale ? normalizePath(`/${rest.join('/')}`) : publicPath;
  const locale = explicitLocale ?? domain?.defaultLocale ?? site.defaultLocale;
  const domainLocale = domain?.defaultLocale ?? site.defaultLocale;
  const querySuffix = input.query ? `?${input.query}` : '';
  return {
    host,
    origin,
    locale,
    domainLocale,
    scopePrefix,
    publicPath,
    contentPath,
    query: input.query,
    ...(domain?.redirectTo ? {
      domainRedirect: {
        status: domain.redirectStatusCode!,
        location: `https://${domain.redirectTo}${publicPath}${querySuffix}`,
      },
    } : {}),
  };
}

export const scopeDatasPath = (context: DatasSiteContext, path: string) => `${context.scopePrefix}${path === '/' ? '' : path}` || '/';

const normalizePath = (path: string) => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const compact = normalized.replace(/\/{2,}/g, '/');
  return compact.length > 1 ? compact.replace(/\/+$/, '') : '/';
};
