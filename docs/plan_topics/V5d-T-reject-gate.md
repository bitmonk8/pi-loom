# `V5d-T` — Schema-subset reject gate (tests)

**Spec.** [`../spec_topics/schema-subset.md`](../spec_topics/schema-subset.md), [`../spec_topics/schemas.md`](../spec_topics/schemas.md).

**Adds.** Failing tests for the paired `V5d` implementation leaf.

**Tests.**
- The reject gate fires `loom/parse/unsupported-feature` for each rejected JSON-Schema keyword and `loom/parse/result-in-schema-position` for a `Result` in a schema-feeding position, and accepts the permitted subset.
- `Result` in schema position is rejected; array element order is preserved.

**Deps.** `V5a`, `V5b`, `V2d`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
