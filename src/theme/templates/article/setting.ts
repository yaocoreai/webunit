import { defineTemplate } from '@/platform/theme';

export default defineTemplate({
  label: 'Article',
  settings: [
    { type: 'text', id: 'backLabel', label: 'Back label', locale: true, default: '' },
    { type: 'textarea', id: 'end', label: 'End note', locale: true, default: '' },
    { type: 'text', id: 'nextLabel', label: 'Next label', locale: true, default: '' },
    { type: 'text', id: 'nextSep', label: 'Next separator', locale: true, default: '' },
  ],
  messages: {},
  slots: [
    { key: 'page.main', label: 'Main', scope: 'page', groups: ['article'], min: 1, max: 1 },
  ],
});
