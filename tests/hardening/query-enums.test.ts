import { describe, expect, it } from "vitest";
import { requireLiveProvider, runProbe, type PlantedFile } from "./probe-harness";

// Area: SCHEMAS — enum declarations, wire values, interpolation (schemas.md,
// query-escapes-stringification.md QRY-18). Findings: QRY-2..QRY-6.
//
// Harness note: only the FIRST provider turn a theta issues is observable.

describe("schema — enum runtime + validation", () => {
  const provider = requireLiveProvider();

  function theta(name: string, body: string): PlantedFile {
    return {
      source: "project",
      path: `${name}.theta`,
      text: ["---", `description: ${name}`, "mode: prompt", "---", body].join("\n"),
    };
  }

  it("control: enum declared + plain query issues normally", async () => {
    const probe = await runProbe({
      provider,
      files: [theta("g", "enum Color { Red, Green }\nlet s: Color = Color.Red\n@`plain-g`")],
      drives: ["/g"],
    });
    try {
      expect(probe.turns[0]?.userTexts).toEqual(["plain-g"]);
    } finally {
      await probe.dispose();
    }
  });

  it("QRY-4 FIXED: direct enum-variant interpolation ${Color.Red} renders and issues a turn", async () => {
    const probe = await runProbe({
      provider,
      files: [theta("direct", "enum Color { Red, Green }\n@`VAL=${Color.Red}`")],
      drives: ["/direct"],
    });
    try {
      // FIXED (QRY-18): renders "VAL=Red" and issues a turn (the interpolation
      // is evaluated as an expression, resolving Color.Red to the enum value).
      expect(probe.turns[0]?.userTexts).toEqual(["VAL=Red"]);
      expect(probe.turns[0]?.error).toBeUndefined();
    } finally {
      await probe.dispose();
    }
  });

  it("QRY-2 FIXED: enum interpolation renders the unquoted wire value", async () => {
    const probe = await runProbe({
      provider,
      files: [theta("quoted", "enum Color { Red, Green }\nlet s: Color = Color.Red\n@`VAL=${s}`")],
      drives: ["/quoted"],
    });
    try {
      // FIXED (QRY-18: "Enum variant | the variant's wire value, unquoted"):
      // "VAL=Red" — the bare wire value, no JSON quoting.
      expect(probe.turns[0]?.userTexts).toEqual(["VAL=Red"]);
    } finally {
      await probe.dispose();
    }
  });

  it("QRY-3 FIXED: explicit enum value (Low = \"low\") is used as the wire value", async () => {
    const probe = await runProbe({
      provider,
      files: [
        theta(
          "explicit",
          'enum Severity { Low = "low", High = "high" }\nlet s: Severity = Severity.Low\n@`VAL=${s}`',
        ),
      ],
      drives: ["/explicit"],
    });
    try {
      // FIXED (schemas.md: "Explicit values override that mapping: Low =
      // \"low\" -> the model produces \"low\""): "VAL=low" — the explicit value
      // is captured by parseEnum and rendered as the bare wire value.
      expect(probe.turns[0]?.userTexts).toEqual(["VAL=low"]);
    } finally {
      await probe.dispose();
    }
  });

  it("QRY-5 + QRY-6 FIXED: invalid enum declarations & references are rejected (un-registered)", async () => {
    // Zero model turns: registration is the parse-acceptance signal. Controls
    // establish that ERROR-severity parse/type diagnostics DO block
    // registration (typeerr, empty schema body are rejected below).
    const files: PlantedFile[] = [
      // controls that MUST be rejected (not registered):
      theta("ctl_typeerr", 'let x: integer = "hello"'), // theta/parse/let-rhs-type-mismatch
      theta("ctl_emptyschema", "schema Empty { }"), // theta/parse/empty-schema-body
      // enum declarations that SHOULD be rejected but are accepted:
      theta("emptyenum", "enum EE { }\nlet _e: EE = EE.Anything"), // theta/parse/empty-enum-body
      theta("nonstrenum", "enum Bad { Low = 1, High = 2 }\nlet _b: Bad = Bad.Low"), // theta/parse/non-string-enum-value
      theta("boolenum", "enum Bad2 { Yes = true }\nlet _b: Bad2 = Bad2.Yes"), // theta/parse/non-string-enum-value
      theta("dupname", "enum D { Low, Low }\nlet _d: D = D.Low"), // theta/parse/duplicate-enum-variant-name
      theta("inlineenum", 'schema Q { sev: enum["a", "b"] }\nlet _q: Q = Q { sev: "a" }'), // theta/parse/inline-enum
      // unknown-variant reference that SHOULD be rejected but is accepted:
      theta("unkvar", "enum C2 { Low, High }\nlet _c: C2 = C2.Nope"), // theta/parse/unknown-variant
    ];
    const probe = await runProbe({ provider, files, drives: [] });
    try {
      const reg = new Set(probe.registeredNames);
      // Controls: correctly rejected.
      expect(reg.has("ctl_typeerr")).toBe(false);
      expect(reg.has("ctl_emptyschema")).toBe(false);
      // FIXED (QRY-5): invalid enum declarations are ERROR-severity parse
      // diagnostics that reach document.diagnostics → the theta un-registers.
      expect(reg.has("emptyenum")).toBe(false); // theta/parse/empty-enum-body
      expect(reg.has("nonstrenum")).toBe(false); // theta/parse/non-string-enum-value
      expect(reg.has("boolenum")).toBe(false); // theta/parse/non-string-enum-value
      expect(reg.has("dupname")).toBe(false); // theta/parse/duplicate-enum-variant-name
      expect(reg.has("inlineenum")).toBe(false); // theta/parse/inline-enum
      // FIXED (QRY-6): unknown-variant reference un-registers.
      expect(reg.has("unkvar")).toBe(false); // theta/parse/unknown-variant
    } finally {
      await probe.dispose();
    }
  });
});
