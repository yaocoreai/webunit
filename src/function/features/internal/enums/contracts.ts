import { applicationError } from "@/function/common/app/error";
import { defineErrorContract } from "@/function/common/app/error-contract";
import {
  EnumConflictError,
  EnumValidationError,
} from "@/function/common/enums/service";
import {
  defineAuthenticatedRouteContract,
  definePublicRouteContract,
} from "@/function/common/app/route-contract";
import { s } from "@/function/common/app/schema";

export type ListEnumInput = Readonly<{
  key: string;
  parent?: Readonly<{ key: string; code: string }>;
  rootsOnly?: boolean;
}>;
export type ListEnumCatalogsInput = Readonly<{
  page: number;
  pageSize: number;
  key?: string;
  version?: string;
  visibility?: "private" | "public";
}>;
export type UpdateEnumCatalogInput = Readonly<{
  key: string;
  version?: string;
  visibility?: "private" | "public";
  expectedRevision: number;
}>;

export const enumNotFound = defineErrorContract({
  code: "enum_not_found",
  kind: "not_found",
  exposure: "public",
  message: "Enum catalog not found",
});
export const invalidEnum = defineErrorContract({
  code: "invalid_enum",
  kind: "invalid_argument",
  exposure: "public",
  message: "Invalid enum request",
});
export const enumRevisionConflict = defineErrorContract({
  code: "enum_revision_conflict",
  kind: "conflict",
  exposure: "authenticated",
  message: "Enum catalog revision conflict",
});
const key = s.string().trim().min(1).max(64)
  .pattern(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/);
const listSchema = s.object({
    key,
    rootsOnly: s.boolean().optional(),
    parent: s.object({
        key,
        code: s.string().trim().min(1).max(128),
    }).optional(),
});
const enumIdentityOutputSchema = s.object({
  key: s.string(),
  code: s.string(),
});
const enumItemOutputSchema = s.object({
  key: s.string(),
  code: s.string(),
  label: s.string(),
  hasChildren: s.boolean().optional(),
  parent: enumIdentityOutputSchema.optional(),
});
const enumCatalogRecordOutputSchema = s.object({
  key: s.string(),
  version: s.string(),
  visibility: s.enum(["private", "public"] as const),
  revision: s.integer().min(1),
  updatedAt: s.string().nullable(),
});
const enumCatalogOutputSchema = s.object({
  key: s.string(),
  version: s.string(),
  visibility: s.enum(["private", "public"] as const),
  revision: s.integer().min(1),
  updatedAt: s.string().nullable(),
  items: s.array(enumItemOutputSchema),
});
const enumCatalogListOutputSchema = s.object({
  items: s.array(enumCatalogRecordOutputSchema),
  total: s.integer().min(0),
  page: s.integer().min(1),
  pageSize: s.integer().min(1),
});
export const listPublicEnumContract = definePublicRouteContract(
  listSchema,
  [enumNotFound, invalidEnum],
  enumCatalogOutputSchema,
);
export const listEnumContract = defineAuthenticatedRouteContract(
  listSchema,
  [enumNotFound, invalidEnum],
  enumCatalogOutputSchema,
);
export const listEnumCatalogsContract =
  defineAuthenticatedRouteContract(
    s.object({
      page: s.integer().min(1).default(1),
      pageSize: s.integer().min(1).max(100).default(20),
      key: key.optional(),
      version: s.string().trim().max(64).optional(),
      visibility: s.enum(["private", "public"] as const).optional(),
    }),
    [invalidEnum],
    enumCatalogListOutputSchema,
  );
export const readEnumCatalogContract = defineAuthenticatedRouteContract(
  s.object({ key }),
  [enumNotFound, invalidEnum],
  enumCatalogRecordOutputSchema,
);
export const updateEnumCatalogContract =
  defineAuthenticatedRouteContract(
    s.object({
        key,
        version: s.string().trim().min(1).max(64).optional(),
        visibility: s.enum(["private", "public"] as const).optional(),
        expectedRevision: s.integer().min(1),
    }),
    [invalidEnum, enumRevisionConflict],
    enumCatalogRecordOutputSchema,
  );

export const enumNotFoundError = () => applicationError(enumNotFound);
export function mapEnumError(error: unknown) {
  if (error instanceof EnumValidationError)
    return applicationError(invalidEnum, { cause: error });
  if (error instanceof EnumConflictError)
    return applicationError(enumRevisionConflict, { cause: error });
  return undefined;
}
