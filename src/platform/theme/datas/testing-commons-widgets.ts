import { defineModuleReferenceData } from '../define/datas';

const file = (id: string) => defineModuleReferenceData('file', id);
const covers = ['studio-cover', 'material-board', 'reading-room'] as const;
const imageAt = (index: number) => file(covers[index % covers.length]);
const icon = file('site-icon');
const page = (id: string, _title?: string, target: '_self' | '_blank' = '_self') => ({
  type: 'module' as const,
  reference: 'module.page' as const,
  id,
  target,
});
const catalog = (_title?: string) => ({ type: 'module' as const, reference: 'module.catalog' as const, id: 'products', target: '_self' as const });
const review = 'We have been converting masking, foam and cloth tapes on the same campus for years. Coat weight, slitting and export packing stay in one inspection lot, so sample rolls and jumbo logs land with the same release force.';

export function previewComment1Section(id: string) {
  return {
    id,
    key: 'comment-1',
    settings: {
      title: 'Reviews',
      intro: 'Do you find this converting note helpful? Leave your review below.',
      inputPlaceholder: 'Share how the tape ran on your coating or slitting line...',
      inputPromotions: 'Tell us if the crepe masking or foam gasket construction saved a setup.',
      topIntro: 'Pinned To The Top',
      totalIntro: '(Total: {total} Reviews)',
      submitButton: { link: null, variant: 'danger', icon: null },
      topImage: icon,
      likeImage: icon,
      likeImageActive: icon,
      likeImageIntro: 'Yes, I found this content helpful and would recommend this tape.',
      dislikeImage: icon,
      dislikeImageActive: icon,
      dislikeImageIntro: 'No, I did not find this content helpful and would not recommend this product.',
      blocks: [
        { id: 'pinned', date: 'Dec 8, 2025', top: '1', score: '5', content: review },
        { id: 'foam', date: 'Nov 21, 2025', top: '0', score: '5', content: 'EPDM foam tape sealed the electronics housing without lifting after a solvent wipe. The jumbo log slit cleanly on our 1.3 m rewinder.' },
        { id: 'masking', date: 'Oct 4, 2025', top: '0', score: '5', content: 'High-temperature crepe masking held a sharp paint edge through a 160°C bake and released from clear coat without ghosting.' },
        { id: 'liner', date: 'Sep 12, 2025', top: '0', score: '0', content: 'The PET liner was stiffer than our current glassine stock, so we would need a different unwind tension before recommending it on this line.' },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 32,
    },
    messages: {
      submit: 'Send',
      required: 'Please enter your content.',
      preview: 'Preview only. This form does not send a request.',
      imageAlt: 'Review icon',
    },
  };
}

export function previewPrivacy1Section(id: string) {
  return {
    id,
    key: 'privacy-1',
    settings: {
      intro: 'We use cookies and similar technologies on our website to enhance your browsing experience, analyze site traffic, and personalize content. By continuing to browse or by clicking "Accept All Cookies," you agree to our use of cookies.',
      acceptText: 'Accept All Cookies',
      declineText: 'Decline Cookies',
      learnMore: page('about', 'Read Privacy Terms', '_blank'),
    },
    messages: {
      preview: 'Preview only. Cookie consent is not wired here.',
    },
  };
}

export function previewDifySection(id: string) {
  return {
    id,
    key: 'dify',
    settings: {
      url: 'https://example.invalid/chatbot',
      image: icon,
    },
    messages: {
      preview: 'Chatbot is not connected.',
      open: 'Open chatbot',
      close: 'Close chatbot',
      imageAlt: 'Chat launcher',
    },
  };
}

export function previewSalesmartlySection(id: string) {
  return {
    id,
    key: 'salesmartly',
    settings: {
      image: icon,
      position: { height: 80, right: 20, bottom: 30 },
      code: 'https://example.invalid/salesmartly.js',
    },
    messages: {
      preview: 'Preview only. Live chat is not connected.',
      open: 'Open live chat',
      imageAlt: 'Live chat launcher',
    },
  };
}

export function previewSearch1Section(id: string) {
  const card = (key: string, title: string, index: number) => ({
    id: key,
    image: imageAt(index),
    title,
    link: catalog(title),
  });
  const linkItem = (key: string, title: string, reference: 'module.page' | 'module.catalog' | 'module.article', entryId: string) => ({
    id: key,
    image: null,
    title,
    link: { type: 'module' as const, reference, id: entryId, target: '_self' as const },
  });
  return {
    id,
    key: 'search-1',
    settings: {
      image: icon,
      placeholder: 'Search masking, foam and cloth tapes',
      groups: [
        {
          id: 'products',
          title: 'Adhesive Tapes',
          intro: 'Explore more similar converting constructions',
          type: 'card',
          moreButton: { link: catalog('Load More'), variant: 'danger', icon: null },
          viewButton: { title: 'Read More' },
          items: [
            card('masking', 'High-Temperature Masking Tape', 0),
            card('foam', 'EPDM Closed-Cell Foam Tape', 1),
            card('tissue', 'Tissue Double-Sided Tape', 2),
            card('cloth', 'Natural Rubber Cloth Tape', 0),
            card('pet', 'PET Protective Film', 1),
          ],
        },
        {
          id: 'notes',
          title: 'Application Notes',
          intro: 'Open converting notes, catalogs and plant pages',
          type: 'link',
          moreButton: { link: page('features', 'Load More'), variant: 'danger', icon: null },
          viewButton: { title: 'Read More' },
          items: [
            linkItem('bake', 'Automotive refinish bake cycles', 'module.article', 'materials-guide'),
            linkItem('powder', 'Powder coating line masking', 'module.catalog', 'products'),
            linkItem('gasket', 'Electronics housing gaskets', 'module.page', 'features'),
            linkItem('liner', 'Release liner selection guide', 'module.article', 'materials-guide'),
            linkItem('packing', 'Export packing and inspection lots', 'module.page', 'about'),
          ],
        },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 0,
    },
    messages: {
      all: 'All',
      empty: 'No Data',
      loadMore: 'Load More',
      preview: 'Preview only. Pagination is not wired.',
      imageAlt: 'Search result image',
    },
  };
}

export function previewNavigation1Section(id: string) {
  return {
    id,
    key: 'navigation-1',
    settings: {
      title: 'Masking Tapes',
      showTotalIntro: true,
      totalIntro: 'Founded: {total} Results',
      total: 24,
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 0,
    },
    messages: {},
  };
}

export function previewTimelineSection(id: string) {
  return {
    id,
    key: 'timeline',
    settings: {
      interval: 6,
      items: [
        { id: '2004', year: '2004', title: '2004 Building a flagship cloth tape', content: 'Cloth tape was coated in-house and became the first construction converters asked for by name. Natural rubber and UV-resistant grades followed on the same line.' },
        { id: '2010', year: '2010', title: '2010 Masking and foam lines', content: 'Crepe masking and EPDM foam gasket tapes were added so paint shops and electronics plants could source both constructions from one campus.' },
        { id: '2016', year: '2016', title: '2016 Release liner coating', content: 'Silicone-coated glassine and PET liners started running next to the tape coaters, so label and tape converters shared one inspection lot.' },
        { id: '2020', year: '2020', title: '2020 Export packing hall', content: 'Sample rolls, jumbo logs and export cartons moved into a dedicated packing hall with incoming adhesive checks on every lot.' },
        { id: '2024', year: '2024', title: '2024 High-temperature masking', content: 'A 160°C crepe masking tape entered regular production for automotive refinish and powder-coating jigs that need a clean paint edge.' },
      ],
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: {},
  };
}

export function previewHo2Section(id: string) {
  const item = (key: string, title: string, intro: string, index: number) => ({
    id: key,
    image: imageAt(index),
    title,
    intro,
  });
  return {
    id,
    key: 'ho-2',
    settings: {
      title: 'Products App',
      intro: 'Discover What Our Products Can Be Used For',
      arrow: icon,
      interval: 0,
      items: [
        item('labels', 'For Labels', 'Release liners and tissue tape for label converting', 0),
        item('masking', 'For Masking', 'Crepe masking that holds a bake cycle and releases clean', 1),
        item('packaging', 'For Packaging', 'Carton sealing, splicing and export packing tapes', 2),
        item('electronics', 'For Electronics', 'Foam gaskets and PET films for housings', 0),
        item('graphics', 'For Graphics', 'Over-laminates and wrapping films for fleets', 1),
      ],
      backgroundColor: '#f9f9f9',
      backgroundImage: null,
      paddingY: 64,
    },
    messages: {
      previous: 'Previous',
      next: 'Next',
      imageAlt: 'Application image',
    },
  };
}
