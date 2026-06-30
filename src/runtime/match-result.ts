// V4a / V4a-T — the runtime `match`-evaluation seam.
//
// This module owns the runtime dispatch of a `match` expression over the six
// loom 1.0 pattern forms of expressions.md §"Pattern grammar (loom 1.0)" —
// wildcard, identifier, literal, constructor, object/schema, and array — and
// the `loom/runtime/match-error` panic (the implementation refers to it as
// `MatchError`) that fires when a scrutinee value matches none of a `match`'s
// arms (errors-and-results/error-model.md §"Runtime panics"; loom 1.0 does not
// statically check exhaustiveness, per expressions.md §"Exhaustiveness").
//
// V4a-T (tests-task) declares the seam — the `Pattern` model, the `MatchArm`
// shape, the `MatchError` panic class, and the `evaluateMatch` entry point —
// and asserts only the raise-versus-bind exhaustion behaviour: a scrutinee
// matching one of the six pattern forms binds and evaluates the selected arm,
// while a scrutinee matching none raises `MatchError`. The panic's `?`/`match`
// bypass and its registered `loom/runtime/match-error` message template are
// deferred to and closed by V4b-T, so V4a-T does not assert the message string.
//
// `evaluateMatch` is stubbed inert (it matches no arm and raises no panic), so
// the raise-versus-bind tests red on their own primary assertions (no thrown
// `MatchError`, and a sentinel return value rather than the selected arm's
// value), not on a compile error, a missing fixture, or a harness throw. The
// paired V4a implementation leaf fills it in.

import { type LoomValue, type ResultValue, valuesEqual } from "./value";
import { LoomPanic } from "./runtime-panics";

/** The registry code carried by the non-exhaustive-`match` runtime panic. */
export const MATCH_ERROR_CODE = "loom/runtime/match-error";

/**
 * The non-exhaustive-`match` runtime panic (errors-and-results/error-model.md
 * §"Runtime panics"; the implementation refers to it as `MatchError`). Carries
 * the `loom/runtime/match-error` registry code. The registered message-template
 * formatting and the `?`/`match` bypass routing are closed by V4b. It is a
 * `LoomPanic` so the runtime-defect surface (`surfaceUnexpectedThrow`)
 * recognises it as one of the six closed panic sources rather than
 * reclassifying it as `loom/runtime/internal-error`.
 */
export class MatchError extends LoomPanic {
  readonly code = MATCH_ERROR_CODE;

  constructor(message: string) {
    super(message);
    this.name = "MatchError";
  }
}

/**
 * Render the `<scrutinee summary>` of a non-exhaustive-`match` panic per the
 * category-2 runtime-value placeholder rule (diagnostics/placeholder-
 * rendering-a.md): integers/numbers as their shortest decimal (`-0` normalised
 * to `0`), booleans / `null` literally, strings truncated past 80 code points
 * to 77-code-points-plus-`...`, enum variants as their bare wire string,
 * `Result` values as `Ok(<inner>)` / `Err(<inner>)`, and arrays / schema-typed
 * objects as compact `JSON.stringify` (the schema name does not surface).
 */
function summariseScrutinee(value: LoomValue): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    const codePoints = Array.from(value);
    return codePoints.length <= 80 ? value : codePoints.slice(0, 77).join("") + "...";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return Object.is(value, -0) ? "0" : String(value);
  }
  // An enum runtime value is a boxed `String`; it renders as its bare wire
  // string (the declaring-enum tag never surfaces).
  if (value instanceof String) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  // A `Result` value renders as `Ok(<inner>)` / `Err(<inner>)`.
  if (typeof (value as { ok?: unknown }).ok === "boolean") {
    const result = value as ResultValue;
    return result.ok
      ? `Ok(${summariseScrutinee(result.value)})`
      : `Err(${summariseScrutinee(result.error)})`;
  }
  // Any other schema-typed object: compact `JSON.stringify`.
  return JSON.stringify(value);
}

/**
 * One of the six loom 1.0 `match` pattern forms (expressions.md §"Pattern
 * grammar (loom 1.0)"):
 *
 *   - `wildcard`    — `_`: matches anything, binds nothing.
 *   - `identifier`  — `x`: matches anything, binds the value to `name`.
 *   - `literal`     — `"validation"`, `0`, `true`, `null`: matches by structural
 *                     equality against `value`.
 *   - `constructor` — `Ok(p)` / `Err(p)`: matches the named `Result` variant and
 *                     recurses into `inner`.
 *   - `object`      — `Schema { field: p, ... }`: matches an object whose listed
 *                     `fields` match their inner patterns; unlisted fields are
 *                     ignored.
 *   - `array`       — `[a, b]`: matches an exact-length array, each slot against
 *                     its pattern.
 */
