# Triaged Spec Review — spec.md

_Generated: 2026-05-07T07:09:02Z_
_Source: docs/reviews/spec-review/spec-20260507-064438-enriched.md_
_Spec: spec.md_
_Process: bottom-up — the last finding (T26) is addressed first; the first finding (T01) is addressed last._

_Triage tally: 1 high, 3 medium retained; 31 low discarded; 4 low findings merged into 2 medium findings; 8 nit dropped; 0 false dropped._

---

# T01 — "Final value" in opening preamble joins tail expression and `return expr` with bare "or"

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** "Final value" definition: ambiguous precedence between trailing expression and `return expr`
**Original section:** spec.md — Opening paragraphs (before `## Orientation`)
**Kind:** clarity
**Importance:** medium

## Finding

`spec.md` (paragraph at line 5) introduces the *final value* concept with the phrase:

> "evaluation also produces a *final value* — the loom's last expression or `return expr` per [Function Definitions — Final value]"

The bare "or" admits two readings: (a) one supersedes the other when both are present (in which case the spec needs to say which fires first), or (b) they are interchangeable specifications of the same value (in which case a `return expr` mid-body and a tail expression both contribute and the relationship is left undefined). Neither reading is selected here.

The cited anchor — [`functions.md#final-value-language-definition`](./spec_topics/functions.md) — does not resolve the ambiguity either. Its definition reads "the value of its tail expression (success path only), or the literal `null` per the **Empty-tail body** rule"; `return expr` is not mentioned at all under that anchor. The actual short-circuit semantics are stated only in `return.md` ("`return expr` exits the enclosing function (or top-level loom) immediately, producing `expr` as the value of that scope … From a top-level loom, `return expr` exits the loom with `expr` as its return value, exactly as a tail expression would"). So the aggregator forwards to an anchor that, by itself, omits the very interaction the aggregator gestures at.

The behavior is unambiguous in implementation terms (a `return` short-circuits the block, so any tail expression after it is unreachable), but the canonical "Final value" definition does not say so, and the aggregator's "or" obscures rather than names that fact.

## Spec Documents

- `spec.md` — opening preamble, paragraph at line 5 ("On the success outcome, evaluation also produces a *final value* …") (edited)
- `spec_topics/functions.md` — `<a id="final-value-language-definition">` block, ~line 38 (edited)
- `spec_topics/return.md` — already states the short-circuit semantics; no change required (read-only)
- `spec_topics/invocation.md` — `#typed-return` anchor, downstream consumer of the definition (read-only)

## Plan Impact

**Phases:** Vertical V8, Vertical V9

**Leaves (implementation order):**

- V8f — `return` statement — (modified)
- V9c — Tail-expression return — (modified)

Both leaves already implement the underlying behavior; the modification is to add an interaction test (a body whose `return expr` precedes a different tail expression: the `return`'s operand is the final value, the tail expression is unreachable and triggers `loom/parse/unreachable-code`). V9c is the natural home for the assertion that a tail expression yields the final value *in the absence of an earlier `return`*.

## Consequence

**Severity:** advisory

A first-time reader of `spec.md` cannot tell from the paragraph or its forward-link whether `return expr` and the tail expression coexist, override, or are mutually exclusive. Implementers will reach the right answer by reading `return.md`, but a reviewer citing only the canonical "Final value" anchor in `functions.md` will find the `return` case missing entirely, weakening citability.

## Solution Space

**Shape:** single

### Recommendation

Two coordinated edits:

1. **`spec.md` line 5.** Replace
   > "the loom's last expression or `return expr` per [Function Definitions — Final value]"

   with
   > "the value of the loom's tail expression, or — if an explicit `return expr` executes first — the operand of that `return`, per [Function Definitions — Final value]."

   The phrase "executes first" makes the short-circuit precedence explicit without requiring a reader to chase two anchors.

2. **`spec_topics/functions.md` `#final-value-language-definition`.** Extend the first sentence of the **Final value (language definition)** block to acknowledge `return`:
   > "A loom or function's *final value* is the value of its tail expression on the success path, the operand of an explicit `return expr` if one short-circuits the body before the tail is reached (per [Return Statement](./return.md)), or the literal `null` per the **Empty-tail body** rule when no tail expression exists."

   This keeps `return.md` as the normative owner of `return`'s evaluation semantics while making the canonical "Final value" anchor self-contained for citation.

Edge cases the implementer must keep in mind:

- A `return expr` followed by a tail expression in the same block must continue to emit `loom/parse/unreachable-code` (already specified in `return.md`); the wording change does not weaken that.
- `return` from inside a nested control-flow construct (e.g., `if`, `for`) still exits the enclosing function/loom, not just the inner block — already covered by `return.md` and not in scope to restate at the aggregator.
- The `void` carve-out is unchanged: a `void`-typed loom or function still has no observable final value regardless of whether the body ends in `return`, a tail expression, or neither.

## Relationships

None

