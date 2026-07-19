// PIC-9 subagent teardown on the DRIVE seam — the leak-on-throw fix.
//
// Regression pin for the Decision-6 B1 leak: on the subagent invocation drive,
// the spawned session's `dispose()` and the one-shot PIC-41 abort-forwarding
// `detach()` used to run ONLY inside `surface()`. When `executeBody` THREW a
// genuine defect (a `ToolReturnShapeDefectError` / `ThetaPanic`) before `surface`
// was reached, `surface` was skipped, so `dispose()`/`detach()` never ran —
// leaking the provider connection + the abort listener. (The B1 `finally` runs
// `finishInvocation`, which settles the barrier + removes the registry entry,
// but does NOT dispose/detach.)
//
// The fix moves dispose/detach OUT of `surface()` into a single idempotent
// binding-level `teardown()` the DRIVE `finally` calls BEFORE `finishInvocation`
// (so the `disposeBarrier` still settles post-dispose). This file proves both
// seams of the fix:
//   1. the REAL subagent binding (`spawnSubagentConversation`) exposes a
//      `teardown` that disposes exactly once + detaches the abort listener
//      exactly once (idempotent on a second call), a `dispose()` throw is
//      swallowed, and `surface()` no longer disposes;
//   2. the DRIVE seam (`composeThetaFixture.run`) runs `binding.teardown()` on
//      the throw / normal / returned-`Err` paths — before `finishInvocation`,
//      surface skipped on the throw path — without masking the in-flight throw.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ModelRegistry,
} from "@earendil-works/pi-coding-agent";

// --- (1) REAL subagent binding: mock only the SDK spawn surface -------------
// The spawned session is a spy double (abort/dispose counters); the rest of the
// SDK module is preserved (spread). `createAgentSession` yields the spy session,
// and the theta-suppressing resource loader / in-memory session manager / agent
// dir are inert stubs — the spawn reaches `attachSubagentAbortForwarding` +
// `makeIdempotentDispose` (the REAL isolation helpers) over the spy session.
const sdkHook = vi.hoisted(() => ({
  disposeCalls: 0,
  abortCalls: 0,
  disposeThrows: false,
}));

vi.mock("@earendil-works/pi-coding-agent", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@earendil-works/pi-coding-agent")>();
  class FakeResourceLoader {
    constructor(_opts: unknown) {}
    reload(): Promise<void> {
      return Promise.resolve();
    }
    getSystemPrompt(): string {
      return "";
    }
    getAppendSystemPrompt(): string[] {
      return [];
    }
  }
  return {
    ...actual,
    getAgentDir: (): string => "/agent",
    DefaultResourceLoader: FakeResourceLoader,
    SessionManager: { inMemory: (): object => ({}) },
    createAgentSession: (): Promise<{ session: unknown }> =>
      Promise.resolve({
        session: {
          abort: (): Promise<void> => {
            sdkHook.abortCalls += 1;
            return Promise.resolve();
          },
          dispose: (): void => {
            sdkHook.disposeCalls += 1;
            if (sdkHook.disposeThrows) {
              throw new Error("dispose exploded");
            }
          },
        },
      }),
  };
});

// --- (2) DRIVE seam: mock the module-level executeBody the drive calls -------
const executorHook = vi.hoisted(() => ({
  impl: undefined as
    | ((...args: readonly unknown[]) => Promise<unknown>)
    | undefined,
}));
vi.mock("../src/runtime/statement-executor", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/runtime/statement-executor")>();
  return {
    ...actual,
    executeBody: (...args: readonly unknown[]): Promise<unknown> => {
      if (executorHook.impl === undefined) {
        throw new Error("executorHook.impl not set by the test");
      }
      return executorHook.impl(...args);
    },
  };
});

