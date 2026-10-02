import type { PublicContentApi } from '@/platform/theme/content/public';
import type { Cache } from '@/platform/cache';

export type WebRuntime = Readonly<{
  domainHost: string;
  locale: string;
  content: PublicContentApi;
  cache: Cache;
}>;
const runtimeKey = Symbol('platform.web-runtime');
type RuntimeLocals = { [runtimeKey]?: WebRuntime };

export function bindRuntime(locals: object, runtime: WebRuntime) {
  Object.defineProperty(locals, runtimeKey, { configurable: false, enumerable: false, value: runtime, writable: false });
}

export function useRuntime(locals: object): WebRuntime {
  const runtime = (locals as RuntimeLocals)[runtimeKey];
  if (!runtime) throw new Error('WebRuntime is not bound to Astro.locals');
  return runtime;
}
