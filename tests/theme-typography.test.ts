import assert from 'node:assert/strict';
import test from 'node:test';
import type { Layout } from '@/platform/theme';
import { resolveTypographyStyle } from '@/theme/layout/typography';
import layoutDefinition from '@/theme/layout/setting';
import layoutData from '@/theme/datas/layout';
import { headingSizeTypography, typographyClassNames } from '@/theme/partials/text/typography';

test('Theme typography exposes stable semantic recipes', () => {
  assert.deepEqual(Object.keys(typographyClassNames), [
    'display',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'bodyLarge',
    'body',
    'bodySmall',
    'label',
    'caption',
    'eyebrow',
  ]);
  assert.deepEqual(headingSizeTypography, {
    medium: 'h3',
    large: 'h1',
    display: 'display',
  });
  assert.match(typographyClassNames.h1, /font-heading/);
  assert.match(typographyClassNames.body, /font-body/);
});

test('Layout typography maps only declared font families', () => {
  const settings = {
    'fonts.body': 'serif',
    'fonts.display': 'sans',
  } as Layout['settings'];
  assert.equal(
    resolveTypographyStyle(settings),
    '--font-body:var(--font-serif);--font-heading:var(--font-sans)',
  );

  assert.equal(
    resolveTypographyStyle({} as Layout['settings']),
    '--font-body:var(--font-sans);--font-heading:var(--font-serif)',
  );
});

test('Layout definition and Datas expose the same font defaults', () => {
  const bodyFont = layoutDefinition.settings.find((setting) => setting.id === 'fonts.body');
  const displayFont = layoutDefinition.settings.find((setting) => setting.id === 'fonts.display');
  assert.equal(bodyFont?.default, 'sans');
  assert.equal(displayFont?.default, 'sans');
  assert.equal(layoutData.settings['fonts.body'], bodyFont?.default);
  assert.equal(layoutData.settings['fonts.display'], displayFont?.default);
});
