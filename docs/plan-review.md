# Triaged Plan Review — plan

_Generated: 2026-06-10T06:20:00Z_
_Plan: docs/plan.md_
_Spec: docs/spec.md_
_Process: bottom-up — the last finding (T32) is addressed first; the first finding (T01) is addressed last._

_Triage tally: 0 blockers, 0 high, 3 medium retained; 18 low discarded; 3 low findings merged into 1 medium finding; 5 NIT dropped; 0 false dropped. One verbatim duplicate (a re-pasted V6b finding under the V11d section) was de-duplicated into T12._

---

# T01 — Slice-ordering narrative overpromises DAG order and hides the V9/V11 interleave and the V9h→V18c backward edge

**Original headings:**
- Slice numbering is not a valid topological order
- V9 / V11 interleave obscured by slice grouping
- V9h → V18c reaches the final slice from mid-plan

**Original section:** plan.md — slice ordering & narrative
**Kind:** ordering
**Importance:** medium
**Score:** 20
**MustFix:** false

## Finding

`plan.md`'s "Vertical slices" intro (line 46) states "Order slices by their dependency DAG; non-linear deps are stated in each leaf's **Deps** field." Read literally this asserts the numeric slice sequence (`V1` → `V18`, and the lettered leaves within) is a topological order of the dependency DAG. It is not: many leaves declare a dependency on a higher-numbered slice — confirmed backward edges include `V1a` → `V7a`, `V4e` → `V9a`/`V6a`/`V11f`, `V2b`/`V2c` → `V5d`, and the longest reach, `V9h` → `V18c` (session-only degraded state depending on the very last leaf of the last slice). `conventions.md` §3 is already more honest about the same fact ("**roughly** ordered by their dependency DAG", "Reorder freely as long as the deps DAG is respected"); the flat imperative in `plan.md` is more absolute than reality and than its own conventions page.

Two specific, counterintuitive cases compound the general claim. (a) **V9/V11 interleave:** the index lists `V9 — Extension host integration` (`V9a`…`V9j`) as a contiguous block immediately followed by `V11 — Binder`, but the leaf `Deps` interleave the two — `V11a` depends on `V9b` and is itself a prerequisite of `V9c`/`V9i`/`V9j`, so `V11a` lands between `V9b` and the rest of V9, not after all of V9. (b) **V9h → V18c:** `V9h` (and therefore `V9g`) cannot be picked up until the entire `V18` SDK-gate cluster has landed, the longest backward edge in the plan, while the narrative presents `V9` long before `V18`.

Nothing breaks at build time: the DAG is acyclic and the canonical pick-next rule is dep-driven (How-to-use step 3 — "Pick the next leaf whose **Deps** are satisfied"), not numeric. The defect is editorial: a reader sequencing by slice number is misled by the backward edges and by the contiguous-block presentation.

## Plan Documents

- `docs/plan.md` — "Vertical slices" intro (line 46); `### V9 — Extension host integration` and `### V11 — Binder` section headers; the `### V9` / `### V18` section ordering (edited)
- `docs/plan_topics/conventions.md` — §3 "Vertical slices" / slice-ordering rule ("Slices are roughly ordered by their dependency DAG") (read-only — the canonical, already-correct wording the fix aligns to)
- `docs/plan_topics/V9h-degraded-unknown-reason.md`, `docs/plan_topics/V9g-session-shutdown.md`, `docs/plan_topics/V18a-capability-inventory.md`, `docs/plan_topics/V18b-inventory-audit.md`, `docs/plan_topics/V18c-version-bump-checklist.md` — `Deps.` fields establishing the backward edges (read-only)

## Spec Documents

None

## Affected Leaves

**Phases:** V9 (Extension host integration), V11 (Binder), V18 (Build-time SDK gates)

**Leaves (implementation order):**

None — the fix is confined to cross-cutting `plan.md` prose and the `### V9` / `### V11` section headers. The backward-edge leaves (`V1a`, `V2b`, `V2c`, `V4e`, `V9c`, `V9g`, `V9h`, `V9i`, `V9j`, `V11a`, `V11b`, `V18a`–`V18c`, et al.) are read to establish the inconsistency; their `Deps` fields are correct and unchanged by the recommended fix.

