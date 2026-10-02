import type { RouteDefinition } from "./definition";
import type { RouteRegistry } from "./registry";
import { memoizeAsync } from "../lazy/promise";
import { createReadonlyRegistry, type ReadonlyRegistry } from "../registry";
import {
  assertNamespaceKey,
  namespaceBelongsTo,
  type NamespaceKey,
} from "../namespace/grammar";
import { findLongestNamespace } from "../namespace/matcher";
import { parseRouteName } from "./name";

export type RouteModuleSource = Readonly<{
  routes: readonly RouteDefinition[];
}>;

export type RouteModule = Readonly<{
  key: NamespaceKey;
  load(): Promise<readonly RouteDefinition[]>;
}>;

export type RouteNameMembership = ReadonlySet<string>;

export function defineRouteModule(
  key: NamespaceKey,
  loader: () => Promise<RouteModuleSource>,
): RouteModule {
  assertNamespaceKey(key, "Route Module key");
  const load = memoizeAsync(async () => (await loader()).routes);
  return Object.freeze({ key, load });
}

export function defineRouteModules(
  modules: readonly RouteModule[],
): readonly RouteModule[] {
  indexModules(modules);
  return Object.freeze([...modules]);
}

export async function loadRouteModuleDefinitions(
  modules: readonly RouteModule[],
) {
  const modulesByKey = indexModules(modules);
  const loaded = await Promise.all(
    modules.map(async (module) => ({ module, routes: await module.load() })),
  );
  const names = new Set<string>();
  for (const { module, routes } of loaded) {
    if (!routes.length)
      throw new TypeError(`Route Module must declare at least one Route: ${module.key}`);
    for (const route of routes) {
      if (names.has(route.name)) throw new TypeError(`Duplicate Route name: ${route.name}`);
      names.add(route.name);
      assertRouteOwnership(route.name, module, modulesByKey);
    }
  }
  return Object.freeze(loaded);
}

export async function loadRouteDefinitions(modules: readonly RouteModule[]) {
  const loaded = await loadRouteModuleDefinitions(modules);
  return Object.freeze(loaded.flatMap(({ routes }) => routes));
}

export function createLazyRouteRegistry(
  modules: readonly RouteModule[],
  names: RouteNameMembership,
): RouteRegistry {
  const modulesByKey = indexModules(modules);
  const expectedByModule = new Map<NamespaceKey, string[]>();
  for (const name of names) {
    const parsed = parseRouteName(name);
    if (!parsed) throw new TypeError(`Invalid Route name in runtime manifest: ${name}`);
    const module = findLongestNamespace(parsed.namespace, modulesByKey);
    if (!module) throw new TypeError(`Route has no namespace Module: ${name}`);
    const expected = expectedByModule.get(module.key) ?? [];
    expected.push(name);
    expectedByModule.set(module.key, expected);
  }

  const loaders = new Map<
    NamespaceKey,
    () => Promise<ReadonlyRegistry<RouteDefinition>>
  >();
  const load = (module: RouteModule) => {
    let loader = loaders.get(module.key);
    if (!loader) {
      loader = memoizeAsync(async () => {
        const routes = await module.load();
        if (!routes.length)
          throw new TypeError(`Route Module must declare at least one Route: ${module.key}`);
        const entries: Array<readonly [string, RouteDefinition]> = [];
        for (const route of routes) {
          assertRouteOwnership(route.name, module, modulesByKey);
          if (!names.has(route.name))
            throw new TypeError(
              `Route Module output does not match generated manifest: ${route.name} -> ${module.key}`,
            );
          entries.push([route.name, route]);
        }
        const registry = createReadonlyRegistry(
          entries,
          `Route in Module ${module.key}`,
        );
        const expected = expectedByModule.get(module.key) ?? [];
        if (
          registry.size !== expected.length ||
          expected.some((name) => !registry.has(name))
        ) throw new TypeError(`Route Module output is incomplete: ${module.key}`);
        return registry;
      });
      loaders.set(module.key, loader);
    }
    return loader();
  };

  return Object.freeze({
    has(name: string) {
      return names.has(name);
    },
    async resolve(name: string) {
      if (!names.has(name)) return undefined;
      const parsed = parseRouteName(name);
      if (!parsed) return undefined;
      const module = findLongestNamespace(parsed.namespace, modulesByKey);
      if (!module) return undefined;
      return (await load(module)).get(name);
    },
  });
}

function indexModules(modules: readonly RouteModule[]) {
  const entries = new Map<NamespaceKey, RouteModule>();
  for (const module of modules) {
    assertNamespaceKey(module.key, "Route Module key");
    if (entries.has(module.key))
      throw new TypeError(`Duplicate Route Module key: ${module.key}`);
    entries.set(module.key, module);
  }
  return entries;
}

function assertRouteOwnership(
  name: string,
  module: RouteModule,
  modulesByKey: ReadonlyMap<NamespaceKey, RouteModule>,
) {
  const parsed = parseRouteName(name);
  if (!parsed) throw new TypeError(`Invalid Route name: ${name}`);
  if (!namespaceBelongsTo(parsed.namespace, module.key))
    throw new TypeError(
      `Route is outside Module namespace: ${name} -> ${module.key}`,
    );
  if (findLongestNamespace(parsed.namespace, modulesByKey) !== module)
    throw new TypeError(
      `Route does not resolve to its declared Module namespace: ${name} -> ${module.key}`,
    );
}
