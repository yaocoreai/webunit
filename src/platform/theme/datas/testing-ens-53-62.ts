import { defineModuleReferenceData } from '../define/datas';

const file = (id: string) => defineModuleReferenceData('file', id);
const covers = ['studio-cover', 'material-board', 'reading-room'] as const;
const imageAt = (index: number) => file(covers[index % covers.length]);
const page = (id: string, _title?: string) => ({ type: 'module' as const, reference: 'module.page', id, target: '_self' as const });
const icon = file('site-icon');
const button = (title: string, variant = 'danger') => ({ link: page('contact', title), variant, icon: null });
const arrayButton = (id: string, title: string, variant = 'danger') => ({ id, ...button(title, variant) });

const en57Highlights = [
  { id: 'h1', icon, text: 'Consistent release for clean die-cutting and matrix stripping' },
  { id: 'h2', icon, text: 'Web stability for high-speed printing and converting' },
  { id: 'h3', icon, text: 'Structures matched to the adhesive and dispensing process' },
];

const en57Details = [
  { id: 'd1', icon, title: 'Base Materials', description: 'Glassine, CCK, PEK and PET' },
  { id: 'd2', icon, title: 'Adhesive PET', description: 'Water-based hot-melt and solvent-based adhesive' },
  { id: 'd3', icon, title: 'Typical Uses', description: 'Flexo and digital printing, die-cutting and automatic labeling' },
];

const en57Item = (
  id: string,
  number: string,
  label: string,
  title: string,
  description: string,
  imageIndex: number,
) => ({
  id,
  tab: { number, label },
  image: imageAt(imageIndex),
  title,
  description,
  highlights: en57Highlights,
  details: en57Details,
  buttons: [arrayButton(`${id}-ask`, 'Ask About This Solution')],
});

const background = {
  backgroundColor: '',
  backgroundImage: null,
} as const;

export function previewEn53Section(id: string) {
  return {
    id,
    key: 'en-53',
    settings: {
      title: 'Case Studies',
      viewMore: { link: page('features', 'View More'), variant: 'danger', icon: null },
      items: [
        { id: 'n1', image: imageAt(0), title: 'China Import and Export Fair 2026', link: page('about', 'Fair 2026') },
        { id: 'n2', image: imageAt(1), title: 'Release Liner Coating Line Expansion', link: page('features', 'Coating Line') },
        { id: 'n3', image: imageAt(2), title: 'Medical Tape Converting Partnership', link: page('contact', 'Medical Tape') },
        { id: 'n4', image: imageAt(0), title: 'Southeast Asia Production Hub Opening', link: page('about', 'Production Hub') },
      ],
      bottomLink: page('features', 'View latest news >'),
      ...background,
      paddingY: 64,
    },
    messages: { imageAlt: 'Article image' },
  };
}

export function previewEn54Section(id: string) {
  return {
    id,
    key: 'en-54',
    settings: {
      title: 'Layout of Global \nR&D Centers and Production Base',
      titleTag: 'h2',
      mapImage: file('material-board'),
      centerPoints: [
        {
          id: 'shanghai',
          key: 'shanghai',
          x: 75,
          y: 45,
          label: 'Shanghai',
          labelLink: page('about', 'Shanghai'),
          icon,
          title: 'Shanghai Headquarter',
          subtitle: 'Global R&D Center',
          image: imageAt(0),
          children: [
            { id: 'usa', type: 'normal', x: 20, y: 40, label: 'USA', labelLink: page('about', 'USA'), icon, title: 'America', subtitle: 'R&D Center', image: imageAt(1) },
            { id: 'europe', type: 'normal', x: 50, y: 35, label: 'Europe', labelLink: page('features', 'Europe'), icon, title: 'Europe', subtitle: 'Sales Office', image: imageAt(2) },
          ],
        },
        {
          id: 'vietnam-hub',
          key: 'vietnam-hub',
          x: 67,
          y: 57,
          label: 'Vietnam Hub',
          labelLink: page('about', 'Vietnam Hub'),
          icon,
          title: 'Vietnam Operations Center',
          subtitle: 'Manufacturing and delivery hub',
          image: imageAt(1),
          children: [
            { id: 'vietnam-plant', type: 'important', x: 65, y: 60, label: 'Vietnam', labelLink: page('features', 'Vietnam'), icon, title: 'Vietnam Plant', subtitle: 'Vertical Integration intelligent manufacturing', image: imageAt(2) },
          ],
        },
      ],
      ...background,
      paddingY: 64,
    },
    messages: { mapAlt: 'World map', imageAlt: 'Location image' },
  };
}

export function previewEn55Section(id: string) {
  return {
    id,
    key: 'en-55',
    settings: {
      items: [
        page('home', 'Home'),
        page('features', 'Products'),
        page('about', 'Industrial Tape'),
        page('contact', 'Double-Sided Tape'),
      ],
      ...background,
      paddingY: 16,
    },
    messages: { navigationLabel: 'Breadcrumb' },
  };
}

