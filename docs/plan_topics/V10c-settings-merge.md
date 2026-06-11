# `V10c` — Settings reads and merge

**Spec.** [`../spec_topics/discovery/package-and-settings.md`](../spec_topics/discovery/package-and-settings.md).

**Adds.** The settings-source reads (the five keys), the deep-merge precedence (project over global; deep-merge objects, replace arrays/scalars), validation, and the reload debounce; the settings-re-merge sub-arm of the **watcher-time reload failure-injection seam** — the test-only `ReloadFailureInjector` interface, whose `injectReloadFailure` method a caller invokes to hand it a synthetic settings-re-merge failure — is owned here; the caller supplies the synthetic failure to `ReloadFailureInjector.injectReloadFailure` and the seam routes it onto the `loom-system-note` surfacing path with `triggerTurn:false`, without standing up a live watcher; `V4e` binds it via `Deps` to exercise the `ERR-7` watcher-time reload failure surface.

**Tests.**
- `DISC-7`: objects deep-merge, arrays/scalars are replaced, and project settings override global.
- `loom/load/settings-invalid-json`: a settings file present but not valid UTF-8 JSON fires the load-phase diagnostic.
- The reload debounce is driven through the injected `Clock` seam via the `FakeClock` test double (`Clock.setTimeout` / `Clock.clearTimeout`, per [`package-and-settings.md#caching-and-reload`](../spec_topics/discovery/package-and-settings.md#caching-and-reload)), advancing virtual time deterministically: a burst of N watcher events within one 250 ms window — each clearing the pending handle and rescheduling — produces exactly one reload (distinguishing coalescing from per-event firing, which would produce N reloads), and a further watcher event after virtual time crosses the window boundary following the last event produces a second reload.

**Deps.** `V10c-T`, `V8b`

**Ships when.** `npm test` asserts the deep-merge precedence and a malformed-settings diagnostic.
