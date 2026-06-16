# `V9b-T` — Registration steps and reload-wiring seams (tests)

**Spec.** [`../spec_topics/pi-integration-contract/registration-steps.md`](../spec_topics/pi-integration-contract/registration-steps.md), [`../spec_topics/implementation-notes.md`](../spec_topics/implementation-notes.md), [`../spec_topics/pi-integration-contract/host-interfaces-core.md`](../spec_topics/pi-integration-contract/host-interfaces-core.md) (model-registry surface).

**Adds.** Failing tests for the paired `V9b` implementation leaf.

**Tests.**
- [registration-steps.md — registry swap](../spec_topics/pi-integration-contract/registration-steps.md) (PIC area): looms discovered are registered; the swap is atomic (build-aside, then publish); a failed swap fires `loom/runtime/registry-swap-failed`.
- model-reference-matcher production wiring ([`host-interfaces-core.md` model-registry surface](../spec_topics/pi-integration-contract/host-interfaces-core.md#model-registry-pin)): the load pass constructs the concrete `findExactModelReferenceMatch` matcher from `ctx.modelRegistry.getAvailable()` and injects it into the model-reference-matcher injection seam [`V6a`](./V6a-frontmatter-contract.md) defines; a single matcher instance — observed by single-source-of-construction (instance identity), not equivalence-of-outcome against a shared fake — services both `V6a`'s load-time `loom/load/model-unresolved` resolution and [`V11a`](./V11a-binder-model-resolution.md)'s binder-model resolution.

**Deps.** `V9a`, `V10a`, `V8e`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
