# Meta-analysis — W1 spec fix-loop re-attempt

```
PROJECT: pi-loom
SCOPE: did the W1 pi-config changes (a3136af → 2613f98, 2026-05-16) deliver
       the improvements predicted by the prior meta-analysis (3a15079,
       2026-05-16T08:00Z; deleted in a56ab5e)?
INPUT: 6 forensic reports under
       .pi/tmp/spec-fix-failure-forensics/2026-05-16T17-52-36_347871/
       + docs/spec-review-forensic-analysis.md (6 entries)
       + docs/spec-review-parked.md (9 currently-parked findings)
       + git log 2026-05-15..2026-05-17 on docs/spec-review*.md
       + pi-config commits a3136af, 0d7d9b6, e9d2307, a50f02f, 2613f98, f92cd3c
HEADLINE: W1 ships every architectural change the prior meta-analysis
          recommended (§A severity-weighted triage, §B class-3 sweep,
          §C1 staged lenses, §C2 backtracking) plus a new §D combined-
          score budget. Of 11 findings unparked in cc91b23/44f2c5e
          to re-test under W1: 1 converged (T19c), 2 remain queued
          (T20, T15b), and 9 re-terminated. New failure-mode taxonomy
          is more diagnostic; convergence rate did not improve.
ROOT CAUSE: every audit-gate recommendation from the prior
            meta-analysis (recs 1–3, rated 3/3 forensic coverage)
            was NOT implemented in W1. The pre-flight audit still
            returns LOW/NO_ACTION/AUTO_RESHAPE on findings the
            inner loop then takes 0–6 passes to fail; 5 of 6 W1
            re-attempts had audit verdicts that were 100% false
            negatives.
GENERATED: 2026-05-17T08:30:00Z
```

## Sources

- **Prior meta-analysis** (deleted in `a56ab5e`, recovered from `3a15079`):
  diagnosed 3 diverging cases (T22a1, T20, T19b) from
  `forensicsRunId 2026-05-15T18-46-12_c1e9c1`; surfaced 8 ranked pipeline
  recommendations + 4 architectural redesign proposals (A / B / C1 / C2,
  plus an audit-gate cluster).
- **pi-config W1 commits**, all 2026-05-16, in implementation order:
  `a3136af` Change A (severity-weighted triage); `0d7d9b6` Change B
  (drop class-3 authoring); `f92cd3c` W5 lens rubrics (5-tier
  importance per lens); `e9d2307` Change C1 (staged lens introduction);
  `a50f02f` Change D (combined-score budget); `2613f98` Change C2
  (backtracking on surface expansion).
- **W1 unpark commits**, `cc91b23` + `44f2c5e` (2026-05-16 19:48Z):
  unparked 11 findings (T22a1, T22b, T22c, T15c, T21, T20, T15b,
  T19a, T19b, T19c, T19d) from `spec-review-parked.md` back into
  `spec-review.md` for re-attempt under the W1 pipeline.
- **W1 re-attempt forensic reports**, `forensicsRunId 2026-05-16T17-52-36_347871`:
  6 reports (T19a / T19b / T19d / T19e / T21 / T22a1) totalling 2 824
  lines. T19c converged (commit `14c8a8c`); T20 / T15b have not yet
  been dispatched.
- **Working notes** for this meta-analysis under
  `.pi/tmp/meta-analysis-work/` (gitignored, retained for forensics):
  `01-forensic-summaries.md` (596 lines), `02-pi-config-changes.md`
  (648 lines), `03-current-pipeline-catalogue.md` (1 444 lines),
  `04-history-and-prior-meta.md` (891 lines).

---

## 1. The question

The user expected the W1 changes (Change A / B / C1 / D / C2 as shipped
to pi-config) to improve the convergence rate of
`/fix-spec-shape-single-findings`. The prior meta-analysis predicted
that A + B alone would handle "all 7 forensic-report failures at pass 1
or 2"; A + B + C1 + C2 would be a strict super-set of that.

The user re-ran the pipeline on 11 previously-parked findings. The
observed convergence rate did not improve. This document explains why.

## 2. Did W1 ship what the prior meta-analysis recommended?

**Yes for the loop-side, no for the audit-side.** The prior
meta-analysis's recommendations fall into two clusters:

### 2.1 Loop-side architectural redesigns — all shipped

| Prior rec | Status | W1 commit | Mechanism shipped |
|---|---|---|---|
| §A Severity-weighted triage at `spec-diff-fix-classifier` | shipped | `a3136af` | Three-clause rule: `severity(raised) > severity(origin)` → fix-MUST; `fix_risk == very-low` → fix-SHOULD; else → defer-to-debt. Escape: every viable remediation violates a class-1/class-2 guard → `STATUS: must-fix-blocked` (sub-rationale `must-fix-blocked-by-scope-guard`). |
| §B Drop class-3 solution constraints | shipped (commit-pair) | `dbc73e2` (sweep in pi-loom), `0d7d9b6` (agent-side enforcement in pi-config) | Three-class taxonomy: class 1 cross-reference ownership pins KEEP, class 2 project-policy pins KEEP, class 3 shape mandates DROP. Reducer no longer authors class 3; fixer extracts class-1/2 only; loop filters defence-in-depth; diff-fixer ignores class-3 if leaked. |
| §C1 Staged lens introduction | shipped | `e9d2307` | Three tiers (correctness / structural / prose-quality). Per-stage convergence (`fixCount == 0`) advances to next stage; stage 3 convergence → `STATUS: ok`. Stage-boundary passes excluded from divergence + surface-expansion detectors. Lenses declare `**Tier:** N` in front matter; loop reads first 20 lines. 17-pass cumulative cap preserved. |
| §C2 Backtracking on surface expansion | shipped | `2613f98` | Per-pass `refs/loom/snapshots/<runId>/pass-N` snapshots via `git stash create -u` + `git update-ref`. D-mode detector `scoreSum[N] > 1.5 × scoreSum[N-1]` (A-mode fallback on fixCounts). On fire: poison highest-file-overlap fix, `git reset --hard` + `git stash apply --index` restore, rewind counters. Two-strikes exit → `STATUS: surface-expansion-irrecoverable`. Snapshots retained on every failure for forensics; 24-hour reaper at loop startup. |
| (new in W1, not in prior rec) §D Combined-score budget | shipped | `a50f02f` + `f92cd3c` rubrics | Per-pass `Σ = sum(score(raised) for raised in non-blocker, non-cheap) ≤ S = score(origin)` → defer all; `Σ > S` → `STATUS: must-fix-blocked` (sub-rationale `score-budget-exhausted`). Anchor table: `blocker→95`, `high→100`, `medium→25`, `low→5`, `nit→1`. D-mode is preferred over A-mode wherever both findings are score-bearing. |

### 2.2 Audit-side recommendations — none shipped

The prior meta-analysis's first three ranked recommendations (rec 1, 2,
3, each rated **3/3 forensic coverage** — i.e. would have prevented
*all three* diverging cases at the audit gate before the inner loop ran)
were:

