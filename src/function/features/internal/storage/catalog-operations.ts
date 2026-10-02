import type { RouteContext } from "@/function/common/route/definition";
import { applicationUnavailableError } from "@/function/common/app/error";
import {
  defineDataCommand,
  defineDataQuery,
  defineResultOperation,
  type RouteContract,
} from "@/function/common/app/operation";
import type {
  FileResult,
  FileResultCachePolicy,
} from "@/function/common/route/definition";
import type { Infer } from "@/function/common/app/schema";
import {
  createStorageCatalog,
  StorageCatalogNotFoundError,
} from "@/function/common/storage/catalog";
import {
  createStorageReadUrl,
  readDisposition,
  readPurpose,
  resolveReadExpiry,
  verifyStorageReadUrl,
} from "@/function/common/storage/read-url";
import { readObjectStorageCapabilities } from "@/function/common/storage/model";
import {
  storageInstanceKey,
  storageLogicalPath,
  storageMountKey,
} from "@/function/common/storage/upload-ticket";
import { storagePublicUrl } from "@/function/common/storage/public-url";
import { storageObjectCacheTag } from "@/function/common/storage/cache-tags";
import {
  createStorageUploadSessions,
  StorageUploadError,
} from "@/function/common/storage/upload-session";
import * as contracts from "./contracts";

