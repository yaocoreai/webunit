import { isCmsEditorDocument, type CmsEditorDocument } from "./cms-editor-document";

/** Fields copied onto content while rendering. They are not stored. */
export type EditorResolvedReference = Readonly<{
  url?: string;
  label?: string;
  provider?: string;
  alt?: string;
  width?: number;
  height?: number;
  href?: string;
  resource?: unknown;
}>;

const ephemeralRichProps = ["url", "name", "provider", "label", "assetAlt", "assetWidth", "assetHeight"] as const;

/** Drop resolved addresses and references the content no longer points at. */
export function encodeEditorDocument<TContent extends string | readonly unknown[]>(
  document: CmsEditorDocument<TContent>,
): CmsEditorDocument<TContent> {
  if (typeof document.content === "string") {
    const content = document.content.replace(
      /<([A-Za-z][A-Za-z0-9-]*)([^>]*\sdata-cms-ref=(?:"[A-Za-z0-9_-]+"|'[A-Za-z0-9_-]+')[^>]*)>/g,
      (_source, tag: string, attributes: string) =>
        `<${tag}${attributes.replace(/\s(?:src|href|aria-label|alt)=(?:"[^"]*"|'[^']*')/gi, "")}>`,
    );
    return pruneEditorDocument({ ...document, content: content as TContent });
  }
  return pruneEditorDocument({
    ...document,
    content: stripRichText(document.content) as unknown as TContent,
  });
}

/**
 * Write resolved addresses back into HTML or rich-text content.
 * `resolve` receives one stored reference. Callers load resources and choose the URL.
 */
export function decodeEditorDocument<TContent extends string | readonly unknown[]>(
  document: CmsEditorDocument<TContent>,
  resolve: (reference: Readonly<Record<string, unknown>>) => EditorResolvedReference | undefined,
): TContent {
  const references = new Map<string, Readonly<Record<string, unknown>>>();
  for (const candidate of document.references) {
    if (candidate && typeof candidate === "object" && typeof candidate.key === "string")
      references.set(candidate.key, candidate);
  }
  const viewFor = (key: string) => {
    const reference = references.get(key);
    return reference ? resolve(reference) : undefined;
  };
  const referenceFor = (key: string) => references.get(key);
  if (typeof document.content === "string") return decodeHtml(document.content, viewFor, referenceFor) as TContent;
  return decodeRichText(document.content, viewFor, referenceFor) as unknown as TContent;
}

/** Read the shared address fields from an already loaded resource. */
export function editorResourceView(
  resource: Readonly<Record<string, unknown>>,
  url?: string,
): EditorResolvedReference {
  const delivery = asRecord(resource.delivery);
  const href = typeof resource.href === "string" ? resource.href : undefined;
  const deliveryUrl = typeof delivery?.url === "string" ? delivery.url : undefined;
  const width = typeof resource.width === "number" ? resource.width : undefined;
  const height = typeof resource.height === "number" ? resource.height : undefined;
  return {
    url: url ?? href ?? deliveryUrl,
    label: editorReferenceLabel(resource),
    ...(typeof delivery?.provider === "string" ? { provider: delivery.provider } : {}),
    ...(resource.type === "image" && typeof resource.alt === "string" ? { alt: resource.alt } : {}),
    ...(resource.type === "video" && width !== undefined && height !== undefined ? { width, height } : {}),
    ...(href ? { href } : {}),
    resource: asRecord(resource.resource) ?? resource,
  };
}

export function isEncodableEditorDocument(
  value: unknown,
): value is CmsEditorDocument<string | readonly unknown[]> {
  return isCmsEditorDocument(value) && (typeof value.content === "string" || Array.isArray(value.content));
}

function pruneEditorDocument<TContent>(document: CmsEditorDocument<TContent>): CmsEditorDocument<TContent> {
  const used = typeof document.content === "string"
    ? usedHtmlReferenceKeys(document.content)
    : usedRichTextReferenceKeys(document.content as readonly unknown[]);
  return { ...document, references: document.references.filter((reference) => used.has(reference.key)) };
}

