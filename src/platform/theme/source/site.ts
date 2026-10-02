import type { ErrorRenderPayload, RenderPayload } from '@/platform/theme/render/model';
import type { ResponseCachePolicy } from '@/platform/cache/contracts';

export type {
  NoStoreResponseCachePolicy as NoStoreCachePolicy,
  PublicResponseCachePolicy as PublicCachePolicy,
  ResponseCachePolicy,
} from '@/platform/cache/contracts';
export type RouteMode = 'public' | 'theme-preview';
export type SiteFile =
  | { resourceType: 'text'; path: string; contentType: string; textContent: string; etag?: string; lastModified?: string }
  | { resourceType: 'file'; path: string; contentType: string; fileUrl: string; etag?: string; lastModified?: string };

export type ResolveResult =
  | { type: 'redirect'; mode: RouteMode; status: 301 | 302; location: string; cache: ResponseCachePolicy }
  | { type: 'file'; mode: RouteMode; file: SiteFile; cache: ResponseCachePolicy }
  | { type: 'response'; response: Response }
  | { type: 'render'; mode: RouteMode; payload: RenderPayload; cache: ResponseCachePolicy };

export interface SiteClient {
  resolveRenderRequest(request: Request, preview?: Readonly<{ themeId: string; ticket: string }>): Promise<ResolveResult>;
  resolveErrorRequest(request: Request, status: number, requestId?: string): Promise<ErrorRenderPayload>;
}
