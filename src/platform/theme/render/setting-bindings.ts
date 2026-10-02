import { findSettingBindingTarget, type LayoutDefinition, type SectionDefinition, type SettingBindings, type TemplateDefinition } from '@/platform/theme/define';
import { parseSeoTemplateExpression, resolveTemplateExpressionValue, TemplateSyntaxError } from '@/platform/manifest';
import { layoutSetting } from '@/platform/generated/theme/definition';
import { sectionSettings, templateSettings } from '@/platform/generated/theme/setting-runtime';
import type { ErrorRenderPayload, LayoutInstance, RenderPayload, SectionInstance, TemplateInstance } from '@/platform/theme/render/model';
import { asRecord } from '@/platform/theme/render/value';
import { validateSettingValue } from '@/platform/theme/render/setting-value';

type AnyPayload = RenderPayload | ErrorRenderPayload;
type PresentationDefinition = LayoutDefinition | TemplateDefinition | SectionDefinition;

export async function resolveRenderPayloadSettingBindings<TPayload extends AnyPayload>(payload: TPayload, rawPayload: unknown): Promise<TPayload> {
  const raw = asRecord(rawPayload) ?? {};
  const rawLayout = readContent(raw.layout);
  const rawTemplate = readContent(raw.template);
  const rawSections = collectRawSections([rawLayout, rawTemplate, readContent(raw.page)]);
  const sectionKeys = new Set<string>();
  for (const slots of [payload.layout.slots, payload.template.slots, ...('page' in payload ? [payload.page.slots] : [])]) {
    for (const sections of Object.values(slots)) for (const section of sections) sectionKeys.add(section.key);
  }
  const [layoutModule, templateModule, sectionEntries] = await Promise.all([
    layoutSetting(),
    loadTemplate(payload.template.templateKey),
    Promise.all([...sectionKeys].map(async (key) => [key, await loadSection(key)] as const)),
  ]);
  const sectionDefinitions = new Map(sectionEntries);
  const origin = `https://${payload.domain.host}`;
  const context = payload as unknown as Record<string, unknown>;
  const resolveSections = (slots: Record<string, SectionInstance[]>) => Object.fromEntries(Object.entries(slots).map(([slot, sections]) => [slot, sections.map((section) => {
    const definition = sectionDefinitions.get(section.key);
    if (!definition) throw new TypeError(`Unknown setting binding Section definition: ${section.key}`);
    return { ...section, settings: resolveSettingBindings(section.settings, definition, readBindings(rawSections.get(section.id)), context, origin, `section.${section.id}`) };
  })]));
  const layout: LayoutInstance = {
    ...payload.layout,
    settings: resolveSettingBindings(payload.layout.settings, layoutModule.default, readBindings(rawLayout), context, origin, 'layout'),
    slots: resolveSections(payload.layout.slots),
  };
  const template: TemplateInstance = {
    ...payload.template,
    settings: resolveSettingBindings(payload.template.settings, templateModule.default, readBindings(rawTemplate), context, origin, `template.${payload.template.instanceKey}`),
    slots: resolveSections(payload.template.slots),
  };
  return {
    ...payload,
    layout,
    template,
    ...('page' in payload ? { page: { ...payload.page, slots: resolveSections(payload.page.slots) } } : {}),
  } as TPayload;
}

export async function resolveSectionSettingBindings(payload: RenderPayload, section: SectionInstance, rawSection: unknown): Promise<SectionInstance> {
  const definition = await loadSection(section.key);
  return {
    ...section,
    settings: resolveSettingBindings(
      section.settings,
      definition,
      readBindings(asRecord(rawSection)),
      payload as unknown as Record<string, unknown>,
      `https://${payload.domain.host}`,
      `section.${section.id}`,
    ),
  };
}

