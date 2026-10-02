import {
  appCapabilityDefinitions,
  createAppComposition,
  createAppServices,
} from '@/function/bootstrap/application';

export { applicationServiceKeys as appServiceKeys } from '@/function/common/capabilities/contracts';
export const testAppCapabilityDefinitions = appCapabilityDefinitions;
export const createTestAppComposition = createAppComposition;
export const createTestAppServices = createAppServices;
