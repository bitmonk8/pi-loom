# `V10d` — Reload debounce and settings-re-merge failure-injection arm

**Spec.** [`../spec_topics/discovery/package-and-settings.md`](../spec_topics/discovery/package-and-settings.md).

**Adds.** The `Clock`-driven 250 ms watcher-event reload debounce (drop-and-reschedule coalescing, per [`package-and-settings.md#caching-and-reload`](../spec_topics/discovery/package-and-settings.md#caching-and-reload)) and the settings-re-merge sub-arm of the **watcher-time reload failure-injection seam**. `V10d` contributes this arm against the test-only `ReloadFailureInjector` interface declared by [`V9b`](./V9b-registration-reload-wiring.md) (the single declaration site); `V10d` does not declare its own interface. A caller supplies the synthetic settings-re-merge failure to `ReloadFailureInjector.injectReloadFailure` and the arm routes it onto the `loom-system-note` surfacing path with `triggerTurn:false`, without standing up a live watcher; `V4e` binds it via `Deps` to exercise the `ERR-7` watcher-time reload failure surface. The merged-settings machinery the re-merge re-runs is owned by [`V10c`](./V10c-settings-merge.md).

**Tests.**
- [package-and-settings.md — Caching and reload](../spec_topics/discovery/package-and-settings.md#caching-and-reload) (reload-debounce code-keyed area): the reload debounce is driven through the injected `Clock` seam via the `FakeClock` test double (`Clock.setTimeout` / `Clock.clearTimeout`), advancing virtual time deterministically: a burst of N watcher events within one 250 ms window — each clearing the pending handle and rescheduling — produces exactly one reload (distinguishing coalescing from per-event firing, which would produce N reloads), and a further watcher event after virtual time crosses the window boundary following the last event produces a second reload.

**Deps.** `V10d-T`, `V10c`, `V8d`, `V9b` (the reload debounce is measured against the injected `Clock` seam `V8d` owns; the settings-re-merge arm is contributed against the `ReloadFailureInjector` interface `V9b` declares; the re-merge re-runs the merge `V10c` owns)

**Ships when.** `npm test` asserts the 250 ms debounce coalesces a burst of watcher events into a single reload through the `FakeClock` seam, and a post-window event triggers a second reload.
