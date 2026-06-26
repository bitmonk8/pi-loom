# `V15h` — Invoke-child execution-Promise swallowing-handler per-site routing

**Spec.** [`../spec_topics/cancellation.md`](../spec_topics/cancellation.md).

**Adds.** The `invoke` child top-level execution Promise site's routing through the `Checkpoint`-seam swallowing-handler substrate — the per-site witness that the `invoke` child execution Promise attaches its swallowing handler at the construction site and suppresses a late settlement along all three side channels at the `Checkpoint` seam ([`V8a`](./V8a-checkpoint-validator-seams.md)). This is the `invoke`-child entry in the four-site routing set [`V17a`](./V17a-cancellation-core.md) delegates to its owning leaves (`V14f`, `V13f`, `V15h`, `V9o`).

**Tests.**
- Swallowing-handler attachment at this site ([cancellation.md — *Race semantics — swallowing-handler attachment on every abandonable Promise*](../spec_topics/cancellation.md); the test source cites both the `cka-33` row token and this facet's `V15h` leaf-ID inline so the `H5f` per-facet citing-test gate associates this facet to its test): assert the `invoke` child's top-level execution Promise attaches its swallowing handler at the Promise-construction site (before the first microtask boundary), and that a late settlement landed via the `Checkpoint` seam (`V8a`) after the checkpoint has surfaced `cause: "cancelled"` is suppressed along all three side channels — no Node `unhandledRejection`, no second `RuntimeEvent`, and no diagnostic of any severity — so a build that bypasses the substrate reddens this leaf's tests.

**Deps.** `V15h-T`, `V15a`, `V8a`

**Ships when.** `npm test` lands a late settlement on the `invoke` child top-level execution Promise via the `Checkpoint` seam (`V8a`) after the checkpoint has surfaced `cause: "cancelled"`, and asserts the Promise's three-channel swallowing-handler suppression (no `unhandledRejection`, no second `RuntimeEvent`, no diagnostic) — a build that bypasses the substrate reddens this leaf's tests.
