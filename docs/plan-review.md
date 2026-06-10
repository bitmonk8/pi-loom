# Triaged Plan Review — plan

_Generated: 2026-06-10T06:20:00Z_
_Plan: docs/plan.md_
_Spec: docs/spec.md_
_Process: bottom-up — the last finding (T32) is addressed first; the first finding (T01) is addressed last._

_Triage tally: 0 blockers, 0 high, 6 medium retained; 18 low discarded; 3 low findings merged into 1 medium finding; 5 NIT dropped; 0 false dropped. One verbatim duplicate (a re-pasted V6b finding under the V11d section) was de-duplicated into T12._

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

---

# T03 — `DIAG-2` describes a `src/**` emission scan the closing gate does not perform

**Original heading:** DIAG-2 over-claims "a code emitted by `src/**`" vs the asserting-test reconciliation gate
**Original section:** V7b — Code registry
**Kind:** overclaim
**Importance:** medium
**Score:** 22
**MustFix:** false

## Finding

The `V7b` / `V7b-T` leaves both phrase their `DIAG-2` test as: *"the registry is closed — a code emitted by `src/**` with no registry row fails the gate."* The gate that actually enforces closure is the `H5a` closing gate, whose `Adds.` defines its registry-reconciliation behaviour as failing on *"a registry code with no asserting test, an asserted code absent from the registry"* — and the `conventions.md` *Diagnostic message anchors* rule frames the same obligation in terms of tests that assert a diagnostic code. The gate reconciles **test-asserted** codes against the registry; it performs no scan of `src/**` emission sites, and `Diagnostic.code` is typed `string` (per the diagnostics primitive), not a closed union the toolchain could enumerate statically.

The consequence is a coverage gap the `DIAG-2` wording papers over: a code emitted somewhere in `src/**` but asserted by no test passes the gate silently, because nothing in the `H5a` reconciliation looks at emission sites. A faithful implementer who writes the `DIAG-2` fixture exactly as worded — emit a code with no registry row, do not assert it — gets a green gate where the leaf's `Ships when.` ("fail red for the intended reason" for `V7b-T`) demands red. The fixture cannot demonstrate the stated closure property because that property is not the one the gate enforces.

The fix is to align the `DIAG-2` wording (and `V7b`'s `Ships when.`) with the asserting-test reconciliation the gate actually performs, in both the implementation leaf and its paired test leaf.

## Plan Documents

- `docs/plan_topics/V7b-code-registry.md` — `Tests.` (`DIAG-2`) and `Ships when.` (edited)
- `docs/plan_topics/V7b-T-code-registry.md` — `Tests.` (`DIAG-2`) (edited)
- `docs/plan_topics/H5a-closing-gate-automation.md` — `Adds.` gate-reconciliation definition (read-only)
- `docs/plan_topics/conventions.md` — *Diagnostic message anchors* cross-cutting rule (read-only)

## Spec Documents

None — the fix is internal to the plan leaf wording. The diagnostics registry already states closure over *codes* (rule 2, `code-registry-runtime.md`) and `Diagnostic.code` is already typed `string`; neither needs editing.

## Affected Leaves

**Phases:** Vertical V7 (Diagnostics)

**Leaves (implementation order):**

- `V7b-T` — Diagnostic code registry and closing gate (tests) — (modified)
- `V7b` — Diagnostic code registry and closing gate — (modified)

## Consequence

**Severity:** correctness

A diagnostic code that is emitted in `src/**` but asserted by no test escapes the closing gate, so the registry's "closed" guarantee is weaker than `DIAG-2` claims. An implementer building the `DIAG-2` fixture from the literal wording (emit-but-don't-assert) produces a green gate, which contradicts `V7b-T`'s red-for-the-intended-reason ship condition and lets the leaf certify a closure property the gate never checks.

## Issue introduction

**Verdict:** indeterminate
**Introducing commits:** none identified
**History:** The cited plan leaf files `docs/plan_topics/V7b-code-registry.md` and `docs/plan_topics/V7b-T-code-registry.md` are untracked in the git work tree (never committed), so no commit history records when the over-claiming `DIAG-2` wording entered the corpus. The repository is a git work tree and `docs/plan.md` is tracked, but the defect lives entirely in these uncommitted leaf files.

## Solution Space

**Shape:** single

### Recommendation

In `docs/plan_topics/V7b-code-registry.md`:

