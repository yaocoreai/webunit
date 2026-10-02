import { defineManifestData } from '@/platform/datas';

export default defineManifestData({
  templates: [
    {
      id: 'site-default',
      locale: '*',
      manifestJson: {
        name: '{{site.fields.title}}',
        short_name: '{{site.fields.title}}',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          { src: '{{site.fields.seo_favicon | image_url}}', sizes: '1224x1064' },
          { src: '{{site.fields.seo_apple_touch_icon | image_url}}', sizes: '1224x1064' },
        ],
      },
    },
  ],
});
