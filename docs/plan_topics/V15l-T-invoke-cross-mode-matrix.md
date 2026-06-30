# `V15l-T` — Invoke fresh-vs-attach cross-mode matrix (tests)

**Spec.** [`../spec_topics/invocation.md`](../spec_topics/invocation.md).

**Adds.** Failing tests for the paired `V15l` implementation leaf.

**Tests.**
- [invocation.md — cross-mode matrix](../spec_topics/invocation.md) (INV area): for the `prompt→subagent`, `subagent→subagent`, and `subagent→prompt` cells, a fresh-context callee starts with no prior conversation messages and every callee's inference call uses the child's configured model/tools/system rather than the parent's. (The `prompt→prompt` parent-suspend cell is owned by `V15d`.)

**Deps.** `V15a`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
