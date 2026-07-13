import { describe, expect, it } from "vitest";
import { requireLiveProvider, runProbe, type PlantedFile } from "./probe-harness";

// INVOKE — parse/load characterization probes (ZERO model turns).
//
// Each probe drives NO invocations, so the only observation channels are
// `probe.systemNotes` (the shipped V4e `loom-system-note` load-diagnostic
// channel; `probe.diagnostics` / ctx.ui.notify is empty at load time — see the
// probe-harness header) and `probe.registeredNames`.
// Per invocation.md, the invoke-literal checks (extension, path-separator,
// arity, cycle, path-escape) run in the calling loom's LOAD pass and are
// error-severity diagnostics that prevent the loom from registering
// (production-composition drops a loom carrying a load/parse error).
//
// These probes now assert the CORRECTED behaviour: the invoke checkers
// (`validatePathLiteral`, `checkInvokeArity`, `detectInvocationCycle`,
// `checkInvokePathAtLoad`) are wired into the shipped parse/compose pipeline, so
// every invalid `invoke(...)` un-registers its loom and emits its registered
// diagnostic (routed through the FM-3 diagnostic drain).
//
// Area: INVOKE, cross-mode semantics & hard ceilings.

const provider = requireLiveProvider();

async function loadOnly(files: readonly PlantedFile[]) {
  const probe = await runProbe({ provider, files });
  // V4e: error-severity load/parse diagnostics land on the `loom-system-note`
  // channel, rendered `<[file:line:col:] >code: message`, so the registry
  // message is a substring of each note.
  const msgs = probe.systemNotes;
  return { probe, msgs, names: probe.registeredNames };
}

function anyMsg(msgs: readonly string[], ...needles: string[]): boolean {
  return msgs.some((m) => needles.some((n) => m.includes(n)));
}

describe("INVOKE parse/load — invoke-literal checks are wired (zero model turns)", () => {
  it("INV-1: invoke of a .warp path un-registers with an invoke-non-loom-extension diagnostic", async () => {
    // invocation.md §Resolution; code-registry-parse.md: a .warp invoke path is
    // `loom/parse/invoke-non-loom-extension` (E) → loom must not register.
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "warpinv.loom", text: ["---", "mode: prompt", "---", 'let _ = invoke("./lib.warp")?', "@`x`"].join("\n") },
    ]);
    try {
      expect(names).not.toContain("warpinv");
      expect(anyMsg(msgs, "does not end in .loom", "invoke-non-loom-extension")).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  it("INV-1b: invoke of an uppercase .LOOM path un-registers with an extension diagnostic", async () => {
    // lexical.md §Extension matching: byte-exact lowercase → .LOOM is
    // `loom/parse/invoke-non-loom-extension`.
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "uppercase.loom", text: ["---", "mode: prompt", "---", 'let _ = invoke("./child.LOOM")?', "@`x`"].join("\n") },
    ]);
    try {
      expect(names).not.toContain("uppercase");
      expect(anyMsg(msgs, "does not end in .loom")).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  it("INV-2: backslash in an invoke path literal un-registers with an invalid-path-separator diagnostic", async () => {
    // lexical.md §Path literals: a backslash is `loom/parse/invalid-path-separator` (E).
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "backslash.loom", text: ["---", "mode: prompt", "---", 'let _ = invoke(".\\\\child.loom")?', "@`x`"].join("\n") },
    ]);
    try {
      expect(names).not.toContain("backslash");
      expect(anyMsg(msgs, "backslash in path literal", "invalid path separator")).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  it("INV-3: too-many positional args un-registers with an invoke-arity-too-many diagnostic", async () => {
    // invocation.md §Argument arity: too-many is ALWAYS a parse error
    // `loom/parse/invoke-arity-too-many`, no runtime net.
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "toomany.loom", text: ["---", "mode: prompt", "---", 'let _ = invoke("./onep.loom", "a", "b", "c")?', "@`x`"].join("\n") },
      { source: "project", path: "onep.loom", text: ["---", "mode: subagent", "params:", "  a: string", "---", "42"].join("\n") },
    ]);
    try {
      expect(names).not.toContain("toomany");
      expect(anyMsg(msgs, "too many arguments", "invoke-arity-too-many")).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  it("INV-3b: too-few positional args (statically resolvable) un-registers with an invoke-arity-too-few diagnostic", async () => {
    // invocation.md §Argument arity: too-few is a parse error when the callee is
    // statically resolvable (both files parse here).
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "toofew.loom", text: ["---", "mode: prompt", "---", 'let _ = invoke("./twop.loom", "a")?', "@`x`"].join("\n") },
      { source: "project", path: "twop.loom", text: ["---", "mode: subagent", "params:", "  a: string", "  b: string", "---", "42"].join("\n") },
    ]);
    try {
      expect(names).not.toContain("toofew");
      expect(anyMsg(msgs, "too few arguments", "invoke-arity-too-few")).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  it("INV-4: a static invocation cycle A→B→A un-registers both looms with an invocation-cycle diagnostic", async () => {
    // invocation.md §Cycle detection: the second discovery of A is
    // `loom/load/invocation-cycle` at parse time.
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "cyca.loom", text: ["---", "mode: subagent", "---", 'let _ = invoke("./cycb.loom")?', "42"].join("\n") },
      { source: "project", path: "cycb.loom", text: ["---", "mode: subagent", "---", 'let _ = invoke("./cyca.loom")?', "42"].join("\n") },
    ]);
    try {
      expect(names).not.toContain("cyca");
      expect(names).not.toContain("cycb");
      expect(anyMsg(msgs, "invocation cycle", "invocation-cycle")).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  it("INV-4b: a direct self-cycle A→A un-registers with an invocation-cycle diagnostic (never driven → no hang)", async () => {
    // `loom/load/invocation-cycle`. Cycle detection at LOAD is what prevents the
    // runtime hang: because the self-cyclic loom never registers, it can never be
    // driven into pure unbounded invoke recursion. This probe is deliberately
    // load-only (zero model turns, no drive) and asserts NON-registration.
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "selfcyc.loom", text: ["---", "mode: subagent", "---", 'let _ = invoke("./selfcyc.loom")?', "42"].join("\n") },
    ]);
    try {
      expect(names).not.toContain("selfcyc");
      expect(anyMsg(msgs, "invocation cycle", "invocation-cycle")).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  it("INV-5: an invoke path escaping every discovery root un-registers with an invoke-path-escape diagnostic", async () => {
    // invocation.md §Resolution: a resolved callee path outside every active
    // discovery root is `loom/load/invoke-path-escape` (E) and the parent does
    // not register the call site. Here "../../evil.loom" from .pi/looms resolves
    // to <cwd>/evil.loom — outside the .pi/looms root.
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "escparent.loom", text: ["---", "mode: prompt", "---", 'let _ = invoke("../../evil.loom")?', "@`x`"].join("\n") },
      { source: "rel", path: "evil.loom", text: ["---", "mode: subagent", "---", "42"].join("\n") },
    ]);
    try {
      expect(names).not.toContain("escparent");
      expect(anyMsg(msgs, "resolves outside every active discovery root", "invoke-path-escape")).toBe(true);
    } finally {
      await probe.dispose();
    }
  });
});
