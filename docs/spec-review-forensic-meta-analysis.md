# Meta-analysis — W3 spec fix-loop re-attempt (rec V + rec T + rec O + rec M + rec W)

```
PROJECT: pi-loom
SCOPE: did the W3 pi-config changes (8f0ccfe rec V, 2026-05-18;
       b20536d recs T+O+M+W, 2026-05-19) deliver the convergence
       the prior W2 meta-analysis predicted (V → T15a/T16a cures
       + safe T14/T19/T22a1 refusals via three-mode authoring
       guard; T → T12 cure; O → improved signal on T16a-shape;
       M → T15a pre-dispatch detection; W → CATEGORY field on
       every park) on the unparked validation set, and did the
       larger newly-dispatched batch surface new failure shapes?
INPUT: 10 forensic reports across two dispatches under
       .pi/tmp/spec-fix-failure-forensics/:
         - 2026-05-18T15-13-27_a2e488/  (3 reports — the rec V
           canary dispatch: T15b, T15a, T19 cluster)
         - 2026-05-18T20-36-39_b9045e/  (7 reports — the newly-
           dispatched batch: T03a, T05, T06, T07, T09, T10, T11a)
       + the W2 forensic set at
         .pi/tmp/spec-fix-failure-forensics/2026-05-17T16-41-31_b4324e/
         (re-read for delta detection)
       + pi-config commits 8f0ccfe (rec V) and b20536d
         (recs T + O + M + W)
       + pi-loom commits spanning 2026-05-18 → 2026-05-19
         (the 8 resolve / 11 park / 4 unpark commits since the
          prior meta-analysis at 44b83c3 / 8cf798a / 49e746b)
       + docs/spec-review.md and docs/spec-review-parked.md at HEAD
       + the prior W2 meta-analysis at 9f06d15
         (this document's predecessor)

HEADLINE: The W3 fixer-pipeline changes (rec V + rec T + rec O +
          rec M + rec W) delivered every cure their validation
          plan named on the cases where they were given a chance
          to run: T14 cured cleanly under rec V's approach-
          narrowing path (the fixer authored a fourth `subagent →
          prompt` closure clause citing existing material in
          invocation.md); T16a cured cleanly under rec V's
          over-fencing detection; T12 cured cleanly under rec T's
          stage-transition refusal mode (e); T15a parked
          pre-dispatch under rec M's staleness check; rec W's
          CATEGORY field shipped on every forensic. The W3 fix
          rate on rec V/T/M canaries is **3/3 cures + 1/1 safe
          early-exit = 4/4** on the cases where these recs were
          the first responder.

          However, two of rec V's heaviest canaries — the T19
          cluster (the rec V `(f-stop-2)` co-resolve test) and
          T15b (the unanticipated rec V prerequisite that landed
          before T15a) — were preempted by **rec O firing first**
          with sub-rationale
          `score-budget-exhausted-trust-override-suppressed`.
          Rec O is doing exactly what its design specifies — but
          its firing has surfaced a downstream gap: rec K's
          metadata-recovery defaults to medium (S=25) whenever
          the originating heading is absent from
          `docs/spec-review.md` at classifier time. The W3
          forensics document this for the T19 cluster (heading
          stripped at baseline by the unpark workflow), T03a
          (heading stripped pre-dispatch by Pattern I
          auto-reshape), T10 (same), and T11a (same). At true
          authored scores, T19 cluster (S=100) sits at
          Σ/S = 1.5×, T03a at 1.32×, T10 at 0.81×, T11a at
          2.11× — every one of these is below the k=3 gate
          threshold. **The Rec O gate is mis-routing 4 of its 8
          W3 firings as category-1 parks when the true defect is
          metadata-recovery, not finding-shape.**

          The newly-dispatched batch (T02–T11a, 11 findings + 7
          cascade) parked at a higher rate than the unparked W1
          set: **4 resolved (T02, T08a, T08b, T08c) + 7 parked
          (T03a, T05, T06, T07, T09, T10, T11a) + 7 cascade**.
          Two of the 7 parks (T05, T09) exited via
          `surface-expansion-irrecoverable` (tagged Category 2 by
          rec W) but the forensic root causes clearly name
          Category 1 finding-shape defects (bimodal Solution
          approach for T09; two-site authoring without
          canonical-home rule for T05). The CATEGORY field
          shipped, but its taxonomy collapses bimodal-finding
          parks into the same bucket as fixer-cannot-converge
          parks.

PRIMARY WORK:
  - **pi-config Tier D (urgent):** rec X — classifier metadata
    recovery via `git log -p` on `docs/spec-review.md` and
    `docs/spec-review-parked.md` when origin heading is absent
    at classification time. Closes the dominant W3 failure
    mode (4 of 8 Rec O parks).
  - **pi-config Tier C:** rec Z — split
    `surface-expansion-irrecoverable` exit into category-1
    (bimodal / two-site / multi-axis approach) and category-2
    (fixer cannot converge on a single-site finding) variants.
    Signal hygiene; closes the T05 / T09 mis-categorisation.
  - **pi-config Tier A:** rec AA — stage-3 prose-quality
    oscillation detector. T05 burned 4 passes (1 backtrack), T09
    burned 7 passes diverging on `naming` / `clarity` term
    cycles. Closes a fixer-capability gap that rec T mode (e)
    does not cover.
  - **pi-config Tier B (promote from postponed):** rec L (audit-
    side binding-surface ratification) and rec P (Problem-
    metadata decision-axes for score-vs-residue audit). T03a's
    forensic explicitly reports the audit returned LOW risk and
    PASS on all 14 lenses for a finding the fixer subsequently
    raised 11 defects on across 5 of those 14 lenses. T07's
    forensic reports the same shape. Audit misses are now first-
    order; postponement is no longer justified.
  - **pi-loom Tier E:** seven per-finding reshapes (T03a, T05,
    T06, T07, T09, T10, T11a) + four reshapes carried over
    from W2 (T13, T15a, T16b, T18a) + restore the four T19
    cluster headings to `docs/spec-review.md` (highest-leverage
    single edit per the T19 forensic).

GENERATED: 2026-05-19T18:00:00Z
           supersedes the W2 meta-analysis at 9f06d15
```

## Sources

- **Prior W2 meta-analysis** at `9f06d15:docs/spec-review-forensic-meta-analysis.md`
  — predicted that rec V would cure T15a and T16a cleanly while
  refusing T14 / T19 cluster / T22a1 safely via the three-mode
  authoring guard `(f-stop-1)` / `(f-stop-2)` / `(f-stop-3)`,
  that rec T would cure T12, that rec M would catch T15a's
  staleness pre-dispatch, that rec O would re-route T16a-shape
  trust-override findings as category-1 parks, and that rec W
  would surface a CATEGORY field on every park. This document
  reports against those predictions.
- **pi-config W3 commits**, both shipped to `bitmonk8/pi-config`
  (cloned at `~/.pi/agent/git/github.com/bitmonk8/pi-config/`):
  - `8f0ccfe` (2026-05-18) — **rec V**. Solution constraints are
    advisory, not binding. Adds SP-2's constraints subsection +
    refusal mode `(f) constraint-as-advisory` with three-mode
    authoring guard `(f-stop-1)` / `(f-stop-2)` / `(f-stop-3)` +
    new STATUS `must-fix-blocked-constraint-narrowing-refused` +
    classifier defer rationale `defer-to-debt — constraint-
    narrowed`. 1240 insertions / 130 deletions across 7 files.
  - `b20536d` (2026-05-19) — **recs T + O + M + W** in one
    commit. Rec T: refusal mode `(e) stage-transition-structural-
    growth` in `spec-diff-fixer` + new STATUS
    `must-fix-blocked-by-stage-transition` + defer rationale
    `defer-to-debt — stage-transition-structural-growth`. Rec O:
    pass-level shadow-budget gate (rule a-bis) in `spec-diff-fix-
    classifier` with `k = 3` multiplier + new sub-rationale
    `score-budget-exhausted-trust-override-suppressed`. Rec M:
    pre-dispatch precondition staleness check (step 2d) in
    `prompts/fix-spec-shape-single-findings.md` + new
    FailureMode `stale-precondition`. Rec W: CATEGORY field
    threaded across loop output, classifier `_blocked.md`
    templates, forensics TL;DR, parker reasons. 983 insertions
    / 124 deletions across 6 files.
- **W3 forensic reports — Dispatch 1** (canary set, run
  `2026-05-18T15-13-27_a2e488/`): 3 reports totalling 1 458 lines.
  - `t15b-move-concurrency-semantics-into-extension-architecture-implementation-notes.md`
    (1 045 lines, must-fix-blocked / Σ=260 vs S=25 at pass 1).
  - `t15a-reduce-session-model-orientation-paragraph-to-a-four-sentence-forward-linki.md`
    (538 lines, stale-precondition; rec M fired pre-dispatch).
  - `multi-t19a-extend-activeinvocationregistry-entry-shape-with-invocationid-t19b-ad.md`
    (875 lines, must-fix-blocked / Σ_shadow=150 vs S=25 at
    pre-pass exit; classifier defaulted to medium because
    cluster headings absent from both spec-review.md and
    spec-review-parked.md at loom-baseline time).
