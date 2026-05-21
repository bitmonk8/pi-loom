# Findings parked from `spec-review.md` — pi-loom

_This file collects findings physically removed from the
consolidated spec-review document because they cannot be addressed
by the current `/fix-spec-shape-single-findings` pipeline. Each
entry records the reason for parking and the path to the per-finding
forensic report. Parked findings must be reshaped (typically by
splitting bimodal obligations, narrowing scope, demoting MUSTs,
or capping the prose the fix is allowed to add) before being
re-introduced into the live review document._

_Cascade-parked findings (parked solely because they depended on
another parked finding) typically un-park automatically once the
upstream finding's reshape is re-introduced and successfully fixed,
unless they have substantive shape problems of their own._

---

## T19e — Add sendSystemNote synchronous-emission clause

> **PARKED** — 2026-05-21T10:01:02Z
> **Reason:** Category 1 (malformed finding — constraints binding surface; the originating finding's Solution constraints fence every viable remediation that the lens admits). The inner spec-diff-fix-loop's severity-weighted triage exited on must-fix-blocked-by-scope-guard (plan §Change A clause 1 escape): a raised lens finding outranked this originating finding in importance, but every viable remediation would violate a class-1 or class-2 scope guard forwarded from the top-level fixer. FIXCOUNTS: 4,4,6,0,0. Loop notes: Exit sub-rationale `score-budget-exhausted-trust-override-suppressed` (Rec O pass-level shadow-budget gate) on stage-3 pass 6 entry: S=100, Σ_shadow=364, k×S=300, breach margin Σ_shadow−k×S=64, breach multiplier 3.64×; 9 of 14 raised findings carried Trust-override-eligible impact entries (would-be-fixed absent the gate), all 14 also map to chunk `docs/spec_topics/pi-integration-contract.md#runtime-event-channel` which was in the DriftFromOriginRefusedChunks set from pass 3's mode-(i) refusal. Two C2 backtrack-and-exclude protocols fired during stage 1 (after pass-2-original ratio 1.98× and after pass-3-original ratio 3.32×); both restored cleanly and the loop converged stage 1 at pass 4 and stage 2 at pass 5 before stage 3 tripped Rec O. Stage trajectory: stage1=4 stage2=1 stage3=0. narrowings=0+0+0+0. stage1Touched=1 mode-e-refusals=0. A human must resolve the guard-vs-severity collision (relax the guard, split this finding so the higher-importance raised finding is no longer downstream of the guard, or accept the trade-off and annotate the raised finding as out-of-scope) before re-introducing this finding.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-21T09-09-12_uvpcp9/t19e-add-sendsystemnote-synchronous-emission-clause.md

# T19e — Add sendSystemNote synchronous-emission clause

**Kind:** error-model
**Importance:** high
**Score:** 100
**Atomicity:** atomic
**Shape:** single
**State:** reduced

## Problem

The **Runtime event channel** section in `docs/spec_topics/pi-integration-contract.md` pins exactly-once-per-occurrence emission semantics for `loom-system-note` always-log notes and stamps each `RuntimeEvent`'s `occurred_at` via `Clock.now()` at the originating emission site, but never pins that the *call* to `sendSystemNote` (the mechanism defined under **System notes** earlier in the same file) is itself the synchronous effect of the originating-site detection. An implementer reading the section could legally interpose a queue, buffer, or per-tool-loop-round coalescer between detection and `sendSystemNote` and still satisfy every existing rule on the page (the `occurred_at` timestamp would record the detection time; the per-occurrence count would be preserved; the dedup tuple would still be well-defined). Such an interposed queue would defer operator-visible failure timing without any spec-level guard against it.

## Solution approach

Add one sentence to the **Runtime event channel** section in `docs/spec_topics/pi-integration-contract.md`, placed adjacent to the `RuntimeEvent` payload's `occurred_at` clause or among the **Deduplication and lifetime rules**: each `RuntimeEvent` emission is the synchronous effect of the `sendSystemNote` call at the originating site (forward-link to the **System notes** subsection above for the call's fallback chain), and the runtime MUST NOT interpose buffering, coalescing, or per-round queueing between the originating-site detection and the `sendSystemNote` call. Composition (paragraph placement, whether to fold into an existing bullet, exact wording) is the implementer's choice within those bounds.

## Solution constraints

- Do not introduce a new diagnostic code, `details.kind` discriminator, aggregation surface, or storm-detection layer.
- Do not author batching-detection prose, runtime-side enforcement prose, or recovery-on-violation prose. The MUST NOT is a forbidding clause on the call-site authoring shape, not a positive obligation on the runtime to detect, monitor, or recover from a violation. The rule's enforcement is at code-review / test time, not at runtime.
- Do not introduce undefined terms ("real time", "operator-observable timing", "cross-sibling interleaving order", "sibling emission"). The property to pin is named in terms of the existing `sendSystemNote` mechanism and the existing originating-site language already in PIC; no new defined terms are needed.
- Do not name a specific test (e.g. plan-side V18q) as the binding behavioural anchor. The spec sentence stands on its own; the plan reads against it in the normal direction.

## Relationships

- T19a "Extend ActiveInvocationRegistry entry shape with invocationId" — same-cluster (thematically related operator-visibility surface; no content dependency — the timing rule is identity-orthogonal).
- T19b "Add invocation_id field to RuntimeEvent payload declaration" — same-cluster (as T19a).
- T19c "Widen always-log dedup key to include invocation_id" — same-cluster (as T19a).
- T19d "Populate cancelled-by-session-shutdown details with invocation_id" — same-cluster (as T19a).
- T20 "Resource exhaustion under concurrent subagent invocations is undisclaimed for non-memory classes" — same-cluster.
- T18a "Append success-side null-policy paragraph to PIC Runtime event channel" — same-cluster (both add clauses to the same Runtime event channel section).
- T15a "Reduce Session-model Orientation paragraph to a four-sentence forward-linking bullet" — same-cluster.

