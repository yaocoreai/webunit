// Generic PBKDF2-SHA256 password hashing/verification, extracted from
// `features/admin/account/credentials.ts` so any per-tenant account feature
// (Admin, Commerce Customers, ...) can reuse the same mechanism without
// duplicating the crypto. This module intentionally holds no table and no
// `site_id` concept — account/tenant shape stays with the owning feature.
// See docs/commerce.md ("common/authentication") for the design rationale
// (why this is not folded into `common/data-protection`).

export type PasswordCredential = Readonly<{
  hash: string;
  salt: string;
  iterations: number;
}>;

export const defaultPasswordIterations = 210_000;

export async function hashPassword(
  password: string,
  iterations: number = defaultPasswordIterations,
): Promise<PasswordCredential> {
  const salt = randomBytes(24);
  return Object.freeze({
    hash: encode(await derivePassword(password, salt, iterations)),
    salt: encode(salt),
    iterations,
  });
}

export async function verifyPassword(
  password: string,
  credential: PasswordCredential,
): Promise<boolean> {
  const actual = await derivePassword(password, decode(credential.salt), credential.iterations);
  return timingSafeEqual(decode(credential.hash), actual);
}

async function derivePassword(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt.buffer as ArrayBuffer, iterations }, material, 256));
}
function randomBytes(length: number) { const bytes = new Uint8Array(length); crypto.getRandomValues(bytes); return bytes; }
function encode(value: Uint8Array) { return btoa(String.fromCharCode(...value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
function decode(value: string) { const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="); return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0)); }
function timingSafeEqual(left: Uint8Array, right: Uint8Array) { let different = left.length ^ right.length; const length = Math.max(left.length, right.length); for (let index = 0; index < length; index++) different |= (left[index % left.length] ?? 0) ^ (right[index % right.length] ?? 0); return different === 0; }
