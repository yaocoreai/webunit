import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appRouteModules } from "../src/function/app/route-modules";
import { loadRouteModuleDefinitions } from "../src/function/common/route/module";
import type {
  FunctionHttpInputSource,
  FunctionHttpRouteManifestEntry,
  FunctionHttpRouteSpec,
} from "../src/function/common/route/http";
import { toJsonSchema } from "../src/function/common/app/schema";
import { applicationErrorStatus } from "../src/function/common/app/error-status";
import type { ErrorContract } from "../src/function/common/app/error-contract";
import { schemaType } from "./function-schema-type.mts";
import { pruneGeneratedDirectory } from "./prune-generated-directory.mjs";

type Tree = Map<string, Tree | string>;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = resolve(root, "src/platform/generated/function-api");
const openApiOutput = resolve(
  root,
  "src/platform/generated/function-openapi.json",
);
const routeManifestOutput = resolve(
  root,
  "src/function/bootstrap/generated/route/manifest.ts",
);
const adminOutput = resolve(root, "../admin/src/api/function/generated.ts");
const adminProtocolOutput = resolve(root, "../admin/src/api/function/protocol.ts");
const loadedRouteModules =
  await loadRouteModuleDefinitions(appRouteModules);
const functionRoutes = Object.freeze(
  loadedRouteModules.flatMap(({ routes }) => routes),
);
const names = functionRoutes.map((route) => route.name).sort();
const routeByName = new Map(functionRoutes.map((route) => [route.name, route]));
const internalNames = names.filter(
  (name) => routeByName.get(name)?.surface === "internal",
);
const httpNames = names.filter((name) => !internalNames.includes(name));
const publicNames = names.filter((name) => name.startsWith("public."));
const cmsDirectNames = names.filter(
  (name) => name.startsWith("public.cms.") || name.startsWith("internal.cms."),
);
const streamNames = names.filter((name) =>
  routeByName.get(name)?.getSpec("response-stream"),
);
const fileNames = names.filter((name) =>
  routeByName.get(name)?.getSpec("response-file"),
);
const adminStreamNames = streamNames.filter((name) => httpNames.includes(name));
const adminFileNames = fileNames.filter((name) => httpNames.includes(name));
const acceptsEmptyInput = new Set(
  functionRoutes
    .filter((route) => route.contract.input.safeParse({}).success)
    .map((route) => route.name),
);

function tree(routeNames: readonly string[]): Tree {
  const result: Tree = new Map();
  for (const name of routeNames) {
    const segments = name.split(".");
    let current = result;
    for (const [index, segment] of segments.entries()) {
      if (index === segments.length - 1) {
        if (current.has(segment))
          throw new Error(
            `Function API namespace conflicts with Route: ${name}`,
          );
        current.set(segment, name);
        continue;
      }
      const existing = current.get(segment);
      if (typeof existing === "string")
        throw new Error(`Function API namespace conflicts with Route: ${name}`);
      const child = existing ?? new Map<string, Tree | string>();
      current.set(segment, child);
      current = child;
    }
  }
  return result;
}

const key = (value: string) =>
  /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value) ? value : JSON.stringify(value);
type RenderTarget = "direct" | "http" | "admin";

function render(
  value: Tree | string,
  depth: number,
  target: RenderTarget,
): string {
  if (typeof value === "string") {
    const routeName = JSON.stringify(value);
    const inputType = `FunctionRouteInputMap[${routeName}]`;
    const input = acceptsEmptyInput.has(value)
      ? `input: ${inputType} = {} as ${inputType}`
      : `input: ${inputType}`;
    const invoke = target === "admin" && streamNames.includes(value)
      ? "invokeStream"
      : target === "admin" && fileNames.includes(value)
        ? "invokeFile"
        : "invoke";
    return `(${input}, options?: FunctionCallOptions) => ${invoke}(${routeName}, input, options)`;
  }
  const indentation = "  ".repeat(depth);
  const entries = [...value].map(
    ([name, child]) =>
      `${"  ".repeat(depth + 1)}${key(name)}: ${render(child, depth + 1, target)}`,
  );
  return `Object.freeze({\n${entries.join(",\n")}\n${indentation}})`;
}

