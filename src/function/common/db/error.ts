export type DatabaseConstraintKind =
  | "unique"
  | "foreign_key"
  | "not_null"
  | "check";

export class DatabaseConstraintError extends Error {
  readonly name = "DatabaseConstraintError";

  constructor(
    readonly kind: DatabaseConstraintKind,
    readonly table?: string,
    readonly columns: readonly string[] = [],
    readonly constraint?: string,
    cause?: unknown,
  ) {
    super(`Database ${kind.replace("_", " ")} constraint failed`, cause === undefined
      ? undefined
      : { cause });
  }
}

export function isDatabaseConstraintError(
  error: unknown,
  kind: DatabaseConstraintKind,
  table?: string,
): error is DatabaseConstraintError {
  return error instanceof DatabaseConstraintError
    && error.kind === kind
    && (table === undefined || error.table === table);
}
