export type ColumnType = 'text' | 'integer' | 'real' | 'blob';
export type ColumnDefinition = Readonly<{ name: string; type: ColumnType; primaryKey?: boolean; notNull?: boolean; default?: string | number }>;
export type IndexDefinition = Readonly<{ name: string; columns: readonly string[]; unique?: boolean; where?: string }>;
export type ForeignKeyDefinition = Readonly<{ name: string; columns: readonly string[]; references: Readonly<{ table: string; columns: readonly string[] }>; onDelete?: 'cascade' | 'restrict' | 'set null' }>;
export type CheckDefinition = Readonly<{ name: string; expression: string }>;
export type TableDefinition = Readonly<{
  name: string;
  columns: readonly ColumnDefinition[];
  indexes?: readonly IndexDefinition[];
  primaryKey?: readonly string[];
  foreignKeys?: readonly ForeignKeyDefinition[];
  checks?: readonly CheckDefinition[];
}>;

export function defineTable(definition: TableDefinition): TableDefinition {
  if (!/^[a-z][a-z0-9_]*$/.test(definition.name)) throw new Error(`Invalid table name: ${definition.name}`);
  const columns = new Set<string>();
  for (const column of definition.columns) {
    if (!/^[a-z][a-z0-9_]*$/.test(column.name)) throw new Error(`Invalid column name: ${definition.name}.${column.name}`);
    if (columns.has(column.name)) throw new Error(`Duplicate column: ${definition.name}.${column.name}`);
    columns.add(column.name);
  }
  const indexes = new Set<string>();
  for (const index of definition.indexes ?? []) {
    if (!/^[a-z][a-z0-9_]*$/.test(index.name) || indexes.has(index.name)) throw new Error(`Invalid or duplicate index: ${definition.name}.${index.name}`);
    if (!index.columns.length || index.columns.some((column) => !columns.has(column))) throw new Error(`Invalid index columns: ${definition.name}.${index.name}`);
    if (index.where !== undefined && (!index.where.trim() || /;|--|\/\*/.test(index.where))) throw new Error(`Invalid index predicate: ${definition.name}.${index.name}`);
    indexes.add(index.name);
  }
  if (definition.primaryKey) assertColumns(definition.name, 'primary key', definition.primaryKey, columns);
  const constraints = new Set<string>();
  for (const foreignKey of definition.foreignKeys ?? []) {
    assertConstraintName(definition.name, foreignKey.name, constraints);
    assertColumns(definition.name, foreignKey.name, foreignKey.columns, columns);
    if (foreignKey.columns.length !== foreignKey.references.columns.length || !isIdentifier(foreignKey.references.table) || foreignKey.references.columns.some((column) => !isIdentifier(column))) throw new Error(`Invalid foreign key: ${definition.name}.${foreignKey.name}`);
  }
  for (const check of definition.checks ?? []) {
    assertConstraintName(definition.name, check.name, constraints);
    if (!check.expression.trim() || /;|--|\/\*/.test(check.expression)) throw new Error(`Invalid check: ${definition.name}.${check.name}`);
  }
  return Object.freeze(definition);
}
export function defineTables(tables: readonly TableDefinition[]): readonly TableDefinition[] {
  const names = new Set<string>();
  for (const table of tables) {
    if (names.has(table.name)) throw new Error(`Duplicate table: ${table.name}`);
    names.add(table.name);
  }
  return Object.freeze([...tables]);
}

function isIdentifier(value: string): boolean { return /^[a-z][a-z0-9_]*$/.test(value); }
function assertColumns(table: string, constraint: string, values: readonly string[], columns: ReadonlySet<string>): void {
  if (!values.length || values.some((column) => !columns.has(column))) throw new Error(`Invalid ${constraint} columns: ${table}`);
}
function assertConstraintName(table: string, name: string, names: Set<string>): void {
  if (!isIdentifier(name) || names.has(name)) throw new Error(`Invalid or duplicate constraint: ${table}.${name}`);
  names.add(name);
}
