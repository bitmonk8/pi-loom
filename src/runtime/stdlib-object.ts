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
// V3h-T (tests-task) declares the seam — the `evaluateObjectMember` runtime
// dispatcher — and stubs the behaviour-bearing function inertly so the failing
// tests compile and red on their own primary assertions:
//
//   - `evaluateObjectMember` returns the inert `null` sentinel without
//     evaluating any member, so every result assertion reds (a `keys()` name
//     array, a `values()` value array, or a `has(k)` boolean).
//
// No test reds on a compile error, a missing fixture, or a harness throw. The
// paired V3h implementation leaf fills this in (and wires object member-access /
// method-call parsing into the V3a evaluator).

import type { LoomValue } from "./value";

/**
 * Evaluate an `object` standard-library member on `receiver`: one of the method
 * calls `keys()` / `values()` / `has(k)`, with the arguments already evaluated
 * by the V3a interpreter. Returns the member's loom value per the expressions.md
 * stdlib table (`keys()` / `values()` follow the object's key order; `has(k)`
 * returns `false` for an unknown key without panic).
 *
 * V3h-T stubs this as the inert `null` sentinel (no member is evaluated); the
 * paired V3h implementation leaf fills it in.
 */
export function evaluateObjectMember(
  receiver: { readonly [key: string]: LoomValue },
  member: string,
  args: readonly LoomValue[],
): LoomValue {
  void receiver;
  void member;
  void args;
  return null;
}
