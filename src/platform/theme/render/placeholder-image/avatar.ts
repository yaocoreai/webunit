import type { PlaceholderImageDefinition } from './types';

export default {
  width: 1,
  height: 1,
  viewBoxWidth: 100,
  viewBoxHeight: 100,
  body: '<circle opacity=".75" cx="50" cy="32" r="21"/><path opacity=".35" d="M5 100c4-31 19-47 45-47s41 16 45 47z"/>',
} satisfies PlaceholderImageDefinition;
