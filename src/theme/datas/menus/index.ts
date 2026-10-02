import { defineMenuData } from '@/platform/datas';

const item = <const TId extends string>(id: TId) => ({
  id,
  link: { type: 'module' as const, reference: 'module.page' as const, id, target: '_self' as const },
  fields: {},
  children: [] as const,
});

export default defineMenuData({
  'main-menu': {
    id: '40000000-0000-4000-8000-000000000001',
    remark: 'Main menu',
    items: ['home', 'work', 'services', 'price', 'news', 'contact', 'open'].map(item),
  },
});

export const translations = [];
