# `V15j` — Invoke ceiling-#4 depth-6 `params` / `invoke<T>`-return routing (live carrier)

**Spec.** [`../spec_topics/hard-ceilings/ceilings-3-and-4.md`](../spec_topics/hard-ceilings/ceilings-3-and-4.md) (the `params` / `invoke<T>`-return rows of the ceiling-#4 per-boundary table), [`../spec_topics/invocation.md`](../spec_topics/invocation.md).

**Adds.** The live-carrier witness for [`V5e`](./V5e-depth-enforcement.md)'s `params` / `invoke<T>`-return ceiling-#4 routing rows — a depth-6 `invoke(...)` `params` argument and a depth-6 `invoke<T>` return value tripping the loom-owned depth walk (`V5e`) before AJV and surfacing wrapped as `InvokeInfraError`, building on the [`V15a`](./V15a-invocation-core.md) invoke core.

**Tests.**
- [ceilings-3-and-4.md — Per-boundary destination/surface table (ceiling #4)](../spec_topics/hard-ceilings/ceilings-3-and-4.md#ceiling-4-table) (delegated live-carrier witness for `V5e`'s `params` / `invoke<T>`-return routing rows): a depth-6 value passed as a runtime `invoke(...)` `params` argument trips the loom-owned depth walk (`V5e`) before AJV and surfaces as `Err(InvokeInfraError { cause: "validation" })`, and a depth-6 `invoke<T>` return value surfaces as `Err(InvokeInfraError { cause: "return_validation" })`; both carry `schema_keyword: "maxDepth"` (message `"JSON document depth exceeds 5"`). The `params` vector targets the runtime `invoke` boundary, not the binder slash-load `params` boundary — per `CIO-1` a ceiling-#4 breach at the slash-load `params` boundary cross-routes to ceiling #3 (witnessed at `V11f` / `V4e`) and does not surface here. This invoke-boundary ceiling-#4 routing witness is tracked as the `cka-10` co-witness closing leaf `V15j` (schema-subset.md / SUBS, closed by `V5e`).

**Deps.** `V15j-T`, `V15a`, `V5e`

**Ships when.** `npm test` asserts a depth-6 runtime `invoke` `params` argument and a depth-6 `invoke<T>` return value each surface as `InvokeInfraError` (`cause:"validation"` and `cause:"return_validation"` respectively) carrying `schema_keyword:"maxDepth"` (message `"JSON document depth exceeds 5"`).
