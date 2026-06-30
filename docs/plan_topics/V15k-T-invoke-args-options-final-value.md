# `V15k-T` — Invoke runtime arg/options and final-value propagation (tests)

**Spec.** [`../spec_topics/invocation.md`](../spec_topics/invocation.md), [`../spec_topics/return.md`](../spec_topics/return.md), [`../spec_topics/functions.md`](../spec_topics/functions.md#final-value-language-definition).

**Adds.** Failing tests for the paired `V15k` implementation leaf.

**Tests.**
- `INV-2`: the AST arg list carries `style:"positional"|"named"`; only positional is defined in 1.0.
- `INV-3`: the invoke-options record is an open struct (additive per-call-timeout seam).
- `FN-5` re-citation ([return.md — final-value contract](../spec_topics/return.md), [functions.md — Final value](../spec_topics/functions.md#final-value-language-definition)), against the function-result seam `V3d` defines: the callee's produced final value propagates to the `invoke` caller on success and is absent on fail/cancel.

**Deps.** `V15a`, `V2b`, `V3d`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
