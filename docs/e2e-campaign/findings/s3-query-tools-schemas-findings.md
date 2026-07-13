# S3 (query-tools-schemas) — findings

Slice S3 areas: QRY (46 reqs), TOOL (23), SCH (42) = 111. Method: M1 offline-unit +
M2 conformance (scripted `QueryModelDriver` seam, `src/runtime/query-tool-loop.ts:119`).
Phase C rule: findings recorded, nothing fixed.

All 26 existing S3 suites + 3 new S3 suites pass (see `execution/s3-query-tools-schemas-results.md`).
No spec-noncompliance was observed in any offline/conformance path. The findings below
are (1) the CAND-1 triage verdict and (2) residual coverage gaps recorded as borderline.

---

### FIND-S3-1: CAND-1 typed-query "must be object" is spec-correct loom behaviour, not a lowering defect
- Requirement: REQ-QRY-36 (spec tag QRY-22), REQ-QRY-2 (QRY-2), REQ-SCH-19/28/31 (SUBS-1)
- Spec citation: `docs/spec_topics/query/query-failure-and-repair.md:78` (REQ-QRY-36:
  "validate the final response against the lowered schema … and never bind an
  unvalidated response"); `docs/spec_topics/schema-subset.md:81` (SUBS-1)
- Method: M2 (deterministic, scripted `QueryModelDriver` + real production collaborators)
- Repro: `tests/e2e-s3-typed-query-conformance.test.ts` (new; 6 tests, all pass). Drives
  the REAL path — `parseLoomDocument` → `lowerQueryResponseSchema` (`src/runtime/query-schema-lowering.ts:46`)
  → `AjvSchemaValidator` (`src/seams/schema-validator.ts:104`) → `buildTypedQueryValidation`
  (`src/runtime/typed-query-validation.ts:104`) → `runTypedQueryLoop` (`src/runtime/query-tool-loop.ts`).
- Expected (per REQ-QRY-36): a typed `@<Triage>` query validates the forced-respond
  payload against the lowered declared schema; a conforming object binds `Ok(value)`; a
  non-conforming or non-object payload is NEVER bound — it surfaces
  `Err(QueryError { kind:"validation", cause:"schema_validation" })`, routing through
  QRY-11 respond-repair first.
- Observed (deterministic): exactly that. A conforming object → `Ok`. A **non-object**
  reply (`null`, a prose string, or a number) → `Err(validation, schema_validation)`
  whose leading `ValidationIssue` is `{ schema_keyword:"type", message:"must be object" }`
  — the identical AJV string the live H8a "typed-query lowering, bounded" bullet and
  acceptance (b)/(c) report as CAND-1. A wrong-shape object recovers via one respond-repair
  follow-up; an unrecoverable sequence exhausts to the terminal validation `Err`.
- Verdict: **loom-defect RULED OUT** for the typed-query lowering + validation path. The
  live `"must be object"` is loom CORRECTLY rejecting a non-object payload per REQ-QRY-36,
  not a lowering error. The residual LIVE failure is **test-artifact** (primary; see
  FIND-S3-2) and/or **provider-infra/capability** (secondary): the acceptance model may
  not emit a conforming object via the forced-respond tool, in which case loom's `Err` is
  correct and the live assertion (`outcome.ok === true`) is what is wrong. Definitive
  live re-run confirmation is S7's charge.
- Severity: n/a for loom (behaviour is spec-correct). CAND-1 must NOT be counted as a
  loom-defect.

### FIND-S3-2: live H8a "typed-query lowering, bounded" JSON-parses the wrong turn (test-artifact contributing to CAND-1)
- Requirement: REQ-QRY-36 (QRY-22) — the live harness assertion, not the loom
- Spec citation: n/a (harness assertion stricter than spec); `tests/live/live-production-acceptance.test.ts:50-58` (the loom), `:210-219` (the parse+validate)
- Method: M4 inspection of the live harness + M2 corroboration
- Repro / evidence: the H8a typed loom (`live-production-acceptance.test.ts:50-58`) is a
  TWO-query loom —
  `let answer: { ok: bool, label: string } = @\`…\`` followed by `@\`${answer.label}\``.
  `driveSlashCaptureText(handle.session, "/typed")` (`:210`) captures the TRAILING
  assistant turn, which is the SECOND, untyped `@\`${answer.label}\`` query's free text
  (the interpolated label), NOT the typed query's structured payload. The test then does
  `JSON.parse(reply)` (`:211`) on that free text and validates it against
  `TYPED_REPLY_SCHEMA`, so a non-JSON / non-object trailing turn yields AJV
  `"must be object"` regardless of whether the typed query itself succeeded.
- Expected: the assertion should observe the TYPED query's bound value (the object), not
  the trailing untyped query's streamed prose.
- Observed: the assertion scores the wrong turn; the CAND-1 `"must be object"` is a
  predictable consequence of parsing free text as JSON.
- Verdict: **test-artifact** (the harness asserts something the spec does not require of
  the trailing turn). Fix belongs to the test in Phase D (e.g. make the typed loom a
  single-query loom, or assert on the bound typed value rather than a re-parsed trailing
  turn). Not a loom-defect.
- Severity: partial (blocks the live green until the harness assertion is corrected).

### FIND-S3-3: REQ-QRY-42 (initial forced-respond template byte-exactness) UNCOVERED
- Requirement: REQ-QRY-42 (spec tag QRY-15)
- Spec citation: `docs/spec_topics/query/query-tool-loop.md:24-30`
- Method: M2 conformance (offline render)
- Repro: no test. `tests/query-followup-render.test.ts:88` byte-asserts the FOLLOW-UP
  `schema_repeat` template, but nothing asserts the INITIAL forced-respond body equals
  `schema_repeat` minus its non-compliance sentence, emitted verbatim, interpolating only
  `<slug>`/`<schema-json>`, with a single U+000A between the instruction and `<schema-json>`.
- Expected: an offline byte-exact render assertion of the initial forced-respond template.
- Observed: absent.
- Verdict: **borderline** (coverage gap; behaviour presumed correct — `renderFollowUpTurn`
  exists and the follow-up templates are byte-tested). Recommend a new offline render test
  in Phase D.
- Severity: cosmetic (coverage completeness).

### FIND-S3-4: REQ-TOOL-2 (code-side call adds no conversation turn / consumes no tokens) UNCOVERED
- Requirement: REQ-TOOL-2
- Spec citation: `docs/spec_topics/tool-calls.md:12`
- Method: M2 conformance
- Repro: no test asserts a code-side `<name>(args)` call appends no turn, consumes no
  tokens, and is absent from the transcript (code → side-effect, not code → model).
- Expected: a conformance test observing transcript/turn-count unchanged across a
  code-side call.
- Observed: absent.
- Verdict: **borderline** (coverage gap). Recommend a driven-conversation conformance
  test in Phase D.
- Severity: cosmetic.

### FIND-S3-5: REQ-TOOL-20 (schema cache read-mostly / immutable / concurrent-share) UNCOVERED
- Requirement: REQ-TOOL-20
- Spec citation: `docs/spec_topics/tool-calls.md:38`
- Method: M2 conformance
- Repro: no test exercises the compiled-validator cache's read-mostly / immutable-post-
  compile / safe-across-concurrent-invocations / writes-only-on-compile-or-watcher-
  invalidation posture. (`schema-validator-seam.test.ts` covers slug-collision recompile
  but not the concurrency-share posture.)
- Expected: a conformance test sharing one cache across concurrent invocations asserting
  no mutation except on initial compile / watcher invalidation.
- Observed: absent.
- Verdict: **borderline** (coverage gap).
- Severity: cosmetic.

### FIND-S3-6: REQ-SCH-27 (post-decode depth walk; params bounded at depth 2) UNCOVERED
- Requirement: REQ-SCH-27
- Spec citation: `docs/spec_topics/schema-subset.md:64-67`
- Method: M1 offline-unit
- Repro: no test for: the walk runs on the post-decode JSON value; a JSON-parse failure is
  a parse-validation (not depth) failure; primitive / `array<T>`-over-primitive `params`
  are structurally bounded at depth 2 (walk a no-op but still installed).
- Verdict: **borderline** (coverage gap).
- Severity: cosmetic.

### FIND-S3-7: REQ-SCH-37 (lowering step 6 — post-lowering discriminator sanity check) UNCOVERED
- Requirement: REQ-SCH-37
- Spec citation: `docs/spec_topics/schema-subset.md:88-90`
- Method: M1 offline-unit
- Repro: no test for lowering step 6 (discriminator detection re-run on the lowered
  `anyOf` as a parse-time sanity check; no extra discriminator marker; lowering pure /
  once-per-file-load). REQ-SCH-32 output shape is now covered by
  `tests/e2e-s3-schema-lowering-conformance.test.ts`, but the step-6 sanity-check/idempotence
  facet is not.
- Verdict: **borderline** (coverage gap).
- Severity: cosmetic.

---

## Coverage gaps newly CLOSED by S3 new tests

- REQ-SCH-7 (enum variant wire-value default + `= "..."` override) — `tests/e2e-s3-schema-lowering-conformance.test.ts`
- REQ-SCH-19 (emitted subset types are exactly the seven) — same file
- REQ-SCH-32 (discriminated object union → `anyOf`, no `discriminator` keyword, per-variant `const`) — same file
- REQ-TOOL-15 (CodeToolError carries no `tool_call_id`/`raw_response`; distinct from ModelToolError) — `tests/e2e-s3-tool-error-envelope.test.ts`
- REQ-QRY-36 / REQ-QRY-11 / REQ-QRY-30 deterministic end-to-end (CAND-1 repro) — `tests/e2e-s3-typed-query-conformance.test.ts`

## Deferred appendix items confirmed NOT tested as shipped (correctly)

Per `spec-requirements.md` Deferred appendix Cluster 3: per-query overrides, pre-flight
token estimation, oversized-template pre-flight bound, internal `execute()` timeout,
streaming `onUpdate`, `parallel {}`, richer untyped-return shape, native structured
output, SUBS-2 synonym grep gate. None were asserted as shipped. REQ-TOOL-21 / REQ-TOOL-22
(manual/inspection) and REQ-SCH-38 (SUBS-2 terminology) are inspection-only — not test
candidates.
