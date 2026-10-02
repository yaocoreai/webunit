import { isCmsAssetRef, isCmsFormRef, isCmsMenuRef, isCmsModuleRef } from "./cms-resource-ref";
import { isCmsLinkStored, isHtmlEditorDocument, isRichTextEditorDocument } from "./cms-editor-document";
import { isSpacingBoxValue } from "./spacing";

export const builtInValueTypeNames = [
  "text", "textarea", "heading", "html", "rich", "code", "number", "switch", "select",
  "date", "time", "datetime", "color", "price", "link", "links", "file", "files", "image",
  "images", "audio", "audios", "video", "videos", "menu", "menus", "form", "forms", "module", "modules", "object",
  "array", "tree", "table", "json", "spacing",
] as const;

export type BuiltInValueTypeName = (typeof builtInValueTypeNames)[number];
export type ValueTypeName = BuiltInValueTypeName;
export type ValueTypePresentation = Readonly<{ control?: string; sortable?: boolean; stableId?: boolean }>;
/** @deprecated Alias kept for Theme property presentation imports; same as ValueTypePresentation. */
export type ThemePropertyPresentation = ValueTypePresentation;
export type ValueTypeOption = Readonly<{ label: string; value: string | number }>;
export type TableColumnDefinition = string;
export type TableColumns = readonly [string, ...string[]];
export type ValueTypeNode = Readonly<{
  type: ValueTypeName;
  fields?: readonly ValueTypeFieldDefinition[];
  items?: ValueTypeNode;
  columns?: TableColumns;
  columnForm?: string;
  reference?: string;
  options?: readonly ValueTypeOption[];
  minItems?: number;
  maxItems?: number;
  maxDepth?: number;
  locale?: boolean;
  presentation?: ValueTypePresentation;
}>;
export type ValueTypeFieldDefinition = ValueTypeNode & Readonly<{ key: string; label?: string; description?: string; required?: boolean; default?: unknown }>;

const builtInTypes = new Set<string>(builtInValueTypeNames);
const localizedValueTypes = new Set<string>(["text", "textarea", "heading", "html", "rich", "code", "link", "links", "json", "table"]);
const fieldKeyPattern = /^[a-z][A-Za-z0-9_-]*$/;

export function isValueTypeName(value: unknown): value is ValueTypeName {
  return typeof value === "string" && builtInTypes.has(value);
}

