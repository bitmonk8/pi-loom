# Constraint load-bearing sweep — pre-rec-V validation

```
PROJECT: pi-loom
SCOPE: enumerate cases across W1 and pre-W1 forensic reports where
       Solution constraints uniquely caught a defect that no other
       mechanism would have caught — to validate whether rec V's
       authoring guard, as currently sketched in
       docs/spec-review-forensic-meta-analysis.md §6.1, covers the
       constraint-load-bearing pattern catalog before pi-config
       ships rec V.
INPUT: 15 forensic reports across 3 runs:
       - .pi/tmp/spec-fix-failure-forensics/2026-05-15T15-04-05_7wkalj/
         (2 reports: T22a1 pre-W1, T22b pre-W1)
       - .pi/tmp/spec-fix-failure-forensics/2026-05-15T18-46-12_c1e9c1/
         (7 reports: T19a–d, T20, T21, T22a1 — W1 first attempt)
       - .pi/tmp/spec-fix-failure-forensics/2026-05-16T17-52-36_347871/
         (6 reports: T19a/b/d/e, T21, T22a1 — W1 re-attempt)
       Note: W2 reports (2026-05-17T16-41-31_b4324e) already analysed
       in the meta-analysis; not re-walked here.
METHOD: 1. Grep all 15 reports for constraint-related signal phrases
           (scope-guard, must-fix-blocked-by-scope, Solution constraint,
           constraint #, narrowing, would-author, manufacture,
           over-fence, fixer-as-author, out-of-scope).
        2. For each hit, classify by the role the constraint played
           (cross-finding scope guard / MUST-NOT-weaken pin / anti-
           relitigation pin / externally-owned-literal protection /
           cross-file mechanism — `[default]` is not a constraint).
        3. For each load-bearing case, ask: "would rec V's authoring
           guard (as sketched: 'narrowing would require asserting
           content not on the owner page') catch this if the
           constraint were demoted to advisory?"
HEADLINE: Cross-finding scope guards are the dominant constraint-
          load-bearing pattern — present in at least 8 of 15
          reports — and rec V's authoring guard as currently
          sketched does NOT reliably catch them. The guard's
          predicate ("content not on the owner page") fires on
          every legitimate addition the fixer makes; the
          discriminating predicate is "content not anticipated by
          the Problem." Three concrete refinements to rec V's
          authoring guard, plus one new finding-shape recognition,
          are needed before rec V's reach extends beyond T15a
          and T16a.
GENERATED: 2026-05-18T18:00:00Z
```

---

## 1. Classification taxonomy

Each load-bearing constraint case fits one of five categories:

- **α. Cross-finding scope guard.** Constraint forbids the fixer
  from pre-installing or modifying content that another live
  finding (sibling, `co-resolve` peer, or `must-precede` target)
  owns. The defect prevented: fixer authors content that belongs
  to another finding's editorial scope.
- **β. MUST-NOT-weaken pin.** Constraint forbids removing or
  relaxing an existing normative rule the spec already contains.
  The defect prevented: fixer rewrites prose in a way that
  silently drops a MUST/MUST-NOT.
- **γ. Anti-relitigation pin (class-2 prohibition).** Constraint
  forbids re-opening a closed design question or adding a new
  normative surface (new diagnostic code, new discriminator,
  new aggregation layer). The defect prevented: fixer writes a
  safe-but-vague clause that fans out into follow-on lens
  findings the origin score cannot absorb.
- **δ. Externally-owned-literal protection.** Constraint forbids
  restating a literal value or enumeration that another
  documentation surface canonically owns. The defect prevented:
  fixer duplicates a literal, creating a single-source-of-truth
  violation.
- **ε. Cross-file scope guard (`[default]`).** **Not a
  constraint** — mechanism-level setting on the orchestrator.
  Unaffected by rec V. Listed only to disambiguate from category
  α (which is cross-FINDING within the same file).

## 2. Case-by-case table

