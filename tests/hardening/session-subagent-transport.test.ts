// Hardening lens: SUBAGENT-MODE @-QUERY TRANSPORT-ERROR CLASSIFICATION — NO
// REGRESSION on the SUCCESS path (guards PIC-50 / PIC-51 for subagent mode).
//
// The subagent-mode `@`-query driver (`SubagentQueryModel`) now probes each
// driven `complete()` turn's trailing assistant `stopReason` (PIC-51) and maps a
// `stopReason:"error"` turn to the shared `transport` query outcome → host
// `Err(TransportError)` instead of `Ok(text)`. It also maps a non-cancel
// `complete()` reject to `Err(TransportError)` (PIC-50) — mirror-symmetric with
// the prompt-mode fix (tests/hardening/session-prompt-transport.test.ts).
//
// RISK guarded here: a false positive where a NORMAL, successful subagent turn
// (stopReason "end_turn"/"stop") is misclassified as a transport error, which
// would break every subagent loom. A real transport error cannot be forced
// deterministically (that path is proven by the deterministic unit tests in
// tests/production-subagent-query-model.test.ts), so this probe only proves the
// SUCCESS path is unregressed: a successful subagent query must still bind Ok
// and let its return value cross the invoke boundary, and no transport error
// must escape.
//
// Method: a prompt PARENT `invoke`s a subagent-mode child whose `@`-query echoes
// a sentinel; the child returns that value and the parent interpolates it into
// its OWN observable final query text (the deterministic per-drive `userTexts`
// channel — computed by loom CODE before send). The subagent transcript is
// private (SLSH-2), so this parent-interpolation is the only deterministic
// observation of the child's bound value. The sentinel's presence proves the
// subagent query bound Ok and the `invoke(...)?` did NOT abort on a spurious
// transport `Err`.

import { describe, it, expect } from "vitest";
import { requireLiveProvider, runProbe } from "./probe-harness";
import type { ProbeResult, ProbeTurn } from "./probe-harness";

const provider = requireLiveProvider();

function transportish(s: string | undefined): boolean {
  if (s === undefined) return false;
  return /429|overloaded|transport|rate.?limit|ECONNRESET|timeout|503|529/i.test(s);
}

/** Drive one probe; retry once on a transport-ish failure (a 429 is not a finding). */
async function drive(
  make: () => Promise<ProbeResult>,
): Promise<{ turn: ProbeTurn | undefined; text: string; probe: ProbeResult }> {
  let probe = await make();
  let turn = probe.turns[probe.turns.length - 1];
  if (turn !== undefined && transportish(turn.error)) {
    await probe.dispose();
    probe = await make();
    turn = probe.turns[probe.turns.length - 1];
  }
  return { turn, text: (turn?.userTexts ?? []).join("\n"), probe };
}

const loom = (front: string[], body: string): string => ["---", ...front, "---", body].join("\n");

describe("subagent-mode @-query transport classification — success path unregressed (PIC-50 / PIC-51)", () => {
  it(
    "untyped subagent query success is unregressed (Ok(text) crosses invoke, no spurious transport Err)",
    { retry: 1, timeout: 180000 },
    async () => {
      const files = [
        {
          source: "project" as const,
          path: "stu-parent.loom",
          text: loom(
            ["description: x", "mode: prompt"],
            [
              'let r: string = invoke<string>("./stu-child.loom")?',
              "@`SUBTU r=${r}|reply with exactly: OK`",
            ].join("\n"),
          ),
        },
        {
          source: "project" as const,
          path: "stu-child.loom",
          text: loom(
            ["description: x", "mode: subagent"],
            "@`Reply with exactly the token and nothing else: SUBPONG777`",
          ),
        },
      ];
      const { turn, text, probe } = await drive(() =>
        runProbe({ provider, files, drives: ["/stu-parent"] }),
      );
      try {
        // eslint-disable-next-line no-console
        console.log("PIC-51 subagent untyped parent userTexts:", JSON.stringify(text));
        // eslint-disable-next-line no-console
        console.log("PIC-51 subagent untyped error:", turn?.error);
        // The parent's second query issued — proves the child subagent query
        // bound Ok and `invoke(...)?` did not abort on a spurious transport Err.
        expect(text).toContain("SUBTU r=");
        // The child's echoed sentinel crossed the invoke boundary (Ok(text), not
        // a masked/aborted transport Err).
        expect(text).toContain("SUBPONG777");
        // No transport error escaped the drive.
        expect(turn?.error).toBeUndefined();
      } finally {
        await probe.dispose();
      }
    },
  );

  it(
    "typed subagent query success is unregressed (structured value crosses invoke, no spurious transport Err)",
    { retry: 1, timeout: 180000 },
    async () => {
      const files = [
        {
          source: "project" as const,
          path: "stt-parent.loom",
          text: loom(
            ["description: x", "mode: prompt"],
            [
              'let r: string = invoke<string>("./stt-child.loom")?',
              "@`SUBTT token=${r}|reply with exactly: OK`",
            ].join("\n"),
          ),
        },
        {
          source: "project" as const,
          path: "stt-child.loom",
          text: loom(
            ["description: x", "mode: subagent"],
            [
              "schema Ans { token: string }",
              "let a: Ans = @<Ans>`Return JSON only. Set token to the exact string SUBPONG777.`?",
              "a.token",
            ].join("\n"),
          ),
        },
      ];
      const { turn, text, probe } = await drive(() =>
        runProbe({ provider, files, drives: ["/stt-parent"] }),
      );
      try {
        // eslint-disable-next-line no-console
        console.log("PIC-51 subagent typed parent userTexts:", JSON.stringify(text));
        // eslint-disable-next-line no-console
        console.log("PIC-51 subagent typed error:", turn?.error);
        // The parent's second query issued with the child's structured value —
        // proves the typed forced-respond turn bound a value (NOT misclassified
        // as a transport error) and it crossed the invoke boundary (FN-5).
        expect(text).toContain("SUBTT token=");
        expect(text).toContain("SUBPONG777");
        expect(turn?.error).toBeUndefined();
      } finally {
        await probe.dispose();
      }
    },
  );
});
