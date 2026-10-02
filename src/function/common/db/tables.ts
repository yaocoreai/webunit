import { defineTable } from "./definition";

export const migrationTables = [
  defineTable({
    name: "system_migration_versions",
    columns: [
      { name: "version", type: "text", primaryKey: true, notNull: true },
      { name: "name", type: "text", notNull: true },
      { name: "checksum", type: "text", notNull: true },
      { name: "execution_ms", type: "integer", notNull: true },
      { name: "applied_at", type: "text", notNull: true },
    ],
    indexes: [
      {
        name: "system_migration_versions_applied_idx",
        columns: ["applied_at", "version"],
      },
    ],
  }),
  defineTable({
    name: "system_migration_lock",
    columns: [
      { name: "lock_key", type: "text", primaryKey: true, notNull: true },
      { name: "owner_id", type: "text", notNull: true },
      { name: "expires_at", type: "text", notNull: true },
      { name: "updated_at", type: "text", notNull: true },
    ],
    checks: [
      {
        name: "system_migration_lock_key_check",
        expression: "lock_key = 'schema'",
      },
    ],
  }),
] as const;
