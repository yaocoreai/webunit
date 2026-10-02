import { defineModuleReferenceData } from '../define/datas';

const file = (id: string) => defineModuleReferenceData('file', id);
const covers = ['studio-cover', 'material-board', 'reading-room'] as const;
const imageAt = (index: number) => file(covers[index % covers.length]);
const pageLink = (id: string, _title?: string) => ({
  type: 'module' as const,
  reference: 'module.page' as const,
  id,
  target: '_self' as const,
});
const contact = pageLink('contact', 'Contact Us');
const about = pageLink('about', 'Learn More');
const features = pageLink('features', 'View More');
const inquire = pageLink('contact', 'Inquire Now');

const regionMenus = (prefix: string, titles: readonly string[]) => titles.map((title, index) => ({
  id: `${prefix}-${index + 1}`,
  link: pageLink('contact', title),
}));

export function previewEn1Section(id: string) {
  return {
    id,
    key: 'en-1',
    settings: {
      blocks: [
        {
          id: 'asia',
          image: file('site-icon'),
          title: 'Asia & Pacific',
          menus: regionMenus('asia', ['China Converting Expo', 'Japan Adhesive Fair', 'Korea Tape Summit', 'Vietnam Coating Week', 'Malaysia Liner Forum', 'Thailand Packaging Show', 'India Release Conference', 'Indonesia Masking Day']),
        },
        {
          id: 'europe',
          image: file('site-icon'),
          title: 'Europe',
          menus: regionMenus('eu', ['Germany Label Expo', 'Italy Converting Days', 'France Adhesive Forum', 'United Kingdom Tape Show', 'Poland Packaging Fair', 'Spain Graphic Films', 'Netherlands Coating Week', 'Turkey Industrial Tape']),
        },
        {
          id: 'americas',
          image: file('site-icon'),
          title: 'Americas',
          menus: regionMenus('am', ['United States Tape Expo', 'Mexico Converting Show', 'Brazil Packaging Fair', 'Canada Adhesive Days', 'Argentina Label Forum', 'Colombia Industrial Tape', 'Chile Graphic Films', 'Peru Release Liner']),
        },
        {
          id: 'mea',
          image: file('site-icon'),
          title: 'Middle East & Africa',
          menus: regionMenus('mea', ['UAE Packaging Expo', 'Saudi Coating Forum', 'South Africa Tape Show', 'Egypt Converting Days', 'Nigeria Industrial Fair', 'Kenya Label Summit', 'Morocco Adhesive Week', 'Israel Materials Expo']),
        },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 0,
    },
    messages: { imageAlt: 'Region image' },
  };
}

export function previewEn2Section(id: string) {
  return {
    id,
    key: 'en-2',
    settings: {
      title: 'Exhibition Details',
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: {},
  };
}

export function previewEn3Section(id: string) {
  return {
    id,
    key: 'en-3',
    settings: {
      blocks: [
        { id: 't1', type: 'default', link: pageLink('about', 'Silicone-coated release liner and crepe masking tape are produced on the same campus, with ') },
        { id: 't2', type: 'link', link: pageLink('features', 'in-house slitting and rewinding') },
        { id: 't3', type: 'default', link: pageLink('about', ' so sample rolls, jumbo logs and export cartons share one inspection lot.') },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: {},
  };
}

export function previewEn4Section(id: string) {
  const intro = 'Crepe masking tape holds a sharp paint edge through a 160°C bake, then releases from clear coat, powder-coated metal and anodized aluminum without ghosting. Converting plants use the same construction for powder coating, automotive refinish and industrial spray lines where solvent wipe and oven dwell would lift a commodity tape.';
  return {
    id,
    key: 'en-4',
    settings: {
      title: 'Applications',
      category: 'Packaging Scenario',
      showTotalIntro: true,
      totalIntro: 'Founded: {total} Results',
      blocks: [
        { id: 'auto', icon: file('site-icon'), label: 'Automotive', image: imageAt(0), title: 'Automotive Refinish Masking', intro, button: { link: pageLink('features', 'Learn More'), variant: 'danger', icon: null } },
        { id: 'powder', icon: file('site-icon'), label: 'Powder Coat', image: imageAt(1), title: 'Powder Coating Lines', intro, button: { link: inquire, variant: 'danger', icon: null } },
        { id: 'pack', icon: file('site-icon'), label: 'Packaging', image: imageAt(2), title: 'Carton Sealing and Splicing', intro, button: { link: features, variant: 'danger', icon: null } },
        { id: 'elec', icon: file('site-icon'), label: 'Electronics', image: imageAt(0), title: 'Electronics Assembly Tapes', intro, button: { link: about, variant: 'danger', icon: null } },
        { id: 'graphic', icon: file('site-icon'), label: 'Graphics', image: imageAt(1), title: 'Graphic Films and Overlaminates', intro, button: { link: features, variant: 'danger', icon: null } },
        { id: 'medical', icon: file('site-icon'), label: 'Medical', image: imageAt(2), title: 'Skin-Friendly Release Liners', intro, button: { link: contact, variant: 'danger', icon: null } },
        { id: 'build', icon: file('site-icon'), label: 'Construction', image: imageAt(0), title: 'HVAC and Weather Sealing', intro, button: { link: inquire, variant: 'danger', icon: null } },
        { id: 'office', icon: file('site-icon'), label: 'Office', image: imageAt(1), title: 'Nameplates and Office Mounting', intro, button: { link: about, variant: 'danger', icon: null } },
        { id: 'hygiene', icon: file('site-icon'), label: 'Hygiene', image: imageAt(2), title: 'Hygiene Core and Ear-Loop Tapes', intro, button: { link: features, variant: 'danger', icon: null } },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: { imageAlt: 'Application image', iconAlt: 'Application icon' },
  };
}

export function previewEn5Section(id: string) {
  return {
    id,
    key: 'en-5',
    settings: {
      title: 'Application',
      items: [
        { id: 'office', label: 'Office supplies and nameplate mounting' },
        { id: 'electronics', label: 'Electronics assembly and insulation wrapping' },
        { id: 'signage', label: 'Signage, graphic films and overlay bonding' },
        { id: 'auto', label: 'Automotive refinish and wire-harness wrapping' },
        { id: 'pack', label: 'Carton sealing, splicing and pallet stabilization' },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: {},
  };
}

export function previewEn6Section(id: string) {
  return {
    id,
    key: 'en-6',
    settings: {
      style: 'style1',
      image: file('studio-cover'),
      title: 'Stick to Innovation, Bond with Future',
      intro: 'Solvent and hot-melt coating lines run masking tape, double-sided tissue tape and silicone release liner on a shared campus. Incoming adhesive, liner and release tests are logged against every production lot. In-house slitting, rewinding and export packing keep sample rolls and container loads on the same specification, so converters receive jumbo logs, pancake rolls and die-cut stacks without a second handling step.',
      contactIntro: '* Directing to contact page by just one clicking',
      contactButton: { link: pageLink('contact', 'Contact Us +'), variant: 'danger', icon: null },
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Section image' },
  };
}

export function previewEn7Section(id: string) {
  return {
    id,
    key: 'en-7',
    settings: {
      enableCountup: true,
      items: [
        { id: 'lines', value: 28, suffix: '+', unit: '', intro: 'Coating and converting lines' },
        { id: 'years', value: 30, suffix: '+', unit: '', intro: 'Years of release liner production' },
        { id: 'countries', value: 120, suffix: '+', unit: '', intro: 'Export destinations' },
        { id: 'skus', value: 5000, suffix: '+', unit: '', intro: 'Tape and liner SKUs' },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 0,
    },
    messages: {},
  };
}

export function previewEn8Section(id: string) {
  return {
    id,
    key: 'en-8',
    settings: {
      title: 'What We Have?',
      intro: 'Coating, converting and export packing under one roof for masking tape and release liner.',
      columns: [
        {
          id: 'bases',
          arrow: file('site-icon'),
          image: file('site-icon'),
          title: 'Production Bases',
          intros: [
            { id: 'i1', text: 'YG possesses production bases in ', type: 'default', link: null },
            { id: 'i2', text: 'Malaysia', type: 'danger', link: null },
            { id: 'i3', text: ' & ', type: 'default', link: null },
            { id: 'i4', text: 'Vietnam', type: 'link', link: pageLink('about', 'Vietnam') },
            { id: 'i5', text: ', offering you significant tariff advantages!', type: 'default', link: null },
          ],
          other: { link: pageLink('contact', 'Request a converting quote'), variant: 'link', icon: null },
        },
        {
          id: 'coating',
          arrow: null,
          image: file('site-icon'),
          title: 'Coating Lines',
          intros: [
            { id: 'i1', text: 'Solvent and hot-melt lines run ', type: 'default', link: null },
            { id: 'i2', text: 'silicone release', type: 'danger', link: null },
            { id: 'i3', text: ' and ', type: 'default', link: null },
            { id: 'i4', text: 'crepe masking', type: 'link', link: pageLink('features', 'crepe masking') },
            { id: 'i5', text: ' constructions from jumbo log to pancake roll.', type: 'default', link: null },
          ],
          other: { link: pageLink('features', 'See coating capability'), variant: 'link', icon: null },
        },
        {
          id: 'packing',
          arrow: null,
          image: file('site-icon'),
          title: 'Export Packing',
          intros: [
            { id: 'i1', text: 'Export cartons, pallets and moisture barriers are prepared for ', type: 'default', link: null },
            { id: 'i2', text: 'ocean freight', type: 'danger', link: null },
            { id: 'i3', text: ' with lot-level ', type: 'default', link: null },
            { id: 'i4', text: 'inspection records', type: 'link', link: pageLink('contact', 'inspection records') },
            { id: 'i5', text: ' packed in every container.', type: 'default', link: null },
          ],
          other: { link: pageLink('contact', 'Talk to export packing'), variant: 'link', icon: null },
        },
      ],
      buttons: [
        { id: 'inquire', link: inquire, variant: 'danger', icon: null },
        { id: 'more', link: features, variant: 'default', icon: null },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Column icon' },
  };
}

export function previewEn9Section(id: string) {
  return {
    id,
    key: 'en-9',
    settings: {
      title: 'Product Center',
      titleTag: 'h2',
      intro: 'Masking tape, release liner and double-sided constructions for converting lines.',
      items: [
        {
          id: 'masking',
          image: file('studio-cover'),
          title: 'High-Temperature Masking Tape',
          intro: 'Crepe backing / Rubber adhesive / 160°C bake / Clean removal',
          buttons: [
            { id: 'inquire', link: inquire, variant: 'danger', icon: null },
            { id: 'more', link: features, variant: 'default', icon: null },
          ],
        },
        {
          id: 'tissue',
          image: file('material-board'),
          title: 'Double-Sided Tissue Tape',
          intro: 'Tissue carrier / High tack / Nameplates / Foam gaskets',
          buttons: [
            { id: 'inquire', link: inquire, variant: 'danger', icon: null },
            { id: 'more', link: about, variant: 'default', icon: null },
          ],
        },
        {
          id: 'liner',
          image: file('reading-room'),
          title: 'Silicone Release Liner',
          intro: 'Glassine / PET / Differential release / Label converting',
          buttons: [
            { id: 'inquire', link: inquire, variant: 'danger', icon: null },
            { id: 'more', link: contact, variant: 'default', icon: null },
          ],
        },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Product image' },
  };
}

export function previewEn10Section(id: string) {
  return {
    id,
    key: 'en-10',
    settings: {
      embedUrl: 'https://maps.google.com/maps/embed?q=Shanghai',
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { mapTitle: 'Factory location map' },
  };
}
