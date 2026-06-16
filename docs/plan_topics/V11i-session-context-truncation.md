# `V11i` — Session-context truncation walk

**Spec.** [`../spec_topics/binder/binder-model-and-context.md`](../spec_topics/binder/binder-model-and-context.md).

**Adds.** The `bind_context: session` runtime truncation walk that sources its message list from `buildSessionContext(ctx.sessionManager.getEntries(), ctx.sessionManager.getLeafId()).messages`, counts tokens per message through the injected `TokenEstimator` seam ([`V8e`](./V8e-watch-token-seams.md)), and selects the most-recent whole turns under the 8000-token / 20-turn caps before handing them to the [`V11b`](./V11b-bind-context-transcript.md) compact-transcript renderer.

**Tests.**
- Session-context truncation walk ([`binder-model-and-context.md` §Session-context truncation](../spec_topics/binder/binder-model-and-context.md#session-context-truncation-bind_context-session)): a `FakeTokenEstimator` (PIC-16, [`V8e`](./V8e-watch-token-seams.md)) stub drives the walk across each cap at a known boundary, asserting the expected included-turn set/count for the token-cap inclusive boundary (`[3000, 2500, 2500, 100, …]` → 3 turns / 8000 tokens), the over-budget mid-walk vector (`[1200, 900, 1500, 2000, 2800, …]` → 4 turns / 5600 tokens), the 20-turn inclusive boundary (21 turns under budget → 20 newest), and the single oversized newest turn (alone > 8000 → zero turns handed to the renderer).

**Deps.** `V11i-T`, `V8e`, `V9i`, `V11b`

**Ships when.** `npm test` drives the session-context truncation walk with an injected `FakeTokenEstimator` and the walk cuts at the inclusive 8000-token and 20-turn caps per the worked-example vectors, including the zero-turn result handed to the `V11b` renderer.