export function usedHtmlReferenceKeys(value: string) {
  return new Set(
    [...value.matchAll(/\bdata-cms-ref=(?:"([A-Za-z0-9_-]+)"|'([A-Za-z0-9_-]+)')/g)].map(
      (match) => match[1] ?? match[2]!,
    ),
  );
}

export function usedRichTextReferenceKeys(value: readonly unknown[]) {
  const used = new Set<string>();
  const visit = (nodes: readonly unknown[]) => {
    for (const candidate of nodes) {
      const node = asRecord(candidate);
      if (!node) continue;
      const props = asRecord(node.props);
      if (typeof props?.referenceKey === "string") used.add(props.referenceKey);
      for (const inline of richInlines(node.content)) {
        if (inline.type === "link" && typeof inline.referenceKey === "string") used.add(inline.referenceKey);
      }
      if (Array.isArray(node.children)) visit(node.children);
    }
  };
  visit(value);
  return used;
}

function stripRichText(nodes: readonly unknown[]): unknown[] {
  return nodes.map((candidate) => {
    const node = asRecord(candidate);
    if (!node) return candidate;
    const props = asRecord(node.props) ?? {};
    const content = mapRichInlines(node.content, (inline) => {
      if (inline.type !== "link" || typeof inline.referenceKey !== "string") return inline;
      return { type: inline.type, referenceKey: inline.referenceKey, content: inline.content };
    });
    const nextProps = typeof props.referenceKey === "string" ? omitEphemeralProps(props) : props;
    return {
      ...node,
      props: nextProps,
      ...(content !== undefined ? { content } : {}),
      ...(Array.isArray(node.children) ? { children: stripRichText(node.children) } : {}),
    };
  });
}

function richInlines(content: unknown): Record<string, unknown>[] {
  if (Array.isArray(content)) {
    return content.flatMap((inline) => {
      const record = asRecord(inline);
      return record ? [record] : [];
    });
  }
  const table = asRecord(content);
  if (!table || !Array.isArray(table.rows)) return [];
  return table.rows.flatMap((row) => {
    const record = asRecord(row);
    if (!record || !Array.isArray(record.cells)) return [];
    return record.cells.flatMap((cell) => {
      const inlines = Array.isArray(cell) ? cell : asRecord(cell)?.content;
      if (!Array.isArray(inlines)) return [];
      return inlines.flatMap((inline) => {
        const item = asRecord(inline);
        return item ? [item] : [];
      });
    });
  });
}

function mapRichInlines(content: unknown, mapInline: (inline: Record<string, unknown>) => unknown): unknown {
  if (Array.isArray(content)) {
    return content.map((inline) => {
      const record = asRecord(inline);
      return record ? mapInline(record) : inline;
    });
  }
  const table = asRecord(content);
  if (!table || !Array.isArray(table.rows)) return content;
  return {
    ...table,
    rows: table.rows.map((row) => {
      const record = asRecord(row);
      if (!record || !Array.isArray(record.cells)) return row;
      return {
        ...record,
        cells: record.cells.map((cell) => {
          if (Array.isArray(cell)) {
            return cell.map((inline) => {
              const inlineRecord = asRecord(inline);
              return inlineRecord ? mapInline(inlineRecord) : inline;
            });
          }
          const cellRecord = asRecord(cell);
          if (!cellRecord || !Array.isArray(cellRecord.content)) return cell;
          return {
            ...cellRecord,
            content: cellRecord.content.map((inline) => {
              const inlineRecord = asRecord(inline);
              return inlineRecord ? mapInline(inlineRecord) : inline;
            }),
          };
        }),
      };
    }),
  };
}

function omitEphemeralProps(props: Readonly<Record<string, unknown>>) {
  const next = { ...props };
  for (const key of ephemeralRichProps) delete next[key];
  return next;
}

