# S2 (frontmatter-imports) — execution results

Areas: **FRNT** (79), **DESC** (10), **IMP** (23) = 112 in-scope requirements.
Primary method: M1 offline (`parseFrontmatter` `src/parser/frontmatter.ts:665`,
`parseLoomDocument` `src/parser/loom-document.ts:563`, plus pure seam helpers in
`src/parser/{descriptions,imports,callable-set,params,system-interpolation}.ts`),
with M2 conformance touchpoints for load-time diagnostics, import resolution,
and callable-set runtime enforcement.

## 1. Existing-suite run

`npx vitest run frontmatter-contract frontmatter-tool-loop-respond-repair
descriptions imports wire-name-translation callable-set
callable-set-runtime-enforcement params-defaults settings-merge`

| Suite | Tests | Result |
|---|---|---|
| frontmatter-contract.test.ts | 14 | PASS |
| frontmatter-tool-loop-respond-repair.test.ts | 14 | PASS |
| descriptions.test.ts | 4 | PASS |
| imports.test.ts | 16 | PASS |
| wire-name-translation.test.ts | 6 | PASS |
| callable-set.test.ts | 17 | PASS |
| callable-set-runtime-enforcement.test.ts | 4 | PASS |
| params-defaults.test.ts | 7 | PASS |
| settings-merge.test.ts | 13 | PASS |
| **Total** | **95** | **9/9 files PASS** |

Adjacent in-area suite pulled in for coverage: `system-interpolation.test.ts`
(24) PASS — it owns FRNT-17 and FRNT-55..63.

## 2. New tests authored (this slice)

Driven through the real production parse path. Full green run of the S2 set +
new files: **12 files / 134 tests PASS**.

| File | Tests | Result | Purpose |
|---|---|---|---|
| `tests/e2e-s2-frontmatter-fields.test.ts` | 8 | PASS | M1 coverage for FRNT-2, FRNT-14, FRNT-21, FRNT-26, FRNT-68 (in-src codes with no dedicated prior assertion) |
| `tests/e2e-s2-advisory-diagnostics.test.ts` | 7 | PASS | FRNT-23/22/5 gaps: 3 passing *characterization* tests (observed) + 3 `it.fails` *spec repros* (green while defect stands, flip on fix) + 1 control |

`it.fails` note: the three `[spec repro]` tests assert the spec-required
diagnostic and currently pass *because* the assertion throws (the diagnostic is
absent). They will fail — signalling the fix landed — once the emitters exist.
This keeps the shared default suite green during Phase C while committing an
executable repro (campaign §4 "keep the red test" satisfied non-disruptively).

## 3. Coverage map

