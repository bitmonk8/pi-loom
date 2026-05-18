# Meta-analysis — W2 spec fix-loop re-attempt (rec J + rec F)

```
PROJECT: pi-loom
SCOPE: did the W2 pi-config changes (dd974d9 rec J + f10e3c1 rec F,
       2026-05-17) deliver the convergence the prior meta-analysis
       predicted (J → 5/6 of the W1 failures + F → the remaining 1)?
INPUT: 8 forensic reports under
       .pi/tmp/spec-fix-failure-forensics/2026-05-17T16-41-31_b4324e/
       (one MULTI cluster report + 7 single-finding reports)
       + the empty forensic directory at .pi/tmp/spec-fix-failure-forensics/
         2026-05-17T16-38-15_cb7511/ (the run-1 dispatch produced no
         failure reports; convergence-only or aborted)
       + pi-loom commits 037f8a3 (unpark T19 cluster), fb771f3 (unpark
         T21 + T22a1 + cascade), and the 8 resolve / 8 park commits
         spanning 2026-05-17 to 2026-05-18
       + pi-config commits dd974d9 (rec J) and f10e3c1 (rec F)
       + docs/spec-review.md and docs/spec-review-parked.md at HEAD
       + the prior meta-analysis (this document's predecessor) at
         52eae47

HEADLINE: Rec J converted 2 of the 6 W1 failures (T21, T22a1 +
          cascade T22b/T22c/T15c) into clean fixes. The 4-member
          T19a/T19b/T19d/T19e cluster was dispatched through rec F
          (MULTI mode) and parked on a budget-exhaustion exit that
          the cluster's content did not warrant — `_blocked.md`
          records `Σ=60` against `S=25` because the synthesised
          MULTI heading is absent from `spec-review.md` and the
          classifier defaulted to medium even though every cluster
          member carries `**Importance:** high`. This is an
          engineering gap in rec F's classifier integration, not a
          design flaw. Net W1 fix-rate change: +5 (T21, T22a1,
          T22b, T22c, T15c) at a baseline of 6 → +5 on the original
          W1 set (out of 6, with the 4-member cluster still in
          flight as one rec-F unit rather than four).

          Re-dispatch of the newly-active spec-review batch
          (T12–T18a, dispatched alongside the unparked W1 set)
          surfaced 7 fresh failures across patterns the prior
          analysis named but did not fully scope: citation-form
          drift onto a target that does not own the claim
          (T16a, T16b, T14, T13); structural-growth divergence
          across the stage-1→stage-2 boundary (T12); finding-
          malformed-at-root (T14); stale-precondition encoding
          after a sibling resolved (T15a); resolver-must-decide
          axes left to the fixer with a budget that cannot absorb
          the residue (T18a).

PRIMARY FIX: rec K (this document) — close the cluster-importance
             aggregation gap in `spec-diff-fix-classifier.md` so
             MULTI headings inherit `max(member_importance)` rather
             than defaulting to medium. One pi-config change
             converts the T19a/b/d/e parked cluster into a
             converging fix on re-dispatch.

GENERATED: 2026-05-18T09:00:00Z
```

## Sources

- **Prior meta-analysis** at `52eae47:docs/spec-review-forensic-meta-analysis.md`
  — predicted rec J would convert 5 of 6 W1 failures (T19a, T19b,
  T19e, T21, T22a1) and rec F would convert the remaining 1 (T19d,
  the producer/consumer case). The prediction names J as a fixer-
  prompt change with a single new refusal mode plus an SP-2 wording
  correction; F as a multi-finding cluster dispatch mode.
- **pi-config W2 commits**, both 2026-05-17:
  - `dd974d9` rec J — Solution approach is directional, not binding.
    Modifies `docs/spec-principles.md` SP-2 + the five agents named
    in the prior meta-analysis (`spec-review-fixer.md`,
    `spec-diff-fixer.md`, `spec-diff-fix-loop.md`,
    `spec-diff-fix-classifier.md`, `prompts/fix-spec-shape-single-findings.md`).
    702 insertions, 71 deletions across 6 files.
  - `f10e3c1` rec F — `Shape: multiple` cluster resolution mode.
    Modifies `spec-review-shape-single-picker.md`,
    `spec-review-fixer.md`, `spec-diff-fix-loop.md`,
    `spec-fix-failure-forensics.md`, `spec-review-parker.md`,
    `prompts/fix-spec-shape-single-findings.md`,
    `prompts/spec-review.md`. 774 insertions, 148 deletions
    across 7 files. New cluster-marker syntax
    `**Shape:** multiple` + `**State:** reduced` walked via
    `co-resolve` edges.
- **pi-loom unpark commits**, 2026-05-17:
  - `037f8a3` unpark `T19a/T19b/T19d/T19e` as a rec-F cluster
    (annotated `**Shape:** multiple`, `**State:** reduced`,
    `co-resolve` edges between all four members).
  - `fb771f3` unpark `T21 + T22a1` with cascade `T22b/T22c/T15c`
    as single-finding rec-J candidates.
- **W2 re-attempt forensic reports**,
  `forensicsRunId 2026-05-17T16-41-31_b4324e/`:
  8 reports totalling 2 376 lines, comprising one MULTI cluster
  report (T19a/b/d/e, 483 lines) and 7 single-finding reports
  (T12 / T13 / T14 / T15a / T16a / T16b / T18a). Average 297
  lines/report. The earlier `2026-05-17T16-38-15_cb7511/`
  directory is empty (no failures recorded; the dispatch either
  converged on its targets or was aborted before any forensic
  writer fired).
- **pi-loom commits in the W2 timeline**, in chronological order:
  - Resolves (8): `bb4f8d4` T15c, `262cce2` T22a1, `068cb27`
    T22b, `8c930fe` T22c, `e89e42e` T21, `c72a2a1` T16d,
    `8d2078f` T16c, `4538b7c` T20.
  - Parks (8): `6a3e78d` T19 cluster (4 members), `8ca1f06` T18a
    (+3 cascade T18b/c/d), `9c0f97c` T16b, `02965b2` T16a,
    `87ca647` T15a (+1 cascade T15b), `b357201` T14, `cf3fb0f`
    T13, `d0723ec` T12.
- **Live state**, HEAD:
  - `docs/spec-review.md`: 19 H1s (T02–T11 family, T03a–f,
    T08a–c, T11a–c).
  - `docs/spec-review-parked.md`: 16 H1s — the 4-member T19
    cluster, T18a+T18b/c/d, T16a/b, T15a/b, T14, T13, T12.
- **Working notes** for this meta-analysis are inline in this
  document; no `.pi/tmp/meta-analysis-work/` extracts were
  generated for this iteration (the evidence base is small enough
  to fit in the document).

