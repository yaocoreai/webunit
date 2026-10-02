const localePattern = /^[a-z]{2}(?:-[a-z]{2})?$/i;

export function formatLink(href: string, currentUrl = '/', currentDomain?: string) {
  const currentLocale = readLocalePrefix(currentUrl);
  if (!currentLocale) return href;

  if (href.startsWith('/') && !href.startsWith('//')) return prefixPath(href, currentLocale);
  if (!/^https?:\/\//i.test(href) || !currentDomain) return href;

  let target: URL;
  try {
    target = new URL(href);
  } catch {
    return href;
  }
  if (target.host.toLowerCase() !== normalizeDomain(currentDomain)) return href;
  target.pathname = prefixPath(target.pathname, currentLocale);
  return target.href;
}

function prefixPath(value: string, locale: string) {
  const pathname = readPathname(value);
  if (readLocalePrefix(pathname)) return value;
  const prefix = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`;
  return `${prefix}${value.slice(pathname.length)}`;
}

function readLocalePrefix(value: string) {
  const pathname = readPathname(value);
  const segment = pathname.split('/')[1] ?? '';
  return localePattern.test(segment) ? segment : undefined;
}

function readPathname(value: string) {
  if (/^https?:\/\//i.test(value)) {
    try {
      return new URL(value).pathname || '/';
    } catch {
      return '/';
    }
  }
  return value.split(/[?#]/, 1)[0] || '/';
}

function normalizeDomain(value: string) {
  try {
    return new URL(`http://${value}`).host.toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}
