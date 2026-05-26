# Triaged Spec Review — spec

_Spec: docs/spec.md_
_Process: bottom-up — the last finding (T28) is addressed first; the first finding is addressed last._

_Triage tally: 3 findings — 3 high._

---

# T19c — Retarget the five `../spec.md#session-model` cross-references in future-considerations.md to specific `sm-N-...` anchors

**Kind:** traceability
**Importance:** high
**Shape:** single
**State:** reduced

## Problem

`docs/spec_topics/future-considerations.md` carries five `../spec.md#session-model` cross-references (at lines 108, 112, 113, 114, and 116 — in the V1 non-goals `Recorded at:` lines for no-concurrent-user-sessions, no-parallel-invoke, no-parallel-fan-out, and no-admission-cap, plus one inline citation inside the no-parallel-fan-out body). Each citation pins a different sub-obligation of the Session model paragraph, but all five currently resolve to the same umbrella anchor. After T19a installs the per-obligation `sm-N-...` sub-anchors on `docs/spec.md`, these citations remain link-resolved-but-meaning-ambiguous until they are retargeted: a future edit narrowing one SM-obligation will silently appear to narrow the others.

## Solution approach

Retarget each of the five `../spec.md#session-model` cross-references in `docs/spec_topics/future-considerations.md` to the specific `sm-N-...` sub-anchor whose sub-obligation the surrounding `Recorded at:` line (or in-body citation) actually pins, using T19a's authored SM-N inventory as the ground truth for anchor names.

## Solution constraints

- Out of scope: authoring or modifying any `sm-N-...` anchor on `docs/spec.md` (owned by T19a) and retargeting the three sibling cross-references in `pi-integration-contract.md` (owned by T19b).

## Relationships

- T19a "Replace session-model paragraph with eight SM-N sub-units" — must-follow (the `sm-N-...` anchor targets must exist before retargeting)
- T19b "Retarget the three `../spec.md#session-model` cross-references in pi-integration-contract.md" — co-resolve (commutative sibling retarget; bundle into the same fix pass after T19a lands)
- T22 "Extension Architecture › Concurrency model bullet duplicates the Session model concurrency prose" — same-cluster (if SM-7 collapses to a forward-link after T22, the SM-7 retargets in this edit collapse to `concurrency-model`)
# T19b — Retarget the three `../spec.md#session-model` cross-references in pi-integration-contract.md to specific `sm-N-...` anchors

**Kind:** traceability
**Importance:** high
**Shape:** single
**State:** reduced

## Problem

`docs/spec_topics/pi-integration-contract.md` carries three `../spec.md#session-model` cross-references — one in the `<a id="pi-slash-handler-promise-lifecycle-presupposition"></a>` *Pi-side slash-handler promise lifecycle* bullet, and two in the Pi-version-bump procedure (step 1's *Re-typecheck against the new package* item and step 5's *Update the capability-probe pinned constants* item). Each callsite pins a distinct sub-obligation of the Session model paragraph (cancellation-chain liveness; closed reason set; `SessionShutdownEvent` payload shape), but all three currently resolve to the same `#session-model` anchor. After T19a establishes `sm-N-...` sub-anchors on `docs/spec.md`, leaving the citations on the umbrella anchor leaves traceability ambiguous and lets a future edit narrowing one SM obligation silently appear to narrow the others.

## Solution approach

Retarget each of the three `../spec.md#session-model` cross-references in `docs/spec_topics/pi-integration-contract.md` (the Pi-side slash-handler promise lifecycle bullet and Pi-version-bump procedure steps 1 and 5) to the specific `sm-N-...` sub-anchor that names the sub-obligation that callsite is actually about, using T19a's SM-N inventory as the ground truth.

## Solution constraints

- Out of scope: authoring or naming the `sm-N-...` anchors themselves (owned by T19a) and retargeting the five `../spec.md#session-model` cross-references in `docs/spec_topics/future-considerations.md` (owned by T19c).

## Relationships

- T19a "Replace session-model paragraph with eight SM-N sub-units" — must-follow (the `sm-N-...` anchor targets must exist before retargeting)
- T19c "Retarget the five `../spec.md#session-model` cross-references in future-considerations.md" — co-resolve (commutative sibling retarget; bundle into the same fix pass after T19a lands)
- T22 "Extension Architecture › Concurrency model bullet duplicates the Session model concurrency prose" — same-cluster
# T19a — Replace session-model paragraph with eight SM-N sub-units, each anchored `<a id="sm-N-...">`

**Kind:** traceability
**Importance:** high
**Shape:** single
**State:** reduced

## Problem

The `<a id="session-model"></a>` *Session model.* paragraph in `docs/spec.md` (Orientation › Prerequisites, third loose paragraph) carries one anchor over at least eight independently testable normative obligations: single-active-session binding to a Pi extension instance, the closed `session_shutdown` reason set, the per-reason fixed teardown sequence, the post-teardown degraded state for the session-only reasons `{"new","resume","fork"}`, the broader tag-transition predicate scope for the `LoomRegistry` drain transition and the degraded-state slash note, the narrower diagnostic-emission predicate scope for `loom/host/session-shutdown-runtime-degraded`, the mode-qualified concurrency / isolation model, and the per-invocation budget non-sharing rule. Eight live cross-references currently land on this anchor — three in `docs/spec_topics/pi-integration-contract.md` and five in `docs/spec_topics/future-considerations.md` — each pinning a different sub-obligation but all resolving to the same paragraph. As a result no inbound link can disambiguate which obligation it cites, and a future edit narrowing one obligation will silently appear to narrow the others.

## Solution approach

Decompose the `<a id="session-model"></a>` paragraph in `docs/spec.md` into eight stably-anchored sub-units `sm-1-...` through `sm-8-...`, one per obligation enumerated in Problem (binding; closed reason set; teardown sequence; degraded state for the session-only reasons; tag-transition predicate; diagnostic-emission predicate; mode-qualified isolation; per-invocation budget non-sharing). Keep the `<a id="session-model"></a>` anchor on the wrapping surface so existing inbound `#session-model` links continue to resolve. The SM-N inventory authored here is the ground truth that T19b and T19c retarget downstream callsites against.

## Solution constraints

- Out of scope: retargeting the eight downstream `#session-model` callsites — the three in `docs/spec_topics/pi-integration-contract.md` are owned by T19b and the five in `docs/spec_topics/future-considerations.md` are owned by T19c.

## Relationships

- T19b "Retarget the three `../spec.md#session-model` cross-references in pi-integration-contract.md" — must-precede (T19b's anchors-targets are established here)
- T19c "Retarget the five `../spec.md#session-model` cross-references in future-considerations.md" — must-precede (T19c's anchor-targets are established here)
- T22 "Extension Architecture › Concurrency model bullet duplicates the Session model concurrency prose" — must-follow (deduplication should land before this edit; if the concurrency content moves wholesale to `concurrency-model`, SM-7 collapses to a forward-link)