export const listStorageMountsQuery = query(
  contracts.listStorageMountsContract,
  async (context, input) => {
    const database = context.services.database;
    if (!database) unavailable(context, "database");
    const storageKey = storageInstanceKey(input.storageKey);
    const catalogMounts = await database
      .prepare(
        `select distinct mount_key from storage_entries
         where storage_key=? and deleted_at is null
         order by mount_key`,
      )
      .bind(storageKey)
      .all<{ mount_key: string }>();
    const byKey = new Map<
      string,
      {
        key: string;
        label: string;
        kind: "public" | "site";
        siteId?: string;
      }
    >();
    byKey.set("public", { key: "public", label: "Public", kind: "public" });
    for (const row of catalogMounts.results) {
      if (byKey.has(row.mount_key)) continue;
      byKey.set(row.mount_key, storageMountOption(row.mount_key));
    }
    return {
      mounts: [
        byKey.get("public")!,
        ...[...byKey.values()]
          .filter((item) => item.key !== "public")
          .sort((left, right) => left.label.localeCompare(right.label)),
      ],
    };
  },
);
export const issueStorageUploadTicketCommand = command(
  contracts.issueStorageUploadTicketContract,
  async (context, input) => {
    const resolved = services(context);
    const ticket = await resolved.uploadTickets.create({
      subject: "admin.storage",
      storageKey: storageInstanceKey(input.storageKey),
      ...(input.maxFileSize !== undefined
        ? { maxFileSize: Number(input.maxFileSize) }
        : {}),
      ...(input.ttlSeconds !== undefined
        ? { ttlSeconds: Number(input.ttlSeconds) }
        : { ttlSeconds: 300 }),
    });
    return { token: ticket.token, expiresAt: ticket.expiresAt };
  },
);
export const browseStorageCatalogQuery = query(
  contracts.browseStorageCatalogContract,
  async (context, input) => {
  const resolved = services(context),
    storageKey = storageInstanceKey(input.storageKey),
    mountKey = storageMountKey(input.mountKey),
    directory = text(input.directory) ?? "";
  return resolved.catalog.browse({
    storageKey,
    mountKey,
    directory,
    keyword: text(input.keyword),
    visibility: text(input.visibility),
    limit: input.limit,
  });
  },
);
export const resumeStorageUploadCommand = publicCommand(
  contracts.resumeStorageUploadContract,
  async (context, input) => {
    const resolved = services(context),
      storageKey = storageInstanceKey(input.storageKey),
      mountKey = storageMountKey(input.mountKey),
      requestedLogicalPath = storageLogicalPath(input.logicalPath),
      requestedDeliveryPath = storageLogicalPath(
        input.deliveryPath ?? input.logicalPath,
      );
    if (
      input.deliveryPathConflict !== undefined &&
      input.deliveryPathConflict !== "error" &&
      input.deliveryPathConflict !== "random-suffix"
    )
      throw new TypeError("Invalid Storage deliveryPathConflict");
    const paths =
      input.deliveryPathConflict === "random-suffix"
        ? await availableUploadPaths(
            context,
            storageKey,
            mountKey,
            requestedLogicalPath,
            requestedDeliveryPath,
          )
        : {
            logicalPath: requestedLogicalPath,
            deliveryPath: requestedDeliveryPath,
          };
    const ticket = await resolved.uploadTickets.verify(input.ticket, {
      sizeBytes: Number(input.sizeBytes),
      mountKey,
      logicalPath: requestedLogicalPath,
      visibility: input.visibility ?? "private",
    });
    return uploads(context).resume({
      ...input,
      logicalPath: paths.logicalPath,
      deliveryPath: paths.deliveryPath,
      ticketId: ticket.id,
    });
  },
);
export const createStorageUploadCommand = publicCommand(
  contracts.createStorageUploadContract,
  async (context, input) => {
    const resolved = services(context),
      storageKey = storageInstanceKey(input.storageKey),
      mountKey = storageMountKey(input.mountKey),
      requestedLogicalPath = storageLogicalPath(input.logicalPath),
      requestedDeliveryPath = storageLogicalPath(
        input.deliveryPath ?? input.logicalPath,
      );
    if (
      input.deliveryPathConflict !== undefined &&
      input.deliveryPathConflict !== "error" &&
      input.deliveryPathConflict !== "random-suffix"
    )
      throw new TypeError("Invalid Storage deliveryPathConflict");
    const paths =
      input.deliveryPathConflict === "random-suffix"
        ? await availableUploadPaths(
            context,
            storageKey,
            mountKey,
            requestedLogicalPath,
            requestedDeliveryPath,
          )
        : {
            logicalPath: requestedLogicalPath,
            deliveryPath: requestedDeliveryPath,
          };
    const ticket = await resolved.uploadTickets.verify(input.ticket, {
      sizeBytes: Number(input.sizeBytes),
      mountKey,
      logicalPath: requestedLogicalPath,
      visibility: input.visibility ?? "private",
    });
    return uploads(context).create({
      ...input,
      logicalPath: paths.logicalPath,
      deliveryPath: paths.deliveryPath,
      ticketId: ticket.id,
    });
  },
);
export const createStorageDirectoryCommand = command(
  contracts.createStorageDirectoryContract,
  async (context, input) => {
  const resolved = services(context),
    storageKey = storageInstanceKey(input.storageKey),
    mountKey = storageMountKey(input.mountKey),
    directory = input.directory ? storageLogicalPath(input.directory) : "",
    visibility = readVisibility(input.visibility) ?? "private";
  return requiredEntry(await resolved.catalog.createDirectory({
    storageKey,
    mountKey,
    directory,
    name: input.name,
    visibility,
  }));
  },
);
export const readStorageCatalogObjectQuery = query(
  contracts.readStorageCatalogObjectContract,
  async (context, input) => {
  const resolved = services(context),
    item = await resolved.catalog.getByObjectKey(
      storageInstanceKey(input.storageKey),
      input.objectKey,
    );
  if (!item) throw new StorageCatalogNotFoundError("Storage object not found");
    return item;
  },
);
export const deleteStorageCatalogObjectCommand = command(
  contracts.deleteStorageCatalogObjectContract,
  async (context, input) => {
    const resolved = services(context),
      item = await resolved.catalog.getByObjectKey(
        storageInstanceKey(input.storageKey),
        input.objectKey,
      );
    if (!item?.objectKey)
      throw new StorageCatalogNotFoundError("Storage object not found");
    await resolved.catalog.deleteObject(item.storageKey, item.objectKey);
    await context.effects.purgeResponseCache({
      tags: [storageObjectCacheTag(item.objectKey)],
    });
    return { objectKey: item.objectKey, deleted: true as const };
  },
);
export const updateStorageCatalogEntryCommand = command(
  contracts.updateStorageCatalogEntryContract,
  async (context, input) => {
    const resolved = services(context),
      current = await resolved.catalog.getByObjectKey(
        input.storageKey,
        input.objectKey,
      );
    if (!current)
      throw new StorageCatalogNotFoundError("Storage object not found");
    const next = await resolved.catalog.updateEntry({
      ...input,
      objectKey: input.objectKey,
    });
    if (
      current.objectKey &&
      (current.deliveryPath !== next?.deliveryPath ||
        current.visibility !== next?.visibility)
    )
      await context.effects.purgeResponseCache({
        tags: [storageObjectCacheTag(current.objectKey)],
      });
    return requiredEntry(next);
  },
);
export const copyStorageCatalogEntryCommand = command(
  contracts.copyStorageCatalogEntryContract,
  async (context, input) => {
    const resolved = services(context),
      source = await resolved.catalog.getByObjectKey(
        input.storageKey,
        input.sourceObjectKey,
      );
    if (!source)
      throw new StorageCatalogNotFoundError("Storage object not found");
    if (
      input.deliveryPathConflict !== undefined &&
      input.deliveryPathConflict !== "error" &&
      input.deliveryPathConflict !== "random-suffix"
    )
      throw new TypeError("Invalid Storage deliveryPathConflict");
    const logicalPath =
      input.logicalPath ?? requestedPath(source.logicalPath, input);
    const requestedDeliveryPath = storageLogicalPath(
      input.deliveryPath ?? logicalPath,
    );
    const mountKey = storageMountKey(input.mountKey ?? source.mountKey);
    const paths =
      input.deliveryPathConflict === "random-suffix"
        ? await availableUploadPaths(
            context,
            source.storageKey,
            mountKey,
            storageLogicalPath(logicalPath),
            requestedDeliveryPath,
          )
        : {
            logicalPath: storageLogicalPath(logicalPath),
            deliveryPath: requestedDeliveryPath,
          };
    return requiredEntry(await resolved.catalog.copyEntry({
      ...input,
      logicalPath: paths.logicalPath,
      deliveryPath: paths.deliveryPath,
      sourceObjectKey: input.sourceObjectKey,
    }));
  },
);
export const renameStorageDirectoryCommand = command(
  contracts.renameStorageDirectoryContract,
  async (context, input) => {
  const resolved = services(context);
  storageLogicalPath(input.sourceDirectory);
  storageLogicalPath(input.targetDirectory);
  return resolved.catalog.renameDirectory({
    ...input,
    sourceDirectory: input.sourceDirectory,
    targetDirectory: input.targetDirectory,
  });
  },
);
export const deleteStorageDirectoryCommand = command(
  contracts.deleteStorageDirectoryContract,
  async (context, input) => {
  const resolved = services(context);
  storageLogicalPath(input.directory);
  const { objectKeys, ...result } = await resolved.catalog.deleteDirectory({
    ...input,
    directory: input.directory,
  });
  if (objectKeys.length)
    await context.effects.purgeResponseCache({
      tags: objectKeys.map(storageObjectCacheTag),
    });
  return result;
  },
);
export const createStorageReadUrlCommand = command(
  contracts.createStorageReadUrlContract,
  (context, input) => readUrl(context, services(context), input),
);
export const createStorageReadUrlsCommand = command(
  contracts.createStorageReadUrlsContract,
  async (context, input) => {
  const resolved = services(context);
  return Promise.all(
    input.deliveryPaths.map((deliveryPath) =>
      readUrl(context, resolved, { ...input, deliveryPath }),
    ),
  );
  },
);
export const readSignedStorageContentQuery = defineResultOperation({
  contract: contracts.readSignedStorageContentContract,
  mapError: contracts.mapStorageError,
  async execute(context, input) {
    const resolved = services(context);
    const storageKey = storageInstanceKey(input.storageKey);
    const deliveryPath = storageLogicalPath(input.deliveryPath);
    const purpose = readPurpose(input.purpose);
    const disposition = readDisposition(input.disposition, purpose);
    const verification = await verifyStorageReadUrl({
      storageKey,
      deliveryPath,
      visibility: input.visibility,
      purpose,
      disposition,
      expiresAt: input.expiresAt,
      signature: input.signature,
      secret: readSecret(context),
    });
    if (verification === "expired")
      throw contracts.storageReadUrlExpiredError();
    if (verification !== "ok") throw contracts.storageReadUrlInvalidError();
    const result = await resolved.catalog.readByDeliveryPath(
      deliveryPath,
      storageKey,
      input.visibility,
    );
    if (!result)
      throw new StorageCatalogNotFoundError("Storage object not found");
    const filename =
      deliveryPath.split("/").at(-1)?.replaceAll(/["\\\r\n]/g, "_") ??
      "download";
    return {
      type: "file",
      body: result.body,
      headers: {
        "cache-control": "private, no-store",
        "content-type": result.entry.contentType ?? "application/octet-stream",
        "content-length": String(result.entry.size ?? 0),
        "content-disposition": `${disposition}; filename="${filename}"`,
        "x-robots-tag": "noindex, nofollow, noarchive",
        ...(result.entry.etag ? { etag: result.entry.etag } : {}),
      },
    } satisfies FileResult;
  },
});
export const readPublicStorageContentQuery = defineResultOperation({
  contract: contracts.readPublicStorageContentContract,
  mapError: contracts.mapStorageError,
  async execute(context, input) {
    const result = await services(context).catalog.readPublic(
      storageLogicalPath(input.deliveryPath),
      input.storageKey ? storageInstanceKey(input.storageKey) : undefined,
    );
    if (!result)
      throw new StorageCatalogNotFoundError("Storage object not found");
    return {
      type: "file",
      body: result.body,
      headers: {
        "content-type": result.contentType,
        "content-length": String(result.size),
        etag: result.etag,
      },
      cache: storagePublicCachePolicy(result.objectKey),
    } satisfies FileResult;
  },
});
export const completeStorageUploadCommand = publicCommand(
  contracts.completeStorageUploadContract,
  async (context, input) => {
    const completed = await uploads(context).complete(
      text(input.id),
      input.sessionKey,
      input.parts === undefined
        ? undefined
        : {
            parts: input.parts as readonly Readonly<{
              partNumber: number;
              etag: string;
            }>[],
          },
    );
    return requiredEntry(completed.entry);
  },
);
export const readStorageUploadStatusQuery = publicQuery(
  contracts.readStorageUploadStatusContract,
  (context, input) => uploads(context).status(input.id, input.sessionKey),
);
export const signStorageUploadPartsCommand = publicCommand(
  contracts.signStorageUploadPartsContract,
  async (context, input) => {
    const service = uploads(context),
      status = await service.status(text(input.id), input.sessionKey),
      requested =
        input.partNumbers === undefined
          ? status.nextPartNumbers
          : input.partNumbers;
    if (!Array.isArray(requested) || requested.length > 100)
      throw new TypeError("Invalid Storage upload partNumbers");
    const allowed = new Set(status.nextPartNumbers),
      partNumbers = requested.map((value) => {
        const part = Number(value);
        if (!allowed.has(part))
          throw new TypeError("Invalid Storage upload partNumber");
        return part;
      });
    return service.signParts(text(input.id), input.sessionKey, partNumbers);
  },
);
export const abortStorageUploadCommand = publicCommand(
  contracts.abortStorageUploadContract,
  (context, input) => uploads(context).abort(input.id, input.sessionKey),
);

function query<const TContract extends RouteContract>(
  contract: TContract,
  run: (
    context: RouteContext,
    input: Infer<TContract["input"]>,
  ) => Infer<TContract["output"]> | Promise<Infer<TContract["output"]>>,
) {
  return defineDataQuery({
    contract,
    mapError: contracts.mapStorageError,
    execute: run,
  });
}
function command<const TContract extends RouteContract>(
  contract: TContract,
  run: (
    context: RouteContext,
    input: Infer<TContract["input"]>,
  ) => Infer<TContract["output"]> | Promise<Infer<TContract["output"]>>,
) {
  return defineDataCommand({
    contract,
    mapError: contracts.mapStorageError,
    execute: run,
  });
}
function publicQuery<const TContract extends RouteContract>(
  contract: TContract,
  run: (
    context: RouteContext,
    input: Infer<TContract["input"]>,
  ) => Infer<TContract["output"]> | Promise<Infer<TContract["output"]>>,
) {
  return defineDataQuery({
    contract,
    mapError: contracts.mapStorageError,
    execute: run,
  });
}
function publicCommand<const TContract extends RouteContract>(
  contract: TContract,
  run: (
    context: RouteContext,
    input: Infer<TContract["input"]>,
  ) => Infer<TContract["output"]> | Promise<Infer<TContract["output"]>>,
) {
  return defineDataCommand({
    contract,
    mapError: contracts.mapStorageError,
    execute: run,
  });
}
function services(context: RouteContext) {
  const database = context.services.database,
    storage = context.services.getStorage();
  if (!database) unavailable(context, "database");
  if (!storage) unavailable(context, "storage");
  return {
    catalog: createStorageCatalog(database, storage),
    uploadTickets: storage.uploadTickets,
    storage,
  };
}
type Services = ReturnType<typeof services>;
function uploads(context: RouteContext) {
  const database = context.services.database,
    storage = context.services.getStorage();
  if (!database || !storage) throw applicationUnavailableError();
  return createStorageUploadSessions(database, storage);
}
async function readUrl(
  context: RouteContext,
  resolved: Services,
  input: Infer<typeof contracts.createStorageReadUrlContract.input>,
) {
  const storageKey = storageInstanceKey(input.storageKey),
    deliveryPath = storageLogicalPath(input.deliveryPath),
    purpose = readPurpose(input.purpose),
    disposition = readDisposition(input.disposition, purpose),
    expiresAt = resolveReadExpiry(input.expiresAt, input.ttlSeconds),
    visibility = readVisibility(input.visibility) ?? "private",
    entry = await resolved.catalog.getByDeliveryPath(
      deliveryPath,
      storageKey,
      visibility,
    );
  if (!entry) throw new StorageCatalogNotFoundError("Storage object not found");
  const storageCapabilities = await readObjectStorageCapabilities(
    resolved.storage,
  );
  const url =
    entry.visibility === "public"
      ? storagePublicUrl(storageKey, deliveryPath)
      : storageCapabilities.signedGet && entry.objectKey
        ? (
            await resolved.storage.signGet(
              entry.objectKey,
              signedExpiry(expiresAt),
              {
                contentType: entry.contentType ?? undefined,
                disposition: contentDisposition(
                  disposition,
                  deliveryPath.split("/").at(-1),
                ),
              },
            )
          ).url
        : await createStorageReadUrl({
            storageKey,
            deliveryPath,
            visibility: "private",
            purpose,
            disposition,
            expiresAt,
            secret: readSecret(context),
          });
  return { deliveryPath, disposition, expiresAt, purpose, url };
}
function unavailable(_context: RouteContext, name: string): never {
  throw applicationUnavailableError(new Error(`${name} is not configured`));
}
function storageMountOption(mountKey: string): {
  key: string;
  label: string;
  kind: "public" | "site";
  siteId?: string;
} {
  if (mountKey === "public")
    return { key: "public", label: "Public", kind: "public" };
  const siteId = mountKey.startsWith("site/")
    ? mountKey.slice("site/".length)
    : undefined;
  return {
    key: mountKey,
    label: siteId ? `Site ${siteId.slice(0, 8)}` : mountKey,
    kind: "site",
    ...(siteId ? { siteId } : {}),
  };
}
function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function readVisibility(value: unknown): "public" | "private" | undefined {
  if (value === undefined || value === null || value === "" || value === "all")
    return undefined;
  if (value === "public" || value === "private") return value;
  throw new TypeError("Invalid Storage visibility");
}
function requestedPath(
  current: string,
  input: Infer<typeof contracts.copyStorageCatalogEntryContract.input>,
) {
  const parts = current.split("/"),
    filename = input.filename ?? parts.at(-1),
    directory = input.directory ?? parts.slice(0, -1).join("/");
  return directory
    ? `${String(directory)}/${String(filename)}`
    : String(filename);
}

function storagePublicCachePolicy(objectKey: string): FileResultCachePolicy {
  return {
    mode: "public",
    browserTtlSeconds: 3_600,
    sharedTtlSeconds: 86_400,
    staleWhileRevalidateSeconds: 3_600,
    surrogateKeys: [storageObjectCacheTag(objectKey)],
  };
}
function requiredEntry<T>(entry: T | undefined): T {
  if (!entry)
    throw new StorageCatalogNotFoundError("Storage catalog entry was not materialized");
  return entry;
}
function readSecret(context: RouteContext) {
  const secret = context.secrets.storageReadUrlSecret;
  if (!secret)
    throw applicationUnavailableError(
      new Error("STORAGE_READ_URL_SECRET is not configured"),
    );
  return secret;
}
function signedExpiry(expiresAt: string) {
  return Math.max(
    1,
    Math.min(604_800, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)),
  );
}
function contentDisposition(
  disposition: "inline" | "attachment",
  filename?: string,
) {
  return filename
    ? `${disposition}; filename="${filename.replaceAll(/["\\\r\n]/g, "_")}"`
    : disposition;
}
async function availableUploadPaths(
  context: RouteContext,
  storageKey: string,
  mountKey: string,
  requestedLogicalPath: string,
  requestedDeliveryPath: string,
) {
  const database = context.services.database;
  if (!database) unavailable(context, "database");
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = attempt === 0 ? null : crypto.randomUUID().slice(0, 8);
    const logicalPath = suffix
      ? withRandomSuffix(requestedLogicalPath, suffix)
      : requestedLogicalPath;
    const deliveryPath = suffix
      ? withRandomSuffix(requestedDeliveryPath, suffix)
      : requestedDeliveryPath;
    // 合并占用检查为 1 次往返,减少每次冲突重试的数据库延迟。
    const row = await database
      .prepare(
        `select
          exists(select 1 from storage_entries where storage_key=? and mount_key=? and logical_path=? and deleted_at is null) as logical_entry_occupied,
          exists(select 1 from storage_entries where storage_key=? and delivery_path=? and deleted_at is null) as delivery_entry_occupied,
          exists(select 1 from storage_upload_sessions where storage_key=? and mount_key=? and logical_path=? and status in ('pending','cleanup_pending')) as logical_upload_occupied,
          exists(select 1 from storage_upload_sessions where storage_key=? and delivery_path=? and status in ('pending','cleanup_pending')) as delivery_upload_occupied,
          (select state from storage_delivery_claims where storage_key=? and delivery_path=?) as claim_state`,
      )
      .bind(
        storageKey,
        mountKey,
        logicalPath,
        storageKey,
        deliveryPath,
        storageKey,
        mountKey,
        logicalPath,
        storageKey,
        deliveryPath,
        storageKey,
        deliveryPath,
      )
      .first<{
        logical_entry_occupied: number;
        delivery_entry_occupied: number;
        logical_upload_occupied: number;
        delivery_upload_occupied: number;
        claim_state: string | null;
      }>();
    if (
      row &&
      !row.logical_entry_occupied &&
      !row.delivery_entry_occupied &&
      !row.logical_upload_occupied &&
      !row.delivery_upload_occupied &&
      (!row.claim_state || row.claim_state === "released")
    )
      return { logicalPath, deliveryPath };
  }
  throw new StorageUploadError(
    "Could not allocate an available Storage upload path",
  );
}
function withRandomSuffix(path: string, suffix = crypto.randomUUID().slice(0, 8)) {
  const slash = path.lastIndexOf("/"),
    directory = slash >= 0 ? path.slice(0, slash + 1) : "",
    filename = slash >= 0 ? path.slice(slash + 1) : path,
    dot = filename.lastIndexOf(".");
  return dot > 0
    ? `${directory}${filename.slice(0, dot)}-${suffix}${filename.slice(dot)}`
    : `${directory}${filename}-${suffix}`;
}