export function resolveSettingBindings(
  settings: Readonly<Record<string, unknown>>,
  definition: PresentationDefinition,
  instanceBindings: SettingBindings,
  context: Record<string, unknown>,
  origin: string,
  owner: string,
) {
  const output = cloneRecord(settings);
  const bindings = { ...(definition.settingBindings ?? {}), ...instanceBindings };
  for (const [target, expression] of Object.entries(bindings)) {
    const settingDefinition = findSettingBindingTarget(definition.settings, target);
    if (!settingDefinition) throw new TypeError(`Unknown setting binding target: ${owner}.${target}`);
    const resolvedTarget = walkTarget(output, target, owner);
    const current = resolvedTarget.value;
    let value: unknown;
    try {
      validateInstanceBindingExpression(expression, owner, target);
      value = resolveTemplateExpressionValue(expression, { ...context, setting: { value: current } }, origin);
    } catch (error) {
      if (error instanceof TemplateSyntaxError) continue;
      throw error;
    }
    if (!validateSettingValue(settingDefinition, value, [], resolvedTarget.parent)) throw new TypeError(`Invalid setting binding value: ${owner}.${target}`);
    writeTargetValue(output, target, value, owner);
  }
  return output;
}

function validateInstanceBindingExpression(expression: string, owner: string, target: string) {
  const match = expression.match(/^\{\{\s*([^{}]+?)\s*\}\}$/);
  if (!match) throw new TypeError(`Invalid setting binding expression: ${owner}.${target}`);
  const parsed = parseSeoTemplateExpression(match[1]!);
  if (!parsed.filters.some((filter) => filter.name === 'default' && filter.arguments.includes('setting.value')))
    throw new TypeError(`Setting binding requires an explicit setting.value fallback: ${owner}.${target}`);
}

function readContent(value: unknown) {
  const record = asRecord(value) ?? {};
  return asRecord(record.contentJson) ?? record;
}

function readBindings(content: Record<string, unknown> | undefined): SettingBindings {
  if (!content?.settingBindings) return {};
  const bindings = asRecord(content.settingBindings);
  if (!bindings || Object.values(bindings).some((expression) => typeof expression !== 'string')) throw new TypeError('Invalid settingBindings content');
  return bindings as Record<string, string>;
}

function collectRawSections(contents: readonly Record<string, unknown>[]) {
  const sections = new Map<string, Record<string, unknown>>();
  for (const content of contents) {
    const slots = asRecord(content.slots) ?? {};
    for (const values of Object.values(slots)) {
      if (!Array.isArray(values)) continue;
      for (const value of values) {
        const section = asRecord(value);
        if (section && typeof section.id === 'string') sections.set(section.id, section);
      }
    }
  }
  return sections;
}

async function loadTemplate(key: string) {
  const loader = templateSettings[key as keyof typeof templateSettings];
  if (!loader) throw new TypeError(`Unknown setting binding Template definition: ${key}`);
  return loader();
}

async function loadSection(key: string) {
  const loader = sectionSettings[key as keyof typeof sectionSettings];
  if (!loader) throw new TypeError(`Unknown setting binding Section definition: ${key}`);
  return (await loader()).default;
}

function writeTargetValue(settings: Record<string, unknown>, target: string, value: unknown, owner: string) {
  const resolved = walkTarget(settings, target, owner);
  resolved.parent[resolved.key] = value;
}

function walkTarget(settings: Record<string, unknown>, target: string, owner: string): { parent: Record<string, unknown>; key: string; value: unknown } {
  const parts = target.split('.');
  const key = parts.pop();
  if (!key) throw new TypeError(`Invalid setting binding target: ${owner}.${target}`);
  let current: unknown = settings;
  for (const part of parts) {
    if (Array.isArray(current)) current = current.find((item) => asRecord(item)?.id === part);
    else current = asRecord(current)?.[part];
    if (current === undefined) throw new TypeError(`Missing setting binding target: ${owner}.${target}`);
  }
  const parent = asRecord(current);
  if (!parent || !Object.hasOwn(parent, key)) throw new TypeError(`Missing setting binding target: ${owner}.${target}`);
  return { parent, key, value: parent[key] };
}

function cloneRecord(value: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
}

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneValue);
  const record = asRecord(value);
  return record ? cloneRecord(record) : value;
}
