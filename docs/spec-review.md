# Triaged Spec Review - spec

_Generated: 2026-06-01T12:18:38Z_
_Spec: docs/spec.md_
_Process: bottom-up - the last finding (T06) is addressed first; the first finding (T01) is addressed last._

_Triage tally: 0 high, 6 medium retained; 20 low discarded; 3 low findings merged into 1 medium finding; 0 nit dropped; 0 false dropped._

---

# T01 - Scope intro paragraph: run-on sentence, undefined "no-seam" term, and inlined governance meta-commentary

**Kind:** clarity, cruft, scope
**Importance:** medium
**Decision axes:** 3
**Shape:** single
**State:** reduced

## Problem

The § Scope intro paragraph (`docs/spec.md`, the `#scope` subsection) is a single dense block whose second sentence strings together five-plus independent clauses — bullet status, the dual-listing notice, the editorial criterion for promoting a no-seam disposition, worked examples, and ownership pointers — with no cue separating non-binding navigation from normative-shaped prose. The qualifier "no-seam" is used before the forward-compatibility-seam concept is introduced, which does not happen until the later **Forward-compatibility seams** bullet. The paragraph also inlines spec-authoring / governance meta-commentary — the promotion criterion and the aggregator-vs-source lock-step convention — that is already owned by GOV-12 on `docs/spec_topics/governance.md`, producing a standing drift surface.

## Solution approach

Rewrite the `#scope` intro as discrete single-assertion sentences. Gloss "no-seam" at first use by referencing the **Forward-compatibility seams** bullet (by bullet name, not position) where the seam concept is defined. Delete the editorial-criterion clause and the GOV-12 lock-step-convention sentence, leaving a forward-link to the loom 1.0 non-goals aggregator at `#v1-non-goals`.

## Solution constraints

- Out of scope: moving the forward-compatibility-seam definition out of the **Forward-compatibility seams** Scope bullet (its normative home).
- The trimmed intro must still satisfy GOV-12's Scope-bullet integer-count invariant (currently five) on `governance.md`.

## Relationships

None
# T02 - README repository-layout table cites the stale `@mariozechner/pi-*` npm scope

**Kind:** doc-alignment-broad
**Importance:** medium
**Shape:** single
**State:** reduced

## Problem

`README.md`'s repository-layout table describes the `package.json` row as declaring "peer-deps on `@mariozechner/pi-*`". That npm scope is stale: `package.json#peerDependencies` declares the four Pi packages under `@earendil-works/*`, and the spec corpus uses the same scope throughout (`docs/spec.md` §Orientation > Prerequisites and `docs/spec_topics/pi-integration-contract.md` *Host prerequisites* item 1, which pins `@earendil-works/pi-coding-agent ~0.75.5`). This is the only remaining `@mariozechner/` occurrence in the repository, and the README is the entry point a new contributor reads before opening the spec or manifest.

## Solution approach

Rename `@mariozechner/pi-*` to `@earendil-works/pi-*` in the `package.json` row of `README.md`'s repository-layout table.

## Solution constraints

- None.

## Relationships

None
# T03 - SM-2 restates the externally-owned `SessionShutdownEvent.reason` union inline and labels the restatement "the closed normative set"

**Kind:** external-entities, placement
**Importance:** medium
**Shape:** single
**State:** reduced

## Problem

`spec.md` SM-2 (`sm-2-closed-shutdown-reason-set`) enumerates the five members of the externally-owned `SessionShutdownEvent['reason']` union inline and parenthetically labels that inline enumeration "the closed normative set," while conceding in the same sentence that the SDK type is the source of truth. The closed-set definition and unknown-reason routing are already owned downstream by PIC's Unknown-reason rule (`#unknown-reason-rule`), and the Session-binding contract paragraph (`#session-binding-contract`) already defers the closed reason set to that rule. The inline copy drifts silently on a future Pi SDK pin bump because it is outside the version-bump audit scope, and the "closed normative set" label in the orientation index competes with PIC for citation traffic on the membership predicate.

## Solution approach

In SM-2 (`sm-2-closed-shutdown-reason-set`), demote the inline `event.reason` member enumeration to a non-normative orientation illustration and delete the "the closed normative set" label. Add a forward-link to PIC's Unknown-reason rule (`#unknown-reason-rule`) so SM-2 cites that rule as the owner of the closed-set membership predicate rather than asserting it inline. Re-anchor the subsequent unknown-reason routing sentence on the same PIC rule so SM-2 describes the routing at orientation level and cites PIC for the normative predicate.

## Solution constraints

- Out of scope: `pi-integration-contract.md`'s Unknown-reason rule — the closed-set definition, membership check, fail-safe routing, and diagnostic already exist there; this fix is a deletion / re-citation at SM-2 only.

## Relationships

None
# T04 - Session Model anchor-scheme stability paragraph cites non-existent `#session-model` callsites

**Kind:** codebase-grounding-broad
**Importance:** medium
**Shape:** single
**State:** reduced

## Problem

