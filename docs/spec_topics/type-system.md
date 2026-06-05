# Type System

The type system is JSON-native. Type expressions are built from:

- **Primitive types**: `string`, `number`, `integer`, `boolean`, `null`
- **Named types**: any schema or enum identifier in scope (`Author`, `ReviewScore`)
- **Generic types**: `array<T>`, `Result<T, E>` (and any future parameterised type) — angle-bracket type parameters are the uniform Loom convention
- **Union types**: `T | U | ...` — the `|` operator is the lowest-precedence type operator and is legal anywhere a type is
- **Literal types**: `"..."`, `42`, `true`, `false`, `null` — string, number, and boolean literals are valid type expressions (single-arm "unions" are how `kind: "validation"`-style const fields are expressed)
- **Inline anonymous objects**: `{ field: T, ... }` — legal in any type position, but named schemas are preferred for reuse and for getting a name in error messages
- **Inline arrays**: not a separate form — use `array<T>` (no `T[]`, no `[T]`)

`void` is **not** a primitive value type and is deliberately absent from the list above: it is admitted only as a function- or loom-**return** annotation meaning "intentionally produces no value", never in a value-bearing type position (see [Grammar Appendix — Type grammar](./grammar.md#type-grammar) and [Function Definitions — Empty-tail body](./functions.md#empty-tail-body)). A `void` in any other type position is `loom/parse/void-in-non-return-position`, and `void` does not participate in type compatibility ([below](#type-compatibility)).

The same type grammar applies in every type-annotation position: schema fields, frontmatter `params:`, `let x: T`, function parameters, and `@<T>`...`` explicit query schemas; the function- and loom-return position additionally admits the return-only `void` annotation.

Subsections of the type system are split into their own pages:

- [Schema Declarations](./schemas.md) — `schema X { ... }`, `schema X = ...`, `enum`, discriminated unions, recursion, wire-name renaming.
- [Descriptions](./descriptions.md) — `///` doc comments and field separator rules.
- [Schema Subset](./schema-subset.md) — the JSON-Schema subset Loom targets, plus the lowering algorithm.

<a id="type-compatibility"></a>

## Type compatibility

Wherever the spec asks whether a value of static type `T₁` may be used in a position that expects type `T₂` — the RHS of a typed `let`, a function-argument slot, an `invoke<T>` return annotation, the common type of `match` arms or ternary branches, an `array<T>` element against its sink, the `+` operator's mixed-numeric case, a frontmatter `params:` default — the answer is governed by the single relation `T₁ ⊑ T₂` (read "`T₁` is compatible with `T₂`"). The relation is normative; every site that previously phrased itself as "the same rules as `let`" or "a common type" cites this section by anchor.

**Operational definition.** `T₁ ⊑ T₂` holds iff every value statically typed as `T₁` AJV-validates against the lowering of `T₂` (see [Schema Subset — Lowering Algorithm](./schema-subset.md#lowering-algorithm)). The AJV reading is the safety net at runtime; the parser is required to recognise the structural cases enumerated below without falling back to it, so that compatibility failures surface as parse errors at the offending source span rather than as runtime validation errors at a downstream call site.

**Structural cases the parser must recognise.** The following hold without invoking AJV. The list is closed for V1 — anything outside it that the parser cannot decide statically is reported as a type mismatch (`loom/parse/*-type-mismatch` at the call site, e.g. `loom/parse/invoke-return-type-mismatch`, `loom/parse/invoke-arg-type-mismatch`, `loom/parse/array-element-type-mismatch`, `loom/parse/match-arm-type-mismatch`), unless the position is one where a runtime AJV check is documented as the safety net (e.g. an `invoke` against a callee that is not statically resolvable).

| # | Rule | Notes |
|---|---|---|
| 1 | Reflexivity: `T ⊑ T` for every type. | Identical primitives, identical named schemas, identical inline objects. |
| 2 | `integer ⊑ number`. | One-way only; the reverse is `loom/parse/integer-narrowing` (see [Lexical — Number literals](./lexical.md)). |
| 3 | Literal-to-primitive: `L ⊑ T` when `L` is a literal type and the value `L` would be statically typed `T` in expression position. | E.g. `"validation" ⊑ string`, `42 ⊑ integer`, `42 ⊑ number`, `true ⊑ boolean`, `null ⊑ null`. |
| 4 | Variant-to-union: for any discriminated union `schema U = A \| B \| ...`, every variant satisfies `A ⊑ U`. | The "narrower callee under wider annotation" case (`Cat ⊑ Animal`). |
| 5 | Union-widening: `T ⊑ T \| U` for any `U`. | Combined with rule 4, `A ⊑ A \| B` even when the union is anonymous. |
| 6 | Union-distributive: `T₁ \| T₂ ⊑ T₃` iff `T₁ ⊑ T₃` and `T₂ ⊑ T₃`. | Each arm must individually satisfy the target. |
| 7 | Element-wise on arrays: `array<T₁> ⊑ array<T₂>` iff `T₁ ⊑ T₂`. | Covariant — `array<Cat> ⊑ array<Animal>`. Already implied by the array-LUB rule in [Expressions — array construction](./expressions.md#object-construction-array-construction-and-operator-rules); restated here so it can be cited from non-array sites. |
| 8 | Field-wise on object schemas: an object type with declared fields `{ f₁: T₁, ... }` is `⊑` another object type with the same declared field set `{ f₁: U₁, ... }` iff `Tᵢ ⊑ Uᵢ` for every `i`. | Field sets must match exactly: every Loom-lowered object schema carries `additionalProperties: false` (see [Schema Subset](./schema-subset.md)), so excess properties never widen — there is no TS-style structural-subtyping admission of extra fields, and an object with even one extra declared field is not compatible. Field order is irrelevant. |

Rules outside this list are deliberately **not** part of loom 1.0 compatibility: function-parameter contravariance, optional-field widening, excess-property tolerance on objects, and `number ⊑ integer` are all rejected. A future widening of the relation is non-breaking iff it only admits new pairs.

**`void` does not participate in `⊑`.** `void` is a return-only annotation, not a value-bearing type (see [Grammar Appendix — Type grammar](./grammar.md#type-grammar)); no value is ever statically typed `void`, so `void` appears on neither side of a `T₁ ⊑ T₂` check. A `void` in any non-return type position is rejected at parse time as `loom/parse/void-in-non-return-position` before any compatibility question arises.

**Unresolvable operands.** When either side of a compatibility check is past the parser's static view (e.g. an inferred binding whose RHS depends on a Pi-tool call whose registered schema is not visible at parse time, or an `invoke` against a callee that produced `loom/load/callee-has-errors`), the parse-time check is skipped and the runtime AJV check is the safety net. The skipping is the same posture documented for the unresolvable-callee case in [Invocation — Typed return](./invocation.md) and the unresolvable-tool case in [Tool Calls](./tool-calls.md); cite this paragraph rather than restating it.

