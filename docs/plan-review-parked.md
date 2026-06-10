# Findings parked from `plan-review.md` — pi-loom

_This file collects findings physically removed from the
consolidated plan-review document because they cannot be addressed
by the current `/plan-fix-findings-loop` pipeline. Each
entry records the reason for parking and the path to the per-finding
forensic report. Parked findings must be reshaped (typically by
splitting bimodal obligations, narrowing scope, demoting MUSTs,
routing spec-side halves through `/spec-fix-findings-loop`
first, or capping the prose the fix is allowed to add) before being
re-introduced into the live review document._

_Cascade-parked findings (parked solely because they depended on
another parked finding) typically un-park automatically once the
upstream finding's reshape is re-introduced and successfully fixed,
unless they have substantive shape problems of their own._

---

## T27 — V17a leaves three normative cancellation MUSTs with no asserting test

> **PARKED** — 2026-06-10
> **Reason:** The fast `/plan-fix-findings-loop` fix-then-floor-review pass did not resolve this finding: the fast reviewer reported `FindingResolved: partial`. Loop notes: finding not resolved by fast fix — fast reviewer reported FindingResolved: partial. CNCL-4/5/6 anchored in cancellation.md and asserted in V17a-T (mirrored V17a) with coverage rows, but the CNCL-4 session-shutdown facet ("loom cancelled by session shutdown") was added to V9g's Tests block without the matching bullet in its paired V9g-T tests task, and V9g-T's Spec line still omits cancellation.md; per the -T pairing convention that facet's failing test is not authored. Below-floor mechanical gap (floor high/90).
> **Forensic report:** none (fast loop — no forensic report)

# T27 — V17a leaves three normative cancellation MUSTs with no asserting test

**Original heading:** Abort-reason propagation and two race-semantics MUSTs unasserted
**Original section:** V17a — Cancellation core
**Kind:** validation
**Importance:** high
**Score:** 90
**MustFix:** false

## Finding

`cancellation.md` carries three distinct normative MUSTs that `V17a` / `V17a-T` do not assert and that carry no REQ-ID:

1. **Abort-reason propagation** — when any forwarding path fires `loomAbort.abort(...)`, the runtime MUST propagate the source's `reason` so `loomAbort.signal.reason === source.reason` is observable at every downstream checkpoint, and the two reason-less paths MUST synthesise a JavaScript `Error` whose `message` is exactly `"loom cancelled by agent_end"` (the `agent_end`-driven slash-command trigger) and exactly `"loom cancelled by session shutdown"` (the `session_shutdown` teardown trigger).
2. **No retroactive rewrite of a completed `Ok`** — an operation that has already returned `Ok(v)` retains that value even if the signal fires before the next checkpoint; the interpreter MUST NOT rewrite a completed `Ok` into `Err({kind:"cancelled"})`.
3. **No top-level synthesis on tail abort** — when no further checkpoint executes before the loom returns, the top-level result is the value the loom would otherwise have produced; the runtime does NOT synthesise a top-level `cancelled`.

`V17a`/`V17a-T` Tests assert only `CNCL-1`/`CNCL-2`/`CNCL-3` — which `cancellation.md` defines narrowly as the *tool-call late-settlement discard* clauses (a) no-rebind, (b) no-second-`Err`, (c) no-second-`RuntimeEvent` — plus one generic `loomAbort`-forwarding bullet. None of the three MUSTs above is covered. The adjacent leaf `V4c` (terminal outcomes) covers conversation non-mutation and side-effect no-rollback (ERR-8…ERR-13) but not result-value retention vs. rewrite, so MUST (2) is genuinely uncovered rather than closed elsewhere.

Because these MUSTs are neither REQ-ID-anchored nor diagnostic-code-keyed, the `H5a` closing gate — which reconciles test-asserted REQ-IDs / registry codes — cannot detect their omission. All three are deterministically testable through the `Checkpoint` seam (`V8a`), so the gap is closeable; it is simply unclosed.

