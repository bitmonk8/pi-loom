# `V4c` — Terminal outcomes and partial-append

**Spec.** [`../spec_topics/errors-and-results/error-model.md`](../spec_topics/errors-and-results/error-model.md), [`../spec_topics/cancellation.md`](../spec_topics/cancellation.md).

**Adds.** The closed success/failure/cancelled trichotomy with the per-cause caller-surface map, the partial-append contract (turns appended before a terminal event remain; no implicit rollback), and turn-grain finality symmetric across cancellation and `?`-propagation.

**Tests.**
- `ERR-8`: a mid-stream cancellation does not mutate Pi-committed surfaces.
- `ERR-9`: no compensating turn is injected.
- `ERR-10`: ERR-8/ERR-9 hold symmetrically for cancellation and `?`-propagation.
- `ERR-11`: the non-mutation window binds between the cancelled turn and the next driver send.
- `ERR-12`: ERR-8 holds inside a subagent loom, exercised via the `H4a` harness modelling a subagent-mode callee — not the live `V9i` surface.

**Deps.** `V4c-T`, `V4a`, `V17a`, `H4a`, `H4b`

**Ships when.** `npm test` proves the enumerated `ERR-8`…`ERR-12` cases hold — committed turns survive cancellation and `?`-propagation unmodified across the sampled surfaces.
