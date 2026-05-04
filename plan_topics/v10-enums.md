# V10 — Enums and literal-union types

## V10a — `enum X { ... }` declaration

- **Spec.** [Schema Declarations](../spec_topics/schemas.md) (enum subsection).
- **Adds.** `enum X { Variant, Variant, ... }`; PascalCase variant rule; trailing comma optional. Default wire value = variant name verbatim.
- **Tests.** Variant case rule enforced; lowering produces `{type:string, enum:[...]}`; payload-carrying variants rejected (use `schema X = A | B`).
- **Deps.** V4.
- **Ships when.** Enums declarable and usable as types.

## V10b — Explicit variant values

- **Spec.** [Schema Declarations](../spec_topics/schemas.md) (enum subsection).
- **Adds.** `Low = "low"`. RHS must be string literal in V1.
- **Tests.** Explicit value used in lowering; numeric/boolean RHS rejected; duplicate explicit values in same enum is parse error.
- **Deps.** V10a.
- **Ships when.** Wire-shaped enums work.

## V10c — `Enum.Variant` access expression

- **Spec.** [Schema Declarations](../spec_topics/schemas.md) (variant access).
- **Adds.** `Severity.High` evaluates to wire value, statically typed as `Severity`. Unknown variant is parse error.
- **Tests.** Type is `Severity` not `string`; `Severity.Critical` (no such variant) is parse error.
- **Deps.** V10a.
- **Ships when.** Enum values referenceable in code.

## V10d — Literal-union types

- **Spec.** [Type System](../spec_topics/type-system.md) (literal types in unions).
- **Adds.** `severity: "low" | "medium" | "high"` as inline type. Lowers identical to enum.
- **Tests.** Lowering matches enum form; literal-union accepted in any type position.
- **Deps.** V4d.
- **Ships when.** Inline enums work without top-level declaration.

## V10e — Runtime enum brand

- **Spec.** [Runtime Value Model](../spec_topics/runtime-value-model.md) (enum representation).
- **Adds.** Enum variant runtime value is a `string` with non-enumerable `__loomEnum: "<EnumName>"` brand.
- **Tests.** Cross-enum equality `A.High == B.High` is `false` even when wire values match; brand survives `JSON.stringify` removal correctly (i.e., not present in JSON).
- **Deps.** V10c.
- **Ships when.** Enum equality is type-safe.

## V10f — Enum doc comments

- **Spec.** [Descriptions](../spec_topics/descriptions.md).
- **Adds.** `///` above enum declaration → schema description; `///` above variant → per-variant `description` (within `oneOf`-of-consts form when needed). Full description support land in V13e; this leaf only covers enums.
- **Tests.** Description appears in lowered schema; multi-line `///` joins.
- **Deps.** V10a, V1c.
- **Ships when.** Enums carry descriptions to providers.
