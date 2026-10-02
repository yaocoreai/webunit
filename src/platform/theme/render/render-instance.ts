import type { CmsAsset, CmsLink, CmsMenu, ModuleEntry } from '@/platform/theme/content/public';
import type { DocumentRenderPayload, ErrorRenderPayload, LayoutInstance, RenderPayload, SectionInstance, Site, TemplateInstance, ThemeModule } from '@/platform/theme/render/model';
import type { CodeValue, MetaHeadingValue, MetaPriceValue, SettingDefinition, SettingJsonValue, SpacingBoxValue } from '@/platform/theme/define';
import type { RichTextNode } from '@/platform/theme/render/rich-text';
import { useRuntime } from '@/platform/theme/render/runtime';

export type SettingResourceTypes = Readonly<{
  file: CmsAsset;
  menu: CmsMenu;
  modules: Readonly<Record<string, ModuleEntry>>;
}>;

type FieldsOf<T> = T extends Readonly<{ fields: infer TFields extends readonly SettingDefinition[] }> ? TFields
  : T extends Readonly<{ items: Readonly<{ fields: infer TFields extends readonly SettingDefinition[] }> }> ? TFields
  : readonly [];
type SettingsOf<T> = T extends Readonly<{ settings: infer TSettings extends readonly SettingDefinition[] }> ? TSettings : readonly [];
type MessagesOf<T> = T extends Readonly<{ messages: infer TMessages extends Readonly<Record<string, string>> }> ? TMessages : Readonly<Record<string, string>>;
type ModuleResource<TReference, TResources extends SettingResourceTypes> = TReference extends keyof TResources['modules']
  ? TResources['modules'][TReference]
  : ModuleEntry;
type AssetResource<TType extends string, TResources extends SettingResourceTypes> = TType extends 'image' | 'audio' | 'video'
  ? Extract<TResources['file'], { type: TType }> | CmsAsset<TType>
  : TResources['file'];

type SettingValue<TSetting extends SettingDefinition, TResources extends SettingResourceTypes> =
  TSetting extends Readonly<{ type: 'text' | 'textarea' | 'html' | 'color'; }> ? string
    : TSetting extends Readonly<{ type: 'heading' }> ? MetaHeadingValue
      : TSetting extends Readonly<{ type: 'spacing' }> ? SpacingBoxValue
      : TSetting extends Readonly<{ type: 'rich' }> ? readonly RichTextNode[]
        : TSetting extends Readonly<{ type: 'code' }> ? CodeValue
      : TSetting extends Readonly<{ type: 'number' }> ? number
        : TSetting extends Readonly<{ type: 'switch' }> ? boolean
          : TSetting extends Readonly<{ type: 'json' }> ? SettingJsonValue
            : TSetting extends Readonly<{ type: 'price' }> ? MetaPriceValue
          : TSetting extends Readonly<{ type: 'select'; options: readonly (infer TOption)[] }>
            ? TOption extends Readonly<{ value: infer TValue }> ? TValue : string | number
            : TSetting extends Readonly<{ type: 'date' | 'time' | 'datetime' }> ? string | null
              : TSetting extends Readonly<{ type: 'object' }> ? InferSettingValues<FieldsOf<TSetting>, TResources>
                : TSetting extends Readonly<{ type: 'array' }> ? readonly (Readonly<{ id: string }> & InferSettingValues<FieldsOf<TSetting>, TResources>)[]
                  : TSetting extends Readonly<{ type: infer TType extends 'file' | 'image' | 'audio' | 'video' }> ? AssetResource<TType, TResources> | null
                    : TSetting extends Readonly<{ type: infer TType extends 'files' | 'images' | 'audios' | 'videos' }> ? readonly AssetResource<TType extends `${infer TSingular}s` ? TSingular : 'file', TResources>[]
                      : TSetting extends Readonly<{ type: 'menu' }> ? TResources['menu'] | null
                        : TSetting extends Readonly<{ type: 'menus' }> ? readonly TResources['menu'][]
                          : TSetting extends Readonly<{ type: 'form' }> ? Readonly<{ reference: 'form'; id: string }> | null
                            : TSetting extends Readonly<{ type: 'forms' }> ? readonly Readonly<{ reference: 'form'; id: string }>[]
                          : TSetting extends Readonly<{ type: 'link' }> ? CmsLink | null
                            : TSetting extends Readonly<{ type: 'links' }> ? readonly CmsLink[]
                              : TSetting extends Readonly<{ type: 'module'; reference: infer TReference }> ? ModuleResource<TReference, TResources> | null
                                : TSetting extends Readonly<{ type: 'modules'; reference: infer TReference }> ? readonly ModuleResource<TReference, TResources>[]
                                  : SettingJsonValue;

export type InferSettingValues<
  TSettings extends readonly SettingDefinition[],
  TResources extends SettingResourceTypes,
> = Readonly<{
  [TSetting in TSettings[number] as TSetting['id']]: SettingValue<TSetting, TResources>;
}>;

export type InferLayoutInstance<TDefinition, TResources extends SettingResourceTypes> = LayoutInstance<
  InferSettingValues<SettingsOf<TDefinition>, TResources>,
  MessagesOf<TDefinition>
>;

export type InferTemplateInstance<TDefinition, TResources extends SettingResourceTypes> = TemplateInstance<
  InferSettingValues<SettingsOf<TDefinition>, TResources>,
  MessagesOf<TDefinition>
>;

export type InferSectionInstance<TDefinition, TResources extends SettingResourceTypes> = SectionInstance<
  InferSettingValues<SettingsOf<TDefinition>, TResources>,
  MessagesOf<TDefinition>
>;

