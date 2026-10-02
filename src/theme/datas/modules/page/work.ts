import { defineModuleEntryDataTranslation } from '@/platform/datas';

export const translations = [defineModuleEntryDataTranslation('zh', {
  fields: { title: "案例｜陈工不摸鱼工作室", description: "合作客户。案例和展示持续更新。为了保证客户的隐私，公开对外不直接展示客户的信息。" },
  slots: { 'page.main': [
    {
      "id": "work-case",
      "settings": {
        "mask": "合作客户",
        "h1": "案例",
        "lead": "案例和展示，持续更新。为了保证客户的隐私，公开对外不直接展示客户的信息。",
        "image": {
          "label": "西藏饰品文化独立站"
        },
        "placeholderCaption": "占位图",
        "name": "西藏饰品文化独立站",
        "summary": "这家店在 Shopify 上卖西藏饰品。",
        "facts": [
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
        "storyTitle": "找过别人，试过 AI，后来回来",
        "story": "有一次工作室没排上，他找了别人。店的付费率掉下去之后，他回来。10 分钟恢复本地留的版本，2 小时去掉没必要的插件，1 天做完迁移。他也自己用 AI 做过页面，主题对不上。能救回来，是源码在他自己手里。",
        "quote": "响应及时，有啥问题都能解决，价格便宜，靠谱。",
        "more": {
          "href": "/news/shopify-client",
          "label": "完整经过 ›"
        }
      }
    },
    {
      "id": "work-case-listed",
      "key": "work-case",
      "settings": {
        "mask": "",
        "h1": "",
        "lead": "",
        "image": {
          "label": "胶黏产品工厂官网"
        },
        "placeholderCaption": "占位图",
        "name": "胶黏产品工厂官网",
        "summary": "先做 Shopify 独立站，后面做官网。",
        "facts": [
          {
            "id": "fact-1",
            "label": "时间",
            "value": "2024 年起"
          },
          {
            "id": "fact-2",
            "label": "范围",
            "value": "Shopify 独立站、官网、智能体"
          },
          {
            "id": "fact-3",
            "label": "体量",
            "value": "3 个项目，二十多次需求"
          }
        ],
        "storyTitle": "始终找我",
        "story": "没找过别人。团队一直在学 AI 工作流，站点上的事仍丢给我。谷歌搜索等方面的问题，我配合他们落到站上。AI 什么都懂。干得好不好，得干这行的人来判断。AI 不是万能的。",
        "quote": "收费太便宜了吧。负责，有问题随时解决。",
        "more": {
          "href": "/news/listed-adhesive",
          "label": "完整经过 ›"
        }
      }
    },
    {
      "id": "work-case-patch",
      "key": "work-case",
      "settings": {
        "mask": "",
        "h1": "",
        "lead": "",
        "image": {
          "label": "测温贴配套 App"
        },
        "placeholderCaption": "占位图",
        "name": "测温贴配套 App",
        "summary": "医疗设备公司的测温贴。贴是硬件，我接到手机上。Android 和 iOS 都是我用原生写的。",
        "facts": [
          {
            "id": "fact-1",
            "label": "时间",
            "value": "2025 年起"
          },
          {
            "id": "fact-2",
            "label": "范围",
            "value": "原生 App，蓝牙硬件对接，Java 服务端"
          },
          {
            "id": "fact-3",
            "label": "体量",
            "value": "1 个项目，3 次需求"
          }
        ],
        "storyTitle": "他看完，惊呆了",
        "story": "测温贴是别人找我做的。硬件接到手机上，Android 和 iOS 都是原生。朋友把设计稿和页面放在一起看，他惊呆了。他另一个 App 被人做坏了。一出问题，第一个想到的是我。做坏的不是这单。",
        "quote": "我还原设计稿，就是非常还原。稿上什么样，页面上就是什么样。",
        "more": {
          "href": "/news/temp-patch",
          "label": "完整经过 ›"
        }
      }
    },
    {
      "id": "work-case-charter",
      "key": "work-case",
      "settings": {
        "mask": "",
        "h1": "",
        "lead": "",
        "image": {
          "label": "案例画面占位"
        },
        "placeholderCaption": "占位图",
        "name": "包车小程序",
        "summary": "谁都能打开，预约包车。选车型、去哪里、日期、人数。地图看路线，微信支付付款。",
        "facts": [
          {
            "id": "fact-1",
            "label": "时间",
            "value": "2024 年起"
          },
          {
            "id": "fact-2",
            "label": "范围",
            "value": "小程序，Java 服务端"
          },
          {
            "id": "fact-3",
            "label": "体量",
            "value": "3 个项目，十多次需求"
          }
        ],
        "storyTitle": "我出来接外包",
        "story": "我辞职出来接外包。前公司的技术总监把这活介绍过来。客户是做包车的公司老板。小程序我做的。大概三个月里做了 3 个小程序，包车是其中一个。技术能力强，后面才继续来。",
        "quote": "设计稿还原得很还原。使用体验快。高性能 Java 后端。技术能力强。",
        "more": {
          "href": "/news/charter",
          "label": "完整经过 ›"
        }
      }
    }
  ] },
})];
