import { defineModuleReferenceData } from '../define/datas';

const file = (id: string) => defineModuleReferenceData('file', id);
const page = (id: string, _title?: string) => ({ type: 'module' as const, reference: 'module.page' as const, id, target: '_self' as const });
const covers = ['studio-cover', 'material-board', 'reading-room'] as const;
const imageAt = (index: number) => file(covers[index % covers.length]);
const icon = file('site-icon');
const kit = file('northstar-brand-kit');
const pager = {
  textMore: 'Load More',
  textLoading: 'Loading More',
  textFirst: 'First',
  textLast: 'Last',
  textPrev: 'Prev',
  textNext: 'Next',
} as const;

const child = (id: string, title: string, current = false) => ({
  id,
  link: page('features', title),
  current,
});

const categoryItems = [
  { id: 'all', link: page('features', 'All Items'), current: false, children: [] },
  {
    id: 'masking',
    link: page('features', 'Masking Tapes'),
    current: true,
    children: [
      child('high-temp', 'High-Temp Masking', true),
      child('auto-mask', 'Automotive Masking'),
      child('powder-mask', 'Powder Coat Masking'),
    ],
  },
  {
    id: 'foam',
    link: page('features', 'Foam Tapes'),
    current: false,
    children: [
      child('acrylic-foam', 'Acrylic Foam'),
      child('pe-foam', 'PE Foam'),
      child('eva-foam', 'EVA Foam'),
    ],
  },
  {
    id: 'gaffer',
    link: page('about', 'Gaffer Tapes'),
    current: false,
    children: [
      child('matte-gaffer', 'Matte Gaffer'),
      child('spike-gaffer', 'Spike Gaffer'),
      child('cloth-gaffer', 'Cloth Gaffer'),
    ],
  },
];

const listProducts = [
  { id: 'masking', title: 'High-Temp Masking Tape' },
  { id: 'foam', title: 'Acrylic Foam Tape' },
  { id: 'gaffer', title: 'Premium Gaffer Tape' },
  { id: 'tissue', title: 'Tissue Double-Sided Tape' },
  { id: 'pvc', title: 'PVC Wire Harness Tape' },
  { id: 'kraft', title: 'Kraft Packing Tape' },
  { id: 'filament', title: 'Fiberglass Filament Tape' },
  { id: 'duct', title: 'Cloth Duct Tape' },
  { id: 'crepe', title: 'General Purpose Crepe Tape' },
];

const listArticles = [
  { id: 'masking', title: 'High-Temperature Masking Tape Qualified for Automotive Refinish Lines', description: 'A solvent-resistant crepe construction held through a 160°C bake and released cleanly from clear coat. Repeat converting orders now share one incoming inspection spec.', date: '12 Mar 2025', category: 'Company News' },
  { id: 'foam', title: 'Malaysia Plant Adds Hot-Melt Coating Capacity', description: 'A second coating line is online for tissue and film tapes used in nameplates, foam gaskets and indoor mounting across converting plants.', date: '28 Feb 2025', category: 'Plant Update' },
  { id: 'gaffer', title: 'Matte Gaffer Tape Sample Packs Ship With Stage Specs', description: 'Low-glare cloth tapes now travel with residue tests, unwind settings and recommended spike colors for exhibition crews.', date: '14 Jan 2025', category: 'Product News' },
  { id: 'tissue', title: 'Release Liner Documentation Packs Ship With First Samples', description: 'Certificate of analysis, liner side maps and recommended unwind settings now travel with every sample set for overlay bonding.', date: '03 Dec 2024', category: 'Quality' },
  { id: 'filament', title: 'Export Packing Standard Updated for Ocean Freight', description: 'Moisture barriers, pallet patterns and carton marks were rewritten for 40-foot container loading on filament and kraft rolls.', date: '18 Nov 2024', category: 'Logistics' },
  { id: 'kraft', title: 'Kraft Packing Tape Passes Humidity Chamber Review', description: 'Paper backing held print and tack after a 48-hour humidity cycle used for Southeast Asia ocean freight lanes.', date: '02 Oct 2024', category: 'Lab Notes' },
];

