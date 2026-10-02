import assert from "node:assert/strict";
import test from "node:test";
import {
  readWebEditorTicket,
  verifyWebEditorTicket,
} from "@/platform/theme/installation/ticket";
import {
  prepareDefaultPreview,
  preparePreviewUpdate,
} from "@/platform/theme/preview/render";
import { prepareSlotPreviewRuntime } from "@/platform/theme/preview/slot-preview";
import { createPreviewResponse } from "@/platform/theme/preview/response";

test("Web Editor ticket uses only the transport assigned to each permission", () => {
  assert.equal(
    readWebEditorTicket(
      new Request("https://web.example.com/_theme_", {
        headers: { authorization: "Bearer header" },
      }),
      "setting",
    ),
    "header",
  );
  assert.equal(
    readWebEditorTicket(
      new Request(
        "https://web.example.com/_theme_?ticket=query",
      ),
      "setting",
    ),
    undefined,
  );
  assert.equal(
    readWebEditorTicket(
      new Request("https://web.example.com/_preview_?ticket=query", {
        headers: { authorization: "Bearer header" },
      }),
      "preview",
    ),
    "query",
  );
  assert.equal(
    readWebEditorTicket(
      new Request("https://web.example.com/_preview_?ticket=one&ticket=two"),
      "preview",
    ),
    undefined,
  );
});

test("Web Editor ticket verification binds permission and Web origin", async () => {
  let invocation: unknown;
  const request = new Request(
    "https://web.example.com/_preview_?ticket=wet-ticket",
  );
  assert.equal(
    await verifyWebEditorTicket(request, "preview", async (input, signal) => {
      invocation = { input, signal };
      return {
        valid: true,
        webOrigin: "https://web.example.com",
        permission: "preview",
        expiresAt: "2099-01-01T00:00:00.000Z",
      };
    }),
    true,
  );
  assert.deepEqual(invocation, {
    input: {
      ticket: "wet-ticket",
      webOrigin: "https://web.example.com",
      permission: "preview",
    },
    signal: request.signal,
  });
});

test("Web Editor ticket verification fails closed on invalid Function response", async () => {
  const wrongScope = async () => ({
    valid: true,
    webOrigin: "https://web.example.com",
    permission: "setting",
  });
  const unauthorized = async () => undefined;
  const request = new Request(
    "https://web.example.com/_preview_?ticket=wet-ticket",
  );
  assert.equal(
    await verifyWebEditorTicket(request, "preview", wrongScope),
    false,
  );
  assert.equal(
    await verifyWebEditorTicket(request, "preview", unauthorized),
    false,
  );
});

test("Web Editor ticket verification preserves caller cancellation", async () => {
  const controller = new AbortController();
  controller.abort();
  const request = new Request(
    "https://web.example.com/_preview_?ticket=wet-ticket",
    { signal: controller.signal },
  );
  const cancellation = new Error("cancelled");
  await assert.rejects(
    () =>
      verifyWebEditorTicket(request, "preview", async (_input, signal) => {
        assert.equal(signal.aborted, true);
        throw cancellation;
      }),
    (error: unknown) => error === cancellation,
  );
});

test("every Preview response applies the closed security policy", () => {
  const response = createPreviewResponse(
    "https://admin.example.com",
    "Invalid preview",
    400,
    {
      "cache-control": "public, max-age=3600",
      "content-security-policy": "default-src *",
      "referrer-policy": "unsafe-url",
      "x-robots-tag": "index, follow",
      "x-preview-detail": "invalid",
    },
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "same-origin");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.match(
    response.headers.get("content-security-policy") ?? "",
    /frame-ancestors https:\/\/admin\.example\.com/,
  );
  assert.equal(response.headers.get("x-preview-detail"), "invalid");
});

test("Preview update rejects an oversized streamed form before buffering the full request", async () => {
  const wrongType = await preparePreviewUpdate(
    new Request("https://web.example.com/_preview_", {
      method: "POST",
      headers: {
        origin: "https://web.example.com",
        "content-type": "application/x-www-form-urlencoded-extra",
      },
      body: "preview={}",
    }),
    { type: "template", key: "page" },
  );
  assert.ok(wrongType instanceof Response);
  assert.equal(wrongType.status, 415);

  let cancelled = false;
  const chunk = new Uint8Array(600_000);
  const request = new Request("https://web.example.com/_preview_", {
    method: "POST",
    headers: {
      origin: "https://web.example.com",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(chunk);
        controller.enqueue(chunk);
      },
      cancel() {
        cancelled = true;
      },
    }),
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  const response = await preparePreviewUpdate(request, {
    type: "template",
    key: "page",
  });
  assert.ok(response instanceof Response);
  assert.equal(response.status, 413);
  assert.equal(cancelled, true);
});

test("Preview update accepts iframe navigation across Admin and Web sites but rejects a foreign form origin", async () => {
  const submit = (origin: string, fetchSite: string) =>
    preparePreviewUpdate(
      new Request("https://web.example.com/_preview_", {
        method: "POST",
        headers: {
          origin,
          "sec-fetch-site": fetchSite,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: "preview={}",
      }),
      { type: "template", key: "page" },
    );

  const sameSite = await submit("https://web.example.com", "same-site");
  assert.ok(sameSite instanceof Response);
  assert.equal(sameSite.status, 422);

  const foreignOrigin = await submit("https://admin.example.com", "same-site");
  assert.ok(foreignOrigin instanceof Response);
  assert.equal(foreignOrigin.status, 403);

  const crossSite = await submit("https://web.example.com", "cross-site");
  assert.ok(crossSite instanceof Response);
  assert.equal(crossSite.status, 422);
});

test("default Section Preview derives a neutral payload without assuming a page template", async () => {
  const prepared = await prepareDefaultPreview({
    target: { type: "section", key: "divider" },
    presentation: { content: "defaults" },
  });
  assert.ok(prepared);
  assert.equal(prepared?.context.preview.type, "section");
  assert.equal(prepared?.payload.domain.host, "preview.local");
  assert.notEqual(prepared?.payload.template.templateKey, "page");
  assert.equal(
    Object.hasOwn(prepared?.payload.site.fields ?? {}, "contact_email"),
    false,
  );
});

test("Error Template Preview uses the normal Page Template document entry", async () => {
  const prepared = await prepareDefaultPreview({
    target: { type: "template", key: "error" },
    presentation: { content: "sections" },
  });
  assert.ok(prepared);
  assert.equal(prepared?.payload.template.templateKey, "error");
  assert.equal(Object.hasOwn(prepared?.payload ?? {}, "module"), true);
  assert.equal(Object.hasOwn(prepared?.payload ?? {}, "page"), true);
  assert.ok(
    await prepareSlotPreviewRuntime("error", "desktop", "layout.header"),
  );
  assert.equal(
    await prepareSlotPreviewRuntime("error", "desktop", "template.main"),
    undefined,
  );
});
