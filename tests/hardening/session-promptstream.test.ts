// Hardening lens: PROMPT-MODE USER-VISIBLE STREAMING FOR EVERY QUERY (SLSH-2).
//
// This probe pins the QTL-1 fix: in prompt mode, assistant tokens for EVERY
// query (not just the first) stream into the user's transcript in real time.
// The pre-fix behaviour drove only the FIRST non-short-circuit query as a
// user-visible streamed turn and ran every subsequent query off-session
// (`complete()`, no transcript card), so a body's trailing query never appeared
// in the transcript (and the off-session path resolved no auth, so a chained
// query could return an empty error-stop reply).
//
// Method: a single prompt-mode loom issues TWO sentinel-pinned queries in its
// body. The harness `assistantText` channel accumulates streamed `text_delta`
// events off the live session; under SLSH-2 BOTH replies stream, so both
// sentinels must appear and both turns must be non-empty. Sequential execution
// (the executor awaits each query) means there is no stream-interleaving risk —
// the original DIVERGENCE rationale does not hold.
//
// Findings: QTL-1 (tests/hardening/cli-findings/queries-toolloop.md).

import { describe, it, expect } from "vitest";
import { requireLiveProvider, runProbe } from "./probe-harness";
import type { PlantedFile } from "./probe-harness";

const provider = requireLiveProvider();

const F = (path: string, lines: string[]): PlantedFile => ({
  source: "project",
  path,
  text: lines.join("\n"),
});

describe("prompt-mode user-visible streaming for every query (SLSH-2 / QTL-1)", () => {
  it(
    "QTL-1 FIXED: both queries in a prompt-mode body stream into the transcript",
    { retry: 1, timeout: 180000 },
    async () => {
      const probe = await runProbe({
        provider,
        files: [
          F("twostream.loom", [
            "---",
            "description: twostream",
            "mode: prompt",
            "---",
            "@`Reply with exactly: AAA`",
            "@`Reply with exactly: BBB`",
          ]),
        ],
        drives: ["/twostream"],
      });
      try {
        const t = probe.turns[0];
        console.log("QTL-1 assistantText:", JSON.stringify(t.assistantText));
        console.log("QTL-1 userTexts:", JSON.stringify(t.userTexts));
        console.log("QTL-1 error:", t.error);
        // BOTH assistant replies streamed into the transcript (pre-fix: only AAA).
        expect(t.assistantText).toContain("AAA");
        expect(t.assistantText).toContain("BBB");
        // BOTH queries dispatched a real turn (not an empty off-session stop).
        expect(t.userTexts.join("\n")).toContain("Reply with exactly: AAA");
        expect(t.userTexts.join("\n")).toContain("Reply with exactly: BBB");
        expect(t.error).toBeUndefined();
      } finally {
        await probe.dispose();
      }
    },
  );
});
