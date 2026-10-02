import assert from 'node:assert/strict';
import test from 'node:test';
import type { CodeSetting, HtmlSetting, SpacingSetting, TreeSetting } from '@/platform/theme/define';
import { toCssBox } from '@/platform/schema/spacing';
import { validateSettingValue } from '@/platform/theme/render/setting-value';

test('HTML settings store editor documents', () => {
  const field = { type: 'html', id: 'content', label: 'Content', default: { content: '', references: [] }, locale: true } satisfies HtmlSetting;
  assert.equal(validateSettingValue(field, { content: '<p>Hello</p>', references: [] }), true);
  assert.equal(validateSettingValue(field, '<p>Hello</p>'), false);
  assert.equal(validateSettingValue(field, { content: '<p>Hello</p>', references: [{ key: 'hero', reference: 'asset.image', id: 'asset-1' }] }), false);
  assert.equal(validateSettingValue(field, { content: '<p>Hello<img data-cms-ref="hero"></p>', references: [{ key: 'hero', reference: 'asset.image', id: 'asset-1' }] }), true);
});

test('Rich settings store editor documents, not node arrays', () => {
  const field = { type: 'rich', id: 'body', label: 'Body', default: { content: [], references: [] }, locale: true } as const;
  const nodes = [{ type: 'paragraph', props: {}, content: [{ type: 'text', text: 'Hello', styles: {} }], children: [] }];
  assert.equal(validateSettingValue(field, { content: nodes, references: [] }), true);
  assert.equal(validateSettingValue(field, nodes), false);
});

test('Code settings store a constrained language and content object', () => {
  const field = { type: 'code', id: 'source', label: 'Source', languages: ['html', 'css'], default: { language: 'html', content: '' } } satisfies CodeSetting;
  assert.equal(validateSettingValue(field, { language: 'html', content: '<main />' }), true);
  assert.equal(validateSettingValue(field, { language: 'javascript', content: 'alert(1)' }), false);
  assert.equal(validateSettingValue(field, { language: 'html', content: '', extra: true }), false);
});

test('Spacing settings store CSS length strings per side', () => {
  const padding = {
    type: 'spacing',
    id: 'padding',
    label: 'Padding',
    default: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
  } satisfies SpacingSetting;
  const margin = {
    type: 'spacing',
    id: 'margin',
    label: 'Margin',
    allowNegative: true,
    default: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
  } satisfies SpacingSetting;
  const mixed = { top: '30px', right: '10%', bottom: '2rem', left: '1.5em' };
  assert.equal(validateSettingValue(padding, mixed), true);
  assert.equal(validateSettingValue(padding, { top: '-8px', right: '0px', bottom: '0px', left: '0px' }), false);
  assert.equal(validateSettingValue(margin, { top: '-8px', right: '0px', bottom: '0px', left: '0px' }), true);
  assert.equal(validateSettingValue(padding, { top: '30pt', right: '0px', bottom: '0px', left: '0px' }), false);
  assert.equal(validateSettingValue(padding, { top: '30px', right: '0px', bottom: '0px' }), false);
  assert.equal(toCssBox(mixed, 'padding'), 'padding: 30px 10% 2rem 1.5em');
});

test('Price settings store amountMinor only; currency comes from Site', () => {
  const field = { type: 'price', id: 'price', label: 'Price', default: { amountMinor: 0 } } as const;
  assert.equal(validateSettingValue(field, { amountMinor: 1299 }), true);
  assert.equal(validateSettingValue(field, { amountMinor: 1299, currency: 'usd' }), false);
  assert.equal(validateSettingValue(field, 1299), false);
});

test('Tree settings require unique node ids and the declared fields', () => {
  const field = {
    type: 'tree',
    id: 'outline',
    label: 'Outline',
    default: [],
    fields: [{ type: 'text', id: 'title', label: 'Title', default: '' }],
  } satisfies TreeSetting;
  const root = '10000000-0000-4000-8000-000000000001';
  const child = '10000000-0000-4000-8000-000000000002';
  assert.equal(validateSettingValue(field, [{ id: root, title: 'Root', children: [{ id: child, title: 'Child', children: [] }] }]), true);
  assert.equal(validateSettingValue(field, [{ id: root, title: 'Root', children: [{ id: root, title: 'Child', children: [] }] }]), false);
});

test('Menu settings accept only persisted UUID resource references', () => {
  const field = { type: 'menu', id: 'menu', label: 'Menu', default: null } as const;
  assert.equal(validateSettingValue(field, null), true);
  assert.equal(validateSettingValue(field, { reference: 'menu', id: '40000000-0000-4000-8000-000000000001' }), true);
  assert.equal(validateSettingValue(field, { reference: 'menu', id: 'main-menu' }), false);
  assert.equal(validateSettingValue(field, { id: '40000000-0000-4000-8000-000000000001' }), false);
  assert.equal(validateSettingValue(field, { reference: 'menu', key: 'main-menu' }), false);
});
