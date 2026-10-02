import type { ApplicationServices } from "./services";
import type { ExecutionEffects } from './execution-effects';

export type DeploymentKind = "node" | "container" | "workers";
export type ApplicationMode = "development" | "production" | "test";
export type FunctionRuntimeIdentity = Readonly<{
  deployment: DeploymentKind;
  mode: ApplicationMode;
}>;

export interface FunctionApplicationConfiguration {
  readonly __applicationConfiguration?: never;
}
export interface FunctionApplicationSecrets {
  readonly __applicationSecrets?: never;
}

export type FunctionScope = Readonly<{
  platform: FunctionRuntimeIdentity;
  capabilities: ApplicationServices;
  configuration: Readonly<FunctionApplicationConfiguration>;
  secrets: Readonly<FunctionApplicationSecrets>;
  effects: ExecutionEffects;
}>;
