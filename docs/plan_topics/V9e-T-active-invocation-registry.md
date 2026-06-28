# `V9e-T` — `ActiveInvocationRegistry` (tests)

**Spec.** [`../spec_topics/pi-integration-contract/active-invocation-registry.md`](../spec_topics/pi-integration-contract/active-invocation-registry.md).

**Adds.** Failing tests for the paired `V9e` implementation leaf.

**Tests.**
- [active-invocation-registry.md — insertion-order iteration](../spec_topics/pi-integration-contract/active-invocation-registry.md) (PIC area): a registered invocation is iterated in insertion order; teardown reaches every in-flight entry.
- [active-invocation-registry.md — `disposeBarrier`](../spec_topics/pi-integration-contract/active-invocation-registry.md) (PIC area): the per-entry `disposeBarrier` `Promise<void>` settles after that entry's `AgentSession.dispose()` returns (subagent mode) / immediately (prompt mode) — a single entry's barrier, not the aggregate settle-all.
- [active-invocation-registry.md — `invocationId` allocation](../spec_topics/pi-integration-contract/active-invocation-registry.md) (PIC area): `invocationId` is sourced only from `IdSource.newInvocationId()`.
- [active-invocation-registry.md — Dispatch-site setup wrap failure path](../spec_topics/pi-integration-contract/active-invocation-registry.md) (PIC area, §*Registry contract → Dispatch-site setup wrap*): a setup-sequence throw and a setup-sequence rejection at an insertion site each route through the runtime-defect surface (`loom/runtime/internal-error` / `InvokeInfraError { cause: "internal_error" }`); a throw before the registry `Set.add` completes leaks no entry (the entry-count probe stays empty); and a throw from the `catch`-arm cleanup `loomAbort.abort()` is dropped without masking the original setup throw. Asserted on observable side effects (the emitted diagnostic/error surface and the entry-count probe), per the registry-name-is-internal testing posture.

**Deps.** `V9b`, `V8d`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
