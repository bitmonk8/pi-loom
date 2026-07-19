import { describe, expect, it, vi } from "vitest";
import {
  INVOKE_PATH_ESCAPE_CODE,
  checkInvokePathContainment,
  checkInvokePathAtLoad,
  invokePathEscapeMessage,
  recheckInvokePathAtRuntime,
  runStaticResolutionPass,
  type ParsedCallee,
} from "../src/runtime/invocation";
import { FakeFileSystem } from "./helpers/fake-file-system";

// V15a-T — failing tests for the paired `V15a` "Invocation core".
//
// Spec: invocation.md (INV-1 §Resolution, §Static resolution),
// discovery/discovery-sources.md (§Discovery roots),
// implementation-notes.md ("Static-resolution load pass").
//
// Each test cites its obligation inline and reds on its own primary assertion
// because the V15a behaviour is absent: `checkInvokePathContainment` returns an
// inert `""` canonical path with `within: false`; the load-time and runtime
// surfaces always report a `"within"` verdict with a `""` canonical path and
// emit neither the escape diagnostic nor the `InvokeInfraError`; and
// `runStaticResolutionPass` returns an empty cache without ever parsing a file.
// No test reds on a compile error, a missing fixture, or a harness throw.

// --------------------------------------------------------------------------
// INV-1 — realpath + segment-boundary containment (shared check)
// --------------------------------------------------------------------------
//
// A discovery root and the callee live under `/proj/.pi/theta`. The
// containment comparison is decided on the byte-exact `realpath` output of both
// the callee and each active root (invocation.md §Resolution).

const ROOT = "/proj/.pi/theta";

function fsWith(
  files: Record<string, string>,
  extra: {
    dirs?: Record<string, readonly string[]>;
    symlinks?: Record<string, string>;
  } = {},
): FakeFileSystem {
  return new FakeFileSystem({
    homedir: "/home/u",
    cwd: "/proj",
    files,
    dirs: { "/proj/.pi/theta": [], ...(extra.dirs ?? {}) },
    symlinks: extra.symlinks ?? {},
  });
}

describe("INV-1 — realpath + segment-boundary containment (invocation.md §Resolution)", () => {
  it("INV-1: a callee whose realpath is inside an active root is within, keyed on the byte-exact realpath output", async () => {
    const callee = `${ROOT}/plan.theta`;
    const fs = fsWith({ [callee]: "theta", [ROOT]: "" });
    const result = await checkInvokePathContainment({ fs }, callee, [ROOT]);
    // Decided on the byte-exact realpath output (§Resolution).
    expect(result.canonicalPath).toBe(callee);
    expect(result.within).toBe(true);
  });

  it("INV-1: sibling-prefix escape is rejected — the trailing-separator requirement is load-bearing", async () => {
    // `/proj/.pi/theta-evil/x.theta` passes a bare startsWith('/proj/.pi/theta')
    // test but sits outside root `/proj/.pi/theta`. Segment-boundary containment
    // must reject it (invocation.md §Resolution "A bare prefix test is insufficient").
    const sibling = "/proj/.pi/theta-evil/x.theta";
    const fs = fsWith({ [sibling]: "theta", [ROOT]: "" });
    const result = await checkInvokePathContainment({ fs }, sibling, [ROOT]);
    expect(result.canonicalPath).toBe(sibling);
    expect(result.within).toBe(false);
  });

  it("INV-1: a symlink farm resolving outside every root is rejected on its realpath output, not its literal path", async () => {
    // The literal callee sits inside the root but its realpath crosses out of
    // every active root: "the realpath step is mandatory" (§Resolution).
    const link = `${ROOT}/inside.theta`;
    const target = "/elsewhere/evil.theta";
    const fs = fsWith(
      { [target]: "theta", [ROOT]: "" },
      { symlinks: { [link]: target } },
    );
    const result = await checkInvokePathContainment({ fs }, link, [ROOT]);
    expect(result.canonicalPath).toBe(target);
    expect(result.within).toBe(false);
  });

  it("INV-1: containment uses the union of active roots (cross-root composition stays legal)", async () => {
    const other = "/global/theta";
    const callee = `${other}/util.theta`;
    const fs = fsWith({ [callee]: "theta", [ROOT]: "", [other]: "" });
    const result = await checkInvokePathContainment({ fs }, callee, [ROOT, other]);
    expect(result.canonicalPath).toBe(callee);
    expect(result.within).toBe(true);
  });
});

// --------------------------------------------------------------------------
// INV-1 — identical semantics at load time and at the invocation re-check
// --------------------------------------------------------------------------