const routes = functionRoutes.map((route) => ({
  name: route.name,
  input: toJsonSchema(route.contract.input).schema,
  output: toJsonSchema(route.contract.output).schema,
}));
for (const route of routes) {
  for (const field of ["input", "output"] as const) {
    if (isUnboundedRootSchema(route[field]))
      throw new Error(
        `Function Route ${field} contract must declare an exact root schema: ${route.name}`,
      );
  }
}
const typeMap = (
  name: string,
  routeNames: readonly string[],
  field: "input" | "output",
  envelope = false,
) =>
  `export type ${name} = {\n${routes
    .filter((route) => routeNames.includes(route.name))
    .map(
      (route) =>
        `  ${JSON.stringify(route.name)}: ${envelope && field === "output" ? `Readonly<{ data: ${schemaType(route[field], "output")} }>` : schemaType(route[field], field)};`,
    )
    .join("\n")}\n};\n`;
const sharedTypes =
  typeMap("FunctionRouteInputMap", names, "input") +
  "\n" +
  typeMap("FunctionRouteOutputMap", names, "output");
const adminTypes =
  typeMap("FunctionRouteInputMap", httpNames, "input") +
  "\n" +
  typeMap("FunctionRouteOutputMap", httpNames, "output");

const union = (values: readonly string[]) =>
  values.length ? values.map(JSON.stringify).join(" | ") : "never";

const typesSource =
  `// Generated by scripts/generate-function-api.mts. Do not edit.\n` +
  `export type FunctionCallOptions = Readonly<{ signal?: AbortSignal; headers?: HeadersInit }>;\n` +
  `${sharedTypes}\n` +
  `export type FunctionStreamRouteName = ${union(streamNames)};\n` +
  `export type FunctionFileRouteName = ${union(fileNames)};\n` +
  `export type FunctionProtocolRouteName = FunctionStreamRouteName | FunctionFileRouteName;\n` +
  `export type FunctionDataRouteName = Exclude<keyof FunctionRouteInputMap, FunctionProtocolRouteName>;\n` +
  `export type FunctionStreamResult = Readonly<{ type: 'stream'; stream: ReadableStream<Uint8Array>; contentType: string; headers?: HeadersInit }>;\n` +
  `export type FunctionFileResult = Readonly<{ type: 'file'; body: BodyInit | null; headers?: HeadersInit; status?: number }>;\n` +
  `export type FunctionRouteDirectOutputMap = { [TName in keyof FunctionRouteOutputMap]: TName extends FunctionStreamRouteName ? FunctionStreamResult : TName extends FunctionFileRouteName ? FunctionFileResult | FunctionRouteOutputMap[TName] : FunctionRouteOutputMap[TName] };\n` +
  `export type FunctionRouteHttpOutputMap = { [TName in keyof FunctionRouteOutputMap]: TName extends FunctionProtocolRouteName ? Response : FunctionRouteOutputMap[TName] };\n` +
  `type FunctionOutputMap = { readonly [TName in keyof FunctionRouteInputMap]: unknown };\n` +
  `export type FunctionInvoker<TOutputMap extends FunctionOutputMap> = <TName extends keyof FunctionRouteInputMap>(name: TName, input: FunctionRouteInputMap[TName], options?: FunctionCallOptions) => Promise<TOutputMap[TName]>;\n`;
const factoryPrelude = `// Generated by scripts/generate-function-api.mts. Do not edit.\nimport type { FunctionCallOptions, FunctionInvoker, FunctionRouteInputMap, FunctionRouteOutputMap } from './types';\nexport type { FunctionCallOptions, FunctionInvoker } from './types';\n\n`;
const directSource =
  factoryPrelude.replace("FunctionRouteOutputMap", "FunctionRouteDirectOutputMap") +
  `export const createGeneratedFunctionApi = (invoke: FunctionInvoker<FunctionRouteDirectOutputMap>) => ${render(tree(names), 0, "direct")};\n\n` +
  `export type GeneratedFunctionApi = ReturnType<typeof createGeneratedFunctionApi>;\n`;
const publicSource =
  factoryPrelude.replace("FunctionRouteOutputMap", "FunctionRouteHttpOutputMap") +
  `export const createGeneratedPublicFunctionApi = (invoke: FunctionInvoker<FunctionRouteHttpOutputMap>) => ${render(tree(publicNames), 0, "http")};\n\n` +
  `export type GeneratedPublicFunctionApi = ReturnType<typeof createGeneratedPublicFunctionApi>;\n`;
const publicDirectSource =
  factoryPrelude.replace("FunctionRouteOutputMap", "FunctionRouteDirectOutputMap") +
  `export const createGeneratedPublicDirectFunctionApi = (invoke: FunctionInvoker<FunctionRouteDirectOutputMap>) => ${render(tree(publicNames), 0, "direct")};\n\n` +
  `export type GeneratedPublicDirectFunctionApi = ReturnType<typeof createGeneratedPublicDirectFunctionApi>;\n`;
