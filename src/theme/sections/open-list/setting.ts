import { defineSection } from '@/platform/theme';

export default defineSection({
  label: "Open list",
  groups: ["page"],
  settings: [
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
    "type": "text",
    "id": "placeholderCaption",
    "label": "Placeholder",
    "locale": true,
    "default": ""
  },
  {
    "type": "array",
    "id": "items",
    "label": "Items",
    "default": [],
    "items": {
      "type": "object",
      "fields": [
        {
          "type": "text",
          "id": "status",
          "label": "Status",
          "locale": true,
          "default": ""
        },
        {
          "type": "text",
          "id": "name",
          "label": "Name",
          "locale": true,
          "default": ""
        },
        {
          "type": "textarea",
          "id": "detail",
          "label": "Detail",
          "locale": true,
          "default": ""
        },
        {
          "type": "array",
          "id": "points",
          "label": "Points",
          "default": [],
          "items": {
            "type": "object",
            "fields": [
              {
                "type": "text",
                "id": "label",
                "label": "Label",
                "locale": true,
                "default": ""
              },
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
          "type": "object",
          "id": "repository",
          "label": "Repository",
          "default": {},
          "fields": [
            {
              "type": "text",
              "id": "href",
              "label": "URL",
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
          "id": "image",
          "label": "Image",
          "default": {},
          "fields": [
            {
              "type": "text",
              "id": "label",
              "label": "Label",
              "locale": true,
              "default": ""
            }
          ]
        }
      ]
    }
  }
],
  messages: {},
});
