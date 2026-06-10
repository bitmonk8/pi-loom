# `V4c-T` — Terminal outcomes, partial-append, and no-rollback (tests)

**Spec.** [`../spec_topics/errors-and-results/error-model.md`](../spec_topics/errors-and-results/error-model.md), [`../spec_topics/cancellation.md`](../spec_topics/cancellation.md).

**Adds.** Failing tests for the paired `V4c` implementation leaf.

**Tests.**
- `ERR-8`: a mid-stream cancellation does not mutate Pi-committed surfaces.
- `ERR-9`: no compensating turn is injected.
- `ERR-10`: ERR-8/ERR-9 hold symmetrically for cancellation and `?`-propagation.
- `ERR-11`: the non-mutation window binds between the cancelled turn and the next driver send.
- `ERR-12`: ERR-8 holds inside a subagent loom, exercised via the `H4a` harness modelling a subagent-mode callee — not the live `V9i` surface.
- `ERR-13`: `?`/panic/cancel never unwind side effects; completed tool calls, queries, and invoke children are final. Completed tool-call / query / invoke-child outcomes are modelled through the `H4a` session double and the `V17a` side-effect seam (`loomAbort`, checkpoint set, late-settlement discard), not the live `V14a`/`V13c`/`V15a` surfaces.

**Deps.** `V4a`, `V17a`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
