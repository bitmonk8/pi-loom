# FIX-1 (parser structural) — execution results

Scope: B1, A3, A4, A1, B2, B3 from `docs/e2e-campaign/fix-plan.md`. All six
implemented in the shipped front-end. No new diagnostic registry codes (closed
registry honoured); messages verbatim per `docs/reference/diagnostics.md`.

## Per-item status

| ID | Finding | Status | Code emitted |
|---|---|---|---|
| B1 | S7-1 | implemented | `loom/parse/unsupported-feature` (E) |
| A3 | S1-3, S4-5 | implemented | `loom/parse/extra-object-field` + `missing-object-field` (E) |
| A4 | S1-4, S4-6 | implemented | `loom/parse/bare-object-literal` (E) |
| A1 | S1-1, S4-1 | implemented | `loom/parse/unknown-identifier` (E) |
| B2 | S1-7 | implemented | `loom/parse/unsupported-feature` (E) |
| B3 | S1-8 | implemented | `loom/parse/unsupported-feature` (E) |

Reasoning on registry choice for B1/B2/B3: DIAG-2 is closed and the registry has
no dedicated "missing-separator" / "unparenthesised-param-list" / "stray-token"
code. `loom/parse/unsupported-feature` (E, parse) is the generic structural
reject the parser already uses (e.g. dynamic invoke path,
`loom-document.ts` §`parseInvoke`); its normative message template is
`unsupported syntactic feature: <construct>`, which each of these interpolates.

## What changed (file:line)

### `src/parser/loom-document.ts`

- **B1** — `parseType(stopAtFieldBoundary = false)` (`:1976`): when set (schema
  object-body field types only) the type scan stops at a depth-0 field boundary
  (a value-ish token directly following a completed type atom with no `|`), so a
  comma-missing field body no longer coalesces two fields into one. Newlines
  inside the schema brace body are swallowed as continuations (lexer), so the
  missing comma is otherwise invisible; the scan-stop lets both fields recover.
  `parseSchemaObjectBody` (`:1725`) now requires the comma separator: when a
  field is directly followed by the start of another field with no intervening
  comma, it emits `unsupported-feature` against the boundary token and continues
  parsing (the dropped field is preserved, not lost).
- **A3 / A4** — `checkObjectExpr` (`:3672`) added and wired into `walkExpr`'s
  `object` case (`:3798`). Named constructor `S { … }` against a declared object
  schema fires `extra-object-field` (undeclared field) / `missing-object-field`
  (omitted required field, via `checkObjectLiteralFields`, now actually called
  from body position). Bare `{ … }` fires `bare-object-literal` unless the caller
  marks the carve-out. `StructuralRefs` gained `schemas` (name → declared field
  names); built in `checkStructural` (`:3386`). The Pi-tool-call carve-out is the
  `call` case (`:~3810`): a sole bare-object argument is walked with the
  bare-object check suppressed (nested fields still validated).
- **A1** — new isolated pass `checkUnknownIdentifiers` (`:3127`) + root builder
  `collectIdentRoots` (`:3054`) + `collectPatternBindings`; wired in
  `parseLoomDocument` (`:661`–`:662`, aggregated at `:691`). Root scope folds in
  every whole-file binding source: `params:` field names, resolved `tools:`
  callable names (via `toolCallableName`, mirroring `callable-set.ts`), imported
  / re-exported symbols, top-level `fn` / `schema` / `enum` names, and stdlib
  builtins (`BUILTIN_VALUE_NAMES` — primitives, `array`, `Result`, `QueryError`).
  Loom-level `let` bindings accumulate block-locally as the walk descends; `fn`
  bodies see only roots + own params (closure-free, loom 1.0). Checked sites:
  bare `ident`, `call` callee, `member`/`index`/`method-call` receivers, object
  field values, `match` arm bodies (with pattern bindings added to arm scope).
  Non-sites (correctly NOT flagged): schema-constructor names, `.field` / method
  names, object keys, `${…}` template interpolations.
- **B2** — `parseFn` (`:1558`): a missing `(` after the fn name emits
  `unsupported-feature` (fn parameter lists are always parenthesised).
- **B3 (parser arm)** — `parseForms` drop-token site (`:1183`): a stray `punct`
  token in statement position that starts no legal form emits `unsupported-feature`
  rather than being silently dropped.