- **W3 forensic reports — Dispatch 2** (newly-dispatched batch,
  run `2026-05-18T20-36-39_b9045e/`): 7 reports totalling
  4 859 lines.
  - `t03a-add-loom-package-implementation-dependencies-v1-sub-paragraph-in-pic-host-p.md`
    (612 lines, must-fix-blocked / Σ_shadow=132 vs S=25 default
    at pass 2; origin heading absent at classification time).
  - `t05-bind-frontmatter-vs-binder-binder-settings-diagnostics-prose-root-word-incon.md`
    (824 lines, surface-expansion-irrecoverable at pass 4 after
    1 backtrack; root cause = two-site authoring without
    canonical-home rule).
  - `t06-operator-role-tui-binding-asserted-in-glossary-but-never-reconciled-with-non.md`
    (740 lines, must-fix-blocked / Σ_shadow=106 vs k×S=75 at
    pass 3; T06 medium / S=25 authored correctly).
  - `t07-queryerror-message-content-has-no-normativity-rule.md`
    (715 lines, must-fix-blocked / Σ_shadow=110 vs k×S=75 at
    pass 3; T07 medium / S=25 authored correctly).
  - `t09-bind-context-session-overview-bullet-uses-tilde-approximate-caps-that-contra.md`
    (752 lines, surface-expansion-irrecoverable at pass 7 after
    1 poisoned pass; stage 3 prose-quality lens churn).
  - `t10-single-string-bypass-behaviour-on-whitespace-only-absent-slash-argument-is-u.md`
    (685 lines, must-fix-blocked / Σ_shadow=81 vs k×S=75 at
    pass 2; origin heading stripped pre-dispatch).
  - `t11a-replace-consumes-one-slot-prose-with-explicit-forced-respond-exemption-rule.md`
    (531 lines, must-fix-blocked / Σ_shadow=211 vs S=25 default
    at pass 3; cluster-sibling tier is high / S=100, would not
    have fired at correct score).
- **pi-loom commits since the prior W2 meta-analysis** (44b83c3),
  in chronological order:
  - **Validation infrastructure:** `e12ccf9` re-unpark T19 cluster
    (rec K trigger); `8cf798a` restructure W2 meta around the
    fixer/finding architectural cut; `49e746b` add rec V +
    constraint-load-bearing sweep + binding-surface tightening;
    `90968cf` unpark T14 + T15b + T15a + T16a as rec V canaries;
    `f10156b` mark rec V shipped; `1d0de7a` unpark T12 as rec T
    canary; `9f06d15` mark recs T + O + M + W shipped.
  - **Dispatch 1 outcomes:** `0378193` resolve T12; `611fbd1`
    park T15b (must-fix-blocked); `490ef46` park T15a (stale-
    precondition); `1db5858` resolve T16a; `457d491` resolve
    T14; `85a005c` park T19 cluster (4 members,
    must-fix-blocked).
  - **Dispatch 2 outcomes:** `43a3612` park T11a (+2 cascade);
    `beb1bb1` park T10; `5c4462c` park T09 (surface-expansion-
    irrecoverable); `0ada98e` / `eb6fbb0` / `6a6d179` resolve
    T08c / T08b / T08a; `1f244c0` park T07; `730b5a2` park T06;
    `b8407cf` park T05 (surface-expansion-irrecoverable);
    `baeb044` park T03a (+5 cascade); `e9760a1` resolve T02.
- **Live state**, HEAD:
  - `docs/spec-review.md`: 0 finding H1s remaining (only the
    file-title H1 `# Triaged Spec Review — spec.md`). The entire
    triaged backlog is either resolved or parked.
  - `docs/spec-review-parked.md`: 26 H1s — T03a + T03b/c/d/e/f
    (cascade), T05, T06, T07, T09, T10, T11a + T11b/c (cascade),
    T13, T15a, T15b, T16b, T18a + T18b/c/d (cascade), T19a/b/d/e
    (cluster of 4).

---

## 1. The question

The prior W2 meta-analysis predicted specific outcomes for each
of the five shipped pi-config changes and pinned them to a
staged validation plan (W2 §6.8 Tier 4 steps 10–11). Rec V's
plan named T15a + T16a as cures, T14 as the `(f-stop-1)`
canary, the T19 cluster as the `(f-stop-2)` heaviest canary,
and T22a1 as additional `(f-stop-2)` evidence. Rec T's plan
named T12. Rec M's plan named T15a (alongside the rec V path).
Rec O's plan named T16a (alongside the rec V path). Rec W had
no specific canary — observable on every park.

W3 ran two dispatches over 24 hours. Dispatch 1 walked the
unparked validation canary set bottom-up
(T15b → T15a → T16a → T14 → T19 cluster → T12, per
`spec-review.md` line order at the time). Dispatch 2 walked
the newly-introduced T02–T11a batch that had not been
dispatched in W2 (these are the next set of audit-class
findings; T08a–c, T11a–c, T19 family had been on the W2 live
sheet but were either resolved or parked already). This
document asks: did the staged validation deliver the predicted
outcomes, and what does the newly-dispatched batch reveal?

## 2. Outcomes vs predictions — the validation scorecard

### 2.1 Dispatch 1 — the unparked canary set

