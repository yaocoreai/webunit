// Generic opaque Session Token mechanics (JSON payload + HMAC-SHA256
// signature, url-safe base64 encoding), extracted from
// `features/admin/authentication/session.ts` so any per-tenant Session
// feature (Admin, Commerce Customers, Commerce Guest Identity, ...) can reuse
// the same mechanism without duplicating the crypto. This module holds no
// Session table — each feature keeps its own Session row shape (whether it
// needs `site_id`, which account table it references, etc. is a business
// difference, not a mechanism difference).
//
// The signing secret is supplied by the caller. Following the Admin
// convention, features typically sign with a value derived from the
// account's own credential (e.g. its password hash), so rotating the
// credential automatically invalidates previously issued tokens.

export async function createSignedToken(payload: unknown, secret: string): Promise<string> {
  const encoded = encode(JSON.stringify(payload));
  return `${encoded}.${await sign(encoded, secret)}`;
}

export async function readSignedToken<T>(token: string | undefined, secret: string): Promise<T | undefined> {
  if (!token) return undefined;
  const separator = token.lastIndexOf(".");
  if (separator < 1) return undefined;
  const encoded = token.slice(0, separator);
  if (!await verify(encoded, token.slice(separator + 1), secret)) return undefined;
  try {
    return JSON.parse(decode(encoded)) as T;
  } catch {
    return undefined;
  }
}

// Reads the payload WITHOUT verifying the signature. The payload is a plain
// base64 JSON blob (not encrypted), so this leaks no more than the signed
// token already does — it only exists so a multi-row account feature (e.g.
// Commerce Customers, where the signing secret is per-account) can look up
// which account's secret to verify against, mirroring a JWT `kid`/`sub`
// lookup. Callers MUST still call `readSignedToken` with the resolved
// secret before trusting anything from the payload.
export function peekUnverifiedTokenPayload<T>(token: string): T | undefined {
  const separator = token.lastIndexOf(".");
  if (separator < 1) return undefined;
  try {
    return JSON.parse(decode(token.slice(0, separator))) as T;
  } catch {
    return undefined;
  }
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return encodeBytes(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

async function verify(value: string, signature: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  try {
    return await crypto.subtle.verify("HMAC", key, decodeBytes(signature).buffer as ArrayBuffer, new TextEncoder().encode(value));
  } catch {
    return false;
  }
}

function encode(value: string): string { return encodeBytes(new TextEncoder().encode(value)); }
function decode(value: string): string { return new TextDecoder().decode(decodeBytes(value)); }
function encodeBytes(value: Uint8Array): string { return btoa(String.fromCharCode(...value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
function decodeBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
}
