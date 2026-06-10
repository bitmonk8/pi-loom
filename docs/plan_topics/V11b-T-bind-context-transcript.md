# `V11b-T` — Bind context, truncation, and transcript renderer (tests)

**Spec.** [`../spec_topics/binder/binder-model-and-context.md`](../spec_topics/binder/binder-model-and-context.md), [`../spec_topics/binder/binder-bypass-and-envelope.md`](../spec_topics/binder/binder-bypass-and-envelope.md).

**Adds.** Failing tests for the paired `V11b` implementation leaf.

**Tests.**
- Session-context truncation walk ([`binder-model-and-context.md` §Session-context truncation](../spec_topics/binder/binder-model-and-context.md#session-context-truncation-bind_context-session)): a `FakeTokenEstimator` (PIC-16) stub assigns chosen per-message counts so the walk crosses each cap at a known boundary; each vector asserts the expected included-turn set/count (do not couple to Pi's real estimation heuristic):
  - token cap, inclusive boundary + whole-turn drop — per-turn counts (newest first) `[3000, 2500, 2500, 100, …]`: first three included (running total exactly 8000), fourth excluded entirely (`8100 > 8000`), cut is whole-turn;
  - token cap, over-budget mid-walk — `[1200, 900, 1500, 2000, 2800, …]`: four included (5600), fifth excluded;
  - turn cap, inclusive boundary — 21 turns whose token total never exceeds 8000: exactly the 20 newest included, 21st excluded;
  - single oversized newest turn (alone exceeds 8000): zero included turns (distinct from the `BNDR-7i` rendering assertion below).
- `BNDR-7`: the compact-transcript renderings (7a–7i) reproduce byte-exact, including the void-truncation whole-block omission (7i).
- `BNDR-8`: the assistant body emits the `[assistant]:` line first, then `[tool-call …]` in array order, with args JSON keys in ascending Unicode and array order verbatim.
- `BNDR-9`: a non-transcript-safe `customType` (containing any of `\n`, `\r`, `]`, or the two-byte sequence `": "` (U+003A U+0020)) fires `loom/runtime/custom-type-unsafe`.
- `loom/parse/bind-context-session-on-subagent`: fires for `bind_context: session` on a `mode: subagent` loom.

**Deps.** `V11a`, `V9i`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
