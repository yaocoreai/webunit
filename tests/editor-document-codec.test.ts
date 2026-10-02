import assert from "node:assert/strict";
import test from "node:test";
import { decodeEditorDocument, encodeEditorDocument, editorResourceView } from "@/platform/schema";

const rich = {
  content: [
    {
      type: "image",
      props: { referenceKey: "hero", url: "/temporary.jpg", name: "Old", assetAlt: "Old alt", caption: "Keep" },
      content: [],
      children: [],
    },
    {
      type: "paragraph",
      props: {},
      content: [{ type: "link", referenceKey: "about", href: "/temporary", resource: { id: "entry" }, content: [] }],
      children: [],
    },
    { type: "image", props: { url: "https://cdn.example/external.jpg", caption: "Outside" }, content: [], children: [] },
  ],
  references: [
    { key: "hero", reference: "asset.image", id: "asset" },
    { key: "about", type: "link", value: { type: "module", target: "_self", reference: "module.page", id: "entry" } },
    { key: "orphan", reference: "asset.file", id: "unused" },
  ],
} as const;

test("encode strips resolved addresses and keeps external urls", () => {
  assert.deepEqual(encodeEditorDocument(rich), {
    content: [
      { type: "image", props: { referenceKey: "hero", caption: "Keep" }, content: [], children: [] },
      { type: "paragraph", props: {}, content: [{ type: "link", referenceKey: "about", content: [] }], children: [] },
      { type: "image", props: { url: "https://cdn.example/external.jpg", caption: "Outside" }, content: [], children: [] },
    ],
    references: rich.references.slice(0, 2),
  });
});

test("table cell links keep and restore their references", () => {
  const document = {
    content: [{
      type: "table",
      props: {},
      content: { rows: [{ cells: [{ content: [{ type: "link", referenceKey: "about", href: "/temporary", content: [] }], props: {} }] }] },
      children: [],
    }],
    references: [
      { key: "about", type: "link" as const, value: { type: "module" as const, target: "_self" as const, reference: "module.page", id: "entry" } },
      { key: "orphan", reference: "asset.file" as const, id: "unused" },
    ],
  };
  const stored = encodeEditorDocument(document);
  assert.equal(stored.references.length, 1);
  const decoded = decodeEditorDocument(stored, () => editorResourceView({ id: "entry", title: "About", href: "/about" }));
  const table = decoded[0] as { content: { rows: { cells: { content: { href?: string }[] }[] }[] } };
  assert.equal(table.content.rows[0]?.cells[0]?.content[0]?.href, "/about");
});

test("html and rich links restore a new-window target from the reference", () => {
  const html = encodeEditorDocument({
    content: '<a data-cms-ref="about">About</a>',
    references: [{ key: "about", type: "link" as const, value: { type: "path" as const, title: "About", target: "_blank" as const, href: "/about" } }],
  });
  assert.match(decodeEditorDocument(html, () => editorResourceView({ title: "About", href: "/about" })), /target="_blank"/);
  const richDocument = decodeEditorDocument({
    content: [{ type: "paragraph", props: {}, content: [{ type: "link", referenceKey: "about", content: [] }], children: [] }],
    references: [{ key: "about", type: "link" as const, value: { type: "path" as const, title: "About", target: "_blank" as const, href: "/about" } }],
  }, () => editorResourceView({ title: "About", href: "/about" }));
  const link = (richDocument[0] as { content: { target?: string }[] }).content[0];
  assert.equal(link?.target, "_blank");
});

test("html image alt is restored from the asset", () => {
  const document = {
    content: '<img data-cms-ref="hero" src="/temporary.jpg" alt="Stage">',
    references: [{ key: "hero", reference: "asset.image" as const, id: "asset" }],
  };
  const stored = encodeEditorDocument(document);
  assert.equal(stored.content, '<img data-cms-ref="hero">');
  const decoded = decodeEditorDocument(stored, () =>
    editorResourceView({ type: "image", title: "Hero", alt: "Asset alt", delivery: { url: "/hero.jpg" } }),
  );
  assert.match(decoded, /src="\/hero\.jpg"/);
  assert.match(decoded, /alt="Asset alt"/);
});

test("decode writes one address field set from the caller-supplied resource", () => {
  const stored = encodeEditorDocument(rich);
  const decoded = decodeEditorDocument(stored, (reference) => {
    if (reference.key === "hero") {
      return editorResourceView({
        type: "image",
        title: "Hero",
        alt: "Stage",
        delivery: { url: "/hero.jpg", provider: "cdn" },
      });
    }
    return editorResourceView({ id: "entry", title: "About", href: "/about" });
  });
  assert.deepEqual(decoded, [
    {
      type: "image",
      props: { referenceKey: "hero", caption: "Keep", url: "/hero.jpg", name: "Hero", provider: "cdn", assetAlt: "Stage" },
      content: [],
      children: [],
    },
    {
      type: "paragraph",
      props: {},
      content: [{ type: "link", referenceKey: "about", content: [], href: "/about", resource: { id: "entry", title: "About", href: "/about" } }],
      children: [],
    },
    { type: "image", props: { url: "https://cdn.example/external.jpg", caption: "Outside" }, content: [], children: [] },
  ]);
});