| Canary | Rec being validated | Predicted outcome | Actual outcome | Verdict |
|---|---|---|---|---|
| **T14** | Rec V `(f-stop-1)` | Guard refuses safely; reshape needed | **Resolved** at `457d491` — fixer authored a fourth premise clause (iv) citing existing `invocation.md — Cross-mode semantics` material. The Problem's "missing fourth premise" was addressable by referencing existing corpus; rec V's approach-narrowing licensed the citation. `(f-stop-1)` did not fire because the new content WAS anticipated by the Problem (just under a citation framing W2 §5.4 missed). | **Stronger than predicted.** The W2 category-1 attribution was wrong; T14 was approach-narrowable. |
| **T16a** | Rec V over-fencing | Cures cleanly | **Resolved** at `1db5858`. Rec V's over-fencing detection narrowed the constraint fencing the orphan-premise re-sourcing site. | **As predicted.** |
| **T15a** | Rec V staleness bypass + Rec M pre-dispatch | Cures (rec V) once T15b lands; rec M as backstop pre-dispatch detection | **Parked** at `490ef46` with `FailureMode: stale-precondition`. **Rec M fired pre-dispatch** — no `spec-review-fixer` ran, no `spec-diff-fix-loop` ran. The constraint's prediction depended on T15b having landed; T15b parked in the preceding iteration, so the prediction was stale. | **As predicted for rec M.** Rec V's bypass path was not exercised because rec M shipped earlier in the orchestrator order; this is correct cascade ordering. |
| **T15b** | (not a canary; the unanticipated rec V prerequisite cascade-unparked by `90968cf`) | (not predicted — W2 §6.8 Tier 4 step 10 noted "A failure on T15b is unexpected and would not invalidate rec V validation") | **Parked** at `611fbd1` with `must-fix-blocked` / `score-budget-exhausted-trust-override-suppressed`. Σ=260 vs S=25 (gate fired at k×S=75; breach margin 10.4×). The forensic root cause: T15b's Solution approach mandates a ~600-word verbatim duplication whose intentional residue exceeds even the per-finding scope guard's reach. | **Unexpected** per W2 §6.8 step 10's note. Category-1 finding-shape defect; reshape needed (raise score, split into per-axis atoms, or narrow approach). |
| **T19 cluster (T19a/b/d/e)** | Rec V `(f-stop-2)` — heaviest canary | Guard refuses safely; W2 forensic literally named the boundary violation the guard must prevent | **Parked** at `85a005c` with `must-fix-blocked` / `score-budget-exhausted-trust-override-suppressed`. Σ_shadow=150 vs S=25 default (real cluster tier is high / S=100; at correct score, Σ/S=1.5× < k=3 gate). **Rec O preempted rec V** at pre-pass classifier exit; the fixer never ran, so `(f-stop-2)` was never tested. The classifier's metadata-recovery defaulted to medium because all four cluster member headings were absent from both `docs/spec-review.md` and `docs/spec-review-parked.md` at loom-baseline time (the unpark commit `e12ccf9` added them back, but the baseline snapshot `baf66c8` had stripped them earlier and the classifier has no git-history surface). | **Not validated.** Rec V's heaviest canary was preempted by rec O firing on a downstream rec K metadata-recovery gap. Re-validation requires either restoring the headings (W2 §6.6 Tier E + the T19 forensic's RI-1) or shipping rec X (§6.4 below). |
| **T12** | Rec T mode (e) | Cures (defers stage-2 scaffolding) or re-parks under new STATUS `must-fix-blocked-by-stage-transition` | **Resolved** at `0378193`. Rec T mode (e) deferred the stage-2 anchor-split that had caused W2 divergence; the loop converged on the top-level edit alone. | **As predicted.** |

**Dispatch 1 scorecard for the named recs:**

- **Rec V:** 2 cures (T14, T16a) / 0 refusals (the `(f-stop-2)`
  / `(f-stop-3)` modes were not exercised because rec O
  preempted on T19 cluster and no T20-shape findings were in
  the dispatch set). Validation **partial** — the cure paths
  are confirmed; the authoring-guard refusal modes are not.
- **Rec T:** 1/1 cure (T12). Validation **complete on the
  canary**.
- **Rec M:** 1/1 pre-dispatch firing (T15a). Validation
  **complete on the canary**.
- **Rec O:** fired correctly on T15b (true Category 1, real S=25,
  Σ=260, breach 10.4×) but **incorrectly preempted rec V** on
  T19 cluster (defaulted S=25, real S=100, would not have
  fired at correct score). Validation **mixed** — the gate
  mechanism is correct; rec K's metadata-recovery upstream of
  it is the defect surface.
- **Rec W:** CATEGORY field visible on every Dispatch 1
  forensic. Validation **complete**.

### 2.2 Dispatch 2 — the newly-dispatched batch

11 single-finding dispatches (T02–T11a). Cascade closure on
T03a (+5: T03b/c/d/e/f), T11a (+2: T11b/c), and T08a–c are
collapsed; the per-batch outcome:

| Finding | Outcome | Exit | Sub-rationale | CATEGORY (rec W) | True root cause |
|---|---|---|---|---|---|
| T02 | resolved | n/a | n/a | n/a | Sub-agent state-isolation enumeration sweep — clean fix. |
| T03a (+5 cascade) | parked | `must-fix-blocked` | `score-budget-exhausted-trust-override-suppressed` | 1 | **Two truths:** (a) origin score defaulted because heading stripped pre-dispatch by Pattern I auto-reshape — at real S the gate would not fire; (b) T03a's directional approach genuinely packs 3 independent normative axes (literal pins / H1-test wiring / swap-procedure) so even at correct S the residue Σ=132 sits at 1.32× S=100, well under k=3 but the multi-axis shape is real. **Rec X cures the metadata defect; rec P closes the axis-count audit gap.** |
| T05 | parked | `surface-expansion-irrecoverable` | n/a | 2 (**mis-tagged**) | **Category 1 in root cause** — two-site authoring (frontmatter Naming-convention paragraph + glossary entry) with no canonical-home rule. Every pass cures one site's defect and creates a new one on the other site (consistency, assumptions, traceability cycle over passes 1→2→3→4). Root cause names two-site authoring explicitly. Rec Z should tag this as Category 1. |
| T06 | parked | `must-fix-blocked` | `score-budget-exhausted-trust-override-suppressed` | 1 | T06's authored S=25 (medium) is correct; Σ_shadow=106 (4.24× S, 1.41× k×S=75). Solution approach mints a V1 carve-out at one site (glossary) whose surface area reaches 5 files. Genuine Category 1 — finding's score is structurally insufficient for the residue. Reshape: raise to high / S=100, or split into per-axis atoms. |
| T07 | parked | `must-fix-blocked` | `score-budget-exhausted-trust-override-suppressed` | 1 | T07's authored S=25 (medium) is correct; Σ_shadow=110 (4.4× S, 1.47× k×S=75). Solution approach licenses closure-shaped predicates over a pinning surface whose presupposition is empirically false — three pre-existing non-panic `.message` literal pins exist in three sibling files. Genuine Category 1. **Plus an audit miss** (see §3.4): full-iter3 audit returned PASS on all 14 lenses; actual fix raised defects on 5 of those. |
| T08a/b/c | resolved | n/a | n/a | n/a | Three clean term-sweep fixes (context_overflow / context-window overflow → context overflow). |
| T09 | parked | `surface-expansion-irrecoverable` | n/a | 2 (**mis-tagged**) | **Category 1 in root cause** — bimodal "either restate or forward-link" Solution approach licenses unbounded re-naming of an artifact that already has four pre-existing names two screens down. Stage 3 prose-quality lenses (naming, clarity, cruft) cycle indefinitely. Plus a fixer-capability gap: stage-3 cycle detection is not in rec T. |
| T10 | parked | `must-fix-blocked` | `score-budget-exhausted-trust-override-suppressed` | 1 | Origin heading stripped pre-dispatch (Pattern I auto-reshape — same as T03a, T11a). Defaulted S=25; Σ_shadow=81 (3.24× S, 1.08× k×S=75). At true score (unknown — not recoverable in environment per the forensic) the gate may or may not fire. Plus genuine Category 1: pass-1 fix synthesised a multi-axis, multi-document expansion. |
| T11a (+2 cascade) | parked | `must-fix-blocked` | `score-budget-exhausted-trust-override-suppressed` | 1 | **Pure Rec K metadata-recovery defect.** Origin heading stripped pre-dispatch. Defaulted S=25; Σ_shadow=211. **True cluster-sibling tier is high / S=100** (T11b, T11c both `Importance: high` / S=100). At true score: Σ/S = 2.11× < k=3, gate would NOT have fired. The forensic explicitly: "classifier's own `_blocked.md` flagged this as a 'likely category-1 reshape false-positive'". Inner loop made substantive correct progress: 6 fixes pass 1, 8 fixes pass 2; gate-only exit at pass 3. Rec X fully cures. |

**Dispatch 2 scorecard:**

- **Resolved:** 4 of 11 dispatched (T02, T08a/b/c).
- **Parked:** 7 of 11 + 7 cascade = 14 H1s parked.
- **Wins rate:** 36% on the newly-dispatched batch. Compared
  to W2's wins rate (8 of 16 = 50%, but counting cascade
  resolves), W3 Dispatch 2 underperforms on its own merits.
  This is consistent with the dispatch set's composition:
  every W3 Dispatch 2 finding is a first-dispatch attempt;
  the W2 set carried a higher share of re-dispatched findings
  (where prior failure had already trimmed the malformed
  ones).
- **Rec W CATEGORY field present on every park.** Validation
  **complete on the field's presence**.
- **Rec W CATEGORY field accuracy:** correct on 5 of 7 parks
  (T03a, T06, T07, T10, T11a all correctly tagged 1);
  **incorrect on 2 of 7** (T05, T09 tagged 2 but root cause
  is 1). Rec Z (§6.3) fixes this.

### 2.3 Aggregate W3

| Dispatch | Dispatched | Resolved | Parked (single) | Parked (cascade) | Wins |
|---|---:|---:|---:|---:|---:|
| 1 (canary set) | 6 | 3 | 3 | 0 | 50% |
| 2 (new batch) | 11 | 4 | 7 | 7 | 36% |
| **W3 total** | **17** | **7** | **10** | **7** | **41%** |

For comparison: W2 was 16 dispatched / 8 resolved / 8 parked
single = 50% wins; W1 was 6 dispatched / 0 resolved / 6 parked
= 0% wins.

W3 has cured every named canary it was allowed to run (rec V on
T14/T16a, rec T on T12, rec M on T15a) and shipped the CATEGORY
field rec W promised. It has also exposed two previously-latent
mechanisms — the rec K metadata-recovery gap and the
rec-W-tagging-collapses-bimodal-into-Cat-2 mis-classification —
that were not visible in W2 because rec O hadn't shipped to
fire on them and the surface-expansion-irrecoverable exit
hadn't yet been exercised on bimodal-finding shapes.

## 3. What rec V + rec T + rec O + rec M + rec W shipped, observed against W3 evidence

### 3.1 Rec V — Solution constraints as advisory (pi-config 8f0ccfe)

Shipped exactly as the W2 §6.1 sketch named: SP-2 subsection,
fixer's fifth narrowing check (over-fencing detection), inner-
fixer refusal mode `(f) constraint-as-advisory`, three
discriminating authoring-guard refusal modes `(f-stop-1)` /
`(f-stop-2)` / `(f-stop-3)`, classifier defer rationale
`defer-to-debt — constraint-narrowed`, NarrowedConstraints
plumbing through loop and orchestrator, new STATUS code
`must-fix-blocked-constraint-narrowing-refused`.

**W3 observations:**

- **T16a cured cleanly.** Rec V's over-fencing detection
  identified that the surviving Trust-boundary prose had no
  honest landing site for orphan premises under the original
  constraints, narrowed the constraint to admit the most-
  natural site, and the fix landed.
