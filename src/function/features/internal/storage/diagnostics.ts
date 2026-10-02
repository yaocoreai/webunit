import type { ApplicationServices } from "@/function/common/app/services";
import type { Database } from "@/function/common/capabilities/contracts";
import { storageRuntimeSchema } from "./schemas";
import { mapStorageUploadSessionRow } from "./session-row";

export async function readStorageDiagnostics(
  database: Database,
  services: ApplicationServices,
  input: Readonly<{ status?: string; storageKey?: string; limit?: number }>,
) {
  const limit = boundedLimit(input.limit),
    predicates: string[] = [],
    values: unknown[] = [];
  if (input.status) {
    predicates.push("status=?");
    values.push(input.status);
  }
  if (input.storageKey) {
    predicates.push("storage_key=?");
    values.push(input.storageKey);
  }
  const where = predicates.length ? ` where ${predicates.join(" and ")}` : "";
  const [objects, entries, statuses, sessions] = await Promise.all([
    database
      .prepare(
        "select count(*) as count,coalesce(sum(size),0) as bytes from storage_objects where deleted_at is null",
      )
      .first<Record<string, unknown>>(),
    database
      .prepare(
        "select count(*) as count,sum(case when entry_kind='file' then 1 else 0 end) as files,sum(case when entry_kind='folder' then 1 else 0 end) as folders from storage_entries where deleted_at is null",
      )
      .first<Record<string, unknown>>(),
    database
      .prepare(
        "select status,count(*) as count from storage_upload_sessions group by status order by status",
      )
      .all<Record<string, unknown>>(),
    database
      .prepare(
        `select id,storage_key,mount_key,logical_path,transport,upload_mode,size_bytes,status,expires_at,created_at,updated_at from storage_upload_sessions${where} order by created_at desc,id desc limit ?`,
      )
      .bind(...values, limit)
      .all<Record<string, unknown>>(),
  ]);
  const now = new Date().toISOString();
  const expired = await database
    .prepare(
      "select count(*) as count from storage_upload_sessions where status in ('pending','cleanup_pending') and expires_at<=?",
    )
    .bind(now)
    .first<{ count: number }>();
  return storageRuntimeSchema.parse({
    available: Boolean(services.getStorage()),
    checkedAt: now,
    summary: {
      objects: Number(objects?.count ?? 0),
      bytes: Number(objects?.bytes ?? 0),
      entries: Number(entries?.count ?? 0),
      files: Number(entries?.files ?? 0),
      folders: Number(entries?.folders ?? 0),
      uploadSessions: statuses.results.reduce(
        (sum, row) => sum + Number(row.count),
        0,
      ),
      pending: statuses.results
        .filter(
          (row) => row.status === "pending" || row.status === "cleanup_pending",
        )
        .reduce((sum, row) => sum + Number(row.count), 0),
      expiredPending: Number(expired?.count ?? 0),
    },
    byStatus: statuses.results.map((row) => ({
      status: String(row.status),
      count: Number(row.count),
    })),
    sessions: sessions.results.map(mapStorageUploadSessionRow),
  });
}
function boundedLimit(value: number | undefined) {
  const result = Number(value ?? 50);
  if (!Number.isSafeInteger(result) || result < 1 || result > 200)
    throw new TypeError("Invalid limit");
  return result;
}
