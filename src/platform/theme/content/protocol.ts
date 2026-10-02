import { validateQuery, type ModelCountQuery, type ModelQuery } from './model';
import type { ManifestModule } from '@/platform/manifest';
import type { PublicContentApi } from '@/platform/theme/content/public';

export type ContentQueryTarget = Readonly<
  | { type: 'asset' }
  | { type: 'module'; key: string }
  | { type: 'menu' }
>;

export type PublicQueryOperation = 'findOne' | 'findFirst' | 'findMany' | 'count' | 'aggregate';

export type ContentQueryRequest = Readonly<
  | { target: Extract<ContentQueryTarget, { type: 'module' }>; operation: PublicQueryOperation; input?: Readonly<Record<string, unknown>> }
  | { target: Extract<ContentQueryTarget, { type: 'asset' }>; operation: 'findOne'; input: Readonly<{ id: string }> }
  | { target: Extract<ContentQueryTarget, { type: 'menu' | 'asset' }>; operation: 'get'; input: Readonly<{ ids: string | readonly string[] }> }
>;

export function readContentQueryRequest(value: unknown): ContentQueryRequest {
  const request = readRecord(value, 'request');
  const target = readRecord(request.target, 'target');
  const input = request.input === undefined ? undefined : readRecord(request.input, 'input');
  const operation = request.operation;
  if ((target.type === 'menu' || target.type === 'asset') && Object.keys(target).length === 1 && operation === 'get' && input && Object.keys(input).length === 1) {
    const ids = readResourceIds(input.ids);
    return { target: { type: target.type }, operation: 'get', input: { ids } };
  }
  if (!['findOne', 'findFirst', 'findMany', 'count', 'aggregate'].includes(String(operation))) throw new TypeError('Invalid content query operation');
  if (target.type === 'asset' && Object.keys(target).length === 1 && operation === 'findOne' && input && Object.keys(input).length === 1 && typeof input.id === 'string' && resourceIdPattern.test(input.id)) {
    return { target: { type: 'asset' }, operation: 'findOne', input: { id: input.id } };
  }
  if (target.type === 'module' && typeof target.key === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(target.key) && Object.keys(target).length === 2) {
    return { target: { type: 'module', key: target.key }, operation: operation as PublicQueryOperation, ...(input ? { input } : {}) };
  }
  throw new TypeError('Invalid content query target');
}

export async function executeContentQuery(api: PublicContentApi, request: ContentQueryRequest) {
  if (request.operation === 'get') {
    const resource = request.target.type === 'menu' ? api.menu : api.asset;
    return typeof request.input.ids === 'string' ? resource(request.input.ids) : resource(request.input.ids);
  }
  if (request.target.type === 'asset') return api.asset((request.input as { id: string }).id);
  const model = api.module(request.target.key);
  if (request.operation === 'findOne') return model.findOne((request.input ?? {}) as { id: string });
  if (request.operation === 'findFirst') return model.findFirst(request.input as ModelQuery | undefined);
  if (request.operation === 'findMany') return model.findMany(request.input as ModelQuery | undefined);
  if (request.operation === 'count') return model.count(request.input as ModelCountQuery | undefined);
  return model.aggregate(request.input as import('./model').ModelAggregateQuery);
}

const resourceIdPattern = /^[a-zA-Z0-9]+(?:[./_-][a-zA-Z0-9]+)*$/;
const readResourceIds = (value: unknown): string | readonly string[] => {
  if (typeof value === 'string' && resourceIdPattern.test(value)) return value;
  if (Array.isArray(value) && value.length <= 100 && value.every((id) => typeof id === 'string' && resourceIdPattern.test(id))) return value;
  throw new TypeError('Invalid content resource ids');
};

export function assertBrowserContentQuery(request: ContentQueryRequest, modules: readonly ManifestModule[]) {
  const target = request.target;
  if (target.type !== 'module') return;
  const requirement = modules.find((module) => module.key === target.key);
  if (!requirement) throw new TypeError(`Unknown module: ${target.key}`);
  if (request.operation === 'findFirst' || request.operation === 'findMany' || request.operation === 'count') {
    const input = (request.input ?? {}) as ModelQuery;
    validateQuery(input);
    const fields = input.where?.fields;
    if (fields && Object.keys(fields).some((key) => !requirement.entryProperties?.find((property) => property.key === key))) {
      throw new TypeError(`Unknown field: ${target.key}.${Object.keys(fields).find((key) => !requirement.entryProperties?.find((property) => property.key === key))}`);
    }
  }
}

const readRecord = (value: unknown, name: string) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => key === '__proto__' || key === 'prototype' || key === 'constructor')) throw new TypeError(`Invalid ${name}`);
  return record;
};
