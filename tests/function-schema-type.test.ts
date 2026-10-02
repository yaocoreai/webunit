import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { schemaType } from "../scripts/function-schema-type.mts";
import { s, toJsonSchema } from "@/function/common/app/schema";

test("Function schema types keep declared passthrough fields without requiring an index signature", () => {
  const schema = toJsonSchema(
    s.object({ id: s.string() }).passthrough(),
  ).schema;
  assert.equal(
    schemaType(schema, "input"),
    'Readonly<{ "id": string }> | (Readonly<{ "id": string }> & Readonly<Record<string, unknown>>)',
  );
  assert.equal(
    schemaType(schema, "output"),
    'Readonly<{ "id": string }> & Readonly<Record<string, unknown>>',
  );
});

test("Function schema types represent unknown-valued records as objects", () => {
  const unknownRecord = toJsonSchema(
    s.record(s.string(), s.unknown()),
  ).schema;
  assert.equal(
    schemaType(unknownRecord, "input"),
    "Readonly<object>",
  );
  assert.equal(
    schemaType(unknownRecord, "output"),
    "Readonly<Record<string, unknown>>",
  );
  assert.equal(
    schemaType(
      toJsonSchema(s.record(s.string(), s.string())).schema,
      "input",
    ),
    "Readonly<Record<string, string>>",
  );
});

test("Function schema types preserve fixed and variadic tuples", () => {
  assert.equal(
    schemaType(
      toJsonSchema(s.tuple([s.string(), s.number()] as const)).schema,
      "input",
    ),
    "readonly [string, number]",
  );
  assert.equal(
    schemaType({
      type: "array",
      prefixItems: [{ type: "string" }],
      items: { type: "number" },
    }),
    "readonly [string, ...number[]]",
  );
});

test("Function input types accept named interfaces and checked extra literals while outputs retain extras", () => {
  const input = schemaType(
    toJsonSchema(s.object({ id: s.string() }).passthrough()).schema,
    "input",
  );
  const output = schemaType(
    toJsonSchema(s.object({ id: s.string() }).passthrough()).schema,
    "output",
  );
  const diagnostics = compile(`
    type Input = ${input};
    type Output = ${output};
    declare function call(input: Input): Output;
    interface NamedInput { id: string; extra: number }
    declare const named: NamedInput;
    call(named);
    call({ id: "id", extra: 1 });
    // @ts-expect-error callers cannot override the authoritative output type
    call<{ ok: true }>({ id: "id", extra: 1 });
    declare const result: Output;
    const extra: unknown = result.extra;
    void extra;
    // @ts-expect-error required fields remain required
    call({ extra: 1 });
  `);
  assert.deepEqual(diagnostics, []);
});

function compile(source: string) {
  const fileName = "/function-schema-type-regression.ts";
  const options: ts.CompilerOptions = {
    module: ts.ModuleKind.ESNext,
    noEmit: true,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
  };
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    options.target,
    true,
    ts.ScriptKind.TS,
  );
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  const fileExists = host.fileExists.bind(host);
  const readFile = host.readFile.bind(host);
  host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) =>
    name === fileName
      ? sourceFile
      : getSourceFile(name, languageVersion, onError, shouldCreateNewSourceFile);
  host.fileExists = (name) => name === fileName || fileExists(name);
  host.readFile = (name) => name === fileName ? source : readFile(name);
  const program = ts.createProgram([fileName], options, host);
  return ts.getPreEmitDiagnostics(program)
    .filter((diagnostic) => diagnostic.file?.fileName === fileName)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
}
