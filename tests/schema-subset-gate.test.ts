import { describe, expect, it } from "vitest";
import {
  checkSchemaFeedingType,
  checkSubsetKeyword,
  checkSubsetKeywords,
} from "../src/parser/schema-subset-gate";
import type { Diagnostic, SourceRange } from "../src/diagnostics/diagnostic";

// V5d-T — failing tests for the paired `V5d` "schema-subset reject gate"
// implementation.
//
// Spec: schema-subset.md (the fixed loom-defined permitted subset — Draft
// 2020-12, `anyOf` only, objects all-required + `additionalProperties:false`,
// single `items`, null via union — and the explicit "rejected at parse time"
// enumeration; §Lowering Algorithm's `Result`-is-not-a-lowerable-form rule and
// the *Array element order* clause) and schemas.md.
//
// The reject gate is an ALLOWLIST / reject-by-default gate: it accepts only the
// permitted subset and rejects every construct outside it — including
// constructs that are in neither the permitted subset nor the spec's
// enumerated unsupported-keyword list — with `loom/parse/unsupported-feature`;
// a `Result` in a schema-feeding position is rejected with
// `loom/parse/result-in-schema-position`. The gate is asserted against the
// standalone `checkSubsetKeyword` / `checkSubsetKeywords` / `checkSchemaFeedingType`
// seams (src/parser/schema-subset-gate.ts).
//
// Diagnostic *Message* strings are sourced from the diagnostics registry
// (diagnostics/code-registry-parse.md) per the *Diagnostic message anchors*
// rule: `loom/parse/unsupported-feature` → `unsupported syntactic feature:
// <construct>`; `loom/parse/result-in-schema-position` → `'Result' has no
// lowered-schema form and is not permitted in a schema-feeding position`.
//
// These tests red because the V5d allowlist reject gate is absent: every seam
// is an inert accept-all stub returning no diagnostics. Each test reds on its
// own primary assertion (an absent expected rejection, or the wrong rejection
// order), not on a compile error, missing fixture, or harness throw.

/** A throwaway 1:1–1:2 span for the seam calls. */
function span(): SourceRange {
  return { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } };
}

/** A located site at the throwaway span. */
function site(): { file: string; range: SourceRange } {
  return { file: "test.loom", range: span() };
}

/** The first diagnostic carrying `code`, if any. */
function withCode(diags: readonly Diagnostic[], code: string): Diagnostic | undefined {
  return diags.find((d) => d.code === code);
}

// The registry *Message*-column template prefix for `loom/parse/unsupported-feature`
// (`unsupported syntactic feature: <construct>`), used to anchor the rendered
// message per the *Diagnostic message anchors* rule.
const UNSUPPORTED_PREFIX = "unsupported syntactic feature: ";

// The JSON-Schema keywords schema-subset.md rejects at parse time: the
// composition forms (`oneOf`, `allOf`, `not`, `if`/`then`/`else`) plus the
// explicit "Explicitly not supported … rejected at parse time" enumeration.
const REJECTED_KEYWORDS: readonly string[] = [
  "oneOf",
  "allOf",
  "not",
  "if",
  "then",
  "else",
  "pattern",
  "format",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minItems",
  "maxItems",
  "uniqueItems",
  "contains",
  "minContains",
  "maxContains",
  "patternProperties",
  "propertyNames",
  "minProperties",
  "maxProperties",
  "unevaluatedProperties",
  "unevaluatedItems",
  "dependentRequired",
  "dependentSchemas",
  "nullable",
];

// The permitted loom-defined subset keywords schema-subset.md accepts: the
// composition (`anyOf`), validation (`enum`, `const`), object (`properties`,
// `required`, `additionalProperties`), array (`items`), reuse (`$defs`, `$ref`),
// and the `type` keyword (incl. the multi-type-array null form).
const PERMITTED_KEYWORDS: readonly string[] = [
  "type",
  "anyOf",
  "enum",
  "const",
  "properties",
  "required",
  "additionalProperties",
  "items",
  "$defs",
  "$ref",
];

// --- schema-subset.md — the allowlist reject gate (each rejected keyword) ---

// cka-10 / V5d: the SUBS code-keyed obligation area (schema-subset.md) closes
// across V5d (this allowlist reject gate), V5e, and V5f; the assertions in this
// file witness the V5d facet against the shipped reject gate.
describe("V5d-T — reject gate fires loom/parse/unsupported-feature per rejected keyword", () => {
  for (const keyword of REJECTED_KEYWORDS) {
    it(`loom/parse/unsupported-feature: rejects the out-of-subset keyword '${keyword}'`, () => {
      const d = checkSubsetKeyword(keyword, site());
      expect(
        d,
        `loom/parse/unsupported-feature for out-of-subset keyword '${keyword}'`,
      ).toBeDefined();
      expect(d?.code).toBe("loom/parse/unsupported-feature");
      expect(d?.severity).toBe("error");
      // Message anchored to the registry *Message* column
      // (`unsupported syntactic feature: <construct>`); the offending keyword is
      // the interpolated construct.
      expect(d?.message.startsWith(UNSUPPORTED_PREFIX)).toBe(true);
      expect(d?.message).toContain(keyword);
    });
  }

  it("accepts every permitted-subset keyword (no diagnostic)", () => {
    // The allowlist arm: every permitted keyword is accepted. Paired below with
    // a rejected keyword so the assertion reds on the absent gate (an
    // accept-all stub would let the accept arm pass vacuously).
    for (const keyword of PERMITTED_KEYWORDS) {
      expect(
        checkSubsetKeyword(keyword, site()),
        `permitted-subset keyword '${keyword}' must be accepted`,
      ).toBeUndefined();
    }
    // A rejected keyword must still fire — pins that "accept" is the allowlist
    // partition, not a blanket accept-all.
    expect(checkSubsetKeyword("pattern", site())?.code).toBe(
      "loom/parse/unsupported-feature",
    );
  });
});

