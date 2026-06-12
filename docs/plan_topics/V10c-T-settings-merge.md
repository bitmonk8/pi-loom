# `V10c-T` — Settings reads and merge (tests)

**Spec.** [`../spec_topics/discovery/package-and-settings.md`](../spec_topics/discovery/package-and-settings.md).

**Adds.** Failing tests for the paired `V10c` implementation leaf.

**Tests.**
- `DISC-7`: objects deep-merge, arrays/scalars are replaced, and project settings override global.
- `loom/load/settings-invalid-json`: a settings file present but not valid UTF-8 JSON fires the load-phase diagnostic.
- The reload debounce is driven through the injected `Clock` seam via the `FakeClock` test double (`Clock.setTimeout` / `Clock.clearTimeout`, per [`package-and-settings.md#caching-and-reload`](../spec_topics/discovery/package-and-settings.md#caching-and-reload)), advancing virtual time deterministically: a burst of N watcher events within one 250 ms window — each clearing the pending handle and rescheduling — produces exactly one reload (distinguishing coalescing from per-event firing, which would produce N reloads), and a further watcher event after virtual time crosses the window boundary following the last event produces a second reload.

**Deps.** `V8b`, `V9b` (the settings-re-merge arm is contributed against the `ReloadFailureInjector` interface `V9b` declares)

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
