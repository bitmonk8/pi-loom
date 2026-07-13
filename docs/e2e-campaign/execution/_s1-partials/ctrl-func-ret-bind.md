# S1 coverage partial — CTRL + FUNC + RET + BIND

Scope: `docs/e2e-campaign/analysis/spec-requirements.md` rows CTRL (209-217),
FUNC (221-238), RET (241-248), BIND (251-259). Deferred appendix Cluster-1
(1242-1258) reviewed: deferred = *features* (not-shipped), so REJECTION-diagnostic
rows that name a `loom/parse/...` code stay in scope and are mapped below.

`M1` = offline-unit seam test (parser/type/runtime seam, milestone-1 style).
`M2` = production / integration witness (production-conformance, type-layer
production, executor-at-real-hosts, invoke-depth-cycle). Every covered row cites
a `path:line` verified by reading the test body.

## AREA: CTRL (control-flow)

| REQ id | Covering test path:line | UNCOVERED / notes |
|---|---|---|
| REQ-CTRL-1 | `tests/whole-program-parser.test.ts:189` (if/else → IfStmt w/ else arm, cka-49); ternary is the expression form `tests/expression-evaluator.test.ts:128,176` | M1. if=statement-only + ternary=expression form both witnessed; braced-block body is implicit in IfStmt parse. No explicit "if in expression position rejected" test. |
| REQ-CTRL-2 | `tests/statement-executor.test.ts:367` (`for x in [...]` runs body per element w/ per-iteration `x` binding) | M2 executor witness. Per-iteration *immutable* freshness of the binding not asserted directly (see BIND-6). |
| REQ-CTRL-3 | `tests/control-flow.test.ts:134,146,156` (string/number/object iterand → non-array-iterand); prod `tests/type-layer-diagnostics-production.test.ts:101`; `tests/conformance/production-conformance.test.ts:359` | M1 + M2. Covered. |
| REQ-CTRL-4 | `tests/type-grammar.test.ts:181` (`[]` in a `for` iterand is not a sink → array-no-common-type; binding-annotation sink resolves) | M1. Covered. |
| REQ-CTRL-5 | `tests/control-flow.test.ts:54,80,101` (iterand evaluated once; effect commits once on empty array; mid-body `let mut` reassignment does not alter snapshot); executor `tests/statement-executor.test.ts:367` | M1 seam + M2 executor. Covered. |
| REQ-CTRL-6 | `tests/expression-evaluator.test.ts:265` (non-boolean `if`/`while` condition fires); prod `tests/type-layer-diagnostics-production.test.ts:79`; `tests/conformance/production-conformance.test.ts:353` | M1 + M2. Covered. `while` runtime loop witnessed `tests/statement-executor.test.ts:931`. |
| REQ-CTRL-7 | break-outside-loop `tests/control-flow.test.ts:182`; continue-outside-loop `tests/control-flow.test.ts:203` | M1. Covered (parse-phase seam). |
| REQ-CTRL-8 | break-with-value `tests/control-flow.test.ts:224`; break stops innermost loop `tests/statement-executor.test.ts:384`; continue skips iteration `tests/statement-executor.test.ts:404` | M1 seam + M2 executor. Covered. |

## AREA: FUNC (functions)

| REQ id | Covering test path:line | UNCOVERED / notes |
|---|---|---|
| REQ-FUNC-1 | `tests/statement-executor.test.ts:430` (body value = tail-expression value, FN-5 witness) | M2 executor. Covered. |
| REQ-FUNC-2 | nested-fn `tests/functions-and-return.test.ts:60` | M1. Covered. |
| REQ-FUNC-3 | function-as-value `tests/functions-and-return.test.ts:75` (name used as value fires; call-position clean `:88`) | M1. Covered. |
| REQ-FUNC-4 | mutual recursion `tests/functions-and-return.test.ts:96`, `tests/lexical-environment.test.ts:239`; cross-file `.warp fn` counts as frame `tests/invoke-depth-cycle.test.ts:96`; intra-file `fn` NOT countable `tests/invoke-depth-cycle.test.ts:193` | M1 + M2. Covered (both frame-accounting halves + hoisted mutual recursion). |
| REQ-FUNC-5 | doc preserved on AST `tests/functions-and-return.test.ts:114`; doc does NOT lower into provider payload `tests/functions-and-return.test.ts:126` | M1. Covered. |
| REQ-FUNC-6 | LUB of tail/`return` operands inferred `tests/functions-and-return.test.ts:143` (integer⊔number=number) | M1. Covered. |
| REQ-FUNC-7 | `?`-body wraps LUB in `Result<T,QueryError>` `tests/functions-and-return.test.ts:168`; `Result`-typed contribution forces wrap + payload LUB `tests/functions-and-return.test.ts:~200` | M1. Covered. |
| REQ-FUNC-8 | return-no-common-type `tests/functions-and-return.test.ts:218`; prod `tests/type-layer-diagnostics-production.test.ts:151` | M1 + M2. Covered. |
| REQ-FUNC-9 | explicit annotation type-checks operands, not infers `tests/functions-and-return.test.ts:242`; compatible operand `:263` | M1. Covered. |
| REQ-FUNC-10 | empty-tail body infers `null` literal `tests/functions-and-return.test.ts:286`; statement-terminated body yields literal null `tests/statement-executor.test.ts:443` | M1 + M2. Covered. |
| REQ-FUNC-11 | `?`-bearing empty-tail infers `Result<null,QueryError>` `tests/functions-and-return.test.ts:307` | M1. Covered. |
| REQ-FUNC-12 | — | UNCOVERED. No test for `let x = expr?` as last form returning `Ok(null)`. FN-4 empty-tail seam (`:307`) covers a generic `?`-body but not the specific `let ... = ...?`-tail-is-statement case. conformance-tier. |
| REQ-FUNC-13 | final value = tail / `return` operand `tests/statement-executor.test.ts:430,464`; function-result seam `tests/functions-and-return.test.ts` (functionResult success); invoke parent receives trailing Ok payload `tests/composition-producer.test.ts:409` | M2. Covered (final-value production). Subagent-boundary payload delivery only indirectly via composition-producer. |
| REQ-FUNC-14 | on fail/cancel no final value flows `tests/functions-and-return.test.ts` (functionResult "fail"/"cancel" → present:false); executor fail path `tests/statement-executor.test.ts:733`; cancel outcome `:978` | M1 + M2. Covered. |
| REQ-FUNC-15 | — | UNCOVERED. No test asserts an intra-file `fn` call *participates in the current conversation* (does not open a new one). `tests/invoke-cross-mode.test.ts:74` is the `invoke` prompt-mode attach case, not a plain `fn` call. Behaviourally important. |
| REQ-FUNC-16 | `void` function discards tail value → null `tests/functions-and-return.test.ts:328` (discardForVoid) | M1. Covered for discard. "drive turns without producing a value" end-to-end not separately witnessed. |