## Consequence

**Severity:** cosmetic

A reader who trusts the "Order slices by their dependency DAG" claim and sequences by slice number hits unsatisfied `Deps` (e.g. starting `V9c`/`V9i`/`V9j` before `V11a`, or `V9h`/`V9g` before the `V18` cluster). Build correctness is not at risk because the dep-driven pick-next rule (How-to-use step 3) governs actual ordering; the harm is reader confusion, wasted sequencing effort, and an internal contradiction between `plan.md` and `conventions.md`.

## Issue introduction

**Verdict:** multi-commit-interaction (partial — violating evidence is untracked)
**Introducing commits:** `15f69aa` ("pi-loom plan: finish scaffold/template re-pivot from commit 657ee76", 2026-05-26) for the contradictory `plan.md` DAG-ordering prose claim.
**History:** The plan corpus is git-tracked, but only `plan.md`, `conventions.md`, `coverage-matrix.md`, and `leaf-template.md` are committed — the per-leaf files under `docs/plan_topics/` (`V9*`, `V11*`, `V18*`, etc.) are currently untracked, so the backward-edge `Deps` that demonstrate the violation cannot be dated. On the tracked side: the initial plan (`288f191`) described slice grouping only as "editorial only," with no DAG-ordering claim; the absolute claim "Order slices by their dependency DAG" was added to `plan.md` at `15f69aa`, where `conventions.md` already carried the softer, correct "roughly ordered … Reorder freely" wording. The current per-leaf-file plan structure (including the V9/V11 interleave and the `V9h`→`V18c` edge) was authored wholesale in the present uncommitted rewrite. The contradiction therefore emerges from the `15f69aa` prose change interacting with later (untracked) leaf authoring; the V9/V11 and `V9h`→`V18c` halves are co-original with the current structure and have no separate introducing commit.

## Solution Space

**Shape:** single

### Recommendation

In `docs/plan.md`, strike the sentence "Order slices by their dependency DAG; non-linear deps are stated in each leaf's **Deps** field." from the "Vertical slices" intro (line 46) and replace it with wording matching the already-correct framing in `conventions.md` §3: slice numbering is an editorial grouping that only roughly tracks the dependency DAG; the canonical build order is dep-driven (pick the next leaf whose **Deps** are satisfied — How-to-use step 3), not numeric; and backward / non-linear cross-slice dependencies are expected and are declared per-leaf in each leaf's **Deps** field.

Add the two specific signposts at the exact spots a reader is misled:

- Under `### V9 — Extension host integration`, a note that V9 and V11 interleave — naming the actual seam leaves (`V9b → V11a → V9j`/`V9i`/`V9c`), so `V11a` is flagged as a mid-V9 prerequisite — and a note that `V9h` (and therefore `V9g`) depend on `V18c` from the `V18` SDK-gate slice and cannot be picked up until that cluster lands. Mirror a complementary interleave note under `### V11 — Binder`.

Align `plan.md` to `conventions.md` (read-only for this fix; do not weaken or duplicate the conventions wording). Do not reorder or renumber slices: slice IDs are referenced pervasively across leaf `Deps` fields, and edges like `V9h` → `V18c` cannot be removed without restructuring the dependency graph itself.

## Relationships

None

---

# T02 — V2b ship-gate references the runtime AJV validator seam (V8a) outside its declared dependency closure

**Original heading:** Assumes runtime validator seam (V8a) not listed in Deps.
**Original section:** V2b — Type-compat engine
**Kind:** assumptions
**Importance:** medium
**Score:** 20
**MustFix:** false

## Finding

`V2b` (Type-compatibility engine `⊑`) names a runtime validation behaviour it does not depend on. Its `Adds.` introduces "a runtime AJV safety-net for statically-unresolvable operands," and its `Ships when` reads "`npm test` asserts each TYPE rule **and defers unresolved operands to runtime AJV**." That deferral exercises the `SchemaValidator` seam, which is owned by `V8a` (`Adds.`: "the `SchemaValidator` seam (one-pass multi-error AJV wrapper …)").

