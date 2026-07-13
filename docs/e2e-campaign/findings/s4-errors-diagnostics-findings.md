# S4 (errors-diagnostics-cancellation-hard-ceilings) — findings

Slice S4 areas: ERR (49 reqs), DIAG (191), CANCEL (31), HC (36) = 307. Method: M1
offline-unit (`parseLoomDocument`, `src/parser/loom-document.ts:563`) + M2 conformance.
Phase C rule: findings recorded, nothing fixed.

Suite result: all 18 existing S4 suites pass (191 tests). Two new S4 suites added, both
green (`execution/s4-errors-diagnostics-results.md`).

Headline: the **closed diagnostic code registry is not honoured**. Ten registry codes
(REQ-DIAG-*) are emitted **nowhere** in `src/**` — no code literal, no message literal —
and a production `parseLoomDocument` probe yields nothing for their documented trigger
while control cases fire. None appears in the Cluster-4 Deferred appendix
(`docs/e2e-campaign/analysis/spec-requirements.md:1282-1296`), so none is a sanctioned
deferral. Each is a loom-defect (FIND-S4-1..10). ERR / CANCEL / HC surfaced **zero**
loom-defects — coverage gaps only (FIND-S4-12, verdict test-artifact).

Cross-witness: the S1 slice independently authored red tests
(`tests/e2e-s1-expr-diagnostics.test.ts`, REQ-EXPR-7/23/34/35/41/46) asserting six of
these same never-emitted parse/type codes; those tests are red today for the identical
reason, corroborating FIND-S4-1..6.

---

### FIND-S4-1: `loom/parse/unknown-identifier` is never emitted
- Requirement: REQ-DIAG-69, REQ-EXPR-7, REQ-EXPR-23-adjacent
- Spec citation: `docs/spec_topics/diagnostics/code-registry-parse.md:59` ("Bare identifier in call or value position resolves to nothing in scope"); `docs/spec_topics/expressions.md §Identifier resolution`
- Method: M1
- Repro: `tests/e2e-s4-never-emitted-diagnostics.test.ts` ("unknown-identifier …"); `parseLoomDocument("let x = doesNotExist")` → `diagnostics == []`
- Expected: one `loom/parse/unknown-identifier` error, message `unknown identifier '<name>'`.
- Observed: no diagnostic. The code literal + message literal are absent from all of `src/**`. An author referencing an undefined identifier gets no parse diagnostic and the loom loads/registers.
- Verdict: loom-defect
- Severity: blocks-spec-compliance

### FIND-S4-2: `loom/parse/unknown-method` is never emitted
- Requirement: REQ-DIAG-70, REQ-EXPR-23
- Spec citation: `docs/spec_topics/diagnostics/code-registry-parse.md:60`; `docs/spec_topics/expressions.md §"Built-in methods and properties"` (REQ-EXPR-23: "parse error, not a runtime failure")
- Method: M1
- Repro: `tests/e2e-s4-never-emitted-diagnostics.test.ts`; `parseLoomDocument('let x = "hi".frobnicate()')` → `[]` (control `"hi".length` also `[]`, i.e. no method/property type-check fires either way)
- Expected: one `loom/parse/unknown-method` error, message `unknown method '<method>' on type <type>`.
- Observed: no diagnostic. Code + message absent from `src/**`.
- Verdict: loom-defect
- Severity: blocks-spec-compliance

### FIND-S4-3: `loom/parse/mixed-plus-operands` is never emitted
- Requirement: REQ-DIAG-46
- Spec citation: `docs/spec_topics/diagnostics/code-registry-parse.md:36` (`+` on a number/integer and a string, or any mixed pair)
- Method: M1
- Repro: `parseLoomDocument('let x = 1 + "a"')` → `[]`
- Expected: one type-phase `loom/parse/mixed-plus-operands` error, message `'+' has mixed operand types: <left> and <right>`.
- Observed: no diagnostic; both operand types are statically concrete (integer, string) so this is not a deferrable "unknown" operand. Code + message absent from `src/**`.
- Verdict: loom-defect
- Severity: blocks-spec-compliance

### FIND-S4-4: `loom/parse/non-orderable-operands` is never emitted
- Requirement: REQ-DIAG-47
- Spec citation: `docs/spec_topics/diagnostics/code-registry-parse.md:37` (`<`/`<=`/`>`/`>=` on a non-orderable pair)
- Method: M1
- Repro: `parseLoomDocument("let x = true < false")` → `[]`; `1 < "a"` → `[]`
- Expected: one type-phase `loom/parse/non-orderable-operands` error, message `'<op>' requires two numeric or two string operands; got <left> and <right>`.
- Observed: no diagnostic. Code + message absent from `src/**`.
- Verdict: loom-defect
- Severity: blocks-spec-compliance

