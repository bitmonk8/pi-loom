# `V10c` — Settings reads and merge

**Spec.** [`../spec_topics/discovery/package-and-settings.md`](../spec_topics/discovery/package-and-settings.md).

**Adds.** The settings-source reads (the five keys), the deep-merge precedence (project over global; deep-merge objects, replace arrays/scalars), validation, and the reload debounce feeding the `ERR-7` watcher-reload failure path.

**Tests.**
- `DISC-7`: objects deep-merge, arrays/scalars are replaced, and project settings override global.
- `loom/load/settings-invalid-json`: a settings file present but not valid UTF-8 JSON fires the load-phase diagnostic.
- The reload debounce coalesces a burst of rapid watcher events into a single reload via the 250 ms drop-and-reschedule window ([`package-and-settings.md#caching-and-reload`](../spec_topics/discovery/package-and-settings.md#caching-and-reload)).

**Deps.** `V10c-T`, `V8b`

**Ships when.** `npm test` asserts the deep-merge precedence and a malformed-settings diagnostic.
