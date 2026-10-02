import {
  resolveViewportVariant,
  resolveViewportWidth,
  type ViewportDefinition,
} from "@/platform/manifest";
import type { PreviewRequest } from "./target";

export type ThemePreviewMode = "page" | "component" | "slots";

export type ThemePreviewEnvironment = Readonly<{
  mode: ThemePreviewMode;
  viewport: Readonly<{
    id?: string;
    width: number;
    height: number;
    orientation: 'portrait' | 'landscape';
    pixelRatio: number;
    variant?: string;
  }>;
  canvas: Readonly<{ availableWidth: number; availableHeight: number }>;
  interaction: Readonly<{ enabled: boolean; selectedSlot?: string; selectedSection?: string }>;
  revision: number;
}>;

export function createThemePreviewEnvironment(
  request: PreviewRequest,
  viewportDefinition: ViewportDefinition | undefined,
  revision: number,
  interaction: ThemePreviewEnvironment['interaction'] = { enabled: true },
): ThemePreviewEnvironment {
  const input = request.presentation.environment;
  const width = resolveViewportWidth(viewportDefinition, input.viewportWidth);
  const fixedHeight = viewportDefinition?.strategy === 'fixed' ? viewportDefinition.height : undefined;
  const height = fixedHeight ?? input.viewportHeight;
  const variant = resolveViewportVariant(viewportDefinition, input.viewportWidth);
  return {
    mode: request.target.type === 'section' ? 'component' : request.presentation.content === 'slots' ? 'slots' : 'page',
    viewport: {
      ...(input.viewportId ? { id: input.viewportId } : {}),
      width,
      height,
      orientation: input.viewportWidth >= input.viewportHeight ? 'landscape' : 'portrait',
      pixelRatio: input.pixelRatio,
      ...(variant ? { variant: variant.key } : {}),
    },
    canvas: { availableWidth: input.canvasWidth, availableHeight: input.canvasHeight },
    interaction,
    revision,
  };
}

const themePreviewEnvironmentKey = Symbol('platform.theme-preview-environment');
type PreviewLocals = { [themePreviewEnvironmentKey]?: ThemePreviewEnvironment };

export function bindThemePreviewEnvironment(locals: object, environment: ThemePreviewEnvironment) {
  Object.defineProperty(locals, themePreviewEnvironmentKey, { configurable: false, enumerable: false, value: environment, writable: false });
}

export function readThemePreviewEnvironment(locals: object) {
  return (locals as PreviewLocals)[themePreviewEnvironmentKey];
}

type AstroPreviewContext = Readonly<{ locals: object }>;
export const useThemePreview = (astro: AstroPreviewContext) => readThemePreviewEnvironment(astro.locals) ?? null;
export const useThemeViewport = (astro: AstroPreviewContext) => useThemePreview(astro)?.viewport ?? null;
