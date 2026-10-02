import type { SeoTemplateContent } from "./types";

const indexRobots = { robots: ["index", "follow", "max-image-preview:large"] } as const;
const hiddenRobots = { robots: ["noindex", "nofollow"] } as const;
const icons = [
  { rel: "icon" as const, href: "{{site.fields.seo_favicon | image_url}}", sizes: "any" },
  { rel: "apple-touch-icon" as const, href: "{{site.fields.seo_apple_touch_icon | image_url}}" },
] as const;
const shareImage = {
  url: "{{site.fields.seo_share_image | image_url}}",
  alt: "{{site.fields.seo_share_image | image_alt | default: site.fields.seo_title}}",
} as const;
const entryImage = {
  url: "{{entry.fields.image | default: site.fields.seo_share_image | image_url}}",
  alt: "{{entry.fields.image | image_alt | default: entry.fields.title}}",
} as const;
const siteTitle = "{{site.fields.seo_title | default: site.fields.title}}";
const siteDescription = "{{site.fields.seo_description | default: site.fields.description | plain_text | collapse_whitespace | truncate: 160}}";
const entryTitle = "{{entry.fields.title | append_site_title: site.fields.seo_title | default: site.fields.title}}";
const entryDescription = "{{entry.fields.description | default: site.fields.seo_description | plain_text | collapse_whitespace | truncate: 160}}";

export const siteSeoContent = {
  icons,
  title: siteTitle,
  description: siteDescription,
  robots: indexRobots,
  openGraph: { type: "website", images: [shareImage] },
  twitter: { card: "summary_large_image", image: shareImage },
} as const satisfies SeoTemplateContent;

export const homePageSeoContent = {
  icons,
  title: siteTitle,
  description: entryDescription,
  robots: indexRobots,
  openGraph: { type: "website", images: [shareImage] },
  twitter: { card: "summary_large_image", image: shareImage },
  jsonLd: [{
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: siteTitle,
    description: entryDescription,
  }],
} as const satisfies SeoTemplateContent;

export const moduleSeoTemplates = [
  { key: "page", label: "Page SEO", schemaType: "WebPage", openGraphType: "website", index: true },
  { key: "advertisement", label: "Advertisement SEO", schemaType: "WebPage", openGraphType: "website", index: false },
  { key: "application", label: "Application SEO", schemaType: "WebPage", openGraphType: "website", index: true },
  { key: "article", label: "Article SEO", schemaType: "Article", openGraphType: "article", index: true },
  { key: "article-cate", label: "Article category SEO", schemaType: "CollectionPage", openGraphType: "website", index: true },
  { key: "product", label: "Product SEO", schemaType: "Product", openGraphType: "product", index: true },
  { key: "product-cate", label: "Product category SEO", schemaType: "CollectionPage", openGraphType: "website", index: true },
  { key: "catalog", label: "Catalog SEO", schemaType: "WebPage", openGraphType: "website", index: true },
  { key: "catalog-cate", label: "Catalog category SEO", schemaType: "CollectionPage", openGraphType: "website", index: true },
  { key: "exhibition", label: "Exhibition SEO", schemaType: "Event", openGraphType: "website", index: true },
  { key: "test", label: "Type catalog SEO", schemaType: "WebPage", openGraphType: "website", index: true },
] as const;

export function moduleSeoContent(template: (typeof moduleSeoTemplates)[number]): SeoTemplateContent {
  const nameKey = template.schemaType === "Article" ? "headline" : "name";
  return {
    icons,
    title: entryTitle,
    description: entryDescription,
    robots: template.index ? indexRobots : hiddenRobots,
    openGraph: { type: template.openGraphType, images: [entryImage] },
    twitter: { card: "summary_large_image", image: entryImage },
    jsonLd: [{
      "@context": "https://schema.org",
      "@type": template.schemaType,
      [nameKey]: "{{entry.fields.title}}",
      description: entryDescription,
      image: entryImage.url,
    }],
  };
}
