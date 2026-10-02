import type { Database, DatabaseResult, DatabaseStatement } from '@/function/common/capabilities/contracts';

type Metrics = {
  operations: number;
  failures: number;
  slowQueries: number;
  totalDurationMs: number;
  maxDurationMs: number;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  recentSlowQueries: { query: string; durationMs: number; occurredAt: string }[];
};

class ObservedStatement implements DatabaseStatement {
  constructor(readonly inner: DatabaseStatement, private readonly query: string, private readonly observe: <T>(query: string, operation: () => Promise<T>) => Promise<T>) {}
  bind(...values: unknown[]) { return new ObservedStatement(this.inner.bind(...values), this.query, this.observe); }
  first<T>() { return this.observe(this.query, () => this.inner.first<T>()); }
  all<T>() { return this.observe(this.query, () => this.inner.all<T>()); }
  run() { return this.observe(this.query, () => this.inner.run()); }
}

export function observeDatabase<TDatabase extends Database>(database: TDatabase, slowQueryMs = 250): TDatabase {
  const metrics: Metrics = { operations: 0, failures: 0, slowQueries: 0, totalDurationMs: 0, maxDurationMs: 0, recentSlowQueries: [] };
  let connected = true;
  const observe = async <T>(query: string, operation: () => Promise<T>): Promise<T> => {
    const startedAt = performance.now();
    try {
      const result = await operation();
      finish(query, startedAt, true);
      return result;
    } catch (error) {
      finish(query, startedAt, false);
      throw error;
    }
  };
  const finish = (query: string, startedAt: number, success: boolean) => {
    const durationMs = Math.max(0, performance.now() - startedAt), occurredAt = new Date().toISOString();
    metrics.operations += 1;
    metrics.totalDurationMs += durationMs;
    metrics.maxDurationMs = Math.max(metrics.maxDurationMs, durationMs);
    if (success) metrics.lastSuccessAt = occurredAt;
    else { metrics.failures += 1; metrics.lastFailureAt = occurredAt; }
    connected = success;
    if (durationMs >= slowQueryMs) {
      metrics.slowQueries += 1;
      metrics.recentSlowQueries.unshift({ query: sanitizeQuery(query), durationMs, occurredAt });
      metrics.recentSlowQueries.length = Math.min(metrics.recentSlowQueries.length, 20);
    }
  };
  return {
    ...database,
    prepare(query) { return new ObservedStatement(database.prepare(query), query, observe); },
    batch(statements) {
      const observed = statements.map((statement) => statement instanceof ObservedStatement ? statement.inner : statement);
      return observe(`batch(${observed.length})`, () => database.batch(observed) as Promise<readonly DatabaseResult[]>);
    },
    diagnostics: () => ({ connected, ...metrics, recentSlowQueries: [...metrics.recentSlowQueries] }),
  } as TDatabase;
}

function sanitizeQuery(query: string) { return query.replace(/\s+/g, ' ').trim().slice(0, 240); }
