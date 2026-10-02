import assert from 'node:assert/strict';
import test from 'node:test';
import { useDocumentRenderMode, useEditorPreview, useSection } from '@/platform/theme';
import type { NewsletterSection, PublicContentApi, RenderPayload } from '@/platform/theme';
import { bindRenderRuntime } from '@/platform/theme/render/context';
import type { RenderRuntime } from '@/platform/theme/render/context';
import { bindRuntime } from '@/platform/theme/render/runtime';
import { createMemoryCache } from '@/platform/cache/memory';

test('useSection exposes final settings and messages without loading a definition', () => {
  const t = (key: 'email' | 'eyebrow' | 'placeholder') => ({ email: 'Email', eyebrow: 'Updates', placeholder: 'you@example.com' })[key];
  const section: NewsletterSection['instance'] = {
    id: 'newsletter-1',
    key: 'newsletter',
    settings: { heading: 'Stay informed', description: 'Monthly notes.', buttonLabel: 'Subscribe' },
    messages: { email: 'Email', eyebrow: 'Updates', placeholder: 'you@example.com' },
    t,
  };
  const payload = { entry: { id: 'home', fields: { title: 'Home' } }, layout: {}, template: {} } as unknown as RenderPayload;
  const content = {} as PublicContentApi;
  const cache = createMemoryCache();
  const locals = {};
  bindRuntime(locals, { domainHost: 'example.com', locale: 'en-us', content, cache });

  const view = useSection<NewsletterSection>({ props: { section, payload }, locals });

  assert.equal(view.settings.heading, 'Stay informed');
  assert.equal(view.message('eyebrow'), 'Updates');
  assert.equal(view.section, section);
  assert.equal(view.payload, payload);
  assert.equal(view.entry, payload.entry);
  assert.equal(view.content, content);
  assert.equal(view.cache, cache);
});

test('useEditorPreview exposes derived state for production and editor previews', () => {
  const productionLocals = {};
  bindRenderRuntime(productionLocals, {
    context: { environment: 'production' },
  } as RenderRuntime);
  assert.deepEqual(useEditorPreview({ locals: productionLocals }), {
    preview: null,
    isPreview: false,
    isSectionPreview: false,
    isTemplatePreview: false,
  });
  assert.deepEqual(useDocumentRenderMode({ locals: productionLocals }), {
    isPreview: false,
    isPublicPreview: false,
    isEditorPreview: false,
    allowsExternalEffects: true,
  });

  const publicPreviewLocals = {};
  bindRenderRuntime(publicPreviewLocals, {
    context: { environment: 'public-preview' },
  } as RenderRuntime);
  assert.deepEqual(useEditorPreview({ locals: publicPreviewLocals }), {
    preview: null,
    isPreview: false,
    isSectionPreview: false,
    isTemplatePreview: false,
  });
  assert.deepEqual(useDocumentRenderMode({ locals: publicPreviewLocals }), {
    isPreview: true,
    isPublicPreview: true,
    isEditorPreview: false,
    allowsExternalEffects: false,
  });

  const sectionLocals = {};
  bindRenderRuntime(sectionLocals, {
    context: { environment: 'editor-preview', preview: { type: 'section' } },
  } as RenderRuntime);
  assert.deepEqual(useEditorPreview({ locals: sectionLocals }), {
    preview: { type: 'section' },
    isPreview: true,
    isSectionPreview: true,
    isTemplatePreview: false,
  });
  assert.deepEqual(useDocumentRenderMode({ locals: sectionLocals }), {
    isPreview: true,
    isPublicPreview: false,
    isEditorPreview: true,
    allowsExternalEffects: false,
  });

  const templatePreview = {
    type: 'template' as const,
    activeSection: 'hero-1',
  };
  const templateLocals = {};
  bindRenderRuntime(templateLocals, {
    context: { environment: 'editor-preview', preview: templatePreview },
  } as RenderRuntime);
  assert.deepEqual(useEditorPreview({ locals: templateLocals }), {
    preview: templatePreview,
    isPreview: true,
    isSectionPreview: false,
    isTemplatePreview: true,
  });
});
