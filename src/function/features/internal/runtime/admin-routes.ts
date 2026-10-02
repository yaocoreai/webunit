import { lazyOperations } from "@/function/common/route/operation-module";
import { defineRoute } from "@/function/common/route/definition";
import { runtimeOverviewContract } from "./contracts";

const operations = lazyOperations(() => import("./operations"));

export const routes = [
  defineRoute("admin.runtime.overview.read", {
    contract: runtimeOverviewContract,
    operation: operations("readRuntimeOverview"),
  }),
] as const;
