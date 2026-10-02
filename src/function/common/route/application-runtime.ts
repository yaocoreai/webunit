import type { FunctionScope } from "@/function/common/app/context";
import { resolveRouteFailure } from "@/function/common/app/failure";
import type {
  FunctionInvokeOptions,
  FunctionRequestContext,
  FunctionSession,
} from "@/function/common/app/entry";
import { createRouteDispatcher } from "@/function/common/route/dispatcher";
import {
  createLazyRouteRegistry,
  type RouteModule,
} from "@/function/common/route/module";
import type { RouteMiddlewareRegistry } from "@/function/common/route/registry";
import type { RouteExecutionLog } from "@/function/common/route/dispatcher";

export function createFunctionRouteRuntime(input: Readonly<{
  modules: readonly RouteModule[];
  names: ReadonlySet<string>;
  middleware: RouteMiddlewareRegistry;
  isAuthenticated(state: ReadonlyMap<string, unknown>): boolean;
  log?: (entry: RouteExecutionLog) => void;
}>) {
  const registry = createLazyRouteRegistry(input.modules, new Set(input.names));
  const dispatcher = createRouteDispatcher({
    routes: registry,
    middleware: input.middleware,
    ...(input.log ? { log: input.log } : {}),
  });
  return Object.freeze({
    has(name: string) {
      return registry.has(name);
    },
    createSession(
      scope: FunctionScope,
      context: FunctionRequestContext,
      defaults: Readonly<{
        requestId?: string;
        signal?: AbortSignal;
      }> = {},
    ): FunctionSession {
      const requestState = new Map<string, unknown>();
      const requestId = defaults.requestId ?? crypto.randomUUID();
      return Object.freeze({
        async invoke(name, routeInput, options: FunctionInvokeOptions = {}) {
          try {
            return await dispatcher.invoke(name, routeInput, scope, {
              ...options,
              requestId,
              signal: options.signal ?? defaults.signal,
              requestContext: context,
              requestState,
            });
          } catch (error) {
            throw resolveRouteFailure(error, input.isAuthenticated(requestState));
          }
        },
      });
    },
  });
}
