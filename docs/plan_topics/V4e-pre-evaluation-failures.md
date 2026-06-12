# `V4e` — Pre-evaluation failures

**Spec.** [`../spec_topics/errors-and-results/error-model.md`](../spec_topics/errors-and-results/error-model.md).

**Adds.** The closed pre-evaluation failure set surfaced on the `loom-system-note` channel with `triggerTurn:false`, never becoming evaluation outcomes. The slash-load `params` arm of ceiling #4 (`ERR-16`) **consults** `V16a`'s cross-ceiling arbitration seam at slash-load per CIO-1 — a load-time cross-route that differs in kind from the four runtime first-enforcement sites — binding the seam via its `Deps` on `V16a`.

**Tests.**
- `ERR-1`: host-incompatible pre-eval failure routes without firing a turn.
- `ERR-2`: lex/parse/type failure routes pre-eval.
- `ERR-3`: frontmatter failure routes pre-eval.
- `ERR-4`: binder-model resolution failure routes pre-eval.
- `ERR-5`: binder arg-binding failure (ceiling #3) routes pre-eval.
- `ERR-6`: `tools:` resolution failure routes pre-eval.
- `ERR-7`: a synthetic watcher-time reload failure injected via `ReloadFailureInjector.injectReloadFailure` — the single interface declared by `V9b`, from which `V4e` imports it — at the **watcher-time reload failure-injection seam**, with `V9b` wiring the `loom/runtime/registry-swap-failed` registry-swap arm and the `.loom`/`.warp` re-parse arm and `V10c` contributing the settings-re-merge arm, exercising both the re-parse/re-merge diagnostic arm and the `loom/runtime/registry-swap-failed` registry-swap arm, routes pre-eval to `loom-system-note` with `triggerTurn:false`, without standing up a live `V10c`/`V9b` watcher.
- `ERR-16`: the slash-load `params` arm of ceiling #4, cross-routed via CIO-1 / ceiling #3 no-retry, routes pre-eval.

**Deps.** `V4e-T`, `V9a`, `V6a`, `V11f`, `V10a`, `V16a`, `V9b`, `V10c` (`V9b` declares the `ReloadFailureInjector` interface (`injectReloadFailure`) that `V4e` imports — registry-swap and `.loom`/`.warp` re-parse arms; `V10c` contributes the settings-re-merge arm against it — and `ERR-7`'s synthetic failure is injected through that one interface)

**Ships when.** `npm test` proves all eight pre-eval causes route to `loom-system-note` without firing a turn.
