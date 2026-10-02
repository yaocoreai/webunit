import { defineSection } from '@/platform/theme';

export default defineSection({
  label: "News list",
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
    "type": "text",
    "id": "placeholderCaption",
    "label": "Placeholder",
    "locale": true,
    "default": ""
  }
],
  messages: {},
});
