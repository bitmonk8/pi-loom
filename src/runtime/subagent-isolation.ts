// V9i / V9i-T — subagent-mode session isolation and lifecycle seam.
//
// This module owns the subagent-mode spawn/drive/teardown seam
// (pi-integration-contract/subagent.md, host-interfaces-core.md,
// cancellation.md, return.md):
//
//   - PIC-40 pre-spawn model guard: refuse `createAgentSession` when the
//     resolved `model` is `undefined`, failing with
//     `loom/runtime/subagent-model-unresolved`.
//   - PIC-23 / PIC-41 spawn-options construction: the spawn passes a
//     loom-constructed `ResourceLoader` adapter (never the
//     `DefaultResourceLoader.systemPromptOverride` construction channel), a
//     fresh `SessionManager.inMemory(cwd)`, a `tools` allowlist derived from the
//     lowered `customTools`, and NO `signal` field.
//   - PIC-41 abort forwarding: cancellation reaches the spawned session solely
//     via a one-shot `loomAbort.signal` listener calling `AgentSession.abort()`
//     (with the synchronous already-aborted pre-registration path).
//   - PIC-42 completion await: session-local `session.subscribe`, unsubscribing
//     before resolving each query and attaching a fresh subscription per query,
//     never the global `pi.on("agent_end", …)` event.
//   - PIC-43 query-result extraction: read the terminal (`willRetry: false`)
//     `agent_end` event's `messages` array, applying the cancellation then the
//     transport (`stopReason: "error"`) short-circuit before the trailing
//     assistant-text concatenation.
//   - PIC-9 lifecycle: mandatory `dispose()` in `finally` on every exit path,
//     idempotent dispose, one-shot abort-listener detach, advisory
//     `loom/runtime/subagent-dispose-failure` on a `dispose()` throw that never
//     masks the original `Err`/`Ok`; disposal bounded by `SHUTDOWN_AWAIT_CAP_MS`.
//   - PIC-22 parallel spawn: for N≥2 parallel subagent tool calls, initiate
//     `createAgentSession` for all N and enter each `sendUserMessage` before any
//     one returns.
//   - FN-5 final-value: the callee's produced value propagates to the subagent
//     caller on success and is absent on fail/cancel (via the `V3d`
//     function-result seam).
//
// V9i-T (tests-task) declares the seam shapes and stubs the behaviour-bearing
// functions NON-COMPLIANTLY so the failing tests compile and red on their own
// primary assertions while `V9i` is absent:
//   - `preSpawnModelGuard` / `guardedSubagentSpawn` never guard (always spawn);
//   - `buildSpawnOptions` includes a `signal` field, routes `system:` through
//     the `DefaultResourceLoader.systemPromptOverride` channel, drifts the
//     `tools` allowlist, and uses a non-in-memory session manager;
//   - `attachSubagentAbortForwarding` never calls `AgentSession.abort()`;
//   - `awaitTerminalAgentEnd` resolves via the global `pi.on` event, on the
//     first `agent_end` (ignoring `willRetry`), and never unsubscribes;
//   - `extractSubagentQueryResult` returns a fixed `Ok` sentinel (no
//     short-circuits);
//   - `runWithSubagentTeardown` runs no `finally` (no dispose, no detach, no
//     advisory diagnostic);
//   - `makeIdempotentDispose` disposes on every call;
//   - `subagentCallerFinalValue` reports a present sentinel on every outcome;
//   - `SUBAGENT_DISPOSE_BUDGET_MS` is `0` rather than `SHUTDOWN_AWAIT_CAP_MS`.
// No test reds on a compile error, a missing fixture, or a harness throw. The
// paired V9i implementation leaf fills these in.
//
// Spec: pi-integration-contract/subagent.md (PIC-9, PIC-22, PIC-23, PIC-40,
// PIC-41, PIC-42, PIC-43); pi-integration-contract/host-interfaces-core.md
// (`AgentSession` member surface); cancellation.md; return.md / functions.md
// (FN-5, via the `V3d` function-result seam).

import type { Message } from "@earendil-works/pi-ai";
import type { Diagnostic } from "../diagnostics/diagnostic";
import { SHUTDOWN_AWAIT_CAP_MS } from "../extension/capability-probe";
import { functionResult, type FunctionResult } from "./function-result";
import type { LoomValue } from "./value";
import type { QueryError } from "./query-error";