## AREA: RET (return)

| REQ id | Covering test path:line | UNCOVERED / notes |
|---|---|---|
| REQ-RET-1 | `return expr` short-circuits to operand, later statements do not run `tests/statement-executor.test.ts:464`; return is a statement (parsed in body) `tests/whole-program-parser.test.ts:216` | M2 executor. Covered. |
| REQ-RET-2 | operand type-checked against declared annotation `tests/functions-and-return.test.ts:242`; participates in inference when absent `tests/functions-and-return.test.ts:143` | M1. Covered. |
| REQ-RET-3 | bare-return-in-non-void (fn) `tests/functions-and-return.test.ts:339`; top-level bare return fires `tests/functions-and-return.test.ts:350`; legal in `void` `:363` | M1. Covered. |
| REQ-RET-4 | `return expr` exits body with operand (executeBody, top-level loom body path) `tests/statement-executor.test.ts:464` | M2, partial. Witnessed on the generic body executor; no test that is *specifically* a top-level `.loom` `return expr` exit distinct from a `fn`. Note: `tests/query-schema-resolve.test.ts:208` confirms top-level tail is not a return sink (adjacent behaviour). |
| REQ-RET-5 | unreachable-code after `return` warns (severity=warning) `tests/functions-and-return.test.ts:371`; no-code-after clean `:384` | M1. Covered. |
| REQ-RET-6 | `?` over Err propagates via early-return, carries Err payload, no final value `tests/statement-executor.test.ts:722` | M2 executor witness of the `return Err(e)` desugaring behaviour. No test naming the literal desugaring identity; behaviour witnessed. |

## AREA: BIND (bindings / mutability)

| REQ id | Covering test path:line | UNCOVERED / notes |
|---|---|---|
| REQ-BIND-1 | immutable-rebinding fires `tests/bindings.test.ts:51`; `let mut` reassignment clean (incl `+=`) `tests/bindings.test.ts:63`; prod `tests/whole-program-parser.test.ts:382` | M1 + M2. Covered. |
| REQ-BIND-2 | let-without-initialiser `tests/bindings.test.ts:171`; initialised clean `:185` | M1. Covered. |
| REQ-BIND-3 | reassignment accepted on `let mut` (incl `+=`) `tests/bindings.test.ts:63`; runtime reassign witness `tests/statement-executor.test.ts:943` | M1, partial. Plain `=` and `+=` covered; per-operator `-= *= /= %=` and the RHS-must-be-⊑-compatible type-check on reassignment are NOT asserted (only `let` RHS compat via `checkLetRhsCompat` `tests/type-compat.test.ts:101`). |
| REQ-BIND-4 | assignment-as-expression `tests/conformance/production-conformance.test.ts:346`; prod `tests/lexer-parser-diagnostics-production.test.ts:185` | M2. Covered (no dedicated M1 seam test found in `bindings.test.ts`). |
| REQ-BIND-5 | member assign `tests/bindings.test.ts:77`; index assign `tests/bindings.test.ts:90`; identifier target clean `:99` | M1. Covered. |
| REQ-BIND-6 | mut-on-immutable-context: fn-param `tests/bindings.test.ts:111`, for-var `:122`, match-bind `:131`; mut-on-discard `tests/lexer-parser-diagnostics-production.test.ts:172` | M1 (contexts) + M2 (discard). Covered. Note: `let _` discard-is-immutable is only witnessed via the `mut _` rejection, not a positive immutability assertion. |
| REQ-BIND-7 | increment-decrement `++` `tests/bindings.test.ts:152`, `--` `:160` | M1. Covered. |

## Behaviourally-important UNCOVERED reqs warranting NEW tests

- REQ-FUNC-12 — `let x = expr?` as the last form returns `Ok(null)` on the
  success path (statement-tail empty-tail rule interacting with `?`).
- REQ-FUNC-15 — an intra-file `fn` call participates in the loom's *current*
  conversation and does NOT open a new isolated conversation.
- REQ-RET-4 — a top-level `.loom` `return expr` (distinct from a `fn`) exits the
  loom with `expr` as its return value, exactly like a tail expression.
- REQ-BIND-3 — reassignment RHS `⊑`-compatibility type-check and the compound
  operators `-= *= /= %=` (only plain `=` / `+=` currently witnessed).
- REQ-FUNC-16 — a `void`-return function used to drive turns without producing a
  value (end-to-end drive, beyond the `discardForVoid` seam).
