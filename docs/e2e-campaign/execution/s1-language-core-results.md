# S1 (language-core) — execution results

Phase C, slice S1. Areas: LEX, GRAM, EXPR, CTRL, FUNC, RET, BIND, TYPE, RVM
(171 in-scope requirements). Primary method M1 offline-unit
(`parseLoomDocument` / `lexLoom` / `parseExpressionSource`) plus the
`checkLiteralSublanguage` and `evaluateSource` production seams (M2-style value
behaviour, no model).

CWD `C:/UnitySrc/pi-loom`. Every claim cites `path:line`. Per-area coverage was
mapped by four sub-workers; their raw partials are retained under
`execution/_s1-partials/` (lex-gram.md, expr.md, ctrl-func-ret-bind.md,
type-rvm.md) and carry the full per-row `path:line` evidence merged below.

## 1. Existing-suite run

`npx vitest run` over the S1 globs (plan §4): **20 files, 310 tests, all pass.**

```
lexer-core (15) · lexer-parser-diagnostics-production (8) · whole-program-parser (40)
expression-evaluator (21) · expression-stdlib-array (8) · expression-stdlib-object (4)
expression-stdlib-string (17) · control-flow (12) · functions-and-return (24)
match-result (16) · statement-executor (26) · runtime-value-model (9) · bindings (13)
literals-and-paths (15) · type-grammar (8) · type-compat (29) · static-type-inference (17)
canonical-number-render (11) · disc-unions-recursion (7) · lexical-environment (10)
→ 20 passed (20) / 310 passed (310)
```

## 2. New tests authored

Driving the real production front-end via `tests/helpers/e2e-s1.ts` (thin
recording wrappers around `lexLoom` / `parseLoomDocument`, plus the
`checkLiteralSublanguage` and `evaluateSource` seams — no behaviour stubbed).

| New test file | Tests | Pass | Fail | Outcome |
|---|---|---|---|---|
| `tests/e2e-s1-lexer-intake.test.ts` | 7 | 6 | 1 | newly covers LEX-1/3/10/26; 1 red = FIND-S1-8 (LEX-16) |
| `tests/e2e-s1-expr-diagnostics.test.ts` | 6 | 0 | 6 | all red = FIND-S1-1..6 (EXPR-7/23/34/35/41/46) |
| `tests/e2e-s1-grammar-literal-sublang.test.ts` | 6 | 5 | 1 | newly covers GRAM-2; 1 red = FIND-S1-7 (GRAM-16) |
| `tests/e2e-s1-runtime-values.test.ts` | 9 | 9 | 0 | newly covers EXPR-45/47 (+ EXPR-42/44 value reinforce) |
| **Total** | **28** | **20** | **8** | 7 reqs newly covered; 8 red tests = 8 findings |

The 8 red tests are **intentionally retained** per plan §4.4 — each drives the
production path and reveals shipped behaviour contradicting a spec-mandated
diagnostic. They go green when the Phase-D fix lands.

## 3. Coverage map (REQ → covering test | UNCOVERED | new-test)

Status legend: `EXISTING` = covered by a shipped test (path:line cited);
`NEW✓` = newly covered by a passing S1 test; `FINDING` = new red test revealing
non-compliance (see findings/s1-language-core-findings.md); `JUSTIFIED` =
uncovered with recorded reason; `(p)` = partial (primary behaviour pinned, a
named sub-clause unasserted). `M4` = inspection row (mapped to code file:line).

### LEX (31)

