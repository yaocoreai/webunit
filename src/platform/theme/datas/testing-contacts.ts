import { defineModuleReferenceData } from '../define/datas';

const previewForm = {
  reference: 'form' as const,
  id: '11111111-1111-4111-8111-111111111111',
};

const messages = {
  required: 'Please fill in the required fields.',
  success: 'We received your request {{reference}}.',
  error: 'Unable to send the form. Please try again.',
} as const;

const about = () => ({ type: 'module' as const, reference: 'module.page', id: 'about', target: '_self' as const });
const icon = defineModuleReferenceData('file', 'site-icon');

export function previewContact1Section(id: string) {
  return {
    id,
    key: 'contact-1',
    settings: {
      title: 'Contact Us',
      intro: 'If you have any questions, you can fill in and send the following form to contact us!',
      submitText: 'Submit',
      submitVariant: 'primary',
      submitIcon: null,
      form: previewForm,
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 48,
    },
    messages,
  };
}

export function previewContact2Section(id: string) {
  return {
    id,
    key: 'contact-2',
    settings: {
      style: 'style1',
      leftTitle: 'Fill Out Then Form',
      leftIntro: 'We will get back to you ASAP!',
      rightTitle: 'Your',
      rightIntro: 'Dedicated Attendant',
      intro: 'If you have any questions, you can fill in and send the following form to contact us!',
      submitText: 'Submit',
      submitVariant: 'danger',
      submitIcon: null,
      form: previewForm,
      backgroundColor: '#f3f4f6',
      backgroundImage: null,
      paddingY: 32,
    },
    messages,
  };
}

export function previewContact3Section(id: string) {
  return {
    id,
    key: 'contact-3',
    settings: {
      leftTitle: 'Find Us',
      leftIntros: [
        { id: 'email', text: 'Email: hello@northstar.com', link: about() },
        { id: 'phone', text: 'Phone: +1 000 000 0000', link: about() },
        { id: 'address', text: 'Address: 100 Industrial Park, Example City', link: null },
      ],
      leftMedias: [
        { id: 'linkedin', icon, link: { type: 'path', href: 'https://example.com', title: 'LinkedIn', target: '_blank' } },
        { id: 'youtube', icon, link: { type: 'path', href: 'https://example.com', title: 'YouTube', target: '_blank' } },
      ],
      rightTitle: 'Get in Touch',
      rightIntro: 'As a professional provider of adhesive tape, we will be at your service.',
      submitText: 'Submit',
      submitVariant: 'primary',
      submitIcon: null,
      form: previewForm,
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 48,
    },
    messages,
  };
}

export function previewContact4Section(id: string) {
  return {
    id,
    key: 'contact-4',
    settings: {
      leftTitle: 'Any Enquiries?\nContact Us\nWithout Hesitation!',
      leftIntro: 'YG Group is your reliable partner',
      submitText: 'Submit',
      submitVariant: 'danger',
      submitIcon: null,
      form: previewForm,
      backgroundColor: '#f9fafb',
      backgroundImage: null,
      paddingY: 32,
    },
    messages,
  };
}

export function previewContact5Section(id: string) {
  return {
    id,
    key: 'contact-5',
    settings: {
      title1: 'Ready to Work With a Global Manufacturing Partner?',
      title2: '',
      description1: 'From manufacturing and quality control to export packing and documentation, we help you move from sample to shipment with one accountable team.',
      description2: 'YG Group is ready to support your next converting project.',
      form: previewForm,
      submitText: 'Talk to Our Team',
      submitVariant: 'danger',
      submitIcon: null,
      moreButtons: [
        { id: 'explore', link: { type: 'module', reference: 'module.catalog', id: 'products', target: '_self' }, variant: 'danger', icon: null },
      ],
      backgroundColor: '#f9fafb',
      backgroundImage: null,
      paddingY: 64,
    },
    messages,
  };
}

export function previewContact6Section(id: string) {
  return {
    id,
    key: 'contact-6',
    settings: {
      openByDefault: true,
      triggerText: 'Contact Us',
      title: 'Contact Us',
      intro: 'If you have any questions, you can fill in and send the following form to contact us!',
      submitText: 'Submit',
      submitVariant: 'primary',
      submitIcon: null,
      form: previewForm,
    },
    messages: { ...messages, close: 'Close', trigger: 'Open contact form' },
  };
}

export function previewContact7Section(id: string) {
  return {
    id,
    key: 'contact-7',
    settings: {
      layout: 'image-left',
      sideImage: defineModuleReferenceData('file', 'studio-cover'),
      sideLink: about(),
      title: 'Request Label Material Quote',
      intro: 'Share the product type, quantity and destination so we can prepare a material quote.',
      bottomText: 'For a faster quote, include roll width, length and adhesive type if you already know them.',
      submitText: 'Send Inquiry',
      submitVariant: 'primary',
      submitIcon: null,
      form: previewForm,
      backgroundColor: '#f3f4f6',
      backgroundImage: null,
      paddingY: 48,
    },
    messages,
  };
}

export function previewContact8Section(id: string) {
  return {
    id,
    key: 'contact-8',
    settings: {
      title: 'Get a Release Liner\nRecommendation',
      titleTag: 'h2',
      description: 'Share your application, adhesive system and converting needs. A specialist will recommend a liner construction.',
      requirements: [
        { id: 'r1', icon, text: 'Release force and coated side' },
        { id: 'r2', icon, text: 'Width, roll length and core size' },
        { id: 'r3', icon, text: 'Converting process and annual volume' },
      ],
      emailVisible: true,
      emailAddress: 'hello@northstar.com',
      emailIcon: icon,
      form: previewForm,
      submitText: 'Request Product Recommendation',
      submitNote: 'A release material specialist will reply with a construction recommendation.',
      backgroundColor: '',
      backgroundImage: null,
      paddingY: 52,
    },
    messages,
  };
}
