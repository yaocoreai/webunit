import { defineCapabilities, defineCapability } from '@/function/common/capabilities/definition';
import { createConfig } from '@/function/common/config/capability';
import { createEnums } from '@/function/common/enums/capability';
import { createStorage } from '@/function/common/storage/capability';

export function createAppCapabilityDefinitions() {
  return defineCapabilities([
    defineCapability({
      key: 'storage',
      required: ['cache', 'objectStorage'],
      create: createStorage,
    }),
    defineCapability({
      key: 'config',
      required: ['cache', 'database'],
      create: createConfig,
    }),
    defineCapability({
      key: 'enums',
      required: ['database'],
      create: createEnums,
    }),
  ] as const);
}
