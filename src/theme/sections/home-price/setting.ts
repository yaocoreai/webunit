import { defineSection } from '@/platform/theme';

export default defineSection({
  label: "Home price",
  groups: ["page"],
  settings: [
  {
    "type": "text",
    "id": "priceTitle",
    "label": "Title",
    "locale": true,
    "default": ""
  },
  {
    "type": "text",
    "id": "priceNote",
    "label": "Note",
    "locale": true,
    "default": ""
  },
  {
    "type": "object",
    "id": "priceColumns",
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
    "id": "priceRows",
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
    "type": "object",
    "id": "priceMore",
    "label": "More",
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
