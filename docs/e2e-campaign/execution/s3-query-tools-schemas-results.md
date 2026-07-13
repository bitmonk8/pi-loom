# S3 (query-tools-schemas) — execution results

Areas: QRY (46 reqs), TOOL (23), SCH (42) = 111. Primary methods: M1 offline-unit +
M2 conformance via the scripted `QueryModelDriver` seam (`src/runtime/query-tool-loop.ts:119`).
CWD `C:/UnitySrc/pi-loom`. Phase C rule honoured: no `src/**` change, no existing test
weakened.

## 1. Existing-suite results

Command:
`npx vitest run query-render query-followup-render query-discard query-respond-repair query-swallowing-handler query-tool-loop query-schema-inference query-schema-resolve queryerror-variants typed-query-schema-integration production-typed-query-validation tool-calls tool-calls-execute-lowering tool-calls-parallel-batch tool-calls-depth-ceiling tool-calls-host-denial tool-calls-off-surface-routing tool-calls-swallowing-handler tool-return-shape schema-declarations schema-lowering-hash schema-subset-gate schema-validator-seam prompt-tool-loop-governor frontmatter-tool-loop-respond-repair`

Result: **26 files / 319 tests, all PASS.** (The globs matched 26 files — the
`tool-calls-off-surface-live-wiring` and `tool-return-shape-one-note-production-wired`
files were pulled in by the `tool-calls`/`tool-return-shape` prefixes; all green.)

| Suite file | tests | result |
|---|---|---|
| query-render | 27 | PASS |
| query-followup-render | 5 | PASS |
| query-discard | 5 | PASS |
| query-respond-repair | 14 | PASS |
| query-swallowing-handler | 4 | PASS |
| query-tool-loop | 10 | PASS |
| query-schema-inference | 17 | PASS |
| query-schema-resolve | 34 | PASS |
| queryerror-variants | 13 | PASS |
| typed-query-schema-integration | 6 | PASS |
| production-typed-query-validation | 5 | PASS |
| tool-calls | 10 | PASS |
| tool-calls-execute-lowering | 19 | PASS |
| tool-calls-parallel-batch | 4 | PASS |
| tool-calls-depth-ceiling | 4 | PASS |
| tool-calls-host-denial | 8 | PASS |
| tool-calls-off-surface-routing | 15 | PASS |
| tool-calls-off-surface-live-wiring | 13 | PASS |
| tool-calls-swallowing-handler | 4 | PASS |
| tool-return-shape-one-note-production-wired | 2 | PASS |
| schema-declarations | 10 | PASS |
| schema-lowering-hash | 12 | PASS |
| schema-subset-gate | 44 | PASS |
| schema-validator-seam | 8 | PASS |
| prompt-tool-loop-governor | 12 | PASS |
| frontmatter-tool-loop-respond-repair | 14 | PASS |

`npm run typecheck`: clean (with the new tests present).

## 2. Coverage map

Full per-requirement maps (one row per REQ, cited `file :: describe/it` or `path:line`)
are in:

- `execution/_s3-qry-coverage.md` — REQ-QRY-1..46
- `execution/_s3-tool-coverage.md` — REQ-TOOL-1..23
- `execution/_s3-sch-coverage.md` — REQ-SCH-1..42

Note: existing tests cite **spec tags** (`QRY-n`), which fan out many-to-one to campaign
REQ-IDs (e.g. `QRY-3`→REQ-QRY-3..7). The maps resolve this by reading each `describe`/`it`
body, not the tag string alone.

### Coverage summary

| Area | Reqs | COVERED | PARTIAL | UNCOVERED (offline/conf) | manual/inspection-only |
|---|---|---|---|---|---|
| QRY | 46 | 39 | 6 | 1 (REQ-QRY-42) | 0 |
| TOOL | 23 | 13 | 6 | 2 (REQ-TOOL-2, -20) | 2 (REQ-TOOL-21, -22) |
| SCH | 42 | 28 | 8 | 5 → now 2 after new tests (REQ-SCH-27, -37) | 1 (REQ-SCH-38 SUBS-2) |

"COVERED" = a concrete offline/conformance test location, or a live-column req with an
offline sub-unit + live e2e. PARTIAL = a concrete test exists but does not reach the full
normative claim (facets listed in the per-area files). UNCOVERED = no concrete test.

Live-column reqs (QRY-1/2/22/24..46 etc.) are exercised by driven-conversation /
production / hardening tests plus offline sub-units; the end-to-end model-turn half is
S7's live triage. See `_s3-qry-coverage.md` §"live-only REQs".

### UNCOVERED / PARTIAL offline+conformance requirements (pre-S3-new-tests)

- **QRY:** REQ-QRY-42 (QRY-15 initial forced-respond template byte-exactness) — UNCOVERED.
  Partials: REQ-QRY-13, -20, -26, -27, -38, -40.
- **TOOL:** REQ-TOOL-2 (no turn added), REQ-TOOL-20 (schema-cache posture) — UNCOVERED.
  Partials: REQ-TOOL-5, -15, -16, -17, -18, -23.
