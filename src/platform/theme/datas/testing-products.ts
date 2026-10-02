import { defineModuleReferenceData } from '../define/datas';

const file = (id: string) => defineModuleReferenceData('file', id);
const covers = ['studio-cover', 'material-board', 'reading-room'] as const;
const imageAt = (index: number) => file(covers[index % covers.length]);
const inquire = { type: 'module' as const, reference: 'module.page', id: 'contact', target: '_self' as const };
const viewMore = { type: 'module' as const, reference: 'module.page', id: 'features', target: '_self' as const };
const contactUs = { type: 'module' as const, reference: 'module.page', id: 'contact', target: '_self' as const };
const catalog = { type: 'module' as const, reference: 'module.catalog', id: 'products', target: '_blank' as const };
const sample = { type: 'module' as const, reference: 'module.page', id: 'contact', target: '_self' as const };
const tds = { type: 'module' as const, reference: 'module.catalog', id: 'products', target: '_self' as const };

const media = (count: number, prefix: string) => Array.from({ length: count }, (_, index) => ({
  id: `${prefix}-${index + 1}`,
  image: imageAt(index),
  video: index === 1 ? file('demo-video') : null,
}));

const productMessages = {
  previous: 'Previous image',
  next: 'Next image',
  imageAlt: 'Product image',
} as const;

export function previewProduct1Section(id: string) {
  return {
    id,
    key: 'product-1',
    settings: {
      image: file('studio-cover'),
      title: 'Industrial Masking Tape for High-Temperature Painting',
      intro: 'A solvent-resistant masking tape designed for automotive refinish, powder coating and industrial painting lines. The crepe backing conforms to curves while the adhesive releases cleanly after bake cycles.',
      actions: [
        { id: 'inquire', link: inquire, variant: 'danger', icon: null },
        { id: 'more', link: viewMore, variant: 'default', icon: null },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 0,
    },
    messages: { imageAlt: 'Product image' },
  };
}

export function previewProduct2Section(id: string) {
  return {
    id,
    key: 'product-2',
    settings: {
      image: file('material-board'),
      title: 'Double-Sided Tissue Tape for Laminating and Mounting',
      intro: 'A high-tack tissue tape for nameplates, foam gaskets and indoor mounting. The thin carrier keeps assemblies compact without sacrificing peel strength.',
      usedTitle: 'Mainly used in fields such as',
      applications: [
        { id: 'office', label: 'Office Supplies' },
        { id: 'electronics', label: 'Electronics Assembly' },
        { id: 'signage', label: 'Nameplates and Signage' },
      ],
      actions: [
        { id: 'inquire', link: inquire, variant: 'danger', icon: null },
        { id: 'more', link: viewMore, variant: 'default', icon: null },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 0,
    },
    messages: { imageAlt: 'Product image' },
  };
}

export function previewProduct3Section(id: string) {
  return {
    id,
    key: 'product-3',
    settings: {
      media: media(8, 'p3'),
      arrow: file('site-icon'),
      interval: 0,
      title: 'Industrial Masking Tape for High-Temperature Painting',
      description: 'A solvent-resistant masking tape designed for automotive refinish, powder coating and industrial painting lines. The crepe backing conforms to curves while the adhesive releases cleanly after bake cycles.',
      applicationLabel: 'Application:',
      applications: [
        { id: 'auto', label: 'Automotive refinish' },
        { id: 'powder', label: 'Powder coating' },
        { id: 'paint', label: 'Industrial painting lines' },
      ],
      contact: { link: contactUs, variant: 'link', icon: null },
      detailTitle: 'Additional Info',
      tab1Title: 'Specification Table (1)',
      tab2Title: 'Test Data Sheet (2)',
      detailHint: 'Please be advised that all product data is sourced from YG Laboratory, and YG reserves the right to interpret all data. For the latest product specification data, please contact us immediately!',
      specification: 'Backing: Crepe paper\nAdhesive: Rubber / resin\nTemperature resistance: 160°C / 1 hour\nElongation: 8%\nTensile strength: 85 N/25mm',
      downloads: [
        { id: 'tds', name: 'Masking-Tape-TDS.xlsx', type: 'Excel', link: catalog },
        { id: 'msds', name: 'Masking-Tape-MSDS.pdf', type: 'PDF', link: catalog },
        { id: 'coa', name: 'Certificate-of-Analysis.pdf', type: 'PDF', link: catalog },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { ...productMessages, download: 'Download', empty: 'No data', status: 'Status' },
  };
}

export function previewProduct4Section(id: string) {
  return {
    id,
    key: 'product-4',
    settings: {
      media: media(8, 'p4'),
      arrow: file('site-icon'),
      interval: 0,
      title: 'Double-Sided Tissue Tape for Laminating and Mounting',
      content: 'A high-tack tissue tape for nameplates, foam gaskets and indoor mounting. The thin carrier keeps assemblies compact without sacrificing peel strength.',
      marks: [
        { id: 'iso', icon: file('site-icon'), text: 'ISO 9001 production with incoming adhesive inspection.' },
        { id: 'warranty', icon: file('site-icon'), text: '12-month conversion warranty against liner defects.' },
        { id: 'factory', icon: file('site-icon'), text: 'In-house slitting, rewinding and export packing.' },
      ],
      actions: [
        { id: 'downloads', link: { type: 'module' as const, reference: 'module.catalog', id: 'products', target: '_self' as const }, variant: 'default', icon: null, download: true },
        { id: 'inquire', link: inquire, variant: 'danger', icon: null, download: false },
      ],
      downloads: [
        { id: 'brochure', file: file('northstar-brand-kit'), title: 'Product brochure' },
        { id: 'sheet', file: file('northstar-brand-kit'), title: 'Technical data sheet' },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: productMessages,
  };
}

export function previewProduct5Section(id: string) {
  return {
    id,
    key: 'product-5',
    settings: {
      media: media(8, 'p5'),
      interval: 0,
      title: 'Premium Gaffer Tape',
      description: 'Gaffer tape is made with a woven fabric base of cellulose acetate fibers, featuring a unique bidirectional weave structure. It is coated with a hot-melt pressure-sensitive adhesive.',
      featuresTitle: 'Features',
      features: [
        { id: 'f1', text: 'Clean removal from most stage floors and cables' },
        { id: 'f2', text: 'Hand-tearable in both directions' },
        { id: 'f3', text: 'Matte finish that reduces camera glare' },
      ],
      applicationsTitle: 'Applications',
      applications: [
        { id: 'a1', text: 'Stage and studio cable management' },
        { id: 'a2', text: 'Exhibition booth marking' },
        { id: 'a3', text: 'Temporary holding on painted walls' },
        { id: 'a4', text: 'Photography seamless seams' },
        { id: 'a5', text: 'Event floor marking' },
      ],
      actions: [
        { id: 'sample', link: sample, variant: 'danger', icon: null, download: false },
        { id: 'tds', link: tds, variant: 'danger', icon: null, download: true },
      ],
      downloads: [
        { id: 'brochure', file: file('northstar-brand-kit'), title: 'Brochure' },
        { id: 'sheet', file: file('northstar-brand-kit'), title: 'Technical Sheet' },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: productMessages,
  };
}