const cmsDirectSource =
  factoryPrelude.replace("FunctionRouteOutputMap", "FunctionRouteDirectOutputMap") +
  `export const createGeneratedCmsDirectFunctionApi = (invoke: FunctionInvoker<FunctionRouteDirectOutputMap>) => ${render(tree(cmsDirectNames), 0, "direct")};\n\n` +
  `export type GeneratedCmsDirectFunctionApi = ReturnType<typeof createGeneratedCmsDirectFunctionApi>;\n`;
const httpSource =
  factoryPrelude.replace("FunctionRouteOutputMap", "FunctionRouteHttpOutputMap") +
  `export const createGeneratedHttpFunctionApi = (invoke: FunctionInvoker<FunctionRouteHttpOutputMap>) => ${render(tree(httpNames), 0, "http")};\n\n` +
  `export type GeneratedHttpFunctionApi = ReturnType<typeof createGeneratedHttpFunctionApi>;\n`;
const namesSource =
  `// Generated by scripts/generate-function-api.mts. Do not edit.\n` +
  `export const functionRouteNames = Object.freeze(${JSON.stringify(names)}) as readonly string[];\n` +
  `export const httpFunctionRouteNames = Object.freeze(${JSON.stringify(httpNames)}) as readonly string[];\n`;

const adminSource =
  `// Generated by site/scripts/generate-function-api.mts. Do not edit.\n` +
  `import type { AxiosRequestConfig } from 'axios';\n` +
  `import { ${[
    "requestFunction",
    ...(adminFileNames.length ? ["requestFunctionFile"] : []),
    ...(adminStreamNames.length ? ["requestFunctionStream"] : []),
  ].join(", ")} } from './client';\n\n` +
  `export type FunctionCallOptions = AxiosRequestConfig;\n` +
  `${adminTypes}\n` +
  `export type FunctionStreamRouteName = ${union(adminStreamNames)};\n` +
  `export type FunctionFileRouteName = ${union(adminFileNames)};\n` +
  `export type FunctionProtocolRouteName = FunctionStreamRouteName | FunctionFileRouteName;\n` +
  `export type FunctionDataRouteName = Exclude<keyof FunctionRouteInputMap, FunctionProtocolRouteName>;\n\n` +
  `const invoke = requestFunction;\n` +
  (adminStreamNames.length ? `const invokeStream = requestFunctionStream;\n` : "") +
  (adminFileNames.length ? `const invokeFile = requestFunctionFile;\n` : "") +
  `export const functionApi = ${render(tree(httpNames), 0, "admin")};\n`;

const httpRouteManifest = functionRoutes
  .filter((route) => route.surface !== "internal")
  .map((route): FunctionHttpRouteManifestEntry => {
    const declared = route.getSpec<FunctionHttpRouteSpec>("http");
    return Object.freeze({
      name: route.name,
      method: declared?.method ?? "POST",
      path: declared?.path ?? `/${route.name.replaceAll(".", "/")}`,
      input: declared?.input ?? "json",
      response: route.getSpec("response-stream")
        ? "stream"
        : route.getSpec("response-file")
          ? "file"
          : "data",
    });
  })
  .sort((left, right) =>
    left.path.localeCompare(right.path) ||
    left.method.localeCompare(right.method) ||
    left.name.localeCompare(right.name),
  );

const defaultHttpRoute = (name: string): FunctionHttpRouteManifestEntry => ({
  name,
  method: "POST",
  path: `/${name.replaceAll(".", "/")}`,
  input: "json",
  response: "data",
});
const httpRouteOverrides = Object.fromEntries(
  httpRouteManifest.flatMap((entry) => {
    const defaults = defaultHttpRoute(entry.name);
    const override = {
      ...(entry.method !== defaults.method ? { method: entry.method } : {}),
      ...(entry.path !== defaults.path ? { path: entry.path } : {}),
      ...(entry.input !== defaults.input ? { input: entry.input } : {}),
      ...(entry.response !== defaults.response
        ? { response: entry.response }
        : {}),
    };
    return Object.keys(override).length ? [[entry.name, override]] : [];
  }),
);

const compactHttpMetadataSource = (
  routeNames: readonly string[],
  overrides: Readonly<Record<string, object>>,
  metadataType: string,
  routeNamesInitializer = JSON.stringify(routeNames),
) =>
  `const functionHttpRouteNames = Object.freeze(${routeNamesInitializer}) as readonly string[];\n` +
  `const functionHttpRouteOverrides = Object.freeze(${JSON.stringify(overrides)}) as Readonly<Record<string, Partial<${metadataType}>>>;\n` +
  `const materializeFunctionHttpRoute = (name: string): ${metadataType} => Object.freeze({ name, method: 'POST', path: \`/\${name.replaceAll('.', '/')}\`, input: 'json', response: 'data', ...(functionHttpRouteOverrides[name] ?? {}) });\n`;

