import {
  isCmsResourceRef,
  type CmsResourceRef,
} from "./cms-resource-ref";

export type CmsLinkStored =
  | Readonly<{
      type: "path";
      title: string;
      target: "_self" | "_blank";
      href: string;
    }>
  | Readonly<{
      type: "module";
      target: "_self" | "_blank";
      reference: `module.${string}`;
      id: string;
    }>;

export type CmsEditorResourceReference = Readonly<{ key: string } & CmsResourceRef>;

export type CmsEditorLinkReference = Readonly<{
  key: string;
  type: "link";
  value: CmsLinkStored;
}>;

export type CmsEditorReference =
  | CmsEditorResourceReference
  | CmsEditorLinkReference;

export type CmsEditorDocument<TContent> = Readonly<{
  content: TContent;
  references: readonly CmsEditorReference[];
}>;

export function isCmsLinkStored(value: unknown): value is CmsLinkStored {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const link = value as Record<string, unknown>;
  if (link.target !== "_self" && link.target !== "_blank") return false;
  if (link.type === "path") {
    return (
      typeof link.title === "string" &&
      typeof link.href === "string" &&
      !Object.hasOwn(link, "reference") &&
      !Object.hasOwn(link, "id")
    );
  }
  return (
    link.type === "module" &&
    typeof link.reference === "string" &&
    link.reference.startsWith("module.") &&
    typeof link.id === "string" &&
    Boolean(link.id) &&
    !Object.hasOwn(link, "href") &&
    !Object.hasOwn(link, "title")
  );
}

export function isCmsEditorDocument(
  value: unknown,
): value is CmsEditorDocument<unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const document = value as Record<string, unknown>;
  if (!Object.hasOwn(document, "content") || !Array.isArray(document.references))
    return false;
  if (Object.hasOwn(document, "version") || Object.hasOwn(document, "value"))
    return false;
  return document.references.every(isCmsEditorReference);
}

export function isHtmlEditorDocument(
  value: unknown,
): value is CmsEditorDocument<string> {
  return isCmsEditorDocument(value) && typeof value.content === "string";
}

export function isRichTextEditorDocument(
  value: unknown,
): value is CmsEditorDocument<readonly unknown[]> {
  return isCmsEditorDocument(value) && Array.isArray(value.content);
}

export function isCmsEditorReference(value: unknown): value is CmsEditorReference {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const reference = value as Record<string, unknown>;
  if (typeof reference.key !== "string" || !/^[A-Za-z0-9_-]+$/.test(reference.key))
    return false;
  if (reference.type === "link") return isCmsLinkStored(reference.value);
  const resource = { ...reference };
  delete resource.key;
  return isCmsResourceRef(resource);
}

export function emptyHtmlDocument(): CmsEditorDocument<string> {
  return { content: "", references: [] };
}

export function emptyRichTextDocument(): CmsEditorDocument<unknown[]> {
  return { content: [], references: [] };
}
