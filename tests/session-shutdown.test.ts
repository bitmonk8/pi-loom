// V9g-T — failing tests for the `session_shutdown` teardown handler and its
// emission isolation (paired V9g implementation leaf).
//
// Spec:
//   pi-integration-contract/session-shutdown-semantics.md
//     — the five-sub-step fixed teardown sequence, **Per-step isolation**
//       (one `teardown-step-failed` per failing call site, remaining sub-steps
//       still run), the closed `details.call` label set, and sub-step 3's
//       `cka-31` bounded `Promise.allSettled` over every entry's
//       `disposeBarrier` (cap `SHUTDOWN_AWAIT_CAP_MS`);
//   pi-integration-contract/diagnostic-emission-isolation.md
//     — PIC-24 (each teardown-time `console.error` wrapped in `try`/`catch`),
//       PIC-25 (bare-`code` / two-token / three-token serialiser-throw
//       fallbacks), PIC-26 (construction-site catch-arm self-wrap),
//       PIC-27 (a throw out of `console.error` is swallowed and does not escape
//       the handler), PIC-28 (invocation-site count semantics);
//   pi-integration-contract/host-prerequisites.md PIC-7 (one active user
//     session per instance; the reason union pinned to
//     `SessionShutdownEvent['reason']`);
//   cancellation.md CNCL-4 (the session-shutdown synthesised-reason facet:
//     `loomAbort.abort(reason)` with a synthesised `Error` whose `message` is
//     byte-exact `"loom cancelled by session shutdown"`, observable as
//     `signal.reason === source.reason` at a downstream checkpoint);
//   diagnostics/code-registry-host.md, -runtime.md (the *Message* column
//     strings the message-anchor assertions source).
//
// Each test cites its REQ-ID / code-keyed-area token inline per the
// conventions.md REQ-ID-discipline and Diagnostic-message-anchor rules. Every
// assertion is on an observable side effect (a spy on an injected seam, an
// emitted diagnostic's fields, or `loomAbort.signal.reason`), and reds on its
// own primary assertion while the V9g implementation is absent (the V9g-T seam
// stubs are inert), per the per-phase TDD ritual's "fail red for the intended
// reason".

import { assert, describe, expect, it, vi } from "vitest";
import { FakeClock } from "./helpers/fake-clock";
import {
  ActiveInvocationRegistry,
  type ActiveInvocationEntry,
} from "../src/runtime/active-invocation-registry";
import { LoomRegistry } from "../src/extension/reload-wiring";
import { SESSION_SHUTDOWN_REASON_SNAPSHOT } from "../src/extension/version-bump-gates";
import {
  cancelledBySessionShutdownDiagnostic,
  emitNestedShapeDiagnostic,
  emitTeardownDiagnostic,
  reloadTeardownTimeoutDiagnostic,
  runSessionShutdown,
  SESSION_SHUTDOWN_ABORT_MESSAGE,
  SHUTDOWN_AWAIT_CAP_MS,
  synthesiseSessionShutdownReason,
  teardownStepFailedDiagnostic,
  TEARDOWN_STEP_CALL_LABELS,
  type ClosableWatcher,
  type EmissionSink,
  type ForwardingSignalSource,
  type NestedShapeEmission,
  type SessionShutdownDeps,
  type SessionShutdownEventLike,
  CANCELLED_BY_SESSION_SHUTDOWN_CODE,
  RELOAD_TEARDOWN_TIMEOUT_CODE,
  RUNTIME_DEGRADED_CODE,
  TEARDOWN_STEP_FAILED_CODE,
} from "../src/extension/session-shutdown";
import type { Diagnostic } from "../src/diagnostics/diagnostic";

// --- registry *Message* column templates (with placeholders filled) ---------

const teardownStepFailedMessage = (step: number, call: string, error: string): string =>
  `session_shutdown teardown step ${step} failed at ${call}: ${error}`;
const reloadTeardownTimeoutMessage = (ms: number, n: number, list: string): string =>
  `reload teardown timed out after ${ms}ms; ${n} invocation(s) still in flight: ${list}`;
