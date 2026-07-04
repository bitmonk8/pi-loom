import { describe, it, expect } from "vitest";
import { requireLiveProvider, runProbe } from "./probe-harness";

// EXPR-4 / EXPR-5 regression pins. A user `fn` (functions.md FN-5: final value =
// tail expression value) whose TAIL is a bare call to another fn loses the
// value (null); and recursion in a tail-expression operand mis-evaluates, while
// the `return` / `let`-bound equivalents are correct.

const L = (path: string, body: string[]) => ({
  source: "project" as const,
  path,
  text: ["---", "description: x", "mode: prompt", "---", ...body].join("\n"),
});

describe("exprflow — fn tail-call value loss (EXPR-4/EXPR-5)", () => {
  const provider = requireLiveProvider();

  it("bare-call tail loses value; return/let/operand forms are correct", async () => {
    const probe = await runProbe({
      provider,
      files: [
        // EXPR-4: bare-call tail chain -> null
        L("bchain.loom", [
          "fn h3(n: integer): integer { n }",
          "fn h2(n: integer): integer { h3(n) }",
          "fn h1(n: integer): integer { h2(n) }",
          "let r = h1(7)",
          "@`R=${r}|END reply ok`",
        ]),
        // EXPR-5: recursion in tail-expression operand -> wrong (3, not 6)
        L("btailrec.loom", [
          "fn s(n: integer): integer {",
          "  if n <= 0 {",
          "    return 0",
          "  }",
          "  n + s(n - 1)",
          "}",
          "let r = s(3)",
          "@`R=${r}|END reply ok`",
        ]),
        // Control: same recursion via explicit return -> correct (6)
        L("bretrec.loom", [
          "fn s(n: integer): integer {",
          "  if n <= 0 {",
          "    return 0",
          "  }",
          "  return n + s(n - 1)",
          "}",
          "let r = s(3)",
          "@`R=${r}|END reply ok`",
        ]),
        // Control: let-bound intermediate -> correct (6)
        L("bletcall.loom", [
          "fn inner(n: integer): integer { n + 1 }",
          "fn outer(n: integer): integer {",
          "  let v = inner(n)",
          "  v",
          "}",
          "let r = outer(5)",
          "@`R=${r}|END reply ok`",
        ]),
      ],
      drives: ["/bchain", "/btailrec", "/bretrec", "/bletcall"],
    });
    try {
      const m: Record<string, string> = {};
      for (const t of probe.turns) {
        console.log(`FNTAIL ${t.invocation}>>>`, JSON.stringify(t.userTexts), "ERR:", t.error);
        m[t.invocation] = t.userTexts.join("\n");
      }
      // EXPR-4: bare-call tail loses the value.
      expect(m["/bchain"]).toContain("R=null|");
      // EXPR-5: tail-operand recursion mis-evaluates (3 instead of 6).
      expect(m["/btailrec"]).toContain("R=3|");
      // Controls behave correctly.
      expect(m["/bretrec"]).toContain("R=6|");
      expect(m["/bletcall"]).toContain("R=6|");
    } finally {
      await probe.dispose();
    }
  });
});
