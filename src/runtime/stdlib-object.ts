// V3h / V3h-T — the `object` standard-library member seam.
//
// This module owns the `object` standard-library member surface of
// expressions.md §"Built-in methods and properties" (the EXPR code-keyed
// obligation area — no numbered REQ-IDs), evaluated on top of the V3a
// expression interpreter and the V2c runtime value model. The members apply to
// any object value (schema-typed or anonymous):
//
//   - `keys()` returns the loom-side field names as an `array<string>`, in
//     schema declaration order for named schemas and insertion order otherwise
//     (at runtime both reduce to the object's own key order, established at
//     construction time);
//   - `values()` returns the field values as a heterogeneous `array<T>`, in the
//     same order as `keys()`;
//   - `has(k)` returns whether a loom-side name is present — `false` for an
//     unknown key, with no panic (the explicit safe-check).
//
// The V3h implementation fills in the runtime member dispatch: `keys()` /
// `values()` follow the object value's own key order (established at
// construction time — schema declaration order for named schemas, insertion
// order otherwise), and `has(k)` tests own loom-side names only (never the JS
// prototype chain), returning `false` for an unknown key without panic.

import type { Diagnostic } from "../diagnostics/diagnostic";
import {
  classifyIndexReceiver,
  displayType,
  type CompatSite,
  type CompatType,
  type TypeEnv,
} from "../parser/type-compat";
import type { LoomValue } from "./value";

/**
 * The type-phase object-index check (expressions.md §"Supported forms").
 * Reports `loom/parse/non-string-object-index` when an `obj[k]` index
 * expression addresses an object-value receiver with a non-`string` index `k`
 * (e.g. `obj[0]`) — an object value is keyed by its `string` loom-side names.
 * Returns no diagnostic for a `string` index, a non-object receiver (handled
 * by `loom/parse/non-indexable-receiver` / array indexing), or a
 * statically-unresolvable one (deferred to the runtime safety net).
 */
export function checkObjectIndex(opts: {
  readonly receiverType: CompatType;
  readonly indexType: CompatType;
  readonly env: TypeEnv;
  readonly site: CompatSite;
}): Diagnostic | undefined {
  const { receiverType, indexType, env, site } = opts;
  if (classifyIndexReceiver(receiverType, env) !== "object") {
    return undefined;
  }
  const isString =
    (indexType.kind === "prim" && indexType.name === "string") ||
    (indexType.kind === "literal" && indexType.typesAs === "string");
  if (isString) {
    return undefined;
  }
  // Message from diagnostics/code-registry-parse.md (`loom/parse/non-string-object-index`).
  return {
    severity: "error",
    code: "loom/parse/non-string-object-index",
    file: site.file,
    range: site.range,
    message: `object index must be string; got ${displayType(indexType)}`,
  };
}

/**
 * Evaluate an `object` standard-library member on `receiver`: one of the method
 * calls `keys()` / `values()` / `has(k)`, with the arguments already evaluated
 * by the V3a interpreter. Returns the member's loom value per the expressions.md
 * stdlib table (`keys()` / `values()` follow the object's key order; `has(k)`
 * returns `false` for an unknown key without panic).
 */
/**
 * The `object` standard-library member surface (expressions.md §"Built-in
 * methods and properties"): the allow-list the `type`-phase
 * `loom/parse/unknown-method` check consumes. Kept in lockstep with the
 * `evaluateObjectMember` dispatcher below. Object *field* access (`obj.field`)
 * is not a stdlib member and is not gated by this set.
 */
export const OBJECT_MEMBERS: ReadonlySet<string> = new Set(["keys", "values", "has"]);

export function evaluateObjectMember(
  receiver: { readonly [key: string]: LoomValue },
  member: string,
  args: readonly LoomValue[],
): LoomValue {
  switch (member) {
    // `keys()` — the loom-side field names as an `array<string>`, in the
    // object value's own key order (schema declaration order for named schemas,
    // insertion order otherwise; both reduce to `Object.keys` at runtime).
    case "keys":
      return Object.keys(receiver);
    // `values()` — the field values as a heterogeneous `array<T>`, in the same
    // order as `keys()`.
    case "values":
      return Object.values(receiver) as LoomValue[];
    // `has(k)` — whether a loom-side name is present. Own keys only (not the JS
    // prototype chain), so an inherited name such as `toString` reports absent;
    // an unknown key returns `false` with no panic (the explicit safe-check).
    case "has":
      return Object.prototype.hasOwnProperty.call(receiver, args[0] as string);
    default:
      throw new Error(`unknown object stdlib member: ${member}`);
  }
}
