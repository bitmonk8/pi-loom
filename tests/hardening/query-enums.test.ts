import { describe, expect, it } from "vitest";
import { requireLiveProvider, runProbe, type PlantedFile } from "./probe-harness";

// Area: SCHEMAS — enum declarations, wire values, interpolation (schemas.md,
// query-escapes-stringification.md QRY-18). Findings: QRY-2..QRY-6.
//
// Harness note: only the FIRST provider turn a loom issues is observable.

describe("schema — enum runtime + validation", () => {
  const provider = requireLiveProvider();

  function loom(name: string, body: string): PlantedFile {
    return {
      source: "project",
      path: `${name}.loom`,
      text: ["---", `description: ${name}`, "mode: prompt", "---", body].join("\n"),
    };
  }

  it("control: enum declared + plain query issues normally", async () => {
    const probe = await runProbe({
      provider,
      files: [loom("g", "enum Color { Red, Green }\nlet s: Color = Color.Red\n@`plain-g`")],
      drives: ["/g"],
    });
    try {
      expect(probe.turns[0]?.userTexts).toEqual(["plain-g"]);
    } finally {
      await probe.dispose();
    }
  });

  it("QRY-4 BUG: direct enum-variant interpolation ${Color.Red} aborts the loom", async () => {
    const probe = await runProbe({
      provider,
      files: [loom("direct", "enum Color { Red, Green }\n@`VAL=${Color.Red}`")],
      drives: ["/direct"],
    });
    try {
      // EXPECTED (QRY-18): renders "VAL=Red" and issues a turn.
      // OBSERVED: no turn issued — direct enum-variant access in interpolation
      // position aborts the loom (contrast the let-bound form below, which
      // issues a turn).
      expect(probe.turns[0]?.userTexts).toEqual([]); // BUG: expected ["VAL=Red"]
      expect(probe.turns[0]?.error).toBeUndefined();
    } finally {
      await probe.dispose();
    }
  });

  it("QRY-2 BUG: enum interpolation is JSON-quoted instead of the unquoted wire value", async () => {
    const probe = await runProbe({
      provider,
      files: [loom("quoted", "enum Color { Red, Green }\nlet s: Color = Color.Red\n@`VAL=${s}`")],
      drives: ["/quoted"],
    });
    try {
      // EXPECTED (QRY-18: "Enum variant | the variant's wire value, unquoted"):
      // "VAL=Red". OBSERVED: 'VAL="Red"' — the wire value is JSON-quoted.
      expect(probe.turns[0]?.userTexts).toEqual(['VAL="Red"']); // BUG: expected ["VAL=Red"]
    } finally {
      await probe.dispose();
    }
  });

  it("QRY-3 BUG: explicit enum value (Low = \"low\") is dropped; the variant name is used as the wire value", async () => {
    const probe = await runProbe({
      provider,
      files: [
        loom(
          "explicit",
          'enum Severity { Low = "low", High = "high" }\nlet s: Severity = Severity.Low\n@`VAL=${s}`',
        ),
      ],
      drives: ["/explicit"],
    });
    try {
      // EXPECTED (schemas.md: "Explicit values override that mapping: Low =
      // \"low\" -> the model produces \"low\""): "VAL=low".
      // OBSERVED: 'VAL="Low"' — the explicit value "low" is dropped (parseEnum
      // captures variant NAMES only) AND the value is JSON-quoted (QRY-2).
      expect(probe.turns[0]?.userTexts).toEqual(['VAL="Low"']); // BUG: expected ["VAL=low"]
    } finally {
      await probe.dispose();
    }
  });

  it("QRY-5 + QRY-6 BUG: invalid enum declarations & references load instead of being rejected", async () => {
    // Zero model turns: registration is the parse-acceptance signal. Controls
    // establish that ERROR-severity parse/type diagnostics DO block
    // registration (typeerr, empty schema body are rejected below).
    const files: PlantedFile[] = [
      // controls that MUST be rejected (not registered):
      loom("ctl_typeerr", 'let x: integer = "hello"'), // loom/parse/let-rhs-type-mismatch
      loom("ctl_emptyschema", "schema Empty { }"), // loom/parse/empty-schema-body
      // enum declarations that SHOULD be rejected but are accepted:
      loom("emptyenum", "enum EE { }\nlet _e: EE = EE.Anything"), // loom/parse/empty-enum-body
      loom("nonstrenum", "enum Bad { Low = 1, High = 2 }\nlet _b: Bad = Bad.Low"), // loom/parse/non-string-enum-value
      loom("boolenum", "enum Bad2 { Yes = true }\nlet _b: Bad2 = Bad2.Yes"), // loom/parse/non-string-enum-value
      loom("dupname", "enum D { Low, Low }\nlet _d: D = D.Low"), // loom/parse/duplicate-enum-variant-name
      loom("inlineenum", 'schema Q { sev: enum["a", "b"] }\nlet _q: Q = Q { sev: "a" }'), // loom/parse/inline-enum
      // unknown-variant reference that SHOULD be rejected but is accepted:
      loom("unkvar", "enum C2 { Low, High }\nlet _c: C2 = C2.Nope"), // loom/parse/unknown-variant
    ];
    const probe = await runProbe({ provider, files, drives: [] });
    try {
      const reg = new Set(probe.registeredNames);
      // Controls: correctly rejected.
      expect(reg.has("ctl_typeerr")).toBe(false);
      expect(reg.has("ctl_emptyschema")).toBe(false);
      // BUG (QRY-5): invalid enum declarations register (checks unwired).
      expect(reg.has("emptyenum")).toBe(true); // expected: rejected
      expect(reg.has("nonstrenum")).toBe(true); // expected: rejected
      expect(reg.has("boolenum")).toBe(true); // expected: rejected
      expect(reg.has("dupname")).toBe(true); // expected: rejected
      expect(reg.has("inlineenum")).toBe(true); // expected: rejected
      // BUG (QRY-6): unknown-variant reference registers.
      expect(reg.has("unkvar")).toBe(true); // expected: rejected
    } finally {
      await probe.dispose();
    }
  });
});
