import { s, SchemaParseError, type Infer } from "@/function/common/app/schema";

export const r2UploadTargetSchema = s.object({
  key: s.string().min(1).max(1_024),
  expiresAt: s.integer().min(1),
  contentType: s.string().min(1).max(1_024).optional(),
  metadata: s.record(
    s.string().min(1).max(1_024),
    s.string().max(8_192),
  ).maxProperties(128).optional(),
  uploadId: s.string().min(1).max(1_024).optional(),
  partNumber: s.integer().min(1).optional(),
});

export type R2UploadTarget = Infer<typeof r2UploadTargetSchema>;

export function encodeR2UploadTarget(target: R2UploadTarget): string {
  return btoa(
    String.fromCharCode(
      ...new TextEncoder().encode(JSON.stringify(target)),
    ),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function decodeR2UploadTarget(value: string | null): R2UploadTarget {
  if (!value) throw new TypeError("Missing R2 upload target");
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  let input: unknown;
  try {
    input = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(
          atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")),
          (character) => character.charCodeAt(0),
        ),
      ),
    );
  } catch (error) {
    throw new TypeError("Invalid R2 upload target encoding", { cause: error });
  }
  const parsed = r2UploadTargetSchema.safeParse(input);
  if (!parsed.success) throw new SchemaParseError(parsed.issues);
  return parsed.data;
}

export async function signR2UploadTarget(
  target: R2UploadTarget,
  secret: string,
) {
  return hex(
    await crypto.subtle.sign(
      "HMAC",
      await key(secret),
      bytes(canonical(target)),
    ),
  );
}

export async function verifyR2UploadTarget(
  target: R2UploadTarget,
  signature: string,
  secret: string,
) {
  if (
    !/^[a-f0-9]{64}$/.test(signature) ||
    target.expiresAt < Math.floor(Date.now() / 1000)
  )
    return false;
  return crypto.subtle.verify(
    "HMAC",
    await key(secret),
    fromHex(signature),
    bytes(canonical(target)),
  );
}

function canonical(target: R2UploadTarget) {
  return JSON.stringify([
    target.key,
    target.expiresAt,
    target.contentType ?? null,
    Object.entries(target.metadata ?? {}).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
    target.uploadId ?? null,
    target.partNumber ?? null,
  ]);
}

function key(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    bytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
const bytes = (value: string) => new TextEncoder().encode(value);
const hex = (value: ArrayBuffer) =>
  [...new Uint8Array(value)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
const fromHex = (value: string) =>
  Uint8Array.from(value.match(/../g) ?? [], (part) =>
    Number.parseInt(part, 16),
  );
