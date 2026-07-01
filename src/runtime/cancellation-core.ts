// V17a / V17a-T — the cancellation core.
//
// This module owns the `loomAbort` controller and the cancellation contract
// (cancellation.md): forwarding Pi's per-handler `ctx.signal`, the tool-exposed
// `signal`, and the parent-`invoke` signal into `loomAbort` (never `ctx.signal`
// directly); abort-reason propagation (synthesised for `agent_end`); downward-
// only propagation; the tool-call late-settlement discard rules (CNCL-1/2/3);
// the race semantics against a completed `Ok` (CNCL-5) and a tail abort
// (CNCL-6); and the swallowing-handler three-side-channel suppression at the
// `Checkpoint`-seam substrate.
//
// V17a-T (this tests-task) declares the seam shapes and stubs every behaviour-
// bearing function inertly so the failing tests compile and red on their own
// primary assertions:
//   - the three `forward*` helpers and `abortForAgentEnd` are no-ops (they do
//     not subscribe / do not abort), so `loomAbort` never fires and the
//     forwarding / CNCL-4 reason-identity assertions red;
//   - `deriveChildLoomAbort` returns a fresh, UNLINKED controller, so the
//     downward-propagation assertions red (the child never aborts on parent
//     abort);
//   - `routeToolCallLateSettlement` wrongly rebinds and re-emits after
//     cancellation, so CNCL-1/2/3 red;
//   - `attachSwallowingHandler` attaches NO handler and
//     `routeAbandonableSettlement` re-surfaces, so the three-side-channel
//     suppression assertions red;
//   - `runCancellableSequence` synthesises a top-level `cancelled` and retains
//     no bindings, so CNCL-5 and CNCL-6 red.
// The paired `V17a` implementation leaf fills these in.
//
// Spec: cancellation.md (CNCL-1 … CNCL-6, §Signal source, §Forwarding into
// `loomAbort`, §Propagation, §Race semantics — late-settlement discard,
// §Race semantics — swallowing-handler attachment on every abandonable
// Promise); pi-integration-contract/host-interfaces-services.md (§`Checkpoint`
// seam, PIC-10); errors-and-results/queryerror-variants.md (`CancelledError`).

import type { Checkpoint, CheckpointKind, CheckpointSite } from "../seams/checkpoint";
import type { CancelledError, QueryError } from "./query-error";
import type { RuntimeEvent } from "./runtime-event-channel";
import type { Diagnostic } from "../diagnostics/diagnostic";

// ---------------------------------------------------------------------------
// Signal source — the per-invocation `loomAbort` controller.
// ---------------------------------------------------------------------------

/**
 * Construct a fresh `AbortController` (`loomAbort`) at invocation start. Its
 * `loomAbort.signal` — never `ctx.signal` directly — is the single source of
 * truth every downstream component (checkpoints, forwarded tool signals, child
 * invokes) sees (cancellation.md §Signal source).
 */
export function createLoomAbort(): AbortController {
  // The controller itself is trivial to construct; the cancellation *contract*
  // (forwarding into it, reason propagation, downward-only derivation) is what
  // the paired V17a implementation leaf establishes.
  return new AbortController();
}

/**
 * The synthesised reason for the reason-less `agent_end` slash-command trigger
 * (cancellation.md CNCL-4): a JavaScript `Error` whose `message` is exactly this
 * literal. (`V9g` owns the sibling `"loom cancelled by session shutdown"`
 * facet.)
 */
export const AGENT_END_CANCEL_MESSAGE = "loom cancelled by agent_end";

// ---------------------------------------------------------------------------
// Forwarding into `loomAbort` — the three steady-state entry points.
// ---------------------------------------------------------------------------

/**
 * Slash-command entry (cancellation.md §Forwarding into `loomAbort`). Subscribe
 * so that an aborted `ctx.signal` triggers `loomAbort.abort(ctx.signal.reason)`
 * via a one-shot listener (CNCL-4 reason identity). MUST tolerate `ctxSignal`
 * being `undefined` — Pi documents `ctx.signal` as `undefined` in idle,
 * non-turn contexts, which is exactly when the slash-command handler fires — and
 * MUST NOT depend on its truthiness.
 */
