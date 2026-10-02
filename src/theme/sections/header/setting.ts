import { defineSection } from '@/platform/theme';

export default defineSection({
  label: "Header",
  groups: ["site-header"],
  settings: [
  {
    "type": "text",
    "id": "wordmark",
    "label": "Wordmark",
    "locale": true,
    "default": ""
  },
  {
    "type": "text",
    "id": "studio",
    "label": "Studio",
    "locale": true,
    "default": ""
  },
  {
    "type": "text",
    "id": "logoAlt",
    "label": "Logo alt",
    "locale": true,
    "default": ""
  },
  {
    "type": "text",
    "id": "langLabel",
    "label": "Language label",
    "locale": true,
    "default": ""
  },
  {
    "type": "text",
    "id": "menu",
    "label": "Menu",
    "locale": true,
    "default": ""
  },
  {
    "type": "text",
    "id": "navLabel",
    "label": "Nav label",
    "locale": true,
    "default": ""
  },
  {
    "type": "array",
    "id": "nav",
    "label": "Nav",
    "default": [],
    "items": {
      "type": "object",
      "fields": [
        {
          "type": "text",
          "id": "href",
          "label": "Href",
          "default": ""
        },
        {
          "type": "text",
          "id": "label",
          "label": "Label",
          "locale": true,
          "default": ""
        }
      ]
    }
  }
],
  messages: {},
});
