# Triaged Spec Review — spec.md

_Generated: 2026-05-08T09:00:00Z_
_Spec: docs/spec.md_
_Process: bottom-up — the last finding in the file is addressed first; the first finding is addressed last._

---

# T11a — Forced-respond exemption: replace "consumes one slot" prose

**Kind:** testability, consistency
**Importance:** high
**Score:** 100
**Atomicity:** atomic
**Shape:** single
**State:** reduced

## Problem

Five spec sites assert the typed-query forced respond turn consumes one `tool_loop.max_rounds` slot; the *Depth-6 forced respond at `max_rounds`* worked consequence at `docs/spec_topics/hard-ceilings.md:75` instead treats it as the exempt typed-query terminator. At `max_rounds: 0` the two framings disagree on whether the forced respond turn is dispatched at all. The *Tool-call loop bound* paragraph in `docs/spec_topics/query.md` additionally self-contradicts once the exemption rule lands: its `tool_loop_exhausted` cap-trigger sentence's `(a plain text turn for untyped queries, a respond-tool call for typed queries)` parenthetical names a typed-query branch the exemption rule renders unreachable.

## Solution approach

Rewrite the five sites to state the exemption rule: the forced respond turn is the exempt typed-query terminator CIO-4's `max_rounds`-final branch routes to (T11d defines that branch); the runtime MUST dispatch it on every typed query reaching that branch, including `max_rounds: 0` where it is the only turn issued; CIO-4's slot-accounting check is not evaluated against it. Also strike the typed-query branch from the `tool_loop_exhausted` cap-trigger parenthetical in the *Tool-call loop bound* paragraph.

Sites:
1. *Tool-call loop bound* and *Typed queries are tool-loop-shaped* sections of `docs/spec_topics/query.md`.
2. `tool_loop` field paragraph in `docs/spec_topics/frontmatter.md`.
3. *tool-call round slot accounting* entry in `docs/spec_topics/glossary.md`.
4. *Issuing typed queries* bullet in `docs/spec_topics/pi-integration-contract.md` (the *Conversation drive* sentence beginning "The forced respond turn counts against the same `tool_loop.max_rounds` cap"; distinct from PIC-1 (d)).
5. V1-reference-implementation `tool_loop.max_rounds` directive at `docs/spec_topics/implementation-notes.md:23` (enforcement clause should count free-phase tool-call rounds only; name the forced respond turn as the exempt-routed terminator that follows the cap check).

**Advisory notes (non-binding).** `hard-ceilings.md:75` and PIC-1 (d) are believed already aligned and best left untouched if a consistent fix is achievable without them. The CIO-4 parenthetical at `hard-ceilings.md:46` is T11d's primary territory; coherence-driven citation updates elsewhere are allowed if a lens raises a must-fix consistency defect the five named sites alone cannot resolve. The three latent defined-term surfaces (CIO-4 branch predicate, `max_rounds: 0` step-(2) dispatch trigger, non-compliance routing) are T11d's territory; do not author them here unless a lens requires it to land a coherent diff.

## Solution constraints

_None as hard constraints. See "Advisory notes" in the Solution approach for sites best avoided when practical._

## Relationships

