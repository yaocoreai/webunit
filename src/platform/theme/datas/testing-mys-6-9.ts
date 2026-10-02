import { defineModuleReferenceData } from '../define/datas';

const file = (id: string) => defineModuleReferenceData('file', id);
const page = (id: string, _title?: string) => ({ type: 'module' as const, reference: 'module.page' as const, id, target: '_self' as const });
const catalog = (_title?: string) => ({ type: 'module' as const, reference: 'module.catalog' as const, id: 'products', target: '_self' as const });
const article = (_title?: string) => ({ type: 'module' as const, reference: 'module.article' as const, id: 'materials-guide', target: '_self' as const });
const covers = ['studio-cover', 'material-board', 'reading-room'] as const;
const imageAt = (index: number) => file(covers[index % covers.length]);

const longIntro = 'Our Shah Alam converting campus coats, slits and rewinds masking tape, tissue double-sided tape and silicone release liner for Malaysian and ASEAN converters. Incoming adhesive, coat-weight and release-force checks sit on the same inspection lot as export packing, so sample rolls, jumbo logs and container cartons share one quality record. The plant runs solvent and hot-melt lines for automotive refinish, powder coating, carton sealing and graphic films, with in-house slitting to converter widths and cores. Documentation ships with the first carton: technical data, coat-weight logs and packing lists for ocean freight out of Port Klang.';

export function previewMy6Section(id: string) {
  return {
    id,
    key: 'my-6',
    settings: {
      intro: longIntro,
      contactButton: { link: page('contact', 'Contact Us Now!'), variant: 'danger' as const, icon: null },
      contactIntro: '* Sample rolls and export cartons share one inspection lot at the Shah Alam plant.',
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: {},
  };
}

export function previewMy7Section(id: string) {
  return {
    id,
    key: 'my-7',
    settings: {
      title: 'We Are Here To Help',
      intro: 'YG Group Malaysia',
      colLeft: {
        image: file('site-icon'),
        link: page('features', 'Customization'),
        intro: 'Coating, slitting and rewinding widths are set to each converter lot at the Shah Alam plant.',
      },
      colCenter: {
        flag: file('site-icon'),
        image: file('site-icon'),
        link: catalog('Quality Control'),
        intro: 'Incoming adhesive, coat weight and release tests sit on one inspection lot before export packing.',
      },
      colRight: {
        image: file('site-icon'),
        link: article('On-Time Export'),
        intro: 'Sample rolls, jumbo logs and export cartons leave Shah Alam on a shared ocean-freight schedule.',
      },
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Column image' },
  };
}

export function previewMy8Section(id: string) {
  return {
    id,
    key: 'my-8',
    settings: {
      title: 'Location',
      subTitle: 'YG Group Malaysia',
      intro: 'The Shah Alam converting campus sits on the west-coast corridor, with coating halls, slitting rooms and export packing on one site. Masking tape, tissue double-sided tape and silicone release liner move from sample roll to container load without a second plant transfer. Port Klang ocean freight and ASEAN road shipments share the same inspection lot and packing list.',
      image: file('studio-cover'),
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Location image' },
  };
}

export function previewMy9Section(id: string) {
  const certificates = [
    { id: 'iso-9001', link: page('about', 'ISO 9001 Quality System') },
    { id: 'iso-14001', link: catalog('ISO 14001 Environmental') },
    { id: 'sgs-adhesive', link: article('SGS Adhesive Testing') },
    { id: 'reach', link: page('features', 'REACH Substance Review') },
    { id: 'ul-file', link: catalog('UL Component Recognition') },
    { id: 'food-contact', link: article('Food-Contact Tape Review') },
  ];
  return {
    id,
    key: 'my-9',
    settings: {
      title: 'Certificates',
      subTitle: 'YG Group Malaysia',
      intro: 'Quality records cover incoming adhesive, coat weight, release force and finished-roll inspection before export packing from Shah Alam. Third-party reviews sit with the same lot files that travel with masking tape, tissue tape and release liner cartons.',
      interval: 5,
      certificates: certificates.map((item, index) => ({
        id: item.id,
        image: imageAt(index),
        link: item.link,
      })),
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: { imageAlt: 'Certificate' },
  };
}
