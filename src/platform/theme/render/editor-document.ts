import type { RichTextNode } from './rich-text';
import { isCmsLinkValue } from '@/platform/theme/define/cms-link';
import { isCmsResourceRef, usedHtmlReferenceKeys, usedRichTextReferenceKeys } from '@/platform/schema';
import {
  isCmsEditorDocument as isSchemaCmsEditorDocument,
  type CmsEditorDocument,
  type CmsEditorReference,
} from '@/platform/theme/define/editor-document';
export type { CmsEditorDocument, CmsEditorReference } from '@/platform/theme/define/editor-document';
export { usedHtmlReferenceKeys, usedRichTextReferenceKeys };
export type CmsHtmlDocument = CmsEditorDocument<string>;
export type CmsRichTextDocument = CmsEditorDocument<readonly RichTextNode[]>;

export function isCmsEditorDocument<TValue>(value: unknown, validateValue: (candidate: unknown) => candidate is TValue): value is CmsEditorDocument<TValue> {
  if (!isSchemaCmsEditorDocument(value) || !validateValue(value.content)) return false;
  const keys = new Set<string>();
  for (const reference of value.references) {
    if (!isCmsEditorReference(reference) || keys.has(reference.key)) return false;
    keys.add(reference.key);
  }
  return true;
}

export function hasExactCmsEditorReferences<TValue>(document: CmsEditorDocument<TValue>, usedKeys: ReadonlySet<string>): boolean {
  return document.references.length === usedKeys.size && document.references.every((reference) => usedKeys.has(reference.key));
}

export function pruneCmsEditorReferences<TValue>(document: CmsEditorDocument<TValue>, usedKeys: ReadonlySet<string>): CmsEditorDocument<TValue> {
  return { ...document, references: document.references.filter((reference) => usedKeys.has(reference.key)) };
}

function isCmsEditorReference(value: unknown): value is CmsEditorReference {
  if (!isRecord(value) || typeof value.key !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value.key)) return false;
  if (value.type === 'link') return isCmsLinkValue(value.value);
  const { key: unusedEditorKey, ...resource } = value;
  void unusedEditorKey;
  return isCmsResourceRef(resource);
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
