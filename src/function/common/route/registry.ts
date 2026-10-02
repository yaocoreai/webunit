import type { RouteDefinition, RouteMiddleware } from './definition';
import { createReadonlyRegistry, type ReadonlyRegistry } from '../registry';

export type RouteRegistry = Readonly<{
  has(name: string): boolean;
  resolve(name: string): Promise<RouteDefinition | undefined>;
}>;
export type RouteMiddlewareRegistry = ReadonlyRegistry<RouteMiddleware>;

export function createRouteRegistry(routes: readonly RouteDefinition[]): RouteRegistry {
  const registry = new Map<string, RouteDefinition>();
  for (const route of routes) {
    if (registry.has(route.name)) throw new TypeError(`Duplicate Route name: ${route.name}`);
    registry.set(route.name, route);
  }
  return Object.freeze({
    has: (name: string) => registry.has(name),
    resolve: async (name: string) => registry.get(name),
  });
}

export function defineRouteMiddleware(
  entries: readonly (readonly [string, RouteMiddleware])[],
): RouteMiddlewareRegistry {
  return createReadonlyRegistry(entries, 'Route middleware');
}
