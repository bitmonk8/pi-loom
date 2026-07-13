# S3 — QRY area coverage map

Scope: REQ-QRY-1..46 (`docs/e2e-campaign/analysis/spec-requirements.md:434-479`).
Method: existing tests cite **spec tags** (`QRY-n`), not campaign REQ-IDs; several campaign REQs share one spec tag. Mapping below is by reading each `describe`/`it` body, not the tag alone.

Spec-tag → campaign-REQ fan-out (from the requirements table):
`QRY-1`→1 · `QRY-2`→2 · `QRY-3`→3,4,5,6,7 · `QRY-4`→8,9 · `QRY-5`→10 · `QRY-6`→11,12,13 · `QRY-7`→14,15,16 · `QRY-17`→17 · `QRY-18`→18,19,20 · `QRY-19`→21 · `QRY-20`→22 · `QRY-21`→23 · `QRY-8`→24(,34) · `QRY-9`→25,26 · `QRY-10`→27,28(,35) · `QRY-11`→29,30(,34,35,36) · `QRY-12`→31,32,33 · `QRY-22`→36 · `QRY-13`→37,38 · `QRY-14`→39,40,41 · `QRY-15`→42 · `QRY-16`→43,44,45 · (no tag)→46.

> NB: a test string reading `QRY-8` maps to REQ-QRY-24 ("a query never throws"), NOT REQ-QRY-8 (whose spec tag is `QRY-4`). Likewise `QRY-9`/`QRY-10`/`QRY-11` strings map to REQ-QRY-25..35, not the low-numbered REQs.

## Coverage table

