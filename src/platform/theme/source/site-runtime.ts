import { ApiError } from '@/platform/runtime/error';
import type { ErrorRenderPayload } from '@/platform/theme/render/model';
import type { SiteContentSource } from './contracts';
import type { SiteClient } from './site';

export function createSiteClient(api: SiteContentSource): SiteClient {
  return {
    async resolveRenderRequest(request, preview) {
      const url = new URL(request.url);
      const rawInput = { host: url.hostname, headers: readForwardHeaders(request.headers), signal: request.signal };
      if (url.pathname === '/llms.txt') {
        return { type: 'response', response: await api.readSiteFile({ ...rawInput, path: url.pathname }) };
      }
      if (url.pathname === '/robots.txt') {
        try {
          return { type: 'response', response: await api.readSiteFile({ ...rawInput, path: url.pathname }) };
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 404) throw error;
        }
        const { renderRobotsResponse } = await import('./public-documents');
        return { type: 'response', response: renderRobotsResponse(request) };
      }
      if (url.pathname === '/manifest.webmanifest' || url.pathname === '/browserconfig.xml') {
        const manifest = await api.readManifest({ host: url.hostname, origin: url.origin, signal: request.signal });
        const documents = await import('./public-documents');
        return { type: 'response', response: url.pathname === '/manifest.webmanifest' ? documents.renderManifestResponse(request, manifest) : documents.renderBrowserConfigResponse(request, manifest) };
      }
      if (url.pathname === '/sitemap.xml' || /^\/sitemap-[a-z0-9-]+\.xml$/.test(url.pathname)) {
        const document = url.pathname === '/sitemap.xml'
          ? await api.listSitemaps({ host: url.hostname, signal: request.signal })
          : await api.findSitemap({ host: url.hostname, path: url.pathname, signal: request.signal });
        const { renderSitemapResponse } = await import('./public-documents');
        return { type: 'response', response: renderSitemapResponse(request, document) };
      }
      return api.resolveRoute({ host: url.hostname, origin: url.origin, path: url.pathname, query: url.search.slice(1), signal: request.signal, ...(preview ? { preview } : {}) });
    },
    async resolveErrorRequest(request, status, requestId): Promise<ErrorRenderPayload> {
      const url = new URL(request.url);
      return api.resolveError({ host: url.hostname, origin: url.origin, path: url.pathname, query: url.search.slice(1), status, ...(requestId ? { requestId } : {}), signal: request.signal });
    },
  };
}

const readForwardHeaders = (source: Headers) => {
  const headers = new Headers();
  for (const name of ['if-modified-since', 'if-none-match', 'range']) {
    const value = source.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
};
