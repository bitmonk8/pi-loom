# Type System

The type system is JSON-native. Type expressions are built from:

- **Primitive types**: `string`, `number`, `integer`, `boolean`, `null`
- **Named types**: any schema or enum identifier in scope (`Author`, `ReviewScore`)
- **Generic types**: `array<T>`, `Result<T, E>` (and any future parameterised type) — angle-bracket type parameters are the uniform Loom convention
- **Union types**: `T | U | ...` — the `|` operator is the lowest-precedence type operator and is legal anywhere a type is
- **Literal types**: `"..."`, `42`, `true`, `false`, `null` — string, number, and boolean literals are valid type expressions (single-arm "unions" are how `kind: "validation"`-style const fields are expressed)
- **Inline anonymous objects**: `{ field: T, ... }` — legal in any type position, but named schemas are preferred for reuse and for getting a name in error messages
- **Inline arrays**: not a separate form — use `array<T>` (no `T[]`, no `[T]`)

The same type grammar applies in every type-annotation position: schema fields, frontmatter `params:`, `let x: T`, function parameters, function return types, and `@<T>`...`` explicit query schemas.

Subsections of the type system are split into their own pages:

- [Schema Declarations](./schemas.md) — `schema X { ... }`, `schema X = ...`, `enum`, discriminated unions, recursion, wire-name renaming.
- [Descriptions](./descriptions.md) — `///` doc comments and field separator rules.
- [Schema Subset](./schema-subset.md) — the JSON-Schema subset Loom targets, plus the lowering algorithm.
