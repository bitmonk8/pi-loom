# `V15g-T` — Invoke invocation-record provenance seam (tests)

**Spec.** [`../spec_topics/invocation.md`](../spec_topics/invocation.md), [`../spec_topics/slash-invocation.md`](../spec_topics/slash-invocation.md).

**Adds.** Failing tests for the paired `V15g` implementation leaf.

**Tests.**
- `SLSH-5` invocation-record provenance seam ([slash-invocation.md — Chain attribution](../spec_topics/slash-invocation.md#slsh-5), consumed by `V12b`): for an executed `invoke` hop, the per-frame invocation record exposes the parent loom's post-`realpath` path and the call-site token's 1-indexed source line; a multi-line call confirms the recorded line is the call-site token's (the `invoke(` token of a literal call, or the callee-name identifier of a `.loom`-callable bare-identifier call), not a receiving binding's.

**Deps.** `V15a`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
