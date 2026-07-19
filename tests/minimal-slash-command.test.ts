import { describe, expect, it } from "vitest";
import { createThetaExtension } from "../src/extension/factory";
import { buildMinimalTheta } from "../src/mvp/minimal-theta";
import { SessionDouble } from "./harness/index";

// M-T — failing tests for the minimal end-to-end `.theta` slash command. These
// pin SLSH-2's MVP happy path: a single in-memory `.theta` source is discovered,
// registered as a slash command, dispatched, its `mode:` frontmatter parsed,
// and its single untyped `@`-query issued as one prompt-mode turn whose streamed
// assistant response appends as a single appended turn to the caller's
// conversation. The `buildMinimalTheta` seam is stubbed inert until `M` lands the
// prompt-mode drive, so these assertions red on the absent pipeline.
//
// The harness path used below is the H4a end-to-end harness surface
// (`SessionDouble` + `createThetaExtension` + `fireSessionStart` + `dispatch`):
// the in-memory fixture-supply mechanism feeds the source-derived fixture
// through `ThetaExtensionDeps.fixtures`, so no ambient `src/**` filesystem read
// and no `FileSystem` seam is involved.

/** Assemble the minimal prompt-mode `.theta` source for a single untyped query. */
function promptTheta(queryLiteral: string): string {
  return ["---", "mode: prompt", "---", "@`" + queryLiteral + "`", ""].join(
    "\n",
  );
}

describe("M-T — minimal end-to-end .theta slash command (SLSH-2)", () => {
  it("SLSH-2: a dispatched prompt-mode theta issues one untyped @-query and streams its assistant response into the user session as one appended turn", async () => {
    const double = new SessionDouble();
    // The model's streamed assistant response for the single driven turn.
    double.programResponse(["Hel", "lo, ", "world."]);

    const fixture = buildMinimalTheta(
      { slashName: "greet", source: promptTheta("Greet the user.") },
      double.pi,
    );
    createThetaExtension({ fixtures: [fixture] })(double.pi);
    double.fireSessionStart();

    // Discovered source registered as a slash command (the registerCommand seam).
    expect(double.commands.has("greet")).toBe(true);

    await double.dispatch("greet", "");

    // Exactly one untyped @-query was issued as a user turn carrying the
    // rendered query-template literal.
    const userTurns = double.transcript.filter((m) => m.role === "user");
    expect(userTurns).toHaveLength(1);
    expect(userTurns[0]?.text).toBe("Greet the user.");

    // The assistant response streamed (tokens observed) and committed as one
    // appended prompt-mode turn carrying the accumulated text.
    expect(
      double.events.filter((e) => e === "stream-token").length,
    ).toBeGreaterThan(0);
    const assistantTurns = double.transcript.filter(
      (m) => m.role === "assistant",
    );
    expect(assistantTurns).toHaveLength(1);
    expect(assistantTurns[0]?.text).toBe("Hello, world.");
    expect(assistantTurns[0]?.streaming).toBe(false);
  });

  it("SLSH-2: running the fixture theta through the harness produces exactly one appended turn and no diagnostic", async () => {
    const double = new SessionDouble();
    double.programResponse(["acknowledged"]);

    const fixture = buildMinimalTheta(
      { slashName: "do-thing", source: promptTheta("Do the thing.") },
      double.pi,
    );
    createThetaExtension({ fixtures: [fixture] })(double.pi);
    double.fireSessionStart();

    await double.dispatch("do-thing", "");

    // Exactly one appended turn: one user query + its one streamed assistant
    // response, and nothing more.
    expect(double.transcript).toHaveLength(2);
    expect(double.transcript.map((m) => m.role)).toEqual([
      "user",
      "assistant",
    ]);

    // The happy path surfaces no diagnostic (no `theta-system-note` emitted via
    // the `pi.sendMessage` diagnostics channel).
    expect(double.systemNotes).toHaveLength(0);
  });
});
