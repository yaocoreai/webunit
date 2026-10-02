import assert from "node:assert/strict";
import test from "node:test";
import { formatLink } from "@/platform/theme";

test("formatLink follows the URL scope of the current route", () => {
  assert.equal(formatLink("/blog/quiet-spaces", "/blog"), "/blog/quiet-spaces");
  assert.equal(
    formatLink("/blog/quiet-spaces", "/en-us/blog"),
    "/en-us/blog/quiet-spaces",
  );
  assert.equal(
    formatLink("/blog/quiet-spaces?ref=menu#top", "/en-us/blog"),
    "/en-us/blog/quiet-spaces?ref=menu#top",
  );
  assert.equal(formatLink("/", "/en-us/blog"), "/en-us");
  assert.equal(formatLink("/fr/blog", "/en-us/privacy"), "/fr/blog");
});

test("formatLink scopes same-domain HTTP URLs and preserves external targets", () => {
  assert.equal(
    formatLink(
      "https://example.com/blog?ref=menu#top",
      "/en-us/blog",
      "example.com",
    ),
    "https://example.com/en-us/blog?ref=menu#top",
  );
  assert.equal(
    formatLink("http://localhost:3000/blog", "/en-us/blog", "localhost:3000"),
    "http://localhost:3000/en-us/blog",
  );
  for (const href of [
    "https://external.example/blog",
    "//example.com/a",
    "#section",
    "?page=2",
    "mailto:hello@example.com",
    "tel:+8610",
    "relative/path",
  ]) {
    assert.equal(formatLink(href, "/en-us/blog", "example.com"), href);
  }
});
