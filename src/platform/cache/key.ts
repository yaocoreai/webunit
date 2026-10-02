const cacheKeyPattern = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/;

export const defaultNamespace = 'default';

export type CacheKeyInput = string | Readonly<{
  namespace?: string;
  key: string;
}>;

export function assertCacheKey(key: string): string {
  const normalized = key.trim();
  if (normalized.length > 384 || !cacheKeyPattern.test(normalized)) {
    throw new Error(`Invalid cache key: ${key}`);
  }
  return normalized;
}

export function assertNamespace(namespace: string | undefined): string {
  const normalized = (namespace ?? defaultNamespace).trim();
  if (normalized.length > 64 || !cacheKeyPattern.test(normalized)) {
    throw new Error(`Invalid namespace: ${namespace}`);
  }
  return normalized;
}

export function resolveCacheKey(input: CacheKeyInput): string {
  const identity = typeof input === 'string' ? { key: input } : input;
  const namespace = assertNamespace(identity.namespace);
  return `${namespace.length}:${namespace}:${assertCacheKey(identity.key)}`;
}
