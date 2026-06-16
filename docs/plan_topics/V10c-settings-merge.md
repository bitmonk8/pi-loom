# `V10c` — Settings reads and merge

**Spec.** [`../spec_topics/discovery/package-and-settings.md`](../spec_topics/discovery/package-and-settings.md).

**Adds.** The settings-source reads (the five keys), the deep-merge precedence (project over global; deep-merge objects, replace arrays/scalars), and validation. The `Clock`-driven reload debounce and the settings-re-merge sub-arm of the **watcher-time reload failure-injection seam** are carved out to [`V10d`](./V10d-reload-debounce.md).

**Tests.**
- `DISC-7`: objects deep-merge, arrays/scalars are replaced, and project settings override global.
- `loom/load/settings-invalid-json`: a settings file present but not valid UTF-8 JSON fires the load-phase diagnostic.

**Deps.** `V10c-T`, `V8b`

**Ships when.** `npm test` asserts the deep-merge precedence and a malformed-settings diagnostic.
