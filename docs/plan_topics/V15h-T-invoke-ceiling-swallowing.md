# `V15h-T` — Invoke ceiling-#4 depth surfaces and swallowing-handler suppression (tests)

**Spec.** [`../spec_topics/hard-ceilings/ceilings-3-and-4.md`](../spec_topics/hard-ceilings/ceilings-3-and-4.md) (the `params` / `invoke<T>`-return rows of the ceiling-#4 per-boundary table), [`../spec_topics/cancellation.md`](../spec_topics/cancellation.md), [`../spec_topics/invocation.md`](../spec_topics/invocation.md).

**Adds.** Failing tests for the paired `V15h` implementation leaf.

**Tests.**
- Swallowing-handler attachment at this site ([cancellation.md — *Race semantics — swallowing-handler attachment on every abandonable Promise*](../spec_topics/cancellation.md)): assert the `invoke` child's top-level execution Promise attaches its swallowing handler at the Promise-construction site (before the first microtask boundary), and that a late settlement landed via the `Checkpoint` seam (`V8a`) after the checkpoint has surfaced `cause: "cancelled"` is suppressed along all three side channels — no Node `unhandledRejection`, no second `RuntimeEvent`, and no diagnostic of any severity — so a build that bypasses the substrate reddens this leaf's tests.
- [ceilings-3-and-4.md — Per-boundary destination/surface table (ceiling #4)](../spec_topics/hard-ceilings/ceilings-3-and-4.md#ceiling-4-table) (delegated live-carrier witness for `V5e`'s `params` / `invoke<T>`-return routing rows): a depth-6 value passed as a runtime `invoke(...)` `params` argument trips the loom-owned depth walk (`V5e`) before AJV and surfaces as `Err(InvokeInfraError { cause: "validation" })`, and a depth-6 `invoke<T>` return value surfaces as `Err(InvokeInfraError { cause: "return_validation" })`; both carry `schema_keyword: "maxDepth"` (message `"JSON document depth exceeds 5"`). The `params` vector targets the runtime `invoke` boundary, not the binder slash-load `params` boundary — per `CIO-1` a ceiling-#4 breach at the slash-load `params` boundary cross-routes to ceiling #3 (witnessed at `V11f` / `V4e`) and does not surface here.

**Deps.** `V15a`, `V5e`, `V8a`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
