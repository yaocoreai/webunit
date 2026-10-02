import type { SeoTemplateContent } from '@/platform/manifest';

const indexRobots = { robots: ['index', 'follow', 'max-image-preview:large'] } as const;
const icons = [
  { rel: 'icon' as const, href: '{{site.fields.seo_favicon | image_url}}', sizes: 'any' },
  { rel: 'apple-touch-icon' as const, href: '{{site.fields.seo_apple_touch_icon | image_url}}' },
] as const;
const shareImage = {
  url: '{{site.fields.seo_share_image | image_url}}',
  alt: '{{site.fields.seo_share_image | image_alt | default: site.fields.seo_title}}',
} as const;
const entryImage = {
  url: '{{entry.fields.image | default: site.fields.seo_share_image | image_url}}',
  alt: '{{entry.fields.image | image_alt | default: entry.fields.title}}',
} as const;

export const siteSeoContent = {
  icons,
  title: '{{site.fields.seo_title | default: site.fields.title}}',
  description: '{{site.fields.seo_description | default: site.fields.description | plain_text | collapse_whitespace | truncate: 160}}',
  robots: indexRobots,
  openGraph: { type: 'website', images: [shareImage] },
  twitter: { card: 'summary_large_image', image: shareImage },
} as const satisfies SeoTemplateContent;

export function pageSeoContent(schemaType: 'WebPage' | 'Article', openGraphType: 'website' | 'article'): SeoTemplateContent {
  const nameKey = schemaType === 'Article' ? 'headline' : 'name';
  return {
    icons,
    title: '{{entry.fields.title | default: site.fields.seo_title}}',
    description: '{{entry.fields.description | default: site.fields.seo_description | plain_text | collapse_whitespace | truncate: 160}}',
    robots: indexRobots,
    openGraph: { type: openGraphType, images: [entryImage] },
    twitter: { card: 'summary_large_image', image: entryImage },
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': schemaType,
      [nameKey]: '{{entry.fields.title}}',
      description: '{{entry.fields.description | plain_text | collapse_whitespace | truncate: 160}}',
      image: entryImage.url,
    }],
  };
}
