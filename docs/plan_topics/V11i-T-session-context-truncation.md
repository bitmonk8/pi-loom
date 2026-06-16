# `V11i-T` — Session-context truncation walk (tests)

**Spec.** [`../spec_topics/binder/binder-model-and-context.md`](../spec_topics/binder/binder-model-and-context.md).

**Adds.** Failing tests for the paired `V11i` implementation leaf.

**Tests.**
- Session-context truncation walk ([`binder-model-and-context.md` §Session-context truncation](../spec_topics/binder/binder-model-and-context.md#session-context-truncation-bind_context-session)): a `FakeTokenEstimator` (PIC-16, [`V8e`](./V8e-watch-token-seams.md)) stub assigns chosen per-message counts so the walk crosses each cap at a known boundary; each vector asserts the expected included-turn set/count (do not couple to Pi's real estimation heuristic):
  - token cap, inclusive boundary + whole-turn drop — per-turn counts (newest first) `[3000, 2500, 2500, 100, …]`: first three included (running total exactly 8000), fourth excluded entirely (`8100 > 8000`), cut is whole-turn;
  - token cap, over-budget mid-walk — `[1200, 900, 1500, 2000, 2800, …]`: four included (5600), fifth excluded;
  - turn cap, inclusive boundary — 21 turns whose token total never exceeds 8000: exactly the 20 newest included, 21st excluded;
  - single oversized newest turn (alone exceeds 8000): zero included turns (distinct from the `BNDR-7i` rendering assertion the `V11b` renderer owns).

**Deps.** `V8e`, `V9i`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
