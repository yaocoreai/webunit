import { defineModuleReferenceData } from '../define/datas';

const file = (id: string) => defineModuleReferenceData('file', id);
const covers = ['studio-cover', 'material-board', 'reading-room'] as const;
const imageAt = (index: number) => file(covers[index % covers.length]);
const icon = file('site-icon');
const video = file('demo-video');
const contact = { type: 'module' as const, reference: 'module.page', id: 'contact', target: '_self' as const };
const viewMore = { type: 'module' as const, reference: 'module.page', id: 'features', target: '_self' as const };
const about = { type: 'module' as const, reference: 'module.page', id: 'about', target: '_self' as const };
const expert = { type: 'module' as const, reference: 'module.page', id: 'contact', target: '_self' as const };
const nav = { previous: 'Previous', next: 'Next' } as const;
const action = (link: typeof contact, variant = 'danger') => ({ link, variant, icon: null });
const card = (index: number, _title: string) => ({ image: imageAt(index), link: about });

export function previewEn21Section(id: string) {
  const banner = (prefix: string, titles: readonly string[]) => titles.map((_title, index) => ({
    id: `${prefix}-${index + 1}`,
    image: imageAt(index),
    link: viewMore,
  }));
  return {
    id,
    key: 'en-21',
    settings: {
      title: 'Industrial Tape Applications',
      intro: 'See how masking, double-sided and protective constructions run on coating lines and converting plants.',
      arrow: icon,
      interval: 0,
      items: [
        { id: 'masking', title: 'Masking Tapes', banners: banner('masking', ['High-temperature automotive masking', 'Powder-coating crepe tape', 'Clean-removal paint lines', 'Oven-bake masking rolls']) },
        { id: 'tissue', title: 'Double-Sided Tapes', banners: banner('tissue', ['Tissue tape for nameplates', 'Foam gasket mounting', 'Indoor laminating film', 'High-tack converting rolls']) },
        { id: 'protective', title: 'Protective Films', banners: banner('protective', ['Surface protection film', 'Appliance transit film', 'Painted-metal protection', 'Low-residue peel film']) },
        { id: 'gaffer', title: 'Gaffer Tapes', banners: banner('gaffer', ['Matte stage gaffer tape', 'Cable hold-down rolls', 'Exhibition floor marking', 'Camera-ready cloth tape']) },
        { id: 'specialty', title: 'Specialty Adhesives', banners: banner('specialty', ['Hot-melt coating adhesive', 'Transfer tape for graphics', 'PET double-sided tape', 'High-bond industrial tape']) },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { previous: 'Previous banner', next: 'Next banner', imageAlt: 'Product banner' },
  };
}

export function previewEn22Section(id: string) {
  return {
    id,
    key: 'en-22',
    settings: {
      item1: card(0, 'Coating lines'),
      item2n1: card(1, 'Slitting hall'),
      item2n2: card(2, 'Incoming inspection'),
      item2n3: card(0, 'Export packing'),
      item3: card(1, 'Laboratory'),
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 0,
    },
    messages: { imageAlt: 'Featured image' },
  };
}

export function previewEn23Section(id: string) {
  const stats = (founded: string, people: string, lines: string, area: string) => [
    { id: 'founded', value: founded, suffix: '', unit: 'yr', intro: 'Founded in' },
    { id: 'people', value: people, suffix: '+', unit: '', intro: 'Employees' },
    { id: 'lines', value: lines, suffix: '+', unit: '', intro: 'Production Lines' },
    { id: 'area', value: area, suffix: '', unit: 'm²', intro: 'Facility Landscape' },
  ];
  const plant = (key: string, title: string, name: string, description: string, index: number, founded: string, people: string, lines: string, area: string) => ({
    id: key,
    title,
    description,
    name,
    image: imageAt(index),
    preview: imageAt(index + 1),
    stats: stats(founded, people, lines, area),
    action: action(viewMore),
  });
  return {
    id,
    key: 'en-23',
    settings: {
      arrow: icon,
      interval: 5,
      rightBackgroundColor: '',
      rightBackgroundImage: null,
      items: [
        plant('vietnam', 'Vietnam Plant', 'Vietnam', 'Sixteen coating and slitting lines ship masking, double-sided and protective constructions with monthly output above 200 containers.', 0, '2019', '250', '16', '200'),
        plant('shanghai', 'Shanghai Plant', 'Shanghai', 'Headquarters converting hall runs solvent and hot-melt coating for industrial masking tape, tissue tape and graphic films.', 1, '2002', '480', '22', '320'),
        plant('anhui', 'Anhui Plant', 'Anhui', 'High-volume jumbo coating for crepe masking and surface-protection film, with in-house adhesive compounding and release testing.', 2, '2012', '360', '18', '280'),
        plant('hebei', 'Hebei Plant', 'Hebei', 'Cloth, gaffer and duct constructions for stage, HVAC and bundling, packed for export pallets and moisture barriers.', 0, '2016', '210', '12', '180'),
        plant('malaysia', 'Malaysia Plant', 'Malaysia', 'ASEAN hub for PET double-sided tape and automotive protection film, serving regional OEMs and converters.', 1, '2021', '190', '10', '160'),
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 0,
    },
    messages: { ...nav, previous: 'Previous slide', next: 'Next slide', imageAlt: 'Plant image' },
  };
}

export function previewEn24Section(id: string) {
  const item = (key: string, title: string, cardTitle: string, layout: 'left' | 'center' | 'right', index: number) => ({
    id: key,
    image: imageAt(index),
    title,
    description: 'Incoming adhesive, liner and finished-roll tests are logged against ISO, IATF, UL, RoHS and REACH dossiers for every export lot.',
    layout,
    icon,
    activeIcon: icon,
    cardTitle,
    logos: icon,
    activeLogos: icon,
    link: about,
  });
  return {
    id,
    key: 'en-24',
    settings: {
      activeColor: '',
      interval: 5,
      list: [
        item('iso', 'A comprehensive certification system', 'Management Systems', 'left', 0),
        item('safety', 'Product safety for global converters', 'Product Safety Marks', 'center', 1),
        item('auto', 'Automotive process control', 'Automotive Quality', 'right', 2),
        item('env', 'Environmental and material compliance', 'Environmental Compliance', 'left', 0),
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Certification image' },
  };
}

export function previewEn25Section(id: string) {
  const row = (key: string, title: string, intro: string, index: number) => ({ id: key, image: imageAt(index), title, intro });
  return {
    id,
    key: 'en-25',
    settings: {
      title: 'Why Choose Us',
      intro: '20+ years coating industrial tapes, label materials and protective films for converters worldwide.',
      items: [
        {
          id: 'cost',
          image: icon,
          title: 'Cost Advantages',
          list: [
            row('direct', 'No Middlemen', 'Direct manufacturing lowers supply-chain cost from jumbo to finished roll.', 0),
            row('plants', '5 Global Plants', 'Shorter lead times and lower inventory across China, Vietnam and Malaysia.', 1),
            row('quality', 'Certified Quality System', 'Incoming adhesive inspection cuts defect risk before export packing.', 2),
            row('odm', 'One-Stop ODM', 'Coating, slitting, printing and packing sit in one supplier record.', 0),
          ],
        },
        {
          id: 'service',
          image: icon,
          title: 'Service Advantages',
          list: [
            row('retail', 'Long-Term Retail Partnerships', 'Home-improvement programs with retail-ready cartons and displays.', 1),
            row('rd', 'Strong R&D', 'Custom adhesive constructions for masking, mounting and protection.', 2),
            row('design', 'In-House Design Team', 'Retail packaging, cores and point-of-sale kits from the same plant.', 0),
            row('support', '24/7 Dedicated Support', 'R&D, QC, production, design and logistics on one contact path.', 1),
          ],
        },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Advantage icon' },
  };
}

export function previewEn26Section(id: string) {
  return {
    id,
    key: 'en-26',
    settings: {
      title: 'Want a masking or double-sided tape recommendation?',
      action: action(expert),
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: {},
  };
}

export function previewEn27Section(id: string) {
  return {
    id,
    key: 'en-27',
    settings: {
      video,
      image: file('studio-cover'),
      title: 'Coating industrial tapes for converters worldwide',
      subtitle: '20+ years of adhesive materials, from jumbo coating to export packing.',
      description: 'Founded in 2002, the group runs solvent and hot-melt lines for masking tape, tissue tape, gaffer tape and protective film.\n\nProduction bases in China, Vietnam and Malaysia supply more than 26,000 converters across 110 countries, with ISO, IATF, UL, RoHS and REACH records on every construction.',
      actions: [
        { id: 'contact', ...action(contact) },
        { id: 'more', ...action(viewMore, 'default') },
      ],
      topBackgroundColor: '',
      topBackgroundImage: null,
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Factory video' },
  };
}

export function previewEn28Section(id: string) {
  const slide = (key: string, title: string, intro: string, index: number, backgroundColor: string) => ({
    id: key,
    title,
    intro,
    image: imageAt(index),
    backgroundColor,
    link: about,
  });
  return {
    id,
    key: 'en-28',
    settings: {
      title: 'Degradable Adhesive Materials',
      intro: 'Paper-backed masking, compostable tissue carriers and water-based adhesives for converters who need industrial hold with a cleaner end-of-life path.\n\nJumbo coating, slitting and export packing stay in-house so liner, adhesive coat weight and release stay on one specification.',
      logo: icon,
      interval: 5,
      items: [
        slide('prevent', 'PREVENT', 'Paper masking that holds through bake cycles and releases cleanly from painted metal.', 0, '#2D810E'),
        slide('protect', 'PROTECT', 'Surface films for appliances and painted panels with low-residue peel after transit.', 1, '#4D4D4D'),
        slide('convert', 'CONVERT', 'Tissue carriers for nameplates and foam gaskets with a thin, high-tack coat.', 2, '#2D810E'),
        slide('pack', 'PACK', 'Degradable carton-sealing constructions for export packs that still survive ocean freight.', 0, '#4D4D4D'),
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { previous: 'Previous item', next: 'Next item', imageAlt: 'Material image' },
  };
}

export function previewEn29Section(id: string) {
  return {
    id,
    key: 'en-29',
    settings: {
      leftTop: { image: file('studio-cover'), video, link: null },
      rightTop: {
        title: 'About Our Company',
        titleTag: 'h2',
        subtitle: 'Five Global Production Bases',
        intro: 'From a Shanghai tape plant in 2002 to coating lines in China, Vietnam and Malaysia. The portfolio covers masking tape, tissue tape, gaffer tape, protective film and hot-melt adhesives for converters in more than 110 countries.',
        buttonAlign: 'left',
        action: action(viewMore),
      },
      leftBottom: {
        title: 'Founder & Chairman',
        titleTag: 'h2',
        subtitle: 'Process control first',
        intro: 'Manufacturing is built on incoming adhesive inspection, coating-weight control and a 12-month converting warranty. Scale follows consistent lots, not the other way around.',
        buttonAlign: 'left',
        action: action(about),
      },
      rightBottom: { image: file('reading-room'), video: null, link: about },
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 0,
    },
    messages: { imageAlt: 'Grid image', play: 'Play video' },
  };
}

export function previewEn30Section(id: string) {
  const base = (key: string, title: string, index: number) => ({ id: key, title, image: imageAt(index), action: action(viewMore) });
  return {
    id,
    key: 'en-30',
    settings: {
      title: 'Five Global Production Bases',
      subtitle: 'Coating, slitting and export packing for industrial tapes across China, Vietnam and Malaysia.',
      topItems: [
        base('malaysia', 'Malaysia Production Base', 0),
        base('vietnam', 'Vietnam Production Base', 1),
      ],
      bottomItems: [
        base('shanghai', 'Shanghai Production Base', 2),
        base('anhui', 'Anhui Production Base', 0),
        base('hebei', 'Hebei Production Base', 1),
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Production base' },
  };
}

export function previewEn31Section(id: string) {
  const lab = (key: string, title: string, intro: string, index: number) => ({
    id: key,
    title,
    intro,
    image: imageAt(index),
    link: about,
  });
  return {
    id,
    key: 'en-31',
    settings: {
      title: 'Our Science Laboratory',
      subtitle: 'Peel, shear, coat weight and release testing for masking, tissue and protective constructions.',
      items: [
        lab('vietnam', 'Vietnam Adhesive Laboratory', 'Peel and shear panels for masking tape destined for automotive bake cycles.', 0),
        lab('shanghai', 'Shanghai Coat-Weight Lab', 'Solvent and hot-melt coat-weight records against every jumbo roll.', 1),
        lab('anhui', 'Anhui Release Testing', 'Liner release and residue checks before export packing.', 2),
        lab('hebei', 'Hebei Cloth Construction Lab', 'Weave, adhesive coat and matte finish tests for gaffer and duct tapes.', 0),
        lab('malaysia', 'Malaysia PET Tape Lab', 'High-bond PET double-sided constructions for nameplates and trims.', 1),
        lab('mexico', 'Application Engineering Room', 'Customer substrates, bake schedules and converting trials before scale-up.', 2),
      ],
      interval: 5,
      navImage: icon,
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { previous: 'Previous laboratory', next: 'Next laboratory', imageAlt: 'Laboratory image' },
  };
}
