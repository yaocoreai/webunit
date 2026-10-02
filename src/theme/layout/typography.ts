import type { Layout } from '@/platform/theme';

const fontFamilyVariables = {
  sans: 'var(--font-sans)',
  serif: 'var(--font-serif)',
} as const;

export function resolveTypographyStyle(settings: Layout['settings']) {
  const bodyFont = settings['fonts.body'] === 'serif' ? fontFamilyVariables.serif : fontFamilyVariables.sans;
  const headingFont = settings['fonts.display'] === 'sans' ? fontFamilyVariables.sans : fontFamilyVariables.serif;
  return [
    `--font-body:${bodyFont}`,
    `--font-heading:${headingFont}`,
  ].join(';');
}
