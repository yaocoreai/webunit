import { defineModuleEntryDataTranslation } from '@/platform/datas';

export const translations = [defineModuleEntryDataTranslation('zh', {
  fields: { title: "服务｜陈工不摸鱼工作室", description: "还在找的话，往下看看。或许有一件对得上你现在的事。" },
  slots: { 'page.main': [
    {
      "id": "services-body",
      "settings": {
        "h1": "服务",
        "lead": "还在找的话，往下看看。或许有一件对得上你现在的事。",
        "customTitle": "定制开发",
        "custom": [
          {
            "id": "custom-1",
            "text": "官网"
          },
          {
            "id": "custom-2",
            "text": "智能体"
          },
          {
            "id": "custom-3",
            "text": "独立站"
          },
          {
            "id": "custom-4",
            "text": "App"
          },
          {
            "id": "custom-5",
            "text": "小程序"
          },
          {
            "id": "custom-6",
            "text": "管理系统"
          }
        ],
        "customNote": "建站、二次开发、插件、主题都做。天数按这一单估。",
        "agentTitle": "工作室智能体",
        "agentLead": "你有更多的时间处理交付。选题、写稿、报价、合同、原型，五个岗位分开接。全程跟 AI 聊，AI 替你干，相当于请了 5 个助理。聊哪一步，出哪一件。私信来的客户收得住，下一篇发什么也有数。",
        "rolesTitle": "五个岗位，各干一件",
        "roles": [
          {
            "id": "role-1",
            "name": "运营",
            "detail": "定下一篇，并验收稿"
          },
          {
            "id": "role-2",
            "name": "售前",
            "detail": "需求、报价、合同一次对齐"
          },
          {
            "id": "role-3",
            "name": "产品",
            "detail": "方案，和能点开的原型"
          },
          {
            "id": "role-4",
            "name": "写手",
            "detail": "一篇稿，拆成能发的版本"
          },
          {
            "id": "role-5",
            "name": "官网开发",
            "detail": "发得快，AI 自动维护，不用懂代码"
          }
        ],
        "stepsTitle": "聊一步，出一件",
        "steps": [
          {
            "id": "step-1",
            "name": "选题",
            "detail": "还没想好发什么，先定下一篇。"
          },
          {
            "id": "step-2",
            "name": "素材",
            "detail": "能写出去的事实，先挑出来。"
          },
          {
            "id": "step-3",
            "name": "写稿",
            "detail": "收成一篇能发出去的稿。"
          },
          {
            "id": "step-4",
            "name": "平台分发",
            "detail": "一篇拆成各平台要发的版本。"
          },
          {
            "id": "step-5",
            "name": "线索",
            "detail": "私信来一个客户，就开一条。需求、报价、方案、原型、合同从这里出。哪篇带来了客户，复盘对得上。"
          },
          {
            "id": "step-6",
            "name": "需求文档",
            "detail": "客户要什么，写成一份能对着改的文档。"
          },
          {
            "id": "step-7",
            "name": "需求报价",
            "detail": "按这份需求算出天数和价。"
          },
          {
            "id": "step-8",
            "name": "产品文档",
            "detail": "接在需求文档后面。按产品把功能再拆细，写清每一块怎么落地。"
          },
          {
            "id": "step-9",
            "name": "产品报价",
            "detail": "按方案报价，和需求报价同一套单价。"
          },
          {
            "id": "step-10",
            "name": "合同模版",
            "detail": "范围写进合同，签之前看得清。"
          },
          {
            "id": "step-11",
            "name": "产品原型",
            "detail": "有产品清单，才按每个终端出说明，并做出能点的原型。"
          },
          {
            "id": "step-12",
            "name": "官网",
            "detail": "不用懂代码。发布很快，上线之后 AI 自动维护。"
          },
          {
            "id": "step-13",
            "name": "合规",
            "detail": "这一单的含税和发票，算清、写清。依法纳税。"
          }
        ],
        "teach": "选题、报价、合同，照着步骤，你自己就能做。",
        "fitTitle": "自己能把活交出去，就用得上",
        "fit": [
          {
            "id": "fit-1",
            "text": "自己接单的开发"
          },
          {
            "id": "fit-2",
            "text": "自己接单的设计"
          },
          {
            "id": "fit-3",
            "text": "已经在交付的工作室"
          }
        ],
        "includedTitle": "买工作室智能体送",
        "included": [
          {
            "id": "included-1",
            "text": "全套运营教案"
          },
          {
            "id": "included-3",
            "text": "同行社群"
          },
          {
            "id": "included-4",
            "text": "始终获得最新的工作室智能体版本"
          }
        ],
        "agentNote": "600 元/天、12,000 元/月是定制开发的价。智能体的价，请联系我们。",
        "price": {
          "href": "/price/",
          "label": "看价格 ›"
        },
        "courseTitle": "全套运营教案",
        "courseLead": "买工作室智能体，送这份教案。教你把这套商业模式自己落地。定位、结构、利润、内容、成交、交付、合规，按顺序讲完。你来开，你来接，你来交。",
        "lessonsTitle": "落地顺序",
        "lessons": [
          {
            "id": "lesson-1",
            "name": "定位",
            "detail": "门脸写网站都做，开发成本全公开。"
          },
          {
            "id": "lesson-2",
            "name": "结构",
            "detail": "报价里没有销售、没有办公室、没有固定编制。单价公开，含税。"
          },
          {
            "id": "lesson-7",
            "name": "利润",
            "detail": "不是活便宜，是结构便宜。谁来都是这个数，老客户价只给复购。不满 22 天按天，满 22 天按月。工作室加上 AI，写以前要一个团队写的站。依法纳税。"
          },
          {
            "id": "lesson-3",
            "name": "内容",
            "detail": "选题、写稿、分到各平台，月底复盘。内容把人带来。"
          },
          {
            "id": "lesson-4",
            "name": "成交",
            "detail": "私信来一个客户，需求、报价、合同一次对齐。"
          },
          {
            "id": "lesson-5",
            "name": "交付",
            "detail": "源码和文档交给客户。每周进度看得到。负责人不换。"
          },
          {
            "id": "lesson-6",
            "name": "合规",
            "detail": "这一单的含税写清。依法纳税。"
          }
        ],
        "courseFitTitle": "想自己落地，就用得上",
        "courseFit": [
          {
            "id": "course-fit-1",
            "text": "已经在接单，想收成一套的人"
          },
          {
            "id": "course-fit-2",
            "text": "内容、报价、合同还散着的工作室"
          }
        ],
        "courseNote": "买工作室智能体送。",
        "contact": {
          "href": "/contact/",
          "label": "联系我们 ›"
        }
      }
    }
  ] },
})];
