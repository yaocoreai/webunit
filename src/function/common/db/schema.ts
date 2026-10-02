import type { ColumnDefinition, TableDefinition } from './definition';

export function renderSqlSchema(tables: readonly TableDefinition[]): string {
  const statements = tables.flatMap((table) => [
    `CREATE TABLE ${table.name} (\n${[
      ...table.columns.map((column) => `  ${renderColumn(column)}`),
      ...(table.primaryKey ? [`  PRIMARY KEY (${table.primaryKey.join(', ')})`] : []),
      ...(table.foreignKeys ?? []).map((key) => `  CONSTRAINT ${key.name} FOREIGN KEY (${key.columns.join(', ')}) REFERENCES ${key.references.table} (${key.references.columns.join(', ')})${key.onDelete ? ` ON DELETE ${key.onDelete.toUpperCase()}` : ''}`),
      ...(table.checks ?? []).map((check) => `  CONSTRAINT ${check.name} CHECK (${check.expression})`),
    ].join(',\n')}\n);`,
    ...(table.indexes ?? []).map((index) => `CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX ${index.name} ON ${table.name} (${index.columns.join(', ')})${index.where ? ` WHERE ${index.where}` : ''};`),
  ]);
  return `${statements.join('\n\n')}\n`;
}

function renderColumn(column: ColumnDefinition): string {
  return [column.name, column.type.toUpperCase(), column.primaryKey && 'PRIMARY KEY', column.notNull && 'NOT NULL', column.default !== undefined && `DEFAULT ${renderDefault(column.default)}`].filter(Boolean).join(' ');
}

function renderDefault(value: string | number): string { return typeof value === 'number' ? String(value) : `'${value.replaceAll("'", "''")}'`; }
