# pi-loom — Implementation Plan

Companion to [`spec.md`](./spec.md).

## Plan structure

Three kinds of phase:

1. **Horizontal phases (H1–H4).** Project scaffold, dependency-injection skeleton, diagnostics primitive, Pi-extension shell.
2. **MVP phase (M).** The smallest end-to-end `.loom` that runs as a Pi slash command — single hard-coded untyped query, prompt mode.
3. **Vertical slices (V1–V18, broken into leaf phases).** Each leaf is the smallest feature that can ship independently *and* be tested independently. Leaves carry IDs like `V4b`. Their grouping (V4) is editorial only — leaves are the unit of work.

Slices are roughly ordered by dependencies; non-linear deps are stated in each leaf's **Deps** field. Reorder freely as long as the deps DAG is respected.

### Per-phase TDD ritual (mandatory)

Every phase, leaf or otherwise, runs the same loop:

1. **Tests first.** Write the failing tests for *every* spec rule the phase introduces. One assertion per rule where practical. A test that would pass when prerequisites are missing is a defect — fix it before writing code.
2. **Implement.** Write the minimum code that turns red tests green. No speculative APIs.
3. **Run.** All tests green; type-check clean; lint clean.
4. **Self-review.** Re-read the spec section, the diff, the test list. Check: any rule unverified? any silent skip? any `catch(...)` that should be a specific type? any global / static / singleton creeping in?
5. **Fix review issues.** Iterate from step 3 until the review is clean.
6. **Phase exit gate.** "Ships when" criterion observable; tag commit `<id>-complete`.

A phase is **not** complete until its exit gate is met. No "we'll fix it next slice" carry-overs.

### Leaf format

Each leaf has the same fields, in the same order:

- **Spec.** Section names from `spec.md`.
- **Adds.** One sentence — what the leaf introduces.
- **Tests.** Bullet list — one bullet per spec rule.
- **Deps.** Other leaf IDs that must be complete first. Listed `-` if none beyond the previous-leaf-in-the-group.
- **Ships when.** A concrete, externally observable change.

### Cross-cutting rules (every phase)

- **No globals, statics, singletons.** All collaborators passed by constructor. Architectural test in H1 enforces.
- **Specific exception types only.** No `catch (e)` / `catch (Error)` without rethrow-on-mismatch. ESLint rule wired in H1.
- **Sequential by default.** No `Promise.all` / `Promise.race` outside slices that have a documented spec reason.
- **No silent test skipping.** `assert.fail` / `panic` when prerequisites are missing — never silent `return` early.
- **Spec drift.** If implementation reveals the spec is wrong, ambiguous, or under-specified, **stop**, fix the spec first in a dedicated commit, then resume.
- **Doc updates.** After each leaf, update `README.md`'s status table and append a one-line dated entry to `CHANGELOG.md`. The plan itself is updated only when the **plan** changes; non-plan discoveries go to `notes.md`.

---

## Horizontal phases

### H1 — Repository scaffold and test framework

