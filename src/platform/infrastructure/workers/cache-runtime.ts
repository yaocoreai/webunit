import type { Cache } from '@/platform/cache';
import { createKvCache, isKvCacheBinding, type KvCacheBinding } from '@/platform/infrastructure/workers/cache';
import type { WebCacheEnvironment } from '@/platform/cache/runtime-environment';

const instances = new WeakMap<KvCacheBinding, Cache>();

export function connectWebCache(
  _environment: WebCacheEnvironment,
  runtimeBindings?: Readonly<Record<string, unknown>>,
): Cache {
  const binding = runtimeBindings?.WEB_CACHE;
  if (!isKvCacheBinding(binding)) throw new Error('WEB_CACHE KV binding is required for the Astro SSR Workers runtime');
  const existing = instances.get(binding);
  if (existing) return existing;
  const cache = createKvCache(binding);
  instances.set(binding, cache);
  return cache;
}
