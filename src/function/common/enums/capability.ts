import type { Enums } from "@/function/common/capabilities/contracts";
import type { CapabilityAccess } from "@/function/common/capabilities/access";
import { createLazyEnums } from "@/function/common/capabilities/lazy";

export function createEnums(dependencies: CapabilityAccess<"database">): Enums {
  return createLazyEnums(async () => {
    const { listEnumCatalogs, listEnums, setEnumCatalog } =
      await import("./service");
    return {
      listCatalogs: (page, pageSize, filters) =>
        listEnumCatalogs(dependencies.get("database"), page, pageSize, filters),
      list: (key, parent, rootsOnly) =>
        listEnums(dependencies.get("database"), key, parent, rootsOnly),
      listPublic: (key, parent, rootsOnly) =>
        listEnums(dependencies.get("database"), key, parent, rootsOnly, true),
      setCatalog: (input) =>
        setEnumCatalog(dependencies.get("database"), input),
    };
  });
}