// --- schema-subset.md — reject-by-default (allowlist, not denylist) ---------

describe("V5d-T — reject-by-default semantics (allowlist, excludes a denylist build)", () => {
  // Constructs outside the permitted subset that are ALSO absent from the
  // enumerated unsupported-keyword list. A denylist build (reject only the
  // enumerated set) would wrongly ACCEPT these; the allowlist rejects them.
  const NOT_ENUMERATED_OUT_OF_SUBSET: readonly string[] = [
    "title",
    "description",
    "examples",
    "$comment",
    "$anchor",
    "$dynamicRef",
    "readOnly",
    "writeOnly",
    "deprecated",
  ];

  for (const keyword of NOT_ENUMERATED_OUT_OF_SUBSET) {
    it(`loom/parse/unsupported-feature: rejects out-of-subset, non-enumerated keyword '${keyword}'`, () => {
      expect(
        REJECTED_KEYWORDS.includes(keyword),
        `'${keyword}' is intentionally absent from the enumerated unsupported list`,
      ).toBe(false);
      expect(
        PERMITTED_KEYWORDS.includes(keyword),
        `'${keyword}' is intentionally absent from the permitted subset`,
      ).toBe(false);
      const d = checkSubsetKeyword(keyword, site());
      expect(
        d,
        `loom/parse/unsupported-feature for out-of-subset non-enumerated keyword '${keyword}' (reject-by-default)`,
      ).toBeDefined();
      expect(d?.code).toBe("loom/parse/unsupported-feature");
    });
  }
});

// --- schema-subset.md §Lowering Algorithm — Result in schema position -------

describe("V5d-T — reject gate fires loom/parse/result-in-schema-position for Result", () => {
  it("loom/parse/result-in-schema-position: a bare `Result<T, E>` in a schema-feeding position is rejected", () => {
    const diags = checkSchemaFeedingType("Result<string, string>", site());
    const d = withCode(diags, "loom/parse/result-in-schema-position");
    expect(
      d,
      "loom/parse/result-in-schema-position for a schema-feeding `Result<T, E>`",
    ).toBeDefined();
    expect(d?.severity).toBe("error");
    // Message from code-registry-parse.md.
    expect(d?.message).toBe(
      "'Result' has no lowered-schema form and is not permitted in a schema-feeding position",
    );
  });

  it("loom/parse/result-in-schema-position: a `Result` nested in an `array<T>` element is rejected; array element order is preserved", () => {
    // The gate recurses into `array<T>` element types and union arms, in source
    // (array element) order. A `Result` reachable only through the array
    // element type is still rejected (schema-subset.md §Lowering Algorithm:
    // "any type reachable transitively from those, including `array<T>` element
    // types and union arms").
    const diags = checkSchemaFeedingType("array<Result<string, string>>", site());
    expect(
      withCode(diags, "loom/parse/result-in-schema-position"),
      "loom/parse/result-in-schema-position for a `Result` inside an `array<T>` element",
    ).toBeDefined();
  });

  it("accepts a lowerable subset type in a schema-feeding position (no Result diagnostic)", () => {
    // The permitted subset is accepted: a `string | null` union arm lowers to
    // the multi-type-array form and raises no rejection. Paired with a rejected
    // `Result` so the assertion reds on the absent gate rather than passing
    // vacuously against an accept-all stub.
    expect(
      withCode(checkSchemaFeedingType("string | null", site()), "loom/parse/result-in-schema-position"),
      "a lowerable `string | null` must not be rejected",
    ).toBeUndefined();
    expect(
      withCode(checkSchemaFeedingType("Result<string, string>", site()), "loom/parse/result-in-schema-position"),
      "a schema-feeding `Result` must still be rejected",
    ).toBeDefined();
  });
});

// --- schema-subset.md *Array element order* — order-preserving collection ---

describe("V5d-T — array element order is preserved across the reject gate", () => {
  it("checkSubsetKeywords returns one diagnostic per rejected keyword in input (array element) order", () => {
    // A mixed sequence of permitted and rejected keywords: the rejected ones
    // produce diagnostics in input order (array element order preserved), the
    // permitted ones contribute none.
    const keywords = ["properties", "pattern", "items", "minLength", "anyOf", "format"];
    const diags = checkSubsetKeywords(keywords, site());
    // Every diagnostic is the unsupported-feature rejection.
    expect(
      diags.length,
      "one loom/parse/unsupported-feature per rejected keyword (pattern, minLength, format)",
    ).toBe(3);
    expect(diags.every((d) => d.code === "loom/parse/unsupported-feature")).toBe(true);
    // The rejected keywords surface in their input order: pattern, minLength,
    // format (the permitted properties/items/anyOf contribute nothing).
    expect(diags[0]?.message).toContain("pattern");
    expect(diags[1]?.message).toContain("minLength");
    expect(diags[2]?.message).toContain("format");
  });
});
