# S1 (language-core) — findings

Phase C, slice S1. Areas LEX, GRAM, EXPR, CTRL, FUNC, RET, BIND, TYPE, RVM.
Method: M1 offline-unit via `parseLoomDocument` / `lexLoom`, plus the
`checkLiteralSublanguage` seam and the `evaluateSource` interpreter seam.

Every finding below was produced by a NEW red test under `tests/e2e-s1-*.test.ts`
that drives the shipped front-end (`src/parser/loom-document.ts`,
`src/lexer/lexer.ts`) and contradicts a spec-mandated diagnostic. The red tests
are retained (they go green once the gap is fixed in Phase D).

Common root cause for FIND-S1-1..6: the diagnostic codes are defined in the
authoritative parse-code registry (`docs/spec_topics/diagnostics/code-registry-parse.md`)
at severity `E`, but **no string literal for any of the six codes exists anywhere
under `src/`** (verified: `grep -rn "loom/parse/<code>" src/` returns zero hits
for `unknown-identifier`, `unknown-method`, `extra-object-field`,
`bare-object-literal`, `mixed-plus-operands`, `non-orderable-operands`). The
checks are therefore not merely unwired — they are absent from the shipped
compiler, so the malformed loom loads clean.

---

### FIND-S1-1: bare unknown identifier is not rejected (`loom/parse/unknown-identifier` never emitted)
- Requirement: REQ-EXPR-7 (spec-requirements.md:165)
- Spec citation: docs/spec_topics/diagnostics/code-registry-parse.md:59 (E, parse — "Bare identifier in call or value position resolves to nothing in scope"); docs/spec_topics/expressions.md §Identifier resolution
- Method: M1
- Repro: `tests/e2e-s1-expr-diagnostics.test.ts:17` — `parseDoc("let x = missing_binding")` returns `diagnostics: []`
- Expected: `loom/parse/unknown-identifier` (loom fails to load)
- Observed: zero diagnostics; the loom loads clean. Code string absent from `src/**`.
- Verdict: loom-defect
- Severity: blocks-spec-compliance

### FIND-S1-2: unknown built-in method is not rejected (`loom/parse/unknown-method` never emitted)
- Requirement: REQ-EXPR-23 (spec-requirements.md:181)
- Spec citation: docs/spec_topics/diagnostics/code-registry-parse.md:60 (E, parse — "Method or property accessed on a built-in type that the loom 1.0 stdlib does not expose"); docs/spec_topics/expressions.md §Built-in methods and properties
- Method: M1
- Repro: `tests/e2e-s1-expr-diagnostics.test.ts:27` — `parseDoc('let x = "hello".frobnicate()')` returns `diagnostics: []`
- Expected: `loom/parse/unknown-method` (parse error, not a runtime failure)
- Observed: zero diagnostics. Code string absent from `src/**`.
- Verdict: loom-defect
- Severity: blocks-spec-compliance

### FIND-S1-3: object-literal field validation is unwired in production (`extra-object-field` absent; `missing-object-field` seam never called)
- Requirement: REQ-EXPR-34 (spec-requirements.md:192), REQ-GRAM-4 (spec-requirements.md:134)
- Spec citation: docs/spec_topics/diagnostics/code-registry-parse.md:44 (`extra-object-field`, E, parse); expressions.md §Object construction ("every declared field must be present … extra fields are `loom/parse/extra-object-field`")
- Method: M1
- Repro: `tests/e2e-s1-expr-diagnostics.test.ts:37` — `parseDoc("schema Point { x: integer, y: integer }\nlet p = Point { x: 1, y: 2, z: 3 }")` returns `diagnostics: []`. Also observed: `Point { x: 1 }` (missing `y`) also returns `diagnostics: []` — the `missing-object-field` path is equally silent in production.
- Expected: `loom/parse/extra-object-field` for the extra `z`; `loom/parse/missing-object-field` for the omitted `y`
- Observed: zero diagnostics for both. `extra-object-field` string is absent from `src/**`. The `missing-object-field` check exists (`src/parser/literal-sublanguage.ts:532` `checkObjectLiteralFields`, emits at `:543`) but `grep -rn checkObjectLiteralFields src/` shows it is **defined and never called** in `src/**` — it runs only in the isolated seam unit test. This is the "isolated unit green, production dispatch broken" pattern the conformance suite was built to catch.
- Verdict: loom-defect
- Severity: blocks-spec-compliance

### FIND-S1-4: bare object literal is not rejected (`loom/parse/bare-object-literal` never emitted)
- Requirement: REQ-EXPR-35 (spec-requirements.md:193)
- Spec citation: docs/spec_topics/diagnostics/code-registry-parse.md:46 (E, parse — "Bare `{ field: expr }` (no schema name) used in expression position outside the two documented carve-outs"); expressions.md §Object construction
- Method: M1
- Repro: `tests/e2e-s1-expr-diagnostics.test.ts:51` — `parseDoc('let cfg = { name: "x" }')` returns `diagnostics: []`
- Expected: `loom/parse/bare-object-literal`
- Observed: zero diagnostics; the schemaless object literal loads clean in a normal `let` RHS position (outside the two carve-outs). Code string absent from `src/**`.
- Verdict: loom-defect
- Severity: blocks-spec-compliance

