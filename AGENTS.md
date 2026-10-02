# AGENTS.md

English is the default. The Chinese translation is [AGENTS-zh.md](AGENTS-zh.md). On conflict, follow this file.

## Working rules

- Check the code, tests, real entry, related docs, and existing edits first. Code and real runtime behavior are the final source of the current fact.
- State the goal, scope, prohibitions, and done condition first. Touch only the named scope and the dependencies it needs.
- Fix the root cause and the authoritative data flow, and land it on the current architecture. Do not keep an old path, a second entry, or a compatibility layer unless explicitly asked.
- Solve only problems that have evidence in code, tests, runtime, or real input.
- Split modules and files by responsibility. Avoid cross-layer calls, circular dependencies, giant files, and duplicate implementations.
- Keep uncommitted edits. Do not reset, clean, overwrite, or change unrelated content.

## Confirming requirements

- Investigate questions that the code and context can answer. Decide ordinary, reversible details that do not change architecture or business meaning.
- Confirm first when a change would alter business meaning, the authoritative data source, an architecture boundary, or the scope of the edit.
- Confirm first when the work needs paid resources, a production operation, or a destructive operation.
- When asking, state the confirmed facts, the open decisions, the recommended option, and the key tradeoff. Continue work that is not blocked.
- Wait for an answer before the blocked part.

## Execution and completion

- Close the loop as check, design, implement, verify, then residual scan.
- After an edit, run the affected tests, ESLint, and the type check. When the change touches Workers, a database, or UI, add the matching runtime, database, bundle, and real-entry check.
- Done means the in-scope scenarios, automated checks, architecture boundaries, and residual scan have passed.
- Parallelize only tasks that do not depend on each other and do not edit the same file. Shared contracts and the final integration stay on one execution chain.

## Docs

Docs record the current fact only. Writing and splitting follow the rules below. Do not write the same fact again per runtime or per page.

### How to write

- `README.md` keeps two lists apart:
  - Implemented capabilities: a short description and a doc index, by feature or module.
  - Planned capabilities: product requirements that are not implemented yet. Do not record the implementation process.
- Each doc covers one feature module: the current principle, boundary, key tradeoffs, limits, and code entry. Omit a section that has nothing to say.
- Do not record implementation history, audits, or test logs. Content removed from the code must be removed from the current docs. Git holds the history.
- Omit general knowledge and details the code already states. Keep the current difference, and deliberate limits that are easy to mistake for defects.
- Write a tradeoff as the current choice, the reason, and the re-evaluation condition when one exists.
- Read the existing tradeoffs before an architecture review. Do not classify a deliberate limit as a defect again unless the premise changed, the condition fired, the code violates the tradeoff, or the user asked.
- When docs and code disagree, confirm the fact from the code, the tests, and the real entry, then fix the docs.
- Code, config, tests, example data, and identifiers are English. Docs and comments are English.

### How to split

- Explanation docs live in `docs/`, one level deep. The filename is the module name, for example `theme.md` and `function.md`. One feature has one English doc.
- When one module has several independent features and one file would be too large, split it into `{module}-{feature}.md`. The shared boundary and the index stay in the short `{module}.md`.
- Architecture uses `architecture-*.md`. Each file covers one independent architecture. Do not merge them into one total architecture.
- When splitting or moving docs, update the README index, the links between docs, and the doc paths in code and tests.

### Chinese

Chinese is a translation of the English. It is not a second source. It covers the prose that differs, and it adds no fact the English does not have. A missing Chinese file means read the English. Do not add an empty translation.

- A root file uses the `-zh` suffix: `README-zh.md`, `AGENTS-zh.md`.
- Explanation docs use the same filename under `docs/zh/`, for example `docs/zh/architecture.md`.
- Do not encode the language as a module name (`theme-zh.md`, `theme.zh.md`). Do not add `docs/en/`.
- Links inside a translated doc stay relative to that doc's own directory.

## Site architecture

- This directory is the WebUnit site runtime unit. Platform is the shared boundary scaffold. Function carries capabilities. Theme only presents. Content lives in `src/theme/datas`.
- Function is layered as `app`, `common`, `features`, and `infrastructure`. `app` only declares registrations. `bootstrap` is a side-effect-free composition root. The shared Application and Entry live in `common/app`.
- Feature and Common do not import Infrastructure. Theme does not import Function. Workers Infrastructure does not import the Node implementation.
- HTTP and SSR share one Function Application. SSR uses the Direct Router. The browser uses the HTTP Router.
- Only Platform Runtime selects the environment. Business code does not read environment variables, Wrangler bindings, or the Astro runtime.
- Workers is the public contract. Node and Container provide compatible implementations.
- This directory has no Admin app. `admin` is a Function route surface.
- `pnpm dev` renders theme datas only. `pnpm dev:function` starts Node. `pnpm dev:cloudflare` runs the local site and connects to Cloudflare.
- `src/platform/generated` and `src/function/bootstrap/generated` are produced by `pnpm generate:registry`. Do not edit them by hand.

## Conventions

- Code, config, tests, example data, identifiers, docs, and comments are English. Chinese exists only as the `-zh` file or the `docs/zh/` translation.
- A final note separates implemented behavior, verification evidence, why something was not verified, and what is out of scope. Do not describe a plan, a placeholder entry, or a verification that did not run as done.
