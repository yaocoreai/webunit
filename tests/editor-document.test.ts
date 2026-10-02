import assert from 'node:assert/strict';
import test from 'node:test';
import { hasExactCmsEditorReferences, isCmsEditorDocument, pruneCmsEditorReferences, usedHtmlReferenceKeys, usedRichTextReferenceKeys } from '@/platform/theme/render/editor-document';
import { isRichText } from '@/platform/theme/render/rich-text';
import { materialize } from '@/platform/theme/source/site-adapter-values';

test('CMS editor documents validate stable unique references', () => {
  assert.equal(isCmsEditorDocument({ content: '<img data-cms-ref="hero">', references: [{ key: 'hero', reference: 'asset.image', id: 'asset-1' }] }, (value): value is string => typeof value === 'string'), true);
  assert.equal(isCmsEditorDocument({ content: '', references: [{ key: 'same', reference: 'asset.file', id: 'one' }, { key: 'same', reference: 'asset.file', id: 'two' }] }, (value): value is string => typeof value === 'string'), false);
});

test('CMS editor documents collect positions by stable keys and prune orphan references', () => {
  const html = '<img data-cms-ref="hero"><a data-cms-ref="details">Details</a>';
  assert.deepEqual([...usedHtmlReferenceKeys(html)], ['hero', 'details']);
  const richText = [{ type: 'image', props: { referenceKey: 'hero' }, content: [], children: [] }, { type: 'paragraph', props: {}, content: [{ type: 'link', referenceKey: 'details', content: [{ type: 'text', text: 'Details', styles: {} }] }], children: [] }];
  assert.equal(isRichText(richText), true);
  assert.deepEqual([...usedRichTextReferenceKeys(richText)], ['hero', 'details']);
  assert.deepEqual(pruneCmsEditorReferences({ content: html, references: [{ key: 'hero', reference: 'asset.image', id: 'one' }, { key: 'orphan', reference: 'asset.file', id: 'two' }] }, usedHtmlReferenceKeys(html)).references, [{ key: 'hero', reference: 'asset.image', id: 'one' }]);
  assert.equal(hasExactCmsEditorReferences({ content: html, references: [{ key: 'hero', reference: 'asset.image', id: 'one' }, { key: 'details', type: 'link', value: { type: 'path', title: 'Details', target: '_self', href: '/details' } }] }, usedHtmlReferenceKeys(html)), true);
});

test('preview adaptation unwraps editor documents and injects available reference data', () => {
  const refs = {
    file: { asset: { id: 'asset', name: 'Hero', delivery: { url: '/hero.jpg' } } },
    'module.article': { entry: { id: 'entry', page: { fullPath: '/about' } } },
  };
  assert.equal(materialize({ content: '<img data-cms-ref="hero">', references: [{ key: 'hero', reference: 'asset.image', id: 'asset' }] }, refs), '<img data-cms-ref="hero" src="/hero.jpg" alt="Hero">');
  assert.deepEqual(materialize({ content: [{ type: 'image', props: { referenceKey: 'hero' }, content: [], children: [] }, { type: 'paragraph', props: {}, content: [{ type: 'link', referenceKey: 'details', content: [] }], children: [] }], references: [{ key: 'hero', reference: 'asset.image', id: 'asset' }, { key: 'details', type: 'link', value: { type: 'module', target: '_self', reference: 'module.article', id: 'entry' } }] }, refs), [
    { type: 'image', props: { referenceKey: 'hero', url: '/hero.jpg', name: 'Hero' }, content: [], children: [] },
    { type: 'paragraph', props: {}, content: [{ type: 'link', referenceKey: 'details', content: [], href: '/about', resource: refs['module.article'].entry }], children: [] },
  ]);
  assert.deepEqual(materialize({ content: [], references: [] }, {}), []);
});

test('Theme editor labels ignore leftover Module Entry key', () => {
  const refs = {
    'module.page': { entry: { id: 'entry', key: 'about-us', page: { fullPath: '/about' } } },
  };
  assert.equal(
    materialize(
      { content: '<a data-cms-ref="about">About</a>', references: [{ key: 'about', reference: 'module.page', id: 'entry' }] },
      refs,
    ),
    '<a data-cms-ref="about" href="/about">About</a>',
  );
});

test('Theme materialization consumes public Asset URLs without reconstructing Function Storage routes', () => {
  const refs = {
    file: {
      asset: {
        id: 'asset',
        title: 'Private Function shape',
        delivery: { type: 'storage', storageKey: 'default', path: 'hero.jpg' },
      },
    },
  };
  assert.equal(
    materialize(
      {
        content: '<img data-cms-ref="hero">',
        references: [{ key: 'hero', reference: 'asset.image', id: 'asset' }],
      },
      refs,
    ),
    '<img data-cms-ref="hero" alt="Private Function shape">',
  );
});
