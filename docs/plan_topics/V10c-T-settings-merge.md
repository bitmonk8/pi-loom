# `V10c-T` — Settings reads and merge (tests)

**Spec.** [`../spec_topics/discovery/package-and-settings.md`](../spec_topics/discovery/package-and-settings.md).

**Adds.** Failing tests for the paired `V10c` implementation leaf.

**Tests.**
- `DISC-7`: objects deep-merge, arrays/scalars are replaced, and project settings override global.
- `loom/load/settings-invalid-json`: a settings file present but not valid UTF-8 JSON fires the load-phase diagnostic.
- The reload debounce coalesces a burst of rapid watcher events into a single reload via the 250 ms drop-and-reschedule window ([`package-and-settings.md#caching-and-reload`](../spec_topics/discovery/package-and-settings.md#caching-and-reload)).

**Deps.** `V8b`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
