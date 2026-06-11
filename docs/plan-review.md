# Triaged Plan Review — plan

_Generated: 2026-06-10T20:55:00Z_
_Plan: docs/plan.md_
_Spec: docs/spec.md_
_Process: bottom-up — the last finding (T37) is addressed first; the first finding (T01) is addressed last._

_Triage tally: 0 blocker, 0 high, 3 medium retained; 34 low discarded; 4 low/duplicate findings merged into 4 cluster findings; 16 NIT dropped; 0 false dropped._

---

# T01 — Doc-updates convention is unenforced and several Tests bullets are mislabeled against it

**Original headings:**
- *Doc updates* — no gate verifies per-leaf doc updates; mislabeled bullets
- `` `M-T` Tests bullet mislabeled `Convention: (*Doc updates*)` ``

**Original section:** docs/plan_topics/conventions.md
**Kind:** validation, cruft
**Importance:** medium
**Score:** 25
**MustFix:** false

## Finding

The *Doc updates* cross-cutting rule (`conventions.md` §"Cross-cutting rules (every leaf)") mandates that after each leaf the implementer update `README.md`'s status table, append a dated `CHANGELOG.md` line, and log non-plan discoveries to `notes.md`. Unlike the sibling cross-cutting rules (*Specific exception types only*, *Sequential by default*, *REQ-ID discipline*, *Diagnostic message anchors*), this rule is backed by no verification surface: there is no closing-gate check, lint rule, architectural test, or named manual checklist item that confirms the per-leaf doc artifacts were actually written. The closing-gate automation in `H5a` reconciles REQ-IDs, diagnostic codes, and un-anchored MUSTs, but never inspects `README.md`/`CHANGELOG.md`. The obligation can therefore be skipped on any leaf with no signal — it is the only cross-cutting rule with zero enforcement.

Compounding this, three Tests bullets are tagged `Convention: (*Doc updates*)` but assert something unrelated to the doc-update obligation: `H1a` line 8 (`npm run build`/`npm test` run green on an empty `src/**` tree), `H1a` line 9 (the manifest pins the four Pi SDK peers on one tilde line), and `M-T` line 9 (running the fixture loom produces exactly one appended turn and no diagnostic). Each asserts build or behaviour, not a documentation update. The `M-T` line-9 bullet in particular — "running the fixture loom through the harness produces exactly one appended turn and no diagnostic" — is a pure end-to-end happy-path check of the SLSH-2 round-trip that the leaf's first bullet already names; citing *Doc updates* points an implementer at the wrong obligation and lends a false impression that the doc-updates rule is being mechanically asserted.

The two facets are independent: relabeling the bullets does not add enforcement, and adding enforcement does not correct the mislabels. Both must be addressed.

## Plan Documents

- `docs/plan_topics/conventions.md` — *Doc updates* cross-cutting rule (option-dependent)
- `docs/plan_topics/H1a-scaffold-and-toolchain.md` — Tests bullets (lines 8–9) (edited)
- `docs/plan_topics/M-T-minimal-slash-command.md` — Tests bullet (line 9) (edited)
- `docs/plan_topics/H5a-closing-gate-automation.md` — closing-gate scope (option-dependent)

## Spec Documents

None — the *Doc updates* obligation derives from `CLAUDE.md` Document Updates, not spec text; the fix is internal to plan files.

## Affected Leaves

**Phases:** Horizontal, MVP

**Leaves (implementation order):**

- `H1a` — Project scaffold and toolchain — (modified)
- `M-T` — Minimal end-to-end `.loom` slash command (tests) — (modified)
- `H5a` — REQ-ID / diagnostic-code closing-gate automation — (modified)

## Consequence

**Severity:** advisory

The *Doc updates* rule is the only cross-cutting convention with no verification surface, so per-leaf README/CHANGELOG/notes updates can be silently dropped on any leaf. The mislabeled bullets deepen the gap: a reviewer sees a green `Convention: (*Doc updates*)` Tests bullet and believes the rule is being asserted, when the test checks unrelated build/behaviour — masking the absence of any real doc-update check, and (for `M-T` line 9) misdirecting the test author about which obligation the test closes.

## Issue introduction