export function previewEn56Section(id: string) {
  return {
    id,
    key: 'en-56',
    settings: {
      list: [
        { id: 'q1', question: 'What is gaffer tape used for?', answer: 'Gaffer tape is used for lighting setups, panel securing, displays, and temporary fixing in studios, exhibitions, and stage environments.', icon },
        { id: 'q2', question: 'Why is gaffer tape used in stage production?', answer: 'Gaffer tape for stage production is preferred because its matte surface helps reduce light reflection and keeps visual setups clean and professional.', icon },
        { id: 'q3', question: 'What is gaffer tape made of?', answer: 'Gaffer tape is made with a woven fabric base of cellulose acetate fibers and coated with a hot-melt pressure-sensitive adhesive.', icon },
        { id: 'q4', question: 'Is gaffer tape good for studios and exhibitions?', answer: 'Yes. Gaffer tape for studios and exhibitions is widely used because it is easy to apply, has strong tensile strength, and offers a clean appearance.', icon },
      ],
      ...background,
      paddingY: 64,
    },
    messages: { iconAlt: 'FAQ icon' },
  };
}

export function previewEn57Section(id: string) {
  return {
    id,
    key: 'en-57',
    settings: {
      interval: 5,
      tabArrow: icon,
      items: [
        en57Item('psa', '01', 'PSA Labels', 'Release Liners For Reliable Label Converting', 'Stable release, flatness and web control help labels move cleanly through printing, die-cutting, matrix stripping and automatic dispensing.', 0),
        en57Item('tape', '02', 'Self-Adhesive Tape', 'Liners Matched To Tape Coating Lines', 'Release and web control stay consistent through coating, slitting and rewind so tape constructions remain flat and clean.', 1),
        en57Item('digital', '03', 'Digital Printing', 'Liners For High-Speed Digital Print', 'Dimensional stability and clean matrix stripping support digital presses and automatic labeling without dusting or curl.', 2),
        en57Item('medical', '04', 'Medical', 'Medical Release Constructions', 'Paper and film structures are selected for cleanliness, sterilization windows and controlled release against medical adhesives.', 0),
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 48,
    },
    messages: { tabsLabel: 'Solutions', imageAlt: 'Solution image' },
  };
}

export function previewEn58Section(id: string) {
  return {
    id,
    key: 'en-58',
    settings: {
      list: [
        { id: 'p1', number: '01', icon, title: 'Base Material', description: 'Glassine · PEK · PET · PP · MOPP · CCK' },
        { id: 'p2', number: '02', icon, title: 'Barrier Coating', description: 'Clay · PE · PVA' },
        { id: 'p3', number: '03', icon, title: 'Surface Modification', description: 'Corona · Plasma' },
        { id: 'p4', number: '04', icon, title: 'Release Coating', description: 'Silicone · Fluorine-based · Non-silicone' },
        { id: 'p5', number: '05', icon, title: 'Curing', description: 'Thermal · UV' },
        { id: 'p6', number: '06', icon, title: 'Adhesive Compatibility', description: 'Water · Solvent · Hot melt · Silicone' },
        { id: 'p7', number: '07', icon, title: 'Converting', description: 'Coating · Embossing · Printing · Slitting' },
        { id: 'p8', number: '08', icon, title: 'End-Use Application', description: 'Labels · Tapes · Medical · Industrial' },
      ],
      ...background,
      paddingY: 48,
    },
    messages: { iconAlt: 'Process icon' },
  };
}

export function previewEn59Section(id: string) {
  return {
    id,
    key: 'en-59',
    settings: {
      title: 'Release Force Engineered\nAround Your Adhesive',
      titleTag: 'h2',
      description: 'The same liner can behave differently with another adhesive, coating weight or aging condition. Target bands are therefore confirmed through construction-level testing.',
      bands: [
        { id: 'b1', range: '5–10', unit: 'g/25 mm', level: 'Easy', color: '#f59e0b', icon },
        { id: 'b2', range: '8–15', unit: 'g/25 mm', level: 'Standard', color: '#ea580c', icon },
        { id: 'b3', range: '10–20', unit: 'g/25 mm', level: 'Medium', color: '#dc2626', icon },
        { id: 'b4', range: '35–50', unit: 'g/25 mm', level: 'Tight', color: '#b91c1c', icon },
        { id: 'b5', range: '≥50', unit: 'g/25 mm', level: 'Very Tight', color: '#7f1d1d', icon },
      ],
      note: 'Reference bands only. Final values depend on the agreed test method and product construction.',
      testTitle: '85°C/85°RH',
      testSubtitle: 'Aging Test',
      testDescription: 'Release behavior can be evaluated after exposure to 85°C and 85% RH for selected validation programs.',
      infoSections: [
        { id: 's1', title: 'Performance Validation', items: [{ id: 'i1', text: 'Release-force testing' }, { id: 'i2', text: 'Silicone-transfer testing' }] },
        { id: 's2', title: 'Process Control', items: [{ id: 'i3', text: 'Online coating-weight control' }, { id: 'i4', text: 'Paper-defect inspection' }] },
      ],
      cta: { link: page('about', 'Learn more about our R&D and quality control capabilities.'), variant: 'danger', icon },
      ...background,
      paddingY: 48,
    },
    messages: { iconAlt: 'Release force' },
  };
}

export function previewEn60Section(id: string) {
  return {
    id,
    key: 'en-60',
    settings: {
      tableLabel: 'Release liner material specifications',
      columns: [
        { id: 'base-material', label: 'BASE MATERIAL', type: 'strong', width: 1 },
        { id: 'basis-weight', label: 'BASIS WEIGHT / THICKNESS', type: 'normal', width: 1 },
        { id: 'silicone-coating', label: 'SILICONE COATING', type: 'normal', width: 1 },
        { id: 'width-range', label: 'WIDTH RANGE', type: 'normal', width: 1 },
        { id: 'typical-applications', label: 'TYPICAL APPLICATIONS', type: 'normal', width: 1 },
      ],
      rows: [
        ['Glassine', '38–137 gsm', 'Single / Double', '120–1600 mm', 'Labels, tapes, medical'],
        ['CCK', '58–137 gsm', 'Single', '120–1600 mm', 'Labels, graphics, foam tapes'],
        ['PEK', '78–140 gsm', 'Single / Double', '500–1600 mm', 'Labels, self-adhesive vinyl'],
        ['PET', '12–75 gsm', 'Single / Double', '500–1600 mm', 'Labels, tapes, medical, die-cutting'],
        ['PP', '25–38 gsm', 'Single', '500–1600 mm', 'BOPP tape, waterproofing'],
        ['MOPP', '54–75 gsm', 'Single / Double', '500–1300 mm', 'MOPP and acrylic foam tapes'],
      ],
      callToAction: {
        title: 'Need another construction?',
        description: 'Barrier coatings, surface treatment, antistatic, embossing, printing, slitting and sheeting can be discussed.',
        button: button('Send Specifications'),
      },
      footnote: 'Final specifications should be confirmed based on the adhesive system, target release force, converting process and end-use application.',
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 48,
    },
    messages: {},
  };
}

export function previewEn61Section(id: string) {
  return {
    id,
    key: 'en-61',
    settings: {
      image: file('studio-cover'),
      title: 'Reduce development time\nand supply complexity',
      titleTag: 'h2',
      items: [
        { id: 'a1', title: 'Comprehensive material platform', description: 'Paper and film substrates with silicone, fluorine-based and other non-silicone release systems.' },
        { id: 'a2', title: 'Integrated manufacturing', description: 'Coordinated base material, coating, laminating, slitting and converting capabilities.' },
        { id: 'a3', title: 'Application matching', description: 'Recommendations consider adhesive chemistry, converting process and end-use conditions together.' },
        { id: 'a4', title: 'Regional supply', description: 'Manufacturing and service resources in China, Vietnam and Malaysia support supply flexibility.' },
      ],
      action: { link: page('about', 'Explore our specialty paper manufacturing capabilities'), variant: 'link', icon },
      ...background,
      paddingY: 64,
    },
    messages: { imageAlt: 'Development image' },
  };
}

export function previewEn62Section(id: string) {
  return {
    id,
    key: 'en-62',
    settings: {
      defaultExpanded: 'first',
      faqSchema: false,
      list: [
        { id: 'f1', question: 'What information is needed for a release liner recommendation?', answer: 'Paper and film substrates with silicone, fluorine-based and other non-silicone release systems.' },
        { id: 'f2', question: 'How do I choose between a paper and a film release liner?', answer: 'The choice depends on dimensional stability, strength, transparency, temperature resistance and converting requirements.' },
        { id: 'f3', question: 'Can YG Group customize release force?', answer: 'Yes. Release force can be matched to the adhesive system, application process and end-use requirements.' },
        { id: 'f4', question: 'Are single-sided and double-sided silicone coatings available?', answer: 'Yes. Both single-sided and double-sided coating structures are available for different converting applications.' },
        { id: 'f5', question: 'Which adhesive systems can be matched?', answer: 'Solutions can be developed for water-based, solvent-based, hot-melt and silicone adhesive systems.' },
        { id: 'f6', question: 'How is release consistency evaluated?', answer: 'Release consistency is evaluated through controlled testing of release force, stability and application performance.' },
      ],
      button: button('Start a Technical Discussion'),
      ...background,
      paddingY: 48,
    },
    messages: {},
  };
}
