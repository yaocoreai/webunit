import { rateLimitMiddleware } from "@/function/common/route/middleware";
import { defineRouteMiddleware } from "@/function/common/route/registry";
import { isRouteAuthenticated } from "@/function/common/route/authentication";

export const appMiddleware = defineRouteMiddleware([
  ["rate", rateLimitMiddleware],
]);

export const appRouteAuthentication = isRouteAuthenticated;
