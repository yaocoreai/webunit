import { defaultViewportMinWidth, parseSeoTemplateExpression } from "@/platform/manifest";
import {
  validateValueTypeNode,
  type BuiltInValueTypeName,
  type TableColumns,
  type ValueTypeNode,
  type ValueTypePresentation,
} from "./value-types";
import {
  isSpacingBoxValue,
  isSpacingBoxValueInRange,
  type SpacingBoxValue,
} from "@/platform/schema/spacing";
import type { CmsEditorDocument } from "./editor-document";

export {
  builtInValueTypeNames,
  isValueTypeName,
  resolveTableColumns,
  validateTableValue,
  validateValueTypeNode,
  validateValueTypeValue,
} from "./value-types";
export {
  emptySpacingBoxValue,
  formatSpacingLength,
  isSpacingBoxValue,
  isSpacingBoxValueInRange,
  isSpacingLength,
  isSpacingLengthInRange,
  normalizeSpacingBoxValue,
  parseSpacingLength,
  spacingLengthUnits,
  toCssBox,
} from "@/platform/schema/spacing";
export type {
  ParseSpacingLengthResult,
  SpacingBoxSide,
  SpacingBoxValue,
  SpacingCssProperty,
  SpacingLengthUnit,
} from "@/platform/schema/spacing";
export type {
  BuiltInValueTypeName,
  TableColumnDefinition,
  TableColumns,
  ValueTypeFieldDefinition,
  ValueTypeName,
  ValueTypeNode,
  ThemePropertyPresentation,
  ValueTypeOption,
  ValueTypePresentation,
} from "./value-types";

export function isSlotAvailableAtWidth<T extends object>(
  slot: T,
  width: number,
) {
  const availability = (
    slot as {
      readonly availableWhen?: Readonly<{
        minWidth?: number;
        maxWidth?: number;
      }>;
    }
  ).availableWhen;
  return (
    (availability?.minWidth === undefined || width >= availability.minWidth) &&
    (availability?.maxWidth === undefined || width <= availability.maxWidth)
  );
}

export type Status = "active" | "inactive";

export type MetaReferenceValue = Readonly<{ id: string }>;
export type MetaLinkValue =
  | Readonly<{
      type: "path";
      title: string;
      target: "_self" | "_blank";
      href: string;
    }>
  | Readonly<{
      type: "module";
      reference: string;
      id: string;
      title: string;
      target: "_self" | "_blank";
    }>;
export type MetaPriceStoredValue = Readonly<{
  amountMinor: number;
}>;
export type MetaPriceValue = Readonly<{
  amountMinor: number;
  currency: string;
}>;
export type MetaHeadingValue = Readonly<{
  level: 1 | 2 | 3 | 4 | 5 | 6;
  value: string;
}>;
export type MetaRichNode = Readonly<{
  id: string;
  type: string;
  text?: string;
  children?: readonly MetaRichNode[];
}>;
export type MetaTreeNode = Readonly<{
  id: string;
  children: readonly MetaTreeNode[];
}>;
export type { CmsEditorDocument, CmsEditorReference } from "./editor-document";
export type CmsHtmlDocument = CmsEditorDocument<string>;
export type MetaPropertyValueByType = Readonly<{
  text: string;
  textarea: string;
  html: CmsHtmlDocument;
  heading: MetaHeadingValue;
  rich: CmsEditorDocument<readonly MetaRichNode[]>;
  code: CodeValue;
  number: number;
  switch: boolean;
  date: string;
  time: string;
  datetime: string;
  color: string;
  json: unknown;
  link: MetaLinkValue;
  links: readonly MetaLinkValue[];
  file: MetaReferenceValue;
  image: MetaReferenceValue;
  audio: MetaReferenceValue;
  video: MetaReferenceValue;
  files: readonly MetaReferenceValue[];
  images: readonly MetaReferenceValue[];
  audios: readonly MetaReferenceValue[];
  videos: readonly MetaReferenceValue[];
  module: MetaReferenceValue;
  modules: readonly MetaReferenceValue[];
  menu: MetaReferenceValue;
  menus: readonly MetaReferenceValue[];
  form: MetaReferenceValue;
  forms: readonly MetaReferenceValue[];
  object: Readonly<Record<string, SettingJsonValue>>;
  array: readonly SettingJsonValue[];
  tree: readonly MetaTreeNode[];
  table: readonly (readonly string[])[];
  select: string | number;
  price: MetaPriceValue;
  spacing: SpacingBoxValue;
}>;
type _MissingMetaPropertyTypes = Exclude<
  BuiltInValueTypeName,
  keyof MetaPropertyValueByType
