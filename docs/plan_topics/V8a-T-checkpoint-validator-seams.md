# `V8a-T` — `Checkpoint` seam (tests)

**Spec.** [`../spec_topics/pi-integration-contract/host-interfaces-services.md`](../spec_topics/pi-integration-contract/host-interfaces-services.md), [`../spec_topics/implementation-notes.md`](../spec_topics/implementation-notes.md).

**Adds.** Failing tests for the paired `V8a` implementation leaf.

**Tests.**
- `PIC-10`: a checkpoint awaits at each defined cancel site with the correct yield kind and adds no extra sites.

**Deps.** `H3a`, `V8d`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
