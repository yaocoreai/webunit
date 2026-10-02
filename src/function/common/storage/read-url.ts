import { storageInstanceKey, storageLogicalPath } from "./upload-ticket";

export type StorageReadPurpose = "preview" | "download" | "share";
export type StorageReadDisposition = "inline" | "attachment";
type ReadPayload = Readonly<{
  storageKey: string;
  deliveryPath: string;
  visibility: "public" | "private";
  purpose: StorageReadPurpose;
  disposition: StorageReadDisposition;
  expiresAt: string;
}>;

export async function createStorageReadUrl(
  input: ReadPayload & Readonly<{ secret: string }>,
) {
  const payload = normalize(input);
  const signature = await sign(payload, input.secret);
  const encodedPath = payload.deliveryPath
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  const query = new URLSearchParams({
    storageKey: payload.storageKey,
    visibility: payload.visibility,
    purpose: payload.purpose,
    disposition: payload.disposition,
    expiresAt: payload.expiresAt,
    signature,
  });
  return `/_/public/storage/read/${encodedPath}?${query}`;
}

export async function verifyStorageReadUrl(
  input: ReadPayload & Readonly<{ secret: string; signature: unknown }>,
) {
  const payload = normalize(input);
  if (Date.parse(payload.expiresAt) < Date.now()) return "expired" as const;
  if (typeof input.signature !== "string") return "invalid" as const;
  const expected = await sign(payload, input.secret);
  return constantTimeEqual(expected, input.signature)
    ? ("ok" as const)
    : ("invalid" as const);
}

export function resolveReadExpiry(expiresAt: unknown, ttlSeconds: unknown) {
  if (expiresAt !== undefined) {
    if (
      typeof expiresAt !== "string" ||
      !Number.isFinite(Date.parse(expiresAt)) ||
      Date.parse(expiresAt) <= Date.now()
    )
      throw new TypeError("Invalid Storage read URL expiresAt");
    return new Date(expiresAt).toISOString();
  }
  const ttl = ttlSeconds ?? 900;
  if (!Number.isSafeInteger(ttl) || Number(ttl) < 1 || Number(ttl) > 86_400)
    throw new TypeError("Invalid Storage read URL ttlSeconds");
  return new Date(Date.now() + Number(ttl) * 1000).toISOString();
}

export function readPurpose(value: unknown): StorageReadPurpose {
  if (value === "preview" || value === "download" || value === "share")
    return value;
  throw new TypeError("Invalid Storage read URL purpose");
}

export function readDisposition(
  value: unknown,
  purpose: StorageReadPurpose,
): StorageReadDisposition {
  if (value === undefined)
    return purpose === "download" ? "attachment" : "inline";
  if (value === "inline" || value === "attachment") return value;
  throw new TypeError("Invalid Storage read URL disposition");
}

function normalize(input: ReadPayload): ReadPayload {
  return {
    storageKey: storageInstanceKey(input.storageKey),
    deliveryPath: storageLogicalPath(input.deliveryPath),
    visibility:
      input.visibility === "public" || input.visibility === "private"
        ? input.visibility
        : invalid("visibility"),
    purpose: readPurpose(input.purpose),
    disposition: readDisposition(input.disposition, input.purpose),
    expiresAt: new Date(input.expiresAt).toISOString(),
  };
}
async function sign(payload: ReadPayload, secret: string) {
  if (secret.length < 32)
    throw new Error(
      "STORAGE_READ_URL_SECRET must contain at least 32 characters",
    );
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(
        [
          "v1",
          payload.storageKey,
          payload.deliveryPath,
          payload.visibility,
          payload.purpose,
          payload.disposition,
          payload.expiresAt,
        ].join("\n"),
      ),
    ),
  );
  return bytesToBase64Url(bytes);
}
function bytesToBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}
function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1)
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}
function invalid(field: string): never {
  throw new TypeError(`Invalid Storage read URL ${field}`);
}
