import { ApiError } from "@/platform/runtime/error";
import type { PublicJson } from "@/platform/theme/render/model";
import { asRecord, readString } from "@/platform/theme/render/value";
import { materializePriceValue } from "@/platform/theme/content/price";
import {
  decodeEditorDocument,
  editorResourceView,
  isCmsAssetRef,
  isCmsEditorDocument,
  isCmsFormRef,
  isCmsMenuRef,
  isCmsModuleRef,
  parseCmsReference,
} from "@/platform/schema";
import type { SiteManifest } from "./contracts";
import type { ResponseCachePolicy } from "./site";

export const contractError = (path: string): never => {
  throw new ApiError("contract", 502, path);
};
export const requireRecord = (value: unknown, path: string) =>
  asRecord(value) ?? contractError(path);
export const requireString = (value: unknown, path: string) =>
  readString(value) || contractError(path);

export function adaptSiteManifest(value: unknown, path: string): SiteManifest {
  const manifest = requireRecord(value, path);
  if (!isPublicJson(manifest)) contractError(path);
  return manifest as SiteManifest;
}

export function readStringMap(
  value: unknown,
  path: string,
): Record<string, string> {
  const record = requireRecord(value, path);
  if (!Object.values(record).every((item) => typeof item === "string"))
    contractError(path);
  return record as Record<string, string>;
}

export function readJsonRecord(
  value: unknown,
  path: string,
): Record<string, PublicJson> {
  const record = requireRecord(value, path);
  if (!isPublicJson(record)) contractError(path);
  return record as Record<string, PublicJson>;
}

export function isPublicJson(value: unknown, depth = 0): value is PublicJson {
  if (depth > 24) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value))
    return value.every((item) => isPublicJson(item, depth + 1));
  const record = asRecord(value);
  return (
    Boolean(record) &&
    !Object.keys(record!).some(
      (key) =>
        key === "__proto__" || key === "constructor" || key === "prototype",
    ) &&
    Object.values(record!).every((item) => isPublicJson(item, depth + 1))
  );
}

export function adaptCache(value: unknown, path: string): ResponseCachePolicy {
  const cache = requireRecord(value, path);
  const surrogateKeys =
    Array.isArray(cache.surrogateKeys) &&
    cache.surrogateKeys.every((key) => typeof key === "string")
      ? (cache.surrogateKeys as string[])
      : contractError(path);
  if (cache.mode === "no-store") {
    if (cache.visibility !== "public" && cache.visibility !== "preview")
      contractError(path);
    return {
      mode: "no-store",
      visibility: cache.visibility as "public" | "preview",
      surrogateKeys,
    };
  }
  if (cache.mode !== "public") contractError(path);
  return {
    mode: "public",
    browserTtlSeconds: requireNonNegativeInteger(cache.browserTtlSeconds, path),
    sharedTtlSeconds: requireNonNegativeInteger(cache.sharedTtlSeconds, path),
    staleWhileRevalidateSeconds: requireNonNegativeInteger(
      cache.staleWhileRevalidateSeconds,
      path,
    ),
    surrogateKeys,
  };
}

export function requireNonNegativeInteger(value: unknown, path: string) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : contractError(path);
}

export function createTranslator(messages: Record<string, string>) {
  return (key: string) => (Object.hasOwn(messages, key) ? messages[key] : key);
}

export type ResourceMap = Record<
  string,
  Record<string, Record<string, unknown>>
>;

export function adaptRefs(value: unknown, path: string): ResourceMap {
  const refs = requireRecord(value, path);
  return Object.fromEntries(
    Object.entries(refs).map(([kind, items]) => {
      const itemMap = requireRecord(items, `${path}.${kind}`);
      return [
        kind,
        Object.fromEntries(
          Object.entries(itemMap).map(([id, item]) => {
            const resource = requireRecord(item, `${path}.${kind}.${id}`);
            if (resource.id !== id) contractError(`${path}.${kind}.${id}`);
            return [id, resource];
          }),
        ),
      ];
    }),
  );
}

export function materialize(
  value: unknown,
  refs: ResourceMap,
  defaultCurrency?: string,
  depth = 0,
): unknown {
  if (depth > 16) return value;
  if (Array.isArray(value))
    return value.map((item) => materialize(item, refs, defaultCurrency, depth + 1));
  const record = asRecord(value);
  if (!record) return value;
  if (isCmsEditorDocument(record))
    return materializeEditorDocument(record, refs, defaultCurrency, depth + 1);
  if (record.type === "path" && typeof record.href === "string")
    return { ...record, resource: null };
  if (
    record.type === "module" &&
    typeof record.reference === "string" &&
    record.reference.startsWith("module.") &&
    typeof record.id === "string"
  ) {
    const resource = refs[record.reference]?.[record.id]
      ?? (() => {
        const parsed = parseCmsReference(record.reference);
        return parsed?.kind === "module" ? refs[parsed.moduleKey]?.[record.id] : undefined;
      })();
    const page = asRecord(resource?.page);
    return resource && typeof page?.fullPath === "string"
      ? { ...record, href: page.fullPath, resource }
      : record;
  }
  if (isCmsAssetRef(record))
    return refs.file?.[record.id] ?? null;
  if (isCmsFormRef(record)) return record;
  if (isCmsMenuRef(record)) return refs.menu?.[record.id] ?? null;
  if (isCmsModuleRef(record)) {
    const parsed = parseCmsReference(record.reference);
    return refs[record.reference]?.[record.id]
      ?? (parsed?.kind === "module" ? refs[parsed.moduleKey]?.[record.id] ?? null : null);
  }
  const price = materializePriceValue(record, defaultCurrency);
  if (price) return price;
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [
      key,
      materialize(item, refs, defaultCurrency, depth + 1),
    ]),
  );
}

function materializeEditorDocument(
  document: Record<string, unknown>,
  refs: ResourceMap,
  defaultCurrency: string | undefined,
  depth: number,
) {
  if (typeof document.content !== "string" && !Array.isArray(document.content))
    return materialize(document.content, refs, defaultCurrency, depth);
  return decodeEditorDocument(
    { content: document.content, references: document.references as never },
    (reference) => {
      const resolved = resolveEditorReference(reference, refs, defaultCurrency, depth);
      return resolved ? editorResourceView(resolved) : undefined;
    },
  );
}

function resolveEditorReference(
  reference: Record<string, unknown> | undefined,
  refs: ResourceMap,
  defaultCurrency: string | undefined,
  depth: number,
): Record<string, unknown> | undefined {
  if (!reference) return undefined;
  if (reference.type === "link")
    return asRecord(materialize(reference.value, refs, defaultCurrency, depth + 1));
  const { key: unusedEditorKey, ...resource } = reference;
  void unusedEditorKey;
  if (isCmsAssetRef(resource)) return refs.file?.[resource.id];
  if (isCmsMenuRef(resource)) return refs.menu?.[resource.id];
  if (isCmsModuleRef(resource)) {
    const parsed = parseCmsReference(resource.reference);
    const resolved = refs[resource.reference]?.[resource.id]
      ?? (parsed?.kind === "module" ? refs[parsed.moduleKey]?.[resource.id] : undefined);
    const page = asRecord(resolved?.page);
    return resolved && typeof page?.fullPath === "string"
      ? { ...resolved, href: page.fullPath }
      : resolved;
  }
  return undefined;
}