const protocolSource =
  `// Generated by scripts/generate-function-api.mts. Do not edit.\n` +
  `export type FunctionHttpRouteMetadata = Readonly<{ name: string; method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD'; path: string; input: 'json' | Readonly<{ path?: Readonly<Record<string, string>>; query?: Readonly<Record<string, string>>; headers?: Readonly<Record<string, string>> }>; response: 'data' | 'file' | 'stream' }>;\n\n` +
  compactHttpMetadataSource(httpNames, httpRouteOverrides, 'FunctionHttpRouteMetadata') +
  `export const functionHttpRouteByName = Object.freeze(Object.fromEntries(functionHttpRouteNames.map((name) => [name, materializeFunctionHttpRoute(name)]))) as Readonly<Record<string, FunctionHttpRouteMetadata>>;\n`;

await mkdir(outputRoot, { recursive: true });
await mkdir(dirname(openApiOutput), { recursive: true });
await mkdir(dirname(routeManifestOutput), { recursive: true });
const adminPackage = resolve(root, "../admin/package.json");
const writeAdminClient = await access(adminPackage).then(() => true, () => false);
if (writeAdminClient) {
  await mkdir(dirname(adminOutput), { recursive: true });
  await mkdir(dirname(adminProtocolOutput), { recursive: true });
}
await Promise.all([
  pruneGeneratedDirectory(outputRoot, [
    "cms-direct.ts",
    "direct.ts",
    "http.ts",
    "names.ts",
    "protocol.ts",
    "public-direct.ts",
    "public.ts",
    "types.ts",
  ]),
  pruneGeneratedDirectory(dirname(routeManifestOutput), ["manifest.ts"]),
]);
await Promise.all([
  writeFile(resolve(outputRoot, "types.ts"), typesSource),
  writeFile(resolve(outputRoot, "direct.ts"), directSource),
  writeFile(resolve(outputRoot, "public-direct.ts"), publicDirectSource),
  writeFile(resolve(outputRoot, "cms-direct.ts"), cmsDirectSource),
  writeFile(resolve(outputRoot, "public.ts"), publicSource),
  writeFile(resolve(outputRoot, "http.ts"), httpSource),
  writeFile(resolve(outputRoot, "names.ts"), namesSource),
  writeFile(resolve(outputRoot, "protocol.ts"), protocolSource),
  ...(writeAdminClient
    ? [writeFile(adminProtocolOutput, protocolSource.replace('scripts/generate-function-api.mts', 'site/scripts/generate-function-api.mts'))]
    : []),
]);
if (writeAdminClient) await writeFile(adminOutput, adminSource);
await writeFile(
  routeManifestOutput,
  `// Generated by scripts/generate-function-api.mts. Do not edit.\nimport type { FunctionHttpRouteManifestEntry } from '@/function/common/route/http';\n\nconst functionRouteNameList = Object.freeze(${JSON.stringify(names)});\nconst internalFunctionRouteNames = new Set<string>(${JSON.stringify(internalNames)});\nexport const functionRouteNames = new Set(functionRouteNameList) as ReadonlySet<string>;\n\n${compactHttpMetadataSource(httpNames, httpRouteOverrides, 'FunctionHttpRouteManifestEntry', 'functionRouteNameList.filter((name) => !internalFunctionRouteNames.has(name))')}export const functionHttpRoutes = Object.freeze(functionHttpRouteNames.map(materializeFunctionHttpRoute)) as readonly FunctionHttpRouteManifestEntry[];\n`,
);
const openApiPaths: Record<string, Record<string, unknown>> = {};
for (const httpRoute of httpRouteManifest) {
  const route = routeByName.get(httpRoute.name)!;
  const inputExport = toJsonSchema(route.contract.input);
  const outputExport = toJsonSchema(route.contract.output);
  const outputSchema = outputExport.schema;
  const streamSpec = route.getSpec("response-stream") as
    { contentType?: string } | undefined;
  const fileSpec = route.getSpec("response-file");
  const successResponse = streamSpec
    ? {
        description: "Successful Route stream",
        content: {
          [streamSpec.contentType ?? "application/octet-stream"]: {
            schema: { type: "string", format: "binary" },
          },
        },
      }
    : fileSpec
      ? {
          description: "Successful Route file",
          content: {
            "application/octet-stream": {
              schema: { type: "string", format: "binary" },
            },
          },
        }
      : {
          description: "Successful Route result",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["data"],
                properties: { data: outputSchema },
                additionalProperties: false,
              },
            },
          },
        };
  const path = `/_${openApiPath(httpRoute.path)}`;
  const operation = {
    tags: [route.name.split(".").slice(0, 2).join(".")],
    "x-route-name": route.name,
    "x-route-specs": route.specs.map((spec) => spec.kind),
    "x-schema-portability": {
      input: inputExport.portability,
      output: outputExport.portability,
    },
    "x-runtime-schema-extensions": {
      input: inputExport.runtimeExtensions,
      output: outputExport.runtimeExtensions,
    },
    ...(httpRoute.input === "json"
      ? {
          requestBody: {
            required: true,
            content: { "application/json": { schema: inputExport.schema } },
          },
        }
      : { parameters: httpParameters(httpRoute.input) }),
    responses: {
      "200": successResponse,
      ...contractErrorResponses(route),
      default: defaultErrorResponse(),
    },
  };
  openApiPaths[path] = {
    ...(openApiPaths[path] ?? {}),
    [httpRoute.method.toLowerCase()]: operation,
  };
}

