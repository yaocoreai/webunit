import { defineModuleReferenceData } from '../define/datas';

const file = (id: string) => defineModuleReferenceData('file', id);
const covers = ['studio-cover', 'material-board', 'reading-room'] as const;
const imageAt = (index: number) => file(covers[index % covers.length]);
const icon = file('site-icon');
const video = file('demo-video');
const about = { type: 'module' as const, reference: 'module.page', id: 'about', target: '_self' as const };
const features = { type: 'module' as const, reference: 'module.page', id: 'features', target: '_self' as const };
const contact = { type: 'module' as const, reference: 'module.page', id: 'contact', target: '_self' as const };
const nav = { previous: 'Previous', next: 'Next' } as const;

const plantStats = [
  { id: 'founded', value: '2019', suffix: 'yr', unit: '', intro: 'Founded in' },
  { id: 'people', value: '250', suffix: '+', unit: '', intro: 'Employees' },
  { id: 'lines', value: '16', suffix: '+', unit: '', intro: 'Production Lines' },
  { id: 'area', value: '200', suffix: '', unit: 'm²', intro: 'Facility Landscape' },
];

const plantImages = (prefix: string) => Array.from({ length: 4 }, (_, index) => ({
  id: `${prefix}-${index + 1}`,
  image: index === 1 ? video : imageAt(index),
}));

