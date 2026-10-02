import { defineTemplate } from '@/platform/theme';

export default defineTemplate({
  label: 'HTTP Error',
  frame: '',
  settings: [
    { type: 'switch', id: 'showStatus', label: 'Show status code', default: true },
    { type: 'textarea', id: 'description', label: 'Description', locale: true, default: 'This address has no page.' },
    { type: 'text', id: 'notFoundTitle', label: 'Missing page title', locale: true, default: 'No page here' },
    { type: 'textarea', id: 'notFoundBody', label: 'Missing page body', locale: true, default: 'Back to the home page.' },
    { type: 'text', id: 'homeLabel', label: 'Home label', locale: true, default: 'Home' },
    { type: 'text', id: 'homeHref', label: 'Home href', default: '/' },
  ],
  messages: {
    requestId: 'Request ID',
    'code.default': 'Something went wrong',
    'code.400': 'Bad request',
    'code.401': 'Authentication required',
    'code.403': 'Access denied',
    'code.404': 'Page not found',
    'code.405': 'Method not allowed',
    'code.429': 'Too many requests',
    'code.500': 'Internal server error',
    'code.502': 'Bad gateway',
    'code.503': 'Service unavailable',
    'code.504': 'Gateway timeout',
  },
  slots: [],
});