- **SCH:** REQ-SCH-7, -19, -27, -32, -37 — UNCOVERED. Partials: REQ-SCH-1, -5, -9, -11,
  -16, -17, -29, -31.

## 3. New tests authored (S3)

All under `tests/`, driving production paths; all PASS (15 tests / 3 files). Runner:
`npx vitest run e2e-s3-typed-query-conformance e2e-s3-schema-lowering-conformance e2e-s3-tool-error-envelope` → **3 files / 15 tests PASS**.

| New test file | tests | REQs addressed | method | result |
|---|---|---|---|---|
| `tests/e2e-s3-typed-query-conformance.test.ts` | 6 | REQ-QRY-36, -11, -30 (deterministic e2e); CAND-1 repro | M2 | PASS |
| `tests/e2e-s3-schema-lowering-conformance.test.ts` | 7 | REQ-SCH-7, REQ-SCH-19, REQ-SCH-32 | M1 | PASS |
| `tests/e2e-s3-tool-error-envelope.test.ts` | 2 | REQ-TOOL-15 (partial→complete) | M2 | PASS |

New coverage closed: REQ-SCH-7, REQ-SCH-19, REQ-SCH-32 (fully); REQ-TOOL-15 (envelope
field contrast); and a deterministic end-to-end pin of the typed-query two-phase loop +
schema validation (REQ-QRY-36/-11/-30) that the prior tests exercised only in fragments.

Residual UNCOVERED offline/conformance after S3 (recorded as borderline findings
FIND-S3-3..7, not fixed in Phase C): REQ-QRY-42, REQ-TOOL-2, REQ-TOOL-20, REQ-SCH-27,
REQ-SCH-37.

## 4. CAND-1 analysis (typed-query "must be object")

**Question (status.md):** live H8a "typed-query lowering, bounded" + acceptance (b)
named-schema + (c) inline-object all fail schema validation with AJV `"must be object"`.
Loom defect, provider-capability, or test artifact?

**Deterministic M2 repro** (`tests/e2e-s3-typed-query-conformance.test.ts`), driving the
REAL production collaborators (`parseLoomDocument` → `lowerQueryResponseSchema` →
`AjvSchemaValidator` → `buildTypedQueryValidation` → `runTypedQueryLoop`) with a scripted
`QueryModelDriver`:

- conforming object `{category:"question",urgent:false}` → `Ok(value)`.
- `null` / prose string / number reply → `Err(QueryError{kind:"validation",cause:"schema_validation"})`
  whose leading `ValidationIssue` is `{schema_keyword:"type", message:"must be object"}` —
  the identical CAND-1 string.
- wrong-shape object → QRY-11 respond-repair → conforming follow-up binds corrected value.
- unrecoverable (all follow-ups non-conforming) → terminal validation `Err`, attempts consumed.

**Verdict: NOT a loom lowering/validation defect.** The `"must be object"` is loom
CORRECTLY refusing to bind a non-object payload (REQ-QRY-36: "never bind an unvalidated
response"). The lowering is correct (`production-typed-query-validation.test.ts:242`
already pins the lowered `Triage` shape; `typed-query-schema-integration.test.ts` pins the
resolve→lower→convey→validate→repair wiring).

The residual LIVE failure is:

1. **test-artifact (primary, evidenced — FIND-S3-2):** the H8a typed loom
   (`tests/live/live-production-acceptance.test.ts:50-58`) is a **two-query** loom —
   `let answer:{…} = @\`…\`` then `@\`${answer.label}\``. `driveSlashCaptureText`
   (`:210`) captures the TRAILING assistant turn = the second, *untyped* query's free
   text, and the test then `JSON.parse(reply)` (`:211`) + validates it against
   `TYPED_REPLY_SCHEMA` (`:219`). Parsing free prose as the typed schema yields
   `"must be object"` independent of whether the typed query succeeded. The harness scores
   the wrong turn.
2. **provider-capability (secondary):** if the acceptance model (`claude-haiku-4-5`) does
   not reliably emit a conforming object through the forced-respond tool, loom's `Err` is
   spec-correct while the live assertion (`outcome.ok === true`) is what fails. Confirm by
   a second-provider live re-run (S7).

**CAND-1 must not be counted as a loom-defect.** Recommended Phase-D action targets the
TEST (single-query typed loom, or assert on the bound typed value rather than a re-parsed
trailing turn), plus an S7 live re-run to separate the test-artifact from any provider
capability gap.

## 5. Summary counts

- Existing S3 suites run: 26 files / 319 tests — all PASS.
- New S3 tests authored: 3 files / 15 tests — all PASS. Typecheck clean.
- Coverage: 111 reqs mapped. Newly closed offline/conformance gaps: REQ-SCH-7, -19, -32,
  REQ-TOOL-15; deterministic e2e pin of REQ-QRY-36/-11/-30.
- Findings: 7 (`findings/s3-query-tools-schemas-findings.md`). FIND-S3-1 (CAND-1 loom-defect
  ruled out) + FIND-S3-2 (CAND-1 = test-artifact, evidenced) + FIND-S3-3..7 (borderline
  coverage gaps). **Zero open loom-defect findings in S3.**
- Deferred appendix Cluster-3 items: none asserted as shipped.
