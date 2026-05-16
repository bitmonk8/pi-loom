# Spec-review fix-loop forensic analysis — pi-loom

_Each entry below summarises one failed `/fix-spec-shape-single-findings`
iteration, with a pointer to the detailed forensic report under
`.pi/tmp/spec-fix-failure-forensics/` (gitignored — read it on demand;
it does not persist across worktree wipes)._

---

## 2026-05-16T17:58:00Z — T19d — Populate cancelled-by-session-shutdown details with invocation_id

- **Failure mode:** must-fix-blocked
- **Trajectory:** n/a
- **Score trajectory:** n/a vs S=100
- **Passes:** 0
- **Stage at exit:** 1 (0 pass(es) in stage)
- **Snapshot refs (retained for forensics):** `refs/loom/snapshots/2026-05-16T17-57-27_ac79d7`
- **Poisoned fixes:** n/a
- **Forensic report:** `c:/UnitySrc/pi-loom/.pi/tmp/spec-fix-failure-forensics/2026-05-16T17-52-36_347871/t19d-populate-cancelled-by-session-shutdown-details-with-invocation-id.md` _(gitignored)_
- **Parked findings (this run):** `T19d — Populate cancelled-by-session-shutdown details with invocation_id`
- **Loop notes:** Classifier early-exited on must-fix-blocked-by-scope-guard with 1 blocked finding (spec-lens-consistency merge of assumptions+consistency+implementability Finding 1: `entry.invocationId` reads in the new prose are unsourceable from the `ActiveInvocationRegistry` contract, which pins only `{loomAbort, disposeBarrier, shutdownReason, loom}` — no `invocationId` member). The originating finding's score S=100 (high importance, must-fix); cumulative sum Σ not computed because the early exit fires before per-pass scoring (n/a / n/a / n/a). The blocking remediations are mutually exhaustive and each foreclosed: adding `invocationId` to the registry entry shape is T19a's owned surface (guard 3); re-deriving at the emission site or via a parallel channel is forbidden by guard 1. T19d is therefore ordering-blocked behind T19a — a human must land T19a (or merge T19a/T19d into a single finding) before T19d can converge. severity p1 raised{high:1} fixed{} deferred{} blocked{high:1} (only the blocking finding was classified; 4 other raised findings remained unclassified per the classifier's "do not classify after early-exit" rule). stage1=0
- **Fixer notes:** none

The detailed root-cause analysis, audit-vs-actual comparison, and
ranked Immediate / Pipeline recommendations live in the gitignored
forensic report cited above. This file records only the durable
TL;DR pointer so future `/spec-review` regeneration runs (or future
human triage) can trace why the listed findings ended up in
`spec-review-parked.md`.

---