export function forwardSlashCommandCancel(
  _loomAbort: AbortController,
  _ctxSignal: AbortSignal | undefined,
): void {
  // Inert (tests-task): no subscription is attached, so `loomAbort` never fires
  // from the slash-command path and the CNCL-4 reason-identity assertion reds.
  // The `undefined`-tolerance is satisfied trivially (a no-op never touches the
  // signal). The paired V17a leaf attaches the one-shot reason-forwarding
  // listener here.
}

/**
 * Tool-exposed entry — a loom registered into another loom's `tools:`
 * (cancellation.md §Forwarding into `loomAbort`). Wire the `signal` passed to
 * `execute(...)` so that `signal.aborted` triggers `loomAbort.abort(signal.reason)`
 * via a one-shot listener (CNCL-4 reason identity).
 */
export function forwardToolExposedCancel(
  _loomAbort: AbortController,
  _signal: AbortSignal,
): void {
  // Inert (tests-task): no subscription; `loomAbort` never fires from the
  // tool-exposed path. The paired V17a leaf attaches the one-shot
  // reason-forwarding listener here.
}

/**
 * `agent_end` slash-command trigger (cancellation.md CNCL-4). This path has no
 * source `AbortSignal` — there is no `reason` to forward — so the runtime
 * synthesises a reason (a JavaScript `Error` whose `message` is exactly
 * `AGENT_END_CANCEL_MESSAGE`) and calls `loomAbort.abort(reason)` with it.
 */
export function abortForAgentEnd(_loomAbort: AbortController): void {
  // Inert (tests-task): does not abort, so `loomAbort.signal.reason` stays
  // `undefined` and the byte-exact-message assertion reds. The paired V17a leaf
  // aborts with `new Error(AGENT_END_CANCEL_MESSAGE)`.
}

/**
 * `invoke(...)` entry (cancellation.md §Forwarding into `loomAbort` /
 * §Propagation). The child constructs its own `loomAbort` as a *derived*
 * controller that aborts when the parent's signal aborts — forwarding the
 * parent's `reason` (CNCL-4) — but never the reverse (downward-only). If the
 * parent's signal is already aborted at child-spawn time, the derived controller
 * is returned already-aborted carrying the parent's reason.
 */
export function deriveChildLoomAbort(_parentSignal: AbortSignal): AbortController {
  // Inert (tests-task): a fresh, UNLINKED controller. It neither aborts when the
  // parent aborts nor reflects an already-aborted parent, so the downward-only
  // propagation assertions red. The paired V17a leaf links it to the parent
  // (parent → child only) and forwards the parent's reason.
  return new AbortController();
}

// ---------------------------------------------------------------------------
// CNCL-1/2/3 — late-settlement discard at the tool-call checkpoint.
// ---------------------------------------------------------------------------

/**
 * The settlement outcome of a tool invocation's underlying `execute()` Promise,
 * enumerated so the discard decision is independent of the late-settle kind
 * (cancellation.md: "the discriminator is whether cancellation has already been
 * surfaced at the checkpoint, not the late-settle kind").
 */
export type ToolCallSettlement =
  | { readonly kind: "resolved"; readonly value: unknown }
  | { readonly kind: "error-result"; readonly value: unknown }
  | { readonly kind: "rejected"; readonly error: unknown };

/** Live cancellation state for one tool invocation (read at settlement time). */
export interface ToolCallCancellationGuard {
  /** True once the `tool-call` checkpoint surfaced `cause: "cancelled"`. */
  cancellationSurfaced: boolean;
}

/**
 * The three coupled channels a late tool-call settlement could reach. Once
 * cancellation has surfaced, all three MUST stay silent (CNCL-1/2/3):
 * `rebindCallSite` (clause (a) — no rebind), `emitErr` (clause (b) — no second
 * `Err`), and `emitRuntimeEvent` (clause (c) — no second `RuntimeEvent`).
 */
export interface ToolCallSideChannels {
  /** Bind the tool call site to a value (must NOT fire post-cancel — CNCL-1). */
  readonly rebindCallSite: (value: unknown) => void;
  /** Emit an `Err` for this invocation (must NOT fire a second time — CNCL-2). */
  readonly emitErr: (error: QueryError) => void;
  /** Emit a `RuntimeEvent` (must NOT fire a second time — CNCL-3). */
  readonly emitRuntimeEvent: (event: RuntimeEvent) => void;
}

