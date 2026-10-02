import { createAppCapabilityDefinitions } from "@/function/app/capabilities";
import {
  appMiddleware,
  appRouteAuthentication,
} from "@/function/app/middleware";
import { appRouteModules } from "@/function/app/route-modules";
import {
  functionHttpRoutes,
  functionRouteNames,
} from "@/function/bootstrap/generated/route/manifest";
import {
  createApplicationCompositionResolver,
  createApplicationServicesResolver,
} from "@/function/common/capabilities/resolver";
import { defineFunctionApplication } from "@/function/common/app/application";
import { createFunctionEntry } from "@/function/common/app/entry";
import {
  closeFunctionInfrastructure,
  createFunctionRuntimePrimitives,
} from "@/function/infrastructure/runtime";
import { createAppRuntimePolicy } from "./runtime-policy";

export const appCapabilityDefinitions = createAppCapabilityDefinitions();
export const createAppComposition = createApplicationCompositionResolver(
  appCapabilityDefinitions,
);
export const createAppServices = createApplicationServicesResolver(
  appCapabilityDefinitions,
);

export const functionApplication = defineFunctionApplication({
  routes: {
    modules: appRouteModules,
    names: functionRouteNames,
    http: functionHttpRoutes,
    middleware: appMiddleware,
    isAuthenticated: appRouteAuthentication,
  },
  createComposition: createAppComposition,
  createConfiguration: createAppRuntimePolicy,
  infrastructure: {
    create: createFunctionRuntimePrimitives,
    close: closeFunctionInfrastructure,
  },
});

export const functionEntry = createFunctionEntry(functionApplication);
export const createAppFunctionRuntime = functionEntry.create;
export const startAppFunctionWorkerRuntime = functionEntry.startWorker;
export const createFunctionScope = functionEntry.createScope;
export const createFunctionRuntimeScope = functionEntry.createRuntimeScope;
