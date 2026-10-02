import type { EditorPreview } from '@/platform/theme/render/context';
import { useRenderRuntime } from '@/platform/theme/render/context';

type AstroRenderContext = Readonly<{ locals: object }>;

type SectionEditorPreview = Extract<EditorPreview, { type: 'section' }>;
type TemplateEditorPreview = Extract<EditorPreview, { type: 'template' }>;

export type EditorPreviewState =
  | Readonly<{
      preview: null;
      isPreview: false;
      isSectionPreview: false;
      isTemplatePreview: false;
    }>
  | Readonly<{
      preview: SectionEditorPreview;
      isPreview: true;
      isSectionPreview: true;
      isTemplatePreview: false;
    }>
  | Readonly<{
      preview: TemplateEditorPreview;
      isPreview: true;
      isSectionPreview: false;
      isTemplatePreview: true;
    }>;

export function useEditorPreview(astro: AstroRenderContext): EditorPreviewState {
  const { context } = useRenderRuntime(astro.locals);
  if (context.environment !== 'editor-preview') {
    return { preview: null, isPreview: false, isSectionPreview: false, isTemplatePreview: false };
  }
  if (context.preview.type === 'section') {
    return { preview: context.preview, isPreview: true, isSectionPreview: true, isTemplatePreview: false };
  }
  return { preview: context.preview, isPreview: true, isSectionPreview: false, isTemplatePreview: true };
}
