import { defineTable } from "@/function/common/db/definition";

const auditColumns = [
  { name: "created_at", type: "text", notNull: true },
  { name: "updated_at", type: "text", notNull: true },
] as const;

export const storageTables = [
  defineTable({
    name: "storage_objects",
    columns: [
      { name: "id", type: "text", primaryKey: true, notNull: true },
      { name: "storage_key", type: "text", notNull: true },
      { name: "object_key", type: "text", notNull: true },
      { name: "content_type", type: "text", notNull: true },
      { name: "size", type: "integer", notNull: true },
      { name: "checksum_sha256", type: "text" },
      { name: "etag", type: "text", notNull: true },
      ...auditColumns,
      { name: "deleted_at", type: "text" },
    ],
    indexes: [
      {
        name: "storage_objects_storage_object_key_idx",
        columns: ["storage_key", "object_key"],
        unique: true,
        where: "deleted_at is null",
      },
      { name: "storage_objects_deleted_at_idx", columns: ["deleted_at"] },
    ],
  }),
  defineTable({
    name: "storage_entries",
    columns: [
      { name: "id", type: "text", primaryKey: true, notNull: true },
      { name: "storage_key", type: "text", notNull: true },
      { name: "entry_kind", type: "text", notNull: true },
      { name: "object_key", type: "text" },
      { name: "mount_key", type: "text", notNull: true },
      { name: "logical_path", type: "text", notNull: true },
      { name: "delivery_path", type: "text" },
      { name: "visibility", type: "text" },
      { name: "asset_type", type: "text" },
      { name: "asset_state", type: "text" },
      {
        name: "physical_delete_status",
        type: "text",
        notNull: true,
        default: "active",
      },
      { name: "physical_delete_error", type: "text" },
      ...auditColumns,
      { name: "deleted_at", type: "text" },
    ],
    indexes: [
      {
        name: "storage_entries_storage_object_key_idx",
        columns: ["storage_key", "object_key"],
        unique: true,
        where: "deleted_at is null and object_key is not null",
      },
      {
        name: "storage_entries_storage_mount_logical_path_idx",
        columns: ["storage_key", "mount_key", "logical_path"],
        unique: true,
        where: "deleted_at is null",
      },
      {
        name: "storage_entries_storage_delivery_path_idx",
        columns: ["storage_key", "delivery_path"],
        unique: true,
        where: "deleted_at is null and delivery_path is not null",
      },
      {
        name: "storage_entries_storage_mount_logical_path_order_idx",
        columns: ["storage_key", "mount_key", "logical_path"],
      },
      {
        name: "storage_entries_storage_visibility_delivery_path_idx",
        columns: ["storage_key", "visibility", "delivery_path"],
      },
      { name: "storage_entries_deleted_at_idx", columns: ["deleted_at"] },
      {
        name: "storage_entries_physical_delete_idx",
        columns: ["physical_delete_status", "updated_at", "id"],
      },
    ],
    checks: [
      {
        name: "storage_entries_physical_delete_status_check",
        expression:
          "physical_delete_status in ('active','pending','deleted','failed')",
      },
    ],
  }),
  defineTable({
    name: "storage_upload_sessions",
    columns: [
      { name: "id", type: "text", primaryKey: true, notNull: true },
      { name: "ticket_id", type: "text" },
      { name: "storage_key", type: "text", notNull: true },
      { name: "object_key", type: "text", notNull: true },
      { name: "mount_key", type: "text", notNull: true },
      { name: "logical_path", type: "text", notNull: true },
      { name: "delivery_path", type: "text", notNull: true },
      { name: "asset_type", type: "text", notNull: true },
      { name: "content_type", type: "text", notNull: true },
      { name: "transport", type: "text", notNull: true },
      { name: "upload_mode", type: "text", notNull: true },
      { name: "size_bytes", type: "integer" },
      { name: "checksum_sha256", type: "text" },
      { name: "part_size", type: "integer" },
      { name: "multipart_upload_id", type: "text" },
      { name: "visibility", type: "text", notNull: true },
      { name: "status", type: "text", notNull: true },
      { name: "session_key_hash", type: "text", notNull: true },
      { name: "expires_at", type: "text", notNull: true },
      ...auditColumns,
    ],
    indexes: [
      {
        name: "storage_upload_sessions_ticket_id_idx",
        columns: ["ticket_id"],
        unique: true,
        where: "ticket_id is not null",
      },
      {
        name: "storage_upload_sessions_storage_object_key_active_idx",
        columns: ["storage_key", "object_key"],
        unique: true,
        where: "status in ('pending', 'cleanup_pending')",
      },
      {
        name: "storage_upload_sessions_storage_mount_logical_path_active_idx",
        columns: ["storage_key", "mount_key", "logical_path"],
        unique: true,
        where: "status in ('pending', 'cleanup_pending')",
      },
      {
        name: "storage_upload_sessions_storage_delivery_path_active_idx",
        columns: ["storage_key", "delivery_path"],
        unique: true,
        where: "status in ('pending', 'cleanup_pending')",
      },
      {
        name: "storage_upload_sessions_storage_status_expires_at_idx",
        columns: ["storage_key", "status", "expires_at"],
      },
    ],
  }),
  defineTable({
    name: "storage_upload_parts",
    columns: [
      { name: "session_id", type: "text", notNull: true },
      { name: "part_number", type: "integer", notNull: true },
      { name: "etag", type: "text", notNull: true },
      { name: "size", type: "integer", notNull: true },
      ...auditColumns,
    ],
    indexes: [
      {
        name: "storage_upload_parts_session_part_idx",
        columns: ["session_id", "part_number"],
        unique: true,
      },
      {
        name: "storage_upload_parts_session_idx",
        columns: ["session_id"],
      },
    ],
  }),
] as const;
