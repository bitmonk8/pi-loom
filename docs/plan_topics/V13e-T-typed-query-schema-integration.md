# `V13e-T` — Typed-query schema-validation integration (tests)

**Spec.** [`../spec_topics/query/query-failure-and-repair.md`](../spec_topics/query/query-failure-and-repair.md), [`../spec_topics/schema-subset.md`](../spec_topics/schema-subset.md), [`../spec_topics/query/query-schema-inference.md`](../spec_topics/query/query-schema-inference.md), [`../spec_topics/errors-and-results/queryerror-variants.md`](../spec_topics/errors-and-results/queryerror-variants.md).

**Adds.** Failing **integration** tests for the paired `V13e` leaf. They drive a typed `@`-query end-to-end through the real runtime execution path (`runTypedQueryLoop` / `runQueryEffect`, not the isolated pieces) and assert that a query's declared schema — a named `schema` decl **and** an inline object/type annotation — is resolved, lowered, conveyed to the model, and that the response is validated against it with respond-repair on non-conformance. These reds are the intended-reason reds for the integration gap the manual real-host smoke surfaced (see [`../../notes.md`](../../notes.md), 2026-07-02 typed-query finding): at `V13e-T` time `resolveSchema` and `runRespondRepairLoop` have no callers, the typed-query prompt conveys only the bare type name, and `runTypedQueryLoop` returns the raw model payload after only a depth walk.

**Tests.**
- `QRY-22` ([query-failure-and-repair.md — typed-query schema-validation integration](../spec_topics/query/query-failure-and-repair.md#qry-22)): a typed query annotated with a **named** `schema` decl resolves that name to its declared shape and lowers it (`V5d`/`SUBS-1`); the forced-respond conveyance carries the lowered shape, not the bare type name.
- `QRY-22` (validation enforced): a response that does not conform to the lowered declared schema is **not** bound as the query value — it routes through the `QRY-11` respond-repair loop, and terminal non-conformance surfaces `Err(QueryError { kind: "validation", cause: "schema_validation" })`.
- `QRY-22` (conforming response): a response conforming to the lowered schema validates and binds as the typed query's value.
- `QRY-22` (execution-path wiring): driving `runTypedQueryLoop` / `runQueryEffect` actually invokes schema resolution → lowering → `AjvSchemaValidator` → `runRespondRepairLoop`; the assertion drives the path rather than the isolated `V5d` / `V13c` / `V13d` units, so an implementation that leaves them unwired fails.

**Deps.** `V13c`, `V13d`, `V5d`, `V5f`, `V5a`, `V5b`, `V13b`, `V19a`, `H4b`

**Ships when.** The tests above exist, compile, and fail red for the intended reason (the typed-query schema-validation machinery is not integrated into the runtime execution path).
