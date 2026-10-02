import { extractCmsContentText } from "@/platform/schema";

export type QueryScalar = string | number | boolean | null;

export type QueryFilter = Readonly<{
  equals?: QueryScalar;
  not?: QueryScalar;
  in?: readonly QueryScalar[];
  notIn?: readonly QueryScalar[];
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  gt?: string | number;
  gte?: string | number;
  lt?: string | number;
  lte?: string | number;
}>;

export type ModelWhere = Readonly<{
  attributes?: Readonly<Record<string, QueryFilter>>;
  fields?: Readonly<Record<string, QueryFilter>>;
  AND?: readonly ModelWhere[];
  OR?: readonly ModelWhere[];
  NOT?: ModelWhere;
}>;

export type ModelOrderBy = Readonly<{
  path: string;
  direction?: 'asc' | 'desc';
}>;

export type ModelQuery = Readonly<{
  query?: string;
  where?: ModelWhere;
  orderBy?: readonly ModelOrderBy[];
  cursor?: string;
  limit?: number;
  includeTotal?: boolean;
}>;

export type ModelCountQuery = Readonly<{ query?: string; where?: ModelWhere }>;

export type AggregateOperation = 'sum' | 'avg' | 'min' | 'max';

export type ModelAggregateQuery = Readonly<{
  query?: string;
  where?: ModelWhere;
  count?: boolean;
  sum?: readonly string[];
  avg?: readonly string[];
  min?: readonly string[];
  max?: readonly string[];
}>;

export type ModelAggregateResult = Readonly<{
  currency?: string;
  count?: number;
  sum?: Readonly<Record<string, number | null>>;
  avg?: Readonly<Record<string, number | null>>;
  min?: Readonly<Record<string, number | null>>;
  max?: Readonly<Record<string, number | null>>;
}>;

export type ModelPage<T> = Readonly<{
  items: readonly T[];
  total?: number;
  pageInfo: Readonly<{ hasNextPage: boolean; endCursor?: string }>;
}>;

export type ReadModel<T> = Readonly<{
  findOne(input: Readonly<{ id: string }>): Promise<T | null>;
  findFirst(input?: Omit<ModelQuery, 'cursor' | 'limit' | 'includeTotal'>): Promise<T | null>;
  findMany(input?: ModelQuery): Promise<ModelPage<T>>;
  count(input?: ModelCountQuery): Promise<number>;
  aggregate(input: ModelAggregateQuery): Promise<ModelAggregateResult>;
}>;

const maxWhereDepth = 8;
const maxPredicates = 64;
const maxOrderBy = 3;
const maxLimit = 100;
const maxAggregateFields = 8;
const safeKey = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;
const dangerousKeys = new Set(['__proto__', 'prototype', 'constructor']);

