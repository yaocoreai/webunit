import { defineModuleReferenceData } from '../define/datas';

const file = (id: string) => defineModuleReferenceData('file', id);
const covers = ['studio-cover', 'material-board', 'reading-room'] as const;
const imageAt = (index: number) => file(covers[index % covers.length]);
const contact = { type: 'module' as const, reference: 'module.page', id: 'contact', target: '_self' as const };
const about = { type: 'module' as const, reference: 'module.page', id: 'about', target: '_self' as const };
const features = { type: 'module' as const, reference: 'module.page', id: 'features', target: '_self' as const };
const linkTo = (id: 'contact' | 'about' | 'features', _title?: string) => ({
  type: 'module' as const,
  reference: 'module.page' as const,
  id,
  target: '_self' as const,
});

const nav = { previous: 'Previous', next: 'Next' } as const;

export function previewEn11Section(id: string) {
  return {
    id,
    key: 'en-11',
    settings: {
      enableCountup: true,
      items: [
        { id: 'founded', value: 2002, suffix: '', unit: 'yr', intro: 'Founded in Shanghai' },
        { id: 'listing', value: 2019, suffix: '', unit: 'yr', intro: 'Main Board Listing' },
        { id: 'countries', value: 110, suffix: '', unit: '+', intro: 'Serving Countries' },
        { id: 'land', value: 1, suffix: 'M', unit: '+', intro: 'Facility Land Area' },
        { id: 'employees', value: 4000, suffix: '', unit: '+', intro: 'Total Employees' },
        { id: 'customers', value: 26, suffix: 'K', unit: '+', intro: 'Serving Customers' },
      ],
      textColor: '#ffffff',
      gradient: { angle: 90, colorStart: '#2458B4', colorEnd: '#153270' },
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 0,
    },
    messages: {},
  };
}

export function previewEn12Section(id: string) {
  return {
    id,
    key: 'en-12',
    settings: {
      type: 'primary',
      number: 1,
      title: 'Adhesive Tapes Division',
      intro: 'YG adhesive tapes cover BOPP, duct, masking, PVC, high-performance industrial, wire harness, degradable and double-sided constructions for industrial and household converting.',
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 0,
    },
    messages: {},
  };
}

export function previewEn13Section(id: string) {
  return {
    id,
    key: 'en-13',
    settings: {
      type: 'left',
      image: file('studio-cover'),
      link: about,
      leftCard: { title1: 'China', title2: 'Factory 1', title3: 'OverseasBase' },
      rightCard: {
        title: 'Vietnam Adhes Packing Technology Corp,. Ltd.',
        intro: 'Land plot CN 1K, DEEP C 2B Industrial Zone, Dinh Vu Cat Hai Economic Zone, Dong Hai 2 ward, Hai An district, Hai Phong city, Vietnam',
        tips: [
          { id: 'visit', type: 'default', link: linkTo('about', 'Visit our') },
          { id: 'vietnam', type: 'link', link: features },
          { id: 'more', type: 'default', link: linkTo('contact', 'Site for more info') },
        ],
      },
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 0,
    },
    messages: { imageAlt: 'Factory image' },
  };
}

const tapeLinks = (prefix: string, titles: readonly string[]) => titles.map((title, index) => ({
  id: `${prefix}-${index + 1}`,
  link: linkTo(index % 2 === 0 ? 'features' : 'contact', title),
}));

export function previewEn14Section(id: string) {
  return {
    id,
    key: 'en-14',
    settings: {
      title: 'Automotive Industry Related Products',
      intro: 'Explore More Solutions for Automotive Applications',
      items: [
        { id: 'harness', title: 'Wire Harness Bundling', links: tapeLinks('h', ['PVC Wire Harness Tape', 'Cloth Harness Tape', 'PET Fleece Tape', 'Acetate Cloth Tape', 'Foam Harness Tape']) },
        { id: 'masking', title: 'Paint Masking', links: tapeLinks('m', ['Crepe Masking Tape', 'High-Temp Masking', 'Fine Line Tape', 'Polyester Masking', 'Washi Masking Tape']) },
        { id: 'bonding', title: 'Interior Bonding', links: tapeLinks('b', ['Tissue Double Sided', 'PET Double Sided', 'Acrylic Foam Tape', 'Hot Melt Film', 'Transfer Tape']) },
        { id: 'nvh', title: 'NVH and Sealing', links: tapeLinks('n', ['Butyl Sealing Tape', 'PVC Foam Tape', 'EPDM Sealing', 'Anti-Squeak Tape', 'Barrier Film']) },
        { id: 'protect', title: 'Surface Protection', links: tapeLinks('p', ['PE Protective Film', 'PU Protective Film', 'Carpet Protection', 'Paint Protection', 'Transit Film']) },
        { id: 'assembly', title: 'Assembly Aids', links: tapeLinks('a', ['Splicing Tape', 'Holding Tape', 'Identification Tape', 'Aluminum Foil Tape', 'Glass Cloth Tape']) },
      ],
      backgroundColor: '#f9f9f9',
      backgroundImage: null,
      paddingY: 48,
    },
    messages: {},
  };
}

