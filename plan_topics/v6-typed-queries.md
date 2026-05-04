# V6 — Typed queries, `Result`, `?`, schema inference

## V6a — `Ok` / `Err` constructors and `Result<T, E>` type

- **Spec.** [Errors and Results](../spec_topics/errors-and-results.md) (`Result` as user-visible type), [Runtime Value Model](../spec_topics/runtime-value-model.md) (`Result` representation).
- **Adds.** `Ok(value)` and `Err(error)` as expressions; `Result<T, E>` as a type expression; runtime tagged-object representation `{ok: true, value} | {ok: false, error}`.
- **Tests.** Construction and equality (`Ok(1) == Ok(1)`); type checker rejects `Ok` as a value passed where a non-Result type is expected.
- **Deps.** V5g.
- **Ships when.** Loom code can construct and compare Result values.

## V6b — `?` operator desugaring

- **Spec.** [Errors and Results](../spec_topics/errors-and-results.md) (`?` operator).
- **Adds.** `expr?` desugars to `match expr { Ok(v) => v, Err(e) => return Err(e) }`. Enclosing function/loom must therefore return `Result<_, QueryError>` (or have it inferred).
- **Tests.** `?` on `Ok` unwraps; `?` on `Err` early-returns at the matching enclosing scope; `?` in a non-Result function is a parse error with the spec's hint.
- **Deps.** V6a.
- **Ships when.** Looms can use `?` to propagate failures.

## V6c — Schema inference: binding-annotation sink

- **Spec.** [Query](../spec_topics/query.md) (typed form, inference rule 1).
- **Adds.** `let x: T = @\`...\`?` infers `T` as the response schema for the query.
- **Tests.** Spec's worked example; nested annotation flows through parens; missing annotation falls through to next rule (later leaves).
- **Deps.** V4, V6b.
- **Ships when.** The most common typed-query pattern works.

## V6d — Schema inference: enclosing return-type sink

- **Spec.** [Query](../spec_topics/query.md) (inference rule 2).
- **Adds.** When a query is in tail-expression position of a function/loom whose return type is declared, that type supplies the schema.
- **Tests.** Function with declared `Result<T, QueryError>` return; query in tail position infers `T`; `return @\`...\`?` infers from declared return type.
- **Deps.** V6c, V9 (functions). *(Order: this leaf depends on V9a–V9e; reorder as needed.)*
- **Ships when.** Functions can be written without redundant annotations.

## V6e — Schema inference: enclosing call-site parameter-type sink

- **Spec.** [Query](../spec_topics/query.md) (inference rule 3).
- **Adds.** `f(@\`...\`?)` where `f`'s parameter is typed `T` infers `T`. Crosses a single call boundary; outer call's parameter is opaque past inner call's argument.
- **Tests.** Spec's `f(g(@\`...\`?))` example: `g`'s param is the sink, `f`'s isn't; tool-call argument as sink works the same way.
- **Deps.** V6c, V9.
- **Ships when.** Pipeline-style code reads cleanly.

## V6f — Schema inference: array-literal sink propagation

- **Spec.** [Query](../spec_topics/query.md) (worked example: array literal).
- **Adds.** `let xs: array<T> = [@\`...\`?, @\`...\`?]` propagates `T` to each element's query.
- **Tests.** Spec's example; mixed-type elements without sink → parse error.
- **Deps.** V6c, V2h.
- **Ships when.** Arrays of typed query results work.

## V6g — Schema inference: stop-set rule

- **Spec.** [Query](../spec_topics/query.md) (inference algorithm — opaque list).
- **Adds.** Walk stops at: binary/unary operators, member access, indexed access, `match` scrutinee, `if`/`while` condition. Inside these, only explicit `@<T>`...`` ascription supplies a schema.
- **Tests.** `let x = @\`...\`? + 1` is a type error (query untyped, returns `string`, `+ 1` mismatch); `match @\`...\` { ... }` is a type error without explicit ascription; each opaque position tested.
- **Deps.** V6c–V6f.
- **Ships when.** The walk's boundaries are predictable.

## V6h — Explicit `@<Schema>`...`` ascription

- **Spec.** [Query](../spec_topics/query.md) (explicit form).
- **Adds.** `@<T>`...`` syntax overrides inference; required in any position with no usable sink.
- **Tests.** Wins over inference (with parse warning if it disagrees with binding annotation); allowed in `match` scrutinee; parsed correctly when `T` is a generic like `array<Score>`.
- **Deps.** V6g.
- **Ships when.** Untypeable positions become typeable.

## V6i — AJV validation of typed query results

- **Spec.** [Query](../spec_topics/query.md) (typed form, `validation_errors`), [Errors and Results](../spec_topics/errors-and-results.md), [Pi Integration Contract](../spec_topics/pi-integration-contract.md) (typed-query behavioural contract), [Implementation Notes — Runtime](../spec_topics/implementation-notes.md#runtime) (V1 reference implementation of the typed-query mechanism).
- **Adds.** Inferred or explicit schema lowered + handed to provider; response AJV-validated; failure → `Err(QueryError {kind:"validation", ...})`. No coercion follow-ups yet (V13k–m).
- **Tests.** Valid response unwraps; invalid response yields `validation` error with `attempts: 0`, populated `validation_errors`, and `raw_response` set; AJV error path matches JSON-Pointer format.
- **Deps.** V6c, V4.
- **Ships when.** Typed queries return typed values.

## V6j — `ValidationIssue` schema

- **Spec.** [Query](../spec_topics/query.md) (`ValidationIssue` shape).
- **Adds.** Loom-shaped `ValidationIssue { path, message, schema_keyword }` interposed between AJV and `validation_errors` so AJV swap is non-breaking.
- **Tests.** Each AJV error keyword (`type`, `required`, `enum`, `const`) maps to the right `schema_keyword`; path is JSON-Pointer.
- **Deps.** V6i.
- **Ships when.** Loom code never touches raw AJV objects.
