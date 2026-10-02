import { defineRoute } from "@/function/common/route/definition";
import { lazyOperations } from "@/function/common/route/operation-module";
import * as contracts from "./contracts";

const operations = lazyOperations(() => import("./operations"));
export const routes = [
  defineRoute("public.enums.values.list", {
    contract: contracts.listPublicEnumContract,
    operation: operations("listPublicEnumQuery"),
  }),
  defineRoute("admin.enums.catalog.list", {
    contract: contracts.listEnumCatalogsContract,
    operation: operations("listEnumCatalogsQuery"),
  }),
  defineRoute("admin.enums.catalog.read", {
    contract: contracts.readEnumCatalogContract,
    operation: operations("readEnumCatalogQuery"),
  }),
  defineRoute("admin.enums.catalog.update", {
    contract: contracts.updateEnumCatalogContract,
    operation: operations("updateEnumCatalogCommand"),
  }),
  defineRoute("admin.enums.values.list", {
    contract: contracts.listEnumContract,
    operation: operations("listEnumQuery"),
  }),
] as const;
