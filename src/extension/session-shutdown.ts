// V9g / V9g-T — the `session_shutdown` teardown handler and its emission
// isolation.
//
// This module owns the five-sub-step fixed teardown sequence with per-step
// isolation, the session-swap semantics for in-flight invocations (sub-step 2
// abort-with-synthesised-reason, sub-step 3 bounded `Promise.allSettled` over
// every entry's `disposeBarrier`), and the teardown-time `console.error`
// emission isolation (the wrapped serialisation-and-emission sequence with the
// bare-`code` / two-token / three-token fallback forms and the construction-site
// self-wrap).
//
// V9g-T (tests-task) declares the seam shapes and stubs the behaviour-bearing
// functions inertly so the failing tests compile and red on their own primary
// assertions (the sub-step orchestration, the emission isolation, the reason
// synthesis, and the per-invocation / timeout diagnostics are absent). The
// paired V9g implementation leaf fills these in.
//
// Spec: pi-integration-contract/session-shutdown-semantics.md (§`session_shutdown`
// five-sub-step sequence, **Per-step isolation**, sub-step 3 `cka-31` settle-all
// bounded by `SHUTDOWN_AWAIT_CAP_MS`), pi-integration-contract/
// diagnostic-emission-isolation.md (PIC-24/25/26/27/28), cancellation.md (CNCL-4
// session-shutdown synthesised-reason facet), host-prerequisites.md (PIC-7).

import type { Diagnostic } from "../diagnostics/diagnostic";
import type { Clock, TimerHandle } from "../seams/clock";
import type { ActiveInvocationEntry, ActiveInvocationRegistry } from "../runtime/active-invocation-registry";
import type { LoomRegistry } from "./reload-wiring";
import { SHUTDOWN_AWAIT_CAP_MS } from "./capability-probe";

// The bounded-await cap for sub-step 3 (session-shutdown-semantics.md sub-step 3
// / `cka-31`) is owned by the single `SHUTDOWN_AWAIT_CAP_MS` declaration site
// (`V9a`/`capability-probe.ts`) and re-exported here for the teardown handler's
// consumers rather than redeclared (single source of truth).
export { SHUTDOWN_AWAIT_CAP_MS };

/**
 * The byte-exact synthesised abort-reason message the `session_shutdown` handler
 * stamps onto each in-flight `loomAbort.abort(reason)` (cancellation.md CNCL-4 /
 * `session-shutdown-semantics.md` sub-step 2). Sourced verbatim from CNCL-4.
 */
export const SESSION_SHUTDOWN_ABORT_MESSAGE = "loom cancelled by session shutdown";

// --- Diagnostic codes (diagnostics/code-registry-host.md, -runtime.md) ---

export const TEARDOWN_STEP_FAILED_CODE =
  "loom/host/session-shutdown-teardown-step-failed";
export const RELOAD_TEARDOWN_TIMEOUT_CODE = "loom/runtime/reload-teardown-timeout";
export const CANCELLED_BY_SESSION_SHUTDOWN_CODE =
  "loom/runtime/cancelled-by-session-shutdown";
export const RUNTIME_DEGRADED_CODE = "loom/host/session-shutdown-runtime-degraded";

/** The four teardown sub-steps that emit `teardown-step-failed` (placeholder-rendering-b.md). */
export type TeardownStep = 1 | 3 | 4 | 5;

/**
 * The closed normative `details.call` label set per `details.step`
 * (session-shutdown-semantics.md **Per-step isolation** — the source of truth).
 * The labels are wire contract, not implementation-chosen, so operator dedup on
 * `(code, details.step, details.call)` is meaningful across runs and
 * implementations.
 */
export const TEARDOWN_STEP_CALL_LABELS = {
  1: ["loomRegistry.drain", "loomRegistry.initDrainStateTag"],
  3: ["Clock.now()", "Clock.setTimeout(awaitCap)", "Clock.clearTimeout(awaitCap)"],
  4: ["discoveryWatcher.close", "settingsWatcher.close", "Clock.clearTimeout(debounce)"],
  5: [
    "ctx.signal.removeEventListener",
    "toolSignal.removeEventListener",
    "parentInvokeSignal.removeEventListener",
  ],
} as const satisfies Record<TeardownStep, readonly string[]>;

