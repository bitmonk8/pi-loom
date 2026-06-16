# `V15e` — Hot-reload static-resolution cache eviction

**Spec.** [`../spec_topics/implementation-notes.md`](../spec_topics/implementation-notes.md), [`../spec_topics/invocation.md`](../spec_topics/invocation.md), [`../spec_topics/imports.md`](../spec_topics/imports.md).

**Adds.** The in-process hot-reload re-parse path's cache-eviction step: on a `LoomRegistry` swap triggered by a watched-file change, drop the static-resolution per-pass parse-cache entry ([`V15a`](./V15a-invocation-core.md)) for the changed file and for every file that transitively imports it across the `.warp` import-edge graph ([`V15c`](./V15c-imports.md)), so the next load pass re-parses them rather than reusing stale entries.

**Tests.**
- [implementation-notes.md — Static-resolution load pass](../spec_topics/implementation-notes.md) (IMPL area): the in-process re-parse path drops the per-pass cache entry for the changed file and every transitive `.warp` importer as part of the `LoomRegistry` swap.

**Deps.** `V15e-T`, `V9b`, `V15a`, `V15c` (the eviction runs as part of the `LoomRegistry` swap `V9b` wires, evicts entries from the static-resolution parse cache `V15a` owns, and computes transitive `.warp` importers over the import-edge graph `V15c` constructs)

**Ships when.** `npm test` asserts that, on a `LoomRegistry` swap triggered by a watched-file change, the in-process re-parse path drops the per-pass static-resolution cache entry for the changed file and for every transitive `.warp` importer of it, so those files are re-parsed on the next load pass.
