import { defineTemplateData, defineTemplateDataTranslation } from '@/platform/datas';

export default defineTemplateData({
  id: 'error.default',
  settings: { showStatus: true, description: 'This address has no page.', notFoundTitle: 'No page here', notFoundBody: 'Back to the home page.', homeLabel: 'Home', homeHref: '/' },
  messages: {},
  slots: {},
});

export const translations = [defineTemplateDataTranslation('zh', {
  settings: { description: '这个地址没有页面。', notFoundTitle: '没有这一页', notFoundBody: '回到首页。', homeLabel: '首页' },
  messages: {
    requestId: '请求 ID',
    'code.default': '出现了一些问题',
    'code.400': '请求无效',
    'code.401': '需要登录',
    'code.403': '无权访问',
    'code.404': '没有这一页',
    'code.405': '请求方法不允许',
    'code.429': '请求过于频繁',
    'code.500': '服务器内部错误',
    'code.502': '网关错误',
    'code.503': '服务暂不可用',
    'code.504': '网关超时',
  },
})];
