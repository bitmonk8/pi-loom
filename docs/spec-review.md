# Triaged Spec Review - spec

_Generated: 2026-06-01T09:02:14Z_
_Spec: docs/spec.md_
_Process: bottom-up - the last finding is addressed first; the first finding (T10) is addressed last._

_Triage tally: 2 high retained; 9 medium removed post-triage by request; 15 low discarded; 7 low findings merged (then removed with the mediums); 2 nit dropped; 0 false dropped._

---

# T10 - typebox single-instance precondition is unstated and unverified

**Kind:** assumptions
**Importance:** high
**Decision axes:** 3
**Shape:** single
**State:** reduced

## Problem

The spec's "Pi SDK and capabilities" paragraph and PIC's `typebox` sub-paragraph (under `#pi-sdk-pin`) declare `typebox` as `"typebox": "*"` "so the host's bundled version wins", treating the bundled-instance outcome as a fact. That clause depends on two unstated preconditions: that the host actually bundles `typebox`, and that the package manager dedupes the `"*"` range to that single bundled instance. Step 0 (e) only verifies `typeof Type.Unsafe === "function"` against whatever `typebox` the loom resolves, which passes even when a second, separately-resolved `typebox` instance coexists with the host's; the four `@earendil-works/*` peer-deps get a Step 0 (d) version lock-step that would catch such drift, but `typebox` is explicitly carved out with no compensating check. A multi-instance resolution therefore surfaces downstream of `pi.registerTool` as a wrong-schema-shape failure rather than as a clean `loom/load/host-incompatible` refusal at factory entry.

## Solution approach

Clarify PIC's `typebox` sub-paragraph under `#pi-sdk-pin` to state the bundling-and-dedupe precondition the `"typebox": "*"` declaration depends on, and that the `"*"` range carries no version-pinning guarantee of its own. State that no runtime probe verifies `typebox` provenance or single-instance resolution beyond `Type.Unsafe` callability, treating a deduping failure with the same undefined-behaviour posture as the Silent shape drift carve-out at `#post-probe-sdk-shape-drift`. Rewrite spec.md's "Pi SDK and capabilities" paragraph to cite that precondition pin by location instead of restating "so the host's bundled version wins" as a bare claim.

## Solution constraints

- Out of scope: the Step 0 (d) four-package peer-dep lock-step iteration MUST remain carved out for `typebox`; do not extend it to cover `typebox`.

## Relationships

None

