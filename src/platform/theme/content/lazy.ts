import type { ModuleEntry, PublicContentApi, ResourceAccessor } from './public';

export function createLazyPublicContent(load: () => Promise<PublicContentApi>, wait = <T>(operation: Promise<T>) => operation): PublicContentApi {
  const memo = new Map<string, Promise<unknown>>();
  const once = <T>(key: string, operation: () => Promise<T>) => {
    const cached = memo.get(key) as Promise<T> | undefined;
    if (cached) return cached;
    const pending = operation();
    memo.set(key, pending);
    pending.catch(() => memo.delete(key));
    return pending;
  };
  const resource = <T>(key: 'asset' | 'menu'): ResourceAccessor<T> => (async (ids: string | readonly string[]) => {
    const cacheKey = JSON.stringify([key, ids]);
    return once(cacheKey, async () => {
      const accessor = (await load())[key] as ResourceAccessor<T>;
      return wait(accessor(ids as string)) as never;
    }) as never;
  }) as ResourceAccessor<T>;
  return {
    asset: resource('asset'),
    menu: resource('menu'),
    module<TEntry extends ModuleEntry = ModuleEntry>(key: string) {
      const query = <T>(operation: string, input: unknown, execute: () => Promise<T>) => once(JSON.stringify(['module', key, operation, input]), execute);
      return {
        findOne: (input) => query('findOne', input, async () => wait((await load()).module<TEntry>(key).findOne(input))),
        findFirst: (input) => query('findFirst', input, async () => wait((await load()).module<TEntry>(key).findFirst(input))),
        findMany: (input) => query('findMany', input, async () => wait((await load()).module<TEntry>(key).findMany(input))),
        count: (input) => query('count', input, async () => wait((await load()).module<TEntry>(key).count(input))),
        aggregate: (input) => query('aggregate', input, async () => wait((await load()).module<TEntry>(key).aggregate(input))),
      };
    },
  };
}
