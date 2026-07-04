import { describe, expect, it } from "vitest";
import { requireLiveProvider, runProbe, type PlantedFile } from "./probe-harness";

// INVOKE — parse/load characterization probes (ZERO model turns).
//
// Each probe drives NO invocations, so the only observation channels are
// `probe.diagnostics` (load-phase ctx.ui.notify) and `probe.registeredNames`.
// Per invocation.md, the invoke-literal checks (extension, path-separator,
// arity, cycle, path-escape) run in the calling loom's LOAD pass and are
// error-severity diagnostics that must prevent the loom from registering
// (production-composition drops a loom carrying a load/parse error).
//
// OBSERVED across every case below: the invalid loom REGISTERS and NO
// diagnostic is emitted — i.e. the shipped parser does not run the invoke
// checkers (`validatePathLiteral`, `checkInvokeArity`, `checkInvokeReturnType`,
// `detectInvocationCycle` are defined + unit-tested but never called by the
// parse/compose pipeline; only `checkCalleeHasErrors` is wired). These probes
// PIN that buggy behaviour (green) with the spec expectation cited inline.
//
// Area: INVOKE, cross-mode semantics & hard ceilings.

const provider = requireLiveProvider();

async function loadOnly(files: readonly PlantedFile[]) {
  const probe = await runProbe({ provider, files });
  const msgs = probe.diagnostics.map((d) => `${d.type}:${d.message}`);
  return { probe, msgs, names: probe.registeredNames };
}

function anyMsg(msgs: readonly string[], ...needles: string[]): boolean {
  return msgs.some((m) => needles.some((n) => m.includes(n)));
}

describe("INVOKE parse/load — invoke-literal checks are not wired (zero model turns)", () => {
  it("INV-1: invoke of a .warp path registers with no invoke-non-loom-extension diagnostic", async () => {
    // EXPECTED (invocation.md §Resolution; code-registry-parse.md): a .warp
    // invoke path is `loom/parse/invoke-non-loom-extension` (E) → loom must not
    // register.
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "warpinv.loom", text: ["---", "mode: prompt", "---", 'let _ = invoke("./lib.warp")?', "@`x`"].join("\n") },
    ]);
    try {
      expect(names).toContain("warpinv"); // OBSERVED: registered anyway
      expect(anyMsg(msgs, "does not end in .loom", "invoke-non-loom-extension")).toBe(false);
    } finally {
      await probe.dispose();
    }
  });

  it("INV-1b: invoke of an uppercase .LOOM path registers with no extension diagnostic", async () => {
    // EXPECTED (lexical.md §Extension matching): byte-exact lowercase → .LOOM is
    // `loom/parse/invoke-non-loom-extension`.
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "uppercase.loom", text: ["---", "mode: prompt", "---", 'let _ = invoke("./child.LOOM")?', "@`x`"].join("\n") },
    ]);
    try {
      expect(names).toContain("uppercase");
      expect(anyMsg(msgs, "does not end in .loom")).toBe(false);
    } finally {
      await probe.dispose();
    }
  });

  it("INV-2: backslash in an invoke path literal registers with no invalid-path-separator diagnostic", async () => {
    // EXPECTED (lexical.md §Path literals): a backslash is
    // `loom/parse/invalid-path-separator` (E).
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "backslash.loom", text: ["---", "mode: prompt", "---", 'let _ = invoke(".\\\\child.loom")?', "@`x`"].join("\n") },
    ]);
    try {
      expect(names).toContain("backslash");
      expect(anyMsg(msgs, "backslash in path literal", "invalid path separator")).toBe(false);
    } finally {
      await probe.dispose();
    }
  });

  it("INV-3: too-many positional args registers with no invoke-arity-too-many diagnostic", async () => {
    // EXPECTED (invocation.md §Argument arity): too-many is ALWAYS a parse
    // error `loom/parse/invoke-arity-too-many`, no runtime net.
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "toomany.loom", text: ["---", "mode: prompt", "---", 'let _ = invoke("./onep.loom", "a", "b", "c")?', "@`x`"].join("\n") },
      { source: "project", path: "onep.loom", text: ["---", "mode: subagent", "params:", "  a: string", "---", "42"].join("\n") },
    ]);
    try {
      expect(names).toContain("toomany");
      expect(anyMsg(msgs, "too many arguments", "invoke-arity-too-many")).toBe(false);
    } finally {
      await probe.dispose();
    }
  });

  it("INV-3b: too-few positional args (statically resolvable) registers with no invoke-arity-too-few diagnostic", async () => {
    // EXPECTED (invocation.md §Argument arity): too-few is a parse error when
    // the callee is statically resolvable (both files parse here).
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "toofew.loom", text: ["---", "mode: prompt", "---", 'let _ = invoke("./twop.loom", "a")?', "@`x`"].join("\n") },
      { source: "project", path: "twop.loom", text: ["---", "mode: subagent", "params:", "  a: string", "  b: string", "---", "42"].join("\n") },
    ]);
    try {
      expect(names).toContain("toofew");
      expect(anyMsg(msgs, "too few arguments", "invoke-arity-too-few")).toBe(false);
    } finally {
      await probe.dispose();
    }
  });

  it("INV-4: a static invocation cycle A→B→A registers both looms with no invocation-cycle diagnostic", async () => {
    // EXPECTED (invocation.md §Cycle detection): the second discovery of A is
    // `loom/load/invocation-cycle` at parse time.
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "cyca.loom", text: ["---", "mode: subagent", "---", 'let _ = invoke("./cycb.loom")?', "42"].join("\n") },
      { source: "project", path: "cycb.loom", text: ["---", "mode: subagent", "---", 'let _ = invoke("./cyca.loom")?', "42"].join("\n") },
    ]);
    try {
      expect(names).toContain("cyca");
      expect(names).toContain("cycb");
      expect(anyMsg(msgs, "invocation cycle", "invocation-cycle")).toBe(false);
    } finally {
      await probe.dispose();
    }
  });

  it("INV-4b: a direct self-cycle A→A registers with no invocation-cycle diagnostic", async () => {
    // EXPECTED: `loom/load/invocation-cycle`. (Its runtime consequence — an
    // unbounded hang — is pinned in invoke-runtime-ceilings via the bounded
    // depth-chain probe; this loom is intentionally NOT driven here.)
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "selfcyc.loom", text: ["---", "mode: subagent", "---", 'let _ = invoke("./selfcyc.loom")?', "42"].join("\n") },
    ]);
    try {
      expect(names).toContain("selfcyc");
      expect(anyMsg(msgs, "invocation cycle", "invocation-cycle")).toBe(false);
    } finally {
      await probe.dispose();
    }
  });

  it("INV-5: an invoke path escaping every discovery root registers with no invoke-path-escape diagnostic", async () => {
    // EXPECTED (invocation.md §Resolution): a resolved callee path outside every
    // active discovery root is `loom/load/invoke-path-escape` (E) and the parent
    // does not register the call site. Here "../../evil.loom" from .pi/looms
    // resolves to <cwd>/evil.loom — outside the .pi/looms root.
    const { probe, msgs, names } = await loadOnly([
      { source: "project", path: "escparent.loom", text: ["---", "mode: prompt", "---", 'let _ = invoke("../../evil.loom")?', "@`x`"].join("\n") },
      { source: "rel", path: "evil.loom", text: ["---", "mode: subagent", "---", "42"].join("\n") },
    ]);
    try {
      expect(names).toContain("escparent");
      expect(anyMsg(msgs, "resolves outside every active discovery root", "invoke-path-escape")).toBe(false);
    } finally {
      await probe.dispose();
    }
  });
});
