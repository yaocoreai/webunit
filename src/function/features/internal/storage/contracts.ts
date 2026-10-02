import { applicationError } from "@/function/common/app/error";
import { defineErrorContract } from "@/function/common/app/error-contract";
import { StorageCatalogNotFoundError } from "@/function/common/storage/catalog";
import { StorageUploadError } from "@/function/common/storage/upload-session";
import { StorageUploadTicketError } from "@/function/common/storage/upload-ticket";
import {
  defineAuthenticatedRouteContract,
  definePublicRouteContract,
} from "@/function/common/app/route-contract";
import { s, type AnySchema } from "@/function/common/app/schema";
import {
  storageCatalogBrowseInputSchema,
  storageCatalogSchema,
  storageDirectoryMutationSchema,
  storageEntrySchema,
  storageEntryTargetInputShape,
  storageObjectDeletedSchema,
  storageReadUrlInputShape,
  storageReadUrlSchema,
  storageRuntimeSchema,
  storageSignedPartSchema,
  storageUploadAbortedSchema,
  storageUploadCleanupSchema,
  storageUploadCreateInputSchema,
  storageUploadCreatedSchema,
  storageUploadPartSchema,
  storageUploadSessionAdminSchema,
  storageUploadSessionCredentialInputSchema,
  storageUploadSessionCredentialInputShape,
  storageUploadSessionListSchema,
  storageUploadStatusSchema,
} from "./schemas";

export const storageAccessDenied = defineErrorContract({
  code: "storage_access_denied",
  kind: "permission_denied",
  exposure: "public",
  message: "Storage access denied",
});
export const storageObjectNotFound = defineErrorContract({
  code: "storage_object_not_found",
  kind: "not_found",
  exposure: "public",
  message: "Storage object not found",
});
export const storageUploadSessionNotFound = defineErrorContract({
  code: "storage_upload_session_not_found",
  kind: "not_found",
  exposure: "authenticated",
  message: "Storage upload session not found",
});
export const storageUploadConflict = defineErrorContract({
  code: "storage_upload_conflict",
  kind: "conflict",
  exposure: "public",
  message: "Storage upload conflicts with its current state",
});
export const storageValidationFailed = defineErrorContract({
  code: "storage_validation_failed",
  kind: "invalid_argument",
  exposure: "public",
  message: "Invalid storage request",
});
export const storageReadUrlInvalid = defineErrorContract({
  code: "storage_read_url_invalid",
  kind: "permission_denied",
  exposure: "public",
  message: "Storage read URL is invalid",
});
export const storageReadUrlExpired = defineErrorContract({
  code: "storage_read_url_expired",
  kind: "permission_denied",
  exposure: "public",
  message: "Storage read URL has expired",
});
const errors = [
  storageAccessDenied,
  storageObjectNotFound,
  storageUploadSessionNotFound,
  storageUploadConflict,
  storageValidationFailed,
  storageReadUrlInvalid,
  storageReadUrlExpired,
] as const;

const admin = <const TInput extends AnySchema, const TOutput extends AnySchema>(
  input: TInput,
  output: TOutput,
) => defineAuthenticatedRouteContract(input, errors, output);
const publicContract = <const TInput extends AnySchema, const TOutput extends AnySchema>(
  input: TInput,
  output: TOutput,
) => definePublicRouteContract(input, errors, output);

