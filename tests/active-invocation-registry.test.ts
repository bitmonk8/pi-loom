// V9e-T — failing tests for the `ActiveInvocationRegistry` (V9e).
//
// Spec: pi-integration-contract/active-invocation-registry.md §"Active
// invocation registry" / §"Registry contract", errors-and-results/error-model.md
// §"Runtime panics" (the runtime-defect surface), and host-interfaces-services.md
// PIC-20 (`IdSource`).
//
// Per the registry-name-is-internal testing posture, every assertion is on an
// observable side effect — entry counts via the probe seam, insertion-order
// iteration, `disposeBarrier` settlement, and the emitted diagnostic/error
// surface — never on the internal registry symbol.
//
// These tests red on their own primary assertions while the V9e implementation
// is absent (the V9e-T seam stubs are inert), per the per-phase TDD ritual's
// "fail red for the intended reason".

import { assert, describe, expect, it } from "vitest";
import type { IdSource } from "../src/seams/id-source";
import {
  ActiveInvocationRegistry,
  dispatchSiteSetup,
  runPerInvocationFinally,
  type AbortSourceLike,
  type ActiveInvocationEntry,
  type AgentSessionLike,
} from "../src/runtime/active-invocation-registry";

// --- helpers --------------------------------------------------------------

function makeEntry(loom: string, invocationId: string): ActiveInvocationEntry {
  return {
    loomAbort: new AbortController(),
    disposeBarrier: Promise.resolve(),
    shutdownReason: undefined,
    loom,
    invocationId,
  };
}

function fixedIdSource(id: string): IdSource {
  return {
    newInvocationId: (): string => id,
    newToolCallId: (): string => "unused-tool-call-id",
  };
}

function throwingIdSource(): IdSource {
  return {
    newInvocationId: (): string => {
      throw new Error("idsource boom");
    },
    newToolCallId: (): string => "unused-tool-call-id",
  };
}

function inertSource(): AbortSourceLike {
  return { addEventListener: (): void => {} };
}

function makeSite(): { readonly file: string; readonly range: ReturnType<typeof range> } {
  return { file: "test.loom", range: range() };
}

function range(): {
  readonly start: { readonly line: number; readonly column: number };
  readonly end: { readonly line: number; readonly column: number };
} {
  return { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } };
}

// --- insertion-order iteration --------------------------------------------

describe("ActiveInvocationRegistry — insertion-order iteration (PIC area)", () => {
  it("iterates registered invocations in insertion order; teardown reaches every entry", () => {
    const registry = new ActiveInvocationRegistry();
    const e1 = makeEntry("alpha", "id-1");
    const e2 = makeEntry("beta", "id-2");
    const e3 = makeEntry("gamma", "id-3");

    registry.add(e1);
    registry.add(e2);
    registry.add(e3);

    // A registered invocation is tracked (entry-count probe).
    expect(registry.size()).toBe(3);

    // Iteration is insertion order, and teardown reaches every in-flight entry:
    // the ordered snapshot the teardown handler walks names all three, in order.
    expect(registry.snapshot().map((entry) => entry.invocationId)).toEqual([
      "id-1",
      "id-2",
      "id-3",
    ]);

    // Removal in the per-invocation `finally` shrinks the live set.
    registry.remove(e2);
    expect(registry.snapshot().map((entry) => entry.invocationId)).toEqual([
      "id-1",
      "id-3",
    ]);
    expect(registry.size()).toBe(2);
  });
});

// --- disposeBarrier --------------------------------------------------------

describe("ActiveInvocationRegistry — disposeBarrier (PIC area)", () => {
  it("settles after that entry's AgentSession.dispose() returns (subagent), only that entry's barrier", async () => {
    const registry = new ActiveInvocationRegistry();
    const order: string[] = [];
    const session: AgentSessionLike = {
      dispose: async (): Promise<void> => {
        order.push("dispose");
      },
      abort: (): void => {},
    };

    const out = await dispatchSiteSetup({
      registry,
      idSource: fixedIdSource("id-subagent"),
      loom: "child",
      mode: "subagent",
      source: inertSource(),
      site: makeSite(),
      createAgentSession: async (): Promise<AgentSessionLike> => session,
    });
    assert(out.kind === "ok");

    // A concurrent sibling entry whose barrier must remain pending — settling
    // one entry's barrier is a single entry's barrier, not the aggregate.
    const sibling = await dispatchSiteSetup({
      registry,
      idSource: fixedIdSource("id-sibling"),
      loom: "other",
      mode: "prompt",
      source: inertSource(),
      site: makeSite(),
    });
    assert(sibling.kind === "ok");
    let siblingSettled = false;
    void sibling.entry.disposeBarrier.then(() => {
      siblingSettled = true;
    });

    await runPerInvocationFinally({
      registry,
      entry: out.entry,
      settleDisposeBarrier: out.settleDisposeBarrier,
      mode: "subagent",
      session,
    });
    await out.entry.disposeBarrier;
    order.push("barrier");

    // The barrier settled *after* dispose returned.
    expect(order).toEqual(["dispose", "barrier"]);

    // The sibling's barrier was not settled by this entry's `finally`.
    await Promise.resolve();
    expect(siblingSettled).toBe(false);
  });

  it("settles immediately in prompt mode (no AgentSession.dispose)", async () => {
    const registry = new ActiveInvocationRegistry();
    const out = await dispatchSiteSetup({
      registry,
      idSource: fixedIdSource("id-prompt"),
      loom: "prompt-loom",
      mode: "prompt",
      source: inertSource(),
      site: makeSite(),
    });
    assert(out.kind === "ok");
    expect(out.session).toBeUndefined();

    let settled = false;
    void out.entry.disposeBarrier.then(() => {
      settled = true;
    });
    await runPerInvocationFinally({
      registry,
      entry: out.entry,
      settleDisposeBarrier: out.settleDisposeBarrier,
      mode: "prompt",
      session: undefined,
    });
    await out.entry.disposeBarrier;
    expect(settled).toBe(true);
  });
});

