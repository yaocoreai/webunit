import type {
  Database,
  Storage,
} from "@/function/common/capabilities/contracts";
import { isDatabaseConstraintError } from "@/function/common/db/error";
import { createStorageCatalog } from "./catalog";
import { requireDeliveryClaimOwner } from "@/function/common/storage/delivery-claims";
import {
  storageInstanceKey,
  storageLogicalPath,
  storageMountKey,
} from "@/function/common/storage/upload-ticket";

type SessionRow = Readonly<{
  id: string;
  ticket_id: string | null;
  storage_key: string;
  object_key: string;
  mount_key: string;
  logical_path: string;
  delivery_path: string;
  asset_type: "binary" | "image" | "video" | "audio" | "document";
  content_type: string;
  transport: "direct";
  upload_mode: "single" | "multipart";
  size_bytes: number | null;
  checksum_sha256: string | null;
  part_size: number | null;
  multipart_upload_id: string | null;
  visibility: "public" | "private";
  status: "pending" | "completed" | "aborted" | "cleanup_pending";
  session_key_hash: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}>;

type UploadOwnerScope = Readonly<{
  storageKey: string;
  mountKey: string;
  deliveryPath: string;
}>;

function sessionScope(row: SessionRow): UploadOwnerScope {
  return {
    storageKey: row.storage_key,
    mountKey: row.mount_key,
    deliveryPath: row.delivery_path,
  };
}

async function requireOperationalUploadOwner(
  database: Database,
  scope: UploadOwnerScope,
) {
  try {
    await requireDeliveryClaimOwner(
      database,
      scope.storageKey,
      scope.mountKey,
      scope.deliveryPath,
    );
  } catch (error) {
    throw new StorageUploadError(
      error instanceof Error
        ? error.message
        : "Storage upload owner is unavailable",
    );
  }
}
type UploadedPart = Readonly<{
  part_number: number;
  etag: string;
  size: number;
}>;
const partSize = 5 * 1024 * 1024;

