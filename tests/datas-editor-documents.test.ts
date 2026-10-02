import assert from "node:assert/strict";
import test from "node:test";

import { collectAssetKeys } from "@/platform/theme/datas/query-assets";
import { materializeResourceIds } from "@/platform/theme/datas/registry";
import type { ManifestProperty } from "@/platform/manifest";

const html = { key: "html", type: "html" } as ManifestProperty;
const rich = { key: "rich", type: "rich" } as ManifestProperty;
const object = {
  key: "object",
  type: "object",
  fields: [
    { key: "note", type: "html" },
    { key: "body", type: "rich" },
  ],
} as ManifestProperty;

const htmlDocument = {
  content: '<p>Hello <img data-cms-ref="hero"></p>',
  references: [{ key: "hero", reference: "asset.image", id: "studio-cover" }],
};
const richDocument = {
  content: [
    {
      type: "paragraph",
      props: {},
      content: [{ type: "text", text: "Hello", styles: {} }],
      children: [],
    },
  ],
  references: [],
};

test("Datas collects html and nested rich editor-document asset references", () => {
  assert.deepEqual(
    collectAssetKeys(
      [
        {
          html: htmlDocument,
          object: { note: htmlDocument, body: richDocument },
        },
      ],
      [html, object],
    ),
    ["studio-cover"],
  );
});

test("Datas materializes html and nested rich editor documents like Function SSR", () => {
  const fields = materializeResourceIds(
    {
      html: htmlDocument,
      rich: richDocument,
      object: { note: htmlDocument, body: richDocument },
    },
    [html, rich, object],
    {
      file: {
        "studio-cover": {
          id: "studio-cover",
          type: "image",
          title: "Cover",
          delivery: { type: "file", url: "https://cdn.example/cover.jpg" },
        },
      },
    },
  );
  assert.equal(typeof fields.html, "string");
  assert.match(String(fields.html), /https:\/\/cdn\.example\/cover\.jpg/);
  assert.ok(Array.isArray(fields.rich));
  const nested = fields.object as { note?: unknown; body?: unknown };
  assert.equal(typeof nested.note, "string");
  assert.ok(Array.isArray(nested.body));
});

test("Datas html and rich materialization ignores leftover strings and node arrays", () => {
  const fields = materializeResourceIds(
    {
      html: "<p>Leftover html</p>",
      rich: [{ type: "paragraph", props: {}, content: [], children: [] }],
      object: {
        note: "<p>Leftover html</p>",
        body: [{ type: "paragraph", props: {}, content: [], children: [] }],
      },
    },
    [html, rich, object],
    {},
  );
  assert.equal(fields.html, undefined);
  assert.equal(fields.rich, undefined);
  const nested = fields.object as { note?: unknown; body?: unknown };
  assert.equal(nested.note, undefined);
  assert.equal(nested.body, undefined);
});
