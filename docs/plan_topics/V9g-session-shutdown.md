# `V9g` — Session-shutdown teardown and emission isolation

**Spec.** [`../spec_topics/pi-integration-contract/session-shutdown-semantics.md`](../spec_topics/pi-integration-contract/session-shutdown-semantics.md), [`../spec_topics/pi-integration-contract/diagnostic-emission-isolation.md`](../spec_topics/pi-integration-contract/diagnostic-emission-isolation.md), [`../spec_topics/pi-integration-contract/patch-skew-degradation.md`](../spec_topics/pi-integration-contract/patch-skew-degradation.md), [`../spec_topics/cancellation.md`](../spec_topics/cancellation.md).

**Adds.** The `session_shutdown` handler: the five-sub-step fixed teardown sequence with per-step isolation, session-swap semantics for in-flight invocations (abort-and-await within `SHUTDOWN_AWAIT_CAP_MS`), the `loom/host/*` teardown diagnostics emitted via `console.error` with each emission `try`/`catch`-wrapped, and the bare / two-token / three-token fallback wire forms.

**Tests.**
- `PIC-7`: one active user session per instance; the reason union is pinned to `SessionShutdownEvent['reason']`.
- `DIAG-1` (host rows): `loom/host/session-shutdown-teardown-step-failed` fires with its closed `details.call` set; each `console.error` emission is wrapped and a serialiser throw degrades to the bare-`code` form.
- `loom/runtime/cancelled-by-session-shutdown` is emitted per in-flight invocation; `loom/runtime/reload-teardown-timeout` fires at the cap.
- `CNCL-4` (session-shutdown synthesised-reason facet): the `session_shutdown` handler aborts each in-flight `loomAbort` with a synthesised `Error` whose `message` is byte-exact `"loom cancelled by session shutdown"`; assert this is the observed `loomAbort.signal.reason` at a downstream checkpoint.

**Deps.** `V9g-T`, `V9e`, `V9h`, `V17a`

**Ships when.** `npm test` drives a shutdown, asserting per-step isolation, the await cap, the wrapped host emissions, and the `CNCL-4` session-shutdown reason facet — each in-flight `loomAbort` carries a synthesised `Error` whose `message` is byte-exact `"loom cancelled by session shutdown"`, observed as `loomAbort.signal.reason` at a downstream checkpoint.
