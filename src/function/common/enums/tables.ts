import { defineTable } from "@/function/common/db/definition";

export const enumTables = [
  defineTable({
    name: "enum_catalogs",
    columns: [
      { name: "key", type: "text", primaryKey: true, notNull: true },
      { name: "version", type: "text", notNull: true },
      { name: "visibility", type: "text", notNull: true, default: "private" },
      { name: "revision", type: "integer", notNull: true, default: 1 },
      { name: "updated_at", type: "text" },
      { name: "updated_by", type: "text" },
    ],
    checks: [
      {
        name: "enum_catalogs_key_check",
        expression: "length(key) between 1 and 64 and lower(key) = key",
      },
      {
        name: "enum_catalogs_version_check",
        expression: "length(version) between 1 and 64",
      },
      {
        name: "enum_catalogs_visibility_check",
        expression: "visibility in ('private', 'public')",
      },
      { name: "enum_catalogs_revision_check", expression: "revision >= 1" },
    ],
  }),
  defineTable({
    name: "enum_items",
    columns: [
      { name: "key", type: "text", notNull: true },
      { name: "code", type: "text", notNull: true },
      { name: "label", type: "text", notNull: true },
      { name: "parent_key", type: "text" },
      { name: "parent_code", type: "text" },
      { name: "status", type: "text", notNull: true, default: "active" },
      { name: "sort_order", type: "integer", notNull: true, default: 0 },
    ],
    primaryKey: ["key", "code"],
    foreignKeys: [
      {
        name: "enum_items_catalog_fk",
        columns: ["key"],
        references: { table: "enum_catalogs", columns: ["key"] },
      },
      {
        name: "enum_items_parent_fk",
        columns: ["parent_key", "parent_code"],
        references: { table: "enum_items", columns: ["key", "code"] },
      },
    ],
    checks: [
      {
        name: "enum_items_key_check",
        expression: "length(key) between 1 and 64 and lower(key) = key",
      },
      {
        name: "enum_items_code_check",
        expression: "length(code) between 1 and 128 and lower(code) = code",
      },
      {
        name: "enum_items_label_check",
        expression: "length(label) between 1 and 255",
      },
      {
        name: "enum_items_parent_check",
        expression:
          "(parent_key is null and parent_code is null) or (parent_key is not null and parent_code is not null)",
      },
      {
        name: "enum_items_status_check",
        expression: "status in ('active', 'inactive')",
      },
    ],
    indexes: [
      {
        name: "enum_items_list_idx",
        columns: ["key", "status", "sort_order", "code"],
      },
      {
        name: "enum_items_parent_list_idx",
        columns: [
          "key",
          "parent_key",
          "parent_code",
          "status",
          "sort_order",
          "code",
        ],
      },
      {
        name: "enum_items_parent_fk_idx",
        columns: ["parent_key", "parent_code"],
      },
    ],
  }),
] as const;