export function validateValueTypeNode(node: ValueTypeNode, path: string, root = false): void {
  if (!isValueTypeName(node.type)) throw new Error(`Invalid value type: ${path}`);
  if (node.locale !== undefined && typeof node.locale !== "boolean") throw new Error(`Invalid value type locale flag: ${path}`);
  if (node.locale && !localizedValueTypes.has(node.type)) throw new Error(`Value type cannot be localized: ${path}`);
  validatePresentation(node, path);
  if (root && node.type !== "object" && node.type !== "array" && node.type !== "tree") throw new Error(`Structured value type root must be object, array, or tree: ${path}`);
  if (node.type === "object" || node.type === "tree") {
    if (!Array.isArray(node.fields)) throw new Error(`${node.type === "tree" ? "Tree" : "Object"} value type requires fields: ${path}`);
    const keys = new Set<string>();
    for (const field of node.fields) {
      if (node.type === "tree" && treeReservedFieldKeys.has(field.key)) throw new Error(`Tree field key is reserved: ${path}.${field.key}`);
      if (!fieldKeyPattern.test(field.key) || keys.has(field.key)) throw new Error(`Invalid or duplicate value type field: ${path}.${field.key}`);
      keys.add(field.key);
      validateValueTypeNode(field, `${path}.${field.key}`);
    }
  } else if (node.fields !== undefined) throw new Error(`Only object and tree value types can declare fields: ${path}`);
  if (node.type === "tree") {
    validateItemLimits(node, path);
    validateTreeMaxDepth(node.maxDepth, path);
  } else if (node.maxDepth !== undefined) throw new Error(`Only tree value types can declare maxDepth: ${path}`);
  if (node.type === "array") {
    if (!node.items) throw new Error(`Array value type requires items: ${path}`);
    validateValueTypeNode(node.items, `${path}.items`);
    validateItemLimits(node, path);
    if (node.presentation?.stableId) {
      if (node.items.type !== "object") throw new Error(`Stable-id array items must be objects: ${path}`);
      validateStableIdField(node.items, path);
    }
  } else if (node.items !== undefined) throw new Error(`Only array value types can declare items: ${path}`);
  if (node.type === "table") {
    validateTableColumns(node.columns, path);
    validateColumnForm(node.columnForm, path);
    if (!node.columns?.length && !node.columnForm) throw new Error(`Table value type requires columns or columnForm: ${path}`);
    validateItemLimits(node, path);
  }
  else if (node.columns !== undefined) throw new Error(`Only table value types can declare columns: ${path}`);
  if (node.type !== "table" && node.columnForm !== undefined) throw new Error(`Only table value types can declare columnForm: ${path}`);
  const moduleType = node.type === "module" || node.type === "modules";
  if (moduleType && !node.reference?.trim()) throw new Error(`Module value type requires reference: ${path}`);
  if (!moduleType && node.reference !== undefined) throw new Error(`Only module value types can declare reference: ${path}`);
  if (node.type === "select") validateOptions(node.options, path);
  else if (node.options !== undefined) throw new Error(`Only select value types can declare options: ${path}`);
  validateNodeDefaults(node, path);
  validateLocalizedArrayIdentity(node, path);
}

function validatePresentation(node: ValueTypeNode, path: string) {
  const presentation = node.presentation;
  if (!presentation) return;
  if (Object.keys(presentation).some((key) => !["control", "sortable", "stableId"].includes(key))) throw new Error(`Invalid value type presentation: ${path}`);
  if (presentation.control !== undefined && (!presentation.control.trim())) throw new Error(`Invalid value type presentation control: ${path}`);
  if (presentation.sortable !== undefined && typeof presentation.sortable !== "boolean") throw new Error(`Invalid value type presentation sortable: ${path}`);
  if (presentation.stableId !== undefined && (node.type !== "array" || typeof presentation.stableId !== "boolean")) throw new Error(`Invalid value type presentation stableId: ${path}`);
}

export function validateTableValue(columns: readonly TableColumnDefinition[], value: unknown): boolean {
  return Array.isArray(value) && value.every((row) => Array.isArray(row) && row.length === columns.length && row.every((cell) => typeof cell === "string"));
}

export function resolveTableColumns(
  definition: Pick<ValueTypeNode, "columns" | "columnForm">,
  scope: unknown,
): readonly string[] {
  const source = parseColumnForm(definition.columnForm);
  if (!source) return definition.columns ?? [];
  if (!isRecord(scope)) return [];
  const value = scope[source.field];
  if (!source.key) {
    if (typeof value === "string") return [value];
    return Array.isArray(value) && value.every((item) => typeof item === "string")
      ? value
      : [];
  }
  return Array.isArray(value) && value.every((item) => isRecord(item) && typeof item[source.key!] === "string")
    ? value.map((item) => (item as Readonly<Record<string, string>>)[source.key!]!)
    : [];
}

