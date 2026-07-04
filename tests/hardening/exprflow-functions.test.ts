import { describe, it, expect } from "vitest";
import { requireLiveProvider, runProbe } from "./probe-harness";

describe("exprflow — functions, recursion, return", () => {
  const provider = requireLiveProvider();

  it("fn calls, recursion, early return, mutual recursion", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "fns.loom",
          text: [
            "---", "description: fns", "mode: prompt", "---",
            "fn dbl(n: integer): integer {",
            "  n * 2",
            "}",
            "fn fact(n: integer): integer {",
            "  if n <= 1 {",
            "    return 1",
            "  }",
            "  n * fact(n - 1)",
            "}",
            "fn clamp(n: integer): integer {",
            "  if n > 10 {",
            "    return 10",
            "  }",
            "  n",
            "}",
            "fn is_even(n: integer): boolean {",
            "  if n == 0 {",
            "    return true",
            "  }",
            "  is_odd(n - 1)",
            "}",
            "fn is_odd(n: integer): boolean {",
            "  if n == 0 {",
            "    return false",
            "  }",
            "  is_even(n - 1)",
            "}",
            "let d = dbl(21)",
            "let f = fact(5)",
            "let c1 = clamp(3)",
            "let c2 = clamp(50)",
            "let ev = is_even(10)",
            "let od = is_odd(7)",
            "@`R d=${d}|f=${f}|c1=${c1}|c2=${c2}|ev=${ev}|od=${od}|END reply ok`",
          ].join("\n"),
        },
      ],
      drives: ["/fns"],
    });
    try {
      console.log("FNS_DIAGS>>>", JSON.stringify(probe.diagnostics));
      console.log("FNS_REG>>>", JSON.stringify(probe.registeredNames));
      const t = probe.turns[0];
      console.log("FNS_USERTEXT>>>", JSON.stringify(t.userTexts));
      console.log("FNS_ERR>>>", t.error);
      const u = t.userTexts.join("\n");
      // Working cases: simple tail arithmetic, and early `return` (incl. clamp).
      expect(u).toContain("d=42|");   // dbl(21) tail = n*2
      expect(u).toContain("c1=3|");   // clamp(3) tail = n
      expect(u).toContain("c2=10|");  // clamp(50) early return works
      // EXPR-5 (BUG): recursion in a tail-expression operand mis-evaluates.
      // fact(5) should be 120; observed 0 (recursive call in `n * fact(n-1)`
      // tail resolves to null, and n * null === 0). Pin OBSERVED.
      expect(u).toContain("f=0|");
      // EXPR-4 (BUG): mutual recursion through bare-call tails yields null.
      // is_even(10)/is_odd(7) should be true; observed null.
      expect(u).toContain("ev=null|");
      expect(u).toContain("od=null|");
    } finally {
      await probe.dispose();
    }
  });
});
