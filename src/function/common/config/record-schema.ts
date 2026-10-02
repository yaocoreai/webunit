import { s } from "@/function/common/app/schema";

export const configRecordSchema = s.object({
  namespace: s.string(),
  key: s.string(),
  value: s.json(),
  visibility: s.enum(["private", "public"] as const),
  version: s.integer().min(1),
  updatedAt: s.string(),
});
