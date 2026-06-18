# `V14a-T` — Tool calls (code-side) and `CodeToolError` (tests)

**Spec.** [`../spec_topics/tool-calls.md`](../spec_topics/tool-calls.md); [`../spec_topics/pi-integration-contract/host-interfaces-core.md`](../spec_topics/pi-integration-contract/host-interfaces-core.md#tool-execution-from-loom-code) §*Tool execution from loom code*.

**Adds.** Failing tests for the paired `V14a` implementation leaf.

**Tests.**
- `loom/parse/tool-arg-not-literal`, `tool-arg-arity`, `tool-arg-type-mismatch`: argument violations fire (arity before type).
- [tool-calls.md — `CodeToolError`](../spec_topics/tool-calls.md) (TOOL code-keyed area): the `CodeToolError` enum is closed (`validation` / `execution` / `cancelled` / `unknown_tool`) and is distinct from `ModelToolError`.
- [tool-calls.md — *Return type*](../spec_topics/tool-calls.md) (TOOL code-keyed area): both return-type rows lower on the *accepted* path — a conforming **Pi tool** return lowers to a `Result<string, QueryError>` `Ok` carrying the tool's final output as a single `string`; a conforming **registered subagent-mode `.loom` callable** return lowers to a `Result<T, QueryError>` `Ok` whose payload is the callee's inferred return type `T` (statically resolved per `invoke<T>(...)`, runtime AJV-enforced when not statically resolvable).
- [tool-calls.md — `.loom`-callable failure](../spec_topics/tool-calls.md) (TOOL code-keyed area): a `.loom`-callable failure surfaces via `Invoke*Error` (input-validation = `InvokeInfraError{validation}`).
- [host-interfaces-core.md — *Tool execution from loom code*](../spec_topics/pi-integration-contract/host-interfaces-core.md#tool-execution-from-loom-code) (un-anchored; GOV-22 residue): the accepted-path `execute()` envelope-lowering mechanics — (1) `content` is filtered to `type === "text"` entries and their `.text` values joined with a single `"\n"` (no separator before the first or after the last block); non-text blocks are discarded with **no** `RuntimeEvent` / `loom-system-note` / diagnostic on the discard path; (2) an empty result (`content: []` or no surviving text blocks) with `!isError` lowers to `Ok("")` with no diagnostic; (3) `isError: true` lowers to `Err(CodeToolError { cause: "execution", message: <m>, tool_name, ... })` where `<m>` is the filtered/joined text UTF-8-encoded and truncated to at most 4096 bytes on a Unicode code-point boundary (a code point that would straddle the limit is dropped entirely; result MAY be up to three bytes short); (4) when no text survives the filter under `isError`, `<m>` is the fixed string `"tool reported an error with no text content"`; (5) an `execute()` throw lowers to `Err(CodeToolError { cause: "execution", ... })` whose `<m>` is the thrown value coerced to the underlying-error string and truncated under the same 4096-byte code-point-boundary rule. (The non-conforming-shape / non-settling-Promise dispositions routed off `CodeToolError` are owned by `V14c`, not asserted here.)

**Deps.** `V15a`, `V9f`, `V8a`, `V5e`, `V4d`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