| # | Finding (run) | Category | What the constraint protected against | Rec V authoring guard catches it? | Gap |
|---|---|---|---|:-:|---|
| 1 | T22a1 (pre-W1, W1, W2) const #2 | α | Pre-installing T22c's `session_shutdown` chunk in PIC | **Partial** | Guard's "not on owner page" predicate fires on every addition; needs "not anticipated by the Problem" refinement to discriminate. |
| 2 | T22a1 (all runs) const #1 | δ | Restating the externally-owned `SessionShutdownEvent['reason']` closed set (owned by T36 / bump-procedure step 5) | **No** | Guard doesn't model "owned by another doc surface." Audit (rec L) would catch via grep, but rec L is postponed. |
| 3 | T22a1 (all runs) const #3 | α | Editing the `concurrent user sessions` closing sentence (T15c's territory) | **Partial** | Same as #1: needs Problem-anticipation refinement. |
| 4 | T22a1 (all runs) const #4 | α | Editing `future-considerations.md` (T22b's territory) | **Yes (via `[default]`)** | Cross-file move; the `[default]` mechanism-level scope guard catches independently of constraints. |
| 5 | T22b (pre-W1) hard pin | α | Fix chained to a PIC anchor T22a1 was supposed to install via `must-precede`. T22a1 diverged → T22b unfixable. | **N/A** | This is missing-prerequisite-finding territory under tightened §5.3 taxonomy. The constraint correctly encoded the prerequisite; demoting it doesn't change the underlying defect (T22a1 still hasn't landed). Rec V neutral. |
| 6 | T19a (W1) class-2 prohibition | γ | Introducing a new diagnostic code, `details.kind` discriminator, aggregation surface, or storm-detection layer | **No** | Anti-relitigation pins look like ordinary additions to the guard. Fixer would write the safe-but-vague clauses the constraint pins against; loop diverges identically. Net effect: rec V doesn't change outcome but doesn't cause a boundary violation either — lenses catch the relitigation. **Wasted-passes risk, not a correctness risk.** |
| 7 | T19a (W1) implied DI seam | γ+ | Constraint implied DI substitutability without authoring the seam; fixer accreted "test-mode generator injected via DI" prose every pass | **No** | The malformation here is on the **Problem** surface (under-specifies the DI seam) per the tightened §5.3 taxonomy. Constraint demotion doesn't help; reshape (RI-1 split into 3-leaf family or RI-3 author the DI seam directly) is the resolution. Rec V neutral. |
| 8 | T19a (W2) class-2 prohibition | γ | Same as #6 | **No** | Same. Wasted-passes risk; no boundary violation. |
| 9 | T19b (W1) const #2 | α | Modifying any of T19a / T19c / T19d / T19e territory ("explicit cross-finding scope guard naming T19a/T19c/T19d/T19e by ID and territory; Pattern G carve-out") | **Partial** | Same as #1: needs Problem-anticipation refinement. **Co-resolve recognition** would close it cleanly — the cluster is held together by `co-resolve` edges in `## Relationships`. |
| 10 | T19b (W2) const #2 | α | Same as #9 | **Partial** | Same. The forensic notes: "fixer would push T19c-territory MUSTs into the field comment under D-mode clause 1 must-fix-blocker pressure" — i.e., when the constraint is binding, the fixer overflows into a comment surface rather than violating; if the constraint is advisory, the fixer would author the T19c-territory MUSTs directly. **Direct boundary violation under rec V.** |
| 11 | T19b (W1) const #3 | γ | Adding new diagnostic code, `details.kind` discriminator, aggregation surface, storm-detection layer | **No** | Same as #6 — wasted-passes risk only. |
| 12 | T19c (W1) const #4 | α | Modifying parked sibling territory before invoking | **Partial** | Same as #9; co-resolve recognition would help. |
| 13 | T19d (W1, W2) const #1 | α (+ missing-prerequisite) | Sourcing `details.event.invocation_id` from `ActiveInvocationRegistry`'s `invocationId` field — which T19a was supposed to install but didn't | **N/A for the missing-prerequisite half** | The defect is genuinely two-layered: (a) cross-finding scope guard pointing at T19a's territory (category α — partial guard coverage), and (b) the prerequisite product doesn't exist (missing-prerequisite-finding binding surface — unchanged by rec V). |
| 14 | T19e (W1) const #3 | γ | Framing the deferral-primitive enumeration as already-discharged ("anti-relitigation pin that lenses correctly disregarded") | **No** | Wasted-passes risk only; no boundary violation. |
| 15 | T19e (W1) cluster scope guards | α | "Cross-finding scope guards naming T19a–T19d by ID with their territory" | **Partial** | Same as #9/#10. |
| 16 | T20 (W1) ScopeGuard 4 | β | "MUST-NOT-weaken existing rule, stable-landmark" — protect existing normative content on hard-ceilings.md | **No** | Guard's predicate doesn't model "would remove/relax existing content." Audit (rec L variant) could grep before/after; rec L postponed. **Need a separate refinement: weaken-detection in the authoring guard.** |
| 17 | T20 (W1) ScopeGuard 1 | δ | Constraint mandated an ownership-attribution sentence; lens correctly disregarded that sentence as cruft (mandated content tripped a different lens) | **N/A** | Edge case — the constraint itself caused a lens hit. Demoting it under rec V would remove the lens hit. **One case where rec V is net-positive even without authoring guard.** |
| 18 | T21 (W1) const-bundle | α + γ | Bundle: `cancellation.md` / `tool.execute(...)` scope guard (α — cross-file, also caught by `[default]`); T22c-checklist scope guard (α — cross-finding); capability-inventory widening interdict (γ — anti-relitigation); stable-landmark constraint (β — MUST-NOT-weaken) | **Mixed** | Same gaps as #9 (α), #14 (γ), #16 (β). |
| 19 | T21 (W1) Path-B scope guard | α | Forbid renaming `(g)` to `(f)` (would violate masked-field series at L511/513) | **Partial** | Pattern: constraint encoded a corpus-state invariant. Audit (rec L variant) could detect via in-file grep; rec L postponed. **Discoverable via authoring guard if guard checks "would violate a structural pattern present elsewhere in the owner page."** |