export function createMemoryReadModel<T extends Readonly<Record<string, unknown>>>(
  rows: readonly T[],
  options: Readonly<{
    searchText?: (row: T) => string | undefined;
    aggregateValue?: (row: T, field: string) => number | undefined;
    aggregatableFields?: readonly string[];
  }> = {},
): ReadModel<T> {
  const execute = (input: ModelQuery = {}) => {
    validateQuery(input);
    const query = normalizeSearchQuery(input.query);
    const filtered = rows.filter((row) => matchesWhere(row, input.where) && (!query || normalizeSearchText(options.searchText?.(row) ?? '').includes(query)));
    const ordered = [...filtered].sort(createComparator(input.orderBy));
    const offset = decodeCursor(input.cursor);
    const limit = input.limit ?? 20;
    const items = ordered.slice(offset, offset + limit);
    const nextOffset = offset + items.length;
    return {
      items,
      ...(input.includeTotal ? { total: ordered.length } : {}),
      pageInfo: nextOffset < ordered.length
        ? { hasNextPage: true, endCursor: encodeCursor(nextOffset) }
        : { hasNextPage: false },
    } as const;
  };

  return {
    async findOne(input) {
      const keys = Object.entries(input).filter(([, value]) => value !== undefined);
      if (keys.length !== 1 || !keys.every(([key, value]) => key === 'id' && typeof value === 'string' && value.length > 0)) {
        throw new TypeError('findOne requires exactly one non-empty id');
      }
      const [key, value] = keys[0];
      return rows.find((row) => row[key] === value) ?? null;
    },
    async findFirst(input = {}) {
      if ('cursor' in input || 'limit' in input || 'includeTotal' in input) throw new TypeError('findFirst does not accept cursor, limit or includeTotal');
      return execute({ ...input, limit: 1 }).items[0] ?? null;
    },
    async findMany(input = {}) {
      return execute(input);
    },
    async count(input = {}) {
      if (Object.keys(input).some((key) => key !== 'where' && key !== 'query')) throw new TypeError('count only accepts query and where');
      validateQuery(input);
      const query = normalizeSearchQuery(input.query);
      return rows.filter((row) => matchesWhere(row, input.where) && (!query || normalizeSearchText(options.searchText?.(row) ?? '').includes(query))).length;
    },
    async aggregate(input) {
      validateAggregateQuery(input, options.aggregatableFields ?? []);
      const query = normalizeSearchQuery(input.query);
      const filtered = rows.filter((row) => matchesWhere(row, input.where) && (!query || normalizeSearchText(options.searchText?.(row) ?? '').includes(query)));
      const result: Record<string, unknown> = input.count ? { count: filtered.length } : {};
      for (const operation of ['sum', 'avg', 'min', 'max'] as const) {
        const fields = input[operation];
        if (!fields?.length) continue;
        result[operation] = Object.fromEntries(fields.map((field) => {
          const values = filtered.map((row) => options.aggregateValue?.(row, field)).filter((value): value is number => value !== undefined);
          if (!values.length) return [field, null];
          if (operation === 'sum') return [field, values.reduce((total, value) => total + value, 0)];
          if (operation === 'avg') return [field, values.reduce((total, value) => total + value, 0) / values.length];
          return [field, operation === 'min' ? Math.min(...values) : Math.max(...values)];
        }));
      }
      return result as ModelAggregateResult;
    },
  };
}

export function validateAggregateQuery(input: ModelAggregateQuery, aggregatableFields: readonly string[]) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('aggregate input must be an object');
  if (Object.keys(input).some((key) => !['query', 'where', 'count', 'sum', 'avg', 'min', 'max'].includes(key))) throw new TypeError('Invalid aggregate query option');
  validateQuery({ ...(input.query !== undefined ? { query: input.query } : {}), ...(input.where !== undefined ? { where: input.where } : {}) });
  if (input.count !== undefined && typeof input.count !== 'boolean') throw new TypeError('aggregate count must be a boolean');
  const allowed = new Set(aggregatableFields);
  const fields = (['sum', 'avg', 'min', 'max'] as const).flatMap((operation) => {
    const values = input[operation];
    if (values === undefined) return [];
    if (!Array.isArray(values) || !values.length || values.length > maxAggregateFields || values.some((field) => typeof field !== 'string' || !safeKey.test(field))) throw new TypeError(`Invalid aggregate ${operation} fields`);
    if (new Set(values).size !== values.length) throw new TypeError(`Duplicate aggregate ${operation} field`);
    return values;
  });
  if (!input.count && !fields.length) throw new TypeError('aggregate requires count or at least one field');
  if (fields.some((field) => !allowed.has(field))) throw new TypeError(`Field is not aggregatable: ${fields.find((field) => !allowed.has(field))}`);
}

export function validateQuery(input: ModelQuery) {
  if (Object.keys(input).some((key) => !['query', 'where', 'orderBy', 'cursor', 'limit', 'includeTotal'].includes(key))) throw new TypeError('Invalid Model query option');
  normalizeSearchQuery(input.query);
  validateWhere(input.where);
  if (input.limit !== undefined && (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > maxLimit)) throw new TypeError(`limit must be an integer between 1 and ${maxLimit}`);
  if (input.includeTotal !== undefined && typeof input.includeTotal !== 'boolean') throw new TypeError('includeTotal must be a boolean');
  if (input.cursor !== undefined) decodeCursor(input.cursor);
  if (input.orderBy !== undefined) {
    if (!Array.isArray(input.orderBy) || input.orderBy.length > maxOrderBy) throw new TypeError(`orderBy supports at most ${maxOrderBy} fields`);
    for (const order of input.orderBy) {
      if (!isSafePath(order.path) || (order.direction !== undefined && order.direction !== 'asc' && order.direction !== 'desc')) throw new TypeError(`Invalid orderBy: ${order.path}`);
    }
  }
}

const normalizeSearchText = (value: string) => value.normalize('NFKC').toLocaleLowerCase();
const normalizeSearchQuery = (value: string | undefined) => {
  if (value === undefined) return '';
  if (typeof value !== 'string') throw new TypeError('query must be a string');
  const normalized = normalizeSearchText(value.trim());
  if (!normalized || normalized.length > 120) throw new TypeError('query must contain between 1 and 120 characters');
  return normalized;
};