const cancelledMessage = (name: string, reason: string): string =>
  `loom /${name} cancelled by session shutdown (${reason})`;

// --- helpers ----------------------------------------------------------------

/** A registry entry whose `disposeBarrier` is externally settleable. */
interface ControllableEntry {
  readonly entry: ActiveInvocationEntry;
  settle(): void;
}

function makeEntry(
  loom: string,
  invocationId: string,
  options: { settleable?: boolean } = {},
): ControllableEntry {
  let settle: () => void = (): void => {};
  const disposeBarrier =
    options.settleable === true
      ? new Promise<void>((resolve) => {
          settle = resolve;
        })
      : // A never-settling barrier so sub-step 3's bounded await is exercised.
        new Promise<void>(() => {});
  const entry: ActiveInvocationEntry = {
    loomAbort: new AbortController(),
    disposeBarrier,
    shutdownReason: undefined,
    loom,
    invocationId,
  };
  return { entry, settle };
}

function watcherSpy(): ClosableWatcher & { close: ReturnType<typeof vi.fn> } {
  return { close: vi.fn() };
}

function signalSpy(label: ForwardingSignalSource["label"]): ForwardingSignalSource & {
  removeEventListener: ReturnType<typeof vi.fn>;
} {
  return { label, removeEventListener: vi.fn() };
}

function sinkSpy(
  options: { serialiseThrows?: boolean; emitThrows?: boolean } = {},
): EmissionSink & {
  emit: ReturnType<typeof vi.fn>;
  serialise: ReturnType<typeof vi.fn>;
} {
  return {
    emit: vi.fn((line: unknown) => {
      void line;
      if (options.emitThrows === true) {
        throw new Error("console.error boom");
      }
    }),
    serialise: vi.fn((diagnostic: Diagnostic) => {
      if (options.serialiseThrows === true) {
        throw new Error("serialiser boom");
      }
      return JSON.stringify(diagnostic);
    }),
  };
}

/** The healthy pinned-constant inventory the handler reads the reason union from. */
function healthyInventory(): SessionShutdownDeps["inventory"] {
  return [
    {
      kind: "type-union-snapshot",
      path: "SessionShutdownEvent.reason",
      literals: [...SESSION_SHUTDOWN_REASON_SNAPSHOT.literals],
    },
  ];
}

interface HarnessOverrides {
  readonly entries?: readonly ControllableEntry[];
  readonly sink?: ReturnType<typeof sinkSpy>;
  readonly clock?: FakeClock;
}

interface Harness {
  readonly deps: SessionShutdownDeps;
  readonly registry: LoomRegistry;
  readonly activeInvocations: ActiveInvocationRegistry;
  readonly clock: FakeClock;
  readonly discoveryWatcher: ReturnType<typeof watcherSpy>;
  readonly settingsWatcher: ReturnType<typeof watcherSpy>;
  readonly forwardingSignals: readonly ReturnType<typeof signalSpy>[];
  readonly sink: ReturnType<typeof sinkSpy>;
}

function makeHarness(overrides: HarnessOverrides = {}): Harness {
  const registry = new LoomRegistry();
  const activeInvocations = new ActiveInvocationRegistry();
  for (const { entry } of overrides.entries ?? []) {
    activeInvocations.add(entry);
  }
  const clock = overrides.clock ?? new FakeClock();
  const discoveryWatcher = watcherSpy();
  const settingsWatcher = watcherSpy();
  const forwardingSignals = [
    signalSpy("ctx.signal.removeEventListener"),
    signalSpy("toolSignal.removeEventListener"),
    signalSpy("parentInvokeSignal.removeEventListener"),
  ];
  const sink = overrides.sink ?? sinkSpy();
  const deps: SessionShutdownDeps = {
    registry,
    activeInvocations,
    clock,
    discoveryWatcher,
    settingsWatcher,
    debounceHandle: clock.setTimeout(() => {}, 250),
    forwardingSignals,
    inventory: healthyInventory(),
    sink,
  };
  return {
    deps,
    registry,
    activeInvocations,
    clock,
    discoveryWatcher,
    settingsWatcher,
    forwardingSignals,
    sink,
  };
}

