# `V17a-T` — Cancellation core (tests)

**Spec.** [`../spec_topics/cancellation.md`](../spec_topics/cancellation.md), [`../spec_topics/pi-integration-contract/host-interfaces-core.md`](../spec_topics/pi-integration-contract/host-interfaces-core.md).

**Adds.** Failing tests for the paired `V17a` implementation leaf.

**Tests.**
- `CNCL-1`: a late tool-call value does not rebind its call site.
- `CNCL-2`: no second `Err` is produced per invocation.
- `CNCL-3`: no second `RuntimeEvent` is produced per invocation.
- `CNCL-4`: abort-reason propagation — after each of the three forwarding paths fires, land an abort via the `Checkpoint` seam (`V8a`) and assert `loomAbort.signal.reason === source.reason` at the downstream checkpoint (reason identity, not merely `aborted`); the first source's reason wins under the one-shot guard. For the reason-less `agent_end` slash-command trigger, assert the synthesised `Error.message` is byte-exact `"loom cancelled by agent_end"`. (The `"loom cancelled by session shutdown"` synthesised-reason facet is asserted in `V9g`, whose handler produces it.)
- `CNCL-5`: no retroactive rewrite of a completed `Ok` — land an abort via the `Checkpoint` seam after an operation returns `Ok(v)` but before the next checkpoint; assert the value is retained and not rewritten to `Err({kind:"cancelled"})`.
- `CNCL-6`: no top-level synthesis on tail abort — land an abort in a pure tail after the final cancellable operation, so no further checkpoint executes; assert the top-level result is the produced value and no synthesised top-level `cancelled` appears.
- `loom/parse/timeout-field-rejected` (cancellation.md — CNCL area): cancellation forwards via `loomAbort` (never `ctx.signal` directly); propagates downward only; a swallowing handler suppresses the late side-channel; `loom/parse/timeout-field-rejected` fires on a timeout field.

**Deps.** `V8a`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
