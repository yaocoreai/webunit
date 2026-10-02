import type { ViewportDefinition } from '@/platform/manifest';

export const themeViewport = {
  strategy: 'responsive',
  minWidth: 375,
} as const satisfies ViewportDefinition;
