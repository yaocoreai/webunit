import { defineModuleReferenceData } from '../define/datas';

const file = (id: string) => defineModuleReferenceData('file', id);
const covers = ['studio-cover', 'material-board', 'reading-room'] as const;
const imageAt = (index: number) => file(covers[index % covers.length]);
const page = (id: string, _title?: string) => ({ type: 'module' as const, reference: 'module.page', id, target: '_self' as const });
const catalog = (_title?: string) => ({ type: 'module' as const, reference: 'module.catalog', id: 'products', target: '_self' as const });
const article = (_title?: string) => ({ type: 'module' as const, reference: 'module.article', id: 'materials-guide', target: '_self' as const });
const inquire = page('contact', 'Inquire');
const viewMore = page('features', 'View More');
const contact = page('contact', 'Talk to Our Team');
const explore = page('features', 'Explore Products');
const latestNews = page('about', 'View latest news >');
const danger = { variant: 'danger' as const, icon: null };

const news = [
  { id: 'n1', image: file('studio-cover'), date: '2025-09-22', title: 'China Import and Export Fair 2026', intro: 'The Canton Fair booth will show masking, foam and graphic film constructions for converters visiting from Southeast Asia.', link: article('China Import and Export Fair 2026') },
  { id: 'n2', image: file('material-board'), date: '2025-08-14', title: 'New High-Temperature Masking Line', intro: 'A 160°C crepe masking tape is now in regular production with incoming adhesive inspection on every lot.', link: article('New High-Temperature Masking Line') },
  { id: 'n3', image: file('reading-room'), date: '2025-07-03', title: 'Release Liner Recommendation Guide', intro: 'A practical note on glassine, PET and CCK liners for label and tape converters choosing a construction.', link: article('Release Liner Recommendation Guide') },
  { id: 'n4', image: file('studio-cover'), date: '2025-05-18', title: 'ISO Audit Completed for Coating Lines', intro: 'Incoming materials, coat weight and release force logs were reviewed against the current quality plan.', link: article('ISO Audit Completed for Coating Lines') },
  { id: 'n5', image: file('material-board'), date: '2025-03-09', title: 'Graphic Films for Vehicle Wrapping', intro: 'Color, texture and fluorescent films are available from glossy to super matt for fleet and retail work.', link: article('Graphic Films for Vehicle Wrapping') },
  { id: 'n6', image: file('reading-room'), date: '2025-01-21', title: 'Double-Sided Tissue Tape Sample Pack', intro: 'Nameplate, foam gasket and indoor mounting samples ship with a technical data sheet in the first carton.', link: article('Double-Sided Tissue Tape Sample Pack') },
] as const;

const attributes = (adhesive: string, thickness: string, backing: string, color: string) => [
  { id: 'adhesive', key: 'adhesive', value: adhesive },
  { id: 'thickness', key: 'thickness', value: thickness },
  { id: 'backing', key: 'backing', value: backing },
  { id: 'color', key: 'color', value: color },
];

export function previewEn43Section(id: string) {
  return {
    id,
    key: 'en-43',
    settings: {
      fullWidth: true,
      layout: 'content-left',
      image: file('studio-cover'),
      title: 'Automotive',
      titleTag: 'h1',
      intro: 'Glossy, matt and protective surfaces for vehicles. With comprehensive material and processing expertise, YG Group is a reliable partner for automotive customers—from the initial idea to the final product design.',
      contentBackgroundColor: '#1f2a68',
      contentBackgroundImage: null,
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 0,
    },
    messages: { imageAlt: 'Section image' },
  };
}