export function createStorageUploadSessions(
  database: Database,
  storage: Storage,
) {
  return {
    async create(input: Readonly<Record<string, unknown>>) {
      const normalized = normalizeCreate(input);
      await requireOperationalUploadOwner(database, normalized);
      const occupied = await database
        .prepare(
          "select id from storage_entries where storage_key=? and delivery_path=? and deleted_at is null limit 1",
        )
        .bind(normalized.storageKey, normalized.deliveryPath)
        .first<{ id: string }>();
      if (occupied)
        throw new StorageUploadError("Storage delivery path already exists");
      const id = crypto.randomUUID(),
        objectKey = `${normalized.storageKey}/uploads/${crypto.randomUUID()}`;
      const sessionKey = createSessionKey(),
        sessionKeyHash = await sha256(sessionKey);
      let multipartUploadId: string | null = null;
      if (normalized.uploadMode === "multipart") {
        if (
          !storage.createMultipart ||
          !storage.uploadPart ||
          !storage.completeMultipart ||
          !storage.abortMultipart
        )
          throw new StorageUploadError(
            "Multipart upload is not supported by this Storage capability",
          );
        multipartUploadId = (
          await storage.createMultipart(objectKey, {
            contentType: normalized.contentType,
            ...(normalized.checksumSha256
              ? { metadata: { checksumSha256: normalized.checksumSha256 } }
              : {}),
          })
        ).uploadId;
      }
      const now = new Date().toISOString();
      try {
        await database
          .prepare(
            "insert into storage_upload_sessions (id,ticket_id,storage_key,object_key,mount_key,logical_path,delivery_path,asset_type,content_type,transport,upload_mode,size_bytes,checksum_sha256,part_size,multipart_upload_id,visibility,status,session_key_hash,expires_at,created_at,updated_at) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          )
          .bind(
            id,
            normalized.ticketId,
            normalized.storageKey,
            objectKey,
            normalized.mountKey,
            normalized.logicalPath,
            normalized.deliveryPath,
            normalized.assetType,
            normalized.contentType,
            "direct",
            normalized.uploadMode,
            normalized.sizeBytes,
            normalized.checksumSha256,
            normalized.uploadMode === "multipart" ? partSize : null,
            multipartUploadId,
            normalized.visibility,
            "pending",
            sessionKeyHash,
            normalized.expiresAt,
            now,
            now,
          )
          .run();
      } catch (error) {
        if (multipartUploadId && storage.abortMultipart)
          await storage.abortMultipart(objectKey, multipartUploadId);
        if (isDatabaseConstraintError(error, "unique"))
          throw new StorageUploadError(
            "Storage logical path or delivery path already has an active upload",
          );
        throw error;
      }
      const result = await response(
        {
          id,
          ticket_id: normalized.ticketId,
          object_key: objectKey,
          storage_key: normalized.storageKey,
          mount_key: normalized.mountKey,
          logical_path: normalized.logicalPath,
          delivery_path: normalized.deliveryPath,
          asset_type: normalized.assetType,
          content_type: normalized.contentType,
          transport: "direct",
          upload_mode: normalized.uploadMode,
          size_bytes: normalized.sizeBytes,
          checksum_sha256: normalized.checksumSha256,
          part_size: normalized.uploadMode === "multipart" ? partSize : null,
          multipart_upload_id: multipartUploadId,
          visibility: normalized.visibility,
          status: "pending",
          session_key_hash: sessionKeyHash,
          expires_at: normalized.expiresAt,
          created_at: now,
          updated_at: now,
        } as SessionRow,
        sessionKey,
        storage,
      );
      await requireOperationalUploadOwner(database, normalized);
      return result;
    },
    async resume(input: Readonly<Record<string, unknown>>) {
      const normalized = normalizeCreate(input);
      await requireOperationalUploadOwner(database, normalized);
      const row = await database
        .prepare(
          "select * from storage_upload_sessions where ticket_id=? and status='pending' limit 1",
        )
        .bind(normalized.ticketId)
        .first<SessionRow>();
      if (!row) return this.create(input);
      assertNotExpired(row);
      if (
        row.delivery_path !== normalized.deliveryPath ||
        row.visibility !== normalized.visibility ||
        row.content_type !== normalized.contentType ||
        row.upload_mode !== normalized.uploadMode ||
        row.size_bytes !== normalized.sizeBytes
      )
        throw new StorageUploadError(
          "Storage upload session resume input does not match",
        );
      const sessionKey = createSessionKey();
      await database
        .prepare(
          "update storage_upload_sessions set session_key_hash=?,updated_at=? where id=? and status=?",
        )
        .bind(
          await sha256(sessionKey),
          new Date().toISOString(),
          row.id,
          "pending",
        )
        .run();
      const result = await response(row, sessionKey, storage);
      await requireOperationalUploadOwner(database, sessionScope(row));
      return result;
    },
    async status(id: unknown, sessionKey: unknown) {
      const row = await requireSession(database, id, sessionKey, true);
      const parts = await listParts(database, row.id);
      return {
        ...publicSession(row),
        uploadedParts: parts.map(mapPart),
        nextPartNumbers: nextParts(row, parts),
      };
    },
    async signParts(
      id: unknown,
      sessionKey: unknown,
      partNumbers: readonly number[],
    ) {
      const row = await requireSession(database, id, sessionKey);
      await requireOperationalUploadOwner(database, sessionScope(row));
      if (row.upload_mode !== "multipart" || !row.multipart_upload_id)
        throw new StorageUploadError(
          "Storage upload session is not multipart mode",
        );
      const allowed = new Set(
        nextParts(row, await listParts(database, row.id)),
      );
      for (const partNumber of partNumbers)
        if (!allowed.has(partNumber))
          throw new StorageUploadError("Invalid Storage upload part number");
      const expires = expirySeconds(row.expires_at);
      const result = await Promise.all(
        partNumbers.map(async (partNumber) => {
          const signed = await storage.signUploadPart(
            row.object_key,
            row.multipart_upload_id!,
            partNumber,
            expires,
          );
          if (signed.method !== "PUT")
            throw new StorageUploadError("Storage upload part must use PUT");
          return { partNumber, ...signed, method: "PUT" as const };
        }),
      );
      await requireOperationalUploadOwner(database, sessionScope(row));
      return result;
    },
    async complete(
      id: unknown,
      sessionKey: unknown,
      input?: Readonly<{
        parts?: readonly Readonly<{ partNumber: number; etag: string }>[];
      }>,
    ) {
      const row = await requireSession(database, id, sessionKey);
      await requireOperationalUploadOwner(database, sessionScope(row));
      let etag: string | undefined;
      if (row.upload_mode === "multipart") {
        if (!row.multipart_upload_id || !storage.completeMultipart)
          throw new StorageUploadError("Multipart upload is not supported");
        if (input?.parts) await confirmDirectParts(database, row, input.parts);
        const parts = await listParts(database, row.id);
        if (parts.length !== expectedPartCount(row))
          throw new StorageUploadError("Storage upload parts are incomplete");
        etag = (
          await storage.completeMultipart(
            row.object_key,
            row.multipart_upload_id,
            parts.map(mapPart),
          )
        ).etag;
      }
      const object = await storage.get(row.object_key);
      if (!object)
        throw new StorageUploadError("Storage uploaded object is missing");
      if (
        row.size_bytes !== null &&
        object.size !== undefined &&
        object.size !== row.size_bytes
      )
        throw new StorageUploadError(
          "Storage uploaded object size does not match",
        );
      if (row.checksum_sha256 && object.checksumSha256 !== row.checksum_sha256)
        throw new StorageUploadError(
          "Storage uploaded object checksum does not match",
        );
      try {
        await requireOperationalUploadOwner(database, sessionScope(row));
      } catch (error) {
        await storage.delete(row.object_key);
        throw error;
      }
      try {
        const entry = await createStorageCatalog(
          database,
          storage,
        ).attachUploadedObject({
          storageKey: row.storage_key,
          objectKey: row.object_key,
          mountKey: row.mount_key,
          logicalPath: row.logical_path,
          deliveryPath: row.delivery_path,
          visibility: row.visibility,
          assetType: row.asset_type,
          contentType: row.content_type,
          size: object.size ?? row.size_bytes ?? 0,
          etag: object.etag ?? etag ?? crypto.randomUUID(),
          checksumSha256: row.checksum_sha256 ?? object.checksumSha256 ?? undefined,
        });
        await database.batch([
          database
            .prepare(
              "update storage_upload_sessions set status='completed',updated_at=? where id=? and status='pending'",
            )
            .bind(new Date().toISOString(), row.id),
          database
            .prepare("delete from storage_upload_parts where session_id=?")
            .bind(row.id),
        ]);
        return {
          ...publicSession({
            ...row,
            status: "completed",
            updated_at: new Date().toISOString(),
          }),
          entry,
        };
      } catch (error) {
        await storage.delete(row.object_key);
        await database
          .prepare(
            "update storage_upload_sessions set status='aborted',updated_at=? where id=? and status='pending'",
          )
          .bind(new Date().toISOString(), row.id)
          .run();
        if (isDatabaseConstraintError(error, "unique"))
          throw new StorageUploadError(
            "Storage logical path or delivery path already exists",
          );
        throw error;
      }
    },
    async abort(id: unknown, sessionKey: unknown) {
      const row = await requireSession(database, id, sessionKey);
      if (
        row.upload_mode === "multipart" &&
        row.multipart_upload_id &&
        storage.abortMultipart
      )
        await storage.abortMultipart(row.object_key, row.multipart_upload_id);
      else await storage.delete(row.object_key);
      const now = new Date().toISOString();
      await database.batch([
        database
          .prepare(
            "update storage_upload_sessions set status='aborted',updated_at=? where id=? and status='pending'",
          )
          .bind(now, row.id),
        database
          .prepare("delete from storage_upload_parts where session_id=?")
          .bind(row.id),
      ]);
      return publicSession({ ...row, status: "aborted", updated_at: now });
    },
    async cleanupExpired(nowInput: string, limitInput = 100) {
      const now = new Date(nowInput).toISOString(),
        limit = Number(limitInput);
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500)
        throw new TypeError("Invalid Storage cleanup limit");
      const rows = await database
        .prepare(
          "select * from storage_upload_sessions where status in ('pending','cleanup_pending') and expires_at<=? order by expires_at,id limit ?",
        )
        .bind(now, limit)
        .all<SessionRow>();
      let cleaned = 0;
      for (const row of rows.results) {
        try {
          if (
            row.upload_mode === "multipart" &&
            row.multipart_upload_id &&
            storage.abortMultipart
          )
            await storage.abortMultipart(
              row.object_key,
              row.multipart_upload_id,
            );
          else await storage.delete(row.object_key);
          await database.batch([
            database
              .prepare(
                "update storage_upload_sessions set status='aborted',updated_at=? where id=? and status in ('pending','cleanup_pending')",
              )
              .bind(now, row.id),
            database
              .prepare("delete from storage_upload_parts where session_id=?")
              .bind(row.id),
          ]);
          cleaned += 1;
        } catch (error) {
          await database
            .prepare(
              "update storage_upload_sessions set status='cleanup_pending',updated_at=? where id=? and status in ('pending','cleanup_pending')",
            )
            .bind(now, row.id)
            .run();
          throw error;
        }
      }
      return { cleaned, remainingPossible: rows.results.length === limit };
    },
    async listPendingCleanup(nowInput: string, limitInput = 100) {
      const now = new Date(nowInput).toISOString(),
        limit = Number(limitInput);
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500)
        throw new TypeError("Invalid Storage cleanup limit");
      const rows = await database
        .prepare(
          "select id,storage_key from storage_upload_sessions where status in ('pending','cleanup_pending') and expires_at<=? order by expires_at,id limit ?",
        )
        .bind(now, limit)
        .all<Pick<SessionRow, "id" | "storage_key">>();
      return rows.results;
    },
    async cleanupSession(idInput: unknown, beforeInput: unknown) {
      if (typeof idInput !== "string" || !idInput)
        throw new TypeError("Invalid Storage upload session id");
      if (typeof beforeInput !== "string")
        throw new TypeError("Invalid Storage cleanup timestamp");
      const before = new Date(beforeInput).toISOString();
      const row = await database
        .prepare(
          "select * from storage_upload_sessions where id=? and status in ('pending','cleanup_pending') and expires_at<=?",
        )
        .bind(idInput, before)
        .first<SessionRow>();
      if (!row) return false;
      try {
        if (
          row.upload_mode === "multipart" &&
          row.multipart_upload_id &&
          storage.abortMultipart
        )
          await storage.abortMultipart(row.object_key, row.multipart_upload_id);
        else await storage.delete(row.object_key);
        await database.batch([
          database
            .prepare(
              "update storage_upload_sessions set status='aborted',updated_at=? where id=? and status in ('pending','cleanup_pending')",
            )
            .bind(before, row.id),
          database
            .prepare("delete from storage_upload_parts where session_id=?")
            .bind(row.id),
        ]);
        return true;
      } catch (error) {
        await database
          .prepare(
            "update storage_upload_sessions set status='cleanup_pending',updated_at=? where id=? and status in ('pending','cleanup_pending')",
          )
          .bind(before, row.id)
          .run();
        throw error;
      }
    },
  };
}