>;
type _ExtraMetaPropertyTypes = Exclude<
  keyof MetaPropertyValueByType,
  BuiltInValueTypeName
>;
type _MetaPropertyCatalogAligned = [
  _MissingMetaPropertyTypes,
  _ExtraMetaPropertyTypes,
] extends [never, never]
  ? true
  : never;
const _metaPropertyCatalogAligned: _MetaPropertyCatalogAligned = true;
void _metaPropertyCatalogAligned;

export type SettingJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly SettingJsonValue[]
  | Readonly<{ [key: string]: SettingJsonValue }>;
export type CmsRichTextDocument = CmsEditorDocument<
  readonly SettingJsonValue[]
>;
export type SettingCondition =
  | Readonly<{
      field: string;
      operator: "eq" | "neq";
      value: string | number | boolean;
    }>
  | Readonly<{
      field: string;
      operator: "in" | "notIn";
      value: readonly (string | number | boolean)[];
    }>
  | Readonly<{ field: string; operator: "truthy" | "falsy" }>;
export type SettingVisibility =
  | Readonly<{ all: readonly SettingCondition[] }>
  | Readonly<{ any: readonly SettingCondition[] }>;

type SettingBase<TType extends string, TDefault> = Readonly<{
  type: TType;
  id: string;
  label: string;
  description?: string;
  required?: boolean;
  default: TDefault;
  visibleWhen?: SettingVisibility;
}>;

export type TextSetting = SettingBase<"text" | "textarea", string> &
  Readonly<{
    locale?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  }>;
export type HeadingSetting = SettingBase<"heading", MetaHeadingValue> &
  Readonly<{ locale?: boolean }>;
export type RichTextSetting = SettingBase<"rich", CmsRichTextDocument> &
  Readonly<{ locale?: boolean }>;
export type HtmlSetting = SettingBase<"html", CmsHtmlDocument> &
  Readonly<{ locale?: boolean }>;
export const codeLanguages = [
  "plaintext",
  "html",
  "css",
  "javascript",
  "jsx",
  "typescript",
  "tsx",
  "json",
  "markdown",
] as const;
export type CodeLanguage = (typeof codeLanguages)[number];
export type CodeValue = Readonly<{ language: CodeLanguage; content: string }>;
export type CodeSetting = SettingBase<"code", CodeValue> &
  Readonly<{ locale?: boolean; languages?: readonly CodeLanguage[] }>;
export type NumberSetting = SettingBase<"number", number> &
  Readonly<{ min?: number; max?: number; step?: number }>;
export type SpacingSetting = SettingBase<"spacing", SpacingBoxValue> &
  Readonly<{ allowNegative?: boolean; min?: number; max?: number; step?: number }>;
export type SwitchSetting = SettingBase<"switch", boolean>;
export type SelectSetting = SettingBase<"select", string | number> &
  Readonly<{
    options: readonly Readonly<{ label: string; value: string | number }>[];
  }>;
export type ColorSetting = SettingBase<"color", string>;
export type DateSetting = SettingBase<"date", string | null>;
export type TimeSetting = SettingBase<"time", string | null>;
export type DateTimeSetting = SettingBase<"datetime", string | null>;
export type JsonSetting = SettingBase<"json", SettingJsonValue>;
export type PriceSetting = SettingBase<"price", MetaPriceStoredValue>;
export type ObjectSetting = SettingBase<
  "object",
  Readonly<Record<string, SettingJsonValue>>
