import { isCmsLinkStored } from "@/platform/schema";
import { isPublicContentUrl } from "@/platform/theme/define/public-content-url";

export type { CmsLinkStored } from "@/platform/schema";

/** Stored CmsLink shape (Meta/Setting/Datas input). Module reference must be `module.${key}`. */
export const isCmsLinkValue = (value: unknown): boolean => {
  if (!isCmsLinkStored(value)) return false;
  if (value.type === "path") return isPublicContentUrl(value.href);
  return true;
};
