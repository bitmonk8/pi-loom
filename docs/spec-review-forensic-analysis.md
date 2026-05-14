# Spec-Review Fix-Loop Forensic Analysis — T22a1 Divergence

**Project:** pi-loom
**Subject finding:** T22a1 — Session-binding contract sub-section in PIC: anchor, paraphrase, Pi-source citation, and spec.md forward-link
**Loop trajectory:** `FIXCOUNTS = [4, 5, 2, 5, 6]` → `STATUS: diverging`
**Date of analysis:** 2026-05-14
**Cross-project context:** the same `/fix-spec-shape-single-findings` pipeline failed on T22a1 here (2026-05-12, 2026-05-14) and on T53 in `ap/project_service` (2026-05-12). Two lenses (`-naming`, `-consistency`, `-assumptions`, `-testability`, `-error-model`, `-completeness`) plus one principle (SP-1) plus one new finding state (SP-2 reduced) and one new agent (`spec-diff-fix-classifier`) have been added since to fix the pattern. T22a1 still diverged.

---

## 1. Executive summary

The T22a1 fix loop diverged for **three independent reasons that combine multiplicatively**, not a single failure of any one component. The user's hypotheses (1) lenses too strict, (2) findings not solid, (3) workflow gap, (4) triage gap, (5) un-filtered false positives, (6) suggested solution unreachable, (7) constraints too restrictive, (8) spec rules unfulfillable, are scored against the evidence below.

Ranked by causal weight on **this specific divergence**:

1. **The Recommendation contains a real defect.** The `Source of truth:` paragraph pinned by T22a1's `## Solution approach` enumerates the closed `SessionShutdownEvent['reason']` set as `"startup" | "reload" | "new" | "resume" | "fork"`. Every other site in the spec uses `"quit"` instead of `"startup"` — the same typo is repeated in the 2026-05-13 reshape-annotation in `docs/spec-review.md` line 7 (the human SDK-lookup that ratified T22a2 back into T22a1 mis-transcribed the union). Pass 1 of the inner loop correctly flagged this as a real consistency defect. Hypothesis (2) fully validated and is the proximate trigger for everything that followed.

2. **The Recommendation pins verbatim text whose lens-flagged shape was the originating defect being fixed.** The pinned `Source of truth:` paragraph is exactly the kind of "verbatim source citation" pattern that originally caused T22a to be parked to `spec-review-needs-reshape.md` per criterion 4 (see `docs/spec-review.md` line 7). The 2026-05-13 Path-A reshape ratified the citation block back inline into T22a1's Recommendation. The reduce step (SP-2) faithfully preserved that block in the `## Solution approach` field. The fix-loop is then asked to install text that the lens regime cannot accept on first principles — `Source of truth:` reads as a normative authority claim about externally-owned doc-string structure, which the assumptions / cruft / testability / external-entities lenses correctly flag as ungated. Hypothesis (6) fully validated.

3. **The pipeline has no convergence pre-flight on the Recommendation.** The picker checks `Shape: single`, `State: reduced`, and Atomicity. Nothing checks "would the verbatim text the Solution approach pins survive a single lens pass?" The first signal a divergent Recommendation produces is the `STATUS: diverging` from the inner loop after 5 passes — i.e., 5 wasted lens fan-outs, 5 wasted triage-assessor runs, 5 wasted classifier runs, 5 wasted spec-diff-fixer dispatches, and ~20 minutes of wall-clock — for what is structurally a "this Recommendation is wrong, send it back to a human" decision. Hypothesis (3) fully validated.

