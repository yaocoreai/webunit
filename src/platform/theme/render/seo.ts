import { asRecord, readString } from './value';
import { serializeJsonForHtml } from './html-json';
import type { PublicJson, SeoPayload } from '@/platform/theme/render/model';

const dangerousKeys = new Set(['__proto__', 'constructor', 'prototype']);
const dangerousScheme = /^\s*(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/i;
const urlProperties = new Set(['@id', 'contentUrl', 'embedUrl', 'image', 'item', 'logo', 'mainEntityOfPage', 'sameAs', 'thumbnailUrl', 'url']);
const openGraphUrlProperties = new Set(['audio', 'audio:secure_url', 'image', 'image:secure_url', 'url', 'video', 'video:secure_url']);
const twitterUrlProperties = new Set(['image', 'player']);
const typedMetaNames = new Set(['description', 'robots', 'googlebot', 'googlebot-news', 'bingbot']);

function readUrl(value: unknown): string | undefined {
  const text = readString(value);
  if (!text || text.length > 2_048) return undefined;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function sanitizeJsonLd(value: unknown, property: string | undefined, depth: number, nodes: { value: number }): PublicJson | undefined {
  nodes.value += 1;
  if (depth > 24 || nodes.value > 10_000) return undefined;
  if (Array.isArray(value)) return value.flatMap((item) => {
    const sanitized = sanitizeJsonLd(item, property, depth + 1, nodes);
    return sanitized === undefined ? [] : [sanitized];
  });
  const record = asRecord(value);
  if (record) {
    const output: Record<string, PublicJson> = {};
    for (const [key, item] of Object.entries(record)) {
      if (dangerousKeys.has(key) || !/^[@A-Za-z][@A-Za-z0-9_.:-]{0,127}$/.test(key)) continue;
      if (key === '@context') {
        if (item === 'https://schema.org' || item === 'https://schema.org/') output[key] = item;
        continue;
      }
      const sanitized = sanitizeJsonLd(item, key, depth + 1, nodes);
      if (sanitized !== undefined) output[key] = sanitized;
    }
    return Object.keys(output).length ? output : undefined;
  }
  if (typeof value === 'string') {
    if (dangerousScheme.test(value)) return undefined;
    if ((urlProperties.has(property ?? '') || /Url$/.test(property ?? '')) && /^\w+:/.test(value) && !readUrl(value)) return undefined;
    return value;
  }
  return value === null || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)) ? value : undefined;
}

function sanitizePropertyMap(
  value: Record<string, string | string[]> | undefined,
  urlKeys: ReadonlySet<string>,
): Record<string, string | string[]> | undefined {
  if (!value) return undefined;
  const output = Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
    if (dangerousKeys.has(key) || !/^[@A-Za-z][@A-Za-z0-9_.:-]{0,127}$/.test(key)) return [];
    const values = Array.isArray(item) ? item : [item];
    const sanitized = values.filter((entry) => !dangerousScheme.test(entry) && (!urlKeys.has(key) || Boolean(readUrl(entry))));
    if (sanitized.length === 0) return [];
    return [[key, Array.isArray(item) ? sanitized : sanitized[0]!]];
  }));
  return Object.keys(output).length ? output : undefined;
}

export function resolveSeo(value: SeoPayload) {
  const seenRobots = new Set<string>();
  const seenMeta = new Set<string>();
  const seenLinks = new Set<string>();
  const canonical = readUrl(value.canonical);
  const alternates = value.alternates.flatMap((item) => {
    const href = readUrl(item.href);
    return href && /^(?:[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*|x-default)$/.test(item.hreflang)
      ? [{ hreflang: item.hreflang, href }]
      : [];
  });
  const icons = value.icons.flatMap((icon) => {
    const href = readUrl(icon.href);
    return href ? [{ ...icon, href }] : [];
  });
  const links = value.links.flatMap((link) => {
    const href = readUrl(link.href);
    const rel = link.rel.toLowerCase();
    const identity = `${rel}\u0000${href ?? ''}`;
    if (!href || rel === 'canonical' || rel === 'alternate' || seenLinks.has(identity)) return [];
    seenLinks.add(identity);
    return [{ ...link, rel, href }];
  });
  const jsonLdText = value.jsonLd
    .map((item) => sanitizeJsonLd(item, undefined, 0, { value: 0 }))
    .filter((item) => asRecord(item) !== undefined)
    .map(serializeJsonForHtml);

  return {
    title: readString(value.title),
    description: readString(value.description) || undefined,
    canonical,
    robots: value.robots.flatMap((item) => {
      const name = item.name.toLowerCase();
      if (!/^[a-z][a-z0-9-]{0,63}$/i.test(name) || !item.content.length || seenRobots.has(name)) return [];
      seenRobots.add(name);
      return [{ name, content: item.content }];
    }),
    alternates,
    icons,
    meta: value.meta.flatMap((item) => {
      const name = item.name.toLowerCase();
      if (!name || !item.content.length || typedMetaNames.has(name) || name.startsWith('og:') || name.startsWith('twitter:') || seenMeta.has(name)) return [];
      seenMeta.add(name);
      return [{ name, content: item.content }];
    }),
    links,
    openGraph: sanitizePropertyMap(value.openGraph, openGraphUrlProperties),
    twitter: sanitizePropertyMap(value.twitter, twitterUrlProperties) as Record<string, string> | undefined,
    jsonLdText,
  };
}
