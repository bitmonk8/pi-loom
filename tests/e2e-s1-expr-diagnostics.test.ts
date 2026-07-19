import { describe, expect, it } from "vitest";
import { parseDoc, codes, hasCode } from "./helpers/e2e-s1";

// e2e S1 — expression parse-diagnostic coverage gap-fill (EXPR area).
//
// Drives the shipped whole-document parser (`parseThetaDocument`) to cover
// REQ-EXPR rows the existing suite leaves UNCOVERED per the coverage map:
//   - REQ-EXPR-7  unknown identifier → theta/parse/unknown-identifier (:165)
//   - REQ-EXPR-23 method not on the built-in list → theta/parse/unknown-method (:181)
//   - REQ-EXPR-34 extra object field → theta/parse/extra-object-field (:192)
//   - REQ-EXPR-35 bare object literal → theta/parse/bare-object-literal (:193)
//   - REQ-EXPR-41 mixed `+` operands → theta/parse/mixed-plus-operands (:199)
//   - REQ-EXPR-46 non-orderable ordering pair → theta/parse/non-orderable-operands (:206)
// Spec: docs/spec_topics/expressions.md. All offline-unit (M1).

describe("REQ-EXPR-7 — bare identifier with no binding is theta/parse/unknown-identifier", () => {
  it("reading an unbound identifier fires the diagnostic", () => {
    const doc = parseDoc("let x = missing_binding\n");
    expect(
      hasCode(doc.diagnostics, "theta/parse/unknown-identifier"),
      `codes: ${codes(doc.diagnostics).join(",")}`,
    ).toBe(true);
  });
});

describe("REQ-EXPR-23 — a method not on the built-in list is theta/parse/unknown-method", () => {
  it("a bogus string method fires the parse diagnostic", () => {
    const doc = parseDoc('let x = "hello".frobnicate()\n');
    expect(
      hasCode(doc.diagnostics, "theta/parse/unknown-method"),
      `codes: ${codes(doc.diagnostics).join(",")}`,
    ).toBe(true);
  });
});

describe("REQ-EXPR-34 — an extra object field is theta/parse/extra-object-field", () => {
  it("a constructor supplying a field the schema does not declare fires", () => {
    const src = [
      "schema Point { x: integer, y: integer }",
      "let p = Point { x: 1, y: 2, z: 3 }",
    ].join("\n");
    const doc = parseDoc(src);
    expect(
      hasCode(doc.diagnostics, "theta/parse/extra-object-field"),
      `codes: ${codes(doc.diagnostics).join(",")}`,
    ).toBe(true);
  });
});

describe("REQ-EXPR-35 — a bare object literal is theta/parse/bare-object-literal", () => {
  it("a schemaless `{ field: expr }` in a normal expression position fires", () => {
    const doc = parseDoc('let cfg = { name: "x" }\n');
    expect(
      hasCode(doc.diagnostics, "theta/parse/bare-object-literal"),
      `codes: ${codes(doc.diagnostics).join(",")}`,
    ).toBe(true);
  });
});

describe("REQ-EXPR-41 — mixed `+` operands is theta/parse/mixed-plus-operands", () => {
  it("number + string fires the mixed-operands diagnostic", () => {
    const doc = parseDoc('let x = 1 + "a"\n');
    expect(
      hasCode(doc.diagnostics, "theta/parse/mixed-plus-operands"),
      `codes: ${codes(doc.diagnostics).join(",")}`,
    ).toBe(true);
  });
});

describe("REQ-EXPR-46 — a non-numeric/non-string ordering pair is theta/parse/non-orderable-operands", () => {
  it("number < string fires the non-orderable diagnostic", () => {
    const doc = parseDoc('let x = 1 < "a"\n');
    expect(
      hasCode(doc.diagnostics, "theta/parse/non-orderable-operands"),
      `codes: ${codes(doc.diagnostics).join(",")}`,
    ).toBe(true);
  });
});

