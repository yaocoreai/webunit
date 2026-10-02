import { defineModuleReferenceData } from '../define/datas';

const file = (id: string) => defineModuleReferenceData('file', id);
const page = (id: string, _title?: string) => ({ type: 'module' as const, reference: 'module.page' as const, id, target: '_self' as const });
const covers = ['studio-cover', 'material-board', 'reading-room'] as const;
const imageAt = (index: number) => file(covers[index % covers.length]);
const catalog = (_title?: string) => ({ type: 'module' as const, reference: 'module.catalog' as const, id: 'products', target: '_self' as const });
const article = (_title?: string) => ({ type: 'module' as const, reference: 'module.article' as const, id: 'materials-guide', target: '_self' as const });
const button = (_title: string, href: ReturnType<typeof page>, variant = 'danger') => ({ link: href, variant, icon: null });

export function previewMy10Section(id: string) {
  return {
    id,
    key: 'my-10',
    settings: {
      title: 'Product Lines',
      subtitle: 'YG Group Malaysia',
      items: [
        { id: 'masking', image: imageAt(0), title: 'Masking Tape', link: catalog('Masking Tape') },
        { id: 'foam', image: imageAt(1), title: 'Foam Tape', link: page('features', 'Foam Tape') },
        { id: 'gaffer', image: imageAt(2), title: 'Gaffer Tape', link: article('Gaffer Tape') },
        { id: 'duct', image: imageAt(0), title: 'Duct Tape', link: catalog('Duct Tape') },
        { id: 'bopp', image: imageAt(1), title: 'BOPP Packaging Tape', link: page('about', 'BOPP Packaging Tape') },
        { id: 'pvc', image: imageAt(2), title: 'PVC Insulation Tape', link: page('contact', 'PVC Insulation Tape') },
      ],
      backgroundColor: '#f9f9f9',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Product line image' },
  };
}

export function previewMy11Section(id: string) {
  return {
    id,
    key: 'my-11',
    settings: {
      title: 'Lab Equipment',
      intro: 'YG Group Malaysia',
      arrow: file('site-icon'),
      interval: 0,
      images: [
        { id: 'coater-hotmelt', image: imageAt(0), title: 'Hot-Melt Coater' },
        { id: 'coater-solvent', image: imageAt(1), title: 'Solvent Coater' },
        { id: 'mixing-kettle', image: imageAt(2), title: 'Mixing Kettle' },
        { id: 'slitting-line', image: imageAt(0), title: 'Slitting Line' },
        { id: 'rewinder', image: imageAt(1), title: 'Rewinder' },
        { id: 'inspection-bench', image: imageAt(2), title: 'Inspection Bench' },
        { id: 'die-cutter', image: imageAt(0), title: 'Die Cutter' },
        { id: 'packing-line', image: imageAt(1), title: 'Packing Line' },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { previous: 'Previous', next: 'Next', imageAlt: 'Lab equipment image' },
  };
}

export function previewMy12Section(id: string) {
  return {
    id,
    key: 'my-12',
    settings: {
      title: 'Sustainability',
      intro: 'YG Group Malaysia',
      rightIntro1: 'YG Group Malaysia prioritizes',
      rightIntro2: 'sustainability and eco-friendly production',
      colMain: {
        image: imageAt(0),
        order: 'Malaysia plant',
        link: page('about', 'Commitment Statement'),
        intro: 'The Johor coating campus recovers solvent, treats process water on site and ships finished rolls with recyclable cores for converters across ASEAN.',
      },
      colTop: {
        image: imageAt(1),
        order: 'Solvent recovery',
        link: page('features', 'Closed-Loop Coating'),
        intro: 'Hot-melt and solvent lines share a recovery loop so masking, foam and gaffer constructions keep coat weight stable without extra waste drums.',
      },
      colBottom: {
        image: imageAt(2),
        order: 'Export packing',
        link: article('Recyclable Cores'),
        intro: 'Export cartons, pallets and moisture barriers are prepared in the same hall as slitting, keeping lead times predictable from sample to container.',
      },
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Sustainability image' },
  };
}

export function previewMy13Section(id: string) {
  return {
    id,
    key: 'my-13',
    settings: {
      title: 'More About Us',
      intro: 'YG Group Malaysia',
      blocks: [
        {
          id: 'plant',
          image: imageAt(0),
          intro: 'Tour the Johor coating, slitting and packing halls that convert masking, foam and gaffer tapes for ASEAN distributors.',
          button: button('View More', page('about', 'View More')),
        },
        {
          id: 'lab',
          image: imageAt(1),
          intro: 'Incoming adhesive, liner and release tests are logged against every production lot before export packing leaves the plant.',
          button: button('Learn More', page('features', 'Learn More')),
        },
        {
          id: 'contact-team',
          image: imageAt(2),
          intro: 'Talk with the Malaysia converting team about constructions, samples and container lead times for your next programme.',
          button: button('Contact Us', page('contact', 'Contact Us')),
        },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'About image' },
  };
}
