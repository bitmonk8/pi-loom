# Triaged Plan Review — plan

_Generated: 2026-06-11T03:55:00Z_
_Plan: docs/plan.md_
_Spec: docs/spec.md_
_Process: bottom-up — the last finding (T44) is addressed first; the first finding (T01) is addressed last._

_Triage tally: 0 blocker, 0 high, 1 medium retained; 39 low discarded; 0 low findings merged into 0 medium findings; 16 NIT dropped; 0 false dropped._

---

# T28 — Real-host divergence detectable only by a manual smoke — close the window with a pre-merge gate (posture (i))

**Original heading:** Real-host divergence detected only manually, post-merge
**Original section:** Consolidated Plan Review — plan
**Kind:** risk
**Importance:** medium
**Score:** 25
**MustFix:** false

## Finding

The Pi-SDK pin is the single shared dependency every runtime leaf binds against, and `V18c` owns the version-bump procedure that moves it. `V18c`'s runtime-evidence acceptance gate runs `H4a`'s end-to-end harness against the bumped pin, but that harness drives the in-process session double — `V18c` itself states "a green double-backed run is not real-host coverage." The only mechanism that can witness a double-vs-real-host divergence is `H4a`'s **manual real-host smoke run**, which `H4a` explicitly frames as the "post-merge detection mechanism."

Because the smoke is manual and post-merge while every automated gate is double-backed, a Pi bump whose new SDK diverges from the double can pass green CI and merge with the divergence undetected. `V18c`'s revert framing compounds the gap: its `Ships when` says the prior pin "is restored before merge" on a confirmed-divergence finding, yet the only finding source is a post-merge smoke — so the restore precondition references a signal that does not exist before merge. The plan acknowledges there is no mechanical real-host gate, but it neither bounds the detection window (no named owner, schedule, or merge-gating posture for the smoke) nor annotates that the blast radius of an undetected divergence is every runtime leaf. A revert path exists, so the condition is recoverable; the gap is the unbounded, owner-less window between a divergent merge and a human running the smoke.

**Adopted resolution — posture (i):** the manual real-host smoke is made a required **pre-merge gate** on any Pi-version-bump change, with a named owner and trigger. This closes the undetected-by-CI window at its source (a divergent pin cannot merge) and makes `V18c`'s existing "prior pin restored before merge" precondition consistent, because the divergence signal now exists at decision time. The remaining edit is the blast-radius annotation on `V18c`. Together these are one coherent change set.

## Plan Documents

- `docs/plan_topics/V18c-version-bump-checklist.md` — Adds / Ships when (edited)
- `docs/plan_topics/H4a-factory-shell-and-harness.md` — Tests: restate acceptance-trigger prose as a pre-merge gate (edited)
- `docs/plan_topics/V18c-T-version-bump-checklist.md` — mirrored pre-merge revert-path statement (edited)
- `docs/plan_topics/H6a-live-corpus-activation.md` — release-gate pre-merge-smoke owner/record item (edited)
- `docs/plan.md` — §Release gate (read-only)

## Spec Documents

- `docs/spec_topics/pi-integration-contract/version-bump-triggers.md` — version-bump trigger / revert policy (if spec-owned)

## Affected Leaves

**Phases:** Horizontal; Vertical slice V18; Release gate

**Leaves (implementation order):**

- `H4a` — Extension factory shell and end-to-end harness — (modified)
- `V18c` — Pi version-bump procedure and gates — (modified)
- `V18c-T` — Pi version-bump procedure and gates (tests) — (modified)
- `H6a` — Live-corpus closing-gate activation — (modified)

## Consequence

**Severity:** advisory

A Pi-SDK bump whose new SDK diverges from the in-process session double can merge on green CI; the divergence is invisible to every automated gate and surfaces only when a human eventually runs the manual real-host smoke, with no named owner or scheduled trigger bounding that window. The "restored before merge" revert precondition cannot fire on a post-merge-only signal, so the recovery path is mis-timed against its own trigger.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** 81ab342 — pi-loom plan: resolve "version-bump runtime-evidence acceptance gate and revert path" (2026-06-10, Thomas Andersen); 328ba4d — pi-loom plan: resolve "real-host verification gap" (2026-06-10, Thomas Andersen)
**History:** 81ab342 added `V18c`'s revert path with the "restored before merge" timing, on the footing that the runtime-evidence acceptance gate was the divergence signal. 328ba4d then layered the manual real-host smoke onto `H4a` as the "post-merge detection mechanism" and named it in `V18c`'s revert trigger, creating the post-merge-signal / pre-merge-restore tension and the undetected-by-CI window; e7f14dd (2026-06-11) later refined the smoke's acceptance-trigger set in `H4a` but left the merge-gating posture and the window unbounded.

## Solution Space

**Shape:** single

Posture (i) — a pre-merge gate — is the adopted resolution, so the finding collapses to one coherent change set: make the manual real-host smoke a required pre-merge gate on Pi-version-bump changes, and annotate the divergence blast radius on `V18c`. The two edits are applied together; the pre-merge posture removes the timing tension rather than negotiating it.

### Solution — Make the real-host smoke a pre-merge gate and annotate the blast radius

**Approach:** Reframe `H4a`'s manual real-host smoke from a "post-merge detection mechanism" to a required **pre-merge gate** on any change that moves the Pi-SDK pin, with a named owner and a concrete trigger (run before merge whenever the pin changes). Because the smoke now runs before merge, a divergent pin cannot merge and the undetected-by-CI window is eliminated at source; `V18c`'s `Ships when` "prior pin restored before merge" precondition references a signal that exists at decision time and needs only confirmation, not a revert-timing rewrite. In the same change set, annotate on `V18c` that a divergent pin's blast radius is every runtime leaf and is not witnessed by the double-backed acceptance gate.

**Plan edits:**
- `docs/plan_topics/H4a-factory-shell-and-harness.md` — restate the acceptance-trigger prose: the real-host smoke is a pre-merge gate on Pi-version-bump changes, with named owner and trigger event; drop the "post-merge detection mechanism" framing.
- `docs/plan_topics/V18c-version-bump-checklist.md` — add the blast-radius clause to `Adds.` / the acceptance-gate `Tests.` bullet ("blast radius: all runtime leaves, real-host only — a divergent pin is not witnessed by the double-backed acceptance gate"), and confirm `Ships when` "prior pin restored before merge" now reads against the pre-merge smoke signal.
- `docs/plan_topics/V18c-T-version-bump-checklist.md` — mirror the pre-merge revert-path statement.
- `docs/plan_topics/H6a-live-corpus-activation.md` — record the pre-merge smoke's owner / falsifiable record at the release gate if the owner trace lands there.

**Spec edits:** `docs/spec_topics/pi-integration-contract/version-bump-triggers.md` — record the pre-merge gate as the trigger/revert policy, if that policy is spec-owned.

**Pros:** Eliminates the undetected window at source; removes the post-merge/pre-merge timing tension in `V18c`'s Ships-when wording.

**Cons:** Puts a human-run real-host smoke in the merge path of every Pi-version bump — slower bumps, requires an available owner.

**Risks:** Bump throughput depends on owner availability; mitigated by naming the owner and trigger explicitly.

### Recommendation

Apply the blast-radius annotation on `V18c` first (single-leaf, stable baseline), then the pre-merge gate reframe on `H4a` together with the `V18c` / `V18c-T` revert-timing confirmation in one pass.

The pre-merge posture also makes `V18c`'s "restored before merge" precondition literally true, and the gate's named owner and record provide a falsifiable owner trace at `H6a` — both folded into this change set.
