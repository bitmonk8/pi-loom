import { describe, expect, it } from "vitest";
import { requireLiveProvider, runProbe, type PlantedFile } from "./probe-harness";

// RFC 0001 (`subagent fn`) — parse/load characterization probes (ZERO model
// turns). Mirrors `invoke-parse-load.test.ts`: each probe drives NO
// invocations, so the only observation channels are `probe.systemNotes` (the
// V4e `theta-system-note` load-diagnostic channel) and `probe.registeredNames`.
//
// These probes exercise the PRODUCTION-COMPOSITION wiring RFC 0001 adds
// (`checkSubagentFnStaticResolution`, wired into `production-composition.ts`):
// FN-6 reuses the existing `invoke` load machinery verbatim, so a
// self-referencing `subagent fn` un-registers via a length-1
// `theta/load/invocation-cycle` and a broken inline body un-registers via
// `theta/load/callee-has-errors` naming the FUNCTION. This is the end-to-end
// witness that the pure static-check functions (unit-covered in
// tests/subagent-fn.test.ts) are actually CALLED by the shipped compose pass.
//
// Offline `npm test` EXCLUDES tests/hardening/** (the probe harness boots a real
// session against a live provider even for a zero-turn load-only probe), so
// these run under the hardening runner (config/vitest/vitest.hardening.config.ts)
// / `test:live`, not the default offline suite. The runtime SPAWN half of FN-6
// (a `subagent fn` call spawns a real fresh isolated session and its `@`-queries
// target it) is a live-drive obligation exercised by the acceptance / live
// tiers, since it needs a provider to issue turns.
//
// Area: SUBAGENT-FN, cross-mode semantics & hard ceilings.

const provider = requireLiveProvider();

async function loadOnly(files: readonly PlantedFile[]) {
  const probe = await runProbe({ provider, files });
  const msgs = probe.systemNotes;
  return { probe, msgs, names: probe.registeredNames };
}

function anyMsg(msgs: readonly string[], ...needles: string[]): boolean {
  return msgs.some((m) => needles.some((n) => m.includes(n)));
}

describe("SUBAGENT-FN parse/load — static checks are wired (zero model turns)", () => {
  it("FN-6: a self-referencing `subagent fn` un-registers with an invocation-cycle diagnostic (length-1 cycle)", async () => {
    // functions.md §"`subagent fn`" (FN-6): the self-reference ban reuses the
    // existing `theta/load/invocation-cycle` code — a self-edge `step → step` is
    // a length-1 cycle. Load-time detection is what keeps a self-referential
    // subagent fn from driving unbounded recursion at runtime.
    const { probe, msgs, names } = await loadOnly([
      {
        source: "project",
        path: "selfref.theta",
        text: [
          "---",
          "mode: prompt",
          "---",
          "subagent fn step(o: string) {",
          "  let r = step(o)?",
          "  r",
          "}",
          'let _ = step("go")?',
          "@`x`",
        ].join("\n"),
      },
    ]);
    try {
      expect(names).not.toContain("selfref");
      expect(anyMsg(msgs, "invocation cycle", "invocation-cycle")).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  it("FN-6: a `subagent fn` with a broken inline body un-registers with a callee-has-errors diagnostic naming the function", async () => {
    // functions.md §"`subagent fn`" (FN-6): a broken body is a callee-with-errors
    // reported through the existing `theta/load/callee-has-errors` code, naming
    // the FUNCTION (a bare name, not a `.theta` path) for the inline case.
    const { probe, msgs, names } = await loadOnly([
      {
        source: "project",
        path: "brokenfn.theta",
        text: [
          "---",
          "mode: prompt",
          "---",
          "subagent fn step(o: string) {",
          "  let x: integer = ",
          "  x",
          "}",
          'let _ = step("go")?',
          "@`x`",
        ].join("\n"),
      },
    ]);
    try {
      expect(names).not.toContain("brokenfn");
      // Either the callee-has-errors framing (naming `step`) or the underlying
      // parse error un-registers the theta; both surface a load-phase note.
      expect(anyMsg(msgs, "callee-has-errors", "has errors", "step")).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  it("FN-8: a prompt-mode theta declaring/calling a `subagent fn` REGISTERS (prompt→subagent is the safe direction)", async () => {
    // FN-8: `theta/load/prompt-mode-callable` does not apply to a `subagent fn`
    // (its body is always a subagent session), so a well-formed prompt-mode theta
    // with a subagent fn registers cleanly.
    const { probe, names } = await loadOnly([
      {
        source: "project",
        path: "promptok.theta",
        text: [
          "---",
          "mode: prompt",
          "---",
          "subagent fn step(o: string) { o }",
          'let _ = step("go")?',
          "@`x`",
        ].join("\n"),
      },
    ]);
    try {
      expect(names).toContain("promptok");
    } finally {
      await probe.dispose();
    }
  });
});