import { createProductionProducerDeps } from "../src/extension/production-theta-producer";
import { composeThetaFixture } from "../src/extension/theta-composition-producer";
import type {
  ConversationBinding,
  ConversationBindInput,
  ThetaCompositionInput,
  ThetaProducerDeps,
} from "../src/extension/theta-composition-producer";
import type {
  BodyExecution,
  ExecuteBodyDeps,
} from "../src/runtime/statement-executor";
import { makeErr, makeOk, type ThetaValue, type ResultValue } from "../src/runtime/value";
import type { QueryError } from "../src/runtime/query-error";
import { HostFatal, IndexOutOfBoundsPanic } from "../src/runtime/runtime-panics";
import { ToolReturnShapeDefectError } from "../src/runtime/tool-call-off-surface";
import type { Diagnostic } from "../src/diagnostics/diagnostic";
import type { RuntimeRoot } from "../src/runtime-root";
import type { Checkpoint, CheckpointKind, CheckpointSite } from "../src/seams/checkpoint";
import type { ThetaBody } from "../src/parser/theta-document";
import type { ParsedFrontmatter } from "../src/parser/frontmatter";

// --- shared scaffolding ------------------------------------------------------

class RecordingCheckpoint implements Checkpoint {
  before(_kind: CheckpointKind, _site: CheckpointSite): Promise<void> {
    return Promise.resolve();
  }
}

function rootDouble(): RuntimeRoot {
  return {
    checkpoint: new RecordingCheckpoint(),
    idSource: { newInvocationId: () => "inv-1", newToolCallId: () => "tc-1" },
    clock: { wallNow: () => 0 },
  } as unknown as RuntimeRoot;
}

function noopPi(): ExtensionAPI {
  return { sendMessage: (): void => {} } as unknown as ExtensionAPI;
}

function emptyBody(): ThetaBody {
  return { statements: [], tail: null } as unknown as ThetaBody;
}

function subagentTheta(): ThetaCompositionInput {
  const frontmatter: ParsedFrontmatter = { mode: "subagent" } as ParsedFrontmatter;
  return {
    slashName: "classify",
    sourcePath: "/theta/classify.theta",
    frontmatter,
    body: emptyBody(),
  } as unknown as ThetaCompositionInput;
}

// =============================================================================
// (1) The REAL subagent binding: teardown disposes+detaches once; surface does
//     not dispose; a dispose() throw is swallowed.
// =============================================================================

