# pi-loom end-to-end test campaign

Purpose: a methodical, spec-derived end-to-end verification of the shipped
pi-loom 1.0 extension. Not spot checks. The campaign builds a test plan from
independent analysis of (1) the spec, (2) the user/host documentation, and
(3) the implementation, then executes that plan and drives all identified
issues to green.

## Roles

- **Orchestrator** (main context): authors the test plan, aggregates results,
  authors the fix plan, gates progress. Delegates all analysis and all test
  execution to `worker` subagents. Does not itself investigate or run tests.
- **Workers** (`worker` subagent): perform analysis, execute test slices, and
  recursively delegate to sub-workers. Communicate by writing markdown to disk
  under this directory.

## Communication protocol

All inter-agent communication is via markdown files under `docs/e2e-campaign/`.
Workers are handed an explicit output path and must write their deliverable
there. Workers must cite file:line for every claim.

## Layout

- `analysis/` — Phase-A analysis deliverables (spec requirements, doc
  behaviours, code surface).
- `test-plan.md` — the master test plan (orchestrator-authored).
- `execution/` — Phase-C execution result docs, one per test area.
- `findings/` — confirmed issues (one file per finding or per area).
- `fix-plan.md` — Phase-D remediation plan (orchestrator-authored).
- `status.md` — running campaign status ledger (orchestrator-maintained).

## Baseline (captured at campaign start)

- `npm run typecheck` — clean.
- `npm test` (default offline suite) — 148 files, 1745 tests passing.
- `npm run test:conformance` — 26 tests passing.
- `npm run test:live` — live provider IS configured; 4/5 passing,
  1 pre-existing failure (`typed-query lowering, bounded` — reply not pure JSON).
- `npm run test:acceptance`, `test:hardening` — not yet run this campaign.
