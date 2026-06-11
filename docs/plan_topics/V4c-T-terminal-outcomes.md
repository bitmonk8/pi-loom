# `V4c-T` — Terminal outcomes, partial-append, and no-rollback (tests)

**Spec.** [`../spec_topics/errors-and-results/error-model.md`](../spec_topics/errors-and-results/error-model.md), [`../spec_topics/cancellation.md`](../spec_topics/cancellation.md).

**Adds.** Failing tests for the paired `V4c` implementation leaf.

**Tests.**
- `ERR-8`: a mid-stream cancellation does not mutate Pi-committed surfaces.
- `ERR-9`: no compensating turn is injected.
- `ERR-10`: ERR-8/ERR-9 hold symmetrically for cancellation and `?`-propagation.
- `ERR-11`: the non-mutation window binds between the cancelled turn and the next driver send.
- `ERR-12`: ERR-8 holds inside a subagent loom, exercised via the `H4a` harness modelling a subagent-mode callee — not the live `V9i` surface.
- `ERR-13`: drive each of the five [`error-model.md` §No rollback](../spec_topics/errors-and-results/error-model.md#err-13) authoring sites and assert it does not unwind prior side effects and appends no compensating turn — (1) a `?`-early-return inside a function, (2) a `?`-early-return at the top of a loom block, (3) a panic in a slash-command loom, (4) a panic in an `invoke` child (parent observes `InvokeInfraError { cause: "panic" }`), and (5) mid-execution cancellation. Each vector drives a completed callee, modelled through the `H4a` session double (the invoke-child vectors via its completed-invoke-child scripting point) and the `V17a` side-effect seam (`loomAbort`, checkpoint set, late-settlement discard), not the live `V14a`/`V13c`/`V15a` surfaces. The guarantee rests on the runtime having no compensating/rollback path, so the tests witness it on these enumerated authoring sites rather than proving the absolute absence of a compensating path exhaustively.
- `ERR-13` (completed-callee finality): drive a tool call / invoke child to *completion* (via the `H4a` session double), then fire a downstream `?`/panic/cancel, and assert the completed callee's side effect persists and no compensating turn is injected — exercising a completed callee distinct from an appended turn, scoped against the `V17a` cancellation seam / `H4a` invocation harness, not the live `V14a`/`V15a` surfaces.

**Deps.** `V4a`, `V17a`, `H4a`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
