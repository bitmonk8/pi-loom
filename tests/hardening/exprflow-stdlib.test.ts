import { describe, it, expect } from "vitest";
import { requireLiveProvider, runProbe } from "./probe-harness";

// EXPRESSIONS & CONTROL FLOW — string / array / object stdlib surface
// (expressions.md §"Built-in methods and properties"), including the five
// normative `replace` reference vectors. Computed in `let`, interpolated,
// asserted on userTexts.

describe("exprflow — stdlib string/array/object", () => {
  const provider = requireLiveProvider();

  it("string stdlib + the 5 normative replace vectors", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "strs.theta",
          text: [
            "---",
            "description: strs",
            "mode: prompt",
            "---",
            "let s = 'Hello World'",
            "let len = s.length",
            "let up = s.toUpperCase()",
            "let lo = s.toLowerCase()",
            "let tr = '  hi  '.trim()",
            "let sw = s.startsWith('Hello')",
            "let ew = s.endsWith('World')",
            "let inc = s.includes('lo W')",
            "let sp = 'a,b,c'.split(',')",
            "let chained = 'a,b,c'.split(',').join('-')",
            "let r1 = 'aXbXc'.replace('X', '[$&]')",
            "let r2 = '100'.replace('0', '$$')",
            "let r3 = 'a-b'.replace('-', 'x$1y')",
            "let r4 = 'abc'.replace('', 'X')",
            "let r5 = 'aaaaa'.replace('aa', 'x')",
            "let esep = 'ab'.split('')",
            "@`R len=${len}|up=${up}|lo=${lo}|tr=${tr}|sw=${sw}|ew=${ew}|inc=${inc}|sp=${sp}|chained=${chained}|r1=${r1}|r2=${r2}|r3=${r3}|r4=${r4}|r5=${r5}|esep=${esep}|END reply ok`",
          ].join("\n"),
        },
      ],
      drives: ["/strs"],
    });
    try {
      console.log("STRS_DIAGS>>>", JSON.stringify(probe.diagnostics));
      console.log("STRS_REG>>>", JSON.stringify(probe.registeredNames));
      const u = probe.turns[0].userTexts.join("\n");
      console.log("STRS_USERTEXT>>>", JSON.stringify(u));
      console.log("STRS_ERR>>>", probe.turns[0].error);
      expect(u).toContain("len=11|");
      expect(u).toContain("up=HELLO WORLD|");
      expect(u).toContain("lo=hello world|");
      expect(u).toContain("tr=hi|");
      expect(u).toContain("sw=true|");
      expect(u).toContain("ew=true|");
      expect(u).toContain("inc=true|");
      expect(u).toContain('sp=["a","b","c"]|');
      expect(u).toContain("chained=a-b-c|");
      // Normative replace vectors:
      expect(u).toContain("r1=a[$&]b[$&]c|");
      expect(u).toContain("r2=1$$$$|");
      expect(u).toContain("r3=ax$1yb|");
      expect(u).toContain("r4=abc|");
      expect(u).toContain("r5=xxa|");
      expect(u).toContain('esep=["a","b"]|');
    } finally {
      await probe.dispose();
    }
  });

  it("array + object stdlib (concat excluded — see EXPR-2)", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "coll.theta",
          text: [
            "---",
            "description: coll",
            "mode: prompt",
            "---",
            "schema Pair { a: number, b: number }",
            "let xs = [3, 1, 2]",
            "let alen = xs.length",
            "let has = xs.includes(2)",
            "let idx = xs.indexOf(2)",
            "let miss = xs.indexOf(99)",
            "let sl = xs.slice(1)",
            "let sl2 = xs.slice(0, 2)",
            "let slneg = xs.slice(-2)",
            "let strs: array<string> = ['a', 'b']",
            "let jn = strs.join('/')",
            "let obj = Pair { a: 1, b: 2 }",
            "let ok = obj.keys()",
            "let ov = obj.values()",
            "let oh = obj.has('a')",
            "let ohn = obj.has('zzz')",
            "let first = xs[0]",
            "@`R alen=${alen}|has=${has}|idx=${idx}|miss=${miss}|sl=${sl}|sl2=${sl2}|slneg=${slneg}|jn=${jn}|ok=${ok}|ov=${ov}|oh=${oh}|ohn=${ohn}|first=${first}|END reply ok`",
          ].join("\n"),
        },
      ],
      drives: ["/coll"],
    });
    try {
      console.log("COLL_DIAGS>>>", JSON.stringify(probe.diagnostics));
      const u = probe.turns[0].userTexts.join("\n");
      console.log("COLL_USERTEXT>>>", JSON.stringify(u));
      expect(u).toContain("alen=3|");
      expect(u).toContain("has=true|");
      expect(u).toContain("idx=2|");
      expect(u).toContain("miss=-1|");
      expect(u).toContain("sl=[1,2]|");
      expect(u).toContain("sl2=[3,1]|");
      expect(u).toContain("slneg=[1,2]|");
      expect(u).toContain("jn=a/b|");
      expect(u).toContain('ok=["a","b"]|');
      expect(u).toContain("ov=[1,2]|");
      expect(u).toContain("oh=true|");
      expect(u).toContain("ohn=false|");
      expect(u).toContain("first=3|");
    } finally {
      await probe.dispose();
    }
  });

  it("EXPR-2 (FIXED): array.concat appends the argument array's elements", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "concat.theta",
          text: [
            "---", "description: concat", "mode: prompt", "---",
            "let xs = [1, 2]",
            "let cc = xs.concat([3, 4])",
            "@`R cc=${cc}|END reply ok`",
          ].join("\n"),
        },
      ],
      drives: ["/concat"],
    });
    try {
      // Parse/type accept `.concat`, and the runtime member dispatch now has a
      // `concat` case, so the theta completes and produces the interpolated
      // user turn with the appended result `[1,2,3,4]`.
      expect(probe.registeredNames).toContain("concat");
      const u = probe.turns[0].userTexts.join("\n");
      expect(u).toContain("cc=[1,2,3,4]|");
    } finally {
      await probe.dispose();
    }
  });
});