export function validateWhere(where: ModelWhere | undefined, depth = 0, state = { predicates: 0 }): void {
  if (!where) return;
  if (!where || typeof where !== 'object' || Array.isArray(where) || Object.keys(where).some((key) => !['attributes', 'fields', 'AND', 'OR', 'NOT'].includes(key))) throw new TypeError('Invalid where object');
  if (depth > maxWhereDepth) throw new TypeError(`where depth exceeds ${maxWhereDepth}`);
  for (const group of [where.attributes, where.fields]) {
    if (!group) continue;
    if (typeof group !== 'object' || Array.isArray(group)) throw new TypeError('Query fields must be an object');
    for (const [key, filter] of Object.entries(group)) {
      state.predicates += 1;
      if (state.predicates > maxPredicates || !safeKey.test(key) || dangerousKeys.has(key)) throw new TypeError(`Invalid query field: ${key}`);
      validateFilter(filter);
    }
  }
  if (where.AND !== undefined) {
    if (!Array.isArray(where.AND) || where.AND.length > maxPredicates) throw new TypeError('Invalid AND group');
    for (const item of where.AND) validateWhere(item, depth + 1, state);
  }
  if (where.OR !== undefined) {
    if (!Array.isArray(where.OR) || where.OR.length > maxPredicates) throw new TypeError('Invalid OR group');
    for (const item of where.OR) validateWhere(item, depth + 1, state);
  }
  if (where.NOT !== undefined) validateWhere(where.NOT, depth + 1, state);
}

function validateFilter(filter: QueryFilter) {
  if (!filter || typeof filter !== 'object' || Array.isArray(filter)) throw new TypeError('Query filter must be an object');
  const keys = Object.keys(filter);
  const allowed = new Set(['equals', 'not', 'in', 'notIn', 'contains', 'startsWith', 'endsWith', 'gt', 'gte', 'lt', 'lte']);
  if (!keys.length || keys.some((key) => !allowed.has(key))) throw new TypeError('Invalid query filter');
  for (const key of ['equals', 'not'] as const) {
    const value = filter[key];
    if (value !== undefined && value !== null && typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') throw new TypeError(`Invalid ${key} filter`);
  }
  for (const key of ['gt', 'gte', 'lt', 'lte'] as const) if (filter[key] !== undefined && typeof filter[key] !== 'string' && typeof filter[key] !== 'number') throw new TypeError(`Invalid ${key} filter`);
  for (const key of ['in', 'notIn'] as const) if (filter[key] !== undefined && (!Array.isArray(filter[key]) || filter[key]!.length > maxPredicates)) throw new TypeError(`Invalid ${key} filter`);
  for (const key of ['in', 'notIn'] as const) if (filter[key]?.some((value) => value !== null && !['string', 'number', 'boolean'].includes(typeof value))) throw new TypeError(`Invalid ${key} filter`);
  for (const key of ['contains', 'startsWith', 'endsWith'] as const) if (filter[key] !== undefined && typeof filter[key] !== 'string') throw new TypeError(`Invalid ${key} filter`);
}

function matchesWhere(row: Readonly<Record<string, unknown>>, where?: ModelWhere): boolean {
  if (!where) return true;
  const attributes = Object.entries(where.attributes ?? {}).every(([key, filter]) => matchesFilter(row[key], filter));
  const fields = row.fields && typeof row.fields === 'object' && !Array.isArray(row.fields) ? row.fields as Record<string, unknown> : {};
  const fieldValues = Object.entries(where.fields ?? {}).every(([key, filter]) => matchesFilter(fields[key], filter));
  const and = (where.AND ?? []).every((item) => matchesWhere(row, item));
  const or = where.OR === undefined || where.OR.length === 0 || where.OR.some((item) => matchesWhere(row, item));
  const not = where.NOT === undefined || !matchesWhere(row, where.NOT);
  return attributes && fieldValues && and && or && not;
}

function matchesFilter(value: unknown, filter: QueryFilter): boolean {
  const comparable = headingValue(value) ?? referenceId(value) ?? value;
  if (filter.equals !== undefined && !equal(comparable, filter.equals)) return false;
  if (filter.not !== undefined && equal(comparable, filter.not)) return false;
  if (filter.in !== undefined && !filter.in.some((candidate) => equal(comparable, candidate))) return false;
  if (filter.notIn !== undefined && filter.notIn.some((candidate) => equal(comparable, candidate))) return false;
  if (filter.contains !== undefined && Array.isArray(value) && value.some((item) => isReferenceValue(item) && item.id === filter.contains)) return true;
  const text = extractCmsContentText(comparable);
  if (filter.contains !== undefined && !normalizeSearchText(text).includes(normalizeSearchText(filter.contains))) return false;
  if (filter.startsWith !== undefined && !normalizeSearchText(text).startsWith(normalizeSearchText(filter.startsWith))) return false;
  if (filter.endsWith !== undefined && !normalizeSearchText(text).endsWith(normalizeSearchText(filter.endsWith))) return false;
  if (filter.gt !== undefined && !(compare(value, filter.gt) > 0)) return false;
  if (filter.gte !== undefined && !(compare(value, filter.gte) >= 0)) return false;
  if (filter.lt !== undefined && !(compare(value, filter.lt) < 0)) return false;
  if (filter.lte !== undefined && !(compare(value, filter.lte) <= 0)) return false;
  return true;
}

const headingValue = (value: unknown): string | undefined => value && typeof value === 'object' && !Array.isArray(value)
  && typeof (value as { value?: unknown }).value === 'string' && Number.isInteger((value as { level?: unknown }).level)
  ? (value as { value: string }).value
  : undefined;
const referenceId = (value: unknown): string | undefined =>
  isReferenceValue(value) ? value.id : undefined;
const isReferenceValue = (value: unknown): value is Readonly<{ id: string; reference?: string }> => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof (value as { id?: unknown }).id !== 'string') return false;
  const record = value as Readonly<Record<string, unknown>>;
  if (Object.hasOwn(record, 'text') || Object.hasOwn(record, 'children')) return false;
  const keys = Object.keys(record);
  if (keys.length === 2 && Object.hasOwn(record, 'id') && Object.hasOwn(record, 'reference') && typeof record.reference === 'string') return true;
  return ['file', 'image', 'audio', 'video'].includes(String(record.type)) || Object.hasOwn(record, 'fields');
};

