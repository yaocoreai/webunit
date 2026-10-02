import { defineSiteData, defineSiteDataTranslation, defineModuleReferenceData } from '@/platform/datas';

const logoWhite = defineModuleReferenceData('image', 'brand-logo-white');
const logoBlack = defineModuleReferenceData('image', 'brand-logo-black');
const logoWhitePng = defineModuleReferenceData('image', 'brand-logo-white-png');
const logoBlackPng = defineModuleReferenceData('image', 'brand-logo-black-png');

export default defineSiteData({
  id: 'studio',
  defaultLocale: 'en',
  defaultCurrency: 'cny',
  supportedLocales: ['en', 'zh'],
  fields: {
    title: "Linework Studio",
    description: "Corporate sites, agents, Shopify, apps, mini programs, and admin systems. The development cost is public. 12 years in software. New clients: 600 yuan a day.",
    seo_title: "Linework Studio",
    seo_description: "Corporate sites, agents, Shopify, apps, mini programs, and admin systems. The development cost is public. 12 years in software. New clients: 600 yuan a day.",
    logo_white: logoWhite,
    logo_black: logoBlack,
    logo_white_png: logoWhitePng,
    logo_black_png: logoBlackPng,
    seo_favicon: logoBlackPng,
    seo_apple_touch_icon: logoBlackPng,
    seo_share_image: logoBlackPng,
  },
  domains: [],
  redirects: [],
  files: [
    { path: '/robots.txt', type: 'text', content: 'User-agent: *\nAllow: /\n' },
  ],
});

export const translations = [defineSiteDataTranslation('zh', {
  fields: {
    title: "陈工不摸鱼工作室",
    description: "官网、智能体、独立站、App、小程序、管理系统。开发成本全公开。从事开发行业 12 年。新客户 600 元/天。",
    seo_title: "陈工不摸鱼工作室",
    seo_description: "官网、智能体、独立站、App、小程序、管理系统。开发成本全公开。从事开发行业 12 年。新客户 600 元/天。",
  },
})];
