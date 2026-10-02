import { cache } from 'cloudflare:workers';
import type { FunctionHostEffects as ExecutionEffects } from "@/function/common/app/application";

export const purgeResponseCache: ExecutionEffects['purgeResponseCache'] = async (input) => {
  const result = await cache.purge({
    ...(input.tags?.length ? { tags: [...input.tags] } : {}),
    ...(input.pathPrefixes?.length ? { pathPrefixes: [...input.pathPrefixes] } : {}),
  });
  if (!result.success) {
    throw new Error(`Workers response cache purge failed: ${result.errors.map((error) => `${error.code}:${error.message}`).join(', ')}`);
  }
};
