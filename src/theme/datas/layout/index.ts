import { defineLayoutData, defineLayoutDataTranslation } from '@/platform/datas';

export default defineLayoutData({
  id: 'studio',
  settings: {
    'colors.background': '#ffffff',
    'colors.foreground': '#1d1d1f',
    'colors.accent': '#0066cc',
    'colors.surface': '#f5f5f7',
    'fonts.body': 'sans',
    'fonts.display': 'sans',
    brandName: '陈工不摸鱼',
  },
  messages: {
    'notice.preview': 'You are previewing an unpublished theme copy',
    'site.skipToContent': 'Skip to content',
  },
  slots: {
    'layout.header': [{ id: 'layout-header', key: 'header', settings: {
  "wordmark": "Linework",
  "studio": "Studio",
  "logoAlt": "Linework Studio",
  "langLabel": "中文",
  "menu": "Open menu",
  "navLabel": "Primary",
  "nav": [
    {
      "id": "nav-1",
      "href": "/",
      "label": "Home"
    },
    {
      "id": "nav-2",
      "href": "/work/",
      "label": "Work"
    },
    {
      "id": "nav-3",
      "href": "/services/",
      "label": "Services"
    },
    {
      "id": "nav-4",
      "href": "/price/",
      "label": "Pricing"
    },
    {
      "id": "nav-5",
      "href": "/news/",
      "label": "Notes"
    },
    {
      "id": "nav-6",
      "href": "/contact/",
      "label": "Contact"
    },
    {
      "id": "nav-7",
      "href": "/open/",
      "label": "Open source"
    }
  ]
}, messages: {} }],
    'layout.footer': [{ id: 'layout-footer', key: 'footer', settings: {
  "studio": "Linework Studio, in Yubei District, Chongqing, China. 12 years in software.",
  "contact": "Message “陈工不摸鱼” on Xiaohongshu, WeChat Channels, or Douyin, or email YAOCOREAI@gmail.com.",
  "wordmark": "Linework"
}, messages: {} }],
  },
});

export const translations = [defineLayoutDataTranslation('zh', {
  messages: {
    'notice.preview': '你正在预览尚未发布的主题副本',
    'site.skipToContent': '跳到正文',
  },
  slots: {
    'layout.header': [{ id: 'layout-header', settings: {
  "wordmark": "陈工不摸鱼",
  "studio": "工作室",
  "logoAlt": "陈工不摸鱼工作室",
  "langLabel": "EN",
  "menu": "打开菜单",
  "navLabel": "主导航",
  "nav": [
    {
      "id": "nav-1",
      "href": "/",
      "label": "首页"
    },
    {
      "id": "nav-2",
      "href": "/work/",
      "label": "案例"
    },
    {
      "id": "nav-3",
      "href": "/services/",
      "label": "服务"
    },
    {
      "id": "nav-4",
      "href": "/price/",
      "label": "价格"
    },
    {
      "id": "nav-5",
      "href": "/news/",
      "label": "资讯"
    },
    {
      "id": "nav-6",
      "href": "/contact/",
      "label": "联系我们"
    },
    {
      "id": "nav-7",
      "href": "/open/",
      "label": "开源"
    }
  ]
} }],
    'layout.footer': [{ id: 'layout-footer', settings: {
  "studio": "陈工不摸鱼工作室，在中国重庆渝北区。从事开发行业 12 年。",
  "contact": "小红书、视频号、抖音搜「陈工不摸鱼」私信，或发邮件到 YAOCOREAI@gmail.com。",
  "wordmark": "陈工不摸鱼"
} }],
  },
})];
