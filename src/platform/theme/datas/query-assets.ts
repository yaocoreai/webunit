import type { ValueTypeNode } from '@/platform/theme/define';
import type { ManifestProperty } from '@/platform/manifest';
import type { AssetDataInput, AssetQueryEntries } from '@/platform/theme/define/datas';
import type { CmsAsset } from '@/platform/theme/content/public';
import { formatAssetReference, isCmsAssetRef, isCmsEditorDocument, type CmsAssetType } from '@/platform/schema';
import type { ResourceMap } from './registry';

const assetTypes = new Set(['file', 'image', 'audio', 'video', 'files', 'images', 'audios', 'videos']);

export function collectAssetKeys(fields: readonly Readonly<Record<string, unknown>>[], properties: readonly ManifestProperty[]) {
  const definitions = new Map(properties.map((property) => [property.key, property]));
  const keys: string[] = [];
  for (const values of fields) {
    for (const [key, value] of Object.entries(values)) {
      const property = definitions.get(key);
      if (!property) continue;
      collectNodeAssetKeys(value, property, keys, []);
    }
  }
  return [...new Set(keys)];
}

function collectNodeAssetKeys(value: unknown, node: ValueTypeNode, output: string[], stack: readonly string[]) {
  if (node.type === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Readonly<Record<string, unknown>>;
    for (const field of node.fields ?? []) if (Object.hasOwn(record, field.key)) collectNodeAssetKeys(record[field.key], field, output, stack);
    return;
  }
  if (node.type === 'array' && Array.isArray(value) && node.items) {
    value.forEach((item) => collectNodeAssetKeys(item, node.items!, output, stack));
    return;
  }
  if (node.type === 'html' || node.type === 'rich') {
    collectEditorDocumentAssetKeys(value, output);
    return;
  }
  if (!assetTypes.has(node.type)) return;
  const singular = (node.type.endsWith('s') ? node.type.slice(0, -1) : node.type) as CmsAssetType;
  const expected = formatAssetReference(singular);
  const candidates = node.type.endsWith('s') && Array.isArray(value) ? value : [value];
  for (const candidate of candidates) if (isCmsAssetRef(candidate) && candidate.reference === expected) output.push(candidate.id);
}

function collectEditorDocumentAssetKeys(value: unknown, output: string[]) {
  if (!isCmsEditorDocument(value)) return;
  for (const reference of value.references) {
    if ("type" in reference && reference.type === "link") continue;
    const { key, ...resource } = reference;
    void key;
    if (isCmsAssetRef(resource)) output.push(resource.id);
  }
}

export async function loadAssetResources(query: AssetQueryEntries | undefined, keys: readonly string[], base: ResourceMap): Promise<ResourceMap> {
  if (!query || !keys.length) return base;
  const rows = await query(keys);
  if (!Array.isArray(rows)) throw new TypeError('Invalid queried Asset result');
  const requested = new Set(keys);
  const assets: Record<string, CmsAsset> = {};
  for (const row of rows) {
    if (!isAssetRow(row) || !requested.has(row.key) || Object.hasOwn(assets, row.key)) throw new TypeError('Invalid queried Asset result');
    if (row.value.id !== row.key) throw new TypeError('Queried Asset id mismatch');
    assets[row.value.id] = row.value;
  }
  return { ...base, file: { ...(base.file ?? {}), ...assets } };
}

function isAssetRow(value: unknown): value is Readonly<{ key: string; value: AssetDataInput }> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && typeof (value as { key?: unknown }).key === 'string'
    && (value as { value?: unknown }).value && typeof (value as { value?: unknown }).value === 'object'
    && !Array.isArray((value as { value?: unknown }).value));
}
