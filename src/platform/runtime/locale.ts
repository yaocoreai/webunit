export const localePattern = /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-[A-Z]{2}|-\d{3})?$/;

export function readRequestLocale(request: Request, fallback = 'en-us') {
  const explicit = request.headers.get('x-platform-locale')?.trim();
  if (explicit) return validateLocale(explicit);
  const accepted = request.headers.get('accept-language');
  if (!accepted) return validateLocale(fallback);
  const candidates = accepted.split(',').slice(0, 16).map((value, index) => {
    const [locale = '', ...parameters] = value.trim().split(';');
    const quality = parameters.reduce((result, parameter) => {
      const match = /^q\s*=\s*(0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/i.exec(parameter.trim());
      return match ? Number(match[1]) : result;
    }, 1);
    return { locale, quality, index };
  }).filter(({ locale, quality }) => locale && quality > 0 && locale !== '*').sort((left, right) => right.quality - left.quality || left.index - right.index);
  for (const candidate of candidates) {
    try { return validateLocale(candidate.locale); }
    catch { /* Ignore malformed Accept-Language candidates and continue negotiation. */ }
  }
  return validateLocale(fallback);
}

export function validateLocale(locale: string) {
  let canonical: string;
  try { [canonical] = Intl.getCanonicalLocales(locale); }
  catch { throw new TypeError('Invalid locale'); }
  if (!canonical || !localePattern.test(canonical)) throw new TypeError('Invalid locale');
  return canonical.toLowerCase();
}

export function selectDocumentLocale(request: Request): 'en' | 'zh-cn' {
  try {
    return readRequestLocale(request).startsWith('zh') ? 'zh-cn' : 'en';
  } catch {
    return 'en';
  }
}
