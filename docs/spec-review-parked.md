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

## T11d — Define the three concept surfaces the forced-respond exemption rule introduces (CIO-4 branch predicate, `max_rounds: 0` step-(2) dispatch trigger, forced-respond non-compliance routing)

> **PARKED** — 2026-05-22
> **Reason:** Category 1 (malformed finding — constraints binding surface; the originating finding's Solution constraints fence every viable remediation that the lens admits). The inner spec-diff-fix-loop's severity-weighted triage exited on must-fix-blocked-by-scope-guard (plan §Change A clause 1 escape): a raised lens finding outranked this originating finding in importance, but every viable remediation would violate a class-1 or class-2 scope guard forwarded from the top-level fixer. FIXCOUNTS: 6. Loop notes: pass 2 classifier exited on must-fix-blocked with sub-rationale=score-budget-exhausted-trust-override-suppressed (Rec O pass-level shadow-budget gate); 7 findings counted toward shadow budget (none must-fix:true), S=100, Σ_shadow=335, breach margin=35 (k=3, k·S=300), breach multiplier=3.35×; F6 (CIO-4 atomicity, score=100) is the finding at which the budget broke; F6 would otherwise have routed via rule b-septies drift-from-origin-defer (`docs/spec_topics/hard-ceilings.md#interaction-between-ceilings` was in DriftFromOriginRefusedChunks from pass-1 fix-05 refusal), but the pass-level gate fires before per-finding rules. severity p1 raised{high:2,medium:6,low:1} fixed{high:1,medium:3} deferred{medium:2,low:1} refused-by-fixer{high:1,medium:1} blocked{}; p2 raised{high:2,medium:5} fixed{} deferred{} blocked{high:2,medium:5}. stage1=1 (pass 2 aborted at classifier before step 3f). narrowings=1+0+0+0 (1 chunk seeded approach-narrowing from NarrowedChunks block, no in-loop narrowings authored). stage1Touched=4 mode-e-refusals=0. Pass-1 fixes applied: fix-01 (PIC machinery widened to both non-compliance shapes + errors-and-results paraphrase updated), fix-02 (CIO-4 additive sentence for max_rounds:0 degenerate entry), fix-03 (CIO-4 exempt-routed terminator defined with forward-link to frontmatter.md tool_loop), fix-04 (query.md item-2 parenthetical expanded to pin two-adjacent-user-role-turns); refused: fix-05 (CIO-4 sub-ID split refused under mode (i) drift-from-origin + scope guard 3 wholesale-rewrite + project-config no-invented-ids), fix-06 (query.md step-2 sub-ID split refused under mode (c) scope-guard cross with mode (f) sub-cases (f-stop-1) and (f-stop-2) refusals). Reshape guidance from _blocked.md: split T11d into per-surface atoms, raise score to blocker (200), or narrow Solution approach items (1) or (2) to suppress F6 / F5 surface generation. A human must resolve the guard-vs-severity collision (relax the guard, split this finding so the higher-importance raised finding is no longer downstream of the guard, or accept the trade-off and annotate the raised finding as out-of-scope) before re-introducing this finding.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-22T10-45-02_6b00ac/t11d-define-the-three-concept-surfaces-the-forced-respond-exemption-rule-introdu.md

# T11d — Define the three concept surfaces the forced-respond exemption rule introduces (CIO-4 branch predicate, `max_rounds: 0` step-(2) dispatch trigger, forced-respond non-compliance routing)

**Kind:** completeness, implementability, assumptions
**Importance:** high
**Score:** 100
**Atomicity:** atomic
**Shape:** single
**State:** reduced

## Problem

T11a's prose rewrite (the forced-respond-exemption rule across seven sites) introduces three normative concept terms whose definition surfaces are not yet authored in the spec; without them, the new MUST is load-bearing on under-specified vocabulary and implementers diverge on every typed-query at the `max_rounds: 0` boundary (and, more generally, at the `max_rounds`-final round). The three undefined surfaces are:

1. **CIO-4's `max_rounds`-final branch.** The phrase appears as a defined term in the new prose ("the forced respond turn is the typed-query terminating mechanism CIO-4's `max_rounds`-final branch routes to"), but CIO-4 at `docs/spec_topics/hard-ceilings.md:46` does not enumerate its branches or pin the selection predicate. Two predicates are equally consistent with the new prose — (a) `slot_count == max_rounds` after CIO-4's increment, or (b) "the next round would exceed `max_rounds`" — and they fire one round apart, producing different observable transcripts and different billed tokens for the same `max_rounds: 25` typed query. A grep for the phrase "`max_rounds`-final branch" against the pre-Option-A spec corpus returns zero hits, confirming the new prose coined the term.

2. **`max_rounds: 0` step-(2) dispatch trigger.** Step (2) of the typed-query numbered list at `docs/spec_topics/query.md:199` states the forced respond turn is dispatched "Once the model emits a plain text turn (provider stop reason `end_turn` / `stop`)" — a model-emitted plain-text turn is the *only* stated trigger. The new MUST asserts dispatch is unconditional at `max_rounds: 0`, but the `max_rounds: 0` configuration structurally precludes any model turn ever firing (no free phase = no plain-text turn = no trigger). Three observably distinct implementations remain consistent with the diff (skip phase 1 entirely and post the forced-respond user turn first; issue one empty-tool free-phase turn then dispatch; synthesise without calling the provider), producing different transcripts and different provider-side traces for the same configuration.

3. **Forced-respond non-compliance failure surface.** Pre-Option-A, any provider-side non-compliance with `options.toolChoice` on the forced turn (model emits free-phase text or a non-respond `tool_use` despite forcing) deterministically reached `tool_loop_exhausted` on the next round boundary via slot accounting. Post-Option-A the slot count is already `= max_rounds` and the spec gives no rule for the non-compliance case. The existing "stop reasons other than `end_turn` / `stop` / `tool_use`" sentence in `docs/spec_topics/query.md` covers `length` / content-filter but does not cover a non-respond `tool_use` block on the forced turn. The carve-out at *Provider compatibility for typed queries* in `docs/spec_topics/pi-integration-contract.md` explicitly contemplates non-compliance and so removes any implicit assumption that the model always complies.

## Solution approach

Author three definition surfaces, one per undefined concept, in the existing spec topics:

1. **CIO-4 branch predicate at `docs/spec_topics/hard-ceilings.md:46`.** Reword CIO-4's parenthetical (currently `*before* the next model turn (or, on a typed query at the final round permitted by `max_rounds`, the forced respond turn) is requested`) to (a) detach the forced respond turn from the "or" clause so CIO-4 describes only the free-phase ceiling-#2 evaluation (slot count incremented after the just-completed round, check evaluated *before* the next model turn is requested), and (b) add one follow-on sentence enumerating CIO-4's two evaluation outcomes — *free-phase continuation* (`slot_count < max_rounds`: next model turn is requested) and *`max_rounds`-final branch* (`slot_count == max_rounds`: ceiling fires; on an untyped query the runtime surfaces `tool_loop_exhausted`; on a typed query the runtime dispatches the forced respond turn as the exempt-routed terminator that follows CIO-4's gating check rather than being bundled under it) — pinning the selection predicate (`slot_count == max_rounds` after the increment) so the `max_rounds`-final branch is mechanically observable.

2. **Step-(2) `max_rounds: 0` elision at `docs/spec_topics/query.md:199`.** Extend step (2) of the typed-query numbered list with one trailing sentence stating that at `max_rounds: 0` (where the free phase is structurally empty and no plain-text turn can ever fire), the runtime dispatches the forced respond turn as the first and only turn of the typed query (no free-phase provider call is issued; the inlined-schema follow-up user turn is the typed query's opening provider call), naming this elision as the `max_rounds: 0` boundary case of the same dispatch mechanism step (2)'s body describes.

3. **Forced-respond non-compliance routing in `docs/spec_topics/query.md` *Failure modes*.** Add one bullet (or extend the existing *Provider compatibility for typed queries* section in `docs/spec_topics/pi-integration-contract.md`, whichever is the better-fitting home — author the bullet at the *Failure modes* site and forward-link from PIC) specifying that if the model violates `options.toolChoice` on the forced respond turn (emits a free-phase text turn, or emits a `tool_use` block whose name is not `__loom_respond_<slug>`), the runtime returns `Err(QueryError { kind: "typed_query_respond_noncompliance", provider_response: <verbatim block>, ... })` — distinct from `tool_loop_exhausted` (which the exemption rule renders unreachable on the forced turn) and routed through the standard `QueryError` shape per *Failure modes*. The error name token is illustrative; align with the existing `QueryError.kind` naming convention used in the same section.

## Solution constraints

- Do not touch the *Depth-6 forced respond at `max_rounds`* worked consequence at `docs/spec_topics/hard-ceilings.md:75` — it is already aligned with the new rule and is owned by T11a's read-only constraint.
- Do not touch PIC-1 (d) at `docs/spec_topics/pi-integration-contract.md` — read-only per T11a's constraint.
- The CIO-4 rewording at `docs/spec_topics/hard-ceilings.md:46` is in scope here (T11a defers to this finding); do not touch CIO-4's other clauses (the canonical "after the round's tool calls have completed and the slot count has been incremented" wording) or any other CIO-N rule in the same enumeration. The two evaluation outcomes added in (1) above must be additive to CIO-4's existing one-sentence body, not a wholesale rewrite.
- Do not edit the seven prose sites T11a owns (the *Tool-call loop bound* and *Typed queries are tool-loop-shaped* sections of `query.md`, the `tool_loop` paragraph of `frontmatter.md`, the *tool-call round slot accounting* entry of `glossary.md`, the *Issuing typed queries* bullet of `pi-integration-contract.md`, and the V1-reference-implementation directive at `implementation-notes.md:23`) — those rewrites are T11a's territory.
- Do not introduce a new MUST about which providers MUST support `options.toolChoice` — the *Provider compatibility for typed queries* carve-out already governs that, and the non-compliance routing in (3) is a failure-surface contract, not a provider-capability requirement.
- Do not invent a new ID prefix; reuse the existing `QueryError.kind` naming convention at the *Failure modes* site for (3)'s error token.
- Surface length: CIO-4's added enumeration is at most two sentences after the existing parenthetical; step-(2)'s added elision is one sentence; the non-compliance bullet is one bullet at the *Failure modes* site (plus a one-clause forward-link if added from PIC).
- Plan leaves V6k and V6l in `docs/plan_topics/v6-typed-queries.md` are owned by T11b and T11c — out of scope here.

## Relationships

- T11a "Replace `consumes one slot` prose with explicit forced-respond exemption rule" — must-precede (T11d's defined-term work must land before T11a's prose rewrite, so the rewritten prose has well-defined terms to reference and CIO-4's parenthetical is already edited; same dispatch run naturally addresses both via the picker's bottom-up order).


---

## T11a — Replace "consumes one slot" prose with explicit forced-respond exemption rule

> **PARKED** — 2026-05-22
> **Reason:** Cascaded from parking of T11d — Define the three concept surfaces the forced-respond exemption rule introduces (CIO-4 branch predicate, `max_rounds: 0` step-(2) dispatch trigger, forced-respond non-compliance routing): this finding's ## Relationships block declares an ordering edge (must-precede or must-follow) on the parked finding, so its preconditions are no longer satisfied in spec-review.md.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-22T10-45-02_6b00ac/t11d-define-the-three-concept-surfaces-the-forced-respond-exemption-rule-introdu.md

# T11a — Replace "consumes one slot" prose with explicit forced-respond exemption rule

**Kind:** testability, consistency
**Importance:** high
**Score:** 100
**Atomicity:** atomic
**Shape:** single
**State:** reduced

## Problem

The *Tool-call loop bound* section in `docs/spec_topics/query.md` (anchor `tool-call-loop-bound`) and the `tool_loop` field paragraph in `docs/spec_topics/frontmatter.md` each assert that the forced respond turn for a typed query consumes one `tool_loop` slot. That framing contradicts the *Depth-6 forced respond at `max_rounds`* worked consequence in `docs/spec_topics/hard-ceilings.md:75`, which treats the forced respond turn as "precisely the typed-query terminating mechanism CIO-4's `max_rounds`-final branch routes to" (slot-accounting is evaluated only against free-phase rounds). At `max_rounds: 0` the contradiction is directly observable: under the "consumes one slot" reading the only available turn is already over budget; under the worked consequence it MUST still be dispatched. Two further sites carry the same pre-exemption framing: the *Tool-call loop bound* paragraph's adjacency clause `(a plain text turn for untyped queries, a respond-tool call for typed queries)` on the `tool_loop_exhausted` cap-trigger sentence is contradicted by the new MUST in the same paragraph after the rewrite (left intact, it produces an adjacency contradiction inside one normative paragraph); and the V1-reference-implementation `tool_loop.max_rounds` directive at `docs/spec_topics/implementation-notes.md:23` still tells the reference implementation to count tool-call rounds in the free phase **plus the one forced respond turn**, which a V1 reference faithful to this bullet would use to return `tool_loop_exhausted` on every `max_rounds: 0` typed query — the precise boundary the new MUST requires to succeed. The sibling findings T11b and T11c cannot land their V6k changes against the spec until this prose is reconciled across all seven sites. The three latent defined-term surfaces the rewrite's new prose introduces (CIO-4 branch predicate, `max_rounds: 0` step-(2) dispatch trigger, forced-respond non-compliance routing) are out of scope here and owned by T11d.

## Solution approach

Rewrite the relevant sentences in the *Tool-call loop bound* and *Typed queries are tool-loop-shaped* sections of `docs/spec_topics/query.md`, in the `tool_loop` field paragraph of `docs/spec_topics/frontmatter.md`, in the *tool-call round slot accounting* entry of `docs/spec_topics/glossary.md`, in the *Issuing typed queries* bullet of `docs/spec_topics/pi-integration-contract.md` (the sentence beginning "The forced respond turn counts against the same `tool_loop.max_rounds` cap" — this sentence sits in the *Conversation drive* section and is distinct from PIC-1 (d), which remains read-only per the constraint below), AND in the V1-reference-implementation `tool_loop.max_rounds` directive at `docs/spec_topics/implementation-notes.md:23` (rewrite the bullet's enforcement clause to count *free-phase tool-call rounds only* and to state explicitly that the forced respond turn is the exempt-routed terminator that follows the cap check), to replace the "consumes one slot" framing with an explicit forced-respond-exemption rule: the forced respond turn is the typed-query terminating mechanism CIO-4's `max_rounds`-final branch routes to; the runtime MUST dispatch it on every typed query that reaches that branch (including the `max_rounds: 0` boundary case, where it is the only turn issued); and CIO-4's slot-accounting check is not evaluated against the forced respond turn itself. Additionally, in the *Tool-call loop bound* paragraph of `docs/spec_topics/query.md`, strike the `(a plain text turn for untyped queries, a respond-tool call for typed queries)` parenthetical from the `tool_loop_exhausted` cap-trigger sentence so the rewritten paragraph does not adjacent-contradict itself: with the exemption rule in force, the runtime always supplies the typed-query terminating respond-tool call (forced respond), so the parenthetical's typed-query branch is unreachable and must not be restated as if it were a cap-reachable terminating turn. Do not edit the CIO-4 parenthetical at `docs/spec_topics/hard-ceilings.md:46`; that rewording is owned by T11d and must land before this finding. The *Depth-6 forced respond at `max_rounds`* worked consequence at `docs/spec_topics/hard-ceilings.md:75` is already aligned with the new rule and is left unedited.

## Solution constraints

- Treat the *Depth-6 forced respond at `max_rounds`* worked consequence in `docs/spec_topics/hard-ceilings.md:75` as read-only — it already names the forced respond turn as the typed-query terminating mechanism the new rule asserts.
- Treat PIC-1 (d) in `docs/spec_topics/pi-integration-contract.md` as read-only — already aligned with the new rule.
- Treat the CIO-4 parenthetical at `docs/spec_topics/hard-ceilings.md:46` as read-only here — T11d owns the CIO-4 branch-predicate rewording (which subsumes the parenthetical edit) and must-precedes this finding. If T11d has not landed at dispatch time, defer this finding.
- Do not extend step (2) of the typed-query numbered list at `docs/spec_topics/query.md:199` to specify a `max_rounds: 0` dispatch trigger — that elision is one of T11d's three defined-term surfaces and is out of scope here.
- Do not author a forced-respond non-compliance failure-routing rule (provider non-compliance with `options.toolChoice` on the forced turn) — that surface is one of T11d's three defined-term surfaces and is out of scope here.
- Do not extend CIO-4 with a written enumeration of its branches or a `slot_count`-vs-`max_rounds` selection predicate — that surface is one of T11d's three defined-term surfaces and is out of scope here.
- Plan leaves V6k and V6l in `docs/plan_topics/v6-typed-queries.md` are owned by T11b and T11c — out of scope here.

## Relationships

- T11d "Define the three concept surfaces the forced-respond exemption rule introduces (CIO-4 branch predicate, `max_rounds: 0` step-(2) dispatch trigger, forced-respond non-compliance routing)" — must-follow (T11d's defined-term work must land before this prose finding's rewrite, so the rewritten prose has well-defined terms to reference and CIO-4's parenthetical is already edited).
- T11b "V6k counting-formula tighten: forced respond outside the budget" — must-precede (the prose rule must land before V6k's formula can be rewritten against it).
- T11c "V6k normative test vector for `max_rounds: 0` typed query" — must-precede (the prose rule must land before V6k's test can assert against it).

