# `V15l` — Invoke fresh-vs-attach cross-mode matrix

**Spec.** [`../spec_topics/invocation.md`](../spec_topics/invocation.md).

**Adds.** The fresh-vs-attach cross-mode matrix selection split out of [`V15a`](./V15a-invocation-core.md): the matrix selects fresh-vs-attach by callee mode and a child uses its own model/tools/system. The prompt→prompt parent-suspend facet of the matrix (with the `setActiveTools` snapshot/restore) is owned by [`V15d`](./V15d-prompt-suspend-snapshot.md), which depends on this leaf. Split out of `V15a` (which retains load-time/invocation-time `realpath` containment and the static-resolution per-pass parse cache) per [`conventions.md`](./conventions.md) §smallest-shippable-leaf, mirroring the `V15f`/`V15g`/`V15h` carve-out pattern.

**Tests.**
- [invocation.md — cross-mode matrix](../spec_topics/invocation.md) (INV area): the cross-mode matrix selects fresh-vs-attach by callee mode, observable per cell as a session property — for the `prompt→subagent`, `subagent→subagent`, and `subagent→prompt` cells the callee that attaches to a **fresh** context starts with no prior conversation messages, and every callee's inference call uses the **child's** configured model/tools/system rather than the parent's. (The `prompt→prompt` parent-suspend + `setActiveTools` snapshot/restore cell is owned by [`V15d`](./V15d-prompt-suspend-snapshot.md) and is out of scope here.)

**Deps.** `V15l-T`, `V15a`

**Ships when.** `npm test` resolves and spawns an invoke across the in-scope cross-mode cells (`prompt→subagent`, `subagent→subagent`, `subagent→prompt`) and asserts the observable session properties: a fresh-context callee starts with no prior conversation messages, and the callee's inference call uses the child's configured model/tools/system rather than the parent's. The `prompt→prompt` parent-suspend cell ships on [`V15d`](./V15d-prompt-suspend-snapshot.md).
