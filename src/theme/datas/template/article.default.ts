import { defineTemplateData, defineTemplateDataTranslation } from '@/platform/datas';

export default defineTemplateData({
  id: 'article.default',
  settings: {
  "backLabel": "Notes",
  "end": "Linework Studio. Yubei, Chongqing.",
  "nextLabel": "Next",
  "nextSep": ": "
},
  messages: {},
  slots: {},
});

export const translations = [defineTemplateDataTranslation('zh', {
  settings: {
  "backLabel": "资讯",
  "end": "陈工不摸鱼工作室。重庆渝北。",
  "nextLabel": "下一篇",
  "nextSep": "："
},
})];