export function previewEn32Section(id: string) {
  return {
    id,
    key: 'en-32',
    settings: {
      title: 'Quality Control Process',
      subtitle: 'From raw material inspection to final reporting, our quality control process helps ensure product consistency, appearance, and performance at every stage.',
      items: [
        { id: 's1', title: 'Raw Material Inspection', description: 'We inspect jumbo rolls, packaging materials, and other incoming materials to identify visible defects and confirm they meet production requirements before use.', stepText: 'STEP 01', image: imageAt(0), link: about },
        { id: 's2', title: 'In-Process Quality Control', description: 'During production, our team monitors each stage to identify processing issues early and help maintain stable manufacturing quality.', stepText: 'STEP 02', image: imageAt(1), link: null },
        { id: 's3', title: 'Laboratory Performance Testing', description: 'Our laboratory tests key physical properties to verify product performance and support technical evaluation for different application requirements.', stepText: 'STEP 03', image: imageAt(2), link: features },
        { id: 's4', title: 'Inspection Report Issuance', description: 'After inspection and testing, we provide quality reports to document product results and support customer verification requirements.', stepText: 'STEP 04', image: imageAt(0), link: null },
        { id: 's5', title: 'Finished Product Inspection', description: 'Before shipment, finished products are checked for surface defects, appearance quality, and overall conformity to inspection standards.', stepText: 'STEP 05', image: imageAt(1), link: contact },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Quality control step' },
  };
}

export function previewEn33Section(id: string) {
  return {
    id,
    key: 'en-33',
    settings: {
      title: 'Humanistic Care',
      subtitle: 'YG provides innovative tape technology and a manufacturing platform that keeps people, process and delivery aligned.',
      imageTopRight: file('studio-cover'),
      linkTopRight: about,
      imageCenterLeft: file('material-board'),
      linkCenterLeft: features,
      imageBottomRight: file('reading-room'),
      linkBottomRight: contact,
      cards: [
        { id: 'c1', number: '01', title: 'Equality', description: 'During production, our team monitors each stage to identify processing issues early.', link: about },
        { id: 'c2', number: '02', title: 'Safety', description: 'Incoming adhesive, liner and release tests are logged against every production lot.', link: null },
        { id: 'c3', number: '03', title: 'Training', description: 'Operators rotate across coating, slitting and packing so coverage stays predictable.', link: features },
        { id: 'c4', number: '04', title: 'Health', description: 'Shift schedules and ventilation standards are reviewed with plant safety officers.', link: null },
        { id: 'c5', number: '05', title: 'Community', description: 'Local hiring and supplier audits keep converting work close to the plants.', link: contact },
        { id: 'c6', number: '06', title: 'Growth', description: 'Apprenticeship tracks move technicians from inspection into process control roles.', link: null },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Care image' },
  };
}

export function previewEn34Section(id: string) {
  return {
    id,
    key: 'en-34',
    settings: {
      title: 'News & Information',
      viewMore: { link: features, variant: 'danger', icon: null },
      interval: 0,
      arrow: icon,
      articles: [
        { id: 'n1', image: imageAt(0), title: 'China Import and Export Fair 2026', intro: 'Mr. Lyu Xinmin founded YG with a clear belief: manufacturing should be built on consistency, responsibility, and long-term customer trust.', categories: 'Company News, Expo, Chengdu', date: '2025-09-22', link: about },
        { id: 'n2', image: imageAt(1), title: 'Malaysia Plant Expansion Reaches Coating Capacity', intro: 'Solvent and hot-melt lines were added to keep lead times predictable from sample jumbo to container loading.', categories: 'Plant News, Capacity', date: '2025-07-18', link: features },
        { id: 'n3', image: imageAt(2), title: 'Release Liner Recommendation Workflow', intro: 'Converters can now share adhesive system, coat weight and annual volume in a single request for a liner construction.', categories: 'Technical, Converter', date: '2025-05-03', link: contact },
        { id: 'n4', image: imageAt(0), title: 'Gaffer Tape Spec Pack for Studios', intro: 'A matte cloth tape pack covering tensile, residue and camera-glare notes is available for rental houses.', categories: 'Product, Studio', date: '2025-03-14', link: about },
        { id: 'n5', image: imageAt(1), title: 'ISO Incoming Inspection Update', intro: 'Adhesive lots are now barcode-matched to coating runs before the first meter is released to slitting.', categories: 'Quality, Process', date: '2025-01-09', link: features },
        { id: 'n6', image: imageAt(2), title: 'Export Packing Standard for Ocean Freight', intro: 'Cartons, pallets and moisture barriers were aligned across three converting plants for the same SKU family.', categories: 'Logistics, Export', date: '2024-11-21', link: contact },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { ...nav, imageAlt: 'Article image' },
  };
}

export function previewEn35Section(id: string) {
  return {
    id,
    key: 'en-35',
    settings: {
      title: 'Layout of Global \nR&D Centers and Production Base',
      titleTag: 'h2',
      mapImage: file('material-board'),
      centerPoint: {
        x: 75,
        y: 45,
        label: 'Shanghai',
        labelLink: about,
        icon: icon,
        title: 'Shanghai Headquarter',
        subtitle: 'Global R&D Center',
        image: file('studio-cover'),
      },
      locations: [
        { id: 'vietnam', type: 'important', x: 65, y: 60, icon: icon, label: 'Vietnam', labelLink: features, title: 'Vietnam Plant', subtitle: 'Vertical integration intelligent manufacturing', image: file('reading-room') },
        { id: 'usa', type: 'normal', x: 20, y: 40, icon: icon, label: 'USA', labelLink: contact, title: 'America', subtitle: 'R&D Center', image: file('studio-cover') },
        { id: 'europe', type: 'normal', x: 50, y: 35, icon: icon, label: 'Europe', labelLink: null, title: 'Europe', subtitle: 'Sales Office', image: file('material-board') },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Location image', mapAlt: 'World map' },
  };
}

export function previewEn36Section(id: string) {
  return {
    id,
    key: 'en-36',
    settings: {
      title: 'China Plants',
      plants: [
        {
          id: 'shanghai',
          title: 'Shanghai Headquarters',
          address: { text: 'Address: coating, slitting and converting campus with more than 5.5 billion m² annual capacity.', link: about },
          interval: 0,
          images: plantImages('sh'),
          stats: plantStats,
          contact: { avatar: file('studio-cover'), name: 'Howard Lyu', title: 'U.S. Sales Manager', link: contact },
        },
        {
          id: 'jiangxi',
          title: 'Jiangxi Plant',
          address: { text: 'Address: jumbo coating lines feeding export slitting for masking, tissue and cloth tapes.', link: null },
          interval: 0,
          images: plantImages('jx'),
          stats: [
            { id: 'founded', value: '2014', suffix: 'yr', unit: '', intro: 'Founded in' },
            { id: 'people', value: '180', suffix: '+', unit: '', intro: 'Employees' },
            { id: 'lines', value: '12', suffix: '+', unit: '', intro: 'Production Lines' },
            { id: 'area', value: '160', suffix: '', unit: 'm²', intro: 'Facility Landscape' },
          ],
          contact: { avatar: file('reading-room'), name: 'Chen Wei', title: 'Plant Director', link: features },
        },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { previous: 'Previous image', next: 'Next image', imageAlt: 'Plant image', avatarAlt: 'Contact avatar' },
  };
}

export function previewEn37Section(id: string) {
  return {
    id,
    key: 'en-37',
    settings: {
      title: 'Management',
      list: [
        {
          id: 'jiang',
          name: 'Jiang Haiquan',
          title: 'Head of Manufacturing',
          description: 'Jiang Haiquan joined YG in 2019 and is responsible for the Group\'s manufacturing operations. He oversees production management across the organization, with a focus on operational efficiency, delivery performance, plant execution, and the effective coordination of manufacturing resources.\nBy focusing on execution, coordination, and stable output, he helps ensure that the Group\'s manufacturing platform can support both ongoing business growth and the evolving needs of customers across different markets.',
          avatar: file('studio-cover'),
          theme: 'dark',
        },
        {
          id: 'lyu',
          name: 'Howard Lyu',
          title: 'Head of International Sales',
          description: 'Howard Lyu works with converters on specification, sampling and container planning. His brief covers North America and selected European accounts, with an emphasis on repeat constructions rather than one-off SKUs.\nDocumentation, coating windows and packing notes travel with the first sample set so plants can quote against a stable spec.',
          avatar: file('reading-room'),
          theme: 'light',
        },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Profile photo' },
  };
}

export function previewEn38Section(id: string) {
  return {
    id,
    key: 'en-38',
    settings: {
      defaultCollapsed: true,
      list: [
        { id: 'q1', question: 'What is gaffer tape used for?', answer: 'Gaffer tape is used for lighting setups, panel securing, displays, and temporary fixing in studios, exhibitions, and stage environments.', icon: icon },
        { id: 'q2', question: 'Why is gaffer tape used in stage production?', answer: 'Gaffer tape for stage production is preferred because its matte surface helps reduce light reflection and keeps visual setups clean and professional.', icon: icon },
        { id: 'q3', question: 'What is gaffer tape made of?', answer: 'Gaffer tape is made with a woven fabric base of cellulose acetate fibers and coated with a hot-melt pressure-sensitive adhesive.', icon: icon },
        { id: 'q4', question: 'Is gaffer tape good for studios and exhibitions?', answer: 'Yes. Gaffer tape for studios and exhibitions is widely used because it is easy to apply, has strong tensile strength, and offers a clean appearance.', icon: icon },
        { id: 'q5', question: 'Does gaffer tape leave residue on cables?', answer: 'On most stage floors and cable jackets the adhesive is specified for clean removal within the stated dwell window. Always test on aged paint and silicone jackets.', icon: icon },
        { id: 'q6', question: 'Can gaffer tape be torn by hand?', answer: 'The bidirectional weave is designed to tear straight by hand in both directions, which keeps on-site converting fast without knives.', icon: icon },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: {},
  };
}

export function previewEn39Section(id: string) {
  const productLink = (_title?: string) => ({ type: 'module' as const, reference: 'module.page', id: 'features', target: '_self' as const });
  return {
    id,
    key: 'en-39',
    settings: {
      headerText: 'Name of Product',
      products: [
        { id: 'p1', image: imageAt(0), title: 'Masking Tape 160°C', link: productLink('Masking Tape 160°C') },
        { id: 'p2', image: imageAt(1), title: 'Tissue Tape 50µm', link: productLink('Tissue Tape 50µm') },
        { id: 'p3', image: imageAt(2), title: 'Gaffer Tape Matte', link: productLink('Gaffer Tape Matte') },
        { id: 'p4', image: imageAt(0), title: 'Cloth Tape Outdoor', link: productLink('Cloth Tape Outdoor') },
      ],
      rows: [
        { id: 'thickness', label: 'Total Thickness', values: [{ id: 'v1', text: '145um' }, { id: 'v2', text: '50um' }, { id: 'v3', text: '280um' }, { id: 'v4', text: '260um' }] },
        { id: 'adhesive', label: 'Adhesive Material', values: [{ id: 'v1', text: 'Natural Rubber' }, { id: 'v2', text: 'Acrylic' }, { id: 'v3', text: 'Hot-melt Rubber' }, { id: 'v4', text: 'Hot-melt Rubber' }] },
        { id: 'backing', label: 'Backing Material', values: [{ id: 'v1', text: 'Slightly-creped paper' }, { id: 'v2', text: 'Tissue' }, { id: 'v3', text: 'Woven cotton' }, { id: 'v4', text: 'Woven cotton' }] },
        { id: 'adhesion', label: 'Adhesion To Steel', values: [{ id: 'v1', text: '4 N/cm' }, { id: 'v2', text: '12 N/25mm' }, { id: 'v3', text: '8 N/cm' }, { id: 'v4', text: '9 N/cm' }] },
        { id: 'tensile', label: 'Tensile Strength', values: [{ id: 'v1', text: '140 N/25mm' }, { id: 'v2', text: '18 N/25mm' }, { id: 'v3', text: '85 N/25mm' }, { id: 'v4', text: '90 N/25mm' }] },
        { id: 'elongation', label: 'Elongation at Break', values: [{ id: 'v1', text: '10%' }, { id: 'v2', text: '4%' }, { id: 'v3', text: '12%' }, { id: 'v4', text: '11%' }] },
      ],
      arrow: icon,
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 48,
    },
    messages: { previous: 'Previous products', next: 'Next products', imageAlt: 'Product image' },
  };
}

export function previewEn40Section(id: string) {
  const industries = ['Building & Construction', 'Automotive Refinish', 'Electronics Assembly', 'Graphic Films', 'Medical Converting', 'Appliance Bonding', 'Packaging Lines', 'Renewable Energy'];
  return {
    id,
    key: 'en-40',
    settings: {
      items: industries.map((title, index) => ({
        id: `ind-${index + 1}`,
        title,
        image: imageAt(index),
        link: { type: 'module' as const, reference: 'module.page', id: 'features', target: '_self' as const },
        icon: icon,
      })),
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Industry image', more: 'Read More' },
  };
}

export function previewEn41Section(id: string) {
  return {
    id,
    key: 'en-41',
    settings: {
      title: 'Markets',
      subtitle: 'Find the right adhesive tape based on your application',
      interval: 0,
      arrow: icon,
      items: [
        { id: 'm1', image: imageAt(0), title: 'Insulation', description: 'Insulation tapes for industry applications, including electrical wrapping and thermal barriers on converting lines.', button: { link: features, variant: 'danger', icon: icon } },
        { id: 'm2', image: imageAt(1), title: 'Automotive', description: 'Masking and bonding constructions for refinish, powder coating and interior trim assemblies.', button: { link: about, variant: 'danger', icon: icon } },
        { id: 'm3', image: imageAt(2), title: 'Electronics', description: 'Thin tissue and PET tapes for nameplates, foam gaskets and compact device stacks.', button: { link: contact, variant: 'danger', icon: icon } },
        { id: 'm4', image: imageAt(0), title: 'Packaging', description: 'Hot-melt carton sealing and filament reinforcement for export packing stations.', button: { link: features, variant: 'danger', icon: null } },
        { id: 'm5', image: imageAt(1), title: 'Studio', description: 'Matte gaffer and cloth tapes specified for lighting, cable runs and temporary displays.', button: { link: about, variant: 'danger', icon: icon } },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { ...nav, imageAlt: 'Market image' },
  };
}

export function previewEn42Section(id: string) {
  return {
    id,
    key: 'en-42',
    settings: {
      items: [
        { id: 'f1', icon: icon, link: { type: 'module' as const, reference: 'module.page', id: 'features', target: '_self' as const } },
        { id: 'f2', icon: icon, link: { type: 'module' as const, reference: 'module.page', id: 'about', target: '_self' as const } },
        { id: 'f3', icon: icon, link: { type: 'module' as const, reference: 'module.page', id: 'contact', target: '_self' as const } },
      ],
      backgroundColor: '#F9F9F9',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: { iconAlt: 'Feature icon' },
  };
}
