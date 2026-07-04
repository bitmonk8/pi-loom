import { describe, it, expect } from "vitest";
import { requireLiveProvider, runProbe } from "./probe-harness";

// EXPRESSIONS & CONTROL FLOW — arithmetic, precedence, comparison, boolean,
// ternary, division/modulo edge cases, and number rendering through the
// shipped query-template interpolation path.
//
// Deterministic channel: compute in `let` bindings (full expression evaluator),
// interpolate the bindings into one `@`-query template, assert on userTexts.

describe("exprflow — arithmetic & precedence", () => {
  const provider = requireLiveProvider();

  it("evaluates arithmetic, precedence, comparison, boolean, ternary; renders numbers", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "arith.loom",
          text: [
            "---",
            "description: arith",
            "mode: prompt",
            "---",
            "let add = 2 + 3 * 4",           // 14 precedence
            "let sub = 10 - 4 - 3",           // 3 left-assoc
            "let neg = -5 + 3",               // -2
            "let up = -2 * 3",                // -6 unary binds tighter
            "let div = 7 / 2",                // 3.5 always number
            "let divz = 1 / 0",               // Infinity
            "let zdivz = 0 / 0",              // NaN
            "let modp = 7 % 3",               // 1
            "let modn = -7 % 3",              // -1 (JS sign-of-dividend)
            "let modz = 5 % 0",               // NaN
            "let cmp = 2 + 3 < 10",           // true
            "let band = true && false",       // false
            "let bor = false || true",        // true
            "let notx = !false",              // true
            "let tern = (2 > 1) ? 100 : 200", // 100
            "let strcat = \"a\" + \"b\"",     // ab
            "@`R add=${add}|sub=${sub}|neg=${neg}|up=${up}|div=${div}|divz=${divz}|zdivz=${zdivz}|modp=${modp}|modn=${modn}|modz=${modz}|cmp=${cmp}|band=${band}|bor=${bor}|notx=${notx}|tern=${tern}|strcat=${strcat}|END reply ok`",
          ].join("\n"),
        },
      ],
      drives: ["/arith"],
    });
    try {
      console.log("DIAGS>>>", JSON.stringify(probe.diagnostics));
      console.log("REGISTERED>>>", JSON.stringify(probe.registeredNames));
      expect(probe.registeredNames).toContain("arith");
      const u = probe.turns[0].userTexts.join("\n");
      // Emit the full captured text for inspection.
      console.log("ARITH_USERTEXT>>>", JSON.stringify(u));
      console.log("ARITH_ERROR>>>", probe.turns[0].error);
      expect(u).toContain("add=14|");
      expect(u).toContain("sub=3|");
      expect(u).toContain("neg=-2|");
      expect(u).toContain("up=-6|");
      expect(u).toContain("div=3.5|");
      expect(u).toContain("modp=1|");
      expect(u).toContain("modn=-1|");
      expect(u).toContain("cmp=true|");
      expect(u).toContain("band=false|");
      expect(u).toContain("bor=true|");
      expect(u).toContain("notx=true|");
      expect(u).toContain("tern=100|");
      expect(u).toContain("strcat=ab|");
      expect(u).toContain("up=-6|");
      // EXPR-1 (BUG): Infinity / NaN interpolate as "null" via JSON.stringify,
      // diverging from QRY-18 canonical renderer ("Infinity" / "NaN").
      // Pin OBSERVED behaviour so this file is a regression net.
      expect(u).toContain("divz=null|");
      expect(u).toContain("zdivz=null|");
      expect(u).toContain("modz=null|");
    } finally {
      await probe.dispose();
    }
  });
});
