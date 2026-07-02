import { describe, expect, it } from "vitest";
import {
  checkEnumDeclaration,
  checkInlineEnumForm,
  checkObjectSchema,
  checkVariantAccess,
} from "../src/parser/schema-declarations";
import type { Diagnostic, SourceRange } from "../src/diagnostics/diagnostic";

// V5a-T — failing tests for the paired `V5a` "schema declarations (object /
// alias / enum)" implementation.
//
// Spec: schemas.md (§Object schema — empty body + `as "WireName"` renaming;
// §Enum declarations — empty body, inline-enum ban, string-values-only,
// duplicate value vs duplicate variant name with the name-before-value ordering;
// §Variant access — unknown variant) and type-system.md.
//
// The schema/enum well-formedness checks need the resolved declaration model
// (field/variant identifiers, explicit wire names, explicit values) the
// tokeniser does not carry, so they are asserted against the standalone
// `checkObjectSchema` / `checkEnumDeclaration` / `checkInlineEnumForm` /
// `checkVariantAccess` seams (src/parser/schema-declarations.ts).
//
// Diagnostic *Message* strings are sourced from the diagnostics registry
// (diagnostics/code-registry-parse.md) per the *Diagnostic message anchors*
// rule.
//
// These tests red because the V5a schema-declaration checker is absent: every
// seam is an inert stub returning no diagnostics. Each test reds on its own
// primary assertion (an absent expected diagnostic), not on a compile error,
// missing fixture, or harness throw.

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

// --- schemas.md §Object schema — empty body -------------------------------

// cka-8 / V5a: the SCHM code-keyed obligation area (schemas.md) closes across V5a
// (schema/alias/enum declaration forms) and V5b; the assertions in this file
// witness the V5a facet against the shipped parser.
describe("V5a-T — empty schema body (loom/parse/empty-schema-body)", () => {
  it("loom/parse/empty-schema-body: `schema X { }` with no fields fires; a non-empty schema does not", () => {
    const diags = checkObjectSchema({ name: "X", fields: [] }, site());
    const d = withCode(diags, "loom/parse/empty-schema-body");
    expect(d, "loom/parse/empty-schema-body for an empty object schema").toBeDefined();
    // Message from code-registry-parse.md (`'<X>' has no fields; ...`).
    expect(d?.message).toBe("'X' has no fields; an empty schema cannot be validated.");

    const okDiags = checkObjectSchema(
      { name: "Author", fields: [{ loomName: "name" }] },
      site(),
    );
    expect(
      withCode(okDiags, "loom/parse/empty-schema-body"),
      "a schema with at least one field raises no empty-body diagnostic",
    ).toBeUndefined();
  });
});

// --- schemas.md §Wire-name renaming ---------------------------------------

describe("V5a-T — wire-name renaming (collision / redundant)", () => {
  it("loom/parse/wire-name-collision: two fields sharing a wire name fires", () => {
    // `a as "Shared"` and `b as "Shared"` collide on the wire name.
    const diags = checkObjectSchema(
      {
        name: "ExternalUser",
        fields: [
          { loomName: "a", wireName: "Shared" },
          { loomName: "b", wireName: "Shared" },
        ],
      },
      site(),
    );
    const d = withCode(diags, "loom/parse/wire-name-collision");
    expect(d, "loom/parse/wire-name-collision for two fields sharing a wire name").toBeDefined();
    // Message from code-registry-parse.md.
    expect(d?.message).toBe(
      "wire name 'Shared' collides with another field on schema 'ExternalUser'",
    );
  });

  it("loom/parse/wire-name-collision: a wire name colliding with another field's loom-side name fires", () => {
    // `a as "b"` collides with the loom-side name of field `b`.
    const diags = checkObjectSchema(
      {
        name: "ExternalUser",
        fields: [{ loomName: "a", wireName: "b" }, { loomName: "b" }],
      },
      site(),
    );
    const d = withCode(diags, "loom/parse/wire-name-collision");
    expect(
      d,
      "loom/parse/wire-name-collision when a wire name equals another field's loom name",
    ).toBeDefined();
    expect(d?.message).toBe(
      "wire name 'b' collides with another field on schema 'ExternalUser'",
    );
  });

  it("loom/parse/redundant-wire-name (W): a rename whose wire name equals the loom name fires; a genuine rename does not", () => {
    const diags = checkObjectSchema(
      { name: "X", fields: [{ loomName: "field_name", wireName: "field_name" }] },
      site(),
    );
    const d = withCode(diags, "loom/parse/redundant-wire-name");
    expect(d, "loom/parse/redundant-wire-name for a self-equal rename").toBeDefined();
    expect(d?.severity).toBe("warning");
    // Message from code-registry-parse.md.
    expect(d?.message).toBe(
      "redundant 'as' clause: wire name 'field_name' equals the loom-side name",
    );

    // A genuine rename (`first_name as "FirstName"`) warns nothing.
    const okDiags = checkObjectSchema(
      { name: "X", fields: [{ loomName: "first_name", wireName: "FirstName" }] },
      site(),
    );
    expect(
      withCode(okDiags, "loom/parse/redundant-wire-name"),
      "a genuine rename raises no redundant-wire-name warning",
    ).toBeUndefined();
  });
});

// --- schemas.md §Enum declarations — empty body ---------------------------