### FIND-S4-5: `loom/parse/extra-object-field` is never emitted
- Requirement: REQ-DIAG-54
- Spec citation: `docs/spec_topics/diagnostics/code-registry-parse.md:44` (schema constructor lists a field the schema does not declare)
- Method: M1
- Repro: `parseLoomDocument('schema S { a: string }\nlet x = S { a: "h", b: 2 }')` → `[]`
- Expected: one `loom/parse/extra-object-field` error, message `extra field '<field>' on schema '<schema>'`.
- Observed: no diagnostic; undeclared field `b` is silently accepted on a statically-declared schema. Code + message absent from `src/**`.
- Verdict: loom-defect
- Severity: blocks-spec-compliance

### FIND-S4-6: `loom/parse/bare-object-literal` is never emitted
- Requirement: REQ-DIAG-56
- Spec citation: `docs/spec_topics/diagnostics/code-registry-parse.md:46` (bare `{ field: expr }` outside the two carve-outs)
- Method: M1
- Repro: `parseLoomDocument("let x = { a: 1 }")` → `[]`
- Expected: one `loom/parse/bare-object-literal` error, message `bare object literal not permitted in this position; name the schema (Schema { ... })`.
- Observed: no diagnostic. Code + message absent from `src/**`.
- Verdict: loom-defect
- Severity: blocks-spec-compliance

### FIND-S4-7: `loom/parse/bind-echo-on-bypass` is never emitted
- Requirement: REQ-DIAG-113
- Spec citation: `docs/spec_topics/diagnostics/code-registry-parse.md:103` (`bind_echo: true` on a single-string-bypass loom)
- Method: M1
- Repro: `parseLoomDocument("---\nmode: prompt\nparams:\n  q: string\nbind_echo: true\n---\nhi")` → no `bind-echo-on-bypass`
- Expected: one warning `loom/parse/bind-echo-on-bypass`, message `'bind_echo: true' has no effect on a single-string-bypass loom`.
- Observed: no diagnostic. Code + message absent from `src/**`.
- Verdict: loom-defect
- Severity: partial (advisory W-severity; author gets no notice the flag is inert)

### FIND-S4-8: `loom/load/bind-echo-without-params` is never emitted
- Requirement: REQ-DIAG-131
- Spec citation: `docs/spec_topics/diagnostics/code-registry-load.md:17` (explicit `bind_echo: true` on a no-params loom)
- Method: M1
- Repro: `parseLoomDocument("---\nmode: prompt\nbind_echo: true\n---\nhi")` → no `bind-echo-without-params`
- Expected: one warning `loom/load/bind-echo-without-params`, message `'bind_echo: true' has no effect on a no-params loom`.
- Observed: no diagnostic. Code + message absent from `src/**`.
- Verdict: loom-defect
- Severity: partial

### FIND-S4-9: `loom/load/argument-hint-not-displayed` is never emitted
- Requirement: REQ-DIAG-146
- Spec citation: `docs/spec_topics/diagnostics/code-registry-load.md:32` (`argument-hint:` declared without `description:`)
- Method: M1
- Repro: `parseLoomDocument("---\nmode: prompt\nargument-hint: foo\n---\nhi")` → no `argument-hint-not-displayed`
- Expected: one warning `loom/load/argument-hint-not-displayed`, message `'argument-hint:' declared without 'description:'; Pi's autocomplete entry will be empty`.
- Observed: no diagnostic. Code + message absent from `src/**`.
- Verdict: loom-defect
- Severity: partial

### FIND-S4-10: `loom/load/deferred-frontmatter-field` is never emitted; reserved fields wrongly get `unknown-frontmatter-field`
- Requirement: REQ-DIAG-127, REQ-FRNT-23
- Spec citation: `docs/spec_topics/diagnostics/code-registry-load.md:13`; deferred appendix `docs/e2e-campaign/analysis/spec-requirements.md:1264` ("Deferred `binder_temperature` … surface as `loom/load/deferred-frontmatter-field` warnings")
- Method: M1
- Repro: `parseLoomDocument("---\nmode: prompt\nbinder_temperature: 0.5\n---\nhi")` → `[{code:"loom/load/unknown-frontmatter-field", message:"unknown frontmatter field 'binder_temperature'"}]`
- Expected: one warning `loom/load/deferred-frontmatter-field`, message `frontmatter field '<field>' is reserved for a deferred loom 1.0 feature`.
- Observed: the generic `loom/load/unknown-frontmatter-field` fires instead. Structural root cause: `src/parser/frontmatter.ts` carries only a `LOOM_1_0_FIELDS` recognised set (`:247`) and routes every other key to `unknown-frontmatter-field` (`:816`); there is **no** deferred/reserved-field set, so `deferred-frontmatter-field` is never reachable and every reserved field is mis-coded. Both `deferred-frontmatter-field` literal and its message are absent from `src/**`.
- Verdict: loom-defect (missing code + wrong code emitted for the reserved-field trigger)
- Severity: partial (advisory W-severity, but a closed-registry code that cannot fire and a documented reserved field routed to the wrong code)

