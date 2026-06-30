# `V15a-T` — Invocation core (tests)

**Spec.** [`../spec_topics/invocation.md`](../spec_topics/invocation.md), [`../spec_topics/discovery/discovery-sources.md`](../spec_topics/discovery/discovery-sources.md), [`../spec_topics/return.md`](../spec_topics/return.md), [`../spec_topics/implementation-notes.md`](../spec_topics/implementation-notes.md).

**Adds.** Failing tests for the paired `V15a` implementation leaf.

**Tests.**
- `INV-1`: load-time and invocation-time re-checks use identical `realpath` + segment-boundary containment; an escape surfaces on both channels (diagnostic + `InvokeInfraError{load_failure}`).
- [implementation-notes.md — Static-resolution load pass](../spec_topics/implementation-notes.md) (IMPL area), via [invocation.md — Static resolution](../spec_topics/invocation.md#static-resolution): the static-resolution pass walks transitively from the entry loom across literal `invoke` paths and `.loom` `tools:` entries, parsing and lowering each visited file exactly once into the static-resolution per-pass parse cache.

The runtime arg/options + final-value facets (`INV-2`, `INV-3`, `FN-5`) are tested on `V15k-T`; the fresh-vs-attach cross-mode matrix on `V15l-T`; the `invoke`-site cancellation checkpoint (`cka-47`) and `ERR-13` witness on `V15m-T`.

**Deps.** `V10a`, `V2b`, `V3d`, `V8b`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
