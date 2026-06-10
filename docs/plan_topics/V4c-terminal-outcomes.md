# `V4c` — Terminal outcomes, partial-append, and no-rollback

**Spec.** [`../spec_topics/errors-and-results/error-model.md`](../spec_topics/errors-and-results/error-model.md), [`../spec_topics/cancellation.md`](../spec_topics/cancellation.md).

**Adds.** The closed success/failure/cancelled trichotomy with the per-cause caller-surface map, the partial-append contract (turns appended before a terminal event remain; no implicit rollback), and turn-grain finality symmetric across cancellation and `?`-propagation. The no-rollback guarantee is architectural: the runtime contains no compensating path, so a completed callee's side effect survives a downstream terminal event by construction rather than by an undo being suppressed.

**Tests.**
- `ERR-8`: a mid-stream cancellation does not mutate Pi-committed surfaces.
- `ERR-9`: no compensating turn is injected.
- `ERR-10`: ERR-8/ERR-9 hold symmetrically for cancellation and `?`-propagation.
- `ERR-11`: the non-mutation window binds between the cancelled turn and the next driver send.
- `ERR-12`: ERR-8 holds inside a subagent loom, exercised via the `H4a` harness modelling a subagent-mode callee — not the live `V9i` surface.
- `ERR-13`: on the enumerated cases, a `?`/panic/cancel does not unwind side effects, and a completed tool call, query, or invoke child stays final; this rests on the runtime having no compensating/rollback path, so the tests witness it on the sampled cases rather than exhaustively. Completed tool-call / query / invoke-child outcomes are modelled through the `H4a` session double and the `V17a` side-effect seam (`loomAbort`, checkpoint set, late-settlement discard), not the live `V14a`/`V13c`/`V15a` surfaces.
- `ERR-13` (completed-callee finality): drive a tool call / invoke child to *completion* (via the `H4a` session double), then fire a downstream `?`/panic/cancel, and assert the completed callee's side effect persists and no compensating turn is injected — exercising a completed callee distinct from an appended turn, scoped against the `V17a` cancellation seam / `H4a` invocation harness, not the live `V14a`/`V15a` surfaces.

**Deps.** `V4c-T`, `V4a`, `V17a`

**Ships when.** `npm test` proves the enumerated `ERR-8`…`ERR-13` cases hold — committed turns survive cancellation and `?`-propagation unmodified across the sampled surfaces, and a completed callee stays final after a downstream terminal event. The no-rollback guarantee is architectural: it rests on the runtime containing no compensating/rollback path, and the tests witness it on the enumerated cases rather than exhaustively.
