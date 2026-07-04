import { describe, it, expect } from "vitest";
import { requireLiveProvider, runProbe } from "./probe-harness";

// IMPORTS & .warp MODULES — using imported functions.
//
// Spec guide.md §".loom versus .warp" + imports.md §.warp file rules: an
// imported `fn` is callable from the importing `.loom`, and a query inside an
// imported warp function executes against the *calling* `.loom`'s conversation.
// These probes drive the shipped extension; the fn-usage checks are effectively
// zero-token if the symbol is unresolved (evaluation throws before any model
// turn), and pinned deterministically via `turn.userTexts` otherwise.

describe("imports & .warp — imported functions", () => {
  const provider = requireLiveProvider();

  // IMP-F — call an imported (pure) warp fn and interpolate its return value
  // into a query. Deterministic observation: the computed user-turn text should
  // contain the fn's return value.
  it("IMP-F: an imported pure warp fn is callable / usable in a query", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "main.loom",
          text: [
            "---",
            "description: use imported fn",
            "mode: prompt",
            "---",
            'import { greeting } from "./lib.warp"',
            "@`MARK ${greeting()} say ok`",
          ].join("\n"),
        },
        {
          source: "project",
          path: "lib.warp",
          text: [
            "fn greeting(): string {",
            '  "HELLO_FROM_WARP"',
            "}",
          ].join("\n"),
        },
      ],
      drives: ["/main"],
    });
    try {
      const turn = probe.turns[0];
      // eslint-disable-next-line no-console
      console.log("IMP-F registered:", JSON.stringify(probe.registeredNames));
      // eslint-disable-next-line no-console
      console.log("IMP-F userTexts:", JSON.stringify(turn?.userTexts));
      // eslint-disable-next-line no-console
      console.log("IMP-F error:", turn?.error);
      // eslint-disable-next-line no-console
      console.log("IMP-F diagnostics:", JSON.stringify(probe.diagnostics.map((d) => d.message)));
      const allUser = (turn?.userTexts ?? []).join("\n");
      expect(
        allUser.includes("HELLO_FROM_WARP"),
        `expected imported fn return in user turn; userTexts=${JSON.stringify(
          turn?.userTexts,
        )} error=${turn?.error}`,
      ).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  // IMP-G — a warp fn that itself issues a `@`-query. Spec: that query executes
  // against the CALLING .loom's conversation. Deterministic check: the warp
  // fn's query text appears in the caller's user-turn texts.
  it("IMP-G: a warp fn's @-query attaches to the caller conversation", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "main.loom",
          text: [
            "---",
            "description: warp fn query",
            "mode: prompt",
            "---",
            'import { ask } from "./lib.warp"',
            "let answer = ask()?",
            "@`caller done ${answer}`",
          ].join("\n"),
        },
        {
          source: "project",
          path: "lib.warp",
          text: [
            "fn ask(): Result<string, QueryError> {",
            "  @`WARP_FN_QUERY_SENTINEL respond with the single word ok`",
            "}",
          ].join("\n"),
        },
      ],
      drives: ["/main"],
    });
    try {
      const turn = probe.turns[0];
      // eslint-disable-next-line no-console
      console.log("IMP-G registered:", JSON.stringify(probe.registeredNames));
      // eslint-disable-next-line no-console
      console.log("IMP-G userTexts:", JSON.stringify(turn?.userTexts));
      // eslint-disable-next-line no-console
      console.log("IMP-G error:", turn?.error);
      // eslint-disable-next-line no-console
      console.log("IMP-G diagnostics:", JSON.stringify(probe.diagnostics.map((d) => d.message)));
      const allUser = (turn?.userTexts ?? []).join("\n");
      expect(
        allUser.includes("WARP_FN_QUERY_SENTINEL"),
        `expected warp fn query text in caller user turns; userTexts=${JSON.stringify(
          turn?.userTexts,
        )} error=${turn?.error}`,
      ).toBe(true);
    } finally {
      await probe.dispose();
    }
  });
});
