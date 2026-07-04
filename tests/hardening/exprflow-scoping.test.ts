import { describe, it, expect } from "vitest";
import { requireLiveProvider, runProbe } from "./probe-harness";

const L = (path: string, body: string[]) => ({
  source: "project" as const,
  path,
  text: ["---", "description: x", "mode: prompt", "---", ...body].join("\n"),
});

describe("exprflow — escapes, compound assignment, bindings", () => {
  const provider = requireLiveProvider();

  it("string escapes, unicode escape, compound assignment operators", async () => {
    const probe = await runProbe({
      provider,
      files: [
        L("misc.loom", [
          "let esc = '\\u{48}\\u{49}'",       // "HI"
          "let tabs = 'x\\ty'.length",         // 3
          "let bs = 'a\\\\b'.length",          // "a\b" -> 3
          "let q = 'he said \\'hi\\''.length", // he said 'hi' -> 12
          "let mut n = 10",
          "n += 5",                             // 15
          "n -= 3",                             // 12
          "n *= 2",                             // 24
          "n /= 4",                             // 6
          "n %= 4",                             // 2
          "@`R esc=${esc}|tabs=${tabs}|bs=${bs}|q=${q}|n=${n}|END reply ok`",
        ]),
      ],
      drives: ["/misc"],
    });
    try {
      console.log("MISC_DIAGS>>>", JSON.stringify(probe.diagnostics));
      console.log("MISC_REG>>>", JSON.stringify(probe.registeredNames));
      const t = probe.turns[0];
      console.log("MISC_USERTEXT>>>", JSON.stringify(t.userTexts), "ERR:", t.error);
      const u = t.userTexts.join("\n");
      expect(u).toContain("esc=HI|");
      expect(u).toContain("tabs=3|");
      expect(u).toContain("bs=3|");
      expect(u).toContain("n=2|");
    } finally {
      await probe.dispose();
    }
  });
});
