import { describe, it, expect } from "vitest";
import { requireLiveProvider, runProbe } from "./probe-harness";

// IMPORTS & .thetalib MODULES — using imported functions.
//
// Spec guide.md §".theta versus .thetalib" + imports.md §.thetalib file rules: an
// imported `fn` is callable from the importing `.theta`, and a query inside an
// imported thetalib function executes against the *calling* `.theta`'s conversation.
// These probes drive the shipped extension; the fn-usage checks are effectively
// zero-token if the symbol is unresolved (evaluation throws before any model
// turn), and pinned deterministically via `turn.userTexts` otherwise.

describe("imports & .thetalib — imported functions", () => {
  const provider = requireLiveProvider();

  // IMP-F — call an imported (pure) thetalib fn and interpolate its return value
  // into a query. Deterministic observation: the computed user-turn text should
  // contain the fn's return value.
  it("IMP-F: an imported pure thetalib fn is callable / usable in a query", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "main.theta",
          text: [
            "---",
            "description: use imported fn",
            "mode: prompt",
            "---",
            'import { greeting } from "./lib.thetalib"',
            "@`MARK ${greeting()} say ok`",
          ].join("\n"),
        },
        {
          source: "project",
          path: "lib.thetalib",
          text: [
            "fn greeting(): string {",
            '  "HELLO_FROM_THETALIB"',
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
        allUser.includes("HELLO_FROM_THETALIB"),
        `expected imported fn return in user turn; userTexts=${JSON.stringify(
          turn?.userTexts,
        )} error=${turn?.error}`,
      ).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  // IMP-G — a thetalib fn that itself issues a `@`-query. Spec: that query executes
  // against the CALLING .theta's conversation. Deterministic check: the thetalib
  // fn's query text appears in the caller's user-turn texts.
  it("IMP-G: a thetalib fn's @-query attaches to the caller conversation", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "main.theta",
          text: [
            "---",
            "description: thetalib fn query",
            "mode: prompt",
            "---",
            'import { ask } from "./lib.thetalib"',
            "let answer = ask()?",
            "@`caller done ${answer}`",
          ].join("\n"),
        },
        {
          source: "project",
          path: "lib.thetalib",
          text: [
            "fn ask(): Result<string, QueryError> {",
            "  @`THETALIB_FN_QUERY_SENTINEL respond with the single word ok`",
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
        allUser.includes("THETALIB_FN_QUERY_SENTINEL"),
        `expected thetalib fn query text in caller user turns; userTexts=${JSON.stringify(
          turn?.userTexts,
        )} error=${turn?.error}`,
      ).toBe(true);
    } finally {
      await probe.dispose();
    }
  });
});