// --- invocationId allocation ----------------------------------------------

describe("ActiveInvocationRegistry — invocationId allocation (PIC area)", () => {
  it("sources invocationId only from IdSource.newInvocationId()", async () => {
    const registry = new ActiveInvocationRegistry();
    let invocationIdCalls = 0;
    const idSource: IdSource = {
      newInvocationId: (): string => {
        invocationIdCalls += 1;
        return "550e8400-e29b-41d4-a716-446655440000";
      },
      newToolCallId: (): string => {
        throw new Error("invocationId must not be minted via newToolCallId()");
      },
    };

    const out = await dispatchSiteSetup({
      registry,
      idSource,
      loom: "x",
      mode: "prompt",
      source: inertSource(),
      site: makeSite(),
    });
    assert(out.kind === "ok");

    expect(out.entry.invocationId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(invocationIdCalls).toBe(1);
  });
});

// --- Dispatch-site setup wrap failure path --------------------------------

describe("ActiveInvocationRegistry — Dispatch-site setup wrap failure path (PIC area)", () => {
  it("routes a setup-sequence throw through the runtime-defect surface and leaks no entry", async () => {
    const registry = new ActiveInvocationRegistry();
    const out = await dispatchSiteSetup({
      registry,
      // `newInvocationId()` throws — a throw before the registry `Set.add`.
      idSource: throwingIdSource(),
      loom: "x",
      mode: "prompt",
      source: inertSource(),
      site: makeSite(),
    });

    assert(out.kind === "defect");
    expect(out.diagnostic.code).toBe("loom/runtime/internal-error");
    expect(out.error.kind).toBe("invoke_infra");
    expect(out.error.cause).toBe("internal_error");

    // A throw before `Set.add` completes leaks no entry: the probe stays empty.
    expect(registry.size()).toBe(0);
  });

  it("routes a setup-sequence rejection (createAgentSession rejects) through the runtime-defect surface", async () => {
    const registry = new ActiveInvocationRegistry();
    const out = await dispatchSiteSetup({
      registry,
      idSource: fixedIdSource("id"),
      loom: "x",
      mode: "subagent",
      source: inertSource(),
      site: makeSite(),
      createAgentSession: async (): Promise<AgentSessionLike> => {
        throw new Error("createAgentSession rejected");
      },
    });

    assert(out.kind === "defect");
    expect(out.diagnostic.code).toBe("loom/runtime/internal-error");
    expect(out.error.cause).toBe("internal_error");
  });

  it("drops a catch-arm cleanup loomAbort.abort() throw without masking the original setup throw", async () => {
    const registry = new ActiveInvocationRegistry();
    const real = new AbortController();
    const throwingController = {
      signal: real.signal,
      abort: (): void => {
        throw new Error("abort cleanup boom");
      },
    } as unknown as AbortController;

    const out = await dispatchSiteSetup({
      registry,
      idSource: fixedIdSource("id"),
      loom: "x",
      mode: "subagent",
      source: inertSource(),
      site: makeSite(),
      makeAbortController: (): AbortController => throwingController,
      createAgentSession: async (): Promise<AgentSessionLike> => {
        throw new Error("original setup boom");
      },
    });

    assert(out.kind === "defect");
    expect(out.diagnostic.code).toBe("loom/runtime/internal-error");
    // The surfaced error reflects the ORIGINAL setup throw, not the cleanup throw.
    expect(out.diagnostic.message).toContain("original setup boom");
    expect(out.diagnostic.message).not.toContain("abort cleanup boom");
    expect(out.error.cause).toBe("internal_error");
  });
});
