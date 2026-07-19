import { describe, expect, it } from "vitest";
import { evaluateObjectMember } from "../src/runtime/stdlib-object";
import type { ThetaValue } from "../src/runtime/value";

// V3h-T — failing tests for the paired `V3h` "expression stdlib members:
// `object`".
//
// Spec: expressions.md §"Built-in methods and properties" (the EXPR code-keyed
// obligation area — no numbered REQ-IDs), the `object` member table. Each
// theta-1.0 `object` member reproduces its normative behaviour and return type:
//
//   - `keys()` returns the theta-side field names as `array<string>`, in schema
//     declaration order for named schemas and insertion order otherwise (at
//     runtime both reduce to the object value's own key order);
//   - `values()` returns the field values as a heterogeneous `array<T>`, in the
//     same order as `keys()`;
//   - `has(k)` returns whether a theta-side name is present, and `false` for an
//     unknown key without panic (the explicit safe-check).
//
// These tests red because the V3h `object` stdlib surface is absent:
// `evaluateObjectMember` returns the inert `null` sentinel (so every result
// assertion reds on its own expectation — a `keys()` name array, a `values()`
// value array, or a `has(k)` boolean). No test reds on a compile error, a
// missing fixture, or a harness throw.

// --- expressions.md §"Built-in methods and properties" — `object` ----------

// cka-3 / V3h: the EXPR code-keyed obligation area's `object` stdlib facet closes
// on V3h; the member assertions below witness that facet against the shipped
// interpreter.
describe("V3h-T — `object.keys()` (expressions.md §Built-in methods and properties, EXPR code-keyed area / cka-3)", () => {
  it("EXPR `keys`: field names in schema declaration order for named schemas", () => {
    // A named-schema value is constructed in declaration order; `keys()`
    // returns those theta-side field names as an `array<string>` in that order.
    const author: { readonly [key: string]: ThetaValue } = {
      name: "Ada",
      role: "reviewer",
      experience_years: 7,
    };
    expect(evaluateObjectMember(author, "keys", [])).toEqual([
      "name",
      "role",
      "experience_years",
    ]);
    // The empty object yields the empty name array (distinguishing a key list
    // from the inert `null` sentinel, which is neither array).
    expect(evaluateObjectMember({}, "keys", [])).toEqual([]);
  });

  it("EXPR `keys`: insertion order for anonymous objects", () => {
    // No named schema: `keys()` follows the object value's own insertion order.
    const anon: { readonly [key: string]: ThetaValue } = { z: 1, a: 2, m: 3 };
    expect(evaluateObjectMember(anon, "keys", [])).toEqual(["z", "a", "m"]);
  });
});

describe("V3h-T — `object.values()` (expressions.md §Built-in methods and properties, EXPR code-keyed area)", () => {
  it("EXPR `values`: field values in the same order as `keys()`", () => {
    const author: { readonly [key: string]: ThetaValue } = {
      name: "Ada",
      role: "reviewer",
      experience_years: 7,
    };
    // Heterogeneous element types are preserved; order matches `keys()`.
    expect(evaluateObjectMember(author, "values", [])).toEqual([
      "Ada",
      "reviewer",
      7,
    ]);
    // The empty object yields the empty value array.
    expect(evaluateObjectMember({}, "values", [])).toEqual([]);
  });
});

describe("V3h-T — `object.has(k)` (expressions.md §Built-in methods and properties, EXPR code-keyed area)", () => {
  it("EXPR `has`: `true` for a present theta-side name, `false` for an unknown key without panic", () => {
    const author: { readonly [key: string]: ThetaValue } = {
      name: "Ada",
      role: "reviewer",
    };
    // A present theta-side name → true.
    expect(evaluateObjectMember(author, "has", ["name"])).toBe(true);
    // An unknown key → false (no panic — the explicit safe-check). Asserting
    // `toBe(false)` (not merely "did not throw") pins the false return; the
    // call returning the inert `null` sentinel reds here.
    expect(evaluateObjectMember(author, "has", ["nope"])).toBe(false);
    // An inherited / prototype name (e.g. `toString`) is not a theta-side field,
    // so `has` reports it absent — the safe-check is over the object's own
    // theta-side names, not the JS prototype chain.
    expect(evaluateObjectMember(author, "has", ["toString"])).toBe(false);
  });
});
