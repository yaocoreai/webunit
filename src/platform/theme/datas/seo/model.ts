import type { SeoTemplateContent } from '@/platform/manifest';

export type DatasSeoTemplate = Readonly<{
  id: string;
  locale: string;
  status?: 'active' | 'inactive';
  owner: Readonly<{ type: 'site' } | { type: 'module'; key: string } | { type: 'page'; id: string }>;
  content: SeoTemplateContent;
}>;

export type DatasSeoPage = Readonly<{
  routePrefix: string;
  routeKey: string;
  fullPath: string;
  templateKey: string;
  canonical: string;
}>;

export type DatasSeoContext = Readonly<{
  baseUrl: string;
  origin: string;
  path: string;
  requestUrl: string;
  locale: string;
  defaultLocale: string;
  domainLocale: string;
  supportedLocales: readonly string[];
  moduleKey: string;
  site: Readonly<{ fields: Record<string, unknown> }>;
  entry: Readonly<{ id: string; fields: Record<string, unknown>; page: DatasSeoPage }>;
  parentEntry?: Readonly<{ fields: Record<string, unknown>; page: DatasSeoPage | null }>;
}>;
