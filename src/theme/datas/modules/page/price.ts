import { defineModuleEntryDataTranslation } from '@/platform/datas';

export const translations = [defineModuleEntryDataTranslation('zh', {
  fields: { title: "价格｜陈工不摸鱼工作室", description: "新客户 600 元/天、12,000 元/月，老客户 500 元/天、10,000 元/月。含税，默认普票，赠 1 年售后。" },
  slots: { 'page.main': [
    {
      "id": "price-body",
      "settings": {
        "studio": "工作室",
        "h1": "价格",
        "lead": "谁来都是这个数。",
        "columns": {
          "client": "客户",
          "day": "按天",
          "month": "按月"
        },
        "rows": [
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
        "note": "老客户是复购。做满 22 个工作日就按一个月算。不满 22 天，全程按天，不套包月。含税，默认普票。",
        "afterTitle": "售后",
        "after": "每单赠 1 年：bug 修复、服务器维护、小调整。新功能另算，开工前报价。",
        "invoiceTitle": "发票",
        "invoice": "含税，默认普票。报价不另写专票加价。依法纳税。",
        "freeTitle": "报价前不收费",
        "free": [
          {
            "id": "free-1",
            "text": "把需求说清楚"
          },
          {
            "id": "free-2",
            "text": "基础需求分析"
          },
          {
            "id": "free-3",
            "text": "书面报价，15 天有效"
          }
        ],
        "freeNote": "不成交也不收。专业需求分析和专业设计另计。基础设计含在开发天数里。",
        "whyTitle": "为什么是这个数",
        "why": "没有销售，没有办公室，没有固定编制。不是活便宜，是结构便宜。",
        "contact": {
          "href": "/contact/",
          "label": "联系我们"
        },
        "quote": {
          "copy": {
            "title": "报价计算器",
            "lead": "工时写在服务清单里。服务默认勾上，不需要就关掉。合计里改客户和发票，合同合计跟着变。金额以市场价为准，仅供参考。",
            "scene": "场景",
            "client": "客户",
            "invoice": "发票",
            "servicesTitle": "服务清单",
            "quoteTitle": "合计",
            "categories": [
              {
                "id": "app",
                "label": "App 开发"
              },
              {
                "id": "mini",
                "label": "小程序开发"
              },
              {
                "id": "site",
                "label": "官网开发"
              },
              {
                "id": "shop",
                "label": "独立站开发"
              }
            ],
            "clients": [
              {
                "id": "new",
                "label": "新客户"
              },
              {
                "id": "returning",
                "label": "复购"
              }
            ],
            "invoices": [
              {
                "id": "normal",
                "label": "普票"
              },
              {
                "id": "special",
                "label": "专票"
              }
            ],
            "included": [
              {
                "name": "咨询",
                "detail": "把需求说清楚。免费，不成交也不收。"
              },
              {
                "name": "基础报价",
                "detail": "免费。15 天有效。书面报价另出。"
              },
              {
                "name": "基础需求分析",
                "detail": "免费。不成交也不收。"
              },
              {
                "name": "基础设计",
                "detail": "含在开发天数里，不另开一笔。"
              },
              {
                "name": "页面原型",
                "detail": "不另收费。"
              },
              {
                "name": "演示和测试",
                "detail": "先在演示环境确认，再动正式站。含在开发里。"
              },
              {
                "name": "更新和备份",
                "detail": "增量更新、记录、备份。不覆盖，不丢。含在开发里。"
              },
              {
                "name": "每周进度",
                "detail": "含在开发里。"
              },
              {
                "name": "上线",
                "detail": "含在开发里。"
              },
              {
                "name": "源码和文档",
                "detail": "源码、文档、设计稿交给你。含在开发里。"
              },
              {
                "name": "验收",
                "detail": "按功能清单逐项认。含在开发里。"
              },
              {
                "name": "普通发票",
                "detail": "默认普票，含在开发里。"
              },
              {
                "name": "签合同",
                "detail": "不另收。"
              },
              {
                "name": "工期",
                "detail": "需求不变、超出预估天数，不另收。"
              },
              {
                "name": "一年售后",
                "detail": "每单赠：bug 修复、服务器维护、小调整。24 小时响应。新功能另报。"
              }
            ],
            "scenarios": [
              {
                "id": "app-client",
                "category": "app",
                "name": "一个客户端",
                "detail": "还没有报过 App 的人日。天数自己填。",
                "days": null
              },
              {
                "id": "app-admin",
                "category": "app",
                "name": "客户端 + 服务端",
                "detail": "还没有报过这一档的人日。天数自己填。",
                "days": null
              },
              {
                "id": "mini-demand",
                "category": "mini",
                "name": "使用端 + 管理后台，需求这一档",
                "detail": "已有报价，客户打码。28.5 人日。",
                "days": 28.5
              },
              {
                "id": "mini-product",
                "category": "mini",
                "name": "同一范围拆到产品清单",
                "detail": "同一单拆开之后。41.5 人日。客户打码。",
                "days": 41.5
              },
              {
                "id": "site-pages",
                "category": "site",
                "name": "展示型官网",
                "detail": "还没有报过展示站的人日。天数自己填。",
                "days": null
              },
              {
                "id": "site-admin",
                "category": "site",
                "name": "电脑上的业务后台",
                "detail": "已有报价，客户打码。18 人日。",
                "days": 18
              },
              {
                "id": "shop-build",
                "category": "shop",
                "name": "独立站建站",
                "detail": "还没有报过总人日。天数自己填。",
                "days": null
              },
              {
                "id": "shop-extend",
                "category": "shop",
                "name": "建站 + 二次开发 + 插件 + 主题",
                "detail": "珠宝站是这个范围，客户打码。没写下总人日。",
                "days": null
              }
            ],
            "functionName": "功能合计",
            "serviceSum": "服务合计",
            "otherName": "其它合计",
            "contractName": "合同合计",
            "payName": "常见付款",
            "presets": [
              {
                "id": "domain",
                "name": "购买域名 1 年",
                "detail": "不需要就关掉。参考 80，以市场价为准。",
                "amount": 0
              },
              {
                "id": "server",
                "name": "购买服务器 1 年",
                "detail": "不需要就关掉。参考 1,500。一单用的是 2核4G。",
                "amount": 0
              },
              {
                "id": "filing",
                "name": "服务器备案",
                "detail": "不需要就关掉。参考 300，以市场价为准。",
                "amount": 0
              },
              {
                "id": "store",
                "name": "上架应用市场",
                "detail": "不需要就关掉。参考 300，以市场价为准。",
                "amount": 0
              },
              {
                "id": "print",
                "name": "第三方服务",
                "detail": "不需要就关掉。参考 500，以市场价为准。",
                "amount": 0
              },
              {
                "id": "design",
                "name": "专业设计",
                "detail": "不需要就关掉。参考 1,500，以市场价为准。",
                "amount": 0
              }
            ],
            "daysLabel": "总计工时",
            "daysUnit": "日",
            "daysHint": "按每人每日计。不满 22 日按日，满了按月加剩余日。写成 0 也出合计。关掉不进功能合计。",
            "daysInvalid": "工时写成数字，可以带一位小数。",
            "marketNote": "默认勾上。关掉不进合计，价格还能改。金额以市场价为准，仅供参考。",
            "addService": "加一项",
            "customName": "名称",
            "removeService": "拿掉",
            "valid": "有效期 15 天。这是参考，书面报价另出。",
            "hoursName": "工时（日）",
            "rateName": "单价",
            "calcName": "计算",
            "blankAmount": "这一项的金额不是数字，不进服务合计。",
            "yuanSuffix": "元",
            "notesTitle": "这一单里带着"
          },
          "rates": {
            "newClient": {
              "dayAmount": 600,
              "monthAmount": 12000,
              "day": "600",
              "month": "12,000"
            },
            "returning": {
              "dayAmount": 500,
              "monthAmount": 10000,
              "day": "500",
              "month": "10,000"
            }
          }
        }
      }
    }
  ] },
})];
