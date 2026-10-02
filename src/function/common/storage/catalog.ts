import type {
  Database,
  DatabaseStatement,
  Storage,
} from "@/function/common/capabilities/contracts";
import {
  storageInstanceKey,
  storageLogicalPath,
  storageMountKey,
} from "@/function/common/storage/upload-ticket";
import {
  activateDeliveryClaimStatement,
  requireDeliveryClaimOwner,
  tombstoneDeliveryClaimStatement,
} from "@/function/common/storage/delivery-claims";

type EntryRow = Readonly<{
  id: string;
  storage_key: string;
  entry_kind: "directory" | "file";
  object_key?: string;
  mount_key: string;
  logical_path: string;
  delivery_path?: string;
  visibility?: "public" | "private";
  asset_type?: "binary" | "image" | "video" | "audio" | "document";
  asset_state?: string;
  created_at: string;
  updated_at: string;
  content_type?: string;
  size?: number;
  checksum_sha256?: string;
  etag?: string;
}>;

const ENTRY_SELECT =
  "select e.*,o.content_type,o.size,o.checksum_sha256,o.etag from storage_entries e";
/** DB batch 与并发存储调用按分片处理，避免大目录触及批量语句和 Workers 子请求上限；重复执行同一分片是幂等的(写入相同目标值)。 */
const DIRECTORY_STATEMENT_CHUNK_SIZE = 200;
const STORAGE_OPERATION_CONCURRENCY = 20;

