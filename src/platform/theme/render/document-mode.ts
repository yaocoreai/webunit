import { useRenderRuntime } from './context';

type AstroRenderContext = Readonly<{ locals: object }>;

export type DocumentRenderMode = Readonly<{
  isPreview: boolean;
  isPublicPreview: boolean;
  isEditorPreview: boolean;
  allowsExternalEffects: boolean;
}>;

export function useDocumentRenderMode(
  astro: AstroRenderContext,
): DocumentRenderMode {
  const environment = useRenderRuntime(astro.locals).context.environment;
  return {
    isPreview: environment !== 'production',
    isPublicPreview: environment === 'public-preview',
    isEditorPreview: environment === 'editor-preview',
    allowsExternalEffects: environment === 'production',
  };
}