export type Pattern =
  | { readonly kind: "wildcard" }
  | { readonly kind: "identifier"; readonly name: string }
  | { readonly kind: "literal"; readonly value: LoomValue }
  | { readonly kind: "constructor"; readonly ctor: "Ok" | "Err"; readonly inner: Pattern }
  | {
      readonly kind: "object";
      readonly fields: readonly { readonly name: string; readonly pattern: Pattern }[];
    }
  | { readonly kind: "array"; readonly elements: readonly Pattern[] };

/** The bindings a matched pattern introduces (identifier name → bound value). */
export type Bindings = Readonly<Record<string, LoomValue>>;

/**
 * One `match` arm: a `pattern` and a `body` evaluated with the bindings the
 * pattern introduces. The body is a thunk so a non-selected arm's body is never
 * evaluated (expressions.md §`match` expression — arms evaluate to a value).
 */
export interface MatchArm {
  readonly pattern: Pattern;
  readonly body: (bindings: Bindings) => LoomValue;
}

/**
 * Evaluate a `match` expression: dispatch `scrutinee` against `arms` in order,
 * first matching arm wins, and evaluate the selected arm's `body` with the
 * bindings its pattern introduces. When `scrutinee` matches none of the arms,
 * raise `MatchError` (`loom/runtime/match-error`) — loom 1.0 performs no static
 * exhaustiveness check, so non-exhaustion surfaces at runtime
 * (expressions.md §"Exhaustiveness").
 *
 * V4a-T stubs this inert: it matches no arm and raises no panic, returning a
 * sentinel. The paired V4a leaf implements pattern dispatch, binding, and the
 * `MatchError` raise.
 */
export function evaluateMatch(
  scrutinee: LoomValue,
  arms: readonly MatchArm[],
): LoomValue {
  // First matching arm wins; a non-selected arm's body is never evaluated.
  for (const arm of arms) {
    const bindings: Record<string, LoomValue> = {};
    if (matchPattern(arm.pattern, scrutinee, bindings)) {
      return arm.body(bindings);
    }
  }
  // The scrutinee matched none of the six pattern forms: raise the runtime
  // non-exhaustive-`match` panic carrying its registered message template
  // (`MatchError: no arm matched <scrutinee summary>`,
  // diagnostics/code-registry-runtime.md). loom 1.0 performs no static
  // exhaustiveness check (expressions.md §"Exhaustiveness").
  throw new MatchError(`MatchError: no arm matched ${summariseScrutinee(scrutinee)}`);
}

/**
 * Attempt to match `value` against `pattern`, recording any identifier bindings
 * the pattern introduces into `bindings`. Returns whether the pattern matched.
 * On a failed match the partial `bindings` are discarded by the caller (a fresh
 * map per arm), so a partially-populated map never leaks into a later arm.
 */
function matchPattern(
  pattern: Pattern,
  value: LoomValue,
  bindings: Record<string, LoomValue>,
): boolean {
  switch (pattern.kind) {
    case "wildcard":
      return true;
    case "identifier":
      bindings[pattern.name] = value;
      return true;
    case "literal":
      return valuesEqual(value, pattern.value);
    case "constructor": {
      // `Ok(p)` / `Err(p)` match the named `Result` variant and recurse into the
      // payload. The scrutinee must be a `Result` value (an `ok` discriminator).
      if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value) ||
        typeof (value as { ok?: unknown }).ok !== "boolean"
      ) {
        return false;
      }
      const result = value as { ok: boolean; value?: LoomValue; error?: LoomValue };
      if (pattern.ctor === "Ok") {
        if (!result.ok) {
          return false;
        }
        return matchPattern(pattern.inner, result.value as LoomValue, bindings);
      }
      if (result.ok) {
        return false;
      }
      return matchPattern(pattern.inner, result.error as LoomValue, bindings);
    }
    case "object": {
      // An object/schema pattern matches an object whose listed fields match
      // their inner patterns; unlisted fields are ignored.
      if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value)
      ) {
        return false;
      }
      const obj = value as { readonly [key: string]: LoomValue };
      for (const field of pattern.fields) {
        if (!Object.prototype.hasOwnProperty.call(obj, field.name)) {
          return false;
        }
        if (!matchPattern(field.pattern, obj[field.name] as LoomValue, bindings)) {
          return false;
        }
      }
      return true;
    }
    case "array": {
      // An array pattern matches an exact-length array, each slot against its
      // pattern.
      if (!Array.isArray(value) || value.length !== pattern.elements.length) {
        return false;
      }
      for (let i = 0; i < pattern.elements.length; i++) {
        if (!matchPattern(pattern.elements[i] as Pattern, value[i] as LoomValue, bindings)) {
          return false;
        }
      }
      return true;
    }
  }
}