export function previewEn15Section(id: string) {
  return {
    id,
    key: 'en-15',
    settings: {
      viewButton: { link: linkTo('features', 'Read More'), variant: 'link', icon: null },
      featured: {
        image: file('reading-room'),
        date: '12 Mar 2025',
        title: 'High-Temperature Masking Tape Qualified for Automotive Refinish Lines',
        intro: 'A solvent-resistant crepe construction held through a 160°C bake and released cleanly from clear coat. Repeat converting orders now share one incoming inspection spec.',
        link: features,
      },
      items: [
        { id: 'n1', image: file('studio-cover'), date: '28 Feb 2025', title: 'Malaysia Plant Adds Hot-Melt Coating Capacity', intro: 'A second coating line is online for tissue and film tapes used in nameplates, foam gaskets and indoor mounting.', link: about },
        { id: 'n2', image: file('material-board'), date: '14 Jan 2025', title: 'Release Liner Documentation Packs Ship With First Samples', intro: 'Certificate of analysis, liner side maps and recommended unwind settings now travel with every sample set.', link: contact },
        { id: 'n3', image: file('reading-room'), date: '03 Dec 2024', title: 'Export Packing Standard Updated for Ocean Freight', intro: 'Moisture barriers, pallet patterns and carton marks were rewritten for 40-foot container loading.', link: features },
      ],
      backgroundColor: '#f9f9f9',
      backgroundImage: null,
      paddingY: 48,
    },
    messages: { imageAlt: 'Article image' },
  };
}

export function previewEn16Section(id: string) {
  return {
    id,
    key: 'en-16',
    settings: {
      title: 'Certifications',
      intro: 'Shanghai Yongguan Adhesive Products Corp., Ltd.',
      tray: file('material-board'),
      arrow: file('site-icon'),
      interval: 0,
      images: Array.from({ length: 6 }, (_, index) => ({
        id: `cert-${index + 1}`,
        image: imageAt(index),
        icon: file('site-icon'),
      })),
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: { ...nav, imageAlt: 'Certificate' },
  };
}

export function previewEn17Section(id: string) {
  return {
    id,
    key: 'en-17',
    settings: {
      title: 'Eco Friendly Actions',
      intro: '“YG Group’s goal is to create eco-friendly and sustainable adhesive solutions that improve the work, products, and lives of our customers.”',
      iconPrefix: file('studio-cover'),
      iconSuffix: file('reading-room'),
      blacks: [
        { id: 'a1', number: '01', title: 'Sustainable Materials', intro: 'We prioritize eco-friendly, sustainable materials in our adhesives, balancing environmental responsibility with high performance.' },
        { id: 'a2', number: '02', title: 'Cleaner Coating', intro: 'Solvent recovery and hot-melt lines cut VOC load while keeping coat weight within the converting window.' },
        { id: 'a3', number: '03', title: 'Waste Reduction', intro: 'Slitting trim is collected for recycle streams, and carton specs avoid mixed plastics in export packs.' },
        { id: 'a4', number: '04', title: 'Partner Audits', intro: 'Incoming adhesive, liner and release tests are logged against every production lot before shipment.' },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: { imageAlt: 'Decoration' },
  };
}

export function previewEn18Section(id: string) {
  const inquire = { link: linkTo('contact', 'Inquire'), variant: 'danger' as const, icon: null };
  const products = [
    { id: 'p1', image: imageAt(0), title: 'High-Temp Masking Tape', intro: 'Crepe backing for 160°C bake cycles on automotive refinish lines.' },
    { id: 'p2', image: imageAt(1), title: 'Tissue Double-Sided Tape', intro: 'Thin carrier for nameplates, foam gaskets and indoor mounting.' },
    { id: 'p3', image: imageAt(2), title: 'PVC Wire Harness Tape', intro: 'Flexible PVC for bundling and abrasion protection in engine bays.' },
    { id: 'p4', image: imageAt(0), title: 'Acrylic Foam Tape', intro: 'Structural bonding for trims, badges and exterior attachments.' },
  ];
  return {
    id,
    key: 'en-18',
    settings: {
      title: 'Related Products',
      intro: 'Explore More Similar Products of YG Group',
      products: products.map((product) => ({
        ...product,
        inquire,
        detail: { link: linkTo('features', 'View'), variant: 'default' as const, icon: null },
      })),
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: { imageAlt: 'Product image', empty: 'No Data' },
  };
}

export function previewEn19Section(id: string) {
  return {
    id,
    key: 'en-19',
    settings: {
      enableCountup: true,
      items: [
        { id: 's1', image: file('site-icon'), value: 50, suffix: 'K', unit: '+', intro: 'Plant area m²' },
        { id: 's2', image: file('site-icon'), value: 200, suffix: '', unit: '+', intro: 'Coating lines' },
        { id: 's3', image: file('site-icon'), value: 30, suffix: '', unit: '+', intro: 'Export countries' },
        { id: 's4', image: file('site-icon'), value: 10, suffix: 'K', unit: '+', intro: 'SKUs converted' },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 0,
    },
    messages: { imageAlt: 'Stat icon' },
  };
}

export function previewEn20Section(id: string) {
  const intro = 'The division coats, slits and converts adhesive constructions for labels, graphic films, medical and hygiene partners. Incoming inspection, coat-weight control and export packing sit on one accountable production platform from sample roll to container.';
  return {
    id,
    key: 'en-20',
    settings: {
      title: 'Business Divisions',
      arrow: file('site-icon'),
      interval: 0,
      items: [
        { id: 'd1', image: imageAt(0), title: 'Adhesive Tapes', intro, link: features },
        { id: 'd2', image: imageAt(1), title: 'Release Liners', intro, link: about },
        { id: 'd3', image: imageAt(2), title: 'Specialty Films', intro, link: contact },
        { id: 'd4', image: imageAt(0), title: 'Medical Materials', intro, link: features },
        { id: 'd5', image: imageAt(1), title: 'Converting Services', intro, link: about },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 0,
    },
    messages: { ...nav, imageAlt: 'Division image' },
  };
}
