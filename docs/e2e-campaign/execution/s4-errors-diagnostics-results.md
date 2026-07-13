# S4 (errors-diagnostics-cancellation-hard-ceilings) — execution results

Slice S4 areas: **ERR** (49 reqs), **DIAG** (191), **CANCEL** (31), **HC** (36) = 307.
Primary methods: M1 offline-unit (`parseLoomDocument`, `src/parser/loom-document.ts:563`)
+ M2 conformance. CWD `C:/UnitySrc/pi-loom`. Phase C: coverage-map + findings only.

Findings: `findings/s4-errors-diagnostics-findings.md` (FIND-S4-1..12).

## 1. Existing-suite results

`npx vitest run` over the 18 assigned S4 suites — **18 files / 191 tests, all pass**:

| Suite | tests | Suite | tests |
|---|---|---|---|
| terminal-outcomes | 6 | diagnostics-primitive | 7 |
| no-rollback | 8 | lexer-parser-diagnostics-production | 8 |
| runtime-panics | 28 | type-layer-diagnostics-production | 15 |
| queryerror-variants | 13 | frontmatter-diagnostics (frontmatter-*) | (in default) |
| unknown-reason-rule | 27 | code-registry | 5 |
| cancellation-core | 19 | production-cancellation-wiring | 4 |
| depth-enforcement | 7 | ceiling-arbitration | 6 |
| tool-calls-depth-ceiling | 4 | invoke-ceiling-depth | 5 |
| invoke-cancellation-facets | 5 | pre-evaluation-failures | 8 |
| err-note-render | 16 | | |

Full default suite (`npx vitest run`): 165/168 files pass; the 3 failing files are the
**S1** slice's own red witness tests (`tests/e2e-s1-expr-diagnostics.test.ts`,
`e2e-s1-lexer-intake.test.ts`, `e2e-s1-grammar-literal-sublang.test.ts`, 8 failures) —
NOT S4 files, and NOT caused by this slice. Six of those S1 failures assert the same
never-emitted parse/type codes as FIND-S4-1..6 (independent cross-witness).

## 2. New S4 tests

| File | tests | result | purpose |
|---|---|---|---|
| `tests/e2e-s4-uncovered-emitted-diagnostics.test.ts` | 8 | PASS | shape-asserting coverage (code+severity+registry-verbatim message) for 8 registry codes emitted by the parser but previously UNCOVERED: `loom/load/{unknown-mode-value,unknown-methodology-value,unknown-bind-context-value,params-null}`, `loom/parse/{import-non-warp-extension,system-on-prompt-mode,system-interp-not-path,system-interp-unknown-param}` |
| `tests/e2e-s4-never-emitted-diagnostics.test.ts` | 12 | PASS | 1 control + 10 `it.fails` witnesses for the NEVER-EMITTED codes (FIND-S4-1..10) + 1 characterization pin (binder_temperature → wrong code). `it.fails` passes while the defect persists and flips to failing once fixed (no silent skip). |

## 3. DIAG coverage map (full 171-code registry table)

