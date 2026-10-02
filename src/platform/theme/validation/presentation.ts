import { validateSettingBindings, type LayoutDefinition, type SectionDefinition, type SettingDefinition, type SlotDefinition, type TemplateDefinition } from '@/platform/theme/define';
import type { SectionDataInput } from '@/platform/theme/define/datas';
import { validateSettingValue } from '@/platform/theme/render/setting-value';

type ContentDefinition = LayoutDefinition | TemplateDefinition | SectionDefinition;
export function validatePresentationDefinition(
  definition: ContentDefinition,
  settings: Readonly<Record<string, unknown>>,
  messages: Readonly<Record<string, string>>,
  complete = true,
): boolean {
  return validateSettings(definition.settings, settings, new Set(), complete)
    && validateMessages(definition.messages, messages, complete);
}

export async function validatePresentationContent(input: Readonly<{
  owner: string;
  definition: LayoutDefinition | TemplateDefinition;
  scope: 'layout' | 'template' | 'page';
  content: Readonly<{
    settings?: Readonly<Record<string, unknown>>;
    settingBindings?: Readonly<Record<string, string>>;
    messages?: Readonly<Record<string, string>>;
    slots?: Readonly<Record<string, readonly SectionDataInput[]>>;
  }>;
  loadSection: (key: string) => Promise<SectionDefinition | undefined>;
}>): Promise<void> {
  const settings = input.content.settings ?? {};
  const messages = input.content.messages ?? {};
  if (!validatePresentationDefinition(input.definition, settings, messages, false)) {
    throw new Error(`Invalid Datas presentation settings or messages: ${input.owner}`);
  }
  validateSettingBindings(input.definition.settings, input.content.settingBindings);

  const slots = input.content.slots ?? {};
  const definitions = new Map(input.definition.slots.filter((slot) => slot.scope === input.scope).map((slot) => [slot.key, slot]));
  for (const key of Object.keys(slots)) if (!definitions.has(key)) throw new Error(`Unknown Datas slot: ${input.owner}.${key}`);
  for (const definition of definitions.values()) validateSlotSize(input.owner, definition, slots[definition.key] ?? []);

  const sectionIds = new Set<string>();
  for (const [slotKey, sections] of Object.entries(slots)) {
    const slot = definitions.get(slotKey)!;
    for (const section of sections) {
      if (!section.id || sectionIds.has(section.id)) throw new Error(`Duplicate Datas section id: ${input.owner}.${section.id}`);
      sectionIds.add(section.id);
      const definition = await input.loadSection(section.key);
      if (!definition) throw new Error(`Unknown Datas section: ${input.owner}.${section.key}`);
      if (!definition.groups.some((group) => slot.groups.includes(group))) throw new Error(`Datas section is not allowed in slot: ${input.owner}.${slotKey}.${section.key}`);
      if (!validatePresentationDefinition(definition, section.settings, section.messages, false)) throw new Error(`Invalid Datas section settings or messages: ${input.owner}.${section.id}`);
      validateSettingBindings(definition.settings, section.settingBindings);
    }
  }
}

function validateSlotSize(owner: string, definition: SlotDefinition, sections: readonly SectionDataInput[]) {
  if (definition.min !== undefined && sections.length < definition.min) throw new Error(`Datas slot requires at least ${definition.min} sections: ${owner}.${definition.key}`);
  if (definition.max !== undefined && sections.length > definition.max) throw new Error(`Datas slot allows at most ${definition.max} sections: ${owner}.${definition.key}`);
}

function validateMessages(expected: Readonly<Record<string, unknown>>, actual: Readonly<Record<string, unknown>>, complete: boolean) {
  return (!complete || Object.keys(expected).every((key) => Object.hasOwn(actual, key)))
    && Object.keys(actual).every((key) => Object.hasOwn(expected, key))
    && Object.values(actual).every((value) => typeof value === 'string');
}

function validateSettings(fields: readonly SettingDefinition[], settings: Readonly<Record<string, unknown>>, allowed = new Set<string>(), complete = true) {
  const definitions = new Map(fields.map((field) => [field.id, field]));
  return [...definitions.values()].every((field) => !complete || !field.required || Object.hasOwn(settings, field.id))
    && Object.entries(settings).every(([id, value]) => allowed.has(id) || (definitions.has(id) && validateSettingValue(definitions.get(id)!, value, [], settings)));
}
