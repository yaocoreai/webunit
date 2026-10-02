import {
  createFunctionHttpInvoker,
} from "@/function/common/route/http-runtime";
import type { FunctionScope } from "@/function/common/app/context";
import { resolveRouteFailure } from "@/function/common/app/failure";
import { isRouteAuthenticated } from "@/function/common/route/authentication";
import { appMiddleware } from "@/function/app/middleware";
import { appRouteModules } from "@/function/app/route-modules";
import {
  functionHttpRoutes,
  functionRouteNames,
} from "@/function/bootstrap/generated/route/manifest";
import { createFunctionRouteRuntime } from "@/function/common/route/application-runtime";
import type { RouteDefinition } from "@/function/common/route/definition";
import type { RouteDispatcher } from "@/function/common/route/dispatcher";
import type { FunctionHttpRouteManifestEntry } from "@/function/common/route/http";
import { createFunctionHttpGateway } from "@/platform/function/http/gateway";

const appRouteRuntime = createFunctionRouteRuntime({
  modules: appRouteModules,
  names: functionRouteNames,
  middleware: appMiddleware,
  isAuthenticated: isRouteAuthenticated,
});
const invokeAppFunctionHttp = createFunctionHttpInvoker(
  functionHttpRoutes,
  (scope, context, defaults) =>
    appRouteRuntime.createSession(scope, context, defaults),
);

export function createTestFunctionHttpGateway(
  scope: FunctionScope,
  custom?: Readonly<{
    routes: readonly RouteDefinition[];
    dispatcher: RouteDispatcher;
  }>,
) {
  const invokeHttp = custom
    ? createFunctionHttpInvoker(
        custom.routes
          .filter((route) => route.surface !== "internal")
          .map(toHttpManifestEntry),
        (_scope, context, defaults) => {
          const requestState = new Map<string, unknown>();
          return Object.freeze({
            async invoke(name, input, options = {}) {
              try {
                return await custom.dispatcher.invoke(name, input, scope, {
                  ...options,
                  requestId: defaults.requestId,
                  signal: options.signal ?? defaults.signal,
                  requestContext: context,
                  requestState,
                });
              } catch (error) {
                throw resolveRouteFailure(
                  error,
                  isRouteAuthenticated(requestState),
                );
              }
            },
          });
        },
      )
    : invokeAppFunctionHttp;
  return createFunctionHttpGateway({
    routes: Object.freeze({
      invokeHttp: (request: Request) => invokeHttp(request, scope),
    }),
  });
}

function toHttpManifestEntry(route: RouteDefinition): FunctionHttpRouteManifestEntry {
  const declared = route.getSpec<import("@/function/common/route/http").FunctionHttpRouteSpec>("http");
  return Object.freeze({
    name: route.name,
    method: declared?.method ?? "POST",
    path: declared?.path ?? `/${route.name.replaceAll(".", "/")}`,
    input: declared?.input ?? "json",
    response: route.getSpec("response-stream")
      ? "stream"
      : route.getSpec("response-file")
        ? "file"
        : "data",
  });
}
