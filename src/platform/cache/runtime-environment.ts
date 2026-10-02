export type WebCacheEnvironment = Readonly<{
  WEB_DATA_DIR?: string;
  WEB_CACHE_REDIS_URL?: string;
  WEB_CACHE_REDIS_MAX_CONNECTIONS?: string;
  WEB_CACHE_REDIS_TIMEOUT_MS?: string;
}>;
