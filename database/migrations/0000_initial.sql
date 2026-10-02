CREATE TABLE system_migration_versions (
  version TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  execution_ms INTEGER NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE INDEX system_migration_versions_applied_idx ON system_migration_versions (applied_at, version);

CREATE TABLE system_migration_lock (
  lock_key TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CONSTRAINT system_migration_lock_key_check CHECK (lock_key = 'schema')
);

CREATE TABLE config_records (
  id TEXT PRIMARY KEY NOT NULL,
  namespace TEXT NOT NULL DEFAULT 'default',
  key TEXT NOT NULL,
  value_raw TEXT NOT NULL,
  encoding TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private',
  version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  deleted_at TEXT,
  deleted_by TEXT,
  CONSTRAINT config_records_namespace_length_check CHECK (length(namespace) between 1 and 64),
  CONSTRAINT config_records_key_length_check CHECK (length(key) between 1 and 240),
  CONSTRAINT config_records_visibility_check CHECK (visibility in ('private', 'public'))
);

CREATE UNIQUE INDEX config_records_namespace_key_idx ON config_records (namespace, key);

CREATE INDEX config_records_namespace_deleted_at_idx ON config_records (namespace, deleted_at);

CREATE TABLE database_seed_records (
  seed_key TEXT PRIMARY KEY NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  CONSTRAINT database_seed_records_key_check CHECK (length(seed_key) between 1 and 160 and lower(seed_key) = seed_key),
  CONSTRAINT database_seed_records_checksum_check CHECK (length(checksum) between 8 and 128)
);
