import { describe, expect, it } from "vitest";
import { requireLiveProvider, runProbe, type PlantedFile } from "./probe-harness";

// INVOKE — parse/load characterization probes (ZERO model turns).
//
// Each probe drives NO invocations, so the only observation channels are
// `probe.systemNotes` (the shipped V4e `theta-system-note` load-diagnostic
// channel; `probe.diagnostics` / ctx.ui.notify is empty at load time — see the
// probe-harness header) and `probe.registeredNames`.
// Per invocation.md, the invoke-literal checks (extension, path-separator,
// arity, cycle, path-escape) run in the calling theta's LOAD pass and are
// error-severity diagnostics that prevent the theta from registering
// (production-composition drops a theta carrying a load/parse error).
//
// These probes now assert the CORRECTED behaviour: the invoke checkers
// (`validatePathLiteral`, `checkInvokeArity`, `detectInvocationCycle`,
// `checkInvokePathAtLoad`) are wired into the shipped parse/compose pipeline, so
// every invalid `invoke(...)` un-registers its theta and emits its registered
// diagnostic (routed through the FM-3 diagnostic drain).
//
// Area: INVOKE, cross-mode semantics & hard ceilings.

const provider = requireLiveProvider();

async function loadOnly(files: readonly PlantedFile[]) {
  const probe = await runProbe({ provider, files });
  // V4e: error-severity load/parse diagnostics land on the `theta-system-note`
  // channel, rendered `<[file:line:col:] >code: message`, so the registry
  // message is a substring of each note.
  const msgs = probe.systemNotes;
  return { probe, msgs, names: probe.registeredNames };
}

function anyMsg(msgs: readonly string[], ...needles: string[]): boolean {
  return msgs.some((m) => needles.some((n) => m.includes(n)));
}

describe("INVOKE parse/load — invoke-literal checks are wired (zero model turns)", () => {
  it("INV-1: invoke of a .thetalib path un-registers with an invoke-non-theta-extension diagnostic", async () => {
    // invocation.md §Resolution; code-registry-parse.md: a .thetalib invoke path is
    // `theta/parse/invoke-non-theta-extension` (E) → theta must not register.
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "thetalibinv.theta", text: ["---", "mode: prompt", "---", 'let _ = invoke("./lib.thetalib")?', "@`x`"].join("\n") },
    ]);
    try {
      expect(names).not.toContain("thetalibinv");
      expect(anyMsg(msgs, "does not end in .theta", "invoke-non-theta-extension")).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  it("INV-1b: invoke of an uppercase .THETA path un-registers with an extension diagnostic", async () => {
    // lexical.md §Extension matching: byte-exact lowercase → .THETA is
    // `theta/parse/invoke-non-theta-extension`.
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "uppercase.theta", text: ["---", "mode: prompt", "---", 'let _ = invoke("./child.THETA")?', "@`x`"].join("\n") },
    ]);
    try {
      expect(names).not.toContain("uppercase");
      expect(anyMsg(msgs, "does not end in .theta")).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  it("INV-2: backslash in an invoke path literal un-registers with an invalid-path-separator diagnostic", async () => {
    // lexical.md §Path literals: a backslash is `theta/parse/invalid-path-separator` (E).
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "backslash.theta", text: ["---", "mode: prompt", "---", 'let _ = invoke(".\\\\child.theta")?', "@`x`"].join("\n") },
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
    // `theta/parse/invoke-arity-too-many`, no runtime net.
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "toomany.theta", text: ["---", "mode: prompt", "---", 'let _ = invoke("./onep.theta", "a", "b", "c")?', "@`x`"].join("\n") },
      { source: "project", path: "onep.theta", text: ["---", "mode: subagent", "params:", "  a: string", "---", "42"].join("\n") },
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
      { source: "project", path: "toofew.theta", text: ["---", "mode: prompt", "---", 'let _ = invoke("./twop.theta", "a")?', "@`x`"].join("\n") },
      { source: "project", path: "twop.theta", text: ["---", "mode: subagent", "params:", "  a: string", "  b: string", "---", "42"].join("\n") },
    ]);
    try {
      expect(names).not.toContain("toofew");
      expect(anyMsg(msgs, "too few arguments", "invoke-arity-too-few")).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  it("INV-4: a static invocation cycle A→B→A un-registers both thetas with an invocation-cycle diagnostic", async () => {
    // invocation.md §Cycle detection: the second discovery of A is
    // `theta/load/invocation-cycle` at parse time.
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "cyca.theta", text: ["---", "mode: subagent", "---", 'let _ = invoke("./cycb.theta")?', "42"].join("\n") },
      { source: "project", path: "cycb.theta", text: ["---", "mode: subagent", "---", 'let _ = invoke("./cyca.theta")?', "42"].join("\n") },
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
    // `theta/load/invocation-cycle`. Cycle detection at LOAD is what prevents the
    // runtime hang: because the self-cyclic theta never registers, it can never be
    // driven into pure unbounded invoke recursion. This probe is deliberately
    // load-only (zero model turns, no drive) and asserts NON-registration.
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "selfcyc.theta", text: ["---", "mode: subagent", "---", 'let _ = invoke("./selfcyc.theta")?', "42"].join("\n") },
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
    // discovery root is `theta/load/invoke-path-escape` (E) and the parent does
    // not register the call site. Here "../../evil.theta" from .pi/theta resolves
    // to <cwd>/evil.theta — outside the .pi/theta root.
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "escparent.theta", text: ["---", "mode: prompt", "---", 'let _ = invoke("../../evil.theta")?', "@`x`"].join("\n") },
      { source: "rel", path: "evil.theta", text: ["---", "mode: subagent", "---", "42"].join("\n") },
    ]);
    try {
      expect(names).not.toContain("escparent");
      expect(anyMsg(msgs, "resolves outside every active discovery root", "invoke-path-escape")).toBe(true);
    } finally {
      await probe.dispose();
    }
  });
});
