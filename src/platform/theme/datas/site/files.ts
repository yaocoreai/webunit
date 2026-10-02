import type { SiteDataInput } from '@/platform/theme/define/datas';
import type { DatasSiteContext } from './context';

export const datasPublicCache = (path: string) => ({
  mode: 'public', browserTtlSeconds: 60, sharedTtlSeconds: 300, staleWhileRevalidateSeconds: 900,
  surrogateKeys: ['site:datas', `route:${path}`],
} as const);

export function resolveDatasSiteFile(context: DatasSiteContext, site: SiteDataInput) {
  const file = site.files.find((record) => record.path === context.publicPath);
  if (!file) return undefined;
  const cache = datasPublicCache(context.publicPath);
  if (file.type === 'redirect') return { type: 'redirect', mode: 'public', cache, redirect: { status: 302, location: file.content } } as const;
  if (file.type === 'text') return {
    type: 'file', mode: 'public', cache,
    file: { resourceType: 'text', path: context.publicPath, contentType: contentTypeForPath(file.path), textContent: file.content, etag: contentEtag(file.content) },
  } as const;
  return {
    type: 'file', mode: 'public', cache,
    file: { resourceType: 'file', path: context.publicPath, contentType: contentTypeForPath(file.content), fileUrl: file.content },
  } as const;
}

export const contentEtag = (content: string) => {
  let hash = 2166136261;
  for (let index = 0; index < content.length; index += 1) hash = Math.imul(hash ^ content.charCodeAt(index), 16777619);
  return `"datas-${(hash >>> 0).toString(16)}"`;
};

const contentTypeForPath = (path: string) => {
  if (path.endsWith('.txt')) return 'text/plain; charset=utf-8';
  if (path.endsWith('.xml')) return 'application/xml; charset=utf-8';
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  if (path.endsWith('.pdf')) return 'application/pdf';
  if (path.endsWith('.zip')) return 'application/zip';
  return 'application/octet-stream';
};
