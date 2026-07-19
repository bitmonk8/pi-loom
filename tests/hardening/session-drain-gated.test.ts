// Hardening lens: DRAIN-GATED DISPATCH WRAPPER — NO REGRESSION on the normal
// steady-state slash path (guards PIC-29..32).
//
// `factory.ts` now registers a drain-state-gated dispatch WRAPPER
// (`drainGatedHandler`) on the composeInstance production path instead of a raw
// pass-through. At dispatch time the wrapper reads `registry.readDrainState()`
// and either dispatches the registry's current raw entry (arm (a)) or emits a
// `theta-system-note` (shutting-down / superseded).
//
// RISK guarded here: a false positive where a NORMAL, steady-state dispatch is
// misrouted into a drain-state note — which would break every theta slash
// command. With the wrapper LIVE this probe proves the steady-state path still
// runs end-to-end and emits NO spurious drain-state note: the theta's
// user-visible echo appears on `userTexts`, and `systemNotes` contains NEITHER
// "extension shutting down" NOR "superseded".
//
// Method: sentinel-pinned, token-bounded prompt query driven against the real
// live model. `userTexts` is the exact turn text the theta CODE computed (deterministic).
// A 429 / transport failure is a retry (not a finding); harmless teardown stderr
// (`stale ctx` / `registry-swap-failed`) is ignored.

import { describe, it, expect } from "vitest";
import { requireLiveProvider, runProbe } from "./probe-harness";
import type { ProbeResult, ProbeTurn } from "./probe-harness";

const provider = requireLiveProvider();

/** Transport-ish failures are retried, never reported as a finding. */
function transportish(s: string | undefined): boolean {
  if (s === undefined) return false;
  return /429|overloaded|transport|rate.?limit|ECONNRESET|timeout|503|529/i.test(s);
}

/** Drive one probe; retry once on a transport-ish failure. */
async function drive(
  make: () => Promise<ProbeResult>,
): Promise<{ turn: ProbeTurn | undefined; probe: ProbeResult }> {
  let probe = await make();
  let turn = probe.turns[probe.turns.length - 1];
  if (turn !== undefined && transportish(turn.error)) {
    await probe.dispose();
    probe = await make();
    turn = probe.turns[probe.turns.length - 1];
  }
  return { turn, probe };
}

describe("drain-gated dispatch wrapper — steady-state slash path unregressed (PIC-29..32)", () => {
  it(
    "a normal steady-state prompt dispatch runs end-to-end with NO spurious drain-state note",
    { retry: 1, timeout: 180000 },
    async () => {
      const { turn, probe } = await drive(() =>
        runProbe({
          provider,
          files: [
            {
              source: "project",
              path: "dgok.theta",
              text: [
                "---",
                "description: dgok",
                "mode: prompt",
                "---",
                "@`DRAIN_PROBE reply with exactly the token: PONG`",
              ].join("\n"),
            },
          ],
          drives: ["/dgok"],
        }),
      );
      try {
        const userTexts = turn?.userTexts ?? [];
        const systemNotes = turn?.systemNotes ?? [];
        // eslint-disable-next-line no-console
        console.log("DRAIN-GATED userTexts:", JSON.stringify(userTexts));
        // eslint-disable-next-line no-console
        console.log("DRAIN-GATED systemNotes:", JSON.stringify(systemNotes));
        // eslint-disable-next-line no-console
        console.log("DRAIN-GATED error:", turn?.error);

        // The theta registered and dispatched through the wrapper (arm (a)).
        expect(probe.registeredNames).toContain("dgok");
        // The theta's user-visible turn text was computed and sent (the wrapper
        // dispatched the registry's raw run, not a drain-state note).
        expect(userTexts.join("\n")).toContain("DRAIN_PROBE");
        // No spurious drain-state note leaked onto the user-facing channel.
        expect(systemNotes.some((n) => n.includes("extension shutting down"))).toBe(false);
        expect(systemNotes.some((n) => n.includes("superseded"))).toBe(false);
        // No error escaped the drive.
        expect(turn?.error).toBeUndefined();
      } finally {
        await probe.dispose();
      }
    },
  );
});
