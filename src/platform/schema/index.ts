import {
  ArraySchema,
  NumberSchema,
  ObjectSchema,
  RecordSchema,
  StringSchema,
  TupleSchema,
  bigintSchema,
  booleanSchema,
  check,
  coerceNumber,
  discriminatedUnionSchema,
  enumSchema,
  lazySchema,
  jsonSchema,
  literalSchema,
  neverSchema,
  normalizer,
  nullSchema,
  transform,
  unionSchema,
  unknownSchema,
} from "./schema";

export const s = Object.freeze({
  string: () => new StringSchema(),
  number: () => new NumberSchema("number"),
  integer: () => new NumberSchema("integer"),
  boolean: () => booleanSchema(),
  bigint: () => bigintSchema(),
  null: () => nullSchema(),
  unknown: () => unknownSchema(),
  json: () => jsonSchema(),
  never: () => neverSchema(),
  literal: literalSchema,
  enum: enumSchema,
  array: <const TItem extends import("./types").AnySchema>(item: TItem) =>
    new ArraySchema(item),
  tuple: <const TItems extends readonly import("./types").AnySchema[]>(items: TItems) =>
    new TupleSchema(items),
  object: <const TShape extends import("./types").Shape>(shape: TShape) =>
    new ObjectSchema(shape),
  record: <
    const TKey extends import("./types").AnySchema,
    const TValue extends import("./types").AnySchema,
  >(key: TKey, value: TValue) => new RecordSchema(key, value),
  union: unionSchema,
  exclusiveUnion: <const TOptions extends readonly import("./types").AnySchema[]>(options: TOptions) =>
    unionSchema(options, true),
  discriminatedUnion: discriminatedUnionSchema,
  lazy: lazySchema,
  normalizer,
  check,
  transform,
  coerce: Object.freeze({
    number: () => coerceNumber("number"),
    integer: () => coerceNumber("integer"),
    boolean: () => booleanSchema(true),
  }),
});

export type {
  AnySchema,
  Check,
  CheckContext,
  CheckFunction,
  Infer,
  InferInput,
  JsonValue,
  Normalizer,
  ObjectInput,
  ObjectOutput,
  RuntimeExtensionDescription,
  Schema,
  SchemaPortability,
  Shape,
  Transform,
} from "./types";
export type {
  ParseOptions,
  ParseResult,
  ValidationIssue,
  ValidationIssueCode,
  ValidationIssueInput,
  ValidationIssueParameter,
  ValidationPathSegment,
} from "./issues";
export { SchemaParseError, validationIssueCodes } from "./issues";
export { compileSchema } from "./runtime/compile";
export { toJsonSchema } from "./json-schema/export";
export type { JsonSchema, JsonSchemaExport } from "./json-schema/types";
export {
  builtInValueTypeNames,
  defaultTreeMaxDepth,
  isValueTypeName,
  resolveTableColumns,
  validateTableValue,
  validateTreeValue,
  validateValueTypeNode,
  validateValueTypeValue,
} from "./value-types";
export type {
  BuiltInValueTypeName,
  TableColumnDefinition,
  TableColumns,
  ValueTypeFieldDefinition,
  ValueTypeName,
  ValueTypeNode,
  ValueTypeOption,
  ValueTypePresentation,
  ThemePropertyPresentation,
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
} from "./spacing";
export type {
  ParseSpacingLengthResult,
  SpacingBoxSide,
  SpacingBoxValue,
  SpacingCssProperty,
  SpacingLengthUnit,
} from "./spacing";
export {
  extractCmsContentText,
  extractCmsFilterText,
  flattenCmsFilterField,
  isCmsFlattenFilterType,
  normalizeCmsQueryText,
} from "./cms-filter-text";
export { isCmsColorCss, normalizeCmsColorCss } from "./cms-color";
export {
  cmsAssetReferenceValues,
  formatAssetReference,
  formatModuleReference,
  isCmsAssetRef,
  isCmsFormRef,
  isCmsMenuRef,
  isCmsModuleRef,
  isCmsResourceRef,
  parseCmsReference,
} from "./cms-resource-ref";
export type {
  CmsAssetReference,
  CmsAssetType,
  CmsResourceRef,
  ParsedCmsReference,
} from "./cms-resource-ref";
export {
  cmsRouteSegmentPattern,
  joinCmsRoutePath,
  normalizeCmsRouteKey,
  normalizeCmsRoutePrefix,
} from "./cms-route";
export {
  emptyHtmlDocument,
  emptyRichTextDocument,
  isCmsEditorDocument,
  isCmsEditorReference,
  isHtmlEditorDocument,
  isRichTextEditorDocument,
  isCmsLinkStored,
} from "./cms-editor-document";
export {
  decodeEditorDocument,
  editorResourceView,
  encodeEditorDocument,
  isEncodableEditorDocument,
  usedHtmlReferenceKeys,
  usedRichTextReferenceKeys,
} from "./editor-document-codec";
export type { EditorResolvedReference } from "./editor-document-codec";
export type {
  CmsEditorDocument,
  CmsEditorLinkReference,
  CmsEditorReference,
  CmsEditorResourceReference,
  CmsLinkStored,
} from "./cms-editor-document";