| Campaign REQ | Spec tag | Testability | Covering test file :: describe/it (or path:line) | Status | Note |
|---|---|---|---|---|---|
| REQ-QRY-1 | QRY-1 | live | `tests/conversation-drive.test.ts:337` "QRY-1: the untyped-query Ok(string) value is the assistant's text response as a string"; PIC-53 extraction `tests/conversation-drive.test.ts:283-323` | COVERED | Extraction unit-tested offline; full round-trip is live. |
| REQ-QRY-2 | QRY-2 | live | inference: `tests/query-schema-inference.test.ts:42-91`; e2e: `tests/typed-query-schema-integration.test.ts:303-463` | COVERED | Schema-inference half is offline; "hands strict contract to provider + AJV-validates response" is the live half (typed-query-schema-integration). |
| REQ-QRY-3 | QRY-3 | offline-unit | `tests/query-schema-inference.test.ts:128` "explicit ascription overrides the inference contexts"; `tests/query-schema-resolve.test.ts:323-337` | COVERED | Explicit `@<Schema>` override, incl. opaque positions. |
| REQ-QRY-4 | QRY-3 | offline-unit | `tests/query-schema-resolve.test.ts:169,190,245,266` (call-arg / fn-return / array-literal / ternary sinks) | COVERED | Sink flows from binding/return/call-arg; `.loom` tail is not a sink `:208`. |
| REQ-QRY-5 | QRY-3 | offline-unit | `tests/query-schema-inference.test.ts:43-91` (crosses `?`, let-RHS, call-arg, array); `tests/query-schema-resolve.test.ts:180,196,201,246,267` | COVERED | Transparent-construct crossing walk. |
| REQ-QRY-6 | QRY-3 | offline-unit | `tests/query-schema-inference.test.ts:104-120`; `tests/query-schema-resolve.test.ts:282-313` (binary/member/index/match-scrutinee/if/while stops) | COVERED | Opaque-stop rules. |
| REQ-QRY-7 | QRY-3 | offline-unit | `tests/query-schema-resolve.test.ts:339-350` "call-site parameter, not the outer binding annotation, is the sink"; untyped-on-no-sink `tests/query-schema-inference.test.ts:113-120` | COVERED | Innermost-sink-wins + no-sink→untyped. |
| REQ-QRY-8 | QRY-4 | offline-unit | `tests/query-schema-inference.test.ts:141` "explicit ascription supplies the schema even in an opaque match scrutinee"; `tests/query-schema-resolve.test.ts:323-334` | COVERED | Explicit form required/overrides where no context. |
| REQ-QRY-9 | QRY-4 | offline-unit | `tests/query-schema-inference.test.ts:157-260` (four `explicit-schema-mismatch` vectors + skip-when-unresolvable); `tests/query-schema-resolve.test.ts:390-411` | COVERED | `loom/parse/explicit-schema-mismatch` one-directional, safe-widening silent. |
| REQ-QRY-10 | QRY-5 | offline-unit | `tests/query-render.test.ts:71` "QRY-5: the multi-line template worked example is newline-trimmed then dedented" | COVERED | Multi-line, newline-trim→dedent. |
| REQ-QRY-11 | QRY-6 | offline-unit | `tests/query-render.test.ts:190` "parse-time warning fires on a whitespace-only static body … suppressed by `\n`" | COVERED | `loom/parse/empty-template` warning + `\n` suppression. |
| REQ-QRY-12 | QRY-6 | conformance | `tests/query-render.test.ts:204` "empty rendered template short-circuits to ValidationError{empty_template, attempts:0}" | COVERED | Short-circuit, no provider round-trip; ASCII-ws set (NBSP negative). |
| REQ-QRY-13 | QRY-6 | conformance | `tests/query-render.test.ts:204-234` (asserts `attempts:0`, `validation_errors:[]`) | PARTIAL | Pure short-circuit asserts `attempts:0`; no offline loop-level test proving zero follow-up turns appended / follow-up short-circuit consumes no slot. Live-gated echo only in `tests/hardening/query-empty-template.test.ts:41` (requireLiveProvider). |
| REQ-QRY-14 | QRY-7 | offline-unit | `tests/query-render.test.ts:44-90` (vector loop + QRY-5 body) | COVERED | Newline-trim first, dedent second. |
| REQ-QRY-15 | QRY-7 | offline-unit | `tests/query-render.test.ts:48-58` (tab-only, mixed tab/space no-strip, CRLF→LF, non-ASCII-ws-as-content vectors) | COVERED | Dedent rules 1-5 exercised via the normative vectors. |
| REQ-QRY-16 | QRY-7 | offline-unit | `tests/query-render.test.ts:44` `for (const vector of vectors)` — all 10 normative vectors | COVERED | The 10 input→output vectors render exactly. |
| REQ-QRY-17 | QRY-17 | offline-unit | `tests/query-render.test.ts:93-128` (escapes, `\$` suppression, `${}` split, illegal-escape, unterminated) | COVERED | `loom/parse/illegal-template-escape` + `unterminated-template`. |
| REQ-QRY-18 | QRY-18 | conformance | `tests/query-render.test.ts:139-172` (string/int/number/bool/null/enum/array/object); `tests/system-interpolation.test.ts:269-309` | COVERED | Full stringification table by Loom static type. |
| REQ-QRY-19 | QRY-18 | offline-unit | `tests/query-render.test.ts:176` "a `Result`-valued interpolation fires loom/parse/interpolated-result" | COVERED | Static rejection; runtime-panic variant not separately unit-tested. |
| REQ-QRY-20 | QRY-18 | conformance | `tests/system-interpolation.test.ts:309` "a schema-typed object renders as compact JSON.stringify with wire-name translation" | PARTIAL | Recursive outbound wire-name translation covered; the ordering claim ("after evaluation, before newline-trim/dedent") is not asserted by a dedicated conformance vector. |
| REQ-QRY-21 | QRY-19 | offline-unit | `tests/query-discard.test.ts:117`; `tests/whole-program-parser.test.ts:569-629` (fires at bare stmt; negative pins for `let _=`, `?`, used-in-expr, tail) | COVERED | `loom/parse/discarded-query-result`, position-scoped. |
| REQ-QRY-22 | QRY-20 | live | `tests/query-discard.test.ts:146,169,186,194` (Err→one display:false event w/ discard_site; void-tail form; Ok→no event; `buildDiscardEvent`) | COVERED | Observability unit-tested offline via `buildDiscardEvent`; live per spec column. |
| REQ-QRY-23 | QRY-21 | conformance | `tests/runtime-panics.test.ts:253` "QRY-21: a panic raised while evaluating an interpolated `${expr}` propagates as a thrown LoomPanic, not a discardable value" | COVERED | Panic propagates before `let _ =` completes. |
| REQ-QRY-24 | QRY-8 | live | `tests/query-respond-repair.test.ts:442` "QRY-8: on failure the loop RETURNS a Result carrying a kind-tagged QueryError — it never throws"; variant set `tests/queryerror-variants.test.ts:92-125` | COVERED | Six query-time variants enumerated in ERR-15 closed set. |
| REQ-QRY-25 | QRY-9 | live | `tests/query-respond-repair.test.ts:467` (QRY-9 routed through respond-repair → `schema_validation`); ERR-17 `:330,405` | COVERED | Non-compliance → one synthesised ValidationIssue → respond-repair. |
| REQ-QRY-26 | QRY-9 | live | `tests/query-respond-repair.test.ts:363,405` (ERR-17 wrong-tool feeds synthesised issue as validation, consumes one slot) | PARTIAL | Routed as validation (implying not `tool_loop_exhausted`); no assertion explicitly negating a `tool_loop_exhausted` surface for the CIO-4 exempt terminator. |
| REQ-QRY-27 | QRY-10 | live | `tests/query-respond-repair.test.ts:502` "a recognised context-overflow failure surfaces the context_overflow variant" | PARTIAL | Recognised-payload→`context_overflow` covered; end-of-stream classification, mid-stream vs clean-boundary, and HTTP-200 error-envelope-by-body not exercised. |
| REQ-QRY-28 | QRY-10 | live | `tests/query-respond-repair.test.ts:502` (tokens_used/tokens_limit null when provider omits) | COVERED | Nullable `number \| null` fields. |
| REQ-QRY-29 | QRY-11 | live | `tests/query-respond-repair.test.ts:127,159` (appends one new user turn per attempt; history preserved) | COVERED | Respond-repair appends new turn, not re-issue. |
| REQ-QRY-30 | QRY-11 | live | `tests/query-respond-repair.test.ts:127` (attempts bound → `schema_validation`); default 3 `tests/frontmatter-tool-loop-respond-repair.test.ts:107` | COVERED | Bounded by `respond_repair.attempts` (default 3), one slot per re-validated response. |
| REQ-QRY-31 | QRY-12 | conformance | `tests/query-followup-render.test.ts:65` "validator_error renders its follow-up user turn byte-for-byte" | COVERED | User-role follow-up, verbatim template. |
| REQ-QRY-32 | QRY-12 | conformance | `tests/query-followup-render.test.ts:112,126,156` (`<schema-json>`=JSON.stringify(lowered,null,2); `<slug>`; most-recent-attempt `<ajv-summary>` in ERR-14 order) | COVERED | All three placeholders. |
| REQ-QRY-33 | QRY-12 | conformance | `tests/query-followup-render.test.ts:65,88` (validator_error + schema_repeat byte-exact; schema_repeat = minus errors clause) | COVERED | Byte-exact fenced templates, trailing U+000A. |
| REQ-QRY-34 | QRY-8/QRY-11 | live | `tests/query-respond-repair.test.ts:224,250` (non-validation follow-up failure propagates own variant, no slot); `:272` (context_overflow) | COVERED | Proximate-variant propagation, no attempt consumed. |
| REQ-QRY-35 | QRY-10/QRY-11 | live | `tests/query-respond-repair.test.ts:272` "ContextOverflowError permanently short-circuits respond-repair"; `:502` | COVERED | Permanent short-circuit for the query's lifetime. |
| REQ-QRY-36 | QRY-22 | live | `tests/typed-query-schema-integration.test.ts:303-463`; `tests/production-typed-query-validation.test.ts:155-244`; `tests/acceptance/noninteractive-acceptance.test.ts:131-196` | COVERED | Resolve→lower(SUBS-1)→convey lowered shape→validate→respond-repair, never bind unvalidated. |
| REQ-QRY-37 | QRY-13 | live | `tests/query-tool-loop.test.ts:184` (CIO-4 free-phase slots); `tests/effectful-statement-host.test.ts:312` (real loop services a tool round) | COVERED | Schema enforced against final response only. |
| REQ-QRY-38 | QRY-13 | live | `tests/query-tool-loop.test.ts:351-382` (cancellation checkpoint skips dispatch) | PARTIAL | Cancelled-dispatch path tested; the "in-loop `execute()` throw / `{isError:true}` lowered to a tool-result and fed back, NOT `ModelToolError`" claim has no concrete QRY-path test (no `ModelToolError`/`isError` assertion in query-tool-loop). |
| REQ-QRY-39 | QRY-14 | live | `tests/effectful-statement-host.test.ts:312` (free phase then plain-text→forced respond); `tests/query-tool-loop.test.ts:224` | COVERED | Two-phase loop w/ forced `__loom_respond_<slug>`. |
| REQ-QRY-40 | QRY-14 | live | `tests/query-tool-loop.test.ts:224` "QRY-14: max_rounds:0 (typed) dispatches the forced respond turn as the only turn, with no free-phase provider call" | PARTIAL | Only-turn behaviour covered; the opening-body concatenation detail (prompt + instruction separated by exactly one U+000A, prompt trailing-U+000A right-trimmed) is not byte-asserted. |
| REQ-QRY-41 | QRY-14 | live | `tests/query-tool-loop.test.ts:184` (forced respond exempt from `max_rounds`); stop-reason classification `:453-487` (PIC-50/51 transport) | COVERED | Exempt terminator; non-standard stop reasons → QueryError variant. |
| REQ-QRY-42 | QRY-15 | conformance | — (none found) | UNCOVERED | No byte-exact test that the **initial forced-respond** body = `schema_repeat` minus its non-compliance sentence, interpolating only `<slug>`/`<schema-json>`. `query-followup-render` covers the follow-up `schema_repeat`/`validator_error` templates only; `effectful-statement-host.test.ts:312` QRY-15 is a live wiring witness, not a byte assertion. |
| REQ-QRY-43 | QRY-16 | live | `tests/query-tool-loop.test.ts:184` (one round per assistant batch); parallel-batch=one-slot `tests/prompt-tool-loop-governor.test.ts:130` | COVERED | Round accounting; parallel siblings awaited/lowered independently. |
| REQ-QRY-44 | QRY-16 | live | `tests/query-tool-loop.test.ts:256` "untyped query … surfaces tool_loop_exhausted at max_rounds"; typed forced-dispatch `:224`; governor cap `tests/prompt-tool-loop-governor.test.ts:113` | COVERED | Only free-phase rounds count; typed path dispatches forced respond instead of exhausting. |
| REQ-QRY-45 | QRY-16 | live | `tests/query-tool-loop.test.ts:294` "depth-6 typed response surfaces validation/maxDepth … enumerates ['ceiling#2'] on details.event.masked"; governor depth cap `tests/prompt-tool-loop-governor.test.ts:225,254` | COVERED | Depth-6 co-fire worked example. |
| REQ-QRY-46 | — | live | `tests/conversation-drive.test.ts:283-337` (PIC-53 trailing-turn Ok(string) extraction, prompt mode); subagent side `tests/production-subagent-query-model.test.ts` | COVERED | Prompt-mode extraction unit-tested; subagent-mode symmetry via the production-subagent model test (live). |

