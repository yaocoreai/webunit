import { defineModuleEntryDataTranslation } from '@/platform/datas';

export const translations = [defineModuleEntryDataTranslation('zh', {
  fields: { title: "隐私协议｜陈工不摸鱼工作室", description: "这个站不请求可选追踪。没有账号，没有表单。" },
  slots: { 'page.main': [
    {
      id: "policy-body",
      settings: {
        h1: "隐私协议",
        lead: "这个站不请求可选追踪。",
        paragraphs: [
          { id: "p1", text: "没有账号，没有表单。找工作室，在小红书、视频号或抖音搜「陈工不摸鱼」私信，或发邮件到 YAOCOREAI@gmail.com。" },
          { id: "p2", text: "联系页嵌了一张地图。英文是 Google 地图，中文是高德。" },
          { id: "p3", text: "公开的价格和案例，不写客户名字。" },
        ],
      },
    },
  ] },
})];
