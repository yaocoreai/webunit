export const spacingLengthUnits = [
  "px",
  "rem",
  "em",
  "%",
  "vw",
  "vh",
  "vmin",
  "vmax",
] as const;

export type SpacingLengthUnit = (typeof spacingLengthUnits)[number];
export type SpacingBoxSide = "top" | "right" | "bottom" | "left";
export type SpacingBoxValue = Readonly<Record<SpacingBoxSide, string>>;
export type SpacingCssProperty = "margin" | "padding";

const spacingSides = ["top", "right", "bottom", "left"] as const satisfies readonly SpacingBoxSide[];
const spacingLengthPattern =
  /^(?<sign>-)?(?<value>\d+(?:\.\d+)?)(?<unit>px|rem|em|%|vw|vh|vmin|vmax)$/;

export const emptySpacingBoxValue = Object.freeze({
  top: "0px",
  right: "0px",
  bottom: "0px",
  left: "0px",
}) satisfies SpacingBoxValue;

export type ParseSpacingLengthResult = Readonly<{
  value: number;
  unit: SpacingLengthUnit;
  negative: boolean;
}>;

export function parseSpacingLength(value: unknown): ParseSpacingLengthResult | undefined {
  if (typeof value !== "string") return undefined;
  const match = spacingLengthPattern.exec(value);
  if (!match?.groups) return undefined;
  const amount = Number(match.groups.value);
  if (!Number.isFinite(amount)) return undefined;
  return {
    value: amount,
    unit: match.groups.unit as SpacingLengthUnit,
    negative: match.groups.sign === "-",
  };
}

export function formatSpacingLength(value: number, unit: SpacingLengthUnit): string {
  if (!Number.isFinite(value)) return `0${unit}`;
  const normalized = Object.is(value, -0) ? 0 : value;
  return `${normalized}${unit}`;
}

export function isSpacingLength(
  value: unknown,
  options: Readonly<{ allowNegative?: boolean }> = {},
): value is string {
  const parsed = parseSpacingLength(value);
  if (!parsed) return false;
  return options.allowNegative === true || !parsed.negative;
}

export function isSpacingBoxValue(
  value: unknown,
  options: Readonly<{ allowNegative?: boolean }> = {},
): value is SpacingBoxValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== spacingSides.length) return false;
  return spacingSides.every(
    (side) => Object.hasOwn(record, side) && isSpacingLength(record[side], options),
  );
}

export function isSpacingLengthInRange(
  length: string,
  options: Readonly<{ min?: number; max?: number }> = {},
): boolean {
  const parsed = parseSpacingLength(length);
  if (!parsed) return false;
  const signed = parsed.negative ? -parsed.value : parsed.value;
  if (options.min !== undefined && signed < options.min) return false;
  if (options.max !== undefined && signed > options.max) return false;
  return true;
}

export function isSpacingBoxValueInRange(
  value: SpacingBoxValue,
  options: Readonly<{ min?: number; max?: number }> = {},
): boolean {
  return spacingSides.every((side) => isSpacingLengthInRange(value[side], options));
}

export function toCssBox(value: SpacingBoxValue, property: SpacingCssProperty): string {
  return `${property}: ${value.top} ${value.right} ${value.bottom} ${value.left}`;
}

export function normalizeSpacingBoxValue(
  value: unknown,
  options: Readonly<{ allowNegative?: boolean }> = {},
): SpacingBoxValue {
  if (isSpacingBoxValue(value, options)) return { ...value };
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    return {
      top: normalizeSide(record.top, options),
      right: normalizeSide(record.right, options),
      bottom: normalizeSide(record.bottom, options),
      left: normalizeSide(record.left, options),
    };
  }
  return { ...emptySpacingBoxValue };
}

function normalizeSide(
  value: unknown,
  options: Readonly<{ allowNegative?: boolean }>,
): string {
  if (isSpacingLength(value, options)) return value;
  return emptySpacingBoxValue.top;
}