const openapi = {
  openapi: "3.1.0",
  info: { title: "Webunit Function API", version: "1.0.0" },
  paths: openApiPaths,
};
await writeFile(openApiOutput, `${JSON.stringify(openapi, null, 2)}\n`);
console.info(
  `Generated Function API and OpenAPI (${names.length} Routes, ${httpNames.length} HTTP Routes).`,
);

function contractErrorResponses(route: (typeof functionRoutes)[number]) {
  const byStatus = new Map<number, typeof route.contract.errors>();
  for (const error of route.contract.errors) {
    const status = applicationErrorStatus(error.kind);
    byStatus.set(status, [...(byStatus.get(status) ?? []), error]);
  }
  return Object.fromEntries(
    [...byStatus].map(([status, errors]) => [
      String(status),
      {
        description: errors.map((error) => error.message).join("; "),
        content: {
          "application/json": {
            schema:
              errors.length === 1
                ? errorEnvelope(errors[0]!)
                : { oneOf: errors.map(errorEnvelope) },
          },
        },
      },
    ]),
  );
}

function openApiPath(path: string) {
  return path
    .split("/")
    .map((segment) =>
      segment === "*"
        ? "{wildcard}"
        : segment.startsWith(":")
          ? `{${segment.slice(1)}}`
          : segment,
    )
    .join("/");
}

function httpParameters(input: FunctionHttpInputSource) {
  return [
    ...Object.entries(input.path ?? {}).map(([source]) => ({
      name: source,
      in: "path",
      required: true,
      schema: { type: "string" },
    })),
    ...Object.entries(input.query ?? {}).map(([source]) => ({
      name: source,
      in: "query",
      required: false,
      schema: { type: "string" },
    })),
    ...Object.entries(input.headers ?? {}).map(([source]) => ({
      name: source,
      in: "header",
      required: false,
      schema: { type: "string" },
    })),
  ];
}

function defaultErrorResponse() {
  return {
    description: "Route error",
    content: {
      "application/json": {
        schema: {
          type: "object",
          required: ["error", "meta"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: { type: "string" },
                message: { type: "string" },
              },
            },
            meta: {
              type: "object",
              required: ["requestId"],
              properties: { requestId: { type: "string" } },
              additionalProperties: false,
            },
          },
          additionalProperties: false,
        },
      },
    },
  };
}

function errorEnvelope(error: ErrorContract<object | undefined>) {
  const contract = error as {
    code: string;
    message: string;
    details?: Parameters<typeof toJsonSchema>[0];
  };
  return {
    type: "object",
    required: ["error", "meta"],
    additionalProperties: false,
    properties: {
      error: {
        type: "object",
        required: ["code", "message"],
        additionalProperties: false,
        properties: {
          code: { type: "string", const: contract.code },
          message: { type: "string", const: contract.message },
          ...(contract.details
            ? { details: toJsonSchema(contract.details).schema }
            : {}),
        },
      },
      meta: {
        type: "object",
        required: ["requestId"],
        additionalProperties: false,
        properties: { requestId: { type: "string" } },
      },
    },
  };
}

function isUnboundedRootSchema(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return true;
  const schema = value as Readonly<Record<string, unknown>>;
  if (!Object.keys(schema).length) return true;
  return (
    schema.type === "object" &&
    schema.properties === undefined &&
    schema.additionalProperties !== false
  );
}
