# `V15e-T` — Hot-reload static-resolution cache eviction (tests)

**Spec.** [`../spec_topics/implementation-notes.md`](../spec_topics/implementation-notes.md), [`../spec_topics/invocation.md`](../spec_topics/invocation.md), [`../spec_topics/imports.md`](../spec_topics/imports.md).

**Adds.** Failing tests for the paired `V15e` implementation leaf.

**Tests.**
- [implementation-notes.md — Static-resolution load pass](../spec_topics/implementation-notes.md) (IMPL area): the in-process re-parse path drops the per-pass cache entry for the changed file and every transitive `.warp` importer as part of the `LoomRegistry` swap.

**Deps.** `V9b`, `V15a`, `V15c`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