## Plan Documents

- `docs/plan_topics/V17a-cancellation-core.md` — Tests / Adds (edited)
- `docs/plan_topics/V17a-T-cancellation-core.md` — Tests (edited)
- `docs/plan_topics/coverage-matrix.md` — CNCL mapping rows (edited)
- `docs/plan_topics/V9g-session-shutdown.md` — Tests (edited — owns the synthesised `"loom cancelled by session shutdown"` reason emission)
- `docs/plan_topics/conventions.md` — REQ-ID discipline / code-keyed obligation areas (read-only — the un-anchored-MUST policy this fix interacts with)

## Spec Documents

- `docs/spec_topics/cancellation.md` — *Abort-reason propagation* paragraph and the two *Race semantics* paragraphs (no-retroactive-rewrite, no-top-level-synthesis) (edited)

## Affected Leaves

**Phases:** V9 — Extension host integration; V17 — Cancellation

**Leaves (implementation order):**

- V9g — Session-shutdown teardown and emission isolation — (modified) — the `"loom cancelled by session shutdown"` synthesised-reason assertion homes here
- V17a — Cancellation core — (modified)
- V17a-T — Cancellation core (tests) — (modified)

## Consequence

**Severity:** correctness

Each of the three MUSTs can ship broken with every `V17a` test green: a forwarder that drops `reason`, an interpreter that rewrites a completed `Ok` to `cancelled`, or a runtime that synthesises a spurious top-level `cancelled` on a pure-tail abort would all pass the existing `CNCL-1/2/3` + forwarding bullets, and the `H5a` closing gate cannot fire on un-anchored MUSTs. Two reasonable implementers would diverge on the race semantics and the synthesised-reason byte-exactness.

## Issue introduction

**Verdict:** indeterminate
**Introducing commits:** none identified
**History:** The cited leaf files `docs/plan_topics/V17a-cancellation-core.md` and `docs/plan_topics/V17a-T-cancellation-core.md` are untracked working-tree additions (never committed), so git history cannot localise when the missing-assertion defect entered the corpus. The repository is a git work tree, but these two files are not yet under version control.

## Solution Space

**Shape:** single

### Recommendation

Anchor the three MUSTs in `cancellation.md`, map them in `coverage-matrix.md`, and
add the citing Tests bullets to `V17a-T` (mirrored in `V17a`), so the `H5a` gate
can confirm each MUST has a closing test and the gap is closed by rule rather than
case-by-case.

**Spec edits.** Add stable anchors / REQ-IDs to the *Abort-reason propagation*
paragraph and the two *Race semantics* paragraphs of `cancellation.md` (candidate
identifiers continuing the CNCL series, e.g. `CNCL-4` abort-reason propagation,
`CNCL-5` no-retroactive-rewrite, `CNCL-6` no-top-level-synthesis).

**Plan edits.** Add three Tests bullets to `V17a-T` (mirrored verbatim in `V17a`),
each citing its new identifier and driving the `Checkpoint` seam:
- abort-reason propagation: after each forwarding path fires, assert `loomAbort.signal.reason === source.reason`; assert the two synthesised `Error.message` strings byte-exact — `"loom cancelled by agent_end"` and `"loom cancelled by session shutdown"`.
- no-retroactive-rewrite: land an abort (via the `Checkpoint` seam) after an operation returns `Ok(v)` but before the next checkpoint; assert the value is retained and is not rewritten to `Err({kind:"cancelled"})`.
- no-top-level-synthesis: land an abort in a pure tail after the final cancellable operation; assert the top-level result is the produced value and no synthesised top-level `cancelled` appears.

Add `coverage-matrix.md` rows mapping the new IDs → `V17a` (and the `"loom
cancelled by session shutdown"` synthesised-reason facet → `V9g`, since `V9g`'s
handler produces that reason).

