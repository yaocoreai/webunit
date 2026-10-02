import type {
  ApplicationServiceMap,
  RuntimePrimitiveMap,
  ServiceKey,
} from "@/function/common/capabilities/contracts";

/** Operation 可见的运行时基础能力与按需解析的应用能力访问器。 */
export type ApplicationServices = Readonly<
  Partial<RuntimePrimitiveMap> & {
    has(key: ServiceKey): boolean;
    getStorage(): ApplicationServiceMap["storage"] | undefined;
    getConfig(): ApplicationServiceMap["config"] | undefined;
    getEnums(): ApplicationServiceMap["enums"] | undefined;
  }
>;