/** Disposition of one late tool-call settlement. */
export type ToolCallLateDisposition = "rebind" | "discarded";

/**
 * CNCL-1/2/3. Decide the disposition of one late settlement of a tool call's
 * `execute()` Promise. Once `guard.cancellationSurfaced` is true the settlement
 * is discarded across all three coupled channels (no rebind, no second `Err`,
 * no second `RuntimeEvent`); otherwise the value flows to the normal tool-call
 * binding path.
 */
export function routeToolCallLateSettlement(
  settlement: ToolCallSettlement,
  guard: ToolCallCancellationGuard,
  channels: ToolCallSideChannels,
): ToolCallLateDisposition {
  // Inert (tests-task): the stub does the WRONG thing after cancellation — it
  // rebinds the call site and re-emits both `Err` and `RuntimeEvent`, so the
  // CNCL-1/2/3 assertions (all three channels silent, disposition "discarded")
  // red. The paired V17a leaf discards silently when `cancellationSurfaced`.
  const value =
    settlement.kind === "rejected" ? undefined : settlement.value;
  channels.rebindCallSite(value);
  channels.emitErr({ kind: "cancelled", message: "late tool-call settlement" });
  channels.emitRuntimeEvent({
    kind: "code_tool",
    loom: "/stub",
    invocation_id: "stub",
    message: "late tool-call settlement",
    occurred_at: 0,
  });
  return "rebind";
}

// ---------------------------------------------------------------------------
// Swallowing-handler three-side-channel suppression (Checkpoint-seam substrate).
// ---------------------------------------------------------------------------

/**
 * The settlement of an abandonable Pi-returned Promise the runtime might drop
 * under cancellation (the substrate shared by the four owning sites `V14f`,
 * `V13f`, `V15h`, `V9o`).
 */
export type AbandonableSettlement =
  | { readonly kind: "resolved"; readonly value: unknown }
  | { readonly kind: "rejected"; readonly error: unknown };

/** Live cancellation state for one abandonable Promise. */
export interface SubstrateCancellationGuard {
  /** True once the corresponding checkpoint surfaced `cause: "cancelled"`. */
  cancellationSurfaced: boolean;
}

/**
 * The two emit channels a late substrate settlement could reach (the
 * `unhandledRejection` channel is closed structurally by attaching the handler
 * at construction, so it takes no member here): the always-log `RuntimeEvent`
 * channel and the diagnostics channel. Both MUST stay silent post-cancel.
 */
export interface SubstrateSideChannels {
  readonly emitRuntimeEvent: (event: RuntimeEvent) => void;
  readonly emitDiagnostic: (diagnostic: Diagnostic) => void;
}

/** Disposition of one late substrate settlement. */
export type SubstrateDisposition = "discarded" | "surfaced";

/**
 * Attach the swallowing handler to an abandonable Promise at its construction
 * site, before the first microtask boundary, and return the same Promise so
 * callers keep the construction expression. A late rejection arriving after the
 * checkpoint surfaced `cause: "cancelled"` is then silently absorbed and never
 * reaches Node's `unhandledRejection` process event (cancellation.md §Race
 * semantics — swallowing-handler attachment).
 */
export function attachSwallowingHandler<T>(
  promise: Promise<T>,
  _guard: SubstrateCancellationGuard,
  _channels: SubstrateSideChannels,
): Promise<T> {
  // Inert (tests-task): NO handler is attached, so a late rejection reaches
  // Node's `unhandledRejection` channel and the suppression assertion reds. The
  // paired V17a leaf attaches `.then(onResolve, onReject)` here, before the
  // first microtask boundary, routing each settlement through
  // `routeAbandonableSettlement`.
  return promise;
}

