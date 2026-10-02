import type { FunctionRequestContext } from "@/function/common/app/entry";
import type { RequestSignalsResolver } from "@/platform/runtime/request-signals";

export async function createDirectRouteRequestContext(
  request: Request,
  signals: RequestSignalsResolver,
): Promise<FunctionRequestContext> {
  const [geo, bot] = await Promise.all([signals.geo(), signals.bot()]);
  const client = signals.request();
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
      ...(client.ipAddress ? { ipAddress: client.ipAddress } : {}),
      ...(client.userAgent ? { userAgent: client.userAgent } : {}),
    }),
    ...(geo ? {
      geo: Object.freeze({
        ...(geo.countryCode ? { countryCode: geo.countryCode } : {}),
        ...(geo.regionCode ? { regionCode: geo.regionCode } : {}),
      }),
    } : {}),
    ...(bot ? {
      bot: Object.freeze({
        source: bot.source,
        ...(bot.botScore !== undefined ? { botScore: bot.botScore } : {}),
        ...(bot.isVerifiedBot !== undefined
          ? { isVerifiedBot: bot.isVerifiedBot }
          : {}),
        ...(bot.verifiedBotCategory
          ? { verifiedBotCategory: bot.verifiedBotCategory }
          : {}),
      }),
    } : {}),
  });
}

function text(value: string | null) {
  const normalized = value?.trim();
  return normalized || undefined;
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
