import { createServerCoreCapabilities } from '@/function/infrastructure/server/core-capabilities';
import type { RuntimePrimitives } from '@/function/common/capabilities/contracts';
import { createLazyCache, createLazyRateLimiter } from '@/function/common/capabilities/lazy';

const capabilitySets = new Map<string, RuntimePrimitives>();

export function createContainerCapabilities(
  environment: Readonly<Record<string, unknown>>,
) {
  if (environment.STORAGE_DRIVER !== undefined && environment.STORAGE_DRIVER !== '' && environment.STORAGE_DRIVER !== 's3') {
    throw new Error('Container runtime requires STORAGE_DRIVER=s3');
  }
  if (typeof environment.S3_ENDPOINT !== 'string' || !environment.S3_ENDPOINT.trim()) {
    throw new Error('S3_ENDPOINT is required by the Container runtime');
  }
  const redisUrl = requiredString(environment.FUNCTION_CACHE_REDIS_URL, 'FUNCTION_CACHE_REDIS_URL');
  const rateLimitRedisUrl = requiredString(environment.RATE_LIMIT_REDIS_URL, 'RATE_LIMIT_REDIS_URL');
  const identity = JSON.stringify({ environment });
  const existing = capabilitySets.get(identity);
  if (existing) return existing;
  const base = createServerCoreCapabilities(environment);
  const descriptors = Object.getOwnPropertyDescriptors(base) as Record<string, PropertyDescriptor>;
  const capabilities = Object.defineProperties({}, {
    ...descriptors,
    cache: {
      enumerable: true,
      value: createLazyCache(async () =>
        (await import('@/function/infrastructure/server/redis-cache')).createRedisCache(redisUrl),
      ),
    },
    rateLimiter: {
      enumerable: true,
      value: createLazyRateLimiter(async () =>
        (await import('@/function/infrastructure/server/redis-rate-limiter')).createRedisRateLimiter(rateLimitRedisUrl),
      ),
    },
  }) as RuntimePrimitives;
  capabilitySets.set(identity, capabilities);
  return capabilities;
}

function requiredString(value: unknown, name: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required by the Container runtime`);
  return value.trim();
}
