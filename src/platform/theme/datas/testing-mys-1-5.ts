import { defineModuleReferenceData } from '../define/datas';

const file = (id: string) => defineModuleReferenceData('file', id);
const page = (id: string, _title?: string) => ({ type: 'module' as const, reference: 'module.page' as const, id, target: '_self' as const });
const covers = ['studio-cover', 'material-board', 'reading-room'] as const;
const imageAt = (index: number) => file(covers[index % covers.length]);
const icon = file('site-icon');
const inquire = page('contact', 'Inquire Now');
const details = page('features', 'View More');
const contact = page('contact', 'Contact Us +');

const card = (
  id: string,
  title: string,
  intro: string,
  imageIndex: number,
) => ({
  id,
  image: imageAt(imageIndex),
  title,
  intro,
  slug: page('features', title),
  buttons: [
    { id: `${id}-ask`, link: inquire, variant: 'danger', icon: null },
    { id: `${id}-more`, link: details, variant: 'default', icon: null },
  ],
});

export function previewMy1Section(id: string) {
  return {
    id,
    key: 'my-1',
    settings: {
      title: 'Product Center',
      intro: 'Tape converting from the Malaysia plant',
      items: [
        card('masking', 'High-Temperature Masking Tape', 'Crepe backing / Rubber adhesive / 160°C bake / Clean removal after powder coat', 0),
        card('foam', 'PE Foam Mounting Tape', 'Closed-cell foam / Indoor mounting / Nameplates / Gap filling on metal panels', 1),
        card('liner', 'Silicone Release Liner', 'Glassine / PET / Differential release / Label converting in Shah Alam', 2),
        card('tissue', 'Double-Sided Tissue Tape', 'Tissue carrier / High tack / Foam gaskets / Overlay bonding', 0),
        card('filament', 'Filament Strapping Tape', 'Glass yarn / Carton sealing / Pallet stabilization for export loads', 1),
        card('gaffer', 'Matte Gaffer Tape', 'Woven cloth / Low glare / Stage and exhibition fixing without residue', 2),
        card('duct', 'PE Coated Cloth Tape', 'Polyethylene coat / HVAC sealing / Temporary weather wrap on site', 0),
        card('transfer', 'Adhesive Transfer Tape', 'Unsupported acrylic / Graphic films / Overlay laminating on PET', 1),
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Tape sample' },
  };
}

export function previewMy2Section(id: string) {
  return {
    id,
    key: 'my-2',
    settings: {
      title: 'Malaysia Plant',
      intro: 'Coating and converting campus in Kuala Lumpur',
      embedUrl: 'https://maps.google.com/maps/embed?q=Kuala+Lumpur',
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { mapTitle: 'Malaysia plant location map' },
  };
}

export function previewMy3Section(id: string) {
  return {
    id,
    key: 'my-3',
    settings: {
      title: 'The Service',
      intro: 'Support from the Malaysia converting campus',
      items: [
        {
          id: 'inquiry',
          image: icon,
          title: 'Online Form',
          intro: 'Send a converting brief and the Malaysia plant will reply with lead time, jumbo log widths and slit-to-width options.',
          other: { link: page('contact', 'Request a quote'), variant: 'link', icon: null },
        },
        {
          id: 'samples',
          image: icon,
          title: 'Sample Rolls',
          intro: 'Request pancake rolls or short logs of crepe masking tape and silicone liner from the same coating lot.',
          other: { link: page('contact', 'Ask for samples'), variant: 'link', icon: null },
        },
        {
          id: 'slitting',
          image: icon,
          title: 'Slitting Support',
          intro: 'In-house slitting and rewinding keep export cartons, die-cut stacks and jumbo logs on one inspection lot.',
          other: { link: page('features', 'See converting'), variant: 'link', icon: null },
        },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Service icon' },
  };
}

export function previewMy4Section(id: string) {
  return {
    id,
    key: 'my-4',
    settings: {
      style: 'style1',
      image: file('studio-cover'),
      title: 'About the Malaysia Group',
      intros: [
        {
          id: 'campus',
          text: 'The Malaysia plant coats solvent and hot-melt constructions on a shared campus in the Klang Valley. Incoming adhesive, liner and release tests are logged against every production lot before slitting starts.',
        },
        {
          id: 'lines',
          text: 'Crepe masking tape, silicone release liner and double-sided tissue tape leave the same inspection hall. Jumbo logs, pancake rolls and export cartons share one specification, so converters do not wait on a second handling step.',
        },
        {
          id: 'export',
          text: 'In-house slitting, rewinding and export packing keep ASEAN and long-haul shipments on a predictable lead time. Sample rolls for powder coating, automotive refinish and label converting ship from the same warehouse as container loads.',
        },
      ],
      contactIntro: '* One click to the contact page for Malaysia plant samples and converting quotes',
      contactButton: { link: contact, variant: 'danger', icon: null },
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Malaysia plant image' },
  };
}

export function previewMy5Section(id: string) {
  return {
    id,
    key: 'my-5',
    settings: {
      title: 'Ask Question',
      items: [
        {
          id: 'q1',
          label: 'Q1. Where is the Malaysia converting plant?',
          value: 'Coating, slitting and export packing run on one campus in the Klang Valley, with sample rolls and container loads leaving the same warehouse for ASEAN and long-haul converters.',
        },
        {
          id: 'q2',
          label: 'Q2. What constructions run in Malaysia?',
          value: 'Crepe masking tape for 160°C bake cycles, silicone-coated release liner for label converting, and double-sided tissue tape for nameplates and foam gaskets share the same coating lines.',
        },
        {
          id: 'q3',
          label: 'Q3. Can we trial slit widths before a container load?',
          value: 'Yes. The plant can rewind pancake rolls or short logs from the production lot so converting lines can check unwind, release and adhesive coat weight before the export carton is packed.',
        },
        {
          id: 'q4',
          label: 'Q4. How do we request a technical data sheet?',
          value: 'Open the contact page with the construction, slit width and bake or release target. The Malaysia plant replies with the matching lot record and a converting recommendation.',
        },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: {},
  };
}
