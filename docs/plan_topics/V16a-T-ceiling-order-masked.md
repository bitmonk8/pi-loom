# `V16a-T` — Hard-ceiling interaction order and `masked` co-fire (tests)

**Spec.** [`../spec_topics/hard-ceilings.md`](../spec_topics/hard-ceilings.md), [`../spec_topics/hard-ceilings/ceilings-3-and-4.md`](../spec_topics/hard-ceilings/ceilings-3-and-4.md), [`../spec_topics/hard-ceilings/ceiling-invariants-and-audit.md`](../spec_topics/hard-ceilings/ceiling-invariants-and-audit.md).

**Adds.** Failing tests for the paired `V16a` implementation leaf: synthesised ceiling-candidates driven through the cross-ceiling arbitration seam, asserting its `{ surfaced, masked }` output in CIO-1 … CIO-6 order.

**Tests.**
- `CIO-1`: given a synthesised candidate co-presenting ceiling #3 (binder retry) and a runtime-class ceiling, the seam surfaces #3 (the precedence *decision*; the slash-load `params` arm of #4 is routed by #3 templates). The temporal slash-load-before-runtime placement is witnessed downstream (`V4e`/`V11f` load-time consult vs `V5e`/`V13c`/`V15b` runtime consults) per [`ceilings-3-and-4.md#cio-1`](../spec_topics/hard-ceilings/ceilings-3-and-4.md#cio-1), not at this seam.
- `CIO-2`: ceiling #1 (`invoke` depth) is evaluated at `invoke` entry before the callee body.
- `CIO-3`: a synthesised candidate tagged as an AJV-boundary event resolves ceiling #4 (JSON depth) as the first sub-check; the depth walk is ordered before AJV.
- `CIO-4`: ceiling #2 (`tool_loop.max_rounds`) is evaluated at the round boundary, post-slot-increment, pre-next-turn; `max_rounds:0` typed takes the final branch at start.
- `CIO-5`: given a synthesised candidate co-presenting ceiling #3 with #1/#2/#4, the seam surfaces a single ceiling (the arbitration decision). CIO-5's cross-site "ceiling #3 never interleaves" temporal property is witnessed end-to-end by `H7a` per [`ceilings-3-and-4.md#cio-5`](../spec_topics/hard-ceilings/ceilings-3-and-4.md#cio-5), not by this stateless seam.
- `CIO-6`: at most one ceiling surfaces per event; `masked` enumerates co-fired siblings.

**Deps.** `V9d`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