| REQ | Status | Evidence |
|---|---|---|
| LEX-1 | NEW✓ | tests/e2e-s1-lexer-intake.test.ts:16 (BOM byte-identical stream) |
| LEX-2 | EXISTING | tests/lexer-core.test.ts:118 |
| LEX-3 | NEW✓ | tests/e2e-s1-lexer-intake.test.ts:34 (UTF-16 → invalid-encoding @0) |
| LEX-4 | EXISTING | tests/lexer-core.test.ts:150 |
| LEX-5 | EXISTING | tests/descriptions.test.ts:125 |
| LEX-6 | EXISTING | tests/literals-and-paths.test.ts:223 |
| LEX-7 | EXISTING | tests/lexer-core.test.ts:223 |
| LEX-8 | EXISTING | tests/discovery-invalid-extension.test.ts:86 |
| LEX-9 | EXISTING | tests/diagnostics-primitive.test.ts:40 |
| LEX-10 | NEW✓ (p) | tests/e2e-s1-lexer-intake.test.ts:77 (char-class boundary; case-sensitivity still unasserted) |
| LEX-11 | EXISTING | tests/lexer-core.test.ts:177 |
| LEX-12 | EXISTING | tests/lexer-core.test.ts:186 |
| LEX-13 | EXISTING | tests/lexer-core.test.ts:164 |
| LEX-14 | EXISTING | tests/lexical-environment.test.ts:227 |
| LEX-15 | EXISTING (p) | tests/type-grammar.test.ts:59,71 |
| LEX-16 | FINDING | FIND-S1-8 · tests/e2e-s1-lexer-intake.test.ts:66 |
| LEX-17 | EXISTING | tests/lexer-core.test.ts:236 |
| LEX-18 | EXISTING | tests/lexer-core.test.ts:214 |
| LEX-19 | EXISTING | tests/descriptions.test.ts:52 |
| LEX-20 | EXISTING | tests/lexer-core.test.ts:201 |
| LEX-21 | EXISTING (p) | tests/literals-and-paths.test.ts:106 (single/double equivalence unasserted) |
| LEX-22 | EXISTING | tests/literals-and-paths.test.ts:133,142 |
| LEX-23 | EXISTING | tests/literals-and-paths.test.ts:120 |
| LEX-24 | EXISTING | tests/diagnostics-primitive.test.ts:32 |
| LEX-25 | EXISTING | tests/lexer-parser-diagnostics-production.test.ts:86 |
| LEX-26 | NEW✓ | tests/e2e-s1-lexer-intake.test.ts:49,58 (no interpolation) |
| LEX-27 | EXISTING | tests/literals-and-paths.test.ts:212 |
| LEX-28 | EXISTING | tests/literals-and-paths.test.ts:172 |
| LEX-29 | EXISTING | tests/literals-and-paths.test.ts:182 |
| LEX-30 | EXISTING | tests/literals-and-paths.test.ts:156 |
| LEX-31 | EXISTING | tests/literals-and-paths.test.ts:164 |

### GRAM (24)

| REQ | Status | Evidence |
|---|---|---|
| GRAM-1 | EXISTING | tests/params-defaults.test.ts:119; tests/type-grammar.test.ts:135 |
| GRAM-2 | NEW✓ | tests/e2e-s1-grammar-literal-sublang.test.ts:26,34 (unary-`-`, Enum.Variant literal-legal) |
| GRAM-3 | JUSTIFIED | Positive (`Cat {…}`) parsed at tests/whole-program-parser.test.ts:467; the BareObjectLit/NamedObjectLit rejection side is folded into FIND-S1-4 (bare-object-literal absent). |
| GRAM-4 | EXISTING (p) / FINDING | seam tests/type-grammar.test.ts:153; production wiring gap → FIND-S1-3 |
| GRAM-5 | EXISTING (p) | tests/type-grammar.test.ts:131,142 |
| GRAM-6 | EXISTING | tests/bindings.test.ts:171 |
| GRAM-7 | EXISTING | tests/type-grammar.test.ts:85 |
| GRAM-8 | EXISTING | tests/type-grammar.test.ts:59,71 |
| GRAM-9 | EXISTING | tests/type-grammar.test.ts:107 |
| GRAM-10 | EXISTING | tests/schema-declarations.test.ts:54,75,114 |
| GRAM-11 | JUSTIFIED | `parseTypeExpression` flattens `\|` to `arms[]` (src/parser/type-grammar.ts:204) — associativity is not observable and is semantically vacuous for a set union; the `T \| null` nullability form is a union special-case covered structurally by TYPE-9 (tests/type-compat.test.ts:154). Low added value. |
| GRAM-12 | EXISTING (p) | tests/whole-program-parser.test.ts:113,123 |
| GRAM-13 | EXISTING | tests/functions-and-return.test.ts:286 |
| GRAM-14 | EXISTING (p) | tests/lexer-parser-diagnostics-production.test.ts:110 |
| GRAM-15 | JUSTIFIED | Testability=conformance (spec-requirements.md:145); tail-`Expr` discard + `?`-tail early-return is a runtime M2 behaviour, out of the offline scope exercised here (belongs to statement-executor conformance). |
| GRAM-16 | FINDING | FIND-S1-7 · tests/e2e-s1-grammar-literal-sublang.test.ts:53 |
| GRAM-17 | EXISTING | tests/bindings.test.ts:111 |
| GRAM-18 | EXISTING | tests/lexer-parser-diagnostics-production.test.ts:110 |
| GRAM-19 | EXISTING | tests/disc-unions-recursion.test.ts:201 |
| GRAM-20 | EXISTING | tests/descriptions.test.ts:93 |
| GRAM-21 | EXISTING | tests/lexer-core.test.ts:236 |
| GRAM-22 | EXISTING | tests/whole-program-parser.test.ts:335 |
| GRAM-23 | EXISTING | tests/type-grammar.test.ts:181 |
| GRAM-24 | EXISTING | tests/functions-and-return.test.ts:60 |

