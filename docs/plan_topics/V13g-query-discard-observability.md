# `V13g` — Discarded-query result discipline and discard observability

**Spec.** [`../spec_topics/query.md`](../spec_topics/query.md), [`../spec_topics/query/query-escapes-stringification.md`](../spec_topics/query/query-escapes-stringification.md), [`../spec_topics/pi-integration-contract/runtime-event-channel.md`](../spec_topics/pi-integration-contract/runtime-event-channel.md).

**Adds.** The discarded-query-result discipline — the `loom/parse/discarded-query-result` parse error on a bare `@`...`` expression-statement, and the runtime discard-observability event that preserves a discarded `Err` on the operator-facing always-log channel for the explicit-discard (`let _ = @`...``) and `void`-tail forms.

**Tests.**
- `loom/parse/discarded-query-result` fires on a bare `@`...`` expression-statement; separately, a discarded query (via `let _ = @`...`` or the `void`-tail form) fires the runtime discard-observability event when — and only when — it settles to `Err`, and a discarded `Ok` via either form emits no event.

**Deps.** `V13g-T`, `V13a`, `V9d`

**Ships when.** `npm test` reds a bare `@`...`` expression-statement with `loom/parse/discarded-query-result` and emits the runtime discard-observability event on a discarded query that settles to `Err`.
