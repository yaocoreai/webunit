import type { ModuleEntry, PublicContentApi, ResourceAccessor } from '@/platform/theme/content/public';
import type { ReadModel } from '@/platform/theme/content/model';
import { bindRuntime } from '@/platform/theme/render/runtime';
import { bindRenderRuntime } from '@/platform/theme/render/context';
import type { RenderContext } from '@/platform/theme/render/context';
import { ResponseDependencyCollector } from '@/platform/runtime/response-dependencies';
import { createRequestSignalsResolver } from '@/platform/runtime/request-signals';
import type { PublicJson, RenderPayload, SectionInstance } from '@/platform/theme/render/model';
import { adaptRenderPayload } from '@/platform/theme/source/site-client';
import { isSafePreviewValue } from './value';
import type { PreviewRequest, PreviewTarget } from './target';
import { asRecord, readString } from '@/platform/theme/render/value';
import { validatePresentationDefinition } from '@/platform/theme/validation/presentation';
import type { ServerEnvironment } from '@/platform/runtime/server-environment';
import { BodyTooLargeError, readBoundedBody } from '@/platform/http/read-body';
import { hasMediaType } from '@/platform/http/media-type';
import { createMemoryCache } from '@/platform/cache/memory';
import { adaptRefs, materialize } from '@/platform/theme/source/site-adapter-values';

const maxJsonLength = 256_000;
const maxFormLength = 1_000_000;
let settingBindings: Promise<typeof import('@/platform/theme/render/setting-bindings')> | undefined;
const loadSettingBindings = () => settingBindings ??= import('@/platform/theme/render/setting-bindings');
let themeSettings: Promise<typeof import('@/platform/generated/theme/setting-runtime')> | undefined;
let siteManifests: Promise<typeof import('@/platform/generated/theme/definition')> | undefined;
const loadThemeSettings = () => themeSettings ??= import('@/platform/generated/theme/setting-runtime');
const loadSiteManifests = () => siteManifests ??= import('@/platform/generated/theme/definition');
const translate = (messages: Record<string, string>) => (key: string) => Object.hasOwn(messages, key) ? messages[key] : key;
const emptyModel = <TEntry extends ModuleEntry>(): ReadModel<TEntry> => ({
  findOne: async () => null,
  findFirst: async () => null,
  findMany: async () => ({ items: [], pageInfo: { hasNextPage: false } }),
  count: async () => 0,
  aggregate: async (input) => {
    const result: Record<string, unknown> = input.count ? { count: 0 } : {};
    for (const operation of ['sum', 'avg', 'min', 'max'] as const) {
      const fields = input[operation];
      if (fields?.length) result[operation] = Object.fromEntries(fields.map((field) => [field, null]));
    }
    return result;
  },
});
const emptyResource = <T>(): ResourceAccessor<T> => (async (keys: string | readonly string[]) => {
  return typeof keys === 'string' ? null : keys.map(() => null);
}) as ResourceAccessor<T>;

const previewApi: PublicContentApi = {
  asset: emptyResource(),
  menu: emptyResource(),
  module: emptyModel,
};
export type PreparedPreview = Readonly<{
  payload: RenderPayload;
  context: Extract<RenderContext, { environment: 'editor-preview' }>;
  revision: number;
  section?: SectionInstance;
}>;

export function bindPreviewRuntime(locals: App.Locals, request: Request, prepared: PreparedPreview, environment: ServerEnvironment) {
  const { payload, context } = prepared;
  const web = {
    domainHost: payload.domain.host,
    locale: payload.locale,
    content: previewApi,
    cache: createMemoryCache(),
  } as const;
  const responseDependencies = new ResponseDependencyCollector();
  responseDependencies.add({ mode: 'no-store', visibility: 'preview', surrogateKeys: ['preview:artifact'] });
  bindRuntime(locals, web);
  bindRenderRuntime(locals, {
    request: {
      requestId: crypto.randomUUID(),
      signal: request.signal,
      responseDependencies,
      signals: createRequestSignalsResolver(request, 'node'),
      environment,
    },
    web,
    payload,
    context,
  });
}