### EXPR (48)

| REQ | Status | Evidence |
|---|---|---|
| EXPR-1 | EXISTING (p) | tests/whole-program-parser.test.ts:417,441,453,467,494 |
| EXPR-2 | EXISTING | tests/type-layer-diagnostics-production.test.ts:195 |
| EXPR-3 | EXISTING | tests/type-layer-diagnostics-production.test.ts:207 |
| EXPR-4 | JUSTIFIED | static-type-inference.test.ts:83 types the index node ("type defined"); the field-union result-type is low-weight and not separately asserted. No NEW test (marginal behavioural value). |
| EXPR-5 | EXISTING (p) | tests/runtime-panics.test.ts:129,137 (ordering sub-clause unasserted) |
| EXPR-6 | EXISTING (p) | tests/conformance/production-conformance.test.ts:346 (only assignment-in-expr of the enumerated set) |
| EXPR-7 | FINDING | FIND-S1-1 · tests/e2e-s1-expr-diagnostics.test.ts:17 |
| EXPR-8 | JUSTIFIED | Load-time tools-shadow-fn/import; only tool↔tool collision covered (production-conformance.test.ts:296). Overlaps S2 callable-set composition — deferred to S2 for the fn/import-shadow variant. |
| EXPR-9 | EXISTING | tests/runtime-value-model.test.ts:62,113 |
| EXPR-10 | EXISTING | tests/runtime-value-model.test.ts:84,88 |
| EXPR-11 | EXISTING | tests/expression-evaluator.test.ts:187 |
| EXPR-12 | EXISTING | tests/expression-evaluator.test.ts:230,242,265 |
| EXPR-13 | EXISTING (p) | tests/expression-evaluator.test.ts:149,163 (no-token conformance sub-clause unasserted) |
| EXPR-14 | EXISTING | tests/expression-evaluator.test.ts:176 |
| EXPR-15 | EXISTING | tests/expression-stdlib-string.test.ts:109 |
| EXPR-16 | EXISTING | tests/expression-stdlib-string.test.ts:116-164 |
| EXPR-17 | EXISTING | tests/expression-stdlib-string.test.ts:50-71 |
| EXPR-18 | EXISTING | tests/expression-stdlib-string.test.ts:50,58,63,67,71 |
| EXPR-19 | EXISTING | tests/type-layer-diagnostics-production.test.ts:195; conformance:401 |
| EXPR-20 | EXISTING | tests/expression-stdlib-array.test.ts:54-129 |
| EXPR-21 | EXISTING | tests/expression-stdlib-string.test.ts:81,92,98 |
| EXPR-22 | EXISTING | tests/expression-stdlib-object.test.ts:32,58,76 |
| EXPR-23 | FINDING | FIND-S1-2 · tests/e2e-s1-expr-diagnostics.test.ts:27 |
| EXPR-24 | EXISTING | tests/expression-evaluator.test.ts:96-134 |
| EXPR-25 | EXISTING | tests/conformance/production-conformance.test.ts:331 |
| EXPR-26 | EXISTING (p) | tests/whole-program-parser.test.ts:476 (parens-required rejection unasserted) |
| EXPR-27 | EXISTING | tests/conformance/production-conformance.test.ts:422,500,517 |
| EXPR-28 | EXISTING | tests/match-result.test.ts:235-287 |
| EXPR-29 | EXISTING | tests/lexer-parser-diagnostics-production.test.ts:130,151 |
| EXPR-30 | EXISTING | tests/match-result.test.ts:200,216 |
| EXPR-31 | EXISTING | tests/match-result.test.ts:135,162 |
| EXPR-32 | EXISTING | tests/match-result.test.ts:73; type-layer:113 |
| EXPR-33 | EXISTING | tests/match-result.test.ts:100; conformance:432 |
| EXPR-34 | FINDING | FIND-S1-3 · tests/e2e-s1-expr-diagnostics.test.ts:37 (extra-object-field; missing-field wiring) |
| EXPR-35 | FINDING | FIND-S1-4 · tests/e2e-s1-expr-diagnostics.test.ts:51 |
| EXPR-36 | EXISTING (p) | tests/type-compat.test.ts:144 |
| EXPR-37 | EXISTING | tests/type-grammar.test.ts:181; conformance:369 |
| EXPR-38 | EXISTING | tests/type-compat.test.ts:285 |
| EXPR-39 | EXISTING (p) | tests/expression-stdlib-string.test.ts:81,92,98 |
| EXPR-40 | EXISTING (p) | tests/type-compat.test.ts:326 |
| EXPR-41 | FINDING | FIND-S1-5 · tests/e2e-s1-expr-diagnostics.test.ts:61 |
| EXPR-42 | EXISTING (p) / NEW✓ | tests/expression-evaluator.test.ts:134,200; tests/e2e-s1-runtime-values.test.ts:70 (unary-minus value) |
| EXPR-43 | EXISTING | tests/expression-evaluator.test.ts:207 |
| EXPR-44 | EXISTING / NEW✓ | tests/expression-evaluator.test.ts:207,213; tests/e2e-s1-runtime-values.test.ts:76 (mod-by-zero NaN) |
| EXPR-45 | NEW✓ | tests/e2e-s1-runtime-values.test.ts:55,62 (>2^53-1 folds without panic) |
| EXPR-46 | FINDING | FIND-S1-6 · tests/e2e-s1-expr-diagnostics.test.ts:71 |
| EXPR-47 | NEW✓ | tests/e2e-s1-runtime-values.test.ts:29-46 (lexicographic by UTF-16 code unit) |
| EXPR-48 | EXISTING | tests/expression-evaluator.test.ts:218 |

