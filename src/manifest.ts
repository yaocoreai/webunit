import {
  defineSiteManifest,
  defineSiteManifestMenu,
  defineSiteManifestModule,
  defineSiteManifestProperties,
} from '@/platform/manifest';
import { themeViewport } from '@/viewport';
import { pageSeoContent, siteSeoContent } from '@/theme/datas/seo/content';

const pageEntryProperties = defineSiteManifestProperties([
  { key: 'title', label: 'Title', type: 'text', required: true, locale: true },
  { key: 'description', label: 'Description', type: 'textarea', locale: true },
]);

const articleEntryProperties = defineSiteManifestProperties([
  { key: 'title', label: 'Title', type: 'text', required: true, locale: true },
  { key: 'description', label: 'Description', type: 'textarea', locale: true },
  { key: 'body', label: 'Body', type: 'textarea', required: true, locale: true },
  { key: 'image', label: 'Cover', type: 'image' },
  { key: 'image_label', label: 'Image label', type: 'text', locale: true },
  { key: 'order', label: 'Order', type: 'number' },
]);

export default defineSiteManifest({
  package: {
    key: 'studio',
    name: '陈工不摸鱼',
    version: '1.0.0',
    description: '官网',
  },
  viewport: themeViewport,
  site: {
    properties: defineSiteManifestProperties([
      { key: 'title', label: 'Site title', type: 'text', required: true, locale: true },
      { key: 'description', label: 'Site description', type: 'textarea', locale: true },
      { key: 'seo_title', label: 'Default SEO title', type: 'text', locale: true },
      { key: 'seo_description', label: 'Default SEO description', type: 'textarea', locale: true },
      { key: 'seo_keywords', label: 'Default SEO keywords', type: 'text', locale: true },
      { key: 'logo_white', label: 'Logo white', type: 'image', required: true },
      { key: 'logo_black', label: 'Logo black', type: 'image', required: true },
      { key: 'logo_white_png', label: 'Logo white PNG', type: 'image', required: true },
      { key: 'logo_black_png', label: 'Logo black PNG', type: 'image', required: true },
      { key: 'seo_favicon', label: 'Favicon', type: 'image', required: true },
      { key: 'seo_apple_touch_icon', label: 'Apple touch icon', type: 'image', required: true },
      { key: 'seo_share_image', label: 'Default share image', type: 'image', required: true },
    ]),
  },
  menu: defineSiteManifestMenu([
    { key: 'main-menu', properties: defineSiteManifestProperties([]) },
  ]),
  modules: [
    defineSiteManifestModule({
      key: 'page',
      name: '页面',
      sitemap: true,
      routePrefix: '',
      templateKey: 'page',
      moduleProperties: defineSiteManifestProperties([]),
      entryProperties: pageEntryProperties,
    }),
    defineSiteManifestModule({
      key: 'article',
      name: '文章',
      sitemap: true,
      routePrefix: '/news',
      templateKey: 'article',
      moduleProperties: defineSiteManifestProperties([]),
      entryProperties: articleEntryProperties,
    }),
  ],
  seo: [
    { key: 'site-default', label: 'Site default SEO', locale: '*', owner: { type: 'site' }, content: siteSeoContent },
    {
      key: 'module-page',
      label: '页面',
      locale: '*',
      owner: { type: 'module' as const, key: 'page' },
      content: pageSeoContent('WebPage', 'website'),
    },
    {
      key: 'module-article',
      label: '文章',
      locale: '*',
      owner: { type: 'module' as const, key: 'article' },
      content: pageSeoContent('Article', 'article'),
    },
  ],
});
