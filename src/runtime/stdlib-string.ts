// V3f / V3f-T — the `string` standard-library member seam.
//
// This module owns the `string` standard-library member surface of
// expressions.md §"Built-in methods and properties" (the EXPR code-keyed
// obligation area — no numbered REQ-IDs), evaluated on top of the V3a
// expression interpreter:
//
//   - the `string` members of the loom-1.0 stdlib table — the `length`
//     property (the UTF-16 code-unit count, matching JS `.length`, no grapheme
//     segmentation), `toLowerCase()` / `toUpperCase()` / `trim()` (the
//     locale-independent transforms), `startsWith(s)` / `endsWith(s)` /
//     `includes(s)` (each returning `boolean` with JS semantics), and
//     `split(sep)` (literal-only, returning `array<string>`, with the empty
//     separator decomposing into one string per UTF-16 code unit);
//   - `replace(from, to)` — the all-occurrences, single left-to-right
//     non-overlapping scan matching host `String.prototype.replaceAll`, with
//     `$`-sequences in `to` inserted literally (never interpreted as JS
//     replacement patterns) and an empty `from` returning the receiver
//     unchanged. The five normative reference vectors of expressions.md MUST
//     reproduce exactly;
//   - the static result element type of `array<T>.concat(array<U>)` — the least
//     upper bound `T ⊔ U` under the V2b `⊑` relation, the same LUB the
//     array-literal common-type rule computes (`integer ⊔ number = number`;
//     disjoint element types union to `T | U`).
//
// V3f-T (tests-task) declares the seam — the `evaluateStringMember` runtime
// dispatcher and the `concatElementType` LUB computation — and stubs the
// behaviour-bearing functions inertly so the failing tests compile and red on
// their own primary assertions:
//
//   - `evaluateStringMember` returns the inert `null` sentinel without
//     evaluating any member, so every result-value assertion reds (a `length`
//     count, a transform string, a `boolean` membership result, a `split`
//     array, or a `replace` reference vector);
//   - `concatElementType` returns the inert `null`-primitive sentinel without
//     computing the LUB, so every result-type assertion reds.
//
// No test reds on a compile error, a missing fixture, or a harness throw. The
// paired V3f implementation leaf fills these in (and wires member-access /
// method-call parsing into the V3a evaluator).

import { checkCompatible } from "../parser/type-compat";
import type { CompatType, TypeEnv } from "../parser/type-compat";
import type { LoomValue } from "./value";

/**
 * Evaluate a `string` standard-library member on `receiver`: the `length`
 * property (called with `args === []`) or one of the method calls
 * (`toLowerCase` / `toUpperCase` / `trim` / `startsWith` / `endsWith` /
 * `includes` / `split` / `replace`), with the arguments already evaluated by
 * the V3a interpreter. Returns the member's loom value per the expressions.md
 * stdlib table and the normative `replace` reference vectors.
 */
/**
 * The `string` standard-library member surface (expressions.md §"Built-in
 * methods and properties"): the allow-list the `type`-phase
 * `loom/parse/unknown-method` check consumes. Kept in lockstep with the
 * `evaluateStringMember` dispatcher below — every name the dispatcher accepts
 * appears here, and no other.
 */
export const STRING_MEMBERS: ReadonlySet<string> = new Set([
  "length",
  "toLowerCase",
  "toUpperCase",
  "trim",
  "startsWith",
  "endsWith",
  "includes",
  "split",
  "replace",
]);

export function evaluateStringMember(
  receiver: string,
  member: string,
  args: readonly LoomValue[],
): LoomValue {
  switch (member) {
    // `length` — the UTF-16 code-unit count (JS `.length`; no grapheme or
    // code-point segmentation).
    case "length":
      return receiver.length;
    // Locale-independent case transforms and Unicode-whitespace trim.
    case "toLowerCase":
      return receiver.toLowerCase();
    case "toUpperCase":
      return receiver.toUpperCase();
    case "trim":
      return receiver.trim();
    // Membership predicates — `boolean`, JS semantics.
    case "startsWith":
      return receiver.startsWith(args[0] as string);
    case "endsWith":
      return receiver.endsWith(args[0] as string);
    case "includes":
      return receiver.includes(args[0] as string);
    // Literal-only split. Empty separator decomposes into one string per
    // UTF-16 code unit (JS `String.prototype.split("")`).
    case "split":
      return receiver.split(args[0] as string);
    // All-occurrences literal replace — see `replaceLiteral`.
    case "replace":
      return replaceLiteral(receiver, args[0] as string, args[1] as string);
    default:
      throw new Error(`unknown string stdlib member: ${member}`);
  }
}

/**
 * `replace(from, to)` — replaces all occurrences of `from` via a single
 * left-to-right, non-overlapping scan: after each match the next match is
 * sought past the consumed region, with no rewind into the consumed text or the
 * inserted replacement. `to` is inserted literally — `$`-sequences (`$&`,
 * `$$`, `$n`) are never interpreted as JS replacement patterns, so this cannot
 * use the host `String.prototype.replaceAll`, whose string-replacement form
 * does interpret them. An empty `from` returns the receiver unchanged.
 */
function replaceLiteral(receiver: string, from: string, to: string): string {
  if (from === "") {
    return receiver;
  }
  let result = "";
  let cursor = 0;
  for (;;) {
    const at = receiver.indexOf(from, cursor);
    if (at === -1) {
      result += receiver.slice(cursor);
      return result;
    }
    result += receiver.slice(cursor, at) + to;
    cursor = at + from.length;
  }
}

/**
 * Compute the static result element type of `array<T>.concat(array<U>)` — the
 * least upper bound `T ⊔ U` of the receiver element type `left` and the
 * argument element type `right` under the V2b `⊑` relation, the same LUB the
 * array-literal common-type rule computes (`integer ⊔ number = number`;
 * disjoint element types union to `left | right`).
 */
export function concatElementType(
  left: CompatType,
  right: CompatType,
  env: TypeEnv,
): CompatType {
  // LUB under `⊑`: if one element type is `⊑` the other, the wider one is the
  // LUB (this collapses identical types and applies the `integer ⊑ number`
  // widening in both call directions). Disjoint element types union to
  // `left | right`, receiver-first — the same union the array-literal
  // common-type rule (case 2) computes.
  if (checkCompatible(left, right, env) === "compatible") {
    return right;
  }
  if (checkCompatible(right, left, env) === "compatible") {
    return left;
  }
  return { kind: "union", arms: [left, right] };
}
