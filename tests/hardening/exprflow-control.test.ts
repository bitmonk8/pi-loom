import { describe, it, expect } from "vitest";
import { requireLiveProvider, runProbe } from "./probe-harness";

describe("exprflow — control flow & match", () => {
  const provider = requireLiveProvider();

  it("for / while / break / continue / if-else / empty-array / match", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "ctrl.theta",
          text: [
            "---", "description: ctrl", "mode: prompt", "---",
            "let mut sum = 0",
            "for x in [1, 2, 3, 4] {",
            "  sum = sum + x",
            "}",
            "let mut prod = 1",
            "let mut i = 1",
            "while i <= 4 {",
            "  prod = prod * i",
            "  i = i + 1",
            "}",
            "let mut cnt = 0",
            "for x in [1, 2, 3, 4, 5, 6] {",
            "  if x == 4 {",
            "    break",
            "  }",
            "  if x == 2 {",
            "    continue",
            "  }",
            "  cnt = cnt + 1",
            "}",
            "let mut cls = 0",
            "if 5 > 3 {",
            "  cls = 1",
            "} else {",
            "  cls = 2",
            "}",
            "let empty: array<integer> = []",
            "let mut ec = 0",
            "for x in empty {",
            "  ec = ec + 1",
            "}",
            "let ml = match 2 {",
            "  1 => 10,",
            "  2 => 20,",
            "  _ => 99",
            "}",
            "let r = Ok(42)",
            "let mr = match r {",
            "  Ok(v) => v,",
            "  Err(e) => 0",
            "}",
            "@`R sum=${sum}|prod=${prod}|cnt=${cnt}|cls=${cls}|ec=${ec}|ml=${ml}|mr=${mr}|END reply ok`",
          ].join("\n"),
        },
      ],
      drives: ["/ctrl"],
    });
    try {
      console.log("CTRL_DIAGS>>>", JSON.stringify(probe.diagnostics));
      console.log("CTRL_REG>>>", JSON.stringify(probe.registeredNames));
      const t = probe.turns[0];
      console.log("CTRL_USERTEXT>>>", JSON.stringify(t.userTexts));
      console.log("CTRL_ERR>>>", t.error);
      const u = t.userTexts.join("\n");
      expect(u).toContain("sum=10|");
      expect(u).toContain("prod=24|");
      expect(u).toContain("cnt=2|");
      expect(u).toContain("cls=1|");
      expect(u).toContain("ec=0|");
      expect(u).toContain("ml=20|");
      expect(u).toContain("mr=42|");
    } finally {
      await probe.dispose();
    }
  });
});
