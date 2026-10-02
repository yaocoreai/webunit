export type PublicResponseCachePolicy = Readonly<{
  mode: "public";
  browserTtlSeconds: number;
  sharedTtlSeconds: number;
  staleWhileRevalidateSeconds: number;
  surrogateKeys: readonly string[];
}>;

export type NoStoreResponseCachePolicy = Readonly<{
  mode: "no-store";
  visibility: "public" | "preview";
  surrogateKeys: readonly string[];
}>;

export type ResponseCachePolicy =
  | PublicResponseCachePolicy
  | NoStoreResponseCachePolicy;

export type ContentCacheDependency = Readonly<{
  browserTtlSeconds: number;
  sharedTtlSeconds: number;
  staleWhileRevalidateSeconds: number;
  surrogateKeys: readonly string[];
  noStore?: boolean;
}>;
