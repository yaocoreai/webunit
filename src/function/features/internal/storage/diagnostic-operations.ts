import type { RouteContext } from "@/function/common/route/definition";
import { applicationUnavailableError } from "@/function/common/app/error";
import {
  defineDataCommand,
  defineDataQuery,
} from "@/function/common/app/operation";
import { readStorageDiagnostics } from "./diagnostics";
import { createStorageUploadSessions } from "@/function/common/storage/upload-session";
import {
  cleanupStorageUploadSessionContract,
  listStorageUploadSessionsContract,
  mapStorageError,
  readStorageRuntimeContract,
  readStorageUploadSessionContract,
  storageUploadSessionNotFoundError,
} from "./contracts";
import { mapStorageUploadSessionRow } from "./session-row";

export const readStorageRuntimeQuery = defineDataQuery({
  contract: readStorageRuntimeContract,
  mapError: mapStorageError,
  async execute(context, input) {
    const database = context.services.database;
    if (!database) throw applicationUnavailableError();
    return readStorageDiagnostics(database, context.services, input);
  },
});
export const listStorageUploadSessionsQuery = defineDataQuery({
  contract: listStorageUploadSessionsContract,
  mapError: mapStorageError,
  async execute(context, input) {
    const database = requireDatabase(context),
      limit = Math.max(1, Math.min(200, Number(input.limit ?? 50))),
      predicates: string[] = [],
      values: unknown[] = [];
    if (typeof input.status === "string") {
      predicates.push("status=?");
      values.push(input.status);
    }
    if (typeof input.storageKey === "string") {
      predicates.push("storage_key=?");
      values.push(input.storageKey);
    }
    const where = predicates.length ? ` where ${predicates.join(" and ")}` : "";
    const rows = await database
      .prepare(
        `select id,ticket_id,storage_key,mount_key,logical_path,delivery_path,upload_mode,size_bytes,visibility,status,expires_at,created_at,updated_at from storage_upload_sessions${where} order by created_at desc,id desc limit ?`,
      )
      .bind(...values, limit)
      .all<Record<string, unknown>>();
    return { items: rows.results.map(mapStorageUploadSessionRow), limit };
  },
});
export const readStorageUploadSessionQuery = defineDataQuery({
  contract: readStorageUploadSessionContract,
  mapError: mapStorageError,
  async execute(context, input) {
    const row = await requireDatabase(context)
      .prepare(
        "select id,ticket_id,storage_key,object_key,mount_key,logical_path,delivery_path,asset_type,content_type,upload_mode,size_bytes,checksum_sha256,part_size,visibility,status,expires_at,created_at,updated_at from storage_upload_sessions where id=?",
      )
      .bind(String(input.id))
      .first<Record<string, unknown>>();
    if (!row) throw storageUploadSessionNotFoundError();
    return mapStorageUploadSessionRow(row);
  },
});
export const cleanupStorageUploadSessionAdminCommand = defineDataCommand({
  contract: cleanupStorageUploadSessionContract,
  mapError: mapStorageError,
  async execute(context, input) {
    const before =
      typeof input.before === "string"
        ? input.before
        : new Date().toISOString();
    return {
      cleaned: await uploadSessions(context).cleanupSession(input.id, before),
    };
  },
});
function requireDatabase(context: RouteContext) {
  const value = context.services.database;
  if (!value) throw applicationUnavailableError();
  return value;
}
function uploadSessions(context: RouteContext) {
  const storage = context.services.getStorage();
  if (!storage) throw applicationUnavailableError();
  return createStorageUploadSessions(requireDatabase(context), storage);
}
