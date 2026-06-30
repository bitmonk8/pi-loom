# `V15m` — Invoke-site cancellation checkpoint and completed-callee-finality witness

**Spec.** [`../spec_topics/cancellation.md`](../spec_topics/cancellation.md), [`../spec_topics/invocation.md`](../spec_topics/invocation.md).

**Adds.** The cancellation facets that ride on the live `invoke` execution surface, split out of [`V15a`](./V15a-invocation-core.md): the `invoke`-site cancellation checkpoint (`cka-47` `V15m` facet) and the completed-callee-finality live-carrier witness (`ERR-13`). Split out of `V15a` (which retains load-time/invocation-time `realpath` containment and the static-resolution per-pass parse cache) per [`conventions.md`](./conventions.md) §smallest-shippable-leaf, mirroring the `V15f`/`V15g`/`V15h` carve-out pattern. Lands after [`V17c`](./V17c-checkpoint-granularity.md) via the `V4f` chain (it depends on `V4f`, which depends on `V17c`), so it cannot be pulled into `V17c.Deps` without closing the `V17c ↔ V4f` cycle.

**Tests.**
- Checkpoint before `invoke` ([cancellation.md — *Granularity*](../spec_topics/cancellation.md), [`coverage-matrix.md`](./coverage-matrix.md) code-keyed-area token `cka-47`, `V15m` facet — the `invoke` checkpoint site distributed off [`V17c`](./V17c-checkpoint-granularity.md); testability hook: the [`V8a`](./V8a-checkpoint-validator-seams.md) `Checkpoint` seam, [`host-interfaces-services.md#checkpoint-seam`](../spec_topics/pi-integration-contract/host-interfaces-services.md#checkpoint-seam)): drive the seam to assert a cancellation checkpoint fires immediately before each `invoke` on the live execution surface.

- `ERR-13` (delegated live-carrier witness for `V4f`'s completed-callee-finality deferral): an `invoke` child driven to completion on the live execution surface, then a downstream `?`/panic/cancel fired, leaves the completed callee's side effect in place with no compensating turn injected.

**Deps.** `V15m-T`, `V15a`, `V8a`, `V4f`

**Ships when.** `npm test` drives the [`V8a`](./V8a-checkpoint-validator-seams.md) `Checkpoint` seam to assert a cancellation checkpoint fires immediately before each `invoke` (the `cka-47` `V15m` facet), and asserts the `ERR-13` completed-callee-finality witness — an `invoke` child driven to completion on the live execution surface stays final after a downstream `?`/panic/cancel, its side effect persisting with no compensating turn injected.