| Prior rec | Coverage | Status |
|---|---|---|
| Audit must grep `spec-review-parked.md` for every Relationships edge and every Solution-constraint identifier reference; flip `completeness`/`assumptions`/`scope`/`consistency` to `RISK_HIGH` when any named sibling is parked. | 3/3 | **NOT SHIPPED.** No grep against `spec-review-parked.md` exists in any current `/spec-review-audit` agent (`spec-review-finding-lens-auditor.md` / `spec-review-audit-applier.md` / `spec-review-auto-reshaper.md`). |
| Audit must perform cross-document set-equivalence checks when the finding's Solution approach restates a normative rule with a canonical owner elsewhere in the spec corpus. | 3/3 | **NOT SHIPPED.** The auditor still verifies anchor extantness only; no cross-page grep for resource/event/concept name → canonical owner. |
| `/fix-spec-shape-single-findings` dispatcher pre-flight that refuses any finding whose Solution constraints name a parked sibling OR whose ScopeGuard set is mathematically unsatisfiable; exit with `top-level-refused` and `parked-cluster-cascade` / `scope-guard-set-unsatisfiable`. | 3/3 | **NOT SHIPPED.** No dispatcher pre-flight grep against `spec-review-parked.md`. The inner loop catches the same impossibility one layer deeper as `must-fix-blocked-by-scope-guard` — burning a top-level dispatch instead of a free pre-flight. |
| Re-audit surviving cluster members after any parking event. | 1/3 | **NOT SHIPPED.** The orchestrator parks a finding and proceeds straight to the next picker call; no re-audit hook. |

Tactical recs 4 (structural-recommendation gate), 5 (prose-budget cap),
6 (ScopeGuard-blocked → loop-termination), 7 (cumulative-drift signal)
were absorbed by §A/§C2 per the prior meta-analysis's own "Subsumes"
notes — those did ship.

The audit-side gap is the headline finding of this meta-meta-analysis:
**the cheapest, highest-coverage recommendations from the prior round
were not implemented; the more expensive loop-side recommendations were.
The outcome is what that imbalance predicts.**

## 3. W1 outcomes vs prior outcomes

### 3.1 Per-finding before/after

| Finding | Pre-W1 outcome | W1 outcome | Same root cause? |
|---|---|---|---|
| T22a1 | `diverging` (+3 cascade) at commit `31eb888` (2026-05-15) | `surface-expansion-irrecoverable` (+3 cascade) at `cfcbe38` | YES. The class-3 sweep dropped the pre-existing class-3 guards; W1 then licensed two pass-2 rewordings that authored the same line-804-self-trip routing clause as pre-W1; C2 caught the first poisoning-and-re-expansion pattern and exited two strikes faster. Same R1+R2+R3 unsatisfiability, different exit code. |
| T20 | `diverging` (+1 cascade) at `ed51f5a` (2026-05-15) | not yet dispatched in this re-run | n/a (queued but not consumed before context limit) |
| T19b | `diverging` at `49c40f9` (2026-05-15) | `diverging` at `531c22d` | YES. C2 backtracked pass 3 correctly (poisoned 4 fixes after 362→181→381 = 2.10×), stage 1 converged at pass 3, stage 2 expanded to placement/scope/external-entities at pass 4, which raised cascade-twin + dedup-tuple findings whose only landing zone is T19c-owned (and T19c was parked). Pass 6 fixCount 4→5 → diverged again. Same scope-fenced relocation problem; W1's snapshot machinery did not change the structural impossibility. |
| T19a | `limit-cycle` at `ac18d94` (2026-05-15) | `limit-cycle` at `00332d1` | YES. C2 poisoning index keys on `<lens>:<NN>`; pass 4 re-emitted the same content (same target, same impact, substantively same proposed remediation) under a different NN slot (`:02` vs poisoned `:03`); poisoning did not match and the limit cycle fed on the resurrection. Same bimodal-Recommendation pathology (syntactic field-add + spec-coined generator MUSTs). |
| T19c | top-level-refused at `65c7ccd` (2026-05-15) | **resolved** at `14c8a8c` | NO — this is the one W1 convergence. T19c's edit footprint (dedup-key widening) is a single-paragraph normative addition with a stable landing zone; the loop converged cleanly under the new tier-1-only stage. The prior top-level-refused was a class-3 collision, removed by `dbc73e2`. |
| T19d | top-level-refused at `42a63d5` (2026-05-15) | `must-fix-blocked / must-fix-blocked-by-scope-guard` at `e8be9bf` | YES. The same producer-not-yet-landed problem: T19d reads `entry.invocationId` from a registry whose declaration still pins `{loomAbort, disposeBarrier, shutdownReason, loom}`. Pre-W1's top-level refusal was specific to "Solution constraints name parked sibling"; W1 removed the top-level refusal gate (because `cc91b23` unparked T19a, so the named sibling was no longer parked) and caught the same impossibility at classifier pass 1 as `must-fix-blocked-by-scope-guard`. **Strictly worse diagnostic resolution: pre-W1 caught it at the dispatcher with a clearer reason; W1 catches it in the inner loop after dispatching the top-level fixer to make a partial edit that step 3e then reverts.** |
| T21 | `limit-cycle` at `2cb02e4` (2026-05-15) | `must-fix-blocked / score-budget-exhausted` at `dd79e22` | YES. Same bimodal Path-A/Path-B Solution approach; Path B's derivative defect surface still exceeds the originating S=25 medium budget. W1's Change D catches it at pass 1 with explicit S/Σ/breach-margin arithmetic instead of pre-W1's 5-pass limit cycle. Strictly better diagnostic resolution; identical structural impasse. |
| T19e | (live, not parked pre-W1) | `diverging` at `c8a362f` | NEW failure under W1. The class-3 sweep stripped guards that had been bounding T19e's prose surface; the unbounded normative-runtime contract then triggered classic SP-1 paragraph-spending across 6 passes with C2 backtracking firing once but not preventing re-expansion. **Regression: a class-3 guard that pre-W1 was load-bearing is now gone.** |
| T22b / T22c / T15c | cascade-parked from T22a1 in `31eb888` | cascade-parked from T22a1 in `cfcbe38` | same as T22a1 |
| T15b | parked at `cf3ecb0` (2026-05-13, audit human-review queue) | not yet dispatched in this re-run | n/a |

### 3.2 Aggregate

- **Findings re-dispatched and terminated: 6** (T19a, T19b, T19d, T19e,
  T21, T22a1). Plus 3 cascade-parked from T22a1. Plus 1 resolved (T19c).
  T20 + T15b remain queued.
- **Convergence rate: 1/10 = 10%** of dispatched, vs pre-W1's 0/7 = 0%
  on the prior baseline. The one improvement is T19c, where the
  class-3 sweep (B) closed the top-level refusal at the audit-side.
- **Failure mode taxonomy is more granular under W1.** Pre-W1
  vocabulary: `diverging`, `limit-cycle`, `top-level-refused`. W1
  vocabulary adds `must-fix-blocked / must-fix-blocked-by-scope-guard`,
  `must-fix-blocked / score-budget-exhausted`, and
  `surface-expansion-irrecoverable`. Forensics reports under W1 are
  uniformly richer: per-pass severity tallies, snapshot ref pointers,
  poisoned fix lists, S/Σ/breach-margin arithmetic, snapshot-diff
  characterisation on surface-expansion-irrecoverable.
- **Pass-burn per termination is lower under W1.** Pre-W1 diverging
  findings burned 5 passes each (T22a1: 5, T20: 5, T19b: 5); W1
  burns 0 (T19d), 0 (T21), 3 (T22a1), 5 (T19a), 6 (T19b), 6 (T19e).
  Faster failures at the must-fix-blocked / score-budget-exhausted
  end; comparable to slightly higher elsewhere because C1's stage
  advancement legitimately consumes passes the pre-W1 loop did not
  have.