export function validateValueTypeValue(node: ValueTypeNode, value: unknown, scope?: unknown): boolean {
  const field = node as ValueTypeNode & Readonly<{ key?: unknown; required?: unknown }>;
  if (value === null && typeof field.key === "string" && field.required !== true) return true;
  if (node.type === "object") {
    if (!isRecord(value)) return false;
    const fields = new Map((node.fields ?? []).map((child) => [child.key, child]));
    return Object.keys(value).every((key) => fields.has(key)) && [...fields.values()].every((child) => value[child.key] === undefined ? !child.required : validateValueTypeValue(child, value[child.key], value));
  }
  if (node.type === "array") {
    if (!Array.isArray(value) || value.length < (node.minItems ?? 0) || value.length > (node.maxItems ?? Number.POSITIVE_INFINITY)) return false;
    if (node.presentation?.stableId) {
      const ids = value.map((item) => isRecord(item) && typeof item.id === "string" && item.id ? item.id : undefined);
      if (ids.some((id) => !id) || new Set(ids).size !== ids.length) return false;
    }
    return Boolean(node.items) && value.every((item) => validateValueTypeValue(node.items!, item, item));
  }
  if (node.type === "tree") return validateTreeValue(node, value);
  if (node.type === "table") return Array.isArray(value) && value.length >= (node.minItems ?? 0) && value.length <= (node.maxItems ?? Number.POSITIVE_INFINITY) && validateTableValue(resolveTableColumns(node, scope), value);
  if (node.type === "number") return typeof value === "number" && Number.isFinite(value);
  if (node.type === "switch") return typeof value === "boolean";
  if (node.type === "select") return node.options?.some((option) => option.value === value) ?? false;
  if (node.type === "date") return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (node.type === "time") return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
  if (node.type === "datetime") return typeof value === "string" && /^\d{4}-\d{2}-\d{2} (?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
  if (node.type === "link") return isLink(value);
  if (node.type === "links") return Array.isArray(value) && value.every(isLink);
  if (node.type === "module") return isModuleReference(value);
  if (node.type === "modules") return Array.isArray(value) && value.every(isModuleReference);
  if (["file", "image", "audio", "video", "menu"].includes(node.type)) return isAssetOrMenuReference(value);
  if (["files", "images", "audios", "videos", "menus"].includes(node.type)) return Array.isArray(value) && value.every(isAssetOrMenuReference);
  if (node.type === "form") return isCmsFormRef(value);
  if (node.type === "forms") return Array.isArray(value) && value.every(isCmsFormRef);
  if (node.type === "heading") return isRecord(value) && Number.isInteger(value.level) && Number(value.level) >= 1 && Number(value.level) <= 6 && typeof value.value === "string";
  if (node.type === "code") return isRecord(value) && typeof value.language === "string" && typeof value.content === "string";
  if (node.type === "spacing") return isSpacingBoxValue(value, { allowNegative: true });
  if (node.type === "price") return isRecord(value) && Object.keys(value).length === 1 && Number.isSafeInteger(value.amountMinor);
  if (node.type === "rich") return isRichTextEditorDocument(value);
  if (node.type === "json") return isJsonValue(value);
  if (node.type === "html") return isHtmlEditorDocument(value);
  return typeof value === "string";
}

function validateNodeDefaults(node: ValueTypeNode, path: string) {
  const scope = node.type === "object"
    ? Object.fromEntries((node.fields ?? []).flatMap((field) => field.default === undefined ? [] : [[field.key, field.default]]))
    : undefined;
  for (const field of node.fields ?? []) {
    if (field.default !== undefined && !validateValueTypeValue(field, field.default, scope)) throw new Error(`Invalid value type field default: ${path}.${field.key}`);
    validateNodeDefaults(field, `${path}.${field.key}`);
  }
  if (node.items) validateNodeDefaults(node.items, `${path}.items`);
}

const treeReservedFieldKeys = new Set(["id", "children"]);
const treeNodeIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const defaultTreeMaxDepth = 10;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateTreeMaxDepth(maxDepth: number | undefined, path: string) {
  if (maxDepth !== undefined && (!Number.isSafeInteger(maxDepth) || maxDepth < 1 || maxDepth > defaultTreeMaxDepth))
    throw new Error(`Invalid tree maxDepth: ${path}`);
}

export function validateTreeValue(node: ValueTypeNode, value: unknown): boolean {
  if (!Array.isArray(value) || value.length < (node.minItems ?? 0) || value.length > (node.maxItems ?? Number.POSITIVE_INFINITY)) return false;
  const fields = new Map((node.fields ?? []).map((field) => [field.key, field]));
  const maxDepth = node.maxDepth ?? defaultTreeMaxDepth;
  const ids = new Set<string>();
  const visit = (nodes: unknown, depth: number): boolean => {
    if (!Array.isArray(nodes)) return false;
    if (depth > maxDepth) return nodes.length === 0;
    return nodes.every((item) => {
      if (!isRecord(item) || typeof item.id !== "string" || !treeNodeIdPattern.test(item.id) || ids.has(item.id) || !Array.isArray(item.children)) return false;
      ids.add(item.id);
      if (Object.keys(item).some((key) => key !== "id" && key !== "children" && !fields.has(key))) return false;
      const fieldsMatch = [...fields.values()].every((field) => {
        const fieldValue = item[field.key];
        return fieldValue === undefined ? field.required !== true : validateValueTypeValue(field, fieldValue, item);
      });
      return fieldsMatch && visit(item.children, depth + 1);
    });
  };
  return visit(value, 1);
}

function isJsonValue(value: unknown): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

const isAssetOrMenuReference = (value: unknown) =>
  isCmsAssetRef(value) || isCmsMenuRef(value);
const isModuleReference = (value: unknown) => isCmsModuleRef(value);
const isLink = (value: unknown) => isCmsLinkStored(value);

function validateTableColumns(columns: readonly TableColumnDefinition[] | undefined, path: string) {
  if (columns !== undefined && (!columns.length || columns.some((column) => typeof column !== "string" || !column.trim()))) throw new Error(`Invalid table columns: ${path}`);
}

function validateColumnForm(columnForm: string | undefined, path: string) {
  if (columnForm !== undefined && !parseColumnForm(columnForm)) throw new Error(`Invalid table columnForm: ${path}`);
}

function parseColumnForm(value: string | undefined): Readonly<{ field: string; key?: string }> | undefined {
  if (typeof value !== "string") return undefined;
  const parts = value.split(".");
  if (parts.length < 1 || parts.length > 2 || parts.some((part) => !fieldKeyPattern.test(part))) return undefined;
  return { field: parts[0]!, ...(parts[1] ? { key: parts[1] } : {}) };
}

function validateOptions(options: readonly ValueTypeOption[] | undefined, path: string) {
  if (!options?.length) throw new Error(`Select value type requires options: ${path}`);
  const values = new Set<string>();
  for (const option of options) {
    if (!option.label.trim()) throw new Error(`Select option requires label: ${path}`);
    const key = `${typeof option.value}:${String(option.value)}`;
    if (values.has(key)) throw new Error(`Duplicate select option value: ${path}`);
    values.add(key);
  }
}

function validateItemLimits(node: ValueTypeNode, path: string) {
  for (const [name, value] of [["minItems", node.minItems], ["maxItems", node.maxItems]] as const)
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) throw new Error(`Invalid ${name}: ${path}`);
  if (node.minItems !== undefined && node.maxItems !== undefined && node.minItems > node.maxItems) throw new Error(`minItems exceeds maxItems: ${path}`);
}

function validateLocalizedArrayIdentity(node: ValueTypeNode, path: string): boolean {
  const childLocalized = (node.fields ?? []).some((field) => validateLocalizedArrayIdentity(field, `${path}.${field.key}`))
    || Boolean(node.items && validateLocalizedArrayIdentity(node.items, `${path}.items`));
  if (node.type === "array" && childLocalized) {
    if (!node.presentation?.stableId) throw new Error(`Array with localized fields requires stable ids: ${path}`);
    if (node.items?.type !== "object") throw new Error(`Array with localized fields requires object items: ${path}`);
    validateStableIdField(node.items, path);
  }
  return node.locale === true || childLocalized;
}

function validateStableIdField(items: ValueTypeNode, path: string) {
  const id = items.fields?.find((field) => field.key === "id");
  if (!id || id.type !== "text" || id.required !== true) throw new Error(`Stable-id array requires a required text id field: ${path}`);
}
