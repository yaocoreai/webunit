import { defineSection } from '@/platform/theme';

export default defineSection({
  label: "Services",
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
    "id": "customTitle",
    "label": "Custom title",
    "locale": true,
    "default": ""
  },
  {
    "type": "array",
    "id": "custom",
    "label": "Custom",
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
    "type": "textarea",
    "id": "customNote",
    "label": "Custom note",
    "locale": true,
    "default": ""
  },
  {
    "type": "text",
    "id": "agentTitle",
    "label": "Agent title",
    "locale": true,
    "default": ""
  },
  {
    "type": "textarea",
    "id": "agentLead",
    "label": "Agent lead",
    "locale": true,
    "default": ""
  },
  {
    "type": "text",
    "id": "rolesTitle",
    "label": "Roles title",
    "locale": true,
    "default": ""
  },
  {
    "type": "array",
    "id": "roles",
    "label": "Roles",
    "default": [],
    "items": {
      "type": "object",
      "fields": [
        {
          "type": "text",
          "id": "name",
          "label": "Name",
          "locale": true,
          "default": ""
        },
        {
          "type": "text",
          "id": "detail",
          "label": "Detail",
          "locale": true,
          "default": ""
        }
      ]
    }
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
        }
      ]
    }
  },
  {
    "type": "textarea",
    "id": "teach",
    "label": "Teach",
    "locale": true,
    "default": ""
  },
  {
    "type": "text",
    "id": "fitTitle",
    "label": "Fit title",
    "locale": true,
    "default": ""
  },
  {
    "type": "array",
    "id": "fit",
    "label": "Fit",
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
    "id": "includedTitle",
    "label": "Included title",
    "locale": true,
    "default": ""
  },
  {
    "type": "array",
    "id": "included",
    "label": "Included",
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
    "type": "textarea",
    "id": "agentNote",
    "label": "Agent note",
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
  },
  {
    "type": "text",
    "id": "courseTitle",
    "label": "Course title",
    "locale": true,
    "default": ""
  },
  {
    "type": "textarea",
    "id": "courseLead",
    "label": "Course lead",
    "locale": true,
    "default": ""
  },
  {
    "type": "text",
    "id": "lessonsTitle",
    "label": "Lessons title",
    "locale": true,
    "default": ""
  },
  {
    "type": "array",
    "id": "lessons",
    "label": "Lessons",
    "default": [],
    "items": {
      "type": "object",
      "fields": [
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
        }
      ]
    }
  },
  {
    "type": "text",
    "id": "courseFitTitle",
    "label": "Course fit title",
    "locale": true,
    "default": ""
  },
  {
    "type": "array",
    "id": "courseFit",
    "label": "Course fit",
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
    "type": "textarea",
    "id": "courseNote",
    "label": "Course note",
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
  }
],
  messages: {},
});
