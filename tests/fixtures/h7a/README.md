# H7a — terminal integration-acceptance fixture artifacts

The committed reference set the [`H7a`](../../../docs/plan_topics/H7a-integration-acceptance.md)
terminal integration-acceptance gate reads directly (never re-derived from an
unreviewed pipeline run). All four artifacts are checked in alongside the
representative multi-feature fixture `acceptance.theta`.

- **`acceptance.theta`** — the single representative multi-feature fixture whose
  composed pipeline path the gate drives through the `H4a`/`H4b` harness
  response-programming surface (the deterministic integrated-pipeline model the
  Deps harness leaves consume): typed query → tool loop → code-tool invoke →
  schema lowering/validation → binder → cancellation.

- **`golden-transcript.json`** — the enumerated, ordered observable-turn
  sequence the composition produces (order, count, and per-turn content: each
  turn's text, tool arguments, and rendered envelope). Each golden turn is
  *derived* from the already-established expected output of the Deps slice that
  owns it (binder retry → success from `V11f`; the mixed-success parallel
  `tool_use` batch from `V14b`; the free-phase tool loop and terminating turn
  from `V13c`), not snapshotted from an unreviewed run; the composed ordering no
  single per-leaf gate covers is human-reviewed against the spec and the cited
  spec topics at first commit.

- **`golden-diagnostics.json`** — the set of `theta/...` codes the integrated
  fixture path actually emits as `theta-system-note` diagnostics, drawn only from
  codes the slices in **Deps** emit. The composed path emits the binder-facet
  `theta/runtime/custom-type-unsafe` (`V11b`, BNDR-9): the fixture's session
  context includes a `custom` message whose `customType` is not transcript-safe,
  so the binder rejects it before rendering. Each code is asserted against the
  diagnostics-registry *Message* string.

- **`permitted-codes.json`** — a **manually-maintained, best-effort** union of
  the `theta/...` codes the slices in **Deps** *can* emit, deliberately broader
  than the golden diagnostics list and intended as a **superset** of it. It is
  the single committed, reviewed reference set the `H4a` manual real-host smoke
  run's pass criterion (e) and the `H6a` release-gate evidence record check the
  live run's emitted codes against. Only the `golden ⊆ permitted` containment is
  mechanically gated; the union's completeness is not verified against an
  emittable-code registry, so a stale union can still omit a benign code a slice
  emits.

## Per-Deps-slice provenance (permitted-code union)

Kept current by the per-Deps-slice provenance obligation — each entry is
attributed to the Deps slice that can emit it:

| Code | Deps slice |
|---|---|
| `theta/load/binder-model-not-strict-capable` | `V11a` (binder-model resolution / strict-capability probe) |
| `theta/load/binder-model-strict-capability-unknown` | `V11a` |
| `theta/load/binder-model-unresolved` | `V11a` |
| `theta/load/typed-query-unsupported-provider` | `V11a` |
| `theta/load/schema-slug-collision` | `V5d` (schema-subset reject / `$defs` hoist slug) |
| `theta/runtime/custom-type-unsafe` | `V11b` (bind-context / compact-transcript, BNDR-9) — **golden** |
| `theta/runtime/internal-error` | `V14a` (code-side tool lowering, non-conforming tool-return-shape) |
| `theta/runtime/registration-cache-collision` | `V14a`/`V14b` (prompt-mode tool-registration cache) |
| `theta/runtime/validator-cache-collision` | `V5d`/`V13b` (per-query AJV compiled-validator cache) |
