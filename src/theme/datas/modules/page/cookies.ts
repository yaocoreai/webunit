import { defineModuleEntryDataTranslation } from '@/platform/datas';

export const translations = [defineModuleEntryDataTranslation('zh', {
  fields: { title: "Cookie 协议｜陈工不摸鱼工作室", description: "这个站不请求可选 Cookie。" },
  slots: { 'page.main': [
    {
      id: "policy-body",
      settings: {
        h1: "Cookie 协议",
        lead: "这个站不请求可选 Cookie。",
        paragraphs: [
          { id: "p1", text: "如果记下隐私选择，只用一个名为 privacy_consent 的 Cookie，保留 180 天。" },
          { id: "p2", text: "分析、营销、偏好、出售数据，都不请求。" },
          { id: "p3", text: "联系页的地图可能自己存 Cookie。那是地图站点的，不是这个站的。" },
        ],
      },
    },
  ] },
})];