The closing sentence of the `sm-anchor-scheme-stability` paragraph in `docs/spec.md` asserts that pre-decomposition inbound `#session-model` callsites already exist in `docs/spec_topics/pi-integration-contract.md` and `docs/spec_topics/future-considerations.md`. No such callsites exist: `pi-integration-contract.md` cites only specific `sm-N-…` sub-anchors (e.g. `#sm-3-session-shutdown-handler`, `#sm-7-mode-qualified-concurrency`), and `future-considerations.md` does not reference the session model at all. The false claim sits inside a paragraph the reader is meant to trust as a citation map, so a maintainer acting on it will hunt for callsites that do not exist or skip an audit step. The umbrella-anchor retention rationale does not depend on these callsites — it is independently justified by the in-file `[Session Model](#session-model)` orientation pointer and the `#v1-non-goals` aggregator mention cited earlier in the same paragraph.

## Solution approach

Rewrite the closing of the `sm-anchor-scheme-stability` paragraph so the umbrella `session-model` anchor's retention is justified for any current-or-future orientation-level inbound link that cites the session model as a whole rather than a specific sub-obligation, without enumerating specific topic-page callsites. Delete the trailing editorial-deferral clause about retargeting individual callsites, which has no referent once the false claim is removed.

## Solution constraints

- None.

## Relationships

None
# T05 - SM-7c lacks an acceptance criterion

**Kind:** testability
**Importance:** medium
**Shape:** single
**State:** reduced

## Problem

SM-7c (`#sm-7c-prompt-mode-sequential-execution` in `docs/spec.md`) asserts a MUST — at most one prompt-mode body holds an open `pi.setActiveTools` snapshot/restore window within a single user session — and enumerates four supporting premises, but never states what a tester inspects to declare pass/fail. The named observable is an internal runtime↔Pi call sequence, not a surface looms or operators can read, and the four premises live across separate topic pages, so testing them individually would not establish the composite "at most one open window" invariant SM-7c requires. SM-7c is unique among the SM-7 sub-obligations in both delegating verification to no topic-page owner and pinning nothing observable of its own, so two implementers can close the gap differently — one asserting on the Pi-side `setActiveTools` call order, another writing no end-to-end check — and a runtime that violates the composite invariant can ship green.

## Solution approach

Add an acceptance criterion to SM-7c (`#sm-7c-prompt-mode-sequential-execution`) that makes the `pi.setActiveTools` snapshot/restore call stream the observable test predicate, asserting strictly non-overlapping snapshot/restore pairs across two prompt-mode invocations dispatched against the same user session. Scope the criterion to prompt-mode invocations, and treat the Pi per-session slash-handler serialisation (premise (i)) and the load-time rejection of prompt-mode callees in `tools:` (premise (ii)) as test-environment preconditions rather than predicate clauses. Forward-link the serialisation precondition to PIC's `#snapshot-restore-pi-behavioural-preconditions` paragraph.

## Solution constraints

- None.

## Relationships

- T06 "SM-8 budget non-sharing rule has no acceptance criterion" — same-cluster (identical missing-acceptance-criterion defect shape on a sibling Session Model MUST; structurally analogous fix but no shared edit surface — read the two together).
# T06 - SM-8 budget non-sharing rule has no acceptance criterion

**Kind:** testability
**Importance:** medium
**Decision axes:** 3
**Shape:** single
**State:** reduced

## Problem

SM-8 (`#sm-8-per-invocation-budget-non-sharing`) is a MUST-level obligation: per-invocation budgets are scoped to a single invocation and are not shared, pooled, or replenished across sibling invocations. The rule spans three structurally independent budget dimensions — binder per-class retry budget, `tool_loop.max_rounds`, and `invoke`-chain depth — each with its own exhaustion observable, and `spec.md` flags it as authoritative-in-place so no topic page restates it or supplies a criterion. A test author proving non-sharing has no per-dimension oracle: two implementers can disagree on, say, whether `invoke`-chain depth is counted per chain or per extension instance, and neither is provably wrong against the prose alone.

## Solution approach

Add an acceptance criterion to SM-8 covering each of its three enumerated budget dimensions, grounded in the loom-observable exhaustion signals already defined elsewhere: the binder load-time system note (per `binder.md`), `Err(QueryError { kind: "tool_loop_exhausted", … })` (per `query.md`), and `loom/runtime/invoke-depth-exceeded` (per `invocation.md`). Each criterion demonstrates that one sibling invocation exhausting its budget leaves the other sibling's budget for that dimension intact.

## Solution constraints

- Out of scope: the budget-owner topic pages (`binder.md`, `query.md`, `invocation.md`, `hard-ceilings.md`) — they supply the observables but SM-8 is authoritative-in-place, so the criteria land on `spec.md` only.

## Relationships

- T05 "SM-7c lacks an acceptance criterion" — same-cluster (identical missing-acceptance-criterion defect shape on a sibling Session Model MUST; the same Pi-double / fixture-grid pattern applies — read the two together).
