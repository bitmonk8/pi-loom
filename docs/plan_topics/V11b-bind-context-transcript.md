# `V11b` — Bind context, truncation, and transcript renderer

**Spec.** [`../spec_topics/binder/binder-model-and-context.md`](../spec_topics/binder/binder-model-and-context.md), [`../spec_topics/binder/binder-bypass-and-envelope.md`](../spec_topics/binder/binder-bypass-and-envelope.md).

**Adds.** The `bind_context` (`none`|`session`) selection with the 8000-token / 20-turn whole-turn truncation (via `TokenEstimator` and `buildSessionContext`), and the transcript renderer feeding the binder context.

**Tests.**
- Session-context truncation walk ([`binder-model-and-context.md` §Session-context truncation](../spec_topics/binder/binder-model-and-context.md#session-context-truncation-bind_context-session)): a `FakeTokenEstimator` (PIC-16) stub drives the walk across each cap at a known boundary, asserting the expected included-turn set/count for the token-cap inclusive boundary (`[3000, 2500, 2500, 100, …]` → 3 turns / 8000 tokens), the over-budget mid-walk vector (`[1200, 900, 1500, 2000, 2800, …]` → 4 turns / 5600 tokens), the 20-turn inclusive boundary (21 turns under budget → 20 newest), and the single oversized newest turn (alone > 8000 → zero turns).
- `BNDR-7`: the compact-transcript renderings (7a–7i) reproduce byte-exact, including the void-truncation whole-block omission (7i).
- `BNDR-8`: the assistant body emits the `[assistant]:` line first, then `[tool-call …]` in array order, with args JSON keys in ascending Unicode and array order verbatim.
- `BNDR-9`: a non-transcript-safe `customType` (containing any of `\n`, `\r`, `]`, or the two-byte sequence `": "` (U+003A U+0020)) fires `loom/runtime/custom-type-unsafe`.
- `loom/parse/bind-context-session-on-subagent`: fires for `bind_context: session` on a `mode: subagent` loom.

**Deps.** `V11b-T`, `V11a`, `V9i`

**Ships when.** `npm test` reproduces the 7a–7i and BNDR-8 renderings byte-exact, fires `custom-type-unsafe`, and the session-context truncation walk cuts at the inclusive 8000-token and 20-turn caps per the worked-example vectors.