**Verdict:** present-since-inception
**Introducing commits:** 288f191 — Add implementation plan with horizontal/MVP/vertical-slice phases (initial *Doc updates* rule, no gate); c6a664e — pi-loom plan: build/update plan for spec.md + review (2026-06-10, mislabeled `Convention: (*Doc updates*)` bullets in H1a/M-T)
**History:** The *Doc updates* cross-cutting rule has existed since the plan's first commit (288f191) and was never paired with a closing-gate or checklist check, so the enforcement gap is present from inception; `git log -S 'Doc updates' -- docs/plan_topics/H5a-closing-gate-automation.md` finds no commit that ever wired doc updates into the gate. The mislabeled `Convention: (*Doc updates*)` Tests bullets in `H1a` and `M-T` entered together when those leaves were authored in their current form at c6a664e (2026-06-10), confirmed via `git log -S 'Convention:\` (*Doc updates*)'` on both files.

## Solution Space

**Shape:** single

This finding carries two independent, both-required obligations: relabel the mislabeled Tests bullets, and make the *Doc updates* rule's enforcement posture explicit. Relabeling does not add enforcement and the enforcement edit does not correct the mislabels, so both are applied.

### Recommendation

Do the relabeling first (it is the smaller, scope-bounded edit that lands the posture edit on a stable baseline), then declare the rule's enforcement posture.

**Relabel the mislabeled Tests bullets.** Re-cite each of the three bullets to the obligation it actually verifies, leaving the assertion text unchanged:

- `H1a` line 8 (`npm run build`/`npm test` green on empty `src/**`) and line 9 (manifest tilde-pin assertion): replace `Convention: (*Doc updates*)` with the convention these actually operationalise — the horizontal phase-categories / scaffold-toolchain obligation (the `typebox` pin bullet on line 10 already cites `host-prerequisites.md §pi-sdk-pin` for comparison).
- `M-T` line 9 (fixture loom produces one appended turn, no diagnostic): replace `Convention: (*Doc updates*)` with the `SLSH-2` REQ-ID it asserts — the same REQ-ID the first bullet cites. `M` is the MVP phase, not a horizontal leaf, so a `Convention.`-style citation is not the right home.

**Declare the *Doc updates* rule's enforcement posture.** Annotate the *Doc updates* cross-cutting rule in `conventions.md` that it is contributor-discipline / review-only with no mechanical gate, and add it to a named release/PR checklist item, mirroring how the architectural-scan blind spots are recorded as documented manual gates elsewhere in the plan. This makes the rule's verification posture explicit so no reader expects enforcement that does not exist. (A mechanical closing-gate `CHANGELOG.md`/`README.md` check in `H5a` is the heavier alternative; adopt it only if such a check is independently wanted.)

**Spec edits:** None.

## Relationships

None

---

# T02 — H6a transitive-completeness governance rule is parked in H6a's Deps, not the authoring conventions

**Original heading:** `H6a` Deps-completeness governance rule placed in `H6a`, not conventions
**Original section:** docs/plan_topics/conventions.md
**Kind:** placement
**Importance:** medium
**Score:** 25
**MustFix:** false

## Finding

`H6a`'s `Deps.` field carries an explanatory parenthetical that ends with a cross-cutting plan-maintenance obligation: *"The set MUST stay transitively complete — any future leaf that can introduce an executable REQ-ID, a numbered-REQ-ID citing test, or an un-anchored MUST is a new dependency of this leaf, otherwise the gate can activate against incomplete coverage."* This is not a fact about `H6a`'s current dependency list; it is a standing rule directed at whoever later adds a new coverage-producing leaf to the plan.

A plan author adding a leaf follows the authoring path the plan advertises: `plan.md` "How to use this plan" (copy `leaf-template.md`, link the leaf into a section, maintain `coverage-matrix.md`) and the cross-cutting rules in `conventions.md`. None of those entry points mentions the transitive-completeness obligation, and there is no reason for a leaf author to read the dependency parenthetical of a terminal release-gate leaf they are not editing. The obligation is correct and well-stated; it is simply located where the person who must act on it will not encounter it.

## Plan Documents

- `docs/plan_topics/H6a-live-corpus-activation.md` — `Deps.` parenthetical (edited)
- `docs/plan_topics/conventions.md` — `## Cross-cutting rules (every leaf)`, *REQ-ID discipline* (edited)
- `docs/plan.md` — "How to use this plan" (read-only; the authoring entry point a plan author actually consults, used to confirm the rule is absent from the advertised path)

