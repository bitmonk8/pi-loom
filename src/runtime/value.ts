// V2c / V2c-T — the runtime value model and structural-equality seam.
//
// This module owns the interpreter representation of Loom values and the
// structural-equality relation of runtime-value-model.md (the RVM code-keyed
// obligation area — no numbered REQ-IDs):
//
//   - The value representation table: Loom `string`/`number`/`integer`/
//     `boolean`/`null`/`array<T>`/object-schema values are native JS values;
//     an *enum variant* carries the variant's wire string plus an
//     interpreter-private declaring-enum tag (the tag MUST NOT appear in JSON
//     output — `JSON.stringify` of an enum value yields the bare wire string);
//     a `Result<T, E>` is internally tagged with an `Ok`/`Err` discriminator
//     carrying the payload and is never lowered to wire (it has no lowered-
//     schema form, so a `Result` value never crosses the wire).
//   - Structural equality (`==`): cross-type compares to `false` (no parse
//     diagnostic, no runtime panic); primitives compare by value with the two
//     fixed refinements `NaN == NaN` is `true` and `+0 == -0` is `true`; arrays
//     compare element-wise at equal length; objects compare loom-side key set
//     and per-key value (declaration order irrelevant); enum variants compare
//     the declaring-enum tag *and* the wire value (`Severity.High ==
//     OtherEnum.High` is `false` even when wire values match); `Result`
//     compares the `Ok`/`Err` discriminator and recurses on the payload. The
//     subtype case `42 == 42.0` is `true` because `integer ⊑ number` routes the
//     pair to per-shape value comparison.
//
// V2c-T (tests-task) declares the seam shapes — `LoomValue`, the opaque
// `EnumValue`, the `ResultValue` discriminated union, the `makeEnumValue` /
// `makeOk` / `makeErr` constructors, the `valuesEqual` structural-equality
// relation, and the `isWireLowerable` predicate — and stubs the behaviour-
// bearing functions inertly so the failing tests compile and red on their own
// primary assertions (the declaring-enum-tagged representation, the structural-
// equality relation, and the `Result`-not-lowerable recognition are absent).
// The paired V2c implementation leaf fills these in.

/** Brand marking a value as a Loom enum runtime value (type-level only). */
declare const enumBrand: unique symbol;

/**
 * An enum runtime value. Carries the variant's wire string plus an
 * interpreter-private declaring-enum tag identifying the declaring enum.
 * `JSON.stringify` of an enum value yields the **bare wire string** — the tag
 * never appears in JSON output (runtime-value-model.md, value-representation
 * table, enum row). Opaque: construct only via `makeEnumValue`; the concrete
 * in-memory shape is an implementation detail not reachable from Loom code and
 * may change without a spec revision.
 */
export type EnumValue = { readonly [enumBrand]: "loom-enum" };

/**
 * A `Result<T, E>` runtime value: internally tagged with an `Ok`/`Err`
 * discriminator carrying the payload (runtime-value-model.md, value-
 * representation table, `Result` row). Loom code observes `Result` only through
 * `Ok` / `Err` constructors, `match`, and `?`; `Result` has no lowered-schema
 * form and never crosses the wire.
 */
export type ResultValue =
  | { readonly ok: true; readonly value: LoomValue }
  | { readonly ok: false; readonly error: LoomValue };

/**
 * The interpreter representation of any Loom value (runtime-value-model.md,
 * value-representation table): a JS primitive (`string` / `number` covers both
 * `number` and `integer` / `boolean` / `null`), a JS array (`array<T>`), a JS
 * plain object keyed by loom-side names (object schema), an enum variant, or a
 * `Result`.
 */
export type LoomValue =
  | string
  | number
  | boolean
  | null
  | readonly LoomValue[]
  | { readonly [key: string]: LoomValue }
  | EnumValue
  | ResultValue;

/**
 * Construct an enum runtime value for `wire` declared by enum `declaringEnum`.
 * The resulting value carries the wire string plus the interpreter-private
 * declaring-enum tag, and `JSON.stringify` of it yields the bare wire string.
 *
 * V2c-T inert stub: returns a plain tagged object, which `JSON.stringify`
 * serialises to its object form rather than the bare wire string, so the value-
 * representation test reds on its primary assertion. The paired V2c leaf builds
 * the real declaring-enum-tagged representation (the reference encoding is a
 * non-enumerable tag on a boxed string).
 */
export function makeEnumValue(declaringEnum: string, wire: string): EnumValue {
  return { __loomEnum: declaringEnum, wire } as unknown as EnumValue;
}

/** Construct an `Ok(value)` `Result` runtime value. */
export function makeOk(value: LoomValue): ResultValue {
  return { ok: true, value };
}

/** Construct an `Err(error)` `Result` runtime value. */
export function makeErr(error: LoomValue): ResultValue {
  return { ok: false, error };
}

/**
 * The structural deep-equality relation of runtime-value-model.md §Equality
 * (the `==` operator). Cross-type pairs compare `false`; primitives compare by
 * value with `NaN == NaN` true and `+0 == -0` true; arrays compare element-wise
 * at equal length; objects compare loom-side key set and per-key value; enum
 * variants compare the declaring-enum tag *and* the wire value; `Result`
 * compares the discriminator and recurses on the payload. Never panics and
 * never raises a diagnostic — a cross-type comparison simply evaluates `false`.
 *
 * V2c-T inert stub: reports every pair unequal (returns `false`), so each
 * equality test reds on its `true`-expecting primary assertion (the structural-
 * equality relation is absent). The paired V2c leaf implements the relation.
 */
export function valuesEqual(a: LoomValue, b: LoomValue): boolean {
  void a;
  void b;
  return false;
}

/**
 * Whether a runtime value has a lowered-schema (wire) form. A `Result` value is
 * **never** lowerable — it has no lowered-schema form and never crosses the
 * wire (runtime-value-model.md, value-representation table, `Result` row).
 * Plain primitives, arrays, objects, and enum variants are lowerable.
 *
 * V2c-T inert stub: reports every value lowerable, so the `Result`-not-lowerable
 * test reds on its primary assertion (the `Result` non-lowerable recognition is
 * absent). The paired V2c leaf implements the recognition.
 */
export function isWireLowerable(value: LoomValue): boolean {
  return value !== undefined;
}
