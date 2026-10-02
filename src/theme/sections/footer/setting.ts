import { defineSection } from '@/platform/theme';

export default defineSection({
  label: "Footer",
  groups: ["site-footer"],
  settings: [
  {
    "type": "textarea",
    "id": "studio",
    "label": "Studio",
    "locale": true,
    "default": ""
  },
  {
    "type": "textarea",
    "id": "contact",
    "label": "Contact",
    "locale": true,
    "default": ""
  },
  {
    "type": "text",
    "id": "wordmark",
    "label": "Wordmark",
    "locale": true,
    "default": ""
  }
],
  messages: {},
});
