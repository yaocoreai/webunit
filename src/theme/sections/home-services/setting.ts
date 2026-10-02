import { defineSection } from '@/platform/theme';

export default defineSection({
  label: "Home services",
  groups: ["page"],
  settings: [
  {
    "type": "text",
    "id": "servicesTitle",
    "label": "Title",
    "locale": true,
    "default": ""
  },
  {
    "type": "text",
    "id": "servicesNote",
    "label": "Note",
    "locale": true,
    "default": ""
  },
  {
    "type": "array",
    "id": "services",
    "label": "Services",
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
  },
  {
    "type": "textarea",
    "id": "agentLine",
    "label": "Agent line",
    "locale": true,
    "default": ""
  },
  {
    "type": "object",
    "id": "agentLink",
    "label": "Agent link",
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
  }
],
  messages: {},
});