### 3.3 Read in one sentence

**W1's loop-side architecture works as designed** — every detector
fires correctly, every poisoning operates, every stage advances, every
score budget arithmetic computes — **and the convergence rate did not
improve because the audit-side gate that selects which findings enter
the loop did not change, and so the same structurally infeasible
findings continue entering it.**

## 4. Why the W1 mechanisms did not help on the re-attempt set

The 6 W1 forensic reports converge on five structural failure shapes.
The first three were predicted by the prior meta-analysis (and the prior
meta-analysis named the loop-side mitigations W1 then shipped). The last
two were not anticipated; W1 makes them worse.

### 4.1 Producer/consumer cross-finding data dependency (T19b, T19d)

Two of the six failures are findings that read fields produced by other
parked findings.

- **T19d** reads `entry.invocationId` from `ActiveInvocationRegistry`,
  which is owned by T19a (parked, limit-cycle). Pre-W1 the dispatcher
  refused because Solution constraints named the parked sibling.
  Post-`cc91b23` the sibling is no longer parked (it's unparked-but-
  failed-to-converge), so the dispatcher proceeds; the classifier then
  catches the impossibility at pass 1 with `must-fix-blocked-by-scope-
  guard` because every viable remediation collides with guard 1 or
  guard 3.
- **T19b** adds an `invocation_id` field to `RuntimeEvent` whose
  semantics depend on T19a (registry shape, parked), T19c (dedup-key
  widening, resolved post-W1 in `14c8a8c`), T19d (cancelled-by-session-
  shutdown population, parked), and T19e (sibling-emission timing,
  parked). Stage 2's placement lens correctly identifies that the
  obligations T19b's field comment accreted belong in T19c's dedup-
  and-lifetime section, but T19c's resolution landed in spec
  rather than in spec-review (so the placement target page exists but
  the placement landing-zone surface in the live review doc doesn't).

The Relationships taxonomy carries `co-resolve` / `must-precede` /
`must-follow` / `same-cluster` / `independent` verbs. **`co-resolve` is
treated as a classification, not as an ordering or producer/consumer
edge** — the parker only propagates parking on `must-precede` /
`must-follow`, and the dispatcher does no pre-flight on `co-resolve` at
all. The producer/consumer relationship between T19a (producer of
`entry.invocationId`) and T19d (consumer) is in fact a hard ordering
constraint, but it is glossed parenthetically under `co-resolve`, and
nothing in the pipeline reads the parenthetical.

The prior meta-analysis recommended audit-time grepping of
`spec-review-parked.md` for every Relationships edge (rec 1, 3/3
forensic coverage). That rec was not shipped, and `cc91b23` removed the
last accidental backstop by deleting `spec-review-parked.md` outright
during unpark. The W1 loop catches the resulting impossibility one
layer deeper, at higher dispatch cost, with no actionable signal back
to the human that the relationship taxonomy itself is under-expressive.

### 4.2 SP-1 paragraph-spending in bounded normative-runtime contracts (T19e, T22a1, recurrence in T19b)

T19e is the canonical case. Its Solution approach instructs the fixer to
append "one paragraph" pinning two positive contracts on sibling
always-log emission timing. The contract has **at least seven**
cross-cutting concerns (helper-invocation-from-failure-site leg,
fallback-chain transit, panic-routed emission, cascade-twin re-emission
at frame D, host JS scheduling deferral primitives, operator-observation
surface, sibling-only vs universal scope). Prose budget: one paragraph.
Each clarification fires three more findings on the next pass.

Trajectory `8,4,3,2,2,3` with score-sum `336,210,56,52,61,85 vs S=25`:
descending until pass 4, then the C2 surface-expansion detector fired
once and poisoned 5 fixes, then passes 5–6 produced 2 → 3 raised fixes
on yet-unexplored edges and triggered divergence.

The prior meta-analysis's rec 5 (prose-budget cap for placement-class
and paraphrase-class findings) is the named mitigation — also not
shipped. W1 has no per-finding prose budget, only the per-pass
score-sum budget, which is a different control surface: it caps the
*derivative-defect score* the loop is willing to accept on a pass, not
the *prose word count* the fixer is allowed to author on the originating
finding. The pattern is observable at audit time (any Solution approach
combining MUST/MUST NOT with lexicalised concerns
{timing, ordering, real-time, batching, scheduling, observability,
transport, deferral, async, concurrent} and lacking an explicit
"this paragraph does not pin / is silent on / explicitly defers …"
constraint) — see rec C below.

### 4.3 Bimodal Solution approaches with heavy branches (T19a, T21)

Both T19a and T21 are bimodal in the SP-1 sense: a "light" branch (a
syntactic field addition, a single-element citation slot) coexists with
a "heavy" branch (spec-coined runtime-validation MUSTs, a multi-element
edit with new paragraph + new checklist item + new vocabulary +
remediation arm). The heavy branch's derivative-defect surface exceeds
the originating finding's importance budget.