### CTRL (8) — all EXISTING

| REQ | Status | Evidence |
|---|---|---|
| CTRL-1 | EXISTING | tests/whole-program-parser.test.ts:189; expression-evaluator.test.ts:128,176 |
| CTRL-2 | EXISTING | tests/statement-executor.test.ts:367 |
| CTRL-3 | EXISTING | tests/control-flow.test.ts:134,146,156 |
| CTRL-4 | EXISTING | tests/type-grammar.test.ts:181 |
| CTRL-5 | EXISTING | tests/control-flow.test.ts:54,80,101 |
| CTRL-6 | EXISTING | tests/expression-evaluator.test.ts:265; statement-executor.test.ts:931 |
| CTRL-7 | EXISTING | tests/control-flow.test.ts:182,203 |
| CTRL-8 | EXISTING | tests/control-flow.test.ts:224; statement-executor.test.ts:384,404 |

### FUNC (16)

| REQ | Status | Evidence |
|---|---|---|
| FUNC-1 | EXISTING | tests/statement-executor.test.ts:430 |
| FUNC-2 | EXISTING | tests/functions-and-return.test.ts:60 |
| FUNC-3 | EXISTING | tests/functions-and-return.test.ts:75,88 |
| FUNC-4 | EXISTING | tests/functions-and-return.test.ts:96; invoke-depth-cycle.test.ts:96,193 |
| FUNC-5 | EXISTING | tests/functions-and-return.test.ts:114,126 |
| FUNC-6 | EXISTING | tests/functions-and-return.test.ts:143 |
| FUNC-7 | EXISTING | tests/functions-and-return.test.ts:168 |
| FUNC-8 | EXISTING | tests/functions-and-return.test.ts:218 |
| FUNC-9 | EXISTING | tests/functions-and-return.test.ts:242,263 |
| FUNC-10 | EXISTING | tests/functions-and-return.test.ts:286; statement-executor.test.ts:443 |
| FUNC-11 | EXISTING | tests/functions-and-return.test.ts:307 |
| FUNC-12 | JUSTIFIED | M2 conformance (`let x = expr?` → `Ok(null)`); needs the runtime `runSource` drive harness (tests/conformance). FN-4 empty-tail seam covers the generic `?`-body (functions-and-return.test.ts:307). Deferred to a conformance follow-up. |
| FUNC-13 | EXISTING | tests/statement-executor.test.ts:430,464; composition-producer.test.ts:409 |
| FUNC-14 | EXISTING | tests/statement-executor.test.ts:733,978 |
| FUNC-15 | JUSTIFIED | "fn call participates in the current conversation, opens no new one" — M2/live conversation-topology witness; belongs to the S6/S7 session-drive surface (invoke-cross-mode is the `invoke` case). |
| FUNC-16 | EXISTING (p) | tests/functions-and-return.test.ts:328 (discardForVoid) |

