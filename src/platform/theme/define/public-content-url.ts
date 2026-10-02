const localContentOrigin = 'https://local.cms.invalid';
const cmsAssetEmbedProviders = {
  youtube: { type: 'video', hosts: ['www.youtube.com', 'www.youtube-nocookie.com'] },
  vimeo: { type: 'video', hosts: ['player.vimeo.com'] },
  spotify: { type: 'audio', hosts: ['open.spotify.com'] },
  soundcloud: { type: 'audio', hosts: ['w.soundcloud.com'] },
} as const;

export const isPublicContentUrl = (value: string): boolean => {
  try {
    if (value.startsWith('/')) {
      const url = new URL(value, localContentOrigin);
      return url.origin === localContentOrigin;
    }
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
};

export const isTrustedCmsAssetEmbedUrl = (provider: string, value: string): boolean => {
  const definition = cmsAssetEmbedProviders[provider as keyof typeof cmsAssetEmbedProviders];
  if (!definition) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && definition.hosts.includes(url.hostname as never) && isTrustedCmsAssetEmbedPath(provider, url);
  } catch {
    return false;
  }
};

export const isTrustedCmsAssetEmbedType = (provider: string, type: string): type is 'video' | 'audio' => {
  const definition = cmsAssetEmbedProviders[provider as keyof typeof cmsAssetEmbedProviders];
  return Boolean(definition && definition.type === type);
};

const isTrustedCmsAssetEmbedPath = (provider: string, url: URL): boolean => {
  if (url.hash) return false;
  if (provider === 'youtube') return /^\/embed\/[A-Za-z0-9_-]{1,128}$/.test(url.pathname) && !url.search;
  if (provider === 'vimeo') return /^\/video\/\d{1,20}$/.test(url.pathname) && !url.search;
  if (provider === 'spotify') return /^\/embed\/(album|episode|playlist|show|track)\/[A-Za-z0-9]{1,128}$/.test(url.pathname) && !url.search;
  if (provider !== 'soundcloud' || url.pathname !== '/player/' || [...url.searchParams].length !== 1) return false;
  return /^https:\/\/api\.soundcloud\.com\/tracks\/\d{1,20}$/.test(url.searchParams.get('url') ?? '');
};