`V2b` `Deps.` are `V2b-T, V2a, V5d`. Neither path reaches `V8a`: `V2a` depends on `V2a-T, V1a`; `V5d` depends on `V5d-T, V5a, V5b, V2d`; and `V8a` depends only on `V8a-T, H3a`. The validator behaviour the ship-gate clause names is therefore outside `V2b`'s transitive dependency closure.

The leaf's actual binding obligations — `TYPE-1` through `TYPE-10` — are all static compatibility rules; none drives runtime AJV. So the deferral clause is stated as fact without either (a) a dependency that supplies the validator behaviour, or (b) a statement that `V2b` merely emits a deferral marker consumed elsewhere. Sibling leaves that genuinely touch the seam (`V6b`, `V11d`, `V9c`) do list `V8a` in `Deps.`, which marks `V2b`'s omission as an inconsistency rather than an intentional scoping decision.

## Plan Documents

- `docs/plan.md` — Vertical slices / V2 (read-only)
- `docs/plan_topics/V2b-type-compat-engine.md` — V2b leaf, `Adds.` / `Deps.` / `Ships when` (edited)
- `docs/plan_topics/V2b-T-type-compat-engine.md` — paired tests leaf, mirror prose (edited only if it carries the same `Adds.` prose to mirror)
- `docs/plan_topics/V8a-checkpoint-validator-seams.md` — `SchemaValidator` seam owner (read-only)

## Spec Documents

None

## Affected Leaves

**Phases:** V2 — Type system and values

**Leaves (implementation order):**

- `V2b` — Type-compatibility engine (`⊑`) — (modified)
- `V2b-T` — Type-compatibility engine tests — (modified)

## Consequence

**Severity:** correctness

Two reasonable implementers diverge: one reads the deferral clause as requiring `V2b` to wire and exercise the runtime AJV safety-net (a behaviour whose seam is not in `V2b`'s declared dependency closure, so the leaf can be picked before `V8a` is built and that part of the ship-gate cannot be observed); the other treats it as a pure deferral marker and never touches the validator. The leaf's boundary and its dependency ordering depend on which reading is correct.

## Issue introduction

**Verdict:** indeterminate
**Introducing commits:** none identified
**History:** The plan corpus location carrying the defect — `docs/plan_topics/V2b-type-compat-engine.md` (and its `V2b-T` mirror) — is untracked in the git work tree (`git ls-files --error-unmatch` reports "did not match any file(s) known to git"; `git status` shows it as `??`). No commit history exists for the cited leaf files, so the defect cannot be localised to an introducing commit.

## Solution Space

**Shape:** single

### Recommendation

`V2b` only records that an operand is statically unresolvable; the runtime AJV validation runs at the downstream consumer sites (`V6b`, `V11d`) that already own the `SchemaValidator` dependency. First confirm `V2b`'s Tests exercise only the static `⊑` rules (`TYPE-1`…`TYPE-10`) and not runtime AJV; then reword the `Adds.` clause "a runtime AJV safety-net for statically-unresolvable operands" to state that `V2b` emits a deferral marker for statically-unresolvable operands, consumed by the downstream validator sites, and reword the `Ships when` clause "defers unresolved operands to runtime AJV" to "marks unresolved operands for downstream runtime validation." Mirror the `Adds.` change in `V2b-T` if it carries the same prose.

This keeps `V2b`'s dependency closure aligned with its actual (static `⊑`) Tests and introduces no unexercised dependency; the real validator dependency stays at the consumer leaves (`V6b`, `V11d`) that already declare `V8a`. Edge case the implementer must watch: if any `V2b` Tests bullet genuinely requires invoking the validator to go green, instead add `V8a` to `V2b`/`V2b-T` `Deps.`.

## Relationships

- T12 "`V6b` defers `params` validation to the `SchemaValidator` seam without depending on its owning leaf" — same-cluster (the same `V8a`-not-in-`Deps.` pattern on `V6b`; resolves independently per-leaf).