const equal = (left: unknown, right: QueryScalar) => left === right || (Array.isArray(left) && left.includes(right));
const compare = (left: unknown, right: string | number) => typeof left === typeof right && (typeof left === 'string' || typeof left === 'number')
  ? sortableValue(left) < sortableValue(right) ? -1 : sortableValue(left) > sortableValue(right) ? 1 : 0
  : Number.NaN;

function createComparator(orderBy: readonly ModelOrderBy[] = [{ path: 'key', direction: 'asc' }]) {
  return (left: TRecord, right: TRecord) => {
    for (const order of orderBy) {
      const leftValue = readPath(left, order.path);
      const rightValue = readPath(right, order.path);
      const result = compareSortable(leftValue, rightValue);
      if (result) return order.direction === 'desc' ? -result : result;
    }
    return compareSortable(String(left.key ?? left.id ?? ''), String(right.key ?? right.id ?? ''));
  };
}

type TRecord = Readonly<Record<string, unknown>>;
const readPath = (row: TRecord, path: string) => path.split('.').reduce<unknown>((value, key) => value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>)[key] : undefined, row);
const sortableValue = (value: string | number) => typeof value === 'string' ? normalizeSearchText(value) : value;
const compareSortable = (left: unknown, right: unknown) => left === right ? 0
  : left === undefined || left === null ? 1
    : right === undefined || right === null ? -1
      : typeof left === 'number' && typeof right === 'number' ? left - right
        : normalizeSearchText(String(left)) < normalizeSearchText(String(right)) ? -1
          : normalizeSearchText(String(left)) > normalizeSearchText(String(right)) ? 1 : 0;
const isSafePath = (path: string) => path.split('.').length <= 2 && path.split('.').every((part) => safeKey.test(part) && !dangerousKeys.has(part));

function encodeCursor(offset: number) {
  return btoa(`v1:${offset}`).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decodeCursor(cursor?: string) {
  if (!cursor) return 0;
  try {
    const value = atob(cursor.replaceAll('-', '+').replaceAll('_', '/'));
    const match = value.match(/^v1:(\d+)$/);
    if (!match) throw new Error();
    return Number(match[1]);
  } catch {
    throw new TypeError('Invalid cursor');
  }
}
