import assert from 'node:assert/strict';
import test from 'node:test';
import { isStaticDatasGraph } from '@/platform/theme/datas/graph';
import { createDatasModel } from '@/platform/theme/datas/model';
import { defineSiteData } from '@/platform/datas';
import { createDatasPublicContent } from '@/platform/theme/datas/content-api';
import { localizeContentData, mergeLocalizedValue } from '@/platform/theme/datas/localize';
import { localizeResources } from '@/platform/theme/datas/localize-resources';
import { datasTranslationCache, getDatasTranslation } from '@/platform/theme/datas/translation-cache';
import theme from '@/manifest';
import siteData from '@/theme/datas/site';
import layoutData from '@/theme/datas/layout';
import { datasTranslationIdentity } from '@/platform/theme/datas/translation-identity';

const content = {
  settings: {},
  messages: {},
  slots: {
    main: [{ id: 'newsletter', key: 'newsletter', settings: {}, messages: { eyebrow: 'Newsletter', email: 'Email', placeholder: 'you@example.com' } }],
  },
};

test('translation cache uses namespace, key, value and locale records', () => {
  const menu = datasTranslationIdentity.menu(siteData.id, '40000000-0000-4000-8000-000000000001');
  const storage = datasTranslationIdentity.storage(siteData.id, 'reading-room');
  const pageIdentity = datasTranslationIdentity.page(siteData.id, 'page', 'home');
  const layout = datasTranslationIdentity.layout({ siteId: siteData.id, themeId: layoutData.id });
  const template = datasTranslationIdentity.template({ siteId: siteData.id, themeId: layoutData.id }, 'page.default');
  const record = [...datasTranslationCache.values()].find((candidate) => candidate.namespace === menu.namespace && candidate.key === menu.key && candidate.locale === 'zh-cn');
  assert.ok(record);
  assert.equal(record.namespace, menu.namespace);
  assert.equal(getDatasTranslation<unknown[]>(menu.namespace, menu.key, 'zh-cn')?.length, 7);
  assert.match(String(getDatasTranslation<{ title: string }>(storage.namespace, storage.key, 'zh-cn')?.title), /\p{Script=Han}/u);
  const page = getDatasTranslation<{ slots?: Record<string, unknown[]> }>(pageIdentity.namespace, pageIdentity.key, 'zh-cn');
  assert.equal(page, undefined);
  assert.equal(Object.hasOwn(page ?? {}, 'contentJson'), false);
  assert.match(String(getDatasTranslation<{ messages: Record<string, string> }>(layout.namespace, layout.key, 'zh-cn')?.messages['site.skipToContent']), /\p{Script=Han}/u);
  assert.equal(getDatasTranslation(template.namespace, template.key, 'zh-cn'), undefined);
});

test('translation identities isolate equal owner ids across Sites', () => {
  assert.notEqual(
    datasTranslationIdentity.page(siteData.id, 'page', 'home').namespace,
    datasTranslationIdentity.page('southstar', 'page', 'home').namespace,
  );
});

test('zh-cn replaces Section messages without mutating the saved Datas definition', () => {
  const localized = localizeContentData(content, { slots: { main: [{ id: 'newsletter', messages: { eyebrow: 'Newsletter updates', email: 'Email address' } }] } });

  assert.deepEqual(localized.slots.main[0]?.messages, { eyebrow: 'Newsletter updates', email: 'Email address', placeholder: 'you@example.com' });
  assert.equal(content.slots.main[0]?.messages.eyebrow, 'Newsletter');
});

test('the default locale keeps saved Section messages unchanged', () => {
  assert.equal(localizeContentData(content), content);
});

