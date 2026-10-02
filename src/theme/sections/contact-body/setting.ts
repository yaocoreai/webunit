import { defineSection } from '@/platform/theme';

export default defineSection({
  label: "Contact",
  groups: ["page"],
  settings: [
  {
    "type": "text",
    "id": "kicker",
    "label": "Kicker",
    "locale": true,
    "default": ""
  },
  {
    "type": "textarea",
    "id": "h1",
    "label": "Heading",
    "locale": true,
    "default": ""
  },
  {
    "type": "textarea",
    "id": "lead",
    "label": "Lead",
    "locale": true,
    "default": ""
  },
  {
    "type": "textarea",
    "id": "body",
    "label": "Body",
    "locale": true,
    "default": ""
  },
  {
    "type": "text",
    "id": "stepsTitle",
    "label": "Steps title",
    "locale": true,
    "default": ""
  },
  {
    "type": "array",
    "id": "steps",
    "label": "Steps",
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
    "type": "text",
    "id": "teamTitle",
    "label": "Team title",
    "locale": true,
    "default": ""
  },
  {
    "type": "text",
    "id": "mapTitle",
    "label": "Map title",
    "locale": true,
    "default": ""
  },
  {
    "type": "textarea",
    "id": "mapUrl",
    "label": "Map URL",
    "locale": true,
    "default": ""
  },
  {
    "type": "textarea",
    "id": "team",
    "label": "Team",
    "locale": true,
    "default": ""
  },
  {
    "type": "object",
    "id": "price",
    "label": "Price",
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