export type InferTemplateRenderer<
  TDefinition,
  TResources extends SettingResourceTypes,
  TSite extends Site,
  TModule extends ThemeModule,
  TEntry extends ModuleEntry,
  TParentModule extends ThemeModule = never,
  TParentEntry extends ModuleEntry = never,
> = Readonly<{
  instance: InferTemplateInstance<TDefinition, TResources>;
  site: TSite;
  module: TModule;
  entry: TEntry;
  parentModule: TParentModule;
  parentEntry: TParentEntry;
}>;

export type InferSectionRenderer<
  TDefinition,
  TResources extends SettingResourceTypes,
  TSite extends Site = Site,
  TModule extends ThemeModule = ThemeModule,
  TEntry extends ModuleEntry = ModuleEntry,
  TParentModule extends ThemeModule = ThemeModule,
  TParentEntry extends ModuleEntry = ModuleEntry,
> = Readonly<{
  instance: InferSectionInstance<TDefinition, TResources>;
  site: TSite;
  module: TModule;
  entry: TEntry;
  parentModule: TParentModule;
  parentEntry: TParentEntry;
}>;

export type InferErrorSectionRenderer<
  TDefinition,
  TResources extends SettingResourceTypes,
  TSite extends Site = Site,
> = Readonly<{
  instance: InferSectionInstance<TDefinition, TResources>;
  site: TSite;
}>;

type AstroRenderContext = Readonly<{ props: unknown; locals: object }>;
type RequestRenderContext<TPayload extends DocumentRenderPayload = RenderPayload> = TPayload & Readonly<{
  payload: TPayload;
  content: ReturnType<typeof useRuntime>['content'];
  cache: ReturnType<typeof useRuntime>['cache'];
}>;

type LayoutRenderProps<TLayout extends LayoutInstance> = RequestRenderContext<DocumentRenderPayload> & Readonly<{
  frame?: string;
  layout: TLayout;
  settings: TLayout['settings'];
  message: TLayout['t'];
}>;

type RendererContract<TInstance extends TemplateInstance | SectionInstance> = Readonly<{
  instance: TInstance;
  site: Site;
  module: ThemeModule;
  entry: ModuleEntry;
  parentModule: ThemeModule;
  parentEntry: ModuleEntry;
}>;

type TypedRequestContext<TRenderer extends RendererContract<TemplateInstance | SectionInstance>> =
  Omit<RequestRenderContext, 'site' | 'module' | 'entry' | 'parentModule' | 'parentEntry'> & Readonly<{
    site: TRenderer['site'];
    module: TRenderer['module'];
    entry: TRenderer['entry'];
    parentModule: TRenderer['parentModule'] | null;
    parentEntry: TRenderer['parentEntry'] | null;
  }>;

type TemplateRenderTarget = TemplateInstance | RendererContract<TemplateInstance>;
type TemplateRenderInstance<TTarget extends TemplateRenderTarget> = TTarget extends RendererContract<TemplateInstance> ? TTarget['instance'] : TTarget;
type TemplateRenderContext<TTarget extends TemplateRenderTarget> = TTarget extends RendererContract<TemplateInstance> ? TypedRequestContext<TTarget> : RequestRenderContext<DocumentRenderPayload>;
type TemplateRenderProps<TTarget extends TemplateRenderTarget> = TemplateRenderContext<TTarget> & Readonly<{
  template: TemplateRenderInstance<TTarget>;
  settings: TemplateRenderInstance<TTarget>['settings'];
  message: TemplateRenderInstance<TTarget>['t'];
}>;

type SectionRendererContract = Readonly<{ instance: SectionInstance; site: Site }>;
type SectionRenderContext<TRenderer extends SectionRendererContract> = TRenderer extends RendererContract<SectionInstance>
  ? TypedRequestContext<TRenderer>
  : RequestRenderContext<ErrorRenderPayload> & Readonly<{ site: TRenderer['site'] }>;
type SectionRenderProps<TRenderer extends SectionRendererContract> = SectionRenderContext<TRenderer> & Readonly<{
  section: TRenderer['instance'];
  settings: TRenderer['instance']['settings'];
  message: TRenderer['instance']['t'];
}>;

const requestContext = <TPayload extends DocumentRenderPayload = RenderPayload>(astro: AstroRenderContext) => {
  const value = astro.props as Readonly<{ payload: TPayload }>;
  const runtime = useRuntime(astro.locals);
  return {
    ...value.payload,
    payload: value.payload,
    content: runtime.content,
    cache: runtime.cache,
  };
};

export function useCache(astro: AstroRenderContext) {
  return useRuntime(astro.locals).cache;
}

export function useLayout<TLayout extends LayoutInstance>(astro: AstroRenderContext): LayoutRenderProps<TLayout> {
  const value = astro.props as Readonly<{ payload: DocumentRenderPayload; frame?: string }>;
  const context = requestContext<DocumentRenderPayload>(astro);
  const layout = context.layout as TLayout;
  return { ...context, frame: value.frame, layout, settings: layout.settings, message: layout.t };
}

export function useTemplate<TTarget extends TemplateRenderTarget>(astro: AstroRenderContext): TemplateRenderProps<TTarget> {
  const context = requestContext<DocumentRenderPayload>(astro);
  const template = context.template as TemplateRenderInstance<TTarget>;
  return { ...context, template, settings: template.settings, message: template.t } as unknown as TemplateRenderProps<TTarget>;
}

export function useSection<TRenderer extends SectionRendererContract>(astro: AstroRenderContext): SectionRenderProps<TRenderer> {
  const value = astro.props as Readonly<{ section: SectionInstance }>;
  const context = requestContext(astro);
  const section = value.section as TRenderer['instance'];
  return { ...context, section, settings: section.settings, message: section.t } as unknown as SectionRenderProps<TRenderer>;
}
