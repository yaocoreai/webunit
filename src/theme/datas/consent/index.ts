import { defineConsentData, defineConsentDataTranslation } from '@/platform/datas';

const messages = {
  title: 'Privacy',
  description: 'This site does not ask for optional tracking.',
  acceptAll: 'Accept',
  rejectOptional: 'Reject',
  managePreferences: 'Preferences',
  savePreferences: 'Save',
  necessary: 'Necessary',
  analytics: 'Analytics',
  marketing: 'Marketing',
  preferences: 'Preferences',
  saleOfData: 'Sale of data',
};

export default defineConsentData({
  enabled: false,
  display: { mode: 'always' },
  privacyPolicy: { reference: 'module.page', id: 'privacy' },
  cookiePolicy: { reference: 'module.page', id: 'cookies' },
  version: 1,
  maxAgeDays: 180,
  messages,
});

export const translations = [defineConsentDataTranslation('zh', {
  title: '隐私',
  description: '这个站不请求可选追踪。',
  acceptAll: '接受',
  rejectOptional: '拒绝',
  managePreferences: '偏好',
  savePreferences: '保存',
  necessary: '必要',
  analytics: '分析',
  marketing: '营销',
  preferences: '偏好',
  saleOfData: '出售数据',
})];
