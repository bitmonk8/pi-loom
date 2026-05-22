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

> **PARKED** — 2026-05-22T09:46:52Z
> **Reason:** Category 1 (malformed finding — constraints binding surface; the originating finding's Solution constraints fence every viable remediation that the lens admits). The inner spec-diff-fix-loop's severity-weighted triage exited on must-fix-blocked-by-scope-guard (plan §Change A clause 1 escape): a raised lens finding outranked this originating finding in importance, but every viable remediation would violate a class-1 or class-2 scope guard forwarded from the top-level fixer. FIXCOUNTS: none. Loop notes: Classifier early-exit on Rec O pass-level shadow-budget gate; sub-rationale=score-budget-exhausted-trust-override-suppressed; S=100 (high), Σ_shadow=366, breach-margin=266, breach-multiplier=3.66× (k=3); 9 raised findings (2 must-fix blockers excluded from shadow sum, 7 non-blocker raised counted, 6 of those 7 would have triggered the trust-always-wins override absent the gate). severity p1 raised{high:5,medium:3,NIT:1} fixed{} deferred{} blocked{high:2,medium:3,NIT:1} (must-fix=2, trust-override-suppressed=6). stage1=1. narrowings=0+0+0+0. stage1Touched=0 mode-e-refusals=0. The originating finding T11a (S=100, six normative sites in Solution approach) generated three latent specification surfaces the approach does not enumerate: a "`max_rounds`-final branch" defined-term predicate (Finding B), a `max_rounds: 0` dispatch trigger when step (2)'s plain-text trigger cannot fire (Finding C), and a forced-respond non-compliance failure surface (Finding E); plus two must-fix consistency holes (A: tool_loop_exhausted typed-query branch contradicts new MUST; D: implementation-notes.md line 23 still tells V1 reference to count forced respond against cap) and three smaller scope-extension surfaces (F/G/H). Classifier's reshape guidance: split T11a into T11a-prose (six-site rewrite, S≈100) and T11a-defined-terms (B/C/E predicate definitions, S≈100); OR raise T11a to blocker tier (≥200) to authorise all three latent surfaces; OR narrow Solution approach to explicitly defer B/C/E to follow-on findings. A human must resolve the guard-vs-severity collision (relax the guard, split this finding so the higher-importance raised finding is no longer downstream of the guard, or accept the trade-off and annotate the raised finding as out-of-scope) before re-introducing this finding.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-22T09-24-47_c0dfbb/t11a-replace-consumes-one-slot-prose-with-explicit-forced-respond-exemption-rule.md

# T11a — Replace "consumes one slot" prose with explicit forced-respond exemption rule

**Kind:** testability, consistency
**Importance:** high
**Score:** 100
**Atomicity:** atomic
**Shape:** single
**State:** reduced

## Problem

The *Tool-call loop bound* section in `docs/spec_topics/query.md` (anchor `tool-call-loop-bound`) and the `tool_loop` field paragraph in `docs/spec_topics/frontmatter.md` each assert that the forced respond turn for a typed query consumes one `tool_loop` slot. That framing contradicts the *Depth-6 forced respond at `max_rounds`* worked consequence in `docs/spec_topics/hard-ceilings.md:75`, which treats the forced respond turn as "precisely the typed-query terminating mechanism CIO-4's `max_rounds`-final branch routes to" (slot-accounting is evaluated only against free-phase rounds). At `max_rounds: 0` the contradiction is directly observable: under the "consumes one slot" reading the only available turn is already over budget; under the worked consequence it MUST still be dispatched. The canonical CIO-4 rule at `docs/spec_topics/hard-ceilings.md:46` is itself only partially aligned with the new rule — it still carries the parenthetical "*before* the next model turn (or, on a typed query at the final round permitted by `max_rounds`, the forced respond turn) is requested", bundling the forced respond turn under ceiling-#2 evaluation in a way that contradicts the new exemption (an implementer reading CIO-4 alone gates the forced respond turn on a `max_rounds` check and suppresses dispatch at `max_rounds: 0`). The sibling findings T11b and T11c cannot land their V6k changes against the spec until this prose is reconciled across all six sites.

## Solution approach

Rewrite the relevant sentences in the *Tool-call loop bound* and *Typed queries are tool-loop-shaped* sections of `docs/spec_topics/query.md`, in the `tool_loop` field paragraph of `docs/spec_topics/frontmatter.md`, in the *tool-call round slot accounting* entry of `docs/spec_topics/glossary.md`, and in the *Issuing typed queries* bullet of `docs/spec_topics/pi-integration-contract.md` (the sentence beginning "The forced respond turn counts against the same `tool_loop.max_rounds` cap" — this sentence sits in the *Conversation drive* section and is distinct from PIC-1 (d), which remains read-only per the constraint below) to replace the "consumes one slot" framing with an explicit forced-respond-exemption rule: the forced respond turn is the typed-query terminating mechanism CIO-4's `max_rounds`-final branch routes to; the runtime MUST dispatch it on every typed query that reaches that branch (including the `max_rounds: 0` boundary case, where it is the only turn issued); and CIO-4's slot-accounting check is not evaluated against the forced respond turn itself. Additionally, reword the CIO-4 parenthetical at `docs/spec_topics/hard-ceilings.md:46` to move the forced respond turn out of the "or" clause: CIO-4 should describe only the free-phase ceiling-#2 evaluation (slot count incremented, check before the next model turn), and reference the forced respond turn separately as the exempt-routed terminator that follows CIO-4's gating check rather than being bundled under it. The *Depth-6 forced respond at `max_rounds`* worked consequence at `docs/spec_topics/hard-ceilings.md:75` is already aligned with the new rule (it explicitly names the forced respond turn as the typed-query terminating mechanism CIO-4 routes to) and is left unedited.

## Solution constraints

- Treat the *Depth-6 forced respond at `max_rounds`* worked consequence in `docs/spec_topics/hard-ceilings.md:75` as read-only — it already names the forced respond turn as the typed-query terminating mechanism the new rule asserts.
- Treat PIC-1 (d) in `docs/spec_topics/pi-integration-contract.md` as read-only — already aligned with the new rule.
- The CIO-4 parenthetical at `docs/spec_topics/hard-ceilings.md:46` is in scope for this finding (the per-line scope guard above is narrower than file-level read-only); reword to detach the forced respond turn from the ceiling-#2 evaluation clause. Do not touch CIO-4's other clauses (the canonical "after the round's tool calls have completed and the slot count has been incremented" wording) or any other CIO-N rule in the same enumeration.
- Plan leaves V6k and V6l in `docs/plan_topics/v6-typed-queries.md` are owned by T11b and T11c — out of scope here.

## Relationships

- T11b "V6k counting-formula tighten: forced respond outside the budget" — must-precede (the prose rule must land before V6k's formula can be rewritten against it).
- T11c "V6k normative test vector for `max_rounds: 0` typed query" — must-precede (the prose rule must land before V6k's test can assert against it).