/**
 * The Pi `session_shutdown` event the teardown handler reads. `reason` is read
 * exactly once through the unknown-reason rule (V9h); the closed set is pinned
 * to `SessionShutdownEvent['reason']` (PIC-7).
 */
export interface SessionShutdownEventLike {
  readonly reason: unknown;
}

/** A watcher the teardown closes in sub-step 4 (`discoveryWatcher`, `settingsWatcher`). */
export interface ClosableWatcher {
  close(): void;
}

/**
 * One inbound Pi-side forwarding-signal source the teardown detaches in
 * sub-step 5, tagged with its closed `details.call` label.
 */
export interface ForwardingSignalSource {
  readonly label:
    | "ctx.signal.removeEventListener"
    | "toolSignal.removeEventListener"
    | "parentInvokeSignal.removeEventListener";
  removeEventListener(): void;
}

/**
 * The teardown-time `console.error` sink and its serialisation primitive, both
 * injected so the emission-isolation tests can drive a throwing sink / throwing
 * serialiser (PIC-24/25/27).
 */
export interface EmissionSink {
  /** The teardown-time `console.error` seam (single serialised argument). */
  emit(line: unknown): void;
  /** The leaf-owned serialisation primitive (e.g. `JSON.stringify`). */
  serialise(diagnostic: Diagnostic): string;
}

/** Construction dependencies for the `session_shutdown` teardown handler. */
export interface SessionShutdownDeps {
  readonly registry: LoomRegistry;
  readonly activeInvocations: ActiveInvocationRegistry;
  readonly clock: Clock;
  readonly discoveryWatcher: ClosableWatcher;
  readonly settingsWatcher: ClosableWatcher;
  /** The pending debounce timer handle sub-step 4 clears, if any. */
  readonly debounceHandle: TimerHandle | undefined;
  /** The sub-step 5 forwarding-signal sources, in detach order. */
  readonly forwardingSignals: readonly ForwardingSignalSource[];
  /** The injected `SDK_SURFACE_INVENTORY` the unknown-reason rule reads (V9h). */
  readonly inventory: readonly { readonly kind: string; readonly path?: string; readonly literals?: unknown }[] | undefined;
  readonly sink: EmissionSink;
}

// --- Behaviour-bearing seams (V9g-T stubs; V9g fills in) ---

/**
 * Synthesise the CNCL-4 abort reason: a JavaScript `Error` whose `message` is
 * byte-exact `"loom cancelled by session shutdown"`, propagated so that
 * `loomAbort.signal.reason === source.reason` is observable downstream.
 *
 * V9g-T stub: returns a placeholder `Error` so the CNCL-4 message-and-identity
 * assertions red on their primary check (the paired V9g synthesises the pinned
 * reason).
 */
export function synthesiseSessionShutdownReason(): Error {
  return new Error("<stub: session-shutdown reason not synthesised>");
}

/**
 * Build the `loom/host/session-shutdown-teardown-step-failed` (W, runtime)
 * diagnostic for a caught per-step throw, carrying
 * `details: { step, call, error }` (session-shutdown-semantics.md
 * **Per-step isolation**; diagnostics/code-registry-host.md).
 *
 * V9g-T stub: returns a placeholder diagnostic so the DIAG-1 host-row shape
 * assertions red on their primary check.
 */
export function teardownStepFailedDiagnostic(
  step: TeardownStep,
  call: string,
  error: unknown,
): Diagnostic {
  void step;
  void call;
  void error;
  return { severity: "warning", code: "<stub>", message: "<stub>" };
}

/**
 * Build the per-invocation `loom/runtime/cancelled-by-session-shutdown` (E,
 * runtime) note with `display: false` and the nested
 * `details.event: { reason, loom, invocation_id }` shape
 * (diagnostics/diagnostic-shape.md session-shutdown-details-conventions).
 *
 * V9g-T stub: returns a placeholder diagnostic so the shape assertions red.
 */
export function cancelledBySessionShutdownDiagnostic(
  entry: ActiveInvocationEntry,
): Diagnostic {
  void entry;
  return { severity: "error", code: "<stub>", message: "<stub>" };
}

