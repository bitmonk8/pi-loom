# `V10d-T` — Reload debounce and settings-re-merge failure-injection arm (tests)

**Spec.** [`../spec_topics/discovery/package-and-settings.md`](../spec_topics/discovery/package-and-settings.md).

**Adds.** Failing tests for the paired `V10d` implementation leaf.

**Tests.**
- [package-and-settings.md — Caching and reload](../spec_topics/discovery/package-and-settings.md#caching-and-reload) (reload-debounce code-keyed area): the reload debounce is driven through the injected `Clock` seam via the `FakeClock` test double (`Clock.setTimeout` / `Clock.clearTimeout`), advancing virtual time deterministically: a burst of N watcher events within one 250 ms window — each clearing the pending handle and rescheduling — produces exactly one reload (distinguishing coalescing from per-event firing, which would produce N reloads), and a further watcher event after virtual time crosses the window boundary following the last event produces a second reload.
- `PIC-49` (cross-window rebuild serialization, [registration-steps.md#pic-49](../spec_topics/pi-integration-contract/registration-steps.md#pic-49)): the red-first counterpart to the paired `V10d` arm — driven through the injected `Clock` / `FakeClock` seam, a debounce timer that fires while a prior window's rebuild is still in flight must defer rather than start a concurrent rebuild against the live `LoomRegistry`, validator cache, and prompt-mode registration cache, and the in-flight guard must release on the in-flight rebuild's synchronous publish or its `loom/runtime/registry-swap-failed` discard; the test fails red for the intended reason until `V10d` implements the serialization guard.

**Deps.** `V10c`, `V8d`, `V9b` (the reload debounce is measured against the injected `Clock` seam `V8d` owns; the settings-re-merge arm is contributed against the `ReloadFailureInjector` interface `V9b` declares; the re-merge re-runs the merge `V10c` owns)

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
