# `V15e-T` — Hot-reload static-resolution cache eviction (tests)

**Spec.** [`../spec_topics/implementation-notes.md`](../spec_topics/implementation-notes.md), [`../spec_topics/invocation.md`](../spec_topics/invocation.md), [`../spec_topics/imports.md`](../spec_topics/imports.md).

**Adds.** Failing tests for the paired `V15e` implementation leaf.

**Tests.**
- [implementation-notes.md — Static-resolution load pass](../spec_topics/implementation-notes.md) (IMPL area): the in-process re-parse path drops the static-resolution per-pass parse cache entry for the changed file and every transitive `.warp` importer as part of the `LoomRegistry` swap.
- [implementation-notes.md — Static-resolution load pass](../spec_topics/implementation-notes.md) (IMPL area), comparing in the canonical `realpath`-then-forward-slash form per [invocation.md — Resolution](../spec_topics/invocation.md): eviction still hits when the watcher delivers the changed file in a non-canonical path form (symlink, case-variant on a case-insensitive host, `.`/`..` segments, or relative-vs-absolute) that differs from the form the static-resolution per-pass parse cache entry was keyed under, so the stale entry is dropped rather than surviving the `LoomRegistry` swap.
- [implementation-notes.md — Static-resolution load pass](../spec_topics/implementation-notes.md) (IMPL area), negative-direction under-eviction case: on a reload that newly establishes a transitive `.warp` import edge from a file to the changed file — an edge absent from the pre-swap import-edge graph — the eviction walk runs over the rebuilt post-swap import-edge graph ([`V15c`](./V15c-imports.md)), sequenced after the graph rebuild and not before, so that file is identified as a transitive importer and its static-resolution per-pass parse cache entry is dropped, forcing a re-parse on the next load pass rather than the silent stale-cache serve a pre-swap-graph computation would allow. The test pins the ordering between the import-edge-graph rebuild and the eviction walk so it cannot pass vacuously (e.g. it reds out if the walk reads the pre-swap graph).

**Deps.** `V9b`, `V15a`, `V15c`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
