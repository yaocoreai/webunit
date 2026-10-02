import assert from 'node:assert/strict';
import test from 'node:test';
import { defineSection, findSettingBindingTarget } from '@/platform/theme/define';
import { resolveSettingBindings } from '@/platform/theme/render/setting-bindings';

const definition = defineSection({
  label: 'Binding test',
  groups: ['test'],
  settings: [
    { type: 'text', id: 'title', label: 'Title', default: 'Fallback title' },
    {
      type: 'object', id: 'card', label: 'Card', default: { title: 'Fallback card' },
      fields: [{ type: 'text', id: 'title', label: 'Card title', default: 'Fallback card' }],
    },
    {
      type: 'array', id: 'items', label: 'Items', default: [{ id: 'primary', title: 'Fallback item' }],
      items: { type: 'object', fields: [{ type: 'text', id: 'title', label: 'Item title', default: 'Fallback item' }] },
    },
  ],
  settingBindings: {
    title: '{{ entry.fields.title | default: setting.value }}',
    'card.title': '{{ entry.fields.card.title | default: setting.value }}',
    'items.primary.title': '{{ entry.fields.items.featured.title | default: setting.value }}',
  },
  messages: {},
});

test('Setting bindings project typed RenderPayload values into nested object and stable-id list targets', () => {
  const settings = resolveSettingBindings(
    { title: 'Fallback title', card: { title: 'Fallback card' }, items: [{ id: 'primary', title: 'Fallback item' }] },
    definition,
    {},
    { entry: { fields: { title: 'Entry title', card: { title: 'Entry card' }, items: [{ id: 'featured', title: 'Entry item' }] } } },
    'https://example.com',
    'section.test',
  );
  assert.deepEqual(settings, { title: 'Entry title', card: { title: 'Entry card' }, items: [{ id: 'primary', title: 'Entry item' }] });
});

test('Instance bindings override Theme defaults and setting.value is an explicit fallback', () => {
  const settings = resolveSettingBindings(
    { title: 'Stored title', card: { title: 'Stored card' }, items: [{ id: 'primary', title: 'Stored item' }] },
    definition,
    {
      title: '{{ entry.fields.missing | default: setting.value }}',
      'card.title': '{{ invalid path }}',
    },
    { entry: { fields: {} } },
    'https://example.com',
    'section.test',
  );
  assert.equal(settings.title, 'Stored title');
  assert.equal((settings.card as { title: string }).title, 'Stored card');
});

test('Missing dynamic values do not implicitly fall back to the stored Setting', () => {
  assert.throws(() => resolveSettingBindings(
    { title: 'Stored title', card: { title: 'Stored card' }, items: [{ id: 'primary', title: 'Stored item' }] },
    definition,
    { title: '{{ entry.fields.missing }}' },
    { entry: { fields: {} } },
    'https://example.com',
    'section.test',
  ), /explicit setting.value fallback/);
});

test('Inline object and stable-id array targets resolve recursively while tables bind only as a whole', () => {
  const definition = defineSection({
    label: 'Structured binding test', groups: ['test'], messages: {},
    settings: [
      {
        type: 'object',
        id: 'card',
        label: 'Card',
        default: { title: 'Fallback' },
        fields: [{ type: 'text', id: 'title', label: 'Title', default: 'Fallback' }],
      },
      {
        type: 'array',
        id: 'cards',
        label: 'Cards',
        default: [{ id: 'primary', card: { title: 'Fallback' } }],
        presentation: { stableId: true },
        items: {
          type: 'object',
          fields: [
            { type: 'text', id: 'id', label: 'ID', required: true, default: '' },
            {
              type: 'object',
              id: 'card',
              label: 'Card',
              default: { title: 'Fallback' },
              fields: [{ type: 'text', id: 'title', label: 'Title', default: 'Fallback' }],
            },
          ],
        },
      },
      { type: 'table', id: 'rows', label: 'Rows', columns: ['Name'], default: [['Fallback']] },
    ],
  });
  const result = resolveSettingBindings(
    { card: { title: 'Fallback' }, cards: [{ id: 'primary', card: { title: 'Fallback' } }], rows: [['Fallback']] },
    definition,
    {
      'card.title': '{{ entry.fields.title | default: setting.value }}',
      'cards.primary.card.title': '{{ entry.fields.title | default: setting.value }}',
      rows: '{{ entry.fields.rows | default: setting.value }}',
    },
    { entry: { fields: { title: 'Bound', rows: [['Bound']] } } },
    'https://example.com',
    'section.structured',
  );
  assert.deepEqual(result, { card: { title: 'Bound' }, cards: [{ id: 'primary', card: { title: 'Bound' } }], rows: [['Bound']] });
  assert.equal(findSettingBindingTarget(definition.settings, 'rows.0'), undefined);
});