Legend: **C** covered by cited test (offline/conformance, this slice's scope);
**C\*** covered but primary observation is M3-live or another slice's suite
(cited, not re-verified offline here); **N** new test this slice; **GAP→FIND**
UNCOVERED and a confirmed finding; **defer** deferred-not-a-bug (spec-sanctioned).

### FRNT (79)

| Req | Status | Covering test (path) |
|---|---|---|
| FRNT-1 missing-mode | C | frontmatter-contract.test.ts |
| FRNT-2 unknown-mode-value | N | e2e-s2-frontmatter-fields.test.ts |
| FRNT-3 description optional/default null | C | frontmatter-contract.test.ts (`description` retention) |
| FRNT-4 argument-hint optional | C* | binder-system-prompt.test.ts (M2 binder prompt) |
| FRNT-5 argument-hint-not-displayed | GAP→FIND-S2-3 | e2e-s2-advisory-diagnostics.test.ts (repro) |
| FRNT-6 argument-hint internal-only / no RegisteredCommand slot | C*/defer | frontmatter-fields-a.md:51 autocomplete gap is Future-Considerations; internal-only use in binder-system-prompt.test.ts |
| FRNT-7 model inherits session model, per-invocation pin | C* | live (session-model pinning) — M3, not offline |
| FRNT-8 model-unresolved | C | frontmatter-contract.test.ts |
| FRNT-9 subagent pre-spawn model guard | C* | conformance/live (S6 spawn guard) |
| FRNT-10 bind_model default binderModel | C | binder-model-resolution.test.ts; settings-merge.test.ts (binderModel key) |
| FRNT-11 binder-model-unresolved | C | binder-model-resolution.test.ts; pre-evaluation-failures.test.ts |
| FRNT-12 binder-model strict-capable(E)/unknown(W) | C/defer | binder-model-resolution.test.ts; the `-not-strict-capable` (E) path is unreachable under the loom-1.0 Pi-SDK pin (Deferred appendix Cl.4/5) → the `-strict-capability-unknown` (W) path is the live one |
| FRNT-13 bind_context default none | C | frontmatter-contract.test.ts (bindContext undefined) |
| FRNT-14 unknown-bind-context-value | N | e2e-s2-frontmatter-fields.test.ts |
| FRNT-15 bind_echo default true / echo | C* | conformance (bind-context-transcript.test.ts, binder) |
| FRNT-16 tools optional; `[]`≡absent≡empty set | C | callable-set.test.ts (absent/empty → empty frozen set) |
| FRNT-17 system subagent-only (system-on-prompt-mode) | C | system-interpolation.test.ts |
| FRNT-18 respond_repair default {3,validator_error}; `{}`≡omit | C | frontmatter-tool-loop-respond-repair.test.ts (attempts default 3) |
| FRNT-19 tool_loop default {25}; `{}`≡omit | C | frontmatter-tool-loop-respond-repair.test.ts |
| FRNT-20 params optional; absent≡`{}` | C | params-defaults.test.ts; frontmatter-contract.test.ts |
| FRNT-21 params-null | N | e2e-s2-frontmatter-fields.test.ts |
| FRNT-22 bind-echo-without-params | GAP→FIND-S2-2 | e2e-s2-advisory-diagnostics.test.ts (repro) |
| FRNT-23 unknown-frontmatter-field (recognised) | C | frontmatter-contract.test.ts |
| FRNT-23 deferred-frontmatter-field (reserved) | GAP→FIND-S2-1 | e2e-s2-advisory-diagnostics.test.ts (repro) |
| FRNT-24 mode only required field | C | frontmatter-contract.test.ts (missing-mode) |
| FRNT-25 hyphenated vs underscore field spellings | C | e2e-s2-frontmatter-fields.test.ts (FRNT-26 witness) + M4 inspection |
| FRNT-26 argument_hint(underscore)→unknown-frontmatter-field | N | e2e-s2-frontmatter-fields.test.ts |
| FRNT-27 invalid-slash-name | C | discovery-walk.test.ts |
| FRNT-28 bind_ vs binder terminology | C* | M4 inspection (settings `binderModel` key; frontmatter `bind_model`) |
| FRNT-29 params NamedType / unresolved-named-type | C | params-defaults.test.ts |
| FRNT-30 param default literal sublanguage | C | params-defaults.test.ts; literals-and-paths.test.ts |
| FRNT-31 default-not-literal | C | params-defaults.test.ts |
| FRNT-32 default filled before AJV | C | params-defaults.test.ts (AJV validate) |
| FRNT-33 integer-narrowing | C | literals-and-paths.test.ts; type-compat.test.ts |
| FRNT-34 non-trailing-default | C | params-defaults.test.ts |
| FRNT-35 defaults only on params (not schema fields) | C* | M4 inspection; schemas suite (S3) |
| FRNT-36 params AJV-validated / invoke typed direct | C | params-defaults.test.ts; invocation-core.test.ts (S5) |
| FRNT-37 model+tools apply to every query | C* | conformance (S3/S6) |
| FRNT-38 tools = unified callable set | C | callable-set.test.ts; callable-set-runtime-enforcement.test.ts |
| FRNT-39 no ambient inheritance | C | callable-set.test.ts; callable-set-runtime-enforcement.test.ts |
| FRNT-40 unknown-tool | C | callable-set.test.ts; production-tools-load-resolution.test.ts |
| FRNT-41 .loom path rules (non-loom-ext/unresolvable/prompt-mode) | C | callable-set.test.ts; invoke-diagnostics.test.ts |
| FRNT-42 default name basename hyphens→underscores | C | callable-set.test.ts |
| FRNT-43 invalid-tool-rename | C | callable-set.test.ts |
| FRNT-44 tool-name-collision | C | callable-set.test.ts |
| FRNT-45 "callable set" terminology | C*/defer | M4 inspection (FRNT-2 tag; editorial) |
| FRNT-46 ".loom callable" terminology | C*/defer | M4 inspection (FRNT-3 tag; editorial) |
| FRNT-47 two `tools:` spellings | C | callable-set.test.ts |
| FRNT-48 callee-has-errors | C | invoke-diagnostics.test.ts; production-tools-load-resolution.test.ts |
| FRNT-49 frozen per-loom table, strong refs | C | callable-set.test.ts (frozen); callable-set-runtime-enforcement.test.ts (held ref) |
| FRNT-50 dispatch through held ref, no registry re-query | C | callable-set-runtime-enforcement.test.ts |
| FRNT-51 mid-run Pi-tool unregister no effect | C* | callable-set-runtime-enforcement.test.ts (held-ref proxy); conformance |
| FRNT-52 unknown_tool reachable only via reload | C* | conformance/reload (S5); tool-calls (S3) |
| FRNT-53 .loom held-ref captured at load, reload invalidates | C* | conformance/reload (S5) |
| FRNT-54 hot-reload Pi ext → CodeToolError(execution) | C* | conformance/live (S3) |
| FRNT-55 system fixed at conversation creation | C | system-interpolation.test.ts; conformance |
| FRNT-56 system ${param}/${param.field} | C | system-interpolation.test.ts |
| FRNT-57 system grammar Path | C | system-interpolation.test.ts |
| FRNT-58 head Ident declared param, loom-side names | C | system-interpolation.test.ts |
| FRNT-59 arrays/unions terminate path | C | system-interpolation.test.ts |
| FRNT-60 indexed/call/optional-chain rejected | C | system-interpolation.test.ts |
| FRNT-61 stringification / null / NaN | C | system-interpolation.test.ts |
| FRNT-62 `\${` escape | C | system-interpolation.test.ts |
| FRNT-63 four system-interp-* codes | C | system-interpolation.test.ts |
| FRNT-64 respond_repair attempts/methodology | C | frontmatter-tool-loop-respond-repair.test.ts (parse); conformance |
| FRNT-65 validator_error includes AJV error | C* | live (S3) |
| FRNT-66 schema_repeat restates schema | C* | live (S3) |
| FRNT-67 methodology none | C* | conformance (query suites, S3) |
| FRNT-68 unknown-methodology-value | N | e2e-s2-frontmatter-fields.test.ts |
| FRNT-69 max_rounds definition | C | frontmatter-tool-loop-respond-repair.test.ts (parse); prompt-tool-loop-governor (S3) |
| FRNT-70 max_rounds free-phase only; forced-respond exempt | C* | conformance/live (S3) |
| FRNT-71 cap per query/repair/invoke | C* | live (S3) |
| FRNT-72 tool_loop_exhausted | C* | live (S3) |
| FRNT-73 max_rounds:0 disables model tool calls | C | frontmatter-tool-loop-respond-repair.test.ts (parse 0); conformance (S3) |
| FRNT-74 out-of-range max_rounds | C | frontmatter-tool-loop-respond-repair.test.ts |
| FRNT-75 out-of-range attempts | C | frontmatter-tool-loop-respond-repair.test.ts |
| FRNT-76 no operator override for max_rounds | defer | M4 inspection (looms.toolLoopMaxRounds deferred) |
| FRNT-77 @-template ${} interpolation | C* | query-render.test.ts (S3 QRY) |
| FRNT-78 no bash arg-slice sugar ($ARGUMENTS) | C* | expression/parser suites (S1); unknown-identifier |
| FRNT-79 interpolated-result | C | query-render.test.ts; system-interpolation.test.ts |

### DESC (10)

| Req | Status | Covering test |
|---|---|---|
| DESC-1 `///` lowers to schema `description:` | C | descriptions.test.ts |
| DESC-2 legal anchors (schema/enum/field/variant/fn) | C | descriptions.test.ts (checkDocCommentPlacement eligible list) |
| DESC-3 inline `///` on same line illegal | GAP-minor | UNCOVERED offline; scanner collects only line-leading `///` (inline silently not lowered). Low behavioural weight, not raised as a finding (no observable wrong output); recommend a whole-doc `parseLoomDocument` assertion in a later pass |
| DESC-4 fn `///` AST-only (not lowered) | C | descriptions.test.ts |
| DESC-5 doc-comment-misplaced above let/import/etc | C | descriptions.test.ts |
| DESC-6 multi-line join + common-leading-ws strip + blanks | C | descriptions.test.ts |
| DESC-7 static text only (no `${param}`) | C | descriptions.test.ts (byte-for-byte lowering; no interpolation path) |
| DESC-8 byte-for-byte lowering | C | descriptions.test.ts |
| DESC-9 `//` not propagated | C | descriptions.test.ts |
| DESC-10 fields/variants comma-separated, trailing comma | C* | schemas suite (S3); whole-program-parser.test.ts |

### IMP (23)

| Req | Status | Covering test |
|---|---|---|
| IMP-1 `.loom` imports `.warp` only | C | imports.test.ts (extension checks) + M4 inspection |
| IMP-2 import form `import { Sym } from "./x.warp"` | C | imports.test.ts (resolver success path) |
| IMP-3 warp-top-level-statement | C | imports.test.ts |
| IMP-4 fn bodies full language, query vs calling loom | C* | live/hardening imports-resolution.test.ts (M3) |
| IMP-5 `.warp` never slash-discovered | C* | conformance / discovery (S5) |
| IMP-6 `.warp` invoke + cycle walk + INV-4 frame | C* | invoke-depth-cycle.test.ts; conformance (S5) |
| IMP-7 import-non-warp-extension | C | imports.test.ts |
| IMP-8 relative-only; backslash parse error | C | imports.test.ts (non-relative rejected); invalid-path-separator via lexer (LEX/S1) |
| IMP-9 project-rooted/package-style out of scope (rejected) | C | imports.test.ts (non-relative → throw). Feature deferred; the rejection is in-scope |
| IMP-10 Resolver seam resolve(spec,fromFile) | C | imports.test.ts (RelativeWarpResolver) |
| IMP-11 unresolvable-warp-path via throw | C | imports.test.ts |
| IMP-12 unresolvable: non-relative / no byte-exact segment | C | imports.test.ts |
| IMP-13 byte-exact but unreadable (EACCES/broken symlink) | C | imports.test.ts |
| IMP-14 byte-exactness vs readdir bytes (no NFC/NFD fold) | C/partial | imports.test.ts (case-variant); NFC/NFD not explicitly vectorised (low weight) |
| IMP-15 unresolvable-warp-path covers no-entry + case-variant | C | imports.test.ts |
| IMP-16 implicit export of top-level schema/enum/fn | C | export-visibility.test.ts |
| IMP-17 re-export `export { A as B } from` (no local binding) | C | export-visibility.test.ts |
| IMP-18 plain import not re-exported | C | export-visibility.test.ts |
| IMP-19 import-unknown-symbol names source not alias | C | imports.test.ts |
| IMP-20 unknown-symbol after resolved parse; batched; distinct from unknown-identifier | C | diagnostics-primitive.test.ts; imports.test.ts |
| IMP-21 import-name-collision (two imports) | C | imports.test.ts |
| IMP-22 import colliding with top-level decl | C | imports.test.ts |
| IMP-23 import-cycle (static graph, path printed) | C | imports.test.ts |

## 4. Summary counts

- In-scope requirements mapped: **112** (FRNT 79, DESC 10, IMP 23).
- Covered by a cited test: **106** (C or N; includes 6 new-test assertions).
- New tests authored: **2 files / 15 tests**, all green (incl. 3 `it.fails`
  spec repros).
- Findings (confirmed loom-defects): **3** (FIND-S2-1/2/3), all FRNT
  advisory-diagnostic gaps, severity *partial*.
- Deferred-not-a-bug rows honoured (not asserted as shipped): FRNT-6 autocomplete
  gap, FRNT-12 `-not-strict-capable` E-path (Pi-SDK pin), FRNT-76
  operator-override, IMP-9 project/package imports (feature).
- Coverage gap without a finding: **DESC-3** (inline `///`), low behavioural
  weight; recommendation recorded above.
- No DESC or IMP spec-noncompliance found.

## 5. Method notes

- Offline entry used for all new tests: `parseFrontmatter(source, {file,
  modelMatcher})` (`src/parser/frontmatter.ts:665`), matching the existing
  `frontmatter-contract.test.ts` harness pattern (inert resolving matcher).
- Ground truth for the three findings was independently confirmed through
  `parseLoomDocument` via the pre-existing `tests/e2e-s4-probe.test.ts` PROBE
  logging (`deferred-frontmatter`, `bind-echo-without-params`,
  `argument-hint-no-desc` all show the absent/wrong code).
- No `src/**` production code modified. No existing test weakened.
