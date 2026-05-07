# Triaged Spec Review — spec.md

_Generated: 2026-05-07T07:09:02Z_
_Source: docs/reviews/spec-review/spec-20260507-064438-enriched.md_
_Spec: spec.md_
_Process: bottom-up — the last finding (T26) is addressed first; the first finding (T01) is addressed last._

_Triage tally: 1 high, 4 medium retained; 31 low discarded; 4 low findings merged into 2 medium findings; 8 nit dropped; 0 false dropped._

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

---

# T02 — `SHOULD` modal on V1.x stability guarantee contradicts the deliberate "no gate" scope choice

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** "SHOULD" modal on stability guarantee is ambiguous; no CI gate
**Original section:** spec.md — Orientation > Scope > Source-language stability
**Kind:** clarity, testability
**Importance:** medium

## Finding

`spec.md` Orientation → Scope → Source-language stability states: "A `.loom` or `.warp` file that loads cleanly under V1.0 SHOULD load and behave identically under every V1.x release." The same SHOULD-shaped claim is restated in the normative owner, [governance.md GOV-13](./spec_topics/governance.md#gov-13).

This wording is in direct tension with the rest of GOV-13 and with GOV-14:

- GOV-13 itself records: "V1.0 ships without an automated equivalence gate; equivalence between two V1.x releases is a release-process responsibility verified by reviewer inspection of the diff against the prior V1.x release."
- GOV-14 prohibits reviewers from re-raising the missing gate as a V1.0 correctness finding: "The V1.0 release decision treats the absence of an automated equivalence gate as a recorded scope choice, not a defect."

Under RFC-2119, SHOULD is a normative modal — implementers and reviewers are entitled to verify it. But GOV-13 declares the only verification mechanism is human diff inspection, and GOV-14 forbids treating its absence as a defect. The SHOULD therefore promises a property that the spec has already, deliberately, chosen not to enforce. A reader cannot tell whether they are looking at (a) a normative obligation backed by some unstated test, (b) a normative obligation that the project knows it cannot check, or (c) a non-binding aspiration miscoded as RFC-2119.

The "behave identically" predicate carries the same defect — see the related finding on equivalence-class definition — but the modal-strength problem is independent and resolvable on its own.

## Spec Documents

- `spec.md` — Orientation → Scope → Source-language stability bullet (edited)
- `spec_topics/governance.md` — GOV-13 (edited)
- `spec_topics/governance.md` — GOV-14 (read-only)
- `spec_topics/future-considerations.md` — Known V1 limitations bullet on source-language migration that quotes the equivalence claim (edited)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None. No existing plan leaf encodes a GOV-13 V1.x equivalence gate, and `coverage-matrix.md` row for governance maps only to H6 / V18s (REQ-ID anchor mechanics and the coverage closure gate), neither of which would change under the recommended fix.

## Consequence

**Severity:** advisory

A reviewer following RFC-2119 reads SHOULD as a verifiable obligation; GOV-14 then forbids them from acting on its absence. Two implementers shipping V1.0 will not diverge — neither is required to do anything — but the spec contradicts itself on whether V1.x equivalence is a contract or a goal, undermining the credibility of every other RFC-2119 modal in the corpus. No observable runtime behaviour is affected.

## Solution Space

**Shape:** single

### Recommendation

Drop the RFC-2119 modal from both `spec.md` and GOV-13. Recast the claim as a non-binding intent statement that points at the release-process discipline already named in GOV-13 and the deferred conformance suite already named in `future-considerations.md`.

- `spec.md` Source-language stability bullet: replace "SHOULD load and behave identically" with non-modal phrasing, e.g. "is intended to load and behave identically … per [Governance — GOV-13](./spec_topics/governance.md#gov-13)."
- `governance.md` GOV-13: replace "SHOULD load … and produce … identical" with "is expected to load … and to produce … identical", and rename the rule from "V1.x source-language equivalence — no mechanical gate" to "V1.x source-language equivalence — release-process goal" so the rule's own title signals informative scope. Keep the (a)/(b)/(c) enumeration of observables and the wall-clock / token-count / log-volume carve-outs.
- `governance.md` GOV-14: no edit needed once GOV-13 no longer claims to be normative; the prohibition on re-raising the gate as a correctness finding becomes redundant but harmless. Leave it in place — reviewers seeing "expected to" can still try to relitigate scope.
- `future-considerations.md` migration bullet: drop "promises" verb if it presupposes normative force; "states" or "declares the goal" suffice.

Edge cases for the implementer:

- Keep GOV-13's enumeration of equivalence observables `(a) return values, (b) ordered diagnostic-code sequences, (c) loom-system-note content strings` and the wall-clock / token-count / log-volume exclusions.
- The change to GOV-13's text is substantive under GOV-8 (modal weakening is explicitly called out as substantive in `governance.md`'s worked examples). It must be modelled as retire-GOV-13-and-add-fresh-ID, not in-place edit. The fresh ID lands at the page tail per GOV-8 *Split / Deletion-plus-add*.