> &
  Readonly<{ fields: readonly SettingDefinition[] }>;
export type TreeSetting = SettingBase<
  "tree",
  readonly Readonly<Record<string, SettingJsonValue>>[]
> &
  Readonly<{
    fields: readonly SettingDefinition[];
    maxDepth?: number;
    minItems?: number;
    maxItems?: number;
  }>;
export type ArraySetting = SettingBase<
  "array",
  readonly Readonly<{ id: string; [key: string]: SettingJsonValue }>[]
> &
  Readonly<{
    items: Readonly<{
      type: "object";
      fields: readonly SettingDefinition[];
    }>;
    minItems?: number;
    maxItems?: number;
    presentation?: ValueTypePresentation;
  }>;
export type TableSetting = SettingBase<
  "table",
  readonly (readonly string[])[]
> &
  Readonly<{
    columns?: TableColumns;
    columnForm?: string;
    minItems?: number;
    maxItems?: number;
  }>;
export type ResourceSetting = SettingBase<
  "file" | "image" | "audio" | "video" | "menu" | "form",
  null
>;
export type ResourceListSetting = SettingBase<
  "files" | "images" | "audios" | "videos" | "menus" | "forms",
  readonly []
> &
  Readonly<{ minItems?: number; maxItems?: number }>;
export type LinkSetting = SettingBase<"link", null>;
export type LinksSetting = SettingBase<"links", readonly []> &
  Readonly<{ minItems?: number; maxItems?: number }>;
export type ModuleSetting = SettingBase<"module", null> &
  Readonly<{ reference: string }>;
export type ModulesSetting = SettingBase<"modules", readonly []> &
  Readonly<{ reference: string; minItems?: number; maxItems?: number }>;
export type SettingDefinition =
  | TextSetting
  | HeadingSetting
  | RichTextSetting
  | HtmlSetting
  | CodeSetting
  | NumberSetting
  | SpacingSetting
  | SwitchSetting
  | SelectSetting
  | ColorSetting
  | DateSetting
  | TimeSetting
  | DateTimeSetting
  | JsonSetting
  | PriceSetting
  | ObjectSetting
  | ArraySetting
  | TreeSetting
  | TableSetting
  | ResourceSetting
  | ResourceListSetting
  | LinkSetting
  | LinksSetting
  | ModuleSetting
  | ModulesSetting;
export type SettingBindings = Readonly<Record<string, string>>;

export type LayoutDefinition = Readonly<{
  type: "layout";
  label: string;
  settings: readonly SettingDefinition[];
  settingBindings?: SettingBindings;
  messages: Readonly<Record<string, string>>;
  slots: readonly SlotDefinition[];
}>;

export type SlotDefinition = Readonly<{
  key: string;
  label: string;
  scope: "layout" | "template" | "page";
  groups: readonly string[];
  min?: number;
  max?: number;
  availableWhen?: Readonly<{ minWidth?: number; maxWidth?: number }>;
}>;

export type TemplateDefinition = Readonly<{
  type: "template";
  key: string;
  label: string;
  frame?: string;
  settings: readonly SettingDefinition[];
  settingBindings?: SettingBindings;
  messages: Readonly<Record<string, string>>;
  slots: readonly SlotDefinition[];
}>;

export type SectionDefinition = Readonly<{
  type: "section";
  key: string;
  label: string;
  groups: readonly string[];
  settings: readonly SettingDefinition[];
  settingBindings?: SettingBindings;
  messages: Readonly<Record<string, string>>;
}>;

export const defineSlot = <const T extends SlotDefinition>(
  definition: T,
): T => {
  validateSlotDefinitions([definition]);
  return definition;
};
type LayoutDefinitionInput = Omit<LayoutDefinition, "type">;
type TemplateDefinitionInput = Omit<TemplateDefinition, "type" | "key">;
type SectionDefinitionInput = Omit<SectionDefinition, "type" | "key">;