## 3. Pattern aggregation

Across 19 load-bearing cases in 15 reports:

| Category | Count | Rec V authoring guard catches? | Action needed |
|---|:-:|:-:|---|
| α — cross-finding scope guard | 9 | partial / no | **Refine guard to use Problem-anticipation predicate; add co-resolve recognition** |
| β — MUST-NOT-weaken pin | 2 | no | **Add weaken-detection to guard** |
| γ — anti-relitigation pin | 5 | no | wasted-passes risk only; no correctness risk; **no action needed** |
| δ — externally-owned-literal | 2 | no | audit-layer (rec L); deferred per user direction |
| ε — cross-file (`[default]`) | (not applicable) | (mechanism unaffected) | no action |

The α pattern accounts for nearly half of all load-bearing cases
and includes the highest-risk shape (T19b/W2 case #10: direct
boundary violation if constraint demoted without guard refinement).
The β pattern is small but high-stakes (silent weakening of
existing MUSTs is harder to detect by re-dispatch than fanout
divergence).

## 4. Implications for rec V's authoring guard

The currently-sketched authoring guard in
`docs/spec-review-forensic-meta-analysis.md` §6.1 fires when
"narrowing the constraint would require asserting new content on
an owner page that the owner page does not already say." That
predicate is broken in both directions:

- **Over-fires:** the fixer's job is to add content; the predicate
  literally describes every legitimate addition. As written, the
  guard would refuse every narrowing.
