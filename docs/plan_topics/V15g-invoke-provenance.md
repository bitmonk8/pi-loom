# `V15g` — Invoke invocation-record provenance seam

**Spec.** [`../spec_topics/invocation.md`](../spec_topics/invocation.md), [`../spec_topics/slash-invocation.md`](../spec_topics/slash-invocation.md).

**Adds.** The per-`invoke`-hop invocation-record provenance producer seam: for an executed `invoke` hop it records, into the per-frame invocation record, the parent loom's post-`realpath` path (the same `realpath`-normalised parent path [`V15a`](./V15a-invocation-core.md) captures for discovery-root containment) and the 1-indexed source line of the call-site token (the `invoke(` token of a literal `invoke(...)` call, or the callee-name identifier of a `.loom`-callable bare-identifier call). This is the seam [`V12b`](./V12b-top-level-err-chain.md) consumes to render its `SLSH-5` chain-attribution suffix.

**Tests.**
- `SLSH-5` invocation-record provenance seam ([slash-invocation.md — Chain attribution](../spec_topics/slash-invocation.md#slsh-5), consumed by [`V12b`](./V12b-top-level-err-chain.md)): for an executed `invoke` hop, the per-frame invocation record exposes the parent loom's post-`realpath` path and the call-site token's 1-indexed source line; a multi-line call confirms the recorded line is the call-site token's (the `invoke(` token of a literal call, or the callee-name identifier of a `.loom`-callable bare-identifier call), not a receiving binding's. (`V12b` renders the `from <callee> invoked at <parent>:<line>` suffix from this record; this leaf is its producer.)

**Deps.** `V15g-T`, `V15a`

**Ships when.** `npm test` asserts the per-frame invocation record exposes the parent loom's post-`realpath` path and the call-site token's 1-indexed source line for an executed `invoke` hop, with a multi-line call pinning the recorded line to the call-site token (not a receiving binding's).
