# `V4e-T` — Pre-evaluation failures (tests)

**Spec.** [`../spec_topics/errors-and-results/error-model.md`](../spec_topics/errors-and-results/error-model.md).

**Adds.** Failing tests for the paired `V4e` implementation leaf.

**Tests.**
- `ERR-1`: host-incompatible pre-eval failure routes without firing a turn.
- `ERR-2`: lex/parse/type failure routes pre-eval.
- `ERR-3`: frontmatter failure routes pre-eval.
- `ERR-4`: binder-model resolution failure routes pre-eval.
- `ERR-5`: binder arg-binding failure (ceiling #3) routes pre-eval.
- `ERR-6`: `tools:` resolution failure routes pre-eval.
- `ERR-7`: a synthetic watcher-time reload failure injected via `ReloadFailureInjector.injectReloadFailure` — the single interface declared by `V9b`, from which `V4e` imports it — at the **watcher-time reload failure-injection seam**, with `V9b` wiring the `loom/runtime/registry-swap-failed` registry-swap arm and the `.loom`/`.warp` re-parse arm and `V10d` contributing the settings-re-merge arm, exercising both the re-parse/re-merge diagnostic arm and the `loom/runtime/registry-swap-failed` registry-swap arm, routes pre-eval to `loom-system-note` with `triggerTurn:false`, without standing up a live `V10d`/`V9b` watcher.
- `ERR-16`: the slash-load `params` arm of ceiling #4, cross-routed via CIO-1 / ceiling #3 no-retry, routes pre-eval.

**Deps.** `V9a`, `V6a`, `V11f`, `V10a`, `V16a`, `V9b`, `V10d` (`V9b` declares the `ReloadFailureInjector` interface (`injectReloadFailure`) the `ERR-7` test injects against; `V10d` contributes the settings-re-merge arm against it)

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
