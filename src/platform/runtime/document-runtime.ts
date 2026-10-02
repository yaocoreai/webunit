export type DocumentRuntime = Readonly<{
  finalize(
    response: Response,
    request: Request,
    development: boolean,
  ): Response | Promise<Response>;
}>;

const documentRuntimeKey = Symbol("platform.document-runtime");
type RuntimeLocals = { [documentRuntimeKey]?: DocumentRuntime };

export function bindDocumentRuntime(locals: object, runtime: DocumentRuntime) {
  Object.defineProperty(locals, documentRuntimeKey, {
    configurable: false,
    enumerable: false,
    value: runtime,
    writable: false,
  });
}

export function readDocumentRuntime(locals: object) {
  return (locals as RuntimeLocals)[documentRuntimeKey];
}
