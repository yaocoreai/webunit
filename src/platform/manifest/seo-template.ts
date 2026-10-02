type TemplateFilter = Readonly<{ name: string; arguments: readonly string[] }>;
export type SeoTemplateExpression = Readonly<{ path: string; filters: readonly TemplateFilter[] }>;

export class TemplateSyntaxError extends Error {
  override readonly name = 'TemplateSyntaxError';
}

export const seoTemplateFilterNames = new Set([
  'default', 'required', 'trim', 'plain_text', 'collapse_whitespace', 'truncate', 'join', 'unique', 'compact',
  'keywords', 'append_site_title', 'absolute_url', 'image_url', 'image_width', 'image_height', 'image_type', 'image_alt',
  'media_thumbnail_url', 'media_duration', 'media_upload_date', 'media_content_url', 'media_embed_url',
  'iso_date', 'price_amount', 'price_currency', 'fragment',
]);

const expressionPattern = /{{\s*([^{}]+?)\s*}}/g;
const pathPattern = /^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z0-9_-]+)*$/;

export function parseSeoTemplateExpression(source: string): SeoTemplateExpression {
  const segments = split(source, '|').map((item) => item.trim());
  const path = segments.shift() ?? '';
  if (!pathPattern.test(path)) throw new TemplateSyntaxError(`Invalid SEO template path: ${path}`);
  const filters = segments.map((segment) => {
    const [namePart, argumentPart] = splitOnce(segment, ':');
    const name = namePart.trim();
    if (!seoTemplateFilterNames.has(name)) throw new TemplateSyntaxError(`Unknown SEO template filter: ${name}`);
    return { name, arguments: argumentPart === undefined ? [] : split(argumentPart, ',').map((item) => item.trim()).filter(Boolean) };
  });
  return { path, filters };
}

export function collectSeoTemplateExpressions(value: unknown): SeoTemplateExpression[] {
  const expressions: SeoTemplateExpression[] = [];
  const visit = (item: unknown) => {
    if (typeof item === 'string') for (const match of item.matchAll(expressionPattern)) expressions.push(parseSeoTemplateExpression(match[1]!));
    else if (Array.isArray(item)) item.forEach(visit);
    else if (isRecord(item)) Object.values(item).forEach(visit);
  };
  visit(value);
  return expressions;
}

export function renderSeoTemplateValue(value: unknown, context: Record<string, unknown>, origin: string): unknown {
  if (Array.isArray(value)) return value.map((item) => renderSeoTemplateValue(item, context, origin)).filter((item) => item !== undefined);
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
    const rendered = renderSeoTemplateValue(item, context, origin);
    return isEmpty(rendered) ? [] : [[key, rendered]];
  }));
  if (typeof value !== 'string') return value;
  const matches = [...value.matchAll(expressionPattern)];
  if (matches.length === 1 && matches[0]![0].length === value.length) return evaluate(matches[0]![1]!, context, origin);
  return value.replace(expressionPattern, (_match, expression: string) => stringify(evaluate(expression, context, origin))).trim();
}

export function resolveTemplateExpressionValue(source: string, context: Record<string, unknown>, origin: string): unknown {
  const matches = [...source.matchAll(expressionPattern)];
  if (matches.length !== 1 || matches[0]![0].length !== source.length) {
    throw new TemplateSyntaxError('Setting binding must contain one complete template expression');
  }
  return evaluate(matches[0]![1]!, context, origin);
}

function evaluate(source: string, context: Record<string, unknown>, origin: string): unknown {
  const expression = parseSeoTemplateExpression(source);
  let value = readPath(context, expression.path);
  for (const filter of expression.filters) {
    const args = filter.arguments.map((argument) => readArgument(argument, context));
    value = applyFilter(filter.name, value, args, origin);
  }
  return value;
}

