import { defineSection } from '@/platform/theme';

export default defineSection({
  label: "Home compare",
  groups: ["page"],
  settings: [
  {
    "type": "text",
    "id": "compareTitle",
    "label": "Title",
    "locale": true,
    "default": ""
  },
  {
    "type": "textarea",
    "id": "compareBody",
    "label": "Body",
    "locale": true,
    "default": ""
  },
  {
    "type": "textarea",
    "id": "compareBody2",
    "label": "Body 2",
    "locale": true,
    "default": ""
  },
  {
    "type": "textarea",
    "id": "before",
    "label": "Before",
    "locale": true,
    "default": ""
  },
  {
    "type": "textarea",
    "id": "now",
    "label": "Now",
    "locale": true,
    "default": ""
  }
],
  messages: {},
});
