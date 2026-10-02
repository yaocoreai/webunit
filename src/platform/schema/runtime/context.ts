import type {
  ParseOptions,
  ValidationIssue,
  ValidationIssueInput,
  ValidationPathSegment,
} from "../issues";

const defaultMaximumIssues = 32;
const defaultMaximumDepth = 64;
const maximumRuleLength = 64;
const maximumMessageLength = 256;
const rulePattern = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;

export class ParseContext {
  readonly issues: ValidationIssue[] = [];
  readonly path: ValidationPathSegment[];
  readonly ancestors: Set<object>;
  readonly abortEarly: boolean;
  readonly maximumIssues: number;
  readonly maximumDepth: number;
  depth = 0;

  constructor(
    options: ParseOptions = {},
    path: ValidationPathSegment[] = [],
    ancestors: Set<object> = new Set(),
  ) {
    this.path = path;
    this.ancestors = ancestors;
    this.abortEarly = options.abortEarly ?? false;
    this.maximumIssues = boundedPositiveInteger(
      options.maximumIssues,
      defaultMaximumIssues,
      256,
    );
    this.maximumDepth = boundedPositiveInteger(
      options.maximumDepth,
      defaultMaximumDepth,
      256,
    );
  }

  get stopped() {
    return this.issues.length >= this.maximumIssues ||
      (this.abortEarly && this.issues.length > 0);
  }

  issue(input: ValidationIssueInput) {
    if (this.stopped) return;
    const rule = input.rule?.slice(0, maximumRuleLength);
    if (rule && !rulePattern.test(rule))
      throw new TypeError(`Invalid Schema issue rule: ${rule}`);
    const params = input.params
      ? Object.freeze({ ...input.params })
      : undefined;
    this.issues.push(Object.freeze({
      code: input.code ?? "invalid_value",
      path: Object.freeze([...this.path, ...(input.path ?? [])]),
      ...(rule ? { rule } : {}),
      message: input.message.slice(0, maximumMessageLength),
      ...(params ? { params } : {}),
    }));
  }

  withPath<T>(segment: ValidationPathSegment, execute: () => T): T {
    this.path.push(segment);
    try {
      return execute();
    } finally {
      this.path.pop();
    }
  }

  enter(value: object): boolean {
    if (this.depth >= this.maximumDepth) {
      this.issue({
        code: "maximum_depth",
        rule: "maximum_depth",
        message: "Value exceeds the maximum nesting depth",
        params: { maximum: this.maximumDepth },
      });
      return false;
    }
    if (this.ancestors.has(value)) {
      this.issue({
        code: "cyclic_value",
        rule: "acyclic",
        message: "Value must not contain a cycle",
      });
      return false;
    }
    this.depth += 1;
    this.ancestors.add(value);
    return true;
  }

  leave(value: object) {
    this.ancestors.delete(value);
    this.depth -= 1;
  }

  fork(): ParseContext {
    const context = new ParseContext(
      {
        abortEarly: this.abortEarly,
        maximumIssues: this.maximumIssues,
        maximumDepth: this.maximumDepth,
      },
      [...this.path],
      new Set(this.ancestors),
    );
    context.depth = this.depth;
    return context;
  }
}

function boundedPositiveInteger(
  input: number | undefined,
  fallback: number,
  maximum: number,
) {
  if (input === undefined) return fallback;
  if (!Number.isSafeInteger(input) || input < 1 || input > maximum)
    throw new TypeError(`Parse option must be an integer between 1 and ${maximum}`);
  return input;
}