// ---------------------------------------------------------------------------
// PIC-9 — disposal budget.
// ---------------------------------------------------------------------------

/**
 * PIC-9. The bounded budget (milliseconds) the subagent disposal phase runs
 * under. The compliant `V9i` sources this from the single `SHUTDOWN_AWAIT_CAP_MS`
 * declaration site (`V9a`), so `SUBAGENT_DISPOSE_BUDGET_MS === SHUTDOWN_AWAIT_CAP_MS`.
 *
 * V9i-T stubs this to `0` so the "SHUTDOWN_AWAIT_CAP_MS covers disposal" test
 * reds on its own primary assertion.
 */
export const SUBAGENT_DISPOSE_BUDGET_MS = 0;

// ---------------------------------------------------------------------------
// PIC-40 — pre-spawn model guard.
// ---------------------------------------------------------------------------

/** PIC-40 diagnostic code emitted when the resolved subagent `model` is `undefined`. */
export const SUBAGENT_MODEL_UNRESOLVED_CODE = "loom/runtime/subagent-model-unresolved";

/**
 * PIC-40 diagnostic message (diagnostics registry Message column, code
 * `loom/runtime/subagent-model-unresolved`).
 */
export const SUBAGENT_MODEL_UNRESOLVED_MESSAGE =
  "subagent invocation has no resolved model: frontmatter 'model:' is absent and the inherited session model is undefined";

/** Outcome of the PIC-40 pre-spawn model guard. */
export interface ModelGuardOutcome {
  /** `false` when the resolved `model` is `undefined` — the spawn is refused. */
  readonly proceed: boolean;
  /** The `subagent-model-unresolved` diagnostic when `proceed` is `false`. */
  readonly diagnostic?: Diagnostic;
}

/**
 * PIC-40. Decide whether the spawn may proceed given the loom's resolved model.
 * A resolved `undefined` refuses the spawn with the
 * `loom/runtime/subagent-model-unresolved` diagnostic.
 *
 * V9i-T STUB (non-compliant): always proceeds — never guards — so the guard-fires
 * test reds on its own primary assertion.
 */
export function preSpawnModelGuard(model: string | undefined): ModelGuardOutcome {
  void model;
  return { proceed: true };
}

/** Deps the guarded spawn drives: the SDK spawn call and the diagnostic sink. */
export interface GuardedSpawnDeps {
  /** `createAgentSession` — MUST NOT be called when `model` is `undefined`. */
  readonly createAgentSession: () => Promise<void>;
  /** Persistent-diagnostic sink for the `subagent-model-unresolved` failure. */
  readonly emitDiagnostic: (diagnostic: Diagnostic) => void;
}

/**
 * PIC-40. Gate the spawn behind the pre-spawn model guard: when the resolved
 * `model` is `undefined` the runtime MUST NOT call `createAgentSession` and
 * instead emits the `subagent-model-unresolved` diagnostic.
 *
 * V9i-T STUB (non-compliant): always calls `createAgentSession` regardless of
 * `model`, so the "does not spawn when model unresolved" test reds.
 */
export async function guardedSubagentSpawn(
  model: string | undefined,
  deps: GuardedSpawnDeps,
): Promise<{ readonly spawned: boolean }> {
  void model;
  await deps.createAgentSession();
  return { spawned: true };
}

// ---------------------------------------------------------------------------
// PIC-23 / PIC-41 / isolation — spawn-options construction.
// ---------------------------------------------------------------------------

/** The loom-load-bearing subset of a lowered `ToolDefinition` the spawn reads. */
export interface LoweredTool {
  readonly name: string;
}

/**
 * The loom-owned `ResourceLoader` adapter surface the spawn constructs (PIC-23
 * rule 4). `getSystemPrompt()` is the sole `system:` delivery channel; the rest
 * return empty/defaults.
 */
export interface SubagentResourceLoader {
  getSystemPrompt(): string;
  getAppendSystemPrompt(): string[];
}

/** Inputs the spawn-options builder reads. */
export interface SpawnInputs {
  readonly customTools: readonly LoweredTool[];
  readonly loomSystemPrompt: string;
  readonly model: string;
  readonly cwd: string;
  readonly loomAbort: AbortController;
}

