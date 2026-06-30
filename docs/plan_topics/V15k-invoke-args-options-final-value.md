# `V15k` — Invoke runtime arg/options and final-value propagation

**Spec.** [`../spec_topics/invocation.md`](../spec_topics/invocation.md), [`../spec_topics/return.md`](../spec_topics/return.md), [`../spec_topics/functions.md`](../spec_topics/functions.md#final-value-language-definition).

**Adds.** The runtime arg/options and final-value facets split out of [`V15a`](./V15a-invocation-core.md): the AST arg-list `style` field (`INV-2`), the open invoke-options struct (`INV-3`), and the callee's produced final value propagating to the `invoke` caller on success (absent on fail/cancel) against the function-result seam [`V3d`](./V3d-functions-and-return.md) defines (`FN-5`). Split out of `V15a` (which retains load-time/invocation-time `realpath` containment and the static-resolution per-pass parse cache) per [`conventions.md`](./conventions.md) §smallest-shippable-leaf, mirroring the `V15f`/`V15g`/`V15h` carve-out pattern.

**Tests.**
- `INV-2`: the AST arg list carries `style:"positional"|"named"`; only positional is defined in 1.0.
- `INV-3`: the invoke-options record is an open struct (additive per-call-timeout seam).
- `FN-5` re-citation ([return.md — final-value contract](../spec_topics/return.md), [functions.md — Final value](../spec_topics/functions.md#final-value-language-definition)), against the function-result seam `V3d` defines: the callee's produced final value propagates to the `invoke` caller on success and is absent on fail/cancel.

**Deps.** `V15k-T`, `V15a`, `V2b`, `V3d`

**Ships when.** `npm test` asserts `INV-2` (the AST arg list carries `style`, positional-only in 1.0), `INV-3` (the invoke-options record is an open struct), and the `FN-5` final-value propagation against `V3d`'s function-result seam — the callee's produced final value reaches the `invoke` caller on success and is absent on fail/cancel.
