import { datasContents } from '@/platform/composition/datas-source';
import type { SourceDefinition } from '@/platform/theme/source/definition';

export default {
  contents: datasContents(),
} satisfies SourceDefinition;
