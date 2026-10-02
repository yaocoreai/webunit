import type { Cache } from '@/platform/cache';
import { assertRedisCacheUrl, createRedisCacheFromUrl, readRedisCacheMaxConnections, readRedisCacheTimeoutMs } from '@/platform/infrastructure/container/cache';
import type { WebCacheEnvironment } from '@/platform/cache/runtime-environment';

const instances = new Map<string, Cache>();
export function connectWebCache(environment: WebCacheEnvironment): Cache {
  const redisUrl = environment.WEB_CACHE_REDIS_URL?.trim();
  if (!redisUrl) throw new Error('WEB_CACHE_REDIS_URL is required for the Web container runtime');
  const normalizedUrl = assertRedisCacheUrl(redisUrl);
  const maxConnections = readRedisCacheMaxConnections(environment.WEB_CACHE_REDIS_MAX_CONNECTIONS);
  const timeoutMs = readRedisCacheTimeoutMs(environment.WEB_CACHE_REDIS_TIMEOUT_MS);
  const identity = `${normalizedUrl}:${maxConnections ?? 'default'}:${timeoutMs ?? 'default'}`;
  const existing = instances.get(identity);
  if (existing) return existing;
  const cache = createRedisCacheFromUrl(normalizedUrl, { keyPrefix: 'web:cache:', maxConnections, timeoutMs });
  instances.set(identity, cache);
  return cache;
}