- **T14 cured by approach-narrowing** rather than guard-refused.
  The fixer authored a fourth premise clause (iv) referencing
  the existing `[Invocation — Cross-mode semantics]` rule that
  closes the `subagent → prompt` fan-out path. This is a
  legitimate citation of existing corpus material, not the
  fixer-as-author manufacture-the-missing-premise pattern that
  W2 §5.4 attributed T14 to. **W2's category-1 attribution was
  wrong** (or more charitably: the case was reframed-as-
  citation-able under rec V's expanded fixer license, which
  W2's reshape recommendation did not consider).
- **`(f-stop-1)` not exercised** — T14 did not trip it (the
  proposed content WAS anticipated by the Problem via the
  invocation.md citation route).
- **`(f-stop-2)` not exercised** — the T19 cluster was the
  named heaviest canary, but rec O preempted at pre-pass
  classifier exit. The fixer never ran.
- **`(f-stop-3)` not exercised** — no T20-shape "would weaken
  existing rule" candidates were dispatched.
- **Authoring-guard validation status: incomplete.** The cure
  paths (over-fencing detection, approach-narrowing) are
  confirmed working. The refusal-mode predicates remain
  untested on real dispatches. The constraint-load-bearing
  sweep at `docs/spec-review-constraint-sweep.md` is the
  pre-W3 evidence backing the three-mode decomposition; that
  sweep stands but is not yet corroborated by post-W3 in-the-
  loop evidence.

### 3.2 Rec T — Stage-transition structural-growth refusal (pi-config b20536d)

Shipped as the W2 §6.2 sketch: refusal mode `(e) stage-
transition-structural-growth` in `spec-diff-fixer`,
`Stage1TouchedChunks` set frozen at the stage 1→2 transition,
new STATUS `must-fix-blocked-by-stage-transition`, new defer
rationale.

**W3 observations:**

- **T12 cured cleanly.** Mode (e) deferred the stage-2 anchor-
  split that had caused the W2 pass-7 divergence; the loop
  converged on the top-level edit alone.
- **Mode (e) is too narrow to cover all stage-transition
  divergence.** T09's pass 5–7 divergence is also a stage-
  transition pattern (stage 3 prose-quality lenses activating
  on a chunk that converged stages 1–2 clean), but the
  divergence is on `naming` / `clarity` term cycles, not on
  structural-scaffolding additions. Rec T mode (e) fires on
  `<a id`, `> **`, `^### `, bold-label-period markers; it
  does not fire on prose re-naming. Rec AA (§6.4 below)
  closes this gap.

### 3.3 Rec O — Pass-level shadow-budget gate (pi-config b20536d)

Shipped as the W2 §6.4 sketch: rule a-bis in
`spec-diff-fix-classifier`, k=3 multiplier, new sub-rationale
`score-budget-exhausted-trust-override-suppressed`.

**W3 observations:**

- **Fired on 8 of 11 W3 parks.** Dominant exit code by a wide
  margin.
- **Correct firings (true Category 1):** T15b (Σ=260, S=25,
  10.4× — finding mandates ~600-word duplication exceeding
  any per-finding budget); T06 (Σ=106, S=25, 4.24× — finding
  authored at medium but surface reaches 5 files); T07 (Σ=110,
  S=25, 4.4× — finding's pinning-surface presupposition
  empirically false at three sibling-file pins).
- **Mis-firings (rec K metadata-recovery gap):** T19 cluster
  (Σ=150 vs defaulted S=25; at real S=100 ratio is 1.5× <
  k=3 → gate would not fire); T03a (Σ=132 vs defaulted S=25;
  at probable real S=100 ratio is 1.32× < k=3); T10 (Σ=81 vs
  defaulted S=25; real score unrecoverable in environment);
  T11a (Σ=211 vs defaulted S=25; at true cluster-sibling tier
  S=100 ratio is 2.11× < k=3, **explicitly flagged by the
  classifier itself as "likely category-1 reshape false-
  positive" in `_blocked.md`**).
- **Mechanism is correct; integration is wrong.** Rec O does
  exactly what its design specifies: catches trust-override-
  masked monotone-rising score sums. The defect is that the
  S value it computes against is wrong whenever rec K's
  heading-lookup falls through to the medium default.
- **Validation:** the gate's existence is confirmed; its
  precision is compromised by the upstream rec K gap.

### 3.4 Rec M — Pre-dispatch precondition staleness check (pi-config b20536d)

Shipped as the W2 §6.3 sketch: orchestrator step 2d in
`prompts/fix-spec-shape-single-findings.md`, new FailureMode
`stale-precondition`.

**W3 observations:**

- **T15a parked pre-dispatch with `FailureMode: stale-
  precondition`.** No `spec-review-fixer` ran; no `spec-diff-
  fix-loop` ran. The check flagged constraint #3's structural-
  ordering prediction as stale (predicted T15b had landed; T15b
  had re-parked one iteration ago).
- **Lexical signals worked.** The constraint's wording —
  "T15b and T15c MUST have already landed", "bottom-up ordering
  guarantees", "If either the Concurrency model subsection
  installed by T15b … is absent at edit time, defer" — matched
  rec M's planned detection patterns exactly.
- **Validation complete on the canary.** No false negatives or
  false positives in W3 evidence.

### 3.5 Rec W — Reject-category exit-code tagging (pi-config b20536d)

Shipped as the W2 §6.4 sketch: CATEGORY field on loop output,
classifier `_blocked.md`, forensics TL;DR, parker reasons.

**W3 observations:**

- **CATEGORY field present on every W3 park forensic.**
  Validation complete on presence.
- **Tagging accuracy: 8 of 10 W3 parks correctly categorised.**
  T15b, T15a, T19 cluster, T03a, T06, T07, T10, T11a all
  correctly tagged 1. T05 and T09 tagged 2 but root cause is
  Category 1 (bimodal / two-site finding shape).
- **The exit-code-to-CATEGORY table from W2 §6.4 is
  insufficient.** It maps `surface-expansion-irrecoverable`
  to Category 2 unconditionally. Empirically, two of the three
  W3 occurrences of this exit (T05, T09) trace to Category 1
  finding-shape defects — the fixer's surface-expansion is a
  symptom of the bimodal/two-site approach, not a fixer
  capacity gap. The exit's CATEGORY needs to be conditional on
  the root cause's named pattern. Rec Z (§6.3 below) provides
  the split.

## 4. W3 root cause analysis

### 4.1 The fixer/finding architectural cut still holds

The W2 §5.3 cut — fixer = mechanism, not author; rejection is
either Category 1 (malformed finding) or Category 2 (fixer
too-hard) — is intact in W3. Every park is one or the other;
no W3 evidence calls for a third category. The five shipped
recs all sit cleanly on one side of the cut: rec V revises
which surfaces are binding (Tier S architectural); rec T adds
a Category 2 fixer capability; rec M routes Category 1
pre-dispatch; rec O routes Category 1 within the inner loop;
rec W tags the category on exit.

### 4.2 The dominant W3 failure pattern — rec K metadata-recovery gap

Rec K shipped in W2 (pi-config 344da26) and was treated in W2's
§5.2 / §6.5 as a Tier D bug fix. The shipped logic aggregates
member importances correctly when the cluster member headings
are present in `docs/spec-review.md`. W3 evidence shows that
**the heading-present precondition is silently violated by
two upstream workflows** that strip headings before the
classifier runs:

1. **Pattern I auto-reshape** (top-level fixer's pre-dispatch
   pass). When the fixer's top-level pass removes the H1 from
   `spec-review.md` as part of authoring the spec edit, the
   inner classifier sees an absent heading and falls back to
   the medium default. Observed on T03a, T10, T11a in W3
   Dispatch 2.
2. **Human-driven baseline-snapshot strip.** When the loom
   baseline commit (the snapshot the loop reads as its starting
   state) has the heading absent — because a prior human or
   tool edited it out and the diff was committed — the
   classifier defaults to medium even on a freshly-unparked
   finding. Observed on the T19 cluster in W3 Dispatch 1: the
   unpark commit `e12ccf9` re-introduced all four cluster
   members to `spec-review.md`, but the loom baseline snapshot
   `baf66c8` (taken before the unpark) had removed them as part
   of the working-tree prep. The classifier reads the baseline,
   not HEAD.

**Effect.** Every cluster dispatch and every Pattern I
auto-reshape dispatch defaults to S=25, and rec O's k×S=75 gate
fires on any pass-2 residue ≥ 75 — which is the residue size of
essentially any normative-prose authoring task. The combination
of rec K's lookup mode and rec O's gate produces a recurring
false-positive class. The W3 forensics document this pattern in
explicit terms (T19 forensic root cause; T03a / T10 / T11a
forensic root causes).

**Fix.** Rec X (§6.4 below) — extend the classifier's metadata
recovery to consult `git log -p` against `docs/spec-review.md`
and `docs/spec-review-parked.md` when the origin heading is
absent at classification time. The recovery is bounded (last N
commits to either file; the most recent commit whose diff
contains `^# <heading>$`) and is exactly what a human reviewer
does in 60 seconds. The T19 forensic at `2026-05-18T15-13-27_a2e488/multi-t19a-*.md`
RP-1 specifies the implementation in detail.

### 4.3 The Rec W tagging mis-classification on surface-expansion-irrecoverable

Rec W's exit-code-to-CATEGORY table (W2 §6.4) maps:

| Exit | CATEGORY |
|---|---|
| `surface-expansion-irrecoverable` | 2 |

W3 evidence falsifies the unconditional mapping. T05's root
cause (verbatim, `t05-*` forensic): "Two-site authoring
(frontmatter Naming-convention paragraph + glossary entry)
with no scope-bounding constraint creates a recurring critique
surface; each rewrite trades one defect family for another."
T09's: "T09's bimodal 'either restate or forward-link'
Solution approach licenses unbounded re-naming of an artifact
that already has four pre-existing names two screens down".
Both are Category 1 finding-shape defects — the fixer's
surface-expansion is a *symptom* of the bimodal/two-site
approach, not a fixer capability ceiling. Rec Z (§6.3 below)
makes the tagging conditional on the loop's `LoopNotes`
content (which already records "two-site authoring", "bimodal
approach", "no canonical-home rule" as discriminators when
present).

### 4.4 Audit misses are now first-order

Rec V / T / M / O cured or pre-routed every cure-able case in
the W3 canary set. With the fixer pipeline saturated against
in-loop signal, the bottleneck has moved to the audit layer.
T03a's forensic states:

> "A secondary, pipeline-shaped concern: the prior
> `/spec-review-audit` pass (full-iter3-2026-05-15T12-45-01)
> returned `Overall risk: LOW`, `Recommended action:
> AUTO_RESHAPE` (cruft-removal only), and PASS on all 14
> spec-content lenses for an imagined post-fix sub-paragraph.
> The actual fix raised 11 distinct findings across 2 passes
> on 5 of those 14 lenses. This is a high-magnitude audit
> miss."

T07's forensic states the same shape:

> "the audit's lenses do not grep the corpus for
> counterexamples when the Solution approach licenses
> closure-shaped prose."

Both findings would have been routed to HUMAN_REVIEW or
AUTO_RESHAPE-with-narrowing pre-dispatch if the audit had
performed the binding-surface checks rec L (W2 §6.3) names
(Problem cited-rule absence, Problem propagated undefined
token, constraints fence all remediation sites, owner page
internally contradictory).

**The W2 postponement justification for rec L** — "rec V's
authoring guard absorbs rec L's T14-shape coverage in the
interim" — held for the W2 set's audit deficiencies (which
were largely T14-shape Problem-cited-rule-absence cases). It
does not hold for the W3 newly-dispatched batch's audit
deficiencies, which are Problem-pinning-surface-presupposition
defects (T07) and Problem-multi-axis-residue defects (T03a, T06,
T07). Rec L and rec P (Problem-metadata decision-axes) need to
ship now.

### 4.5 Stage-3 prose-quality oscillation is a fixer-capability gap

T09 burned 7 passes diverging on `naming` / `clarity` term
cycles in stage 3 (rewording the same `bind_context: session`
bullet through 7 distinct phrasings). T05 burned 4 passes
(plus 1 backtrack) on similar two-site naming cycles. Both
exited `surface-expansion-irrecoverable`, but the underlying
fixer pattern is the same: stage-3 prose-quality lenses
(`naming`, `clarity`, `cruft`, `testability`) activate on
chunks that converged stages 1–2 clean and start producing
rename-go-rename-back oscillation that the fixer cannot
detect.

Rec T mode (e) catches *structural* additions (`<a id`, `> **`,
`^### `, bold-label-period) at the stage 1→2 / 2→3 transitions.
It does not catch *naming* re-cycles. Rec AA (§6.4 below) adds
mode `(g) stage3-naming-cycle` to refuse a fix whose proposed
text re-uses a prose-token combination already seen in the
last N passes' working-tree state for the same chunk.

## 5. Recommendation set delta vs W2

The W2 recommendation set (rec V Tier S, rec T Tier A, rec L /
M / P Tier B, rec O / W Tier C, rec K Tier D, Tier E reshapes)
is mostly preserved. Delta:

- **Tier S (rec V):** still in scope as the architectural
  baseline. No revisions needed; the cure paths are validated.
  The three-mode authoring guard remains untested on real
  dispatches and is implicitly under-validated; promotion to
  "fully validated" deferred until a future dispatch exercises
  it.
- **Tier A (rec T):** still in scope as shipped. **Add rec AA**
  — stage-3 prose-quality oscillation detector. Same Tier
  because both are fixer-capability extensions.
- **Tier B (rec L, rec M, rec P):**
  - Rec M: shipped + validated; remove from "future" list.
  - **Rec L: promote from postponed to active.** W3 audit-miss
    evidence (T03a, T07) makes the postponement no longer
    justified.
  - **Rec P: promote from postponed to active.** W3 multi-axis
    residue evidence (T03a, T06, T07) makes it structurally
    needed alongside rec L.
- **Tier C (rec O, rec W):**
  - Rec O: shipped + validated as mechanism; under-validated as
    routing because rec K's metadata gap mis-feeds it. No
    direct revision to rec O; the upstream fix (rec X) closes
    the precision gap.
  - Rec W: shipped + partial validation. **Add rec Z** — split
    `surface-expansion-irrecoverable` CATEGORY tagging into 1
    (bimodal / two-site / multi-axis) and 2 (fixer cannot
    converge on a well-shaped single-site finding).
- **Tier D (rec K, plus new):**
  - Rec K: shipped; **the heading-absent default has a real
    failure mode rec K did not close.** Add rec X (classifier
    git-history surface) and rec Y (loom baseline-snapshot
    pre-flight delta check). These are not "rec K bugs" — they
    are integration extensions rec K's W2 design did not
    consider.
- **Tier E (pi-loom reshapes):** **expand from 6+1 to 11+1**.
  W2's list (T13, T14, T15a, T16a, T16b, T18a) survives modulo:
  T14, T16a cured by rec V (remove); T15a + T16a become
  optional clarity work (remove from required list). W3 adds:
  T03a, T05, T06, T07, T09, T10, T11a, T15b. Total active
  Tier E: T13, T16b, T18a, T03a, T05, T06, T07, T09, T10,
  T11a, T15b (11 reshapes) + one new spec-review entry from
  W2 (PIC L213 contradiction that T16b depends on) + RI-1
  from T19 forensic (restore the four T19 cluster headings
  to spec-review.md; this is a one-line `git show` patch, but
  it unblocks the cluster dispatch under rec X).

## 6. Recommendation set

Structured under the same Tier S / A / B / C / D / E layout as
W2 §6, with W3 deltas inline.

### 6.1 Tier S — finding-shape principle changes

**Rec V — Solution constraints are advisory, not binding.**
**SHIPPED W3 as pi-config 8f0ccfe.** Validation status:

- **Cure paths (over-fencing narrowing, approach-narrowing
  via citation): validated** on T16a (cured cleanly) and T14
  (cured via citation to existing invocation.md material).
- **Three-mode authoring guard `(f-stop-1)` / `(f-stop-2)` /
  `(f-stop-3)`: not exercised in W3.** T14 did not trip
  `(f-stop-1)` (the cited content WAS anticipated by the
  Problem). T19 cluster was rec V's `(f-stop-2)` heaviest
  canary but rec O preempted at pre-pass classifier exit
  before the fixer ran. No T20-shape findings dispatched, so
  `(f-stop-3)` untested.
- **Re-validation path:** ship rec X (§6.4) so the T19
  cluster's next dispatch reaches the fixer instead of
  exiting on rec O's mis-aggregated budget. The dispatch then
  exercises `(f-stop-2)` directly, with the W2 forensic's
  literally-named boundary violation as the pass/fail test
  ("fixer would push T19c-territory MUSTs into the field
  comment under D-mode clause 1 must-fix-blocker pressure").

No changes to rec V itself. The under-validation of the
authoring guard is a downstream-dependency issue (rec K /
rec X gap), not a rec V defect.

### 6.2 Tier A — fixer-capability extensions

**Rec T — Stage-transition structural-growth refusal.**
**SHIPPED W3 as pi-config b20536d.** Validation status:
**T12 cured.** Mode (e) deferred the stage-2 anchor-split
that had caused the W2 pass-7 divergence. No revisions.

**Rec AA — Stage-3 prose-quality oscillation detector. (NEW.)**

T09 burned 7 passes diverging on `naming` / `clarity` term
cycles (`walk algorithm` ↔ `truncation walk`, `effect` ↔
`runtime behaviour`, `bounded recent slice` ↔ `turn- and
token-bounded recent suffix` ↔ `included context`, full vs
abbreviated link display text). T05 burned 4 + 1-backtrack
passes on related two-site naming cycles. The pattern is
distinct from rec T mode (e)'s structural-scaffolding
addition: no new `<a id` / `> **` / `^###` is being added;
the loop is re-naming an existing prose token to a variant
that triggered a fix in a previous pass.

**Mechanism (sketch):**

- New refusal mode in `agents/spec-diff-fixer.md`: `(g)
  stage3-naming-cycle`. Fires when:
  - the current pass is in stage 3; AND
  - the proposed fix's diff hunk replaces a prose token (any
    word-shape match excluding code-fenced identifiers,
    anchor IDs, and link targets) with a variant that
    appeared in the working-tree state at any of the last N
    passes (N=3 recommended) for the same chunk; AND
  - the fix's lens of origin is `naming`, `clarity`, `cruft`,
    or `testability`.
- The fixer refuses with NOTES line `RefusalMode: (g)
  stage3-naming-cycle; chunk=<chunk-id>; token=<original>;
  proposed=<variant>; prev-seen-at=<pass-N-K>`.
- New classifier defer rationale `defer-to-debt — stage3-
  naming-cycle`. The originating lens finding routes to debt;
  the loop continues without applying the cycle-edit.
- New STATUS in `agents/spec-diff-fix-loop.md`:
  `must-fix-blocked-by-stage3-naming-cycle` (Category 1 if
  the finding's Solution approach is bimodal / two-site —
  rec Z's mechanism applies; Category 2 otherwise).

**Coverage:** T09 directly (cures or exits 3–4 passes earlier
with a precise rationale). T05 indirectly (the two-site
component is the dominant cause; the cycle component is the
trigger).

**Files changed (pi-config):** `agents/spec-diff-fixer.md`,
`agents/spec-diff-fix-classifier.md`, `agents/spec-diff-fix-
loop.md`. ~40 lines total. The per-pass per-chunk working-tree
state already exists in `_diff.txt` artefacts; the new work is
the token-match check + NOTES surface + STATUS code.

### 6.3 Tier B — finding-authoring-layer empowerments

**Rec L — Audit-side binding-surface ratification.**
**PROMOTED from postponed to active.** No changes to the W2
§6.3 mechanism specification. Justification for promotion:
W3 audit-miss evidence on T03a and T07 is first-order. The
"interim absorption by rec V's authoring guard" the W2 §6.8
postponement relied on covered the T14-shape Problem-cited-
rule-absence cases; it does not cover the T07-shape Problem-
pinning-surface-presupposition cases or the T03a-shape
Problem-multi-axis cases.

**Rec M — Pre-dispatch precondition staleness check.**
**SHIPPED W3 + VALIDATED.** Remove from forward planning.

**Rec P — Decision-axes Problem-metadata + score-vs-residue
audit. PROMOTED from postponed to active.** No changes to the
W2 §6.3 mechanism specification. Justification: T03a, T06, T07
all have multi-axis Problems generating residue beyond budget;
the reducer's axis-count metadata feeds rec L's score-vs-residue
check pre-dispatch. With both shipping, the audit layer can
route these three findings to reshape without burning the inner
loop's passes.

### 6.4 Tier C — pipeline rejection-signal hygiene

**Rec O — Trust-override / score-budget precedence.**
**SHIPPED W3 + VALIDATED as mechanism.** Routing precision is
compromised by rec K's metadata gap (4 of 8 W3 firings mis-
routed). Closed by rec X (Tier D below), not by changes to
rec O.

**Rec W — Reject-category exit-code tagging.** **SHIPPED W3 +
PARTIAL VALIDATION.** CATEGORY field shipped on every park.
Tagging accuracy 8 of 10 (T05, T09 mis-tagged 2 → root cause
1). Closed by rec Z below.

**Rec Z — Split `surface-expansion-irrecoverable` CATEGORY by
finding shape. (NEW.)**

The current rec W mapping tags every
`surface-expansion-irrecoverable` exit as Category 2. W3
evidence: 2 of 3 such exits (T05, T09) have Category 1 root
causes (bimodal / two-site / multi-axis finding shape). The
fixer's surface-expansion is a *symptom* of the finding's
shape, not a fixer capacity ceiling. Tagging these as
Category 2 routes the human reader to "file a pi-config
issue" when the correct response is "reshape the finding".

**Mechanism (sketch):**

- Split `surface-expansion-irrecoverable` into two exit codes:
  - `surface-expansion-irrecoverable-bimodal` (Category 1) —
    fires when `LoopNotes` for the run contains any of the
    discriminator strings: "two-site authoring", "bimodal
    approach", "either…or…approach", "no canonical-home rule",
    "multi-axis", "multi-site". The loop already records these
    in its per-pass notes when present (T05 and T09's
    `LoopNotes` both contain such strings verbatim).
  - `surface-expansion-irrecoverable-cycle` (Category 2) —
    fires when no Category-1 discriminator string is present
    but the surface-expansion threshold is breached. Pure
    fixer-cannot-converge on a well-shaped single-site
    finding.
- Forensic reports and parker reasons emit the precise variant
  + CATEGORY accordingly.
- The new `must-fix-blocked-by-stage3-naming-cycle` STATUS
  (from rec AA) takes its CATEGORY by the same discriminator
  check.

**Coverage:** all `surface-expansion-irrecoverable` exits
(including future ones). Also generalises to the new
`stage3-naming-cycle` STATUS from rec AA.

**Files changed (pi-config):** `agents/spec-diff-fix-loop.md`,
`agents/spec-fix-failure-forensics.md`,
`agents/spec-review-parker.md`. ~20 lines.

### 6.5 Tier D — known pipeline bugs

**Rec K — Cluster-importance aggregation.** **SHIPPED W2.**
Closes the cluster-aggregation defect *when member headings
are present at classification time*. W3 surfaced two upstream
workflows that violate the heading-present precondition;
closed by rec X + rec Y below, not by changes to rec K.

**Rec X — Classifier metadata recovery via git history.
(NEW.)**

When the originating finding's heading (or, for clusters, all
member headings) is absent from both `docs/spec-review.md` and
`docs/spec-review-parked.md` at classification time, the
classifier defaults `severity=medium`, `S=25`, `mustFix=false`
per the heading-absent policy. W3 evidence: this default fires
on at least 4 of 11 W3 parks (T19 cluster, T03a, T10, T11a).
At authored scores, none of these would trip rec O's gate.

