import { writeFile } from 'node:fs/promises';
import { applicationDatabaseSchema } from '../database/schema/application';
import { renderSqlSchema } from '../src/function/common/db/schema';

const output = new URL('../database/migrations/0000_initial.sql', import.meta.url);
await writeFile(output, renderSqlSchema(applicationDatabaseSchema), 'utf8');
console.info(`Generated ${output.pathname} from ${applicationDatabaseSchema.length} table definitions.`);
