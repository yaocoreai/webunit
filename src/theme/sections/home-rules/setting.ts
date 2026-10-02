import { defineSection } from '@/platform/theme';

export default defineSection({
  label: "Home rules",
  groups: ["page"],
  settings: [
  {
    "type": "text",
    "id": "rulesTitle",
    "label": "Title",
    "locale": true,
    "default": ""
  },
  {
    "type": "array",
    "id": "rules",
    "label": "Rules",
    "default": [],
    "items": {
      "type": "object",
      "fields": [
        {
          "type": "text",
          "id": "text",
          "label": "Text",
          "locale": true,
          "default": ""
        }
      ]
    }
  }
],
  messages: {},
});
