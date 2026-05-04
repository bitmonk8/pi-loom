# Pi Extension Integration

`pi-loom` registers with Pi Agent as an extension in the standard way, providing:

- **Slash-command discovery** of `.loom` files — each loom appears in autocomplete as `/<filename>` (without `.loom`), exactly mirroring Pi's prompt-template behaviour. The `description` and `argument-hint` from frontmatter populate the autocomplete entry. `.warp` files are deliberately *excluded* from slash-command discovery; they are library code, never commands.
- A **file watcher** (optional) so edits to `.loom` and `.warp` files take effect without a session restart.
- Schema validation at parse time, surfacing errors as Pi-compatible diagnostics.

Detailed sub-topics:

- [Directory Convention](./discovery.md) — discovery sources, priority, collision rules.
- [Invocation from Pi](./slash-invocation.md) — how a slash command runs, prompt-mode `Err` surfacing.
- [Slash-Command Argument Binding](./binder.md) — LLM-driven binding of slash arguments to typed `params`.
- [Cancellation](./cancellation.md) — `AbortSignal` propagation and surfacing.
- [Diagnostics](./diagnostics.md) — diagnostic shape, codes, and serialisation.
- [Pi Integration Contract](./pi-integration-contract.md) — the Pi SDK surface the runtime depends on.
