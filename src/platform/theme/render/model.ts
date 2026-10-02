export type PublicJson = null | boolean | number | string | PublicJson[] | { [key: string]: PublicJson };

export type Site<TFields extends Record<string, PublicJson> = Record<string, PublicJson>> = {
  fields: TFields;
  defaultCurrency: string;
};

export type PublicDomainPayload = {
  host: string;
};

export type ThemeModule<TFields extends Record<string, PublicJson> = Record<string, PublicJson>> = { key: string; fields: TFields };
export type PublicEntryPayload = { id: string; fields: Record<string, PublicJson> };
export type RoutePayload = {
  path: string;
  query: Record<string, string | string[]>;
};
export type PagePayload = { instanceKey: string };
export type SlotScope = 'layout' | 'template' | 'page';

export type SeoIcon = {
  rel: 'icon' | 'apple-touch-icon' | 'mask-icon';
  href: string;
  contentType?: string;
  sizes?: string;
  color?: string;
};

export type SeoPayload = {
  title: string;
  description?: string;
  robots: Array<{ name: string; content: string }>;
  canonical: string;
  alternates: Array<{ hreflang: string; href: string }>;
  icons: SeoIcon[];
  meta: Array<{ name: string; content: string }>;
  links: Array<{ rel: string; href: string; type?: string; title?: string; media?: string }>;
  openGraph?: Record<string, string | string[]>;
  twitter?: Record<string, string>;
  jsonLd: Array<Record<string, PublicJson>>;
};

export type ConsentPurpose = 'analytics' | 'marketing' | 'preferences' | 'saleOfData';
export type DocumentInjectionPlacement = 'head-start' | 'head-end' | 'body-start' | 'body-end';
export type DocumentInjectionSnippet = Readonly<{
  placement: DocumentInjectionPlacement;
  code: string;
}>;
export type ConsentMessages = Readonly<Record<'title' | 'description' | 'acceptAll' | 'rejectOptional' | 'managePreferences' | 'savePreferences' | 'necessary' | ConsentPurpose, string>>;
export type ResolvedConsent = Readonly<{
  enabled: boolean;
  display: Readonly<{ mode: 'always' } | { mode: 'never' } | { mode: 'regions'; countryCodes: readonly string[]; regionCodes?: readonly string[]; unknownRegion: 'show' | 'hide' }>;
  privacyPolicy: import('@/platform/theme/content/public').CmsLink;
  cookiePolicy?: import('@/platform/theme/content/public').CmsLink;
  version: number;
  maxAgeDays: number;
  messages: ConsentMessages;
}>;
export type DocumentInjection = Readonly<{
  id: string;
  snippets: readonly DocumentInjectionSnippet[];
  requiredConsent: readonly ConsentPurpose[];
  status: 'active' | 'disabled';
  sortOrder: number;
}>;

export type Translate<TMessages extends Readonly<Record<string, string>> = Readonly<Record<string, string>>> = (key: Extract<keyof TMessages, string>) => string;

export type SectionInstance<
  TSettings extends Readonly<Record<string, unknown>> = Readonly<Record<string, unknown>>,
  TMessages extends Readonly<Record<string, string>> = Readonly<Record<string, string>>,
> = {
  id: string;
  key: string;
  settings: TSettings;
  messages: TMessages;
  t: Translate<TMessages>;
};
export type LayoutInstance<
  TSettings extends Readonly<Record<string, unknown>> = Readonly<Record<string, unknown>>,
  TMessages extends Readonly<Record<string, string>> = Readonly<Record<string, string>>,
> = {
  settings: TSettings;
  messages: TMessages;
  slots: Record<string, SectionInstance[]>;
  t: Translate<TMessages>;
};

export type TemplateInstance<
  TSettings extends Readonly<Record<string, unknown>> = Readonly<Record<string, unknown>>,
  TMessages extends Readonly<Record<string, string>> = Readonly<Record<string, string>>,
> = {
  instanceKey: string;
  templateKey: string;
  settings: TSettings;
  messages: TMessages;
  slots: Record<string, SectionInstance[]>;
  t: Translate<TMessages>;
};

export type ErrorContext = Readonly<{ status: number; requestId?: string }>;

export type PageInstance = PagePayload & {
  slots: Record<string, SectionInstance[]>;
};

export type RenderPayload = {
  site: Site;
  domain: PublicDomainPayload;
  module: ThemeModule;
  entry: PublicEntryPayload;
  parentModule: ThemeModule | null;
  parentEntry: PublicEntryPayload | null;
  locale: string;
  route: RoutePayload;
  page: PageInstance;
  seo: SeoPayload;
  consent?: ResolvedConsent;
  documentInjections: readonly DocumentInjection[];
  layout: LayoutInstance;
  template: TemplateInstance;
};

export type ErrorRenderPayload = {
  type: 'error';
  site: Site;
  domain: PublicDomainPayload;
  locale: string;
  route: RoutePayload;
  seo: SeoPayload;
  consent?: ResolvedConsent;
  documentInjections: readonly DocumentInjection[];
  layout: LayoutInstance;
  template: TemplateInstance;
  error: ErrorContext;
};

export type DocumentRenderPayload = RenderPayload | ErrorRenderPayload;
export const isErrorRenderPayload = (payload: DocumentRenderPayload): payload is ErrorRenderPayload => 'error' in payload;
