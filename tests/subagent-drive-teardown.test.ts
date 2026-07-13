// PIC-9 subagent teardown on the DRIVE seam — the leak-on-throw fix.
//
// Regression pin for the Decision-6 B1 leak: on the subagent invocation drive,
// the spawned session's `dispose()` and the one-shot PIC-41 abort-forwarding
// `detach()` used to run ONLY inside `surface()`. When `executeBody` THREW a
// genuine defect (a `ToolReturnShapeDefectError` / `LoomPanic`) before `surface`
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
//   2. the DRIVE seam (`composeLoomFixture.run`) runs `binding.teardown()` on
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
// and the loom-suppressing resource loader / in-memory session manager / agent
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

import { createProductionProducerDeps } from "../src/extension/production-loom-producer";
import { composeLoomFixture } from "../src/extension/loom-composition-producer";
import type {
  ConversationBinding,
  ConversationBindInput,
  LoomCompositionInput,
  LoomProducerDeps,
} from "../src/extension/loom-composition-producer";
import type {
  BodyExecution,
  ExecuteBodyDeps,
} from "../src/runtime/statement-executor";
import { makeErr, makeOk, type LoomValue, type ResultValue } from "../src/runtime/value";
import type { QueryError } from "../src/runtime/query-error";
import type { RuntimeRoot } from "../src/runtime-root";
import type { Checkpoint, CheckpointKind, CheckpointSite } from "../src/seams/checkpoint";
import type { LoomBody } from "../src/parser/loom-document";
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

function emptyBody(): LoomBody {
  return { statements: [], tail: null } as unknown as LoomBody;
}

function subagentLoom(): LoomCompositionInput {
  const frontmatter: ParsedFrontmatter = { mode: "subagent" } as ParsedFrontmatter;
  return {
    slashName: "classify",
    sourcePath: "/looms/classify.loom",
    frontmatter,
    body: emptyBody(),
  } as unknown as LoomCompositionInput;
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
   *  test-owned `loomAbort` so the abort-listener detach is observable. */
  async function makeRealBinding(): Promise<{
    binding: ConversationBinding;
    loomAbort: AbortController;
    removeSpy: ReturnType<typeof vi.spyOn>;
  }> {
    const deps: LoomProducerDeps = createProductionProducerDeps({
      pi: noopPi(),
      root: rootDouble(),
      modelRegistry: {} as unknown as ModelRegistry,
    });
    const loomAbort = new AbortController();
    const removeSpy = vi.spyOn(loomAbort.signal, "removeEventListener");
    const ctx = {
      model: "claude-test",
      cwd: "/tmp",
      signal: undefined,
    } as unknown as ExtensionCommandContext;
    const bindInput: ConversationBindInput = {
      loom: subagentLoom(),
      args: "",
      ctx,
      loomAbort,
    };
    const binding = await deps.spawnSubagentConversation(bindInput);
    return { binding, loomAbort, removeSpy };
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
    const { binding, loomAbort, removeSpy } = await makeRealBinding();

    binding.teardown?.();
    expect(sdkHook.disposeCalls).toBe(1);
    // The one-shot PIC-41 abort-forwarding listener was detached exactly once.
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith("abort", expect.any(Function));

    // Detach is real: after teardown, aborting loomAbort no longer forwards into
    // the spawned session's abort().
    loomAbort.abort(new Error("late"));
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
  readonly deps: LoomProducerDeps;
  readonly log: string[];
  surfaceCalls: number;
  teardownCalls: number;
  finishCalls: number;
  errNote: { loomName: string; error: QueryError } | undefined;
}

function makeDriveProbe(surfaceReturn: ResultValue): DriveProbe {
  const state = {
    log: [] as string[],
    surfaceCalls: 0,
    teardownCalls: 0,
    finishCalls: 0,
    errNote: undefined as { loomName: string; error: QueryError } | undefined,
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
  const deps: LoomProducerDeps = {
    runBinder: (): Promise<{ bound: true }> => Promise.resolve({ bound: true }),
    bindPromptConversation: (): ConversationBinding => binding,
    spawnSubagentConversation: (): Promise<ConversationBinding> =>
      Promise.resolve(binding),
    emitTopLevelErrNote: (loomName: string, error: QueryError): void => {
      state.errNote = { loomName, error };
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
  };
}

function driveCtx(): ExtensionCommandContext {
  return { signal: undefined, cwd: "/tmp" } as unknown as ExtensionCommandContext;
}

/** A genuine runtime defect standing in for a `ToolReturnShapeDefectError` /
 *  `LoomPanic` unwinding the body past `surface`. */
class InjectedBodyDefect extends Error {}

afterEach(() => {
  executorHook.impl = undefined;
});

describe("PIC-9 — the DRIVE seam runs the subagent teardown on every exit", () => {
  it("(throw path) executeBody THROWS -> teardown runs once BEFORE finish, surface is skipped, and the defect propagates unmasked", async () => {
    const probe = makeDriveProbe(makeOk("unused"));
    executorHook.impl = (): Promise<unknown> =>
      Promise.reject(new InjectedBodyDefect("tool-return-shape defect"));

    const fixture = composeLoomFixture(subagentLoom(), probe.deps);

    // The original defect propagates unmasked (teardown did NOT replace it).
    await expect(fixture.run("", driveCtx())).rejects.toBeInstanceOf(InjectedBodyDefect);

    // surface was skipped (the throw unwound past it); teardown STILL ran
    // exactly once, before finishInvocation.
    expect(probe.surfaceCalls).toBe(0);
    expect(probe.teardownCalls).toBe(1);
    expect(probe.finishCalls).toBe(1);
    expect(probe.log).toEqual(["teardown", "finish"]);
  });

  it("(normal path) a successful completion surfaces the value and tears down exactly once", async () => {
    const probe = makeDriveProbe(makeOk("final answer"));
    executorHook.impl = (): Promise<unknown> =>
      Promise.resolve({ outcome: "success", result: { value: "final answer" } } as unknown as BodyExecution);

    const fixture = composeLoomFixture(subagentLoom(), probe.deps);
    await fixture.run("", driveCtx());

    expect(probe.surfaceCalls).toBe(1);
    expect(probe.teardownCalls).toBe(1);
    expect(probe.finishCalls).toBe(1);
    // Value path intact; teardown runs after surface, before finish.
    expect(probe.log).toEqual(["surface", "teardown", "finish"]);
    // Ok surface emits no top-level err-note.
    expect(probe.errNote).toBeUndefined();
  });

  it("(returned-Err path) a surfaced Err tears down exactly once and still emits the top-level err-note", async () => {
    const qerror = { kind: "transport" } as unknown as QueryError;
    const probe = makeDriveProbe(makeErr(qerror as unknown as LoomValue));
    executorHook.impl = (): Promise<unknown> =>
      Promise.resolve({ outcome: "fail", error: null } as unknown as BodyExecution);

    const fixture = composeLoomFixture(subagentLoom(), probe.deps);
    await fixture.run("", driveCtx());

    expect(probe.surfaceCalls).toBe(1);
    expect(probe.teardownCalls).toBe(1);
    expect(probe.finishCalls).toBe(1);
    // The returned Err surfaced the one-line note (SLSH-3) — teardown did not
    // suppress it.
    expect(probe.errNote?.loomName).toBe("classify");
  });
});