describe("V5a-T — empty enum body (loom/parse/empty-enum-body)", () => {
  it("loom/parse/empty-enum-body: `enum X { }` with no variants fires; a non-empty enum does not", () => {
    const diags = checkEnumDeclaration({ name: "X", variants: [] }, site());
    const d = withCode(diags, "loom/parse/empty-enum-body");
    expect(d, "loom/parse/empty-enum-body for an empty enum").toBeDefined();
    // Message from code-registry-parse.md (`'<X>' has no variants; ...`).
    expect(d?.message).toBe("'X' has no variants; an empty enum cannot be validated.");

    const okDiags = checkEnumDeclaration(
      { name: "Severity", variants: [{ name: "Low" }] },
      site(),
    );
    expect(
      withCode(okDiags, "loom/parse/empty-enum-body"),
      "an enum with at least one variant raises no empty-body diagnostic",
    ).toBeUndefined();
  });
});

// --- schemas.md §Enum declarations — inline-enum ban ----------------------

describe("V5a-T — inline enum (loom/parse/inline-enum)", () => {
  it("loom/parse/inline-enum: an inline `enum[\"a\", \"b\"]` form fires", () => {
    const d = checkInlineEnumForm('enum["a", "b"]', site());
    expect(d, "loom/parse/inline-enum for an inline enum form").toBeDefined();
    expect(d?.code).toBe("loom/parse/inline-enum");
    // Message from code-registry-parse.md.
    expect(d?.message).toBe(
      "inline 'enum[...]' is not supported; use a top-level 'enum' declaration or a literal-union",
    );
  });
});

// --- schemas.md §Enum declarations — string values only -------------------

describe("V5a-T — non-string enum value (loom/parse/non-string-enum-value)", () => {
  it("loom/parse/non-string-enum-value: a numeric explicit value fires with the offending kind; a string value does not", () => {
    // `enum X { Low = 1 }` — the explicit value is an integer literal.
    const diags = checkEnumDeclaration(
      { name: "X", variants: [{ name: "Low", value: { kind: "integer", text: "1" } }] },
      site(),
    );
    const d = withCode(diags, "loom/parse/non-string-enum-value");
    expect(d, "loom/parse/non-string-enum-value for an integer explicit value").toBeDefined();
    // Message template `enum variant value must be a string literal; got <kind>`
    // from code-registry-parse.md; <kind> is the type-kind of the offending literal.
    expect(d?.message).toBe("enum variant value must be a string literal; got integer");

    // A string explicit value raises nothing.
    const okDiags = checkEnumDeclaration(
      { name: "X", variants: [{ name: "Low", value: { kind: "string", text: "low" } }] },
      site(),
    );
    expect(
      withCode(okDiags, "loom/parse/non-string-enum-value"),
      "a string explicit value raises no non-string-enum-value diagnostic",
    ).toBeUndefined();
  });
});

// --- schemas.md §Enum declarations — duplicate variant name vs value ------

describe("V5a-T — enum duplicate variant name / value with name-before-value ordering", () => {
  it("loom/parse/duplicate-enum-variant-name: distinct explicit values under one name fire the name code, not the value code", () => {
    // `enum X { Low = "a", Low = "b" }`: distinct explicit values, shared name.
    // Per schemas.md §Enum declarations the name-duplication check runs first,
    // so this fires `duplicate-enum-variant-name` and NOT `duplicate-enum-value`.
    const diags = checkEnumDeclaration(
      {
        name: "X",
        variants: [
          { name: "Low", value: { kind: "string", text: "a" } },
          { name: "Low", value: { kind: "string", text: "b" } },
        ],
      },
      site(),
    );
    const d = withCode(diags, "loom/parse/duplicate-enum-variant-name");
    expect(d, "loom/parse/duplicate-enum-variant-name for a repeated variant name").toBeDefined();
    // Message from code-registry-parse.md.
    expect(d?.message).toBe("duplicate variant name 'Low' on enum 'X'");
    // The value-duplication code is reserved for distinct names; it must NOT
    // fire here, because the name-duplication check runs first.
    expect(
      withCode(diags, "loom/parse/duplicate-enum-value"),
      "the name check runs before the value check, so duplicate-enum-value does not fire",
    ).toBeUndefined();
  });

  it("loom/parse/duplicate-enum-value: distinct names sharing one explicit value fire the value code", () => {
    // `enum X { Low = "x", High = "x" }`: distinct names, shared explicit value.
    const diags = checkEnumDeclaration(
      {
        name: "X",
        variants: [
          { name: "Low", value: { kind: "string", text: "x" } },
          { name: "High", value: { kind: "string", text: "x" } },
        ],
      },
      site(),
    );
    const d = withCode(diags, "loom/parse/duplicate-enum-value");
    expect(d, "loom/parse/duplicate-enum-value for two names sharing one explicit value").toBeDefined();
    // Message template `duplicate enum value '<value>' across variants of enum
    // '<enum>'` from code-registry-parse.md; <value> renders the literal source
    // text (identifier-shaped `x` rendered bare).
    expect(d?.message).toBe("duplicate enum value 'x' across variants of enum 'X'");
  });
});

// --- schemas.md §Variant access — unknown variant -------------------------

describe("V5a-T — unknown variant access (loom/parse/unknown-variant)", () => {
  it("loom/parse/unknown-variant: a reference to an undeclared variant fires; a declared one does not", () => {
    // `Severity.Critical` where `Severity` declares only Low/Medium/High.
    const d = checkVariantAccess(
      { enumName: "Severity", variant: "Critical", knownVariants: ["Low", "Medium", "High"] },
      site(),
    );
    expect(d, "loom/parse/unknown-variant for an undeclared variant").toBeDefined();
    expect(d?.code).toBe("loom/parse/unknown-variant");
    // Message from code-registry-parse.md.
    expect(d?.message).toBe("unknown variant 'Critical' on enum 'Severity'");

    // A declared variant reference raises nothing.
    const ok = checkVariantAccess(
      { enumName: "Severity", variant: "High", knownVariants: ["Low", "Medium", "High"] },
      site(),
    );
    expect(ok, "a declared variant access raises no unknown-variant diagnostic").toBeUndefined();
  });
});
