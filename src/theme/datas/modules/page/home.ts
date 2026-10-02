import { defineModuleEntryDataTranslation } from '@/platform/datas';

export const translations = [defineModuleEntryDataTranslation('zh', {
  fields: { title: "陈工不摸鱼工作室｜程序开发都做", description: "官网、智能体、独立站、App、小程序、管理系统。开发成本全公开。从事开发行业 12 年。新客户 600 元/天。" },
  slots: { 'page.main': [
    {
      "id": "home-hero",
      "settings": {
        "kicker": "中国 · 重庆渝北区",
        "h1": "程序开发都做",
        "lead": "开发成本全公开。",
        "body": "工作室在重庆渝北。从事开发行业 12 年。工作室加上 AI，写以前要一个团队写的项目。有任何项目问题，7x24小时内响应。",
        "priceLink": {
          "href": "/price/",
          "label": "看价格"
        },
        "contactLink": {
          "href": "/contact/",
          "label": "联系我们"
        },
        "heroImage": {
          "label": "工作室 + AI"
        },
        "placeholderCaption": "占位图",
        "schema": {
          "name": "陈工不摸鱼工作室",
          "description": "官网、智能体、独立站、App、小程序、管理系统。开发成本全公开。从事开发行业 12 年。新客户 600 元/天。",
          "addressCountry": "CN",
          "addressRegion": "重庆",
          "addressLocality": "渝北区",
          "knowsLanguage": [
            "zh-CN",
            "en"
          ],
          "offers": [
            {
              "name": "新客户按天",
              "price": "600",
              "priceCurrency": "CNY",
              "unitText": "DAY"
            },
            {
              "name": "新客户按月",
              "price": "12000",
              "priceCurrency": "CNY",
              "unitText": "MON"
            },
            {
              "name": "老客户按天",
              "price": "500",
              "priceCurrency": "CNY",
              "unitText": "DAY"
            },
            {
              "name": "老客户按月",
              "price": "10000",
              "priceCurrency": "CNY",
              "unitText": "MON"
            }
          ]
        }
      }
    },
    {
      "id": "home-services",
      "settings": {
        "servicesTitle": "做这些",
        "servicesNote": "建站、二次开发、插件、主题。",
        "services": [
          {
            "id": "service-1",
            "text": "官网"
          },
          {
            "id": "service-2",
            "text": "智能体"
          },
          {
            "id": "service-3",
            "text": "独立站"
          },
          {
            "id": "service-4",
            "text": "App"
          },
          {
            "id": "service-5",
            "text": "小程序"
          },
          {
            "id": "service-6",
            "text": "管理系统"
          }
        ],
        "agentLine": "另外一件：工作室智能体。全程跟 AI 聊，五个助理替你干选题、稿、报价、合同和原型。你有更多的时间处理交付。买了送全套运营教案、同行社群，并始终获得最新的工作室智能体版本。",
        "agentLink": {
          "href": "/services/",
          "label": "看服务 ›"
        }
      }
    },
    {
      "id": "home-compare",
      "settings": {
        "compareTitle": "工作室与 AI 一起写",
        "compareBody": "前 9 年在公司，一单怎么派人已经吃透，也做熟了：销售、项目管理、几个开发。写页面和功能的那一段，现在是工作室，加上 AI。",
        "compareBody2": "报价里因此没有销售、没有办公室、没有固定编制。不是活便宜，是结构便宜。",
        "before": "以前，一个团队",
        "now": "现在，工作室 + AI"
      }
    },
    {
      "id": "home-work",
      "settings": {
        "workTitle": "案例",
        "workMask": "客户打码",
        "workName": "西藏饰品文化独立站",
        "workFacts": [
          {
            "id": "fact-1",
            "label": "时间",
            "value": "2024 年起，老客户介绍"
          },
          {
            "id": "fact-2",
            "label": "范围",
            "value": "建站、二次开发、插件、主题"
          },
          {
            "id": "fact-3",
            "label": "体量",
            "value": "1 个项目，8 次需求"
          }
        ],
        "workLink": {
          "href": "/work/",
          "label": "看这一单 ›"
        },
        "workImage": {
          "label": "西藏饰品文化独立站"
        },
        "placeholderCaption": "占位图"
      }
    },
    {
      "id": "home-team",
      "settings": {
        "teamTitle": "白天和晚上",
        "teamBody": "白天做网站。晚上照着 Shopify 的结构，写开源 CMS。仓库还没公开。",
        "teamImage": {
          "label": "重庆渝北区"
        },
        "placeholderCaption": "占位图"
      }
    },
    {
      "id": "home-price",
      "settings": {
        "priceTitle": "开发成本全公开",
        "priceNote": "含税，默认普票。做满 22 个工作日就按一个月算。老客户是复购。",
        "priceColumns": {
          "client": "客户",
          "day": "按天",
          "month": "按月"
        },
        "priceRows": [
          {
            "id": "row-1",
            "client": "新客户",
            "day": "600 元",
            "month": "12,000 元"
          },
          {
            "id": "row-2",
            "client": "老客户",
            "day": "500 元",
            "month": "10,000 元"
          }
        ],
        "priceMore": {
          "href": "/price/",
          "label": "完整报价单 ›"
        }
      }
    },
    {
      "id": "home-news",
      "settings": {
        "newsTitle": "资讯",
        "newsAll": {
          "href": "/news/",
          "label": "全部 ›"
        },
        "newsCount": 4,
        "placeholderCaption": "占位图"
      }
    },
    {
      "id": "home-rules",
      "settings": {
        "rulesTitle": "五条规矩",
        "rules": [
          {
            "id": "rule-1",
            "text": "改你的站，先在演示环境里改，你确认没问题才动正式站"
          },
          {
            "id": "rule-2",
            "text": "上线前充分测试"
          },
          {
            "id": "rule-3",
            "text": "增量更新，不覆盖、不丢东西"
          },
          {
            "id": "rule-4",
            "text": "每次修改有记录、有备份"
          },
          {
            "id": "rule-5",
            "text": "源码和文档全部归你，历史版本随时可取。不绑人，换人也能接手"
          }
        ]
      }
    }
  ] },
})];
