// e2e-S3 — offline schema-lowering conformance for UNCOVERED SCH requirements.
//
// These drive the REAL `src/parser/body-type-lowering` lowering functions (the
// same machinery `lowerQueryResponseSchema` / `params:` lowering compose) and
// pin three normative requirements the S3 coverage map found UNCOVERED:
//
//   - REQ-SCH-7  (schemas.md:62-90) — an `enum` variant's model-produced string
//     is the variant name by default (`Low`→`"Low"`); an explicit `Low = "low"`
//     overrides only that variant's wire value.
//   - REQ-SCH-19 (schema-subset.md:5) — the emitted/enforced subset `type`
//     values are exactly `string, number, integer, boolean, object, array,
//     null` and nothing else.
//   - REQ-SCH-32 (schema-subset.md:82) — a discriminated OBJECT union lowers to
//     `{ anyOf: [...] }` with NO `discriminator` keyword; each variant carries
//     its own `const`-typed discriminator field and `additionalProperties:false`.
//
// Method: M1 offline-unit. No model, no session.

import { describe, expect, it } from "vitest";
import {
  buildBodyTypeSchemas,
  lowerEnumToSchema,
  lowerObjectFields,
  lowerTypeSource,
} from "../src/parser/body-type-lowering";

// ===========================================================================
// REQ-SCH-7 — enum variant name is the default wire value; explicit `= "..."`
// overrides that variant only.
// ===========================================================================

describe("e2e-S3 — REQ-SCH-7 enum variant wire value (schemas.md:62-90)", () => {
  it("defaults each variant's wire value to its (PascalCase) name (`Low`→`\"Low\"`)", () => {
    const lowered = lowerEnumToSchema(["Low", "Medium", "High"], undefined);
    expect(lowered).toEqual({ type: "string", enum: ["Low", "Medium", "High"] });
  });

  it("an explicit `Low = \"low\"` overrides only that variant's wire value, in source order", () => {
    const lowered = lowerEnumToSchema(["Low", "Medium", "High"], { Low: "low" });
    // Only `Low` is overridden; the others keep their name-as-wire default and
    // the declared source order is preserved.
    expect(lowered).toEqual({ type: "string", enum: ["low", "Medium", "High"] });
  });
});

// ===========================================================================
// REQ-SCH-19 — the emitted subset `type` values are exactly the seven allowed.
// ===========================================================================

describe("e2e-S3 — REQ-SCH-19 emitted subset types are exactly the seven (schema-subset.md:5)", () => {
  const empty = new Map<string, Record<string, unknown>>();

  it("each scalar primitive lowers to its `{ type: <p> }` fragment", () => {
    expect(lowerTypeSource("string", empty, {})).toEqual({ type: "string" });
    expect(lowerTypeSource("number", empty, {})).toEqual({ type: "number" });
    expect(lowerTypeSource("integer", empty, {})).toEqual({ type: "integer" });
    expect(lowerTypeSource("boolean", empty, {})).toEqual({ type: "boolean" });
  });

  it("`array<T>` lowers to `{ type: \"array\", items }` and an object body to `{ type: \"object\", ... }`", () => {
    expect(lowerTypeSource("array<string>", empty, {})).toEqual({
      type: "array",
      items: { type: "string" },
    });
    const obj = lowerObjectFields([{ name: "a", typeSource: "string" }], empty);
    expect(obj).toMatchObject({ type: "object", additionalProperties: false });
  });

  it("`null` is emitted only via the union type-array form (`string | null` → [\"string\",\"null\"], null last)", () => {
    expect(lowerTypeSource("string | null", empty, {})).toEqual({
      type: ["string", "null"],
    });
  });

  it("the set of distinct emitted `type` values across the subset forms is exactly the seven — no others", () => {
    const emitted = new Set<string>();
    const collect = (fragment: Record<string, unknown>): void => {
      const t = fragment["type"];
      if (typeof t === "string") emitted.add(t);
      else if (Array.isArray(t)) for (const v of t) if (typeof v === "string") emitted.add(v);
    };
    collect(lowerTypeSource("string", empty, {}));
    collect(lowerTypeSource("number", empty, {}));
    collect(lowerTypeSource("integer", empty, {}));
    collect(lowerTypeSource("boolean", empty, {}));
    collect(lowerTypeSource("array<string>", empty, {}));
    collect(lowerObjectFields([{ name: "a", typeSource: "string" }], empty));
    collect(lowerTypeSource("string | null", empty, {}));
    expect([...emitted].sort()).toEqual(
      ["array", "boolean", "integer", "null", "number", "object", "string"].sort(),
    );
  });
});

// ===========================================================================
// REQ-SCH-32 — a discriminated object union lowers to anyOf with NO
// `discriminator` keyword; each variant carries its own const discriminator.
// ===========================================================================

describe("e2e-S3 — REQ-SCH-32 discriminated object union → anyOf, no discriminator keyword (schema-subset.md:82)", () => {
  it("lowers to `{ anyOf: [...] }` with NO `discriminator` keyword; each variant carries a `const`-typed discriminator + additionalProperties:false", () => {
    const map = buildBodyTypeSchemas(
      [
        {
          name: "Cat",
          fields: [
            { name: "kind", typeSource: '"cat"' },
            { name: "meow", typeSource: "boolean" },
          ],
        },
        {
          name: "Dog",
          fields: [
            { name: "kind", typeSource: '"dog"' },
            { name: "bark", typeSource: "boolean" },
          ],
        },
      ],
      [],
    );
    const defs: Record<string, Record<string, unknown>> = {};
    const lowered = lowerTypeSource("Cat | Dog", map, defs);

    // Composition is `anyOf` only (REQ-SCH-20); the discriminated form carries
    // NO `discriminator` marker keyword (REQ-SCH-32).
    expect(Object.keys(lowered)).toEqual(["anyOf"]);
    expect(lowered).not.toHaveProperty("discriminator");

    // Each variant relies on its own `const`-typed discriminator field +
    // `additionalProperties:false` (resolved via the $defs the arms $ref).
    expect(lowered).toEqual({
      anyOf: [{ $ref: "#/$defs/Cat" }, { $ref: "#/$defs/Dog" }],
    });
    expect(defs["Cat"]).toMatchObject({
      type: "object",
      properties: { kind: { const: "cat" } },
      additionalProperties: false,
    });
    expect(defs["Dog"]).toMatchObject({
      type: "object",
      properties: { kind: { const: "dog" } },
      additionalProperties: false,
    });
    // No variant fragment carries a `discriminator` marker either.
    expect(defs["Cat"]).not.toHaveProperty("discriminator");
    expect(defs["Dog"]).not.toHaveProperty("discriminator");
  });
});