export function createStorageCatalog(database: Database, storage: Storage) {
  const getById = async (id: string) => {
    const row = await database
      .prepare(
        `${ENTRY_SELECT} left join storage_objects o on o.storage_key=e.storage_key and o.object_key=e.object_key and o.deleted_at is null where e.id=? and e.deleted_at is null`,
      )
      .bind(id)
      .first<EntryRow>();
    return row ? mapEntry(row) : undefined;
  };
  const getByObjectKey = async (
    storageKeyInput: unknown,
    objectKeyInput: unknown,
  ) => {
    const storageKey = storageInstanceKey(storageKeyInput);
    if (typeof objectKeyInput !== "string" || !objectKeyInput.trim())
      throw new TypeError("Invalid Storage objectKey");
    const row = await database
      .prepare(
        `${ENTRY_SELECT} join storage_objects o on o.storage_key=e.storage_key and o.object_key=e.object_key and o.deleted_at is null where e.storage_key=? and e.object_key=? and e.entry_kind='file' and e.deleted_at is null limit 1`,
      )
      .bind(storageKey, objectKeyInput.trim())
      .first<EntryRow>();
    return row ? mapEntry(row) : undefined;
  };
  const getByDeliveryPath = async (
    deliveryPathInput: unknown,
    storageKeyInput?: unknown,
    visibilityInput: unknown = "private",
  ) => {
    const storageKey = storageInstanceKey(storageKeyInput),
      deliveryPath = storageLogicalPath(deliveryPathInput),
      visibility = normalizeVisibility(visibilityInput);
    const row = await database
      .prepare(
        `${ENTRY_SELECT} join storage_objects o on o.storage_key=e.storage_key and o.object_key=e.object_key and o.deleted_at is null where e.storage_key=? and e.delivery_path=? and e.visibility=? and e.entry_kind='file' and e.asset_state='ready' and e.deleted_at is null and (e.mount_key not like 'site/%' or exists(select 1 from storage_delivery_claims claim join cms_sites site on site.id=claim.owner_site_id and site.lifecycle_state='operational' where claim.storage_key=e.storage_key and claim.delivery_path=e.delivery_path and claim.entry_id=e.id and claim.state='active')) limit 1`,
      )
      .bind(storageKey, deliveryPath, visibility)
      .first<EntryRow>();
    return row ? mapEntry(row) : undefined;
  };
  const readByDeliveryPath = async (
    deliveryPathInput: unknown,
    storageKeyInput?: unknown,
    visibilityInput: unknown = "private",
  ) => {
    const entry = await getByDeliveryPath(
      deliveryPathInput,
      storageKeyInput,
      visibilityInput,
    );
    if (!entry?.objectKey) return undefined;
    const object = await storage.get(entry.objectKey);
    return object?.body ? { entry, body: object.body } : undefined;
  };

  return {
    async browse(
      input: Readonly<{
        storageKey?: unknown;
        mountKey?: unknown;
        directory?: unknown;
        keyword?: unknown;
        visibility?: unknown;
        limit?: unknown;
      }>,
    ) {
      const storageKey = storageInstanceKey(input.storageKey),
        mountKey = storageMountKey(input.mountKey);
      const directory =
        input.directory === undefined || input.directory === ""
          ? ""
          : storageLogicalPath(input.directory);
      const predicates = [
        "e.storage_key=?",
        "e.mount_key=?",
        "e.deleted_at is null",
      ];
      const values: unknown[] = [storageKey, mountKey];
      if (directory) {
        predicates.push("(e.logical_path=? or e.logical_path like ?)");
        values.push(directory, `${directory}/%`);
      }
      if (input.keyword) {
        predicates.push("lower(e.logical_path) like ?");
        values.push(`%${String(input.keyword).trim().toLowerCase()}%`);
      }
      if (input.visibility && input.visibility !== "all") {
        if (input.visibility !== "public" && input.visibility !== "private")
          throw new TypeError("Invalid Storage visibility");
        predicates.push("e.visibility=?");
        values.push(input.visibility);
      }
      const limit = Number(input.limit ?? 500);
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500)
        throw new TypeError("Invalid Storage limit");
      const rows = await database
        .prepare(
          `${ENTRY_SELECT} left join storage_objects o on o.storage_key=e.storage_key and o.object_key=e.object_key and o.deleted_at is null where ${predicates.join(" and ")} order by e.logical_path limit ?`,
        )
        .bind(...values, limit)
        .all<EntryRow>();
      return { directory, items: rows.results.map(mapEntry) };
    },
    async put(
      input: Readonly<{
        storageKey?: unknown;
        mountKey?: unknown;
        logicalPath: unknown;
        deliveryPath?: unknown;
        visibility?: unknown;
        assetType?: unknown;
        contentType?: unknown;
        body: Uint8Array;
      }>,
    ) {
      const storageKey = storageInstanceKey(input.storageKey),
        mountKey = storageMountKey(input.mountKey),
        logicalPath = storageLogicalPath(input.logicalPath);
      const visibility = input.visibility ?? "private";
      if (visibility !== "public" && visibility !== "private")
        throw new TypeError("Invalid Storage visibility");
      const deliveryPath =
        input.deliveryPath === undefined
          ? logicalPath
          : storageLogicalPath(input.deliveryPath);
      const assetType = normalizeAssetType(input.assetType);
      const contentType =
        typeof input.contentType === "string" && input.contentType.trim()
          ? input.contentType.trim()
          : "application/octet-stream";
      const checksumSha256 = await sha256Hex(input.body);
      const id = await writeObjectEntry(database, storage, {
        storageKey,
        mountKey,
        logicalPath,
        deliveryPath,
        visibility,
        assetType,
        contentType,
        size: input.body.byteLength,
        checksumSha256,
        body: new Blob([input.body.slice().buffer]),
      });
      return getById(id);
    },
    async attachUploadedObject(
      input: Readonly<{
        storageKey: unknown;
        objectKey: unknown;
        mountKey: unknown;
        logicalPath: unknown;
        deliveryPath: unknown;
        visibility: unknown;
        assetType: unknown;
        contentType: unknown;
        size: unknown;
        etag: unknown;
        checksumSha256?: unknown;
      }>,
    ) {
      const storageKey = storageInstanceKey(input.storageKey),
        mountKey = storageMountKey(input.mountKey),
        logicalPath = storageLogicalPath(input.logicalPath),
        deliveryPath = storageLogicalPath(input.deliveryPath),
        visibility = normalizeVisibility(input.visibility),
        assetType = normalizeAssetType(input.assetType);
      if (typeof input.objectKey !== "string" || !input.objectKey.trim())
        throw new TypeError("Invalid Storage objectKey");
      if (typeof input.contentType !== "string" || !input.contentType.trim())
        throw new TypeError("Invalid Storage contentType");
      const size = Number(input.size);
      if (!Number.isSafeInteger(size) || size < 0)
        throw new TypeError("Invalid Storage size");
      if (typeof input.etag !== "string" || !input.etag.trim())
        throw new TypeError("Invalid Storage etag");
      const checksumSha256 = normalizeChecksum(input.checksumSha256);
      const now = new Date().toISOString(),
        id = crypto.randomUUID();
      const ownerSiteId = await requireDeliveryClaimOwner(
        database,
        storageKey,
        mountKey,
        deliveryPath,
      );
      await database.batch([
        ...(ownerSiteId
          ? [
              activateDeliveryClaimStatement(database, {
                storageKey,
                deliveryPath,
                siteId: ownerSiteId,
                entryId: id,
                now,
              }),
            ]
          : []),
        database
          .prepare(
            "insert into storage_objects (id,storage_key,object_key,content_type,size,checksum_sha256,etag,created_at,updated_at,deleted_at) values (?,?,?,?,?,?,?,?,?,null)",
          )
          .bind(
            crypto.randomUUID(),
            storageKey,
            input.objectKey.trim(),
            input.contentType.trim(),
            size,
            checksumSha256,
            input.etag.trim(),
            now,
            now,
          ),
        database
          .prepare(
            "insert into storage_entries (id,storage_key,entry_kind,object_key,mount_key,logical_path,delivery_path,visibility,asset_type,asset_state,created_at,updated_at,deleted_at) values (?,?,?,?,?,?,?,?,?,?,?,?,null)",
          )
          .bind(
            id,
            storageKey,
            "file",
            input.objectKey.trim(),
            mountKey,
            logicalPath,
            deliveryPath,
            visibility,
            assetType,
            "ready",
            now,
            now,
          ),
      ]);
      return getById(id);
    },
    async createDirectory(
      input: Readonly<{
        storageKey?: unknown;
        mountKey?: unknown;
        directory?: unknown;
        name: unknown;
        visibility?: unknown;
      }>,
    ) {
      const storageKey = storageInstanceKey(input.storageKey),
        mountKey = storageMountKey(input.mountKey);
      const parent =
        input.directory === undefined || input.directory === ""
          ? ""
          : storageLogicalPath(input.directory);
      if (
        typeof input.name !== "string" ||
        !input.name.trim() ||
        input.name.includes("/")
      )
        throw new TypeError("Invalid Storage directory name");
      const logicalPath = parent
        ? `${parent}/${input.name.trim()}`
        : input.name.trim();
      storageLogicalPath(logicalPath);
      const now = new Date().toISOString(),
        id = crypto.randomUUID();
      await database
        .prepare(
          "insert into storage_entries (id,storage_key,entry_kind,object_key,mount_key,logical_path,delivery_path,visibility,asset_type,asset_state,created_at,updated_at,deleted_at) values (?,?,?,null,?,?,null,?,null,null,?,?,null)",
        )
        .bind(
          id,
          storageKey,
          "directory",
          mountKey,
          logicalPath,
          input.visibility ?? "private",
          now,
          now,
        )
        .run();
      return getById(id);
    },
    getById,
    getByObjectKey,
    async updateEntry(
      input: Readonly<{
        storageKey?: unknown;
        objectKey: unknown;
        mountKey?: unknown;
        logicalPath?: unknown;
        directory?: unknown;
        filename?: unknown;
        deliveryPath?: unknown;
        visibility?: unknown;
      }>,
    ) {
      const current = await getByObjectKey(input.storageKey, input.objectKey);
      if (!current)
        throw new StorageCatalogNotFoundError("Storage object not found");
      const mountKey =
        input.mountKey === undefined
          ? current.mountKey
          : storageMountKey(input.mountKey);
      const logicalPath = resolveLogicalPath(current.logicalPath, input);
      const deliveryPath =
        input.deliveryPath === undefined
          ? current.deliveryPath
          : storageLogicalPath(input.deliveryPath);
      const visibility = normalizeVisibility(
        input.visibility ?? current.visibility,
      );
      const now = new Date().toISOString();
      const ownerSiteId = deliveryPath
        ? await requireDeliveryClaimOwner(
            database,
            current.storageKey,
            mountKey,
            deliveryPath,
          )
        : undefined;
      const oldClaim =
        current.deliveryPath && current.deliveryPath !== deliveryPath
          ? tombstoneDeliveryClaimStatement(
              database,
              current.storageKey,
              current.deliveryPath,
              current.id,
              now,
            )
          : undefined;
      await database.batch([
        ...(oldClaim ? [oldClaim] : []),
        ...(ownerSiteId && deliveryPath
          ? [
              activateDeliveryClaimStatement(database, {
                storageKey: current.storageKey,
                deliveryPath,
                siteId: ownerSiteId,
                entryId: current.id,
                now,
              }),
            ]
          : []),
        database
          .prepare(
            "update storage_entries set mount_key=?,logical_path=?,delivery_path=?,visibility=?,updated_at=? where id=? and deleted_at is null",
          )
          .bind(
            mountKey,
            logicalPath,
            deliveryPath,
            visibility,
            now,
            current.id,
          ),
      ]);
      return getById(current.id);
    },
    async copyEntry(
      input: Readonly<{
        storageKey?: unknown;
        sourceObjectKey: unknown;
        mountKey?: unknown;
        logicalPath?: unknown;
        directory?: unknown;
        filename?: unknown;
        deliveryPath?: unknown;
        visibility?: unknown;
      }>,
    ) {
      const source = await getByObjectKey(
        input.storageKey,
        input.sourceObjectKey,
      );
      if (!source || !source.objectKey)
        throw new StorageCatalogNotFoundError("Storage object not found");
      const object = await storage.get(source.objectKey);
      if (!object?.body)
        throw new StorageCatalogNotFoundError(
          "Storage object content not found",
        );
      const logicalPath =
        input.logicalPath === undefined &&
        input.directory === undefined &&
        input.filename === undefined
          ? copyLogicalPath(source.logicalPath)
          : resolveLogicalPath(source.logicalPath, input);
      const deliveryPath = storageLogicalPath(
        input.deliveryPath ?? logicalPath,
      );
      // 复制内容与源对象字节一致：直接透传源的 body 流写入新对象，不在内存中整体缓冲；
      // 大小与校验和复用源 Catalog 元数据，避免为已知不变的内容重新读取或哈希。
      const id = await writeObjectEntry(database, storage, {
        storageKey: source.storageKey,
        mountKey: input.mountKey
          ? storageMountKey(input.mountKey)
          : source.mountKey,
        logicalPath,
        deliveryPath,
        visibility: normalizeVisibility(input.visibility ?? source.visibility),
        assetType: normalizeAssetType(source.assetType),
        contentType: source.contentType ?? "application/octet-stream",
        size: source.size ?? object.size ?? 0,
        checksumSha256: source.checksumSha256 ?? null,
        body: object.body,
      });
      return getById(id);
    },
    async deleteObject(storageKeyInput: unknown, objectKeyInput: unknown) {
      const current = await getByObjectKey(storageKeyInput, objectKeyInput);
      if (!current || !current.objectKey) return undefined;
      const now = new Date().toISOString();
      const claim = tombstoneDeliveryClaimStatement(
        database,
        current.storageKey,
        current.deliveryPath,
        current.id,
        now,
      );
      await database.batch([
        ...(claim ? [claim] : []),
        database
          .prepare(
            "update storage_entries set deleted_at=?,physical_delete_status='pending',physical_delete_error=null,updated_at=? where id=? and deleted_at is null",
          )
          .bind(now, now, current.id),
        database
          .prepare(
            "update storage_objects set deleted_at=?,updated_at=? where storage_key=? and object_key=? and deleted_at is null",
          )
          .bind(now, now, current.storageKey, current.objectKey),
      ]);
      await finalizePhysicalDelete(database, storage, current.id, current.objectKey);
      return current;
    },
    async renameDirectory(
      input: Readonly<{
        storageKey?: unknown;
        mountKey?: unknown;
        sourceDirectory: unknown;
        targetDirectory: unknown;
      }>,
    ) {
      const storageKey = storageInstanceKey(input.storageKey),
        mountKey = storageMountKey(input.mountKey),
        source = storageLogicalPath(input.sourceDirectory),
        target = storageLogicalPath(input.targetDirectory);
      assertDirectoryMove(source, target);
      const entries = await findDirectoryEntries(
        database,
        storageKey,
        mountKey,
        source,
      );
      if (!entries.length)
        throw new StorageCatalogNotFoundError("Storage directory not found");
      const now = new Date().toISOString();
      await batchInChunks(
        database,
        entries.map((entry) =>
          database
            .prepare(
              "update storage_entries set logical_path=?,updated_at=? where id=? and deleted_at is null",
            )
            .bind(
              replacePathPrefix(entry.logical_path, source, target),
              now,
              entry.id,
            ),
        ),
      );
      return {
        storageKey,
        mountKey,
        path: target,
        affectedCount: entries.length,
      };
    },
    async deleteDirectory(
      input: Readonly<{
        storageKey?: unknown;
        mountKey?: unknown;
        directory: unknown;
      }>,
    ) {
      const storageKey = storageInstanceKey(input.storageKey),
        mountKey = storageMountKey(input.mountKey),
        directory = storageLogicalPath(input.directory);
      const entries = await findDirectoryEntries(
        database,
        storageKey,
        mountKey,
        directory,
      );
      if (!entries.length)
        throw new StorageCatalogNotFoundError("Storage directory not found");
      const now = new Date().toISOString();
      await batchInChunks(
        database,
        entries.flatMap((entry) => {
          const claim = tombstoneDeliveryClaimStatement(
            database,
            storageKey,
            entry.delivery_path,
            entry.id,
            now,
          );
          return [
            ...(claim ? [claim] : []),
            database
              .prepare(
                entry.object_key
                  ? "update storage_entries set deleted_at=?,physical_delete_status='pending',physical_delete_error=null,updated_at=? where id=? and deleted_at is null"
                  : "update storage_entries set deleted_at=?,updated_at=? where id=? and deleted_at is null",
              )
              .bind(now, now, entry.id),
            ...(entry.object_key
              ? [
                  database
                    .prepare(
                      "update storage_objects set deleted_at=?,updated_at=? where storage_key=? and object_key=? and deleted_at is null",
                    )
                    .bind(now, now, storageKey, entry.object_key),
                ]
              : []),
          ];
        }),
      );
      const objectEntries = entries.flatMap((entry) =>
        entry.object_key ? [{ id: entry.id, objectKey: entry.object_key }] : [],
      );
      const outcomes = await mapWithConcurrency(
        objectEntries,
        STORAGE_OPERATION_CONCURRENCY,
        (entry) => finalizePhysicalDelete(database, storage, entry.id, entry.objectKey),
      );
      const physicalDeleteFailedCount = outcomes.filter(
        (succeeded) => !succeeded,
      ).length;
      return {
        storageKey,
        mountKey,
        path: directory,
        affectedCount: entries.length,
        objectKeys: objectEntries.map((entry) => entry.objectKey),
        ...(physicalDeleteFailedCount ? { physicalDeleteFailedCount } : {}),
      };
    },
    /** 对账扫描：重试物理删除失败/中断的 Entry(status in pending,failed)，用于常规粒度删除(非站点级联删除)的残留回收。 */
    async sweepPhysicalDeletes(limitInput: unknown = 100) {
      const limit = Number(limitInput);
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500)
        throw new TypeError("Invalid Storage physical delete sweep limit");
      const rows = await database
        .prepare(
          "select id,object_key from storage_entries where physical_delete_status in ('pending','failed') and object_key is not null order by updated_at,id limit ?",
        )
        .bind(limit)
        .all<{ id: string; object_key: string }>();
      const outcomes = await mapWithConcurrency(
        rows.results,
        STORAGE_OPERATION_CONCURRENCY,
        (row) => finalizePhysicalDelete(database, storage, row.id, row.object_key),
      );
      const succeeded = outcomes.filter(Boolean).length;
      return {
        scanned: rows.results.length,
        succeeded,
        failed: rows.results.length - succeeded,
        remainingPossible: rows.results.length === limit,
      };
    },
    getByDeliveryPath,
    readByDeliveryPath,
    async readPublic(deliveryPathInput: unknown, storageKeyInput?: unknown) {
      const result = await readByDeliveryPath(
        deliveryPathInput,
        storageKeyInput,
        "public",
      );
      return result
        ? {
            body: result.body,
            contentType: result.entry.contentType ?? "application/octet-stream",
            size: result.entry.size ?? 0,
            etag: result.entry.etag ?? "",
            objectKey: result.entry.objectKey ?? "",
          }
        : undefined;
    },
  };
}
export class StorageCatalogNotFoundError extends Error {}
/** 写入对象字节与 Catalog 行(storage_objects + storage_entries)，put() 与 copyEntry() 共用同一事务/补偿语义。 */
async function writeObjectEntry(
  database: Database,
  storage: Storage,
  params: Readonly<{
    storageKey: string;
    mountKey: string;
    logicalPath: string;
    deliveryPath: string;
    visibility: "public" | "private";
    assetType: "binary" | "image" | "video" | "audio" | "document";
    contentType: string;
    size: number;
    checksumSha256: string | null;
    body: BodyInit;
  }>,
) {
  const objectKey = `${params.storageKey}/${crypto.randomUUID()}`;
  const ownerSiteId = await requireDeliveryClaimOwner(
    database,
    params.storageKey,
    params.mountKey,
    params.deliveryPath,
  );
  const written = await storage.put(objectKey, params.body, {
    contentType: params.contentType,
  });
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  try {
    await database.batch([
      ...(ownerSiteId
        ? [
            activateDeliveryClaimStatement(database, {
              storageKey: params.storageKey,
              deliveryPath: params.deliveryPath,
              siteId: ownerSiteId,
              entryId: id,
              now,
            }),
          ]
        : []),
      database
        .prepare(
          "insert into storage_objects (id,storage_key,object_key,content_type,size,checksum_sha256,etag,created_at,updated_at,deleted_at) values (?,?,?,?,?,?,?,?,?,null)",
        )
        .bind(
          crypto.randomUUID(),
          params.storageKey,
          objectKey,
          params.contentType,
          params.size,
          params.checksumSha256,
          written.etag ?? crypto.randomUUID(),
          now,
          now,
        ),
      database
        .prepare(
          "insert into storage_entries (id,storage_key,entry_kind,object_key,mount_key,logical_path,delivery_path,visibility,asset_type,asset_state,created_at,updated_at,deleted_at) values (?,?,?,?,?,?,?,?,?,?,?,?,null)",
        )
        .bind(
          id,
          params.storageKey,
          "file",
          objectKey,
          params.mountKey,
          params.logicalPath,
          params.deliveryPath,
          params.visibility,
          params.assetType,
          "ready",
          now,
          now,
        ),
    ]);
  } catch (error) {
    await storage.delete(objectKey);
    throw error;
  }
  return id;
}
/** 物理删除并落地终态；失败时记录 physical_delete_error 供 sweepPhysicalDeletes 重试，而不是静默停留在 pending。 */
async function finalizePhysicalDelete(
  database: Database,
  storage: Storage,
  entryId: string,
  objectKey: string,
): Promise<boolean> {
  try {
    await storage.delete(objectKey);
    await database
      .prepare(
        "update storage_entries set physical_delete_status='deleted',physical_delete_error=null,updated_at=? where id=? and physical_delete_status in ('pending','failed')",
      )
      .bind(new Date().toISOString(), entryId)
      .run();
    return true;
  } catch (error) {
    await database
      .prepare(
        "update storage_entries set physical_delete_status='failed',physical_delete_error=?,updated_at=? where id=? and physical_delete_status in ('pending','failed')",
      )
      .bind(errorMessage(error), new Date().toISOString(), entryId)
      .run();
    return false;
  }
}
function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 500 ? message.slice(0, 500) : message;
}
function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size)
    chunks.push(items.slice(index, index + size));
  return chunks;
}
async function batchInChunks(
  database: Database,
  statements: readonly DatabaseStatement[],
  size = DIRECTORY_STATEMENT_CHUNK_SIZE,
) {
  for (const part of chunk(statements, size)) await database.batch(part);
}
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index]!);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
  return results;
}
async function sha256Hex(bytes: Uint8Array) {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
  );
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function normalizeChecksum(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value))
    throw new TypeError("Invalid Storage checksumSha256");
  return value.toLowerCase();
}
function normalizeAssetType(value: unknown) {
  const result = value ?? "binary";
  if (
    !["binary", "image", "video", "audio", "document"].includes(String(result))
  )
    throw new TypeError("Invalid Storage asset type");
  return result as "binary" | "image" | "video" | "audio" | "document";
}
function mapEntry(row: EntryRow) {
  return {
    id: row.id,
    storageKey: row.storage_key,
    entryKind: row.entry_kind,
    objectKey: row.object_key ?? null,
    mountKey: row.mount_key,
    logicalPath: row.logical_path,
    deliveryPath: row.delivery_path ?? null,
    visibility: row.visibility ?? null,
    assetType: row.asset_type ?? null,
    assetState: row.asset_state ?? null,
    contentType: row.content_type ?? null,
    size: row.size === undefined ? null : Number(row.size),
    checksumSha256: row.checksum_sha256 ?? null,
    etag: row.etag ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function normalizeVisibility(value: unknown): "public" | "private" {
  if (value !== "public" && value !== "private")
    throw new TypeError("Invalid Storage visibility");
  return value;
}
function resolveLogicalPath(
  current: string,
  input: Readonly<{
    logicalPath?: unknown;
    directory?: unknown;
    filename?: unknown;
  }>,
) {
  if (input.logicalPath !== undefined)
    return storageLogicalPath(input.logicalPath);
  const segments = current.split("/");
  const filename =
    input.filename === undefined
      ? segments.at(-1)!
      : storageFileName(input.filename);
  const directory =
    input.directory === undefined
      ? segments.slice(0, -1).join("/")
      : input.directory === ""
        ? ""
        : storageLogicalPath(input.directory);
  return storageLogicalPath(directory ? `${directory}/${filename}` : filename);
}
function storageFileName(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > 255 ||
    value.includes("/") ||
    value.includes("\\") ||
    value === "." ||
    value === ".."
  )
    throw new TypeError("Invalid Storage filename");
  return value.trim();
}
function copyLogicalPath(path: string) {
  const parts = path.split("/"),
    filename = parts.pop()!,
    dot = filename.lastIndexOf("."),
    copied =
      dot > 0
        ? `${filename.slice(0, dot)}-copy${filename.slice(dot)}`
        : `${filename}-copy`;
  return [...parts, copied].join("/");
}
function assertDirectoryMove(source: string, target: string) {
  if (source === target || target.startsWith(`${source}/`))
    throw new TypeError("Storage directory cannot be moved into itself");
}
function replacePathPrefix(path: string, source: string, target: string) {
  return path === source ? target : `${target}${path.slice(source.length)}`;
}
async function findDirectoryEntries(
  database: Database,
  storageKey: string,
  mountKey: string,
  directory: string,
) {
  const rows = await database
    .prepare(
      "select id,logical_path,object_key,delivery_path from storage_entries where storage_key=? and mount_key=? and deleted_at is null and (logical_path=? or logical_path like ?) order by length(logical_path) desc",
    )
    .bind(storageKey, mountKey, directory, `${directory}/%`)
    .all<
      Pick<EntryRow, "id" | "logical_path" | "object_key" | "delivery_path">
    >();
  return rows.results;
}
