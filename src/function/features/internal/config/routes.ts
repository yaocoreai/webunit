import { defineRoute } from "@/function/common/route/definition";
import { lazyOperations } from "@/function/common/route/operation-module";
import * as contracts from "./contracts";

const operations = lazyOperations(() => import("./operations"));

export const routes = [
  defineRoute("public.config.record.read", {
    contract: contracts.readPublicConfigContract,
    operation: operations("readPublicConfigQuery"),
  }),
  defineRoute("admin.config.record.list", {
    contract: contracts.listConfigContract,
    operation: operations("listConfigQuery"),
  }),
  defineRoute("admin.config.record.read", {
    contract: contracts.readConfigContract,
    operation: operations("readConfigQuery"),
  }),
  defineRoute("admin.config.record.update", {
    contract: contracts.updateConfigContract,
    operation: operations("updateConfigCommand"),
  }),
  defineRoute("admin.config.record.delete", {
    contract: contracts.deleteConfigContract,
    operation: operations("deleteConfigCommand"),
  }),
] as const;
