# Findings — Imports & `.warp` modules

Live probes against the shipped extension (`extensions/index.ts` → `src/extension/factory.ts`
→ `production-composition.ts`), driven through `tests/hardening/probe-harness.ts`.

- Probes: `tests/hardening/imports-resolution.test.ts` (6 cases: 1 control + 5 checks),
  `tests/hardening/imports-warp-fn.test.ts` (2 cases). Run:
  `npx vitest run --config vitest.hardening.config.ts tests/hardening/imports-*.test.ts`
- Plant convention: `main.loom` + a sibling `.warp`, both `source:'project'` (→
  `<cwd>/.pi/looms/`), so `./lib.warp` resolves relative to the loom's own directory.

## Root cause (shared)

The `.warp` import subsystem exists and is unit-tested in isolation
(`src/parser/imports.ts` — `checkImportExtension`, `checkWarpTopLevelForm`,
`detectImportCycle`, `loadWarpImport`, `checkImportedSymbols`, `RelativeWarpResolver`,
`computeWarpExports`; `validatePathLiteral` in `src/lexer/literals.ts`) but **is not
wired into the shipped pipeline.** Evidence:

- No `src/**` file outside `src/parser/imports.ts` references any of those functions
  (`grep` across `src/`), and no `src/**` file outside `imports.ts`/`literals.ts`
  references the import diagnostic codes.
- `parseImportExport` in `src/parser/loom-document.ts:1542` produces an `ImportDecl`
  node but performs **no** extension check, resolution, symbol binding, `.warp` parse,
  or cycle detection.
- `production-composition.ts` reads/parses `.loom` callees for `tools:`/`invoke` only;
  it never resolves, reads, or parses a `.warp` file for an `import`.

Consequence: every import diagnostic the spec mandates is silently absent, no `.warp`
is ever parsed, and imported symbols resolve to `null` at runtime. Imports/`.warp` are
NOT in the README "Known gaps" (which lists only type-layer diagnostics and nested
control forms), so these are reportable bugs. Reported below as distinct observable
findings; a single wiring fix would likely resolve several.

---

## IMP-1 — Missing `.warp` module file is not diagnosed; loom registers anyway

- **Repro:** `main.loom` (prompt) with `import { Author } from "./does-not-exist.warp"`;
  no such file planted. (`imports-resolution.test.ts` → IMP-A)
- **Expected:** `imports.md` §IMP-1: an unresolvable spec MUST emit
  `loom/load/unresolvable-warp-path` against the importing file and NOT register it
  ("no directory entry exists whose name matches the path literal's final segment").
- **Observed:** `registeredNames = ["main"]`, `diagnostics = []`. The loom registers
  with no diagnostic.
- **Verdict: bug.** A dangling import is accepted silently; the spec's registration-
  blocking diagnostic never fires.

## IMP-2 — `import` from a `.loom` path is accepted (wrong extension not rejected)

- **Repro:** `import { Author } from "./other.loom"` (a real sibling `.loom`).
  (IMP-B)
- **Expected:** `imports.md` §Path resolution + `grammar.md` §Extension matching: a
  non-`.warp` import path is `loom/parse/import-non-warp-extension` (imports are
  `.warp`-only; `.loom` is invoke-only). `validatePathLiteral` encodes exactly this.
- **Observed:** `registeredNames = ["main","other"]`, `diagnostics = []`. No error.
- **Verdict: bug.** The `.warp`-only import boundary is unenforced; a `.loom` import is
  accepted.

## IMP-3 — Importing an undeclared/unexported symbol is not diagnosed

- **Repro:** `lib.warp` declares only `schema Author`; `main.loom` does
  `import { NotExported } from "./lib.warp"`. (IMP-C)
- **Expected:** `imports.md` §Unknown imported symbol: a specifier naming a symbol that
  is neither a top-level declaration nor a re-export is `loom/parse/import-unknown-symbol`.
- **Observed:** `registeredNames = ["main"]`, `diagnostics = []`. No error.
- **Verdict: bug.** Unexported/undeclared names import silently (the resolved `.warp`'s
  export set is never computed or checked).

## IMP-4 — A `.warp` top-level statement/query is not diagnosed

- **Repro:** `lib.warp` contains `schema Author {…}`, then a top-level `let leaked = 5`
  and a top-level `@`-query; `main.loom` imports `Author`. (IMP-D)
- **Expected:** `imports.md` §`.warp` file rules + `guide.md` §".loom versus .warp": a
  `.warp` top level may contain only `import`/`export`/`schema`/`enum`/`fn`; a top-level
  statement or query is `loom/parse/warp-top-level-statement`.
- **Observed:** `registeredNames = ["main"]`, `diagnostics = []`. The `.warp` is never
  parsed, so its illegal top-level forms are never diagnosed.
- **Verdict: bug.** The `.warp` top-level restriction is entirely unenforced.

## IMP-5 — Circular `.warp` imports are not detected

- **Repro:** `a.warp` imports `B` from `./b.warp`; `b.warp` imports `A` from `./a.warp`;
  `main.loom` imports `A` from `./a.warp`. (IMP-E)
- **Expected:** `imports.md` §Cycles: an import cycle between `.warp` files is
  `loom/load/import-cycle` with the cycle path printed.
- **Observed:** `registeredNames = ["main"]`, `diagnostics = []`. No cycle diagnostic;
  the import graph is never walked.
- **Verdict: bug.** Circular `.warp` imports go undetected.

## IMP-6 — An imported warp `fn` silently evaluates to `null` when called

- **Repro:** `lib.warp`: `fn greeting(): string { "HELLO_FROM_WARP" }`; `main.loom`
  (prompt): `@`MARK ${greeting()} say ok``. (`imports-warp-fn.test.ts` → IMP-F)
- **Expected:** `guide.md` §".loom versus .warp": an imported `fn` is callable; the
  interpolated user turn should contain `HELLO_FROM_WARP`.
- **Observed:** `userTexts = ["MARK null say ok"]`, no error, no diagnostic. The
  imported symbol is unresolved and the call **silently yields `null`** (not an error,
  not the fn's return value).
- **Verdict: bug.** Imported functions are unusable, and worse, the call fails silently
  to `null` rather than erroring — a wrong value with no signal.

## IMP-7 — A warp `fn`'s `@`-query never runs / does not attach to the caller conversation

- **Repro:** `lib.warp`: `fn ask(): Result<string, QueryError> { @`WARP_FN_QUERY_SENTINEL respond ok` }`;
  `main.loom` (prompt): `let answer = ask()?` then `@`caller done ${answer}``. (IMP-G)
- **Expected:** `imports.md` §`.warp` file rules + `guide.md`: a query inside an imported
  warp function executes against the **calling** `.loom`'s conversation. The caller's
  user-turn texts should contain `WARP_FN_QUERY_SENTINEL`.
- **Observed:** `userTexts = []` (no turns at all), no error, no diagnostic. The warp
  fn body never executes; `ask()?` resolves against an unresolved symbol and the body
  short-circuits silently — neither the warp fn's query nor the caller's own trailing
  `@`-query is issued.
- **Verdict: bug.** The signature warp-fn feature (a library query running against the
  caller's conversation) does not work; the whole body silently produces no turns.

---

### Probe count

8 live probes (6 in `imports-resolution.test.ts` incl. 1 passing control; 2 in
`imports-warp-fn.test.ts`). Control (`IMP-control`) passes: a valid `.warp` import
registers cleanly — confirming the failures above are the import checks/semantics being
absent, not a harness/planting artifact.
