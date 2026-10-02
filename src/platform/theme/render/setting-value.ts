import { defaultTreeMaxDepth } from '@/platform/schema';
import { codeLanguages, isSpacingBoxValue, isSpacingBoxValueInRange, resolveTableColumns, validateTableValue, type SettingDefinition, type ValueTypeNode } from '@/platform/theme/define';
import { isValidStoredPriceValue } from '@/platform/theme/content/price';
import { isRichText } from '@/platform/theme/render/rich-text';
import { hasExactCmsEditorReferences, isCmsEditorDocument, usedHtmlReferenceKeys, usedRichTextReferenceKeys } from '@/platform/theme/render/editor-document';
import {
  formatAssetReference,
  formatModuleReference,
  isCmsAssetRef,
  isCmsLinkStored,
  isCmsFormRef,
  isCmsMenuRef,
  isCmsModuleRef,
  type CmsAssetType,
} from '@/platform/schema';

export function validateSettingValue(field: SettingDefinition | ValueTypeNode, value: unknown, stack: readonly string[] = [], scope?: unknown): boolean {
  if (field.type === 'text' || field.type === 'textarea' || field.type === 'color') return typeof value === 'string';
  if (field.type === 'html') return isCmsEditorDocument(value, (candidate): candidate is string => typeof candidate === 'string')
    && hasExactCmsEditorReferences(value, usedHtmlReferenceKeys(value.content));
  if (field.type === 'heading') return isRecord(value)
    && Object.keys(value).every((key) => key === 'level' || key === 'value')
    && Number.isInteger(value.level) && Number(value.level) >= 1 && Number(value.level) <= 6
    && typeof value.value === 'string';
  if (field.type === 'spacing') {
    const allowNegative = 'allowNegative' in field && field.allowNegative === true;
    if (!isSpacingBoxValue(value, { allowNegative })) return false;
    const min = 'min' in field && typeof field.min === 'number' ? field.min : undefined;
    const max = 'max' in field && typeof field.max === 'number' ? field.max : undefined;
    return min === undefined && max === undefined
      ? true
      : isSpacingBoxValueInRange(value, { min, max });
  }
  if (field.type === 'rich') return isCmsEditorDocument(value, isRichText)
    && hasExactCmsEditorReferences(value, usedRichTextReferenceKeys(value.content));
  if (field.type === 'code') return isRecord(value)
    && Object.keys(value).every((key) => key === 'language' || key === 'content')
    && typeof value.content === 'string'
    && typeof value.language === 'string'
    && codeLanguages.includes(value.language as typeof codeLanguages[number])
    && (!("languages" in field) || !field.languages || field.languages.includes(value.language as typeof codeLanguages[number]));
  if (field.type === 'date') return value === null || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value));
  if (field.type === 'time') return value === null || (typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value));
  if (field.type === 'datetime') return value === null || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2} (?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value));
  if (field.type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (field.type === 'switch') return typeof value === 'boolean';
  if (field.type === 'select') return field.options?.some((option) => option.value === value) ?? false;
  if (field.type === 'object') return isRecord(value) && validateNodes(field.fields ?? [], value);
  if (field.type === 'tree') return validateSettingTree(field, value);
  if (field.type === 'array') {
    if (!collectionSizeIsValid(field, value) || !field.items) return false;
    const stable = 'id' in field || field.presentation?.stableId === true;
    const ids = new Set<string>();
    return value.every((item) => {
      if (stable && (!isRecord(item) || typeof item.id !== 'string' || !item.id || ids.has(item.id))) return false;
      if (stable) ids.add((item as { id: string }).id);
      return field.items!.type === 'object' && 'id' in field
        ? isRecord(item) && validateNodes(field.items!.fields, item)
        : validateSettingValue(field.items! as ValueTypeNode, item, stack, item);
    });
  }
  if (field.type === 'table') return collectionSizeIsValid(field, value) && validateTableValue(resolveTableColumns(field, scope), value);
  if (field.type === 'json') return isJsonValue(value);
  if (field.type === 'price') return isValidStoredPriceValue(value);
  if (field.type === 'link') return value === null || validateCmsLink(value);
  if (field.type === 'links') return collectionSizeIsValid(field, value) && value.every(validateCmsLink);
  if (field.type === 'menu') return value === null || isMenuReference(value);
  if (field.type === 'menus') return collectionSizeIsValid(field, value) && value.every(isMenuReference);
  if (field.type === 'form') return value === null || isFormReference(value);
  if (field.type === 'forms') return collectionSizeIsValid(field, value) && value.every(isFormReference);
  if (field.type === 'module') return value === null || isModuleReference(value, field.reference);
  if (field.type === 'modules') {
    return collectionSizeIsValid(field as Readonly<{ minItems?: number; maxItems?: number }>, value)
      && value.every((item) => isModuleReference(item, field.reference));
  }
  if (['file', 'image', 'audio', 'video'].includes(field.type)) {
    return value === null || isAssetReference(value, field.type as CmsAssetType);
  }
  if (['files', 'images', 'audios', 'videos'].includes(field.type)) {
    const singular = field.type.slice(0, -1) as CmsAssetType;
    return collectionSizeIsValid(field as Readonly<{ minItems?: number; maxItems?: number }>, value)
      && value.every((item) => isAssetReference(item, singular));
  }
  return false;
}