describe("PIC-9 — the subagent binding's teardown (real spawnSubagentConversation)", () => {
  beforeEach(() => {
    sdkHook.disposeCalls = 0;
    sdkHook.abortCalls = 0;
    sdkHook.disposeThrows = false;
  });

  /** Spawn a REAL subagent binding over the SDK spy session, threading a
   *  test-owned `thetaAbort` so the abort-listener detach is observable. */
  async function makeRealBinding(): Promise<{
    binding: ConversationBinding;
    thetaAbort: AbortController;
    removeSpy: ReturnType<typeof vi.spyOn>;
  }> {
    const deps: ThetaProducerDeps = createProductionProducerDeps({
      pi: noopPi(),
      root: rootDouble(),
      modelRegistry: {} as unknown as ModelRegistry,
    });
    const thetaAbort = new AbortController();
    const removeSpy = vi.spyOn(thetaAbort.signal, "removeEventListener");
    const ctx = {
      model: "claude-test",
      cwd: "/tmp",
      signal: undefined,
    } as unknown as ExtensionCommandContext;
    const bindInput: ConversationBindInput = {
      theta: subagentTheta(),
      args: "",
      ctx,
      thetaAbort,
    };
    const binding = await deps.spawnSubagentConversation(bindInput);
    return { binding, thetaAbort, removeSpy };
  }

  it("exposes a teardown, and surface() does NOT dispose (teardown moved out of surface)", async () => {
    const { binding } = await makeRealBinding();
    expect(binding.teardown).toBeDefined();

    // surface() is now a pure final-value projection — it must not dispose.
    binding.surface({ outcome: "success", result: { value: "ok" } } as unknown as BodyExecution);
    expect(sdkHook.disposeCalls).toBe(0);
    expect(sdkHook.abortCalls).toBe(0);
  });

  it("teardown() disposes exactly once AND detaches the abort listener exactly once; a second call is a no-op", async () => {
    const { binding, thetaAbort, removeSpy } = await makeRealBinding();

    binding.teardown?.();
    expect(sdkHook.disposeCalls).toBe(1);
    // The one-shot PIC-41 abort-forwarding listener was detached exactly once.
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith("abort", expect.any(Function));

    // Detach is real: after teardown, aborting thetaAbort no longer forwards into
    // the spawned session's abort().
    thetaAbort.abort(new Error("late"));
    expect(sdkHook.abortCalls).toBe(0);

    // Idempotent: a defensive second call disposes/detaches nothing further.
    binding.teardown?.();
    expect(sdkHook.disposeCalls).toBe(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it("a dispose() throw inside teardown is swallowed (never propagates out of the teardown)", async () => {
    sdkHook.disposeThrows = true;
    const { binding } = await makeRealBinding();

    // The dispose() throw must NOT escape teardown (it would mask an in-flight
    // body defect when teardown runs in the DRIVE `finally`).
    expect(() => binding.teardown?.()).not.toThrow();
    expect(sdkHook.disposeCalls).toBe(1);
  });
});

// =============================================================================
// (2) The DRIVE seam runs teardown on EVERY exit: throw / normal / returned-Err.
// =============================================================================

/** A subagent binding double whose surface/teardown/finishInvocation are spied,
 *  and a shared order log proving teardown runs before finishInvocation and
 *  surface is skipped on the throw path. */
interface DriveProbe {
  readonly deps: ThetaProducerDeps;
  readonly log: string[];
  surfaceCalls: number;
  teardownCalls: number;
  finishCalls: number;
  errNote: { thetaName: string; error: QueryError } | undefined;
  panicNote: { framing: string; diagnostic: Diagnostic } | undefined;
  panicNoteCalls: number;
}

function makeDriveProbe(surfaceReturn: ResultValue): DriveProbe {
  const state = {
    log: [] as string[],
    surfaceCalls: 0,
    teardownCalls: 0,
    finishCalls: 0,
    errNote: undefined as { thetaName: string; error: QueryError } | undefined,
    panicNote: undefined as { framing: string; diagnostic: Diagnostic } | undefined,
    panicNoteCalls: 0,
  };
  const binding: ConversationBinding = {
    drivenAgainst: "subagent-private-session",
    executeDeps: {} as unknown as ExecuteBodyDeps,
    surface: (): ResultValue => {
      state.surfaceCalls += 1;
      state.log.push("surface");
      return surfaceReturn;
    },
    teardown: (): void => {
      state.teardownCalls += 1;
      state.log.push("teardown");
    },
    finishInvocation: (): void => {
      state.finishCalls += 1;
      state.log.push("finish");
    },
  };
  const deps: ThetaProducerDeps = {
    runBinder: (): Promise<{ bound: true }> => Promise.resolve({ bound: true }),
    bindPromptConversation: (): ConversationBinding => binding,
    spawnSubagentConversation: (): Promise<ConversationBinding> =>
      Promise.resolve(binding),
    emitTopLevelErrNote: (thetaName: string, error: QueryError): void => {
      state.errNote = { thetaName, error };
    },
    emitPanicNote: (framing: string, diagnostic: Diagnostic): void => {
      state.panicNoteCalls += 1;
      state.panicNote = { framing, diagnostic };
    },
  };
  return {
    deps,
    get log() {
      return state.log;
    },
    get surfaceCalls() {
      return state.surfaceCalls;
    },
    get teardownCalls() {
      return state.teardownCalls;
    },
    get finishCalls() {
      return state.finishCalls;
    },
    get errNote() {
      return state.errNote;
    },
    get panicNote() {
      return state.panicNote;
    },
    get panicNoteCalls() {
      return state.panicNoteCalls;
    },
  };
}

function driveCtx(): ExtensionCommandContext {
  return { signal: undefined, cwd: "/tmp" } as unknown as ExtensionCommandContext;
}

/** A genuine runtime defect standing in for a `ToolReturnShapeDefectError` /
 *  `ThetaPanic` unwinding the body past `surface`. */
class InjectedBodyDefect extends Error {}

afterEach(() => {
  executorHook.impl = undefined;
});

describe("PIC-9 — the DRIVE seam runs the subagent teardown on every exit", () => {
  it("(throw path) executeBody THROWS -> teardown runs once BEFORE finish, surface is skipped, and the defect is caught + framed as ONE internal-error panic-note (error-model.md#runtime-panics)", async () => {
    // SPEC-CONTRACT REWRITE. This test previously asserted
    //   `await expect(fixture.run(...)).rejects.toBeInstanceOf(InjectedBodyDefect)`
    // — i.e. it PINNED the old buggy escape where a top-level runtime defect
    // thrown at slash dispatch propagated uncaught out of `run()` to the Pi
    // host. That was a spec violation: error-model.md §"Runtime panics" requires
    // a top-level defect to be CAUGHT in `composeThetaFixture.run` and surfaced
    // as ONE framed `theta-system-note`, with the session NOT torn down. The
    // rewrite is NOT a weakening — the old assertion encoded the bug; this one
    // encodes the contract. The teardown/finish assertions are unchanged (the
    // inner finally is INSIDE the outer catch, so teardown + finish still run).
    const probe = makeDriveProbe(makeOk("unused"));
    executorHook.impl = (): Promise<unknown> =>
      Promise.reject(new InjectedBodyDefect("tool-return-shape defect"));

    const fixture = composeThetaFixture(subagentTheta(), probe.deps);

    // run() RESOLVES — the defect no longer escapes to the host.
    await expect(fixture.run("", driveCtx())).resolves.toBeUndefined();

    // surface was skipped (the throw unwound past it); teardown STILL ran
    // exactly once, before finishInvocation (inner finally inside outer catch).
    expect(probe.surfaceCalls).toBe(0);
    expect(probe.teardownCalls).toBe(1);
    expect(probe.finishCalls).toBe(1);
    expect(probe.log).toEqual(["teardown", "finish"]);

    // The defect was framed as exactly ONE internal-error panic-note (a generic
    // throw is not a `ThetaPanic`, so it routes through the runtime-defect
    // surface with the `aborted with internal error:` framing).
    expect(probe.panicNoteCalls).toBe(1);
    expect(probe.panicNote?.framing).toBe(
      "theta /classify aborted with internal error: tool-return-shape defect",
    );
    expect(probe.panicNote?.diagnostic.code).toBe("theta/runtime/internal-error");
    // The err-note surface (SLSH-3) is for a returned `Err` VALUE, not a throw.
    expect(probe.errNote).toBeUndefined();
  });

  it("(top-level ThetaPanic) executeBody THROWS a ThetaPanic -> run() resolves; ONE panic-note framed `theta /<name> aborted: <message>`", async () => {
    const probe = makeDriveProbe(makeOk("unused"));
    const panic = new IndexOutOfBoundsPanic("index out of bounds: 5 not in 0..3");
    executorHook.impl = (): Promise<unknown> => Promise.reject(panic);

    const fixture = composeThetaFixture(subagentTheta(), probe.deps);
    await expect(fixture.run("", driveCtx())).resolves.toBeUndefined();

    expect(probe.teardownCalls).toBe(1);
    expect(probe.finishCalls).toBe(1);
    expect(probe.panicNoteCalls).toBe(1);
    expect(probe.panicNote?.framing).toBe(
      "theta /classify aborted: index out of bounds: 5 not in 0..3",
    );
    // The panic's registered `theta/runtime/*` code rides the diagnostic.
    expect(probe.panicNote?.diagnostic.code).toBe("theta/runtime/index-out-of-bounds");
    expect(probe.panicNote?.diagnostic.message).toBe("index out of bounds: 5 not in 0..3");
  });

  it("(top-level ToolReturnShapeDefectError) -> run() resolves; ONE internal-error panic-note carrying the defect's own precise-site diagnostic", async () => {
    const probe = makeDriveProbe(makeOk("unused"));
    const diagnostic: Diagnostic = {
      severity: "error",
      code: "theta/runtime/internal-error",
      file: "/theta/classify.theta",
      range: { start: { line: 4, column: 2 }, end: { line: 4, column: 9 } },
      message: "internal error: tool grep returned a non-conforming result envelope",
      details: { kind: "tool-return-shape", tool_name: "grep", shape_check: "content-not-iterable" },
    };
    executorHook.impl = (): Promise<unknown> =>
      Promise.reject(new ToolReturnShapeDefectError(diagnostic));

    const fixture = composeThetaFixture(subagentTheta(), probe.deps);
    await expect(fixture.run("", driveCtx())).resolves.toBeUndefined();

    expect(probe.teardownCalls).toBe(1);
    expect(probe.finishCalls).toBe(1);
    // Exactly ONE note (not two).
    expect(probe.panicNoteCalls).toBe(1);
    // The framing carries the BARE message (the `internal error: ` prefix stripped).
    expect(probe.panicNote?.framing).toBe(
      "theta /classify aborted with internal error: tool grep returned a non-conforming result envelope",
    );
    // The defect's own precise-site diagnostic is preferred verbatim.
    expect(probe.panicNote?.diagnostic).toBe(diagnostic);
  });

  it("(top-level RangeError) a catchable generic allocation throw -> run() resolves; ONE internal-error panic-note", async () => {
    const probe = makeDriveProbe(makeOk("unused"));
    executorHook.impl = (): Promise<unknown> =>
      Promise.reject(new RangeError("Invalid string length"));

    const fixture = composeThetaFixture(subagentTheta(), probe.deps);
    await expect(fixture.run("", driveCtx())).resolves.toBeUndefined();

    expect(probe.panicNoteCalls).toBe(1);
    expect(probe.panicNote?.framing).toBe(
      "theta /classify aborted with internal error: Invalid string length",
    );
    expect(probe.panicNote?.diagnostic.code).toBe("theta/runtime/internal-error");
  });

  it("(HostFatal) a host-fatal throw is the ONLY thing that propagates -> run() STILL rejects (re-raised, fail-fast NOCEIL-3); no panic-note", async () => {
    const probe = makeDriveProbe(makeOk("unused"));
    const fatal = new HostFatal("heap OOM");
    executorHook.impl = (): Promise<unknown> => Promise.reject(fatal);

    const fixture = composeThetaFixture(subagentTheta(), probe.deps);
    await expect(fixture.run("", driveCtx())).rejects.toBe(fatal);

    // Teardown/finish still ran (inner finally) before the outer catch re-raised.
    expect(probe.teardownCalls).toBe(1);
    expect(probe.finishCalls).toBe(1);
    // The runtime-defect surface never framed it — HostFatal is re-raised.
    expect(probe.panicNoteCalls).toBe(0);
    expect(probe.panicNote).toBeUndefined();
  });

  it("(normal path) a successful completion surfaces the value and tears down exactly once", async () => {
    const probe = makeDriveProbe(makeOk("final answer"));
    executorHook.impl = (): Promise<unknown> =>
      Promise.resolve({ outcome: "success", result: { value: "final answer" } } as unknown as BodyExecution);

    const fixture = composeThetaFixture(subagentTheta(), probe.deps);
    await fixture.run("", driveCtx());

    expect(probe.surfaceCalls).toBe(1);
    expect(probe.teardownCalls).toBe(1);
    expect(probe.finishCalls).toBe(1);
    // Value path intact; teardown runs after surface, before finish.
    expect(probe.log).toEqual(["surface", "teardown", "finish"]);
    // Ok surface emits no top-level err-note.
    expect(probe.errNote).toBeUndefined();
    // A normal completion is a VALUE path — the panic-note surface is untouched.
    expect(probe.panicNoteCalls).toBe(0);
  });

  it("(returned-Err path) a surfaced Err tears down exactly once and still emits the top-level err-note", async () => {
    const qerror = { kind: "transport" } as unknown as QueryError;
    const probe = makeDriveProbe(makeErr(qerror as unknown as ThetaValue));
    executorHook.impl = (): Promise<unknown> =>
      Promise.resolve({ outcome: "fail", error: null } as unknown as BodyExecution);

    const fixture = composeThetaFixture(subagentTheta(), probe.deps);
    await fixture.run("", driveCtx());

    expect(probe.surfaceCalls).toBe(1);
    expect(probe.teardownCalls).toBe(1);
    expect(probe.finishCalls).toBe(1);
    // The returned Err surfaced the one-line note (SLSH-3) — teardown did not
    // suppress it.
    expect(probe.errNote?.thetaName).toBe("classify");
    // A returned `Err` is a VALUE (not a throw) — the outer catch never sees it,
    // so the panic-note surface stays untouched (SLSH-3 err-note still emitted).
    expect(probe.panicNoteCalls).toBe(0);
  });
});