### `src/lexer/lexer.ts`

- **B3 (lexer arm)** — semicolon rejection (`:687`): a stray `;` outside strings /
  templates / comments emits `unsupported-feature` and is consumed with no token
  (so surrounding statements still parse and the parser arm never double-fires).
  This satisfies the lexer-level witness (REQ-LEX-16, `e2e-s1-lexer-intake`) which
  drives `lexLoom` directly.

### Fixture fixes (malformed per spec; minimal, sanctioned by the gate rules)

Landing these checks reddened the established `committed-fixture-parse-gate`
because several committed fixtures were themselves malformed per spec. Fixed
minimally (no semantic change beyond spec-conformance):

- `.pi/looms/loom-smoke.loom` — `#` comment lines → `//` (loom comments are
  `//` / `///`; `#` was silently tolerated pre-B3, now a stray-token error).
- `tests/fixtures/h7a/acceptance.loom` — added missing comma in `schema Report`
  (B1); dropped non-language `respond` keyword before `report` (A1).
- `tests/acceptance/fixtures/acc-typed-named.loom` — added missing comma in
  `schema Reply` (B1, = D5); dropped `respond` before `r` (A1).
- `tests/acceptance/fixtures/acc-typed-inline.loom` — dropped `respond` before `r`.
- `tests/acceptance/fixtures/acc-code-tool-loop.loom` — dropped `respond` before
  the final `@`…`?` query.
- `tests/acceptance/fixtures/acc-imports-invoke.loom` — dropped `respond` before
  `tagline()`.
- `tests/acceptance/fixtures/acc-match-queryerror.loom` — dropped `respond`
  before `outcome`.
- `tests/acceptance/fixtures/acc-params-binder.loom` — dropped `respond` before
  `"ok"` (body stays a pure literal, area (d) intent preserved).

These `respond`-drops are exactly the D4 rewrite ("Rewrite to a final query")
FIX-5 owns; done minimally here only to keep the mandatory established suite
green. FIX-5 should confirm the acceptance assertions still hold live.

### New test (permanent gate, not a campaign witness)

- `tests/fix1-parser-structural.test.ts` — 14 tests covering B1 (errors + no
  field dropped; comma form clean), A3 (extra/missing/clean), A4 (bare + tool-arg
  carve-out), A1 (unknown ident/call callee + no-false-positive valid loom +
  match-arm bindings), B2 (unparenthesised rejected + parenthesised clean),
  B3 (lexer semicolon). Runs in the default suite.

## Gate results

- `npm run typecheck` → clean.
- `npm run lint` → clean.
- Established suite (excluding `e2e-s[1-6]-*` witnesses): **149 files / 1759
  tests, all green** (baseline was 148 / 1745; +1 file / +14 = the new FIX-1
  test). No pre-existing assertion weakened.
- `npm run test:conformance` → **26 tests green**.
- `committed-fixture-parse-gate` → green (22 tests) with all checks active.

## Witness transition (informational; FIX-5 reconciles per D7)

Running the campaign witnesses confirms the intended flips:
- `e2e-s1-expr-diagnostics` / `e2e-s1-grammar-literal-sublang` → green.
- `e2e-s1-lexer-intake` REQ-LEX-16 (semicolon) → green.
- `e2e-s4-never-emitted-diagnostics` `it.fails` rows for `unknown-identifier`,
  `extra-object-field`, `bare-object-literal` now go RED — this is the expected
  `it.fails` inversion (the underlying assertion now passes). D7/FIX-5 converts
  those `it.fails` → `it`. The remaining red `it.fails` rows (`unknown-method`,
  `mixed-plus-operands`, `non-orderable-operands`, the advisory/load W-codes) are
  FIX-2 / FIX-3 scope, untouched here.

## Notes / no false positives

- A1 was the false-positive risk item. It was validated against every committed
  `.loom` via the `committed-fixture-parse-gate` and against the full established
  suite — zero false positives on any valid loom. All legitimate binding sources
  are covered (params, tools, imports, fn/schema/enum, builtins, block-scoped
  lets, for-vars, match-arm bindings). `fn` bodies are closure-free (roots +
  params only) per loom 1.0. A1 is shipped, not deferred.
- No item deferred. All six landed.
