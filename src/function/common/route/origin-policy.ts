export function parseAllowedOrigins(
  value: unknown,
  name = "FUNCTION_ORIGINS",
): readonly string[] {
  if (typeof value !== "string") return Object.freeze([]);
  return Object.freeze([
    ...new Set(
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
        .map((origin) => parseOrigin(origin, name)),
    ),
  ]);
}

function parseOrigin(value: string, name: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.origin !== value)
    throw new Error(`${name} must contain absolute HTTP or HTTPS origins`);
  return url.origin;
}
