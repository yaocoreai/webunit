/**
 * Whole-field filter text for CMS contains queries.
 * Flattens structured values to searchable plain text (no JSON keys).
 */

const flattenFilterTypes = new Set([
  "html",
  "rich",
  "code",
  "json",
  "object",
  "array",
  "tree",
  "table",
  "link",
  "links",
  "spacing",
]);

export function normalizeCmsQueryText(value: string) {
  return value.trim().normalize("NFKC").toLocaleLowerCase();
}

export function isCmsFlattenFilterType(type: string) {
  return flattenFilterTypes.has(type);
}

/** Type-aware extract used by Search projection normalize. */
export function extractCmsFilterText(value: unknown, type: string): string {
  if (type === "html") return stripHtml(htmlFilterSource(value));
  if (type === "rich") return extractRich(value);
  if (type === "code") return extractCodeContent(value);
  if (type === "tree") return extractTreeText(value);
  if (
    type === "json" ||
    type === "object" ||
    type === "array" ||
    type === "table" ||
    type === "link" ||
    type === "links" ||
    type === "spacing"
  )
    return extractLeaves(value);
  return asString(value);
}

/**
 * Heuristic extract for Datas memory filters (no field type available).
 * Prefer type-aware extract when the type is known.
 */
export function extractCmsContentText(value: unknown): string {
  if (typeof value === "string") return stripHtml(value);
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value))
    return value.map(extractCmsContentText).filter(Boolean).join(" ");
  if (!value || typeof value !== "object") return "";
  const recognized = extractRecognizedStructuredText(value, true);
  if (recognized !== undefined) return recognized;
  return Object.values(value as Readonly<Record<string, unknown>>)
    .map(extractCmsContentText)
    .filter(Boolean)
    .join(" ");
}

export function flattenCmsFilterField(
  value: unknown,
  type: string,
): string | unknown {
  if (!isCmsFlattenFilterType(type)) return undefined;
  return normalizeCmsQueryText(extractCmsFilterText(value, type));
}

function extractCodeContent(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const content = (value as Readonly<Record<string, unknown>>).content;
  return typeof content === "string" ? content : "";
}

const richPlainTextKeys = ["text", "content", "children", "rows", "cells"] as const;

function extractRich(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value as Readonly<Record<string, unknown>>;
  if (!Array.isArray(record.references) || !Array.isArray(record.content)) return "";
  return extractRichNodes(record.content);
}

function extractRichNodes(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value))
    return value.map(extractRichNodes).filter(Boolean).join(" ");
  if (!value || typeof value !== "object") return "";
  const record = value as Readonly<Record<string, unknown>>;
  return richPlainTextKeys
    .flatMap((key) => (record[key] == null ? [] : [extractRichNodes(record[key])]))
    .filter(Boolean)
    .join(" ");
}

function extractRecognizedStructuredText(
  value: unknown,
  stripCodeHtml: boolean,
): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Readonly<Record<string, unknown>>;
  if (typeof record.content === "string" && Object.hasOwn(record, "language"))
    return stripCodeHtml ? stripHtml(record.content) : record.content;
  if (Array.isArray(record.references)) {
    if (isRichNodeArray(record.content)) return extractRichNodes(record.content);
    if (typeof record.content === "string") return stripHtml(record.content);
  }
  return undefined;
}

function isRichNodeArray(value: unknown) {
  return Array.isArray(value) && value.every(isRichNode);
}

function isRichNode(value: unknown) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
    && isRichStructuredRecord(value as Readonly<Record<string, unknown>>);
}

/** Datas/Theme nodes may omit `children`; require `type` so object fields named `text` stay leaves. */
function isRichStructuredRecord(record: Readonly<Record<string, unknown>>) {
  if (typeof record.type !== "string") return false;
  if (typeof record.text === "string") return true;
  if (Array.isArray(record.children) || Array.isArray(record.content)) return true;
  if (record.content && typeof record.content === "object" && !Array.isArray(record.content)) {
    const inner = record.content as Readonly<Record<string, unknown>>;
    return Array.isArray(inner.rows) || Array.isArray(inner.cells);
  }
  return false;
}

function extractTreeText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((node) => {
      if (!node || typeof node !== "object" || Array.isArray(node)) return "";
      const record = node as Readonly<Record<string, unknown>>;
      const fields = Object.entries(record)
        .filter(([key]) => key !== "id" && key !== "children")
        .map(([, item]) => extractLeaves(item))
        .filter(Boolean)
        .join(" ");
      return [fields, extractTreeText(record.children)].filter(Boolean).join(" ");
    })
    .filter(Boolean)
    .join(" ");
}

function extractLeaves(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value))
    return value.map(extractLeaves).filter(Boolean).join(" ");
  if (!value || typeof value !== "object") return "";
  const recognized = extractRecognizedStructuredText(value, false);
  if (recognized !== undefined) return recognized;
  return Object.values(value as Readonly<Record<string, unknown>>)
    .map(extractLeaves)
    .filter(Boolean)
    .join(" ");
}

function htmlFilterSource(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value as Readonly<Record<string, unknown>>;
  if (!Array.isArray(record.references)) return "";
  return typeof record.content === "string" ? record.content : "";
}

function stripHtml(value: string): string {
  if (!value) return "";
  return value
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