- **T21** under W1's Change D exits at pass 1 with `score-budget-
  exhausted` (S=25, Σ=35, breach margin 10). 3 non-blocker raised
  findings counted toward the budget; the first medium-score raised
  finding alone exhausted the medium budget. Pre-W1 the same loop
  burned 5 passes as a `limit-cycle`. **W1 is strictly better here:
  faster exit, actionable forensic report (the report enumerates the
  3 budget-consuming findings with their cumulative running sums).**
- **T19a** burned 5 passes under W1 as a `limit-cycle`, with C2
  surface-expansion firing once and re-emission under a different
  NN slot defeating the poisoning. Pre-W1 it also limit-cycled (8
  passes). The score budget did not trigger because no individual
  pass exceeded S=100 after the C2 backtrack (sums 55, 77, 86); the
  cumulative cost across passes of re-paying to detect-and-exclude
  the same defect cluster is not modelled by the per-pass budget.

The structural pattern — Path A/B or "field add + spec-coined MUSTs" —
is detectable from the originating Recommendation's text. The prior
meta-analysis surfaced this as a class of finding ("hard squeeze",
§Finding-shape pathologies); W1 did not introduce a Solution-approach
shape detector. The audit catches Pattern I (vestigial metadata) but
not Pattern N (bimodal heavy-branch).

### 4.4 NEW under W1: slot-keyed poisoning index defeats content-equivalent re-emission

This is a new pathology that the prior meta-analysis could not
anticipate because C2 backtracking did not exist pre-W1.

The C2 poisoning identifier is `<lens>:<NN>`, where `NN` is the
filename slot in the classifier's `_classified/` directory
(`fix-NN-<lens>.md`). The slot is **assigned per-pass**, not per-content:
the same defect re-raised by the same lens under a different finding
position on the next pass gets a different `NN`, and the poisoning index
does not match.

- **T19a pass 4 re-execution after C2 backtrack:** completeness lens
  re-emitted the same content (same target PIC L153 obligations bullet,
  same impact, substantively same proposed remediation) under filename
  `fix-02-spec-lens-completeness.md` after the poisoned entry had been
  `:03`. Classifier routed it to fix; pass 5 limit-cycled.
- **T22a1 replay pass 3':** after consistency:01 was poisoned, the same
  line-804 self-trip re-raised under spec-lens-assumptions in a
  different slot; classifier could not match.

**Fix:** key the poisoning index on `(file_path, normalised_section_anchor,
normalised_proposed_remediation_paragraph_hash)` rather than on
`<lens>:<NN>`. Stable normalisation; index maintained across restore-
and-re-execute. See rec A below.

### 4.5 NEW under W1: class-3 sweep removed load-bearing guards on previously-convergent findings (T19e)

This is the regression hidden inside the otherwise-correct §B class-3
sweep.

T19e was not on the W1 unpark list — it was live in `spec-review.md`
before W1. The pre-W1 finding had class-3 guards that capped the
positive prose surface the fixer was allowed to author (the audit's
Pattern G or finding's own author-time constraints). When `dbc73e2`
swept those guards as class-3 shape mandates, T19e's prose surface
became unbounded; the W1 loop then ran for 6 passes with C2
backtracking firing once and divergence finally exiting at pass 6.

The class-3 sweep's empirical premise ("every diverging and cycled spec
case in `docs/spec-review-forensic-meta-analysis.md` failed inside a
class-3 constraint") is correct for the diverging/cycled cases it was
diagnosed against. The premise does **not** establish the inverse —
that every class-3 constraint *causes* divergence. Some class-3
constraints are doing legitimate prose-budget work that, when removed,
licenses the unbounded-prose pattern the prior meta-analysis named
"soft squeeze" (T22a1) but here re-emerges under a different finding.

**Mitigation:** the class-3 sweep should have a fallback shape — either
demote class 3 from constraint to hint (the prior meta-analysis's own
fallback suggestion, §B), or replace each swept class-3 with an
explicit *prose-budget* annotation on the originating finding (e.g.
"new prose ≤ 60 words; no new normative MUSTs"). Neither shipped.

## 5. The audit-side gap is the dominant cause

Cross-finding observation across all 6 W1 forensic reports:
**every pre-flight `/spec-review-audit` verdict was a false negative.**

| Finding | Pre-flight audit verdict | Actual outcome | Audit miss-score (false-negative lens dimensions) |
|---|---|---|---|
| T19a | LOW / AUTO_RESHAPE | limit-cycle, 5 passes | 6 (prescription, consistency, completeness, implementability, traceability, assumptions) |
| T19b | NONE / NO_ACTION | diverging, 6 passes | 9 (assumptions, completeness, consistency, implementability, error-model, scope, placement, prescription, traceability, external-entities) |
| T19d | LOW / AUTO_RESHAPE | must-fix-blocked, 0 passes | 4 (consistency, assumptions, implementability, scope) |
| T19e | LOW / NO_ACTION | diverging, 6 passes | 8 (testability, traceability, completeness, consistency, prescription, implementability, assumptions, external-entities) |
| T21 | LOW / AUTO_RESHAPE (Pattern I metadata only) | must-fix-blocked / score-budget-exhausted, 0 passes | 4 (consistency, completeness, implementability, assumptions) |
| T22a1 | NONE / NO_ACTION | surface-expansion-irrecoverable, 3 passes | 4 (consistency, completeness, assumptions, traceability) |

Audit miss-score totals: **35 false-negative fix-class lens dimensions
across 6 findings, mean 5.8 per finding.**

The prior meta-analysis's diagnosis ("the audit gate is the cheapest
place to prevent every one of these failures, and the audit gate's
current procedure is structurally blind to all three failure-mode
triggers") is unchanged. W1 made the failures more diagnostic and
faster to surface; W1 did not address the structural blindness.

The audit's current procedure (`spec-review-finding-lens-auditor.md`)
verifies the *finding's own text* against the lens corpus. Empirically,
the dimensions on which the audit fails systematically are:

1. **Imagined-fixer-output simulation.** The audit does not draft the
   prose the fixer would produce and re-run lenses against that draft.
   T22a1 pass-2 fixer-authored "editorial review on the same footing"
   routing clause was inevitable from the finding's "presupposition
   grounding" framing; no clause in the *finding text* tripped line 804,
   but every plausible fixer output did.
2. **Cited-leaf actual coverage.** When a finding cites V18q's
   concurrent-sibling tests as a binding behavioural anchor, the audit
   marks `testability` as PASS without reading V18q's Tests bullet to
   verify the cited clauses exist. (T19e pass-1 Finding 1: 12 V18q test
   clauses, none matching what T19e cites.)
3. **Surrounding-section anchor convention.** PIC uses
   `<a id="pic-N"></a> **PIC-N. <Name>.**` for every normative rule.
   T19e's first-pass traceability finding flagged anchor mismatch; the
   audit had not surveyed the per-page convention.
4. **Sibling parked-state at run time.** T19b's audit verdict was
   `NONE / NO_ACTION` with reasoning "co-resolve dependencies stated
   in Relationships". By the time the loop ran, all four co-resolve
   siblings were parked (or for T19c, resolved into spec rather than
   spec-review). No re-audit hook.
5. **Field-existence grep against the spec corpus.** T19d reads
   `entry.invocationId` from a registry whose declaration does not list
   that member. One grep — `grep -nR "invocationId" docs/spec_topics/` —
   would have moved the verdict from LOW to RISK_BLOCKING.
6. **Same-edit MUST adjacency check.** PIC line 804: *"Any future
   presupposition added to this page that routes its detection to
   editorial review under this procedure MUST be added to this checklist
   in the same edit; landing such a presupposition without extending
   the checklist leaves the detection mechanism reliant on contributor
   recall and is non-conformant with this step."* T22a1's audit did not
   visit this clause. One grep — `grep -nE "in the same edit|MUST be
   added to this checklist|non-conformant with this step"
   docs/spec_topics/pi-integration-contract.md` — would have surfaced
   the trap.
7. **D-mode score budget projection against worst-case derivative-defect
   surface.** Per-finding audit reports do not currently model the
   D-mode budget calculation at all. The audit format produces per-lens
   risk verdicts but not a Σ-against-S projection for the bimodal heavy
   branch under D-mode.

Each of these is grep-shaped or one-page-read-shaped. **None require
inference, model judgment, or correlation across documents that grep
cannot index.** They are absent because the audit's checklist does not
include them, not because they are hard.

## 6. Cross-finding observations against the W1 architecture

Beyond the audit-side gap, three loop-side observations recur across
the W1 forensic reports — call out W1 mechanisms that worked, that
half-worked, and that did not work at all.

### 6.1 What worked

- **Stage 1 convergence under C1 is real and observable.** T19b's
  trajectory `6,3,0,4,4,5` has a genuine `fixCount == 0` at pass 3,
  marking a successful stage-1 close-out before stage 2 expanded the
  lens set. This is the pattern the prior meta-analysis predicted
  ("T20: tier 1 detects the `hard-ceilings.md` set-equivalence
  contradiction immediately"). The detector fires at the right moment;
  the problem is downstream (stage-2 lenses raise findings whose only
  landing zone is parked).
- **Change D's score-budget arithmetic catches T21 at pass 1.** This
  is a strict improvement over the pre-W1 5-pass limit-cycle. The
  forensic report enumerates the breach-margin and the per-finding
  contributions; user can act on this without reading the per-pass
  artefacts.
- **C2 backtracking executed correctly on T22a1 and T19a.** Snapshots
  were taken, fixes were poisoned, working tree was restored. The
  retained snapshot namespace lets `spec-fix-failure-forensics` produce
  ref-to-ref `git diff` characterisations on every backtrack.
- **§B class-3 sweep closed T19c's top-level refusal.** This is the
  one W1 convergence and the only finding for which the class-3 sweep
  is unambiguously beneficial.
- **Forensic reports are uniformly richer.** Every report has a
  ranked root-cause analysis, an audit-vs-actual table, immediate /
  pipeline / NOT-recommended buckets, and (on
  `surface-expansion-irrecoverable`) per-snapshot-pair diff
  characterisation. This is the deliverable shape the prior
  meta-analysis lived inside; the W1 pipeline produces it for every
  failure.

### 6.2 What half-worked

- **C2 poisoning defeats content-equivalent re-emission.** Detailed
  in §4.4. Slot-keyed `<lens>:<NN>` identifier is wrong for the job;
  needs to be content-keyed.
- **`must-fix-blocked-by-scope-guard` exits ARE caught, but later
  than they need to be.** T19d's failure is the canonical case: the
  dispatcher's pre-flight could have refused the finding before
  dispatching the top-level fixer, but did not (no grep against
  `spec-review-parked.md`, no `consumes:` taxonomy in Relationships).
  W1 catches the impossibility one layer deeper than necessary, at
  higher dispatch cost (the top-level fixer made a partial edit that
  step 3e then reverts).
- **§B class-3 sweep is empirically correct for diverging cases but
  introduced a regression on T19e.** Detailed in §4.5. The sweep
  removed a load-bearing prose-budget guard; the originating finding
  is now under-constrained.

### 6.3 What did not work

- **Severity-weighted triage clause 1 (A's MUST-fix) interacts poorly
  with class-2 prohibitions on the same finding.** T19a's class-2
  prohibition forbids new diagnostic surfaces / `details.kind`
  discriminators / aggregation / storm-detection — i.e. the only
  mechanism that would close the runtime-validation lens findings the
  classifier MUST-promotes. Result: lenses correctly identify a real
  defect; guards correctly fence the natural remediation; classifier
  cannot satisfy the MUST without violating the guard. The current
  exit (`must-fix-blocked-by-scope-guard`) is structurally inevitable
  for this finding shape regardless of pass count.
- **Score budget is per-pass, not cumulative.** T19a's pass-by-pass
  score sums `125, 150, 55, 77, 86` show no single pass exceeded
  S=100 after backtrack; D-mode budget never tripped. The *content*
  across passes was dominated by the same cluster the loop already
  paid to detect-and-exclude earlier. There is no cumulative-cost
  signal.
- **`co-resolve` is unactionable in the pipeline.** Detailed in §4.1.
  The Relationships taxonomy needs `produces:` / `consumes:` fields
  for read-channel dependencies.

## 7. The new W1 forensic taxonomy is itself an improvement

Independently of convergence rate: the W1 forensic system is materially
better than the pre-W1 one as a *diagnostic surface for humans*. The
forensic reports under
`.pi/tmp/spec-fix-failure-forensics/2026-05-16T17-52-36_347871/`
average 470 lines each (vs ~50–100 lines in the pre-W1 reports under
`2026-05-15T18-46-12_c1e9c1/`), and the additional length is
information-bearing:

- TL;DR fenced block parseable by orchestrator (orchestrator uses it
  to write the one-paragraph TL;DR pointer into
  `docs/spec-review-forensic-analysis.md`).
- Per-finding ranked root-cause analysis with `path:line` citations.
- Audit-vs-actual comparison naming exact lens-dimension misses.
- Immediate / Pipeline / NOT-recommended recommendation buckets.
- Snapshot-pair diff characterisation on
  `surface-expansion-irrecoverable`.
- D-mode budget arithmetic (S / Σ / breach-margin / per-finding
  contributions) on `score-budget-exhausted`.

The reports become useful inputs to *this* meta-analysis without
hand-reconstruction. That is itself a step-function improvement; if
the convergence rate remains low for the next iteration too, the cost
of the *next* meta-analysis after that drops to the cost of reading
the reports.

## 8. Ranked recommendations

Recommendations are partitioned by which repository owns the change.
Within each partition, rows are ranked by **coverage** — how many of
the 6 W1 re-attempt failures (T19a, T19b, T19d, T19e, T21, T22a1) the
recommendation would have prevented if it had been live. `6/6` means
every re-attempt would have avoided re-parking.

**Repo-ownership at a glance:**

| Rec | Title | Coverage | pi-loom only | pi-config only | Both |
|---|---|---:|:-:|:-:|:-:|
| A | Audit-side gate upgrade (A.1–A.6) | 6/6 | | ✓ | |
| B | Content-keyed C2 poisoning index | 4/6 | | ✓ | |
| D | Cumulative-score budget (ΣΣ vs k·S) | 3/6 | | ✓ | |
| E | Class-3 sweep regression mitigation (pipeline side) | 1/6 | | ✓ | |
| C | `produces:` / `consumes:` Relationships taxonomy | 4/6 | | | ✓ |
| F | `Shape: multiple` resolution for tight clusters | 3/6 | | | ✓ |
| G | Reshape parked findings (per-finding, immediate) | 4/6 | ✓ | | |
| H | Re-annotate T19e with explicit prose-budget constraint | 1/6 | ✓ | | |
| I | Wait-then-retry T20 + T15b under W1 (queued, not failed) | 0/6¹ | ✓ | | |

¹ T20 and T15b have not yet been dispatched under W1; recommendation I
is a process step, not a defect fix — included for completeness.

The three partitions follow. Each entry restates the coverage number
and names the exact file(s) that change.

---

### 8.1 pi-config-only recommendations (`~/.pi/agent/git/github.com/bitmonk8/pi-config/`)

These are loop-side or audit-side pipeline changes. Once shipped via
`pi update`, every consuming project (pi-loom, ImportService, future
projects) benefits without per-project work.

**A. (6/6) Audit-side gate upgrade.** Implement the prior
meta-analysis's three audit recs plus four post-W1-empirical
refinements. Per-finding audit cost: ~30s of grep per audit pass.
Per-finding pipeline savings: every re-attempt that currently exits
anywhere between top-level-fixer and inner-loop pass N exits at audit
time instead.

Files changed (all under `pi-config`):

- `agents/spec-review-finding-lens-auditor.md` — sub-recs A.1–A.6
  (all six are new audit steps).
- `agents/spec-review-audit-applier.md` — understand new RISK
  rationales (`parked-cluster-cascade`, `producer-not-yet-landed`,
  `same-edit-must-trip`).
- `agents/spec-review-auto-reshaper.md` — understand new auto-reshape
  triggers (Pattern N, A.4).
- `prompts/spec-review-audit.md` — update Pattern list (add M
  `same-edit MUST adjacency`, N `bounded-prose / combinatorial-edge-
  case`); update audit-question list per A.5.
- `prompts/fix-spec-shape-single-findings.md` — add A.6 re-audit hook
  after each parking event in outer-loop step 5.
- `docs/spec-review-followups.md` — retire Layer-3 deferral note;
  add baseline firing rates for new patterns once available.

Concrete sub-recommendations:

- **A.1** `spec-review-finding-lens-auditor.md` step N: for every
  Relationships block entry with a verb in
  {`co-resolve`, `must-precede`, `must-follow`, `same-cluster`},
  grep `<specReviewParkedPath>` for the referenced finding ID. On
  match, flip the four lens dimensions the prior meta-analysis named
  (`completeness`, `assumptions`, `scope`, `consistency`) to
  `RISK_HIGH` with rationale `parked-cluster-cascade`. **Coverage:
  T19b, T19d directly. T22a1 indirectly (forward-looking dependents
  T22b/T22c become visible as parked-dependents-on-success).**
- **A.2** When the Solution approach contains an error-class name AND
  a resource/event/concept class name, grep the canonical owner page
  for the resource name and compare the routing it pins against the
  routing the finding pins; flag set-equivalence drift. **Coverage:
  T19b's `errors-and-results.md:118` adjacency clash; T22a1's PIC
  line 804 same-edit MUST.**
- **A.3** Field-existence grep against the spec corpus for every
  identifier the Solution approach reads. Absent identifier →
  downgrade to `RISK_HIGH` with rationale `producer-not-yet-landed`.
  **Coverage: T19d's `entry.invocationId`.**
- **A.4** Pattern-N (bounded-prose / combinatorial-edge-case) check:
  Solution approach combining MUST/MUST NOT with lexicalised concerns
  {timing, ordering, real-time, batching, scheduling, observability,
  transport, deferral, async, concurrent} AND lacking a
  "this paragraph does not pin / explicitly defers" constraint →
  auto-reshape into split + explicit deferral, or HUMAN_REVIEW.
  **Coverage: T19e directly.**
- **A.5** D-mode budget projection: for findings carrying a
  `**Score:**` field, compute worst-case derivative-defect surface
  (`Σ` over per-lens RISK_LOW predictions converted to D-mode score
  proxies) and warn if surface > S, especially for bimodal Solution
  approaches. **Coverage: T21 directly.**
- **A.6** Re-audit hook: after each parking event in
  `/fix-spec-shape-single-findings`'s outer loop step 5, re-audit
  every surviving live finding whose Relationships edges referenced
  the just-parked finding. **Coverage: T19b (when T19a parked
  mid-batch).**

**B. (4/6) Content-keyed C2 poisoning index.** Replace `<lens>:<NN>`
identifier with `(file_path, normalised_section_anchor,
normalised_proposed_remediation_hash)`. Stable normalisation;
index maintained across restore-and-re-execute.

Files changed (all under `pi-config`):

- `agents/spec-diff-fix-loop.md` — change `poisonedFixes` set
  membership predicate; persist content-key per poisoned fix.
- `agents/spec-diff-fix-classifier.md` — read `PoisonedFixes:` as
  content-keys; match against `(file, anchor, remediation-hash)` on
  each raised finding before classifying as fix.
- `agents/spec-fix-failure-forensics.md` — surface content-keys (not
  slot ids) in the `POISONED_FIXES:` machine-readable trailer.
- `agents/spec-review-parker.md` — store content-keys in parked TL;DR
  for cross-run debugging.

**Coverage: T19a directly (pass 4 re-emission under different NN slot);
T22a1 directly (replay pass 3' re-emission under different lens);
preventive on T19b and T19e for the same pathology shape.**

**D. (3/6) Cumulative-score budget.** Promote the per-pass D-mode
Σ-vs-S budget to a cumulative `ΣΣ = sum(scoreSum[1..pass])` budget
checked against `k×S` (suggested `k = 3`). Catches the cost of
re-paying to detect-and-exclude the same defect cluster across
passes.

Files changed (all under `pi-config`):

- `agents/spec-diff-fix-loop.md` — maintain `cumScoreSum` running
  total; add new exit branch in step 3f.
- `agents/spec-diff-fix-classifier.md` — add `cumScoreSum-exhausted`
  sub-rationale to `_blocked.md`.
- `agents/spec-fix-failure-forensics.md` — third branch in the
  must-fix-blocked report split (Branch A scope-guard, Branch B
  per-pass-budget, **Branch C cumulative-budget**).
- `agents/spec-review-parker.md` — new failure-mode template.
- `prompts/fix-spec-shape-single-findings.md` — forward `CUM_SCORE_SUM:`
  field to forensics and parker.

**Coverage: T19a directly (cumulative `125 + 150 + 55 + 77 + 86 = 493
> 3 × 100`, would have exited at pass 4 instead of looping out at 5).
T19e partially (would have exited at pass 4 instead of 6). T19b
partially (would have exited at stage 2 pass 5 instead of 6).**

**E. (1/6) Class-3 sweep regression mitigation — pipeline side.**
Either demote class 3 from constraint to hint (per prior
meta-analysis's §B fallback), or extend `spec-review-finding-reducer`
to emit an explicit prose-budget annotation field on findings whose
shape would previously have carried class-3 prose-bounding guards.

Files changed (all under `pi-config`):

- `agents/spec-review-finding-reducer.md` — introduce hint-class /
  `**ProseBudget:** <int> words` field; document when to emit.
- `agents/spec-review-fixer.md` — forward ProseBudget into
  ScopeGuards block as a class-2 bullet (`ProseBudget: ≤ N words`).
- `agents/spec-diff-fixer.md` — honour ProseBudget as a class-2
  constraint (refuse if proposed edit would exceed it).
- `prompts/spec-review.md` and `prompts/reshape-spec-review.md` —
  document the new field in the class taxonomy.

Coverage **only via pipeline support**: a per-finding fix in pi-loom
for T19e specifically is covered by rec H below; rec E gets the
machinery into the package so it works for every project. **Coverage:
T19e directly once H lands too.**

---

### 8.2 pi-loom-only recommendations (`c:/UnitySrc/pi-loom/`)

These are per-finding reshape edits or queued-work-completion steps.
They unblock the live `docs/spec-review.md` but do not change the
pipeline mechanics; the same shape problem on a future project would
recur until a pi-config rec landed.

**G. (4/6) Reshape parked findings per their forensic-report
recommendations.** Each W1 forensic report ends with a `## Immediate
(this finding)` subsection listing one to three reshape options. The
user has the implementer view and is the only party who can pick
between them.

Files changed (all under `pi-loom`):

- `docs/spec-review-parked.md` — reshape parked entries OR move them
  back to `docs/spec-review.md` after reshape.
- `docs/spec-review.md` — receive reshaped findings; update tally.

Per-finding picks (paraphrased from the forensic reports):

| Parked finding | Recommended reshape |
|---|---|
| **T19a** | Narrow to syntactic `invocationId: string` declaration; drop generator-side MUSTs (demote to non-normative illustration); let T19c + diagnostics.md §7 pin the wire-form contract from the consumer side. **Or** split into T19a-i (field shape) + T19a-ii (generator obligations + runtime detection, drops the class-2 prohibition on new diagnostic surfaces). |
| **T19b** | Park until T19a lands first (cascade-park dependents T19d, T19e). **Or** strip every non-field-name-and-type obligation off the field comment; replace with a 30-word, two-hyperlink cross-reference comment. |
| **T19d** | Land T19a first (T19d will converge on a subsequent fix-loop pass once the registry-shape edit is in tree). **Or** fuse T19a + T19d (+ optionally T19b, T19c) into a single `Shape: multiple` finding (see rec F). |
| **T19e** | Split into T19e-α (anchor scaffold) + T19e-β (helper-internal leg only, no deferral primitives) + T19e-γ (defer 5 cross-cutting concerns to `.pi/spec-debt-register.md`). **Or** rewrite Solution approach with a ≤ 3-sentence prose budget + constraint forbidding any of the 7 cross-cutting concerns being mentioned. Pairs with rec H. |
| **T21** | Split along bimodal seam: T21a (Path-B paragraph only, no checklist item, no new vocabulary) + T21b (editorial-review checklist item with audit recipe). **Or** raise T21's score from medium (25) to high (100) to absorb the four raised non-cheap defects. **Or** keep bimodal but add 4 in-line per-element discipline constraints in Solution approach. |
| **T22a1** | Add fifth Solution constraint forbidding any normative detection-routing claim into the new sub-section. **Or** merge T22a1 + T22c into a single resolution (restores R3 feasibility). **Or** split into T22a1-α (strict paraphrase: anchor + cross-references only) + T22a1-β (cardinality-routing-claim, deferred until T22c lands). |

Cascade-parked T22b, T22c, T15c un-park automatically once T22a1's
reshape lands and is fixed; no separate action.

**Coverage: T19a, T19b, T19d, T19e, T21, T22a1 (+ cascades). Each
reshape closes the specific structural impasse named in the forensic
report.**

**H. (1/6) Re-annotate T19e with an explicit prose-budget
constraint.** Stop-gap pending pi-config rec E. Replace the swept
class-3 guards on T19e with a class-2-shaped budget bullet under
`## Solution constraints`, e.g.:

> *"The appended paragraph MUST NOT exceed 60 words and MUST NOT
> coin new normative vocabulary (no terms not already defined in
> PIC). The seven cross-cutting concerns listed in the originating
> Recommendation are deferred to `.pi/spec-debt-register.md` and
> MUST NOT be addressed by this fix."*

Files changed (all under `pi-loom`):

- `docs/spec-review-parked.md` — amend T19e's entry.
- (when un-parked) `docs/spec-review.md` — carry the new constraint.

This is the manual application of pi-config rec E to the one
empirically-broken finding. A class-2 word-count bullet is a
legitimate project-policy pin ("no fix may exceed N words"); the
fixer's scope-guard discipline already honours class 2.

**Coverage: T19e directly.**

**I. (0/6 — process step, not defect fix) Re-dispatch T20 and T15b
under W1.** Both findings were unparked but the W1 re-run did not
reach them before the context graceful-stop fired. They remain live in
`docs/spec-review.md`. Run `/fix-spec-shape-single-findings` again
(picker walks bottom-up; T20 + T15b will surface in their natural
order) to either land a fix or get a W1 forensic report on each.

Files changed: none until the run completes (results land
automatically via the orchestrator).

---

### 8.3 Recommendations requiring changes in both repos

**C. (4/6) `produces:` / `consumes:` Relationships taxonomy
extension.** Add explicit producer/consumer fields to the
Relationships taxonomy so the read-channel dependency T19a→T19d
(among others) is carried structurally rather than parenthetically.
Lets the dispatcher establish a topological order on the picker
queue; lets the parker propagate parking on producer parking; lets
the auditor flag consumers when producers are parked.

