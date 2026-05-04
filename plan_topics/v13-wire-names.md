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

## V13f — `retry:` frontmatter parsing

- **Spec.** [Parameters and Frontmatter](../spec_topics/frontmatter.md) (`retry:`).
- **Adds.** `retry: { attempts: N, methodology: <enum> }`. Defaults: 3, `validator_error`. Methodologies: `validator_error`, `schema_repeat`, `none`.
- **Tests.** Each methodology accepted; out-of-range `attempts` rejected; unknown methodology rejected.
- **Deps.** V3a.
- **Ships when.** Retry config parses.

## V13g — Coercion methodology: `validator_error`

- **Spec.** [Query](../spec_topics/query.md) (coercion).
- **Adds.** On AJV failure, append a follow-up turn quoting the AJV error; await response; re-validate. Bounded by `retry.attempts`.
- **Tests.** Successful coercion at attempt 1, 2, 3; attempts exhausted → `Err({kind:"validation", attempts: N})`; conversation history preserves both malformed response and follow-up.
- **Deps.** V13f, V6i.
- **Ships when.** Default-mode coercion works.

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

- **Spec.** [Query](../spec_topics/query.md) (coercion).
- **Adds.** Coercion appends a *new* user turn rather than re-issuing the original (per spec's tool-side-effect concern).
- **Tests.** Conversation transcript shows malformed response + follow-up (not a re-run of the original user turn).
- **Deps.** V13g.
- **Ships when.** Side-effect safety holds.