function applyFilter(name: string, value: unknown, args: readonly unknown[], origin: string): unknown {
  if (name === 'default') return [value, ...args].find((item) => !isEmpty(item));
  if (name === 'required') { if (isEmpty(value)) throw new Error(`Required SEO template value is missing: ${stringify(args[0]) || 'value'}`); return value; }
  if (name === 'trim') return stringify(value).trim();
  if (name === 'plain_text') return stringify(value).replace(/<[^>]*>/g, ' ').replace(/[#*_~`>[\]()!-]/g, ' ');
  if (name === 'collapse_whitespace') return stringify(value).replace(/\s+/g, ' ').trim();
  if (name === 'truncate') return Array.from(stringify(value)).slice(0, positiveInteger(args[0], 160)).join('').trim();
  if (name === 'join') return Array.isArray(value) ? value.map(stringify).filter(Boolean).join(stringify(args[0]) || ', ') : value;
  if (name === 'unique') return Array.isArray(value) ? [...new Set(value.map(stringify).filter(Boolean))] : value;
  if (name === 'compact') return Array.isArray(value) ? value.filter((item) => !isEmpty(item)) : value;
  if (name === 'keywords') return [...new Set([value, ...args].flatMap((item) => Array.isArray(item) ? item.map(stringify) : stringify(item).split(/[,，;；]/)).map((item) => item.trim()).filter(Boolean))].join(', ');
  if (name === 'append_site_title') { const title = stringify(value).trim(); const site = stringify(args[0]).trim(); return !site || title === site ? title : !title ? site : `${title} | ${site}`; }
  if (name === 'absolute_url') return absoluteUrl(stringify(value), origin);
  if (name === 'image_url') return absoluteUrl(readNestedString(value, ['delivery', 'url']) ?? readNestedString(value, ['url']) ?? stringify(value), origin);
  if (name === 'image_width') return readNestedNumber(value, ['width']);
  if (name === 'image_height') return readNestedNumber(value, ['height']);
  if (name === 'image_type') return readNestedString(value, ['contentType']) ?? readNestedString(value, ['type']);
  if (name === 'image_alt') return readNestedString(value, ['alt']);
  if (name === 'media_thumbnail_url') return absoluteUrl(readNestedString(value, ['poster', 'url']) ?? '', origin);
  if (name === 'media_duration') return readNestedNumber(value, ['duration']);
  if (name === 'media_upload_date') return readNestedString(value, ['publishedAt']);
  if (name === 'media_content_url') return readNestedString(value, ['delivery', 'type']) === 'file' ? absoluteUrl(readNestedString(value, ['delivery', 'url']) ?? '', origin) : undefined;
  if (name === 'media_embed_url') return readNestedString(value, ['delivery', 'type']) === 'embed' ? absoluteUrl(readNestedString(value, ['delivery', 'url']) ?? '', origin) : undefined;
  if (name === 'iso_date') { const text = stringify(value); return text && !Number.isNaN(Date.parse(text)) ? text : undefined; }
  if (name === 'price_amount') return resolvePriceAmount(value);
  if (name === 'price_currency') return readNestedString(value, ['currency']);
  if (name === 'fragment') { const url = absoluteUrl(stringify(value), origin); if (!url) return undefined; const parsed = new URL(url); parsed.hash = stringify(args[0]).replace(/^#/, ''); return parsed.toString(); }
  throw new Error(`Unknown SEO template filter: ${name}`);
}

function resolvePriceAmount(value: unknown): string | number | undefined {
  const explicit = readNestedString(value, ['amount']) ?? readNestedNumber(value, ['amount']);
  if (explicit !== undefined) return explicit;
  if (!isRecord(value) || !Number.isSafeInteger(value.amountMinor)) return undefined;
  const currency = typeof value.currency === 'string' && /^[a-z]{3}$/i.test(value.currency) ? value.currency : undefined;
  if (!currency) return undefined;
  const minorUnit = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const digits = String(value.amountMinor).padStart(minorUnit + 1, '0');
  return minorUnit === 0 ? digits : `${digits.slice(0, -minorUnit)}.${digits.slice(-minorUnit)}`;
}

const readArgument = (value: string, context: Record<string, unknown>): unknown => {
  const quoted = value.match(/^(['"])(.*)\1$/);
  if (quoted) return quoted[2];
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if (value === 'true' || value === 'false') return value === 'true';
  if (value === 'null') return null;
  if (!pathPattern.test(value)) throw new TemplateSyntaxError(`Invalid SEO template argument: ${value}`);
  return readPath(context, value);
};
const split = (value: string, separator: string) => { const output: string[] = []; let quote = ''; let current = ''; for (const character of value) { if ((character === '"' || character === "'") && (!quote || quote === character)) quote = quote ? '' : character; if (character === separator && !quote) { output.push(current); current = ''; } else current += character; } output.push(current); return output; };
const splitOnce = (value: string, separator: string): [string, string?] => { const parts = split(value, separator); return [parts.shift() ?? '', parts.length ? parts.join(separator) : undefined]; };
const readPath = (context: Record<string, unknown>, path: string) => path.split('.').reduce<unknown>((item, key) => {
  if (isRecord(item)) return item[key];
  if (Array.isArray(item)) return item.find((candidate) => isRecord(candidate) && candidate.id === key);
  return undefined;
}, context);
const readNestedString = (value: unknown, path: readonly string[]) => { const result = path.reduce<unknown>((item, key) => isRecord(item) ? item[key] : undefined, value); return typeof result === 'string' && result ? result : undefined; };
const readNestedNumber = (value: unknown, path: readonly string[]) => { const result = path.reduce<unknown>((item, key) => isRecord(item) ? item[key] : undefined, value); return typeof result === 'number' && Number.isFinite(result) ? result : typeof result === 'string' && /^\d+$/.test(result) ? Number(result) : undefined; };
const absoluteUrl = (value: string, origin: string) => { if (!value) return undefined; try { const url = new URL(value, origin); return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined; } catch { return undefined; } };
const stringify = (value: unknown) => value === undefined || value === null ? '' : typeof value === 'object' ? '' : String(value);
const positiveInteger = (value: unknown, fallback: number) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : fallback;
const isEmpty = (value: unknown): boolean => value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0) || (isRecord(value) && Object.keys(value).length === 0);
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
