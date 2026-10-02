export type Locale = "zh" | "en";

export function siteLocale(locale: string): Locale {
  return locale.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function contentPath(pathname: string) {
  const path = pathname.replace(/\/+$/, "") || "/";
  for (const prefix of ["/zh", "/en"]) {
    if (path === prefix) return "/";
    if (path.startsWith(`${prefix}/`)) return path.slice(prefix.length) || "/";
  }
  return path;
}

export function href(locale: Locale, path: string) {
  const normalized = contentPath(path.startsWith("/") ? path : `/${path}`);
  if (locale === "zh") return normalized === "/" ? "/zh" : `/zh${normalized}`;
  return normalized;
}
