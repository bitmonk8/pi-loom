# pi-loom — Consolidated Spec Review

_Generated: 2026-05-06T06:31:26Z_
_Source: docs/reviews/spec-review/spec-20260506-064723.md_
_1 findings retained (collapsed from 93 by merge / subsumption), 14 false positives dropped, 0 persistent failures_

_Severity: 27 correctness · 17 advisory · 12 cosmetic · 0 blocking_
_Shape: 56 single · 0 multiple · 0 unresolved_

---

## spec.md — Introduction (paragraphs before "Orientation")

---

# Self-referential "informative orientation only" clause in spec.md introduction

**Source:** docs/reviews/spec-review/spec-20260506-064723.md
**Original heading:** Self-referential "informative orientation only" clause
**Kind:** cruft

## Finding

The second paragraph of `spec.md` ends with the trailing clause: *"The full conceptual model is normative in [Overview](./spec_topics/overview.md) and the topic pages it links; this paragraph is informative orientation only."* The clause is self-referential — it annotates the very paragraph it appears in — and reads as authoring meta-commentary that escaped a style-guide note into reader-facing prose.

The functional content the clause carries is already conveyed by other means in the same paragraph: the inline cross-links to `errors-and-results.md`, `slash-invocation.md`, and `diagnostics.md` route the reader to the normative surfaces, and the [Overview] link in the clause itself is duplicated by the [Reading order] section a few lines below. The "informative orientation only" tag adds no information a reader can act on; it only signals authorial intent.

A secondary problem: the designation is contradicted in practice. The third introductory paragraph contains normative diagnostic codes (`loom/parse/invoke-non-loom-extension`, `loom/parse/import-non-warp-extension`) and a normative discovery-glob constraint (`*.loom` only), so the "informative" label cannot be trusted at the section granularity it's being applied at — see the related finding below.

## Spec Documents

- `spec.md` — Introduction (paragraphs before "Orientation"), specifically the trailing clause of paragraph 2 (edited)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None — no leaf has the spec.md introduction in its **Spec** field, and no leaf's acceptance criteria depend on the wording. H6 visits non-narrative spec pages to inject REQ-ID anchors but does not retouch the `spec.md` introduction's prose.

## Consequence

**Severity:** cosmetic

A reader briefly notices the awkward self-reference and moves on. No implementer behaviour diverges; no test or diagnostic is at stake. The cost is purely the editorial signal that the intro section's invariants are not yet stable, which weakens reader trust in adjacent prose.

## Solution Space

**Shape:** single

### Recommendation

Strike the trailing sentence of `spec.md` paragraph 2: "The full conceptual model is normative in [Overview](./spec_topics/overview.md) and the topic pages it links; this paragraph is informative orientation only." Leave the rest of the paragraph untouched. The [Overview] link is already reachable from the **Reading order** subsection that follows, so no information is lost.

Edge case for the implementer: do not also delete the inline `[Overview]` link target — the route to the normative model must remain, just without the meta-annotation. After the edit, paragraph 2 ends at "...the per-stage error surfaces and the partial-append contract."

## Related Findings

- "Normative error-code rules embedded in informative introduction" — decision-dependency (that finding is premised on the intro being labelled "informative orientation only"; deleting the label per Option A removes its framing but not its substance — the diagnostic codes still belong in `imports.md` / `discovery.md` regardless. The two should be resolved together so the intro's normative posture is decided once.)

---

