import type { CmsAsset, ModuleEntry, Site as PlatformSite, ThemeModule } from '@/platform/theme';

type EmptyFields = Readonly<Record<string, never>>;
type PageFields = { title: string; description?: string };
type ArticleFields = { title: string; description?: string; body?: string; image?: CmsAsset<'image'>; image_label?: string; order?: number };

export type Site = PlatformSite<{
  title: string;
  description?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  logo_white: CmsAsset<'image'>;
  logo_black: CmsAsset<'image'>;
  logo_white_png: CmsAsset<'image'>;
  logo_black_png: CmsAsset<'image'>;
  seo_favicon: CmsAsset<'image'>;
  seo_apple_touch_icon: CmsAsset<'image'>;
  seo_share_image: CmsAsset<'image'>;
}>;

export type PageModule = ThemeModule<EmptyFields>;
export type PageEntry = ModuleEntry<PageFields>;
export type ArticleModule = ThemeModule<EmptyFields>;
export type ArticleEntry = ModuleEntry<ArticleFields>;
