// Random opaque bearer tokens (no embedded payload, no signature) for
// identities that have no account secret to sign with — e.g. Commerce Guest
// Identity, which is anonymous by definition and has no password. The token
// is high-entropy random data, so a fast digest (SHA-256) is sufficient for
// the stored lookup hash: unlike password hashing, there is no offline
// brute-force concern (256 bits of randomness, not user-chosen input), so a
// slow KDF like PBKDF2 (see `password.ts`) is unnecessary here.

export function createOpaqueToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return encode(bytes);
}

export async function digestOpaqueToken(token: string): Promise<string> {
  return encode(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))));
}

function encode(value: Uint8Array): string {
  return btoa(String.fromCharCode(...value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