### RET (6) — all EXISTING

| REQ | Status | Evidence |
|---|---|---|
| RET-1 | EXISTING | tests/statement-executor.test.ts:464; whole-program-parser.test.ts:216 |
| RET-2 | EXISTING | tests/functions-and-return.test.ts:242,143 |
| RET-3 | EXISTING | tests/functions-and-return.test.ts:339,350,363 |
| RET-4 | EXISTING (p) | tests/statement-executor.test.ts:464 (generic body-executor witness) |
| RET-5 | EXISTING | tests/functions-and-return.test.ts:371,384 |
| RET-6 | EXISTING | tests/statement-executor.test.ts:722 |

### BIND (7) — all EXISTING

| REQ | Status | Evidence |
|---|---|---|
| BIND-1 | EXISTING | tests/bindings.test.ts:51,63 |
| BIND-2 | EXISTING | tests/bindings.test.ts:171,185 |
| BIND-3 | EXISTING (p) | tests/bindings.test.ts:63 (plain `=`/`+=`); `-= *= /= %=` + reassign-RHS-⊑ unasserted |
| BIND-4 | EXISTING | tests/conformance/production-conformance.test.ts:346 |
| BIND-5 | EXISTING | tests/bindings.test.ts:77,90,99 |
| BIND-6 | EXISTING | tests/bindings.test.ts:111,122,131 |
| BIND-7 | EXISTING | tests/bindings.test.ts:152,160 |

### TYPE (18)

| REQ | Status | Evidence |
|---|---|---|
| TYPE-1 | EXISTING (p) | tests/type-grammar.test.ts:60,71 (`T[]` shorthand rejection unasserted) |
| TYPE-2 | EXISTING | tests/type-grammar.test.ts:88 |
| TYPE-3 | EXISTING (p) | tests/type-compat.test.ts:238,267,285 |
| TYPE-4 | JUSTIFIED | The "`⊑` ⇒ AJV-validates / AJV necessary-but-not-sufficient / parser authoritative" soundness property has no direct test; it is a meta-property over the whole relation, not a single observable diagnostic. Structural `⊑` cases are covered (TYPE-5..12). Recorded as a property-test gap, not a defect. |
| TYPE-5 | EXISTING | tests/type-compat.test.ts:76 |
| TYPE-6 | EXISTING | tests/type-compat.test.ts:92,100 |
| TYPE-7 | EXISTING | tests/type-compat.test.ts:117 |
| TYPE-8 | EXISTING | tests/type-compat.test.ts:135 |
| TYPE-9 | EXISTING | tests/type-compat.test.ts:154 |
| TYPE-10 | EXISTING | tests/type-compat.test.ts:170 |
| TYPE-11 | EXISTING | tests/type-compat.test.ts:197 |
| TYPE-12 | EXISTING | tests/type-compat.test.ts:215 |
| TYPE-13 | EXISTING (p) | tests/type-compat.test.ts:94,227 (contravariance / optional-field rejection unasserted) |
| TYPE-14 | EXISTING | tests/type-compat.test.ts:238,267,285,302 |
| TYPE-15 | EXISTING (p) | tests/type-compat.test.ts:318 (byte-identical-lowering pair unasserted) |
| TYPE-16 | EXISTING | tests/type-compat.test.ts:338; disc-unions-recursion.test.ts:220 |
| TYPE-17 | JUSTIFIED | Parse-time `⊑` skip on unresolvable operands (parse-invisible Pi-tool schema; `invoke` against `callee-has-errors`) requires a composition-level fixture (Pi-tool registry / cross-loom invoke) outside the offline parse surface; overlaps S3/S5. Runtime AJV net is the intended fallback. |
| TYPE-18 | EXISTING (p) | tests/type-grammar.test.ts:88 (per-position sameness unasserted) |

