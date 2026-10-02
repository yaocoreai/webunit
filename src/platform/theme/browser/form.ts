import { hasMediaType } from '@/platform/http/media-type';
import { readBoundedResponseJson } from '@/platform/http/read-body';

export type ThemeFormSelectOption = Readonly<{ label: string; value: string }>;

export type ThemeFormField = Readonly<{
  type: string;
  key: string;
  label: string;
  required: boolean;
  width: 1 | 2 | 3;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  rows?: number;
  options?: readonly ThemeFormSelectOption[];
  enumKey?: string;
  rootsOnly?: boolean;
  parentFieldKey?: string;
  accept?: string;
  maxFiles?: number;
  maxFileSize?: number;
}>;

export type ThemeFormDefinition = Readonly<{
  id: string;
  title: string;
  revision: number;
  fields: readonly ThemeFormField[];
}>;

export type ThemeFormFileValue = Readonly<{
  storageKey: string;
  mountKey: string;
  logicalPath: string;
  sizeBytes: number;
  contentType: string;
}>;

export type ThemeFormSubmitResult = Readonly<{
  success: true;
  reference: string;
}>;

const host = () =>
  typeof location === 'undefined' ? 'localhost' : location.hostname;

export async function readThemeFormDefinition(
  formId: string,
  live: boolean,
): Promise<ThemeFormDefinition> {
  if (!live) return fixtureDefinition(formId);
  return invokeJson('/_/public/form/definition/read', { host: host(), formId });
}

export async function listThemeFormEnumValues(
  input: Readonly<{
    key: string;
    parent?: Readonly<{ key: string; code: string }>;
    rootsOnly?: boolean;
    live: boolean;
  }>,
): Promise<readonly ThemeFormSelectOption[]> {
  if (!input.live) return fixtureEnumValues(input.key, input.parent);
  const catalog = await invokeJson<{
    items: readonly Readonly<{ label: string; code: string }>[];
  }>('/_/public/enums/values/list', {
    key: input.key,
    ...(input.rootsOnly ? { rootsOnly: true } : {}),
    ...(input.parent ? { parent: input.parent } : {}),
  });
  return catalog.items.map((item) =>
    Object.freeze({ label: item.label, value: item.code }),
  );
}

export async function submitThemeForm(
  formId: string,
  values: Readonly<Record<string, unknown>>,
  live: boolean,
): Promise<ThemeFormSubmitResult> {
  if (!live) {
    return {
      success: true,
      reference: `FR-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-DATAS`,
    };
  }
  return invokeJson('/_/public/form/submission/create', {
    host: host(),
    formId,
    values,
  });
}

export async function uploadThemeFormFile(
  formId: string,
  fieldKey: string,
  file: File,
  live: boolean,
): Promise<ThemeFormFileValue> {
  if (!live) {
    return {
      storageKey: 'default',
      mountKey: 'forms/datas',
      logicalPath: `datas/${formId}/${fieldKey}/${safeFileName(file.name)}`,
      sizeBytes: file.size,
      contentType: file.type || 'application/octet-stream',
    };
  }
  const ticket = await invokeJson<{
    token: string;
    storageKey: string;
    mountKey: string;
    logicalPathPrefix: string;
    visibility: 'private';
    maxFileSize: number;
  }>('/_/public/form/upload-ticket/issue', {
    host: host(),
    formId,
    fieldKey,
    maxFileSize: file.size,
  });
  if (file.size > ticket.maxFileSize) {
    throw new Error('The selected file is too large');
  }
  const logicalPath = `${ticket.logicalPathPrefix}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const session = await invokeJson<{
    id: string;
    sessionKey: string;
    storageKey: string;
    mountKey: string;
    logicalPath: string;
    upload: Readonly<{
      mode: 'single' | 'multipart';
      method?: 'PUT';
      url?: string;
      headers?: Readonly<Record<string, string>>;
    }>;
  }>('/_/public/storage/upload/create', {
    ticket: ticket.token,
    storageKey: ticket.storageKey,
    mountKey: ticket.mountKey,
    logicalPath,
    visibility: ticket.visibility,
    contentType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    uploadMode: 'single',
    deliveryPathConflict: 'random-suffix',
  });
  if (session.upload.mode !== 'single' || !session.upload.url) {
    throw new Error('Form file upload requires a single PUT target');
  }
  const uploaded = await fetch(session.upload.url, {
    method: session.upload.method ?? 'PUT',
    headers: session.upload.headers,
    body: file,
    credentials: 'omit',
  });
  if (!uploaded.ok) throw new Error('Form file upload failed');
  const completed = await invokeJson<{
    storageKey: string;
    mountKey: string;
    logicalPath: string;
    size: number | null;
    contentType: string | null;
  }>('/_/public/storage/upload/complete', {
    id: session.id,
    sessionKey: session.sessionKey,
  });
  return {
    storageKey: completed.storageKey,
    mountKey: completed.mountKey,
    logicalPath: completed.logicalPath,
    sizeBytes: completed.size ?? file.size,
    contentType: completed.contentType ?? file.type ?? 'application/octet-stream',
  };
}

async function invokeJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!hasMediaType(response.headers, 'application/json')) {
    throw new Error('Form Function returned a non-JSON response');
  }
  const payload = (await readBoundedResponseJson(response, 64_000)) as {
    data?: T;
    error?: { message?: unknown };
  };
  if (!response.ok) {
    throw new Error(
      typeof payload.error?.message === 'string'
        ? payload.error.message
        : 'Form Function request failed',
    );
  }
  if (payload.data === undefined) {
    throw new Error('Form Function returned an invalid response');
  }
  return payload.data;
}

function safeFileName(value: string) {
  const name = value.trim().replaceAll(/[^A-Za-z0-9._-]+/g, '-').slice(0, 80);
  return name || 'upload.bin';
}

function fixtureDefinition(formId: string): ThemeFormDefinition {
  return Object.freeze({
    id: formId || '11111111-1111-4111-8111-111111111111',
    title: 'Survey',
    revision: 1,
    fields: Object.freeze([
      field('name', 'text', 'Name', true, 2, { placeholder: 'Your name' }),
      field('email', 'email', 'Email', true, 2, { placeholder: 'name@company.com' }),
      field('topic', 'select', 'Topic', false, 3, {
        options: Object.freeze([
          { label: 'General', value: 'general' },
          { label: 'Support', value: 'support' },
        ]),
      }),
      field('message', 'textarea', 'Message', true, 1, {
        placeholder: 'Write your message',
        rows: 3,
      }),
    ]),
  });
}

function fixtureEnumValues(
  key: string,
  parent?: Readonly<{ key: string; code: string }>,
): readonly ThemeFormSelectOption[] {
  if (key === 'country-code') return countryOptions;
  if (key === 'region-code' && parent?.code === 'us') return regionOptions;
  return [];
}

const countryOptions = Object.freeze([
  { label: 'United States', value: 'us' },
  { label: 'Canada', value: 'ca' },
]);

const regionOptions = Object.freeze([
  { label: 'California', value: 'us-ca' },
  { label: 'Texas', value: 'us-tx' },
]);

function field(
  key: string,
  type: string,
  label: string,
  required: boolean,
  width: 1 | 2 | 3,
  extra: Readonly<Partial<ThemeFormField>> = {},
): ThemeFormField {
  return Object.freeze({ type, key, label, required, width, ...extra });
}
