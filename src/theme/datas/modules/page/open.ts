import { defineModuleEntryDataTranslation } from '@/platform/datas';

export const translations = [defineModuleEntryDataTranslation('zh', {
  fields: { title: "开源｜陈工不摸鱼工作室", description: "给 AI 用的建站系统，方向照着 Shopify。本站就在用。装上 Node.js 就能跑，不依赖第三方服务。" },
  slots: { 'page.main': [
    {
      "id": "open-list",
      "settings": {
        "h1": "开源",
        "lead": "给 AI 用的建站系统，方向照着 Shopify。本站就在用。装上 Node.js 就能跑，不依赖第三方服务。",
        "placeholderCaption": "占位图",
        "items": [
          {
            "id": "item-1",
            "status": "陈工不摸鱼工作室",
            "name": "开源建站系统",
            "detail": "本站就在用。内容在 datas，呈现在 theme。多语言，服务端渲染。装上 Node.js 就能跑，不依赖第三方服务。",
            "points": [
              { "id": "i18n", "label": "多语言", "text": "加一种语言只覆盖要改的字段。" },
              { "id": "split", "label": "内容与主题", "text": "内容在 datas，呈现在 theme。" },
              { "id": "meta", "label": "元属性、元模型", "text": "字段和内容模型先定义，再填数据。" },
              { "id": "function", "label": "函数计算", "text": "控制器、服务、中间件在 function。" },
              { "id": "seo", "label": "搜索引擎", "text": "标题、描述和结构化数据，按语言、整站、模块或单页来写。" },
              { "id": "consent", "label": "Consent", "text": "隐私选择和 Cookie 策略在系统里。" },
              { "id": "injection", "label": "注入与文档", "text": "脚本注入不写进页面正文。" },
              { "id": "dev", "label": "开发", "text": "装上 Node.js 就能跑。不依赖第三方服务。" },
              { "id": "deploy", "label": "部署", "text": "Node、Cloudflare 或容器。" },
              { "id": "ssr", "label": "渲染", "text": "服务端渲染，性能优秀。" }
            ],
            "repository": {
              "href": "https://github.com/yaocoreai/webunit",
              "label": "github.com/yaocoreai/webunit"
            },
            "image": {
              "label": "本站结构"
            }
          }
        ]
      }
    }
  ] },
})];