describe("INV-1 — load-time check and invocation-time re-check share identical containment semantics", () => {
  it("INV-1: an in-root callee is 'within' at load time and carries the byte-exact realpath output", async () => {
    const callee = `${ROOT}/plan.theta`;
    const fs = fsWith({ [callee]: "theta", [ROOT]: "" });
    const result = await checkInvokePathAtLoad({
      deps: { fs },
      resolvedPath: callee,
      literalPath: "./plan.theta",
      activeRoots: [ROOT],
    });
    expect(result.kind).toBe("within");
    if (result.kind === "within") {
      expect(result.canonicalPath).toBe(callee);
    }
  });

  it("INV-1: a load-time escape emits the theta/load/invoke-path-escape diagnostic", async () => {
    const escapee = "/elsewhere/evil.theta";
    const fs = fsWith({ [escapee]: "theta", [ROOT]: "" });
    const result = await checkInvokePathAtLoad({
      deps: { fs },
      resolvedPath: escapee,
      literalPath: "../../elsewhere/evil.theta",
      activeRoots: [ROOT],
    });
    expect(result.kind).toBe("escape");
    if (result.kind === "escape") {
      // Diagnostic message anchored to the registry Message column, with the
      // literal path (no realpath normalisation) per placeholder-rendering-b.md.
      expect(result.diagnostic.code).toBe(INVOKE_PATH_ESCAPE_CODE);
      expect(result.diagnostic.severity).toBe("error");
      expect(result.diagnostic.message).toBe(
        invokePathEscapeMessage("../../elsewhere/evil.theta"),
      );
    }
  });

  it("INV-1: an invocation-time escape surfaces on BOTH channels — diagnostic AND InvokeInfraError{load_failure}", async () => {
    const escapee = "/elsewhere/evil.theta";
    const fs = fsWith({ [escapee]: "theta", [ROOT]: "" });
    const result = await recheckInvokePathAtRuntime({
      deps: { fs },
      resolvedPath: escapee,
      literalPath: "../../elsewhere/evil.theta",
      activeRoots: [ROOT],
    });
    expect(result.kind).toBe("escape");
    if (result.kind === "escape") {
      // Channel 1 — the diagnostics drain.
      expect(result.diagnostic.code).toBe(INVOKE_PATH_ESCAPE_CODE);
      // Channel 2 — the parent's Err(InvokeInfraError { cause: "load_failure" }).
      expect(result.error.kind).toBe("invoke_infra");
      expect(result.error.cause).toBe("load_failure");
      expect(result.error.callee_path).toBe(escapee);
    }
  });

  it("INV-1: the runtime re-check uses the CURRENTLY active roots — a hot-reload that removed the relied-upon root fails closed", async () => {
    // At load the callee was inside `ROOT`; a hot-reload dropped `ROOT` from the
    // active set, so the re-check (which re-reads the current roots) escapes.
    const callee = `${ROOT}/plan.theta`;
    const fs = fsWith({ [callee]: "theta", [ROOT]: "" });
    const result = await recheckInvokePathAtRuntime({
      deps: { fs },
      resolvedPath: callee,
      literalPath: "./plan.theta",
      activeRoots: [], // ROOT was hot-reloaded away
    });
    expect(result.kind).toBe("escape");
    if (result.kind === "escape") {
      expect(result.error.cause).toBe("load_failure");
    }
  });
});

// --------------------------------------------------------------------------
// Static-resolution per-pass parse cache (transitive parse/lower walk)
// --------------------------------------------------------------------------
//
// Diamond graph (implementation-notes.md "Static-resolution load pass"):
//   entry --invoke--> a --invoke--> shared
//   entry --tools:--> b --tools:--> shared
// The pass walks transitively and parses/lowers each visited file exactly once.

const ENTRY = `${ROOT}/entry.theta`;
const A = `${ROOT}/a.theta`;
const B = `${ROOT}/b.theta`;
const SHARED = `${ROOT}/shared.theta`;

/** Outbound-edge fixture keyed by canonical path. */
const EDGES: Record<string, { invoke: string[]; tools: string[] }> = {
  [ENTRY]: { invoke: [A], tools: [B] },
  [A]: { invoke: [SHARED], tools: [] },
  [B]: { invoke: [], tools: [SHARED] },
  [SHARED]: { invoke: [], tools: [] },
};

function graphFs(): FakeFileSystem {
  return fsWith({
    [ENTRY]: "entry",
    [A]: "a",
    [B]: "b",
    [SHARED]: "shared",
    [ROOT]: "",
  });
}

function parseAndLowerSpy(): (path: string, source: string) => ParsedCallee {
  return vi.fn((path: string, _source: string): ParsedCallee => {
    const edges = EDGES[path] ?? { invoke: [], tools: [] };
    return { path, invokePaths: edges.invoke, toolThetaPaths: edges.tools };
  });
}

// cka-44 / V15a: the IMPL code-keyed obligation area (implementation-notes.md
// §Runtime Static-resolution load pass) closes across V15a (this transitive
// per-pass parse-cache walk), V15e, and V7a; the assertions below witness the
// V15a parse-cache-walk facet against the shipped static-resolution pass.
describe("Static-resolution load pass — transitive per-pass parse cache (implementation-notes.md)", () => {
  it("walks transitively from the entry theta across invoke paths and .theta tools: entries", async () => {
    const fs = graphFs();
    const parseAndLower = parseAndLowerSpy();
    const result = await runStaticResolutionPass({ fs, parseAndLower }, ENTRY);
    // Every reachable file — including SHARED, reached only transitively — is cached.
    expect([...result.cache.keys()].sort()).toEqual([A, B, ENTRY, SHARED].sort());
    expect(result.cache.get(SHARED)?.path).toBe(SHARED);
  });

  it("parses and lowers each visited file EXACTLY ONCE into the per-pass parse cache (diamond dedup)", async () => {
    const fs = graphFs();
    const parseAndLower = parseAndLowerSpy();
    await runStaticResolutionPass({ fs, parseAndLower }, ENTRY);
    const calledPaths = (parseAndLower as unknown as { mock: { calls: unknown[][] } }).mock.calls.map(
      (call) => call[0] as string,
    );
    // SHARED is reached via both A (invoke) and B (tools:) but is parsed once.
    expect(calledPaths.filter((p) => p === SHARED)).toHaveLength(1);
    // No file is parsed more than once; every reachable file is parsed once.
    expect(calledPaths.sort()).toEqual([A, B, ENTRY, SHARED].sort());
  });
});
