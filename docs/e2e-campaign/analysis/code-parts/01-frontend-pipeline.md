# 01 — Front-end compile pipeline (lexer, parser, binder)

Scope: offline static analysis before runtime execution. Every claim cites `path:line`.

Note on "stub" markers: the header comments in nearly all these files describe the
tests-first (`V*-T`) seam history ("V*-T stubs this inertly; the paired V* leaf fills
it in"). Those are **historical** — the paired implementation leaves are filled in
(git HEAD `ea9cb45b` marks "production-readiness program complete"). See §5 for the
distinction between historical markers, genuinely-inert code, and spec-sanctioned
runtime deferrals.

## 1. Compile pipeline: raw `.loom` → tokens → AST/LoomDocument → typed body

Flow (all inside `parseLoomDocument`, `src/parser/loom-document.ts:563`):

1. **Split frontmatter** — `splitFrontmatter(text)` separates the optional `---`
   fence from the body (`src/parser/loom-document.ts:851`, called at `:576`).
2. **Lex** — `lexLoom(source, deps)` (`src/lexer/lexer.ts:92`) UTF-8-validates raw
   bytes, normalises newlines, tokenises, collapses newline-continuations into
   `stmt-sep` tokens, runs contextual identifier/keyword checks. Called at
   `src/parser/loom-document.ts:601`. Returns `LexResult { tokens, diagnostics, ok }`
   (`src/lexer/lexer.ts:70`). Token shape: `Token` (`src/lexer/lexer.ts:38`), kinds
   `keyword|ident|number|string|punct|stmt-sep|eof` (`:28`).
3. **Parse body** — `new BodyParser(tokens, file, bodyText).parseBody()`
   (`BodyParser` class at `src/parser/loom-document.ts:1037`, invoked `:603-604`)
   produces the `LoomBody`/`Block` AST (`statements: Stmt[]`, `tail: Expr | null`;
   `src/parser/loom-document.ts:522`, `528`). Node/AST types (`LetStmt`, `IfStmt`,
   `SchemaDecl`, `InvokeExpr`, `QueryExpr`, `MatchExpr`, …) declared
   `src/parser/loom-document.ts:87-528`.
4. **Doc-comment merge** — `scanDocComments` (`:905`) recovers `///` runs (lexer
   emits no comment tokens) and `mergeByLine` folds them into statements (`:608-609`).
5. **Query-schema resolution** — `resolveQuerySchemas` (imported `:73`, called
   `:613`) fills each INDIRECT typed query's inferred response schema (QRY-2) into
   the AST.
6. **Frontmatter parse** — if a fence was present, `parseFrontmatter` (`:634`;
   defined `src/parser/frontmatter.ts:665`) parses `mode:`/`model:`/`params:`/etc.
   Body is lexed+parsed **before** frontmatter so the whole-file named-type set
   (`collectBodyTypes`, `src/parser/loom-document.ts:782`) is available to
   frontmatter `params:`/`system:` resolution (comment `:589-599`).
7. **Static checkers over the AST** — three checker families run against the parsed
   body: `checkStructural` (AST-shape checks, `src/parser/loom-document.ts:2950`,
   called `:658`), `checkTypeLayer` (`type`-phase over the V20b static-type
   substrate, called `:661`), and `checkWarpTopLevel` (`.warp`-only permitted-form
   check, defined `:597`, called `:670`).
8. **Aggregate** — `assembleDiagnostics([...])` merges all groups sorted
   `(file, line, col)`, no fast-fail (`src/parser/loom-document.ts:672`; defined
   `src/diagnostics/diagnostic.ts:107`).

Output: `LoomDocument { frontmatter, body, diagnostics }`
(`src/parser/loom-document.ts:531`). There is **no separate "bound/typed IR" object**:
the typed representation is the same `body` AST, mutated in place with resolved query
schemas and validated by the checker passes; per-expression static types are the V20b
substrate consumed by `checkTypeLayer`.

### Public entry functions a test would call (offline parse)

- **`parseLoomDocument(source: LoomSource, deps: ParseLoomDocumentDeps): LoomDocument`**
  — `src/parser/loom-document.ts:563`. **This is the single "parse a whole loom
  document" entry point.** `LoomSource = { path, bytes: Uint8Array }`
  (`src/lexer/lexer.ts:62`); `ParseLoomDocumentDeps = { systemNote, modelMatcher }`
  (`src/parser/loom-document.ts:545`). Both deps can be inert no-ops offline (see
  `parseExpressionSource` body `:773-779` for an inert `systemNote`).
- `parseExpressionSource(source: string): Expr | null` —
  `src/parser/loom-document.ts:761`. Parses a single standalone expression (reuses
  `BodyParser.parseSingleExpression`); discards lex diagnostics. Useful for
  expression-level tests.
- `lexLoom(source, deps): LexResult` — `src/lexer/lexer.ts:92`. Lexer-only entry.
- `parseFrontmatter(source, options): FrontmatterParseResult` —
  `src/parser/frontmatter.ts:665`. Frontmatter-only entry.
- Sub-language validators (pure, callable directly): `validatePathLiteral`
  (`src/lexer/literals.ts:63`), `checkIntegerNarrowing` (`src/lexer/literals.ts:117`).

## 2. Binder vs parser

Terminology: the `src/binder/**` "binder" is **not** a classic compiler
name-resolution/scope binder. It is loom's **argument binder** — the pass that binds
slash-command invocation arguments to the loom's declared `params:` schema, mostly via
an LLM `complete()` call at dispatch time. Static name/scope/type resolution lives in
`src/parser/**` (the checker passes in §1), not here.

- **Parser** (`src/parser/**`): input = raw `.loom` bytes/text; output = `LoomDocument`
  (AST + frontmatter + diagnostics). Fully offline, no model.
- **Binder** (`src/binder/**`): input = an already-parsed/loaded loom (its `params:`
  schema, frontmatter, session context) plus a user's raw argument string; output =
  a bound `args` object (or a `needs_info`/`ambiguous` failure). The core act is a
  model call, so the binder is a **runtime** pass, not part of the offline compile.

Binder inputs/outputs by module:
- `buildBinderCompleteCall` — `src/binder/binder-inference.ts:132`. Builds the pi-ai
  `complete()` call (system prompt, fixed user message, one forced structured-output
  tool, `temperature:0`, seed, abort signal). **Needs the model at run.**
- `resolveBinderModel` — `src/binder/binder-model.ts:179`. Load-time model resolution
  + strict-capability probe.
- Provider/failure runtime helpers: `provider-error-mapping.ts`, `retry-taxonomy.ts`,
  `binder-cancellation.ts`, `session-context-walk.ts` (`walkSessionContext:91`),
  `compact-transcript.ts`, `system-note.ts`.

### Binder functions that are pure/offline (no model needed)

These compute deterministically from already-parsed structures and are unit-testable
offline:
- `classifyBinderBypass(fields)` — `src/binder/binder-envelope.ts:176`. Pure; decides
  `no-params-bypass | single-string-bypass | binder` from the static `params:` shape.
- `buildBinderEnvelopeSchema(input)` — `src/binder/binder-envelope.ts:78`. Pure schema
  construction. `applyBinderBypass` (`:244`), `trimSlashArgumentWhitespace` (`:204`),
  `binderFailureRowPrefix` (`:267`), `renderBinderFailureRow` (`:275`).
- `deriveBinderSeed(bareCommandName)` — `src/binder/binder-seed.ts:43`. Pure FNV-1a.
- `buildBinderSystemPrompt(input)` / `renderBinderParamLine(field)` —
  `src/binder/binder-system-prompt.ts:175` / `:151`. Pure string rendering.
- `walkSessionContext(input)` — `src/binder/session-context-walk.ts:91`. Pure
  truncation walk over a supplied message list + injected `TokenEstimator` (no model,
  but needs session-context input, not offline-from-source).
- `fillDefaultsAndRevalidate(input)` — `src/binder/defaulting.ts:67`. Pure default-fill
  + AJV re-validation (needs a compiled validator, no model).

`binderToolName(slug)` (`src/binder/binder-inference.ts:89`) is also pure.

## 3. Diagnostics — surface, return shape

- Structured object: `Diagnostic { severity, code, file?, range?, message, hint?,
  related?, masked?, details? }` — `src/diagnostics/diagnostic.ts:43`. `Severity =
  "error" | "warning"` (`:14`). `Position` 1-indexed (`:17`), `SourceRange` (`:23`,
  `end` exclusive), `RelatedSite` (`:29`).
- Diagnostics are **returned in-band**, never thrown:
  - `LoomDocument.diagnostics: readonly Diagnostic[]` — `src/parser/loom-document.ts:539`.
  - `LexResult.diagnostics` + `LexResult.ok` — `src/lexer/lexer.ts:73-76`.
  - `FrontmatterParseResult { registered, frontmatter?, diagnostics }` —
    `src/parser/frontmatter.ts:180`.
- Assembly: `assembleDiagnostics(groups)` flattens all per-file groups, no fast-fail,
  stable-sorts `(file, line, col)` — `src/diagnostics/diagnostic.ts:107`.
- Rendering: `renderDiagnosticLine` (`src/diagnostics/diagnostic.ts:64`) →
  `<file>:<line>:<col>: <code>: <message>` (located) / `<file>: <code>: <message>`
  (file-only) / `<code>: <message>` (location-less); `renderDiagnosticBatch` (`:97`)
  joins blocks with a blank line.
- Producer side channel: the lexer also emits diagnostics through the V7d
  `emitDiagnosticBatch` system-note seam as one batched `loom-system-note` — never a
  direct `pi.sendMessage` (`src/lexer/lexer.ts:80-84`, `:130-134`). Offline callers
  pass an inert `systemNote`/`emitDiagnostic` no-op.
- Codes are string-namespaced: `loom/load/*` (e.g. `loom/load/invalid-encoding`
  `src/lexer/lexer.ts:78`; `loom/load/missing-mode`), `loom/parse/*` (e.g.
  `loom/parse/non-array-iterand` `src/parser/control-flow.ts:60`,
  `loom/parse/warp-top-level-statement`), and binder `loom/load/binder-model-*`
  (`src/binder/binder-model.ts:55-60`).

## 4. `src/mvp/minimal-loom.ts`

- Purpose: the narrowest end-to-end MVP vertical (`buildMinimalLoom`,
  `src/mvp/minimal-loom.ts:99`). Takes one in-memory `.loom` string, parses only
  `mode:` frontmatter + a single untyped `` @`<literal>` `` query, and returns a
  `LoomFixture` whose `run` drives exactly one prompt-mode turn
  (`pi.sendUserMessage` + `ctx.waitForIdle`, `:107-116`).
- It uses its **own** minimal line/regex parser `parseMinimalLoom`
  (`src/mvp/minimal-loom.ts:47`) — **it does NOT go through the real
  lexer/parser/`parseLoomDocument` pipeline**. It throws on any source lacking the
  single `` @`<literal>` `` query (`:79-83`).
- Usable by tests as a simplified fixture-builder, but **not** representative of the
  §1 compile pipeline. For real offline parsing tests, call `parseLoomDocument`
  (§1), not `buildMinimalLoom`. The header comment (`:12-16`) calls the body an inert
  stub, but the implementation is filled in (parses + drives a turn).

## 5. DEFER / TODO / stub / partial markers (grep)

`grep -rn -iE 'DEFER|TODO|FIXME|not.?wired|stub|partial|unimplemented'` over the five
dirs returns **100** hits. They fall into three classes; none is an unfinished
front-end feature:

**(a) Historical tests-first seam headers** (the large majority) — "`V*-T` (tests-task)
declares these seam shapes and stubs … the paired `V*` leaf fills it in." Verified
filled: e.g. `parseLoomDocument` header `src/parser/loom-document.ts:16` vs the real
200-line body at `:563`; `lexLoom` header `src/lexer/lexer.ts:11` vs real body `:92`;
`checkForIterand` header `src/parser/control-flow.ts:49` vs real body `:51`;
`deriveBinderSeed` header `src/binder/binder-seed.ts` vs real FNV body `:43`;
`buildBinderCompleteCall` header `src/binder/binder-inference.ts:20` vs real body
`:132`; `buildMinimalLoom` header `src/mvp/minimal-loom.ts:14` vs real body `:99`.
The `UNIMPLEMENTED` sentinel and `stub/v15f-unimplemented` code are referenced **only
in doc comments** now (`src/binder/system-note.ts:68,96,128,180`;
`src/binder/retry-taxonomy.ts:34`; `src/parser/invoke-diagnostics.ts:30`), not in any
executed body — confirmed by grep: no `UNIMPLEMENTED` in code, no
`throw new Error(...stub/unimplemented...)` anywhere in these dirs.

**(b) Spec-sanctioned static→runtime deferrals** (intentional design boundary, not
missing work) — the static type engine returns `"unknown"` and defers to the runtime
AJV safety net for statically-unresolvable operands. Examples:
`src/parser/type-compat.ts:323,333,382,521`; `src/parser/static-type-inference.ts:24,
85,177`; `src/parser/match-result.ts:175,212`; `src/parser/invoke-diagnostics.ts:200,
203,277`; `src/parser/type-layer-checks.ts:120,601`;
`src/parser/system-interpolation.ts:292`.

**(c) Loom-1.0 language deferrals / behavioural notes** (out-of-scope grammar, not
harness gaps) — deferred hex/octal numeric forms `src/lexer/lexer.ts:594`; partial
defaults not supported `src/parser/literal-sublanguage.ts:18,525`; refuse a
partially-recovered YAML parse `src/parser/frontmatter.ts:678-680`; deferred
package-style import extensions `src/parser/imports.ts:158`; whole-turn (not partial)
session truncation `src/binder/session-context-walk.ts:13,128`.

Full 100-hit listing was produced by the grep command above; classes (a)–(c) cover
every hit. No genuine `not-wired`/`FIXME`/executable-`unimplemented` was found in the
front-end compile pipeline.
