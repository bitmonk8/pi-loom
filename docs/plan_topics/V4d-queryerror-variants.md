# `V4d` — `QueryError` variant schema

**Spec.** [`../spec_topics/errors-and-results/queryerror-variants.md`](../spec_topics/errors-and-results/queryerror-variants.md), [`../spec_topics/errors-and-results/error-model.md`](../spec_topics/errors-and-results/error-model.md).

**Adds.** The nine-variant `QueryError` union (its `kind`/`cause` wire forms), the `ValidationIssue` canonical ordering, the forced-respond non-compliance synthesised issue, and the `ToolLoopExhaustedError` shape. `ContextOverflowError` is the sole token-domain failure surface (NOCEIL-2): loom 1.0 imposes no per-query response-token cap and no cumulative token budget. The at-the-cap `ToolLoopExhaustedError` firing path is owned and asserted by `V13c`; `V4d` covers only the variant's wire shape.

**Tests.**
- `ERR-14`: `validation_errors` are emitted in stable ascending order on (path, schema_keyword, message) by code point.
- `ERR-15`: `QueryError.kind` is typed `string` (open seam), not a closed enum.
- `ERR-17`: forced-respond non-compliance produces one synthesised `ValidationIssue` (path `""`, keyword `"required"`, branch-specific two-arm message).
- `ERR-19`: the `ToolLoopExhaustedError` shape (`kind: "tool_loop_exhausted"`, `rounds` with `rounds == tool_loop.max_rounds`, `last_tool_name`, `raw_response`).

**Deps.** `V4d-T`, `V5d`

**Ships when.** `npm test` asserts the nine-variant shape, `kind: string`, the `ValidationIssue` ordering, and the `ToolLoopExhaustedError` variant shape.
