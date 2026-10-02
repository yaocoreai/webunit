import { defineModuleEntryData, defineModuleReferenceData } from '../define/datas';

const paginationEntryCount = 24;

const previewBanner = {
  key: 'banner',
  settings: {
    displayRatio: '3 / 1',
    arrow: null,
    arrowOffset: 0,
    interval: 0,
    slides: [{
      id: 'preview-slide',
      image: defineModuleReferenceData('file', 'studio-cover'),
      mobileImage: null,
      video: null,
      mediaLink: null,
      layout: 'left-center',
      texts: [
        { id: 'title', text: 'Premium Tape Collection', tag: 'h1', color: '#ffffff', typography: 'display', widthPercent: 100 },
        { id: 'body', text: 'Discover our high-quality tape products designed for durability, precision, and versatility.', tag: 'span', color: '#ffffff', typography: 'body', widthPercent: 100 },
      ],
      textGap: 12,
      textButtonGap: 24,
      actions: [
        { id: 'shop', link: { type: 'module', reference: 'module.page', id: 'features', target: '_self' }, variant: 'primary', icon: null },
        { id: 'learn', link: { type: 'module', reference: 'module.page', id: 'about', target: '_self' }, variant: 'default', icon: null },
      ],
    }],
  },
  messages: {
    previous: 'Previous slide',
    next: 'Next slide',
    pagination: 'Choose a slide',
    slide: 'Slide',
    imageAlt: 'Banner image',
    empty: 'No banner slides',
  },
} as const;

type TestingEntryOptions = Readonly<{
  moduleKey: string;
  title: string;
  description: string;
  parentId?: string;
  kind?: 'page' | 'model';
  fields?: (index: number) => Readonly<Record<string, unknown>>;
}>;

export function previewBannerSection(id: string) {
  return { id, ...previewBanner };
}

export function defineTestingEntries(options: TestingEntryOptions) {
  return Object.fromEntries(Array.from({ length: paginationEntryCount }, (_, offset) => {
    const index = offset + 1;
    const suffix = String(index).padStart(2, '0');
    const id = `testing-${suffix}`;
    return [id, defineModuleEntryData({
      id,
      ...(options.parentId ? { parentId: options.parentId } : {}),
      ...(options.kind === 'model'
        ? {}
        : {
            routeKey: `/testing-${suffix}`,
            slots: {
              'page.main': [{ id: `${options.moduleKey}-${id}-banner`, ...previewBanner }],
            },
          }),
      fields: {
        title: `${options.title} ${suffix}`,
        description: `${options.description} Pagination testing entry ${index} of ${paginationEntryCount}.`,
        image: defineModuleReferenceData('image', index % 2 === 0 ? 'material-board' : 'studio-cover'),
        ...options.fields?.(index),
      },
    })];
  }));
}
