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
  it("INV-5r: a callee OUTSIDE every discovery root is NOT invoked (sandbox enforced)", async () => {
    // invocation.md §Resolution / INV-1: the escaping callee is rejected. The
    // load-time containment check (`theta/load/invoke-path-escape`) un-registers
    // `escparent`, and the runtime open-time re-check is the backstop
    // (`Err(InvokeInfraError{cause:"load_failure"})`). Either way the parent body
    // never proceeds to run @`x` against the out-of-root callee.
    const { probe, turn } = await drive(
      [
        { source: "project", path: "escparent.theta", text: ["---", "mode: prompt", "---", 'let _ = invoke("../../evil.theta")?', "@`x`"].join("\n") },
        { source: "rel", path: "evil.theta", text: ["---", "mode: subagent", "---", "42"].join("\n") },
      ],
      "/escparent",
    );
    try {
      // Load-time rejection: the escaping theta did not register.
      expect(probe.registeredNames).not.toContain("escparent");
      // V4e: the error-severity load diagnostic lands on the `theta-system-note`
      // channel (`probe.systemNotes`), not `probe.diagnostics` (see probe-harness).
      expect(
        probe.systemNotes.some((n) => n.includes("resolves outside every active discovery root")),
      ).toBe(true);
      // The parent never continued past the escaping invoke.
      expect(turn.userTexts).not.toContain("x");
    } finally {
      await probe.dispose();
    }
  });

  it("INV-6: invoke<number> AJV-validates a string-returning callee's return value and aborts the parent", async () => {
    // invocation.md §Typed return; hard-ceilings.md ceiling-#4 table: the runtime
    // AJV-validates the child's return value against the annotated schema; a
    // string under `invoke<number>` is Err(InvokeInfraError{cause:
    // "return_validation"}), aborting the parent via `?` before @`got ${n}`.
    const { probe, turn } = await drive(
      [
        { source: "project", path: "retparent.theta", text: ["---", "mode: prompt", "---", 'let n: number = invoke<number>("./retstr.theta")?', "@`got ${n}`"].join("\n") },
        { source: "project", path: "retstr.theta", text: ["---", "mode: subagent", "---", '"a-string"'].join("\n") },
      ],
      "/retparent",
    );
    try {
      // The wrongly-typed value is rejected: the parent aborts before its query,
      // so "got a-string" never reaches a user turn.
      expect(turn.userTexts.join("\n")).not.toContain("got a-string");
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
        { source: "project", path: "fvparent.theta", text: ["---", "mode: prompt", "---", 'let s = invoke<string>("./fvchild.theta")?', "@`GOT=${s}`"].join("\n") },
        { source: "project", path: "fvchild.theta", text: ["---", "mode: subagent", "---", '"payload-42"'].join("\n") },
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

  it("INV-7: a bounded 40-deep invoke chain (>32) ABORTS at the depth ceiling #1 (cap 32)", async () => {
    // INV-4 / ceiling #1: the interpreter caps invoke-chain nesting at 32; frame
    // 33 raises theta/runtime/invoke-depth-exceeded. A chain of 40 query-less
    // links aborts ~frame 33, so the prompt head aborts BEFORE its
    // @`REACHED-TAIL` sentinel → userTexts does NOT contain "REACHED-TAIL". The
    // links carry no @-query, so this probe drives ZERO model turns and always
    // terminates (bounded 40 subagent spawns, aborted at frame 33).
    const files: PlantedFile[] = [
      { source: "project", path: "head.theta", text: ["---", "mode: prompt", "---", 'let _ = invoke("./link1.theta")?', "@`REACHED-TAIL`"].join("\n") },
    ];
    const N = 40;
    for (let i = 1; i < N; i++) {
      files.push({ source: "project", path: `link${i}.theta`, text: ["---", "mode: subagent", "---", `let _ = invoke("./link${i + 1}.theta")?`, "42"].join("\n") });
    }
    files.push({ source: "project", path: `link${N}.theta`, text: ["---", "mode: subagent", "---", "42"].join("\n") });

    const { probe, turn } = await drive(files, "/head");
    try {
      expect(turn.userTexts).not.toContain("REACHED-TAIL");
    } finally {
      await probe.dispose();
    }
  });

  it("INV-8: a dynamic (non-literal) invoke path is a surfaced parse error that un-registers the theta", async () => {
    // invocation.md §Resolution: "Dynamic dispatch (a runtime-computed path) is
    // not supported in theta 1.0" — surfaced as `theta/parse/unsupported-feature`
    // rather than degrading to a silent empty-path no-op. The theta un-registers.
    const { probe, turn } = await drive(
      [
        { source: "project", path: "dynparent.theta", text: ["---", "mode: prompt", "---", 'let p = "./noq.theta"', "let _ = invoke(p)?", "@`x`"].join("\n") },
        { source: "project", path: "noq.theta", text: ["---", "mode: subagent", "---", "42"].join("\n") },
      ],
      "/dynparent",
    );
    try {
      expect(probe.registeredNames).not.toContain("dynparent");
      // V4e: parse diagnostic on the `theta-system-note` channel.
      expect(
        probe.systemNotes.some(
          (n) => n.includes("unsupported syntactic feature") && n.includes("dynamic invoke path"),
        ),
      ).toBe(true);
      expect(turn.userTexts).not.toContain("x");
    } finally {
      await probe.dispose();
    }
  });

  it("INV-1r: invoke of a .thetalib path is a surfaced parse error that un-registers the theta", async () => {
    // Corrected consequence of INV-1: the .thetalib invoke path is rejected at parse
    // time (`theta/parse/invoke-non-theta-extension`), so `thetalibinv` never registers
    // and its body is never driven into a silent no-op.
    const { probe, turn } = await drive(
      [{ source: "project", path: "thetalibinv.theta", text: ["---", "mode: prompt", "---", 'let _ = invoke("./lib.thetalib")?', "@`x`"].join("\n") }],
      "/thetalibinv",
    );
    try {
      expect(probe.registeredNames).not.toContain("thetalibinv");
      // V4e: parse diagnostic on the `theta-system-note` channel.
      expect(probe.systemNotes.some((n) => n.includes("does not end in .theta"))).toBe(true);
      expect(turn.userTexts).not.toContain("x");
    } finally {
      await probe.dispose();
    }
  });

  it("INV-9: prompt→subagent isolates (child turn absent) AND prompt→prompt child IS user-visible", async () => {
    // EXPECTED (cross-mode matrix, DOC-19): prompt→subagent — only the return
    // value reaches the caller (child turns isolated); prompt→prompt — the child
    // ATTACHES to the caller's conversation and "Child's queries are
    // user-visible turns".
    // OBSERVED (D6 / FIND-S7-7): both hold. prompt→subagent isolation holds
    // (ISOLATEDKID absent — correct); prompt→prompt attaches (ATTACHEDKID IS a
    // user-visible turn in the caller transcript). The pre-fix assertion here
    // claimed prompt→prompt did NOT attach; the runtime now delivers the
    // documented behaviour (the passing `session-invoke-attach.test.ts` asserts
    // the same, positively). Inverted to match.
    const probe = await runProbe({
      provider,
      files: [
        { source: "project", path: "psub.theta", text: ["---", "mode: prompt", "---", 'let _ = invoke("./subkid.theta")?', "@`Say SUBPARENT once`"].join("\n") },
        { source: "project", path: "subkid.theta", text: ["---", "mode: subagent", "---", "@`Say ISOLATEDKID once`"].join("\n") },
        { source: "project", path: "ppro.theta", text: ["---", "mode: prompt", "---", 'let _ = invoke("./prokid.theta")?', "@`Say PROMPTPARENT once`"].join("\n") },
        { source: "project", path: "prokid.theta", text: ["---", "mode: prompt", "---", "@`Say ATTACHEDKID once`"].join("\n") },
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
      // prompt→prompt: parent turn present AND the child turn IS user-visible
      // (attaches to the caller's session — DOC-19).
      expect(pproAll).toContain("PROMPTPARENT");
      expect(pproAll).toContain("ATTACHEDKID");
    } finally {
      await probe.dispose();
    }
  });
});