## UNCOVERED offline/conformance REQs worth new tests

Only offline-unit / conformance REQs with **no concrete covering test** are listed. (Live REQs are in the next section regardless of coverage.)

- **REQ-QRY-42** (`QRY-15`, conformance) — no test. Add an offline byte-exact render test that the **initial forced-respond template** body equals `schema_repeat` minus its non-compliance sentence, emitted verbatim, interpolating only `<slug>`/`<schema-json>`, with a single U+000A between the instruction sentence and `<schema-json>`. Spec: `query/query-tool-loop.md:24-30`. Nearest existing scaffold: `tests/query-followup-render.test.ts:88` (covers the *follow-up* `schema_repeat`, not the initial forced-respond body).

Conformance REQs that are only PARTIAL and worth strengthening (each already has a concrete test, so not "uncovered", but the offline test does not reach the full normative claim):

- **REQ-QRY-13** (`QRY-6`, conformance) — offline test asserts `attempts:0` on the pure short-circuit only; no offline loop-level test proves zero follow-up turns are appended and that a follow-up short-circuit consumes no `attempts` slot. (`tests/query-render.test.ts:204`.)
- **REQ-QRY-20** (`QRY-18`, conformance) — wire-name translation covered, but the ordering claim (stringify after evaluation, before newline-trim/dedent) is not asserted by a dedicated vector. (`tests/system-interpolation.test.ts:309`.)

