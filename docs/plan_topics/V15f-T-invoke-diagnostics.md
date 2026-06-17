# `V15f-T` — Invoke parse/load diagnostics (tests)

**Spec.** [`../spec_topics/invocation.md`](../spec_topics/invocation.md), [`../spec_topics/implementation-notes.md`](../spec_topics/implementation-notes.md).

**Adds.** Failing tests for the paired `V15f` implementation leaf.

**Tests.**
- `loom/parse/invoke-arg-type-mismatch` ([invocation.md — Argument binding](../spec_topics/invocation.md#argument-binding), INV parse/load code-keyed area): a positional argument whose type fails the callee's declared param schema fires the parse error when the callee is statically resolvable; when the callee is not statically resolvable the parse check is skipped and the runtime AJV check is the only safety net (no parse error).
- `loom/parse/invoke-return-type-mismatch` ([invocation.md — Typed return](../spec_topics/invocation.md#typed-return), INV parse/load code-keyed area): `invoke<Schema>(...)` against a statically-resolvable callee checks `T_calleeReturn ⊑ Schema` by compatibility, not equality — a narrower callee return under a wider annotation (e.g. `Cat ⊑ Animal`) is accepted, an incompatible one fires the parse error; when either side is not statically resolvable no parse error fires and the runtime AJV check is the net.
- `loom/parse/invoke-arity-too-few` and `loom/parse/invoke-arity-too-many` ([invocation.md — Argument arity](../spec_topics/invocation.md), INV parse/load code-keyed area): arity is checked **before** per-argument type; fewer than the non-defaulted `params:` count is `invoke-arity-too-few` when statically resolvable and otherwise falls back to runtime `Err(InvokeInfraError { cause: "validation" })` from the AJV check on the missing required field(s); more than the total `params:` count is always `invoke-arity-too-many`, even when the callee is not statically resolvable.
- `loom/parse/invoke-non-loom-extension` ([invocation.md — Resolution](../spec_topics/invocation.md), INV parse/load code-keyed area): an `invoke(...)` literal path not ending byte-exact-lowercase `.loom` (including a `.warp` path or any non-lowercase variant such as `.LOOM`) fires the parse error, and the same code fires for a `tools:` `.loom` entry whose path string does not end in `.loom`.
- `loom/load/callee-has-errors` ([invocation.md — Static resolution](../spec_topics/invocation.md#static-resolution), INV parse/load code-keyed area): a callee that is unreadable, unparseable, or fails its own structural checks emits the diagnostic at the referencing site (naming the callee, listing the underlying sites via `related`) with the deliberate severity split — **error** for a `tools:` `.loom` entry (the callable cannot be created, the parent does not register) and **warning** for a literal `invoke(...)` callee (the parent registers, static checks against that callee are skipped, and the runtime AJV check is the net).

**Deps.** `V15a`, `V2b`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