const collectionSettingTypes = new Set([
  "array",
  "table",
  "files",
  "images",
  "audios",
  "videos",
  "menus",
  "forms",
  "links",
  "modules",
]);

function validateSettingDefinitions(
  settings: readonly SettingDefinition[],
  path = "settings",
) {
  const ids = new Set<string>();
  for (const setting of settings) {
    const settingPath = `${path}.${setting.id}`;
    if (ids.has(setting.id))
      throw new Error(`Duplicate setting id: ${settingPath}`);
    ids.add(setting.id);
    if (
      setting.type === "heading" &&
      (!Number.isInteger(setting.default.level) ||
        setting.default.level < 1 ||
        setting.default.level > 6)
    )
      throw new Error(`Invalid heading setting level: ${settingPath}`);
    if (setting.type === "spacing") {
      const allowNegative = setting.allowNegative === true;
      if (!isSpacingBoxValue(setting.default, { allowNegative }))
        throw new Error(`Invalid spacing setting default: ${settingPath}`);
      if (
        (setting.min !== undefined || setting.max !== undefined) &&
        !isSpacingBoxValueInRange(setting.default, {
          min: setting.min,
          max: setting.max,
        })
      )
        throw new Error(`Spacing setting default out of range: ${settingPath}`);
    }
    if (collectionSettingTypes.has(setting.type)) {
      const { minItems, maxItems } = setting as Readonly<{
        minItems?: number;
        maxItems?: number;
      }>;
      if (
        minItems !== undefined &&
        (!Number.isSafeInteger(minItems) || minItems < 0)
      )
        throw new Error(`Invalid setting minItems: ${settingPath}`);
      if (
        maxItems !== undefined &&
        (!Number.isSafeInteger(maxItems) || maxItems < 0)
      )
        throw new Error(`Invalid setting maxItems: ${settingPath}`);
      if (
        minItems !== undefined &&
        maxItems !== undefined &&
        minItems > maxItems
      )
        throw new Error(`Setting minItems exceeds maxItems: ${settingPath}`);
      if (
        Array.isArray(setting.default) &&
        ((minItems !== undefined && setting.default.length < minItems) ||
          (maxItems !== undefined && setting.default.length > maxItems))
      )
        throw new Error(`Setting default violates item limits: ${settingPath}`);
    }
    if (setting.type === "object")
      validateSettingDefinitions(setting.fields, `${settingPath}.fields`);
    if (setting.type === "array") {
      if (setting.items.type !== "object")
        throw new Error(`Setting array items must be objects: ${settingPath}`);
      validateSettingDefinitions(setting.items.fields, `${settingPath}.items.fields`);
      if (setting.presentation?.stableId !== false) {
        const id = setting.items.fields.find((field) => field.id === "id");
        if (id && id.type !== "text")
          throw new Error(`Setting array id must be text: ${settingPath}`);
      }
    }
    if (setting.type === "tree") {
      if (setting.fields.some((field) => field.id === "id" || field.id === "children"))
        throw new Error(`Tree setting field id is reserved: ${settingPath}`);
      if (setting.maxDepth !== undefined && (!Number.isInteger(setting.maxDepth) || setting.maxDepth < 1 || setting.maxDepth > 10))
        throw new Error(`Invalid tree maxDepth: ${settingPath}`);
      validateSettingDefinitions(setting.fields, `${settingPath}.fields`);
    }
    if (setting.type === "table")
      validateValueTypeNode(setting, settingPath);
    if (setting.type === "module" || setting.type === "modules") {
      if (!("reference" in setting) || !String(setting.reference ?? "").trim())
        throw new Error(`Module setting requires reference: ${settingPath}`);
    }
  }
}

