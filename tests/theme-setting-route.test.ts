import assert from "node:assert/strict";
import test from "node:test";
import { createThemeSettingHandler } from "@/platform/theme/pages/_setting_";

const environment = {
  DEV: false,
  CMS_ADMIN_ORIGIN: "https://admin.example.com",
  THEME_INTERFACE_KEY: "theme-interface-test-key",
} as const;
const endpoint = "https://web.example.com/_setting_";

const handler = createThemeSettingHandler({
  verifyTicket: async (request, permission) =>
    permission === "setting" &&
    request.headers.get("authorization") === "Bearer valid-ticket",
});

test("Theme settings expose only the configured Admin preflight", async () => {
  const response = await handler(
    new Request(endpoint, {
      method: "OPTIONS",
      headers: {
        origin: "https://admin.example.com",
        "access-control-request-method": "GET",
        "access-control-request-headers":
          "authorization, x-theme-key",
      },
    }),
    environment,
  );
  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "https://admin.example.com",
  );
  assert.equal(
    response.headers.get("access-control-allow-methods"),
    "GET, OPTIONS",
  );

  const foreign = await handler(
    new Request(endpoint, {
      method: "OPTIONS",
      headers: { origin: "https://foreign.example.com" },
    }),
    environment,
  );
  assert.equal(foreign.status, 404);
  assert.equal(foreign.headers.get("access-control-allow-origin"), null);
});

test("Theme settings conceal an invalid key or Function-owned ticket", async () => {
  const request = (headers: Record<string, string>) =>
    handler(
      new Request(endpoint, {
        method: "GET",
        headers: {
          origin: "https://admin.example.com",
          ...headers,
        },
      }),
      environment,
    );

  assert.equal(
    (await request({
      authorization: "Bearer valid-ticket",
      "x-theme-key": "wrong-key",
    })).status,
    404,
  );
  assert.equal(
    (await request({
      authorization: "Bearer invalid-ticket",
      "x-theme-key": "theme-interface-test-key",
    })).status,
    404,
  );
});

test("Theme settings return one complete generated installation description", async () => {
  const request = (method = "GET") =>
    handler(
      new Request(endpoint, {
        method,
        headers: {
          origin: "https://admin.example.com",
          authorization: "Bearer valid-ticket",
          "x-theme-key": "theme-interface-test-key",
        },
      }),
      environment,
    );

  assert.equal((await request("POST")).status, 405);

  const response = await request();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json() as {
    data?: { settings?: unknown };
  };
  assert.ok(body.data?.settings);
});
