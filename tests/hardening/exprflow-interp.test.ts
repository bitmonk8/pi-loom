import { describe, it, expect } from "vitest";
import { requireLiveProvider, runProbe } from "./probe-harness";

const L = (path: string, body: string[]) => ({
  source: "project" as const,
  path,
  text: ["---", "description: x", "mode: prompt", "---", ...body].join("\n"),
});

describe("exprflow — interpolation & enums", () => {
  const provider = requireLiveProvider();

  it("enum render (bound), enum equality, direct enum interp, complex-expr interp", async () => {
    const probe = await runProbe({
      provider,
      files: [
        // Enum bound to a let, then interpolated + equality.
        L("enumb.loom", [
          "enum Color {",
          "  Red,",
          "  Green,",
          "}",
          "let c = Color.Red",
          "let eq1 = c == Color.Red",
          "let eq2 = c == Color.Green",
          "@`R c=${c}|eq1=${eq1}|eq2=${eq2}|END reply ok`",
        ]),
        // Direct Enum.Variant inside ${...}.
        L("enumd.loom", [
          "enum Color {",
          "  Red,",
          "  Green,",
          "}",
          "@`R d=${Color.Red}|END reply ok`",
        ]),
        // Complex expressions inside ${...} (spec: any expression is admissible).
        L("iexpr.loom", [
          "let x = 5",
          "let arr = [10, 20, 30]",
          "let s = 'hi'",
          "fn dbl(n: integer): integer { n * 2 }",
          "@`R plus=${x + 1}|prod=${x * 2}|idx=${arr[0]}|call=${dbl(x)}|meth=${s.toUpperCase()}|len=${s.length}|END reply ok`",
        ]),
      ],
      drives: ["/enumb", "/enumd", "/iexpr"],
    });
    try {
      console.log("INTERP_DIAGS>>>", JSON.stringify(probe.diagnostics));
      console.log("INTERP_REG>>>", JSON.stringify(probe.registeredNames));
      const byName: Record<string, string> = {};
      for (const t of probe.turns) {
        console.log(`INTERP_TURN ${t.invocation}>>>`, JSON.stringify(t.userTexts), "ERR:", t.error);
        byName[t.invocation] = t.userTexts.join("\n");
      }
      // Enum equality is correct.
      expect(byName["/enumb"]).toContain("eq1=true|");
      expect(byName["/enumb"]).toContain("eq2=false|");
      // EXPR-6 (FIXED): a bound enum interpolates as QRY-18's bare unquoted wire
      // value (Red), not JSON-quoted ("Red").
      expect(byName["/enumb"]).toContain("c=Red|");
      // EXPR-7 (FIXED): a direct ${Enum.Variant} interpolation evaluates to the
      // enum value and issues a turn (VAL=Red), no longer aborting the loom.
      expect(byName["/enumd"]).toContain("d=Red|");
      // EXPR-8 (FIXED): interpolation evaluates any expression, not just dotted
      // identifier paths.
      expect(byName["/iexpr"]).toContain("plus=6|");    // ${x + 1}
      expect(byName["/iexpr"]).toContain("prod=10|");   // ${x * 2}
      expect(byName["/iexpr"]).toContain("idx=10|");    // ${arr[0]}
      expect(byName["/iexpr"]).toContain("call=10|");   // ${dbl(x)}
      expect(byName["/iexpr"]).toContain("meth=HI|");   // ${s.toUpperCase()}
      expect(byName["/iexpr"]).toContain("len=2|");     // ${s.length}
    } finally {
      await probe.dispose();
    }
  });
});