## Relationships

None

---

# T03 — `@mariozechner/` scope dropped from sibling-package names on first mention

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** `@mariozechner/` scope omitted for sibling packages in spec.md
**Original section:** spec.md — Orientation > Prerequisites > Pi SDK and capabilities
**Kind:** implementability
**Importance:** medium

## Finding

The Prerequisites paragraph in `spec.md` (the `**Pi SDK and capabilities.**` block immediately under `### Prerequisites`) names the host as `@mariozechner/pi-coding-agent` but introduces the three sibling packages bare: "additionally pins `pi-agent-core`, `pi-ai`, and `pi-tui` as direct `peerDependencies`". The actual installable names — verified against `package.json#peerDependencies` and against `pi-coding-agent`'s own `dependencies` block — are `@mariozechner/pi-agent-core`, `@mariozechner/pi-ai`, and `@mariozechner/pi-tui`. The scope is implied by parallelism with the host name and is correctly used elsewhere in the spec corpus (e.g. PIC's *Pi SDK pin* item 1 uses the scoped form), but on this first-mention paragraph the scope is missing and no parenthetical recovers it.

The same defect appears in `pi-integration-contract.md`'s opening paragraph (line 3): "the lock-step pin requiring `pi-agent-core`, `pi-ai`, and `pi-tui` to resolve to the same minor-version line…". PIC then immediately switches to the scoped form in the very next item; the inconsistency is internal to PIC as well as between PIC's intro and `spec.md`.

A reader or automation that copies the literal package names from either first-mention sentence into a `package.json` produces an installable-but-wrong manifest (npm will resolve unscoped `pi-agent-core` to a different package on the public registry, or fail to resolve at all if no such package exists). Every other site in the corpus that the build-time `peerDependencies` literal-read assertion in H1 consumes already uses scoped names, so the defect is confined to the two introductory paragraphs.

## Spec Documents

- `spec.md` — Orientation > Prerequisites > Pi SDK and capabilities (edited)
- `spec_topics/pi-integration-contract.md` — opening paragraph (edited)
- `package.json` — `peerDependencies` (read-only; ground truth)
- `spec_topics/pi-integration-contract.md` — *Host prerequisites — Pi SDK pin* item 1 (read-only; canonical scoped reference)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None. H1's `peerDependencies` literal-read test (`plan_topics/h1-scaffold.md`) already keys on the scoped names (`peerDependencies["@mariozechner/pi-agent-core"]` etc.), and no other leaf consumes the affected sentences as a ground-truth literal. The fix is doc-only.

## Consequence

**Severity:** advisory

A human implementer is unlikely to install unscoped packages because the host-package scope makes the convention obvious, but a literal extraction (LLM-assisted manifest generation, regex-driven dependency-list scrape, or a contributor copying the sentence verbatim) yields a manifest that either resolves to the wrong package or fails to install. The cost is small but the fix is mechanical and removes a trap.

## Solution Space

**Shape:** single

### Recommendation

In both first-mention sentences (`spec.md` Prerequisites paragraph and `pi-integration-contract.md` opening paragraph), write the three sibling packages with their `@mariozechner/` scope on first mention:

- `spec.md`: "additionally pins `@mariozechner/pi-agent-core`, `@mariozechner/pi-ai`, and `@mariozechner/pi-tui` as direct `peerDependencies` …"
- `pi-integration-contract.md` opening paragraph: "the lock-step pin requiring `@mariozechner/pi-agent-core`, `@mariozechner/pi-ai`, and `@mariozechner/pi-tui` to resolve to the same minor-version line …"

Subsequent mentions in the same paragraph may abbreviate, provided the abbreviation is unambiguous (e.g. "the four `@mariozechner/*` packages"). Edge case for the implementer: do not introduce a parenthetical-only fix ("the three siblings, scoped under `@mariozechner/`") in lieu of writing the names in full — the build-time literal-read assertion in H1 keys on the scoped strings, and a future automated cross-check between the spec text and `package.json` should be able to grep the scoped name directly out of the spec.

## Relationships

- T04 "`^X.Y.Z` prose label \"minor-version line\" only coincides with npm caret semantics while Pi is in 0.x" — same-cluster (same Prerequisites paragraph; both edits land in adjacent prose)

