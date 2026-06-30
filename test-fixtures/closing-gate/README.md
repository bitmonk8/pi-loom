# Closing-gate seeded fixtures (H5a)

A dedicated test-fixtures root for the [`H5a`](../../docs/plan_topics/H5a-closing-gate-automation.md)
REQ-ID / diagnostic-code closing gate. It sits **outside** `docs/spec_topics/**`
and **outside** the live vitest corpus (`tests/**/*.test.ts`, `src/**/*.test.ts`)
by design: these fixtures exist to drive the gate's pass/fail evaluation, and
several of them exist permanently to *fail* their gate arm. The gate's live-mode
path selection (owned by `H6a`) reconciles the live spec/test corpus exclusive of
this root, so no seeded fixture is ever scanned as live coverage.

Each scenario directory uses the conventional closing-gate corpus layout the
`loadCorpus` loader reads:

- `governance.md` — REQ-ID prefix table + `## Retired REQ-IDs` section.
- `spec/**/*.md` — spec pages carrying `**PREFIX-N.**` anchors.
- `coverage-matrix.md` — the `| REQ-ID | Closing leaf(s) |` mapping table.
- `registry.md` — the diagnostics registry table(s).
- `tests/**/*.test.ts` — the seeded test corpus (citing REQ-IDs / asserting codes).
  These are fixture data, not live tests, and are never collected by vitest.

Scenarios:

- `no-violation/` — every arm green. Includes a mapped numbered REQ-ID whose
  citing test is present, and a `loom/typecheck/*` brand whose absence of an
  asserting test must NOT fire (the registry-reconciliation carve-out).
- `unmapped-req-id/` — a spec REQ-ID with no coverage-matrix row.
- `missing-citing-test/` — a coverage-matrix-mapped REQ-ID with no citing test.
- `registry-code-no-test/` — a registry code with no asserting test.
- `asserted-code-not-in-registry/` — a test asserts a code absent from registry.
