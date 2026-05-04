# Cancellation

Every loom invocation runs under an `AbortSignal` provided by Pi. V1 cancellation rules:

**Signal sources:**

- Slash-command invocation: the loom receives `ctx.signal` from the Pi command handler. In interactive mode this signal aborts when the user presses Esc or Ctrl-C.
- Tool-driven (a loom registered into another loom's `tools:`): the signal is the `signal` argument passed to the tool's `execute(toolCallId, params, signal, ...)`.
- `invoke(...)` call: the child loom inherits a derived signal from its caller — the child aborts whenever the caller does.

**Propagation.** Cancellation propagates *down* (parent → child invokes, parent → in-flight queries, parent → in-flight tool calls). It does *not* propagate *up*: a child loom cancelling internally surfaces as `Err(QueryError { kind: "cancelled" })` (or the appropriate sub-variant) to the parent, which may handle it (`match`) or propagate it (`?`).

**Granularity.** The interpreter checks the signal at every loop iteration boundary, before every `@`...`` query, and before every tool / `invoke` call. There is no mid-expression cancellation — the smallest cancellation unit is one statement or one query.

**Race semantics.** Cancellation is observed only at checkpoints. An operation that has already returned `Ok(v)` retains that value even if the signal fires before the next checkpoint executes; the interpreter must not retroactively rewrite a completed `Ok` into `Err({kind:"cancelled"})`. The cancellation surfaces at the next checkpoint the interpreter reaches — typically the pre-evaluation check of the next statement's first cancellable sub-operation (loop iteration, `@`-query, tool call, or `invoke`). If no further checkpoint executes before the loom returns (the abort fired after the final cancellable operation), the loom's top-level result is the value it would otherwise have produced; the runtime does **not** synthesize a top-level `cancelled` in that case.

Symmetrically, an in-flight operation whose underlying provider observes the abort surfaces as `Err` per the **Surfacing** rules below; this is the only path by which an operation's own result becomes `cancelled`.

Edge cases:

- Statement boundaries are *not* themselves checkpoints; the next checkpoint is the next loop-iter boundary, `@`-query, tool call, or `invoke`. A straight-line statement sequence with no such operations runs to completion regardless of when the abort fired.
- For `invoke`, the child's own checkpoints honour the derived signal independently — the parent does not need to re-check between child completion and binding the child's result.
- The top-level "no further checkpoint" rule means a loom that ends in a pure-arithmetic tail can complete `Ok` even if the user pressed Esc during that tail. This is intentional: there is nothing left to cancel.
- This rule does not change the "smallest cancellation unit is one statement or one query" claim; it disambiguates *which* checkpoint observes the abort, not the granularity itself.

**Surfacing.**

- An in-flight query whose signal aborts returns `Err(QueryError { kind: "cancelled", message: "..." })`.
- A tool call whose signal aborts returns `Err(QueryError { kind: "tool_call_error", cause: "cancelled", ... })`.
- A child invoke whose signal aborts surfaces to the parent as `Err(QueryError { kind: "invoke_callee_error", inner: { kind: "cancelled", ... } })` when the abort originated inside the child, or directly as `kind: "cancelled"` when the parent's own signal fired first.
- The loom's *top-level* cancellation surfaces to Pi as the `cancelled` row in the per-`kind` system-note table in [Invocation from Pi](./slash-invocation.md).

Per-call timeouts (a separate cancellation source independent of the user) are deferred to a later release; declaring a `timeout:` field on a query, tool call, or invoke is `loom/parse/timeout-field-rejected`. See [Future Considerations](./future-considerations.md) and [Diagnostics](./diagnostics.md).