Files changed in **pi-config**:

- `prompts/spec-review.md` — add `produces:` / `consumes:` to the
  Relationships verb list; document in the picker contract.
- `agents/spec-review-finding-reducer.md` — preserve `produces:` /
  `consumes:` lines from triage-time prose.
- `agents/spec-review-finding-lens-auditor.md` — use `consumes:`
  for field-existence grep target (combines with A.3).
- `agents/spec-review-parker.md` — propagate parking on
  `produces:` (same-as-must-precede semantics).
- `prompts/fix-spec-shape-single-findings.md` — dispatcher pre-flight:
  refuse if any `consumes:` field has not yet been produced (parked or
  not-yet-resolved upstream).

Files changed in **pi-loom**:

- `docs/spec-review.md` — backfill `produces:` / `consumes:` lines
  on existing findings (especially T19a→T19b/T19d/T19e cluster,
  T22a1→T22b/T22c forward-link cluster).
- `docs/spec-review-parked.md` — same, on parked entries.

**Coverage: T19b, T19d directly; T22a1 (forward-link consumers);
T19e (implicit consumer of T19a's invocation_id field).**

**F. (3/6) `Shape: multiple` resolution mode for tight clusters.**
Authorise the picker + outer prompt + top-level fixer to operate on
more than one finding at a time when their Relationships edges form
a strongly-connected component over `co-resolve` / `produces:` /
`consumes:` / `same-cluster`. One fixer pass lands the whole cluster's
edits; the inner loop sees one stable post-edit state.

Files changed in **pi-config**:

- `agents/spec-review-shape-single-picker.md` — detect SCCs over the
  Relationships graph; emit `MULTI: <H1, H2, ...>` instead of a single
  heading.
- `agents/spec-review-fixer.md` — accept multi-finding input;
  consolidate Solution approaches; emit one combined `## Scope guards`
  block (class-1 + class-2 union, deduplicated).
- `agents/spec-diff-fix-loop.md` — carry the combined finding
  heading list through to forensics + parker.
- `agents/spec-fix-failure-forensics.md` — report on the cluster, not
  on the lead finding.
- `agents/spec-review-parker.md` — park the whole cluster if it
  fails; cascade-park is already the parker's default behaviour, so
  marginal change.
- `prompts/fix-spec-shape-single-findings.md` — commit message format
  for multi-finding resolution / parking.
- `prompts/spec-review.md` — document `Shape: multiple` in the
  reduction template; `State: reduced` discipline mirrors the
  single-finding case.

Files changed in **pi-loom**:

- `docs/spec-review.md` — mark the T19a/b/d/e cluster (and any
  other strongly-connected sub-graph) with `Shape: multiple` in the
  reduced finding shape; collapse their per-finding Solution
  approaches into one combined Solution approach.
- `docs/spec-review-parked.md` — un-park the cluster as one entry
  once pi-config's multi-finding support lands.

**Coverage: T19a, T19b, T19d if fused. Probably T19e too if scope is
widened to include the emission-timing contract.**

---

### 8.4 What NOT to recommend

- **Loosening the lens corpus.** Cross-finding observation across all
  6 W1 reports: every lens finding was a real defect against the text
  the fixer authored. No filtered false positives. Loosening to make
  these loops converge would admit real defects on unrelated future
  findings.
- **Raising the score-budget threshold or `k` multiplier.** Each
  budget-counted finding flags a real defect. The boundary `Σ ≤ S`
  is correct in spirit; the failures are structural (heavy-branch
  Solution approach exceeds light-branch S).
- **Raising the 17-pass cap.** Pass-count is not the bottleneck; the
  bottleneck is per-pass progress. T19e burned 6 of 17 passes and
  was already in a re-emission cycle.
- **Landing the uncommitted pass-N spec edits.** All six W1 failures
  left a working-tree state at exit that is a fixer compromise; step
  3e reverts correctly. Committing any of those diffs would entrench
  the contradiction.
- **Reverting the class-3 sweep wholesale.** Only T19e regressed; the
  sweep closed T19c. Targeted mitigation (rec E) is the right shape.
- **Reverting Change A, B, C1, C2, or D.** Every loop-side mechanism
  works as designed and shipped richer forensics as a side effect.
  The convergence-rate problem is upstream of all of them.

## 9. What changed since the prior meta-analysis

For a future reader picking up this thread cold: the prior
meta-analysis recovered in §1 was written before W1 shipped. Its
recommendation cluster proposed two work streams:

- Audit-side (recs 1–3, 3/3 forensic coverage each).
- Loop-side (recs 4–8 + architectural redesigns A/B/C1/C2).

W1 shipped the loop-side cluster in full plus the new Change D. W1
did not ship any of the audit-side recommendations. The next-iteration
work suggested by this meta-meta-analysis is the audit-side cluster
the prior meta-analysis already authored — plus the four
post-W1-empirical refinements documented in §5 (sub-recs A.1–A.6 above)
that the prior meta-analysis could not have anticipated because the
empirical evidence for them came from W1's own forensic reports.

Priority order for the next iteration, partitioned by repo (see
§8.1–8.3 for exact files):

**In pi-loom (immediate, no pi-config changes needed):**

1. **Rec G** — reshape parked findings per their forensic-report
   recommendations. Lowest cost, fastest live-doc unblock. Pick one
   reshape per parked finding from the per-finding table in §8.2.
2. **Rec H** — re-annotate T19e with explicit prose-budget class-2
   constraint. Stop-gap for pi-config rec E; pure pi-loom edit.
3. **Rec I** — re-run `/fix-spec-shape-single-findings` to dispatch
   the queued T20 + T15b, surface any new forensic reports.

**In pi-config (next implementation wave):**

4. **Rec A** — audit-side gate upgrade (sub-recs A.1–A.6). Highest
   leverage, cheapest cost; all six W1 failures would have exited at
   audit time. Ship this before any other pi-config rec.
5. **Rec B** — content-keyed C2 poisoning index. Closes the
   re-emission-under-different-NN hole T19a and T22a1 hit.
6. **Rec E** — class-3 sweep regression mitigation (hint-class or
   ProseBudget field). Pairs with pi-loom rec H to close T19e.
7. **Rec D** — cumulative-score budget. Lower coverage; defer pending
   rec A's empirical impact before adding another exit branch.

**In both repos (later; depends on pi-config taxonomy support):**

8. **Rec C** — `produces:` / `consumes:` Relationships taxonomy. Ship
   the pi-config side first (parser tolerates absent fields); backfill
   pi-loom findings opportunistically.
9. **Rec F** — `Shape: multiple` resolution mode. Highest implementation
   cost; resolves the structural mismatch between cluster-level
   findings and per-finding pipeline architecture. Ship after rec C
   so the SCC detection has explicit producer/consumer edges to walk.

## Appendix — file and artifact references

Working notes (gitignored, under `.pi/tmp/meta-analysis-work/`):

- `01-forensic-summaries.md` — per-report extracts for each of the 6
  W1 forensic reports (detector arithmetic, root causes, audit-vs-
  actual comparisons, recommendations, crystallising quotes).
- `02-pi-config-changes.md` — diff-and-mechanism analysis of the 6
  pi-config commits that constitute W1 + W5 rubrics.
- `03-current-pipeline-catalogue.md` — current-tip catalogue of the 7
  pi-config spec-pipeline agents/prompts with inputs / outputs /
  detector arithmetic / ASCII call-flow diagram.
- `04-history-and-prior-meta.md` — recovered prior meta-analysis +
  tabulation of currently-parked findings + chronological narrative
  of unpark → W1 re-attempt → re-parking sequence.

W1 forensic reports (gitignored):

- `.pi/tmp/spec-fix-failure-forensics/2026-05-16T17-52-36_347871/`
  - `t19a-extend-activeinvocationregistry-entry-shape-with-invocationid.md`
  - `t19b-add-invocation-id-field-to-runtimeevent-payload-declaration.md`
  - `t19d-populate-cancelled-by-session-shutdown-details-with-invocation-id.md`
  - `t19e-add-real-time-sibling-emission-timing-paragraph.md`
  - `t21-pi-side-slash-handler-promise-lifecycle-taken-as-given.md`
  - `t22a1-session-binding-contract-sub-section-in-pic-anchor-paraphrase-pi-source-ci.md`

Pre-W1 forensic reports (gitignored):

- `.pi/tmp/spec-fix-failure-forensics/2026-05-15T18-46-12_c1e9c1/`
  (T19b, T19c, T19d — top-level-refused / diverging)
- `.pi/tmp/spec-fix-failure-forensics/2026-05-15T15-04-05_7wkalj/`
  (T22b — diverging)

pi-config (git-pinned via global settings under
`git:github.com/bitmonk8/pi-config`, cloned to
`~/.pi/agent/git/github.com/bitmonk8/pi-config/`):

- `prompts/fix-spec-shape-single-findings.md` (749 lines) — outer driver.
- `agents/spec-review-fixer.md` (445 lines) — top-level fixer, class-3
  stripper at extraction.
- `agents/spec-diff-fix-loop.md` (1 190 lines) — inner staged
  review→fix loop; owns all detectors + snapshot mechanism.
- `agents/spec-diff-fix-classifier.md` (715 lines) — per-pass
  classifier; D-mode / A-mode triage; must-fix-blocked exits.
- `agents/spec-diff-fixer.md` (398 lines) — per-finding inner fixer;
  scope-guard discipline.
- `agents/spec-fix-failure-forensics.md` (592 lines) — per-failure
  forensic report writer.
- `agents/spec-review-parker.md` (443 lines) — physically moves failing
  finding + ordering-dependents into `spec-review-parked.md`.
- `docs/spec-principles.md` (313 lines) — SP-1 (external entities) and
  SP-2 (reduced state) authoring principles.
- `docs/spec-review-followups.md` (189 lines) — three-layer plan +
  pattern firing rates from prior calibration session.

W1 commits in pi-config (`git log --oneline` ordering):

- `a3136af` Change A — severity-weighted triage in spec pipeline
- `0d7d9b6` Change B — drop class-3 authoring in spec pipeline
- `f92cd3c` W5 rubrics — spec lens corpus (14 narrow + 3 broad)
- `e9d2307` Change C1 — staged lens introduction in spec pipeline
- `a50f02f` Change D — scoring system (combined-score budget)
- `2613f98` Change C2 — backtracking on surface expansion

pi-loom commits in the W1 re-attempt timeline:

- `dbc73e2` (2026-05-16) — class-3 sweep on pi-loom spec-review findings.
- `cc91b23` + `44f2c5e` (2026-05-16 19:48Z) — unpark 11 findings.
- `a56ab5e` (2026-05-16 19:50Z) — delete prior meta-analysis.
- `e8be9bf` (2026-05-16 20:16Z) — re-park T19d (must-fix-blocked).
- `14c8a8c` (2026-05-16) — resolve T19c.
- `531c22d` (2026-05-16 22:58Z) — re-park T19b (diverging).
- `00332d1` (2026-05-17 01:01Z) — re-park T19a (limit-cycle).
- `cfcbe38` (2026-05-17 02:20Z) — re-park T22a1 (+3 cascade).
- `dd79e22` (2026-05-17 02:48Z) — re-park T21 (must-fix-blocked /
  score-budget-exhausted).
- `c8a362f` (2026-05-17 05:20Z) — re-park T19e (diverging).

End of meta-analysis.