function storedLinkTarget(reference: Readonly<Record<string, unknown>> | undefined) {
  const value = asRecord(reference?.value);
  return value?.target === "_blank" ? "_blank" : undefined;
}

function decodeHtml(
  html: string,
  viewFor: (key: string) => EditorResolvedReference | undefined,
  referenceFor: (key: string) => Readonly<Record<string, unknown>> | undefined,
) {
  return html.replace(
    /<([A-Za-z][A-Za-z0-9-]*)([^>]*\sdata-cms-ref=(?:"([A-Za-z0-9_-]+)"|'([A-Za-z0-9_-]+)')[^>]*)>/g,
    (source, tag: string, attributes: string, doubleKey?: string, singleKey?: string) => {
      const key = doubleKey ?? singleKey ?? "";
      const view = viewFor(key);
      if (!view) return source;
      let next = attributes;
      if (view.url) next = replaceHtmlAttribute(next, tag.toLowerCase() === "a" ? "href" : "src", view.url);
      if (tag.toLowerCase() === "img") {
        const alt = view.alt || view.label;
        if (alt) next = replaceHtmlAttribute(next, "alt", alt);
      } else if (view.label) next = replaceHtmlAttribute(next, "aria-label", view.label);
      if (tag.toLowerCase() === "a" && storedLinkTarget(referenceFor(key))) {
        next = replaceHtmlAttribute(next, "target", "_blank");
        next = replaceHtmlAttribute(next, "rel", "noopener noreferrer");
      }
      return `<${tag}${next}>`;
    },
  );
}

function decodeRichText(
  blocks: readonly unknown[],
  viewFor: (key: string) => EditorResolvedReference | undefined,
  referenceFor: (key: string) => Readonly<Record<string, unknown>> | undefined,
): unknown[] {
  return blocks.map((candidate) => {
    const block = asRecord(candidate);
    if (!block) return candidate;
    const props = asRecord(block.props) ?? {};
    const view = typeof props.referenceKey === "string" ? viewFor(props.referenceKey) : undefined;
    const content = mapRichInlines(block.content, (inline) => {
      if (inline.type !== "link" || typeof inline.referenceKey !== "string") return inline;
      const link = viewFor(inline.referenceKey);
      const target = storedLinkTarget(referenceFor(inline.referenceKey));
      if (!link?.href && !target) return inline;
      return {
        ...inline,
        ...(link?.href ? { href: link.href, resource: link.resource } : {}),
        ...(target ? { target } : {}),
      };
    });
    return {
      ...block,
      props: view ? applyRichProps(props, view) : props,
      ...(content !== undefined ? { content } : {}),
      ...(Array.isArray(block.children) ? { children: decodeRichText(block.children, viewFor, referenceFor) } : {}),
    };
  });
}

function applyRichProps(props: Readonly<Record<string, unknown>>, view: EditorResolvedReference) {
  return {
    ...props,
    ...(view.url ? { url: view.url } : {}),
    ...(view.label ? { name: view.label } : {}),
    ...(view.provider ? { provider: view.provider } : {}),
    ...(view.alt ? { assetAlt: view.alt } : {}),
    ...(view.width !== undefined && view.height !== undefined
      ? { assetWidth: view.width, assetHeight: view.height }
      : {}),
  };
}

function editorReferenceLabel(resource: Readonly<Record<string, unknown>>) {
  for (const key of ["title", "name", "remark"]) {
    if (typeof resource[key] === "string" && resource[key]) return resource[key];
  }
  return undefined;
}

function replaceHtmlAttribute(attributes: string, name: string, value: string) {
  const escaped = value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  const pattern = new RegExp(`\\s${name}=(?:"[^"]*"|'[^']*')`, "i");
  return pattern.test(attributes)
    ? attributes.replace(pattern, ` ${name}="${escaped}"`)
    : `${attributes} ${name}="${escaped}"`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