/**
 * Decide the disposition of one late substrate settlement. Once
 * `guard.cancellationSurfaced` is true the settlement is discarded on both emit
 * channels (this function emits nothing) — no second `RuntimeEvent` and no
 * diagnostic of any severity (a diagnostic-worthy OOM-style rejection is still
 * discarded; promotion to `loom/runtime/internal-error` would re-introduce the
 * second-event surface the rule forbids). Otherwise the settlement is surfaced
 * to its owning site's normal path.
 */
export function routeAbandonableSettlement(
  _settlement: AbandonableSettlement,
  _guard: SubstrateCancellationGuard,
  channels: SubstrateSideChannels,
): SubstrateDisposition {
  // Inert (tests-task): the stub bypasses the substrate — it re-emits a second
  // `RuntimeEvent` and a `loom/runtime/internal-error` diagnostic and reports
  // "surfaced", so the three-side-channel suppression assertions red. The paired
  // V17a leaf discards silently when `cancellationSurfaced`.
  channels.emitRuntimeEvent({
    kind: "code_tool",
    loom: "/stub",
    invocation_id: "stub",
    message: "late abandonable settlement",
    occurred_at: 0,
  });
  channels.emitDiagnostic({
    severity: "error",
    code: "loom/runtime/internal-error",
    message: "late abandonable settlement",
  });
  return "surfaced";
}

// ---------------------------------------------------------------------------
// CNCL-5 / CNCL-6 — race semantics against a completed `Ok` and a tail abort.
// ---------------------------------------------------------------------------

/** A completed cancellable operation's result. */
export type OperationResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: QueryError };

/**
 * A single checkpointed statement in a cancellable sequence. `binding` is the
 * name its result is bound to; the interpreter awaits `checkpoint.before(kind,
 * site)` and reads the signal *before* dispatching `run()`.
 */
export interface CancellableStatement {
  readonly binding: string;
  readonly kind: CheckpointKind;
  readonly site: CheckpointSite;
  run(): Promise<OperationResult>;
}

/** Inputs the cancellable-sequence runner reads the abort through. */
export interface CancellableSequenceDeps {
  readonly checkpoint: Checkpoint;
  /** `loomAbort.signal` — the single source of truth (never `ctx.signal`). */
  readonly signal: AbortSignal;
}

/** The outcome of running a cancellable statement sequence. */
export interface CancellableSequenceOutcome {
  /**
   * Every completed binding, in order. CNCL-5: a completed `Ok(v)` is retained
   * here verbatim and is NEVER retroactively rewritten to `Err({kind:"cancelled"})`.
   */
  readonly bindings: ReadonlyMap<string, OperationResult>;
  /** The top-level result. */
  readonly result: OperationResult;
  /**
   * CNCL-6: whether a top-level `cancelled` was synthesised. MUST be `false`
   * when the abort fired in a pure tail with no further checkpoint to execute.
   */
  readonly synthesizedTopLevelCancelled: boolean;
}

/** Build the canonical `CancelledError` (`message` unconstrained per ERR/CancelledError). */
export function makeCancelledError(): CancelledError {
  return { kind: "cancelled", message: "cancelled" };
}

/**
 * Run a sequence of checkpointed statements under `deps.signal`. Before each
 * statement it awaits `deps.checkpoint.before(kind, site)` and reads the signal;
 * an abort observed at a checkpoint surfaces `Err({kind:"cancelled"})` at THAT
 * position without rewriting any already-completed binding (CNCL-5). An abort in
 * a pure tail after the final cancellable operation — no further checkpoint —
 * leaves the top-level result as the produced value with NO synthesised
 * top-level `cancelled` (CNCL-6).
 */
export async function runCancellableSequence(
  _deps: CancellableSequenceDeps,
  _statements: readonly CancellableStatement[],
): Promise<CancellableSequenceOutcome> {
  // Inert (tests-task): the stub does the WRONG thing — it retains no bindings
  // and synthesises a top-level `cancelled`, so CNCL-5 (a completed `Ok` is
  // retained) and CNCL-6 (no top-level synthesis on tail abort) both red. The
  // paired V17a leaf awaits each checkpoint, preserves completed bindings, and
  // suppresses top-level synthesis on a tail abort.
  return {
    bindings: new Map<string, OperationResult>(),
    result: { ok: false, error: makeCancelledError() },
    synthesizedTopLevelCancelled: true,
  };
}
