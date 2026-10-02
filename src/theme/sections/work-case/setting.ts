import { defineSection } from '@/platform/theme';

export default defineSection({
  label: "Work case",
  groups: ["page"],
  settings: [
  {
    "type": "text",
    "id": "mask",
    "label": "Mask",
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
    "type": "text",
    "id": "name",
    "label": "Name",
    "locale": true,
    "default": ""
  },
  {
    "type": "textarea",
    "id": "summary",
    "label": "Summary",
    "locale": true,
    "default": ""
  },
  {
    "type": "array",
    "id": "facts",
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
    "type": "text",
    "id": "storyTitle",
    "label": "Story title",
    "locale": true,
    "default": ""
  },
  {
    "type": "textarea",
    "id": "story",
    "label": "Story",
    "locale": true,
    "default": ""
  },
  {
    "type": "textarea",
    "id": "quote",
    "label": "Quote",
    "locale": true,
    "default": ""
  },
  {
    "type": "object",
    "id": "more",
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
