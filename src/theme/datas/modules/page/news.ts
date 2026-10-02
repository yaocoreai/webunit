import { defineModuleEntryDataTranslation } from '@/platform/datas';

export const translations = [defineModuleEntryDataTranslation('zh', {
  fields: { title: "资讯｜陈工不摸鱼工作室", description: "开发成本、报价单、做过的事。工作室在中国重庆渝北区。" },
  slots: { 'page.main': [
    {
      "id": "news-list",
      "settings": {
        "studio": "工作室",
        "h1": "资讯",
        "lead": "报价、做过的单、看见的事。",
        "placeholderCaption": "占位图"
      }
    }
  ] },
})];