/** Injected host factories the spawn consumes by name (satellite type pins). */
export interface SpawnDeps {
  /** `SessionManager.inMemory(cwd)` — the loom-spawned in-memory manager. */
  readonly makeInMemorySessionManager: (cwd: string) => object;
  /**
   * `DefaultResourceLoader` construction channel — the compliant path MUST NOT
   * call this (PIC-23: the `systemPromptOverride` channel SHOULD NOT be used).
   */
  readonly makeDefaultResourceLoader: (options: {
    systemPromptOverride: (base: string) => string;
  }) => SubagentResourceLoader;
}

/**
 * The `CreateAgentSessionOptions` subset the spawn populates. `signal` is
 * declared optional only so a non-compliant stub can set it; the compliant path
 * MUST omit it entirely (PIC-41).
 */
export interface SubagentSpawnOptions {
  readonly customTools: readonly LoweredTool[];
  readonly tools: readonly string[];
  readonly model: string;
  readonly sessionManager: object;
  readonly resourceLoader: SubagentResourceLoader;
  readonly signal?: AbortSignal;
}

/**
 * PIC-23 / PIC-41 / isolation. Build the `createAgentSession` options: a
 * loom-constructed `ResourceLoader` adapter (never the
 * `DefaultResourceLoader.systemPromptOverride` channel), the `tools` allowlist
 * derived from the lowered `customTools`, a fresh `SessionManager.inMemory(cwd)`,
 * and NO `signal` field.
 *
 * V9i-T STUB (non-compliant): routes `system:` through the
 * `DefaultResourceLoader.systemPromptOverride` construction channel (PIC-23),
 * includes a `signal` field (PIC-41), drifts the `tools` allowlist away from the
 * `customTools` names, and uses a non-in-memory placeholder session manager
 * (isolation) — so the PIC-23 / PIC-41 / isolation tests red on their own
 * primary assertions.
 */
export function buildSpawnOptions(inputs: SpawnInputs, deps: SpawnDeps): SubagentSpawnOptions {
  const resourceLoader = deps.makeDefaultResourceLoader({
    systemPromptOverride: () => inputs.loomSystemPrompt,
  });
  return {
    customTools: inputs.customTools,
    tools: [],
    model: inputs.model,
    sessionManager: {},
    resourceLoader,
    signal: inputs.loomAbort.signal,
  };
}

// ---------------------------------------------------------------------------
// PIC-41 — abort forwarding into the spawned session.
// ---------------------------------------------------------------------------

/** The `AgentSession.abort()` member the cancellation listener drives. */
export interface AbortableSubagentSession {
  abort(): Promise<void>;
}

/** The one-shot abort-forwarding registration, detached in the teardown `finally`. */
export interface AbortForwardingRegistration {
  /** Detach the one-shot `loomAbort.signal` listener (PIC-9 teardown). */
  readonly detach: () => void;
}

/**
 * PIC-41. Forward cancellation into the spawned session: register a one-shot
 * `loomAbort.signal` listener calling `session.abort()`; if `loomAbort` is
 * already aborted at attach time, call `session.abort()` synchronously before
 * registering the listener (the spawn-then-immediate-cancel path). The returned
 * promise is deliberately not awaited from the listener.
 *
 * V9i-T STUB (non-compliant): never calls `session.abort()`, so both the
 * forward-on-abort and already-aborted tests red on their own primary assertions.
 */
export function attachSubagentAbortForwarding(
  loomAbort: AbortController,
  session: AbortableSubagentSession,
): AbortForwardingRegistration {
  void loomAbort;
  void session;
  return { detach: (): void => {} };
}

// ---------------------------------------------------------------------------
// PIC-42 — session-local completion await.
// ---------------------------------------------------------------------------

/** The terminal `agent_end` event variant the runtime resolves each query from. */
export interface AgentEndEvent {
  readonly type: "agent_end";
  readonly messages: readonly Message[];
  readonly willRetry: boolean;
}

/** Any `AgentSessionEvent` the session-local subscription delivers. */
export type SubagentSessionEvent = AgentEndEvent | { readonly type: string };

/** The session-local `AgentSession.subscribe` surface (PIC-42). */
export interface SubagentEventSource {
  subscribe(listener: (event: SubagentSessionEvent) => void): () => void;
}

/** The forbidden process-global `pi.on` surface (PIC-42 MUST NOT). */
export interface GlobalEventBus {
  on(event: string, handler: (event: SubagentSessionEvent) => void): void;
}