**Mechanism (sketch, recovered from the T19 forensic's RP-1):**

- New classifier sub-routine `recoverMetadataFromGitHistory` in
  `agents/spec-diff-fix-classifier.md`. Inputs: heading text (or
  cluster member heading list), the two spec-review file paths.
  Output: `{severity, S, mustFix}` recovered from the most
  recent commit whose diff contains `^# <heading>$` on either
  file's `+` or `-` lines.
- Implementation: shell out to `git log -p -N --follow --
  docs/spec-review.md docs/spec-review-parked.md` (N=50 by
  default; the W3 cases are all within the last 10 commits).
  Parse the patch hunks for `^# <heading>$` matches. From the
  matched hunk, extract the `**Importance:**` field value
  (the per-finding metadata block typically appears within
  20 lines of the heading; readable verbatim from the
  context). Map importance → score using the existing policy
  (high → 100, medium → 25, low → 5).
- Recovery falls through to the existing medium default only
  when the search returns zero matches (the heading was
  authored entirely in the dispatch task body or removed in a
  long-ago squash beyond the search window). The default's
  current semantics are preserved for the genuinely-
  unrecoverable case.
- For clusters: the same search runs against each member
  heading; rec K's max-aggregation runs on the recovered
  set.

**Coverage:** T19 cluster (S 25 → 100, gate ratio 6.0× →
1.5×, gate does not fire); T03a (S 25 → ≥100 once heading
located in git history; gate ratio 5.28× → ≤1.32×); T10
(unknown — depends on whether T10's authored importance is
recoverable; the T10 forensic notes the heading was never
present in the searchable history range, so this case may
remain at default — but the default-fallback semantics are
preserved); T11a (S 25 → 100; gate ratio 8.44× → 2.11×, gate
does not fire).

**Files changed (pi-config):**
`agents/spec-diff-fix-classifier.md`. ~80 lines (the new
sub-routine + shell-out + parser + cluster-loop integration).

**Implementation scope:** medium. The classifier already has
read-file capability; the new work is adding `git log -p`
shell-out (or, equivalently, reading the cached output from a
new orchestrator step that runs the recovery once per
dispatch and passes the result in via a new field). The
T19 forensic's RP-1 explicitly walks the implementation.

**Rec Y — Loom baseline-snapshot pre-flight delta check.
(NEW.)**

When the loom baseline commit differs from main HEAD by more
than 100 lines on `docs/spec-review.md` or
`docs/spec-review-parked.md`, emit a warning to the
orchestrator's pre-flight output: "the working tree has
stripped large blocks from the review docs; if this strip
removed the heading you are about to dispatch, the classifier's
metadata-recovery may fall through to heading-absent default
unless rec X is shipped; consider unparking the heading or
applying the parked content before proceeding".

**Coverage:** the T19 cluster case (baseline commit `baf66c8`
removed 137 lines from `spec-review.md`) and the general
pattern of human-driven partial-application workflows that
modify the review docs in the working tree between unpark and
dispatch.

**Lower priority than rec X.** Rec X closes the root cause;
rec Y surfaces the upstream pattern earlier in the failure
chain but is redundant once rec X is shipped (the recovery
will succeed without the warning being needed). Ship rec Y
only if rec X's git-history search has a measurable false-
negative rate on the strip-then-add-back-in-different-commit
patterns.

**Files changed (pi-config):**
`prompts/fix-spec-shape-single-findings.md` pre-flight section.
~20 lines.

### 6.6 Tier E — finding-authoring work (pi-loom)

Eleven per-finding reshapes + one new spec-review entry +
one heading-restoration patch. Each W3 forensic at
`.pi/tmp/spec-fix-failure-forensics/2026-05-18T15-13-27_a2e488/`
and `.pi/tmp/spec-fix-failure-forensics/2026-05-18T20-36-39_b9045e/`
includes a `### Immediate (this finding)` subsection with the
specific reshape recommendation; the table below summarises
new + carry-over items:

| Finding | Source | Reshape action | Status |
|---|---|---|---|
| **T19 cluster heading restoration** | T19 forensic RI-1 | `git show e12ccf9 -- docs/spec-review.md` and patch the four cluster member headings back into `docs/spec-review.md` (highest-leverage single edit; unblocks the cluster dispatch once rec X ships, and rec K aggregation succeeds at S=100). | NEW W3 |
| **T03a** | T03a forensic | Split into three per-axis atoms (literal pins / H1-test wiring / swap-procedure); OR raise score to high (S=100) on the strength of the multi-file surface; OR narrow the Solution approach to forbid embedding implementation literals in a behavioural host-contract document. | NEW W3 |
| **T05** | T05 forensic | Declare a canonical home (recommend frontmatter Naming-convention paragraph) and demote the glossary entry to back-reference; OR drop the "every other surface" universal claim and enumerate diagnostic-code-family scopes per-family; OR split into per-site atoms with explicit non-duplication constraints. | NEW W3 |
| **T06** | T06 forensic | Raise score to high (S=100) on the strength that the V1 carve-out's downstream contract surface is genuinely multi-file; OR split into 3–4 per-axis atoms (glossary anchor + V1-invariant sentence; spec.md forward-link; cross-page consumer enumeration sync; FC anchor coverage); OR narrow approach to drop the cross-page consumer-enumeration work. | NEW W3 |
| **T07** | T07 forensic | List the three known cross-file `.message` pins (`query.md:98`, `pi-integration-contract.md:262`, `implementation-notes.md:23`) in T07's Solution constraints so the fixer enumerates them; OR explicitly forbid closure-shaped predicates in the new paragraph; OR narrow T07 to the audience claim only and defer the pinning-surface question. | NEW W3 |
| **T09** | T09 forensic | Resolve the bimodal "either restate or forward-link" — pick one branch in the Solution approach; OR raise score to high to admit stage-3 prose-quality residue; OR narrow the constraint to forbid renaming the link display text (the dominant cycle source). | NEW W3 |
| **T10** | T10 forensic | Recover T10's real importance/score from outside the heading (unavailable in environment per the forensic — may need authoring decision); OR split T10 along the three axes pass-1 expansion revealed (binder-side bypass clarification, slash-invocation trim-semantics pin, PIC restatement sync). | NEW W3 |
| **T11a** | T11a forensic | **Procedural reshape:** restore T11a's heading + `**Importance:** high` / `**Score:** 100` to `docs/spec-review.md` (the heading was stripped pre-dispatch by Pattern I auto-reshape). Once rec X ships this is automatic. Until then: restore by hand. Secondary content reshape: enumerate the wrong-tool diagnostic surface explicitly in T11a's Solution approach. | NEW W3 |
| **T15b** | T15b forensic | Raise score to high (S=100); OR split into per-axis atoms (the ~600-word duplication bundles 8+ obligations behind one anchor); OR drop the verbatim-duplication requirement in favour of a forward-link from the new `<a id="concurrency-model">` site to the existing `<a id="session-model">` paragraph. | NEW W3 |
| T13 | W2 forensic | Split into a defining-finding (own `cross-file` in the *countable-frame* paragraph or `glossary.md`) + the propagation finding, with `must-precede` ordering. | CARRY-OVER from W2 |
| T16b | W2 forensic | Author the prerequisite finding (PIC step 2 L213 internal contradiction) and add `must-precede` edge into T16b. | CARRY-OVER from W2 |
| T18a | W2 forensic | Pin the 3 axes (caller-observation-surface taxonomy; quantifier domain; pre-evaluation behaviour) OR split into per-axis atoms OR raise score. | CARRY-OVER from W2 |
| **New spec-review entry** | W2 forensic | Author "PIC step 2 internal contradiction: literal `pi.setActiveTools([...snapshot, ...names])` call shape vs natural-language 'exactly the loom's declared callable set'." Add `must-precede` edge from T16b. | CARRY-OVER from W2 |

Cascade-parked findings (T03b/c/d/e/f, T11b/c, T15b cascade if
any, T18b/c/d) re-dispatch when their upstream lands; no
per-cascade reshape.

**W2 carry-overs no longer required:** T14 (cured by rec V at
`457d491`); T15a (now optional clarity work — rec V's
staleness bypass + rec M's pre-dispatch check fully cover it);
T16a (cured by rec V at `1db5858`).

### 6.7 Summary table

| Rec | Tier | Title | Coverage | pi-loom | pi-config |
|---|---|---|:-:|:-:|:-:|
| V | S | Solution constraints as advisory | T14 + T16a (cures); `(f-stop-2)` heaviest canary preempted by rec O (re-validate after rec X) | | ✓ (SHIPPED W2 — 8f0ccfe; partial validation) |
| T | A | Stage-transition structural-growth refusal | T12 (cured) | | ✓ (SHIPPED W2 — b20536d; validated) |
| **AA** | **A** | **Stage-3 prose-quality oscillation detector (NEW)** | **T09 + T05 (cycle component)** | | **needed** |
| L | B | Audit-side binding-surface ratification | T13 / T14 / T16a / T16b (W2) + T03a + T07 (W3) | | needed (promoted from postponed) |
| M | B | Pre-dispatch precondition staleness | T15a (validated) | | ✓ (SHIPPED W2 — b20536d; validated) |
| P | B | Decision-axes Problem-metadata + score-vs-residue audit | T18a (W2) + T03a / T06 / T07 / T15b (W3) | | needed (promoted from postponed) |
| O | C | Trust-override / score-budget precedence | T15b / T06 / T07 (correct fires) + 4 mis-fires (rec X cures) | | ✓ (SHIPPED W2 — b20536d; routing precision compromised by rec K gap) |
| W | C | Reject-category exit-code tagging | All parks (8 of 10 correct) | | ✓ (SHIPPED W2 — b20536d; rec Z closes the 2 mis-tagged) |
| **Z** | **C** | **Split surface-expansion-irrecoverable CATEGORY (NEW)** | **T05 + T09 (mis-tagged today)** | | **needed** |
| K | D | Cluster-importance aggregation | T19 cluster when headings present (closed by rec X for the absent case) | | ✓ (SHIPPED W2 — 344da26; integration gap closed by rec X) |
| **X** | **D** | **Classifier git-history metadata recovery (NEW)** | **T19 cluster + T03a + T10 + T11a (4 of 11 W3 parks)** | | **needed (URGENT)** |
| Y | D | Loom baseline-snapshot pre-flight delta check (NEW) | redundant after rec X; ship only if rec X has measurable false-negative rate | | optional |
| Tier E | E | 11 per-finding reshapes + 1 new finding + 1 heading-restoration patch | 11 parks + 1 prerequisite + T19 cluster unblock | ✓ | |

### 6.8 Priority order

Ranked by impact-per-effort against W3 evidence:

**Tier 1 — ship now (closes the dominant W3 failure mode):**

1. **Rec X** (pi-config) — classifier git-history metadata
   recovery. Closes 4 of 11 W3 parks (T19 cluster, T03a, T10,
   T11a). Without rec X, every future Pattern I auto-reshape
   dispatch repeats the same mis-routing. **Highest leverage
   single pi-config change in W3.**
2. **T19 cluster heading restoration** (pi-loom Tier E
   first item) — one-line `git show` patch. Unblocks the
   cluster dispatch under rec X. **Highest leverage single
   pi-loom edit in W3.**

**Tier 2 — ship to close the audit-side gap:**

3. **Rec L** (pi-config) — audit-side binding-surface
   ratification. Closes T03a + T07 audit misses + retains W2
   T13 / T14 / T16a / T16b coverage. Promoted from W2's
   postponed status because audit misses are now first-order
   (no fixer-pipeline mechanism in W3 can detect them
   pre-dispatch).
4. **Rec P** (pi-config) — decision-axes Problem-metadata +
   score-vs-residue audit. Pairs with rec L; the metadata
   feeds L's score check. Closes T03a / T06 / T07 / T15b /
   T18a multi-axis residue audit misses.

**Tier 3 — ship to clean up signal:**

5. **Rec Z** (pi-config) — split
   `surface-expansion-irrecoverable` CATEGORY tagging. Closes
   the T05 / T09 mis-tagging. Small change; ships with rec L /
   P or alongside rec AA.
6. **Rec AA** (pi-config) — stage-3 prose-quality oscillation
   detector. Closes T09 directly + T05 cycle component. Same
   tier as rec T (fixer-capability extension).

**Tier 4 — pi-loom finding-authoring work:**

7. **Eight new W3 Tier E reshapes** (T03a, T05, T06, T07, T09,
   T10, T11a, T15b) + four carry-over W2 reshapes (T13, T16b,
   T18a, new PIC L213 entry). Re-evaluate the list after recs L
   + P + X ship — some of these will be cured pre-dispatch by
   audit-side detection.

**Tier 5 — validation closure:**

8. **Re-dispatch T14 / T16a / T12 with rec X + rec L + rec P**
   to confirm no regressions from the new audit-side
   integrations on the canaries those recs already cure.
9. **Re-dispatch T19 cluster after rec X + heading
   restoration.** Doubles as rec V's `(f-stop-2)` heaviest-
   canary validation (the boundary violation the W2 forensic
   named must be refused by the guard).
10. **Re-dispatch T22a1** if reshape work surfaces a re-author
    opportunity. Additional `(f-stop-2)` evidence for rec V's
    cross-finding cases (the W2 const-#1 externally-owned-
    literal case remains exposed under rec V; rec L's binding-
    surface ratification covers it post-Tier 2).

**Tier 6 — optional / redundant:**

11. **Rec Y** (pi-config) — only ship if rec X's git-history
    search has a measurable false-negative rate after
    deployment. Skip otherwise; redundant.

**Withdrawn (no W3 evidence supports them):**

- None. The W2 withdrawals (rec S fixer-emitted followup
  findings; rec U single-predicate constraint-narrowing
  license; rec N classifier-side stage-transition guard;
  rec Q SP-2 NOTES surfacing) remain withdrawn. W3 evidence
  does not re-open any of them — the recommendations they
  were superseded by (rec L, rec V, rec T, rec W) are doing
  the work.

**Single-line summary:** ship **rec X** (classifier git-history
recovery) + restore T19 cluster headings to close the
dominant W3 failure mode; ship **rec L + rec P** (promoted
from postponed) to close the now-first-order audit-side gap;
ship **rec Z + rec AA** for signal hygiene + the one
remaining fixer-capability gap; reshape eight W3 + four
carry-over Tier E findings.

## 7. What NOT to recommend

The W2 §7 list is reaffirmed in full. W3 evidence does not
re-open any of:

- **The fixer must not author findings.** Rec S and rec U
  (W2-withdrawn) remain inappropriate. No W3 case calls for
  fixer-side new-finding emission or unguarded constraint-
  narrowing.
- **The fixer must not widen edit surface beyond what the
  finding names.** T03a / T10 / T11a's fixers did widen edit
  surface in W3 — and the resulting residue is precisely what
  rec O's gate caught. The Category 1 attribution is correct
  on the *finding* (which under-specified its surface); the
  fixer's behaviour is at the edge of acceptable. Rec L's
  binding-surface audit closes this at the right layer.
- **The audit layer must not become a substitute for the
  finding-authoring layer.** Rec L, P (and the shipped M) move
  Category 1 detection earlier in the cycle. They do not
  author the reshape themselves.
- **Loosening any lens.** All W3 raised findings are real
  defects against the imagined or actual post-fix text. T05's
  recurring critique surface, T09's stage-3 naming cycles,
  T07's pinning-surface presupposition violations are all
  genuine. The audit lenses are doing correct work.
- **Reverting rec J / F / K / V / T / O / M / W.** Every
  shipped rec is either fully working as designed (V/T/M/W) or
  working with a known integration gap that the new rec X
  closes (K/O). No revert is warranted.
- **Raising the Rec O `k` multiplier from 3 to 5 or higher.**
  Tempting because it would let T19 cluster squeeze through at
  defaulted S=25 (Σ=150 / k=5 × 25 = 125, still breaches at
  k=5; passes at k≥7). But the gate's strictness is what
  surfaces the rec K metadata gap; weakening k weakens trust-
  override-suppression on genuinely-undersized origins. Rec X
  fixes the right defect. The T19 forensic's "What is NOT
  recommended" section is explicit on this.
- **Raising the 17-pass cap.** T09 burned 7 of 17 on stage-3
  prose-quality oscillation; T11a burned 3 of 17 (pre-emptive
  exit at pass 3). Cap is not the binding constraint.
- **Re-dispatching parked findings as-authored.** Every W3 park
  carries an explicit per-finding reshape recommendation. Re-
  dispatching without reshape reproduces the failure.
- **Re-dispatching the T19 cluster without restoring the
  headings to `docs/spec-review.md` (or shipping rec X).** The
  rec O gate fires deterministically on the mis-aggregated
  budget; no random component; re-running without a change is
  a no-op.

## 8. What this analysis adds over the W2 meta-analysis

The W2 meta-analysis made four load-bearing predictions
(rec V cure paths, rec V authoring-guard refusal modes, rec T
cure, rec M pre-dispatch detection) and three signal-hygiene
predictions (rec O routing, rec W CATEGORY tagging, rec K
cluster aggregation). W3 evidence confirms five of seven,
partially-validates one, and surfaces two previously-latent
gaps in another.

- **Confirmed.** Rec V cure paths (T14 + T16a); rec T (T12);
  rec M (T15a pre-dispatch); rec O mechanism (correctly fires
  on genuine over-budget cases); rec W field presence on every
  park.
- **Partially validated.** Rec V three-mode authoring guard
  was not exercised (rec O preempted on the T19 cluster
  heaviest canary; T14 was cured via approach-narrowing rather
  than guard-refused; no T20-shape findings dispatched).
  Re-validation deferred to a post-rec-X dispatch of the T19
  cluster.
- **Revised — W2's T14 attribution was wrong.** W2 §5.4
  attributed T14 as Category 1 malformed (Problem cited rule
  absent from owner page; reshape: retire or reframe). W3
  evidence shows rec V's approach-narrowing licensed the fixer
  to author a fourth premise clause (iv) citing existing
  `invocation.md` material — the cited rule was present in
  the corpus, just not at the page the original Problem
  pointed at. The fixer found the right citation under the
  expanded license. **Lesson:** under rec V, the Category 1
  attribution test for "Problem cited rule absent from owner
  page" should check the entire corpus for the cited rule, not
  just the named owner page, before concluding malformation.
  Rec L's worked examples (W2 §6.3) need this generalisation.
- **New — rec K integration gap.** W2 treated rec K as a Tier D
  bug fix that closed the cluster-aggregation defect. W3
  evidence shows the heading-present precondition rec K's
  lookup depends on is violated by two upstream workflows
  (Pattern I auto-reshape; human-driven baseline-snapshot
  strip). Rec X closes the gap.
- **New — rec W tagging-precision gap.** W2 treated rec W as a
  flat exit-code-to-CATEGORY mapping. W3 evidence shows the
  surface-expansion-irrecoverable exit is sometimes Category 1
  (bimodal / two-site / multi-axis findings — T05, T09) and
  sometimes Category 2 (genuine fixer cycle on a well-shaped
  finding). Rec Z closes the gap.
- **New — audit-side misses are now first-order.** W2 §6.8
  postponed rec L and rec P on the argument that "rec V's
  authoring guard absorbs rec L's T14-shape coverage in the
  interim." W3 evidence: the audit miss shape has moved beyond
  T14's Problem-cited-rule-absence. T03a / T07 are Problem-
  pinning-surface-presupposition and Problem-multi-axis
  defects; T15b is a multi-axis verbatim-duplication that the
  audit predicted PASS on. With rec V / T / M / W shipped, the
  fixer pipeline is saturated against in-loop signal; the
  audit layer is the bottleneck.
- **New — stage-3 prose-quality oscillation is a fixer-
  capability gap.** Rec T mode (e) covers stage-1→2 / 2→3
  structural-scaffolding additions but not stage-3 prose-token
  re-cycles. T09 burned 7 passes on this; T05 contributed a
  cycle component. Rec AA closes the gap.

The W2 §7 prohibitions remain in force. The §5.3 architectural
cut (fixer = mechanism, not author; rejection is Category 1 or
Category 2) is reaffirmed by W3 evidence — every W3 park slots
cleanly into one category, and the shipped recs all preserve
the boundary.

## Appendix — file and artifact references

W3 forensic reports (gitignored):

- `.pi/tmp/spec-fix-failure-forensics/2026-05-18T15-13-27_a2e488/`
  (Dispatch 1 — canary set):
  - `multi-t19a-extend-activeinvocationregistry-entry-shape-with-invocationid-t19b-ad.md`
    (875 lines, MULTI cluster, must-fix-blocked /
    score-budget-exhausted-trust-override-suppressed at
    pre-pass classifier exit; CATEGORY 1).
  - `t15a-reduce-session-model-orientation-paragraph-to-a-four-sentence-forward-linki.md`
    (538 lines, stale-precondition; CATEGORY 1).
  - `t15b-move-concurrency-semantics-into-extension-architecture-implementation-notes.md`
    (1 045 lines, must-fix-blocked /
    score-budget-exhausted-trust-override-suppressed at pass 1;
    CATEGORY 1).
- `.pi/tmp/spec-fix-failure-forensics/2026-05-18T20-36-39_b9045e/`
  (Dispatch 2 — newly-dispatched batch):
  - `t03a-add-loom-package-implementation-dependencies-v1-sub-paragraph-in-pic-host-p.md`
    (612 lines, must-fix-blocked / score-budget at pass 2;
    CATEGORY 1).
  - `t05-bind-frontmatter-vs-binder-binder-settings-diagnostics-prose-root-word-incon.md`
    (824 lines, surface-expansion-irrecoverable at pass 4;
    CATEGORY 2 [mis-tagged — root cause is Category 1
    two-site authoring]).
  - `t06-operator-role-tui-binding-asserted-in-glossary-but-never-reconciled-with-non.md`
    (740 lines, must-fix-blocked / score-budget at pass 3;
    CATEGORY 1).
  - `t07-queryerror-message-content-has-no-normativity-rule.md`
    (715 lines, must-fix-blocked / score-budget at pass 3;
    CATEGORY 1).
  - `t09-bind-context-session-overview-bullet-uses-tilde-approximate-caps-that-contra.md`
    (752 lines, surface-expansion-irrecoverable at pass 7;
    CATEGORY 2 [mis-tagged — root cause is Category 1
    bimodal approach]).
  - `t10-single-string-bypass-behaviour-on-whitespace-only-absent-slash-argument-is-u.md`
    (685 lines, must-fix-blocked / score-budget at pass 2;
    CATEGORY 1).
  - `t11a-replace-consumes-one-slot-prose-with-explicit-forced-respond-exemption-rule.md`
    (531 lines, must-fix-blocked / score-budget at pass 3;
    CATEGORY 1 [classifier `_blocked.md` self-flagged "likely
    category-1 reshape false-positive"]).

pi-config commits (git-pinned via global settings under
`git:github.com/bitmonk8/pi-config`, cloned to
`~/.pi/agent/git/github.com/bitmonk8/pi-config/`):

- `8f0ccfe` (2026-05-18) — rec V. SP-2 Solution constraints
  advisory + three-mode authoring guard. 1 240 insertions /
  130 deletions across 7 files.
- `b20536d` (2026-05-19) — recs T + O + M + W. 983 insertions /
  124 deletions across 6 files.
- `344da26` (2026-05-17, W2) — rec K. Reference; integration
  gap closed by rec X (proposed §6.4).
- `dd974d9` (2026-05-17, W2) — rec J. Reference; T14 cure path
  validation evidence in W3.
- `f10e3c1` (2026-05-17, W2) — rec F. Reference; MULTI cluster
  mode used by T19 dispatch.

pi-loom commits in the W3 timeline since the prior meta-
analysis (44b83c3), chronological:

- Validation infrastructure: `e12ccf9`, `8cf798a`, `49e746b`,
  `90968cf`, `f10156b`, `1d0de7a`, `9f06d15`.
- Dispatch 1 resolves: `0378193` (T12), `1db5858` (T16a),
  `457d491` (T14).
- Dispatch 1 parks: `611fbd1` (T15b), `490ef46` (T15a),
  `85a005c` (T19 cluster).
- Dispatch 2 resolves: `0ada98e` (T08c), `eb6fbb0` (T08b),
  `6a6d179` (T08a), `e9760a1` (T02).
- Dispatch 2 parks: `43a3612` (T11a +2 cascade), `beb1bb1`
  (T10), `5c4462c` (T09), `1f244c0` (T07), `730b5a2` (T06),
  `b8407cf` (T05), `baeb044` (T03a +5 cascade).

Live state references (HEAD):

- `docs/spec-review.md` — 0 finding H1s (only the file-title
  H1 `# Triaged Spec Review — spec.md` remains).
- `docs/spec-review-parked.md` — 26 H1s parked.

Pre-W3 forensic reports (gitignored, retained for context):

- `.pi/tmp/spec-fix-failure-forensics/2026-05-17T16-41-31_b4324e/`
  (W2 re-attempt, 8 reports — the input set for the prior
  meta-analysis).
- `.pi/tmp/spec-fix-failure-forensics/2026-05-16T17-52-36_347871/`
  (W1 re-attempt, 6 reports).
- Earlier 2026-05-15 forensic sets (pre-W1).

Prior W2 meta-analysis: `9f06d15:docs/spec-review-forensic-meta-analysis.md`
(the predecessor of this document; recoverable via `git show
9f06d15:docs/spec-review-forensic-meta-analysis.md`).

End of meta-analysis.
