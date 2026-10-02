const hexColorPattern = /^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Hex, `transparent`, or a balanced `linear-gradient(...)` CSS value. */
export function isCmsColorCss(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.toLowerCase() === "transparent") return true;
  if (hexColorPattern.test(trimmed)) return true;
  return isLinearGradientCss(trimmed);
}

export function normalizeCmsColorCss(value: string): string {
  return value.trim().toLowerCase();
}

function isLinearGradientCss(value: string): boolean {
  if (!/^linear-gradient\(/i.test(value) || !value.endsWith(")")) return false;
  let depth = 0;
  for (const ch of value) {
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}
