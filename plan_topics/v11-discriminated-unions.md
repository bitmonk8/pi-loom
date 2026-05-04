# V11 — Discriminated unions and recursion

## V11a — Implicit discriminator detection

- **Spec.** [Schema Declarations](../spec_topics/schemas.md) (discriminated unions).
- **Adds.** `schema X = A | B | C` where each variant has exactly one shared single-literal field with unique values per variant: detected as discriminator.
- **Tests.** Detection works on representative examples; lowering is plain `anyOf` (no discriminator keyword emitted).
- **Deps.** V4b, V4c.
- **Ships when.** Standard discriminated unions work.

## V11b — Ambiguous-candidate diagnostic

- **Spec.** [Schema Declarations](../spec_topics/schemas.md) (discriminated unions).
- **Adds.** Multiple qualifying fields → parse error naming all candidates with hint to use `by`.
- **Tests.** Two-candidate case; three-candidate case; message text matches spec verbatim.
- **Deps.** V11a.
- **Ships when.** Author has clear path to disambiguate.

## V11c — Missing-discriminator diagnostic

- **Spec.** [Schema Declarations](../spec_topics/schemas.md) (discriminated unions).
- **Adds.** No qualifying field → parse error with hint to add `kind` field or use `by`.
- **Tests.** Three different no-candidate shapes; message text matches spec verbatim.
- **Deps.** V11a.
- **Ships when.** Discriminator-less unions are caught early.

## V11d — Explicit `by <field>` form

- **Spec.** [Schema Declarations](../spec_topics/schemas.md) (discriminated unions).
- **Adds.** `schema X by kind = A | B`. Resolves to loom-side identifier; lowering uses each variant's wire name.
- **Tests.** Explicit form overrides detection; loom-side name accepted; wire name forbidden in `by` clause.
- **Deps.** V11a.
- **Ships when.** Author can override detection.

## V11e — Discriminator must be top-level

- **Spec.** [Schema Declarations](../spec_topics/schemas.md) (discriminated unions).
- **Adds.** Nested discriminator like `kind: { type: "x" }` → parse error.
- **Tests.** Nested case rejected with diagnostic.
- **Deps.** V11a.
- **Ships when.** Nested discriminators can't sneak in.

## V11f — Mixed unions

- **Spec.** [Schema Declarations](../spec_topics/schemas.md) (mixed unions).
- **Adds.** `string | Author`, `Author | null` lower as plain `anyOf` (multi-type-array form preferred when all primitives).
- **Tests.** `Author | null` lowers correctly; `string | Author` produces `anyOf`.
- **Deps.** V11a, V4c.
- **Ships when.** Non-discriminated unions still work.

## V11g — Self-recursive object schemas

- **Spec.** [Schema Declarations](../spec_topics/schemas.md) (recursion).
- **Adds.** `schema Tree { value, children: array<Tree> }` lowers via `$defs`/`$ref`.
- **Tests.** Recursion lowered transparently; AJV validates 4-deep tree.
- **Deps.** V4i. *(V4i is the AJV side; this is the surface.)*
- **Ships when.** Authors don't write `$ref`/`$defs` manually.

## V11h — Mutual recursion across schemas

- **Spec.** [Schema Declarations](../spec_topics/schemas.md) (recursion).
- **Adds.** `Person ↔ Animal` mutual references resolve.
- **Tests.** Both schemas lower; AJV validates representative document.
- **Deps.** V11g.
- **Ships when.** Mutual recursion is transparent.

## V11i — Runtime depth cap of 5

- **Spec.** [Schema Subset](../spec_topics/schema-subset.md) (depth).
- **Adds.** AJV-time check on JSON document depth ≤ 5; deeper data is `validation` error with clear path.
- **Tests.** Depth-5 accepted; depth-6 rejected; cap applies to data not schema graph.
- **Deps.** V11g.
- **Ships when.** Depth cap is enforced uniformly.