const listCatalogs = [
  { id: 'masking', title: 'High-Temp Masking Tape', description: 'Crepe backing, rubber adhesive and bake-cycle data for automotive refinish and powder coating lines.' },
  { id: 'foam', title: 'Acrylic Foam Bonding Tape', description: 'Closed-cell foam constructions for nameplates, badges and exterior trim on painted metal.' },
  { id: 'gaffer', title: 'Premium Gaffer Tape', description: 'Matte cloth tape with clean removal notes for stage floors, cable runs and exhibition booths.' },
  { id: 'tissue', title: 'Tissue Double-Sided Tape', description: 'Thin carrier laminating tape for foam gaskets, overlays and indoor mounting on anodized aluminum.' },
  { id: 'filament', title: 'Fiberglass Filament Tape', description: 'Glass-yarn strapping data for carton sealing, pallet stabilization and export load units.' },
  { id: 'kraft', title: 'Kraft Packing Tape', description: 'Paper packing constructions with humidity-chamber notes for ocean freight cartons.' },
];

export function previewCategory1Section(id: string) {
  return {
    id,
    key: 'category-1',
    settings: {
      allSwitch: true,
      items: categoryItems,
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 0,
    },
    messages: {},
  };
}

export function previewCategory2Section(id: string) {
  return {
    id,
    key: 'category-2',
    settings: {
      allSwitch: true,
      items: categoryItems,
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 0,
    },
    messages: {},
  };
}

export function previewList1Section(id: string) {
  return {
    id,
    key: 'list-1',
    settings: {
      paginationTheme: 'Theme1',
      pageSetting: pager,
      buttons: [
        { id: 'inquire', link: page('contact', 'Inquire'), variant: 'danger', icon: null, option: 'button' },
        { id: 'view', link: page('features', 'View'), variant: 'default', icon: null, option: 'detail' },
      ],
      items: listProducts.map((item, index) => ({
        id: item.id,
        image: imageAt(index),
        title: item.title,
        link: page('features', item.title),
      })),
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 0,
    },
    messages: { imageAlt: 'Product image', empty: 'No Data' },
  };
}

export function previewList2Section(id: string) {
  return {
    id,
    key: 'list-2',
    settings: {
      paginationTheme: 'Theme1',
      pageSetting: pager,
      viewButton: 'Read More',
      items: listArticles.map((item, index) => ({
        id: item.id,
        image: imageAt(index),
        title: item.title,
        description: item.description,
        date: item.date,
        link: page('features', item.title),
      })),
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 0,
    },
    messages: { imageAlt: 'Article image', empty: 'No Data' },
  };
}

export function previewList3Section(id: string) {
  return {
    id,
    key: 'list-3',
    settings: {
      paginationTheme: 'Theme1',
      pageSetting: pager,
      previewIcon: icon,
      downloadIcon: icon,
      items: listCatalogs.map((item, index) => ({
        id: item.id,
        image: imageAt(index),
        title: item.title,
        description: item.description,
        file: kit,
      })),
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 0,
    },
    messages: { imageAlt: 'Catalog image', preview: 'Preview', download: 'Download', empty: 'No Data' },
  };
}

export function previewList4Section(id: string) {
  return {
    id,
    key: 'list-4',
    settings: {
      paginationTheme: 'Theme1',
      pageSetting: pager,
      viewButton: { link: page('features', 'View More'), variant: 'danger', icon: null },
      items: listArticles.map((item, index) => ({
        id: item.id,
        image: imageAt(index),
        title: item.title,
        description: item.description,
        date: item.date,
        category: item.category,
        link: page('features', item.title),
      })),
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Article image', empty: 'No Data' },
  };
}

export function previewSidebar1Section(id: string) {
  return {
    id,
    key: 'sidebar-1',
    settings: {
      title: 'Couldn’t Find Your Desired Product? Let’s Create It!',
      intro: 'We understand that every business has unique needs. If you can’t find the exact product you’re looking for, we’re here to help!',
      contactIntro: '* You will be directed to contact us page',
      contactButton: { link: page('contact', 'Contact Us Today'), variant: 'danger', icon: null },
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: {},
  };
}

export function previewSidebar5Section(id: string) {
  return {
    id,
    key: 'sidebar-5',
    settings: {
      items: [
        { id: 'masking', link: page('features', 'High-Temp Masking Tape for Bake Cycles') },
        { id: 'foam', link: page('features', 'Acrylic Foam Tape for Exterior Trim') },
        { id: 'gaffer', link: page('about', 'Matte Gaffer Tape for Stage Floors') },
        { id: 'tissue', link: page('features', 'Tissue Double-Sided Tape for Laminating') },
        { id: 'filament', link: page('contact', 'Filament Strapping Tape for Export Loads') },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 16,
    },
    messages: {},
  };
}
