import { defineSection } from '@/platform/theme';

export default defineSection({
  label: "Home team",
  groups: ["page"],
  settings: [
  {
    "type": "text",
    "id": "teamTitle",
    "label": "Title",
    "locale": true,
    "default": ""
  },
  {
    "type": "textarea",
    "id": "teamBody",
    "label": "Body",
    "locale": true,
    "default": ""
  },
  {
    "type": "object",
    "id": "teamImage",
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