### FIND-S1-5: mixed-type `+` is not rejected (`loom/parse/mixed-plus-operands` never emitted)
- Requirement: REQ-EXPR-41 (spec-requirements.md:199)
- Spec citation: docs/spec_topics/diagnostics/code-registry-parse.md:36 (E, type — "`+` applied to a `number`/`integer` and a `string` (or any other mixed-type pair)"); expressions.md §`+` operator
- Method: M1
- Repro: `tests/e2e-s1-expr-diagnostics.test.ts:61` — `parseDoc('let x = 1 + "a"')` returns `diagnostics: []`
- Expected: `loom/parse/mixed-plus-operands`
- Observed: zero diagnostics. Code string absent from `src/**`. (The type layer IS active in production — `if 1` correctly fires `non-boolean-condition` via the same `parseLoomDocument` path — so this is a per-check omission, not a dead type layer.)
- Verdict: loom-defect
- Severity: blocks-spec-compliance

### FIND-S1-6: non-orderable comparison is not rejected (`loom/parse/non-orderable-operands` never emitted)
- Requirement: REQ-EXPR-46 (spec-requirements.md:206)
- Spec citation: docs/spec_topics/diagnostics/code-registry-parse.md:37 (E, type — "`<`,`<=`,`>`,`>=` applied to a non-orderable operand pair — a numeric operand against a `string` …"); expressions.md §Ordering comparisons
- Method: M1
- Repro: `tests/e2e-s1-expr-diagnostics.test.ts:71` — `parseDoc('let x = 1 < "a"')` returns `diagnostics: []`
- Expected: `loom/parse/non-orderable-operands`
- Observed: zero diagnostics. Code string absent from `src/**`.
- Verdict: loom-defect
- Severity: blocks-spec-compliance

### FIND-S1-7: unparenthesised `fn` declaration is silently accepted
- Requirement: REQ-GRAM-16 (spec-requirements.md:146)
- Spec citation: docs/spec_topics/grammar.md §`fn` declarations ("`FnDecl` parameter lists are always parenthesised (`fn f()`, never `fn f`)")
- Method: M1
- Repro: `tests/e2e-s1-grammar-literal-sublang.test.ts:53` — `parseDoc("fn f x {\n  x\n}")` returns `diagnostics: []` and `body.statements` = `["fn"]` (parsed as a well-formed fn declaration)
- Expected: a parse error rejecting the missing parentheses (no dedicated code is registered; a generic parse diagnostic is the minimum)
- Observed: zero diagnostics; the malformed signature `fn f x` parses into an accepted `fn` statement.
- Verdict: loom-defect
- Severity: partial

### FIND-S1-8: stray non-grammar punctuation tokens are silently swallowed (semicolon; mid-statement stray char)
- Requirement: REQ-LEX-16 (spec-requirements.md:111)
- Spec citation: docs/spec_topics/lexical.md §Statement terminators ("Statements are separated by newlines; semicolons are not part of the grammar")
- Method: M1
- Repro: `tests/e2e-s1-lexer-intake.test.ts:66` — `lexSrc("let x = 1;")` produces a `punct ";"` token and no error diagnostic. Independently observed while probing REQ-LEX-10: `lexSrc("let café = 1")` tokenises to `[let, ident "caf", punct "é", punct "=", number "1"]` — the stray `é` punct mid-statement is likewise never diagnosed (the identifier char-class boundary itself IS enforced — the ident stops at `caf`).
- Expected: a trailing/stray `;` (and a stray non-identifier char in statement position) is not part of the grammar and should surface a diagnostic rather than being dropped.
- Observed: stray `punct` tokens outside the grammar are silently ignored; the malformed source loads clean.
- Verdict: loom-defect
- Severity: partial

---

## Notes on classification

- FIND-S1-1..6 share one mechanical signature: the six E-severity parse codes are
  in the spec registry but have **no implementation string in `src/**`**. They are
  independent requirement rows and are recorded separately so Phase D can size each
  fix, but they will likely share a single wiring/implementation change in the
  type-layer + object-construction checkers.
- FIND-S1-3 additionally documents a **wiring** gap (an implemented seam,
  `checkObjectLiteralFields`, that production never calls) distinct from the
  absent-code gaps.
- No borderline / deferred-not-a-bug findings: none of these codes appear in the
  spec-requirements Deferred appendix (Cluster 1, spec-requirements.md:1242-1258),
  which defers only language *features* (hex numbers, integer-division, match
  guards, arrow functions, closures, ⊑-widening, non-Node hosts) — not any of the
  rejection diagnostics above.