Edge cases the implementer must watch: the abort-reason bullet must assert reason
*identity* (`===`) at a downstream checkpoint, not merely that `aborted` is true;
the two synthesised-reason strings are byte-exact and the first source's reason
wins under the one-shot guard; and the session-shutdown synthesised-reason facet
is produced by `V9g`'s handler, so its assertion (and matrix row) should target
`V9g` while the propagation contract itself stays in `V17a`. If the
`conventions.md` un-anchored-MUST policy lands first, prefer its chosen anchoring
mechanism for the identifiers.

## Relationships

- T26 "Cancellation checkpoint granularity set unverified" — same-cluster (same leaf `V17a`; another un-anchored Class-1 cancellation behaviour; resolved by the same `V17a-T` assertion pass but independently).
- T16 "Cancellation test bullet keyed by one diagnostic conflates four independent obligations" — same-cluster (same `V17a-T` Tests block; the loomAbort-forwarding bullet split).
- T30 "Un-anchored normative MUSTs are invisible to the closing gate by construction" — must-follow (the chosen policy for un-anchored MUSTs determines whether these three get REQ-IDs or code-keyed-table entries; this fix's anchoring depends on it).
- T28 "Subagent parallel-initiation MUST has no closing leaf and cannot be lawfully authored" — same-cluster (same class: un-anchored Class-1 MUST with no closing leaf).
- T24 "Parallel-batch settle-and-independent-lowering rule has no asserting leaf" — same-cluster (same class of un-anchored MUST coverage gap).

---

## T21 — Asserted diagnostic code `loom/parse/empty-enum-body` is absent from the parse registry

> **PARKED** — 2026-06-10
> **Reason:** The fast `/plan-fix-findings-loop` fix-then-floor-review pass did not resolve this finding: the plan-only fast reviewer reported `FindingResolved: no`. Loop notes: finding not resolved by fast fix per the plan-only fast reviewer (FindingResolved: no). The resolution is entirely spec-side: plan-review-fixer added the loom/parse/empty-enum-body row to docs/spec_topics/diagnostics/code-registry-parse.md (mirroring empty-schema-body, message string verbatim from schemas.md), which is exactly the recommendation. The V5a/V5a-T plan leaves already cite the code correctly and need no edit, so the plan diff is empty and the plan-only fast reviewer cannot witness the spec registry row. The substantive defect (registry/prose drift) is closed by the committed spec edit; this parking records that the fast plan-only pass could not confirm it. Stage C re-review should not resurface T21 now the row exists.
> **Forensic report:** none (fast loop — no forensic report)

# T21 — Asserted diagnostic code `loom/parse/empty-enum-body` is absent from the parse registry

**Original heading:** Asserted code `loom/parse/empty-enum-body` absent from registry
**Original section:** V5a — Schema declarations
**Kind:** consistency
**Importance:** high
**Score:** 90
**MustFix:** false

## Finding

Both `V5a` and its paired tests leaf `V5a-T` carry the `Tests.` bullet ``loom/parse/empty-schema-body`, `loom/parse/empty-enum-body`: empty bodies fire.`` The first code is registered; the second is not. `code-registry-parse.md` registers `loom/parse/empty-schema-body` (the empty object-body diagnostic) but contains no row for `loom/parse/empty-enum-body`.

The code is named in normative spec prose: `schemas.md` §Enum declarations states *"An `enum X { }` declaration with no variants is `loom/parse/empty-enum-body`: `'<X>' has no variants; an empty enum cannot be validated.`"* with a full message string and an AJV-rejection justification. So the disagreement is between `schemas.md` prose (which treats the code as real and fully specified) and the parse registry (which omits it). The plan leaves faithfully assert the prose code; the gap is upstream in the spec corpus.

The `H5a` closing gate reconciles test-asserted diagnostic codes against the registry and fails on "a test asserts a diagnostic code absent from the registry." A test asserting `loom/parse/empty-enum-body` therefore drives the closing gate red until the registry and the asserting leaf agree.

## Plan Documents

- `docs/plan_topics/V5a-schema-decls.md` — Tests (read-only)
- `docs/plan_topics/V5a-T-schema-decls.md` — Tests (read-only)

## Spec Documents

- `docs/spec_topics/diagnostics/code-registry-parse.md` — `loom/parse/*` table (edited)
- `docs/spec_topics/schemas.md` — §Enum declarations (read-only — authoritative source of the message string)

## Affected Leaves

**Phases:** Vertical slice V5 — Schemas, descriptions, schema-subset

**Leaves (implementation order):**

- `V5a-T` — Schema declarations (object / alias / enum) (tests) — (modified)
- `V5a` — Schema declarations (object / alias / enum) — (modified)

## Consequence

**Severity:** blocking

A test asserting `loom/parse/empty-enum-body` references a code with no registry row, so the `H5a` closing gate fails on the "asserted code absent from the registry" arm. The plan as written cannot reach a green closing gate until the registry and the asserting leaves agree, and `V5a`'s `Ships when` (each listed code fires) cannot be reconciled against a registry that lacks the row.

## Issue introduction

**Verdict:** single-commit

**Introducing commit:** `de05433` (2026-05-04) — *pi-loom spec: resolve "Schema declarations: empty bodies, alias cycles, and discriminator literal type unspecified"*

**History:** `de05433` added the `loom/parse/empty-enum-body` prose to `spec_topics/schemas.md` (alongside `loom/parse/empty-schema-body`) with a complete message string. Its diffstat touched only `schemas.md` and a review doc — no registry file — so the enum-body code entered normative prose without a matching `code-registry-parse.md` row. `git log -S "loom/parse/empty-enum-body" --all -- "*registry*"` returns no commits: the code has never appeared in any registry file. `empty-schema-body`, by contrast, was subsequently added to the registry, leaving the asymmetry. The `V5a` / `V5a-T` plan leaves that assert the code are untracked (not yet committed) and only propagate the spec prose; the durable defect is the spec-side drift introduced in `de05433`.

## Solution Space

**Shape:** single

### Recommendation

Treat the code as real and close the spec drift in `code-registry-parse.md`. Add a `loom/parse/empty-enum-body` row to the `loom/parse/*` table, mirroring the existing `loom/parse/empty-schema-body` row: severity `E`, phase `parse`, trigger ``enum X { }`` declaration with no variants, spec rule pointing to [Schemas — Enum declarations](../schemas.md), no hint, and the message string from `schemas.md` verbatim — `'<X>' has no variants; an empty enum cannot be validated.` Once the row exists, the `V5a` / `V5a-T` citations are already correct and need no edit; the registry and the asserting leaves agree, and the `H5a` gate reconciles green.

Edge case: if a reviewer instead determines the code is not real (no `enum X {}` diagnostic is wanted), the registry must not gain the row — in that case the citation must be struck from both `V5a` and `V5a-T` and the `schemas.md` §Enum declarations reference reconciled to the registered code. The invariant either way is that the registry and every asserting leaf name the same code; the prose's full message string and AJV justification make the add-the-row branch the expected resolution.

## Relationships

- T04 "Truncated diagnostic code: `V5b` cites `loom/parse/duplicate-discriminator`, registry has `loom/parse/duplicate-discriminator-value`" — same-cluster (same `H5a` asserted-code-vs-registry failure mode; resolves independently).
- T13 "`V6e`/`V6e-T` assert a non-existent `loom/parse/...` diagnostic code instead of the registered `loom/load/frontmatter-value-out-of-range`" — same-cluster (same registry-reconciliation failure on a `parse` vs `load` phantom code; resolves independently).
- T05 "Bare diagnostic code `binder-model-strict-capability-unknown` missing `loom/load/` prefix" — same-cluster (bare-form code absent from registry; same gate arm, resolves independently).

---

## T20 — H4a in-process Pi session double has no stated fidelity contract against the pinned SDK

> **PARKED** — 2026-06-10
> **Reason:** The fast `/plan-fix-findings-loop` fix-then-floor-review pass did not resolve this finding: the fast reviewer reported `FindingResolved: partial` with a high/90 floor regression (autofix=no). Loop notes: finding not resolved by fast fix — fast reviewer reported FindingResolved: partial with a high/90 floor regression (autofix=no). The H4a fidelity-contract enumeration and the "as modelled by the in-process double" gate-scoping landed, but the named real-host backstop is hollow: V18c (per its leaf and spec host-prerequisites.md) is static surface-inventory + type-equality + editorial-review only — no runtime/real-SDK behaviour check — and the H4a self-check only asserts the double models the contract (circular, cannot detect double-vs-real-Pi divergence). The fix falsely characterizes V18c as a "runtime-evidence gate" / "real-host backstop", contradicting the sibling leaf and spec. Closing the gap requires human judgment / new normative content (a real-host end-to-end conformance gate or an explicitly recorded residual gap). Floor high/90.
> **Forensic report:** none (fast loop — no forensic report)

# T20 — H4a in-process Pi session double has no stated fidelity contract against the pinned SDK

**Original heading:** In-process Pi session double fidelity contract unstated
**Original section:** H4a — Factory shell and harness
**Kind:** assumptions
**Importance:** high
**Score:** 90
**MustFix:** false

## Finding

`H4a` introduces the reusable end-to-end harness that "loads the extension against an in-process Pi session double and drives a slash dispatch," but the leaf never states the behavioural fidelity contract that double must hold against the pinned `@earendil-works/pi-coding-agent` SDK, nor names who validates that the double matches real Pi. The behaviours that matter to downstream gates — streamed-token ordering relative to `ctx.waitForIdle()` resolution, turn-append semantics, the prompt-mode `pi.on` subscription used for cancel-forwarding, and cancellation propagation — are exactly the surface a test double can silently get wrong.

Several ship-gates are defined purely in terms of the double's observable behaviour. The clearest is `V12a` / `V12a-T` `SLSH-2`, whose ordering assertion ("streamed assistant tokens are observable in the user transcript *before* the interpreter resumes — before `ctx.waitForIdle()` resolves … Driven through the in-process Pi session double with an ordering-observable transcript sink") is meaningful only if the double reproduces real Pi's streaming-vs-resume ordering. The same dependence runs through `M`/`M-T` (one streamed assistant response appended as a single prompt-mode turn), `V9c` (`waitForIdle`, trailing-turn extraction, `pi.on` cancel-forward), and the cancellation-forwarding paths in `V17a` and `V11f`.

The plan's only SDK-conformance machinery — `V18a` (surface inventory) and `V18b` (surface-set-closure audit) — pins the *static surface* loom references against the SDK, not the *runtime behaviour* the double imitates. So nothing in the plan ties the double's behaviour to the pinned SDK. If the double diverges (e.g. it resolves `waitForIdle` after flushing streamed tokens when real Pi would not), the double-only gates report green while the real integration is wrong — a silent false-green that the closing gate cannot catch.

## Plan Documents

- `docs/plan_topics/H4a-factory-shell-and-harness.md` — Adds. / Tests. / Ships when (edited)
- `docs/plan_topics/V12a-slash-dispatch.md` — `SLSH-2` Tests bullets (edited — reference the named H4a contract)
- `docs/plan_topics/V12a-T-slash-dispatch.md` — `SLSH-2` Tests bullets (edited — reference the named H4a contract)
- `docs/plan_topics/conventions.md` — phase categories (end-to-end harness) (read-only)
- `docs/plan_topics/M-minimal-slash-command.md` — `SLSH-2` / Ships when (read-only)
- `docs/plan_topics/V9c-conversation-drive.md` — Adds. (`waitForIdle`, `pi.on` cancel-forward) (read-only)
- `docs/plan_topics/V17a-cancellation-core.md` — cancellation-forwarding bullet (read-only)
- `docs/plan_topics/V18a-capability-inventory.md` — surface inventory (read-only)
- `docs/plan_topics/V18b-inventory-audit.md` — surface-set-closure audit (read-only)

## Spec Documents

- `docs/spec_topics/pi-integration-contract/conversation-drive.md` — prompt-mode drive / `waitForIdle` (read-only)
- `docs/spec_topics/pi-integration-contract/host-interfaces-core.md` — session/host interface behaviour (read-only)
- `docs/spec_topics/cancellation.md` — cancel-forwarding semantics (read-only)

(The fix is internal to plan files; the spec topics are read to enumerate the behaviours the double must model, not edited.)

## Affected Leaves

**Phases:** Horizontal (H4a), Vertical V12

**Leaves (implementation order):**

- `H4a` — Extension factory shell and end-to-end harness — (modified)
- `V12a` — Slash dispatch, overflow, and streaming — (modified)

(`M`, `V9c`, `V17a`, `V11f` consume the double's behavioural fidelity but are not edited under the recommended fix; they are read-only context above.)

## Consequence

**Severity:** correctness

A double whose `waitForIdle`-vs-streaming ordering (or turn-append / cancel-forward behaviour) diverges from the pinned SDK makes the double-only ship-gates — `V12a` `SLSH-2` most acutely — pass on a real integration bug (e.g. a buffer-then-append-after-resume implementation), and the closing gate has no way to detect it. Two implementers building the double could model the timing differently and both see green, so a leaf can ship not matching real-host behaviour.

## Issue introduction

**Verdict:** indeterminate
**Introducing commits:** none identified
**History:** The cited plan leaf files (`docs/plan_topics/H4a-factory-shell-and-harness.md`, `docs/plan_topics/V12a-slash-dispatch.md`, `docs/plan_topics/V12a-T-slash-dispatch.md`) are untracked working-tree files — `git ls-files` does not list them and `git status` reports them `??` — so no commit history exists to localise when the defect entered the corpus.

## Solution Space

**Shape:** single

### Recommendation

State the double's fidelity contract at `H4a` and name where and by whom that fidelity is asserted, so the double-dependent ship-gates reference one named contract rather than each scoping its claim independently.

Add to `H4a` a behavioural contract enumerating the specific Pi behaviours the in-process double must reproduce relative to the pinned SDK — streamed-token order relative to `ctx.waitForIdle()` resolution, single-turn append semantics, the `pi.on` cancel-forward subscription, and cancellation propagation — via its `Adds.`/`Tests.`/`Ships when`, and name the mechanism/owner that validates the double against the pinned SDK (a harness self-check listed as an `H4a` inline test, plus `V18c`'s version-bump runtime-evidence gate as the real-host backstop). Introduce a `<new>` harness-conformance leaf if the assertion is too large for `H4a`. Establish this contract at `H4a` before any per-gate scoping; the double-dependent gates (most acutely `V12a`/`V12a-T` `SLSH-2`) then cite the named contract.

Edge case the implementer must watch: a true conformance check against the real SDK may need a live Pi session the in-process harness deliberately avoids. If a full real-SDK conformance check cannot run in-process, scope the affected double-dependent gates (`V12a` `SLSH-2` ordering, `M`, `V9c`, `V17a`, `V11f`) to state they assert behaviour *as modelled by the in-process double* **and** pair that scoping with a real-host end-to-end gate (see the related terminal-integration finding), so the coverage is not merely deleted.

## Relationships

- T19 "Plan has no terminal end-to-end integration-acceptance leaf" — decision-overlap (a release-gate real-host end-to-end leaf would double as the fidelity backstop this finding needs).
- T17 "Version-bump acceptance is build-time surface checks only — no runtime-evidence gate or revert path" — same-cluster (both want runtime evidence against the pinned/real SDK rather than static/surface gates).

---