test('Datas localization keeps editor documents when the translation is leftover html or rich', () => {
  const html = { content: '<p>Hello</p>', references: [] };
  const localized = localizeContentData(
    {
      settings: { note: html },
      messages: {},
      slots: { main: [{ id: 'hero', key: 'hero', settings: { body: html }, messages: {} }] },
    },
    {
      settings: { note: '<p>Leftover html</p>' },
      slots: { main: [{ id: 'hero', settings: { body: [{ type: 'paragraph', props: {}, content: [], children: [] }] } }] },
    },
  );
  assert.deepEqual(localized.settings?.note, html);
  assert.deepEqual(localized.slots?.main[0]?.settings?.body, html);
  assert.deepEqual(mergeLocalizedValue(html, { content: '<p>你好</p>', references: [] }), {
    content: '<p>你好</p>',
    references: [],
  });
});

test('module query merges only Entry translations for the request locale', async () => {
  const api = createDatasPublicContent({ locale: 'zh-cn', signal: new AbortController().signal }, theme.modules ?? []);
  const result = await api.module('product').findMany();
  const product = result.items.find((item) => item.id === 'industrial-tape');
  assert.ok(product);
  assert.equal(product.fields.title, 'Industrial Tape');
  assert.equal(product.fields.page, undefined);
});

test('referenced Storage, CmsMenu and linked Module resources use the request locale', () => {
  const refs = localizeResources('zh-cn', theme.modules ?? []);
  assert.match(refs.file['reading-room'].title, /\p{Script=Han}/u);
  const articles = refs.menu['40000000-0000-4000-8000-000000000001'].items.find((item) => item.id === 'articles');
  assert.match(String(articles?.link.title), /\p{Script=Han}/u);
  assert.equal((articles?.link.resource as { fields?: { title?: string } })?.fields?.title, 'Insights');
  assert.equal((refs['article-cate']['insights'].fields as { title?: string }).title, 'Insights');
});
test('Datas Entry parent must belong to the parent module', () => {
  assert.throws(
    () => createDatasModel(
      { tag: { id: 'tag', fields: {}, entries: { industrial: { id: 'industrial', parentId: 'other', fields: {} } } } },
      {},
      [{ key: 'tag', kind: 'model' }],
    ),
    /parent requires a parent module/,
  );
  const model = createDatasModel(
    {
      'article-cate': { id: 'article-cate', fields: {}, entries: { insights: { id: 'insights', fields: {} } } },
      article: { id: 'article', fields: {}, entries: { story: { id: 'story', parentId: 'insights', fields: {} } } },
    },
    {},
    [
      { key: 'article-cate', kind: 'model' },
      { key: 'article', kind: 'model', parentKey: 'article-cate' },
    ],
  );
  assert.equal(model.modules.get('article')?.parentKey, 'article-cate');
  assert.equal(model.modules.get('article')?.entries.story?.parentId, 'insights');
  assert.throws(
    () => createDatasModel(
      {
        'article-cate': { id: 'article-cate', fields: {}, entries: { insights: { id: 'insights', fields: {} } } },
        article: { id: 'article', fields: {}, entries: { story: { id: 'story', parentId: 'missing', fields: {} } } },
      },
      {},
      [
        { key: 'article-cate', kind: 'model' },
        { key: 'article', kind: 'model', parentKey: 'article-cate' },
      ],
    ),
    /Unknown parent Datas Entry/,
  );
});

test('Datas Entry record key must equal id', () => {
  assert.throws(
    () => createDatasModel(
      { tag: { id: 'tag', fields: {}, entries: { alias: { id: 'industrial', fields: {} } } } },
      {},
      [{ key: 'tag', kind: 'model' }],
    ),
    /record key must equal id/,
  );
});

test('cross-request Datas graph caching is limited to static definitions', () => {
  assert.equal(isStaticDatasGraph(), true);
  assert.equal(isStaticDatasGraph({ site: defineSiteData(async () => ({
    id: 'southstar', defaultLocale: 'en-us', supportedLocales: ['en-us'], defaultCurrency: 'usd', fields: {}, domains: [], redirects: [], files: [],
  })) }), false);
});
