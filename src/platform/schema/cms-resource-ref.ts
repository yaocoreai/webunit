export const cmsAssetReferenceValues = [
  "asset.file",
  "asset.image",
  "asset.audio",
  "asset.video",
] as const;

export type CmsAssetReference =
  (typeof cmsAssetReferenceValues)[number];

export type CmsAssetType = "file" | "image" | "audio" | "video";

export type CmsResourceRef =
  | Readonly<{ reference: CmsAssetReference; id: string }>
  | Readonly<{ reference: "menu"; id: string }>
  | Readonly<{ reference: "form"; id: string }>
  | Readonly<{ reference: `module.${string}`; id: string }>;

export type ParsedCmsReference =
  | Readonly<{ kind: "asset"; assetType: CmsAssetType; reference: CmsAssetReference }>
  | Readonly<{ kind: "menu"; reference: "menu" }>
  | Readonly<{ kind: "form"; reference: "form" }>
  | Readonly<{ kind: "module"; moduleKey: string; reference: `module.${string}` }>;

const assetReferenceSet = new Set<string>(cmsAssetReferenceValues);

export function formatModuleReference(moduleKey: string): `module.${string}` {
  if (!moduleKey || moduleKey.includes(".")) {
    throw new Error(`Invalid CMS module key for reference: ${moduleKey}`);
  }
  return `module.${moduleKey}`;
}

export function formatAssetReference(assetType: CmsAssetType): CmsAssetReference {
  return `asset.${assetType}`;
}

export function parseCmsReference(reference: string): ParsedCmsReference | undefined {
  if (reference === "menu") return { kind: "menu", reference: "menu" };
  if (reference === "form") return { kind: "form", reference: "form" };
  if (assetReferenceSet.has(reference)) {
    return {
      kind: "asset",
      assetType: reference.slice("asset.".length) as CmsAssetType,
      reference: reference as CmsAssetReference,
    };
  }
  if (reference.startsWith("module.")) {
    const moduleKey = reference.slice("module.".length);
    if (!moduleKey || moduleKey.includes(".")) return undefined;
    return {
      kind: "module",
      moduleKey,
      reference: reference as `module.${string}`,
    };
  }
  return undefined;
}

export function isCmsResourceRef(value: unknown): value is CmsResourceRef {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !record.id) return false;
  if (typeof record.reference !== "string") return false;
  if (Object.keys(record).some((key) => key !== "id" && key !== "reference")) return false;
  return Boolean(parseCmsReference(record.reference));
}

export function isCmsAssetRef(value: unknown): value is Readonly<{ reference: CmsAssetReference; id: string }> {
  return isCmsResourceRef(value) && value.reference.startsWith("asset.");
}

export function isCmsMenuRef(value: unknown): value is Readonly<{ reference: "menu"; id: string }> {
  return isCmsResourceRef(value) && value.reference === "menu";
}

export function isCmsFormRef(value: unknown): value is Readonly<{ reference: "form"; id: string }> {
  return isCmsResourceRef(value) && value.reference === "form";
}

export function isCmsModuleRef(value: unknown): value is Readonly<{ reference: `module.${string}`; id: string }> {
  return isCmsResourceRef(value) && value.reference.startsWith("module.");
}
