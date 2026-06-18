# `V4e` — Pre-evaluation failures

**Spec.** [`../spec_topics/errors-and-results/error-model.md`](../spec_topics/errors-and-results/error-model.md).

**Adds.** The load-time pre-evaluation failure routing assertions (`ERR-1`…`ERR-6`, `ERR-16`) surfaced on the `loom-system-note` channel with `triggerTurn:false`, never becoming evaluation outcomes (the watcher-time reload-integration cause `ERR-7` is split out to [`V4g`](./V4g-pre-evaluation-reload-failure.md)). The slash-load `params` arm of ceiling #4 (`ERR-16`) **consults** `V16a`'s cross-ceiling arbitration seam at slash-load per CIO-1 — a load-time cross-route that differs in kind from the four runtime first-enforcement sites — binding the seam via its `Deps` on `V16a`. `ERR-16` is the delegated live-carrier witness for [`V5e`](./V5e-depth-enforcement.md)'s slash-load `params` routing row: the depth-6 breach it wraps is detected by `V5e`'s live loom-owned depth walk (not a synthetic load-time signal), binding `V5e` via its `Deps`.

**Tests.**
- `ERR-1`: host-incompatible pre-eval failure routes without firing a turn.
- `ERR-2`: lex/parse/type failure routes pre-eval.
- `ERR-3`: frontmatter failure routes pre-eval.
- `ERR-4`: binder-model resolution failure routes pre-eval.
- `ERR-5`: binder arg-binding failure (ceiling #3) routes pre-eval.
- `ERR-6`: `tools:` resolution failure routes pre-eval.
- `ERR-16`: the slash-load `params` arm of ceiling #4, cross-routed via CIO-1 / ceiling #3 no-retry, routes pre-eval.

**Deps.** `V4e-T`, `V9a`, `V6a`, `V11f`, `V10a`, `V16a`, `V5e` (`V5e` owns the loom-owned depth walk whose ceiling-#4 slash-load `params` routing decision and depth-6 breach `ERR-16` wraps)

**Ships when.** `npm test` proves all seven load-time pre-eval routing causes (`ERR-1`…`ERR-6`, `ERR-16`) route to `loom-system-note` without firing a turn.
