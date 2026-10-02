import assert from 'node:assert/strict';
import test from 'node:test';
import { applyContentCacheConfig, applyDocumentCacheConfig } from '@/platform/runtime/cache-config';
import type { RenderRuntime } from '@/platform/theme/render/context';

const publicPolicy = { mode: 'public' as const, browserTtlSeconds: 120, sharedTtlSeconds: 600, staleWhileRevalidateSeconds: 120, surrogateKeys: ['site:1'] };
const runtime = (input: { regions?: boolean; preview?: 'public' | 'editor' } = {}) => ({
  request: {},
  context: input.preview === 'editor'
    ? { environment: 'editor-preview', preview: { type: 'section' } }
    : input.preview === 'public'
      ? { environment: 'public-preview' }
      : { environment: 'production' },
  payload: input.regions ? { consent: { display: { mode: 'regions' } } } : {},
}) as unknown as RenderRuntime;

test('Content cache configuration only disables or clamps source policy', () => {
  assert.equal(applyContentCacheConfig(publicPolicy, { DEV: true, CMS_CONTENT_CACHE_MODE: 'public' }).mode, 'no-store');
  const clamped = applyContentCacheConfig(publicPolicy, { CMS_CONTENT_CACHE_MODE: 'public', CMS_CONTENT_CACHE_SHARED_TTL_SECONDS: '90' });
  assert.equal(clamped.mode === 'public' && clamped.sharedTtlSeconds, 90);
  assert.equal(applyContentCacheConfig({ mode: 'no-store', visibility: 'public', surrogateKeys: [] }, { CMS_CONTENT_CACHE_MODE: 'public' }).mode, 'no-store');
  assert.equal(applyContentCacheConfig(publicPolicy, { CMS_CONTENT_CACHE_MODE: 'no-store' }).mode, 'no-store');
});

test('Document cache keeps Consent HTML public and hard-disables preview HTML', () => {
  assert.equal(applyDocumentCacheConfig(publicPolicy, runtime({}), { DEV: true, CMS_DOCUMENT_CACHE_MODE: 'public' }).mode, 'no-store');
  assert.equal(applyDocumentCacheConfig(publicPolicy, runtime({ regions: true }), { CMS_DOCUMENT_CACHE_MODE: 'public' }).mode, 'public');
  const publicPreview = applyDocumentCacheConfig(publicPolicy, runtime({ preview: 'public' }), { CMS_DOCUMENT_CACHE_MODE: 'public' });
  assert.deepEqual(publicPreview, { mode: 'no-store', visibility: 'preview', surrogateKeys: ['site:1'] });
  const editorPreview = applyDocumentCacheConfig(publicPolicy, runtime({ preview: 'editor' }), { CMS_DOCUMENT_CACHE_MODE: 'public' });
  assert.deepEqual(editorPreview, { mode: 'no-store', visibility: 'preview', surrogateKeys: ['site:1'] });
});
