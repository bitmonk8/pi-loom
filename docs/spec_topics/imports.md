# Imports

`.loom` files import schemas and functions from **`.warp`** files — a separate extension dedicated to shared loom library code. `.loom` files are *not* importable from each other. This split keeps invocable looms (slash commands) and reusable building blocks (libraries) cleanly separated.

```loom
import { Author, persona_block } from "./shared/personas.warp"
```

<a id="permitted-top-level-forms"></a>

**`.warp` file rules:**

- Top-level may contain only `import`, `export`, `schema`, `enum`, and `fn` declarations. No top-level statements, `let` bindings, or queries (`loom/parse/warp-top-level-statement`).
- Inside `fn` bodies, the full Loom language is available, including `@`...`` queries. A query inside an imported function executes against the *calling* `.loom`'s conversation when the function is invoked.
- Never slash-command-discovered. A `.warp` file is invisible to the `/<name>` autocomplete; it is only ever reached via `import`.
- May call `invoke(...)`. The path resolves relative to the `.warp` file's location; the invocation executes against the *calling* `.loom`'s conversation (or spawns a fresh isolated one if the callee is subagent-mode), exactly like a `@`...`` query inside a warp function. Cycle detection from [Invocation](./invocation.md) walks invoke paths originating from warp functions too.

**Path resolution.** loom 1.0 supports relative paths only: `"./shared/personas.warp"`, `"../lib/schemas.warp"`. Paths must end in `.warp` — the extension match is byte-exact lowercase per [Lexical — Extension matching](./lexical.md#extension-matching); an `import` path whose literal does not end in `.warp` (including a `.loom` path or any non-lowercase variant such as `.WARP`) is a parse error `loom/parse/import-non-warp-extension`. Paths resolve relative to the importing file's directory. Path literals use forward-slash separators only — a backslash is a parse error per the "Path literals" rule in [Lexical Structure](./lexical.md). Project-rooted (`/looms/...`) and package-style (`@scope/pkg`) imports are out of scope for loom 1.0. See [Future Considerations](./future-considerations.md).

**Resolver interface.** Import-path resolution goes through a single named seam — a `Resolver` interface with the shape `resolve(spec: string, fromFile: string): string` — rather than a hard-coded relative-path computation inlined at the import call site. loom 1.0.0 ships exactly one implementation: a relative-path resolver that joins `spec` against the directory of `fromFile` and requires the `.warp` extension; non-relative specs (`@scope/pkg`, `/looms/...`) fail this resolver as unresolvable paths and surface through the same load-time diagnostic channel as any other unresolvable `.warp` import. *Non-normative implementation note.* loom 1.0 expects every `.warp` import to flow through this single named seam rather than inline `path.resolve` calls at import sites, so that the deferred package-style and project-rooted import extensions in [Future Considerations](./future-considerations.md) can be added by registering additional `Resolver` implementations rather than rewriting import-site code; the single-seam factoring is a maintainability convention, not an observable conformance point.

<a id="imp-1"></a> **IMP-1 (resolver failure contract).** A `Resolver` MUST signal an unresolvable spec by throwing; loom 1.0's load pipeline treats a throw from `resolve` as a resolution failure, emits the load-time diagnostic `loom/load/unresolvable-warp-path` (see [Diagnostics — `loom/load/*` registry](./diagnostics/code-registry-load.md)) against the importing file, and does not register that file. A spec is unresolvable when it is non-relative (`@scope/pkg`, `/looms/...`, or any other spec the relative-path resolver rejects) or when relative resolution points at a `.warp` path that does not exist or is not readable.

> **loom 1.0 seam — `Resolver` interface.** <a id="loom-1-0-seam-resolver-interface"></a><a id="v1-seam-resolver-interface"></a> Import-path resolution flows through the named `Resolver` seam (`resolve(spec: string, fromFile: string): string`). loom 1.0.0 ships exactly one implementation — a relative-path resolver that requires the `.warp` extension — and non-relative specs (`@scope/pkg`, `/looms/...`) fail this resolver as unresolvable paths. The seam is what lets the deferred package-style and project-rooted import extensions in [Future Considerations — Surface extensions](./future-considerations/surface-extensions.md#surface-extensions-v1-leaves-a-seam) land by registering additional `Resolver` implementations rather than rewriting import-site code. *Non-normative implementation note.* Routing through the single named seam rather than open-coding `path.resolve` at import sites is a maintainability convention, not an observable conformance point.

**Visibility.** Every top-level `schema`, `enum`, and `fn` in a `.warp` file is implicitly exported. There is no `export` keyword on declarations and no privacy modifier; `.warp` files have no internal-only symbols in loom 1.0.

**Re-exports.** A `.warp` may re-export a symbol from another `.warp` using a dedicated form that creates no local binding:

```loom
export { Author } from "./personas.warp"
export { Author as Reviewer } from "./personas.warp"
```

A plain `import { Author } from "./personas.warp"` does **not** re-export `Author` from the importing file — only declarations and explicit `export ... from` forms are visible to downstream importers.

**Unknown imported symbol.** An `import { Foo }` or `export { Foo } from` specifier — including the `as`-aliased forms `import { Foo as Bar }` and `export { Foo as Bar } from` — that names a symbol `Foo` which is neither a top-level declaration nor a transitive re-export (`export … from`) of the resolved `.warp` file is a static error `loom/parse/import-unknown-symbol`. The error names the source symbol (`Foo`), not the alias (`Bar`). The check fires after the resolved `.warp` file's own parse completes: the resolved file's set of top-level declarations and `export … from` re-exports must be known before an importing specifier can be matched against it. It participates in the [Diagnostics — Multi-error reporting](./diagnostics.md) batching rule rather than fast-failing — an unknown-symbol error is collected alongside every other parse / type error from the importing file and its transitive `.warp` imports, and all are reported in one batch. This error is distinct from `loom/parse/unknown-identifier`, which is scoped to bare identifiers in expression position and is never raised for `import` or `export … from` specifiers.

**Name collisions.** Two imports bringing in the same symbol name is `loom/parse/import-name-collision`. Resolve with `as`-aliasing:

```loom
import { Author as AuthorA } from "./team-a.warp"
import { Author as AuthorB } from "./team-b.warp"
```

The same `as` form is also available for self-clarity (`import { ReviewScore as Score } from "./scoring.warp"`). An imported symbol whose name collides with a top-level declaration in the same file is also `loom/parse/import-name-collision` — no implicit shadowing.

**Cycles.** Import cycles between `.warp` files are detected at parse time by walking the static import graph and reported as `loom/load/import-cycle` with the cycle path printed (`"import cycle: a.warp → b.warp → a.warp"`). `.warp` files contain only declarations — no top-level statements, no initialisation order — so cycles serve no purpose and only happen by accident.
