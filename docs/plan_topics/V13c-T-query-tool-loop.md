# `V13c-T` — Query tool loop and typed two-phase (tests)

**Spec.** [`../spec_topics/query/query-tool-loop.md`](../spec_topics/query/query-tool-loop.md), [`../spec_topics/hard-ceilings/ceilings-3-and-4.md`](../spec_topics/hard-ceilings/ceilings-3-and-4.md).

**Adds.** Failing tests for the paired `V13c` implementation leaf.

**Tests.**
- `CIO-4` (query-tool-loop.md — free phase): the free phase advances rounds; a parallel batch counts as one slot; the forced-respond turn is exempt from the round count (CIO-4 final branch).
- [query-tool-loop.md — `max_rounds:0` boundary](../spec_topics/query/query-tool-loop.md) (QRY code-keyed area): `max_rounds:0` (typed) takes the forced-respond branch at the start.
- [query-tool-loop.md — exhaustion](../spec_topics/query/query-tool-loop.md) (QRY code-keyed area), untyped exhaustion: ceiling #2 surfaces as `Err(QueryError { kind: "tool_loop_exhausted" })` (`ToolLoopExhaustedError`), with no `masked` field (omitted, never `[]`).
- [query-tool-loop.md — Worked example: depth-6 forced respond at `max_rounds`](../spec_topics/query/query-tool-loop.md) (QRY code-keyed area), typed depth-6 co-fire vector: ceiling #4 surfaces on the typed-query response in loom code as `Err(QueryError { kind: "validation", cause: "schema_validation" })` (`schema_keyword: "maxDepth"`); separately, the co-satisfied-but-masked ceiling #2 is enumerated on the operator-facing `RuntimeEvent`, never on the `QueryError` — its `masked` field at the wire location `details.event.masked` carries `["ceiling#2"]` (`CIO-4`/`CIO-6`). The surfaced ceiling is the observable `validation`/`maxDepth` `Err`, not a literal `surfaced:` wire key (the full `RuntimeEvent` payload shape is owned by [`runtime-event-channel.md` PIC-1](../spec_topics/pi-integration-contract/runtime-event-channel.md#pic-1), exercised by `V9d`'s `RuntimeEvent`-conformance test).

**Deps.** `V13b`, `V9c`, `V16a`, `V5e`, `V8c`, `H4b`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
