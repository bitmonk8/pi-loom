import { describe, expect, it } from "vitest";
import { parseDoc, codes, hasCode } from "./helpers/e2e-s1";

// e2e S1 — expression parse-diagnostic coverage gap-fill (EXPR area).
//
// Drives the shipped whole-document parser (`parseLoomDocument`) to cover
// REQ-EXPR rows the existing suite leaves UNCOVERED per the coverage map:
//   - REQ-EXPR-7  unknown identifier → loom/parse/unknown-identifier (:165)
//   - REQ-EXPR-23 method not on the built-in list → loom/parse/unknown-method (:181)
//   - REQ-EXPR-34 extra object field → loom/parse/extra-object-field (:192)
//   - REQ-EXPR-35 bare object literal → loom/parse/bare-object-literal (:193)
//   - REQ-EXPR-41 mixed `+` operands → loom/parse/mixed-plus-operands (:199)
//   - REQ-EXPR-46 non-orderable ordering pair → loom/parse/non-orderable-operands (:206)
// Spec: docs/spec_topics/expressions.md. All offline-unit (M1).

describe("REQ-EXPR-7 — bare identifier with no binding is loom/parse/unknown-identifier", () => {
  it("reading an unbound identifier fires the diagnostic", () => {
    const doc = parseDoc("let x = missing_binding\n");
    expect(
      hasCode(doc.diagnostics, "loom/parse/unknown-identifier"),
      `codes: ${codes(doc.diagnostics).join(",")}`,
    ).toBe(true);
  });
});

describe("REQ-EXPR-23 — a method not on the built-in list is loom/parse/unknown-method", () => {
  it("a bogus string method fires the parse diagnostic", () => {
    const doc = parseDoc('let x = "hello".frobnicate()\n');
    expect(
      hasCode(doc.diagnostics, "loom/parse/unknown-method"),
      `codes: ${codes(doc.diagnostics).join(",")}`,
    ).toBe(true);
  });
});

describe("REQ-EXPR-34 — an extra object field is loom/parse/extra-object-field", () => {
  it("a constructor supplying a field the schema does not declare fires", () => {
    const src = [
      "schema Point { x: integer, y: integer }",
      "let p = Point { x: 1, y: 2, z: 3 }",
    ].join("\n");
    const doc = parseDoc(src);
    expect(
      hasCode(doc.diagnostics, "loom/parse/extra-object-field"),
      `codes: ${codes(doc.diagnostics).join(",")}`,
    ).toBe(true);
  });
});

describe("REQ-EXPR-35 — a bare object literal is loom/parse/bare-object-literal", () => {
  it("a schemaless `{ field: expr }` in a normal expression position fires", () => {
    const doc = parseDoc('let cfg = { name: "x" }\n');
    expect(
      hasCode(doc.diagnostics, "loom/parse/bare-object-literal"),
      `codes: ${codes(doc.diagnostics).join(",")}`,
    ).toBe(true);
  });
});

describe("REQ-EXPR-41 — mixed `+` operands is loom/parse/mixed-plus-operands", () => {
  it("number + string fires the mixed-operands diagnostic", () => {
    const doc = parseDoc('let x = 1 + "a"\n');
    expect(
      hasCode(doc.diagnostics, "loom/parse/mixed-plus-operands"),
      `codes: ${codes(doc.diagnostics).join(",")}`,
    ).toBe(true);
  });
});

describe("REQ-EXPR-46 — a non-numeric/non-string ordering pair is loom/parse/non-orderable-operands", () => {
  it("number < string fires the non-orderable diagnostic", () => {
    const doc = parseDoc('let x = 1 < "a"\n');
    expect(
      hasCode(doc.diagnostics, "loom/parse/non-orderable-operands"),
      `codes: ${codes(doc.diagnostics).join(",")}`,
    ).toBe(true);
  });
});