### FIND-S4-11: retired code `loom/host/session-shutdown-runtime-degraded` lingers as a src constant
- Requirement: REQ-DIAG-2 (closed set); REQ-SESS-7 / REQ-PIC-72 (code retired)
- Spec citation: `docs/spec_topics/pi-integration-contract/session-only-degraded-state.md:3` (RESOLVED `governed-by-rebind` — the degraded-state branch and this diagnostic row are excised/retired); `docs/spec_topics/session-model-and-appendix.md:23` ("that code is retired")
- Method: M4 inspection
- Repro: `src/extension/session-shutdown.ts:51` `export const RUNTIME_DEGRADED_CODE = "loom/host/session-shutdown-runtime-degraded"`; referenced in a type union (`:313`) and in the diagnostic-emission serialiser exercised by `tests/session-shutdown.test.ts:520-525`. The code is **not** in the registry (`.s4-scratch/src-not-in-registry.txt`) and is **not** pushed by the shutdown handler (`session-shutdown.ts:468` comment: emits no such row under `governed-by-rebind`).
- Expected: a retired code leaves no live emission-capable surface (closed-set hygiene).
- Observed: a dead constant + type-union arm + serialiser branch for a retired code remain. Harmless at runtime (never emitted) but dead surface a closed-set audit could flag.
- Verdict: borderline
- Severity: cosmetic

### FIND-S4-12: ERR/CANCEL/HC in-scope coverage gaps (no loom-defect)
- Requirement: REQ-ERR-1, REQ-ERR-6, REQ-ERR-16(cancel-arm); REQ-CANCEL-4(reverse), REQ-CANCEL-6, REQ-CANCEL-26; REQ-HC-26
- Spec citation: `docs/e2e-campaign/analysis/spec-requirements.md:559-611,807-841,842-882`
- Method: M2 (test-body inspection of all covering suites)
- Repro: coverage tables in `execution/s4-errors-diagnostics-results.md`
- Expected: each in-scope conformance row asserted by some test.
- Observed: the shipped behaviour is present at the emit/wiring sites, but the following in-scope rows have **no** asserting test body: ERR-1 (three-outcome set-closure), ERR-6 ("exactly eight" pre-eval surface closure), ERR-16 cancel two-arm; CANCEL-6 (already-aborted-at-`createAgentSession`-resolve → synchronous `session.abort()` ordering), CANCEL-4 reverse arm (`loomAbort` → unwrapped Pi `abort()` one-shot), CANCEL-26 (tool-checkpoint abort → `Err(code_tool, cause:"cancelled")` surfacing, currently only closed-enum membership); HC-26 (audience-coverage invariant). No spec-noncompliance observed on any of these.
- Verdict: test-artifact (coverage gaps)
- Severity: partial

---

## Deferred / dormant confirmations (not findings)
- `loom/load/binder-model-not-strict-capable` (REQ-DIAG-144): present in src (`src/binder/binder-model.ts:58`) but dormant under the loom 1.0 Pi-SDK pin (`strictCapable` absent); the W-level `binder-model-strict-capability-unknown` fires instead. Appendix `spec-requirements.md:1293`. deferred-not-a-bug.
- `loom/host/session-swap-instance-survived` (REQ-DIAG-190): present (`src/extension/session-swap-tripwire.ts:47`), a fail-fast tripwire dormant on every conformant Pi minor. Appendix `spec-requirements.md:1294`. deferred-not-a-bug.
- `loom/typecheck/*` (REQ-DIAG-14): build-time `tsc` brands, out of the runtime registry. Correctly absent.
- REQ-ERR-42 (ContextOverflowError), REQ-HC-32/35: `live` testability, out of scope for M1/M2.
- Per-call `timeout:` deferred, but the parse-time rejection (REQ-CANCEL-30 / REQ-HC-31, `loom/parse/timeout-field-rejected`) is in scope and COVERED.