- **Under-fires for category α:** when the addition is content
  another finding owns (T22a1's pre-install of T22c's chunk,
  T19b's authoring of T19c-territory MUSTs into a field comment),
  the predicate is satisfied (the content isn't on the owner
  page yet) but the guard's intended discriminator — "would this
  author content the Problem does not name?" — is what should
  fire, not "would this add content."

### Three concrete refinements

**Refinement 1 — Problem-anticipation predicate.**

Replace the guard predicate with: *"narrowing the constraint
would require asserting content not anticipated by the
Problem text."* Operational definition: the proposed content's
subject NP, object NP, and verb-class must each be referenced
explicitly in the Problem or in the Problem's Solution approach
(approach is non-binding under rec J but still names intended
work). If any of the three is unreferenced, refuse with
`constraint-narrowing-would-author-unanticipated`.

This refinement catches T14 (the "fourth premise" content is
unreferenced by the Problem's premises (i)–(iii)), T22a1's
pre-install of T22c chunk (the `session_shutdown` content is
T22c's named territory, not T22a1's Problem), and most α-cases.

**Refinement 2 — Co-resolve recognition.**

Even when the Problem text is silent, the `## Relationships`
section's `co-resolve` and `must-precede` edges name sibling
findings whose territory is off-limits. Add a second refusal
mode `constraint-narrowing-would-author-co-resolve-siblings-
territory`: if the proposed narrowing would add content that
falls within a `co-resolve` peer's named edit surface (recovered
from that peer's Problem text or its Solution approach), refuse.

This refinement closes the T19a/b/d/e cluster cases (#9, #10,
#12, #13, #15) cleanly. The W1/W2 cluster forensics show the
fixer is already aware of the `co-resolve` peers at runtime
(they're cited in the inner-fixer's NOTES); rec V just needs to
make that awareness binding.

**Refinement 3 — Weaken-detection.**

Add a third refusal mode `constraint-narrowing-would-weaken-
existing-rule`: if the proposed narrowing would remove or relax
an existing MUST / MUST-NOT / SHOULD in the owner page's prose
(detected by diffing the pre/post text of the affected paragraph
and matching modal-verb stripping or scope reduction), refuse.

This closes cases #16 and #18-β.

### Authoring guard, post-refinement (summary)

The guard fires (refuses constraint narrowing) when **any** of:

1. Proposed content not anticipated by Problem or Solution approach.
2. Proposed content within a `co-resolve` / `must-precede` peer's
   named territory.
3. Proposed change weakens an existing MUST / MUST-NOT / SHOULD on
   the owner page.

When all three checks pass, the narrowing proceeds; constraint is
treated as advisory; the fix lands.

## 5. Effect on rec V coverage (revised)

Under the refined authoring guard, recomputing the W2 park coverage
from §6.1:

| Park | Cures? | Refinement that handles it |
|---|---|---|
| T15a | yes (cures) | (no guard needed — stale-prediction detection in fixer) |
| T16a | yes (cures) | (no guard needed — over-fencing narrows cleanly) |
| T13 | no | binding surface is Problem (rec L territory; not rec V) |
| T14 | guard refuses safely | Refinement 1 (Problem-anticipation) |
| T16b | no | binding surface is missing-prerequisite (not rec V) |
| T18a | no | binding surface is score (not rec V) |
| T12 | no | binding surface is category-2 (rec T) |

And forward-checking the W1 cluster on re-dispatch (T19a/b/d/e):

| Park | Pre-rec-V outcome | Post-rec-V (refined guard) |
|---|---|---|
| T19a | cluster-parked, W2 | Guard refuses on Refinement 2 (cluster peers' territory). Same exit shape; no boundary violation. |
| T19b | cluster-parked, W2 | Same. Forensic case #10's "fixer would author T19c-territory MUSTs" is the explicit refusal target. |
| T19d | cluster-parked, W2 | Guard refuses on Refinement 1 (T19a's `invocationId` field not anticipated as a settable obligation in T19d's Problem) + Refinement 2 (co-resolve peer). Missing-prerequisite binding surface remains. |
| T19e | cluster-parked, W2 | Guard refuses on Refinement 2 (cluster peers' territory) for the sibling-territory parts. γ-pattern anti-relitigation parts: no refusal needed (lenses handle). |

The refined guard does not unblock any additional W1 parks beyond
what the original guard sketch claimed — but it **prevents**
several boundary violations the original sketch would have allowed.

## 6. Recommended actions

1. **Update rec V's authoring guard sketch** in
   `docs/spec-review-forensic-meta-analysis.md` §6.1 to enumerate
   the three refinements (Problem-anticipation, co-resolve
   recognition, weaken-detection). The current single-predicate
   sketch is insufficient.

2. **Add T22a1 and the T19 cluster to rec V's validation set.**
   The W2 meta-analysis names T14 as the canary; this sweep
   shows T22a1's cross-finding scope guards and the T19 cluster's
   co-resolve-territory pattern are equal or higher canaries
   because they exercise Refinement 2 (the most novel of the three).
   Re-dispatch sequence: T15a (cures cleanly) → T16a (cures
   cleanly) → T14 (guard refusal expected) → T19 cluster (guard
   refusal expected on cluster-territory pattern) → T22a1 if
   re-dispatched.

3. **Treat γ-pattern (anti-relitigation) cases as wasted-passes
   risk, not correctness risk.** Cases #6, #8, #11, #14, #18-γ
   produce divergence-on-relitigation but no boundary violation.
   This is acceptable under rec V; the divergence-detection exit
   handles them.

4. **Document the deferred rec L gap.** Cases #2 (T22a1 const #1,
   externally-owned literal) and #17 (T20 ScopeGuard 1, mandated
   cruft) cure or partially cure under rec L. With rec L
   postponed, these specific defects either remain (the fixer
   writes the duplicate/cruft and the audit-layer doesn't catch
   it) or are handled by lens findings post-fix. Acceptable for
   the rec-V-only milestone, but on the rec L deferral list.

5. **No change required for category δ and ε.** Externally-owned-
   literal protection (δ, 2 cases) is rec L territory. Cross-file
   (ε) is mechanism-level and unaffected.

## 7. What this sweep did NOT find

- **No T14-shape "fixer manufactures a structural rule the owner
  page lacks" cases in W1 / pre-W1.** T14 is the only W2 case of
  that shape, and the older forensics don't add to it. The
  Problem-anticipation refinement (Refinement 1) is small-corpus
  for this pattern; T14 is the load-bearing test.
- **No cases where constraints prevented a defect the Problem
  text alone would have admitted.** In every case examined, the
  Problem (under the tightened §5.3 taxonomy) is the ultimate
  authority on what work is required; constraints either
  reinforce that or encode a defensive hedge. This is consistent
  with the rec V framing: constraints are advisory, the Problem
  is binding.
- **No cases where the fixer's existing `[default]` cross-file
  scope guard was inadequate.** Every cross-file blast-radius
  case (T19a multi-file fix shape, T22a1 const #4, T21 const
  bundle) was caught by `[default]`, not by constraints. Rec V
  doesn't touch `[default]`.

## Appendix — methodology details

Grep signal phrases (rg-style):
`scope.?guard|must-fix-blocked-by-scope|Solution constraint|constraint #|constraints.*fenc|narrow.*constraint|widen.*constraint|would author|manufacture|fixer.?as.?author|out.?of.?scope|over.?fenc|over.?constrain`

15 reports walked, 200+ matches across them. Verified-by-read
sections:

- `2026-05-16T17-52-36_347871/t19a-…md` lines 1–60 (executive
  summary), 340–420 (RP-3 + "What is NOT recommended").
- `2026-05-15T18-46-12_c1e9c1/t19a-…md` lines 125–175 (RI/RP
  recommendations + "What is NOT recommended").
- `2026-05-15T18-46-12_c1e9c1/t22a1-…md` lines 180–255 (root-cause
  4 + audit-vs-actual comparison).

Spot-checked classifications against the meta-analysis's prior
narrative for consistency.

## Cross-references

- Meta-analysis: `docs/spec-review-forensic-meta-analysis.md`
  (rec V is in §6.1 Tier S; this sweep was commissioned during
  the meta-analysis's rec V drafting, before pi-config ships
  the recommendation).
- W2 forensic reports (already analysed in the meta-analysis,
  not re-walked here):
  `.pi/tmp/spec-fix-failure-forensics/2026-05-17T16-41-31_b4324e/`.
- pi-config side (no commits yet for rec V): expected to touch
  `docs/spec-principles.md`, `agents/spec-review-fixer.md`,
  `agents/spec-diff-fixer.md`, `agents/spec-diff-fix-classifier.md`,
  `agents/spec-diff-fix-loop.md`, `agents/spec-review-parker.md`,
  `prompts/fix-spec-shape-single-findings.md`.

End of sweep.