export async function prepareDefaultPreview(request: PreviewRequest): Promise<PreparedPreview | undefined> {
  const { templateSettings } = await loadThemeSettings();
  if (request.target.type === 'section') {
    const section = await createDefaultSection(request.target.key, `preview-${request.target.key}`);
    if (!section) return undefined;
    const templateKey = Object.keys(templateSettings)[0];
    if (!templateKey) return undefined;
    const payload = await createSyntheticPayload('/', templateKey) as RenderPayload;
    const { resolveRenderPayloadSettingBindings, resolveSectionSettingBindings } = await loadSettingBindings();
    const resolvedPayload = await resolveRenderPayloadSettingBindings(payload, syntheticRawPayload(payload));
    const resolvedSection = await resolveSectionSettingBindings(resolvedPayload, section, { settings: section.settings });
    return { payload: resolvedPayload, section: { ...resolvedSection, settings: materialize(resolvedSection.settings, {}, resolvedPayload.site.defaultCurrency) as Record<string, unknown> }, revision: 0, context: { environment: 'editor-preview', preview: { type: 'section' } } };
  }

  if (request.presentation.content !== 'sections') return undefined;
  const payload = await createSyntheticPayload('/', request.target.key);
  return {
    payload: await (await loadSettingBindings()).resolveRenderPayloadSettingBindings(payload, syntheticRawPayload(payload)),
    revision: 0,
    context: { environment: 'editor-preview', preview: { type: 'template' } },
  };
}

export async function preparePreviewUpdate(request: Request, target: PreviewTarget): Promise<PreparedPreview | Response> {
  const message = await readNavigationMessage(request);
  if (message instanceof Response) return message;
  const messageTarget = asRecord(message.target);
  if (message.type !== 'cms.preview.update' || message.version !== 1 || !Number.isInteger(message.revision) || Number(message.revision) < 1) {
    return invalid('Invalid preview message');
  }
  if (!messageTarget || messageTarget.type !== target.type || messageTarget.key !== target.key) return invalid('Preview target mismatch');
  const revision = Number(message.revision);

  if (target.type === 'section') {
    const value = asRecord(message.value);
    let payload: RenderPayload;
    let refs: ReturnType<typeof adaptRefs>;
    try {
      payload = adaptRenderPayload(value?.renderPayload, '/_preview_.value.renderPayload');
      refs = adaptRefs(asRecord(value?.renderPayload)?.refs, '/_preview_.value.renderPayload.refs');
      payload = await (await loadSettingBindings()).resolveRenderPayloadSettingBindings(payload, value?.renderPayload);
    }
    catch { return invalid('Invalid section render payload'); }
    const section = readSection(value?.sectionContentJson);
    if (!section || section.key !== target.key || !await validateSection(section)) return invalid('Invalid section');
    let resolvedSection: SectionInstance;
    try { resolvedSection = await (await loadSettingBindings()).resolveSectionSettingBindings(payload, section, value?.sectionContentJson); }
    catch { return invalid('Invalid section bindings'); }
    return { payload, section: { ...resolvedSection, settings: materialize(resolvedSection.settings, refs, payload.site.defaultCurrency) as Record<string, unknown> }, revision, context: { environment: 'editor-preview', preview: { type: 'section' } } };
  }

  let payload: RenderPayload;
  try {
    payload = adaptRenderPayload(message.value, '/_preview_.value');
    payload = await (await loadSettingBindings()).resolveRenderPayloadSettingBindings(payload, message.value);
  }
  catch { return invalid('Invalid template'); }
  if (target.key !== payload.template.templateKey) return invalid('Invalid template');
  const presentation = asRecord(message.presentation);
  const content = readString(presentation?.content);
  const activeSection = readString(presentation?.activeSection) || undefined;
  if (content !== 'sections') return invalid('Invalid template presentation');
  const preview = { type: 'template' as const, ...(activeSection ? { activeSection } : {}) };
  return { payload, revision, context: { environment: 'editor-preview', preview } };
}

async function readNavigationMessage(request: Request): Promise<Record<string, unknown> | Response> {
  const requestOrigin = request.headers.get('origin');
  if (requestOrigin !== new URL(request.url).origin) return new Response('Forbidden', { status: 403 });
  if (!hasMediaType(request.headers, 'application/x-www-form-urlencoded')) return new Response('Unsupported media type', { status: 415 });
  let body: Uint8Array;
  try { body = await readBoundedBody(request, maxFormLength); }
  catch (error) {
    if (error instanceof BodyTooLargeError) return new Response(error.message, { status: 413 });
    throw error;
  }
  const params = new URLSearchParams(new TextDecoder().decode(body));
  if ([...params.keys()].some((key) => key !== 'preview') || params.getAll('preview').length !== 1) return invalid('Invalid preview form');
  const json = params.get('preview') ?? '';
  if (!json || json.length > maxJsonLength) return new Response('Payload too large', { status: 413 });
  let value: unknown;
  try { value = JSON.parse(json) as unknown; }
  catch { return invalid('Invalid preview JSON'); }
  if (!isSafePreviewValue(value)) return invalid('Invalid preview');
  return asRecord(value) ?? invalid('Invalid preview');
}

