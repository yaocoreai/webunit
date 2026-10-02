import type { CacheStore } from "@/function/common/capabilities/contracts";

export type StorageUploadGrant = Readonly<{
  purpose: "upload";
  subject: string;
  storageKey: string;
  maxFileSize: number;
  mountKey?: string;
  logicalPathPrefix?: string;
  visibility?: "public" | "private";
}>;

export type StorageUploadTicket = StorageUploadGrant &
  Readonly<{
    id: string;
    token: string;
    createdAt: string;
    expiresAt: string;
  }>;

type StoredTicket = Omit<StorageUploadTicket, "token">;

const DEFAULT_MAX_FILE_SIZE = 1024 * 1024 * 1024;

export function createStorageUploadTicketService(cache: CacheStore) {
  return {
    async create(
      input: Readonly<{
        subject: string;
        storageKey?: string;
        maxFileSize?: number;
        ttlSeconds?: number;
        mountKey?: string;
        logicalPathPrefix?: string;
        visibility?: "public" | "private";
      }>,
    ): Promise<StorageUploadTicket> {
      const ttl = input.ttlSeconds ?? 900;
      if (!Number.isSafeInteger(ttl) || ttl < 1 || ttl > 3_600)
        throw new TypeError("Invalid Storage upload ticket ttlSeconds");
      const subject = input.subject.trim();
      if (!subject || subject.length > 240)
        throw new TypeError("Invalid Storage upload ticket subject");
      const maxFileSize = input.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
      if (!Number.isSafeInteger(maxFileSize) || maxFileSize < 1)
        throw new TypeError("Invalid Storage upload ticket maxFileSize");
      const mountKey =
        input.mountKey === undefined
          ? undefined
          : storageMountKey(input.mountKey);
      const logicalPathPrefix =
        input.logicalPathPrefix === undefined
          ? undefined
          : storageLogicalPath(input.logicalPathPrefix);
      const visibility = input.visibility;
      if (
        visibility !== undefined &&
        visibility !== "public" &&
        visibility !== "private"
      )
        throw new TypeError("Invalid Storage upload ticket visibility");
      const createdAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + ttl * 1_000).toISOString();
      const token = `sut-${crypto.randomUUID()}-${randomHex(16)}`;
      const ticket: StorageUploadTicket = {
        id: crypto.randomUUID(),
        token,
        purpose: "upload",
        subject,
        storageKey: storageInstanceKey(input.storageKey),
        maxFileSize,
        createdAt,
        expiresAt,
        ...(mountKey ? { mountKey } : {}),
        ...(logicalPathPrefix ? { logicalPathPrefix } : {}),
        ...(visibility ? { visibility } : {}),
      };
      await cache.put(
        await cacheKey(token),
        JSON.stringify(stripToken(ticket)),
        {
          expirationTtl: ttl,
        },
      );
      return ticket;
    },

    async verify(
      tokenInput: unknown,
      target: Readonly<{
        sizeBytes: number;
        mountKey?: string;
        logicalPath?: string;
        visibility?: "public" | "private";
      }> = { sizeBytes: 1 },
    ): Promise<StorageUploadTicket> {
      const token = normalizeToken(tokenInput);
      const encoded = await cache.get(await cacheKey(token));
      if (!encoded)
        throw new StorageUploadTicketError(
          "Storage upload ticket is invalid or expired",
        );
      const record = JSON.parse(encoded) as StoredTicket;
      if (
        record.purpose !== "upload" ||
        Date.parse(record.expiresAt) <= Date.now()
      )
        throw new StorageUploadTicketError(
          "Storage upload ticket is invalid or expired",
        );
      if (
        !Number.isSafeInteger(target.sizeBytes) ||
        target.sizeBytes < 1 ||
        target.sizeBytes > record.maxFileSize
      )
        throw new StorageUploadTicketError(
          "Storage upload exceeds the ticket file-size limit",
        );
      if (
        record.mountKey &&
        storageMountKey(target.mountKey ?? "public") !== record.mountKey
      )
        throw new StorageUploadTicketError(
          "Storage upload does not match the ticket mount",
        );
      if (record.logicalPathPrefix) {
        const logicalPath = storageLogicalPath(target.logicalPath ?? "");
        if (
          logicalPath !== record.logicalPathPrefix &&
          !logicalPath.startsWith(`${record.logicalPathPrefix}/`)
        )
          throw new StorageUploadTicketError(
            "Storage upload does not match the ticket path prefix",
          );
      }
      if (
        record.visibility &&
        (target.visibility ?? "private") !== record.visibility
      )
        throw new StorageUploadTicketError(
          "Storage upload does not match the ticket visibility",
        );
      return { ...record, token };
    },
  };
}

export type StorageUploadTicketService = ReturnType<
  typeof createStorageUploadTicketService
>;
export class StorageUploadTicketError extends Error {}

function normalizeToken(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^sut-[a-z0-9-]{8,160}$/i.test(value.trim())
  )
    throw new StorageUploadTicketError(
      "Storage upload ticket is invalid or expired",
    );
  return value.trim();
}
function normalizePath(value: string, allowRoot = false) {
  const normalized = value
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\/+|\/+$/g, "");
  if (!normalized && allowRoot) return "";
  if (
    !normalized ||
    normalized.length > 512 ||
    normalized
      .split("/")
      .some(
        (part) => !part || part === "." || part === ".." || part.includes("\0"),
      )
  )
    throw new TypeError("Invalid Storage logical path");
  return normalized;
}
export const storageLogicalPath = (value: unknown) =>
  typeof value === "string" ? normalizePath(value) : invalid("logicalPath");
export const storageMountKey = (value: unknown) =>
  mountKey(typeof value === "string" && value.trim() ? value : "public");
export const storageInstanceKey = (value: unknown) =>
  instanceKey(typeof value === "string" && value.trim() ? value : "default");
function mountKey(value: string) {
  const normalized = value
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\/+|\/+$/g, "");
  if (
    !normalized ||
    normalized.length > 128 ||
    normalized
      .split("/")
      .some((segment) => !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(segment))
  )
    throw new TypeError("Invalid Storage mount key");
  return normalized;
}
function instanceKey(value: string) {
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(value))
    throw new TypeError("Invalid Storage instance key");
  return value;
}
function randomHex(bytes: number) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))]
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
}
async function cacheKey(token: string) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
  );
  return `storage-upload-ticket:${[...bytes].map((item) => item.toString(16).padStart(2, "0")).join("")}`;
}
function stripToken(ticket: StorageUploadTicket): StoredTicket {
  const { token, ...stored } = ticket;
  void token;
  return stored;
}
function invalid(field: string): never {
  throw new TypeError(`Invalid Storage ${field}`);
}
