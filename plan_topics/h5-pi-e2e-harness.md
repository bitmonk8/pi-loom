# H5 — Pi end-to-end harness

**Spec.** [Pi Extension Integration](../spec_topics/pi-integration.md), [Pi Integration Contract](../spec_topics/pi-integration-contract.md).

**Adds.** `test/integration/pi-harness.ts` exporting `createLoomTestSession({ extensionFactory, scriptedProvider })` that wires the project's `default function (pi)` factory into a real `AgentSession` via `createAgentSession` from `@mariozechner/pi-coding-agent` (see [Pi SDK docs](file://C:/Users/thomasa/AppData/Roaming/npm/node_modules/@mariozechner/pi-coding-agent/docs/sdk.md)), with a scripted/recorded provider for deterministic turns and no real model API key required (provider auth must be absent in CI per [`docs/custom-provider.md`](file://C:/Users/thomasa/AppData/Roaming/npm/node_modules/@mariozechner/pi-coding-agent/docs/custom-provider.md)). A Vitest helper `runSlash(name, argString)` that drives a slash command end-to-end and returns the resulting transcript entries. The harness instantiates a fresh `AgentSession` per test (the extension factory runs once per session, so `/reload` semantics require a new session, never reuse).

**Tests.**
- Harness boots an empty extension and `/loom-status` (registered by H4) returns its no-op string `"pi-loom: no looms loaded yet"` from a real `AgentSession`.
- The harness tears the session down cleanly between tests (no leaked subscriptions, no surviving registered commands).
- Provider scripting is deterministic across runs: identical script + identical input ⇒ identical transcript.
- The harness rejects construction when a real provider API key would otherwise be required (CI guard).
- Cancellation exercised in integration is wired through `AgentSession.abort()` on the handle returned by `createAgentSession(...)` (and, for subagent-mode child invocations spawned from inside an end-to-end loom, through the runtime's one-shot `loomAbort.signal` listener that calls the same), not through any `signal` option on `CreateAgentSessionOptions` (no such option exists in the V1 Pi SDK pin); per [Pi Integration Contract — Subagent session lifecycle and Cancellation source](../spec_topics/pi-integration-contract.md).

**Deps.** H4.

**Ships when.** `npm test` exercises a real `AgentSession` with the project's extension factory loaded and at least one slash command (`/loom-status`) round-trips end-to-end through the harness.
