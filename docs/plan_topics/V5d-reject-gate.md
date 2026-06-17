# `V5d` — Schema-subset reject gate

**Spec.** [`../spec_topics/schema-subset.md`](../spec_topics/schema-subset.md), [`../spec_topics/schemas.md`](../spec_topics/schemas.md).

**Adds.** The JSON-Schema-subset reject gate (Draft 2020-12; `anyOf` only; objects all-required + `additionalProperties:false`; single `items`; null via union; reject pattern/format/min*/max*) as an **allowlist / reject-by-default** gate: it accepts only the fixed, loom-defined permitted subset and rejects every construct outside that subset — including constructs that are neither in the permitted subset nor in the enumerated unsupported-keyword list — with `loom/parse/unsupported-feature`. The lowering pass and the canonical-hash recipe that operate on the accepted subset are owned by [`V5f`](./V5f-subset-lowering-hash.md).

**Tests.**
- The reject gate fires `loom/parse/unsupported-feature` for each rejected JSON-Schema keyword and `loom/parse/result-in-schema-position` for a `Result` in a schema-feeding position, and accepts the permitted subset.
- A JSON-Schema construct outside the permitted subset but absent from the enumerated unsupported-keyword list is still rejected with `loom/parse/unsupported-feature`, witnessing the allowlist (reject-by-default) semantics and excluding a denylist build.
- `Result` in schema position is rejected; array element order is preserved.

**Deps.** `V5d-T`, `V5a`, `V5b`, `V2d`

**Ships when.** `npm test` asserts the reject gate accepts the permitted subset and, as an allowlist, fires `loom/parse/unsupported-feature` both for each enumerated rejected keyword and for a construct outside the permitted subset that is absent from the enumerated list, and fires `loom/parse/result-in-schema-position` for `Result`-in-schema-position.
