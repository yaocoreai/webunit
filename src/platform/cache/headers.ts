import type { ResponseCachePolicy } from "./contracts";

export function createCacheHeaders(cache: ResponseCachePolicy) {
  const headers = new Headers();
  if (cache.mode === "no-store") {
    headers.set("cache-control", "no-store");
    return headers;
  }
  const surrogateKeys = cache.surrogateKeys.join(" ");
  if (
    cache.surrogateKeys.some((key) => !/^[A-Za-z0-9:_./-]+$/.test(key)) ||
    surrogateKeys.length > 8_192
  ) {
    headers.set("cache-control", "no-store");
    return headers;
  }
  headers.set("cache-control", `public, max-age=${cache.browserTtlSeconds}`);
  headers.set(
    "cloudflare-cdn-cache-control",
    `public, max-age=${cache.sharedTtlSeconds}, stale-while-revalidate=${cache.staleWhileRevalidateSeconds}`,
  );
  if (surrogateKeys) {
    headers.set("surrogate-key", surrogateKeys);
    headers.set("cache-tag", cache.surrogateKeys.join(","));
  }
  return headers;
}
