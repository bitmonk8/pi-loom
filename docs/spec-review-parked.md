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

## T18c — Widen spec.md Runtime observability bullet to forward-link the null-policy

> **PARKED** — 2026-05-19
> **Reason:** Category 1 (malformed finding — constraints binding surface; the originating finding's Solution constraints fence every viable remediation that the lens admits). The inner spec-diff-fix-loop's severity-weighted triage exited on must-fix-blocked-by-scope-guard (plan §Change A clause 1 escape): a raised lens finding outranked this originating finding in importance, but every viable remediation would violate a class-1 or class-2 scope guard forwarded from the top-level fixer. FIXCOUNTS: 4. Loop notes: Sub-rationale score-budget-exhausted-trust-override-suppressed (Rec O pass-level shadow-budget gate). S=25, Σ_shadow=76, breach margin Σ-S=51 (multiplier ≈ 3.04× exceeds k=3 threshold of 75 by 1 point); 3 would-be trust-override admissions on pass 2 counted toward shadow budget. T18c heading absent from spec-review.md (top-level fixer already removed it); classifier defaulted to severity=medium / S=25 / mustFix=false per heading-absent lookup rule. Severity tally: p1 raised{high:1,medium:1,low:2} fixed{high:1,medium:1,low:2} deferred{} blocked{}; p2 raised{high:1,medium:3,NIT:1} fixed{} deferred{} blocked{high:1,medium:3,NIT:1} (the blocker is a cross-page contract contradiction Pass-1 fixes introduced: the prompt-mode Ok(v) "audience" parenthetical at docs/spec.md L52 inverts slash-invocation.md L19's normative contract that the Ok return value is NOT surfaced to the user). Stage trajectory: stage1=1. Narrowings tally: narrowings=0+0+0+0. Stage-transition tally: stage1Touched=1 mode-e-refusals=0. Snapshot namespace refs/loom/snapshots/2026-05-19T12-13-42_29db80 retained (baseline, baseline-post-top-level, pass-1, pass-2) for forensics. A human must resolve the guard-vs-severity collision (relax the guard, split this finding so the higher-importance raised finding is no longer downstream of the guard, or accept the trade-off and annotate the raised finding as out-of-scope) before re-introducing this finding.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-19T10-47-33_8360aa/t18c-widen-spec-md-runtime-observability-bullet-to-forward-link-the-null-policy.md

# T18c — Widen spec.md Runtime observability bullet to forward-link the null-policy

**Kind:** completeness
**Importance:** medium
**Atomicity:** atomic
**Shape:** single
**State:** reduced

## Problem

The **Runtime observability** bullet under `### Scope` in `docs/spec.md` (Orientation > Scope) describes only failure-side events on the `loom-system-note` channel and neither names nor forward-links the success-side null-policy — that a loom terminating with `Ok(v)` emits no `loom-system-note` event. Reviewers auditing the operator-visibility contract from this aggregator bullet must triangulate against the PIC **Runtime event channel** section and `docs/spec_topics/slash-invocation.md` to confirm the absence of a success-side emission is deliberate. Sibling T18a installs the central success-side null-policy paragraph in the PIC **Runtime event channel** section and T18b installs the per-mode operator-side null sentences in `slash-invocation.md`, but the spec.md aggregator bullet still gives no forward link to either, so the rule cannot be reached from the canonical entry surface.

## Solution approach

Widen the **Runtime observability** bullet under `### Scope` in `docs/spec.md` by adding a clarifying sentence that names the success-side null-policy on the `loom-system-note` channel and forward-links both the PIC **Runtime event channel** section in `docs/spec_topics/pi-integration-contract.md` (the central success-side null-policy owner) and the **Once a loom is invoked** section in `docs/spec_topics/slash-invocation.md` (the per-mode operator-surface owner). Do not author the rule itself in `spec.md` — characterise the policy in one short sentence and rely on the link targets that siblings T18a and T18b install for the normative content. Preserve the bullet's existing failure-side framing and existing forward-links unchanged.

## Solution constraints

- Preserve every existing forward-link in the bullet (Glossary; PIC Runtime event channel; Diagnostics; Future Considerations — Richer runtime-event telemetry) — link text and targets unchanged.
- Preserve the bullet's existing failure-side framing (the *always-log set* Operator-facing runtime-failure framing, the disjoint `details`-shape sentence, the deferred-aggregation sentence) unchanged in normative content.
- The widening must name both forward-link targets (PIC **Runtime event channel** as the central owner, AND `slash-invocation.md` as the per-mode operator-surface owner); do not collapse to one link.
- The central success-side null-policy paragraph (T18a), the per-mode operator-side null sentences (T18b), and the V18q test clause (T18d) are owned elsewhere.

## Relationships

- T18a "Append success-side null-policy paragraph to PIC Runtime event channel" — must-follow.
- T18b "Add per-mode operator-side null sentences to slash-invocation.md" — co-resolve.
- T18d "Add V18q test asserting zero `loom-system-note` emissions on successful termination" — co-resolve.

---

## T18a — Append success-side null-policy paragraph to PIC Runtime event channel

> **PARKED** — 2026-05-19
> **Reason:** Cascaded from parking of T18c — Widen spec.md Runtime observability bullet to forward-link the null-policy: this finding's ## Relationships block declares an ordering edge (must-precede or must-follow) on the parked finding, so its preconditions are no longer satisfied in spec-review.md.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-19T10-47-33_8360aa/t18c-widen-spec-md-runtime-observability-bullet-to-forward-link-the-null-policy.md

# T18a — Append success-side null-policy paragraph to PIC Runtime event channel

**Kind:** completeness
**Importance:** high
**Score:** 100
**Atomicity:** atomic
**Decision axes:** 3
**Shape:** single
**State:** reduced

## Problem

The **Runtime event channel** section in `docs/spec_topics/pi-integration-contract.md` enumerates the **always-log set** of failure outcomes that emit on the `loom-system-note` channel — including the explicit four-excluded-kinds paragraph (`validation`, `context_overflow`, `cancelled`, `invoke_callee_error`) — but never makes the symmetric statement on the success side: that a loom terminating with `Ok(v)`, including a child loom whose `Ok` flows to its `invoke` parent, emits no event on that channel. Reviewers must triangulate against `docs/spec_topics/invocation.md` and the per-mode bullets in `docs/spec_topics/slash-invocation.md` to confirm the success-visible surfaces are programmatic-only, and the sibling per-surface restatements (T18b in `slash-invocation.md`, T18c in `spec.md`) and the V18q test clause (T18d) have no central spec sentence to anchor against.

## Solution approach

Add a success-side null-policy statement to the **Runtime event channel** section in `docs/spec_topics/pi-integration-contract.md` asserting that a loom terminating with `Ok(v)` — including the case where a child loom's `Ok` flows to its `invoke` parent — emits no event on the `loom-system-note` channel. Name the success-visible surfaces (the driven conversation in prompt mode and the programmatic return value in every mode).

## Solution constraints

- Scope the null-policy to the *terminal* outcome surface only; do not extend it to pre-evaluation surfaces (the binder echo on `bind_echo: true` and the no-params overflow note remain operator-visible regardless of terminal outcome).
- Do not add a "completed" parity note for subagent slash invocations — that re-opens the deferred aggregation / latency surface intentionally scoped out of V1.
- The per-mode operator-side null sentences in `slash-invocation.md`, the `spec.md` **Runtime observability** aggregator forward-link, and the V18q test clause are owned by T18b, T18c, and T18d respectively.
- Do not introduce a new diagnostic code, a new always-log `kind`, or a new `customType` value; the edit is one additive paragraph inside the existing section.

## Relationships

- T18b "Add per-mode operator-side null sentences to slash-invocation.md" — must-precede (the central PIC paragraph must land before the slash-invocation restatement points at it).
- T18c "Widen spec.md Runtime observability bullet to forward-link the null-policy" — must-precede (the bullet's forward-link target must exist).
- T18d "Add V18q test asserting zero `loom-system-note` emissions on successful termination" — must-precede (the test asserts against the spec sentence installed here).
- T19a "Extend ActiveInvocationRegistry entry shape with invocationId" — same-cluster (operator-surface gap on the failure side; symmetric to this child's success-side gap; co-resolve siblings T19b/c/d/e also relevant).
- T06 "Operator role: TUI binding asserted in glossary but never reconciled with non-interactive callers" — same-cluster.

---

## T19a — Extend ActiveInvocationRegistry entry shape with invocationId

> **PARKED** — 2026-05-19
> **Reason:** Cascaded from parking of T18c — Widen spec.md Runtime observability bullet to forward-link the null-policy: this finding's ## Relationships block declares an ordering edge (must-precede or must-follow) on the parked finding, so its preconditions are no longer satisfied in spec-review.md.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-19T10-47-33_8360aa/t18c-widen-spec-md-runtime-observability-bullet-to-forward-link-the-null-policy.md

# T19a — Extend ActiveInvocationRegistry entry shape with invocationId

**Kind:** error-model
**Importance:** high
**Score:** 100
**Atomicity:** atomic
**Shape:** multiple
**State:** reduced

## Problem

The `ActiveInvocationRegistry` entry shape declared under `id="active-invocation-registry"` in `docs/spec_topics/pi-integration-contract.md` carries no per-invocation correlation key — its current `Set<{ loomAbort: AbortController; disposeBarrier: Promise<void>; shutdownReason: string | undefined; loom: string }>` shape lets two concurrent sibling invocations of the same loom be indistinguishable on every downstream operator surface that reads from the registry. Sibling T19b adds an `invocation_id` wire field to `RuntimeEvent`, T19c widens the always-log dedup tuple to include it, and T19d populates `details.event.invocation_id` on the per-invocation `cancelled-by-session-shutdown` emission — all three rely on a canonical registry-side source for the id that does not yet exist. Without a per-entry id minted at registry-insertion time, none of the sibling consumers can populate or dedup on a stable per-invocation discriminator, and same-tick sibling fan-out collapses on every operator surface regardless of how the wire shape evolves.

## Solution approach

Extend the `ActiveInvocationRegistry` entry-shape `Set<...>` declaration under `id="active-invocation-registry"` in `docs/spec_topics/pi-integration-contract.md` with a required `invocationId: string` member, and pin in the section's contract paragraph that each entry's `invocationId` is sourced via `crypto.randomUUID()` at the registry-insertion site (slash-command handler entry, `tool.execute(...)` adapter entry, and `invoke` spawn-site entry) inside the existing **Dispatch-site setup wrap** `try`/`catch` before any awaitable work, and is set on entry creation and never mutated thereafter. The exact identifier name, type, derivation primitive, and insertion-site placement are the substance of the change and are pinned as part of the registry-shape extension.

## Solution constraints

- Preserve the existing entry-shape members (`loomAbort: AbortController`, `disposeBarrier: Promise<void>`, `shutdownReason: string | undefined`, `loom: string`) verbatim — same name, type, optionality marker, and order.
- Do not introduce a parallel id channel and do not re-derive an id at any downstream emission site; T19c's dedup-key widening and T19d's `details.event.invocation_id` population both depend on a single registry-sourced value.
- The `RuntimeEvent` `invocation_id` wire field, the always-log dedup-tuple widening, the `cancelled-by-session-shutdown` details addition, and the real-time sibling emission-timing paragraph are owned by T19b, T19c, T19d, and T19e respectively.
- Do not introduce a new diagnostic code, `details.kind` discriminator, aggregation surface, or storm-detection layer.

## Relationships

- T19b "Add invocation_id field to RuntimeEvent payload declaration" — co-resolve.
- T19c "Widen always-log dedup key to include invocation_id" — co-resolve.
- T19d "Populate cancelled-by-session-shutdown details with invocation_id" — co-resolve.
- T19e "Add real-time sibling emission timing paragraph" — co-resolve.
- T20 "Resource exhaustion under concurrent subagent invocations is undisclaimed for non-memory classes" — same-cluster.
- T18a "Append success-side null-policy paragraph to PIC Runtime event channel" — must-precede (any decision to add operator-visibility for successful sibling outcomes will reuse the `invocation_id` field this child installs).
- T15a "Reduce Session-model Orientation paragraph to a four-sentence forward-linking bullet" — same-cluster.

---

## T19b — Add invocation_id field to RuntimeEvent payload declaration

> **PARKED** — 2026-05-19
> **Reason:** Cascaded from parking of T18c — Widen spec.md Runtime observability bullet to forward-link the null-policy: this finding's ## Relationships block declares an ordering edge (must-precede or must-follow) on the parked finding, so its preconditions are no longer satisfied in spec-review.md.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-19T10-47-33_8360aa/t18c-widen-spec-md-runtime-observability-bullet-to-forward-link-the-null-policy.md

# T19b — Add invocation_id field to RuntimeEvent payload declaration

**Kind:** error-model
**Importance:** high
**Score:** 100
**Atomicity:** atomic
**Shape:** multiple
**State:** reduced

## Problem

The `type RuntimeEvent = { ... }` declaration in the **Runtime event channel** section of `docs/spec_topics/pi-integration-contract.md`, introduced by the sentence pinning the shape as "normative and additive-only", carries no per-invocation correlation field. Sibling T19a sources an `invocationId` from the `ActiveInvocationRegistry` entry, but the wire payload has no destination for that value, so operator-side consumers of the always-log channel cannot distinguish concurrent-sibling emissions from the same loom. T19c's dedup-key widening and T19d's cancelled-by-session-shutdown details population both read this field and require it to be present on the wire shape.

## Solution approach

Add a required `invocation_id: string` field to the `type RuntimeEvent = { ... }` declaration in the **Runtime event channel** section of `docs/spec_topics/pi-integration-contract.md`. Rely on the existing "normative and additive-only" sentence above the declaration to characterise the addition; do not re-author that contract note here. Do not edit the surrounding prose, the dedup-tuple statements, or any sibling-owned surface.

## Solution constraints

- Preserve every existing `RuntimeEvent` field (`kind`, `code`, `loom`, `query_site`, `message`, `attempts`, `tokens_used`, `masked`, `occurred_at`) verbatim — same name, type, optionality marker, inline comment, and order.
- The `ActiveInvocationRegistry` entry-shape change, the dedup-tuple widening, the cancelled-by-session-shutdown details addition, and the sibling timing paragraph are owned by T19a, T19c, T19d, and T19e respectively.
- Do not introduce a new diagnostic code, `details.kind` discriminator, aggregation surface, or storm-detection layer.

## Relationships

- T19a "Extend ActiveInvocationRegistry entry shape with invocationId" — co-resolve (this child consumes the field T19a sources).
- T19c "Widen always-log dedup key to include invocation_id" — co-resolve.
- T19d "Populate cancelled-by-session-shutdown details with invocation_id" — co-resolve.
- T19e "Add real-time sibling emission timing paragraph" — co-resolve.
- T20 "Resource exhaustion under concurrent subagent invocations is undisclaimed for non-memory classes" — same-cluster.
- T18a "Append success-side null-policy paragraph to PIC Runtime event channel" — must-precede.
- T15a "Reduce Session-model Orientation paragraph to a four-sentence forward-linking bullet" — same-cluster.

---

## T19d — Populate cancelled-by-session-shutdown details with invocation_id

> **PARKED** — 2026-05-19
> **Reason:** Cascaded from parking of T18c — Widen spec.md Runtime observability bullet to forward-link the null-policy: this finding's ## Relationships block declares an ordering edge (must-precede or must-follow) on the parked finding, so its preconditions are no longer satisfied in spec-review.md.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-19T10-47-33_8360aa/t18c-widen-spec-md-runtime-observability-bullet-to-forward-link-the-null-policy.md

# T19d — Populate cancelled-by-session-shutdown details with invocation_id

**Kind:** error-model
**Importance:** high
**Score:** 100
**Atomicity:** atomic
**Shape:** multiple
**State:** reduced

## Problem

The `Per-invocation operator visibility (clean-cancel path)` rule under `id="session-shutdown-semantics"` in `docs/spec_topics/pi-integration-contract.md` pins the per-invocation `finally`'s `loom/runtime/cancelled-by-session-shutdown` emission as the teardown-time operator-visibility surface, currently populating `details.event.reason` (read from the registry entry's `shutdownReason`) and `details.event.loom` (read from the registry entry's `loom`). Sibling T19a extends `ActiveInvocationRegistry` entries with an `invocationId` field and sibling T19b adds `invocation_id` to `RuntimeEvent`, but the cleanly-cancelled per-invocation note has no spec rule pinning that `details.event.invocation_id` is populated. Without it, cleanly-cancelled concurrent siblings of the same loom collapse onto the same operator-stream row at teardown even after the registry source and wire field exist. The `loom/runtime/cancelled-by-session-shutdown` row in `docs/spec_topics/diagnostics.md` and the nesting convention under `id="session-shutdown-details-conventions"` in the same file inherit the same gap on the diagnostics-side surface.

## Solution approach

Extend the `Per-invocation operator visibility (clean-cancel path)` rule under `id="session-shutdown-semantics"` in `docs/spec_topics/pi-integration-contract.md` to pin that the per-invocation `finally`'s `cancelled-by-session-shutdown` emission populates `details.event.invocation_id` by reading the registry entry's `invocationId` field (the same channel by which `details.event.loom` is read), not by re-deriving an id at the emission site. Mirror the addition in the `loom/runtime/cancelled-by-session-shutdown` row of `docs/spec_topics/diagnostics.md` and in the nesting-convention paragraph under `id="session-shutdown-details-conventions"` in the same file if and only if those locations enumerate the `details.event` field set; otherwise carry no diagnostics-side enumeration drift.

## Solution constraints

- Source `details.event.invocation_id` from the `ActiveInvocationRegistry` entry's `invocationId` field on the per-invocation `finally` (the same channel by which `details.event.loom` is read); do not re-derive an id at the emission site and do not introduce a parallel id channel.
- Preserve the existing `details.event.reason` clauses (the `"quit" | "reload" | "new" | "resume" | "fork" | string` type pin, the four captured-value cases under the **Unknown-reason rule**, the `"<unreadable>"` sentinel rules including the post-deadline residual-gap arm) and the `details.event.loom` clause textually unchanged.
- The `ActiveInvocationRegistry` entry-shape change, the `RuntimeEvent` wire-field addition, the dedup-key widening, and the real-time timing paragraph are owned by T19a, T19b, T19c, and T19e respectively.
- Do not introduce a new diagnostic code or `details.kind` discriminator.

## Relationships

- T19a "Extend ActiveInvocationRegistry entry shape with invocationId" — co-resolve (this child reads the registry entry T19a defines).
- T19b "Add invocation_id field to RuntimeEvent payload declaration" — co-resolve.
- T19c "Widen always-log dedup key to include invocation_id" — co-resolve.
- T19e "Add real-time sibling emission timing paragraph" — co-resolve.
- T20 "Resource exhaustion under concurrent subagent invocations is undisclaimed for non-memory classes" — same-cluster.
- T18a "Append success-side null-policy paragraph to PIC Runtime event channel" — must-precede.
- T15a "Reduce Session-model Orientation paragraph to a four-sentence forward-linking bullet" — same-cluster.

---

## T19e — Add real-time sibling emission timing paragraph

> **PARKED** — 2026-05-19
> **Reason:** Cascaded from parking of T18c — Widen spec.md Runtime observability bullet to forward-link the null-policy: this finding's ## Relationships block declares an ordering edge (must-precede or must-follow) on the parked finding, so its preconditions are no longer satisfied in spec-review.md.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-19T10-47-33_8360aa/t18c-widen-spec-md-runtime-observability-bullet-to-forward-link-the-null-policy.md

# T19e — Add real-time sibling emission timing paragraph

**Kind:** error-model
**Importance:** high
**Score:** 100
**Atomicity:** atomic
**Shape:** multiple
**State:** reduced

## Problem

The **Runtime event channel** section in `docs/spec_topics/pi-integration-contract.md` pins exactly-once-per-origin emission semantics for `loom-system-note` always-log notes and lists Deduplication and lifetime rules, but does not pin emission timing across concurrent sibling invocations. An implementer reading the section could legally batch sibling always-log emissions until the parent's tool-loop round closes — deferring operator-visible failure timing — without violating any existing rule on the page. The omission also leaves V18q's concurrent-sibling emission tests without a normative anchor for whether sibling failures must surface in real time at the originating site.

## Solution approach

Extend the **Runtime event channel** section in `docs/spec_topics/pi-integration-contract.md` to pin the emission timing of sibling always-log notes on `loom-system-note`. The section must establish that each sibling emission surfaces in real time at its originating site (batching across the parent's tool-loop round is not permitted), with V18q's concurrent-sibling tests as the binding behavioural anchor. The relative interleaving order across concurrent sibling origins follows the host JavaScript runtime's event-loop scheduling and is operator-observable; no test asserts a specific cross-sibling interleaving sequence.

## Solution constraints

- Do not relocate or reword the existing paragraphs in the section.
- The `ActiveInvocationRegistry` entry-shape change, the `RuntimeEvent` `invocation_id` wire field, the dedup-key widening, and the cancelled-by-session-shutdown details change are owned by T19a, T19b, T19c, and T19d respectively.
- Do not introduce a new diagnostic code, `details.kind` discriminator, aggregation surface, or storm-detection layer.

## Relationships

- T19a "Extend ActiveInvocationRegistry entry shape with invocationId" — co-resolve.
- T19b "Add invocation_id field to RuntimeEvent payload declaration" — co-resolve.
- T19c "Widen always-log dedup key to include invocation_id" — co-resolve.
- T19d "Populate cancelled-by-session-shutdown details with invocation_id" — co-resolve.
- T20 "Resource exhaustion under concurrent subagent invocations is undisclaimed for non-memory classes" — same-cluster.
- T18a "Append success-side null-policy paragraph to PIC Runtime event channel" — must-precede.
- T15a "Reduce Session-model Orientation paragraph to a four-sentence forward-linking bullet" — same-cluster.

---

## T18b — Add per-mode operator-side null sentences to slash-invocation.md

> **PARKED** — 2026-05-19
> **Reason:** Cascaded from parking of T18c — Widen spec.md Runtime observability bullet to forward-link the null-policy: this finding's ## Relationships block declares an ordering edge (must-precede or must-follow) on the parked finding, so its preconditions are no longer satisfied in spec-review.md.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-19T10-47-33_8360aa/t18c-widen-spec-md-runtime-observability-bullet-to-forward-link-the-null-policy.md

# T18b — Add per-mode operator-side null sentences to slash-invocation.md

**Kind:** completeness
**Importance:** medium
**Atomicity:** atomic
**Shape:** single
**State:** reduced

## Problem

The **prompt mode** and **subagent mode** bullets under *Once a loom is invoked* in `docs/spec_topics/slash-invocation.md` describe the per-mode invocation and conversation-driving surfaces but neither bullet states the operator-side success-outcome null — that a successfully terminating loom emits no `loom-system-note` and that the operator-visible surfaces on success are the per-mode conversation / programmatic-return-value pair only. Sibling T18a installs the central success-side null-policy paragraph in the PIC **Runtime event channel** section, but a reader of `slash-invocation.md` must triangulate against PIC and `docs/spec_topics/invocation.md` to confirm the absence of a terminal operator-side note is deliberate rather than an under-specified surface.

## Solution approach

Add one per-surface null sentence to each of the **prompt mode** and **subagent mode** bullets under *Once a loom is invoked* in `docs/spec_topics/slash-invocation.md`. Each sentence restates, at the per-mode operator-surface level, the success-side null-policy that T18a installs centrally in the PIC **Runtime event channel** section: the prompt-mode sentence names `loom-system-note` and asserts no such note is emitted on successful termination, identifying the driven conversation as the operator-visible surface; the subagent-mode sentence asserts that the operator sees no terminal note on success (the subagent transcript is private and the return value reaches only the programmatic caller) and identifies the pre-start binder echo and the failure-side top-level `Err` note as the operator-visible surfaces. Do not author the central rule — restate the per-mode consequence and rely on T18a's PIC paragraph for the normative source.

## Solution constraints

- Do not modify the pre-existing per-mode framing in either bullet (the prompt-mode current-conversation-driving description and `Ok`-return-value-not-surfaced-to-user clause; the subagent-mode fresh-isolated-conversation description and return-value-only-reaches-caller clause).
- The central success-side null-policy paragraph (T18a), the `spec.md` aggregator forward-link (T18c), and the V18q test clause (T18d) are owned elsewhere — out of scope here.

## Relationships

- T18a "Append success-side null-policy paragraph to PIC Runtime event channel" — must-follow (the central rule must land first).
- T18d "Add V18q test asserting zero `loom-system-note` emissions on successful termination" — co-resolve.

---


## T15a — Reduce Session-model Orientation paragraph to a four-sentence forward-linking bullet

> **PARKED** — 2026-05-19
> **Reason:** Category 1 (malformed finding — default attribution for top-level fixer refusals; the fixer's pre-flight typically catches stale preconditions, missing destination subsections, or do-not-touch conflicts — may also be category 2 if the refusal reason is capacity-shaped, see FixerNotes). The top-level spec-review-fixer refused to apply the recommended resolution. Refusal reason: must-fix-blocked-by-deferred-precondition: Solution constraint #3 explicitly directs deferral when the Concurrency model subsection (owned by T15b) is absent from `## Extension Architecture` in `docs/spec.md`. Current state: T15b is unresolved (still present in `docs/spec-review.md` at line 126) and the Concurrency model subsection does not exist (grep for `Concurrency model` returns only the existing Session-model paragraph text itself). The defer-trigger is firing as designed. Narrowing-refused rationale: constraint #3 cannot be narrowed under the three-mode authoring guard. f-stop-2 (co-resolve peer territory): T15b's named edit surface is the relocation of the architectural clauses (mode-qualified isolation, prompt-mode sequentiality premises i/ii/iii, genuine-concurrency conclusion, cancellation-propagates-downward, per-invocation budget scoping, no-admission-cap) into the new Concurrency model subsection. Deleting those clauses from the Session-model paragraph now would consume T15b's source material before T15b authors the destination, crossing T15b's territory. No other remediation site exists for the Problem's residue. Staleness bypass does not apply: the constraint's structural-ordering prediction ("Concurrency model subsection has landed") is unfulfilled, not falsified by re-shaping. The orchestrator should re-dispatch T15a only after T15b resolves.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-19T10-47-33_8360aa/t15a-reduce-session-model-orientation-paragraph-to-a-four-sentence-forward-linki.md

# T15a — Reduce Session-model Orientation paragraph to a four-sentence forward-linking bullet

**Kind:** placement
**Importance:** medium
**Atomicity:** atomic
**Shape:** single
**State:** reduced

## Problem

The `<a id="session-model"></a>` paragraph in `docs/spec.md` Orientation > Prerequisites compresses five distinct content categories — Pi-session binding, `session_shutdown` payload contract, prompt-mode sequentiality argument with its three supporting premises, mode-qualified transcript/tool-table isolation, and admission-cap / per-invocation-budget posture — into one Orientation bullet. The architectural clauses belong in the new `Concurrency model` subsection owned by T15b, and the V1 scope deferrals (parallel-`invoke`, concurrent user sessions) belong at the V1 non-goals surfaces owned by T15c; until this reduction lands, those siblings have no room to relocate content into. The paragraph reads as a single mixed block rather than as Orientation-level forward-linking prose.

## Solution approach

Reduce the `<a id="session-model"></a>` paragraph in `docs/spec.md` Orientation > Prerequisites to orientation-level forward-link prose. The retained content categories are: the one-session-at-a-time Pi-session binding (forward-link to the Session-binding contract in `docs/spec_topics/pi-integration-contract.md`), the `session_shutdown` payload contract (forward-link to the Extension entry point in `docs/spec_topics/pi-integration-contract.md` and to the closed `event.reason` set in the SDK type at `@mariozechner/pi-coding-agent`'s `dist/core/extensions/types.d.ts`), and a pointer to the architectural `Concurrency model` subsection installed by T15b. Delete the clauses T15b relocated (mode-qualified isolation summary, prompt-mode sequentiality with premises (i)/(ii)/(iii), genuine-concurrency-only-between-subagent-invocations conclusion, cancellation-propagates-downward restatement, per-invocation budget scoping, no-admission-cap statement) and the deferrals T15c lifted (parallel-`invoke`, concurrent user sessions). Composition — sentence count, ordering of forward-links, whether closely-related pointers fold into one sentence — is the implementer's choice.

## Solution constraints

- The reduced paragraph must retain the `<a id="session-model"></a>` anchor — inbound links (the Overview's terminal-outcomes paragraph, the `[Session model](#session-model)` reference inside the V1 non-goals subsection) depend on it.
- The destination `Concurrency model` subsection is owned by T15b — do not author it under this finding.
- If the `Concurrency model` subsection (owned by T15b) is absent from `## Extension Architecture` in `docs/spec.md` at edit time, defer.

## Relationships

- T15b "Move concurrency semantics into Extension Architecture / Implementation Notes Concurrency-model subsection" — co-resolve (the reduction makes room for the relocated content).
- T15c "Lift Session-model scope deferrals into Non-goals (V1) section" — co-resolve (the reduction makes room for the lifted deferrals).
- T02 "Subagent state-isolation enumeration duplicates PIC matrix in Overview opening paragraph" — same-cluster (identical placement pattern).
- T16a "Trust boundary bullet: keep scope claim and drop SDK-pin literal" — same-cluster (sibling Scope bullet exhibiting the same mixing of categories).
- T18a "Append success-side null-policy paragraph to PIC Runtime event channel" — same-cluster (third instance of the pattern, in the Runtime-observability bullet).
- T24 "Fork-reason watcher closure leaves the extension in an unspecified, silently degraded state" — same-cluster (touches the same Session-model paragraph but addresses content correctness).


---


## T16b — Rewrite callable-set paragraph: drop inline `customTools` / `createAgentSession` / `pi.setActiveTools` names

> **PARKED** — 2026-05-19
> **Reason:** Category 1 (malformed finding — constraints binding surface; the originating finding's Solution constraints fence every viable remediation that the lens admits). The inner spec-diff-fix-loop's severity-weighted triage exited on must-fix-blocked-by-scope-guard (plan §Change A clause 1 escape): a raised lens finding outranked this originating finding in importance, but every viable remediation would violate a class-1 or class-2 scope guard forwarded from the top-level fixer. FIXCOUNTS: 2,0,0,5. Loop notes: must-fix-blocked sub-rationale=score-budget-exhausted-trust-override-suppressed (Rec O pass-level shadow-budget gate); S=25, Σ_shadow=115, breach margin Σ−k·S=40 (multiplier 4.6× vs k=3 threshold 75). 5 raised findings counted toward the exhausted shadow budget on pass 5 (all targeting docs/spec.md#scope, the chunk already in NARROWED_CHUNKS — every finding would have been deferred under b-bis approach-narrowed absent the Rec O gate, so 0 trust-override-counted findings; gate fired on bare-residue grounds). severity p1 raised{high:1,low:1} fixed{high:1,low:1} deferred{} blocked{}; p2 raised{low:1} fixed{} deferred{low:1} blocked{}; p3 raised{medium:1} fixed{} deferred{medium:1} blocked{}; p4 raised{low:4,NIT:1} fixed{low:4,NIT:1} deferred{} blocked{}; p5 raised{medium:4,low:1} fixed{} deferred{} blocked{medium:4,low:1}. stage1=2 stage2=1 stage3=2 (pass 5 lens fan-out + classifier ran but exited before fixCount increment; counted in stage-3 attempt total). narrowings=0+1+0+0 (one in-loop approach-narrowing on docs/spec.md#scope via inner-fixer (d) refusal during pass 4 fix-05; the revert to baseline-post-top-level undid pass-1's high-severity union-with-snapshot fix and pass-1's swap-window rename, restoring exactly the residue the lens fleet then re-discovered as 5 raised findings on pass 5). stage1Touched=1 mode-e-refusals=0. A human must resolve the guard-vs-severity collision (relax the guard, split this finding so the higher-importance raised finding is no longer downstream of the guard, or accept the trade-off and annotate the raised finding as out-of-scope) before re-introducing this finding.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-19T10-47-33_8360aa/t16b-rewrite-callable-set-paragraph-drop-inline-customtools-createagentsession-p.md

# T16b — Rewrite callable-set paragraph: drop inline `customTools` / `createAgentSession` / `pi.setActiveTools` names

**Kind:** placement
**Importance:** medium
**Atomicity:** atomic
**Shape:** single
**State:** reduced

## Problem

The callable-set paragraph in the Trust-boundary bullet under Orientation > Scope in `docs/spec.md` names packaging-level Pi-API identifiers — the `customTools` array on `createAgentSession` for subagent mode and the `pi.setActiveTools` snapshot/restore pair for prompt mode — to characterise how the per-mode callable-set wiring is enforced. Those identifiers are owned verbatim by the **Tool-registration lifetime and visibility** and **Conversation drive — subagent mode** sections of `docs/spec_topics/pi-integration-contract.md`; the aggregator restatement drifts the moment either Pi API surface is renamed, replaced, or restructured. The behavioural property the trust-boundary scope decision actually rests on is the per-mode wiring isolation, not the specific Pi APIs that implement it.

## Solution approach

Rewrite the callable-set paragraph in the Trust-boundary bullet so it states only the behavioural isolation rule — subagent-mode invocations see only the loom's declared callable set; prompt-mode invocations see the loom's declared callable set unioned with the user session's snapshot for the swap window — and forward-links the **Tool-registration lifetime and visibility** section in `docs/spec_topics/pi-integration-contract.md` for the SDK-call mechanism. Drop the inline `customTools`, `createAgentSession`, and `pi.setActiveTools` identifiers from the paragraph. The SDK-call mechanism remains owned by the linked PIC section.

## Solution constraints

- Do not inline the Pi-API identifiers `customTools`, `createAgentSession`, or `pi.setActiveTools` (or any other Pi-API symbol that names how callables are wired for either mode); those are owned by **Tool-registration lifetime and visibility** in `docs/spec_topics/pi-integration-contract.md`.
- Preserve the *callable set* clarification — that the loom's declared callable set is a configuration knob over the *model's* reachable callable set, NOT a host-process sandbox — and its forward-link to [Parameters and Frontmatter — `tools`](./spec_topics/frontmatter.md#tools).
- The host-side-denial paragraph and the closing capability-model sentence are owned by T16c and T16d respectively — leave them untouched here.

## Relationships

- T16a "Reduce Trust-boundary SDK-surface clause: drop the `~0.72.1` literal" — co-resolve.
- T16c "Reduce host-side-denial paragraph to one sentence with forward-links" — co-resolve.
- T16d "Replace closing capability-model paragraph with single forward-link sentence" — co-resolve.
- T16e "PIC step 2 internal contradiction: literal `pi.setActiveTools([...snapshot, ...names])` call shape vs natural-language 'exactly the loom's declared callable set'" — must-follow (the prompt-mode visibility characterisation in this paragraph forward-links to a PIC step whose internal contradiction T16e resolves first).


---


## T16e — PIC step 2 internal contradiction: literal `pi.setActiveTools([...snapshot, ...names])` call shape vs natural-language "exactly the loom's declared callable set"

> **PARKED** — 2026-05-19
> **Reason:** Cascaded from parking of T16b — Rewrite callable-set paragraph: drop inline `customTools` / `createAgentSession` / `pi.setActiveTools` names: this finding's ## Relationships block declares an ordering edge (must-precede or must-follow) on the parked finding, so its preconditions are no longer satisfied in spec-review.md.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-19T10-47-33_8360aa/t16b-rewrite-callable-set-paragraph-drop-inline-customtools-createagentsession-p.md

# T16e — PIC step 2 internal contradiction: literal `pi.setActiveTools([...snapshot, ...names])` call shape vs natural-language "exactly the loom's declared callable set"

**Kind:** consistency
**Importance:** high
**Score:** 100
**Atomicity:** atomic
**Shape:** single
**State:** reduced

## Problem

Step 2 of the `Around each query` enumeration under **Tool-registration lifetime and visibility** in `docs/spec_topics/pi-integration-contract.md` reads: ``Call `pi.setActiveTools([...snapshot, ...loomCallableSetNames, respondToolName?])` — the set the model sees for this turn is exactly the loom's declared callable set, plus the respond tool when the turn is a typed-query response turn.`` The literal call argument `[...snapshot, ...loomCallableSetNames, respondToolName?]` produces the **union** of the user-session snapshot and the loom's declared callable set (plus optionally the respond tool); the natural-language gloss that immediately follows asserts that the set the model sees is **exactly** the loom's declared callable set (plus optionally the respond tool), which excludes the snapshot. The two sentences are mutually exclusive — either the snapshot is part of the model's visible set for the turn or it is not — and a reader cannot determine which shape is normative. T16b's reshape of the `docs/spec.md` Trust-boundary callable-set paragraph depends on PIC owning a single, coherent prompt-mode visibility rule to forward-link to; with both shapes live in the cited owner section, T16b cannot characterise prompt-mode visibility without inheriting the contradiction.

## Solution approach

Resolve the contradiction at the source by picking one shape for prompt-mode query visibility under **Tool-registration lifetime and visibility** in `docs/spec_topics/pi-integration-contract.md`. Either (a) rewrite the natural-language gloss in step 2 to match the literal `[...snapshot, ...loomCallableSetNames, respondToolName?]` call — the set the model sees is the user-session snapshot unioned with the loom's declared callable set (and the respond tool on a typed-query response turn), keeping the snapshot/restore protocol's existing behaviour explicit; or (b) rewrite the literal call to match the natural-language gloss — `pi.setActiveTools([...loomCallableSetNames, respondToolName?])` with no snapshot union — and adjust the surrounding paragraphs (the `If another extension calls pi.setActiveTools` consequence in the same section, and any downstream `spec.md`-side framing of the per-mode callable-set rule) accordingly. Pick whichever shape is intended by the V1 prompt-mode design; do not introduce a third shape and do not preserve both.

## Solution constraints

- Do not widen the V1 prompt-mode callable surface beyond what one of the two existing shapes already authorises; the resolution picks between (a) snapshot-union (current literal call) and (b) snapshot-replaced (current natural-language gloss).
- Do not introduce a new type, a new SDK call, or a new `details.kind` discriminator; the edit is a prose / call-literal reconciliation inside the existing step 2.
- Do not touch the subagent-mode `createAgentSession({ customTools, ... })` paragraph; subagent-mode visibility is a separate mechanism unaffected by this contradiction.
- The `docs/spec.md` Trust-boundary callable-set paragraph is owned by T16b — out of scope here.

## Relationships

- T16b "Rewrite callable-set paragraph: drop inline `customTools` / `createAgentSession` / `pi.setActiveTools` names" — must-precede (T16b's prompt-mode visibility characterisation cannot land until PIC step 2 owns a single coherent rule for it to forward-link to).

---


## T13b — Invocation depth bound: propagate the `cross-file` qualifier to the introductory paragraph and the V18n leaf

> **PARKED** — 2026-05-19
> **Reason:** Category 1 (malformed finding — constraints binding surface; the originating finding's Solution constraints fence every viable remediation that the lens admits). The inner spec-diff-fix-loop's severity-weighted triage exited on must-fix-blocked-by-scope-guard (plan §Change A clause 1 escape): a raised lens finding outranked this originating finding in importance, but every viable remediation would violate a class-1 or class-2 scope guard forwarded from the top-level fixer. FIXCOUNTS: none. Loop notes: Sub-rationale: must-fix-blocked-by-scope-guard; 1 blocked finding (spec-lens-assumptions, raised=high, score=100, must-fix=true) whose only viable remediation — adding a one-sentence in-paragraph `cross-file` clarifier to the `invocation.md` L79 *countable-frame* paragraph — would (i) author a normative convention about `cross-file` `.warp` `fn` dispatch in direct violation of guard 2 and (ii) encroach on T13a's reserved definition site per guard 1. The inverse rewrite (removing the qualifier from L77 and L394) is a same-issue restatement of the very edit the outer loop just made. Origin T13b heading absent from current docs/spec-review.md (top-level fixer already deleted it post-resolution); classifier defaulted origin importance to medium / S=25 per heading-absent lookup rule; sibling T13a carries importance=high / score=100 in live spec-review.md. Severity p1 raised{high:1,medium:2} fixed{} deferred{} blocked{high:1}. stage1=0. narrowings=0+0+0+0. stage1Touched=0 mode-e-refusals=0. Snapshot refs retained under refs/loom/snapshots/2026-05-19T14-26-52_102877/{baseline,baseline-post-top-level,pass-1} for forensics; reshape menu per _blocked.md: (a) raise T13b score in spec-review.md to admit the clarifier within budget, (b) re-scope T13b to own the definition site (merge with T13a or split T13a's obligation back in), or (c) relax guard 2 to admit the one-sentence L79 clarifier while keeping the propagation-site restating prohibition (guard 1) intact. A human must resolve the guard-vs-severity collision (relax the guard, split this finding so the higher-importance raised finding is no longer downstream of the guard, or accept the trade-off and annotate the raised finding as out-of-scope) before re-introducing this finding.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-19T10-47-33_8360aa/t13b-invocation-depth-bound-propagate-the-cross-file-qualifier-to-the-introducto.md

# T13b — Invocation depth bound: propagate the `cross-file` qualifier to the introductory paragraph and the V18n leaf

**Kind:** naming
**Importance:** high
**Atomicity:** atomic
**Shape:** single
**State:** reduced

## Problem

The introductory paragraph of the "Invocation depth bound" subsection in `docs/spec_topics/invocation.md` enumerates the countable dispatches as direct `invoke(...)`, `.loom` callable calls through `tools:`, and `.warp` `fn` invokes — omitting the `cross-file` qualifier that the normative *countable-frame* paragraph immediately below applies to `.warp` `fn` calls. The qualifier is load-bearing: without it, intra-`.warp`-file `fn` dispatch is wrongly read as consuming a depth slot, so two implementers reading the subsection in order arrive at incompatible 32-slot budgets. The same loose phrasing has already propagated to the V18n leaf's *Adds.* bullet in `docs/plan_topics/v18-cancellation.md`.

## Solution approach

Rewrite the third item of the introductory paragraph of the "Invocation depth bound" subsection in `docs/spec_topics/invocation.md` so it reads "cross-file `.warp` `fn` calls" — adding the `cross-file` qualifier and matching the noun (`calls`) used by the normative *countable-frame* paragraph that follows. Apply the same wording change to the *Adds.* bullet of V18n in `docs/plan_topics/v18-cancellation.md`. Leave the normative *countable-frame* paragraph (whose definition of `cross-file` is owned by T13a) and the rest of the subsection unchanged.

## Solution constraints

- The definition of `cross-file` is owned by T13a in the *countable-frame* paragraph; do not restate the definition at either propagation site.

## Relationships

- T13a "Define the `cross-file` qualifier in the *countable-frame* paragraph of `invocation.md`" — must-follow.

---


## T13a — Define the `cross-file` qualifier in the *countable-frame* paragraph of `invocation.md`

> **PARKED** — 2026-05-19
> **Reason:** Cascaded from parking of T13b — Invocation depth bound: propagate the `cross-file` qualifier to the introductory paragraph and the V18n leaf: this finding's ## Relationships block declares an ordering edge (must-precede or must-follow) on the parked finding, so its preconditions are no longer satisfied in spec-review.md.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-19T10-47-33_8360aa/t13b-invocation-depth-bound-propagate-the-cross-file-qualifier-to-the-introducto.md

# T13a — Define the `cross-file` qualifier in the *countable-frame* paragraph of `invocation.md`

**Kind:** completeness
**Importance:** high
**Atomicity:** atomic
**Shape:** single
**State:** reduced

## Problem

The normative *countable-frame* paragraph of the "Invocation depth bound" subsection in `docs/spec_topics/invocation.md` uses the qualifier `cross-file` on `.warp` `fn` calls without defining what counts as cross-file dispatch. The token is load-bearing — it is the discriminator that decides whether an intra-`.warp`-file `fn` call consumes a depth slot — but no defining occurrence of `cross-file` exists in `docs/spec_topics/` reachable from the subsection. Sibling T13b realigns the introductory paragraph of the same subsection and the V18n leaf's *Adds.* bullet in `docs/plan_topics/v18-cancellation.md` to use the same qualifier; without a defining occurrence in the *countable-frame* paragraph, the two propagation sites have nothing canonical to anchor against.

## Solution approach

Extend the normative *countable-frame* paragraph of the "Invocation depth bound" subsection of `docs/spec_topics/invocation.md` with a short clarifying clause defining `cross-file`: a `.warp` `fn` call is *cross-file* when the caller and callee reside in different `.warp` source files, and an intra-file `fn` call (caller and callee in the same `.warp` source file) is not a countable frame. Frame the clause as an in-paragraph definition rather than as a new subsection or glossary entry; the qualifier already lives in this paragraph and a separate definition site would re-introduce the same two-site drift the propagation cleanup (T13b) closes.

## Solution constraints

- Do not coin a new term in place of `cross-file`; the qualifier is already in use across the subsection and the propagation sites T13b realigns.
- Do not relocate the *countable-frame* paragraph or change its position within the subsection.
- Do not add a new glossary entry or a separate definition section — the definition lives inline in the *countable-frame* paragraph.

## Relationships

- T13b "Invocation depth bound: propagate the `cross-file` qualifier to the introductory paragraph and the V18n leaf" — must-precede (the defining clause must land before the propagation sites realign to it).

---

## T05 — `bind_*` (frontmatter) vs `binder*` / `binder-*` (settings, diagnostics, prose) — root-word inconsistency for the binder-model concept

> **PARKED** — 2026-05-19
> **Reason:** Category 1 (malformed finding — constraints binding surface; the originating finding's Solution constraints fence every viable remediation that the lens admits). The inner spec-diff-fix-loop's severity-weighted triage exited on must-fix-blocked-by-scope-guard (plan §Change A clause 1 escape): a raised lens finding outranked this originating finding in importance, but every viable remediation would violate a class-1 or class-2 scope guard forwarded from the top-level fixer. FIXCOUNTS: 2,2. Loop notes: severity p1 raised{medium:2} fixed{medium:2}; p2 raised{medium:2,NIT:1} fixed{medium:2} deferred{NIT:1}; p3 raised{medium:3,low:1,NIT:1} blocked{medium:3,low:1,NIT:1}. Classifier exited on pass 3 with sub-rationale `score-budget-exhausted-trust-override-suppressed` (Rec O pass-level shadow-budget gate): S=25, Σ=Σ_shadow=81 across 5 non-blocker raised findings (multiplier 3.24× vs k=3 threshold of 75), breach margin Σ-S=56; 4 of the 5 findings would have been admitted via per-finding trust override absent the gate. Heading T05 was absent from live `docs/spec-review.md` (top-level fixer removed it post-resolution) — classifier defaulted to medium / S=25 / mustFix=false per heading-absent-default rule. No mode (d) / (e) / (f) / (g) refusals fired. stage1=3 narrowings=0+0+0+0 stage1Touched=2 mode-e-refusals=0. A human must resolve the guard-vs-severity collision (relax the guard, split this finding so the higher-importance raised finding is no longer downstream of the guard, or accept the trade-off and annotate the raised finding as out-of-scope) before re-introducing this finding.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-19T17-23-50_9cbe86/t05-bind-frontmatter-vs-binder-binder-settings-diagnostics-prose-root-word-incon.md

# T05 — `bind_*` (frontmatter) vs `binder*` / `binder-*` (settings, diagnostics, prose) — root-word inconsistency for the binder-model concept

**Kind:** naming
**Importance:** medium
**Atomicity:** atomic
**Shape:** single
**State:** reduced
**Decision axes:** 2

## Problem

The concept "the LLM the slash-command argument binder calls" appears across three surface conventions with two different root words: frontmatter uses `bind_` (`bind_model`, `bind_context`, `bind_echo`), while settings keys, diagnostic codes, anchors, and running prose use the longer root `binder` (`looms.binderModel`, `loom/load/binder-model-unresolved`, `## Binder model` in `docs/spec_topics/binder.md`, glossary entry `**binder**`). The per-surface case style (snake / camel / kebab) is already governed by documented conventions; the `binder` → `bind_` shortening inside the frontmatter family is not — the *Naming convention* paragraph in `docs/spec_topics/frontmatter.md` documents the snake-case rule but is silent on this root-word delta, and the glossary has an entry for `**binder**` (the mechanism) but no entry for the binder-model concept, so the cross-surface mapping has no canonical anchor. Author-facing remediation hints that name both surfaces in one sentence (e.g. the `loom/load/binder-model-unresolved` row in `docs/spec_topics/diagnostics.md`: ``set 'bind_model:' in frontmatter or 'looms.binderModel' in settings``) read as a typo until the convention is internalised.

## Solution approach

Declare a single canonical home for the convention: extend the *Naming convention* paragraph in `docs/spec_topics/frontmatter.md` with one sentence pinning the `bind_` (frontmatter) vs `binder` (settings, diagnostic, prose) root-word convention for the binder-related family. Add a `**binder model**` glossary entry to `docs/spec_topics/glossary.md`, alphabetised between the existing `**binder**` and `**callable set**` entries, whose body is a **back-reference** of the form `See the *Naming convention* paragraph in [frontmatter](./frontmatter.md#naming-convention) for the per-surface root-word mapping (`bind_*` frontmatter vs `binder*` / `binder-*` settings, diagnostic, prose).`, NOT a parallel statement of the convention. The convention itself is owned only by the frontmatter *Naming convention* paragraph; the glossary entry is a discoverable forward-link from a reader who lands on a `binder*` token first, not a second authoritative copy.

## Solution constraints

- Do not rename `bind_model`, `bind_context`, or `bind_echo` to `binder_model` / `binder_context` / `binder_echo`.
- Do NOT restate the per-surface mapping (the four spellings, the `bind_` vs `binder` root-word delta, the relationship to sibling `bind_` fields) inside the glossary entry — the glossary entry is a back-reference only. Any prose-level statement of the convention lives in the frontmatter *Naming convention* paragraph and only there. This is the two-site-authoring guard rec AA's mode (g) would otherwise refuse against on stage-3 passes.
- Scope the new convention sentence to the binder-model concept only: do NOT extend it to a universal claim about "every other binder-related frontmatter family surface". The `bind-context-*` and `bind-echo-*` diagnostic-code families use different patterns and are not in scope for this finding.
- Do not coin a new anchor scheme on the glossary entry; reuse the existing `<a id="..."></a>` convention sibling entries already use.

## Relationships

None

---

## T06 — Operator role: TUI binding asserted in glossary but never reconciled with non-interactive callers

> **PARKED** — 2026-05-19
> **Reason:** Category 1 (malformed finding — constraints binding surface; the originating finding's Solution constraints fence every viable remediation that the lens admits). The inner spec-diff-fix-loop's severity-weighted triage exited on must-fix-blocked-by-scope-guard (plan §Change A clause 1 escape): a raised lens finding outranked this originating finding in importance, but every viable remediation would violate a class-1 or class-2 scope guard forwarded from the top-level fixer. FIXCOUNTS: none. Loop notes: Sub-rationale: score-budget-exhausted-trust-override-suppressed (Rec O pass-level shadow-budget gate). Origin S=25 (medium, default per heading-absent fallback — T06 already removed from spec-review.md by outer-loop fixer; classifier could not reach prior HEAD); Σ_shadow=107; k=3; k×S=75; breach-margin=Σ_shadow−k×S=32; breach-multiplier Σ_shadow/S=4.28×; 7 non-blocker/non-cheap raised findings counted toward shadow budget, of which 5 would have been classified fix-via-trust-override absent the gate. severity p1 raised{medium:4,low:1,NIT:2} fixed{} deferred{} blocked{medium:4,low:1,NIT:2}. Stage trajectory stage1=0 (classifier exited pre-fix-application; pass 1 never completed). narrowings=0+0+0+0. stage1Touched=0 mode-e-refusals=0. No blocker / must-fix findings; gate fires entirely on shadow-budget arithmetic. Reshape paths per _blocked.md: raise T06 score to ≥107 (or set must-fix:true), split T06 into per-axis atoms (TUI binding / non-interactive carve-out / always-present implication), or narrow T06 Solution approach to drop the closed-enumeration framing and always-present parenthetical that drive the assumptions/consistency residue. A human must resolve the guard-vs-severity collision (relax the guard, split this finding so the higher-importance raised finding is no longer downstream of the guard, or accept the trade-off and annotate the raised finding as out-of-scope) before re-introducing this finding.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-19T17-23-50_9cbe86/t06-operator-role-tui-binding-asserted-in-glossary-but-never-reconciled-with-non.md

# T06 — Operator role: TUI binding asserted in glossary but never reconciled with non-interactive callers

**Kind:** assumptions
**Importance:** high
**Atomicity:** atomic
**Shape:** single
**State:** reduced
**Decision axes:** 3

## Problem

The `operator` entry in `docs/spec_topics/glossary.md` binds *operator-facing* tightly to the active Pi TUI session via the `loom-system-note` channel, but the rest of the corpus admits non-TUI invocation paths — `invoke` from another loom, "programmatic consumers", a future loom harness, and the deferred `loom test` and non-loom programmatic harness items in `docs/spec_topics/future-considerations.md` — without reconciling them with that binding. The first use of *operator* in `docs/spec.md` (the terminal-outcomes aggregator paragraph at `<a id="terminal-outcomes-aggregator">`, "what the operator observes per channel") does not forward-link to the glossary, and the glossary `operator` entry has no anchor to link to. A reader auditing whether non-interactive callers see an operator-facing surface has no anchored answer, and a future contributor adding a non-slash entry point has no V1 binding to extend.

## Solution approach

Add an HTML anchor to the `operator` entry in `docs/spec_topics/glossary.md` matching the convention sibling glossary entries already use, and append one sentence to that entry pinning the V1 invariant: every loom invocation runs inside an active Pi TUI session (so an operator is always present) and non-interactive invocation paths — including the deferred `loom test` command and the deferred non-loom programmatic harness named in `docs/spec_topics/future-considerations.md` — are out of V1 scope, with the operator-facing channel's behaviour outside a TUI session undefined. Then add an inline forward-link of the form `the operator (per [Glossary](./spec_topics/glossary.md#operator))` on the first use of *operator* in the terminal-outcomes aggregator paragraph (`<a id="terminal-outcomes-aggregator">`) of `docs/spec.md`. The existing generic forward-link to the glossary in the Runtime observability bullet under `Scope` does not need a per-term anchor.

## Solution constraints

- Use the existing HTML-anchor convention (`<a id="..."></a>`) on the new glossary entry, matching siblings like `<a id="in-loop"></a>` and `<a id="query-terminating"></a>`; do not invent a new anchor scheme.
- The V1 carve-out lives in the glossary `operator` entry only; the consolidated V1 non-goals list (owned by T38) may cite it but is out of scope here.
- Do not extend the V1 disclaimer to Pi's `convertToLlm` LLM-context entry — that surface is a property of the channel, not the operator role.
- Reuse the deferred-feature names already in `docs/spec_topics/future-considerations.md` verbatim (`loom test`; non-loom programmatic harness); do not coin new names.

## Relationships

- T18a "Append success-side null-policy paragraph to PIC Runtime event channel" — same-cluster (overlapping scope: what the operator sees on success vs across non-interactive paths).
- T38 "Non-goals are not consolidated into a single section" — same-cluster (the V1 "no non-interactive delivery path" disclaimer is one of the items the consolidated Non-goals section would cite back to the glossary entry).

---
