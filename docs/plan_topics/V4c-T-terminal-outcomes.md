# `V4c-T` — Terminal outcomes and partial-append (tests)

**Spec.** [`../spec_topics/errors-and-results/error-model.md`](../spec_topics/errors-and-results/error-model.md), [`../spec_topics/cancellation.md`](../spec_topics/cancellation.md).

**Adds.** Failing tests for the paired `V4c` implementation leaf.

**Tests.**
- `ERR-8`: a mid-stream cancellation does not mutate Pi-committed surfaces.
- `ERR-9`: no compensating turn is injected.
- `ERR-10`: ERR-8/ERR-9 hold symmetrically for cancellation and `?`-propagation.
- `ERR-11`: the non-mutation window binds between the cancelled turn and the next driver send.
- `ERR-12`: ERR-8 holds inside a subagent loom, exercised via the `H4a` harness modelling a subagent-mode callee — not the live `V9i` surface.

**Deps.** `V4a`, `V17a`, `H4a`, `H4b`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
