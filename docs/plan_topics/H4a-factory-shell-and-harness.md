# `H4a` — Extension factory shell and end-to-end harness

**Convention.** [`conventions.md`](./conventions.md) (phase categories — Pi-extension shell, end-to-end harness).

**Adds.** The Pi extension factory entry point (returns an extension object without throwing) and a reusable end-to-end test harness that loads the extension against an in-process Pi session double and drives a slash dispatch, together with the **session-double fidelity contract** — the enumerated set of pinned-`@earendil-works/pi-coding-agent` behaviours the in-process double must reproduce: streamed-token order relative to `ctx.waitForIdle()` resolution, single-turn prompt-mode append semantics, the `pi.on` cancel-forward subscription, and cancellation propagation. The capability-probe refusal logic is added by `V9a`; this leaf only establishes the never-throw factory boundary, the harness, and the fidelity contract its self-check enforces.

**Tests.**
- `Convention:` (phase categories) the factory returns an extension object and never throws even when a host seam is absent (each host-binding call is `try`/`catch`-wrapped per the exempt-broad-catch sites in `conventions.md`).
- `Convention:` (end-to-end harness) the harness loads the extension and asserts a registered command can be dispatched end-to-end against the session double.
- `Convention:` (end-to-end harness) the **session-double fidelity contract** is asserted by a harness self-check: the in-process double reproduces, relative to the pinned `@earendil-works/pi-coding-agent` SDK, (i) streamed assistant tokens observable in the transcript before `ctx.waitForIdle()` resolves, (ii) one streamed assistant response appended as a single prompt-mode turn, (iii) the `pi.on` cancel-forward subscription, and (iv) cancellation propagation. The self-check asserts these behaviours *as modelled by the in-process double* — the harness deliberately avoids a live Pi session, so the real-host backstop that confirms the double matches live Pi is `V18c`'s version-bump runtime-evidence gate ([`V18c`](./V18c-version-bump-checklist.md)).

**Deps.** `H3a`

**Ships when.** `npm test` loads the extension through the harness, dispatches a no-op command end-to-end, and the session-double fidelity-contract self-check passes.