- In the `Tests.` `DIAG-2` bullet, replace `a code emitted by \`src/**\` with no registry row fails the gate` with wording that names the reconciliation the `H5a` gate actually performs — `a code asserted by a test with no registry row fails the gate` (the inverse direction, "a registry code with no asserting test fails the gate", is already covered by the gate's `Adds.` and may be stated alongside).
- In the `Ships when.` field, replace `reconciles emitted codes against the registry` with `reconciles test-asserted codes against the registry`.

In `docs/plan_topics/V7b-T-code-registry.md`, apply the identical `DIAG-2` bullet replacement so the paired test leaf matches.

Edge case for the implementer: because the gate has no `src/**` emission scan and `Diagnostic.code` is typed `string`, true emission-site closure (catching an emitted-but-never-asserted code) is out of scope for this leaf and is not what `DIAG-2` should claim. If emission-site closure is later wanted, it requires a distinct mechanism (a closed-union `code` type or an emission-site AST scan with a dynamic-string caveat) introduced under its own leaf — do not smuggle it into the `DIAG-2` reword.

## Relationships

- T23 "PIC-21 (renderer exception safety) has a coverage-matrix row but no asserting test in V7a" — same-cluster (both concern closure evidence reconciled through the `H5a` gate; resolve independently).
- T21 "Asserted diagnostic code `loom/parse/empty-enum-body` is absent from the parse registry" — same-cluster (exercises the same `H5a` asserting-test reconciliation this finding clarifies; independent leaf `V5a`).
- T04 "Truncated diagnostic code: `V5b` cites `loom/parse/duplicate-discriminator`, registry has `loom/parse/duplicate-discriminator-value`" — same-cluster (a test-asserted code that must reconcile against the registry under the same gate; independent leaf).

---

# T04 — Truncated diagnostic code: `V5b` cites `loom/parse/duplicate-discriminator`, registry has `loom/parse/duplicate-discriminator-value`

**Original heading:** Diagnostic code truncated: `duplicate-discriminator` vs registry `duplicate-discriminator-value`
**Original section:** V5b — Discriminated unions and recursion
**Kind:** consistency
**Importance:** medium
**Score:** 22
**MustFix:** false

## Finding

The paired leaves `V5b` and `V5b-T` each list a `Tests.` bullet asserting the discriminator-violation codes `loom/parse/non-string-discriminator`, `loom/parse/ambiguous-discriminator`, `loom/parse/missing-discriminator`, `loom/parse/duplicate-discriminator`, and `loom/parse/nested-discriminator`. Four of these are registered verbatim in `code-registry-parse.md`. The fifth, `loom/parse/duplicate-discriminator`, is not: the parse registry (`code-registry-parse.md`, the "two variants share the same discriminator value" row) and `schemas.md` register the code as `loom/parse/duplicate-discriminator-value`. The plan citation has dropped the `-value` suffix.

Diagnostic codes must be reproduced verbatim against the registry. As written, the asserted code `loom/parse/duplicate-discriminator` has no registry row, while the registered code `loom/parse/duplicate-discriminator-value` has no asserting test. The duplicate-discriminator-value behaviour therefore ships with no closing test, and the leaf asserts a phantom code that the spec never defines.

## Plan Documents

- `docs/plan_topics/V5b-disc-unions-recursion.md` — Tests (edited)
- `docs/plan_topics/V5b-T-disc-unions-recursion.md` — Tests (edited)

## Spec Documents

None

## Affected Leaves

**Phases:** Vertical slice V5 (Schemas, descriptions, schema-subset)

**Leaves (implementation order):**

- `V5b-T` — Discriminated unions, recursion, and cycle detection (tests) — (modified)
- `V5b` — Discriminated unions, recursion, and cycle detection — (modified)

## Consequence

**Severity:** correctness

An implementer faithfully writing the test asserts `loom/parse/duplicate-discriminator`, a code that is never emitted, while the real `loom/parse/duplicate-discriminator-value` behaviour goes untested. The `H5a` closing gate, which reconciles test-asserted codes against the registry, fails on the phantom code; a reviewer reconciling by hand could diverge on whether to register the truncated code or correct the citation.

## Issue introduction

**Verdict:** indeterminate
**Introducing commits:** none identified
**History:** the plan leaf files carrying the defect (`docs/plan_topics/V5b-disc-unions-recursion.md` and `docs/plan_topics/V5b-T-disc-unions-recursion.md`) are untracked in the git working tree — `git ls-files` returns nothing for either and `git status` reports both as `??`. The truncated token `loom/parse/duplicate-discriminator` appears in no committed revision (`git log -S`/`-G` over tracked history surfaces only the correct `loom/parse/duplicate-discriminator-value` in the spec). The defect therefore exists only in the uncommitted working tree; no commit introduced it.

## Solution Space

**Shape:** single

### Recommendation

In both `docs/plan_topics/V5b-disc-unions-recursion.md` and `docs/plan_topics/V5b-T-disc-unions-recursion.md`, change the citation `loom/parse/duplicate-discriminator` to `loom/parse/duplicate-discriminator-value` in the discriminator-violations `Tests.` bullet. Edit the two leaves together so the paired tests/implementation bullets stay mirror-consistent. The corrected spelling is the registry-exact code from `code-registry-parse.md`; the other four codes in the same bullet are already correct and must be left unchanged.

## Relationships

- T21 "Asserted diagnostic code `loom/parse/empty-enum-body` is absent from the parse registry" — same-cluster (same class of asserted-parse-code-vs-registry mismatch that fails the `H5a` closing gate; resolves independently).
- T13 "`V6e`/`V6e-T` assert a non-existent `loom/parse/...` diagnostic code instead of the registered `loom/load/frontmatter-value-out-of-range`" — same-cluster (registry-citation defect failing the closing gate; resolves independently).
- T05 "Bare diagnostic code `binder-model-strict-capability-unknown` missing `loom/load/` prefix" — same-cluster (bare/malformed code citation absent from registry; resolves independently).

---

# T05 — Bare diagnostic code `binder-model-strict-capability-unknown` missing `loom/load/` prefix

**Original heading:** Diagnostic code cited without namespace prefix
**Original section:** V11a — Binder-model resolution and strict-capability probe
**Kind:** naming
**Importance:** medium
**Score:** 22
**MustFix:** false

## Finding

The second `Tests.` bullet of `V11a` (and its `V11a-T` mirror) reads:

> The `strictCapable` probe: `false` → `loom/load/binder-model-not-strict-capable` (E); `undefined` → `binder-model-strict-capability-unknown` (W); `true` → resolves.

The first asserted code carries its full `loom/load/` namespace, but the second is written bare as `binder-model-strict-capability-unknown`. The diagnostics registry (`spec_topics/diagnostics/code-registry-load.md`) registers this warning only under its full name, `loom/load/binder-model-strict-capability-unknown`; the bare form appears nowhere in the corpus.

Diagnostic codes must be reproduced verbatim. Per `conventions.md` *REQ-ID discipline*, "any asserted code not in the registry is a CI failure" at the loom 1.0 closing gate (`H5a`). A test asserting the bare string therefore fails the gate on two arms simultaneously: the asserted code is not in the registry, and the registered `loom/load/binder-model-strict-capability-unknown` warning is left with no asserting test. Both `V11a` and `V11a-T` carry the identical bare form, so the paired leaves stay mirror-consistent but both wrong.

## Plan Documents

- `docs/plan_topics/V11a-binder-model-resolution.md` — Tests (edited)
- `docs/plan_topics/V11a-T-binder-model-resolution.md` — Tests (edited)

## Spec Documents

None — `loom/load/binder-model-strict-capability-unknown` is already registered in `code-registry-load.md`; the fix is internal to the two plan leaves.

## Affected Leaves

**Phases:** Vertical slice V11 (Binder)

**Leaves (implementation order):**

- `V11a-T` — Binder-model resolution and strict-capability probe (tests) — (modified)
- `V11a` — Binder-model resolution and strict-capability probe — (modified)

## Consequence

**Severity:** correctness

A faithful implementer transcribing the bullet asserts a code that is absent from the registry, which the `H5a` closing gate flags as a CI failure, while the genuine registered warning ships with no asserting test. The leaf cannot reach green as written.

## Issue introduction

**Verdict:** indeterminate
**Introducing commits:** none identified
**History:** The cited leaf files `docs/plan_topics/V11a-binder-model-resolution.md` and `docs/plan_topics/V11a-T-binder-model-resolution.md` are untracked in the git work tree (never committed); `git log --follow` over both files and `git log -S` over the bare-code defect token return no history, so the introducing change cannot be localised to a commit.

## Solution Space

**Shape:** single

### Recommendation

In the second `Tests.` bullet of both `docs/plan_topics/V11a-binder-model-resolution.md` and `docs/plan_topics/V11a-T-binder-model-resolution.md`, replace the bare `binder-model-strict-capability-unknown` with the registry-exact `loom/load/binder-model-strict-capability-unknown`. The corrected bullet reads:

> The `strictCapable` probe: `false` → `loom/load/binder-model-not-strict-capable` (E); `undefined` → `loom/load/binder-model-strict-capability-unknown` (W); `true` → resolves.

Apply the identical edit to both leaves so the implementation/tests pair stays mirror-consistent.

## Relationships

- T21 "Asserted diagnostic code `loom/parse/empty-enum-body` is absent from the parse registry" — same-cluster (asserted code absent from registry → H5a gate failure; resolves independently).
- T04 "Truncated diagnostic code: `V5b` cites `loom/parse/duplicate-discriminator`, registry has `loom/parse/duplicate-discriminator-value`" — same-cluster (truncated code form → registry miss; resolves independently).
- T13 "`V6e`/`V6e-T` assert a non-existent `loom/parse/...` diagnostic code instead of the registered `loom/load/frontmatter-value-out-of-range`" — same-cluster (wrong namespace → registry miss → H5a gate failure; resolves independently).
