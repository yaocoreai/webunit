import type { Config } from "@/function/common/capabilities/contracts";
import type { CapabilityAccess } from "@/function/common/capabilities/access";
import { createLazyConfig } from "@/function/common/capabilities/lazy";

export function createConfig(
  dependencies: CapabilityAccess<"cache" | "database">,
): Config {
  return createLazyConfig(async () => {
    const { createConfigService } = await import("./service");
    return createConfigService({
      getCache: () => dependencies.get("cache"),
      getDatabase: () => dependencies.get("database"),
    });
  });
}
