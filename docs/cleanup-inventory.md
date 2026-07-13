# pi-loom — repository cleanup record

Record of the cleanup pass that removed build-to-release process cruft.
Package: `@bitmonk8/pi-loom` (unreleased, `private: true`).

## Removed (git rm)

- `notes.md` (196 KB working scratch).
- `.pi/**` tracked dev-harness state (agents, prompts, project-config, impl-progress).
- `src/.gitkeep` (obsolete empty-tree placeholder).
- `docs/documentation-plan.md`, `docs/plan.md`.
- `docs/plan-review*.md`, `docs/spec-review*.md`, `docs/spec-plan-review*.md` (8 review docs).
- `docs/e2e-campaign/**` (completed campaign; only test *comments* referenced it).
- `docs/findings/**` (388 review-findings files + `.l4-*` baselines).
- `docs/_tools/*.py` (spec split/link helpers).
- `tests/hardening/**/*.md` (31 campaign-note docs; the `*.test.ts` probes were kept).

## Reset

- `CHANGELOG.md` — was a 567 KB per-leaf implementation log; reset to a
  Keep-a-Changelog "Unreleased" stub.

## Pruned in place (bodies stubbed, filenames kept)

- `docs/plan_topics/*.md` leaf pages — bodies replaced with a short retired-leaf
  stub. **The files are retained deliberately**: `tools/closing-gate/live-corpus.js`
  derives the release-gate leaf-ID universe from these filenames, and both
  `tests/warn-only-canary.test.ts` (H5b) and `tests/live-corpus-release-gate.test.ts`
  (H6a) run that gate under the default `npm test`. `coverage-matrix.md` was left
  untouched — the gate parses its content.

## Relocated

- The four opt-in vitest configs (`acceptance`/`conformance`/`hardening`/`live`)
  moved from repo root to `config/vitest/`. Each pins `root` to the repo root so
  its `tests/**` include globs still resolve. `package.json` `test:*` scripts and
  all in-tree comment references were updated. `vitest.config.ts` (the default
  `npm test` runner) stays at root.

## Reference fixes

- `README.md` provenance — dropped the pointers to the deleted
  `documentation-plan.md` / `e2e-campaign/`; the loom-1.0 framing now cites
  `docs/spec_topics/governance/release-version-naming.md`.
- `docs/spec_topics/pi-integration-contract/session-only-degraded-state.md` —
  de-linked the NFR-2.1 reference that pointed into `plan_topics/conventions.md`
  (kept the descriptive text).
- `.gitignore` — simplified the `.pi/` block to ignore the directory entirely
  (its tracked whitelist pointed at now-removed dirs).

## Not moved (correction to the initial plan)

- `test-fixtures/` **stays at repo root.** Moving it under `tests/` would make
  its `*/tests/sample.test.ts` fixtures match vitest's `tests/**/*.test.ts` glob
  (executed as real tests) and pollute the closing-gate live corpus, which scans
  `tests/**` and asserts it never touches `test-fixtures/**`. The top-level
  location is intentional and load-bearing.

## Kept as-is (CORRECT)

`src/`, `extensions/`, `tools/`, `tests/**` code, `tests/fixtures/`, shipped docs
(`guide`, `tutorial`, `how-to`, `reference`, `examples`, `STYLE`), the spec
(`spec.md`, `spec_topics/`), `README.md`, root project config, licenses,
`vitest.config.ts`.