// Not-supported query-template forms (expressions.md §"Not supported"):
// backtick templates are `@`-prefixed QUERY templates admitted only at
// statement / `let`-RHS level, so a bare backtick value and a `match` / nested
// `@`-query inside a `${…}` interpolation are `theta/parse/unsupported-feature`.
// Offline regression for the two constructs the LIVE XMODE-2 tests exercise.
describe("expressions.md §Not supported — non-@ backtick template in value position", () => {
  it("a bare backtick match-arm body is theta/parse/unsupported-feature (not bare-object-literal)", () => {
    const src = [
      "let r = match Ok(9) {",
      "  Ok(n) => `V${n}`,",
      '  Err(_) => "E"',
      "}",
    ].join("\n");
    const doc = parseDoc(src);
    expect(
      hasCode(doc.diagnostics, "theta/parse/unsupported-feature"),
      `codes: ${codes(doc.diagnostics).join(",")}`,
    ).toBe(true);
    // The old parser mis-emitted bare-object-literal on the `${n}` span.
    expect(
      hasCode(doc.diagnostics, "theta/parse/bare-object-literal"),
      `codes: ${codes(doc.diagnostics).join(",")}`,
    ).toBe(false);
  });

  it("a bare backtick value-position let RHS is theta/parse/unsupported-feature", () => {
    const doc = parseDoc('let s = `hi ${1}`\n');
    expect(
      hasCode(doc.diagnostics, "theta/parse/unsupported-feature"),
      `codes: ${codes(doc.diagnostics).join(",")}`,
    ).toBe(true);
  });
});

describe("expressions.md §Not supported — match inside a `${…}` interpolation", () => {
  it("a match inside an @-query interpolation is theta/parse/unsupported-feature", () => {
    const doc = parseDoc("@`D=${match Ok(9) { Ok(n) => n, Err(_) => 0 }}`\n");
    expect(
      hasCode(doc.diagnostics, "theta/parse/unsupported-feature"),
      `codes: ${codes(doc.diagnostics).join(",")}`,
    ).toBe(true);
  });

  it("a nested @-query inside an interpolation is theta/parse/unsupported-feature", () => {
    const doc = parseDoc("@`E=${@`inner`}`\n");
    expect(
      hasCode(doc.diagnostics, "theta/parse/unsupported-feature"),
      `codes: ${codes(doc.diagnostics).join(",")}`,
    ).toBe(true);
  });
});

// Recovery / detection edge cases on already-rejected input.
describe("expressions.md §Not supported — rejected-template edge cases", () => {
  it("a nested backtick inside a rejected bare template stays a single unsupported-feature (no spurious trailing diagnostic)", () => {
    const src = [
      "let r = match Ok(9) {",
      "  Ok(n) => `a${@`x`}`,",
      '  Err(_) => "E"',
      "}",
    ].join("\n");
    const doc = parseDoc(src);
    // The whole bare template is consumed — the nested backtick does not close
    // it early and leak `` x`}` `` as trailing tokens re-parsed into noise.
    expect(
      codes(doc.diagnostics).filter((c) => c === "theta/parse/unsupported-feature")
        .length,
      `codes: ${codes(doc.diagnostics).join(",")}`,
    ).toBe(1);
    expect(
      hasCode(doc.diagnostics, "theta/parse/bare-object-literal"),
      `codes: ${codes(doc.diagnostics).join(",")}`,
    ).toBe(false);
  });

  it("a malformed interpolation embedding a `match` is still theta/parse/unsupported-feature", () => {
    // `match oops]` does not parse as an expression, but the reserved `match`
    // keyword token must not be silently skipped.
    const doc = parseDoc("@`Z=${match oops]}`\n");
    expect(
      hasCode(doc.diagnostics, "theta/parse/unsupported-feature"),
      `codes: ${codes(doc.diagnostics).join(",")}`,
    ).toBe(true);
  });

  it("a malformed interpolation embedding a nested @-query is still theta/parse/unsupported-feature", () => {
    const doc = parseDoc("@`Z=${@`x` +}`\n");
    expect(
      hasCode(doc.diagnostics, "theta/parse/unsupported-feature"),
      `codes: ${codes(doc.diagnostics).join(",")}`,
    ).toBe(true);
  });
});
