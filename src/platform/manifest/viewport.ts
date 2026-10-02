export type ViewportVariant = Readonly<{
  key: string;
  label?: string;
  when: Readonly<{ minWidth?: number; maxWidth?: number }>;
}>;

export type ViewportDefinition = Readonly<{
  strategy?: "responsive" | "fixed" | "bounded" | "variants";
  minWidth?: number;
  maxWidth?: number;
  supported?: Readonly<{ minWidth?: number; maxWidth?: number }>;
  width?: number;
  height?: number;
  variants?: readonly ViewportVariant[];
}>;

export const defaultViewportMinWidth = 375;

export function resolveViewportWidth(
  definition: ViewportDefinition | undefined,
  requestedWidth: number,
) {
  const minWidth = Math.max(
    defaultViewportMinWidth,
    definition?.supported?.minWidth ??
      definition?.minWidth ??
      defaultViewportMinWidth,
  );
  const maxWidth =
    definition?.supported?.maxWidth ??
    (definition?.strategy === "bounded" ? definition.maxWidth : undefined);
  const width =
    definition?.strategy === "fixed"
      ? Math.max(definition.width ?? minWidth, requestedWidth)
      : requestedWidth;
  return Math.min(
    Math.max(minWidth, width),
    maxWidth ?? Number.POSITIVE_INFINITY,
  );
}

export function resolveViewportVariant(
  definition: ViewportDefinition | undefined,
  requestedWidth: number,
) {
  if (definition?.strategy !== "variants") return undefined;
  const width = resolveViewportWidth(definition, requestedWidth);
  return definition.variants?.find(
    (variant) =>
      (variant.when.minWidth === undefined || width >= variant.when.minWidth) &&
      (variant.when.maxWidth === undefined || width <= variant.when.maxWidth),
  );
}

export function resolveViewportMetaContent(
  definition: ViewportDefinition | undefined,
) {
  return definition?.strategy === "fixed" && definition.width
    ? `width=${definition.width}`
    : "width=device-width, initial-scale=1";
}
