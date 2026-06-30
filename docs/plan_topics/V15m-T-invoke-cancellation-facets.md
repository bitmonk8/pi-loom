# `V15m-T` — Invoke-site cancellation checkpoint and completed-callee-finality witness (tests)

**Spec.** [`../spec_topics/cancellation.md`](../spec_topics/cancellation.md), [`../spec_topics/invocation.md`](../spec_topics/invocation.md).

**Adds.** Failing tests for the paired `V15m` implementation leaf.

**Tests.**
- Checkpoint before `invoke` ([cancellation.md — *Granularity*](../spec_topics/cancellation.md), [`coverage-matrix.md`](./coverage-matrix.md) code-keyed-area token `cka-47`, `V15m` facet — the `invoke` checkpoint site distributed off [`V17c`](./V17c-checkpoint-granularity.md); testability hook: the [`V8a`](./V8a-checkpoint-validator-seams.md) `Checkpoint` seam, [`host-interfaces-services.md#checkpoint-seam`](../spec_topics/pi-integration-contract/host-interfaces-services.md#checkpoint-seam)): drive the seam to assert a cancellation checkpoint fires immediately before each `invoke` on the live execution surface.

- `ERR-13` (delegated live-carrier witness for `V4f`'s completed-callee-finality deferral): an `invoke` child driven to completion on the live execution surface, then a downstream `?`/panic/cancel fired, leaves the completed callee's side effect in place with no compensating turn injected. These live surfaces are loom-runtime-internal, so this witness is `npm test`-assertable (no real-host-only smoke gate).

**Deps.** `V15a`, `V8a`, `V4f`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
