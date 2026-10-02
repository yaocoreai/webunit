import type { ApplicationComposition } from "@/function/common/capabilities/resolver";
import type { RuntimePrimitives } from "@/function/common/capabilities/contracts";
import type { RouteMiddlewareRegistry } from "@/function/common/route/registry";
import type { RouteModule } from "@/function/common/route/module";
import type { FunctionHttpRouteManifestEntry } from "@/function/common/route/http";
import type {
  FunctionApplicationConfiguration,
  FunctionApplicationSecrets,
  FunctionRuntimeIdentity,
} from "./context";
import type { ExecutionEffects } from "./execution-effects";

export type FunctionApplicationHost = Readonly<{
  environment: Readonly<Record<string, unknown>>;
  identity: FunctionRuntimeIdentity;
  effects: ExecutionEffects;
}>;

export type FunctionApplicationDefinition = Readonly<{
  routes: Readonly<{
    modules: readonly RouteModule[];
    names: ReadonlySet<string>;
    http: readonly FunctionHttpRouteManifestEntry[];
    middleware: RouteMiddlewareRegistry;
    isAuthenticated(state: ReadonlyMap<string, unknown>): boolean;
  }>;
  createComposition(primitives: RuntimePrimitives): ApplicationComposition;
  createConfiguration(
    environment: Readonly<Record<string, unknown>>,
    identity: FunctionRuntimeIdentity,
  ): Readonly<{
    configuration: FunctionApplicationConfiguration;
    secrets: FunctionApplicationSecrets;
  }>;
  infrastructure: Readonly<{
    create(environment: Readonly<Record<string, unknown>>): RuntimePrimitives;
    close(): Promise<void>;
  }>;
}>;

export function defineFunctionApplication(
  definition: FunctionApplicationDefinition,
): FunctionApplicationDefinition {
  return Object.freeze({
    ...definition,
    routes: Object.freeze({ ...definition.routes }),
    infrastructure: Object.freeze({ ...definition.infrastructure }),
  });
}

export type {
  ApplicationMode,
  DeploymentKind,
  FunctionRuntimeIdentity,
} from "./context";
export type { ExecutionEffects as FunctionHostEffects } from "./execution-effects";
export { FunctionFailure } from "./failure";
export type { ApplicationErrorKind } from "./error-contract";