function validateSlotDefinitions(slots: readonly SlotDefinition[]) {
  const keys = new Set<string>();
  for (const slot of slots) {
    if (keys.has(slot.key)) throw new Error(`Duplicate slot key: ${slot.key}`);
    keys.add(slot.key);
    const range = slot.availableWhen;
    if (!range) continue;
    if (
      range.minWidth !== undefined &&
      (!Number.isSafeInteger(range.minWidth) ||
        range.minWidth < defaultViewportMinWidth)
    )
      throw new Error(`Invalid slot minWidth: ${slot.key}`);
    if (
      range.maxWidth !== undefined &&
      (!Number.isSafeInteger(range.maxWidth) ||
        range.maxWidth < defaultViewportMinWidth)
    )
      throw new Error(`Invalid slot maxWidth: ${slot.key}`);
    if (
      range.minWidth !== undefined &&
      range.maxWidth !== undefined &&
      range.minWidth > range.maxWidth
    )
      throw new Error(`Slot minWidth exceeds maxWidth: ${slot.key}`);
  }
}

export function validateSettingBindings(
  settings: readonly SettingDefinition[],
  bindings: SettingBindings | undefined,
) {
  if (!bindings) return;
  for (const [target, expression] of Object.entries(bindings)) {
    if (!findSettingBindingTarget(settings, target))
      throw new Error(`Unknown setting binding target: ${target}`);
    if (typeof expression !== "string")
      throw new Error(`Invalid setting binding expression: ${target}`);
    const matches = [...expression.matchAll(/{{\s*([^{}]+?)\s*}}/g)];
    if (matches.length !== 1 || matches[0]![0].length !== expression.length)
      throw new Error(
        `Setting binding must contain one complete template expression: ${target}`,
      );
    const parsed = parseSeoTemplateExpression(matches[0]![1]!);
    if (!parsed.filters.some((filter) => filter.name === "default" && filter.arguments.includes("setting.value")))
      throw new Error(`Setting binding requires an explicit setting.value fallback: ${target}`);
  }
}

export function findSettingBindingTarget(
  settings: readonly SettingDefinition[],
  target: string,
): SettingDefinition | ValueTypeNode | undefined {
  const parts = target.split(".");
  const rootId = parts.shift();
  let definition: SettingDefinition | ValueTypeNode | undefined = settings.find((setting) => setting.id === rootId);
  while (definition && parts.length > 0) {
    if (definition.type === "object") {
      const fieldId = parts.shift();
      definition = definition.fields?.find((field) => ("id" in field ? field.id : field.key) === fieldId);
    } else if (definition.type === "array") {
      const items = definition.items;
      if (!items || items.type !== "object") return undefined;
      const stable = "id" in definition || definition.presentation?.stableId === true;
      if (!stable) return undefined; // Ordinary arrays can only be bound as a whole.
      parts.shift(); // Stable array item id.
      const fieldId = parts.shift();
      definition = items.fields?.find((field) => ("id" in field ? field.id : field.key) === fieldId);
    } else return undefined;
  }
  return parts.length === 0 ? definition : undefined;
}

export const defineLayout = <const T extends LayoutDefinitionInput>(
  definition: T,
): T & Readonly<{ type: "layout" }> => {
  validateSettingDefinitions(definition.settings);
  validateSettingBindings(definition.settings, definition.settingBindings);
  validateSlotDefinitions(definition.slots);
  return { ...definition, type: "layout" };
};
export const defineTemplate = <const T extends TemplateDefinitionInput>(
  definition: T,
): T & Readonly<{ type: "template" }> => {
  validateSettingDefinitions(definition.settings);
  validateSettingBindings(definition.settings, definition.settingBindings);
  validateSlotDefinitions(definition.slots);
  return { ...definition, type: "template" };
};
export const defineSection = <const T extends SectionDefinitionInput>(
  definition: T,
): T & Readonly<{ type: "section" }> => {
  validateSettingDefinitions(definition.settings);
  validateSettingBindings(definition.settings, definition.settingBindings);
  return { ...definition, type: "section" };
};
