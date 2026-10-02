import { defineTables } from '@/function/common/db/definition';
import { configTables } from '@/function/common/config/tables';
import { migrationTables } from '@/function/common/db/tables';
import { seedTables } from '@/function/common/db/seed-records';

/**
 * 发布、迁移与测试使用的数据库定义。
 *
 * 保留迁移表、种子记录和 config_records。运行时数据库访问只依赖 Database 契约和业务 SQL。
 */
export const applicationDatabaseSchema = defineTables([
  ...migrationTables,
  ...seedTables,
  ...configTables,
]);
