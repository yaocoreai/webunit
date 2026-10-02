export const cmsRouteSegmentPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function collapsePath(value: string) {
  const trimmed = value.trim();
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+/g, "/");
}

function assertSegments(value: string, label: "routePrefix" | "routeKey") {
  if (value.includes("?") || value.includes("#") || value.includes("..")) {
    throw new Error(`Invalid ${label}`);
  }
  const parts = value.split("/").filter(Boolean);
  if (parts.some((part) => !cmsRouteSegmentPattern.test(part))) {
    throw new Error(`Invalid ${label}`);
  }
}

export function normalizeCmsRoutePrefix(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized === "/") return "";
  const collapsed = collapsePath(normalized);
  const prefix =
    collapsed.length > 1 && collapsed.endsWith("/")
      ? collapsed.slice(0, -1)
      : collapsed;
  if (!prefix.startsWith("/") || prefix.endsWith("/")) {
    throw new Error("Invalid routePrefix");
  }
  assertSegments(prefix, "routePrefix");
  return prefix;
}

export function normalizeCmsRouteKey(value: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error("Route key is required");
  const collapsed = collapsePath(normalized);
  const key =
    collapsed.length > 1 && collapsed.endsWith("/")
      ? collapsed.slice(0, -1)
      : collapsed;
  if (key === "/") return "/";
  if (!key.startsWith("/") || key.endsWith("/")) {
    throw new Error("Invalid routeKey");
  }
  assertSegments(key, "routeKey");
  return key;
}

export function joinCmsRoutePath(routePrefix: string, routeKey: string) {
  return routeKey === "/" ? routePrefix || "/" : `${routePrefix}${routeKey}`;
}