## Spec Documents

None

## Affected Leaves

**Phases:** Release gate

**Leaves (implementation order):**

- `H6a` — Live-corpus closing-gate activation (loom 1.0 release gate) — (modified)

(`conventions.md` is a cross-cutting plan file, not a leaf. The rule concerns hypothetical future leaves generically; the fix relocates prose and adds no new leaf and changes no existing leaf's `Tests.`/`Ships when`.)

## Consequence

**Severity:** advisory

A plan author adding a future coverage-producing leaf consults `plan.md`'s authoring steps and `conventions.md`, not `H6a`'s dependency parenthetical, so the transitive-completeness obligation can go unseen. The new leaf is then omitted from `H6a`'s `Deps.`, letting the release gate be sequenced (and activated) before that leaf lands — reconciling the closing gate against incomplete coverage. The rule itself is present and correct, so this is a discoverability gap, not a defect in the rule.

## Issue introduction

**Verdict:** present-since-inception
**Introducing commits:** 5353dd7 ("pi-loom plan: resolve \"Release-gate activation has no owning leaf\"", 2026-06-10)
**History:** The `H6a-live-corpus-activation.md` leaf was created by commit 5353dd7 (`git log --follow` shows it as the leaf's oldest commit; the commit's diffstat adds the file with +15 lines and no deletions). The `Deps.` parenthetical containing "The set MUST stay transitively complete … is a new dependency of this leaf" was part of that initial authoring — `git log -S "stay transitively complete" -- docs/plan_topics/H6a-live-corpus-activation.md` returns only 5353dd7, confirming the phrase entered at the leaf's inception and has not been edited since (the one later commit touching the file, 953e3fa, did not alter it). The placement defect therefore dates from the moment the leaf was authored rather than being introduced by a subsequent edit.

## Solution Space

**Shape:** single

### Recommendation

Relocate the standing plan-maintenance obligation from `H6a`'s `Deps.` parenthetical into the *REQ-ID discipline* cross-cutting rule in `docs/plan_topics/conventions.md`, where leaf authors look for authoring rules.

In `docs/plan_topics/conventions.md`, *REQ-ID discipline*, append a plan-maintenance sentence stating that whenever a new leaf is added that can introduce an executable REQ-ID, a numbered-REQ-ID citing test, or an un-anchored normative MUST, that leaf MUST be added to `H6a`'s `Deps.` so the release gate stays sequenced after every coverage-producing leaf — citing `H6a` by ID and linking `H6a-live-corpus-activation.md`.

In `docs/plan_topics/H6a-live-corpus-activation.md`, strike the sentence beginning "The set MUST stay transitively complete —" from the `Deps.` parenthetical. The parenthetical's preceding sentences (which explain that the current set is the complete coverage-producing set) stay; optionally replace the struck sentence with a back-pointer such as "see *REQ-ID discipline* in `conventions.md` for the obligation to keep this set complete as leaves are added." The relocated text must preserve the consequence clause ("otherwise the gate can activate against incomplete coverage") so the maintenance rule still states why it matters at its new home.

## Relationships

- T03 "Live-corpus gate activation has no documented rollback and relies on prose-only Deps completeness" — same-cluster (both touch `H6a`'s `Deps.` transitive-completeness prose; that finding addresses the lack of a mechanical guard / rollback, this one addresses where the authoring rule lives — resolve independently)

---

# T03 — Live-corpus gate activation has no documented rollback and relies on prose-only Deps completeness

**Original heading:** Live-corpus gate flip has no stated rollback; discipline-only Deps completeness
**Original section:** docs/plan_topics/H6a-live-corpus-activation.md
**Kind:** risk
**Importance:** medium
**Score:** 25
**MustFix:** false

## Finding

`H6a` is the terminal release-gate leaf that flips `H5a`'s closing gate from its seeded-fixture footing to its live-corpus footing. From the moment this leaf lands, an unmapped executable REQ-ID, a coverage-matrix-mapped numbered REQ-ID with no citing test, or an un-enumerated un-anchored MUST reddens `npm test` for every contributor against `main` — a blast radius spanning all contributors' CI.

Two risk-management gaps sit on that flip. First, the leaf states no rollback posture: nothing in `H6a` records that reverting the activation commit returns the gate to the `H5a` seeded-fixture footing and stops `main` reddening on coverage that later work is still landing. Recovery exists by construction (revert the commit) but is undocumented, so an operator facing a red `main` has no stated recovery step. Second, the completeness of `H6a`'s `Deps.` set — the property that guarantees the gate only activates once every coverage-producing leaf has landed — is enforced only by the prose "The set MUST stay transitively complete … any future leaf … is a new dependency of this leaf." There is no mechanical guard: a future leaf that introduces an executable REQ-ID but is not added to `H6a`'s `Deps.` lets the gate activate against incomplete coverage, reddening `main` without warning.

## Plan Documents

- `docs/plan_topics/H6a-live-corpus-activation.md` — Adds / Deps (edited)
- `docs/plan_topics/H5a-closing-gate-automation.md` — Adds (option-dependent)
- `docs/plan_topics/conventions.md` — *REQ-ID discipline* (read-only)
- `docs/plan.md` — Release gate (read-only)
- `docs/plan_topics/coverage-matrix.md` — release-gate clause (read-only)

## Spec Documents

None — the fix is internal to plan files.

## Affected Leaves

**Phases:** Horizontal

**Leaves (implementation order):**

- `H5a` — REQ-ID / diagnostic-code closing-gate automation — (modified under the canary option; otherwise read-only)
- `H6a` — Live-corpus closing-gate activation (loom 1.0 release gate) — (modified)
- `<new>` — warn-only live-corpus canary run (added, option-dependent)

## Consequence

**Severity:** advisory

If `H6a` ships unfixed, a bad flip — whether from an incomplete `Deps.` set or from live coverage not yet closed — turns `main`'s `npm test` red for every contributor with no documented recovery step, and the only safeguard against premature activation is an authoring convention a future leaf author can silently violate. The leaf itself remains shippable and the gate behaves correctly; the gap is operational risk posture, not gate correctness.

## Issue introduction

**Verdict:** single-commit
**Introducing commits:** `5353dd7` (2026-06-10) — "pi-loom plan: resolve \"Release-gate activation has no owning leaf\""
**History:** The `H6a` leaf was created whole by `5353dd7`. Both gaps were present in that creating commit: the leaf carried no revert/rollback note, and the `Deps.`-completeness footnote ("The set MUST stay transitively complete …") was already prose-only with no mechanical guard. The only later edit to the leaf, `953e3fa` (2026-06-10), widened that same footnote to add the numbered-REQ-ID citing-test mode but neither introduced a rollback path nor changed the discipline-only nature of the completeness obligation. The defect is therefore present since the leaf's inception.

## Solution Space

**Shape:** single

This finding carries two independent obligations: documenting the rollback path, and adding a guard for the prose-only Deps-completeness reliance. They land on different surfaces and neither resolves the other.

### Recommendation

Document the rollback path on the existing `H6a` leaf first, then add a warn-only live-corpus canary ahead of the hard flip on that stable baseline:

- **Rollback documentation (do first).** Add a revert/recovery clause to `H6a`'s `Adds.` recording that reverting the `H6a` activation commit returns the closing gate to the `H5a` seeded-fixture footing, so `main` stops reddening on incomplete live coverage. This is the smaller, scope-bounding edit and lands entirely on the existing leaf with no new mechanism or sequencing; it documents recovery only and does not by itself lower the probability of a bad flip.
- **Warn-only live-corpus canary (do second).** Introduce a `<new>` canary leaf (or a warn-only mode on the existing gate) that reconciles the same live spec REQ-ID / `spec_topics/**` MUST / live-test sets `H6a` hard-fails on, emitting findings without failing CI, and sequence it immediately before `H6a`'s hard-fail flip. `H5a`'s gate may need a warn-only mode to support this. This surfaces coverage gaps before they can redden `main`, directly mitigating the prose-only Deps-completeness reliance.

The canary's reconciliation set MUST stay in lockstep with the sets `H6a` hard-fails on; keep the Deps-completeness obligation stated in one place so the warn-only and hard-fail footings cannot drift apart.

## Relationships

- T02 "H6a transitive-completeness governance rule is parked in H6a's Deps, not the authoring conventions" — same-cluster (both touch `H6a`'s `Deps.` transitive-completeness prose; resolve independently)
