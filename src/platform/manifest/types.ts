import type {
  TableColumns,
  ValueTypeName,
  ValueTypeNode,
  ValueTypeOption,
  ValueTypePresentation,
} from "@/platform/schema/value-types";
import type { ViewportDefinition } from "./viewport";

export type QueryOperator =
  | "equals"
  | "not"
  | "in"
  | "notIn"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte";

export type ManifestPropertySummaryRole = "title" | "image";

export type ManifestProperty = Readonly<{
  key: string;
  label: string;
  description?: string;
  type: ValueTypeName;
  required?: boolean;
  locale?: boolean;
  reference?: string;
  /** Module Entry selector card slot; first matching field in definition order wins. */
  summary?: ManifestPropertySummaryRole;
  /** Override search weight only; type-supported full-text search is on by default. */
  searchable?: Readonly<{ weight?: number }>;
  /** Optional operator subset; type-supported filtering is on by default. */
  filterable?: Readonly<{ operators?: readonly QueryOperator[] }>;
  sortable?: boolean;
  aggregatable?: boolean;
  fields?: ValueTypeNode["fields"];
  items?: ValueTypeNode;
  columns?: TableColumns;
  columnForm?: string;
  options?: readonly ValueTypeOption[];
  minItems?: number;
  maxItems?: number;
  maxDepth?: number;
  presentation?: ValueTypePresentation;
}>;

export type ManifestModule = Readonly<{
  key: string;
  name: string;
  /** Omitted defaults to `page`. */
  kind?: "page" | "model";
  sitemap?: boolean;
  parentKey?: string;
  routePrefix?: string;
  /** Page modules omit this to use `key`. Model modules cannot declare it. */
  templateKey?: string;
  moduleProperties?: readonly ManifestProperty[];
  entryProperties?: readonly ManifestProperty[];
}>;

export type ManifestSite = Readonly<{
  properties?: readonly ManifestProperty[];
}>;

export type ManifestInstallation = Readonly<{
  /** Optional Site Sync menu wiring; Site locale/currency defaults live on the Install form. */
  bindings?: readonly Readonly<{
    target: Readonly<{
      ownerType: "layout" | "template" | "section";
      ownerKey: string;
      path: string;
    }>;
    resource: Readonly<{ type: "menu"; key: string }>;
  }>[];
}>;

export type ManifestMenu = Readonly<{
  key: string;
  properties?: readonly ManifestProperty[];
}>;

export type SeoTemplateJson =
  | null
  | boolean
  | number
  | string
  | readonly SeoTemplateJson[]
  | Readonly<{ [key: string]: SeoTemplateJson }>;
export type SeoTemplateImage = Readonly<{
  url: string;
  secureUrl?: string;
  contentType?: string;
  width?: number | string;
  height?: number | string;
  alt?: string;
}>;
export type SeoTemplateContent = Readonly<{
  title: string;
  description?: string;
  robots?: Readonly<Record<string, readonly string[]>>;
  icons?: readonly Readonly<{
    rel: "icon" | "apple-touch-icon" | "mask-icon";
    href: string;
    contentType?: string;
    sizes?: string;
    color?: string;
  }>[];
  meta?: readonly Readonly<{ name: string; content: string }>[];
  links?: readonly Readonly<{
    rel: string;
    href: string;
    type?: string;
    title?: string;
    media?: string;
  }>[];
  openGraph?: Readonly<{
    type?: string;
    title?: string;
    description?: string;
    siteName?: string;
    locale?: string;
    alternateLocales?: readonly string[];
    images?: readonly SeoTemplateImage[];
    properties?: Readonly<Record<string, string | readonly string[]>>;
  }>;
  twitter?: Readonly<{
    card?: "summary" | "summary_large_image" | "player" | "app";
    site?: string;
    creator?: string;
    title?: string;
    description?: string;
    image?: SeoTemplateImage;
    properties?: Readonly<Record<string, string>>;
  }>;
  jsonLd?: readonly Readonly<Record<string, SeoTemplateJson>>[];
}>;

type SiteSeoTemplate = Readonly<{
  key: string;
  label: string;
  locale?: string;
  owner: Readonly<{ type: "site" }>;
  content: SeoTemplateContent;
}>;

type ModuleSeoTemplate = Readonly<{
  key: string;
  label: string;
  locale?: string;
  owner: Readonly<{ type: "module"; key: string }>;
  content: SeoTemplateContent;
}>;

export type ManifestSeoTemplate = SiteSeoTemplate | ModuleSeoTemplate;

export type SiteManifest = Readonly<{
  package: Readonly<{
    key: string;
    name: string;
    version: string;
    description?: string;
  }>;
  viewport?: ViewportDefinition;
  installation?: ManifestInstallation;
  site: ManifestSite;
  menu?: readonly ManifestMenu[];
  modules?: readonly ManifestModule[];
  seo?: readonly ManifestSeoTemplate[];
}>;