- T11d "Define CIO-4 branch predicate, `max_rounds: 0` dispatch trigger, and forced-respond non-compliance routing" — must-follow (T11d's defined-term work must land before this prose finding's rewrite, so the rewritten prose has well-defined terms to reference and CIO-4's parenthetical is already edited).

---

# T11d — Define CIO-4 branch predicate, `max_rounds: 0` dispatch trigger, and forced-respond non-compliance routing

**Kind:** completeness, implementability, assumptions
**Importance:** high
**Score:** 500
**Atomicity:** atomic
**Shape:** single
**State:** reduced

## Problem

T11a's exemption rule uses three terms whose definition surfaces are not authored. Without them implementers diverge:

1. **CIO-4 `max_rounds`-final branch.** CIO-4 at `docs/spec_topics/hard-ceilings.md:46` does not enumerate its branches or pin the selection predicate. `slot_count == max_rounds` after the increment vs "next round would exceed `max_rounds`" fire one round apart with different observable transcripts.
2. **`max_rounds: 0` dispatch trigger.** Step (2) of the typed-query numbered list at `docs/spec_topics/query.md:199` says dispatch fires "Once the model emits a plain text turn (stop reason `end_turn` / `stop`)" — the only stated trigger. At `max_rounds: 0` no model turn ever fires. Three observably-distinct implementations remain consistent (skip phase 1 and post forced respond first; one empty-tool free-phase turn then dispatch; synthesise without provider call).
3. **Forced-respond non-compliance.** Pre-exemption, provider non-compliance with `options.toolChoice` (free-phase text or non-respond `tool_use`) hit `tool_loop_exhausted` on the next slot increment. Post-exemption the slot count is already at cap and the spec gives no rule. The *Provider compatibility for typed queries* carve-out in `docs/spec_topics/pi-integration-contract.md` explicitly contemplates non-compliance, so assumption-of-compliance is not an escape.

## Solution approach

1. **CIO-4 branch predicate (`docs/spec_topics/hard-ceilings.md:46`).** Reword CIO-4's parenthetical so it describes only the free-phase ceiling check (slot count incremented after the just-completed round, evaluated before the next model turn). Add one follow-on sentence enumerating the two outcomes: *free-phase continuation* (`slot_count < max_rounds`: next model turn requested) and *`max_rounds`-final branch* (`slot_count == max_rounds`: untyped surfaces `tool_loop_exhausted`; typed dispatches the forced respond turn as the exempt-routed terminator that follows the gating check). Pin the predicate to `slot_count == max_rounds` after the increment.
2. **`max_rounds: 0` elision (`docs/spec_topics/query.md:199`).** Extend step (2) with one trailing sentence: at `max_rounds: 0` the forced respond turn is the first and only turn of the typed query (no free-phase provider call; the inlined-schema follow-up is the typed query's opening provider call); this is the `max_rounds: 0` boundary case of the same dispatch mechanism.
3. **Non-compliance routing (`docs/spec_topics/query.md` *Failure modes*, with PIC forward-link).** If the model violates `options.toolChoice` on the forced respond turn (free-phase text, or `tool_use` whose name is not `__loom_respond_<slug>`), return `Err(QueryError { kind: "typed_query_respond_noncompliance", provider_response: <verbatim>, ... })`. Distinct from `tool_loop_exhausted` (which the exemption rule renders unreachable on the forced turn). Error-name token is illustrative; align with existing `QueryError.kind` naming.

**Advisory notes (non-binding).** `hard-ceilings.md:75` and PIC-1 (d) are believed already aligned and best left untouched if a consistent fix is achievable without them. The five T11a prose sites are T11a's primary territory, but coherent CIO-4 citation updates here are allowed if a lens raises a must-fix consistency defect requiring them in the same diff. The other CIO-N rules in the same enumeration, and CIO-4's canonical "after the round's tool calls have completed and the slot count has been incremented" wording, are best left untouched unless a lens requires editing them.

## Solution constraints

- Do not introduce a new MUST about which providers MUST support `options.toolChoice` — the *Provider compatibility for typed queries* carve-out already governs that, and the non-compliance routing in (3) is a failure-surface contract, not a provider-capability requirement.
- Do not invent a new ID prefix; reuse the existing `QueryError.kind` naming convention at the *Failure modes* site for (3)'s error token.

## Relationships

- T11a "Forced-respond exemption: replace `consumes one slot` prose" — must-precede (T11d's defined-term work must land before T11a's prose rewrite, so the rewritten prose has well-defined terms to reference and CIO-4's parenthetical is already edited; same dispatch run naturally addresses both via the picker's bottom-up order).

