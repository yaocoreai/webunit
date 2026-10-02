import type { PublicContentApi } from "@/platform/theme/content/public";
import type { ResolveResult } from "@/platform/theme/source/site";
import type { ErrorRenderPayload } from "@/platform/theme/render/model";

export type ContentSourceKind = "datas" | "function";

export class ContentSourceError extends Error {
  constructor(
    readonly kind: string,
    readonly code: string,
    message: string,
    readonly retryAfterMs?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ContentSourceError";
  }

  get retryable() {
    return ["unavailable", "resource_exhausted", "deadline_exceeded"].includes(
      this.kind,
    );
  }
}

export type ResolveRouteInput = Readonly<{
  host: string;
  origin?: string;
  path: string;
  query: string;
  signal: AbortSignal;
  preview?: Readonly<{ themeId: string; ticket: string }>;
}>;

export type RawContentInput = Readonly<{
  host: string;
  headers: HeadersInit;
  signal: AbortSignal;
}>;

export type ResolveErrorInput = Readonly<{
  host: string;
  origin?: string;
  path: string;
  query: string;
  status: number;
  requestId?: string;
  signal: AbortSignal;
}>;

export type SitemapDocument =
  | Readonly<{
      type: "index";
      entries: readonly Readonly<{ path: string; lastModified?: string }>[];
    }>
  | Readonly<{
      type: "urlset";
      defaultLocale: string;
      domainLocale: string;
      supportedLocales: readonly string[];
      entries: readonly Readonly<{
        path: string;
        locales: readonly string[];
        lastModified?: string;
      }>[];
    }>;

export type SiteManifest = Readonly<
  Record<string, import("@/platform/theme/render/model").PublicJson>
>;

export interface SiteContentSource {
  resolveRoute(input: ResolveRouteInput): Promise<ResolveResult>;
  resolveError(input: ResolveErrorInput): Promise<ErrorRenderPayload>;
  readManifest(
    input: Omit<RawContentInput, "headers"> & { origin: string },
  ): Promise<SiteManifest>;
  readSiteFile(input: RawContentInput & { path: string }): Promise<Response>;
  listSitemaps(
    input: Omit<RawContentInput, "headers">,
  ): Promise<Extract<SitemapDocument, { type: "index" }>>;
  findSitemap(
    input: Omit<RawContentInput, "headers"> & { path: string },
  ): Promise<Extract<SitemapDocument, { type: "urlset" }>>;
}

export type ContentSource = Readonly<{
  kind: ContentSourceKind;
  site: SiteContentSource;
  createPublicContent(
    context: import("@/platform/theme/content/public").PublicApiContext,
  ): PublicContentApi;
}>;
