import BetterSqlite3 from 'better-sqlite3';
import type { Database, DatabaseResult, DatabaseStatement } from '@/function/common/capabilities/contracts';
import { DatabaseConstraintError, type DatabaseConstraintKind } from '@/function/common/db/error';

type BoundStatement = Readonly<{ query: string; values: readonly unknown[] }>;

class SqliteStatement implements DatabaseStatement {
  constructor(private readonly database: BetterSqlite3.Database, readonly bound: BoundStatement) {}
  bind(...values: unknown[]): DatabaseStatement { return new SqliteStatement(this.database, { ...this.bound, values }); }
  async first<T>(): Promise<T | null> { try { return this.database.prepare(this.bound.query).get(...this.bound.values) as T | undefined ?? null; } catch (error) { throw normalizeSqliteError(error); } }
  async all<T>(): Promise<Readonly<{ results: T[] }>> { try { return { results: this.database.prepare(this.bound.query).all(...this.bound.values) as T[] }; } catch (error) { throw normalizeSqliteError(error); } }
  async run(): Promise<DatabaseResult> {
    try {
      const result = this.database.prepare(this.bound.query).run(...this.bound.values);
      return { success: true, rowsWritten: result.changes };
    } catch (error) { throw normalizeSqliteError(error); }
  }
}

export type SqliteDatabase = Database & Readonly<{ close(): void; execute(sql: string): void }>;

export function createSqliteDatabase(filename: string): SqliteDatabase {
  const sqlite = new BetterSqlite3(filename);
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('journal_mode = WAL');
  return {
    prepare(query) { return new SqliteStatement(sqlite, { query, values: [] }); },
    async batch(statements) {
      const execute = sqlite.transaction((items: readonly DatabaseStatement[]) => items.map((item) => {
        if (!(item instanceof SqliteStatement)) throw new Error('Database batch received a statement from another adapter');
        const prepared = sqlite.prepare(item.bound.query);
        if (prepared.reader) {
          const results = prepared.all(...item.bound.values);
          return { success: true, results, rowsRead: results.length } satisfies DatabaseResult;
        }
        const result = prepared.run(...item.bound.values);
        return { success: true, rowsWritten: result.changes } satisfies DatabaseResult;
      }));
      try { return execute(statements); }
      catch (error) { throw normalizeSqliteError(error); }
    },
    close: () => sqlite.close(),
    execute: (sql) => sqlite.exec(sql),
  };
}

function normalizeSqliteError(error: unknown): unknown {
  if (error instanceof DatabaseConstraintError) return error;
  const code = typeof error === 'object' && error && 'code' in error
    ? String(error.code)
    : '';
  if (!code.startsWith('SQLITE_CONSTRAINT')) return error;
  const message = error instanceof Error ? error.message : '';
  const kind: DatabaseConstraintKind | undefined = code.endsWith('_UNIQUE') || code.endsWith('_PRIMARYKEY')
    ? 'unique'
    : code.endsWith('_FOREIGNKEY')
      ? 'foreign_key'
      : code.endsWith('_NOTNULL')
        ? 'not_null'
        : code.endsWith('_CHECK')
          ? 'check'
          : undefined;
  if (!kind) return error;
  const target = /constraint failed:\s*([A-Za-z0-9_.]+(?:\s*,\s*[A-Za-z0-9_.]+)*)/i.exec(message)?.[1];
  const qualified = target?.split(',').map((value) => value.trim()) ?? [];
  const table = qualified[0]?.split('.')[0];
  const columns = qualified.flatMap((value) => value.split('.')[1] ?? []);
  const constraint = kind === 'check'
    ? /CHECK constraint failed:\s*([A-Za-z0-9_]+)/i.exec(message)?.[1]
    : undefined;
  return new DatabaseConstraintError(kind, table, columns, constraint, error);
}
