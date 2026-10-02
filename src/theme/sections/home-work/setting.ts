import { defineSection } from '@/platform/theme';

export default defineSection({
  label: "Home work",
  groups: ["page"],
  settings: [
  {
    "type": "text",
    "id": "workTitle",
    "label": "Title",
    "locale": true,
    "default": ""
  },
  {
    "type": "text",
    "id": "workMask",
    "label": "Mask",
    "locale": true,
    "default": ""
  },
  {
    "type": "text",
    "id": "workName",
    "label": "Name",
    "locale": true,
    "default": ""
  },
  {
    "type": "array",
    "id": "workFacts",
    "label": "Facts",
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
          "id": "value",
          "label": "Value",
          "locale": true,
          "default": ""
        }
      ]
    }
  },
  {
    "type": "object",
    "id": "workLink",
    "label": "Link",
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
    "id": "workImage",
    "label": "Image",
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
  }
],
  messages: {},
});
