import type { FunctionScope } from "@/function/common/app/context";
import type { FunctionRequestContext } from "@/function/common/app/entry";

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

export function createHttpFunctionRequestContext(
  request: Request,
  scope: FunctionScope,
): FunctionRequestContext {
  const cf =
    (request as Request & { cf?: unknown }).cf &&
    typeof (request as Request & { cf?: unknown }).cf === "object"
      ? (request as Request & { cf: Record<string, unknown> }).cf
      : undefined;
  const trustedHeaders = scope.configuration.trustedClientIpHeaders ?? [];
  const ipAddress = trustedClientIp(request, trustedHeaders);
  const trustsCloudflareHeaders = trustedHeaders.includes("cf-connecting-ip");
  const userAgent = optionalHeader(request, "user-agent");
  const countryCode = country(
    cf?.country ??
      (trustsCloudflareHeaders
        ? request.headers.get("cf-ipcountry")
        : undefined),
  );
  const regionCode = text(cf?.regionCode);
  const cfBot =
    cf?.botManagement && typeof cf.botManagement === "object"
      ? (cf.botManagement as Record<string, unknown>)
      : undefined;
  const heuristicBot = /\b(bot|crawler|spider|slurp|bingpreview)\b/i.test(
    userAgent ?? "",
  );
  const callerOrigin = text(request.headers.get("origin"));
  const authorization = text(request.headers.get("authorization"));
  return Object.freeze({
    origin: new URL(request.url).origin,
    ...(callerOrigin ? { callerOrigin } : {}),
    ...(authorization ? { authorization } : {}),
    ...(request.headers.has("cookie")
      ? { cookies: Object.freeze(readCookies(request.headers.get("cookie"))) }
      : {}),
    client: Object.freeze({
      ...(ipAddress ? { ipAddress } : {}),
      ...(userAgent ? { userAgent } : {}),
    }),
    ...(countryCode || regionCode
      ? {
          geo: Object.freeze({
            ...(countryCode ? { countryCode } : {}),
            ...(regionCode ? { regionCode } : {}),
          }),
        }
      : {}),
    ...(cfBot
      ? {
          bot: Object.freeze({
            source: "cloudflare" as const,
            ...(typeof cfBot.score === "number" && Number.isInteger(cfBot.score)
              ? { botScore: cfBot.score }
              : {}),
            ...(typeof cfBot.verifiedBot === "boolean"
              ? { isVerifiedBot: cfBot.verifiedBot }
              : {}),
            ...(text(cf?.verifiedBotCategory)
              ? { verifiedBotCategory: text(cf?.verifiedBotCategory) }
              : {}),
          }),
        }
      : userAgent
        ? {
            bot: Object.freeze({
              source: "heuristic" as const,
              botScore: heuristicBot ? 1 : 99,
              isVerifiedBot: false,
            }),
          }
        : {}),
  });
}

function trustedClientIp(request: Request, trustedHeaders: readonly string[]) {
  for (const header of trustedHeaders) {
    const value = optionalHeader(request, header)?.split(",", 1)[0]?.trim();
    if (value) return value;
  }
  return undefined;
}

function optionalHeader(request: Request, name: string) {
  return text(request.headers.get(name));
}

function country(value: unknown) {
  const normalized = text(value)?.toUpperCase();
  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : undefined;
}

function readCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of header?.split(";") ?? []) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    if (!name || Object.hasOwn(cookies, name)) continue;
    cookies[name] = part.slice(separator + 1).trim();
  }
  return cookies;
}