export const readStorageRuntimeContract = admin(
  s.object({
    status: s.string().optional(),
    storageKey: s.string().optional(),
    limit: s.integer().min(1).max(200).optional(),
  }),
  storageRuntimeSchema,
);
export const listStorageUploadSessionsContract = admin(
  s.object({
    status: s.string().optional(),
    storageKey: s.string().optional(),
    limit: s.integer().min(1).max(200).optional(),
  }),
  storageUploadSessionListSchema,
);
export const readStorageUploadSessionContract = admin(
  s.object({ id: s.string().min(1) }),
  storageUploadSessionAdminSchema,
);
export const cleanupStorageUploadSessionContract = admin(
  s.object({ id: s.string().min(1), before: s.string().optional() }),
  storageUploadCleanupSchema,
);
export const browseStorageCatalogContract = admin(
  storageCatalogBrowseInputSchema,
  storageCatalogSchema,
);
export const readStorageCatalogObjectContract = admin(
  s.object({
    storageKey: s.string().min(1).optional(),
    objectKey: s.string().min(1),
  }),
  storageEntrySchema,
);
export const deleteStorageCatalogObjectContract = admin(
  s.object({
    storageKey: s.string().min(1).optional(),
    objectKey: s.string().min(1),
  }),
  storageObjectDeletedSchema,
);
export const updateStorageCatalogEntryContract = admin(
  s.object({
    ...storageEntryTargetInputShape,
    objectKey: s.string().min(1),
  }),
  storageEntrySchema,
);
export const copyStorageCatalogEntryContract = admin(
  s.object({
    ...storageEntryTargetInputShape,
    sourceObjectKey: s.string().min(1),
  }),
  storageEntrySchema,
);
export const createStorageDirectoryContract = admin(
  s.object({
    storageKey: s.string().min(1).optional(),
    mountKey: s.string().min(1).optional(),
    directory: s.string().optional(),
    name: s.string().trim().min(1).max(255),
    visibility: s.enum(["public", "private"] as const).optional(),
  }),
  storageEntrySchema,
);
export const renameStorageDirectoryContract = admin(
  s.object({
    storageKey: s.string().min(1).optional(),
    mountKey: s.string().min(1).optional(),
    sourceDirectory: s.string().min(1),
    targetDirectory: s.string().min(1),
  }),
  storageDirectoryMutationSchema,
);
export const deleteStorageDirectoryContract = admin(
  s.object({
    storageKey: s.string().min(1).optional(),
    mountKey: s.string().min(1).optional(),
    directory: s.string().min(1),
  }),
  storageDirectoryMutationSchema,
);
export const createStorageReadUrlContract = admin(
  s.object({
    ...storageReadUrlInputShape,
    deliveryPath: s.string().min(1),
  }),
  storageReadUrlSchema,
);
export const createStorageReadUrlsContract = admin(
  s.object({
    ...storageReadUrlInputShape,
    deliveryPaths: s.array(s.string().min(1)).min(1).max(50),
  }),
  s.array(storageReadUrlSchema),
);
export const listStorageMountsContract = admin(
  s.object({
    storageKey: s.string().min(1).optional(),
  }),
  s.object({
    mounts: s.array(
      s.object({
        key: s.string().min(1),
        label: s.string().min(1),
        kind: s.enum(["public", "site"] as const),
        siteId: s.string().uuid().optional(),
      }),
    ),
  }),
);
export const issueStorageUploadTicketContract = admin(
  s.object({
    storageKey: s.string().min(1).optional(),
    maxFileSize: s.integer().min(1).optional(),
    ttlSeconds: s.integer().min(1).max(3_600).optional(),
  }),
  s.object({
    token: s.string().min(1),
    expiresAt: s.string().datetime(),
  }),
);
export const createStorageUploadContract = publicContract(
  storageUploadCreateInputSchema,
  storageUploadCreatedSchema,
);
export const resumeStorageUploadContract = publicContract(
  storageUploadCreateInputSchema,
  storageUploadCreatedSchema,
);
export const completeStorageUploadContract = publicContract(
  s.object({
    ...storageUploadSessionCredentialInputShape,
    parts: s.array(storageUploadPartSchema).optional(),
  }),
  storageEntrySchema,
);
export const readStorageUploadStatusContract = publicContract(
  storageUploadSessionCredentialInputSchema,
  storageUploadStatusSchema,
);
export const signStorageUploadPartsContract = publicContract(
  s.object({
    ...storageUploadSessionCredentialInputShape,
    partNumbers: s.array(s.integer().min(1)).max(100).optional(),
  }),
  s.array(storageSignedPartSchema),
);
export const abortStorageUploadContract = publicContract(
  storageUploadSessionCredentialInputSchema,
  storageUploadAbortedSchema,
);
const storageFileResultSchema = s.object({
  type: s.literal("file"),
});
export const readSignedStorageContentContract = publicContract(
  s.object({
    deliveryPath: s.string().min(1),
    storageKey: s.string().min(1).optional(),
    visibility: s.enum(["public", "private"] as const),
    purpose: s.enum(["preview", "download", "share"] as const),
    disposition: s.enum(["inline", "attachment"] as const).optional(),
    expiresAt: s.string().datetime(),
    signature: s.string().min(1),
  }),
  storageFileResultSchema,
);
export const readPublicStorageContentContract = publicContract(
  s.object({
    deliveryPath: s.string().min(1),
    storageKey: s.string().min(1).optional(),
  }),
  storageFileResultSchema,
);
export const readStorageInstanceContentContract = publicContract(
  s.object({
    deliveryPath: s.string().min(1),
    storageKey: s.string().min(1),
  }),
  storageFileResultSchema,
);
export const storageUploadSessionNotFoundError = () =>
  applicationError(storageUploadSessionNotFound);
export const storageReadUrlInvalidError = () =>
  applicationError(storageReadUrlInvalid);
export const storageReadUrlExpiredError = () =>
  applicationError(storageReadUrlExpired);
export function mapStorageError(error: unknown) {
  if (error instanceof StorageUploadTicketError)
    return applicationError(storageAccessDenied, { cause: error });
  if (error instanceof StorageCatalogNotFoundError)
    return applicationError(storageObjectNotFound, { cause: error });
  if (error instanceof StorageUploadError)
    return applicationError(storageUploadConflict, { cause: error });
  if (error instanceof TypeError || error instanceof SyntaxError)
    return applicationError(storageValidationFailed, { cause: error });
  return undefined;
}
