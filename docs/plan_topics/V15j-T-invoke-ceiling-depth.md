# `V15j-T` — Invoke ceiling-#4 depth-6 `params` / `invoke<T>`-return routing (live carrier) (tests)

**Spec.** [`../spec_topics/hard-ceilings/ceilings-3-and-4.md`](../spec_topics/hard-ceilings/ceilings-3-and-4.md) (the `params` / `invoke<T>`-return rows of the ceiling-#4 per-boundary table), [`../spec_topics/invocation.md`](../spec_topics/invocation.md).

**Adds.** Failing tests for the paired `V15j` implementation leaf.

**Tests.**
- [ceilings-3-and-4.md — Per-boundary destination/surface table (ceiling #4)](../spec_topics/hard-ceilings/ceilings-3-and-4.md#ceiling-4-table) (delegated live-carrier witness for `V5e`'s `params` / `invoke<T>`-return routing rows): a depth-6 value passed as a runtime `invoke(...)` `params` argument trips the loom-owned depth walk (`V5e`) before AJV and surfaces as `Err(InvokeInfraError { cause: "validation" })`, and a depth-6 `invoke<T>` return value surfaces as `Err(InvokeInfraError { cause: "return_validation" })`; both carry `schema_keyword: "maxDepth"` (message `"JSON document depth exceeds 5"`). The `params` vector targets the runtime `invoke` boundary, not the binder slash-load `params` boundary — per `CIO-1` a ceiling-#4 breach at the slash-load `params` boundary cross-routes to ceiling #3 (witnessed at `V11f` / `V4e`) and does not surface here.

**Deps.** `V15a`, `V5e`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
