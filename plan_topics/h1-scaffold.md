# H1 — Repository scaffold and test framework

**Spec.** None — infrastructure leaf; no normative spec page. (Cross-cutting rules enforced here — no globals/statics/singletons, no broad catch — are defined in [`conventions.md`](./conventions.md), not in `spec_topics/`.)

**Convention.** [Cross-cutting rules](conventions.md#cross-cutting-rules-every-phase) — "No globals, statics, singletons" (architectural test), "Specific exception types only" (ESLint rule), "Sequential by default", "No silent test skipping". Project hygiene (TypeScript strict mode, Vitest, Prettier, GitHub Actions, npm scripts, source layout) trace to project-level conventions, not to any spec rule.

**Adds.** TypeScript project (strict mode, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`); Vitest + coverage; ESLint with `@typescript-eslint`, no-floating-promises, no-globals, no-broad-catch; Prettier; `depcheck` as a devDependency with a committed `.depcheckrc` (or `package.json` `depcheck` block) declaring Vitest, ESLint plugins, Prettier, and `@types/*` as known-used so the gate's real-world behaviour is what is being validated; npm scripts (`build`, `test`, `test:watch`, `typecheck`, `lint`, `lint:actions`, `format`, `depcheck`); GitHub Actions workflow file at `.github/workflows/ci.yml` with jobs `typecheck`, `lint`, `test`, `depcheck`; `actionlint` as a dev-dep + npm script (`npm run lint:actions`); project bootstrap files `CHANGELOG.md` (Keep-a-Changelog header: `# Changelog`, the standard "format based on Keep a Changelog" / "adheres to Semantic Versioning" links, and an empty `## [Unreleased]` section) and `notes.md` (`# Notes` header plus a one-line description of its purpose), created once at the project root so the per-leaf doc-update convention has stable targets.

**Source layout:**
```
src/{parser, ast, lowering, runtime, extension, diagnostics, util}/
test/{unit (mirrors src/), integration, fixtures/{loom, warp, schemas}, fakes/}
```

**Tests.**
- Sentinel test (`1 + 1 === 2`) proving toolchain runs.
- Per-directory presence test (`__present` re-exported by every `src/*/index.ts`).
- `no-static-state.test.ts` walks `src/**/*.ts` and inspects every module-top-level binding (any `VariableDeclaration` whose parent is `Program` or `ExportNamedDeclaration` directly under `Program`). Uses the TypeScript compiler API rather than line-anchored regex so that `export const`, `export let`, `export var`, and indented continuations are caught. Fails on:
    - any `let` or `var` at module top-level (regardless of `export`);
    - any `const` (including `export const`) whose initialiser is not one of the permitted forms below.

  Permitted initialiser forms for module-top-level `const`:
  1. A literal of primitive type — string, number (incl. `bigint`), boolean, `null`, `undefined`.
  2. A `RegExp` literal (`/.../flags`) without the `g` or `y` flag (stateful regex bindings are forbidden because `RegExp.lastIndex` is shared mutable state).
  3. A `TemplateLiteral` with no substitutions, or a string built from `+` of items each themselves on this list.
  4. An `as const` expression (`<expr> as const`) where `<expr>` is itself an array literal, object literal, or tuple of items each on this list — TypeScript's `as const` produces a deeply-readonly type, so downstream mutation is a type error.
  5. A direct `Object.freeze(<expr>)` call where `<expr>` is an object literal whose every property value is on this list, or an array literal whose every element is on this list. Shallow `Object.freeze` is acceptable because the contained values are themselves immutable by rules 1–4.
  6. A reference to an `enum`-like exported `const` from the same package whose declaration itself satisfies this list (computed transitively, single-pass — no need for full graph closure).

  Forbidden initialiser forms (non-exhaustive, listed for clarity): bare `[]` / `{}` / `new Map()` / `new Set()` / `new WeakMap()`; function or arrow-function expressions; `class` expressions; any call expression other than `Object.freeze(...)`; any identifier reference not covered by rule 6.

- Tests-for-the-test: a fixture directory under `test/fixtures/no-static-state/` containing `ok-*.ts` files that must pass and `bad-*.ts` files that must fail, one fixture per allow-list rule and one per forbidden form, asserted by running the checker against each fixture and comparing exit code and reported binding name.
- Workflow shape test: parses `.github/workflows/ci.yml` as YAML; asserts top-level `on.push` and `on.pull_request` triggers exist; asserts `jobs.typecheck`, `jobs.lint`, `jobs.test`, `jobs.depcheck` each exist and each contains a step whose `run` command invokes the matching npm script (`npm run typecheck`, `npm run lint`, `npm test`, `npm run depcheck` respectively).
- `depcheck` self-test: a fixture package under `test/fixtures/depcheck-unused/` declares an unused dependency; the test invokes `npx depcheck` against the fixture (using the same `.depcheckrc` shape committed at repo root) and asserts a non-zero exit and that the unused dep name appears in stdout. A second fixture under `test/fixtures/depcheck-clean/` with no unused deps asserts exit 0. This negative-fixture pair is load-bearing — without it, future leaves can drift `depcheck`'s configuration (e.g. a broad `ignorePatterns`) into a state where the gate passes vacuously and no one notices.
- Workflow lint test: `npm run lint:actions` (`actionlint`) exits 0 on the committed workflow; exits non-zero on a fixture workflow under `test/fixtures/ci-bad/` that contains an unknown job key. `actionlint` is a Go binary, not an npm package; install via `actionlint-installer` or pin a release archive in a `postinstall` script. The `lint:actions` script must fail loudly (non-zero exit, no silent skip) if the binary is absent — per the cross-cutting "no silent test skipping" rule in [`conventions.md`](./conventions.md).
- File-presence test: `CHANGELOG.md` and `notes.md` exist at the project root. `CHANGELOG.md` starts with `# Changelog`, contains the Keep-a-Changelog format/versioning links, and has an `## [Unreleased]` section header; `notes.md` starts with `# Notes`. The test asserts these header strings literally so future leaves cannot silently retarget the convention to a different file shape.

**Deps.** None.

**Ships when.** `npm run typecheck && npm run lint && npm run lint:actions && npm test && npm run depcheck` green, and `CHANGELOG.md` / `notes.md` are present at the project root with the headers asserted above.
