// V3g / V3g-T — the `array<T>` standard-library member seam.
//
// This module owns the `array<T>` standard-library member surface of
// expressions.md §"Built-in methods and properties" (the EXPR code-keyed
// obligation area — no numbered REQ-IDs), evaluated on top of the V3a
// expression interpreter and the V2c runtime value model:
//
//   - the runtime `array<T>` members of the loom-1.0 stdlib table — the
//     `length` property (the element count), `join(sep)` (concatenates `string`
//     elements with `sep`), `includes(x)` / `indexOf(x)` (membership / first
//     index by the V2c `valuesEqual` structural equality, with `indexOf`
//     returning `-1` when absent), and `slice(start, end?)` (JS semantics:
//     negative indices count from the end, `end` is exclusive, omitted `end`
//     slices to length);
//   - the parse-time `join` element-type precondition — `arr.join(...)` on an
//     array whose element type is not `string` is the `type`-phase diagnostic
//     `loom/parse/non-string-array-join` (no implicit type conversion in loom
//     1.0).
//
// The `array<T>.concat(array<U>)` LUB element type is owned by V3f
// (`concatElementType` in `stdlib-string.ts`) and is not re-declared here.
//
// V3g-T (tests-task) declares the seam — the `evaluateArrayMember` runtime
// dispatcher and the `checkArrayJoin` parse-time precondition — and stubs the
// behaviour-bearing functions inertly so the failing tests compile and red on
// their own primary assertions:
//
//   - `evaluateArrayMember` returns the inert `null` sentinel without
//     evaluating any member, so every result-value assertion reds (a `length`
//     count, a `join` string, an `includes` boolean, an `indexOf` index, or a
//     `slice` array);
//   - `checkArrayJoin` returns `undefined` without checking the element type,
//     so the `loom/parse/non-string-array-join` firing assertion reds.
//
// No test reds on a compile error, a missing fixture, or a harness throw. The
// paired V3g implementation leaf fills these in (and wires array member-access
// / method-call parsing into the V3a evaluator).

import { type CompatType, type CompatSite } from "../parser/type-compat";
import { type Diagnostic } from "../diagnostics/diagnostic";
import type { LoomValue } from "./value";

/**
 * Evaluate an `array<T>` standard-library member on `receiver`: the `length`
 * property (called with `args === []`) or one of the method calls (`join` /
 * `includes` / `indexOf` / `slice`), with the arguments already evaluated by
 * the V3a interpreter. Returns the member's loom value per the expressions.md
 * stdlib table (`includes` / `indexOf` use the V2c `valuesEqual` structural
 * equality; `slice` follows JS semantics).
 *
 * V3g-T stubs this as the inert `null` sentinel (no member is evaluated); the
 * paired V3g implementation leaf fills it in.
 */
export function evaluateArrayMember(
  receiver: readonly LoomValue[],
  member: string,
  args: readonly LoomValue[],
): LoomValue {
  void receiver;
  void member;
  void args;
  return null;
}

/**
 * Check the parse-time `join` element-type precondition: `arr.join(...)` on an
 * array whose element type is not `string` is `loom/parse/non-string-array-join`
 * (a `type`-phase diagnostic). Returns `undefined` for a `string` element type
 * (expressions.md §"Built-in methods and properties", `array<T>` `join` row).
 *
 * V3g-T stubs this inert (always `undefined`); the paired V3g leaf fills it in.
 */
export function checkArrayJoin(
  elementType: CompatType,
  site: CompatSite,
): Diagnostic | undefined {
  void elementType;
  void site;
  return undefined;
}
