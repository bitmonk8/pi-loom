# V13 — Wire names, descriptions, retry/coercion

## V13a — `as "WireName"` rename clause parsing

- **Spec.** [Schema Declarations](../spec_topics/schemas.md) (wire-name renaming).
- **Adds.** Field declaration `name as "WireName": T` parsed; wire name is non-empty string literal; redundant rename (`x as "x": T`) is warning not error.
- **Tests.** Each rule from spec; two fields with same wire name in same schema rejected; wire name colliding with another loom name in same schema rejected.
- **Deps.** V4b.
- **Ships when.** Renames parsable.

## V13b — Inbound wire-name translation

- **Spec.** [Runtime Value Model](../spec_topics/runtime-value-model.md) (wire-name translation).
- **Adds.** After AJV validation against lowered schema, runtime walks JSON and rebuilds value with loom-side identifiers using each schema's translation map.
- **Tests.** Model output `{"FirstName":"x"}` becomes loom value `{first_name:"x"}`; recursive structures translated; arrays of renamed objects translated.
- **Deps.** V13a.
- **Ships when.** Wire-side JSON becomes loom-side values.

## V13c — Outbound wire-name translation

- **Spec.** [Runtime Value Model](../spec_topics/runtime-value-model.md) (wire-name translation).
- **Adds.** When constructing tool input, query response payloads, or `invoke` arguments, runtime walks loom-side value and produces wire-named JSON before AJV validation.
- **Tests.** Round-trip: loom value → wire JSON → loom value yields original; lowered JSON Schema sees only wire names.
- **Deps.** V13a.
- **Ships when.** Loom values reach providers in correct shape.

## V13d — Discriminator detection on wire names

- **Spec.** [Schema Declarations](../spec_topics/schemas.md) (wire-name renaming, discriminated unions).
- **Adds.** When wire-renamed fields are involved, discriminator detection runs on lowered (wire) names; explicit `by` clause accepts loom-side name.
- **Tests.** Renamed discriminator field detected correctly; `by` clause resolves loom-side to wire-side at lowering.
- **Deps.** V13a, V11a.
- **Ships when.** Wire-renamed unions work.

## V13e — `///` doc comments on schema declarations and fields

- **Spec.** [Descriptions](../spec_topics/descriptions.md).
- **Adds.** `///` above schema → `description` on schema; above field → `description` on property. Multi-line `///` joins; common-leading-whitespace strip.
- **Tests.** Single-line and multi-line; whitespace strip; empty `///` line becomes blank line; placement on same line as field is parse error.
- **Deps.** V1c, V4b.
- **Ships when.** Schema descriptions reach providers.

## V13f — `retry:` and `tool_loop:` frontmatter parsing

- **Spec.** [Parameters and Frontmatter — `retry`](../spec_topics/frontmatter.md), [Parameters and Frontmatter — `tool_loop`](../spec_topics/frontmatter.md).
- **Adds.** `retry: { attempts: N, methodology: <enum> }`. Defaults: 3, `validator_error`. Methodologies: `validator_error`, `schema_repeat`, `none`. `tool_loop: { max_iterations: N }`. Default 25. Both blocks are optional with the documented defaults.
- **Tests.** Each methodology accepted; out-of-range `attempts` rejected; unknown methodology rejected; `tool_loop.max_iterations` accepts non-negative integers (0 disables model tool-use; positive integers cap the loop); negative or non-integer values rejected.
- **Deps.** V3a.
- **Ships when.** Retry and tool-loop config parse.

## V13g — Coercion methodology: `validator_error`

- **Spec.** [Query — Schema-validation coercion](../spec_topics/query.md), [Query — Typed queries are tool-loop-shaped](../spec_topics/query.md) (coercion follow-ups restart the two-phase loop).
- **Adds.** On AJV failure of the respond turn's payload, append a follow-up user turn quoting the AJV error; restart the two-phase loop with a fresh `tool_loop` budget (free phase — the model may re-tool, e.g. re-read a file — then forced respond turn); re-validate. Bounded by `retry.attempts`.
- **Tests.** Successful coercion at attempt 1, 2, 3; attempts exhausted → `Err({kind:"validation", attempts: N})`; conversation history preserves the malformed respond-tool call and the follow-up user turn; coercion follow-up that triggers an intermediate frontmatter tool call (model re-reads a file before answering) succeeds; coercion follow-up gets the full `tool_loop.max_iterations` budget independent of how many rounds the original turn consumed.
- **Deps.** V13f, V6i, V6k.
- **Ships when.** Default-mode coercion works through the two-phase loop.

## V13h — Coercion methodology: `schema_repeat`

- **Spec.** [Query](../spec_topics/query.md) (coercion).
- **Adds.** Follow-up turn re-states the schema instead of error.
- **Tests.** Follow-up turn text matches spec; same termination/attempt-counting rules apply.
- **Deps.** V13g.
- **Ships when.** Alternative methodology selectable.

## V13i — Coercion methodology: `none`

- **Spec.** [Query](../spec_topics/query.md) (coercion).
- **Adds.** First failure returned immediately as `Err`. Equivalent to `attempts: 0`.
- **Tests.** No follow-up turns sent; conversation history unchanged after the failed assistant turn.
- **Deps.** V13f.
- **Ships when.** Hot-path looms can fast-fail.

## V13j — Coercion preserves tool-call side effects

- **Spec.** [Query — Schema-validation coercion](../spec_topics/query.md), [Query — Non-validation failures during a coercion follow-up](../spec_topics/query.md).
- **Adds.** Coercion appends a *new* user turn rather than re-issuing the original (per spec's tool-side-effect concern). Non-validation failures during a follow-up (transport, cancellation, tool-failure, tool-loop-exhausted, context-overflow, invoke-failure, invoke-callee-error) propagate as the corresponding `QueryError` variant and do **not** consume an `attempts` slot. `context_overflow` short-circuits coercion permanently for the lifetime of that typed query.
- **Tests.** Conversation transcript shows malformed respond-tool call + follow-up user turn (not a re-run of the original user turn); a follow-up that fails with `transport` propagates `transport` (not `validation`) and the next attempt would still be available; a follow-up that overflows context returns `context_overflow` immediately and no further follow-ups are issued; a follow-up that hits `tool_loop_exhausted` propagates that variant.
- **Deps.** V13g, V6k.
- **Ships when.** Side-effect safety holds and non-validation failures route correctly.
