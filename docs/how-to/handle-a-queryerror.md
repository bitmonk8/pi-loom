# How to handle a QueryError

A query never throws — it returns `Result<T, QueryError>`. You want to recover
from a specific failure (say, a schema-validation miss) rather than propagate it
with `?`. Use `match` and destructure the `QueryError` variant.

## Steps

1. Put the query in `match` scrutinee position. `match` is opaque to schema
   inference, so a typed query here needs the explicit `@<Schema>` form.
2. Write an `Ok(v)` arm for success and one or more `Err(...)` arms for the
   failures you handle.
3. Destructure the variant by `kind` (and `cause`, where a variant partitions).
   An object pattern lists only the fields you match on; others are ignored. Rest
   patterns (`..`) are not part of loom 1.0.
4. End with a wildcard `Err(_)` arm — `match` exhaustiveness is not statically
   checked, and a non-exhaustive `match` panics at runtime.

## Working example

[`docs/examples/handle-error.loom`](../examples/handle-error.loom) recovers from a
schema-validation failure with a safe default:

```loom
---
description: Triage a message, recovering from a schema-validation failure
mode: subagent
params:
  message: string
---
schema Triage {
  category: "bug" | "feature" | "question",
  urgent: boolean
}

let outcome = match @<Triage>`Triage this message: ${message}` {
  Ok(t) => t,
  Err(QueryError { kind: "validation", cause: "schema_validation" }) =>
    Triage { category: "question", urgent: false },
  Err(_) => Triage { category: "question", urgent: false },
}
@`Handling as ${outcome.category} (urgent: ${outcome.urgent}).`
```

Run it:

```
pi --loom docs/examples -p "/handle-error the export button does nothing"
```

## Result

On success the arm binds the validated `Triage`. If the model's response cannot
be repaired to the schema, the query returns `Err(QueryError { kind: "validation",
cause: "schema_validation", ... })` and the matching arm supplies a default
instead of aborting the loom. The wildcard arm keeps the `match` total against
transport, cancellation, tool-loop, and every other variant. Match `cause` when
you want arm-specific recovery; match `QueryError { kind: "validation" }` alone
for arm-uniform handling.

## Reference

- Every `QueryError` variant and its fields (`kind`, `cause`, `validation_errors`,
  …) — [Error & result model](../reference/errors-and-results.md).
- `match` arm and pattern grammar, `?` desugaring, `loom/runtime/match-error` —
  [Grammar](../reference/grammar.md).
- Which ceiling failures surface as a recoverable `Err` vs a panic —
  [Hard ceilings](../reference/hard-ceilings.md).
- The success / fail / cancelled trichotomy — [Guide](../guide.md).

## Provenance

- Spec: `docs/spec_topics/errors-and-results/queryerror-variants.md` (variant
  schemas, `cause` sub-discriminator), `docs/spec_topics/errors-and-results/error-model.md`,
  `docs/spec_topics/query/query-failure-and-repair.md` (QRY-8, respond-repair),
  `docs/spec_topics/control-flow.md`, `docs/reference/grammar.md` (pattern grammar,
  rest-pattern rejection), glossary entry *`cause`*.
- Example `handle-error.loom` requested from `loom-docs-example-runner`.
