import { applicationUnavailableError } from "@/function/common/app/error";
import {
  defineDataCommand,
  defineDataQuery,
} from "@/function/common/app/operation";
import type { RouteContext } from "@/function/common/route/definition";
import * as contracts from "./contracts";

export const listConfigQuery = defineDataQuery({
  contract: contracts.listConfigContract,
  mapError: contracts.mapConfigError,
  execute: (context, input) => resolve(context).list(input),
});
export const readConfigQuery = defineDataQuery({
  contract: contracts.readConfigContract,
  mapError: contracts.mapConfigError,
  execute: async (context, input) =>
    (await resolve(context).get(input.namespace, input.key)) ??
    Promise.reject(contracts.configNotFoundError()),
});
export const readPublicConfigQuery = defineDataQuery({
  contract: contracts.readPublicConfigContract,
  mapError: contracts.mapConfigError,
  execute: async (context, input) =>
    (await resolve(context).getPublic(input.namespace, input.key)) ??
    Promise.reject(contracts.configNotFoundError()),
});
export const updateConfigCommand = defineDataCommand({
  contract: contracts.updateConfigContract,
  mapError: contracts.mapConfigError,
  execute: (context, input) =>
    resolve(context).set(input.namespace, input.key, {
      value: input.value,
      ...(input.visibility ? { visibility: input.visibility } : {}),
    }),
});
export const deleteConfigCommand = defineDataCommand({
  contract: contracts.deleteConfigContract,
  mapError: contracts.mapConfigError,
  async execute(context, input) {
    if (!(await resolve(context).delete(input.namespace, input.key)))
      throw contracts.configNotFoundError();
    return { deleted: true as const };
  },
});

function resolve(context: RouteContext) {
  const config = context.services.getConfig();
  if (!config) throw applicationUnavailableError();
  return config;
}
