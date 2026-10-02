import { defineSection } from '@/platform/theme';

export default defineSection({
  label: "Price",
  groups: ["page"],
  settings: [
  {
    "type": "text",
    "id": "studio",
    "label": "Studio",
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
    "type": "object",
    "id": "columns",
    "label": "Columns",
    "default": {},
    "fields": [
      {
        "type": "text",
        "id": "client",
        "label": "Client",
        "locale": true,
        "default": ""
      },
      {
        "type": "text",
        "id": "day",
        "label": "Day",
        "locale": true,
        "default": ""
      },
      {
        "type": "text",
        "id": "month",
        "label": "Month",
        "locale": true,
        "default": ""
      }
    ]
  },
  {
    "type": "array",
    "id": "rows",
    "label": "Rows",
    "default": [],
    "items": {
      "type": "object",
      "fields": [
        {
          "type": "text",
          "id": "client",
          "label": "Client",
          "locale": true,
          "default": ""
        },
        {
          "type": "text",
          "id": "day",
          "label": "Day",
          "locale": true,
          "default": ""
        },
        {
          "type": "text",
          "id": "month",
          "label": "Month",
          "locale": true,
          "default": ""
        }
      ]
    }
  },
  {
    "type": "text",
    "id": "note",
    "label": "Note",
    "locale": true,
    "default": ""
  },
  {
    "type": "text",
    "id": "afterTitle",
    "label": "After title",
    "locale": true,
    "default": ""
  },
  {
    "type": "textarea",
    "id": "after",
    "label": "After",
    "locale": true,
    "default": ""
  },
  {
    "type": "text",
    "id": "invoiceTitle",
    "label": "Invoice title",
    "locale": true,
    "default": ""
  },
  {
    "type": "textarea",
    "id": "invoice",
    "label": "Invoice",
    "locale": true,
    "default": ""
  },
  {
    "type": "text",
    "id": "freeTitle",
    "label": "Free title",
    "locale": true,
    "default": ""
  },
  {
    "type": "array",
    "id": "free",
    "label": "Free",
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
    "id": "freeNote",
    "label": "Free note",
    "locale": true,
    "default": ""
  },
  {
    "type": "text",
    "id": "whyTitle",
    "label": "Why title",
    "locale": true,
    "default": ""
  },
  {
    "type": "textarea",
    "id": "why",
    "label": "Why",
    "locale": true,
    "default": ""
  },
  {
    "type": "object",
    "id": "contact",
    "label": "Contact",
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
    "type": "json",
    "id": "quote",
    "label": "Quote",
    "default": {}
  }
],
  messages: {},
});
