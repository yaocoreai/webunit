import { defineSection } from '@/platform/theme';

export default defineSection({
  label: "Home hero",
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
    "type": "object",
    "id": "priceLink",
    "label": "Price link",
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
    "type": "object",
    "id": "contactLink",
    "label": "Contact link",
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
    "type": "object",
    "id": "heroImage",
    "label": "Hero image",
    "default": {},
    "fields": [
      {
        "type": "text",
        "id": "label",
        "label": "Label",
        "locale": true,
        "default": ""
      },
      {
        "type": "image",
        "id": "file",
        "label": "File",
        "default": null
      }
    ]
  },
  {
    "type": "text",
    "id": "placeholderCaption",
    "label": "Placeholder",
    "locale": true,
    "default": ""
  },
  {
    "type": "json",
    "id": "schema",
    "label": "Schema",
    "default": {}
  }
],
  messages: {},
});
