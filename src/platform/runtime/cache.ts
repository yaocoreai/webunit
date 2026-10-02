import type { WebCacheEnvironment } from '@/platform/cache/runtime-environment';
import { connectWebCache as connectNodeCache } from '@/platform/infrastructure/node/cache-runtime';

export function connectWebCache(
  environment: WebCacheEnvironment,
  _runtimeBindings?: Readonly<Record<string, unknown>>,
) {
  return connectNodeCache(environment);
}