/**
 * PIC-42. Await a query's completion via the session-local `subscribe` API:
 * ignore `willRetry: true` events, resolve from the terminal (`willRetry: false`)
 * `agent_end` event, and unsubscribe before resolving. A fresh subscription is
 * attached per call — never the global `pi.on("agent_end", …)` event.
 *
 * V9i-T STUB (non-compliant): also registers the forbidden global `pi.on`
 * listener (PIC-42 MUST NOT), resolves on the FIRST `agent_end` even when
 * `willRetry` is `true`, and never unsubscribes — so the PIC-42 tests red on
 * their own primary assertions. It still subscribes to the session so the tests
 * can drive it.
 */
export async function awaitTerminalAgentEnd(
  source: SubagentEventSource,
  globalBus: GlobalEventBus,
): Promise<AgentEndEvent> {
  return await new Promise<AgentEndEvent>((resolve) => {
    // Non-compliant: the forbidden global event.
    globalBus.on("agent_end", () => {});
    // Non-compliant: resolves on the first agent_end (ignores willRetry) and
    // never calls the returned unsubscribe function.
    source.subscribe((event) => {
      if (event.type === "agent_end") {
        resolve(event as AgentEndEvent);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// PIC-43 — terminal `agent_end` query-result extraction.
// ---------------------------------------------------------------------------

/** A subagent untyped query's result. */
export type SubagentQueryResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly error: QueryError };

/** Live context the extraction reads its two short-circuits from. */
export interface SubagentExtractionCtx {
  /** `loomAbort.signal.aborted` — the cancellation short-circuit. */
  readonly aborted: boolean;
  /** The resolved-model provider for the transport-failure `Err`. */
  readonly provider: string;
}

/** The V9i-T non-compliant success sentinel the extraction stub returns. */
export const SUBAGENT_EXTRACTION_STUB_SENTINEL = "<<subagent extraction not implemented>>";

/**
 * PIC-43. Extract the untyped query's result from the terminal `agent_end`
 * event's `messages` array, applying — in this fixed order — the cancellation
 * short-circuit (`ctx.aborted` → `Err(cancelled)`), then the transport-failure
 * short-circuit (trailing `assistant` `stopReason: "error"` → `Err(transport)`),
 * then the trailing-assistant-text concatenation (`Ok(string)`).
 *
 * V9i-T STUB (non-compliant): returns a fixed `Ok` sentinel for every event,
 * applying neither short-circuit nor the real text concatenation — so all three
 * PIC-43 tests red on their own primary assertions.
 */
export function extractSubagentQueryResult(
  terminalEvent: AgentEndEvent,
  ctx: SubagentExtractionCtx,
): SubagentQueryResult {
  void terminalEvent;
  void ctx;
  return { ok: true, value: SUBAGENT_EXTRACTION_STUB_SENTINEL };
}

// ---------------------------------------------------------------------------
// PIC-9 — session lifecycle (idempotent dispose, teardown `finally`).
// ---------------------------------------------------------------------------

/** The `AgentSession.dispose()` member the teardown drives. */
export interface DisposableSubagentSession {
  dispose(): void;
}

/**
 * PIC-9. Wrap `session.dispose()` so it is invoked at most once per session —
 * a second call is a no-op (idempotent at the call site).
 *
 * V9i-T STUB (non-compliant): calls `session.dispose()` on every invocation, so
 * the idempotency test reds on its own primary assertion.
 */
export function makeIdempotentDispose(session: DisposableSubagentSession): () => void {
  return (): void => {
    session.dispose();
  };
}

/** PIC-9 advisory diagnostic code emitted when `AgentSession.dispose()` throws. */
export const SUBAGENT_DISPOSE_FAILURE_CODE = "loom/runtime/subagent-dispose-failure";

/**
 * PIC-9 advisory diagnostic message (diagnostics registry Message column, code
 * `loom/runtime/subagent-dispose-failure`): `subagent dispose failed: <dispose
 * error first line>`.
 */
export function renderSubagentDisposeFailureMessage(disposeError: unknown): string {
  const raw = disposeError instanceof Error ? disposeError.message : String(disposeError);
  const firstLine = raw.split("\n", 1)[0] ?? "";
  return `subagent dispose failed: ${firstLine}`;
}

/** The teardown callbacks the per-invocation `finally` runs (PIC-9). */
export interface SubagentTeardown {
  /** The idempotent `dispose()` (from `makeIdempotentDispose`). */
  dispose(): void;
  /** Detach the one-shot `loomAbort.signal` abort-forwarding listener. */
  detachAbortListener(): void;
}

/** The teardown's diagnostic sink for the advisory `dispose()`-throw diagnostic. */
export interface SubagentTeardownDeps {
  readonly emitDiagnostic: (diagnostic: Diagnostic) => void;
}

/**
 * PIC-9. Run the interpreter body against a spawned session and guarantee
 * teardown in a `finally` on every exit path (normal return, `Err`, panic, any
 * unexpected throw): detach the one-shot abort-forwarding listener, then call
 * the idempotent `dispose()`. A `dispose()` throw is trapped and logged via the
 * advisory `loom/runtime/subagent-dispose-failure` diagnostic; it never masks
 * the original `Err`/`Ok` and never promotes an `Ok` to an `Err`.
 *
 * V9i-T STUB (non-compliant): runs the body with NO `finally` — no detach, no
 * dispose, no advisory diagnostic — so every PIC-9 teardown test reds on its own
 * primary assertion.
 */
export async function runWithSubagentTeardown<T>(
  teardown: SubagentTeardown,
  deps: SubagentTeardownDeps,
  run: () => Promise<T>,
): Promise<T> {
  void teardown;
  void deps;
  return await run();
}

// ---------------------------------------------------------------------------
// PIC-22 — parallel subagent spawn initiation.
// ---------------------------------------------------------------------------

/** The `AgentSession.sendUserMessage` drive point one spawn reaches. */
export interface SubagentDriveHandle {
  readonly sendUserMessage: (text: string) => Promise<void>;
}

/** One subagent-mode spawn: create the session, then enter its drive point. */
export interface ParallelSubagentSpawn {
  /** `createAgentSession(...)` for this invocation. */
  readonly createSession: () => Promise<SubagentDriveHandle>;
}

/**
 * PIC-22. Given N subagent-mode spawns emitted as parallel tool calls, the
 * runtime MUST initiate `createAgentSession` for all N and enter each spawned
 * session's `sendUserMessage` before any one invocation returns.
 *
 * V9i-T STUB (non-compliant): drives the spawns SEQUENTIALLY — it fully awaits
 * each spawn's create-then-drive before starting the next, so a blocking
 * `sendUserMessage` on spawn 0 prevents spawn 1's `createAgentSession` from ever
 * running; the PIC-22 test reds because not all sessions are created before the
 * blocked call is released.
 */
export async function spawnSubagentsInParallel(
  spawns: readonly ParallelSubagentSpawn[],
): Promise<void> {
  for (const spawn of spawns) {
    const handle = await spawn.createSession();
    await handle.sendUserMessage("");
  }
}

// ---------------------------------------------------------------------------
// FN-5 — subagent caller final-value projection (via the V3d function-result seam).
// ---------------------------------------------------------------------------

/** The terminal outcome of a subagent-mode invocation, as seen by the caller. */
export type SubagentInvocationOutcome =
  | { readonly kind: "success"; readonly value: LoomValue }
  | { readonly kind: "fail"; readonly error: QueryError }
  | { readonly kind: "cancel" };

/** The V9i-T non-compliant final-value sentinel the projection stub reports. */
export const SUBAGENT_FINAL_VALUE_STUB_SENTINEL = "<<fn-5 not implemented>>";

/**
 * FN-5 (re-cited against the `V3d` function-result seam). Project a subagent
 * invocation's outcome onto the final value the subagent caller observes: on
 * success the callee's produced value is present; on fail/cancel no final value
 * flows (the caller observes only the corresponding `Err`). The compliant path
 * delegates to `V3d`'s `functionResult`.
 *
 * V9i-T STUB (non-compliant): reports a present sentinel value on EVERY outcome
 * — so the FN-5 success, fail, and cancel tests all red on their own primary
 * assertions.
 */
export function subagentCallerFinalValue(outcome: SubagentInvocationOutcome): FunctionResult {
  void outcome;
  void functionResult;
  return { present: true, value: SUBAGENT_FINAL_VALUE_STUB_SENTINEL };
}
