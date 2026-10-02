export type {
  ApplicationMode,
  DeploymentKind,
  FunctionRuntimeIdentity,
} from "@/function/common/app/application";
import type { ApplicationMode } from "@/function/common/app/application";

export function readApplicationMode(
  source: Readonly<Record<string, unknown>>,
): ApplicationMode {
  const value = source.NODE_ENV;
  if (value === "development" || value === "production" || value === "test")
    return value;
  throw new Error("NODE_ENV must be development, production, or test");
}
