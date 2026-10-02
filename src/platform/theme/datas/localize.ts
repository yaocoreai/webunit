import type { ContentTranslationInput, SectionDataInput } from '@/platform/theme/define/datas';
import { isCmsEditorDocument } from '@/platform/schema';

type ContentData = Readonly<{
  settings?: Readonly<Record<string, unknown>>;
  messages?: Readonly<Record<string, string>>;
  slots?: Readonly<Record<string, readonly SectionDataInput[]>>;
}>;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function mergeLocalizedValue(source: unknown, translation: unknown): unknown {
  if (translation === undefined) return source;
  if (isCmsEditorDocument(source)) return isCmsEditorDocument(translation) ? translation : source;
  if (Array.isArray(source) && Array.isArray(translation)) {
    if (!source.every((item) => isRecord(item) && typeof item.id === 'string')) return translation;
    return source.map((item) => {
      if (!isRecord(item) || typeof item.id !== 'string') return item;
      const localized = translation.find((candidate) => isRecord(candidate) && candidate.id === item.id);
      return localized ? mergeLocalizedValue(item, localized) : item;
    });
  }
  if (isRecord(source) && isRecord(translation)) {
    return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, mergeLocalizedValue(value, translation[key])]));
  }
  return translation;
}

export function localizeContentData<T extends ContentData>(content: T, translation?: ContentTranslationInput): T {
  if (!translation) return content;

  const slots = Object.fromEntries(Object.entries(content.slots ?? {}).map(([slotKey, sections]) => [
    slotKey,
    sections.map((section): SectionDataInput => {
      const localized = translation.slots?.[slotKey]?.find((candidate) => candidate.id === section.id);
      return localized ? { ...section, settings: mergeLocalizedValue(section.settings, localized.settings) as SectionDataInput['settings'], messages: { ...section.messages, ...localized.messages } } : section;
    }),
  ]));

  return { ...content, settings: mergeLocalizedValue(content.settings ?? {}, translation.settings), messages: { ...(content.messages ?? {}), ...translation.messages }, slots } as T;
}
