# Spec-Review Pre-Flight Check — Residual Issues

_Generated: 2026-05-13. Companion to `docs/spec-review.md`. Lists findings whose Solution approach or constraints are likely to give the inner `spec-diff-fix-loop` trouble (limit-cycle, divergence, or cap-hit) under `/fix-spec-shape-single-findings`. Mechanical issues that could be fixed without changing the substantive contract have already been resolved in this commit; everything below requires a human decision before the loop is re-run._

_Built against the `f0e7c39` constraint-trimming sweep ("trim over-restrictive Solution constraints across all 43 findings"). That sweep was orthogonal to the issues below: it removed shape-pinning constraints (edit budgets, mechanism MUSTs, sequencing duplications) but did not address the dangling cross-references, internal contradictions, or bottom-up ordering issues called out here._

## Resolved in this pass

The following pre-flight problems were fixed directly:

- **T05 — dangling cross-reference deleted.** The "Coordinate the root-word framing with the sibling 'Binder LLM model' / 'binder model' rename finding …" constraint named a sibling that does not exist in the current `spec-review.md` (Relationships block is `None`). The constraint was removed; the rest of the finding is unchanged.
- **T15b — internal "Move … out of …" vs "do not edit session-model" contradiction resolved.** The Solution approach now says **Copy** (not Move) and explicitly identifies T15a as the owner of the corresponding removal. A new scope-guard bullet tells the inner spec-diff fix loop that the transient duplication between the new `Concurrency model` subsection and the still-untouched `<a id="session-model"></a>` paragraph is the **expected intermediate state** between the T15b commit and the T15a commit, and that any lens finding flagging that duplication MUST be classified `ignore — out-of-scope`.
- **T15a — "co-resolve in one commit" framing dropped.** Replaced with an explicit "T15b and T15c MUST have already landed before this finding is addressed" precondition, aligning with the orchestrator's one-finding-one-commit rule.
- **T07 — weasel "implementation-defined / non-normative" framing replaced with positive ecosystem-convention statement.** The original Solution approach added a normative rule declaring `message` content as "implementation-defined and non-normative" — a phrasing that does no real work in a single-implementation V1 spec and that `spec-lens-clarity` and `spec-lens-testability` are designed to flag. The rewrite drops both phrasings and instead anchors a positive statement: programmatic consumers and conformance tests assert against `kind` and structured fields; `message` carries human-readable debug prose on the JavaScript `Error.message` convention; the single exception is `InvokeInfraError.message` on the panic path. Conveys the same operative meaning while killing the lens-noise surface at the source.
- **T19e — weasel "non-normative for tests" framing replaced with positive contract statement.** Same shape as the T07 fix. The original Solution approach pinned the cross-sibling interleaving order as "operator-observable but explicitly non-normative for tests" — a carve-out `spec-lens-testability` is designed to push back on. The rewrite drops the "non-normative for tests" phrasing and instead splits the contract into two positive halves: V18q asserts real-time emission at the per-sibling originating site (the binding behavioural contract); the relative cross-sibling interleaving sequence is a property of JavaScript event-loop scheduling and is operator-observable. Same operative meaning (no test asserts a specific interleaving), no carve-out surface for the lens layer.
- **T11 / T18 / T19 cluster file ordering reversed** so bottom-up addressing reads them as `a → b → c (→ d → e)` (matching the spec-review.md preamble's documented "addressing within a child cluster runs alphabetically (a addressed first)" convention and, more importantly, the must-precede chains the bodies declare):
  - T11 was `a → b → c` top-to-bottom (bottom-up = `c → b → a`); now `c → b → a`. T11a's spec-side rule now lands first as required by T11b/T11c's `must-follow T11a`.
  - T18 was `a → b → c → d`; now `d → c → b → a`. T18a's central PIC rule now lands first as required by T18b/T18c/T18d's `must-follow T18a`.
  - T19 was `a → b → c → d → e`; now `e → d → c → b → a`. T19a's registry-shape extension and T19b's wire-field addition now land before T19c (dedup-tuple widening) and T19d (cancelled-shutdown details) consume those fields.

## Residual issues — require a human decision

The following findings are likely to cause loop noise, limit-cycle exits, or marginal lens findings the fixer can't resolve without crossing scope guards. Each is small enough to leave alone if the user is willing to accept a `STATUS: limit-cycle` exit and re-shape afterwards, but addressing them up-front avoids the wasted passes.

### T20 — Widened parenthetical exposes "no aggregation across siblings in V1"

The widened resource-unboundedness disclaimer enumerates three classes (runtime-value heap, OS-level descriptor exhaustion, provider rate-limit / quota) and explicitly states there is no cross-sibling aggregation surface in V1.

**Risk.** `spec-lens-completeness` and `spec-lens-error-model` are likely to flag the missing aggregation rule, the missing storm-detection layer, the undefined per-class threshold. The constraint set still forbids adding any of those (the "rejected option B"). Action discipline says "demote rule" — but the rule is already a disclaimer, and the disclaimer's purpose is to legitimise the gaps. The lens-noise pattern here is genuine and not addressable by sharpening the rule itself.

**Recommended human action.** Add a scope-guard bullet:
> Inner-loop guidance: lens findings of the form "the spec acknowledges resource-exhaustion classes but specifies no aggregation / storm-detection / threshold / operator surface" MUST be classified `ignore — out-of-scope` for this commit. The disclaimer is the substance of the finding; expanding it to add aggregation / threshold rules is the rejected Option B and is forbidden.

### T17 — Possible no-op spec.md edit after T15a/T15b reductions

By the time T17 is addressed, the session-model paragraph has been reduced to four orientation-level sentences (T15a) and the architectural clauses copied to the new `Concurrency model` subsection (T15b). The `console.error` and `try`/`catch` literals T17 is meant to delete may **already be gone** from the session-model paragraph — and may have been **carried forward** into the Concurrency-model subsection by T15b's verbatim-copy rule.

**Risk.** Two distinct sub-risks:
1. **Spec.md edit may be a no-op.** The fixer may report "nothing to delete in the session-model paragraph". The PIC half (Path A or Path B) keeps the commit non-empty, so the orchestrator's "nothing to commit = failure" trap is avoided.
2. **The `console.error` literal may have moved into the Concurrency-model subsection.** T17's success criterion targets only the session-model paragraph. If the literal now lives in the Concurrency-model subsection, T17 will pass its own success criterion while still leaving the literal in the corpus — defeating the finding's intent.

**Recommended human action.** Manually inspect the corpus state after T15b lands and before T17 is addressed; if the `console.error` / `try`/`catch` mention has been carried into the Concurrency-model subsection, widen T17's spec.md scope to that subsection (or mint a sibling finding T17b for it).

## Residual structural notes

### T11b / T11c — Plan-side findings address-order inversion is invisible to the inner loop, but produces transient HEAD inconsistency

Even after the T11 reorder above, T11b and T11c only edit `docs/plan_topics/v6-typed-queries.md`. The inner spec-diff fix loop's diff scope excludes `<planPath>` and `<planTopicsDir>`, so it will see empty spec diffs and exit `STATUS: ok` immediately for both.

The reorder still helps: T11a's spec-side rule now lands **first**, so the V6k counting-formula tighten (T11b) and the `max_rounds: 0` test vector (T11c) land **after** the spec rule they assert against. HEAD is consistent at every commit boundary.

No further action required; this note is for the record.

### T15 / T16 / T08 cluster file ordering left as-is (intentionally)

These clusters were not reordered:
- **T08 (a → b → c top-to-bottom).** Pure text-replacement sweeps in three independent files. No must-precede chain; no inter-finding dependencies; ordering is irrelevant for both correctness and loop convergence.
- **T15 (a → b → c top-to-bottom).** Bottom-up addressing reads them as `c → b → a`, which under the current Solution approach **is the correct order**: T15c verifies the V1 non-goals entries exist, T15b adds the new Concurrency-model subsection (the destination), and T15a is the cleanup pass that removes the now-duplicated content from the session-model paragraph. Reversing the file order would force T15a to land first, removing content before its destination exists. The cluster's body framing now explicitly documents this.
- **T16 (a → b → c → d top-to-bottom).** All four findings are pure co-resolve siblings on different paragraphs of the same Trust-boundary bullet. No inter-finding dependencies; ordering is irrelevant.

The spec-review.md preamble's note that "addressing within a child cluster runs alphabetically (a addressed first)" is therefore **not universally true** in this document — it holds for T03, T11, T18, T19, T22 (where it matters), but not for T08, T15, T16 (where it doesn't matter). If the user wants the preamble to be literally accurate, T08 and T16 could be reordered without functional consequence; T15 should be left alone.

### Documented pattern: "co-resolve in the same commit" is inoperable under `/fix-spec-shape-single-findings`

Several findings in the document still carry constraints of the form "Co-resolve with T1Xb in the same commit" or similar. These are no-ops under the orchestrator (which commits one finding at a time) and should be read as "co-resolve in the same fix-loop session". The findings I edited (T15a, T15b) had this language replaced with the explicit two-commit framing. Other instances exist in T08, T16, T18 (post-trim) but are functionally harmless because those clusters have no must-precede chains. No action required, but worth being aware of when reading the constraints.

## Pre-run checklist

Before running `/fix-spec-shape-single-findings`:

- [ ] Decide on T20 (add scope-guard for "missing aggregation surface" lens findings).
- [ ] Plan a manual inspection of the spec.md / Concurrency-model subsection state when the loop reaches T17, in case T15b's verbatim copy carried the `console.error` literal into the new home.
- [ ] (Optional) Reorder T08 and T16 child blocks to match the preamble's "a addressed first" convention; functionally irrelevant.
