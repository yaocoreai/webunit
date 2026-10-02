import type {
  Database,
  DatabaseResult,
  DatabaseStatement,
} from "@/function/common/capabilities/contracts";
import { DatabaseConstraintError, type DatabaseConstraintKind } from "@/function/common/db/error";

type D1Result<T = unknown> = Readonly<{
  success: boolean;
  results?: readonly T[];
  meta?: Readonly<{
    changes?: number;
    rows_read?: number;
    rows_written?: number;
  }>;
}>;

type D1PreparedStatement = Readonly<{
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run<T = unknown>(): Promise<D1Result<T>>;
}>;

export type D1DatabaseBinding = Readonly<{
  prepare(query: string): D1PreparedStatement;
  batch(statements: readonly D1PreparedStatement[]): Promise<readonly D1Result[]>;
}>;

class WorkersD1Statement implements DatabaseStatement {
  constructor(readonly inner: D1PreparedStatement) {}

  bind(...values: unknown[]) {
    return new WorkersD1Statement(this.inner.bind(...values));
  }

  async first<T>() {
    try { return await this.inner.first<T>(); }
    catch (error) { throw normalizeD1Error(error); }
  }

  async all<T>() {
    try {
      const result = await this.inner.all<T>();
      return { results: [...(result.results ?? [])] };
    } catch (error) { throw normalizeD1Error(error); }
  }

  async run() {
    try { return normalizeResult(await this.inner.run()); }
    catch (error) { throw normalizeD1Error(error); }
  }
}

export function createWorkersD1Database(binding: D1DatabaseBinding): Database {
  return {
    prepare(query) {
      return new WorkersD1Statement(binding.prepare(query));
    },
    async batch(statements) {
      const inner = statements.map((statement) => {
        if (!(statement instanceof WorkersD1Statement))
          throw new TypeError("Workers D1 batch received a foreign statement");
        return statement.inner;
      });
      try { return (await binding.batch(inner)).map(normalizeResult); }
      catch (error) { throw normalizeD1Error(error); }
    },
  };
}

function normalizeD1Error(error: unknown): unknown {
  if (error instanceof DatabaseConstraintError) return error;
  const message = error instanceof Error ? error.message : '';
  const matched = /(UNIQUE|FOREIGN KEY|NOT NULL|CHECK) constraint failed(?::\s*([A-Za-z0-9_.]+(?:\s*,\s*[A-Za-z0-9_.]+)*))?/i.exec(message);
  if (!matched) return error;
  const kindByLabel: Record<string, DatabaseConstraintKind> = {
    UNIQUE: 'unique',
    'FOREIGN KEY': 'foreign_key',
    'NOT NULL': 'not_null',
    CHECK: 'check',
  };
  const qualified = matched[2]?.split(',').map((value) => value.trim()) ?? [];
  return new DatabaseConstraintError(
    kindByLabel[matched[1]!.toUpperCase()]!,
    qualified[0]?.split('.')[0],
    qualified.flatMap((value) => value.split('.')[1] ?? []),
    undefined,
    error,
  );
}

function normalizeResult<T>(result: D1Result<T>): DatabaseResult<T> {
  return {
    success: result.success,
    ...(result.results ? { results: [...result.results] } : {}),
    rowsRead: result.meta?.rows_read,
    rowsWritten:
      result.meta?.rows_written ?? result.meta?.changes ?? 0,
  };
}