/**
 * Build the `loom/runtime/reload-teardown-timeout` (E, runtime) diagnostic at
 * the sub-step 3 cap: the message names each still-in-flight entry as
 * `/<slash-name>:<invocation-id>` (insertion order, `, `-joined), and `hint`
 * carries the *elapsed* wall time (diagnostics/code-registry-runtime.md).
 *
 * V9g-T stub: returns a placeholder diagnostic so the shape assertions red.
 */
export function reloadTeardownTimeoutDiagnostic(
  stillInFlight: readonly ActiveInvocationEntry[],
  elapsedMs: number,
): Diagnostic {
  void stillInFlight;
  void elapsedMs;
  return { severity: "error", code: "<stub>", message: "<stub>" };
}

/**
 * Emit a flat-`details` teardown-handler diagnostic through the wrapped
 * serialisation-and-emission sequence: the serialiser call feeding the
 * `console.error` call, the whole wrapped in one `try`/`catch` (PIC-24); on a
 * serialiser throw the catch arm emits the bare-`code` string (PIC-25); a throw
 * out of `console.error` is swallowed (PIC-27) and the count is measured at the
 * invocation site (PIC-28).
 *
 * V9g-T stub: does nothing, so the "emits the serialised payload" / "falls back
 * to bare code" / "swallows a sink throw" assertions red on their primary
 * `sink.emit`-spy checks.
 */
export function emitTeardownDiagnostic(
  sink: EmissionSink,
  diagnostic: Diagnostic,
): void {
  void sink;
  void diagnostic;
}

/** The nested-shape emission's `details.event` reason + optional `entry`. */
export interface NestedShapeEmission {
  readonly code:
    | typeof RUNTIME_DEGRADED_CODE
    | typeof CANCELLED_BY_SESSION_SHUTDOWN_CODE;
  readonly diagnostic: Diagnostic;
  /** The already-hoisted `details.event.reason` local (PIC-25 hoist obligation). */
  readonly detailsEventReason: string;
  /** The held registry entry (per-invocation note only) for the `entry.loom` catch-arm read. */
  readonly entry?: ActiveInvocationEntry;
  /** Test seam: force the payload-construction site to throw (PIC-26). */
  readonly forceConstructionThrow?: boolean;
}

/**
 * Emit a nested-shape teardown-handler diagnostic (`runtime-degraded` /
 * `cancelled-by-session-shutdown`). On a serialiser throw the catch arm emits
 * the two-token `` `${code} ${detailsEventReason}` `` form, or the three-token
 * `` `${code} ${entry.loom} <unreadable>` `` form for the per-invocation note
 * (PIC-25). A throw out of the payload-construction site is caught by a
 * dedicated self-wrap that emits the `` `${code} <unreadable>` `` /
 * `` `${code} ${entry.loom} <unreadable>` `` fallback and swallows an inner
 * `console.error` throw (PIC-26/27). Count is invocation-site framed (PIC-28).
 *
 * V9g-T stub: does nothing, so the fallback-form assertions red on their
 * primary `sink.emit`-spy checks.
 */
export function emitNestedShapeDiagnostic(
  sink: EmissionSink,
  emission: NestedShapeEmission,
): void {
  void sink;
  void emission;
}

/**
 * Run the five-sub-step fixed teardown sequence with per-step isolation
 * (session-shutdown-semantics.md). Each of sub-steps 1, 3, 4, 5 runs inside its
 * own `try`/`catch`; a per-call throw is caught, emits exactly one
 * `teardown-step-failed` via the wrapped `console.error`, and does not prevent
 * the remaining sub-steps from running. Sub-step 2 aborts each in-flight
 * `loomAbort` with the synthesised CNCL-4 reason; sub-step 3 awaits every
 * entry's `disposeBarrier` via `Promise.allSettled`, bounded by
 * `SHUTDOWN_AWAIT_CAP_MS`, emitting `reload-teardown-timeout` at the cap.
 *
 * V9g-T stub: does nothing (returns a resolved promise), so the spy-based
 * per-sub-step / isolation / cap / abort-reason assertions red on their primary
 * checks. The paired V9g implementation orchestrates the sequence.
 */
export async function runSessionShutdown(
  event: SessionShutdownEventLike,
  deps: SessionShutdownDeps,
): Promise<void> {
  void event;
  void deps;
  return Promise.resolve();
}
