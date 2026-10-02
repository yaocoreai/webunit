import type { ResponseCookie } from "@/function/common/app/entry";

export function serializeResponseCookie(
  cookie: ResponseCookie,
  requestUrl?: URL,
): string {
  if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(cookie.name))
    throw new TypeError("Invalid response Cookie name");
  if (/[,;\r\n]/.test(cookie.value))
    throw new TypeError("Invalid response Cookie value");
  const attributes = [`${cookie.name}=${cookie.value}`];
  if (cookie.path) attributes.push(`Path=${cookie.path}`);
  if (cookie.httpOnly) attributes.push("HttpOnly");
  if (cookie.maxAgeSeconds !== undefined) {
    if (!Number.isSafeInteger(cookie.maxAgeSeconds) || cookie.maxAgeSeconds < 0)
      throw new TypeError("Invalid response Cookie max age");
    attributes.push(`Max-Age=${cookie.maxAgeSeconds}`);
  }
  const secure = requestUrl?.protocol === "https:";
  const sameSite = cookie.sameSite === "cross-site"
    ? secure ? "None" : "Lax"
    : cookie.sameSite === "none" ? "None"
    : cookie.sameSite === "strict" ? "Strict"
    : cookie.sameSite === "lax" ? "Lax"
    : undefined;
  if (sameSite) attributes.push(`SameSite=${sameSite}`);
  if (secure && (cookie.sameSite === "cross-site" || cookie.sameSite === "none"))
    attributes.push("Secure");
  return attributes.join("; ");
}
