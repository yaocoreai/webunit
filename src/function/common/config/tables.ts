import { defineTable } from "@/function/common/db/definition";

export const configTables = [
  defineTable({
    name: "config_records",
    columns: [
      { name: "id", type: "text", primaryKey: true, notNull: true },
      { name: "namespace", type: "text", notNull: true, default: "default" },
      { name: "key", type: "text", notNull: true },
      { name: "value_raw", type: "text", notNull: true },
      { name: "encoding", type: "text", notNull: true },
      { name: "visibility", type: "text", notNull: true, default: "private" },
      { name: "version", type: "integer", notNull: true },
      { name: "created_at", type: "text", notNull: true },
      { name: "created_by", type: "text" },
      { name: "updated_at", type: "text", notNull: true },
      { name: "updated_by", type: "text" },
      { name: "deleted_at", type: "text" },
      { name: "deleted_by", type: "text" },
    ],
    indexes: [
      {
        name: "config_records_namespace_key_idx",
        columns: ["namespace", "key"],
        unique: true,
      },
      {
        name: "config_records_namespace_deleted_at_idx",
        columns: ["namespace", "deleted_at"],
      },
    ],
    checks: [
      {
        name: "config_records_namespace_length_check",
        expression: "length(namespace) between 1 and 64",
      },
      {
        name: "config_records_key_length_check",
        expression: "length(key) between 1 and 240",
      },
      {
        name: "config_records_visibility_check",
        expression: "visibility in ('private', 'public')",
      },
    ],
  }),
] as const;
