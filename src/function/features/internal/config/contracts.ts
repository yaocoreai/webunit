import { applicationError } from "@/function/common/app/error";
import { defineErrorContract } from "@/function/common/app/error-contract";
import {
  defineAuthenticatedRouteContract,
  definePublicRouteContract,
} from "@/function/common/app/route-contract";
import { s, type JsonValue } from "@/function/common/app/schema";
import { configRecordSchema } from "@/function/common/config/record-schema";

export type ConfigKeyInput = Readonly<{ namespace: string; key: string }>;
export type SetConfigInput = ConfigKeyInput &
  Readonly<{ value: JsonValue; visibility?: "private" | "public" }>;
export type ListConfigInput = Readonly<{
  namespace?: string;
  key?: string;
  visibility?: "private" | "public";
  page: number;
  pageSize: number;
}>;

export const configNotFound = defineErrorContract({
  code: "config_not_found",
  kind: "not_found",
  exposure: "public",
  message: "Config record not found",
});
export const invalidConfig = defineErrorContract({
  code: "invalid_config",
  kind: "invalid_argument",
  exposure: "authenticated",
  message: "Invalid config value",
});

const keyProperties = {
  namespace: s.string().trim().min(1).max(64),
  key: s.string().trim().min(1).max(240),
} as const;
const keySchema = s.object(keyProperties);
const configListOutputSchema = s.object({
  items: s.array(configRecordSchema),
  total: s.integer().min(0),
  page: s.integer().min(1),
  pageSize: s.integer().min(1),
});
const configDeletedOutputSchema = s.object({ deleted: s.literal(true) });

export const readPublicConfigContract =
  definePublicRouteContract(
    keySchema,
    [configNotFound],
    configRecordSchema,
  );
export const listConfigContract =
  defineAuthenticatedRouteContract(s.object({
    namespace: keyProperties.namespace.optional(),
    key: keyProperties.key.optional(),
    visibility: s.enum(["private", "public"] as const).optional(),
    page: s.integer().min(1).default(1),
    pageSize: s.integer().min(1).max(100).default(20),
  }), [], configListOutputSchema);
export const readConfigContract =
  defineAuthenticatedRouteContract(
    keySchema,
    [configNotFound],
    configRecordSchema,
  );
export const updateConfigContract =
  defineAuthenticatedRouteContract(
    s.object({
        ...keyProperties,
        value: s.json(),
        visibility: s.enum(["private", "public"] as const).optional(),
    }),
    [invalidConfig],
    configRecordSchema,
  );
export const deleteConfigContract = defineAuthenticatedRouteContract(
  keySchema,
  [configNotFound],
  configDeletedOutputSchema,
);

export const configNotFoundError = () => applicationError(configNotFound);
export function mapConfigError(error: unknown) {
  if (
    error instanceof SyntaxError ||
    (error instanceof Error && error.message.startsWith("Invalid config"))
  )
    return applicationError(invalidConfig, {
      cause: error,
      debugMessage: error instanceof Error ? error.message : undefined,
    });
  return undefined;
}
