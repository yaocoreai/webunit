import { defineTemplate } from '@/platform/theme';

export default defineTemplate({
  label: 'Page',
  settings: [],
  messages: {},
  slots: [
    { key: 'page.main', label: 'Main', scope: 'page', groups: ['page'], min: 1 },
  ],
});