Scope: all 171 registry codes (REQ-DIAG-21..191). `loom/typecheck/*` excluded per REQ-DIAG-14 (build-time `tsc` brands; no registry row). Sev/Phase columns are the registry-authoritative values (code-registry-{parse,load,runtime,host}.md). Emit site = src literal per `.s4-scratch/code-emit-sites.txt`; `ABSENT` = no code literal + no message literal in src/**. Asserting test = test that asserts the code fires with correct shape (`UNCOVERED` when only an allow-list/fixture or nothing references it, per `.s4-scratch/registry-not-asserted.txt`). Closed-set / stable-id / Message-normative invariants are enforced offline by `tests/code-registry.test.ts` + `tools/code-registry/index.js` (REQ-DIAG-2/3/4).

Status legend:
- **COVERED** — emitted in src AND a test asserts it fires with correct shape.
- **UNCOVERED-emitted** — emitted in src, no shape-asserting test.
- **NEVER-EMITTED** — registry code with no src literal and no message literal (control probe confirms no emission).
- **DORMANT-deferred** — emitted-capable but spec-documented as not firing in production under the loom 1.0 Pi-SDK pin (Cluster-4 appendix).

## (a) Complete 171-code table

| Campaign ID | Code | Sev | Phase | Emit site | Asserting test | Status |
|---|---|---|---|---|---|---|
| REQ-DIAG-189 | `loom/host/session-shutdown-pinned-constant-unreadable` | W | runtime | src/extension/unknown-reason-rule.ts:27 | unknown-reason-rule.test.ts | COVERED |
| REQ-DIAG-188 | `loom/host/session-shutdown-reason-unknown` | W | runtime | src/extension/unknown-reason-rule.ts:25 | unknown-reason-rule.test.ts | COVERED |
| REQ-DIAG-191 | `loom/host/session-shutdown-teardown-step-failed` | W | runtime | src/extension/session-shutdown.ts:47 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-190 | `loom/host/session-swap-instance-survived` | E | runtime | src/extension/session-swap-tripwire.ts:47 | UNCOVERED | DORMANT-deferred <br>_dormant: REQ-DIAG-190; Cluster-4 appendix (spec-requirements.md:1294) — Pi rebinds fresh instance on session-only swaps_ |
| REQ-DIAG-146 | `loom/load/argument-hint-not-displayed` | W | load | ABSENT | UNCOVERED | NEVER-EMITTED |
| REQ-DIAG-131 | `loom/load/bind-echo-without-params` | W | load | ABSENT | UNCOVERED | NEVER-EMITTED |
| REQ-DIAG-144 | `loom/load/binder-model-not-strict-capable` | E | load | src/binder/binder-model.ts:58 | fixtures/h7a/permitted-codes.json | DORMANT-deferred <br>_dormant: REQ-DIAG-144; Cluster-4 appendix (spec-requirements.md:1293) — strictCapable absent under SDK pin_ |
| REQ-DIAG-145 | `loom/load/binder-model-strict-capability-unknown` | W | load | src/binder/binder-model.ts:61 | fixtures/h7a/permitted-codes.json | COVERED |
| REQ-DIAG-142 | `loom/load/binder-model-unresolved` | E | load | src/binder/binder-model.ts:55 | fixtures/h7a/permitted-codes.json,pre-evaluation-failures.test.ts | COVERED |
| REQ-DIAG-147 | `loom/load/callee-has-errors` | E/W | load | src/extension/production-composition.ts:170 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-150 | `loom/load/case-collision` | W | load | src/discovery/discovery-walk.ts:74 | discovery-walk.test.ts | COVERED |
| REQ-DIAG-152 | `loom/load/cross-format-collision` | E | load | src/discovery/discovery-walk.ts:78 | discovery-walk.test.ts | COVERED |
| REQ-DIAG-151 | `loom/load/cross-source-shadow` | W | load | src/discovery/discovery-walk.ts:77 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-127 | `loom/load/deferred-frontmatter-field` | W | load | ABSENT | UNCOVERED | NEVER-EMITTED |
| REQ-DIAG-166 | `loom/load/discovery-slow` | W | load | src/discovery/package-discovery.ts:73 | package-discovery.test.ts | COVERED |
| REQ-DIAG-123 | `loom/load/extension-bootstrap-failed` | E | load | src/extension/factory.ts:63 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-130 | `loom/load/frontmatter-value-out-of-range` | E | load | src/parser/frontmatter.ts:422 | frontmatter-tool-loop-respond-repair.test.ts | COVERED |
| REQ-DIAG-124 | `loom/load/host-incompatible` | E | load | src/extension/production-composition.ts:159 | placeholder-rendering.test.ts,pre-evaluation-failures.test.ts | COVERED |
| REQ-DIAG-148 | `loom/load/import-cycle` | E | load | src/parser/imports.ts:422 | imports.test.ts | COVERED |
| REQ-DIAG-125 | `loom/load/invalid-encoding` | E | lex | src/lexer/lexer.ts:105 | diagnostics-primitive.test.ts,lexer-core.test.ts | COVERED |
| REQ-DIAG-162 | `loom/load/invalid-extension` | E | load | src/discovery/discovery-walk.ts:79 | conformance/production-conformance.test.ts,discovery-invalid-extension.test.ts | COVERED |
| REQ-DIAG-153 | `loom/load/invalid-slash-name` | E | load | src/discovery/discovery-walk.ts:76 | discovery-walk.test.ts | COVERED |
| REQ-DIAG-139 | `loom/load/invalid-tool-rename` | E | load | src/extension/production-composition.ts:168 | callable-set.test.ts | COVERED |
| REQ-DIAG-140 | `loom/load/invocation-cycle` | E | load | src/runtime/invoke-depth-cycle.ts:231 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-141 | `loom/load/invoke-path-escape` | E | load,runtime | src/runtime/invocation.ts:50 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-165 | `loom/load/manifest-escapes-package` | W | load | src/discovery/package-discovery.ts:72 | package-discovery.test.ts | COVERED |
| REQ-DIAG-164 | `loom/load/manifest-invalid` | E | load | src/discovery/package-discovery.ts:71 | package-discovery.test.ts | COVERED |
| REQ-DIAG-128 | `loom/load/missing-mode` | E | load | src/parser/frontmatter.ts:829 | frontmatter-contract.test.ts,pre-evaluation-failures.test.ts | COVERED |
| REQ-DIAG-154 | `loom/load/missing-source` | E/W | load | src/discovery/discovery-walk.ts:70 | diagnostics-primitive.test.ts,discovery-walk.test.ts | COVERED |
| REQ-DIAG-143 | `loom/load/model-unresolved` | E | load | src/parser/frontmatter.ts:857 | frontmatter-contract.test.ts | COVERED |
| REQ-DIAG-163 | `loom/load/non-canonical-extension` | W | load | src/discovery/discovery-walk.ts:75 | discovery-walk.test.ts | COVERED |
| REQ-DIAG-167 | `loom/load/package-read-timeout` | W | load | src/discovery/package-discovery.ts:74 | package-discovery.test.ts | COVERED |
| REQ-DIAG-129 | `loom/load/params-null` | E | load | src/parser/frontmatter.ts:937 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-137 | `loom/load/prompt-mode-callable` | E | load | src/extension/production-composition.ts:169 | callable-set.test.ts | COVERED |
| REQ-DIAG-169 | `loom/load/schema-slug-collision` | E | load | src/parser/schema-lowering.ts:322 | fixtures/h7a/permitted-codes.json,schema-lowering-hash.test.ts | COVERED |
| REQ-DIAG-160 | `loom/load/settings-invalid-entry` | E | load | src/discovery/settings.ts:140 | settings-merge.test.ts | COVERED |
| REQ-DIAG-159 | `loom/load/settings-invalid-json` | W | load | src/discovery/settings.ts:141 | settings-merge.test.ts | COVERED |
| REQ-DIAG-158 | `loom/load/settings-unreadable` | W | load | src/discovery/settings.ts:142 | settings-merge.test.ts | COVERED |
| REQ-DIAG-161 | `loom/load/settings-value-out-of-range` | E | load | src/discovery/settings.ts:139 | settings-merge.test.ts | COVERED |
| REQ-DIAG-138 | `loom/load/tool-name-collision` | E | load | src/extension/production-composition.ts:167 | callable-set.test.ts | COVERED |
| REQ-DIAG-168 | `loom/load/typed-query-unsupported-provider` | W | load | src/binder/provider-error-mapping.ts:61 | fixtures/h7a/permitted-codes.json | COVERED |
| REQ-DIAG-134 | `loom/load/unknown-bind-context-value` | E | load | src/parser/frontmatter.ts:920 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-126 | `loom/load/unknown-frontmatter-field` | W | load | src/parser/frontmatter.ts:816 | frontmatter-contract.test.ts | COVERED |
| REQ-DIAG-133 | `loom/load/unknown-methodology-value` | E | load | src/parser/frontmatter.ts:469 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-132 | `loom/load/unknown-mode-value` | E | load | src/parser/frontmatter.ts:904 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-135 | `loom/load/unknown-tool` | E | load | src/extension/production-composition.ts:166 | callable-set.test.ts,load-phase-pre-eval-routing.test.ts,pre-evaluation-failures.test.ts | COVERED |
| REQ-DIAG-157 | `loom/load/unreadable` | W | load | src/discovery/discovery-walk.ts:73 | discovery-walk.test.ts | COVERED |
| REQ-DIAG-155 | `loom/load/unreadable-source` | E/W | load | src/discovery/discovery-walk.ts:71 | discovery-walk.test.ts | COVERED |
| REQ-DIAG-136 | `loom/load/unresolvable-loom-path` | E | load | src/parser/callable-set.ts:308 | callable-set.test.ts | COVERED |
| REQ-DIAG-149 | `loom/load/unresolvable-warp-path` | E | load | src/parser/imports.ts:133 | imports.test.ts | COVERED |
| REQ-DIAG-156 | `loom/load/wrong-type-source` | E/W | load | src/discovery/discovery-walk.ts:72 | conformance/production-conformance.test.ts,discovery-invalid-extension.test.ts,discovery-walk.test.ts | COVERED |
| REQ-DIAG-100 | `loom/parse/ambiguous-discriminator` | E | parse | src/parser/schema-declarations.ts:508 | disc-unions-recursion.test.ts | COVERED |
| REQ-DIAG-50 | `loom/parse/array-element-type-mismatch` | E | type | src/parser/type-compat.ts:487 | type-compat.test.ts | COVERED |
| REQ-DIAG-51 | `loom/parse/array-no-common-type` | E | type | src/parser/type-compat.ts:509 | conformance/production-conformance.test.ts,type-compat.test.ts,type-grammar.test.ts,type-layer-diagnostics-production.test.ts | COVERED |
| REQ-DIAG-39 | `loom/parse/assignment-as-expression` | E | parse | src/parser/loom-document.ts:2514 | conformance/production-conformance.test.ts,lexer-parser-diagnostics-production.test.ts | COVERED |
| REQ-DIAG-40 | `loom/parse/assignment-to-member-or-index` | E | parse | src/parser/bindings.ts:125 | bindings.test.ts | COVERED |
| REQ-DIAG-56 | `loom/parse/bare-object-literal` | E | parse | ABSENT | UNCOVERED | NEVER-EMITTED |
| REQ-DIAG-86 | `loom/parse/bare-return-in-non-void` | E | type | src/parser/functions.ts:389 | functions-and-return.test.ts | COVERED |
| REQ-DIAG-112 | `loom/parse/bind-context-session-on-subagent` | W | parse | src/parser/frontmatter.ts:841 | bind-context-transcript.test.ts | COVERED |
| REQ-DIAG-113 | `loom/parse/bind-echo-on-bypass` | W | parse | ABSENT | UNCOVERED | NEVER-EMITTED |
| REQ-DIAG-29 | `loom/parse/binding-case-mismatch` | E | parse | src/lexer/lexer.ts:805 | code-registry.test.ts,diagnostics-primitive.test.ts,lexer-core.test.ts | COVERED |
| REQ-DIAG-33 | `loom/parse/block-comment` | E | lex | src/lexer/lexer.ts:408 | lexer-core.test.ts | COVERED |
| REQ-DIAG-72 | `loom/parse/break-outside-loop` | E | parse | src/parser/control-flow.ts:96 | control-flow.test.ts | COVERED |
| REQ-DIAG-74 | `loom/parse/break-with-value` | E | parse | src/parser/control-flow.ts:106 | control-flow.test.ts | COVERED |
| REQ-DIAG-64 | `loom/parse/by-on-object-schema` | E | parse | src/parser/schema-declarations.ts:641 | disc-unions-recursion.test.ts | COVERED |
| REQ-DIAG-45 | `loom/parse/comparison-chaining` | E | parse | src/parser/loom-document.ts:2060 | conformance/production-conformance.test.ts,lexer-parser-diagnostics-production.test.ts | COVERED |
| REQ-DIAG-73 | `loom/parse/continue-outside-loop` | E | parse | src/parser/control-flow.ts:139 | control-flow.test.ts | COVERED |
| REQ-DIAG-57 | `loom/parse/default-not-literal` | E | parse | src/parser/literal-sublanguage.ts:68 | params-defaults.test.ts,type-grammar.test.ts | COVERED |
| REQ-DIAG-77 | `loom/parse/discarded-query-result` | E | parse | src/runtime/query-discard.ts:48 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-65 | `loom/parse/doc-comment-misplaced` | E | parse | src/parser/descriptions.ts:157 | descriptions.test.ts,whole-program-parser.test.ts | COVERED |
| REQ-DIAG-102 | `loom/parse/duplicate-discriminator-value` | E | parse | src/parser/schema-declarations.ts:606 | disc-unions-recursion.test.ts | COVERED |
| REQ-DIAG-96 | `loom/parse/duplicate-enum-value` | E | parse | src/parser/schema-declarations.ts:250 | schema-declarations.test.ts | COVERED |
| REQ-DIAG-97 | `loom/parse/duplicate-enum-variant-name` | E | parse | src/parser/schema-declarations.ts:204 | schema-declarations.test.ts | COVERED |
| REQ-DIAG-93 | `loom/parse/empty-enum-body` | E | parse | src/parser/schema-declarations.ts:185 | schema-declarations.test.ts | COVERED |
| REQ-DIAG-92 | `loom/parse/empty-schema-body` | E | parse | src/parser/schema-declarations.ts:76 | schema-declarations.test.ts | COVERED |
| REQ-DIAG-78 | `loom/parse/empty-template` | W | parse | src/render/query-render.ts:77 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-80 | `loom/parse/explicit-schema-mismatch` | W | parse | src/parser/query-schema-inference.ts:201 | query-schema-resolve.test.ts | COVERED |
| REQ-DIAG-54 | `loom/parse/extra-object-field` | E | parse | ABSENT | UNCOVERED | NEVER-EMITTED |
| REQ-DIAG-119 | `loom/parse/fn-arg-type-mismatch` | E | type | src/parser/type-compat.ts:441 | type-compat.test.ts | COVERED |
| REQ-DIAG-89 | `loom/parse/function-as-value` | E | parse | src/parser/functions.ts:117 | functions-and-return.test.ts | COVERED |
| REQ-DIAG-66 | `loom/parse/generic-arity-mismatch` | E | parse | src/parser/type-grammar.ts:351 | type-grammar.test.ts | COVERED |
| REQ-DIAG-21 | `loom/parse/illegal-escape` | E | lex | src/lexer/lexer.ts:446 | diagnostics-primitive.test.ts,literals-and-paths.test.ts | COVERED |
| REQ-DIAG-75 | `loom/parse/illegal-template-escape` | E | lex | src/render/query-render.ts:73 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-38 | `loom/parse/immutable-rebinding` | E | parse | src/parser/bindings.ts:94 | bindings.test.ts,whole-program-parser.test.ts | COVERED |
| REQ-DIAG-115 | `loom/parse/import-name-collision` | E | parse | src/parser/imports.ts:284 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-28 | `loom/parse/import-non-warp-extension` | E | parse | src/lexer/literals.ts:92 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-116 | `loom/parse/import-unknown-symbol` | E | parse | src/parser/imports.ts:283 | diagnostics-primitive.test.ts,imports.test.ts | COVERED |
| REQ-DIAG-43 | `loom/parse/increment-decrement` | E | parse | src/parser/bindings.ts:185 | bindings.test.ts | COVERED |
| REQ-DIAG-99 | `loom/parse/inline-enum` | E | parse | src/parser/schema-declarations.ts:278 | schema-declarations.test.ts | COVERED |
| REQ-DIAG-35 | `loom/parse/integer-literal-out-of-range` | E | lex | src/lexer/lexer.ts:631 | literals-and-paths.test.ts | COVERED |
| REQ-DIAG-34 | `loom/parse/integer-narrowing` | E | type | src/lexer/literals.ts:125 | literals-and-paths.test.ts,type-compat.test.ts,type-layer-diagnostics-production.test.ts | COVERED |
| REQ-DIAG-79 | `loom/parse/interpolated-result` | E | type | src/render/query-render.ts:79 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-25 | `loom/parse/invalid-path-separator` | E | lex | src/lexer/literals.ts:76 | diagnostics-primitive.test.ts,literals-and-paths.test.ts | COVERED |
| REQ-DIAG-22 | `loom/parse/invalid-unicode-escape` | E | lex | src/lexer/lexer.ts:488 | literals-and-paths.test.ts | COVERED |
| REQ-DIAG-117 | `loom/parse/invoke-arg-type-mismatch` | E | type | src/parser/invoke-diagnostics.ts:59 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-121 | `loom/parse/invoke-arity-too-few` | E | parse | src/parser/invoke-diagnostics.ts:66 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-122 | `loom/parse/invoke-arity-too-many` | E | parse | src/parser/invoke-diagnostics.ts:69 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-27 | `loom/parse/invoke-non-loom-extension` | E | parse | src/lexer/literals.ts:101 | literals-and-paths.test.ts | COVERED |
| REQ-DIAG-120 | `loom/parse/invoke-return-type-mismatch` | E | type | src/parser/invoke-diagnostics.ts:63 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-62 | `loom/parse/let-rhs-type-mismatch` | E | type | src/parser/type-compat.ts:403 | type-compat.test.ts | COVERED |
| REQ-DIAG-61 | `loom/parse/let-without-initialiser` | E | parse | src/parser/bindings.ts:60 | bindings.test.ts | COVERED |
| REQ-DIAG-23 | `loom/parse/literal-newline-in-string` | E | lex | src/lexer/lexer.ts:517 | lexer-parser-diagnostics-production.test.ts | COVERED |
| REQ-DIAG-81 | `loom/parse/match-arm-type-mismatch` | E | type | src/parser/match-result.ts:200 | match-result.test.ts,type-layer-diagnostics-production.test.ts | COVERED |
| REQ-DIAG-84 | `loom/parse/match-guard-not-supported` | E | parse | src/parser/loom-document.ts:2356 | lexer-parser-diagnostics-production.test.ts | COVERED |
| REQ-DIAG-101 | `loom/parse/missing-discriminator` | E | parse | src/parser/schema-declarations.ts:534 | disc-unions-recursion.test.ts | COVERED |
| REQ-DIAG-55 | `loom/parse/missing-object-field` | E | parse | src/parser/literal-sublanguage.ts:543 | type-grammar.test.ts | COVERED |
| REQ-DIAG-46 | `loom/parse/mixed-plus-operands` | E | type | ABSENT | UNCOVERED | NEVER-EMITTED |
| REQ-DIAG-42 | `loom/parse/mut-on-discard` | E | parse | src/parser/loom-document.ts:1327 | lexer-parser-diagnostics-production.test.ts | COVERED |
| REQ-DIAG-41 | `loom/parse/mut-on-immutable-context` | E | parse | src/parser/bindings.ts:161 | bindings.test.ts | COVERED |
| REQ-DIAG-103 | `loom/parse/nested-discriminator` | E | parse | src/parser/schema-declarations.ts:556 | disc-unions-recursion.test.ts | COVERED |
| REQ-DIAG-88 | `loom/parse/nested-fn` | E | parse | src/parser/functions.ts:83 | functions-and-return.test.ts | COVERED |
| REQ-DIAG-71 | `loom/parse/non-array-iterand` | E | type | src/parser/control-flow.ts:61 | conformance/production-conformance.test.ts,control-flow.test.ts,type-layer-diagnostics-production.test.ts | COVERED |
| REQ-DIAG-44 | `loom/parse/non-boolean-condition` | E | type | src/runtime/expression-evaluator.ts:599 | conformance/production-conformance.test.ts,expression-evaluator.test.ts,type-layer-diagnostics-production.test.ts | COVERED |
| REQ-DIAG-48 | `loom/parse/non-indexable-receiver` | E | type | src/runtime/expression-evaluator.ts:627 | conformance/production-conformance.test.ts,type-layer-diagnostics-production.test.ts | COVERED |
| REQ-DIAG-47 | `loom/parse/non-orderable-operands` | E | type | ABSENT | UNCOVERED | NEVER-EMITTED |
| REQ-DIAG-53 | `loom/parse/non-string-array-join` | E | type | src/runtime/stdlib-array.ts:102 | expression-stdlib-array.test.ts,type-layer-diagnostics-production.test.ts | COVERED |
| REQ-DIAG-104 | `loom/parse/non-string-discriminator` | E | parse | src/parser/schema-declarations.ts:591 | disc-unions-recursion.test.ts | COVERED |
| REQ-DIAG-98 | `loom/parse/non-string-enum-value` | E | parse | src/parser/schema-declarations.ts:219 | schema-declarations.test.ts | COVERED |
| REQ-DIAG-49 | `loom/parse/non-string-object-index` | E | type | src/runtime/stdlib-object.ts:62 | type-layer-diagnostics-production.test.ts | COVERED |
| REQ-DIAG-58 | `loom/parse/non-trailing-default` | E | parse | src/parser/params.ts:155 | params-defaults.test.ts | COVERED |
| REQ-DIAG-36 | `loom/parse/number-literal-not-finite` | E | lex | src/lexer/lexer.ts:639 | literals-and-paths.test.ts | COVERED |
| REQ-DIAG-83 | `loom/parse/question-on-non-result` | E | type | src/parser/match-result.ts:82 | conformance/production-conformance.test.ts,match-result.test.ts,type-layer-diagnostics-production.test.ts | COVERED |
| REQ-DIAG-82 | `loom/parse/question-outside-result-fn` | E | type | src/parser/match-result.ts:128 | match-result.test.ts,type-layer-diagnostics-production.test.ts | COVERED |
| REQ-DIAG-90 | `loom/parse/redundant-wire-name` | W | parse | src/parser/schema-declarations.ts:90 | schema-declarations.test.ts | COVERED |
| REQ-DIAG-31 | `loom/parse/reserved-keyword-as-identifier` | E | parse | src/lexer/lexer.ts:790 | lexer-core.test.ts | COVERED |
| REQ-DIAG-85 | `loom/parse/rest-pattern-not-supported` | E | parse | src/parser/loom-document.ts:2487 | lexer-parser-diagnostics-production.test.ts | COVERED |
| REQ-DIAG-68 | `loom/parse/result-in-schema-position` | E | parse | src/parser/type-grammar.ts:360 | schema-subset-gate.test.ts,type-grammar.test.ts | COVERED |
| REQ-DIAG-52 | `loom/parse/return-no-common-type` | E | type | src/parser/functions.ts:319 | functions-and-return.test.ts,type-layer-diagnostics-production.test.ts | COVERED |
| REQ-DIAG-30 | `loom/parse/schema-case-mismatch` | E | parse | src/lexer/lexer.ts:813 | committed-fixture-parse-gate.test.ts,lexer-core.test.ts | COVERED |
| REQ-DIAG-32 | `loom/parse/single-line-if` | E | parse | src/lexer/lexer.ts:874 | lexer-core.test.ts | COVERED |
| REQ-DIAG-63 | `loom/parse/statement-in-arm-body` | E | parse | src/parser/loom-document.ts:2433 | conformance/production-conformance.test.ts,lexer-parser-diagnostics-production.test.ts | COVERED |
| REQ-DIAG-26 | `loom/parse/stray-backslash` | E | lex | src/lexer/lexer.ts:548 | lexer-core.test.ts | COVERED |
| REQ-DIAG-109 | `loom/parse/system-interp-bad-field` | E | parse | src/parser/system-interpolation.ts:61 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-107 | `loom/parse/system-interp-not-path` | E | parse | src/parser/system-interpolation.ts:56 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-108 | `loom/parse/system-interp-unknown-param` | E | parse | src/parser/system-interpolation.ts:59 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-110 | `loom/parse/system-interp-unterminated` | E | parse | src/parser/system-interpolation.ts:64 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-106 | `loom/parse/system-on-prompt-mode` | E | parse | src/parser/system-interpolation.ts:54 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-111 | `loom/parse/timeout-field-rejected` | E | parse | src/parser/frontmatter.ts:805 | frontmatter-contract.test.ts | COVERED |
| REQ-DIAG-60 | `loom/parse/tool-arg-arity` | E | parse | src/runtime/tool-call.ts:141 | tool-calls.test.ts | COVERED |
| REQ-DIAG-59 | `loom/parse/tool-arg-not-literal` | E | parse | src/parser/literal-sublanguage.ts:69 | tool-calls.test.ts,type-grammar.test.ts | COVERED |
| REQ-DIAG-118 | `loom/parse/tool-arg-type-mismatch` | E | type | src/runtime/tool-call.ts:178 | tool-calls.test.ts | COVERED |
| REQ-DIAG-105 | `loom/parse/type-alias-cycle` | E | parse | src/parser/schema-declarations.ts:704 | disc-unions-recursion.test.ts | COVERED |
| REQ-DIAG-69 | `loom/parse/unknown-identifier` | E | parse | ABSENT | UNCOVERED | NEVER-EMITTED |
| REQ-DIAG-70 | `loom/parse/unknown-method` | E | parse | ABSENT | UNCOVERED | NEVER-EMITTED |
| REQ-DIAG-94 | `loom/parse/unknown-variant` | E | parse | src/parser/schema-declarations.ts:310 | schema-declarations.test.ts | COVERED |
| REQ-DIAG-87 | `loom/parse/unreachable-code` | W | parse | src/parser/functions.ts:422 | functions-and-return.test.ts | COVERED |
| REQ-DIAG-95 | `loom/parse/unresolved-named-type` | E | parse | src/parser/params.ts:133 | params-defaults.test.ts | COVERED |
| REQ-DIAG-37 | `loom/parse/unsupported-feature` | E | parse | src/lexer/lexer.ts:610 | literals-and-paths.test.ts,schema-subset-gate.test.ts | COVERED |
| REQ-DIAG-24 | `loom/parse/unterminated-string` | E | lex | src/lexer/lexer.ts:525 | code-registry.test.ts,conformance/production-conformance.test.ts,diagnostics-primitive.test.ts,lexer-parser-diagnostics-production.test.ts | COVERED |
| REQ-DIAG-76 | `loom/parse/unterminated-template` | E | lex | src/render/query-render.ts:75 | pre-evaluation-failures.test.ts | COVERED |
| REQ-DIAG-67 | `loom/parse/void-in-non-return-position` | E | parse | src/parser/type-grammar.ts:337 | type-grammar.test.ts | COVERED |
| REQ-DIAG-114 | `loom/parse/warp-top-level-statement` | E | parse | src/parser/imports.ts:33 | diagnostics-primitive.test.ts,imports.test.ts | COVERED |
| REQ-DIAG-91 | `loom/parse/wire-name-collision` | E | parse | src/parser/schema-declarations.ts:131 | diagnostics-primitive.test.ts,schema-declarations.test.ts | COVERED |
| REQ-DIAG-183 | `loom/runtime/active-set-restore-failed` | E | runtime | src/runtime/tool-registration.ts:32 | tool-registration-lifetime.test.ts | COVERED |
| REQ-DIAG-184 | `loom/runtime/cancelled-by-session-shutdown` | E | runtime | src/extension/session-shutdown.ts:50 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-186 | `loom/runtime/custom-type-unsafe` | E | runtime | src/binder/compact-transcript.ts:57 | bind-context-transcript.test.ts,fixtures/h7a/golden-diagnostics.json,fixtures/h7a/permitted-codes.json | COVERED |
| REQ-DIAG-171 | `loom/runtime/index-out-of-bounds` | E | runtime | src/runtime/runtime-panics.ts:41 | runtime-event-channel.test.ts,runtime-panics.test.ts,subagent-drive-teardown.test.ts | COVERED |
| REQ-DIAG-179 | `loom/runtime/internal-error` | E | runtime | src/runtime/active-invocation-registry.ts:242 | acceptance/noninteractive-acceptance.test.ts,active-invocation-registry.test.ts,fixtures/h7a/permitted-codes.json,prompt-transport-mapping.test.ts,subagent-drive-teardown.test.ts,tool-calls-off-surface-live-wiring.test.ts,tool-calls-off-surface-routing.test.ts,tool-return-shape-one-note-production-wired.test.ts | COVERED |
| REQ-DIAG-175 | `loom/runtime/invoke-depth-exceeded` | E | runtime | src/runtime/runtime-panics.ts:45 | runtime-panics.test.ts | COVERED |
| REQ-DIAG-170 | `loom/runtime/match-error` | E | runtime | src/runtime/match-result.ts:29 | code-registry.test.ts,match-result.test.ts,runtime-panics.test.ts | COVERED |
| REQ-DIAG-174 | `loom/runtime/missing-object-key` | E | runtime | src/runtime/runtime-panics.ts:42 | runtime-panics.test.ts | COVERED |
| REQ-DIAG-173 | `loom/runtime/null-index-access` | E | runtime | src/runtime/runtime-panics.ts:43 | runtime-panics.test.ts | COVERED |
| REQ-DIAG-172 | `loom/runtime/null-member-access` | E | runtime | src/runtime/runtime-panics.ts:44 | runtime-panics.test.ts | COVERED |
| REQ-DIAG-181 | `loom/runtime/registration-cache-collision` | E | runtime | src/runtime/tool-registration.ts:33 | fixtures/h7a/permitted-codes.json,tool-registration-lifetime.test.ts | COVERED |
| REQ-DIAG-177 | `loom/runtime/registry-swap-failed` | E | runtime | src/extension/reload-wiring.ts:275 | registration-reload-wiring.test.ts | COVERED |
| REQ-DIAG-185 | `loom/runtime/reload-teardown-timeout` | E | runtime | src/extension/session-shutdown.ts:48 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-180 | `loom/runtime/subagent-dispose-failure` | E | runtime | src/runtime/subagent-isolation.ts:439 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-187 | `loom/runtime/subagent-model-unresolved` | E | runtime | src/runtime/subagent-isolation.ts:88 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-176 | `loom/runtime/system-note-delivery-failed` | E | runtime | src/extension/system-note-channel.ts:30 | UNCOVERED | UNCOVERED-emitted |
| REQ-DIAG-182 | `loom/runtime/validator-cache-collision` | E | runtime | src/seams/schema-validator.ts:132 | fixtures/h7a/permitted-codes.json,schema-validator-seam.test.ts | COVERED |
| REQ-DIAG-178 | `loom/runtime/watcher-terminated` | E | runtime | src/extension/watcher-recovery.ts:40 | watcher-terminated-recovery.test.ts | COVERED |
## (b) NEVER-EMITTED findings

10 registry codes have no src literal and no message literal; a `parseLoomDocument` probe emits nothing for their triggers while controls fire correctly (orchestrator-verified). None appear in the Cluster-4 Deferred appendix (spec-requirements.md:1282-1296), so none is a sanctioned deferral. Each is therefore a loom-defect: the spec mandates the code and its firing site, but the implementation never emits it.

| # | Code | Sev | REQ / spec citation | Verdict |
|---|---|---|---|---|
| 1 | `loom/parse/unknown-identifier` | E | REQ-DIAG-69; code-registry-parse.md:59 ("Bare identifier in call or value position resolves to nothing in scope"), expressions.md §Identifier resolution | loom-defect |
| 2 | `loom/parse/unknown-method` | E | REQ-DIAG-70; code-registry-parse.md:60; REQ-EXPR-23 ("parse error, not a runtime failure") | loom-defect |
| 3 | `loom/parse/mixed-plus-operands` | E | REQ-DIAG-46; code-registry-parse.md:36 (`+` on mixed number/string operands) | loom-defect |
| 4 | `loom/parse/non-orderable-operands` | E | REQ-DIAG-47; code-registry-parse.md:37 (`<`/`<=`/`>`/`>=` on non-orderable pair) | loom-defect |
| 5 | `loom/parse/extra-object-field` | E | REQ-DIAG-54; code-registry-parse.md:44 (schema constructor lists undeclared field) | loom-defect |
| 6 | `loom/parse/bare-object-literal` | E | REQ-DIAG-56; code-registry-parse.md:46 (bare `{...}` outside the two carve-outs) | loom-defect |
| 7 | `loom/parse/bind-echo-on-bypass` | W | REQ-DIAG-113; code-registry-parse.md:103 (`bind_echo: true` on single-string-bypass loom) | loom-defect |
| 8 | `loom/load/bind-echo-without-params` | W | REQ-DIAG-131; code-registry-load.md:17 (`bind_echo: true` on no-params loom) | loom-defect |
| 9 | `loom/load/argument-hint-not-displayed` | W | REQ-DIAG-146; code-registry-load.md:32 (`argument-hint:` without `description:`) | loom-defect |
| 10 | `loom/load/deferred-frontmatter-field` | W | REQ-DIAG-127; code-registry-load.md:13 (field reserved for a deferred feature) | loom-defect |

Notes:
- #1/#2 are core name/method resolution diagnostics; their absence means an author writing an unknown identifier or method gets no `loom/parse/*` diagnostic (REQ-EXPR-23 requires `unknown-method` be a parse error, not a runtime failure).
- #3/#4/#5/#6 are core parse/type gates; their absence means malformed `+`/ordering/object-construction source is not rejected at the documented site.
- #10 is corroborated structurally: `src/parser/frontmatter.ts` (routing at :816) has only a `LOOM_1_0_FIELDS` recognised set and routes every other key to `loom/load/unknown-frontmatter-field`; there is **no** deferred/reserved-field set, so a reserved key (e.g. `binder_temperature`) wrongly yields `loom/load/unknown-frontmatter-field` instead of the mandated `loom/load/deferred-frontmatter-field`.
- #7/#8/#9 are W-severity advisory diagnostics; still spec-mandated, still never emitted.

## (b.2) Borderline finding — retired code present as src constant

`loom/host/session-shutdown-runtime-degraded` is declared as a src constant `RUNTIME_DEGRADED_CODE` (src/extension/session-shutdown.ts:51) and referenced in a type union (session-shutdown.ts:313) and comments (session-shutdown.ts:468, session-swap-tripwire.ts:7,110), but is **never pushed / emitted**. It is **not** in the registry (`.s4-scratch/src-not-in-registry.txt`) because it was RETIRED per `pi-integration-contract/session-only-degraded-state.md:3` (the `governed-by-rebind` resolution excised the degraded-state branch; the diagnostic row was retired and replaced by the `loom/host/session-swap-instance-survived` fail-fast tripwire).

Verdict: **borderline** — a vestigial dead constant for a retired code. Not a registry-coverage gap (the code is intentionally absent from the registry) and not emitted, so it cannot mislead runtime output; but it is dead surface that a closed-set audit gate could flag. Severity: N/A (not a registry code). Recommendation: remove the constant + type-union arm; no production behaviour change.

## (c) Shape-verification sample (15 COVERED codes)

Spot-checked the emit-site code + message literal against the registry Message column (verbatim, `<…>` interpolated). All 15 match.

| Code | Emit site | Registry Message | Emitted literal | Match |
|---|---|---|---|---|
| `loom/parse/illegal-escape` | lexer.ts:449 / :501 | `illegal escape sequence: \<char>` | :501 `` `illegal escape sequence: \${e}` ``; :449 `"illegal escape sequence: \"` (EOF/EOL char-absent carve-out) | ✓ (:501 exact; :449 is the documented no-`<char>` dangling-backslash branch) |
| `loom/parse/unterminated-string` | lexer.ts:525 | `unterminated string literal` | `"unterminated string literal"` | ✓ |
| `loom/parse/non-boolean-condition` | expression-evaluator.ts:599 | `condition must be boolean; got <type>` | `` `condition must be boolean; got ${displayCompatType(operandType)}` `` | ✓ |
| `loom/parse/empty-schema-body` | schema-declarations.ts:76 | `'<X>' has no fields; an empty schema cannot be validated.` | `` `'${decl.name}' has no fields; an empty schema cannot be validated.` `` | ✓ |
| `loom/parse/warp-top-level-statement` | imports.ts:33 | `top-level statement not permitted in .warp file; move into a fn body` | const = same string | ✓ |
| `loom/load/missing-mode` | frontmatter.ts:829 | `frontmatter is missing required field 'mode:'` | `"frontmatter is missing required field 'mode:'"` (sev error ✓) | ✓ |
| `loom/load/unknown-frontmatter-field` | frontmatter.ts:816 | `unknown frontmatter field '<field>'` | `` `unknown frontmatter field '${key}'` `` (sev warning ✓) | ✓ |
| `loom/load/case-collision` | discovery-walk.ts:74 (msg :488) | `case-insensitive filename collision in <source>: '<path-a>' and '<path-b>'` | `` `case-insensitive filename collision in ${winner.sourceLabel}: '${sorted[0].path}' and '${sorted[1].path}'` `` | ✓ |
| `loom/load/settings-invalid-json` | settings.ts:141 (msg :325) | `settings file '<path>' is not valid UTF-8 JSON` | `` `settings file '${path}' is not valid UTF-8 JSON` `` | ✓ |
| `loom/load/host-incompatible` | production-composition.ts:159 | `host incompatible (<kind>): observed <observed>, required <required>` | routed via production-composition; message assembled per placeholder-rendering-b §host-incompatible-observed-required | ✓ (structure matches; REQ-DIAG-18 substrings) |
| `loom/runtime/match-error` | match-result.ts:29 (msg :159) | `MatchError: no arm matched <scrutinee summary>` | `` `MatchError: no arm matched ${summariseScrutinee(scrutinee)}` `` | ✓ |
| `loom/runtime/index-out-of-bounds` | runtime-panics.ts:41 (msg :136) | `index out of bounds: <i> not in 0..<length>` | `` `index out of bounds: ${renderInteger(i)} not in 0..${renderInteger(target.length)}` `` | ✓ |
| `loom/runtime/invoke-depth-exceeded` | runtime-panics.ts:45 (msg :192) | `invoke chain depth exceeded: <depth> > 32` | `` `invoke chain depth exceeded: ${renderInteger(nextDepth)} > ${INVOKE_DEPTH_CAP}` `` | ✓ |
| `loom/runtime/watcher-terminated` | watcher-recovery.ts:40 (msg :49) | `loom watcher terminated; hot-reload halted until /reload` | const = same string | ✓ |
| `loom/host/session-shutdown-reason-unknown` | unknown-reason-rule.ts:25 (msg :298) | `session_shutdown event.reason outside closed set: <observed>` | `` `session_shutdown event.reason outside closed set: ${observed}` `` (sev W ✓) | ✓ |

No mismatches. Only note: `loom/parse/illegal-escape` has two emit branches — the char-interpolating branch (:501, exact) and the dangling-backslash EOF/EOL branch (:449) whose message omits `<char>` because no offending char exists; this is the intended char-absent form, not a divergence from the normative template.

## (d) Summary counts

| Status | Count |
|---|---|
| COVERED | 129 |
| UNCOVERED-emitted | 30 |
| NEVER-EMITTED | 10 |
| DORMANT-deferred | 2 |
| **Total** | **171** |

- **DORMANT-deferred (2):** `loom/load/binder-model-not-strict-capable` (REQ-DIAG-144; emit binder-model.ts:58; dormant under SDK pin — `binder-model-strict-capability-unknown` W fires instead) and `loom/host/session-swap-instance-survived` (REQ-DIAG-190; emit session-swap-tripwire.ts:47; fail-fast tripwire dormant on every conformant Pi minor).
- **UNCOVERED-emitted (30):** codes emitted in src with no shape-asserting test — `session-shutdown-teardown-step-failed`, `callee-has-errors`, `cross-source-shadow`, `extension-bootstrap-failed`, `invocation-cycle`, `invoke-path-escape`, `params-null`, `unknown-bind-context-value`, `unknown-methodology-value`, `unknown-mode-value`, `discarded-query-result`, `empty-template`, `illegal-template-escape`, `import-name-collision`, `import-non-warp-extension`, `interpolated-result`, `invoke-arg-type-mismatch`, `invoke-arity-too-few`, `invoke-arity-too-many`, `invoke-return-type-mismatch`, `system-interp-bad-field`, `system-interp-not-path`, `system-interp-unknown-param`, `system-interp-unterminated`, `system-on-prompt-mode`, `cancelled-by-session-shutdown`, `reload-teardown-timeout`, `subagent-dispose-failure`, `subagent-model-unresolved`, `system-note-delivery-failed`.
- **Coverage caveat:** two COVERED codes rest only on the h7a `fixtures/h7a/permitted-codes.json` allow-list (`binder-model-strict-capability-unknown`, `typed-query-unsupported-provider`) rather than a dedicated fire+shape assertion; treated COVERED per orchestrator's `registry-not-asserted.txt` but the assertion is weaker than a direct shape test.
- **Retired-code borderline (1, not counted in 171):** `loom/host/session-shutdown-runtime-degraded` — dead src constant for a retired code (§b.2).

## 4. ERR / CANCEL / HC coverage map


Scope: Cluster-4 areas ERR (`REQ-ERR-1..49`), CANCEL (`REQ-CANCEL-1..31`), HC
(`REQ-HC-1..36`). Spec rows: `docs/e2e-campaign/analysis/spec-requirements.md:559-611`
(ERR), `:807-841` (CANCEL), `:842-882` (HC). Deferred appendix:
`docs/e2e-campaign/analysis/spec-requirements.md:1282-1296`.

Method: every covering test body was opened (Read + grep) and the assertion inspected —
a row is COVERED only where a test body actually asserts the behaviour, not inferred from
filename. `(partial)` = core behaviour asserted, one enumerated sub-clause not.
Entry points per `docs/e2e-campaign/analysis/code-surface.md §2`: `parseLoomDocument`
offline (`src/parser/loom-document.ts:563`); harness `loadExtension` + `ResponseProgrammer`
(`tests/harness/`); `runProductionLoad`/`runSource` conformance
(`tests/conformance/production-conformance.test.ts`); `QueryModelDriver` seam
(`src/runtime/query-tool-loop.ts:119`).

`[adjacent]` = covering test outside the primary inspection list, confirmed by grep.
M1 = offline/pure-parse candidate test; M2 = conformance/harness/production candidate test;
M3 = surfacing behaviour requiring the scripted driver seam.

---

## Table 1 — ERR (errors-and-results)

| Campaign ID | One-line behaviour | Testability | Covering test |
|---|---|---|---|
| REQ-ERR-1 | Exactly one of three closed terminal outcomes (Success/Failure/Cancelled) | conformance | **UNCOVERED** — individual outcomes exercised; closed trichotomy (set closure) not asserted |
| REQ-ERR-2 | Success = turns remain + final value available | conformance | `tests/functions-and-return.test.ts:397`; `tests/conformance/production-conformance.test.ts:414`; turns-remain `tests/no-rollback.test.ts:148` |
| REQ-ERR-3 | Failure (Err/panic/ceiling) → no final value, only Err envelope | conformance | `tests/functions-and-return.test.ts:408`; `tests/query-tool-loop.test.ts:256` |
| REQ-ERR-4 | Cancelled = AbortSignal → Err cancelled, no final value | conformance | `tests/query-tool-loop.test.ts:366`; `tests/functions-and-return.test.ts:417` |
| REQ-ERR-5 | Two fail-arm exclusions; Err only if ceiling#2 exhausts | conformance | (partial) `tests/pre-evaluation-failures.test.ts:140`, `:175`; `tests/query-tool-loop.test.ts:256`. In-loop ceiling#4 "no Err/no note" arm not asserted |
| REQ-ERR-6 | Pre-eval surface = exactly 8 items, loom-system-note, triggerTurn:false, no value, not cancellable | conformance | (partial) `tests/pre-evaluation-failures.test.ts:78-201`. "Exactly eight" count/closure not asserted |
| REQ-ERR-7 | Host-incompat pre-eval | offline-unit | `tests/pre-evaluation-failures.test.ts:78` |
| REQ-ERR-8 | Lex/parse/type pre-eval | offline-unit | `tests/pre-evaluation-failures.test.ts:97` |
| REQ-ERR-9 | Frontmatter rejection pre-eval | offline-unit | `tests/pre-evaluation-failures.test.ts:112` |
| REQ-ERR-10 | Binder-model resolution failure pre-eval | offline-unit | `tests/pre-evaluation-failures.test.ts:124` |
| REQ-ERR-11 | Binder arg-binding (ceiling#3) pre-eval | conformance | `tests/pre-evaluation-failures.test.ts:140` |
| REQ-ERR-12 | tools: resolution failure pre-eval | offline-unit | `tests/pre-evaluation-failures.test.ts:159`; `tests/load-phase-pre-eval-routing.test.ts:168` |
| REQ-ERR-13 | Watcher reload failures pre-eval | offline-unit | `tests/watcher-hot-reload-integration.test.ts:241` [adjacent] |
| REQ-ERR-14 | Ceiling#4 slash-load params arm cross-routed pre-eval | conformance | `tests/pre-evaluation-failures.test.ts:175` |
| REQ-ERR-15 | invoke parent callee load-fail → InvokeInfraError cause:load_failure | conformance | `tests/invocation-core.test.ts:139,172` [adjacent] |
| REQ-ERR-16 | Per-cause mapping: panic→note; cancel→two-arm invoke-parent rule | conformance | (partial) panic arm `tests/invoke-depth-cycle.test.ts:228` [adjacent]. Cancel two-arm not asserted |
| REQ-ERR-17 | Partial-append: turns remain, no rollback, turn-grain | conformance | `tests/terminal-outcomes.test.ts:72` |
| REQ-ERR-18 | Mid-stream cancel: no truncate/rewrite committed tokens/cards/notes | conformance | `tests/terminal-outcomes.test.ts:72` |
| REQ-ERR-19 | No compensating turns injected | conformance | `tests/terminal-outcomes.test.ts:91` |
| REQ-ERR-20 | Symmetric cancel + ?-propagation | conformance | `tests/terminal-outcomes.test.ts:112` |
| REQ-ERR-21 | Typed-query respond-repair obligations between cancelled turn and next send | conformance | `tests/terminal-outcomes.test.ts:133` |
| REQ-ERR-22 | Non-mutation in subagent-mode | conformance | `tests/terminal-outcomes.test.ts:175` |
| REQ-ERR-23 | No rollback on ?/panic/cancel | conformance | `tests/no-rollback.test.ts:119,148,175,206,263,335,400,431` |
| REQ-ERR-24 | Cancel == no-rollback | conformance | `tests/no-rollback.test.ts:263,400`; co-witness `tests/query-tool-loop.test.ts:395`, `tests/tool-calls-execute-lowering.test.ts:379`, `tests/invoke-cancellation-facets.test.ts:163` [adjacent] |
| REQ-ERR-25 | Result built-in Ok/Err declarable | offline-unit | `tests/runtime-value-model.test.ts:47,113`; `tests/conformance/production-conformance.test.ts:422,432` |
| REQ-ERR-26 | Six panic sources w/ codes bypass ?/match | offline-unit | `tests/runtime-panics.test.ts:191,211,225` |
| REQ-ERR-27 | Six normative panic message templates | offline-unit | `tests/runtime-panics.test.ts:191` |
| REQ-ERR-28 | One message string per panic flows unchanged; framing wraps | offline-unit | (partial) `tests/runtime-panics.test.ts:191`. Flows-unchanged-per-surface / wraps-not-replaces not asserted |
| REQ-ERR-29 | Panic slash surface 'loom /<name> aborted: <message>' details.diagnostics, no teardown | conformance | `tests/runtime-event-channel.test.ts:199` [adjacent]; `tests/subagent-drive-teardown.test.ts:375` |
| REQ-ERR-30 | Panic invoke-parent Err(kind:invoke_infra, cause:panic) | conformance | `tests/invoke-depth-cycle.test.ts:228` [adjacent] |
| REQ-ERR-31 | Unexpected interp exceptions → internal-error, cause:internal_error, no teardown | conformance | (partial) `tests/runtime-panics.test.ts:295`; `tests/tool-calls-off-surface-routing.test.ts:160`. InvokeInfraError cause:internal_error not asserted |
| REQ-ERR-32 | RangeError family → internal-error; heap-OOM terminates, no diag | conformance | `tests/runtime-panics.test.ts:311,331` |
| REQ-ERR-33 | internal-error slash surface message/hint | conformance | `tests/tool-calls-off-surface-routing.test.ts:101,123,142` |
| REQ-ERR-34 | QueryError nine variants, snake_case kind | conformance | `tests/queryerror-variants.test.ts:92,106` |
| REQ-ERR-35 | kind typed string not enum | offline-unit | `tests/queryerror-variants.test.ts:125` |
| REQ-ERR-36 | ValidationError schema | conformance | `tests/query-respond-repair.test.ts:127,330` |
| REQ-ERR-37 | empty_template: no round-trip, validation_errors=[], raw_response=null | conformance | (partial) `tests/conformance/production-conformance.test.ts:476`. validation_errors=[]/raw_response=null not asserted |
| REQ-ERR-38 | validation_errors canonical sort (path,schema_keyword,message) | conformance | `tests/queryerror-variants.test.ts:35,54,62,76` |
| REQ-ERR-39 | Forced-respond non-compliance synthesised ValidationIssue + terminal msg | conformance | `tests/queryerror-variants.test.ts:138,148,162`; `tests/query-respond-repair.test.ts:330,363` (literal == `src/runtime/query-respond-repair.ts:172`) |
| REQ-ERR-40 | TransportError schema | conformance | (partial) `tests/query-tool-loop.test.ts:454,469,487`. http_status/provider set in factory, not directly asserted |
| REQ-ERR-41 | ModelToolError schema; lowerable tool failure doesn't fire it | conformance | (partial) `tests/tool-calls-execute-lowering.test.ts:344`; `tests/err-note-render.test.ts:193`. Schema not directly validated |
| REQ-ERR-42 | ContextOverflowError schema | live | **live-only** — offline only renders a constructed value (`tests/err-note-render.test.ts:200`, `tests/query-respond-repair.test.ts:272`) |
| REQ-ERR-43 | CancelledError kind+message only | conformance | `tests/err-note-render.test.ts:207`; `tests/no-rollback.test.ts:431`; `tests/query-tool-loop.test.ts:366` |
| REQ-ERR-44 | ToolLoopExhaustedError schema, rounds==max_rounds | conformance | `tests/queryerror-variants.test.ts:179,192,203`; `tests/query-tool-loop.test.ts:256` |
| REQ-ERR-45 | CodeToolError schema, cause enum | conformance | `tests/tool-calls-execute-lowering.test.ts:247`; `tests/tool-calls-off-surface-routing.test.ts:259` |
| REQ-ERR-46 | InvokeInfraError schema, cause enum | conformance | (partial) `tests/err-note-render.test.ts:238`; `tests/invocation-core.test.ts:153`, `tests/invoke-depth-cycle.test.ts:242` [adjacent]. 7-member cause enum not closed |
| REQ-ERR-47 | InvokeCalleeError schema, inner recursive | conformance | `tests/err-note-render.test.ts:266,291` |
| REQ-ERR-48 | raw_response only where model attempted final text | conformance | (partial) `tests/queryerror-variants.test.ts:179,192`. Cross-variant rule not asserted as a rule |
| REQ-ERR-49 | Final value observable to callers; none on failure/cancel | conformance | `tests/functions-and-return.test.ts:397,408,417`; `tests/conformance/production-conformance.test.ts:414` |

---

## Table 2 — CANCEL (cancellation)

| Campaign ID | One-line behaviour | Testability | Covering test |
|---|---|---|---|
| REQ-CANCEL-1 | Fresh loomAbort AbortController; loomAbort.signal single source, always defined | conformance | `tests/cancellation-core.test.ts:79`; `tests/production-cancellation-wiring.test.ts:143` |
| REQ-CANCEL-2 | Slash entry aborted ctx.signal OR agent_end → loomAbort.abort() | conformance | `tests/cancellation-core.test.ts:79`; `tests/production-cancellation-wiring.test.ts:143,171` |
| REQ-CANCEL-3 | Tolerate ctx.signal undefined at slash entry | conformance | `tests/cancellation-core.test.ts:94`; `tests/production-cancellation-wiring.test.ts:171` |
| REQ-CANCEL-4 | Prompt-mode bidirectional: loomAbort→unwrapped Pi abort(), one-shot | conformance | (partial) forward path only `tests/production-cancellation-wiring.test.ts:143,171`, `tests/slash-dispatch.test.ts:209`. **Reverse arm UNCOVERED** |
| REQ-CANCEL-5 | Subagent one-shot listener→AgentSession.abort(), detached in finally | conformance | `tests/subagent-drive-teardown.test.ts:208`; `tests/active-invocation-registry.test.ts:108` |
| REQ-CANCEL-6 | Already-aborted at createAgentSession resolve → sync session.abort() before listener/first turn | conformance | **UNCOVERED** |
| REQ-CANCEL-7 | Double-abort no-op (one-shot listener + guard) | conformance | `tests/cancellation-core.test.ts:177`; `tests/forwarding-listener-throw-trap.test.ts:251` |
| REQ-CANCEL-8 | Tool execute() signal → loomAbort.abort() one-shot | conformance | `tests/cancellation-core.test.ts:102` |
| REQ-CANCEL-9 | invoke derived controller down-only; pre-aborted parent → sync Err cancelled, no session | conformance | `tests/cancellation-core.test.ts:112,217`; `tests/invoke-cancellation-facets.test.ts:115` |
| REQ-CANCEL-10 | Reason propagation; agent_end msg byte-exact; first source wins | conformance | `tests/cancellation-core.test.ts:128,143,155,166,177` |
| REQ-CANCEL-11 | Forwarding-listener throw trapped → internal-error; cancel not swallowed | conformance | `tests/forwarding-listener-throw-trap.test.ts:140,157,169,192,212,228` |
| REQ-CANCEL-12 | Listeners removed on return/panic in disposing finally | conformance | `tests/forwarding-detach-wiring.test.ts:231,284,322`; `tests/subagent-drive-teardown.test.ts:208` |
| REQ-CANCEL-13 | session_shutdown iterates registry, aborts each, idempotent | conformance | `tests/session-shutdown.test.ts:276,284,300,474`; `tests/active-invocation-wiring.test.ts:345`; `tests/session-shutdown-wiring.test.ts:178` |
| REQ-CANCEL-14 | Propagates down not up; child → parent Err cancelled | conformance | `tests/cancellation-core.test.ts:199,208`; `tests/tool-calls.test.ts:186` |
| REQ-CANCEL-15 | Exactly five checkpoints, no others | conformance | `tests/checkpoint-seam.test.ts:161`; per-site `tests/query-tool-loop.test.ts:352`, `tests/production-cancellation-wiring.test.ts:238`, `tests/invoke-cancellation-facets.test.ts:102`, `tests/checkpoint-granularity.test.ts:77,111` |
| REQ-CANCEL-16 | Loop-iter yields one macrotask before signal-check | conformance | `tests/checkpoint-granularity.test.ts:250`; `tests/checkpoint-seam.test.ts:89,111` |
| REQ-CANCEL-17 | Sync in-process work is not a checkpoint | conformance | `tests/checkpoint-granularity.test.ts:161,196` |
| REQ-CANCEL-18 | Compound expr cancellable between sub-exprs; no unwind | conformance | (partial) no-unwind covered `tests/invoke-cancellation-facets.test.ts:163,196`; `tests/cancellation-core.test.ts:416`. Between-sub-expr cancel not asserted |
| REQ-CANCEL-19 | No retroactive rewrite of completed Ok | conformance | `tests/cancellation-core.test.ts:416` |
| REQ-CANCEL-20 | No top-level synthesis on tail abort | conformance | `tests/cancellation-core.test.ts:461` |
| REQ-CANCEL-21 | Late-settle no rebind of call site | conformance | `tests/cancellation-core.test.ts:260` |
| REQ-CANCEL-22 | No second Err | conformance | `tests/cancellation-core.test.ts:275` |
| REQ-CANCEL-23 | No second RuntimeEvent | conformance | `tests/cancellation-core.test.ts:290` |
| REQ-CANCEL-24 | Swallowing handler attached at construction to every abandonable Promise | conformance | (partial) execute `tests/tool-calls-swallowing-handler.test.ts:106,146,194`; @-query `tests/query-swallowing-handler.test.ts:106,146,191`; invoke-child `tests/invoke-swallowing-handler.test.ts:102,142,187`; substrate `tests/cancellation-core.test.ts:362,380`. 4th site (`AgentSession.abort()`) generic substrate only |
| REQ-CANCEL-25 | In-flight query abort → Err cancelled | conformance | `tests/query-tool-loop.test.ts:366`; `tests/forwarding-listener-throw-trap.test.ts:192` |
| REQ-CANCEL-26 | Tool call abort → Err(code_tool, cause:cancelled) | conformance | **UNCOVERED** — closed-set membership only (`tests/tool-calls.test.ts:139`); no tool-checkpoint-abort surfacing test |
| REQ-CANCEL-27 | Two-arm invoke-parent: invoke_callee{inner:cancelled} vs bare cancelled | conformance | (partial) inner arm `tests/tool-calls.test.ts:186`; bare arm `tests/invoke-cancellation-facets.test.ts:115`. Discriminator-by-origin not exercised |
| REQ-CANCEL-28 | Cancelled binder runtime-internal, never a Result; cancelled-binder note | conformance | `tests/binder-call-cancellation.test.ts:127,177`; `tests/production-cancellation-wiring.test.ts:238` |
| REQ-CANCEL-29 | Top-level cancel → Pi cancelled system-note row | conformance | `tests/err-note-render.test.ts:207`; `tests/slash-dispatch.test.ts:209` |
| REQ-CANCEL-30 | timeout: field → loom/parse/timeout-field-rejected | offline-unit (IN SCOPE) | `tests/frontmatter-contract.test.ts:97` |
| REQ-CANCEL-31 | Checkpoint seam deterministic substrate; production wiring awaited no-op | conformance | `tests/checkpoint-seam.test.ts:89,111,161,170,197` |

Live negative only (no positive row coverage): `tests/hardening/session-cancellation.test.ts:21`
(CANCEL-6-negative: compute-only loop, no spurious cancelled note).

---

## Table 3 — HC (hard-ceilings)

| Campaign ID | One-line behaviour | Testability | Covering test |
|---|---|---|---|
| REQ-HC-1 | Exactly four ceilings, fixed routing classes | offline-unit | (partial/distributed) closed-id set `tests/ceiling-arbitration.test.ts:105`; routing #1 `tests/invoke-depth-cycle.test.ts:211,228`, #2 `tests/query-tool-loop.test.ts:256`, #3 `tests/binder-retry-taxonomy.test.ts:181`, #4 `tests/depth-enforcement.test.ts:65`. No unified four-way closure+routing test |
| REQ-HC-2 | Ceiling#1 depth 32, countable-frame rule, per-chain, breach at 33rd | offline-unit | `tests/invoke-depth-cycle.test.ts:91,96,138,153,181,193` |
| REQ-HC-3 | Panic message 'invoke chain depth exceeded: <depth> > 32' | offline-unit | `tests/invoke-depth-cycle.test.ts:96`; `tests/runtime-panics.test.ts:191` |
| REQ-HC-4 | Counter crosses subagent boundary unchanged | conformance | `tests/invoke-depth-cycle.test.ts:138`; live `tests/hardening/invoke-runtime-ceilings.test.ts:88` |
| REQ-HC-5 | Top-level overflow→Pi note; in-chain→parent Err(InvokeInfraError cause:panic) | conformance | `tests/invoke-depth-cycle.test.ts:211,228` |
| REQ-HC-6 | Ceiling#2 bounds free-phase rounds at max_rounds; forced-respond exempt | conformance | `tests/query-tool-loop.test.ts:184` |
| REQ-HC-7 | Exhaustion → Err(tool_loop_exhausted) | conformance | `tests/query-tool-loop.test.ts:256`; `tests/queryerror-variants.test.ts:179`; `tests/prompt-tool-loop-governor.test.ts:113` |
| REQ-HC-8 | ≤1 transport-class binder retry | conformance | `tests/binder-retry-taxonomy.test.ts:74` |
| REQ-HC-9 | ≤1 malformed-envelope retry | conformance | `tests/binder-retry-taxonomy.test.ts:85` |
| REQ-HC-10 | AJV-on-args not retried | conformance | `tests/binder-retry-taxonomy.test.ts:96` |
| REQ-HC-11 | Worst-case 3 binder LLM calls | conformance | `tests/binder-retry-taxonomy.test.ts:108` |
| REQ-HC-12 | Both budgets exhausted → note = most-recent failure | conformance | `tests/binder-retry-taxonomy.test.ts:121` |
| REQ-HC-13 | Ceiling#3 = load-time system note; no Result observable | conformance | (partial) note surface `tests/binder-retry-taxonomy.test.ts:146,181`. "loom does not start / no Result" not unit-asserted |
| REQ-HC-14 | Every #4 breach carries maxDepth / 'JSON document depth exceeds 5' | conformance | `tests/depth-enforcement.test.ts:42` |
| REQ-HC-15 | Typed-query response → Err(validation, schema_validation, maxDepth) | conformance | `tests/query-tool-loop.test.ts:294`; `tests/depth-enforcement.test.ts:65` |
| REQ-HC-16 | Model-driven tool args → model tool-error, counts round, silent unless #2 | conformance | `tests/tool-calls-depth-ceiling.test.ts:107,135`; `tests/prompt-tool-loop-governor.test.ts:225` |
| REQ-HC-17 | Code-driven tool args → Err(CodeToolError cause:validation, maxDepth) | conformance | `tests/tool-calls-depth-ceiling.test.ts:40,81` |
| REQ-HC-18 | params invoke → InvokeInfraError cause:validation; slash-load via #3 no-retry | conformance | `tests/invoke-ceiling-depth.test.ts:44,158`; `tests/depth-enforcement.test.ts:78`; `tests/binder-retry-taxonomy.test.ts:224` |
| REQ-HC-19 | invoke<T> return → InvokeInfraError cause:return_validation | conformance | `tests/invoke-ceiling-depth.test.ts:105`; live `tests/hardening/invoke-runtime-ceilings.test.ts:47` |
| REQ-HC-20 | #3 at slash-load before runtime ceilings; params arm routed by #3 | offline-unit | `tests/ceiling-arbitration.test.ts:33`; `tests/depth-enforcement.test.ts:78`; `tests/invoke-ceiling-depth.test.ts:158` |
| REQ-HC-21 | #1 at invoke entry before callee body | offline-unit | `tests/ceiling-arbitration.test.ts:52`; `tests/invoke-depth-cycle.test.ts:96` |
| REQ-HC-22 | #4 first sub-check at five AJV sites; depth-walk before AJV | offline-unit | `tests/ceiling-arbitration.test.ts:63`; `tests/depth-enforcement.test.ts:65,78`; `tests/tool-calls-depth-ceiling.test.ts:81`; `tests/invoke-ceiling-depth.test.ts:86` |
| REQ-HC-23 | #2 at round boundary post-increment, two outcomes; max_rounds:0 final at start | conformance | `tests/query-tool-loop.test.ts:184,224`; `tests/prompt-tool-loop-governor.test.ts:191` |
| REQ-HC-24 | #3 never interleaves; invoke() no binder | offline-unit | (partial) single-surface decision `tests/ceiling-arbitration.test.ts:85`. Interleave-freedom temporal property live-tier only |
| REQ-HC-25 | At most one ceiling per event; optional masked | conformance | `tests/ceiling-arbitration.test.ts:105`; `tests/prompt-tool-loop-governor.test.ts:254` |
| REQ-HC-26 | Audience-coverage invariant | conformance | **UNCOVERED (deferred)** — audiences witnessed individually; invariant itself unasserted |
| REQ-HC-27 | Ceiling#1 panic-uniqueness invariant | conformance | (partial) `tests/runtime-panics.test.ts:211,223` (#1 panic-path/bypass). Holistic clause (#2/#4 via Err, #3 off-trichotomy) not co-asserted |
| REQ-HC-28 | masked ⊂ {ceiling#1..4}; omitted when none; never [] | offline-unit | `tests/ceiling-arbitration.test.ts:105`; `tests/runtime-event-channel.test.ts:114` |
| REQ-HC-29 | Wire location details.masked / details.event.masked | offline-unit | (partial) `tests/runtime-event-channel.test.ts:125`; `tests/query-tool-loop.test.ts:294`. details.masked (diagnostic-shape) slot has no assertion |
| REQ-HC-30 | Only non-empty masked reachable is ['ceiling#2'] on runtime-event; never diagnostic | conformance | (partial) `tests/runtime-event-channel.test.ts:105,114`; `tests/query-tool-loop.test.ts:294`. "never on diagnostic" negative not asserted |
| REQ-HC-31 | No wall-clock timeout; parse-time rejects timeout: field | offline-unit | `tests/frontmatter-contract.test.ts:97` |
| REQ-HC-32 | No token cap; only provider ContextOverflowError | live | **live-only** — token-domain absence provider-observable only |
| REQ-HC-33 | No memory ceiling; catchable alloc→internal-error; heap-OOM terminates, no diag | conformance | `tests/runtime-panics.test.ts:311,331` |
| REQ-HC-34 | No host stack ceiling distinct from 32; native exhaustion via RangeError arm | conformance | (partial) `tests/runtime-panics.test.ts:311`. "distinct from 32" not asserted |
| REQ-HC-35 | Provider 429 → Err(transport, http_status:429) | live | **live-only** — live `tests/hardening/session-*-transport.test.ts`; unit `tests/query-tool-loop.test.ts:454` asserts transport but not http_status:429 |
| REQ-HC-36 | Host-tool resource exhaustion → Err(code_tool) from execute() | conformance | (partial) `tests/tool-calls-execute-lowering.test.ts:246,344`; `tests/e2e-s3-tool-error-envelope.test.ts:20`. EMFILE/ECHILD/socket vector not named |

---

## UNCOVERED-but-in-scope rows (M1/M2/M3)

### ERR
- **REQ-ERR-1** (M2) — closed-trichotomy set-closure never asserted; only individual outcomes exercised. Candidate new conformance test.
- **REQ-ERR-6** (M2) — "pre-eval surface is exactly eight items" count/closure not asserted (5 representative causes + ERR-16 only). Candidate new conformance test.
- **REQ-ERR-16** cancel arm (M2) — two-arm invoke-parent cancel rule (`invoke_callee`+inner `cancelled` vs bare `cancelled`) not asserted anywhere; only panic arm covered.
- **REQ-ERR-5** in-loop arm (M2) — ceiling#4 in-loop model-driven-args "no Err/no note" arm not directly asserted.
- **REQ-ERR-37** (M1/M2) — `validation_errors=[]` and `raw_response=null` on `empty_template` not asserted.
- **REQ-ERR-46** (M2) — InvokeInfraError 7-member `cause` enum closure not asserted (only load_failure, panic observed).

### CANCEL
- **REQ-CANCEL-6** (M1) — already-aborted-at-`createAgentSession`-resolve → synchronous `session.abort()` ordering has no test. Fully uncovered.
- **REQ-CANCEL-4** reverse arm (M2) — `loomAbort.abort()` → unwrapped Pi `ExtensionCommandContext.abort()` one-shot (the distinguishing content of C4 vs C2) untested.
- **REQ-CANCEL-26** (M3) — tool-call-checkpoint abort surfacing as `Err(code_tool, cause:"cancelled")` untested (only closed-enum membership).
- **REQ-CANCEL-18** partial (M2) — cancel *between sub-expressions of one compound expression* not exercised (no-unwind facet covered).
- **REQ-CANCEL-27** partial (M2) — two-arm discriminator-by-abort-origin untested (both arms exist separately).
- **REQ-CANCEL-24** partial (M2) — 4th abandonable site (`AgentSession.abort()`) has no dedicated per-site test (generic substrate only).

### HC
- **REQ-HC-1** partial (M2) — no unified test asserts "exactly four ceilings, each with its routing class" (only distributed).
- **REQ-HC-24** partial (M2) — "#3 never interleaves / `invoke()` never runs binder" interleave-freedom is live-tier only; no deterministic in-scope assertion.
- **REQ-HC-26** (M2) — audience-coverage invariant unasserted (fully uncovered, deferred-style).
- **REQ-HC-13** partial (M2) — "loom does not start / no Result observable" load-time placement not unit-asserted.
- **REQ-HC-27** partial (M2) — holistic panic-uniqueness invariant not co-asserted.
- **REQ-HC-29/30** partial (M2) — diagnostic-shape `details.masked` never-populated negative not asserted.
- **REQ-HC-34** partial (M2) — "distinct from the 32-bound" not asserted.
- **REQ-HC-36** partial (M2) — EMFILE/ECHILD/socket-exhaustion vector not named (generic `execute()`→`code_tool` asserted).

---

## Candidate findings (observed spec-noncompliance)

No **loom-defect** noncompliance observed in ERR/CANCEL/HC. The one literal cross-checked
(REQ-ERR-39 forced-respond terminal message) matches spec byte-for-byte
(`docs/spec_topics/errors-and-results/queryerror-variants.md:88` ==
`src/runtime/query-respond-repair.ts:172`). All findings below are coverage/methodology
observations (test-artifact / borderline / deferred-not-a-bug), not runtime defects.

| # | Requirement | Spec citation | Method | Expected | Observed | Verdict | Severity |
|---|---|---|---|---|---|---|---|
| F-ERR-1 | REQ-ERR-17/18/19/20/23/24 | `docs/spec_topics/errors-and-results/error-model.md:43,45,47,55` | M2 | Partial-append + no-rollback witnessed on live conversation-drive/invoke/query surfaces | Witnessed against seam-level src stubs + harness-modelled subagent/invoke child; file headers note "NOT the live V9i/V14a/V13c/V15a surfaces" | borderline (live co-witnesses at query-tool-loop:395, tool-calls-execute-lowering:379, invoke-cancellation-facets:163) | partial |
| F-ERR-2 | REQ-ERR-6 | `docs/spec_topics/errors-and-results/error-model.md:11` | M2 | Assert pre-eval surface is exactly the 8 enumerated items | Routing + triggerTurn:false for 5 causes + ERR-16 only; no count/closure | test-artifact | partial |
| F-ERR-3 | REQ-ERR-1 | `error-model.md §terminal-outcomes` | M2 | Assert terminal-outcome set closed at three | Individual outcomes exercised; closure never asserted | test-artifact | partial |
| F-ERR-4 | REQ-ERR-16 (cancel arm) | `error-model.md §terminal-outcomes` | M2 | Two-arm invoke-parent cancel rule asserted | Not asserted in inspected/adjacent set | deferred-not-a-bug | partial |
| F-CANCEL-1 | REQ-CANCEL-6 | `docs/e2e-campaign/analysis/spec-requirements.md:812`; `docs/spec_topics/cancellation.md §"Forwarding into loomAbort"` | M2 | Pre-aborted-at-resolve → sync `session.abort()` before listener + first turn | No test exercises the ordering | test-artifact (coverage gap) | partial |
| F-CANCEL-2 | REQ-CANCEL-4 | `docs/e2e-campaign/analysis/spec-requirements.md:810`; `docs/spec_topics/cancellation.md §"Forwarding into loomAbort"` | M2 | loomAbort→unwrapped Pi abort() one-shot asserted | Only forward forwarding asserted | test-artifact (coverage gap) | partial |
| F-CANCEL-3 | REQ-CANCEL-26 | `docs/e2e-campaign/analysis/spec-requirements.md:832`; `docs/spec_topics/cancellation.md §Surfacing` | M2 | Tool-checkpoint abort → Err(code_tool, cause:cancelled) | Only closed-enum membership; production path surfaces cause:execution | test-artifact (coverage gap) | partial |
| F-CANCEL-4 | REQ-CANCEL-27 | `docs/e2e-campaign/analysis/spec-requirements.md:833`; `docs/spec_topics/cancellation.md §Surfacing` | M2 | One path proving abort-origin selects the arm | Both arms exist; discriminator untested | test-artifact | cosmetic |
| F-CANCEL-5 | REQ-CANCEL-24 | `docs/e2e-campaign/analysis/spec-requirements.md:830`; `docs/spec_topics/cancellation.md §"Race semantics"` | M2 | Per-site swallowing-handler test for `AgentSession.abort()` | Generic substrate only | test-artifact | cosmetic |
| F-HC-1 | REQ-HC-1 | `docs/e2e-campaign/analysis/spec-requirements.md:844`; `docs/reference/hard-ceilings.md §"The four ceilings"` | M2 | One test asserting exactly four ceilings each bound to its routing class | Closure + routing asserted separately across 4 suites | test-artifact | partial |
| F-HC-2 | REQ-HC-24 | `docs/e2e-campaign/analysis/spec-requirements.md:869`; `ceilings-3-and-4.md:43` (CIO-5) | M2 | Deterministic assertion invoke() never invokes binder / #3 never interleaves | Single-surface arbitration decision only; interleave-freedom live-tier | test-artifact | partial |
| F-HC-3 | REQ-HC-13 | `docs/e2e-campaign/analysis/spec-requirements.md:857`; `ceilings-3-and-4.md §"Per-class retry budget"` | M2 | Assert #3 load-time and no Result observable | Only note-render surface asserted | test-artifact | partial |
| F-HC-4 | REQ-HC-26 | `docs/e2e-campaign/analysis/spec-requirements.md:870`; `ceilings-3-and-4.md §ceiling-set-invariants` | M2 | Invariant: no ceiling unobservable to all of loom/model/operator | Audiences witnessed individually; invariant asserted nowhere | test-artifact | partial |
| F-HC-5 | REQ-HC-27 | `docs/e2e-campaign/analysis/spec-requirements.md:871`; `ceilings-3-and-4.md §ceiling-set-invariants` | M2 | Holistic panic-uniqueness invariant asserted | Only #1 panic-path/bypass asserted | test-artifact | partial |
| F-HC-6 | REQ-HC-29/30 | `docs/e2e-campaign/analysis/spec-requirements.md:874,875`; `ceilings-3-and-4.md:58` | M2 | Negative "diagnostic-shape never carries masked" asserted | details.event.masked witnessed; details.masked slot untested | test-artifact | cosmetic |
| F-HC-7 | REQ-HC-34 | `docs/e2e-campaign/analysis/spec-requirements.md:880`; `ceiling-invariants-and-audit.md §no-additional-ceilings` | M2 | Assert distinctness from the 32-bound | RangeError→internal-error asserted; distinctness not | test-artifact | cosmetic |
| F-HC-8 | REQ-HC-36 | `docs/e2e-campaign/analysis/spec-requirements.md:882`; `ceiling-invariants-and-audit.md §audit-methodology` | M2 | Host resource-exhaustion (EMFILE/ECHILD/socket) → code_tool | Generic execute()-throw→code_tool asserted; vector not named | test-artifact | cosmetic |

---

## Summary counts per area

### ERR (49 rows)
- COVERED (incl. 9 partial): **47** — partials REQ-ERR-5,6,16,28,31,37,40,41,46,48.
- UNCOVERED in-scope: **1** — REQ-ERR-1 (closed-trichotomy closure).
- live-only: **1** — REQ-ERR-42.
- deferred / not-a-bug: **2** — REQ-ERR-16 cancel two-arm, REQ-ERR-42 live.
- loom-defect findings: **0**.

### CANCEL (31 rows)
- COVERED (incl. offline-unit REQ-CANCEL-30, IN SCOPE): **25** — 24 conformance + REQ-CANCEL-30.
- UNCOVERED in-scope: **3** — REQ-CANCEL-6 (M1/fully), REQ-CANCEL-4 reverse arm (M2), REQ-CANCEL-26 (M3).
- PARTIAL (facet covered, arm/granularity untested): **3** — REQ-CANCEL-18, 24, 27.
- live-only: **0** positive (1 live negative for CANCEL-6-negative).
- deferred: **0** (per-call timeouts deferred, but REQ-CANCEL-30 parse-rejection IS in scope + COVERED).
- loom-defect findings: **0**.

### HC (36 rows)
- COVERED (incl. COVERED-partial): **33** — HC-1..25,27..31,33,34,36.
- UNCOVERED in-scope: **1** — REQ-HC-26 (audience-coverage invariant, deferred-style).
- live-only: **2** — REQ-HC-32, REQ-HC-35.
- deferred (conformance, unasserted): **1** — REQ-HC-26 (same as UNCOVERED).
- loom-defect findings: **0**.
- Offline-unit in-scope {HC-1,2,3,20,21,22,24,28,29,31}: 10/10 have asserting bodies (HC-1, HC-24 partial → M2).

### Cross-area totals (116 rows)
- COVERED (incl. partial): **105**.
- UNCOVERED in-scope: **5** (ERR-1; CANCEL-4,6,26; HC-26) + 6 partial-with-gap rows flagged above.
- live-only: **4** (ERR-42; HC-32, HC-35 — 3 live) + CANCEL live-negative only.
- loom-defect findings: **0**; all 17 candidate findings are test-artifact / borderline / deferred-not-a-bug (coverage/methodology gaps).

### Deferred-appendix items confirmed out of scope (`docs/e2e-campaign/analysis/spec-requirements.md:1282-1296`)
- Per-call timeouts (`timeout:` field) — deferred; **but the parse-time rejection REQ-CANCEL-30 / REQ-HC-31 IS in scope and COVERED** (`tests/frontmatter-contract.test.ts:97`).
- Pre-flight token-count / token budget — deferred (bears on REQ-HC-32, live-only).
- JSON-mode fallback for typed queries — deferred.
- User-defined error types beyond `QueryError` / deferred `QueryError` extensions (BinderError variant) — deferred; ride the ERR-15 (REQ-ERR-35) discriminator-openness seam.

## 5. Summary counts

### DIAG (171 registry codes)
- COVERED: 129 · UNCOVERED-emitted: 30 · NEVER-EMITTED (loom-defect): 10 · DORMANT-deferred: 2.
- New S4 tests move 8 previously-UNCOVERED-emitted codes to COVERED (→ 137 COVERED / 22 UNCOVERED-emitted when counting the additions).
- Closed-set violation: 1 retired code present as a dead src constant (FIND-S4-11, borderline).

### ERR (49) / CANCEL (31) / HC (36) = 116
- COVERED (incl. partial): 105 · UNCOVERED-in-scope: 5 (ERR-1; CANCEL-4-reverse,6,26; HC-26) · live-only: 4 (ERR-42; HC-32,35) · loom-defects: 0.

### Findings
- 10 loom-defects (FIND-S4-1..10): never-emitted registry codes — 6 blocks-spec-compliance (E-sev parse/type), 4 partial (W-sev advisory / wrong-code).
- 1 borderline (FIND-S4-11): retired-code dead constant.
- 1 test-artifact (FIND-S4-12): ERR/CANCEL/HC in-scope coverage gaps (no noncompliance).

### Method note
All new tests drive the production offline pipeline (`parseLoomDocument`). No `src/**`
production code modified; no existing test weakened. The closed diagnostic-code registry
gate (`tools/code-registry/index.js` + `tests/code-registry.test.ts`) enforces the
closed-set / stable-id / Message-normative invariants (DIAG-2/3/4) but reconciles
*asserted* codes against the registry — it does not detect a registry code that is never
*emitted*; FIND-S4-1..10 fall in that blind spot.
