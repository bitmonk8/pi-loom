// Hardening lens: BIND_CONTEXT: SESSION — the just-landed feature that grounds
// the slash-argument binder in a "Recent session context" block (the most
// recent live-session turns, ≤20 turns / ≤8000 tokens, rendered as a compact
// transcript and prepended to the binder prompt). Previously `bind_context` was
// parsed then discarded (the feature no-oped); now the binder can resolve a
// parameter from prior conversation rather than only the explicit slash args.
//
// Harness idiom: identical to session-binder.test.ts — real shipped extension,
// real live model, deterministic observation via `userTexts` (the loom body's
// computed query) + `systemNotes` (BND-1 success echo). A genuine binder pass
// needs a resolvable binder model (looms.binderModel). Multiple `drives` in ONE
// runProbe share the same in-memory session, so turns accumulate — this is how
// prior context is established.
//
// IMPORTANT — defeating the single-string bypass: a loom whose params are a
// SINGLE defaultless `string` is classified `single-string-bypass` at LOAD time
// (src/binder/binder-envelope.ts), which SKIPS the binder entirely (the whole
// arg string binds verbatim). Since `bind_context: session` grounding lives
// INSIDE the binder path, such a loom can never exercise the feature. Every loom
// below therefore carries a SECOND, defaulted param so the binder actually runs.
//
// Transport discipline: a 429/overloaded/transport error is a retry, never a
// finding. Replies are pinned to short sentinels to stay token-bounded.

import { describe, expect, it } from "vitest";
import { requireLiveProvider, runProbe, type PlantedFile, type ProbeResult } from "./probe-harness";

const provider = requireLiveProvider();

// Pin the provider-qualified binder model (same idiom as session-binder.test.ts).
const binderModelSettings = { looms: { binderModel: "anthropic/claude-haiku-4-5" } };

function transportish(s: string | undefined): boolean {
  if (s === undefined) return false;
  return /429|overloaded|transport|rate.?limit|ECONNRESET|timeout|503|529/i.test(s);
}

/** Run a probe; retry once if ANY driven turn had a transport-ish error. */
async function drive(make: () => Promise<ProbeResult>): Promise<ProbeResult> {
  let probe = await make();
  if (probe.turns.some((t) => transportish(t.error))) {
    await probe.dispose();
    probe = await make();
  }
  return probe;
}

function loom(name: string, body: string, extraFm: readonly string[] = []): PlantedFile {
  return {
    source: "project",
    path: `${name}.loom`,
    text: ["---", `description: ${name}`, "mode: prompt", ...extraFm, "---", body].join("\n"),
  };
}

const bodyLine = (probe: ProbeResult, i: number): string => probe.turns[i]?.userTexts.join("\n") ?? "";

describe("bind_context: session — binder grounded in recent session context", () => {
  // (1) FEATURE: the binder resolves a param from PRIOR session context. /setctx
  // pins "The selected city is Zurich." into the transcript; /plan (bind_context:
  // session) is invoked with args that deliberately OMIT "Zurich" — the binder
  // must pull it from the session-context block established by /setctx. The
  // second, defaulted `detail` param defeats the single-string bypass so the
  // binder actually runs (and receives the context block).
  it(
    "bind_context: session — binder resolves a param from prior session context",
    { retry: 1, timeout: 240000 },
    async () => {
      const probe = await drive(() =>
        runProbe({
          provider,
          files: [
            loom("setctx", "@`Reply with exactly: The selected city is Zurich.`"),
            loom("plan", "@`Reply with exactly: PLAN city=${city} detail=${detail}`", [
              "bind_context: session",
              "params:",
              "  city: string",
              '  detail: string = "brief"',
            ]),
          ],
          projectSettings: binderModelSettings,
          drives: ["/setctx", "/plan make a plan for the previously selected city"],
        }),
      );
      try {
        for (const t of probe.turns) {
          if (transportish(t.error)) throw new Error(`transport (retried): ${t.error}`);
        }
        const plan = probe.turns[1];
        console.log("BINDCTX setctx assistantText:", JSON.stringify(probe.turns[0]?.assistantText));
        console.log("BINDCTX plan userTexts:", JSON.stringify(plan?.userTexts));
        console.log("BINDCTX plan systemNotes:", JSON.stringify(plan?.systemNotes));
        console.log("BINDCTX plan error:", JSON.stringify(plan?.error));
        if (plan?.error !== undefined) throw new Error(`plan drive error: ${plan.error}`);
        // Args did NOT contain "Zurich": the binder used session context iff
        // Zurich reaches the body OR the success echo note names it.
        const planBody = bodyLine(probe, 1);
        const planNotes = (plan?.systemNotes ?? []).join("\n");
        const boundInBody = /zurich/i.test(planBody);
        const boundInNote = /running \/plan:/i.test(planNotes) && /zurich/i.test(planNotes);
        expect(boundInBody || boundInNote).toBe(true);
      } finally {
        await probe.dispose();
      }
    },
  );

  // (2) NO-REGRESSION: bind_context: session must not break a normally-bindable
  // slash. Explicit args still bind even with session context on; here the
  // session has no prior turns → BNDR-7i void-truncation (no context block),
  // and the binder runs (two params) and binds the explicit `name`.
  it(
    "no-regression: bind_context: session binds explicit args (empty-session void truncation)",
    { retry: 1, timeout: 180000 },
    async () => {
      const probe = await drive(() =>
        runProbe({
          provider,
          files: [
            loom("greet", "@`Reply with exactly: HELLO name=${name} punct=${punct}`", [
              "bind_context: session",
              "params:",
              "  name: string",
              '  punct: string = "!"',
            ]),
          ],
          projectSettings: binderModelSettings,
          drives: ["/greet the name is Alice"],
        }),
      );
      try {
        const t = probe.turns[0];
        if (transportish(t?.error)) throw new Error(`transport (retried): ${t?.error}`);
        console.log("BINDCTX greet userTexts:", JSON.stringify(t?.userTexts));
        console.log("BINDCTX greet systemNotes:", JSON.stringify(t?.systemNotes));
        console.log("BINDCTX greet error:", JSON.stringify(t?.error));
        if (t?.error !== undefined) throw new Error(`greet drive error: ${t.error}`);
        expect(bodyLine(probe, 0)).toMatch(/HELLO name=Alice/i);
      } finally {
        await probe.dispose();
      }
    },
  );
});
