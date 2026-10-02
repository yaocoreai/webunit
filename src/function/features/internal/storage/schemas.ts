import { s } from "@/function/common/app/schema";

const identifier = s.string().trim().min(1).max(512);
const timestamp = s.string().min(1);
const visibility = s.enum(["public", "private"] as const);
const assetType = s.enum([
  "binary",
  "image",
  "video",
  "audio",
  "document",
] as const);
const uploadMode = s.enum(["single", "multipart"] as const);
const uploadStatus = s.enum([
  "pending",
  "cleanup_pending",
  "completed",
  "aborted",
] as const);
const signedHeaders = s.record(s.string(), s.string()).optional();

export const storageEntrySchema = s.object({
  id: identifier,
  storageKey: identifier,
  entryKind: s.enum(["directory", "file"] as const),
  objectKey: identifier.nullable(),
  mountKey: identifier,
  logicalPath: s.string(),
  deliveryPath: s.string().nullable(),
  visibility: visibility.nullable(),
  assetType: assetType.nullable(),
  assetState: s.string().nullable(),
  contentType: s.string().nullable(),
  size: s.integer().min(0).nullable(),
  checksumSha256: s.string().nullable(),
  etag: s.string().nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const storageCatalogSchema = s.object({
  directory: s.string(),
  items: s.array(storageEntrySchema),
});

export const storageDirectoryMutationSchema = s.object({
  storageKey: identifier,
  mountKey: identifier,
  path: s.string(),
  affectedCount: s.integer().min(0),
  physicalDeleteFailedCount: s.integer().min(0).optional(),
});

export const storageObjectDeletedSchema = s.object({
  objectKey: identifier,
  deleted: s.literal(true),
});

export const storageReadUrlSchema = s.object({
  deliveryPath: s.string(),
  disposition: s.enum(["inline", "attachment"] as const),
  expiresAt: timestamp,
  purpose: s.enum(["preview", "download", "share"] as const),
  url: s.string().min(1),
});

export const storageUploadPartSchema = s.object({
  partNumber: s.integer().min(1),
  etag: s.string().min(1),
});

export const storageSignedPartSchema = s.object({
  partNumber: s.integer().min(1),
  method: s.literal("PUT"),
  url: s.string().min(1),
  headers: signedHeaders,
});

export const storageUploadSessionShape = {
  id: identifier,
  storageKey: identifier,
  objectKey: identifier,
  mountKey: identifier,
  logicalPath: s.string(),
  deliveryPath: s.string(),
  assetType,
  contentType: s.string().min(1),
  transport: s.literal("direct"),
  uploadMode,
  sizeBytes: s.integer().min(0).nullable(),
  checksumSha256: s.string().nullable(),
  partSize: s.integer().min(1).nullable(),
  visibility,
  status: uploadStatus,
  expiresAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
} as const;

export const storageUploadSessionSchema = s.object(storageUploadSessionShape);

const singleUploadTargetSchema = s.object({
  mode: s.literal("single"),
  method: s.literal("PUT"),
  url: s.string().min(1),
  headers: signedHeaders,
});
const multipartUploadTargetSchema = s.object({
  mode: s.literal("multipart"),
  uploadId: identifier,
  partSize: s.integer().min(1),
  parts: s.array(storageSignedPartSchema),
});

export const storageUploadCreatedSchema = s.object({
  ...storageUploadSessionShape,
  sessionKey: s.string().min(1),
  upload: s.discriminatedUnion("mode", {
    single: singleUploadTargetSchema,
    multipart: multipartUploadTargetSchema,
  }),
});

export const storageUploadStatusSchema = s.object({
  ...storageUploadSessionShape,
  uploadedParts: s.array(storageUploadPartSchema),
  nextPartNumbers: s.array(s.integer().min(1)),
});

export const storageUploadSessionAdminSchema = s.object({
  id: identifier,
  ticketId: s.string().nullable().optional(),
  storageKey: identifier,
  objectKey: identifier.optional(),
  mountKey: identifier,
  logicalPath: s.string(),
  deliveryPath: s.string(),
  assetType: s.string().optional(),
  contentType: s.string().optional(),
  transport: s.string().optional(),
  uploadMode,
  sizeBytes: s.integer().min(0).nullable(),
  checksumSha256: s.string().nullable().optional(),
  partSize: s.integer().min(1).nullable().optional(),
  visibility,
  status: uploadStatus,
  expiresAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const storageRuntimeSchema = s.object({
  available: s.boolean(),
  checkedAt: timestamp,
  summary: s.object({
    objects: s.integer().min(0),
    bytes: s.integer().min(0),
    entries: s.integer().min(0),
    files: s.integer().min(0),
    folders: s.integer().min(0),
    uploadSessions: s.integer().min(0),
    pending: s.integer().min(0),
    expiredPending: s.integer().min(0),
  }),
  byStatus: s.array(s.object({
    status: s.string(),
    count: s.integer().min(0),
  })),
  sessions: s.array(storageUploadSessionAdminSchema),
});

export const storageUploadSessionListSchema = s.object({
  items: s.array(storageUploadSessionAdminSchema),
  limit: s.integer().min(1).max(200),
});

export const storageUploadCleanupSchema = s.object({ cleaned: s.boolean() });

export const storageUploadAbortedSchema = storageUploadSessionSchema;

export const storageUploadCreateInputSchema = s.object({
  ticket: s.string().min(1),
  storageKey: identifier.optional(),
  mountKey: identifier.optional(),
  logicalPath: s.string().min(1),
  deliveryPath: s.string().min(1).optional(),
  deliveryPathConflict: s.enum(["error", "random-suffix"] as const).optional(),
  visibility: visibility.optional(),
  assetType: assetType.optional(),
  contentType: s.string().min(1).optional(),
  sizeBytes: s.integer().min(0).optional(),
  checksumSha256: s.string().pattern(/^[a-fA-F0-9]{64}$/).optional(),
  uploadMode: s.enum(["auto", "single", "multipart"] as const).optional(),
  expiresAt: timestamp.optional(),
});

export const storageUploadSessionCredentialInputShape = {
  id: identifier,
  sessionKey: s.string().min(1),
} as const;

export const storageUploadSessionCredentialInputSchema = s.object(
  storageUploadSessionCredentialInputShape,
);

export const storageCatalogBrowseInputSchema = s.object({
  storageKey: identifier.optional(),
  mountKey: identifier.optional(),
  directory: s.string().optional(),
  keyword: s.string().optional(),
  visibility: s.enum(["all", "public", "private"] as const).optional(),
  limit: s.integer().min(1).max(500).optional(),
});

export const storageEntryTargetInputShape = {
  storageKey: identifier.optional(),
  mountKey: identifier.optional(),
  logicalPath: s.string().min(1).optional(),
  directory: s.string().optional(),
  filename: s.string().min(1).optional(),
  deliveryPath: s.string().min(1).optional(),
  deliveryPathConflict: s.enum(["error", "random-suffix"] as const).optional(),
  visibility: visibility.optional(),
} as const;

export const storageReadUrlInputShape = {
  storageKey: identifier.optional(),
  visibility: visibility.optional(),
  disposition: s.enum(["inline", "attachment"] as const).optional(),
  expiresAt: timestamp.optional(),
  purpose: s.enum(["preview", "download", "share"] as const),
  ttlSeconds: s.integer().min(1).max(86_400).optional(),
} as const;