### RVM (13)

| REQ | Status | Evidence |
|---|---|---|
| RVM-1 | EXISTING (p) | tests/wire-name-translation.test.ts:47,121 (primitive-mapping rows unasserted) |
| RVM-2 | EXISTING | tests/runtime-value-model.test.ts:40 |
| RVM-3 | EXISTING | tests/runtime-value-model.test.ts:48; type-grammar.test.ts:107 |
| RVM-4 | EXISTING | tests/runtime-value-model.test.ts:59,72 |
| RVM-5 | EXISTING | tests/runtime-value-model.test.ts:63,80,84 |
| RVM-6 | EXISTING | tests/runtime-value-model.test.ts:91,107 |
| RVM-7 | EXISTING | tests/runtime-value-model.test.ts:87 |
| RVM-8 | EXISTING | tests/wire-name-translation.test.ts:41,58,164 |
| RVM-9 | EXISTING | tests/wire-name-translation.test.ts:76,103 |
| RVM-10 | EXISTING | tests/wire-name-translation.test.ts:143 |
| RVM-11 | EXISTING (p) | tests/wire-name-translation.test.ts:53,171 |
| RVM-12 | EXISTING (M4) | src/extension/capability-probe.ts:67,94,240 (Node ≥22.19.0 gate); spec runtime-value-model.md:45,47 |
| RVM-13 | EXISTING (M4) | src/parser/callable-set.ts (allowlist); tests/callable-set-runtime-enforcement.test.ts; spec runtime-value-model.md:53 |

## 4. Summary counts

- In-scope S1 requirements: **171**
- Covered by existing tests (incl. partials + 2 M4 inspection rows): **147**
- Newly covered by new passing tests: **7** (LEX-1, LEX-3, LEX-10, LEX-26, GRAM-2, EXPR-45, EXPR-47)
- **Total covered: 154 / 171**
- Findings (new red tests, spec-noncompliance): **8** (EXPR-7, EXPR-23, EXPR-34, EXPR-35, EXPR-41, EXPR-46, GRAM-16, LEX-16) — all `loom-defect` (6 `blocks-spec-compliance`, 2 `partial`)
- Uncovered-justified (no new test, reason recorded): **9** (GRAM-3, GRAM-11, GRAM-15, EXPR-4, EXPR-8, FUNC-12, FUNC-15, TYPE-4, TYPE-17)
- Deferred-appendix items asserted as shipped: **0** (none of the findings touch a Cluster-1 deferral)

Tally check: 147 existing + 7 new-pass + 8 findings + 9 uncovered-justified = 171. ✓

## 5. Findings headline (detail in findings/s1-language-core-findings.md)

Six spec-registry parse diagnostics (`unknown-identifier`, `unknown-method`,
`extra-object-field`, `bare-object-literal`, `mixed-plus-operands`,
`non-orderable-operands`) are **absent from `src/**`** — the corresponding
malformed looms load clean. Object-literal field validation
(`checkObjectLiteralFields`, src/parser/literal-sublanguage.ts:532) is
implemented but **never called in production** (isolated seam green, production
silent). An unparenthesised `fn` declaration and stray non-grammar punctuation
(`;`, mid-statement stray char) are silently accepted. The production type
layer is otherwise live (`if 1` correctly fires `non-boolean-condition` on the
same `parseLoomDocument` path), so these are per-check omissions, not a dead
layer. No `src/**` production code was modified (test/verify phase).