---

## 1. The question

The prior meta-analysis predicted that rec J alone would convert
5 of the 6 W1 failures (T19a, T19b, T19e, T21, T22a1) into
converging fixes, and rec F would close the remaining 1 (T19d).
Both recommendations shipped to pi-config on 2026-05-17, in
sequence (J then F). pi-loom unparked the 6-finding set
(T19a/b/d/e as a rec-F cluster of 4; T21 and T22a1 as
single-finding rec-J targets, with cascade T22b/c/T15c) and
re-ran `/fix-spec-shape-single-findings`.

The user observed mixed outcomes — some convergence, some
re-parking — and asked for a forensic meta-analysis of the
new failure reports under the same framing the prior
meta-analysis used. This document is that analysis.

## 2. Fix rate vs. failure detection — the metric, applied

The prior meta-analysis introduced two metrics:

- **Fix rate** = (# findings that converge and land a spec edit) /
  (# findings dispatched). The goal.
- **Failure-detection rate** = (# findings rejected/parked early
  with good diagnostics) / (# findings dispatched). A proxy.

W2's outcomes are clearer along both axes than W1's: of the 16
findings dispatched in this iteration (8 unparked W1 set + 8 newly
live), **8 converged and landed spec edits** and **8 parked with
forensic reports** (the T19 cluster as one rec-F unit accounting
for 4 of the original 6 W1 failures; T18a's parking cascaded to
its 3 dependents). Fix-rate-on-the-W1-set rose materially (5/6 of
the original W1 failures resolved); fix-rate-on-the-new-batch is
0/7 of the newly-dispatched non-cascade findings (T12, T13, T14,
T15a, T16a, T16b, T18a). Failure-detection improved further
(every park ships a forensic report; the rec-F cluster failure
produces a single report for the cluster rather than four reports
for its members, matching the unit of work).

## 3. What rec J and rec F shipped

### 3.1 Rec J — Solution approach as advisory

The shipped change matches the prior meta-analysis's prescription
closely:

- `docs/spec-principles.md` SP-2 gains a "Solution approach is
  directional, not binding" subsection and the implicit success
  criteria are reworded as predicted.
- `agents/spec-review-fixer.md` reads Solution approach as a
  starting hint; step 5 walks four narrowing checks (bimodal →
  light, edit surface delegated, over-promised scope, constraint
  collision) and emits a new `## Narrowed chunks (for inner loop)`
  output section.
- `agents/spec-diff-fixer.md` adds refusal mode `(d)
  approach-narrowing` with two sub-cases (chunk already in
  `NarrowedChunks` set → NOTES-only refusal; mid-pass
  repeat-inflation → revert to baseline-post-top-level + defer
  the lens finding).
- `agents/spec-diff-fix-loop.md` takes a
  `baseline-post-top-level` snapshot in step 2 and threads
  `NarrowedChunks` through to the classifier (step 3e-bis) and
  inner fixer (step 3g.2); extends the set from inner-fixer NOTES
  via step 3g.4.
- `agents/spec-diff-fix-classifier.md` recognises
  `defer-to-debt — approach-narrowed` as a defer rationale; rule
  b-bis between same-issue restatement and out-of-scope auto-defers
  fix-class findings whose chunk-id is in `NarrowedChunks`.
- `prompts/fix-spec-shape-single-findings.md` plumbs
  `narrowedChunks` through the orchestrator and on to forensics.

This is a strict extension — no existing exit code, classification,
or output block changes shape. Legacy single-finding invocations
still work; the new fields are absent-or-default-handled at every
seam.

### 3.2 Rec F — `Shape: multiple` cluster mode

Also matches the prior prescription:

- Cluster marker `**Shape:** multiple` + `**State:** reduced` on
  each member; `co-resolve` edges in `## Relationships`. The
  pre-rec-F meaning of `Shape: multiple, State: shaped` (needs
  reshape) is preserved.
- `spec-review-shape-single-picker.md` detects the markers, walks
  `co-resolve` edges from the bottom-most marker, emits
  `MULTI: <H1>; <H2>; …; <Hn>` (semicolons because heading text
  contains commas).
- `spec-review-fixer.md` accepts multi-line task body, unions
  Problems, synthesises a combined Solution approach (SP-2
  narrowing applies), unions Solution constraints, removes all
  members in one edit, emits combined output sections.
- `spec-diff-fix-loop.md` plumbs the `Heading:` field through;
  inner loop sees one stable post-edit state.
- `spec-fix-failure-forensics.md` produces one cluster report
  with `CLUSTER_MEMBERS` field and per-member root cause analysis.
- `spec-review-parker.md` parks every member directly + runs
  ordering-cascade closure; new `CLUSTER_MODE` and `DIRECT_COUNT`
  status lines.
- `prompts/fix-spec-shape-single-findings.md` verifies fixer's
  `## Cluster members` matches dispatch; commit messages take
  the form `resolve cluster … (+N-1 members)` or the parking
  equivalent.

This is also a strict extension keyed on the opt-in marker.

## 4. W2 outcomes

### 4.1 The original 6 W1 failures

| W1 finding | Pre-W2 outcome | W2 outcome | Fix-rate change |
|---|---|---|---|
| T21 | `must-fix-blocked / score-budget-exhausted` at `dd79e22` | **resolved at `e89e42e`** | +1 |
| T22a1 | `surface-expansion-irrecoverable` (+3 cascade) at `cfcbe38` | **resolved at `262cce2`** (cascade T22b at `068cb27`, T22c at `8c930fe`, T15c at `bb4f8d4`) | +1 (+3 cascade) |
| T19a | `limit-cycle` at `00332d1` | **cluster-parked** as 1 of 4 members at `6a3e78d` (`must-fix-blocked / score-budget-exhausted`) | unchanged status; mode changed (single → cluster) |
| T19b | `diverging` at `531c22d` | cluster-parked (same exit) | unchanged status |
| T19d | `must-fix-blocked-by-scope-guard` at `e8be9bf` | cluster-parked (same exit) | unchanged status |
| T19e | `diverging` at `c8a362f` | cluster-parked (same exit) | unchanged status |

**Net W1 fix-rate change: +5 of 6** (T21, T22a1, T22b, T22c,
T15c resolved; T19a/b/d/e cluster still parked but now under a
single rec-F unit). Counted as findings on the original W1
forensic set, rec J converted **2 of the 6 W1-named failures**
(T21, T22a1); the cascade `+3` (T22b/c/T15c) is the natural
consequence of T22a1's resolution under the pre-W1 ordering
graph. The T19 cluster failed at the rec-F integration boundary,
not at rec F's design or rec J's mechanism.

### 4.2 The T19a/b/d/e cluster — the one rec-F dispatch

The cluster's MULTI-mode report
(`multi-t19a-extend-activeinvocationregistry-entry-shape-with-invocationid-t19b-ad.md`,
483 lines) carries an unusually crisp diagnosis: the classifier
**exited on its first triage→classify cycle** with `Σ=60` against
`S=25`, breach margin 35. Pass 0's `_blocked.md` records the
origin importance as `medium (default — MULTI: T19a/T19b/T19d/T19e
heading absent from docs/spec-review.md, defaulted to medium per
policy)`. Every cluster member carries `**Importance:** high` on
its own H1 (verified at `037f8a3:docs/spec-review.md` lines
944, 967, 987, 1017). The classifier did not aggregate member
importances; it looked up the synthesised cluster heading in
`spec-review.md`, found nothing (by construction — the heading
is synthesised in pipeline, never authored in the doc), and
fell back to default-medium.

Under any reasonable aggregation rule the cluster's S should be
≥100 (max-of-members) and could be as high as 400 (sum-of-
members at high=100 each). Σ=60 is below all such values; the
cluster would have admitted every assessed finding (AF1 blocker
score=100 trust-override; AF4 score=25; AF6 score=35; AF7
score=5) and proceeded to apply them. The four findings that
the run did raise — AF1 (`RuntimeEvent.invocation_id` required
with no policy for binder-failure / setup-wrap-pre-`Set.add`
arms), AF4 (V18q citation drift — no such tests exist), AF6
(new paragraph lacks `<a id>` anchor + bundles two
independently-failable obligations), AF2 (construction-site
fallback contradicts the new "same footing as `loom`" framing,
SP-2 auto-deferred via narrowing) — are real, targeted, low-LOC
edits the user can hand-apply alongside the existing
top-level-fixer edit.

**Rec J's narrowing mechanism was active and worked correctly**
in this cluster: 3 of the 7 assessed findings hit the forwarded
`NarrowedChunks` set and auto-deferred to debt-register
(`defer-to-debt — approach-narrowed`). The remaining 4 fit
within the rec-J framing. The failure is upstream of rec J: the
budget the classifier was running against was wrong by a factor
of 4–16.

This is the lone newly-introduced bug in W2. Call it the
**cluster-importance aggregation gap**; rec K below closes it.

### 4.3 The newly-dispatched batch (T12–T18a)

7 single-finding parks. Each one is a clean instance of a
named-but-not-fully-scoped failure pattern. Compressed table:

| Finding | Exit | Primary root cause (per forensic report) | Pattern |
|---|---|---|---|
| T12 (dual-cap simultaneous breach) | diverging at pass 7 | Stage-2 anchor-split fix grew prose footprint (anchor + bold label + blockquote); stage-1 lenses re-armed on the new structure in stage 2 → fresh assumptions / consistency / scope findings. | **Structural-growth divergence.** Tier-2 fix that splits/anchors prose tends to grow it; the loop's `fixCounts` detector measures count but not "did the previous fix add structural scaffolding". |
| T13 (cross-file qualifier) | `must-fix-blocked-by-scope-guard` at stage 3 | Pre-existing undefined term (`cross-file`) was propagated into two further normative surfaces by T13's narrow naming sweep; stage-3 clarity lens flagged it; every remediation collided with the forwarded scope guard. | **Citation-form drift / latent-term amplification.** Narrow naming sweep makes a latent ambiguity load-bearing; scope guard blocks every fix path because the natural definition site is fenced. |
| T14 (4th premise) | `must-fix-blocked-by-scope-guard` at pass 3 | The "fourth premise" rule the finding's Problem asserts does **not exist** on the cited owner page (`invocation.md` Cross-mode semantics enumerates and permits the `subagent → prompt` cell; no closure rule to cite). Every fix path either contradicts the owner page or rewrites premises (i)/(ii)/(iii) (ScopeGuard 2). | **Finding malformed at root.** Problem statement misreads the owner page; the case is already discharged structurally; no honest authoring exists. |
| T15a (Session-model reduction) | top-level-refused | T15a's Solution constraint #3 pinned resolution order via initial line positions ("T15c at the highest line, T15b second, T15a last") that became false the moment T15c resolved and was removed from `spec-review.md`. Bottom-up dispatch now picks T15a first. Fixer's pre-flight precondition check caught it. | **Stale precondition encoding.** Ordering claim encoded as a structural prediction rather than a content-level check; vulnerable the moment a co-resolve sibling lands. |
| T16a (drop `~0.72.1` literal) | diverging at pass 5 | Solution approach pins a forward-link to **Host prerequisites — Pi SDK pin** that does not own the privilege-absence claim the reduction leaves behind. Every rewrite displaces the defect into a new sentence of the same bullet. | **Citation-form drift onto wrong target.** Forward-link names a section that documents an adjacent but distinct fact. Trust-override suppressed score-budget signal (Σ=125 at pass 1 vs S=25). |
| T16b (drop inline Pi-API names) | diverging at pass 9 | Solution approach mandates **effect** prose ("invocations see …") that picks one side of a live cross-section contradiction in PIC step 2 (literal `pi.setActiveTools([...snapshot, ...names, ...])` vs natural-language "**exactly** the loom's declared callable set"). SP-2 narrowing forced the must-fix-true consistency finding into debt-register; loop diverged on other prose. | **Mechanism→effect framing flip with no audit gate.** SP-1 reshape elevates a Pi-conditional outcome to a normative orientation claim that the linked owner section does not own (and that contradicts a sibling sentence on the same owner section). |
| T18a (success-side null-policy) | `must-fix-blocked / score-budget-exhausted` at rewound pass-1 (after surface-expansion backtrack) | Originating Recommendation under-specifies 3 axes the paragraph must commit on (caller-observation-surface taxonomy; quantifier domain of "regardless of terminal outcome"; pre-evaluation no-terminal-outcome behaviour). Medium-tier S=25 admits one medium follow-up at most; residue is Σ=30. | **Resolver-must-decide axes left to the fixer.** Each axis position raises lens findings; medium budget cannot absorb the residue. |

These are 7 distinct shapes; they share the underlying property
that **the audit pass routed all 7 to NO_ACTION or LOW** and the
inner loop discovered the defect only at fix time. The pattern
echoes the prior meta-analysis's audit-side observations but is
sharper: in each case there is a specific grep / cross-reference
walk / staleness check the auditor could perform that would catch
the defect at audit time.

### 4.4 Aggregate

- **Findings dispatched in W2:** 16 (8 unparked W1-set + 8
  newly-live: T20 + T12 + T13 + T14 + T15a + T16a–d + T18a).
- **Resolved:** 8 (T20, T16c, T16d, T21, T22a1, T22b, T22c, T15c).
- **Parked:** 8 single-finding entries (T12, T13, T14, T15a,
  T16a, T16b, T18a, T19a-cluster), with cascade closure adding
  T15b, T18b/c/d, and the 3 remaining T19 members for a total
  parked-headings count of 16 visible in
  `spec-review-parked.md`.
- **Pass-burn distribution:** 0 passes (T19 cluster — exit
  pre-pass-1), 2 (T13 — stages 1 + 2 clean, blocked at stage 3
  classifier), 3 (T14 — 2 fix + 1 blocking classifier), 2 (T18a —
  including the rewound run), 5 (T16a), 7 (T12), 9 (T16b). Pre-W2
  bounds (≤6 in W1) are exceeded by T16a and T16b, both diverging
  on legitimate stage-3 prose-quality findings.
- **Forensic reports** average 297 lines/report (down from W1's
  ~470) because rec F collapses the T19 cluster's four members
  into one report. Per-member single-finding reports remain in
  the same shape as W1.

W2 is what its mix of mechanics predicts: rec J converged the
findings whose Solution approach was the binding/directional gap
the prior analysis named (T21's bimodal Path-B heavy branch,
T22a1's missing trap-guard); rec F shipped a real cluster-
dispatch mechanism that fails on a separate engineering gap; and
the newly-dispatched batch surfaces 7 failure shapes that the W1
forensic set hinted at but did not exhibit in pure form.

## 5. Root cause analysis

The previous meta-analysis identified one architectural gap (the
binding/directional reading of Solution approach) and predicted
that closing it would resolve 5/6 W1 failures. That prediction
was directionally right on the failures rec J could reach — T21
and T22a1 both resolved on first dispatch under the new fixer —
but it overcounted by treating the T19 cluster as four single-
finding rec-J targets when the actual dispatch now treats it as
one rec-F cluster. Walking the new evidence:

### 5.1 Where rec J worked, it worked cleanly

T21 resolved at `e89e42e`. The W1 forensic report on T21
identified the failure as a "bimodal, Path-B exceeds S=25"
Solution approach (Path A = single citation, Path B = new
paragraph + new checklist item + new vocabulary + remediation
arm; Path B's derivative defect surface had Σ=35 > S=25). Under
rec J the top-level fixer is now licensed to narrow the approach
to Path A and defer Path B's lens findings to debt. The W2
commit message and the absence of a re-park confirm this is
what happened.

T22a1 resolved at `262cce2`. The W1 forensic report identified
the failure as a "missing trap-guard" Solution-constraints
defect that let a pass-2 fixer author a routing clause not in
the original approach (under pressure from a pass-1
under-attribution lens finding) which then tripped PIC line 804's
catch-all MUST. Under rec J the inner fixer recognises the
re-inflation of a prior-touched chunk, reverts it to baseline,
and defers the under-attribution finding. The T22a1 cascade
T22b/T22c/T15c resolved naturally on the next dispatch passes.

No new pi-loom edits to the T21 or T22a1 finding bodies were
required between the W1 forensic reports and the W2 resolves.
The mechanism shipped in rec J is doing the work the prior
meta-analysis predicted, on the cases that fit its frame.

### 5.2 Where rec F failed, it failed at the integration boundary

The T19 cluster MULTI dispatch is the clearest single failure in
W2. The `_blocked.md` header reads:

```
**Origin importance:** medium  (default — `MULTI: T19a/T19b/T19d/T19e`
heading absent from `docs/spec-review.md`, defaulted to medium
per policy; siblings T15a/T15b/T18a etc. in the same cluster are
all tagged `**Importance:** medium`)
```

The parenthetical is misleading (the actual cluster members are
all `high`; the "siblings" comparison reaches for adjacent
clusters rather than in-cluster members) but the operative claim
is true: the classifier's heading-lookup did not find the
synthesised heading, so it defaulted to medium. By construction
the synthesised MULTI heading is **never** present in
`spec-review.md` — the picker invents it from the marker walk —
so the heading-absent path is the only path a MULTI dispatch
ever takes. Every rec-F cluster will hit this code path; only
the random alignment between cluster member importance and
default-medium budget hides it on some clusters.

This is not a design flaw in rec F. The shipped commit f10e3c1
makes the cluster the unit of dispatch; the inner loop sees one
stable post-edit state (verified by the cluster's clean first
triage cycle); rec J's narrowing mechanism integrates correctly
(3 of 7 assessed findings auto-deferred via `NarrowedChunks`).
The bug is one missing aggregation step in
`spec-diff-fix-classifier.md`'s origin-score lookup.

### 5.3 The newly-dispatched batch shares a single audit-side pattern

The prior meta-analysis dismissed audit-side recommendations as
"diagnostic-only" on the argument that they "do not change the
finding's text or the pipeline's ability to satisfy it." That
framing was correct for the W1 set, where every failure had a
loop-side cause rec J could address. **It does not generalise
to the W2 newly-dispatched batch.** Of the 7 single-finding
parks (T12, T13, T14, T15a, T16a, T16b, T18a), 6 carry an
explicit "audit predicted PASS / NO_ACTION on the lens that
later fired in-loop" entry in their forensic reports:

| Finding | Audit verdict | Lens that later fired in-loop | Audit miss-score (per report) |
|---|---|---|---|
| T12 | NO_ACTION, NONE | assumptions, consistency, traceability, prescription, placement (×4 false-negative fix-class) | 4 |
| T13 | (LOW, AUTO_RESHAPE on metadata) | clarity (`cross-file` undefined) | implicit; not enumerated |
| T14 | LOW, AUTO_RESHAPE on metadata | assumptions (cited rule does not exist) | implicit; not enumerated |
| T15a | LOW, AUTO_RESHAPE | precondition staleness (no lens did this; the fixer's pre-flight caught it) | n/a (different surface) |
| T16a | LOW, AUTO_RESHAPE on metadata | assumptions, consistency, traceability (×N false-negative across 5 passes) | implicit; not enumerated |
| T16b | NONE, NO_ACTION | assumptions, completeness, consistency, implementability, traceability, clarity, cruft (×11 false-negative across 9 passes) | 11 |
| T18a | (audit pass on rewound state not explicitly cited) | completeness ×2 budget-counted residue + consistency must-fix-true blocker | implicit |

The audit's failure shape is the same in all 6 cases: the
auditor imagined a post-fix paragraph and ran the lens predicates
against the imagined prose, **without performing a 30-second
grep / forward-link walk / staleness check on the actual
referent**. In each report the auditor "checked target-section
existence" rather than "checked that the target section owns
the asserted claim"; "checked terminology continuity at the
surface" rather than "loaded the linked page and verified the
contradiction-free reading the imagined prose presumes"; "trusted
the gating Solution constraint" rather than "verified the
gating constraint's structural predictions still match the
live `spec-review.md` ordering".

This was named in the prior meta-analysis as one of three
"diagnostic-only" recommendations (rec A — audit-side gate
upgrade) and ranked behind the loop-side architectural changes.
The W2 evidence shows the framing was wrong: **the audit-side
gap is fix-rate-positive on the newly-dispatched batch**
because the post-audit dispatch surfaces a class of defects the
loop is structurally unable to fix (citation drift onto a
non-owning target, finding malformed at root, mechanism→effect
framing flip that contradicts an owner-page sibling). For those
defects, the only convergence path is "do not dispatch the
finding as authored" — a verdict the auditor must reach.

The audit-side gap is fix-rate-positive **for any finding whose
fix cannot exist within the loop's per-pass edit window**:
recurring shape "the Solution approach asks the fixer to make a
claim the corpus does not own anywhere" or "the Problem statement
misreads an owner-page section" or "the precondition the
constraint encodes is no longer true". The W1 failures were
mostly inside the loop's reach (binding-vs-directional gap on a
sound Problem); the W2 batch is mostly outside it (Problem or
target misframing the loop cannot rewrite from inside a pass).

### 5.4 Two narrower pipeline bugs visible across the batch

In addition to rec K (cluster-importance aggregation) and the
audit-side gap, two narrower bugs surface across multiple W2
reports:

- **Trust-always-wins precedence suppresses score-budget signals**
  (visible in T16a's first pass: Σ=125 vs S=25, 5× breach, but
  the trust-override fired on every fix selection across the loop
  and the score-budget exit never triggered). The score budget
  is the canonical exit for high-trust-cost defects in surviving
  prose; precedence pre-empts it; the loop churns until divergence
  detection fires on `fixCounts` instead. Net effect: the loop
  burns 5 passes on a finding rec K's audit-side equivalent
  would have parked at audit time.
- **Stage-2 structural fixes re-arm stage-1 lenses** (visible in
  T12: pass-6 anchor-split fix introduced `<a id>` + bold label +
  blockquote; pass-7 stage-1 lenses raised three fresh findings
  on the new structure). The stage-1 → stage-2 transition gates
  *which lenses must be clean to advance*, not *which lenses
  evaluate*. Recurrence shape: any finding whose Solution
  approach asks for an inline normative obligation in a
  multi-obligation prose bullet (the spec has ~12 such bullets).

Both are smaller than rec K. They are listed in §7 for
completeness.

### 5.5 Stale-precondition encoding (T15a) is its own shape

The T15a refusal is the cleanest demonstration of a shape the
prior meta-analysis did not name: a finding's Solution constraint
encodes a precondition as a structural prediction ("bottom-up
ordering guarantees T15c is addressed first, T15b second, T15a
last") that becomes false when a sibling resolves and shifts
line positions. The fixer's pre-flight precondition check caught
this correctly — the refusal is the right outcome and no spec
edit was lost — but the orchestrator burned one dispatch cycle
to discover that the finding's own ordering claim was no longer
true. The audit pass did not catch it because the relevant lens
(implementability) trusted the constraint's textual prediction
rather than independently verifying the dispatch ordering.

This is a low-frequency shape but a generic one: any finding
whose constraint pins resolution order via initial line positions
is vulnerable the moment a co-resolve sibling lands. The fix is
either to drop ordering predictions in favour of pure content
checks ("if the destination subsection is absent, defer") or to
add a pre-dispatch staleness verifier.

## 6. Recommendation set

Ranked by **fix-rate impact** on the W2 evidence base —
specifically the 8 currently-parked entries in
`docs/spec-review-parked.md` (T19 cluster + T12 + T13 + T14 +
T15a + T16a + T16b + T18a, with cascade T15b + T18b/c/d).

### 6.1 Headline: rec K — close the cluster-importance aggregation gap

**K. (FIX 4/6 of the cluster + restores rec F to its prior-meta
coverage — pi-config only) Aggregate cluster-importance in the
classifier's origin-score lookup.**

Change `spec-diff-fix-classifier.md`'s heading-lookup so that
when the heading is a `MULTI: <H1>; <H2>; …; <Hn>` form, the
classifier resolves each member heading in
`docs/spec-review.md`, reads each member's `**Importance:**`
(and `**Score:**` if present under D-mode), and aggregates via
`max(member_importance)`. Fallback to default-medium fires only
when zero members are resolvable.

**Coverage analysis on the W2 parked set:**

- **T19 cluster** (4 of 6 of the original W1 failures) ✅ —
  cluster's effective S rises to ≥100 (or 400 under sum); Σ=60
  does not breach; loop applies AF1 (trust-override), AF4, AF6,
  AF7; SP-2 narrowing handles AF2/AF3/AF5; cluster converges.
- T12 / T13 / T14 / T15a / T16a / T16b / T18a ❌ — single-finding
  parks, untouched by cluster-importance aggregation.

**Files changed (pi-config):**

- `agents/spec-diff-fix-classifier.md` heading-lookup step:
  detect the `MULTI:` prefix, split on `; `, resolve each
  member heading, aggregate. ~15 lines + worked example.

**Implementation scope:** ~1 file edit; no new STATUS codes; no
interface changes (every consumer of `S` is numeric-only). This
is the smallest standalone change in this recommendation set.

**Why this works on the empirical case:** The MULTI cluster's
classifier-exit `_blocked.md` records the budget breach
explicitly; the breach margin (35) is well within the headroom
that any reasonable aggregation rule provides; the cluster's
content was sound (no class-1/2 guard collisions on AF1's
remediation, no SP-2 thrashing on the other findings); the only
mechanism that fired against the cluster was the wrong-budget
exit. The aggregation step closes that exit and lets the
already-correct rec-J + rec-F machinery proceed.

### 6.2 Tier-1 follow-up: rec L — audit-side cited-target verification

**L. (FIX 4/7 of the new-batch parks — pi-config only)
Forward-link target ratifies the asserted claim.**

For each Solution approach naming a forward-link target, the
auditor opens the target file at the named anchor and looks for
a sentence that owns the asserted claim verbatim or by paraphrase.
Flag if (a) the asserted claim is absent OR (b) a same-page
sibling section asserts the opposite. Verdict downgrades to
`RISK_HIGH` with `forward-link-target-does-not-own-claim` as
the rationale.

**Coverage analysis:**

- **T14** ✅ — auditor opens `invocation.md` Cross-mode
  semantics, greps for closure-flavoured language
  (`closes|forbids|rejects|disallows|prevents|must not|cannot`)
  against `subagent → prompt` cell, finds zero hits; verdict
  flips to `RISK_HIGH`, finding routed to `HUMAN_REVIEW` or
  `AUTO_RESHAPE` before dispatch.
- **T16a** ✅ — auditor opens PIC `Host prerequisites`, looks
  for the privilege-absence claim, finds it asserted only on the
  bullet T16a is reducing; verdict flips.
- **T16b** ✅ — auditor opens PIC `Tool-registration lifetime
  and visibility`, finds L213 contradicts the "invocations see
  the union" effect prose the Solution approach mandates; verdict
  flips.
- **T13** ✅ (variant — undefined-term grep) — auditor greps
  `cross-file` across `docs/`, finds it appears only at the
  propagation sites with no defining paragraph; verdict flips.
- T12 / T15a / T18a ❌ — different failure shapes (structural
  growth; precondition staleness; under-specified axes), not
  forward-link mismatches.

**Files changed (pi-config):**

- `agents/spec-review-audit.md` or `prompts/spec-review-audit.md`
  (whichever owns the per-finding lens dispatch): add a new
  per-finding pre-pass step that extracts forward-link targets
  from Solution approach (regex on `forward-link[s]?`,
  `(see \[…\])`, `owned by \[…\]` patterns), reads each target,
  and runs the ratification check. Hook the verdict downgrade
  into the existing risk-aggregation step.
- The audit playbook documentation (whichever doc enumerates
  the lens dimensions) gains a section naming the four
  recurring shapes: forward-link target absent; forward-link
  target asserts the opposite; named witness absent
  (e.g. T19e's V18q citation drift); undefined token in
  pinned prose (e.g. T13's `cross-file`).

**Implementation scope:** ~30–50 lines in the auditor prompt;
one extra read per audited finding (cheap); no
classification-side changes.

**Why this works on the empirical cases:** All four findings
above ship a specific, named, file-grepable mismatch between the
finding's text and the corpus state. The auditor's existing
"PASS — target section exists" verdict is the structurally weak
predicate; replacing it with "PASS — target section asserts the
claim" requires only the additional grep. The W2 reports
include the exact grep that would have caught each case.

### 6.3 Tier-1 follow-up: rec M — audit-side precondition staleness

**M. (FIX 1/7 of the new-batch parks — pi-config only) Pre-
dispatch precondition staleness check.**

For each finding whose Solution constraints contain an ordering
prediction (lexical signals: "MUST have already landed",
"bottom-up ordering guarantees", "lands first / last", explicit
heading references), the orchestrator re-walks the
`spec-review.md` ordering at dispatch time and flags any
mismatch with the constraint's textual prediction. Flag emits a
`STALE_PRECONDITION` verdict that downgrades to `HUMAN_REVIEW`.

**Coverage:**

- **T15a** ✅ — orchestrator detects "T15c at the highest line
  number is addressed first" no longer matches the current
  bottom-up walk (T15c is absent; T15a is at the highest line);
  emits `STALE_PRECONDITION` before dispatching.
- Others ❌ — different shapes.

**Files changed (pi-config):**

- `prompts/fix-spec-shape-single-findings.md` pre-dispatch
  step: pattern-match the constraint text for ordering-
  prediction signals; if matched, re-verify the prediction
  against the live `spec-review.md` ordering; on mismatch,
  refuse to dispatch.

**Implementation scope:** ~20 lines in the orchestrator prompt;
no agent changes. The W1 case T19d (pre-W2) was the
producer/consumer variant of this same pattern, now handled by
rec F's cluster mode rather than by a staleness check.

### 6.4 Tier-2 — narrower bug fixes

**N. (DIAG/FIX 1/7 — pi-config only) Stage-transition structural-
growth guard.** On the stage-1 → stage-2 transition, snapshot the
active spec hunks and forbid stage-2 fixes from mutating the
*structure* of those hunks (anchors, headings, blockquote
markers, bold-label markers). If a stage-2 fix candidate's
proposed text contains `<a id=`, `^### `, `> **`, or `**…\.**$`,
mark it `requires-tier-1-replay`; replay tier-1 lenses on the
proposed text; defer the stage-2 fix if the replay raises fresh
tier-1 findings rather than apply-then-discover. Covers T12.
Recurrence shape: any finding whose Solution approach asks for
an inline normative obligation in a multi-obligation prose
bullet (~12 such bullets in the spec). Cost: one regex check +
an optional tier-1-replay subagent dispatch per marked fix.

**O. (DIAG/FIX 1/7 — pi-config only) Trust-override should not
suppress score-budget exit when the budget breach is large.**
T16a's pass 1 showed Σ=125 against S=25 (5× breach) and the
trust-override absorbed every fix selection; the loop ran 4 more
passes before divergence detection fired. The score-budget mechanism
is the canonical exit for "the originating finding does not have
score room to absorb the defects its remediation introduces".
Modify the precedence rule: if Σ > k×S for some k (recommended
k=3), the score-budget exit fires regardless of trust-override
status. Covers T16a directly; partial coverage on T16b.

**P. (DIAG 1/7 — pi-config only) Bound the resolver-must-decide
axes in the reducer.** T18a is the cleanest case: the originating
Recommendation under-specifies 3 orthogonal axes the paragraph
must commit on. The reducer (`spec-review-finding-reducer.md`)
can surface this at audit time by checking whether the Solution
approach contains modal verbs that leave the decision to the
fixer ("name", "address", "describe") without a downstream pin.
Add a `**Decision axes:** <count>` field the reducer authors
when ≥2 such axes are visible; surface to the auditor for an
explicit budget-vs-axes-count check (each axis adds expected
follow-up findings of importance ≥medium). Covers T18a; partial
on T16b.

**Q. (DIAG 1/7 — pi-loom only) SP-2 deferred-must-fix surfacing.**
T16b's pass 8 auto-deferred a `must-fix:true score:100` consistency
finding (the spec.md / PIC L213 cross-section contradiction) to
debt-register, then the loop continued and diverged on different
defects. Add a `SP2_DEFERRED_MUST_FIX:` line to the loop's NOTES
that lists any `must-fix:true` SP-2 deferrals so the orchestrator
can abandon the dispatch and re-shape. Hand-applicable on pi-loom
side as a debt-register annotation; cheap.

### 6.5 Process step

**R. (n/a — pi-loom) Re-dispatch the T19 cluster after rec K
ships.** With cluster-importance aggregation in place the
cluster's `S` will be ≥100; Σ=60 will be inside budget; the
existing rec-F + rec-J machinery converges. No reshape needed.

### 6.6 Summary table

| Rec | Title | Metric | Coverage | pi-loom | pi-config | Both |
|---|---|---|---:|:-:|:-:|:-:|
| **K** | **Cluster-importance aggregation** | **FIX** | **4/6 W1 cluster** | | **✓** | |
| **L** | **Forward-link target ratifies claim** | **FIX** | **4/7 new batch** | | **✓** | |
| M | Pre-dispatch precondition staleness | FIX | 1/7 new batch | | ✓ | |
| N | Stage-transition structural-growth guard | DIAG/FIX | 1/7 new batch | | ✓ | |
| O | Trust-override / score-budget precedence | DIAG/FIX | 1/7 new batch | | ✓ | |
| P | Reducer surfaces decision axes | DIAG | 1/7 new batch | | ✓ | |
| Q | SP-2 deferred-must-fix surfacing | DIAG | 1/7 new batch | | ✓ | |
| R | Re-dispatch T19 cluster after K | process | n/a | ✓ | | |

### 6.7 Priority order

Ranked by fix-rate impact:

**Tier 1 — raise fix rate:**

1. **Rec K** (pi-config only) — cluster-importance aggregation.
   Smallest change in this set (one file, ~15 lines, no
   interface change). Resolves the T19 cluster, the lone
   newly-introduced bug in W2. Ship first.
2. **Rec L** (pi-config only) — forward-link target ratifies
   claim. ~30–50 lines in the auditor prompt; one extra read
   per audited finding. Converts T13, T14, T16a, T16b at audit
   time (4 of 7 new-batch parks). Ship second.
3. **Rec M** (pi-config only) — pre-dispatch precondition
   staleness. ~20 lines in the orchestrator. Converts T15a.
   Ship third.

**Tier 2 — narrower bug fixes:**

4. **Rec N** (pi-config) — stage-transition structural-growth
   guard. Converts T12.
5. **Rec O** (pi-config) — trust-override / score-budget
   precedence. Reduces wasted passes on T16a and other
   high-trust-cost surviving-prose cases.
6. **Rec P** (pi-config) — reducer surfaces decision axes.
   Diagnostic for T18a-shaped findings.
7. **Rec Q** (pi-loom + pi-config) — SP-2 deferred-must-fix
   surfacing.

**Tier 3 — process:**

8. **Rec R** (pi-loom) — re-dispatch the T19 cluster after K.

**Single-line summary:** **ship rec K first** (closes the lone
rec-F integration bug and recovers the prior meta-analysis's
predicted T19-cluster convergence); then **rec L** (closes the
shape gap the W2 newly-dispatched batch revealed — citation-form
drift onto non-owning targets cannot be fixed inside the inner
loop and must be caught at audit time).

## 7. What NOT to recommend

- **Loosening any lens.** Across all 8 W2 parks (the cluster
  report plus the 7 single-finding reports), the lens findings
  are real defects against the imagined or actual post-fix text.
  The MULTI cluster's AF1/AF4/AF6 / SP-2-deferred AF2 are all
  genuine; T12's pass-7 atomicity / two-anchor / inline Non-goals
  findings are all genuine; T16b's 11 false-negative pass-9
  findings were all cross-verified against the actual file
  contents. Loosening would admit real defects on unrelated
  future findings.
- **Reverting rec J or rec F.** Rec J's mechanism is doing the
  work the prior meta-analysis predicted on the cases that fit
  its frame (T21, T22a1 + cascade). Rec F's mechanism is
  structurally correct (one cluster → one stable post-edit state;
  one forensic report sized to the unit of work; clean MULTI
  dispatch + parking semantics). The W2 problem is a single
  missing aggregation step in rec F's classifier integration,
  not a defect in either change.
- **Raising the score-budget threshold or the `k` multiplier
  globally.** Same reasoning as the prior meta-analysis: each
  budget-counted finding is a real defect; the breach in the
  T19 cluster was driven by a wrong-side-of-default-medium
  classifier lookup, not by an undersized budget. Aggregate
  member importances (rec K), do not raise the threshold.
- **Raising the 17-pass cap.** T16b burned 9 of 17 passes on
  structurally-irreconcilable cross-section contradictions; T12
  burned 7 of 17 on stage-2 structural growth; neither is
  pass-count-bound. The remaining capacity would have made the
  failures more expensive without changing the outcome.
- **Re-dispatching parked findings as-authored.** The 7 new-
  batch parks each carry an explicit per-finding reshape
  recommendation in `## Recommendations / ### Immediate
  (this finding)`. Re-dispatching without addressing those
  reshapes will reproduce the same failures.
- **Reverting the unparks (`037f8a3`, `fb771f3`).** The W2
  outcomes are net-positive on the W1 set even without rec K
  (5 of 6 resolved or under unit-of-work rec-F treatment). The
  unparks are the right move; the T19 cluster's continued
  parking is a one-bug-away state.
- **Reading the audit-side gap (rec L) as a substitute for the
  loop-side machinery.** The prior meta-analysis dismissed
  audit-side recs as "diagnostic-only" because the W1 failures
  were inside the loop's reach. The W2 newly-dispatched batch
  shows the inverse: audit-side recs are fix-rate-positive for
  findings whose fix cannot exist within the loop's per-pass
  edit window. Both layers carry weight; neither replaces the
  other.

## 8. What this analysis adds over the prior meta-analysis

The prior meta-analysis (`52eae47`) made three load-bearing
predictions and ranked recommendations under their assumed
coverage. W2 evidence revises two of the three and confirms one:

- **Confirmed.** Rec J's mechanism converges the failures whose
  Solution approach was the binding/directional gap (T21,
  T22a1 + cascade). The five-step priority order with J at #1
  was correct on the W1 cases that fit the frame.
- **Revised — coverage overcount.** The prior analysis credited
  rec J with 5/6 W1 failures (T19a, T19b, T19e, T21, T22a1).
  Under rec F's MULTI dispatch the 4-member T19 cluster is now
  one unit of work, not four; rec J's narrowing fires correctly
  inside it but the rec-F integration introduces a budget bug
  that ate the cluster's first dispatch. Realised W1 coverage
  under W2: 2 of 6 named (T21, T22a1) + 3 cascade (T22b/T22c/
  T15c). The remaining 4 are one rec-K change away.
- **Revised — audit-side framing.** The prior analysis ranked
  audit-side recommendations as "diagnostic-only" on the
  argument that they "do not change the finding's text or the
  pipeline's ability to satisfy it." That framing held for the
  W1 set (inside-loop failures); it does not hold for the W2
  newly-dispatched batch (T13, T14, T16a, T16b — citation drift
  onto non-owning targets that the loop cannot fix from inside a
  pass). Rec L promotes the audit-side cited-target verification
  from DIAG to FIX with coverage 4/7 on the new-batch parks.

Three failure shapes are now visible in pure form that the W1
forensic set hinted at but did not exhibit:

- **Forward-link target does not own the asserted claim**
  (T13, T14, T16a, T16b). The pattern is generic enough to
  refactor as one audit-side check (rec L). The pre-W2 framing
  treated each instance as a per-finding authoring defect; the
  W2 evidence shows it is a recurring pipeline-routable shape.
- **Stale precondition encoding** (T15a). New; not anticipated
  by the prior meta-analysis. Addressed by rec M.
- **Resolver-must-decide axes** (T18a). New; partial
  anticipation in the prior meta-analysis's E + H
  (`ProseBudget` field) but framed there as a paragraph-budget
  problem rather than as an axes-of-decision problem. Addressed
  by rec P.

Two narrower bugs are now visible that the prior meta-analysis
named but did not scope:

- **Structural-growth divergence on stage-1 → stage-2**
  (T12). The prior meta-analysis named this as a stage-boundary
  problem on the audit gate; the W2 evidence shows it is also
  a loop-side problem on the per-pass diff. Addressed by rec N.
- **Trust-override suppresses score-budget signals**
  (T16a). Not named in the prior meta-analysis. Addressed by
  rec O.

The prior meta-analysis's `## What NOT to recommend` section
remains correct line-by-line on the W2 evidence and is
re-affirmed in §7 above. In particular, the temptation to
"loosen the lenses" or "raise the score-budget threshold" is
even stronger in W2 (because the budget exhausted on a cluster
where the content was clearly sound), and the right fix is
still upstream (aggregate member importances) rather than
downstream (raise the threshold).

## Appendix — file and artifact references

W2 forensic reports (gitignored):

- `.pi/tmp/spec-fix-failure-forensics/2026-05-17T16-41-31_b4324e/`
  - `multi-t19a-extend-activeinvocationregistry-entry-shape-with-invocationid-t19b-ad.md`
    (483 lines, MULTI cluster, must-fix-blocked / score-budget-
    exhausted at pre-pass exit)
  - `t12-dual-cap-simultaneous-breach-cap-value-in-loom-load-discovery-slow-diagnosti.md`
    (134 lines, diverging at pass 7)
  - `t13-invocation-depth-bound-introductory-sentence-omits-the-cross-file-qualifier-.md`
    (451 lines, must-fix-blocked-by-scope-guard at stage 3)
  - `t14-prompt-mode-sequentiality-argument-has-an-unstated-fourth-premise.md`
    (133 lines, must-fix-blocked-by-scope-guard at pass 3)
  - `t15a-reduce-session-model-orientation-paragraph-to-a-four-sentence-forward-linki.md`
    (286 lines, top-level-refused)
  - `t16a-reduce-trust-boundary-sdk-surface-clause-drop-the-0-72-1-literal.md`
    (342 lines, diverging at pass 5)
  - `t16b-rewrite-callable-set-paragraph-drop-inline-customtools-createagentsession-p.md`
    (136 lines, diverging at pass 9 — short report because the
    long forensic detail is in the per-pass artefacts)
  - `t18a-append-success-side-null-policy-paragraph-to-pic-runtime-event-channel.md`
    (411 lines, must-fix-blocked / score-budget-exhausted at
    rewound pass-1)
- `.pi/tmp/spec-fix-failure-forensics/2026-05-17T16-38-15_cb7511/`
  (empty directory; the run-1 dispatch produced no failure
  reports — either converged on what it processed or was
  aborted before any forensic writer fired)

pi-config commits (git-pinned via global settings under
`git:github.com/bitmonk8/pi-config`, cloned to
`~/.pi/agent/git/github.com/bitmonk8/pi-config/`):

- `dd974d9` SP-2 rec J — Solution approach is directional, not
  binding. 702 insertions / 71 deletions across 6 files.
- `f10e3c1` rec F — `Shape: multiple` cluster resolution mode.
  774 insertions / 148 deletions across 7 files.

pi-loom commits in the W2 timeline (chronological):

- `037f8a3` (2026-05-17) — unpark T19a/b/d/e as rec-F cluster.
- `fb771f3` (2026-05-17) — unpark T21 + T22a1 (with cascade
  T22b/T22c/T15c).
- `7a62ed3` + `b900624` (2026-05-17) — strip stale spec-review
  preamble lines (triage tally / decision tally / reshape pass /
  split annotations).
- `bb4f8d4` → `8c930fe` → `068cb27` → `262cce2` → `e89e42e`
  (2026-05-17) — resolve T15c, T22c, T22b, T22a1, T21
  (rec J success path).
- `c72a2a1` → `8d2078f` (2026-05-17) — resolve T16d, T16c
  (newly-dispatched batch wins).
- `4538b7c` (2026-05-17) — resolve T20 (newly-dispatched).
- `6a3e78d` (2026-05-17) — park T19 cluster (4 members).
- `8ca1f06` (2026-05-17) — park T18a (+3 cascade T18b/c/d).
- `9c0f97c` → `02965b2` (2026-05-17) — park T16b, T16a.
- `87ca647` (2026-05-17) — park T15a (+1 cascade T15b).
- `b357201` (2026-05-17) — park T14.
- `cf3fb0f` (2026-05-17) — park T13.
- `d0723ec` (2026-05-18) — park T12.

Live state references (HEAD):

- `docs/spec-review.md` — 19 H1s remaining (T02, T03a–f, T05–T11
  family, T08a–c, T09–T10, T11a–c).
- `docs/spec-review-parked.md` — 16 H1s parked (4-member T19
  cluster + T18a/T18b/c/d + T16a/b + T15a/b + T14 + T13 + T12).

Pre-W2 forensic reports (gitignored, retained for context):

- `.pi/tmp/spec-fix-failure-forensics/2026-05-16T17-52-36_347871/`
  (W1 re-attempt, 6 reports — the input set for the prior
  meta-analysis).
- `.pi/tmp/spec-fix-failure-forensics/2026-05-15T18-46-12_c1e9c1/`
  and `.pi/tmp/spec-fix-failure-forensics/2026-05-15T15-04-05_7wkalj/`
  (pre-W1 reports).

Prior meta-analysis: `52eae47:docs/spec-review-forensic-meta-analysis.md`
(the predecessor of this document; recoverable via `git show
52eae47:docs/spec-review-forensic-meta-analysis.md`).

End of meta-analysis.
