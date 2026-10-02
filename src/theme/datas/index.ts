import { datasContents } from '@/platform/datas';
import type { SourceDefinition } from '@/platform/datas';

export default {
  contents: datasContents(),
} satisfies SourceDefinition;
