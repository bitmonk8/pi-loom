// V3g / V3g-T — the `array<T>` standard-library member seam.
//
// This module owns the `array<T>` standard-library member surface of
// expressions.md §"Built-in methods and properties" (the EXPR code-keyed
// obligation area — no numbered REQ-IDs), evaluated on top of the V3a
// expression interpreter and the V2c runtime value model:
//
//   - the runtime `array<T>` members of the theta-1.0 stdlib table — the
//     `length` property (the element count), `join(sep)` (concatenates `string`
//     elements with `sep`), `includes(x)` / `indexOf(x)` (membership / first
//     index by the V2c `valuesEqual` structural equality, with `indexOf`
//     returning `-1` when absent), and `slice(start, end?)` (JS semantics:
//     negative indices count from the end, `end` is exclusive, omitted `end`
//     slices to length);
//   - the parse-time `join` element-type precondition — `arr.join(...)` on an
//     array whose element type is not `string` is the `type`-phase diagnostic
//     `theta/parse/non-string-array-join` (no implicit type conversion in theta
//     1.0).
//
// The `array<T>.concat(array<U>)` LUB element type is owned by V3f
// (`concatElementType` in `stdlib-string.ts`) and is not re-declared here.
//
// The paired V3g implementation leaf fills in the runtime member dispatch and
// the parse-time `join` precondition.

import { displayType, type CompatType, type CompatSite } from "../parser/type-compat";
import { type Diagnostic } from "../diagnostics/diagnostic";
import { valuesEqual, type ThetaValue } from "./value";

/**
 * Evaluate an `array<T>` standard-library member on `receiver`: the `length`
 * property (called with `args === []`) or one of the method calls (`join` /
 * `includes` / `indexOf` / `slice` / `concat`), with the arguments already evaluated by
 * the V3a interpreter. Returns the member's theta value per the expressions.md
 * stdlib table (`includes` / `indexOf` use the V2c `valuesEqual` structural
 * equality; `slice` follows JS semantics).
 *
 */
/**
 * The `array<T>` standard-library member surface (expressions.md §"Built-in
 * methods and properties"): the allow-list the `type`-phase
 * `theta/parse/unknown-method` check consumes. Kept in lockstep with the
 * `evaluateArrayMember` dispatcher below.
 */
export const ARRAY_MEMBERS: ReadonlySet<string> = new Set([
  "length",
  "join",
  "includes",
  "indexOf",
  "slice",
  "concat",
]);

export function evaluateArrayMember(
  receiver: readonly ThetaValue[],
  member: string,
  args: readonly ThetaValue[],
): ThetaValue {
  switch (member) {
    // `length` — the element count.
    case "length":
      return receiver.length;
    // `join(sep)` — concatenate the (string) elements with `sep`. The parse-
    // time `checkArrayJoin` precondition guarantees a `string` element type, so
    // no implicit conversion happens here.
    case "join":
      return receiver.join(args[0] as string);
    // `includes(x)` — membership test using theta structural equality (V2c).
    case "includes":
      return receiver.some((element) => valuesEqual(element, args[0] as ThetaValue));
    // `indexOf(x)` — first index by structural equality, or `-1` if absent.
    case "indexOf":
      return receiver.findIndex((element) => valuesEqual(element, args[0] as ThetaValue));
    // `slice(start, end?)` — JS semantics: negative indices count from the end,
    // `end` is exclusive, an omitted `end` slices to length. `Array.prototype.
    // slice` already implements all three; an omitted optional argument is
    // `undefined`, which `slice` treats as "to length".
    case "slice":
      return receiver.slice(args[0] as number, args[1] as number | undefined);
    // `concat(other)` — a new array: the receiver's elements followed by the
    // argument array's elements. The V3f type layer (`concatElementType`) has
    // already resolved the result element type to the LUB `T ⊔ U`; at runtime
    // the values are structurally uniform theta values, so a plain positional
    // append is faithful. `Array.prototype.concat` copies rather than mutating
    // the receiver, matching the immutable-value discipline of the other cases.
    case "concat":
      return receiver.concat(args[0] as readonly ThetaValue[]);
    default:
      throw new Error(`unknown array stdlib member: ${member}`);
  }
}

/**
 * Check the parse-time `join` element-type precondition: `arr.join(...)` on an
 * array whose element type is not `string` is `theta/parse/non-string-array-join`
 * (a `type`-phase diagnostic). Returns `undefined` for a `string` element type
 * (expressions.md §"Built-in methods and properties", `array<T>` `join` row).
 *
 */
export function checkArrayJoin(
  elementType: CompatType,
  site: CompatSite,
): Diagnostic | undefined {
  // The element type must be `string` (no implicit type conversion in theta
  // 1.0). A `string`-typed literal element (e.g. `array<"a">`) types as
  // `string` in expression position and is equally admissible.
  const isString =
    (elementType.kind === "prim" && elementType.name === "string") ||
    (elementType.kind === "literal" && elementType.typesAs === "string");
  if (isString) {
    return undefined;
  }
  // Message anchored to the diagnostics registry (code-registry-parse.md): the
  // `<element>` placeholder renders the offending element type.
  return {
    severity: "error",
    code: "theta/parse/non-string-array-join",
    file: site.file,
    range: site.range,
    message: `array.join requires a string element type; got array<${displayType(
      elementType,
    )}>`,
  };
}