**Adds.** TypeScript project (strict mode, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`); Vitest + coverage; ESLint with `@typescript-eslint`, no-floating-promises, no-globals, no-broad-catch; Prettier; npm scripts (`build`, `test`, `test:watch`, `typecheck`, `lint`, `format`); GitHub Actions workflow file.

**Source layout:**
```
src/{parser, ast, lowering, runtime, extension, diagnostics, util}/
test/{unit (mirrors src/), integration, fixtures/{loom, warp, schemas}, fakes/}
```

**Tests.**
- Sentinel test (`1 + 1 === 2`) proving toolchain runs.
- Per-directory presence test (`__present` re-exported by every `src/*/index.ts`).
- `no-static-state.test.ts` greps `src/` for `^let `, `^var `, `^const ` at module top-level (allow only `const` of literals/frozen objects); fails on violation.

**Deps.** None.

**Ships when.** `npm run typecheck && npm run lint && npm test` green; `depcheck` clean.

---

### H2 — Dependency-injection skeleton with fakes

**Adds.** Pure-interface seams for every collaborator the runtime will need: `Clock`, `RandomSource`, `FileSystem`, `DiagnosticsSink`, `ModelClient`, `ConversationDriver`, `ToolHost`, `SchemaValidator`, `LoomLoader`, `ExtensionAPI`. A constructor-injection factory `makeRuntime({ ... })` that wires them. In-memory fakes for every interface in `test/fakes/` — production code never imports a fake.

**Tests.**
- `makeRuntime` returns a runtime whose collaborators are exactly the ones passed in (identity check).
- `FakeModelClient` raises if its response queue is empty (no silent default).
- `FakeFileSystem.readText` for unknown path rejects with a typed error.
- `FakeDiagnosticsSink` preserves report order on drain.
- Every fake has at least one negative-path test.

**Deps.** H1.

**Ships when.** Every interface has a fake, `import` graph forbids fakes leaking into `src/`.

---

### H3 — Diagnostics primitive and multi-error accumulator

**Adds.** `Diagnostic` shape from spec [Diagnostics](./spec.md#diagnostics); `DiagnosticsAccumulator`; serialiser to Pi's flat `{ path, error }` shape; typed code-namespace constants (`loom/parse/*`, `loom/type/*`, `loom/load/*`, `loom/runtime/*`); `MultiErrorReporter` ordering by `(file, line, column)`.

**Tests.**
- Range is 1-indexed, end-exclusive.
- Serialised line shape: `"<file>:<line>:<col>: <code>: <message>"`.
- Hint appended as `"\n  hint: <hint>"`.
- Related sites appended as indented lines.
- Multi-error sort is stable on equal positions.
- Severity round-trips.

**Deps.** H2.

**Ships when.** All later phases emit through `DiagnosticsSink` exclusively (lint rule forbids `throw new Error` for spec-defined diagnostics).

---

### H4 — Pi extension shell

**Adds.** `extensions/index.ts` exporting `default function (pi: ExtensionAPI)`; registers a single no-op `/loom-status` command that prints "pi-loom: no looms loaded yet"; `PiModelClient`, `PiToolHost`, `PiFileSystem`, `PiExtensionAPI` adapter shims (no logic) wrapping Pi's surfaces.

**Tests.**
- Factory invoked with `FakeExtensionAPI` registers exactly one command.
- Each shim has one delegation contract test against its fake.

**Deps.** H2.

**Ships when.** `pi -e C:\UnitySrc\pi-loom` loads the extension and `/loom-status` runs in a real Pi session (manual smoke recorded in `docs/manual-smoke.md`).

---

## MVP phase

### M — Minimal end-to-end loom

**Spec.** [Overview](./spec.md#overview), [Pi Extension Integration](./spec.md#pi-extension-integration), [Conversation drive — prompt mode](./spec.md#pi-integration-contract).

**Adds.** Lexer + parser limited to: frontmatter (`---` block with one line `mode: prompt`); body containing exactly one expression-statement of the form `` @`literal text` `` (no `${...}`, no `?`, no escapes other than `\``). Runtime: walks the body, calls `ConversationDriver.send` once, awaits `agent_end`. Discovery: `~/.pi/agent/looms/` and `.pi/looms/` only.

**Tests.**
- Minimal 4-line loom parses.
- Any unsupported keyword (`let`, `if`, `schema`, ...) → `loom/parse/unsupported-feature`.
- Missing closing backtick → `loom/parse/unterminated-template`.
- Run produces exactly one `send` call with the literal text.
- AbortError surfaces as a system note.
- `~/.pi/agent/looms/hello.loom` registers `/hello`.
- Two files producing the same slash name across the two roots: only the project one registers; warning names both paths.

**Deps.** H1–H4.

**Ships when.** Manual: `hello.loom` placed in `.pi/looms/`, slash `/hello` produces an assistant turn in a real Pi session.

---

## Vertical slices

### V1 — Lexer hardening

#### V1a — Numeric literals

- **Spec.** [Lexical Structure](./spec.md#lexical-structure) (number literals).
- **Adds.** `42`, `3.14`, `1e10`, `1.5e-3`, `0`, `0.5`. `integer` vs. `number` token tag based on presence of fractional/exponent parts.
- **Tests.** Each form tokenises; hex/octal/binary/underscore-separator are parse errors with hints; leading `-` is the unary operator (lexer emits `MINUS NUMBER`, not a signed-literal token).
- **Deps.** M.
- **Ships when.** Numeric literals are accepted in any future expression position; M's body parser still passes its tests.

#### V1b — String literals and escapes

- **Spec.** [Lexical Structure](./spec.md#lexical-structure) (string literals).
- **Adds.** Single- and double-quoted forms; escape set `\"`, `\'`, `\\`, `\n`, `\t`, `\r`, `\u{XXXX}`. Single-line only — literal `\n` inside a regular string is a parse error. No `${...}` interpolation in regular strings.
- **Tests.** Each escape; illegal escape; literal newline in string; `${` inside regular string is plain text; unterminated string error.
- **Deps.** V1a.
- **Ships when.** String tokens flow through to later parser slices.

#### V1c — Line comments (`//` and `///`)

- **Spec.** [Lexical Structure](./spec.md#lexical-structure) (comments).
- **Adds.** `//` regular-comment token (discarded); `///` doc-comment token (preserved with its text). Block comments `/* */` are a parse error.
- **Tests.** Both forms tokenise; block-comment is rejected; `///` text is captured (semantics in V13).
- **Deps.** V1a.
- **Ships when.** Doc-comment tokens reach the AST builder.

#### V1d — Identifier case rule and reserved keywords

- **Spec.** [Lexical Structure](./spec.md#lexical-structure) (identifiers, reserved keywords).
- **Adds.** First-letter-case enforcement (PascalCase vs. lowercase-first / `_`); reserved-keyword recognition for the spec's full list; the reserved discard `_`.
- **Tests.** Lowercase-first identifier accepted in binding position; PascalCase identifier accepted in schema-name position; mismatch produces the spec's exact-wording errors; every reserved keyword in identifier position is rejected; `_` cannot be used as a regular identifier after binding.
- **Deps.** V1a.
- **Ships when.** Case rule and keyword set are uniform across the lexer.

#### V1e — Statement separators and newline continuation

- **Spec.** [Lexical Structure](./spec.md#lexical-structure) (statement terminators), [Grammar disambiguation](./spec.md#grammar-disambiguation) (newline continuation).
- **Adds.** Newline-as-separator; continuation across open `(`/`{`/`[`, trailing binary/unary operator, trailing comma; semicolons rejected.
- **Tests.** Each continuation form; semicolon rejected; bracket-balance error reports the unmatched opener; operator-at-end-of-line and operator-at-start-of-next-line both join.
- **Deps.** V1a–V1d.
- **Ships when.** Multi-line statements parse without explicit terminators.

---

### V2 — Expression sublanguage and bindings

#### V2a — `let` immutable bindings

- **Spec.** [Bindings and Mutability](./spec.md#bindings-and-mutability).
- **Adds.** `let x = expr` with optional `: T` annotation. Reassignment of an immutable binding is a parse error.
- **Tests.** Immutable binding declared and read; reassignment rejected; `let _ = expr` accepted (discard); `let mut _ = ...` rejected.
- **Deps.** V1.
- **Ships when.** Loom bodies can name values.

#### V2b — `let mut` and reassignment statements

- **Spec.** [Bindings and Mutability](./spec.md#bindings-and-mutability).
- **Adds.** `let mut x = ...`; statement forms `=`, `+=`, `-=`, `*=`, `/=`, `%=`. Assignment-as-expression rejected (`if (x = 1)` is a parse error).
- **Tests.** Each compound form; rebind preserves type; field-/index-mutation (`o.f = x`, `a[i] = x`) rejected with the deferred-feature diagnostic; param-binding rejects `mut`.
- **Deps.** V2a.
- **Ships when.** Mutable counters work in straight-line code.

#### V2c — Arithmetic, comparison, logical, ternary, parens

- **Spec.** [Expression Sublanguage](./spec.md#expression-sublanguage), [Operator precedence](./spec.md#operator-precedence).
- **Adds.** `+ - * / %` with `+` overloaded for string concat; `< <= > >= == !=`; `&& ||`; ternary `? :`; parens. Comparison/equality non-associative (`a < b < c` rejected).
- **Tests.** One test per row of the precedence table; non-associativity diagnostic verbatim from spec; mixed-type `+` rejected; division-by-zero produces `Infinity` per JS; ternary type-checks both arms.
- **Deps.** V2a.
- **Ships when.** Arithmetic and boolean expressions evaluate.

#### V2d — Member access and indexed access

- **Spec.** [Expression Sublanguage](./spec.md#expression-sublanguage).
- **Adds.** `a.b` for objects; `a[i]` for arrays and string-keyed objects. `obj.field = ...` and `arr[i] = ...` remain parse errors (V2b).
- **Tests.** Member access on anonymous object literals (V2-internal); index access on arrays; OOB returns runtime panic (V18o-routed); null member access panics.
- **Deps.** V2c.
- **Ships when.** Loom code can read structured values.

#### V2e — Structural `==` deep equality

- **Spec.** [Expression Sublanguage](./spec.md#expression-sublanguage), [Runtime Value Model](./spec.md#runtime-value-model) (equality).
- **Adds.** Deep value equality for arrays and anonymous objects; primitive equality via `Object.is` (NaN==NaN is true; +0 != -0). `===` rejected.
- **Tests.** Nested array/object equality; NaN reflexivity; +0/-0 inequality; `===` rejected with the documented hint.
- **Deps.** V2c.
- **Ships when.** `==` works on all V2-reachable value shapes.

#### V2f — Truthiness rule

- **Spec.** [Expression Sublanguage](./spec.md#expression-sublanguage) (truthiness).
- **Adds.** `if`/`while`/ternary-cond/`&&`/`||` accept only `boolean`. Non-boolean operand is a parse error with the spec's hint (`if (x != "")`, etc.).
- **Tests.** Each position rejects `string`, `number`, `null`; `boolean` accepted; the hint text matches spec.
- **Deps.** V2c (operators).
- **Ships when.** Truthiness rule is enforced uniformly.

#### V2g — String stdlib

- **Spec.** [Expression Sublanguage](./spec.md#expression-sublanguage) (`string` table).
- **Adds.** `length`, `toLowerCase`, `toUpperCase`, `trim`, `startsWith`, `endsWith`, `includes`, `split`, `replace` (all-occurrences, literal-only).
- **Tests.** Each method against JS semantics; `replace` divergence from JS verified (replaces all); `split` literal-only (regex args rejected); unknown method is parse-time error.
- **Deps.** V2d.
- **Ships when.** String operations available in expressions.

#### V2h — Array stdlib and array literals

- **Spec.** [Expression Sublanguage](./spec.md#expression-sublanguage) (`array<T>` table), [Object construction, array construction, and operator rules](./spec.md#object-construction-array-construction-and-operator-rules).
- **Adds.** `[]`, `[a, b, c]`; `length`, `join`, `includes`, `indexOf`, `slice`, `concat`. Common-type rules for literals (sink-driven; `integer`-widens-to-`number`).
- **Tests.** Each method; `join` rejects non-string element type; element-type-mismatch in literal rejected with spec's exact message; sink propagates element type into elements.
- **Deps.** V2c, V2d.
- **Ships when.** Arrays usable end-to-end.

#### V2i — Object stdlib

- **Spec.** [Expression Sublanguage](./spec.md#expression-sublanguage) (`object` table).
- **Adds.** `keys`, `values`, `has` on any object value (anonymous in V2; schema-typed once V4 lands).
- **Tests.** Iteration order matches insertion order for anonymous objects; `has` returns `false` for unknown key (no panic); values-array element type is union of field types.
- **Deps.** V2d.
- **Ships when.** Object reflection methods callable.

---

### V3 — Frontmatter and `params` (excluding binder)

#### V3a — Frontmatter parsing

- **Spec.** [Parameters and Frontmatter](./spec.md#parameters-and-frontmatter).
- **Adds.** Real YAML frontmatter; recognised fields: `description`, `argument-hint`, `mode`, `model`, `tools`, `system`, `binder_model`, `bind_context`, `bind_echo`, `retry`, `params`. Unknown fields produce `loom/load/unknown-frontmatter-field` warning. Loom-specific fields other than `mode` and `description`/`argument-hint`/`params` are recognised but ignored with a "not yet implemented in this leaf" warning until their implementing leaf lands.
- **Tests.** YAML parse errors point at correct column; unknown field warning shape; `mode: subagent` is the documented "not implemented yet" parse error referencing V12a; `params` field type-grammar fragment recognised (primitive types only here; array/named types in V3b).
- **Deps.** V2.
- **Ships when.** Frontmatter parses; later leaves can attach semantics non-breakingly.

#### V3b — `params` typed declaration

- **Spec.** [Parameters and Frontmatter](./spec.md#parameters-and-frontmatter) (params).
- **Adds.** `params:` with primitive types, `array<T>` over primitives, and `T | null`. Named-schema references parse but resolution defers to V4. Defaults defer to V16a.
- **Tests.** Each primitive type binds; `array<string>` binds; `T | null` binds; named-schema reference parses but errors with "schema not yet declarable" until V4b.
- **Deps.** V3a.
- **Ships when.** Loom body can read `${param}` of primitive type (interpolation arrives in V5b).

#### V3c — Bypass binder for single-string param

- **Spec.** [Slash-Command Argument Binding](./spec.md#slash-command-argument-binding) (binder bypass).
- **Adds.** Detect at load time: exactly one `params:` field, type `string`, no default. The runtime sets that param to the trimmed slash text and skips the binder. AJV runs as safety net.
- **Tests.** Bypass detection is purely static (decided at load); slash text trimmed; multiple-params, non-string, or default-having shapes do not bypass; AJV still runs.
- **Deps.** V3b.
- **Ships when.** A single-string-param loom can be invoked with arbitrary slash text without an LLM binder.

---

### V4 — Schemas, AJV pipeline, lowering

#### V4a — AJV pipeline scaffold

- **Spec.** [Lowering Algorithm](./spec.md#lowering-algorithm), [Pi Integration Contract](./spec.md#pi-integration-contract) (AJV configuration).
- **Adds.** AJV v8 wired with `strict: false`, `allErrors: true`, `ajv-formats` registered, in-document `$ref` only. Compiled-schema cache keyed by lowered-schema content hash.
- **Tests.** Cache hit on identical schema; cache miss on changed schema; AJV instance not shared across loom loads (no global state); validation produces expected error shapes.
- **Deps.** H2.
- **Ships when.** Validator service can compile and validate against arbitrary JSON Schema documents.

#### V4b — Object schema declaration and lowering

- **Spec.** [Schema Declarations](./spec.md#schema-declarations) (object form).
- **Adds.** `schema X { f: T, ... }` parsed; lowered to `$defs/X` with `required` listing every field, `additionalProperties: false`, properties in declaration order.
- **Tests.** Trailing comma optional; missing field rejected; `additionalProperties:false` always emitted; snapshot against `test/fixtures/schemas/object-basic.json`.
- **Deps.** V4a.
- **Ships when.** Schemas can be declared and compiled; nothing yet uses them.

#### V4c — Type-alias `schema X = T` for primitive unions

- **Spec.** [Schema Declarations](./spec.md#schema-declarations) (union/alias form).
- **Adds.** `schema X = T | U` lowered as multi-type-array `{type:[a,b]}` when all primitives, `anyOf` otherwise.
- **Tests.** `string | number` → multi-type-array; `string | null` → multi-type-array including `"null"`; `string | Author` → `anyOf`.
- **Deps.** V4b.
- **Ships when.** Primitive aliases compose.

#### V4d — Literal types in schemas

- **Spec.** [Type System](./spec.md#type-system) (literal types).
- **Adds.** `"foo"`, `42`, `true`, `false`, `null` as type expressions; lowered as `{const: value}`.
- **Tests.** Each literal lowers correctly; literal-union `"low" | "medium" | "high"` lowers to `{type:string, enum:[...]}`.
- **Deps.** V4c.
- **Ships when.** Const fields and literal unions work.

#### V4e — `array<T>` lowering

- **Spec.** [Lowering Algorithm](./spec.md#lowering-algorithm).
- **Adds.** `array<T>` → `{type:array, items: <T-lowered>}`.
- **Tests.** Nested `array<array<T>>` lowers; element-type errors propagate.
- **Deps.** V4b.
- **Ships when.** Array-typed fields validate.

#### V4f — Inline anonymous object hoisting

- **Spec.** [Lowering Algorithm](./spec.md#lowering-algorithm) (step 2).
- **Adds.** `{ field: T }` in any type position lifted into `$defs/__inline_<hash>` with stable structural hash; structurally-identical inline schemas dedup to one entry.
- **Tests.** Two identical inline schemas → one `$defs` entry; differing key order produces same hash; differing types produces different hashes.
- **Deps.** V4b.
- **Ships when.** Anonymous object types are usable in any field position.

#### V4g — Schema-subset whitelist enforcement

- **Spec.** [Schema Subset](./spec.md#schema-subset) (rejected keyword list).
- **Adds.** Parse-time rejection of every disallowed keyword: `pattern`, `format`, `minLength`/`maxLength`, `minimum`/`maximum`, `exclusiveMinimum`/`exclusiveMaximum`, `multipleOf`, `minItems`/`maxItems`, `uniqueItems`, `contains`, `patternProperties`, `propertyNames`, `min/maxProperties`, `unevaluatedProperties`, `unevaluatedItems`, `dependentRequired`, `dependentSchemas`, `nullable`, `oneOf`, `allOf`, `not`, `if`/`then`/`else`. (These would only appear if a future feature tried to emit them; the lowering pass asserts none escape.)
- **Tests.** Architectural test: walk a synthesised schema containing each forbidden keyword; lowering pass throws. No surface-syntax accepts these in V4.
- **Deps.** V4b.
- **Ships when.** Any future feature accidentally emitting a disallowed keyword is caught at parse time.

#### V4h — Per-query schema document with `$defs` pruning

- **Spec.** [Lowering Algorithm](./spec.md#lowering-algorithm) (step 4).
- **Adds.** When a typed query fires, runtime extracts the response schema as document root and copies in only transitively reachable `$defs`.
- **Tests.** Unreachable `$defs` are pruned; reachable cycles are preserved; document is self-contained (no dangling `$ref`).
- **Deps.** V4a, V4b.
- **Ships when.** Provider request payloads are minimal.

#### V4i — Recursive schema references

- **Spec.** [Schema Declarations](./spec.md#schema-declarations) (recursion), [Schema Subset](./spec.md#schema-subset) (depth).
- **Adds.** Self-referential `schema Tree { value: number, children: array<Tree> }`; mutual recursion across schemas; runtime depth cap of 5 enforced on document depth, not schema graph.
- **Tests.** Self-recursive schema lowers and AJV-validates a 4-deep tree; rejects 6-deep; mutual recursion `Person ↔ Animal` lowers; cycle in schema graph permitted (depth applies to data).
- **Deps.** V4h.
- **Ships when.** Recursive data validates.

---

### V5 — Untyped queries and prompt-mode driver

#### V5a — Bare `@`literal`` query parsed

- **Spec.** [Query](./spec.md#query) (untyped).
- **Adds.** `` @`text` `` template parser (no `${}`, no escapes beyond `\``). Returns `Result<string, QueryError>` semantically; bound-to-name only for now.
- **Tests.** Template parses; closing-backtick missing → `unterminated-template`; bare expression-statement deferred to V5f.
- **Deps.** M, V2.
- **Ships when.** A loom can issue a non-trivial bound query.

#### V5b — `${expr}` interpolation

- **Spec.** [Template Interpolation](./spec.md#template-interpolation).
- **Adds.** `${...}` containing any V2-grammar expression. Nested template `@`...`` and `match` inside `${...}` rejected.
- **Tests.** `${param}` resolves; `${a + b}` evaluates; `${@\`nested\`}` rejected; `${match ...}` rejected; `${` inside regular string is plain text (already in V1b).
- **Deps.** V5a, V2c.
- **Ships when.** Templates can reference local values.

#### V5c — Multi-line templates: newline-trim and dedent

- **Spec.** [Query](./spec.md#query) (multi-line templates).
- **Adds.** Strip newline immediately after opening backtick; strip newline immediately before closing backtick; dedent common leading whitespace per Python `textwrap.dedent`.
- **Tests.** Each rule against the spec's worked example; single-line templates unaffected; tab/space mixing handled per textwrap rules.
- **Deps.** V5a.
- **Ships when.** Multi-line prompts render cleanly.

#### V5d — Full template escape set

- **Spec.** [Query](./spec.md#query) (escapes).
- **Adds.** `` \` ``, `\$`, `\\`, `\n`, `\t`, `\r` inside templates. Other `\X` is parse error.
- **Tests.** Each escape; `\$` suppresses interpolation when followed by `{`; `\X` rejected.
- **Deps.** V5a.
- **Ships when.** Templates handle special characters correctly.

#### V5e — Prompt-mode conversation driver

- **Spec.** [Pi Integration Contract](./spec.md#pi-integration-contract) (prompt-mode drive).
- **Adds.** `PromptModeConversationDriver` issues `ctx.sendUserMessage(text)` (or `{ deliverAs: "steer" }` mid-stream), awaits via `agent_end` listener, returns assistant text. Replaces M's hard-coded driver.
- **Tests.** Single turn round-trips; mid-stream send uses steer mode; `agent_end` listener cleaned up after each query (no leak); transport failure → `Err({kind:"transport"})`.
- **Deps.** V5a, M.
- **Ships when.** A real Pi session can run a multi-query loom (without `?` yet — bind every result).

#### V5f — Bare expression-statement query is parse error

- **Spec.** [Query](./spec.md#query) (discarded results).
- **Adds.** A bare `@`...`` at statement position is parse error with the documented diagnostic. Author must write `?`, `let _ =`, or `let x =`.
- **Tests.** Bare `@` rejected; `let _ = @` accepted; tail-expression `@` in a `void` function NOT rejected (the discard is on the function, not the statement).
- **Deps.** V5a.
- **Ships when.** Discarded queries can't sneak into code silently.

#### V5g — `QueryError` union — initial variants

- **Spec.** [Query](./spec.md#query) (failure modes).
- **Adds.** Discriminated union with `transport`, `context_overflow`, `cancelled` variants only. (`validation` lands V6i; `tool_call` V14f-i; `tool_failure` V14; `invoke_failure`/`invoke_callee_error` V15l-m.) Schema declared once at runtime level so later leaves extend non-breakingly.
- **Tests.** Each variant constructible; `match`-on-`kind` works (semantically; full match grammar in V7); `raw_response` field present only on relevant variants.
- **Deps.** V5e.
- **Ships when.** Errors flow through the spec's surface even though `?` doesn't exist yet.

---

### V6 — Typed queries, `Result`, `?`, schema inference

#### V6a — `Ok` / `Err` constructors and `Result<T, E>` type

- **Spec.** [Errors and Results](./spec.md#errors-and-results) (`Result` as user-visible type), [Runtime Value Model](./spec.md#runtime-value-model) (`Result` representation).
- **Adds.** `Ok(value)` and `Err(error)` as expressions; `Result<T, E>` as a type expression; runtime tagged-object representation `{ok: true, value} | {ok: false, error}`.
- **Tests.** Construction and equality (`Ok(1) == Ok(1)`); type checker rejects `Ok` as a value passed where a non-Result type is expected.
- **Deps.** V5g.
- **Ships when.** Loom code can construct and compare Result values.

#### V6b — `?` operator desugaring

- **Spec.** [Errors and Results](./spec.md#errors-and-results) (`?` operator).
- **Adds.** `expr?` desugars to `match expr { Ok(v) => v, Err(e) => return Err(e) }`. Enclosing function/loom must therefore return `Result<_, QueryError>` (or have it inferred).
- **Tests.** `?` on `Ok` unwraps; `?` on `Err` early-returns at the matching enclosing scope; `?` in a non-Result function is a parse error with the spec's hint.
- **Deps.** V6a.
- **Ships when.** Looms can use `?` to propagate failures.

#### V6c — Schema inference: binding-annotation sink

- **Spec.** [Query](./spec.md#query) (typed form, inference rule 1).
- **Adds.** `let x: T = @\`...\`?` infers `T` as the response schema for the query.
- **Tests.** Spec's worked example; nested annotation flows through parens; missing annotation falls through to next rule (later leaves).
- **Deps.** V4, V6b.
- **Ships when.** The most common typed-query pattern works.

#### V6d — Schema inference: enclosing return-type sink

- **Spec.** [Query](./spec.md#query) (inference rule 2).
- **Adds.** When a query is in tail-expression position of a function/loom whose return type is declared, that type supplies the schema.
- **Tests.** Function with declared `Result<T, QueryError>` return; query in tail position infers `T`; `return @\`...\`?` infers from declared return type.
- **Deps.** V6c, V9 (functions). *(Order: this leaf depends on V9a–V9e; reorder as needed.)*
- **Ships when.** Functions can be written without redundant annotations.

#### V6e — Schema inference: enclosing call-site parameter-type sink

- **Spec.** [Query](./spec.md#query) (inference rule 3).
- **Adds.** `f(@\`...\`?)` where `f`'s parameter is typed `T` infers `T`. Crosses a single call boundary; outer call's parameter is opaque past inner call's argument.
- **Tests.** Spec's `f(g(@\`...\`?))` example: `g`'s param is the sink, `f`'s isn't; tool-call argument as sink works the same way.
- **Deps.** V6c, V9.
- **Ships when.** Pipeline-style code reads cleanly.

#### V6f — Schema inference: array-literal sink propagation

- **Spec.** [Query](./spec.md#query) (worked example: array literal).
- **Adds.** `let xs: array<T> = [@\`...\`?, @\`...\`?]` propagates `T` to each element's query.
- **Tests.** Spec's example; mixed-type elements without sink → parse error.
- **Deps.** V6c, V2h.
- **Ships when.** Arrays of typed query results work.

#### V6g — Schema inference: stop-set rule

- **Spec.** [Query](./spec.md#query) (inference algorithm — opaque list).
- **Adds.** Walk stops at: binary/unary operators, member access, indexed access, `match` scrutinee, `if`/`while` condition. Inside these, only explicit `@<T>`...`` ascription supplies a schema.
- **Tests.** `let x = @\`...\`? + 1` is a type error (query untyped, returns `string`, `+ 1` mismatch); `match @\`...\` { ... }` is a type error without explicit ascription; each opaque position tested.
- **Deps.** V6c–V6f.
- **Ships when.** The walk's boundaries are predictable.

#### V6h — Explicit `@<Schema>`...`` ascription

- **Spec.** [Query](./spec.md#query) (explicit form).
- **Adds.** `@<T>`...`` syntax overrides inference; required in any position with no usable sink.
- **Tests.** Wins over inference (with parse warning if it disagrees with binding annotation); allowed in `match` scrutinee; parsed correctly when `T` is a generic like `array<Score>`.
- **Deps.** V6g.
- **Ships when.** Untypeable positions become typeable.

#### V6i — AJV validation of typed query results

- **Spec.** [Query](./spec.md#query) (typed form, `validation_errors`), [Errors and Results](./spec.md#errors-and-results).
- **Adds.** Inferred or explicit schema lowered + handed to provider; response AJV-validated; failure → `Err(QueryError {kind:"validation", ...})`. No coercion follow-ups yet (V13k–m).
- **Tests.** Valid response unwraps; invalid response yields `validation` error with `attempts: 0`, populated `validation_errors`, and `raw_response` set; AJV error path matches JSON-Pointer format.
- **Deps.** V6c, V4.
- **Ships when.** Typed queries return typed values.

#### V6j — `ValidationFailure` schema

- **Spec.** [Query](./spec.md#query) (`ValidationFailure` shape).
- **Adds.** Loom-shaped `ValidationFailure { path, message, schema_keyword }` interposed between AJV and `validation_errors` so AJV swap is non-breaking.
- **Tests.** Each AJV error keyword (`type`, `required`, `enum`, `const`) maps to the right `schema_keyword`; path is JSON-Pointer.
- **Deps.** V6i.
- **Ships when.** Loom code never touches raw AJV objects.

---

### V7 — `match` and pattern grammar

#### V7a — `match` expression structure

- **Spec.** [Errors and Results](./spec.md#errors-and-results) (`match` expression, arm syntax).
- **Adds.** `match scrutinee { pat => expr, ... }` as an expression; comma-separated arms; trailing comma optional; arms must produce common-type values.
- **Tests.** Match returns last-matched arm's value; arm-type mismatch parse error; arm body is a single expression (use `{...}` block for multi-statement).
- **Deps.** V2.
- **Ships when.** `match` parses and runs against simple scrutinees.

#### V7b — Wildcard pattern `_`

- **Adds.** `_` matches anything, binds nothing.
- **Tests.** Always matches; cannot reference `_` after binding.
- **Deps.** V7a.
- **Ships when.** Catch-all arms work.

#### V7c — Identifier pattern (binding)

- **Adds.** Lowercase identifier matches anything and binds to scrutinee.
- **Tests.** Bound name in scope inside arm body; case rule from V1d enforced.
- **Deps.** V7a, V1d.
- **Ships when.** Binding patterns work.

#### V7d — Literal pattern

- **Adds.** `"text"`, `42`, `true`, `false`, `null` patterns match by structural equality.
- **Tests.** Each literal kind; equality semantics match V2e.
- **Deps.** V7a.
- **Ships when.** Tag-based dispatch on literals works.

#### V7e — Constructor pattern (`Ok`, `Err`)

- **Adds.** `Ok(p)` matches `Result.Ok` and recurses into `p`; same for `Err(p)`.
- **Tests.** Spec's `match @\`...\` { Ok(s) => ..., Err(e) => ... }` example; nested constructor `Ok(Ok(x))`.
- **Deps.** V7a, V6a.
- **Ships when.** Result destructuring works.

#### V7f — Object/schema pattern with field shorthand

- **Adds.** `Schema { field: pat, ... }` matches by field-name; shorthand `{ field }` ≡ `{ field: field }`; unlisted fields ignored.
- **Tests.** Spec's `QueryError { kind: "validation", attempts }` example; missing field on scrutinee is no-match (returns to next arm); rest pattern `...other` rejected (deferred).
- **Deps.** V7a.
- **Ships when.** Schema-shaped destructuring works.

#### V7g — Array pattern (fixed length)

- **Adds.** `[a, b, c]` matches arrays of exact length; each element pattern recurses.
- **Tests.** Length mismatch is no-match; element patterns can be any V7 form; rest pattern `[first, ...rest]` rejected.
- **Deps.** V7a.
- **Ships when.** Array destructuring works.

#### V7h — Case disambiguation in patterns

- **Spec.** [Errors and Results](./spec.md#errors-and-results) (pattern disambiguation).
- **Adds.** Lowercase identifiers bind; PascalCase identifiers refer to existing schema/enum/constructor in scope.
- **Tests.** `match x { Foo => ... }` where `Foo` not in scope is parse error; `match x { foo => ... }` always binds.
- **Deps.** V7c, V7e.
- **Ships when.** Case rule disambiguates patterns universally.

#### V7i — `MatchError` runtime panic

- **Spec.** [Errors and Results](./spec.md#errors-and-results) (panic sources).
- **Adds.** Non-exhaustive `match` (no arm matched at runtime) panics with `MatchError`; exhaustiveness not statically checked in V1.
- **Tests.** Match with no `_` arm and no matching value panics; routing handled in V18q.
- **Deps.** V7a.
- **Ships when.** Non-exhaustive match doesn't silently return undefined.

#### V7j — Reject guards and rest patterns with deferred-feature diagnostic

- **Adds.** `Ok(x) if guard => ...` is a parse error; `[first, ...rest]` and `{kind, ...other}` are parse errors; messages reference the spec's deferred-feature note.
- **Tests.** Each rejected form produces the documented diagnostic.
- **Deps.** V7a.
- **Ships when.** No accidental V2 acceptance of unsupported pattern forms.

---

### V8 — Control flow

#### V8a — `if` / `else` statement form

- **Spec.** [Control Flow](./spec.md#control-flow) (`if`/`else`).
- **Adds.** Statement-form `if cond { ... } else { ... }`. Mandatory braced bodies. Single-line `if (x) stmt` is a parse error.
- **Tests.** `else if` chains; missing braces rejected; truthiness rule from V2f enforced.
- **Deps.** V2.
- **Ships when.** Branching works.

#### V8b — `for` ... `in` over arrays

- **Spec.** [Control Flow](./spec.md#control-flow) (`for`).
- **Adds.** `for x in xs { ... }` over `array<T>`; `x` is a fresh immutable binding per iteration. Iterating non-arrays is a parse error with the spec's hint.
- **Tests.** Iteration over `array<T>`; non-array iterand error mentions `obj.keys()` and `s.split(...)`; mutating `x` is a parse error.
- **Deps.** V8a, V2h.
- **Ships when.** Loops work over arrays.

#### V8c — `while` loop

- **Spec.** [Control Flow](./spec.md#control-flow) (`while`).
- **Adds.** `while cond { ... }`; truthiness rule applies.
- **Tests.** Loop terminates; condition re-evaluated each iteration; non-boolean condition rejected.
- **Deps.** V8a.
- **Ships when.** Conditional loops work.

#### V8d — `break` statement

- **Spec.** [Control Flow](./spec.md#control-flow) (`break`/`continue`).
- **Adds.** Bare `break` exits innermost enclosing loop. Outside any loop is a parse error.
- **Tests.** Exits innermost; nested-loop semantics; outside-loop rejected; value-carrying `break expr` is a deferred-feature parse error.
- **Deps.** V8b, V8c.
- **Ships when.** Early-exit from loops works.

#### V8e — `continue` statement

- **Adds.** Bare `continue` skips to next iteration. Outside any loop is a parse error.
- **Tests.** Skip current iteration; outside-loop rejected.
- **Deps.** V8b, V8c.
- **Ships when.** Loop skipping works.

#### V8f — `return` statement

- **Spec.** [Return Statement](./spec.md#return-statement).
- **Adds.** `return expr` exits enclosing function/loom; bare `return` legal only in `void` function. Code after `return` produces unreachable-code warning.
- **Tests.** Return value type-checks against declared return type; bare `return` in non-void is parse error; unreachable-code warning emitted exactly once per dead block.
- **Deps.** V8a.
- **Ships when.** Returns work uniformly.

---

### V9 — Function definitions

#### V9a — Top-level `fn` declaration

- **Spec.** [Function Definitions](./spec.md#function-definitions).
- **Adds.** `fn name(p: T, ...): R { body }`; nested `fn` is a parse error.
- **Tests.** Parse and call; nested `fn` rejected; closure / first-class function value rejected.
- **Deps.** V2.
- **Ships when.** Functions can be declared and called.

#### V9b — Hoisting and mutual recursion

- **Adds.** `fn` declarations hoisted within file; mutual recursion permitted.
- **Tests.** Forward call resolves; mutual `fn a(){b()}; fn b(){a()}` parses; recursion terminates via control flow.
- **Deps.** V9a.
- **Ships when.** Function order in file is irrelevant.

#### V9c — Tail-expression return

- **Adds.** Function value is the value of its tail expression (no `return` needed).
- **Tests.** Tail-expression matches declared return type; mismatched tail-expression type is parse error.
- **Deps.** V9a.
- **Ships when.** Rust-style returns work.

#### V9d — `?` requires `Result<_, QueryError>` return type

- **Spec.** [Function Definitions](./spec.md#function-definitions).
- **Adds.** Body containing `?` infers `Result<_, QueryError>` return type unless explicitly declared otherwise (and conflicting declaration is parse error).
- **Tests.** Inferred return type is `Result<T, QueryError>`; explicit non-Result return type with `?` in body is parse error with spec's hint.
- **Deps.** V9a, V6b.
- **Ships when.** `?` propagation through functions works.

#### V9e — `void` return type

- **Adds.** `void` declared explicitly; tail-expression value discarded silently; bare `return` legal only here.
- **Tests.** `void` discards; bare `return` accepted; tail-expression evaluated for side effects but not returned.
- **Deps.** V9a, V8f.
- **Ships when.** Side-effect-only functions parse.

#### V9f — Identifier resolution order

- **Spec.** [Expression Sublanguage](./spec.md#expression-sublanguage) (identifier resolution).
- **Adds.** Resolution order: (1) local binding/param, (2) top-level `fn` in same file, (3) imported symbol (V17), (4) `tools:` entry (V14). Collisions across (2)–(4) are load errors. Local shadows everything else.
- **Tests.** Each ordering rule; collision diagnostics name both sites; local shadowing works lexically.
- **Deps.** V9a.
- **Ships when.** Naming rules are uniform.

---

### V10 — Enums and literal-union types

#### V10a — `enum X { ... }` declaration

- **Spec.** [Schema Declarations](./spec.md#schema-declarations) (enum subsection).
- **Adds.** `enum X { Variant, Variant, ... }`; PascalCase variant rule; trailing comma optional. Default wire value = variant name verbatim.
- **Tests.** Variant case rule enforced; lowering produces `{type:string, enum:[...]}`; payload-carrying variants rejected (use `schema X = A | B`).
- **Deps.** V4.
- **Ships when.** Enums declarable and usable as types.

#### V10b — Explicit variant values

- **Adds.** `Low = "low"`. RHS must be string literal in V1.
- **Tests.** Explicit value used in lowering; numeric/boolean RHS rejected; duplicate explicit values in same enum is parse error.
- **Deps.** V10a.
- **Ships when.** Wire-shaped enums work.

#### V10c — `Enum.Variant` access expression

- **Adds.** `Severity.High` evaluates to wire value, statically typed as `Severity`. Unknown variant is parse error.
- **Tests.** Type is `Severity` not `string`; `Severity.Critical` (no such variant) is parse error.
- **Deps.** V10a.
- **Ships when.** Enum values referenceable in code.

#### V10d — Literal-union types

- **Spec.** [Type System](./spec.md#type-system) (literal types in unions).
- **Adds.** `severity: "low" | "medium" | "high"` as inline type. Lowers identical to enum.
- **Tests.** Lowering matches enum form; literal-union accepted in any type position.
- **Deps.** V4d.
- **Ships when.** Inline enums work without top-level declaration.

#### V10e — Runtime enum brand

- **Spec.** [Runtime Value Model](./spec.md#runtime-value-model) (enum representation).
- **Adds.** Enum variant runtime value is a `string` with non-enumerable `__loomEnum: "<EnumName>"` brand.
- **Tests.** Cross-enum equality `A.High == B.High` is `false` even when wire values match; brand survives `JSON.stringify` removal correctly (i.e., not present in JSON).
- **Deps.** V10c.
- **Ships when.** Enum equality is type-safe.

#### V10f — Enum doc comments

- **Adds.** `///` above enum declaration → schema description; `///` above variant → per-variant `description` (within `oneOf`-of-consts form when needed). Full description support land in V13f–i; this leaf only covers enums.
- **Tests.** Description appears in lowered schema; multi-line `///` joins.
- **Deps.** V10a, V1c.
- **Ships when.** Enums carry descriptions to providers.

---

### V11 — Discriminated unions and recursion

#### V11a — Implicit discriminator detection

- **Spec.** [Schema Declarations](./spec.md#schema-declarations) (discriminated unions).
- **Adds.** `schema X = A | B | C` where each variant has exactly one shared single-literal field with unique values per variant: detected as discriminator.
- **Tests.** Detection works on representative examples; lowering is plain `anyOf` (no discriminator keyword emitted).
- **Deps.** V4b, V4c.
- **Ships when.** Standard discriminated unions work.

#### V11b — Ambiguous-candidate diagnostic

- **Adds.** Multiple qualifying fields → parse error naming all candidates with hint to use `by`.
- **Tests.** Two-candidate case; three-candidate case; message text matches spec verbatim.
- **Deps.** V11a.
- **Ships when.** Author has clear path to disambiguate.

#### V11c — Missing-discriminator diagnostic

- **Adds.** No qualifying field → parse error with hint to add `kind` field or use `by`.
- **Tests.** Three different no-candidate shapes; message text matches spec verbatim.
- **Deps.** V11a.
- **Ships when.** Discriminator-less unions are caught early.

#### V11d — Explicit `by <field>` form

- **Adds.** `schema X by kind = A | B`. Resolves to loom-side identifier; lowering uses each variant's wire name.
- **Tests.** Explicit form overrides detection; loom-side name accepted; wire name forbidden in `by` clause.
- **Deps.** V11a.
- **Ships when.** Author can override detection.

#### V11e — Discriminator must be top-level

- **Adds.** Nested discriminator like `kind: { type: "x" }` → parse error.
- **Tests.** Nested case rejected with diagnostic.
- **Deps.** V11a.
- **Ships when.** Nested discriminators can't sneak in.

#### V11f — Mixed unions

- **Adds.** `string | Author`, `Author | null` lower as plain `anyOf` (multi-type-array form preferred when all primitives).
- **Tests.** `Author | null` lowers correctly; `string | Author` produces `anyOf`.
- **Deps.** V11a, V4c.
- **Ships when.** Non-discriminated unions still work.

#### V11g — Self-recursive object schemas

- **Adds.** `schema Tree { value, children: array<Tree> }` lowers via `$defs`/`$ref`.
- **Tests.** Recursion lowered transparently; AJV validates 4-deep tree.
- **Deps.** V4i. *(V4i is the AJV side; this is the surface.)*
- **Ships when.** Authors don't write `$ref`/`$defs` manually.

#### V11h — Mutual recursion across schemas

- **Adds.** `Person ↔ Animal` mutual references resolve.
- **Tests.** Both schemas lower; AJV validates representative document.
- **Deps.** V11g.
- **Ships when.** Mutual recursion is transparent.

#### V11i — Runtime depth cap of 5

- **Spec.** [Schema Subset](./spec.md#schema-subset) (depth).
- **Adds.** AJV-time check on JSON document depth ≤ 5; deeper data is `validation` error with clear path.
- **Tests.** Depth-5 accepted; depth-6 rejected; cap applies to data not schema graph.
- **Deps.** V11g.
- **Ships when.** Depth cap is enforced uniformly.

---

### V12 — Subagent mode

#### V12a — `mode: subagent` accepted; AgentSession spawn

- **Spec.** [Conversation drive — subagent mode](./spec.md#pi-integration-contract).
- **Adds.** Frontmatter `mode: subagent` accepted; runtime spawns in-process `AgentSession` (against `FakeAgentSession` in tests) with in-memory session manager. Replaces V3a's "not implemented yet" stub.
- **Tests.** Spawn happens at loom invocation, not at load; transcript not retained on `FakeFileSystem`; session disposed on return.
- **Deps.** V3a, V5e.
- **Ships when.** Subagent looms run.

#### V12b — `system:` field declaration

- **Adds.** `system:` accepted only on `mode: subagent`; on prompt-mode is parse error.
- **Tests.** Subagent + system: parses; prompt + system: rejected with documented hint.
- **Deps.** V12a.
- **Ships when.** System prompts can be authored.

#### V12c — `${param}` and `${param.field}` in `system:`

- **Adds.** Bare-identifier-path interpolation in `system:` field. Full expression sublanguage rejected.
- **Tests.** `${param}` resolves; `${a.b.c}` resolves; `${a + b}` rejected; `${a.b()}` rejected (call rejected); rejection message references the deferred future-consideration.
- **Deps.** V12b.
- **Ships when.** System prompts can use params.

#### V12d — Subagent transcript discard

- **Adds.** Spawned conversation's transcript stays private; not surfaced to parent or persisted by runtime.
- **Tests.** Parent never sees subagent's intermediate turns; assertions on parent's conversation log show only invoke return.
- **Deps.** V12a.
- **Ships when.** Subagent isolation is verified.

#### V12e — Subagent return value propagation

- **Adds.** Loom's tail expression is the return value reaching parent; parent sees `Result<T, QueryError>` shape.
- **Tests.** Tail-expression value reaches parent; `Err` from subagent surfaces to parent.
- **Deps.** V12a, V6.
- **Ships when.** Subagent invocation is value-passing.

#### V12f — `bind_context: session` on subagent → parse warning

- **Adds.** Frontmatter validation warning (not error) — subagent has no caller-session context.
- **Tests.** Warning emitted; loom still loads.
- **Deps.** V12a.
- **Ships when.** Misconfiguration is caught early.

---

### V13 — Wire names, descriptions, retry/coercion

#### V13a — `as "WireName"` rename clause parsing

- **Spec.** [Schema Declarations](./spec.md#schema-declarations) (wire-name renaming).
- **Adds.** Field declaration `name as "WireName": T` parsed; wire name is non-empty string literal; redundant rename (`x as "x": T`) is warning not error.
- **Tests.** Each rule from spec; two fields with same wire name in same schema rejected; wire name colliding with another loom name in same schema rejected.
- **Deps.** V4b.
- **Ships when.** Renames parsable.

#### V13b — Inbound wire-name translation

- **Spec.** [Runtime Value Model](./spec.md#runtime-value-model) (wire-name translation).
- **Adds.** After AJV validation against lowered schema, runtime walks JSON and rebuilds value with loom-side identifiers using each schema's translation map.
- **Tests.** Model output `{"FirstName":"x"}` becomes loom value `{first_name:"x"}`; recursive structures translated; arrays of renamed objects translated.
- **Deps.** V13a.
- **Ships when.** Wire-side JSON becomes loom-side values.

#### V13c — Outbound wire-name translation

- **Adds.** When constructing tool input, query response payloads, or `invoke` arguments, runtime walks loom-side value and produces wire-named JSON before AJV validation.
- **Tests.** Round-trip: loom value → wire JSON → loom value yields original; lowered JSON Schema sees only wire names.
- **Deps.** V13a.
- **Ships when.** Loom values reach providers in correct shape.

#### V13d — Discriminator detection on wire names

- **Adds.** When wire-renamed fields are involved, discriminator detection runs on lowered (wire) names; explicit `by` clause accepts loom-side name.
- **Tests.** Renamed discriminator field detected correctly; `by` clause resolves loom-side to wire-side at lowering.
- **Deps.** V13a, V11a.
- **Ships when.** Wire-renamed unions work.

#### V13e — `///` doc comments on schema declarations and fields

- **Spec.** [Descriptions](./spec.md#descriptions).
- **Adds.** `///` above schema → `description` on schema; above field → `description` on property. Multi-line `///` joins; common-leading-whitespace strip.
- **Tests.** Single-line and multi-line; whitespace strip; empty `///` line becomes blank line; placement on same line as field is parse error.
- **Deps.** V1c, V4b.
- **Ships when.** Schema descriptions reach providers.

#### V13f — `retry:` frontmatter parsing

- **Spec.** [Parameters and Frontmatter](./spec.md#parameters-and-frontmatter) (`retry:`).
- **Adds.** `retry: { attempts: N, methodology: <enum> }`. Defaults: 3, `validator_error`. Methodologies: `validator_error`, `schema_repeat`, `none`.
- **Tests.** Each methodology accepted; out-of-range `attempts` rejected; unknown methodology rejected.
- **Deps.** V3a.
- **Ships when.** Retry config parses.

#### V13g — Coercion methodology: `validator_error`

- **Spec.** [Query](./spec.md#query) (coercion).
- **Adds.** On AJV failure, append a follow-up turn quoting the AJV error; await response; re-validate. Bounded by `retry.attempts`.
- **Tests.** Successful coercion at attempt 1, 2, 3; attempts exhausted → `Err({kind:"validation", attempts: N})`; conversation history preserves both malformed response and follow-up.
- **Deps.** V13f, V6i.
- **Ships when.** Default-mode coercion works.

#### V13h — Coercion methodology: `schema_repeat`

- **Adds.** Follow-up turn re-states the schema instead of error.
- **Tests.** Follow-up turn text matches spec; same termination/attempt-counting rules apply.
- **Deps.** V13g.
- **Ships when.** Alternative methodology selectable.

#### V13i — Coercion methodology: `none`

- **Adds.** First failure returned immediately as `Err`. Equivalent to `attempts: 0`.
- **Tests.** No follow-up turns sent; conversation history unchanged after the failed assistant turn.
- **Deps.** V13f.
- **Ships when.** Hot-path looms can fast-fail.

#### V13j — Coercion preserves tool-call side effects

- **Adds.** Coercion appends a *new* user turn rather than re-issuing the original (per spec's tool-side-effect concern).
- **Tests.** Conversation transcript shows malformed response + follow-up (not a re-run of the original user turn).
- **Deps.** V13g.
- **Ships when.** Side-effect safety holds.

---

### V14 — Tool calls and discovery

#### V14a — `tools:` parsing (Pi tool names, comma form)

- **Spec.** [Parameters and Frontmatter](./spec.md#parameters-and-frontmatter) (`tools:`).
- **Adds.** `tools: read, grep, bash` short form; resolution against Pi tool registry at load time.
- **Tests.** Each known tool resolves; unknown tool name → `loom/load/unknown-tool` error.
- **Deps.** V3a.
- **Ships when.** Pi tools listable in frontmatter.

#### V14b — `tools:` YAML list form with `as` rename

- **Adds.** YAML list form; `tool as alias` renames; alias must be lowercase-first identifier-shaped; collision with another entry's final name is load error.
- **Tests.** List form parses; rename works; PascalCase alias rejected; collision diagnostics name both entries.
- **Deps.** V14a.
- **Ships when.** Renaming works.

#### V14c — Bare `<name>(args)` call from loom code

- **Spec.** [Tool Calls](./spec.md#tool-calls).
- **Adds.** Resolves post-rename name against `tools:` table. Pi tool's `execute()` invoked directly with `toolCallId` prefixed `loom-direct:`.
- **Tests.** Call returns `Result<string, QueryError>`; arguments lowered to JSON with wire names; AJV validates against Pi tool's input schema.
- **Deps.** V14a, V13c (outbound translation).
- **Ships when.** Loom code can call Pi tools.

#### V14d — Tool calls do not add a turn to conversation

- **Adds.** Code-side tool call bypasses model entirely; transcript unchanged.
- **Tests.** Conversation transcript before and after `<name>()` call is identical (modulo any other queries).
- **Deps.** V14c.
- **Ships when.** Behavioural distinction from queries verified.

#### V14e — Pi tool wired into `@` queries as model-callable

- **Adds.** Same `tools:` set presented to model during query tool-call loop.
- **Tests.** Model issuing tool-use against a registered tool runs correctly; tool absent from `tools:` is unavailable to model.
- **Deps.** V14a, V5e.
- **Ships when.** Same set serves both code and model.

#### V14f — `ToolCallError` variant: `validation` cause

- **Adds.** Code-side call with bad arguments → `Err(ToolCallError{cause:"validation"})`.
- **Tests.** Bad args rejected before tool runs; `validation_errors` populated.
- **Deps.** V14c.
- **Ships when.** Bad-args case has clean error.

#### V14g — `ToolCallError` variant: `execution` cause

- **Adds.** Tool's `execute()` throws or returns `isError:true` → `Err(ToolCallError{cause:"execution"})`.
- **Tests.** Both shapes; message preserved.
- **Deps.** V14c.
- **Ships when.** Tool-execution failures surface uniformly.

#### V14h — `ToolCallError` variant: `cancelled` cause

- **Adds.** AbortSignal mid-call → `Err(ToolCallError{cause:"cancelled"})`.
- **Tests.** Pre-flight abort and mid-flight abort both surface.
- **Deps.** V14c.
- **Ships when.** Cancellation through tool calls works.

#### V14i — `ToolCallError` variant: `unknown_tool` cause

- **Adds.** Safety net for tools unregistered between parse and runtime (should not occur after a clean parse; production rarely hits this).
- **Tests.** Synthetic unregister between parse and runtime triggers the variant.
- **Deps.** V14c.
- **Ships when.** Safety net verified.

#### V14j — `tools: []` ≡ absent `tools:`

- **Adds.** Both produce empty callable set; ambient Pi tools NOT inherited.
- **Tests.** Both shapes; model has no tools available; loom code has no `<name>(...)` callables.
- **Deps.** V14a.
- **Ships when.** Tool-inheritance footgun closed.

#### V14k — Discovery: global `~/.pi/agent/looms/`

- **Spec.** [Directory Convention](./spec.md#directory-convention).
- **Adds.** Already in M; this leaf hardens with manifest of every spec rule (non-recursive, `*.loom` only, `.warp` excluded).
- **Tests.** Recursive subdirs not discovered; non-`.loom` ignored; `.warp` not registered as command.
- **Deps.** M.
- **Ships when.** Global discovery rule-complete.

#### V14l — Discovery: project `.pi/looms/`

- **Adds.** Already in M; harden as V14k.
- **Tests.** As V14k for project root.
- **Deps.** M.
- **Ships when.** Project discovery rule-complete.

#### V14m — Discovery: package `looms/` and `pi.looms`

- **Adds.** Walk `node_modules/*/package.json` for `pi.looms` entries; also discover `looms/` directories shipped by packages.
- **Tests.** `pi.looms` array honoured; `looms/` directory honoured; both can coexist; precedence per spec.
- **Deps.** V14k.
- **Ships when.** Package-shipped looms discoverable.

#### V14n — Discovery: settings `looms` array

- **Adds.** `~/.pi/agent/settings.json` and `.pi/settings.json` `looms` array (files or directories).
- **Tests.** File entry registers one loom; directory entry registers all `*.loom` in directory; project settings override global.
- **Deps.** V14k.
- **Ships when.** Settings-driven discovery works.

#### V14o — Discovery: `--loom` CLI flag

- **Adds.** Repeatable `--loom <path>`; takes priority over all other sources.
- **Tests.** Single flag; multiple flags; CLI overrides settings.
- **Deps.** V14k.
- **Ships when.** CLI override works.

#### V14p — Source priority and shadowing warning

- **Adds.** Five-level priority from spec; cross-source name collision: higher priority wins, warning names both paths.
- **Tests.** Each adjacent priority pair tested; warning text matches spec.
- **Deps.** V14k–V14o.
- **Ships when.** Priority rule is uniform.

#### V14q — Cross-format slash collision

- **Adds.** `code-review.loom` + `code-review.md` (Pi prompt or subagent) → load-time error; neither registers; symmetric across `.loom`, `.md` prompt, `.md` subagent.
- **Tests.** All three pairings tested; error names both files.
- **Deps.** V14k.
- **Ships when.** Cross-format collisions caught.

---

### V15 — `invoke`, registered loom callees, cross-mode

#### V15a — `invoke("./path.loom", ...)` parsing and resolution

- **Spec.** [Invocation](./spec.md#invocation).
- **Adds.** Path is a string literal; resolved at parse time relative to calling loom; must end in `.loom`. Dynamic dispatch rejected.
- **Tests.** Relative paths resolve; non-string path rejected; non-`.loom` extension rejected.
- **Deps.** V12.
- **Ships when.** `invoke` syntax works.

#### V15b — Untyped `invoke` returns `Result<null, QueryError>`

- **Adds.** Child's return value discarded; only `Ok(null)` or `Err` reach parent.
- **Tests.** Successful child → `Ok(null)`; failed child → `Err`; child's actual return value not visible.
- **Deps.** V15a.
- **Ships when.** Fire-and-forget invokes work.

#### V15c — Typed `invoke<Schema>` with AJV validation

- **Adds.** `invoke<Plan>("./plan.loom", ...)` validates child's return value against `Plan`.
- **Tests.** Valid return → `Ok(value)`; invalid → `Err({kind:"invoke_failure", reason:"validation"})`.
- **Deps.** V15a, V4.
- **Ships when.** Typed invokes safe.

#### V15d — Positional argument binding for `invoke`

- **Adds.** Arguments bind positionally to callee `params:` in declaration order; type-checked when callee is statically resolvable.
- **Tests.** Type mismatch → parse error when statically resolvable; runtime AJV check otherwise.
- **Deps.** V15a, V3b.
- **Ships when.** Args reach callee correctly typed.

#### V15e — `.loom` paths in `tools:` (default basename naming)

- **Spec.** [Parameters and Frontmatter](./spec.md#parameters-and-frontmatter) (`tools:`), [Tool Calls](./spec.md#tool-calls) (registered loom callee).
- **Adds.** `./summarise.loom` in `tools:` becomes `summarise` callable; basename hyphen → underscore (`./code-review.loom` → `code_review`); resolution relative to calling loom.
- **Tests.** Default name correct; hyphens converted; resolution relative; entry callable from both code (`<name>(...)`) and model.
- **Deps.** V14a, V15a.
- **Ships when.** Loom paths register as named callables.

#### V15f — `.loom` path with `as` rename

- **Adds.** `./classify.loom as triage` overrides default name.
- **Tests.** Override applied; PascalCase rename rejected; collision with another final name is load error.
- **Deps.** V15e.
- **Ships when.** Loom callees fully renamable.

#### V15g — Prompt-mode `.loom` callee in `tools:` is load error

- **Spec.** [Parameters and Frontmatter](./spec.md#parameters-and-frontmatter) (`tools:`).
- **Adds.** Load-time check: a `.loom` path in `tools:` must point at a subagent-mode loom; prompt-mode is rejected.
- **Tests.** Prompt-mode callee → `loom/load/prompt-mode-callable` error; diagnostic mentions interleaving concern.
- **Deps.** V15e, V12a.
- **Ships when.** Footgun closed at load time.

#### V15h — Cross-mode cell: prompt → prompt

- **Spec.** [Invocation](./spec.md#invocation) (cross-mode matrix).
- **Adds.** Prompt-mode parent invoking prompt-mode child: child attaches to caller's current conversation; child's queries are user-visible turns.
- **Tests.** Child turns appear in parent's transcript; one fixture verifies end-to-end.
- **Deps.** V15a.
- **Ships when.** Cell verified.

#### V15i — Cross-mode cell: prompt → subagent

- **Adds.** Prompt-mode parent invoking subagent-mode child: child spawns fresh isolated conversation; only return value reaches parent.
- **Tests.** Parent transcript unchanged by child's intermediate turns; return value reaches parent.
- **Deps.** V15a, V12a.
- **Ships when.** Cell verified.

#### V15j — Cross-mode cell: subagent → prompt

- **Adds.** Subagent-mode parent invoking prompt-mode child: child attaches to caller subagent's own private conversation. Nothing leaks to grandparent.
- **Tests.** Grandparent (user session) transcript unchanged; subagent transcript contains child's turns.
- **Deps.** V15h, V12a.
- **Ships when.** Cell verified.

#### V15k — Cross-mode cell: subagent → subagent

- **Adds.** Sibling spawn (not nested under caller's).
- **Tests.** Two sibling sessions exist concurrently; neither sees the other's transcript.
- **Deps.** V15i.
- **Ships when.** Cell verified.

#### V15l — `InvokeFailure` variant

- **Spec.** [Invocation](./spec.md#invocation) (failures).
- **Adds.** `kind:"invoke_failure"` with `reason` enum: `load_failure`, `parse_failure`, `validation`, `cancelled`, `panic`. Carries `callee_path`.
- **Tests.** Each reason synthesised and surfaces correctly.
- **Deps.** V15a, V5g.
- **Ships when.** Invoke-infra failures uniformly typed.

#### V15m — `InvokeCalleeError` variant with recursive `inner`

- **Adds.** `kind:"invoke_callee_error"` with recursive `inner: QueryError`.
- **Tests.** Cascade of two-level invoke surfaces inner-of-inner correctly; AJV accepts recursive schema definition.
- **Deps.** V15l, V11g.
- **Ships when.** Callee errors propagate without information loss.

#### V15n — Parse-time cycle detection

- **Adds.** Walk statically resolvable `invoke` paths; detect cycles; report `loom/load/invocation-cycle` with full path.
- **Tests.** Self-cycle (`A → A`); two-step (`A → B → A`); three-step; cycle through warp `fn` invokes too (deps on V17j).
- **Deps.** V15a.
- **Ships when.** Static cycles caught.

---

### V16 — Slash-command argument binder (LLM path)

#### V16a — Param defaults

- **Spec.** [Parameters and Frontmatter](./spec.md#parameters-and-frontmatter) (defaults).
- **Adds.** `field: type = literal` defaults; RHS must be parse-time literal (string, number, boolean, `null`, or JSON-shaped object/array literal). No expressions, no `${param}`.
- **Tests.** Each literal kind; non-literal RHS rejected; defaults apply only when slash arg omitted.
- **Deps.** V3b.
- **Ships when.** Defaults declarable.

#### V16b — Default merging after binder

- **Adds.** After binder returns `ok`, runtime fills defaults for any field omitted from `args`, *then* AJV validates merged result.
- **Tests.** Omitted defaulted field filled; binder-provided value overrides default; AJV runs against merged shape.
- **Deps.** V16a.
- **Ships when.** Default-merge order correct.

#### V16c — Binder envelope schema construction

- **Spec.** [Slash-Command Argument Binding](./spec.md#slash-command-argument-binding) (binder envelope).
- **Adds.** Per-loom dynamic envelope schema with three `anyOf` arms (`ok`, `needs_info`, `ambiguous`); built once at load and reused.
- **Tests.** Envelope shape matches spec verbatim; reused across invocations (cache hit); per-loom uniqueness.
- **Deps.** V11a (discriminated unions), V3b.
- **Ships when.** Envelope schema constructable.

#### V16d — Defaulted-fields-relaxed in envelope's `args` arm

- **Adds.** In the `ok` arm, copy of params schema with each defaulted field removed from `required` (type unchanged).
- **Tests.** Required-without-default fields stay required; defaulted fields removed from `required`; types preserved.
- **Deps.** V16c, V16a.
- **Ships when.** Binder isn't asked to invent defaults.

#### V16e — `binder_model` resolution chain

- **Adds.** Frontmatter `binder_model:` → Pi setting `looms.binderModel` → built-in default (cheap tier-2 model identifier).
- **Tests.** Each resolution step; missing all → built-in default.
- **Deps.** V3a.
- **Ships when.** Binder model resolves predictably.

#### V16f — `bind_context: none`

- **Adds.** Default mode; binder sees only slash text + frontmatter.
- **Tests.** No session context attached; deterministic output for identical inputs (modulo provider non-determinism).
- **Deps.** V16c, V16e.
- **Ships when.** Default binder path works end-to-end.

#### V16g — `bind_context: session` truncation

- **Adds.** Walk caller-session turns newest-to-oldest; accumulate until 20 turns or 8000 tokens (whichever smaller); whole-turn boundary.
- **Tests.** Exact 20-turn boundary; exact 8000-token boundary (token count via `ctx.getContextUsage()` model-aware); partial messages not split.
- **Deps.** V16f.
- **Ships when.** Session-context binder path works.

#### V16h — Binder determinism settings

- **Adds.** `temperature: 0` and fixed seed (where provider supports). Acknowledged near-deterministic, not guaranteed reproducible.
- **Tests.** Request payload includes `temperature: 0`; seed included for providers that support it; loom doc references determinism caveat.
- **Deps.** V16e.
- **Ships when.** Determinism budget minimised.

#### V16i — `bind_echo` formatter

- **Spec.** [Slash-Command Argument Binding](./spec.md#slash-command-argument-binding) (echo policy).
- **Adds.** One-line system note: fields in declaration order, comma-separated; quote strings only with whitespace/special chars; arrays truncated `[a, b, c, …+N more]` past 3; objects shown as `{first-field-value, …}`; defaulted tagged `(default)`; 120-char cap with `…`.
- **Tests.** Each formatting rule against spec's exact examples.
- **Deps.** V3b.
- **Ships when.** Echoes match spec format.

#### V16j — `bind_echo: false` suppression

- **Adds.** Frontmatter flag suppresses echo.
- **Tests.** Set false → no echo emitted; set true (default) → echo emitted.
- **Deps.** V16i.
- **Ships when.** Echo opt-out works.

#### V16k — `bind_echo` auto-suppression on bypass

- **Adds.** Bypass-eligible loom auto-suppresses echo regardless of `bind_echo:`; `bind_echo: true` on bypass-eligible loom is parse warning.
- **Tests.** Bypass + true → warning + no echo; bypass + false → no echo; bypass + absent → no echo.
- **Deps.** V16i, V3c.
- **Ships when.** Bypass case has no spurious echoes.

#### V16l — `needs_info` envelope handling

- **Adds.** `kind: "needs_info"` envelope produces system note `loom /<name>: <message>` and loom does not run.
- **Tests.** Message reaches user; loom never starts; runtime returns from invocation cleanly.
- **Deps.** V16c.
- **Ships when.** Insufficient-info case handled.

#### V16m — `ambiguous` envelope handling

- **Adds.** `kind: "ambiguous"` envelope produces system note with `candidates` enumeration; loom does not run.
- **Tests.** Message + candidates reach user; loom never starts.
- **Deps.** V16c.
- **Ships when.** Ambiguity case handled.

#### V16n — Binder transport failure single retry

- **Adds.** Transport failure on binder gets exactly one retry; second failure surfaces as system note.
- **Tests.** Retry happens; second failure system-note text matches spec.
- **Deps.** V16e.
- **Ships when.** Transient failures don't fail-closed unnecessarily.

#### V16o — Binder malformed envelope handling

- **Adds.** Repeated malformed-envelope returns surface as system note `loom /<name>: argument binding failed — could not parse arguments`.
- **Tests.** Malformed envelope retried per AJV path; final failure system-note text matches spec.
- **Deps.** V16c.
- **Ships when.** Malformed-envelope case handled.

#### V16p — AJV validation of `args` post-default-merge

- **Adds.** AJV validates merged `args` (binder output + filled defaults) against full params schema; failure surfaces as system note `argument binding produced invalid args — <ajv-summary>`.
- **Tests.** Hallucinated field shape caught; AJV summary readable.
- **Deps.** V16b.
- **Ships when.** Hallucinations caught at boundary.

---

### V17 — `.warp` library files

#### V17a — `.warp` lexer/parser shares loom lexer

- **Spec.** [Imports](./spec.md#imports).
- **Adds.** Same lexer; AST builder dispatches on file extension.
- **Tests.** Parsing token-equivalence between same content in `.warp` and `.loom`.
- **Deps.** V1.
- **Ships when.** `.warp` files parse.

#### V17b — `.warp` body restriction

- **Adds.** Top-level: only `import`, `export`, `schema`, `enum`, `fn` allowed. Top-level statements, `let`, queries are parse errors.
- **Tests.** Each forbidden top-level form rejected; permitted forms accepted.
- **Deps.** V17a.
- **Ships when.** Library shape enforced.

#### V17c — `import { X } from "./y.warp"`

- **Adds.** Named-import form; resolution relative to importing file; path must end in `.warp`.
- **Tests.** Symbol resolves; non-`.warp` extension rejected; missing file → load error.
- **Deps.** V17b.
- **Ships when.** Imports work.

#### V17d — `import { X as Y }` aliasing

- **Adds.** Local alias for imported symbol.
- **Tests.** Alias usable; original name not in scope after alias; collision with local declaration is error.
- **Deps.** V17c.
- **Ships when.** Aliasing works.

#### V17e — `export { X } from "./y.warp"` re-export

- **Adds.** Re-export form creates no local binding.
- **Tests.** Re-exported symbol visible to downstream importers; not visible in re-exporting file's own scope.
- **Deps.** V17c.
- **Ships when.** Re-exports work.

#### V17f — `export { X as Y } from "./y.warp"`

- **Adds.** Re-export with rename.
- **Tests.** Downstream sees `Y`, not `X`.
- **Deps.** V17e.
- **Ships when.** Renamed re-exports work.

#### V17g — Implicit export of all `.warp` top-level declarations

- **Adds.** Every top-level `schema`/`enum`/`fn` in `.warp` is implicitly exported; no `export` keyword on declarations; no privacy modifier in V1.
- **Tests.** All declarations importable; no internal-only marker accepted.
- **Deps.** V17b.
- **Ships when.** Library visibility rule enforced.

#### V17h — Plain `import` does not re-export

- **Adds.** Symbols pulled in via `import` aren't visible to downstream importers unless explicitly re-exported.
- **Tests.** Downstream importing transitively-imported symbol fails to resolve unless re-exported.
- **Deps.** V17c.
- **Ships when.** Re-export discipline holds.

#### V17i — Query inside `.warp` `fn` runs against caller's conversation

- **Adds.** A `@`...`` inside an imported function executes against the calling `.loom`'s current conversation.
- **Tests.** Loom calling warp `fn` containing query: query appears in loom's conversation, not a fresh one.
- **Deps.** V17a, V5e.
- **Ships when.** Library-shipped query helpers work.

#### V17j — `invoke` from `.warp` resolves relative to `.warp` file

- **Adds.** Path relative to `.warp` location; execution against calling `.loom`'s conversation (or fresh subagent if callee subagent-mode).
- **Tests.** Path resolution correct; cross-mode behaviour matches V15h–k.
- **Deps.** V17a, V15a.
- **Ships when.** Library `invoke` paths work.

#### V17k — Import-cycle detection

- **Adds.** Walk static import graph between `.warp` files; cycle is parse error with full path.
- **Tests.** Two-file cycle; three-file cycle; error message matches spec format `"import cycle: a.warp → b.warp → a.warp"`.
- **Deps.** V17c.
- **Ships when.** Static cycles caught.

#### V17l — `.warp` excluded from slash-command discovery

- **Adds.** Discovery scan ignores `.warp` files at every source.
- **Tests.** `.warp` next to `.loom` doesn't register a command; only reachable via `import`.
- **Deps.** V14k–p, V17a.
- **Ships when.** Library files invisible to autocomplete.

#### V17m — Name collision: import vs. top-level `fn`

- **Adds.** Imported symbol colliding with local top-level declaration is parse error; resolve with `as`.
- **Tests.** Collision detected; error names both sites; `as` resolves.
- **Deps.** V17d.
- **Ships when.** Local-vs-imported naming clear.

---

### V18 — Cancellation, file watcher, system notes, panics, diagnostics rollup

#### V18a — `AbortSignal` at every loop iteration boundary

- **Spec.** [Cancellation](./spec.md#cancellation).
- **Adds.** Interpreter checks signal before each `for`/`while` iteration's body.
- **Tests.** Signal fired mid-loop: next iteration body not executed; `Err({kind:"cancelled"})` returned (or panic-routed for top-level).
- **Deps.** V8b, V8c.
- **Ships when.** Loops cancellable.

#### V18b — `AbortSignal` before every `@` query

- **Adds.** Pre-query signal check; in-flight query aborted via the underlying provider's abort path.
- **Tests.** Pre-flight abort: query never sent; mid-flight abort: `Err({kind:"cancelled"})`.
- **Deps.** V5e.
- **Ships when.** Queries cancellable.

#### V18c — `AbortSignal` before every tool call

- **Adds.** Pre-call check; signal forwarded to tool's `execute(toolCallId, params, signal, ...)`.
- **Tests.** Pre-flight abort: tool never invoked; mid-flight abort: `ToolCallError{cause:"cancelled"}`.
- **Deps.** V14c.
- **Ships when.** Tool calls cancellable.

#### V18d — `AbortSignal` before every `invoke`

- **Adds.** Pre-invoke check; child inherits derived signal from caller.
- **Tests.** Pre-flight abort: child never spawned; mid-flight abort: `Err({kind:"cancelled"})` or `InvokeCalleeError{inner:cancelled}` per origin.
- **Deps.** V15a.
- **Ships when.** Invokes cancellable.

#### V18e — Cancellation propagates downward only

- **Adds.** Parent cancellation fires child's signal; child cancellation does not fire parent's signal — surfaces as `Err`.
- **Tests.** Parent abort cancels child mid-execution; child internal cancel surfaces as `InvokeCalleeError{inner:cancelled}` to parent without aborting parent.
- **Deps.** V18b, V18c, V18d.
- **Ships when.** Direction rule enforced.

#### V18f — File watcher (chokidar) over discovery roots

- **Adds.** Watch every directory found by discovery; on change call `ctx.reload()` via `_loom-reload` command.
- **Tests.** Add/modify/remove `.loom` triggers reload; debounced (multiple changes within window → one reload); add/modify `.warp` invalidates importing looms.
- **Deps.** V14k–p.
- **Ships when.** Edits take effect without session restart.

#### V18g — AJV cache invalidation on file change

- **Adds.** File-watcher event invalidates compiled-schema cache for the changed file and any transitive importer.
- **Tests.** Schema edit invalidates cache key; next query recompiles; non-changed files retain cache hit.
- **Deps.** V18f, V4a.
- **Ships when.** Cache stays consistent under live edits.

#### V18h — Custom Pi message type `loom-system-note` and renderer

- **Spec.** [Pi Integration Contract](./spec.md#pi-integration-contract) (system notes).
- **Adds.** `pi.sendMessage({ customType: "loom-system-note", content, display: true, details }, { triggerTurn: false })`. Renderer formats as one-line dim entry.
- **Tests.** Note persists in transcript; survives `/tree` navigation; renderer applies dim style.
- **Deps.** H4.
- **Ships when.** System notes have a stable channel.

#### V18i — Per-`kind` formatting for prompt-mode top-level `Err`

- **Spec.** [Invocation from Pi](./spec.md#invocation-from-pi) (top-level Err in prompt mode table).
- **Adds.** Per-kind system-note formatter; chain identification when leaf failure originated in invoked child (`"... from child.loom invoked at parent.loom:42"`).
- **Tests.** Each `kind` row produces the spec's exact text; chain attribution works for two-level cascade.
- **Deps.** V18h.
- **Ships when.** Prompt-mode `Err` surfaces are uniform.

#### V18j — Multi-error rollup across file + transitive `.warp` imports

- **Spec.** [Diagnostics](./spec.md#diagnostics) (multi-error reporting).
- **Adds.** Every parse/type pass collects all errors from a file plus its transitive `.warp` imports before failing; one diagnostics call.
- **Tests.** Loom with 5 distinct parse errors + 1 type error in imported `.warp` produces all 6 in single drain, sorted by `(file, line, col)`.
- **Deps.** H3, V17c.
- **Ships when.** Authors get every problem at once.

#### V18k — Runtime panic: array index out of bounds

- **Spec.** [Errors and Results](./spec.md#errors-and-results) (panic sources).
- **Adds.** `arr[i]` with `i < 0` or `i >= length` panics with descriptive message.
- **Tests.** Both bounds; message includes index and length.
- **Deps.** V2d.
- **Ships when.** OOB caught early.

#### V18l — Runtime panic: indexed access on `null` / missing key

- **Adds.** `null[i]`, `null.field`, `obj["missing"]` panic.
- **Tests.** Each form panics; message identifies the access type.
- **Deps.** V2d.
- **Ships when.** Null/missing-access caught early.

#### V18m — Panic routing: slash-command surface

- **Spec.** [Errors and Results](./spec.md#errors-and-results) (panic routing).
- **Adds.** Top-level slash-command/prompt-mode panic produces system note `"loom /<name> aborted: <message>"`. User session not torn down.
- **Tests.** `MatchError`, OOB, null-access each route to a system note; user can type follow-up turn after.
- **Deps.** V7i, V18h, V18k, V18l.
- **Ships when.** Panics never tear down user session.

#### V18n — Panic routing: `invoke` parent surface

- **Adds.** Panic in invoked child surfaces to parent as `Err({kind:"invoke_failure", reason:"panic", ...})`.
- **Tests.** Each panic source in child becomes parent-side `Err` with `reason:"panic"`.
- **Deps.** V15l, V18k, V18l, V7i.
- **Ships when.** `invoke` panic semantics complete.

#### V18o — Per-call timeout marker

- **Spec.** [Cancellation](./spec.md#cancellation) (per-call timeouts deferred).
- **Adds.** This leaf is a *no-op confirmation*: assert that no timeout config is accepted on queries/tools/invokes; any `timeout:` field is `loom/load/unknown-frontmatter-field` warning. (Future feature.)
- **Tests.** `timeout:` rejected at frontmatter; per-query/per-call ascription rejected.
- **Deps.** V3a.
- **Ships when.** Spec-mandated absence is enforced.

---

## Spec coverage matrix

Every executable spec section maps to a closing leaf. Use this matrix at V18o to confirm completeness; any uncovered rule blocks V1.0.

| Spec section | Closing leaf(s) |
|---|---|
| Overview | M |
| Conceptual Model — Code and Model | M, V5a, V6a |
| Conceptual Model — Query-and-Await | V5e, V6b |
| Conceptual Model — Scope of a Loom File | M, V12a |
| Lexical Structure | V1a–V1e |
| Type System (umbrella) | V2c, V4d, V10a, V10d, V11a |
| Schema Declarations — object form | V4b |
| Schema Declarations — type alias / union | V4c |
| Schema Declarations — enum | V10a–V10c |
| Schema Declarations — discriminated union | V11a–V11f |
| Schema Declarations — recursion | V11g, V11h |
| Schema Declarations — wire-name renaming | V13a–V13d |
| Descriptions (`///`) | V13e (general), V10f (enums) |
| Schema Subset | V4g, V11i |
| Lowering Algorithm | V4b–V4i |
| Parameters and Frontmatter — `params` and defaults | V3b, V16a |
| Parameters and Frontmatter — `model` | V3a (recognised); applies per-query in V5e onward |
| Parameters and Frontmatter — `tools` | V14a, V14b, V15e–V15g |
| Parameters and Frontmatter — `system` | V12b, V12c |
| Parameters and Frontmatter — `binder_*`, `bind_*` | V16e–V16k |
| Parameters and Frontmatter — `retry` | V13f, V13g–V13j |
| Template Interpolation | V5b |
| Query — untyped | V5a, V5e, V5f, V5g |
| Query — typed and inference | V6c–V6h |
| Query — coercion | V13g–V13j |
| Query — failure modes (`QueryError`) | V5g, V6i, V6j, V14f–V14i, V15l, V15m |
| Expression Sublanguage | V2a–V2i, extended in V14c |
| Operator precedence | V2c |
| Grammar disambiguation | V1e, V2 (struct-expr-in-scrutinee) |
| Object construction, array construction, operator rules | V2c, V2h |
| Bindings and Mutability | V2a, V2b |
| Control Flow | V8a–V8f |
| Errors and Results — `match`, patterns | V7a–V7j |
| Errors and Results — `Result`, `?` | V6a, V6b |
| Errors and Results — runtime panics | V7i, V18k, V18l, V18m, V18n |
| Return Statement | V8f, V9c, V9e |
| Function Definitions | V9a–V9f |
| Tool Calls — Pi tools | V14a–V14j |
| Tool Calls — registered loom callees | V15e–V15g |
| Invocation | V15a–V15n |
| Imports | V17a–V17m |
| Pi Extension Integration | M, V14k–V14q, V18f, V18h |
| Directory Convention | V14k–V14q |
| Invocation from Pi | V16a–V16p, V18i |
| Slash-Command Argument Binding — bypass | V3c |
| Slash-Command Argument Binding — full | V16a–V16p |
| Cancellation | V18a–V18e, V18o |
| Diagnostics | H3, V18j |
| Comparison with Existing Pi Features | – |
| Implementation Notes — Parser | V1a–V1e, refined per slice |
| Implementation Notes — Runtime | M, V5e, V12a, V14c, V15a, V18a–V18n |
| Runtime Value Model | V2 (primitives/arrays/objects), V6a (Result), V10e (enum brand), V13b–V13d (wire-name) |
| Pi Integration Contract | M, V12a, V14a–V14j, V18f, V18g, V18h |
| Future Considerations | – (out of scope) |
| Appendix — Related Work | – |

If, when V18o closes, any executable spec rule lacks a leaf reference here, the plan is incomplete — add the missing leaf or fold it into V18 before declaring V1.0.