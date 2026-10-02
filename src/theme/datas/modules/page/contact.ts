import { defineModuleEntryDataTranslation } from '@/platform/datas';

export const translations = [defineModuleEntryDataTranslation('zh', {
  fields: { title: "联系我们｜陈工不摸鱼工作室", description: "工作室在中国重庆渝北区。小红书、视频号、抖音私信，或发邮件到 YAOCOREAI@gmail.com。" },
  slots: { 'page.main': [
    {
      "id": "contact-body",
      "settings": {
        "kicker": "中国 · 重庆渝北区",
        "h1": "联系我们",
        "lead": "说你要做的站。",
        "body": "要么在小红书、视频号、抖音搜「陈工不摸鱼」，私信说你要做的站。要么发邮件到 YAOCOREAI@gmail.com。基础设计含在开发天数里。专业需求分析和专业设计另计。",
        "stepsTitle": "怎么合作",
        "steps": [
          {
            "id": "step-1",
            "text": "私信或发邮件，说需求"
          },
          {
            "id": "step-2",
            "text": "基础需求分析免费，不成交也不收"
          },
          {
            "id": "step-3",
            "text": "按市场行情的工作量估天数，不注水"
          },
          {
            "id": "step-4",
            "text": "书面报价，15 天有效"
          },
          {
            "id": "step-5",
            "text": "签合同开工，每周给你看进度"
          }
        ],
        "teamTitle": "在哪",
        "mapTitle": "吾悦广场，中央公园",
        "mapUrl": "https://www.amap.com/ssr/embed/place?id=B0FFJVUVF0&name=%E5%90%BE%E6%82%A6%E5%B9%BF%E5%9C%BA(%E9%87%8D%E5%BA%86%E4%B8%AD%E5%A4%AE%E5%85%AC%E5%9B%AD%E5%BA%97)&lng=106.575856&lat=29.722803&address=%E9%87%8D%E5%BA%86%E5%B8%82%E4%B8%A4%E6%B1%9F%E6%96%B0%E5%8C%BA%E5%90%8C%E8%8C%82%E5%A4%A7%E9%81%93369-373%E5%8F%B7",
        "team": "重庆渝北。每周看进度。源码和文档归你。",
        "price": {
          "href": "/price/",
          "label": "先看价格 ›"
        }
      }
    }
  ] },
})];
