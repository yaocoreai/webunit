import type { APIRoute } from "astro";
import { readThemeInstallation } from "@/platform/theme/installation/descriptor";
import {
  useWebEditorTicketVerifier,
  verifyWebEditorTicket,
} from "@/platform/theme/installation/ticket";
import {
  readAdminConfig,
  readThemeSettingKey,
} from "@/platform/runtime/runtime-config";
import {
  readPlatformEnvironment,
  resolveServerEnvironment,
  type ServerEnvironment,
} from "@/platform/runtime/server-environment";

const allowedRequestHeaders = Object.freeze([
  "authorization",
  "x-theme-key",
]);

type ThemeSettingDependencies = Readonly<{
  verifyTicket?: (
    request: Request,
    permission: "setting",
  ) => Promise<boolean>;
  readInstallation?: typeof readThemeInstallation;
}>;

export function createThemeSettingHandler(
  dependencies: ThemeSettingDependencies = {},
) {
  const verifyTicket = dependencies.verifyTicket ?? (async () => false);
  const readInstallation =
    dependencies.readInstallation ?? readThemeInstallation;

  return async (
    request: Request,
    environment: ServerEnvironment,
  ): Promise<Response> => {
    const adminOrigin = readAdminConfig(environment).origin;
    const corsHeaders = createCorsHeaders(request, adminOrigin);
    if (!corsHeaders) return notFound();

    if (request.method === "OPTIONS") {
      if (!isValidPreflight(request)) return notFound();
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const expectedKey = readThemeSettingKey(environment);
    if (
      !await matchesThemeInterfaceKey(
        request.headers.get("x-theme-key"),
        expectedKey,
      ) ||
      !await verifyTicket(request, "setting")
    ) {
      return withHeaders(notFound(), corsHeaders);
    }

    if (request.method !== "GET") {
      const headers = new Headers(corsHeaders);
      headers.set("allow", "GET, OPTIONS");
      return response("Method not allowed", 405, headers);
    }

    const headers = new Headers(corsHeaders);
    headers.set("cache-control", "no-store");
    headers.set("content-type", "application/json; charset=utf-8");
    headers.set("x-content-type-options", "nosniff");
    return new Response(
      JSON.stringify({ data: { settings: await readInstallation() } }),
      { status: 200, headers },
    );
  };
}

const route: APIRoute = async ({ request, locals }) =>
  createThemeSettingHandler({
    verifyTicket: (currentRequest, permission) => verifyWebEditorTicket(
      currentRequest,
      permission,
      useWebEditorTicketVerifier(locals),
    ),
  })(
    request,
    await resolveServerEnvironment(readPlatformEnvironment(locals)),
  );

export const GET = route;
export const OPTIONS = route;
export const ALL = route;

function createCorsHeaders(request: Request, adminOrigin: string) {
  if (request.headers.get("origin")?.trim() !== adminOrigin) return undefined;
  return new Headers({
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": allowedRequestHeaders.join(", "),
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-origin": adminOrigin,
    "access-control-max-age": "600",
    vary: "Origin",
  });
}

function isValidPreflight(request: Request) {
  const method = request.headers.get("access-control-request-method");
  if (method && method.trim().toUpperCase() !== "GET") return false;
  const requestedHeaders = (
    request.headers.get("access-control-request-headers") ?? ""
  )
    .split(",")
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean);
  return requestedHeaders.every((header) =>
    allowedRequestHeaders.includes(header)
  );
}

async function matchesThemeInterfaceKey(
  provided: string | null,
  expected: string | undefined,
) {
  const left = provided?.trim();
  if (!left || !expected) return false;
  const [leftDigest, rightDigest] = await Promise.all([
    digest(left),
    digest(expected),
  ]);
  let difference = 0;
  for (let index = 0; index < leftDigest.length; index += 1) {
    difference |= leftDigest[index] ^ rightDigest[index];
  }
  return difference === 0;
}

async function digest(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
}

function notFound() {
  return response("Not found", 404);
}

function response(body: string, status: number, additional?: Headers) {
  const headers = new Headers(additional);
  headers.set("cache-control", "no-store");
  headers.set("content-type", "text/plain; charset=utf-8");
  headers.set("x-content-type-options", "nosniff");
  return new Response(body, { status, headers });
}

function withHeaders(source: Response, additional: Headers) {
  const headers = new Headers(source.headers);
  additional.forEach((value, key) => headers.set(key, value));
  return new Response(source.body, {
    status: source.status,
    statusText: source.statusText,
    headers,
  });
}
