export const typographyClassNames = {
  display: 'font-heading text-6xl font-bold leading-tight tracking-tight',
  h1: 'font-heading text-4xl font-semibold leading-tight tracking-tight',
  h2: 'font-heading text-3xl font-semibold leading-tight tracking-tight',
  h3: 'font-heading text-2xl font-semibold leading-tight tracking-tight',
  h4: 'font-heading text-xl font-semibold leading-snug',
  h5: 'font-heading text-lg font-semibold leading-snug',
  h6: 'font-heading text-base font-semibold leading-normal',
  bodyLarge: 'font-body text-lg font-normal leading-relaxed',
  body: 'font-body text-base font-normal leading-relaxed',
  bodySmall: 'font-body text-sm font-normal leading-normal',
  label: 'font-body text-sm font-semibold leading-normal',
  caption: 'font-body text-xs font-normal leading-normal',
  eyebrow: 'font-body text-xs font-semibold uppercase tracking-wide',
} as const;

export type Typography = keyof typeof typographyClassNames;

export const headingSizeTypography = {
  medium: 'h3',
  large: 'h1',
  display: 'display',
} as const satisfies Readonly<Record<string, Typography>>;

export const richTextTypographyClassName = [
  'font-body text-base leading-relaxed',
  '[&_.rich-text\\_\\_heading]:font-heading [&_.rich-text\\_\\_heading]:font-semibold [&_.rich-text\\_\\_heading]:tracking-tight',
  '[&_.rich-text\\_\\_heading--1]:text-4xl [&_.rich-text\\_\\_heading--1]:leading-tight',
  '[&_.rich-text\\_\\_heading--2]:text-3xl [&_.rich-text\\_\\_heading--2]:leading-tight',
  '[&_.rich-text\\_\\_heading--3]:text-2xl [&_.rich-text\\_\\_heading--3]:leading-tight',
  '[&_.rich-text\\_\\_heading--4]:text-xl [&_.rich-text\\_\\_heading--4]:leading-snug',
  '[&_.rich-text\\_\\_heading--5]:text-lg [&_.rich-text\\_\\_heading--5]:leading-snug',
  '[&_.rich-text\\_\\_heading--6]:text-base [&_.rich-text\\_\\_heading--6]:leading-normal',
].join(' ');
