import { describe, expect, it } from "vitest";
import {
  recordInvocationProvenance,
  type InvokeCallSite,
} from "../src/runtime/invoke-provenance";
import { FakeFileSystem } from "./helpers/fake-file-system";

// V15g-T — failing tests for the paired `V15g` invocation-record provenance seam.
//
// Spec: slash-invocation.md §SLSH-5 (Chain attribution), invocation.md
// §Resolution (the post-`realpath` parent path this record reuses). This seam is
// the producer V12b consumes to render the `from <callee_path> invoked at
// <parent_path>:<line>` chain suffix.
//
// Each test cites SLSH-5 inline and reds on its own primary assertion because
// the V15g behaviour is absent: `recordInvocationProvenance` returns an inert
// record whose `parentPath` is `""` (never the post-`realpath` output) and whose
// `callSiteLine` is `0` (never the call-site token's 1-indexed line). No test
// reds on a compile error, a missing fixture, or a harness throw.

const ROOT = "/proj/.pi/looms";

function fsWith(
  files: Record<string, string>,
  symlinks: Record<string, string> = {},
): FakeFileSystem {
  return new FakeFileSystem({
    homedir: "/home/u",
    cwd: "/proj",
    files,
    dirs: { [ROOT]: [] },
    symlinks,
  });
}

// --------------------------------------------------------------------------
// SLSH-5 — the recorded parent path is the POST-`realpath` parent path
// --------------------------------------------------------------------------

describe("SLSH-5 — invocation-record parent path is the post-realpath parent path (slash-invocation.md §SLSH-5)", () => {
  it("SLSH-5: records the parent loom's realpath-resolved path, not the literal symlink path", async () => {
    // The parent loom is reached via a symlink inside the root; the record must
    // carry the realpath target (the same realpath-normalised parent path V15a
    // captures for discovery-root containment), not the literal link path.
    const link = `${ROOT}/parent-link.loom`;
    const target = `${ROOT}/parent.loom`;
    const fs = fsWith({ [target]: "loom", [ROOT]: "" }, { [link]: target });

    const callSite: InvokeCallSite = {
      style: "literal_invoke",
      invokeToken: { line: 42, column: 1 },
    };
    const record = await recordInvocationProvenance(
      { fs },
      { parentPath: link, callSite },
    );

    // Post-`realpath`: the symlink is resolved to its target (§Resolution).
    expect(record.parentPath).toBe(target);
  });

  it("SLSH-5: records an already-canonical parent path unchanged (byte-exact realpath output)", async () => {
    const parent = `${ROOT}/parent.loom`;
    const fs = fsWith({ [parent]: "loom", [ROOT]: "" });

    const callSite: InvokeCallSite = {
      style: "literal_invoke",
      invokeToken: { line: 7, column: 3 },
    };
    const record = await recordInvocationProvenance(
      { fs },
      { parentPath: parent, callSite },
    );

    expect(record.parentPath).toBe(parent);
  });
});

// --------------------------------------------------------------------------
// SLSH-5 — the recorded line is the call-site TOKEN's 1-indexed line
// --------------------------------------------------------------------------

describe("SLSH-5 — invocation-record call-site line is the call-site token's 1-indexed line (slash-invocation.md §SLSH-5)", () => {
  it("SLSH-5: a literal invoke(...) call records the invoke( token line", async () => {
    const parent = `${ROOT}/parent.loom`;
    const fs = fsWith({ [parent]: "loom", [ROOT]: "" });

    // The `invoke(` token sits on line 42 (the single-hop worked example).
    const callSite: InvokeCallSite = {
      style: "literal_invoke",
      invokeToken: { line: 42, column: 5 },
    };
    const record = await recordInvocationProvenance(
      { fs },
      { parentPath: parent, callSite },
    );

    expect(record.callSiteLine).toBe(42);
  });

  it("SLSH-5: a .loom-callable bare-identifier call records the callee-name identifier line", async () => {
    // `summarise(doc)` where `./summariser.loom` is a `tools:` entry — the line
    // is that of the `summarise` callee-name identifier (the `.loom`-callable
    // worked example on line 18).
    const parent = `${ROOT}/parent.loom`;
    const fs = fsWith({ [parent]: "loom", [ROOT]: "" });

    const callSite: InvokeCallSite = {
      style: "loom_callable_bare",
      calleeNameToken: { line: 18, column: 9 },
    };
    const record = await recordInvocationProvenance(
      { fs },
      { parentPath: parent, callSite },
    );

    expect(record.callSiteLine).toBe(18);
  });

  it("SLSH-5: a multi-line literal invoke records the invoke( token line, NOT the receiving binding's line", async () => {
    // Source shape (receiving binding on line 10, invoke( token on line 11):
    //   10: let plan: Plan =
    //   11:   invoke<Plan>(
    //   12:     "./plan.loom",
    //   13:     topic,
    //   14:   )?
    // The recorded line MUST be the call-site token's (11), not the binding's (10).
    const parent = `${ROOT}/parent.loom`;
    const fs = fsWith({ [parent]: "loom", [ROOT]: "" });

    const RECEIVING_BINDING_LINE = 10;
    const INVOKE_TOKEN_LINE = 11;
    const callSite: InvokeCallSite = {
      style: "literal_invoke",
      invokeToken: { line: INVOKE_TOKEN_LINE, column: 3 },
    };
    const record = await recordInvocationProvenance(
      { fs },
      { parentPath: parent, callSite },
    );

    expect(record.callSiteLine).toBe(INVOKE_TOKEN_LINE);
    expect(record.callSiteLine).not.toBe(RECEIVING_BINDING_LINE);
  });

  it("SLSH-5: a multi-line .loom-callable bare call records the callee-name identifier line, NOT the receiving binding's line", async () => {
    // Source shape (receiving binding on line 20, callee-name identifier on 21):
    //   20: let s: Summary =
    //   21:   summarise(
    //   22:     doc,
    //   23:   )?
    const parent = `${ROOT}/parent.loom`;
    const fs = fsWith({ [parent]: "loom", [ROOT]: "" });

    const RECEIVING_BINDING_LINE = 20;
    const CALLEE_NAME_LINE = 21;
    const callSite: InvokeCallSite = {
      style: "loom_callable_bare",
      calleeNameToken: { line: CALLEE_NAME_LINE, column: 3 },
    };
    const record = await recordInvocationProvenance(
      { fs },
      { parentPath: parent, callSite },
    );

    expect(record.callSiteLine).toBe(CALLEE_NAME_LINE);
    expect(record.callSiteLine).not.toBe(RECEIVING_BINDING_LINE);
  });
});
