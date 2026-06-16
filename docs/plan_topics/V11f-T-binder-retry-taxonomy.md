# `V11f-T` — Binder per-class retry budget and failure taxonomy (tests)

**Spec.** [`../spec_topics/binder/determinism-cancellation-failure.md`](../spec_topics/binder/determinism-cancellation-failure.md), [`../spec_topics/hard-ceilings/ceilings-3-and-4.md`](../spec_topics/hard-ceilings/ceilings-3-and-4.md).

**Adds.** Failing tests for the paired `V11f` implementation leaf.

**Tests.**
- `HC3-a`: at most one transport-class retry.
- `HC3-b`: at most one malformed-envelope retry.
- `HC3-c`: an AJV-on-args failure is not retried.
- `HC3-d`: at most three LLM calls per invocation (interleaving consumes class budget).
- `HC3-e`: the surfaced note is the most-recent failure row.
- The six failure templates render verbatim (`<provider>` = `Model.api`, `<ajv-summary>` = `<path> <message>` joined with `; `); ContextOverflow folds into the transport class.
- Depth-walk fast-fail `<ajv-summary>` rendering (distinct from the joined form above): a binder `kind:"ok"` envelope whose `args` trip the depth-walk fast-fail at the `params` boundary — the cross-ceiling sub-case (ceiling #4 routed to ceiling #3 via CIO-1) classified into the AJV-on-`args` class per [determinism-cancellation-failure.md — *Failure-class taxonomy*](../spec_topics/binder/determinism-cancellation-failure.md#failure-class-taxonomy) — renders the *AJV validation of the binder's `args` failed* row with `<ajv-summary>` equal to the single canonical depth-walk `ValidationIssue` rendered as `<JSON-Pointer> JSON document depth exceeds 5` (single-issue form, **no `; ` separator**, `<JSON-Pointer>` the path to the first too-deep node). AJV does not run at this site (its `errors` array is empty), so the assertion must confirm the summary is synthesised from the depth-walk issue (`schema_keyword:"maxDepth"`, message `"JSON document depth exceeds 5"`), not from an `errorsText` traversal of the empty `errors` array ([determinism-cancellation-failure.md — *Failure-mode templates*, Depth-walk fast-fail clause](../spec_topics/binder/determinism-cancellation-failure.md#failure-mode-templates-normative)).

**Deps.** `V11e`, `V9j`, `V16a`, `V5e`, `H4b`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
