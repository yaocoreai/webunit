import type { ContentsProvider } from '@/platform/theme/source/definition';

export const datasContents = (): ContentsProvider => ({
  kind: 'datas',
  async load({ runtime }) {
    const [{ createDatasContentSource }, { default: theme }] = await Promise.all([
      import('@/platform/theme/datas/source'),
      import('@/manifest'),
    ]);
    return createDatasContentSource(theme, runtime);
  },
});
