import { applicationUnavailableError } from "@/function/common/app/error";
import {
  defineDataCommand,
  defineDataQuery,
} from "@/function/common/app/operation";
import type { RouteContext } from "@/function/common/route/definition";
import * as contracts from "./contracts";

export const listEnumCatalogsQuery = defineDataQuery({
  contract: contracts.listEnumCatalogsContract,
  mapError: contracts.mapEnumError,
  execute: (context, input) =>
    requireEnums(context).listCatalogs(input.page, input.pageSize, {
      key: input.key,
      version: input.version,
      visibility: input.visibility,
    }),
});
export const readEnumCatalogQuery = defineDataQuery({
  contract: contracts.readEnumCatalogContract,
  mapError: contracts.mapEnumError,
  async execute(context, input) {
    const result = await requireEnums(context).listCatalogs(1, 100, {
      key: input.key,
    });
    return (
      result.items.find((item) => item.key === input.key) ??
      Promise.reject(contracts.enumNotFoundError())
    );
  },
});
export const updateEnumCatalogCommand = defineDataCommand({
  contract: contracts.updateEnumCatalogContract,
  mapError: contracts.mapEnumError,
  execute: (context, input) => requireEnums(context).setCatalog(input),
});
export const listPublicEnumQuery = defineDataQuery({
  contract: contracts.listPublicEnumContract,
  mapError: contracts.mapEnumError,
  execute: async (context, input) =>
    (await requireEnums(context).listPublic(
      input.key,
      input.parent,
      input.rootsOnly,
    )) ?? Promise.reject(contracts.enumNotFoundError()),
});
export const listEnumQuery = defineDataQuery({
  contract: contracts.listEnumContract,
  mapError: contracts.mapEnumError,
  execute: async (context, input) =>
    (await requireEnums(context).list(
      input.key,
      input.parent,
      input.rootsOnly,
    )) ?? Promise.reject(contracts.enumNotFoundError()),
});
function requireEnums(context: RouteContext) {
  const enums = context.services.getEnums();
  if (!enums) throw applicationUnavailableError();
  return enums;
}
