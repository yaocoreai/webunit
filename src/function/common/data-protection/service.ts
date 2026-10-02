import type { DataProtection, DataProtectionPurpose } from "@/function/common/capabilities/contracts";

const encoder = new TextEncoder();
const salt = encoder.encode("webunit:data-protection:v1");

export function createDataProtection(
  secret: unknown,
  options: Readonly<{ domainDigestSecrets?: Readonly<Record<string, unknown>> }> = {},
): DataProtection | undefined {
  if (typeof secret !== "string" || !secret.trim()) return undefined;
  if (encoder.encode(secret).byteLength < 32)
    throw new Error("FUNCTION_DATA_PROTECTION_KEY must contain at least 32 bytes");
  let root: Promise<CryptoKey> | undefined;
  const rootKey = () => root ??= crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    "HKDF",
    false,
    ["deriveKey"],
  );
  const encryptionKeys = new Map<string, Promise<CryptoKey>>();
  const digestKeys = new Map<string, Promise<CryptoKey>>();
  const domainDigestKeys = new Map<string, Promise<CryptoKey>>();
  const deriveEncryptionKey = (purpose: string) => memoizedKey(
    encryptionKeys,
    purpose,
    async () => crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt, info: encoder.encode(`encrypt:${purpose}`) },
      await rootKey(),
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    ),
  );
  const deriveDigestKey = (purpose: string) => memoizedKey(
    digestKeys,
    purpose,
    async () => crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt, info: encoder.encode(`digest:${purpose}`) },
      await rootKey(),
      { name: "HMAC", hash: "SHA-256", length: 256 },
      false,
      ["sign"],
    ),
  );
  const resolveDomainDigestKey = (domain: string) => {
    assertPurpose(domain);
    const domainSecret = options.domainDigestSecrets?.[domain];
    if (typeof domainSecret !== "string" || !domainSecret.trim()) {
      throw new Error(`Data protection digest domain is not configured: ${domain}`);
    }
    if (encoder.encode(domainSecret).byteLength < 32) {
      throw new Error(`${domain} digest secret must contain at least 32 bytes`);
    }
    return memoizedKey(domainDigestKeys, domain, () => crypto.subtle.importKey(
      "raw",
      encoder.encode(domainSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    ));
  };
  return Object.freeze({
    async protect(value: string, purpose: string) {
      assertValue(value);
      const additionalData = purposeBytes(purpose);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv, additionalData },
        await deriveEncryptionKey(purpose),
        encoder.encode(value),
      );
      return `v1.${base64(iv)}.${base64(new Uint8Array(encrypted))}`;
    },
    async reveal(value: string, purpose: string) {
      const [version, iv, encrypted] = value.split(".");
      if (version !== "v1" || !iv || !encrypted) throw new Error("Invalid protected value");
      return new TextDecoder().decode(await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: unbase64(iv), additionalData: purposeBytes(purpose) },
        await deriveEncryptionKey(purpose),
        unbase64(encrypted),
      ));
    },
    async digest(value: string, purpose: DataProtectionPurpose) {
      assertValue(value);
      const resolvedPurpose = typeof purpose === "string" ? purpose : purpose.purpose;
      assertPurpose(resolvedPurpose);
      const digest = new Uint8Array(await crypto.subtle.sign(
        "HMAC",
        typeof purpose === "string"
          ? await deriveDigestKey(purpose)
          : await resolveDomainDigestKey(purpose.domain),
        encoder.encode(value),
      ));
      return typeof purpose === "string"
        ? base64(digest)
        : [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    },
  });
}

function memoizedKey(keys: Map<string, Promise<CryptoKey>>, purpose: string, create: () => Promise<CryptoKey>) {
  assertPurpose(purpose);
  const existing = keys.get(purpose);
  if (existing) return existing;
  const created = create();
  keys.set(purpose, created);
  return created;
}
function purposeBytes(purpose: string) { assertPurpose(purpose); return encoder.encode(purpose); }
function assertPurpose(value: string) { if (!/^[a-z][a-z0-9.-]{2,127}$/.test(value)) throw new Error("Invalid data protection purpose"); }
function assertValue(value: string) { if (!value) throw new Error("Protected value must not be empty"); }
function base64(value: Uint8Array) { let binary = ""; for (const byte of value) binary += String.fromCharCode(byte); return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, ""); }
function unbase64(value: string) { const normalized = value.replaceAll("-", "+").replaceAll("_", "/"); const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")); return Uint8Array.from(binary, (character) => character.charCodeAt(0)); }
