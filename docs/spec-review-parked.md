# Findings parked from `spec-review.md` — pi-loom

_This file collects findings physically removed from the
consolidated spec-review document because they cannot be addressed
by the current `/fix-spec-shape-single-findings` pipeline. Each
entry records the reason for parking and the path to the per-finding
forensic report. Parked findings must be reshaped (typically by
splitting bimodal obligations, narrowing scope, demoting MUSTs,
or capping the prose the fix is allowed to add) before being
re-introduced into the live review document._

_Cascade-parked findings (parked solely because they depended on
another parked finding) typically un-park automatically once the
upstream finding's reshape is re-introduced and successfully fixed,
unless they have substantive shape problems of their own._

---

## T03e — Update `spec.md` Host runtime item 1: rephrase to delegate the `engines.node`-equality check to the H1 SDK surface-inventory test

> **PARKED** — 2026-05-19
> **Reason:** Category 1 (malformed finding — constraints binding surface; the originating finding's Solution constraints fence every viable remediation that the lens admits). The inner spec-diff-fix-loop's severity-weighted triage exited on must-fix-blocked-by-scope-guard (plan §Change A clause 1 escape): a raised lens finding outranked this originating finding in importance, but every viable remediation would violate a class-1 or class-2 scope guard forwarded from the top-level fixer. FIXCOUNTS: none. Loop notes: Classifier early-exit on pass 1 via Rec O pass-level shadow-budget gate; sub-rationale score-budget-exhausted-trust-override-suppressed; S=25 (T03e heading absent from spec-review.md, defaulted from cluster siblings T03b/T03c/T03d carrying Importance=medium → score 25), Σ_shadow=101, breach margin Σ_shadow−S=76 (multiplier ≈ 4.04× exceeds k=3 gate threshold of 75); 2 non-blocker raised findings counted toward shadow budget, 1 trust-overridden; 7 tier-1 lenses dispatched, 4 silent, 3 raised (assumptions/consistency/implementability merged per triage Step 1.5 into Finding A high:1 with trust-override impact entry on reader mental-model of cross-package Pi engines.node gating; traceability raised Finding B NIT:1 on bare-paraphrase cross-reference style). severity p1 raised{high:1,NIT:1} fixed{} deferred{} blocked{high:1,NIT:1}; stage1=1; narrowings=0+0+0+0; stage1Touched=0 mode-e-refusals=0. Originating T03e finding admits three reshape paths per classifier hints: raise T03e's score to ~100..125, narrow Solution approach to the revert option ("matching ... floor"), or split into verifier-naming + hyperlink-style axes. Snapshot refs retained for forensics under refs/loom/snapshots/2026-05-19T10-54-34_d30c6e. A human must resolve the guard-vs-severity collision (relax the guard, split this finding so the higher-importance raised finding is no longer downstream of the guard, or accept the trade-off and annotate the raised finding as out-of-scope) before re-introducing this finding.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-19T10-47-33_8360aa/t03e-update-spec-md-host-runtime-item-1-rephrase-to-delegate-the-engines-node-eq.md

# T03e — Update `spec.md` Host runtime item 1: rephrase to delegate the `engines.node`-equality check to the H1 SDK surface-inventory test

**Kind:** consistency, traceability
**Importance:** medium
**Atomicity:** atomic
**Shape:** single
**State:** reduced

## Problem

`docs/spec.md` Orientation > Prerequisites > Host runtime item 1 (the **Node version floor** bullet) currently asserts that the loom runtime's Node floor matches `@mariozechner/pi-coding-agent`'s `engines.node` floor as a bare prose equivalence, with no named audit mechanism. T03b adds a `pi-engines-node` row to `SDK_SURFACE_INVENTORY` in `docs/plan_topics/h1-scaffold.md`, and T03f extends the H1 SDK surface-inventory literal-read test to assert cross-package equality between the two floors; the spec sentence needs to name that test as the auditor rather than reading like a manual coincidence between two unrelated literals.

## Solution approach

In `docs/spec.md` Orientation > Prerequisites > Host runtime item 1 (the **Node version floor** bullet), rewrite the phrase "matching `@mariozechner/pi-coding-agent`'s `engines.node` floor" to "verified equal to `@mariozechner/pi-coding-agent`'s `engines.node` floor by the H1 SDK surface-inventory test." The rest of item 1 — the literal `>=20.6.0`, the SemVer-comparison parenthetical, the `details.kind = "node-floor"` discriminator forward-link, the `loom/load/host-incompatible` emission contract forward-link, and the bump-procedure forward-link — stands unchanged.

## Solution constraints

- The `pi-engines-node` `SDK_SURFACE_INVENTORY` row, the cross-package equality assertion, and the PIC bump-procedure step 3 narrative are owned by T03b, T03f, and T03d respectively — out of scope here.

## Relationships

- T03b "Add `pi-engines-node` row to `SDK_SURFACE_INVENTORY` in `h1-scaffold.md`" — must-follow (this finding's sentence references the test row T03b adds).
- T03f "`h1-scaffold.md` manifest assertion ..." — same-cluster (the test extension T03f installs is what the new sentence delegates to).

---

## T03b — Add `pi-engines-node` row to `SDK_SURFACE_INVENTORY` in `h1-scaffold.md`

> **PARKED** — 2026-05-19
> **Reason:** Cascaded from parking of T03e — Update `spec.md` Host runtime item 1: rephrase to delegate the `engines.node`-equality check to the H1 SDK surface-inventory test: this finding's ## Relationships block declares an ordering edge (must-precede or must-follow) on the parked finding, so its preconditions are no longer satisfied in spec-review.md.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-19T10-47-33_8360aa/t03e-update-spec-md-host-runtime-item-1-rephrase-to-delegate-the-engines-node-eq.md

# T03b — Add `pi-engines-node` row to `SDK_SURFACE_INVENTORY` in `h1-scaffold.md`

**Kind:** completeness, traceability
**Importance:** medium
**Atomicity:** atomic
**Shape:** single
**State:** reduced

## Problem

The `SDK_SURFACE_INVENTORY` constant described in `docs/plan_topics/h1-scaffold.md` (under the SDK surface-inventory literal-read test bullet of the H1 leaf's test framework) enumerates the probe-relevant pinned surfaces (`node-floor`, `abortsignal-member`, `namespace-function`, `type-union-snapshot`, `load-time-resolution`, `strict-capability-probe`, `api-coverage`, `peer-dep-range`) but has no row representing Pi's `engines.node` floor as a cross-package surface. T03f extends the test infrastructure to assert cross-package equality between the loom package's `engines.node` literal and Pi's `engines.node` field, and T03d / T03e reference that assertion from the PIC bump procedure and the `spec.md` Host runtime item; without an inventory row holding Pi's floor as its own surface, that cross-package assertion has no shared source of truth with the rest of the inventory and degrades into a one-off test.

## Solution approach

Add one new row to the `SDK_SURFACE_INVENTORY` enumeration in `docs/plan_topics/h1-scaffold.md`, of the form `{ kind: "pi-engines-node", literal: ">=20.6.0" }`, alongside the existing `node-floor`, `abortsignal-member`, `namespace-function`, `type-union-snapshot`, `load-time-resolution`, `strict-capability-probe`, `api-coverage`, and `peer-dep-range` rows. The kind tag `pi-engines-node` is the surface name the cross-package equality assertion in T03f reads, and the literal records Pi's current `engines.node` floor so a future Pi bump that changes the floor lights up the assertion red. Frame the row as a sibling of the existing `node-floor` row (which holds the loom package's own floor) so the two together are the source of truth the cross-package equality test asserts on.

## Solution constraints

- The new row's `kind` discriminator must be the literal string `pi-engines-node` — T03d, T03e, and T03f all consume this surface name as their dedup key; a different tag silently breaks the chain.
- Do not introduce a parallel constant, a new test bullet, or a new H1 sub-leaf for it.
- The cross-package equality test, the PIC bump-procedure narrative, and the `spec.md` Host runtime sentence are owned by T03f, T03d, and T03e respectively — out of scope here.

## Relationships

- T03d "Update PIC Pi version-bump procedure step 3 ..." — must-precede (T03d's narrative names this row).
- T03e "Update `spec.md` Host runtime item 1 ..." — must-precede (T03e's sentence names the test that consumes this row).
- T03f "`h1-scaffold.md` manifest assertion ..." — must-precede (T03f's test extension uses this row as its source of truth).

---

## T03d — Update PIC Pi version-bump procedure step 3: replace manual-compare instruction with H1-test-fails-red narrative

> **PARKED** — 2026-05-19
> **Reason:** Cascaded from parking of T03e — Update `spec.md` Host runtime item 1: rephrase to delegate the `engines.node`-equality check to the H1 SDK surface-inventory test: this finding's ## Relationships block declares an ordering edge (must-precede or must-follow) on the parked finding, so its preconditions are no longer satisfied in spec-review.md.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-19T10-47-33_8360aa/t03e-update-spec-md-host-runtime-item-1-rephrase-to-delegate-the-engines-node-eq.md

# T03d — Update PIC Pi version-bump procedure step 3: replace manual-compare instruction with H1-test-fails-red narrative

**Kind:** consistency, prescription
**Importance:** medium
**Atomicity:** atomic
**Shape:** single
**State:** reduced

## Problem

Step 3 ("Re-confirm the `engines.node` floor") of the `## Pi version bump procedure` (anchor `pi-version-bump-procedure`) in `docs/spec_topics/pi-integration-contract.md` currently instructs the contributor to manually compare `@mariozechner/pi-coding-agent`'s `engines.node` floor at the candidate version against the loom `package.json#engines.node` literal. Once T03b adds the `pi-engines-node` row to `SDK_SURFACE_INVENTORY` in `docs/plan_topics/h1-scaffold.md` and T03f extends the H1 manifest assertion to a cross-package equality check anchored on that row, the manual compare is obviated — the H1 test fails red automatically when the upstream floor moves, and the surviving manual-compare prescription contradicts the automatic detection on which side is authoritative.

## Solution approach

Rewrite step 3 of `## Pi version bump procedure` so the body reframes the step around the cross-package `engines.node` equality test (the H1 assertion T03f extends, sourced from the `pi-engines-node` `SDK_SURFACE_INVENTORY` row T03b adds) as the mechanical detector for upstream-floor movement, rather than a manual compare the contributor performs at bump time. Preserve the step's enumeration of co-edit sites that must move in the same commit when the test fails red — the loom `package.json#engines.node` literal, the [Step 0 (a)](#entry-capability-probe) comparator-and-floor reference, the [`spec.md` — Host runtime obligation 1](../spec.md#orientation) sentence, and the H1 assertion itself — so contributors retain the closure list the manual-compare narrative previously carried.

## Solution constraints

- Preserve the `id="pi-version-bump-procedure"` heading anchor and the integer step number `3` (inbound links and the procedure's existing step ordering depend on both).
- Co-resolve with T03f in the same commit; the bump procedure and the test must not disagree on which side is authoritative for the upstream-floor.

## Relationships

- T03b "Add `pi-engines-node` row to `SDK_SURFACE_INVENTORY` in `h1-scaffold.md`" — must-follow (the test row this finding's narrative names is added by T03b).
- T03f "`h1-scaffold.md` manifest assertion ..." — same-cluster (the test extension T03f installs is what this narrative delegates to).

---

