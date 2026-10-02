import assert from "node:assert/strict";
import test from "node:test";

import { validateTreeValue, validateValueTypeNode, validateValueTypeValue, type ValueTypeNode } from "@/platform/schema";

const html = { type: "html" } satisfies ValueTypeNode;
const rich = { type: "rich" } satisfies ValueTypeNode;
const nested = {
  type: "object",
  fields: [
    { key: "note", type: "html" },
    { key: "body", type: "rich" },
  ],
} satisfies ValueTypeNode;

const tree = {
  type: "tree",
  maxDepth: 2,
  fields: [{ key: "title", type: "text", required: true }],
} satisfies ValueTypeNode;
const rootId = "10000000-0000-4000-8000-000000000001";
const childId = "10000000-0000-4000-8000-000000000002";

test("tree schema rejects reserved keys and tree values keep unique ids within max depth", () => {
  assert.throws(() => validateValueTypeNode({ type: "tree", fields: [{ key: "id", type: "text" }] }, "tree"), /reserved/);
  assert.throws(() => validateValueTypeNode({ type: "tree", maxDepth: 11, fields: [] }, "tree"), /maxDepth/);
  assert.equal(validateTreeValue(tree, [{ id: rootId, title: "Root", children: [{ id: childId, title: "Child", children: [] }] }]), true);
  assert.equal(validateTreeValue(tree, [{ id: rootId, title: "Root", children: [{ id: rootId, title: "Child", children: [] }] }]), false);
  assert.equal(validateTreeValue(tree, [{ id: rootId, title: "Root", extra: true, children: [] }]), false);
  assert.equal(validateTreeValue(tree, [{ id: rootId, title: "Root", children: [{ id: childId, title: "Child", children: [{ id: "10000000-0000-4000-8000-000000000003", title: "Too deep", children: [] }] }] }]), false);
});

test("html and rich values are editor documents at the top level and nested", () => {
  assert.equal(validateValueTypeValue(html, { content: "<p>Hello</p>", references: [] }), true);
  assert.equal(validateValueTypeValue(html, "<p>Hello</p>"), false);
  assert.equal(validateValueTypeValue(rich, { content: [], references: [] }), true);
  assert.equal(validateValueTypeValue(rich, []), false);
  assert.equal(
    validateValueTypeValue(nested, {
      note: { content: "", references: [] },
      body: { content: [], references: [] },
    }),
    true,
  );
  assert.equal(
    validateValueTypeValue(nested, {
      note: "<p>Hello</p>",
      body: [],
    }),
    false,
  );
});
