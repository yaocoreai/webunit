import { defineModuleReferenceData } from '../define/datas';

const file = (id: string) => defineModuleReferenceData('file', id);
const covers = ['studio-cover', 'material-board', 'reading-room'] as const;
const imageAt = (index: number) => file(covers[index % covers.length]);
const contact = { type: 'module' as const, reference: 'module.page', id: 'contact', target: '_self' as const };
const about = { type: 'module' as const, reference: 'module.page', id: 'about', target: '_self' as const };
const features = { type: 'module' as const, reference: 'module.page', id: 'features', target: '_self' as const };
const gallery = (count: number, prefix: string, title: string) => Array.from({ length: count }, (_, index) => ({
  id: `${prefix}-${index + 1}`,
  image: imageAt(index),
  title: `${title}-${index + 1}`,
}));
const slides = (count: number, prefix: string, intro: string) => Array.from({ length: count }, (_, index) => ({
  id: `${prefix}-${index + 1}`,
  image: imageAt(index),
  video: index === 1 ? file('demo-video') : null,
  intro,
}));

const nav = { previous: 'Previous', next: 'Next' } as const;

export function previewCard15Section(id: string) {
  return {
    id,
    key: 'card-15',
    settings: {
      items: [
        { id: 'q1', style: 'style1', title: '1. Our Production Capability', intro: 'In-house coating, slitting and converting keep lead times predictable from sample to container.', arrow: file('site-icon'), interval: 0, images: [] },
        { id: 'q2', style: 'style1', title: '2. Coating and Converting Lines', intro: 'Solvent and hot-melt lines run adhesive constructions for labels, tapes and graphic films.', arrow: file('site-icon'), interval: 0, images: gallery(5, 'c15-s1', 'Product') },
        { id: 'q3', style: 'style2', title: '3. Quality Inspection', intro: 'Incoming adhesive, liner and release tests are logged against every production lot.', arrow: file('site-icon'), interval: 0, images: gallery(5, 'c15-s2', 'Product') },
        { id: 'q4', style: 'style3', title: '4. Export Packing', intro: 'Export cartons, pallets and moisture barriers are prepared for ocean freight.', arrow: file('site-icon'), interval: 0, images: gallery(5, 'c15-s3', 'Product') },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: { ...nav, imageAlt: 'FAQ image' },
  };
}

export function previewCard16Section(id: string) {
  return {
    id,
    key: 'card-16',
    settings: {
      blocks: [
        { id: 'r1', avatar: file('studio-cover'), country: file('site-icon'), starImage: null, name: 'Y*****G', date: 'Feb 8, 2025', starNumber: 5, intro: 'The masking tape held through a 160°C bake and released cleanly from the clear coat. Repeat orders have been on the same spec for two years.' },
        { id: 'r2', avatar: file('reading-room'), country: file('site-icon'), starImage: null, name: 'A*****N', date: 'Nov 21, 2024', starNumber: 5, intro: 'Tissue tape bond to anodized aluminum was consistent across three converting plants. Documentation arrived with the first sample set.' },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: { imageAlt: 'Reviewer avatar', countryAlt: 'Country flag', starAlt: 'Star rating' },
  };
}

export function previewCard17Section(id: string) {
  return {
    id,
    key: 'card-17',
    settings: {
      intro: 'Quality assurance covers incoming materials, in-process coating weight, release force and finished-roll inspection before export packing.',
      arrow: file('site-icon'),
      interval: 0,
      images: gallery(10, 'c17', 'Line'),
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: { ...nav, imageAlt: 'Quality image' },
  };
}

export function previewCard18Section(id: string) {
  return {
    id,
    key: 'card-18',
    settings: {
      divider: file('material-board'),
      topBlocks: [
        { id: 't1', image: imageAt(0), title: 'Step 1 Mixing' },
        { id: 't2', image: imageAt(1), title: 'Step 2 Coating' },
        { id: 't3', image: imageAt(2), title: 'Step 3 Drying' },
        { id: 't4', image: imageAt(0), title: 'Step 4 Slitting' },
        { id: 't5', image: imageAt(1), title: 'Step 5 Rewinding' },
      ],
      bottomBlocks: [
        { id: 'b1', image: imageAt(2), title: 'Step 6 Inspection' },
        { id: 'b2', image: imageAt(0), title: 'Step 7 Packing' },
        { id: 'b3', image: imageAt(1), title: 'Step 8 Palletizing' },
        { id: 'b4', image: imageAt(2), title: 'Step 9 Documents' },
        { id: 'b5', image: imageAt(0), title: 'Step 10 Shipment' },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: { imageAlt: 'Process image', dividerAlt: 'Process divider' },
  };
}

export function previewCard19Section(id: string) {
  return {
    id,
    key: 'card-19',
    settings: {
      arrow: file('site-icon'),
      interval: 0,
      slides: slides(6, 'c19', 'YG Largest High-Tech Production Base'),
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: { ...nav, imageAlt: 'Factory image' },
  };
}

export function previewCard20Section(id: string) {
  return {
    id,
    key: 'card-20',
    settings: {
      arrow: file('site-icon'),
      interval: 0,
      slides: slides(6, 'c20', 'Project case from converting partners'),
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: { ...nav, imageAlt: 'Case image' },
  };
}

export function previewCard21Section(id: string) {
  return {
    id,
    key: 'card-21',
    settings: {
      blocks: [
        { id: 's1', image: imageAt(0), value: '50K+', unit: 'm²', title: 'Plant', intro: 'YG Group Malaysia' },
        { id: 's2', image: imageAt(1), value: '200+', unit: '', title: 'Coating lines', intro: 'Hot-melt and solvent' },
        { id: 's3', image: imageAt(2), value: '30+', unit: '', title: 'Countries', intro: 'Export destinations' },
        { id: 's4', image: imageAt(0), value: '10K+', unit: '', title: 'SKUs', intro: 'Converted rolls yearly' },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: { imageAlt: 'Stat image' },
  };
}

export function previewCard22Section(id: string) {
  return {
    id,
    key: 'card-22',
    settings: {
      intro: 'From labels and graphic films to medical and hygiene constructions, converting partners specify release liners and tapes on the same production platform.',
      blocks: [
        { id: 'a1', image: imageAt(0), intro1: 'Labels', intro2: 'Glassine and PET liners' },
        { id: 'a2', image: imageAt(1), intro1: 'Industrial tape', intro2: 'Release and splicing' },
        { id: 'a3', image: imageAt(2), intro1: 'Medical', intro2: 'Breathable constructions' },
        { id: 'a4', image: imageAt(0), intro1: 'Hygiene', intro2: 'High-speed converting' },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: { imageAlt: 'Application image' },
  };
}

export function previewCard23Section(id: string) {
  return {
    id,
    key: 'card-23',
    settings: {
      blocks: [
        { id: 'c1', image: imageAt(0), title: 'Home & Office', description: 'Mounting and sealing for indoor use.', link: features },
        { id: 'c2', image: imageAt(1), title: 'Automotive', description: 'Masking and wire harness tapes.', link: features },
        { id: 'c3', image: imageAt(2), title: 'Electronics', description: 'Insulation and shielding.', link: features },
        { id: 'c4', image: imageAt(0), title: 'Packaging', description: 'Carton sealing and splicing.', link: about },
        { id: 'c5', image: imageAt(1), title: 'Construction', description: 'HVAC and weather sealing.', link: about },
        { id: 'c6', image: imageAt(2), title: 'Medical', description: 'Skin-friendly adhesives.', link: contact },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: { imageAlt: 'Item image' },
  };
}

export function previewCard24Section(id: string) {
  return {
    id,
    key: 'card-24',
    settings: {
      blocks: [
        {
          id: 'tariff',
          image: file('site-icon'),
          title: 'Tariff Advantage',
          intros: [
            { id: 'i1', text: 'Origin documentation is prepared with ', type: 'default', link: null },
            { id: 'i2', text: 'each shipment', type: 'danger', link: null },
            { id: 'i3', text: ', including ', type: 'default', link: null },
            { id: 'i4', text: 'certificate of origin', type: 'link', link: about },
            { id: 'i5', text: ' on request.', type: 'default', link: null },
          ],
          action: { link: features, variant: 'default', icon: null },
        },
        {
          id: 'lead',
          image: file('site-icon'),
          title: 'Lead Time Advantage',
          intros: [
            { id: 'i1', text: 'Sample rolls ship in ', type: 'default', link: null },
            { id: 'i2', text: '7–10 days', type: 'danger', link: null },
            { id: 'i3', text: ' with a dedicated ', type: 'default', link: null },
            { id: 'i4', text: 'converting slot', type: 'link', link: contact },
            { id: 'i5', text: ' for repeat SKUs.', type: 'default', link: null },
          ],
          action: { link: features, variant: 'default', icon: null },
        },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: { imageAlt: 'Advantage icon' },
  };
}

export function previewCard25Section(id: string) {
  return {
    id,
    key: 'card-25',
    settings: {
      title1: 'Want For More Product Info?',
      title2: 'Contact Us Now Without Hesitation!',
      contactLink: contact,
      contactVariant: 'accent',
      contactIcon: null,
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: {},
  };
}