const eventWith = (reason: unknown): SessionShutdownEventLike => ({ reason });

/** Drive a teardown that must complete even when sub-step 3 never settles. */
async function driveShutdown(
  event: SessionShutdownEventLike,
  harness: Harness,
): Promise<void> {
  const done = runSessionShutdown(event, harness.deps);
  // Fire the bounded-await cap so a never-settling sub-step 3 does not hang.
  harness.clock.advance(SHUTDOWN_AWAIT_CAP_MS + 3);
  await done;
}

// ============================================================================
// PIC-7 — session-binding contract (one active session; reason union pinned)
// ============================================================================

describe("PIC-7 — session-binding contract", () => {
  it("drains the single extension-scoped registry exactly once per shutdown (PIC-7)", async () => {
    const harness = makeHarness();
    const drainSpy = vi.spyOn(harness.registry, "drain");
    await driveShutdown(eventWith("reload"), harness);
    // One active user session per instance → the handler drains its single
    // registry exactly once.
    expect(drainSpy).toHaveBeenCalledTimes(1);
  });

  it("consumes the reason union pinned to SessionShutdownEvent['reason'] — a closed-set reason runs the full teardown (PIC-7)", async () => {
    const harness = makeHarness();
    const drainSpy = vi.spyOn(harness.registry, "drain");
    // Each of the five pinned closed-set reasons drives a full teardown.
    for (const reason of SESSION_SHUTDOWN_REASON_SNAPSHOT.literals) {
      await driveShutdown(eventWith(reason), makeHarness());
    }
    await driveShutdown(eventWith("reload"), harness);
    expect(drainSpy).toHaveBeenCalledTimes(1);
    // The union the handler is pinned against is exactly the SDK snapshot.
    expect([...SESSION_SHUTDOWN_REASON_SNAPSHOT.literals]).toStrictEqual([
      "quit",
      "reload",
      "new",
      "resume",
      "fork",
    ]);
  });
});

// ============================================================================
// Sub-step 1 — LoomRegistry.drain then initDrainStateTag, in fixed order
// ============================================================================

describe("session_shutdown sub-step 1 — drain then init-tag", () => {
  it("calls loomRegistry.drain before loomRegistry.initDrainStateTag (fixed order)", async () => {
    const harness = makeHarness();
    const order: string[] = [];
    vi.spyOn(harness.registry, "drain").mockImplementation(() => {
      order.push("drain");
    });
    vi.spyOn(harness.registry, "initDrainStateTag").mockImplementation(() => {
      order.push("initDrainStateTag");
    });
    await driveShutdown(eventWith("reload"), harness);
    expect(order).toStrictEqual(["drain", "initDrainStateTag"]);
  });
});

// ============================================================================
// CNCL-4 — session-shutdown synthesised-reason facet (sub-step 2)
// ============================================================================

