import { defineModuleReferenceData } from '../define/datas';

const file = (id: string) => defineModuleReferenceData('file', id);
const icon = file('site-icon');
const page = (id: string, _title?: string) => ({ type: 'module' as const, reference: 'module.page' as const, id, target: '_self' as const });
const button = (title: string, target: 'about' | 'contact', show = true) => ({
  link: page(target, title),
  variant: 'danger' as const,
  icon: null,
  show,
});

const tapeTitle = 'BOPP Adhesive Tape Suppliers: Innovating for Enhanced Packaging Efficiency';

export function previewSidebar2Section(id: string) {
  return {
    id,
    key: 'sidebar-2',
    settings: {
      previous: page('about', tapeTitle),
      next: page('features', tapeTitle),
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 16,
    },
    messages: { previous: 'Prev:', next: 'Next:' },
  };
}

export function previewSidebar3Section(id: string) {
  return {
    id,
    key: 'sidebar-3',
    settings: {
      medias: [
        { id: 'facebook', type: 'facebook', icon, link: null },
        { id: 'twitter', type: 'twitter', icon, link: null },
        { id: 'linkedin', type: 'linkedin', icon, link: null },
        { id: 'whatsapp', type: 'whatsapp', icon, link: null },
        { id: 'telegram', type: 'telegram', icon, link: null },
        { id: 'email', type: 'email', icon, link: page('contact', 'Email') },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 16,
    },
    messages: {
      preview: 'Preview only. The page URL was copied.',
      iconAlt: 'Share icon',
    },
  };
}

export function previewSidebar4Section(id: string) {
  return {
    id,
    key: 'sidebar-4',
    settings: {
      medias: [
        { id: 'contact', link: page('contact', 'Contact'), icon },
        { id: 'about', link: page('about', 'About'), icon },
      ],
      top: { icon },
      color: '',
    },
    messages: { iconAlt: 'Shortcut icon', backToTop: 'Back to top' },
  };
}

export function previewMapcardSection(id: string) {
  return {
    id,
    key: 'mapcard',
    settings: {
      mapImage: file('material-board'),
      cardColor: '',
      cardImage: null,
      overview: {
        flag: 'Global Footprint',
        title: 'Global Footprint',
        subtitle: 'Production bases worldwide',
        content: 'Headquarters in Qingpu, Shanghai, with plants in Jiangxi, Shandong, Haiphong Vietnam and Malaysia. Consumer, automotive, industrial and specialty adhesive materials ship to more than 110 countries.',
        button: button('View details', 'about', true),
      },
      items: [
        {
          id: 'shanghai',
          x: 75,
          y: 42,
          flag: 'Shanghai',
          title: 'Shanghai Headquarters',
          subtitle: 'Global R&D Center',
          content: 'Qingpu campus combines coating, slitting and converting with more than 5.5 billion m² of annual capacity for export programs.',
          button: button('About Shanghai', 'about', true),
        },
        {
          id: 'jiangxi',
          x: 72,
          y: 48,
          flag: 'Jiangxi',
          title: 'Jiangxi Plant',
          subtitle: 'Coating and jumbo supply',
          content: 'Fuzhou lines feed masking, tissue and cloth constructions for converting plants across Asia.',
          button: button('Contact Jiangxi', 'contact', false),
        },
        {
          id: 'vietnam',
          x: 67,
          y: 57,
          flag: 'Vietnam',
          title: 'Vietnam Plant',
          subtitle: 'Vertical integration',
          content: 'Haiphong manufacturing covers intelligent coating and converting for Southeast Asia delivery.',
          button: button('About Vietnam', 'about', true),
        },
        {
          id: 'malaysia',
          x: 66,
          y: 64,
          flag: 'Malaysia',
          title: 'Malaysia Plant',
          subtitle: 'Regional converting hub',
          content: 'Malaysia slitting and packing serve ASEAN converters with short-lead export cartons and pallets.',
          button: button('Contact Malaysia', 'contact', false),
        },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { mapAlt: 'World map', overviewDot: 'Overview' },
  };
}
