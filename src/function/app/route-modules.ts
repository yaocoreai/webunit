import {
  defineRouteModule,
  defineRouteModules,
} from "@/function/common/route/module";

export const appRouteModules = defineRouteModules([
  defineRouteModule("runtime.overview", () => import("@/function/features/internal/runtime/admin-routes")),
  defineRouteModule("runtime.health", () => import("@/function/features/internal/runtime/public-routes")),
  defineRouteModule("config", () => import("@/function/features/internal/config/routes")),
  defineRouteModule("enums", () => import("@/function/features/internal/enums/routes")),
  defineRouteModule("storage", () => import("@/function/features/internal/storage/routes")),
]);
