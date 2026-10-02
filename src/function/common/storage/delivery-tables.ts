import { defineTable } from "@/function/common/db/definition";

export const storageDeliveryTables = [
  defineTable({
    name: "storage_delivery_claims",
    columns: [
      { name: "storage_key", type: "text", notNull: true },
      { name: "delivery_path", type: "text", notNull: true },
      { name: "owner_site_id", type: "text", notNull: true },
      { name: "entry_id", type: "text" },
      { name: "state", type: "text", notNull: true },
      { name: "claimed_at", type: "text", notNull: true },
      { name: "tombstoned_at", type: "text" },
      { name: "released_at", type: "text" },
      { name: "updated_at", type: "text", notNull: true },
    ],
    primaryKey: ["storage_key", "delivery_path"],
    indexes: [
      {
        name: "storage_delivery_claims_owner_state_idx",
        columns: ["owner_site_id", "state", "delivery_path"],
      },
      {
        name: "storage_delivery_claims_entry_idx",
        columns: ["entry_id"],
      },
    ],
    checks: [
      {
        name: "storage_delivery_claims_state_check",
        expression: "state in ('reserved','active','tombstoned','released')",
      },
    ],
  }),
] as const;
