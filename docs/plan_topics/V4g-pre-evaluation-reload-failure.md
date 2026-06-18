# `V4g` — Pre-evaluation reload-failure integration

**Spec.** [`../spec_topics/errors-and-results/error-model.md`](../spec_topics/errors-and-results/error-model.md).

**Adds.** The watcher-time reload-integration pre-evaluation failure cause (`ERR-7`) injected through [`V9b`](./V9b-registration-reload-wiring.md)'s `ReloadFailureInjector.injectReloadFailure` seam, routed pre-eval to the `loom-system-note` channel with `triggerTurn:false` without becoming an evaluation outcome and without standing up a live watcher. It exercises `V9b`'s registry-swap and `.loom`/`.warp` re-parse arms together with [`V10d`](./V10d-reload-debounce.md)'s settings-re-merge arm against that one injection interface, building on the load-time pre-eval routing surface [`V4e`](./V4e-pre-evaluation-failures.md) establishes.

**Tests.**
- `ERR-7`: a synthetic watcher-time reload failure injected via `ReloadFailureInjector.injectReloadFailure` — the single interface declared by `V9b`, from which `V4g` imports it — at the **watcher-time reload failure-injection seam**, with `V9b` wiring the `loom/runtime/registry-swap-failed` registry-swap arm and the `.loom`/`.warp` re-parse arm and `V10d` contributing the settings-re-merge arm, exercising both the re-parse/re-merge diagnostic arm and the `loom/runtime/registry-swap-failed` registry-swap arm, routes pre-eval to `loom-system-note` with `triggerTurn:false`, without standing up a live `V10d`/`V9b` watcher.

**Deps.** `V4g-T`, `V4e`, `V9b`, `V10d` (`V4e` establishes the load-time pre-eval routing surface to `loom-system-note` this reload cause reuses; `V9b` declares the `ReloadFailureInjector` interface (`injectReloadFailure`) that `V4g` imports — registry-swap and `.loom`/`.warp` re-parse arms; `V10d` contributes the settings-re-merge arm against it — and `ERR-7`'s synthetic failure is injected through that one interface)

**Ships when.** `npm test` proves the synthetic watcher-time reload failure (`ERR-7`) routes pre-eval to `loom-system-note` without firing a turn.