export function previewEn44Section(id: string) {
  const files = (prefix: string, count: number) => Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    file: file('northstar-brand-kit'),
    name: index % 2 === 0 ? 'Car Wrapping Materials' : 'Technical Data Sheet',
    desc: 'PDF, 2281 Kb, 9 Pages',
  }));
  return {
    id,
    key: 'en-44',
    settings: {
      showHeader: true,
      groups: [
        { id: 'technical', title: 'Technical documents', files: files('tech', 6) },
        { id: 'certificates', title: 'Certificates', files: files('cert', 3) },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: { download: 'Download', empty: 'No documents available' },
  };
}

export function previewEn45Section(id: string) {
  const item = (
    key: string,
    title: string,
    intro: string,
    category: string,
    adhesive: string,
    thickness: string,
    backing: string,
    color: string,
    imageIndex: number,
  ) => ({
    id: key,
    image: imageAt(imageIndex),
    title,
    intro,
    link: catalog(title),
    category,
    attributes: attributes(adhesive, thickness, backing, color),
  });
  return {
    id,
    key: 'en-45',
    settings: {
      title: 'Products',
      titleTag: 'h2',
      subtitle: 'Find the right adhesive tape for your industrial application',
      searchPlaceholder: 'Search our product assortment',
      searchButtonText: 'Search',
      categories: [
        { id: 'all', label: 'All Products', value: 'all' },
        { id: 'masking', label: 'Masking Tapes', value: 'masking' },
        { id: 'foam', label: 'Foam Tapes', value: 'foam' },
      ],
      filter: { title: 'Filter', clearText: 'clear all', byAttributesText: 'by construction attributes' },
      rangeFields: [
        { id: 'thickness', key: 'thickness', label: 'Total Thickness', min: 0, max: 1200, unit: 'um' },
      ],
      selectFields: [
        {
          id: 'color',
          key: 'color',
          label: 'Color',
          options: [
            { id: 'red', label: 'Red', value: 'Red' },
            { id: 'black', label: 'Black', value: 'Black' },
            { id: 'white', label: 'White', value: 'White' },
            { id: 'transparent', label: 'Transparent', value: 'Transparent' },
          ],
        },
        {
          id: 'adhesive',
          key: 'adhesive',
          label: 'Adhesive Type',
          options: [
            { id: 'rubber', label: 'Rubber', value: 'Rubber' },
            { id: 'acrylic', label: 'Acrylic', value: 'Acrylic' },
          ],
        },
      ],
      headers: [
        { id: 'adhesive', key: 'adhesive', label: 'Adhesive Type' },
        { id: 'thickness', key: 'thickness', label: 'Total Thickness' },
        { id: 'backing', key: 'backing', label: 'Backing Material' },
        { id: 'color', key: 'color', label: 'Color' },
      ],
      products: [
        item('p1', 'High-Temperature Masking Tape', 'Crepe masking tape for automotive refinish bake cycles.', 'masking', 'Rubber', '50', 'Crepe', 'Red', 0),
        item('p2', 'General Purpose Masking Tape', 'Indoor painting lines with clean removal from clear coat.', 'masking', 'Rubber', '80', 'Crepe', 'Black', 1),
        item('p3', 'PET Masking Film Tape', 'Thin PET film masking for powder coating jigs.', 'masking', 'Acrylic', '30', 'PET', 'Transparent', 2),
        item('p4', 'Fine Line Masking Tape', 'Sharp paint edges on curves and body lines.', 'masking', 'Rubber', '120', 'Crepe', 'Red', 0),
        item('p5', 'EPDM Closed-Cell Foam Tape', 'Single sided foam tape for sealing and cushioning.', 'foam', 'Rubber', '700', 'Foam', 'Black', 1),
        item('p6', 'Acrylic Foam Mounting Tape', 'Interior nameplates and trim mounting without mechanical fasteners.', 'foam', 'Acrylic', '1000', 'Foam', 'White', 2),
        item('p7', 'Thin Foam Gasket Tape', 'Die-cut gaskets for electronics housings.', 'foam', 'Rubber', '150', 'Foam', 'White', 0),
        item('p8', 'High-Bond Foam Tape', 'Structural bonding of emblems and exterior trim.', 'foam', 'Acrylic', '900', 'Foam', 'Black', 1),
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: {
      productColumn: 'Product',
      imageAlt: 'Product image',
      empty: 'No matching products',
      paginationPreview: 'Preview only. Pagination is not wired.',
    },
  };
}

export function previewEn46Section(id: string) {
  return {
    id,
    key: 'en-46',
    settings: {
      image: file('material-board'),
      direction: 'right',
      title: 'Graphic films for limitless creativity',
      titleTag: 'h3',
      intro: 'YG Group offers a wide range of films for car wrapping, covering different colors, textures and functions. The product range includes numerous color variations as well as special films with a carbon look or fluorescent versions for eye-catching effects.\nThe films are available for surfaces ranging from glossy to matt and super matt (black), for a wide variety of vehicle designs.',
      actions: [
        { id: 'products', link: page('features', 'To Product Selection'), variant: 'danger', icon: file('site-icon') },
        { id: 'contact', link: inquire, variant: 'danger', icon: file('site-icon') },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Section image' },
  };
}

export function previewEn47Section(id: string) {
  const slide = (key: string, title: string, imageIndex: number) => ({
    id: key,
    image: imageAt(imageIndex),
    title,
    link: catalog(title),
    content1: '• Crepe paper backing\n• Rubber / resin adhesive\n• Clean removal after bake',
    content2: '• Automotive refinish\n• Powder coating\n• Industrial painting lines',
    content3: '• 160°C / 1 hour\n• Elongation 8%\n• Tensile 85 N/25mm',
  });
  return {
    id,
    key: 'en-47',
    settings: {
      title: 'Our five safe bet paper tapes',
      titleTag: 'h2',
      detail1Title: 'Product Composition',
      detail2Title: 'Applications',
      detail3Title: 'Typical Values',
      list: [
        slide('s1', 'Bio-based Paper Packaging Tape', 0),
        slide('s2', 'High-Temperature Masking Tape', 1),
        slide('s3', 'General Purpose Masking Tape', 2),
      ],
      arrow: file('site-icon'),
      backgroundColor: '#f8f8f8',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { previous: 'Previous slide', next: 'Next slide', imageAlt: 'Product image' },
  };
}

export function previewEn48Section(id: string) {
  return {
    id,
    key: 'en-48',
    settings: {
      title: 'Ready to Discuss Your Project?',
      titleTag: 'h2',
      intro: 'Send us your application requirements and our team will recommend the right solution for your market and usage scenario.',
      actions: [
        { id: 'talk', link: contact, ...danger },
        { id: 'explore', link: explore, ...danger },
      ],
      containerBackgroundColor: '#f8f8f8',
      containerBackgroundImage: null,
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 48,
    },
    messages: {},
  };
}

export function previewEn49Section(id: string) {
  return {
    id,
    key: 'en-49',
    settings: {
      image: file('studio-cover'),
      title: 'Industry Insights',
      titleTag: 'h2',
      intro: 'Application notes, coating-line updates and converting guidance for tape and liner buyers.',
      link: article('Industry Insights'),
      tabs: [
        { id: 'all', label: 'All Articles', link: page('about', 'All Articles') },
        { id: 'insights', label: 'Industry Insights', link: page('about', 'Industry Insights') },
        { id: 'updates', label: 'Product Updates', link: page('features', 'Product Updates') },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 48,
    },
    messages: { imageAlt: 'Category banner' },
  };
}

export function previewEn50Section(id: string) {
  return {
    id,
    key: 'en-50',
    settings: {
      title: 'Industry Insights',
      titleTag: 'h2',
      viewMore: { link: viewMore, ...danger },
      items: news,
      bottomLink: latestNews,
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Article image' },
  };
}

export function previewEn51Section(id: string) {
  return {
    id,
    key: 'en-51',
    settings: {
      title: 'Product Updates',
      titleTag: 'h2',
      viewMore: { link: viewMore, ...danger },
      image: file('material-board'),
      items: news.slice(0, 4).map(({ id: itemId, title, intro, link }) => ({ id: itemId, title, intro, link })),
      bottomLink: latestNews,
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Highlight image' },
  };
}

export function previewEn52Section(id: string) {
  return {
    id,
    key: 'en-52',
    settings: {
      title: 'Company News',
      titleTag: 'h2',
      viewMore: { link: viewMore, ...danger },
      items: news.slice(0, 4),
      bottomLink: latestNews,
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Article image' },
  };
}