const invalid = (message: string) => new Response(message, { status: 422 });

function readSection(value: unknown): SectionInstance | undefined {
  const section = asRecord(value); const settings = asRecord(section?.settings); const rawMessages = asRecord(section?.messages);
  const id = readString(section?.id); const key = readString(section?.key);
  if (!id || !key || !settings || !rawMessages || !Object.values(rawMessages).every((item) => typeof item === 'string')) return undefined;
  const messages = rawMessages as Record<string, string>;
  return { id, key, settings, messages, t: translate(messages) };
}

async function validateSection(value: SectionInstance) {
  const { sectionSettings } = await loadThemeSettings();
  const loader = sectionSettings[value.key as keyof typeof sectionSettings];
  if (!loader) return false;
  return validatePresentationDefinition((await loader()).default, value.settings, value.messages);
}

async function createSyntheticPayload(path: string, templateKey: string): Promise<RenderPayload> {
  const [{ templateSettings }, { layoutSetting, siteManifest }] = await Promise.all([
    loadThemeSettings(),
    loadSiteManifests(),
  ]);
  const templateLoader = templateSettings[templateKey as keyof typeof templateSettings];
  if (!templateLoader) throw new Error(`Unknown template: ${templateKey}`);
  const [templateDefinition, layoutDefinition, theme] = await Promise.all([
    (await templateLoader()).default,
    (await layoutSetting()).default,
    siteManifest().then((module) => module.default),
  ]);
  const layoutMessages = readMessages(layoutDefinition);
  const templateMessages = readMessages(templateDefinition);
  const base = {
    site: { fields: readPropertyDefaults(theme.site.properties ?? []), defaultCurrency: 'usd' },
    domain: { host: 'preview.local' },
    locale: 'en', route: { path, query: {} },
    seo: {
      title: 'Preview', canonical: 'https://preview.local/',
      robots: [{ name: 'robots', content: 'noindex, nofollow' }],
      alternates: [], icons: [], meta: [], links: [], jsonLd: [],
    },
    documentInjections: [],
    layout: { settings: readDefaults(layoutDefinition), messages: layoutMessages, slots: {}, t: translate(layoutMessages) },
  };
  const template = { instanceKey: `${templateKey}.preview`, templateKey, settings: readDefaults(templateDefinition), messages: templateMessages, slots: {}, t: translate(templateMessages) };
  return {
    ...base,
    module: { key: templateKey, fields: {} }, entry: { id: `preview-${templateKey}`, fields: {} },
    parentModule: null, parentEntry: null, page: { instanceKey: `${templateKey}.preview`, slots: {} }, template,
  } satisfies RenderPayload;
}

function readPropertyDefaults(definitions: readonly unknown[]) {
  const output: Record<string, PublicJson> = {};
  for (const rawDefinition of definitions) {
    const definition = asRecord(rawDefinition);
    const key = readString(definition?.key);
    if (key && definition && Object.hasOwn(definition, 'default') && isSafePreviewValue(definition.default)) output[key] = cloneValue(definition.default) as PublicJson;
  }
  return output;
}

async function createDefaultSection(key: string, id: string): Promise<SectionInstance | undefined> {
  const { sectionSettings } = await loadThemeSettings();
  const loader = sectionSettings[key as keyof typeof sectionSettings];
  if (!key || !id || !loader) return undefined;
  const definition = (await loader()).default;
  const messages = readMessages(definition);
  return { id, key, settings: readDefaults(definition), messages, t: translate(messages) };
}

function readDefaults(definition: unknown) {
  const value = asRecord(definition); const output: Record<string, unknown> = {};
  for (const rawField of Array.isArray(value?.settings) ? value.settings : []) {
    const field = asRecord(rawField); const id = readString(field?.id);
    if (id && field && Object.hasOwn(field, 'default')) output[id] = cloneValue(field.default);
  }
  return output;
}

function readMessages(definition: unknown) {
  const messages = asRecord(asRecord(definition)?.messages) ?? {};
  return Object.fromEntries(Object.entries(messages).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneValue);
  const record = asRecord(value);
  if (record) return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, cloneValue(item)]));
  return value;
}

function syntheticRawPayload(payload: RenderPayload) {
  const sections = (slots: Record<string, SectionInstance[]>) => Object.fromEntries(Object.entries(slots).map(([key, values]) => [key, values.map((section) => ({ id: section.id, key: section.key, settings: section.settings }))]));
  return {
    layout: { settings: payload.layout.settings, slots: sections(payload.layout.slots) },
    template: { settings: payload.template.settings, slots: sections(payload.template.slots) },
    page: { slots: sections(payload.page.slots) },
  };
}
