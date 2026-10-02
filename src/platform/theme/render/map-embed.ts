export function safeMapEmbedUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 4_096) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return undefined;
    if (!['www.google.com', 'maps.google.com'].includes(url.hostname) || url.pathname !== '/maps/embed') return undefined;
    return url.searchParams.has('pb') || url.searchParams.has('q') ? url.href : undefined;
  } catch {
    return undefined;
  }
}