function isModuleReference(value: unknown, expectedReference?: string) {
  if (!isCmsModuleRef(value)) return false;
  if (!expectedReference) return true;
  return value.reference === formatModuleReference(expectedReference);
}

function isMenuReference(value: unknown) {
  return isCmsMenuRef(value)
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.id);
}

function isFormReference(value: unknown) {
  return isCmsFormRef(value)
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.id);
}

function isAssetReference(value: unknown, assetType: CmsAssetType) {
  return isCmsAssetRef(value) && value.reference === formatAssetReference(assetType);
}

const treeNodeIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateSettingTree(field: Extract<SettingDefinition, { type: "tree" }> | ValueTypeNode, value: unknown): boolean {
  if (field.type !== "tree" || !collectionSizeIsValid(field, value)) return false;
  const definitions = new Map((field.fields ?? []).map((child) => ["id" in child ? child.id : child.key, child]));
  const maxDepth = field.maxDepth ?? defaultTreeMaxDepth;
  const ids = new Set<string>();
  const visit = (nodes: unknown, depth: number): boolean => {
    if (!Array.isArray(nodes)) return false;
    if (depth > maxDepth) return nodes.length === 0;
    return nodes.every((item) => {
      if (!isRecord(item) || typeof item.id !== "string" || !treeNodeIdPattern.test(item.id) || ids.has(item.id) || !Array.isArray(item.children)) return false;
      ids.add(item.id);
      if (Object.keys(item).some((key) => key !== "id" && key !== "children" && !definitions.has(key))) return false;
      const fieldsMatch = [...definitions.entries()].every(([key, definition]) => {
        if (!Object.hasOwn(item, key)) return !("required" in definition && definition.required);
        return validateSettingValue(definition, item[key], [], item);
      });
      return fieldsMatch && visit(item.children, depth + 1);
    });
  };
  return visit(value, 1);
}

function validateNodes(fields: readonly (SettingDefinition | (ValueTypeNode & Readonly<{ key: string; required?: boolean }>))[], settings: Readonly<Record<string, unknown>>) {
  const definitions = new Map(fields.map((field) => ['id' in field ? field.id : field.key, field]));
  for (const [key, definition] of definitions) {
    if ('required' in definition && definition.required && !Object.hasOwn(settings, key)) return false;
  }
  return Object.entries(settings).every(([id, value]) => id === 'id' || (definitions.has(id) && validateSettingValue(definitions.get(id)!, value, [], settings)));
}

function collectionSizeIsValid(field: Readonly<{ minItems?: number; maxItems?: number }>, value: unknown): value is readonly unknown[] {
  return Array.isArray(value)
    && value.length >= (field.minItems ?? 0)
    && value.length <= (field.maxItems ?? Number.POSITIVE_INFINITY);
}

function validateCmsLink(value: unknown): boolean {
  return isCmsLinkStored(value);
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function isJsonValue(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isRecord(value) && Object.values(value).every(isJsonValue);
}
