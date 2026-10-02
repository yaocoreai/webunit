import { defineLayout } from '@/platform/theme';

export default defineLayout({
  label: 'Studio',
  settings: [
    { type: 'color', id: 'colors.background', label: 'Page background', default: '#ffffff' },
    { type: 'color', id: 'colors.foreground', label: 'Body color', default: '#1d1d1f' },
    { type: 'color', id: 'colors.accent', label: 'Accent color', default: '#0066cc' },
    { type: 'color', id: 'colors.surface', label: 'Surface color', default: '#f5f5f7' },
    { type: 'select', id: 'fonts.body', label: 'Body font', default: 'sans', options: [{ label: 'Sans serif', value: 'sans' }, { label: 'Serif', value: 'serif' }] },
    { type: 'select', id: 'fonts.display', label: 'Display font', default: 'sans', options: [{ label: 'Sans serif', value: 'sans' }, { label: 'Serif', value: 'serif' }] },
    { type: 'text', id: 'brandName', label: 'Brand name', locale: true, default: '陈工不摸鱼' },
  ],
  messages: {
    'notice.preview': 'You are previewing an unpublished theme copy',
    'site.skipToContent': 'Skip to content',
  },
  slots: [
    { key: 'layout.header', label: 'Site header', scope: 'layout', groups: ['site-header'], min: 1, max: 1 },
    { key: 'layout.footer', label: 'Site footer', scope: 'layout', groups: ['site-footer'], min: 1, max: 1 },
  ],
});
