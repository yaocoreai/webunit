import type { AnySchema } from "../app/schema";
import type { ReadonlyRegistry } from "../registry";
import type { RouteDefinition, RouteMiddleware } from "./definition";

export type CompiledRoute = Readonly<{
  definition: RouteDefinition;
  middleware: readonly RouteMiddleware[];
  httpExposed: boolean;
}>;

export function compileRoute(
  definition: RouteDefinition,
  registry: ReadonlyRegistry<RouteMiddleware>,
): CompiledRoute {
  validateContract(definition);
  const middleware = Object.freeze(
    definition.middleware.map((reference) => {
      if (typeof reference === "function") return reference;
      const resolved = registry.get(reference);
      if (!resolved)
        throw new TypeError(`Unknown Route middleware: ${reference}`);
      return resolved;
    }),
  );
  return Object.freeze({
    definition,
    middleware,
    httpExposed: definition.surface !== "internal",
  });
}

function validateContract(route: RouteDefinition) {
  if (
    !isSchema(route.contract.input) ||
    !isSchema(route.contract.output)
  )
    throw new TypeError(`Invalid Route Contract schema: ${route.name}`);
  const codes = route.contract.errors.map((error) => error.code);
  if (new Set(codes).size !== codes.length)
    throw new TypeError(`Duplicate Route Contract error code: ${route.name}`);
}

function isSchema(value: unknown): value is AnySchema {
  return Boolean(
    value &&
    typeof value === "object" &&
    "node" in value &&
    value.node &&
    typeof value.node === "object" &&
    "safeParse" in value &&
    typeof value.safeParse === "function",
  );
}
