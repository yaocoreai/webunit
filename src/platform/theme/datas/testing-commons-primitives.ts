import { defineModuleReferenceData } from '../define/datas';

const file = (id: string) => defineModuleReferenceData('file', id);
const page = (id: string, _title?: string) => ({ type: 'module' as const, reference: 'module.page' as const, id, target: '_self' as const });
const catalog = (_title?: string) => ({ type: 'module' as const, reference: 'module.catalog' as const, id: 'products', target: '_self' as const });
const article = (_title?: string) => ({ type: 'module' as const, reference: 'module.article' as const, id: 'materials-guide', target: '_self' as const });
const action = (
  link: ReturnType<typeof page> | ReturnType<typeof catalog> | ReturnType<typeof article>,
  variant = 'primary',
) => ({ link, variant, icon: null });

export function previewDividerSection(id: string) {
  return {
    id,
    key: 'divider',
    settings: {
      lineStyle: 'solid',
      lineWidth: 1,
      lineColor: '',
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: {},
  };
}

export function previewHeadingSection(id: string) {
  return {
    id,
    key: 'heading',
    settings: {
      tag: 'h2',
      text: 'Coating industrial tapes for converters who need jumbo rolls, slitting and export packing on one specification.',
      subtitle: 'Solvent and hot-melt lines in China, Vietnam and Malaysia supply masking, tissue and protective constructions to more than 26,000 plants.',
      typography: 'h2',
      textAlign: 'left',
      textColor: '',
      buttons: [
        { id: 'inquire', ...action(page('contact', 'Talk to Our Team'), 'accent') },
        { id: 'catalog', ...action(catalog('Browse the catalog'), 'default') },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: {},
  };
}

export function previewHtmlSection(id: string) {
  return {
    id,
    key: 'html',
    settings: {
      content: '<p>Solvent and hot-melt coating lines produce masking tape, tissue tape and protective film for converters in more than 110 countries.</p><p>Incoming adhesive, coat weight and release force are logged against every lot before jumbo rolls move to slitting, rewinding and export packing.</p><p>Sample cartons ship with a technical data sheet so plants can match liner, adhesive and total thickness before the first production order.</p>',
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: {},
  };
}

export function previewPlaceholderSection(id: string) {
  return {
    id,
    key: 'placeholder',
    settings: {
      height: 32,
    },
    messages: {},
  };
}

export function previewContentSection(id: string) {
  return {
    id,
    key: 'content',
    settings: {
      text: 'Founded as a tape mill, the group now runs solvent and hot-melt coating for masking tape, double-sided tissue tape, gaffer tape and surface protection film.\n\nProduction bases share one inspection plan: adhesive incoming tests, coat-weight checks and release-force logs travel with every jumbo before slitting. Export cartons, pallets and moisture barriers leave on a weekly ocean schedule for converters across Asia, Europe and the Americas.\n\nAsk for a construction sheet when you need a 160°C bake masking, a foam gasket mount or a low-residue peel film. Sample rolls ship with the same liner and adhesive that will run on the production order.',
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: {},
  };
}

export function previewTitle1Section(id: string) {
  return {
    id,
    key: 'title-1',
    settings: {
      title: 'High-temperature masking tape for automotive refinish lines',
      team: {
        icon: file('site-icon'),
        link: page('about', 'Northstar Converting Group'),
      },
      release: {
        icon: file('site-icon'),
        link: article('Published 12 March 2026'),
      },
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: {
      fallbackTitle: 'Page title',
      imageAlt: 'Meta icon',
    },
  };
}

export function previewImage1Section(id: string) {
  return {
    id,
    key: 'image-1',
    settings: {
      fullWidth: true,
      image: file('studio-cover'),
      link: catalog('Open product catalog'),
      layout: 'left-center',
      title: 'From jumbo coating to export packing',
      subtitle: 'One specification across masking, tissue and graphic film.',
      description: 'Crepe, PET and tissue carriers run on solvent and hot-melt lines. Incoming adhesive, coat weight and release stay on the same lot record from sample to container.',
      buttons: [
        { id: 'contact', ...action(page('contact', 'Request a sample'), 'accent') },
        { id: 'guide', ...action(article('Read the materials guide'), 'default') },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 0,
    },
    messages: { imageAlt: 'Section image' },
  };
}

export function previewVideo1Section(id: string) {
  return {
    id,
    key: 'video-1',
    settings: {
      video: file('demo-video'),
      image: file('studio-cover'),
      autoplay: false,
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Factory video' },
  };
}

export function previewDownloadSection(id: string) {
  const files = (prefix: string, count: number) => Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    file: file('northstar-brand-kit'),
    name: index % 2 === 0 ? 'Car Wrapping Materials' : 'Technical Data Sheet',
    desc: 'PDF, 2281 Kb, 9 Pages',
  }));
  return {
    id,
    key: 'download',
    settings: {
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
