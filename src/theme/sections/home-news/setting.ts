import { defineSection } from '@/platform/theme';

export default defineSection({
  label: "Home news",
  groups: ["page"],
  settings: [
  {
    "type": "text",
    "id": "newsTitle",
    "label": "Title",
    "locale": true,
    "default": ""
  },
  {
    "type": "object",
    "id": "newsAll",
    "label": "All",
    "default": {},
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
  },
  {
    "type": "number",
    "id": "newsCount",
    "label": "Count",
    "default": 0
  },
  {
    "type": "text",
    "id": "placeholderCaption",
    "label": "Placeholder",
    "locale": true,
    "default": ""
  }
],
  messages: {},
});