## live-only REQs (not offline-testable)

Testability column = `live`. These require a live/driven provider and are exercised by driven-conversation, production, or hardening (`requireLiveProvider`) tests rather than pure units.

- REQ-QRY-1 (`QRY-1`) — extraction unit exists (`conversation-drive.test.ts:283`); full round-trip live.
- REQ-QRY-2 (`QRY-2`) — inference unit exists (`query-schema-inference`); provider-contract + AJV live (`typed-query-schema-integration`).
- REQ-QRY-22 (`QRY-20`) — `buildDiscardEvent` unit exists (`query-discard.test.ts:194`); operator-event emission live.
- REQ-QRY-24 (`QRY-8`) — `query-respond-repair.test.ts:442`.
- REQ-QRY-25 (`QRY-9`) — `query-respond-repair.test.ts:467`.
- REQ-QRY-26 (`QRY-9`) — `query-respond-repair.test.ts:363` (PARTIAL: no explicit not-`tool_loop_exhausted` negation).
- REQ-QRY-27 (`QRY-10`) — `query-respond-repair.test.ts:502` (PARTIAL: classification-at-end-of-stream + HTTP-200-envelope untested).
- REQ-QRY-28 (`QRY-10`) — `query-respond-repair.test.ts:502`.
- REQ-QRY-29 (`QRY-11`) — `query-respond-repair.test.ts:127`.
- REQ-QRY-30 (`QRY-11`) — `query-respond-repair.test.ts:127` + `frontmatter-tool-loop-respond-repair.test.ts:107`.
- REQ-QRY-34 (`QRY-8/QRY-11`) — `query-respond-repair.test.ts:224`.
- REQ-QRY-35 (`QRY-10/QRY-11`) — `query-respond-repair.test.ts:272`.
- REQ-QRY-36 (`QRY-22`) — `typed-query-schema-integration.test.ts:303` + `production-typed-query-validation.test.ts:155` + `acceptance/noninteractive-acceptance.test.ts:131`.
- REQ-QRY-37 (`QRY-13`) — `query-tool-loop.test.ts:184` + `effectful-statement-host.test.ts:312`.
- REQ-QRY-38 (`QRY-13`) — `query-tool-loop.test.ts:351` (PARTIAL: in-loop tool-error→`isError` feedback path untested).
- REQ-QRY-39 (`QRY-14`) — `effectful-statement-host.test.ts:312` + `query-tool-loop.test.ts:224`.
- REQ-QRY-40 (`QRY-14`) — `query-tool-loop.test.ts:224` (PARTIAL: opening-body U+000A concatenation not byte-asserted).
- REQ-QRY-41 (`QRY-14`) — `query-tool-loop.test.ts:184,453`.
- REQ-QRY-43 (`QRY-16`) — `query-tool-loop.test.ts:184` + `prompt-tool-loop-governor.test.ts:130` (governor unit is offline).
- REQ-QRY-44 (`QRY-16`) — `query-tool-loop.test.ts:256` + `prompt-tool-loop-governor.test.ts:113`.
- REQ-QRY-45 (`QRY-16`) — `query-tool-loop.test.ts:294` + `prompt-tool-loop-governor.test.ts:225`.
- REQ-QRY-46 (—) — `conversation-drive.test.ts:283` (prompt) + `production-subagent-query-model.test.ts` (subagent).

Note: REQ-QRY-43/44/45 have offline governor units (`prompt-tool-loop-governor.test.ts`) that cover the round-counting/depth-cap mechanics; the end-to-end query-path assertions remain live.
