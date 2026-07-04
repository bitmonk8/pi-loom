import { describe, expect, it } from "vitest";
import { requireLiveProvider, runProbe, type PlantedFile } from "./probe-harness";

// INVOKE — runtime, ceiling, cross-mode & final-value characterization probes.
//
// Deterministic channels: `turn.userTexts` (code-computed user-turn text) and
// `turn.error`. Where a bug lets a body reach a sentinel query, we assert the
// sentinel appears in `userTexts`; where a bug silently aborts a body, we assert
// `userTexts` is empty with no `error`. Model turns are kept minimal.
//
// Area: INVOKE, cross-mode semantics & hard ceilings.

const provider = requireLiveProvider();

async function drive(files: readonly PlantedFile[], invocation: string, timeoutNote?: string) {
  const probe = await runProbe({ provider, files, drives: [invocation] });
  return { probe, turn: probe.turns[0], _note: timeoutNote };
}

describe("INVOKE runtime / ceilings / cross-mode", () => {
  it("INV-5r: a callee OUTSIDE every discovery root is invoked successfully (sandbox not enforced)", async () => {
    // EXPECTED (invocation.md §Resolution, INV-1): the realpath+containment
    // check re-runs when the runtime opens the callee; an escaping callee must
    // fail closed with Err(InvokeInfraError{cause:"load_failure"}). The `?` would
    // then abort the parent BEFORE its @`x` query.
    // OBSERVED: invoke of <cwd>/evil.loom (outside .pi/looms) SUCCEEDS and the
    // parent proceeds to run @`x` — the containment guard is enforced neither at
    // load nor at runtime.
    const { probe, turn } = await drive(
      [
        { source: "project", path: "escparent.loom", text: ["---", "mode: prompt", "---", 'let _ = invoke("../../evil.loom")?', "@`x`"].join("\n") },
        { source: "rel", path: "evil.loom", text: ["---", "mode: subagent", "---", "42"].join("\n") },
      ],
      "/escparent",
    );
    try {
      expect(turn.error).toBeUndefined();
      expect(turn.userTexts).toContain("x"); // parent body continued past the escaping invoke
    } finally {
      await probe.dispose();
    }
  });

  it("INV-6: invoke<number> does NOT AJV-validate a string-returning callee's return value", async () => {
    // EXPECTED (invocation.md §Typed return; hard-ceilings.md ceiling-#4 table):
    // the runtime AJV-validates the child's return value against the annotated
    // schema; a string under `invoke<number>` must be
    // Err(InvokeInfraError{cause:"return_validation"}), aborting the parent
    // before @`got ${n}`.
    // OBSERVED: the string "a-string" flows straight into `n` and the parent
    // renders "got a-string" — the typed-invoke return check is absent.
    const { probe, turn } = await drive(
      [
        { source: "project", path: "retparent.loom", text: ["---", "mode: prompt", "---", 'let n: number = invoke<number>("./retstr.loom")?', "@`got ${n}`"].join("\n") },
        { source: "project", path: "retstr.loom", text: ["---", "mode: subagent", "---", '"a-string"'].join("\n") },
      ],
      "/retparent",
    );
    try {
      expect(turn.error).toBeUndefined();
      expect(turn.userTexts.join("\n")).toContain("got a-string");
    } finally {
      await probe.dispose();
    }
  });

  it("INV-6-positive: a subagent callee's final value DOES propagate across the boundary", async () => {
    // Positive control for FN-5: the callee's literal final value crosses the
    // subagent boundary as the Ok payload (this part works — see INV-6 for the
    // missing validation). Asserted via the same "got a-string" observation.
    // (Shares the retparent shape; kept as an explicit positive assertion.)
    const { probe, turn } = await drive(
      [
        { source: "project", path: "fvparent.loom", text: ["---", "mode: prompt", "---", 'let s = invoke<string>("./fvchild.loom")?', "@`GOT=${s}`"].join("\n") },
        { source: "project", path: "fvchild.loom", text: ["---", "mode: subagent", "---", '"payload-42"'].join("\n") },
      ],
      "/fvparent",
    );
    try {
      expect(turn.error).toBeUndefined();
      expect(turn.userTexts.join("\n")).toContain("GOT=payload-42");
    } finally {
      await probe.dispose();
    }
  });

  it("INV-7: a bounded 40-deep invoke chain (>32) runs to completion — depth ceiling #1 not enforced", async () => {
    // EXPECTED (INV-4 / ceiling #1): the interpreter caps invoke-chain nesting
    // at 32; frame 33 raises loom/runtime/invoke-depth-exceeded. A chain of 40
    // query-less links must abort ~frame 33, so the prompt head aborts BEFORE
    // its @`REACHED-TAIL` sentinel → userTexts == [].
    // OBSERVED: the full 40-deep chain returns and the head reaches its sentinel
    // → userTexts contains "REACHED-TAIL". No cap fires. (Consequence: the
    // self-cycle of INV-4b recurses UNBOUNDED and hangs the host — that loom is
    // deliberately not driven; this bounded chain reproduces the missing cap
    // while still terminating.)
    const files: PlantedFile[] = [
      { source: "project", path: "head.loom", text: ["---", "mode: prompt", "---", 'let _ = invoke("./link1.loom")?', "@`REACHED-TAIL`"].join("\n") },
    ];
    const N = 40;
    for (let i = 1; i < N; i++) {
      files.push({ source: "project", path: `link${i}.loom`, text: ["---", "mode: subagent", "---", `let _ = invoke("./link${i + 1}.loom")?`, "42"].join("\n") });
    }
    files.push({ source: "project", path: `link${N}.loom`, text: ["---", "mode: subagent", "---", "42"].join("\n") });

    const { probe, turn } = await drive(files, "/head");
    try {
      expect(turn.error).toBeUndefined();
      expect(turn.userTexts).toContain("REACHED-TAIL");
    } finally {
      await probe.dispose();
    }
  });

  it("INV-8: a dynamic (non-literal) invoke path silently aborts the body with no diagnostic", async () => {
    // EXPECTED (invocation.md §Resolution): "Dynamic dispatch (a runtime-computed
    // path) is not supported in loom 1.0" — this must be a clear, surfaced error.
    // OBSERVED: the parser extracts an empty path (first arg is not a string
    // literal), and at runtime invoke("") aborts the body before @`x` with NO
    // captured error and NO diagnostic (silent). The sentinel query never runs.
    const { probe, turn } = await drive(
      [
        { source: "project", path: "dynparent.loom", text: ["---", "mode: prompt", "---", 'let p = "./noq.loom"', "let _ = invoke(p)?", "@`x`"].join("\n") },
        { source: "project", path: "noq.loom", text: ["---", "mode: subagent", "---", "42"].join("\n") },
      ],
      "/dynparent",
    );
    try {
      expect(turn.error).toBeUndefined();
      expect(turn.userTexts).toEqual([]); // body aborted at invoke(""), silently
      expect(probe.diagnostics).toEqual([]);
    } finally {
      await probe.dispose();
    }
  });

  it("INV-1r: invoke of a .warp path silently aborts the body at runtime with no diagnostic", async () => {
    // Runtime consequence of INV-1: with no parse-time rejection, the body runs
    // and invoke("./lib.warp") aborts it before @`x` with no captured error and
    // no diagnostic — a silent no-op failure.
    const { probe, turn } = await drive(
      [{ source: "project", path: "warpinv.loom", text: ["---", "mode: prompt", "---", 'let _ = invoke("./lib.warp")?', "@`x`"].join("\n") }],
      "/warpinv",
    );
    try {
      expect(turn.error).toBeUndefined();
      expect(turn.userTexts).toEqual([]);
      expect(probe.diagnostics).toEqual([]);
    } finally {
      await probe.dispose();
    }
  });

  it("INV-9: prompt→subagent isolates (child turn absent) but prompt→prompt child is NOT user-visible", async () => {
    // EXPECTED (cross-mode matrix): prompt→subagent — only the return value
    // reaches the caller (child turns isolated); prompt→prompt — the child
    // ATTACHES to the caller's conversation and "Child's queries are
    // user-visible turns".
    // OBSERVED: prompt→subagent isolation holds (ISOLATEDKID absent — correct).
    // prompt→prompt does NOT attach: the child's ATTACHEDKID query is neither in
    // the caller transcript (userTexts) nor streamed on the caller session — the
    // documented prompt→prompt user-visibility is not delivered.
    const probe = await runProbe({
      provider,
      files: [
        { source: "project", path: "psub.loom", text: ["---", "mode: prompt", "---", 'let _ = invoke("./subkid.loom")?', "@`Say SUBPARENT once`"].join("\n") },
        { source: "project", path: "subkid.loom", text: ["---", "mode: subagent", "---", "@`Say ISOLATEDKID once`"].join("\n") },
        { source: "project", path: "ppro.loom", text: ["---", "mode: prompt", "---", 'let _ = invoke("./prokid.loom")?', "@`Say PROMPTPARENT once`"].join("\n") },
        { source: "project", path: "prokid.loom", text: ["---", "mode: prompt", "---", "@`Say ATTACHEDKID once`"].join("\n") },
      ],
      drives: ["/psub", "/ppro"],
    });
    try {
      const psub = probe.turns[0];
      const ppro = probe.turns[1];
      const psubAll = psub.userTexts.join("\n");
      const pproAll = ppro.userTexts.join("\n");
      // prompt→subagent: child isolated (correct).
      expect(psubAll).toContain("SUBPARENT");
      expect(psubAll).not.toContain("ISOLATEDKID");
      // prompt→prompt: parent turn present, but child turn NOT user-visible (bug).
      expect(pproAll).toContain("PROMPTPARENT");
      expect(pproAll).not.toContain("ATTACHEDKID");
      expect(ppro.assistantText).not.toContain("ATTACHEDKID");
    } finally {
      await probe.dispose();
    }
  });
});
