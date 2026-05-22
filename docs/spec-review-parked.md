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

## T11a — Replace "consumes one slot" prose with explicit forced-respond exemption rule

> **PARKED** — 2026-05-22T00:25:45Z
> **Reason:** Category 1 (malformed finding — constraints binding surface; the originating finding's Solution constraints fence every viable remediation that the lens admits). The inner spec-diff-fix-loop's severity-weighted triage exited on must-fix-blocked-by-scope-guard (plan §Change A clause 1 escape): a raised lens finding outranked this originating finding in importance, but every viable remediation would violate a class-1 or class-2 scope guard forwarded from the top-level fixer. FIXCOUNTS: 5,4,1,0. Loop notes: Sub-rationale: must-fix-blocked-by-scope-guard (Change A clause 1 escape). spec-lens-consistency raised must-fix:true score=100 demanding that hard-ceilings.md CIO-4's parenthetical be reworded so CIO-4 stops gating the forced respond turn behind ceiling-#2 — but hard-ceilings.md is the forwarded read-only ScopeGuard from T11a's Solution constraints, asserted "already aligned with the new rule". The lens demonstrates that assertion is wrong: CIO-4 still gates the forced respond turn while the five updated pages assert exemption. Reshape required (Category 1): either lift the read-only guard on hard-ceilings.md so CIO-4's parenthetical can be reworded in the same diff, or split into a sibling finding owning the CIO-4 edit. A human must resolve the guard-vs-severity collision (relax the guard, split this finding so the higher-importance raised finding is no longer downstream of the guard, or accept the trade-off and annotate the raised finding as out-of-scope) before re-introducing this finding.
> **Forensic report:** `.pi/tmp/spec-fix-failure-forensics/2026-05-21T15-45-32_04fd18/t11a-replace-consumes-one-slot-prose-with-explicit-forced-respond-exemption-rule.md`

# T11a — Replace "consumes one slot" prose with explicit forced-respond exemption rule

**Kind:** testability
**Importance:** high
**Score:** 100
**Atomicity:** atomic
**Shape:** single
**State:** reduced

## Problem

The *Tool-call loop bound* section in `docs/spec_topics/query.md` (anchor `tool-call-loop-bound`) and the `tool_loop` field paragraph in `docs/spec_topics/frontmatter.md` each assert that the forced respond turn for a typed query consumes one `tool_loop` slot. That framing contradicts CIO-4 in `docs/spec_topics/hard-ceilings.md` and its *Depth-6 forced respond at `max_rounds`* worked consequence, which together treat the forced respond turn as the unconditional terminating mechanism CIO-4's `max_rounds`-final branch routes to (slot-accounting is evaluated only against free-phase rounds). At `max_rounds: 0` the contradiction is directly observable: under the "consumes one slot" reading the only available turn is already over budget; under CIO-4 it MUST still be dispatched. The sibling findings T11b and T11c cannot land their V6k changes against the spec until this prose is reconciled.

## Solution approach

Rewrite the relevant sentences in the *Tool-call loop bound* and *Typed queries are tool-loop-shaped* sections of `docs/spec_topics/query.md`, in the `tool_loop` field paragraph of `docs/spec_topics/frontmatter.md`, in the *tool-call round slot accounting* entry of `docs/spec_topics/glossary.md`, and in the *Issuing typed queries* bullet of `docs/spec_topics/pi-integration-contract.md` (the sentence beginning "The forced respond turn counts against the same `tool_loop.max_rounds` cap" — this sentence sits in the *Conversation drive* section and is distinct from PIC-1 (d), which remains read-only per the constraint below) to replace the "consumes one slot" framing with an explicit forced-respond-exemption rule: the forced respond turn is the typed-query terminating mechanism CIO-4's `max_rounds`-final branch routes to; the runtime MUST dispatch it on every typed query that reaches that branch (including the `max_rounds: 0` boundary case, where it is the only turn issued); and CIO-4's slot-accounting check is not evaluated against the forced respond turn itself. Confirm `docs/spec_topics/hard-ceilings.md` CIO-4 and the *Depth-6 forced respond at `max_rounds`* worked consequence remain aligned with the new rule and leave them unedited if they do.

## Solution constraints

- Treat `docs/spec_topics/hard-ceilings.md` (CIO-4 and the *Depth-6 forced respond at `max_rounds`* worked consequence) and PIC-1 (d) in `docs/spec_topics/pi-integration-contract.md` as read-only — they are already aligned with the new rule.
- Plan leaves V6k and V6l in `docs/plan_topics/v6-typed-queries.md` are owned by T11b and T11c — out of scope here.

## Relationships

- T11b "V6k counting-formula tighten: forced respond outside the budget" — must-precede (the prose rule must land before V6k's formula can be rewritten against it).
- T11c "V6k normative test vector for `max_rounds: 0` typed query" — must-precede (the prose rule must land before V6k's test can assert against it).

---
