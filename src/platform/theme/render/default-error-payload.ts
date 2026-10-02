import type { LayoutDefinition, SettingDefinition, TemplateDefinition } from '@/platform/theme/define';
import type { ErrorRenderPayload } from './model';
import type { ResolveErrorInput } from '@/platform/theme/source/contracts';

const settings = (definitions: readonly SettingDefinition[]) => Object.fromEntries(
  definitions.flatMap((definition) => Object.hasOwn(definition, 'default') ? [[definition.id, structuredClone(definition.default)]] : []),
);
const translator = (messages: Readonly<Record<string, string>>) => (key: string) => messages[key] ?? key;

export function createDefaultErrorRenderPayload(
  input: ResolveErrorInput,
  layoutDefinition: LayoutDefinition,
  errorDefinition: TemplateDefinition,
): ErrorRenderPayload {
  const layoutMessages = { ...layoutDefinition.messages };
  const errorMessages = { ...errorDefinition.messages };
  return {
    type: 'error',
    site: { fields: {}, defaultCurrency: 'usd' },
    domain: { host: input.host },
    locale: 'en-us',
    route: { path: input.path, query: Object.fromEntries(new URLSearchParams(input.query)) },
    seo: {
      title: `${input.status} · Error`, robots: [{ name: 'robots', content: 'noindex,nofollow' }],
      canonical: `${input.origin ?? `https://${input.host}`}${input.path}`, alternates: [], icons: [], meta: [], links: [], jsonLd: [],
    },
    documentInjections: [],
    layout: { settings: settings(layoutDefinition.settings), messages: layoutMessages, slots: {}, t: translator(layoutMessages) },
    template: {
      instanceKey: 'error.default', templateKey: 'error',
      settings: settings(errorDefinition.settings),
      messages: errorMessages,
      slots: {},
      t: translator(errorMessages),
    },
    error: { status: input.status, ...(input.requestId ? { requestId: input.requestId } : {}) },
  };
}
