import { lazyOperations } from "@/function/common/route/operation-module";
import { defineRoute } from "@/function/common/route/definition";
import { runtimeHealthContract } from "./contracts";

const operations = lazyOperations(() => import("./operations"));

export const routes = [
  defineRoute("public.runtime.health.read", {
    contract: runtimeHealthContract,
    operation: operations("readHealth"),
  }),
] as const;