export class StorageUploadError extends Error {}
function normalizeCreate(input: Readonly<Record<string, unknown>>) {
  const storageKey = storageInstanceKey(input.storageKey),
    mountKey = storageMountKey(input.mountKey),
    logicalPath = storageLogicalPath(input.logicalPath),
    deliveryPath =
      input.deliveryPath === undefined
        ? logicalPath
        : storageLogicalPath(input.deliveryPath);
  const visibility = input.visibility ?? "private";
  if (typeof input.ticketId !== "string" || !input.ticketId.trim())
    throw new TypeError("Storage upload ticket id is required");
  if (visibility !== "public" && visibility !== "private")
    throw new TypeError("Invalid Storage visibility");
  const contentType =
    typeof input.contentType === "string" && input.contentType.trim()
      ? input.contentType.trim()
      : "application/octet-stream";
  const assetType = input.assetType ?? inferAssetType(contentType);
  if (
    !["binary", "image", "video", "audio", "document"].includes(
      String(assetType),
    )
  )
    throw new TypeError("Invalid Storage assetType");
  const sizeBytes =
    input.sizeBytes === undefined ? null : Number(input.sizeBytes);
  if (sizeBytes !== null && (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1))
    throw new TypeError("Invalid Storage sizeBytes");
  const requested = input.uploadMode ?? "auto";
  if (!["auto", "single", "multipart"].includes(String(requested)))
    throw new TypeError("Invalid Storage uploadMode");
  const uploadMode =
    requested === "auto"
      ? sizeBytes !== null && sizeBytes > partSize
        ? "multipart"
        : "single"
      : (requested as "single" | "multipart");
  if (uploadMode === "multipart" && sizeBytes === null)
    throw new TypeError("Multipart upload requires sizeBytes");
  const checksumSha256 =
    input.checksumSha256 === undefined
      ? null
      : String(input.checksumSha256).toLowerCase();
  if (checksumSha256 !== null && !/^[a-f0-9]{64}$/.test(checksumSha256))
    throw new TypeError("Invalid Storage checksumSha256");
  const expiresAt =
    input.expiresAt === undefined
      ? new Date(Date.now() + 15 * 60_000).toISOString()
      : new Date(String(input.expiresAt)).toISOString();
  if (
    Date.parse(expiresAt) <= Date.now() ||
    Date.parse(expiresAt) > Date.now() + 86_400_000
  )
    throw new TypeError("Invalid Storage upload expiresAt");
  return {
    ticketId: input.ticketId.trim(),
    storageKey,
    mountKey,
    logicalPath,
    deliveryPath,
    visibility,
    contentType,
    assetType: assetType as "binary" | "image" | "video" | "audio" | "document",
    sizeBytes,
    checksumSha256,
    uploadMode,
    expiresAt,
  };
}
async function requireSession(
  database: Database,
  idInput: unknown,
  keyInput: unknown,
  allowFinished = false,
) {
  if (typeof idInput !== "string" || typeof keyInput !== "string")
    throw new StorageUploadError(
      "Storage upload session credentials are required",
    );
  const row = await database
    .prepare("select * from storage_upload_sessions where id=?")
    .bind(idInput)
    .first<SessionRow>();
  if (!row) throw new StorageUploadError("Storage upload session not found");
  if (!allowFinished && row.status !== "pending")
    throw new StorageUploadError(`Storage upload session is ${row.status}`);
  if ((await sha256(keyInput)) !== row.session_key_hash)
    throw new StorageUploadError("Storage upload session key is invalid");
  if (row.status === "pending") assertNotExpired(row);
  return row;
}
function assertNotExpired(row: SessionRow) {
  if (Date.parse(row.expires_at) <= Date.now())
    throw new StorageUploadError("Storage upload session has expired");
}
async function listParts(database: Database, id: string) {
  return (
    await database
      .prepare(
        "select part_number,etag,size from storage_upload_parts where session_id=? order by part_number",
      )
      .bind(id)
      .all<UploadedPart>()
  ).results;
}
function expectedPartCount(row: SessionRow) {
  if (!row.size_bytes || !row.part_size)
    throw new StorageUploadError("Storage multipart size is missing");
  return Math.ceil(row.size_bytes / row.part_size);
}
function expectedPartSize(row: SessionRow, number: number) {
  const count = expectedPartCount(row);
  if (!Number.isSafeInteger(number) || number < 1 || number > count)
    throw new StorageUploadError("Invalid Storage upload part number");
  return number < count
    ? row.part_size!
    : row.size_bytes! - row.part_size! * (count - 1);
}
function nextParts(row: SessionRow, parts: readonly UploadedPart[]) {
  if (row.upload_mode !== "multipart") return [];
  const done = new Set(parts.map((part) => part.part_number));
  return Array.from(
    { length: expectedPartCount(row) },
    (_, index) => index + 1,
  ).filter((number) => !done.has(number));
}
function mapPart(part: UploadedPart) {
  return { partNumber: part.part_number, etag: part.etag };
}
async function response(row: SessionRow, sessionKey: string, storage: Storage) {
  const expires = expirySeconds(row.expires_at);
  if (row.upload_mode === "single") {
    const signed = await storage.signPut(row.object_key, expires, {
      contentType: row.content_type,
      ...(row.checksum_sha256
        ? { metadata: { checksumSha256: row.checksum_sha256 } }
        : {}),
    });
    if (signed.method !== "PUT")
      throw new StorageUploadError("Storage upload must use PUT");
    return {
      ...publicSession(row),
      sessionKey,
      upload: {
        mode: "single" as const,
        method: "PUT" as const,
        url: signed.url,
        ...(signed.headers ? { headers: signed.headers } : {}),
      },
    };
  }
  if (!row.multipart_upload_id || !row.part_size)
    throw new StorageUploadError("Storage multipart upload state is incomplete");
  const parts = await Promise.all(
    Array.from({ length: expectedPartCount(row) }, async (_, index) => {
      const partNumber = index + 1;
      const signed = await storage.signUploadPart(
        row.object_key,
        row.multipart_upload_id!,
        partNumber,
        expires,
      );
      if (signed.method !== "PUT")
        throw new StorageUploadError("Storage upload part must use PUT");
      return {
        partNumber,
        method: "PUT" as const,
        url: signed.url,
        ...(signed.headers ? { headers: signed.headers } : {}),
      };
    }),
  );
  return {
    ...publicSession(row),
    sessionKey,
    upload: {
      mode: "multipart" as const,
      uploadId: row.multipart_upload_id,
      partSize: row.part_size,
      parts,
    },
  };
}
async function confirmDirectParts(
  database: Database,
  row: SessionRow,
  parts: readonly Readonly<{ partNumber: number; etag: string }>[],
) {
  if (parts.length !== expectedPartCount(row))
    throw new StorageUploadError("Storage upload parts are incomplete");
  const seen = new Set<number>();
  const now = new Date().toISOString();
  const statements = parts.map((part) => {
    const partNumber = Number(part.partNumber);
    if (seen.has(partNumber))
      throw new StorageUploadError("Duplicate Storage upload part");
    seen.add(partNumber);
    const size = expectedPartSize(row, partNumber);
    const etag =
      typeof part.etag === "string"
        ? part.etag.trim().replace(/^"|"$/g, "")
        : "";
    if (!etag || etag.length > 256)
      throw new StorageUploadError("Invalid Storage upload part ETag");
    return database
      .prepare(
        "insert into storage_upload_parts (session_id,part_number,etag,size,created_at,updated_at) values (?,?,?,?,?,?) on conflict(session_id,part_number) do update set etag=excluded.etag,size=excluded.size,updated_at=excluded.updated_at",
      )
      .bind(row.id, partNumber, etag, size, now, now);
  });
  await database.batch(statements);
}
function expirySeconds(expiresAt: string) {
  const seconds = Math.floor((Date.parse(expiresAt) - Date.now()) / 1000);
  if (!Number.isSafeInteger(seconds) || seconds <= 0)
    throw new StorageUploadError("Storage upload session is expired");
  return Math.min(seconds, 604_800);
}
function publicSession(row: SessionRow) {
  return {
    id: row.id,
    storageKey: row.storage_key,
    objectKey: row.object_key,
    mountKey: row.mount_key,
    logicalPath: row.logical_path,
    deliveryPath: row.delivery_path,
    assetType: row.asset_type,
    contentType: row.content_type,
    transport: row.transport,
    uploadMode: row.upload_mode,
    sizeBytes: row.size_bytes,
    checksumSha256: row.checksum_sha256,
    partSize: row.part_size,
    visibility: row.visibility,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function inferAssetType(contentType: string) {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  if (
    contentType.startsWith("text/") ||
    contentType.includes("json") ||
    contentType.includes("pdf")
  )
    return "document";
  return "binary";
}
function createSessionKey() {
  return `su-${crypto.randomUUID()}-${crypto.randomUUID()}`;
}
async function sha256(value: string) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
