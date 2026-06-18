# `V4g-T` — Pre-evaluation reload-failure integration (tests)

**Spec.** [`../spec_topics/errors-and-results/error-model.md`](../spec_topics/errors-and-results/error-model.md).

**Adds.** Failing tests for the paired `V4g` implementation leaf.

**Tests.**
- `ERR-7`: a synthetic watcher-time reload failure injected via `ReloadFailureInjector.injectReloadFailure` — the single interface declared by `V9b`, from which `V4g` imports it — at the **watcher-time reload failure-injection seam**, with `V9b` wiring the `loom/runtime/registry-swap-failed` registry-swap arm and the `.loom`/`.warp` re-parse arm and `V10d` contributing the settings-re-merge arm, exercising both the re-parse/re-merge diagnostic arm and the `loom/runtime/registry-swap-failed` registry-swap arm, routes pre-eval to `loom-system-note` with `triggerTurn:false`, without standing up a live `V10d`/`V9b` watcher.

**Deps.** `V9b`, `V10d` (`V9b` declares the `ReloadFailureInjector` interface (`injectReloadFailure`) the `ERR-7` test injects against; `V10d` contributes the settings-re-merge arm against it)

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
