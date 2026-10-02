import { defineTable } from './definition';

export const seedTables = [defineTable({
  name: 'database_seed_records',
  columns: [
    { name: 'seed_key', type: 'text', primaryKey: true, notNull: true },
    { name: 'checksum', type: 'text', notNull: true },
    { name: 'applied_at', type: 'text', notNull: true },
  ],
  checks: [
    { name: 'database_seed_records_key_check', expression: 'length(seed_key) between 1 and 160 and lower(seed_key) = seed_key' },
    { name: 'database_seed_records_checksum_check', expression: 'length(checksum) between 8 and 128' },
  ],
})] as const;
