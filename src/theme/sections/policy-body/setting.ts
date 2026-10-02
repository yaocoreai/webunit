import { defineSection } from '@/platform/theme';

export default defineSection({
  label: 'Policy',
  groups: ['page'],
  settings: [
    { type: 'text', id: 'h1', label: 'Heading', locale: true, default: '' },
    { type: 'textarea', id: 'lead', label: 'Lead', locale: true, default: '' },
    {
      type: 'array',
      id: 'paragraphs',
      label: 'Paragraphs',
      default: [],
      items: {
        type: 'object',
        fields: [
          { type: 'textarea', id: 'text', label: 'Text', locale: true, default: '' },
        ],
      },
    },
  ],
  messages: {},
});