The other hypotheses are partially validated (4: triage didn't filter the typo as a Recommendation-protected pin because it had no concept of "Recommendation-protected"; 7: scope guards pinned the wrong content; 5: no false positives; 1: lenses are calibrated but operate under no Recommendation awareness; 8: not at fault here).

---

## 2. Timeline of the divergence

| Pass | Triage dir | Diff at start of pass | Findings raised | Filtered FP | Assessed | Top defect category | Headline finding |
|---|---|---|---|---|---|---|---|
| 1 | `2026-05-14T07-52-00_1c7942` | spec-review-fixer's installation: spec.md forward-link rewrite + new PIC sub-section with the verbatim Recommendation block | several across many lenses | 0 | **4** | clarity / consistency / external-entities | `"startup"` literal in the new sub-section enumerates an externally-owned union with a literal that contradicts every other site in PIC (which uses `"quit"`) |
| 2 | `2026-05-14T08-13-18_36fcbc` | typo fix `"startup"` → `"quit"` (or block reshape; rationale clause edited; Source-of-truth restated) | 5 | 0 | **5** | assumptions / cruft / clarity / traceability | "Source of truth" framing over-asserts what the cited evidence proves and silently contradicts the existing Future-Considerations "presupposition" disclaimer |
| 3 | `2026-05-14T08-38-32_68cc6c` | Source-of-truth paragraph attempt-2 — paraphrased the SDK quote but kept the citation form `` `@mariozechner/pi-coding-agent ~0.72.1`, `docs/extensions.md` `` (comma-separated) | 4 | 0 | **2** | assumptions + cruft + clarity (merged into one) | The verbatim SDK quote silently contradicts the existing PIC degraded-state-host-prerequisites presupposition (a) about extension-instance survival across `session_shutdown` |
| 4 | `2026-05-14T08-53-19_34eb27` | pass 3's edits — sub-section moved out of the four-prerequisite enumeration; bold→italic heading demotion; SDK-doc citation slash-joined | 5 | 0 | **5** | testability + assumptions + naming + clarity + consistency | Bolded `**Session-binding contract.**` heading promotes an externally-owned invariant to a contract item with no testable predicate |
| 5 | `2026-05-14T09-13-00_de2273` | pass 4's edits — inline closed-set restatement removed; cross-anchor target swapped | 7 | 0 | **6** (split across 4 lenses) | assumptions ×2, clarity, consistency ×2, cruft | Source-of-truth clause structure still under attack from 4 lens dimensions with mutually-incompatible remedies (delete vs paraphrase vs re-link vs rewrite) |

(Source: the `_triage.md` file at the head of each pass directory under `.pi/tmp/spec-fix-loop/`.)

The convergence-direction across the 5 passes is **non-convergent on the underlying paragraph** — only 1 of the 6 final-pass findings repeats verbatim from earlier passes; the other 5 are all new attack surfaces that the previous passes' edits exposed. This is the textbook divergence-by-protected-content pattern.

---

## 3. Root cause analysis

### 3.1 The Recommendation has a typo that was load-bearing

The text in `docs/spec-review.md` line 1668 (the `## Solution approach` of T22a1, in the verbatim markdown block):

> supplemented by the closed `SessionShutdownEvent['reason']` set `"startup" | "reload" | "new" | "resume" | "fork"` already pinned in this document, none of whose values enumerate a concurrent-session signal.

The rest of the spec uses `"quit"` not `"startup"`:

- `docs/spec_topics/pi-integration-contract.md` line 110 — `event.reason: "quit" | "reload" | "new" | "resume" | "fork"`
- ibid line 113 — Unknown-reason rule membership check `{"quit", "reload", "new", "resume", "fork"}`
- ibid line 142 — `markRuntimeDegraded` predicate `capturedEventReason ∉ {"quit", "reload"}`
- ibid line 169 — Per-invocation operator visibility row `"quit" | "reload" | "new" | "resume" | "fork" | string`
- `docs/plan_topics/h1-scaffold.md` line 43 — fixture
- `docs/spec-review.md` line 7 — the 2026-05-13 reshape annotation has the same `"startup"` typo (the human-side SDK lookup is the origin)

The typo entered T22a1 because:
- Originally T22a (parked 2026-05-11) called for a verbatim-source citation pattern.
- T22a was sub-split 2026-05-12 into T22a1 (anchor + paraphrase, auto-fixable) and T22a2 (citation block, parked pending human SDK verification).
- 2026-05-13 a human ran the live SDK lookup against `@mariozechner/pi-coding-agent ~0.72.1` and ratified T22a2 back into T22a1, inlining the citation block into T22a1's Recommendation.
- The human-typed citation block contained `"startup"` instead of `"quit"`. No mechanical check existed to catch the drift between the new Recommendation and the rest of the spec.

The reducer (SP-2) then preserved this verbatim text in the `## Solution approach` field at reduction time, faithfully (it is supposed to preserve the wording when the finding's defect IS the wording — see SP-2 carve-outs). The fixer at fix-loop entry installed the typo'd text into the spec, the inner loop's pass-1 lenses correctly flagged it, the loop tried to fix it, and from there the cascade was inevitable because the surrounding Source-of-truth paragraph also contains structural problems that repair-the-typo cannot address.

**This single defect is the root cause of pass 1's divergence trigger.** Without it, pass 1 would still have raised the assumptions / cruft / testability findings that show up in passes 2+, but with one less attack surface, and the divergence detector might have fired at pass 6+ rather than 5. The typo is necessary but not sufficient — see 3.2.

### 3.2 The Source-of-truth paragraph is structurally lens-incompatible on first principles

Per pass-2 triage (verbatim from `.pi/tmp/spec-fix-loop/2026-05-14T08-13-18_36fcbc/_triage.md` Finding A), the new paragraph asserts itself as "Source of truth" for a universal claim ("A Pi extension instance is bound to exactly one active user session at a time") while the cited evidence — the Lifecycle Overview / Session Events / closed-reason set — proves only the *behaviour during three known swap paths*, not the absence of any other Pi-host path that could introduce a concurrent session. The same claim is reverse-cited by `docs/spec_topics/future-considerations.md` line 107 with a literal disclaimer:

> this is a presupposition rather than a claim that the runtime has audited Pi's full extension API surface and confirmed the absence of any concurrent-sessions facet

So the new sub-section silently elevates a *presupposition* (per FC's wording) to a *Source of truth* (per the new sub-section's wording). The `spec-lens-assumptions` carve-out for SP-1 only suppresses findings that *make claims about* external entities; it does NOT suppress findings that catch a spec-internal contradiction between two paragraphs that describe the same invariant with conflicting epistemic strength. Pass 2 of the loop correctly raised this as a real defect.

The `Source of truth:` framing also has no editorial-review gate in `Pi version bump procedure` (PIC sub-section `#pi-version-bump-procedure`). Every other externally-sourced fact in the spec (the Node-floor pin, the AbortSignal member list, the `SessionShutdownEvent['reason']` literals) is gated by either a build-time `tsc` assertion (the brand-string-emitting type-equality assertion) or a literal-read assertion (the H1 SDK surface-inventory test) or an enumerated checklist item in the bump procedure. The new `Source of truth:` paragraph cites prose-doc structure (named section headings) without any mechanical gate — pass 4's testability lens correctly flagged this.

Worse, **the verbatim SDK quote** — *"pi emits `session_shutdown` for the old extension instance, reloads and rebinds extensions for the new session, then emits `session_start`"* — silently CONTRADICTS the existing PIC `degraded-state-host-prerequisites` presupposition (a) at line 19 of `docs/spec_topics/pi-integration-contract.md`, which posits Extension-instance SURVIVAL across session-only `session_shutdown`. The SDK-quoted "reloads and rebinds extensions for the new session" reads as instantiating a fresh extension on every swap — exactly what presupposition (a), the `LoomRegistry.markRuntimeDegraded()` machinery, the `degraded-needs-reload` tag, and the operator-driven `/reload` recovery path all *deny*. Pass 3's triage correctly identified this as the central defect: any reader following the new sub-section's "Source of truth" pointer concludes the loom degraded-state branch is unreachable, contradicting the rest of PIC.

These three structural problems (over-assertion vs evidence, contradiction with FC's "presupposition" framing, contradiction with PIC's own degraded-state contract) are NOT typo-fixable. They require either (a) deleting the `Source of truth:` paragraph, (b) replacing it with a forward-link to FC's existing `#v1-non-goals` anchor with the unaudited-presupposition framing intact, or (c) extensively re-scoping the universal claim with an "at least these three swap paths preserve binding" qualifier. Each is a different remedy that **another lens then critiques**:

- delete → cruft is happy, but consistency now flags "T22b and T22c's anchor target is missing"
- forward-link to FC → consistency happy, but per↔per cycle the Recommendation explicitly defers to T22b
- re-scope the claim → introduces hedge prose, prescription/clarity flag the new prose

This is the textbook "lens-divergence on a load-bearing protected paragraph" pattern. It is not lens-strictness pathology — every assessed finding across the 5 passes was a real defect. It is **the Recommendation pinning content the lens regime cannot stably host**.

### 3.3 The pipeline has no Recommendation-vs-lenses pre-flight

Looking at the pipeline architecture (workflow analysis, §4 below), there is no agent in the pipeline that checks "would the verbatim text in T22a1's Solution approach survive a single lens pass on first install?" The picker only checks Shape / State / Atomicity. The reducer faithfully preserves wording when the defect IS the wording. The fixer faithfully installs the wording. The lens fan-out correctly identifies it as defective. The triage-assessor correctly assesses it. The classifier correctly classifies it as `fix`. The inner fixer faithfully tries to fix it (often refusing per scope guards). And the loop diverges at pass 5.

Every individual agent in the pipeline did exactly what its prompt prescribes. The pipeline as a whole produced 5 wasted passes for what is structurally an "ask a human to reshape this Recommendation" decision.

The closest existing safeguard is the divergence detector itself (`fixCounts[-1] > fixCounts[-2]` after pass 5+), but it requires running the loop to the divergence point before firing — it is a backstop, not a pre-flight. SP-1 / SP-2 / scope-guards / spec-debt-register / classifier-isolation are all post-hoc patches to specific past divergences (T53 / T22a1 v1); none of them prevents a NEW divergence whose signature the pipeline hasn't yet learned.

---

## 4. Workflow analysis (mapping to user's 9 hypotheses)

| # | Hypothesis | Validated? | Evidence |
|---|---|---|---|
| 1 | Lenses too strict | Partially | The five active lenses (assumptions, cruft, clarity, consistency, traceability) raised **only real defects** across all 5 passes — the triage-assessor filtered zero findings as false positives in all 5 passes. So the lenses are calibrated correctly *as defect detectors*. They are however **un-aware** of which content the originating Recommendation pinned, and so they will critique pinned content as freely as they critique fixer-authored content. The lenses' SP-1 carve-outs (`spec-lens-assumptions`, `-consistency`, `-naming`, `-testability`, `-error-model`, `-completeness` per `spec-principles.md` SP-1) are focused on suppressing claims-about-external-entities, not on suppressing critiques-of-pinned-Recommendation-text. |
| 2 | Findings not solid | **Yes (root cause #1)** | T22a1's Recommendation contains a literal `"startup"` typo at `docs/spec-review.md` line 1668 that contradicts every other site in the spec. The same typo is in the 2026-05-13 reshape annotation at line 7 — the human SDK-lookup mis-transcribed the union. The reducer / picker have no mechanical check for "does the pinned text agree with the rest of the spec's terminology". |
| 3 | Workflow doesn't have appropriate recovery | **Yes (root cause #3)** | No pipeline stage pre-flights the Recommendation against the lens regime. Divergence only surfaces at pass 5, after 4 fix attempts. The divergence detector (`spec-diff-fix-loop` step 3g condition 3) is gated to pass 5+ specifically to tolerate single-pass noise on short runs (per agent comment), but on a Recommendation-driven divergence the trajectory is set by pass 1 and tolerating it for 4 more passes is wasted effort. There is no "is this Recommendation likely to converge?" precondition. |
| 4 | Issues raised by lenses not appropriately triaged | Partially | The triage-assessor merges related findings (Step 1.5) but its merge rule explicitly forbids merging findings whose remedies pull in opposite directions — and pass 4/5 had exactly that situation (delete vs re-link vs rewrite). The triage-assessor correctly separated them per its own rule. The classifier (`spec-diff-fix-classifier`) classifies in deliberate ignorance of the loop trajectory (per its prompt's "Classification independence" section, which is correct as designed); it has no "is this finding's only remedy a Recommendation-protected text region?" branch. So legitimately-flagged findings keep getting routed to the inner fixer and the inner fixer keeps refusing them per scope guards (which is the loop's structurally-correct no-op behaviour, but it does nothing to prevent the next pass's lens fan-out from re-raising them). |
| 5 | Lens findings contain false positives | **No** | All 5 passes had zero false-positive filterings. Re-validated by inspecting passes 1, 2, 3 triage tables: every cited line-and-clause exists in the actual diff text. The `_triage.md` files explicitly state "All N findings were validated against the diff" in each pass. |
| 6 | Solution can't get past the lens regime | **Yes (root cause #2)** | The Solution approach pins a verbatim markdown block whose `Source of truth:` paragraph is *structurally* incompatible with the lens regime: it asserts a universal claim about externally-owned behavior that the cited evidence only proves locally; it silently contradicts FC's "presupposition" framing of the same claim; it contains a verbatim SDK quote that contradicts PIC's own degraded-state survival presupposition; and it cites prose-doc structure with no editorial-review gate. *No edit producing the Recommendation's exact text* would survive a single lens pass — let alone the lens regime over multiple passes after fix attempts. |
| 7 | Constraints too restrictive | Partially | The scope guards forwarded to the inner fixer (`docs/spec-review.md` lines 1685–1690, the `## Solution constraints` block) explicitly forbid the most natural lens-suggested remedies — pre-installing the FC contingency cross-link (T22b territory), pre-installing the bump-procedure checklist item (T22c territory), modifying the closing sentence about concurrent user sessions (T15c territory). These are *correct* boundaries (cross-finding hygiene) but they leave the inner fixer with no remedy for the Source-of-truth paragraph's real defects. The constraints were designed assuming the Recommendation-pinned text was good; with the Recommendation pinning bad text, the constraints concentrate blast on the protected paragraph. |
| 8 | Spec rules unfulfillable | **No** | The spec itself is internally consistent (modulo the `"startup"` typo, which is in the *Recommendation* not the spec). PIC's existing degraded-state-host-prerequisites + Pi-version-bump-procedure machinery handles externally-sourced facts via gated build-time assertions — that machinery would have absorbed a properly-shaped Recommendation. The spec is not at fault. |
| 9 | Something else (agents/commands/data) | **Partial** | The reducer step (SP-2) was articulated specifically to fix the original 2026-05-12 T22a1 divergence (per `spec-principles.md` SP-2 history). It did fix the lens-cascade-from-triage-evidence pathway. It did NOT fix the lens-cascade-from-pinned-verbatim-text pathway, because the reducer's carve-outs preserve verbatim wording when the defect IS the wording — and T22a1 was reshaped on 2026-05-13 in a way that made the entire `Source of truth:` block "the wording" by ratifying T22a2's citation block back into T22a1's Solution approach. The reducer faithfully preserved exactly the text that subsequently broke the loop. So SP-2 is correct but its carve-out interacts pathologically with the reshape decision. |

### 4.1 Workflow gaps confirmed by reading the agent definitions

- `spec-review-fixer.md` (lines 245–301, "Output / Scope guards") forwards scope guards but does NOT forward the verbatim Recommendation text to the inner loop. The inner fixer therefore cannot distinguish "this is text the originating Recommendation pinned" from "this is text the previous pass's fixer added". Both look the same in the diff.
- `spec-diff-fix-loop.md` (Procedure step 3g, condition 3 "Divergence detection") gates divergence to `pass >= 5` — by design, to tolerate pass-to-pass noise on short runs. On Recommendation-driven divergence the trajectory is set at pass 1 and the gate just delays the inevitable by 4 passes.
- `spec-diff-fix-classifier.md` (under "What you must NOT know or infer") deliberately blinds itself to the loop trajectory. This is correct for the original failure mode it was built to fix (the orchestrator under-classifying real findings to force convergence). But the classifier ALSO has no awareness of which lens-flagged text regions are Recommendation-protected — it only classifies by Trust / impact / out-of-scope / cost-impact branches. A "`fix` classification but no inner-fixer can converge on it" finding gets re-classified `fix` on every pass and re-dispatched.
- `triage-assessor.md` Step 1 (False positive filtering) discards findings whose issue doesn't reproduce in the codebase, but has no concept of "this finding's only remedy is to edit a Recommendation-protected text region". It has no mechanism to surface "this is structurally unaddressable; bubble up".
- `spec-review-shape-single-picker.md` checks Shape / State / Atomicity but NOT "would the Recommendation's pinned text survive a lens pass". It cannot — the picker is read-only and runs in isolation from the lens fan-out.
- `spec-diff-fixer.md` (under "## Scope guards") refuses fixes that cross a guard, which on this divergence *correctly* refused 9 cross-guard fixes per the loop's own report. Refusal is structurally correct but does nothing to prevent the next pass.

### 4.2 What the reduction step preserved that triggered divergence

The 4-field reduced form of T22a1 contains a `## Solution approach` whose body includes the verbatim markdown block:

```markdown
<a id="session-binding-contract"></a>
**Session-binding contract.** A Pi extension instance is bound to exactly one active user session at a time. *Source of truth:* `@mariozechner/pi-coding-agent ~0.72.1`, `docs/extensions.md` — *Lifecycle Overview* (sequential `session_shutdown` → `session_start` flow on `/new`, `/resume`, `/fork`) and *Session Events* ("pi emits `session_shutdown` for the old extension instance, reloads and rebinds extensions for the new session, then emits `session_start`"), supplemented by the closed `SessionShutdownEvent['reason']` set `"startup" | "reload" | "new" | "resume" | "fork"` already pinned in this document, none of whose values enumerate a concurrent-session signal.
```

The `## Solution constraints` then says "do not introduce a fallback-condition clause, an SDK-doc-page-unavailable backup, a normative MUST, or any other prose" — which is interpreted by the spec-review-fixer as "install this exact text". The fixer correctly did so. Every divergence-class finding from pass 2 onward attacks one of: (a) the over-assertive "Source of truth" framing, (b) the verbatim SDK quote that contradicts the existing degraded-state presupposition, (c) the comma-separated citation form, (d) the inline closed-set restatement of an externally-owned union with a `"startup"` typo.

(d) was the typo. (a)(b)(c) are structural. The reducer was given a Recommendation that bundled (a)(b)(c)(d) and asked to preserve them verbatim. The reducer did its job. The reduction step is not at fault — the reshape decision that ratified T22a2 back into T22a1 is what produced the lens-incompatible bundle.

---

## 5. Recommendations

### 5.1 Immediate (T22a1 specifically)

**R1.** **Hand-fix the `"startup"` typo** in `docs/spec-review.md` lines 7 (the 2026-05-13 reshape annotation) and 1668 (T22a1's Solution approach pinned text). Change `"startup"` → `"quit"`. This is a 2-character edit that removes the load-bearing pass-1 trigger. **It does not prevent re-divergence by itself** — the structural defects (a)(b)(c) above remain — but it gives the loop a fairer chance.

**R2.** **Re-shape T22a1** to remove the structural lens-divergence triggers. Two practical options:

- **R2a (preferred, smaller):** Reduce T22a1's Solution approach to **anchor + paraphrase only**. Drop the `Source of truth:` paragraph entirely. The anchor is what T22b and T22c need to consume. The paraphrase is the bare invariant. The Source-of-truth machinery is owned (and gated) by the existing `Pi version bump procedure` and the build-time `SessionShutdownEvent['reason']` type-equality assertion (`docs/spec_topics/pi-integration-contract.md` step 5 of `Pi version bump procedure`). The new sub-section does not need to re-author it. This option closes (a)(b)(c)(d) at once and is one bullet-list-shortening edit.
- **R2b (larger, restores citation):** Split the Source-of-truth paragraph into a separate sibling finding T22a3 with its OWN Solution approach that doesn't bundle the universal-claim assertion. Re-park or re-defer T22a3 until a human can decide between (delete | forward-link to FC | re-scope with explicit "at-least-these-three-paths" qualifier).

**R3.** Recommend: **revert the 2026-05-13 ratification commit** that folded T22a2 back into T22a1, restore the original T22a (anchor + paraphrase only), and leave T22a2 parked. The ratification was based on a SDK-lookup that produced a misleading bundle and a typo'd transcription.

### 5.2 Pipeline (prevents the next divergence of this shape)

**R4.** **Add a Recommendation pre-flight to the picker** (or as a new agent dispatched between picker and `spec-review-fixer`). The pre-flight reads the `## Solution approach` field, extracts any pinned verbatim text (markdown block, quoted prose, normative-claim sentences), and runs **one** lens pass against that text in isolation — using the most divergence-prone lenses (assumptions, cruft, consistency, external-entities, testability). If any lens raises a `fix`-class finding against the Recommendation's pinned text, the pre-flight refuses with `RECOMMENDATION_UNREACHABLE: <heading>` and the orchestrator routes to a new `unreachable` list (recommend the user run a re-shape command on these findings). This is cheap (one lens pass, no fix attempts) and catches the failure mode 5 passes earlier. It also generalises beyond T22a1: any finding whose Recommendation pins lens-incompatible text is caught.

**R5.** **Add a "Recommendation-vs-spec-terminology drift check"** to the picker. Before returning a heading, the picker greps the spec for closed-set enumerations that look identifier-like (`"foo" | "bar" | "baz"` patterns, capitalised type names, anchor IDs) found in the Recommendation's verbatim blocks, and flags drift against the rest of the spec. T22a1's `"startup"` typo would have surfaced as `"startup" appears in T22a1's Solution approach but every other occurrence in the spec uses "quit"`. Refuse with `RECOMMENDATION_DRIFT: <heading>` and bubble up. Implementation: a 30-line bash/grep block in the picker, or a separate `spec-recommendation-terminology-check` agent.

**R6.** **Lower the divergence-detector gate from pass 5 to pass 3**, conditional on a new heuristic: "if pass 1 raised >=3 assessed findings against text introduced by the originating fixer, AND pass 2 also raised >=3 against the same text region, fire divergence at pass 3". This catches the Recommendation-pinned-bad-content case without sacrificing the noise tolerance for healthy short runs (which typically resolve in 1–2 passes with low finding counts). The current gate is calibrated against a different failure mode (slowly-converging good Recommendations).

**R7.** **Forward the verbatim Recommendation text to the inner loop** as a separate `RecommendationPins:` block alongside `ScopeGuards:`. The inner fixer can then mark text regions as "originating-Recommendation-pinned" and refuse fixes that would alter them — currently it can only refuse fixes that would cross scope guards, which is a different (cross-finding-hygiene) boundary. The classifier could ALSO be informed of pinned regions and route findings whose only remedy edits a pinned region into a new `ignore — recommendation-protected; bubble up to outer loop` branch. After N consecutive passes of `recommendation-protected` ignores on the same finding-region, the loop exits with a new `STATUS: recommendation-blocking` that signals "this Recommendation cannot land as written".

**R8.** **Add a `spec-review-recommendation-auditor` agent** that runs at `/reshape-spec-review` and `/reduce-spec-review` time. It walks each `Shape: single, State: reduced` Recommendation and, for any verbatim text block in the Solution approach, runs the same one-shot lens pass as R4. Findings are surfaced into the reshape / reduce review (not into the spec-review doc) so the human reshaping the finding sees them BEFORE committing the reshape. This catches T22a1-shape divergences at the reshape commit, not at fix-loop run time.

**R9.** **Make the divergence report actionable.** The current `STATUS: diverging` exit reports `FIXCOUNTS` and a NOTES paragraph. Augment the NOTES with: (i) the file:line range of the text region that lenses kept attacking across passes (computable as the intersection of cited line ranges across all passes' `_triage.md` files), (ii) which lens dimensions kept attacking (passes-with-finding-from-each-lens count), (iii) a one-line "structural defect category" from a small enumeration (`recommendation-pinned-overreach` | `cross-finding-bleed` | `lens-cascade-from-rename` | `unknown`). The current NOTES is human-readable narrative; the augmented version is machine-routable for later auto-reshape suggestions.

### 5.3 Process (humans operating the pipeline)

**R10.** **Reshape commits should require a "lens-survivable" check before merge.** When a human runs `/reshape-spec-review` and ratifies a parked finding back into the auto-fixable queue (as happened for T22a2 → T22a1 on 2026-05-13), the reshape command should run R4's pre-flight on the ratified Recommendation and refuse to commit if any lens flags it. This catches the failure at the commit boundary that introduces the divergent Recommendation, not at the fix-loop run that suffers it days later.

**R11.** **The 2026-05-13 reshape annotation pattern is too verbose to mechanically validate.** Line 7 of `docs/spec-review.md` is a single 1500-char paragraph carrying 5 nested update annotations. The `"startup"` typo lives inside it. Recommend: separate every reshape annotation into its own `## Reshape <date>` block with a structured field (Action / Affected findings / SDK-lookup-result / Net change) so terminology drift inside SDK-lookup-results is mechanically extractable.

**R12.** **Add a "the human who SDK-lookups should diff their lookup against the spec" step** to whatever process produces ratification commits. The 2026-05-13 ratification of T22a2 → T22a1 transcribed `"startup" | "reload" | "new" | "resume" | "fork"` directly into the Recommendation without grepping the rest of the spec for prior occurrences of the same closed set. A 10-second `rg '"reload" \| "new" \| "resume"' docs/` would have caught the typo before commit.

### 5.4 Lens calibration (low-priority — not the proximate cause here)

**R13.** Per `spec-principles.md` SP-1 sub-clause 6, the assumptions / cruft / testability / consistency lenses are supposed to prefer "demote / narrow / delete" actions over "clarify / formalize / extend / expand" actions when critiquing prose about external entities. Audit each lens's recent outputs across the 5 T22a1 passes — do they actually follow this discipline? (Spot-check: pass 2's Finding A correctly recommends demoting to a forward-link; pass 4's Finding A correctly recommends demoting the bolded heading. The discipline is being followed. No lens patch needed for this divergence.)

---

## 6. Risk and tradeoffs

- **R4 (pre-flight) cost:** ~1 lens pass per finding the picker selects. With ~20 active lenses but only ~5 divergence-prone ones, this is ~5 extra subagent calls per finding. On a 36-finding doc, ~180 extra subagent calls per `/fix-spec-shape-single-findings` run. Trade against: 5–17 wasted passes per divergent finding, ~13 lens calls per pass = up to 220 wasted subagent calls per divergent finding. R4 pays for itself if more than 1 in 36 findings would have diverged. Empirically (2 divergences out of ~10 fixed in pi-loom; 1 divergence in project_service), the rate is ~10–20%. R4 is a clear win on cost.
- **R5 (terminology drift check) cost:** ~50–200 ms per finding (bash greps), zero subagent cost. Pure win.
- **R6 (lower divergence gate) risk:** false-positive divergence exits on healthy short runs. Mitigated by the conditional on pass-1+pass-2 finding count (a healthy short run has 0 findings after pass 1).
- **R7 (forward Recommendation pins) cost:** small — adds ~20 lines to spec-review-fixer's output and ~30 lines to spec-diff-fix-loop and spec-diff-fixer. Mostly mechanical.
- **R8 (auditor at reshape time) cost:** moves the cost from fix-loop time to reshape time. Net cost neutral if reshape rate ≈ divergence rate; net win if reshape rate < divergence rate (humans reshape less than they fix).

---

## 7. What is NOT recommended

- **Do NOT loosen the lenses.** The five active lenses correctly identified five real defects in T22a1's Recommendation across 5 passes. Loosening would let bad text into the spec.
- **Do NOT raise the loop's pass cap above 17.** The cap is calibrated against good-Recommendation slow convergence; raising it just lets divergent runs burn more cycles before failing.
- **Do NOT auto-revert in-progress fix-loop edits on `STATUS: diverging`.** That decision is the orchestrator's (the user's `/fix-spec-shape-single-findings` prompt). Auto-revert in the inner loop would surprise users who want to inspect the divergent state.
- **Do NOT remove SP-2 (the reduction gate).** SP-2 fixes a different failure mode (lens-cascade from triage evidence). T22a1 v2 is a *different* failure mode (lens-cascade from Recommendation-pinned verbatim text). SP-2 still earns its keep on T53-shape divergences.

---

## 8. Cross-project applicability

The T53 divergence in `ap/project_service` (per `spec-principles.md` SP-1 history) had a different proximate cause (placement-lens cross-reference paraphrase that didn't resolve to any heading) but the same structural shape (Recommendation-pinned text that the lens regime cannot host stably). The recommendations in §5.2 (pre-flight, terminology check, forward Recommendation pins, structured divergence reports) all apply equally to project_service.

The recommendations in §5.1 are T22a1-specific. The user should run an analogous forensic on whatever the latest divergent finding in project_service is and apply §5.1-style hand-fixes there.

---

## 9. Appendix — file/line references

- T22a1 finding text: `docs/spec-review.md` lines 1648–1698 (heading at 1648; reduced-form body 1649–1698)
- T22a1 verbatim Recommendation block with `"startup"` typo: `docs/spec-review.md` line 1668
- 2026-05-13 reshape annotation with `"startup"` typo: `docs/spec-review.md` line 7
- Canonical `"quit"` literal sites: `docs/spec_topics/pi-integration-contract.md` lines 110, 113, 142, 169 (and many more); `docs/spec.md` line 42; `docs/plan_topics/h1-scaffold.md` line 43
- Conflicting "presupposition" framing: `docs/spec_topics/future-considerations.md` line ~107 (search for "presupposition rather than a claim")
- Conflicting "extension-instance survival" presupposition: `docs/spec_topics/pi-integration-contract.md` line 19 (anchor `#degraded-state-host-prerequisites`)
- 5-pass triage trail: `.pi/tmp/spec-fix-loop/2026-05-14T07-52-00_1c7942` through `.pi/tmp/spec-fix-loop/2026-05-14T09-13-00_de2273`
- Agent definitions: `~/.pi/agent/git/github.com/bitmonk8/pi-config/agents/spec-{review-fixer,diff-fix-loop,diff-fixer,diff-fix-classifier,review-shape-single-picker}.md`
- Principles: `~/.pi/agent/git/github.com/bitmonk8/pi-config/docs/spec-principles.md` SP-1 (boundary discipline at external entities), SP-2 (implementer view is reduced)

---

*End of forensic analysis.*