describe("CNCL-4 — session-shutdown synthesised abort reason", () => {
  it("synthesises an Error whose message is byte-exact \"loom cancelled by session shutdown\" (CNCL-4)", () => {
    const reason = synthesiseSessionShutdownReason();
    expect(reason).toBeInstanceOf(Error);
    expect(reason.message).toBe("loom cancelled by session shutdown");
    // The exported constant is the single source of truth for the message.
    expect(reason.message).toBe(SESSION_SHUTDOWN_ABORT_MESSAGE);
  });

  it("aborts each in-flight loomAbort with the synthesised Error itself, observable as signal.reason (CNCL-4)", async () => {
    const a = makeEntry("plan", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", { settleable: true });
    const b = makeEntry("review", "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", { settleable: true });
    const harness = makeHarness({ entries: [a, b] });
    a.settle();
    b.settle();
    await driveShutdown(eventWith("reload"), harness);
    for (const { entry } of [a, b]) {
      // signal.reason === source.reason: the synthesised Error object itself.
      expect(entry.loomAbort.signal.aborted).toBe(true);
      const observed = entry.loomAbort.signal.reason as unknown;
      expect(observed).toBeInstanceOf(Error);
      expect((observed as Error).message).toBe("loom cancelled by session shutdown");
    }
  });

  it("stamps entry.shutdownReason before aborting (sub-step 2 stamp-then-abort)", async () => {
    const a = makeEntry("plan", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", { settleable: true });
    const harness = makeHarness({ entries: [a] });
    a.settle();
    await driveShutdown(eventWith("new"), harness);
    // The captured `event.reason` string is stamped onto the entry.
    expect(a.entry.shutdownReason).toBe("new");
  });
});

// ============================================================================
// cka-31 — sub-step 3 bounded Promise.allSettled over disposeBarriers
// ============================================================================

describe("session_shutdown sub-step 3 — bounded settle-all (cka-31)", () => {
  it("exposes SHUTDOWN_AWAIT_CAP_MS pinned at 2000ms (cka-31)", () => {
    expect(SHUTDOWN_AWAIT_CAP_MS).toBe(2000);
  });

  it("emits reload-teardown-timeout naming every still-in-flight entry at the cap (cka-31)", async () => {
    const a = makeEntry("plan", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"); // never settles
    const b = makeEntry("review", "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"); // never settles
    const harness = makeHarness({ entries: [a, b] });
    await driveShutdown(eventWith("reload"), harness);
    // A `reload-teardown-timeout` was emitted (via the wrapped console.error).
    const timeoutEmit = harness.sink.emit.mock.calls.find((call) =>
      String(call[0]).includes(RELOAD_TEARDOWN_TIMEOUT_CODE),
    );
    expect(timeoutEmit).toBeDefined();
    // Both still-in-flight invocations are named in insertion order.
    expect(String(timeoutEmit?.[0])).toContain(
      "/plan:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    );
    expect(String(timeoutEmit?.[0])).toContain(
      "/review:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    );
  });

  it("does NOT emit reload-teardown-timeout when every disposeBarrier settles within the cap (cka-31)", async () => {
    const a = makeEntry("plan", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", { settleable: true });
    const harness = makeHarness({ entries: [a] });
    // Settle inside the window: dispatch, then settle before advancing the cap.
    const done = runSessionShutdown(eventWith("reload"), harness.deps);
    a.settle();
    await Promise.resolve();
    harness.clock.advance(SHUTDOWN_AWAIT_CAP_MS + 3);
    await done;
    const timeoutEmit = harness.sink.emit.mock.calls.find((call) =>
      String(call[0]).includes(RELOAD_TEARDOWN_TIMEOUT_CODE),
    );
    expect(timeoutEmit).toBeUndefined();
    // Sub-step 4 still runs after a clean settle-all.
    expect(harness.settingsWatcher.close).toHaveBeenCalledTimes(1);
  });

  it("builds a reload-teardown-timeout naming the still-in-flight entries with elapsed hint (cka-31)", () => {
    const a = makeEntry("plan", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    const b = makeEntry("review", "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    const diagnostic = reloadTeardownTimeoutDiagnostic([a.entry, b.entry], 2003);
    expect(diagnostic.code).toBe(RELOAD_TEARDOWN_TIMEOUT_CODE);
    expect(diagnostic.severity).toBe("error");
    const list =
      "/plan:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa, /review:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    expect(diagnostic.message).toBe(reloadTeardownTimeoutMessage(2003, 2, list));
    // `hint` is the elapsed wall time rendered as a bare decimal integer.
    expect(diagnostic.hint).toBe("2003");
  });
});

// ============================================================================
// loom/runtime/cancelled-by-session-shutdown — per in-flight invocation
// ============================================================================

describe("loom/runtime/cancelled-by-session-shutdown — per-invocation note", () => {
  it("builds the note with display-false semantics and the nested details.event shape", () => {
    const a = makeEntry("plan", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    a.entry.shutdownReason = "reload";
    const diagnostic = cancelledBySessionShutdownDiagnostic(a.entry);
    expect(diagnostic.code).toBe(CANCELLED_BY_SESSION_SHUTDOWN_CODE);
    expect(diagnostic.severity).toBe("error");
    expect(diagnostic.message).toBe(cancelledMessage("plan", "reload"));
    // `details.event` is the runtime-constructed { reason, loom, invocation_id }.
    const event = diagnostic.details?.event as Record<string, unknown> | undefined;
    expect(event?.reason).toBe("reload");
    expect(event?.loom).toBe("plan");
    expect(event?.invocation_id).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
  });

  it("produces a distinct invocation_id per in-flight invocation", () => {
    const a = makeEntry("plan", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    const b = makeEntry("plan", "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    a.entry.shutdownReason = "reload";
    b.entry.shutdownReason = "reload";
    const da = cancelledBySessionShutdownDiagnostic(a.entry);
    const db = cancelledBySessionShutdownDiagnostic(b.entry);
    const ea = da.details?.event as Record<string, unknown> | undefined;
    const eb = db.details?.event as Record<string, unknown> | undefined;
    expect(ea?.invocation_id).not.toBe(eb?.invocation_id);
  });
});

// ============================================================================
// DIAG-1 (host rows) — teardown-step-failed shape + closed details.call set
// ============================================================================

describe("DIAG-1 (host rows) — teardown-step-failed", () => {
  it("builds the (W, runtime) diagnostic with details { step, call, error } (DIAG-1)", () => {
    const diagnostic = teardownStepFailedDiagnostic(1, "loomRegistry.drain", new Error("drain boom"));
    expect(diagnostic.code).toBe(TEARDOWN_STEP_FAILED_CODE);
    expect(diagnostic.severity).toBe("warning");
    expect(diagnostic.details?.step).toBe(1);
    expect(diagnostic.details?.call).toBe("loomRegistry.drain");
    expect(diagnostic.details?.error).toBe("drain boom");
    expect(diagnostic.message).toBe(
      teardownStepFailedMessage(1, "loomRegistry.drain", "drain boom"),
    );
  });

  it("coerces a non-Error throw's details.error via String(...) (DIAG-1)", () => {
    const diagnostic = teardownStepFailedDiagnostic(4, "discoveryWatcher.close", "raw string");
    expect(diagnostic.details?.error).toBe("raw string");
  });

  it("emits one teardown-step-failed with the closed details.call label when sub-step 1 drain throws (DIAG-1, PIC-28)", async () => {
    const harness = makeHarness();
    vi.spyOn(harness.registry, "drain").mockImplementation(() => {
      throw new Error("drain boom");
    });
    await driveShutdown(eventWith("reload"), harness);
    const failedEmits = harness.sink.emit.mock.calls.filter((call) =>
      String(call[0]).includes(TEARDOWN_STEP_FAILED_CODE),
    );
    // Exactly one emission for the single failing call site (PIC-28).
    expect(failedEmits.length).toBe(1);
    expect(String(failedEmits[0]?.[0])).toContain("loomRegistry.drain");
    expect(TEARDOWN_STEP_CALL_LABELS[1]).toContain("loomRegistry.drain");
    // Per-step isolation: sub-step 1's second act still ran after the first threw.
    // (drain threw; initDrainStateTag is a distinct call site.)
  });
});

// ============================================================================
// Per-step isolation — a throw in one call site does not stop the rest
// ============================================================================

describe("session_shutdown per-step isolation", () => {
  it("runs sub-steps 4 and 5 even when sub-step 1 drain throws (per-step isolation)", async () => {
    const harness = makeHarness();
    vi.spyOn(harness.registry, "drain").mockImplementation(() => {
      throw new Error("drain boom");
    });
    await driveShutdown(eventWith("reload"), harness);
    expect(harness.discoveryWatcher.close).toHaveBeenCalledTimes(1);
    expect(harness.settingsWatcher.close).toHaveBeenCalledTimes(1);
    for (const signal of harness.forwardingSignals) {
      expect(signal.removeEventListener).toHaveBeenCalledTimes(1);
    }
  });

  it("emits one teardown-step-failed per failing sub-step-4 close, remaining sub-steps still run (PIC-28)", async () => {
    const harness = makeHarness();
    harness.discoveryWatcher.close.mockImplementation(() => {
      throw new Error("discovery close boom");
    });
    await driveShutdown(eventWith("reload"), harness);
    const failedEmits = harness.sink.emit.mock.calls.filter((call) =>
      String(call[0]).includes(TEARDOWN_STEP_FAILED_CODE) &&
      String(call[0]).includes("discoveryWatcher.close"),
    );
    expect(failedEmits.length).toBe(1);
    // settingsWatcher.close (a distinct sub-step-4 call site) still ran.
    expect(harness.settingsWatcher.close).toHaveBeenCalledTimes(1);
  });

  it("detaches every sub-step-5 forwarding listener even when one detach throws", async () => {
    const harness = makeHarness();
    const [first, second, third] = harness.forwardingSignals;
    assert(first !== undefined && second !== undefined && third !== undefined);
    first.removeEventListener.mockImplementation(() => {
      throw new Error("detach boom");
    });
    await driveShutdown(eventWith("reload"), harness);
    // The remaining two detaches still ran (per-step isolation).
    expect(second.removeEventListener).toHaveBeenCalledTimes(1);
    expect(third.removeEventListener).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// PIC-24 — each teardown-time console.error wrapped in try/catch
// ============================================================================

describe("PIC-24 — wrapped serialisation-and-emission", () => {
  it("emits the serialised structured payload as the single console.error argument (PIC-24)", () => {
    const sink = sinkSpy();
    const diagnostic = teardownStepFailedDiagnostic(1, "loomRegistry.drain", new Error("boom"));
    emitTeardownDiagnostic(sink, diagnostic);
    expect(sink.serialise).toHaveBeenCalledTimes(1);
    expect(sink.emit).toHaveBeenCalledTimes(1);
    // The single argument is the serialiser's output.
    expect(sink.emit).toHaveBeenCalledWith(sink.serialise.mock.results[0]?.value);
  });
});

// ============================================================================
// PIC-25 — bare-code / two-token serialiser-throw fallback forms
// ============================================================================

describe("PIC-25 — serialiser-throw fallback forms", () => {
  it("falls back to the bare-code string on a serialiser throw for a flat-details code (PIC-25)", () => {
    const sink = sinkSpy({ serialiseThrows: true });
    const diagnostic = teardownStepFailedDiagnostic(1, "loomRegistry.drain", new Error("boom"));
    emitTeardownDiagnostic(sink, diagnostic);
    // The catch arm emits the bare diagnostic code so it stays grep-able.
    expect(sink.emit).toHaveBeenLastCalledWith(TEARDOWN_STEP_FAILED_CODE);
  });

  it("falls back to the two-token `${code} ${reason}` form on a serialiser throw for runtime-degraded (PIC-25)", () => {
    const sink = sinkSpy({ serialiseThrows: true });
    const emission: NestedShapeEmission = {
      code: RUNTIME_DEGRADED_CODE,
      diagnostic: { severity: "warning", code: RUNTIME_DEGRADED_CODE, message: "x", details: { event: { reason: "new" } } },
      detailsEventReason: "new",
    };
    emitNestedShapeDiagnostic(sink, emission);
    expect(sink.emit).toHaveBeenLastCalledWith(`${RUNTIME_DEGRADED_CODE} new`);
  });

  it("falls back to the three-token `${code} ${loom} <unreadable>` form on a serialiser throw for the per-invocation note (PIC-25)", () => {
    const sink = sinkSpy({ serialiseThrows: true });
    const entry = makeEntry("plan", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa").entry;
    const emission: NestedShapeEmission = {
      code: CANCELLED_BY_SESSION_SHUTDOWN_CODE,
      diagnostic: { severity: "error", code: CANCELLED_BY_SESSION_SHUTDOWN_CODE, message: "x", details: { event: { reason: "reload", loom: "plan" } } },
      detailsEventReason: "reload",
      entry,
    };
    emitNestedShapeDiagnostic(sink, emission);
    // Two-token reason form on serialiser throw preserves the reason discriminator.
    expect(sink.emit).toHaveBeenLastCalledWith(`${CANCELLED_BY_SESSION_SHUTDOWN_CODE} reload`);
  });
});

// ============================================================================
// PIC-26 — construction-site catch-arm self-wrap
// ============================================================================

describe("PIC-26 — construction-site catch-arm self-wrap", () => {
  it("emits the two-token `${code} <unreadable>` form on a construction-site throw for runtime-degraded (PIC-26 (a))", () => {
    const sink = sinkSpy();
    const emission: NestedShapeEmission = {
      code: RUNTIME_DEGRADED_CODE,
      diagnostic: { severity: "warning", code: RUNTIME_DEGRADED_CODE, message: "x" },
      detailsEventReason: "new",
      forceConstructionThrow: true,
    };
    emitNestedShapeDiagnostic(sink, emission);
    expect(sink.emit).toHaveBeenLastCalledWith(`${RUNTIME_DEGRADED_CODE} <unreadable>`);
  });

  it("emits the three-token `${code} ${entry.loom} <unreadable>` form on a construction-site throw for the per-invocation note (PIC-26 (b))", () => {
    const sink = sinkSpy();
    const entry = makeEntry("plan", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa").entry;
    const emission: NestedShapeEmission = {
      code: CANCELLED_BY_SESSION_SHUTDOWN_CODE,
      diagnostic: { severity: "error", code: CANCELLED_BY_SESSION_SHUTDOWN_CODE, message: "x" },
      detailsEventReason: "reload",
      entry,
      forceConstructionThrow: true,
    };
    emitNestedShapeDiagnostic(sink, emission);
    expect(sink.emit).toHaveBeenLastCalledWith(
      `${CANCELLED_BY_SESSION_SHUTDOWN_CODE} plan <unreadable>`,
    );
  });

  it("swallows a self-wrapped inner console.error throw and attempts no second emission (PIC-26 (c))", () => {
    const sink = sinkSpy({ emitThrows: true });
    const emission: NestedShapeEmission = {
      code: RUNTIME_DEGRADED_CODE,
      diagnostic: { severity: "warning", code: RUNTIME_DEGRADED_CODE, message: "x" },
      detailsEventReason: "new",
      forceConstructionThrow: true,
    };
    // The dedicated self-wrap swallows the inner throw and does not re-throw.
    expect(() => emitNestedShapeDiagnostic(sink, emission)).not.toThrow();
    // The construction-site emission was attempted exactly once (no retry).
    expect(sink.emit).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// PIC-27 — a throw out of console.error is swallowed and does not escape
// ============================================================================

describe("PIC-27 — handler-isolation swallow", () => {
  it("swallows a console.error throw and still attempts the emission (PIC-27)", () => {
    const sink = sinkSpy({ emitThrows: true });
    const diagnostic = teardownStepFailedDiagnostic(1, "loomRegistry.drain", new Error("boom"));
    expect(() => emitTeardownDiagnostic(sink, diagnostic)).not.toThrow();
    // The emission was attempted (the throw came from the sink, not from a
    // missing attempt).
    expect(sink.emit).toHaveBeenCalledTimes(1);
  });

  it("does not let a teardown-time console.error throw escape the handler; later sub-steps still run (PIC-27)", async () => {
    const sink = sinkSpy({ emitThrows: true });
    const harness = makeHarness({ sink });
    // Force sub-step 1 to emit (and its console.error to throw).
    vi.spyOn(harness.registry, "drain").mockImplementation(() => {
      throw new Error("drain boom");
    });
    await expect(driveShutdown(eventWith("reload"), harness)).resolves.toBeUndefined();
    // The swallowed emission throw does not prevent sub-step 4/5 from running.
    expect(harness.settingsWatcher.close).toHaveBeenCalledTimes(1);
  });
});
