import { useRenderRuntime } from '@/platform/theme/render/context';

type AstroContext = Readonly<{ locals: object }>;
const resolver = (astro: AstroContext) => useRenderRuntime(astro.locals).request.signals;
export const useRequest = (astro: AstroContext) => resolver(astro).request();
export const useRequestTransport = (astro: AstroContext) => resolver(astro).transport();
export const useRequestGeo = (astro: AstroContext) => resolver(astro).geo();
export const useRequestBot = (astro: AstroContext) => resolver(astro).bot();
export const useRequestSignals = (astro: AstroContext) => resolver(astro).signals();
