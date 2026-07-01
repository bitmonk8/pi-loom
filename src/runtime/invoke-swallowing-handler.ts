// V15h / V15h-T — the `invoke` child top-level execution-Promise
// swallowing-handler per-site routing seam.
//
// This module owns the `invoke`-child entry in the four-site abandonable-Promise
// routing set the cancellation core (`V17a`) delegates to its owning leaves
// (`V14f`, `V13f`, `V15h`, `V9o`). Two seams make up the one swallowing-handler
// mechanism for this site (cancellation.md §"Race semantics — swallowing-handler
// attachment on every abandonable Promise", coverage-matrix row `cka-33`):
//
//   - `guardInvokeExecutionPromise` — the construction-site attachment. It
//     attaches the swallowing handler to the `invoke` child's top-level
//     execution Promise at the same site that constructs it, before the first
//     microtask boundary, so a late rejection arriving after the `invoke`
//     checkpoint has already surfaced `cause: "cancelled"` is silently absorbed
//     and never reaches Node's `unhandledRejection` process event.
//   - `routeInvokeExecutionLateSettlement` — the discard decision the attached
//     handler applies to each settlement. Once cancellation has surfaced for
//     this invocation, the late settlement is discarded across all three side
//     channels: no second `RuntimeEvent` on the always-log channel and no
//     diagnostic of any severity (no promotion to `loom/runtime/internal-error`).
//
// The `Checkpoint` seam (`V8a`) is the deterministic-test substrate for landing
// the late settlement at a chosen point without depending on JS microtask
// scheduling.
//
// V15h-T (tests-task) declares the seam shapes and stubs the behaviour-bearing
// functions inertly so the paired failing tests red on their own primary
// assertions:
//   - `guardInvokeExecutionPromise` returns the Promise WITHOUT attaching the
//     construction-site handler, so a late rejection reaches Node's
//     `unhandledRejection` channel — reddening the "no unhandledRejection"
//     assertion until `V15h` attaches the handler.
//   - `routeInvokeExecutionLateSettlement` bypasses the substrate: it re-surfaces
//     the late settlement on the `RuntimeEvent` and diagnostic channels
//     regardless of cancellation and returns `"surfaced"` — reddening the
//     three-channel-suppression assertions until `V15h` routes the discard.
// No test reds on a compile error, a missing fixture, or a harness throw.
//
// Spec: cancellation.md (§"Race semantics — swallowing-handler attachment on
// every abandonable Promise"); host-interfaces-services.md (§"`Checkpoint`
// seam", PIC-10).

import type { Diagnostic } from "../diagnostics/diagnostic";
import type { RuntimeEvent } from "./runtime-event-channel";

/**
 * The settlement outcome of the `invoke` child's top-level execution Promise —
 * the value it resolved with, or the reason it rejected with. Enumerated so the
 * discard decision is independent of the late-settle kind (cancellation.md: "the
 * discriminator is whether cancellation has already been surfaced at the
 * checkpoint, not the late-settle kind").
 */
export type InvokeExecutionSettlement =
  | { readonly kind: "resolved"; readonly value: unknown }
  | { readonly kind: "rejected"; readonly error: unknown };

/**
 * The live cancellation state for one invocation. Read at settlement time (not
 * snapshotted at Promise construction), because cancellation may surface at the
 * `invoke` checkpoint between the child execution Promise's construction and its
 * late settlement.
 */
export interface InvokeCancellationGuard {
  /**
   * True once the `invoke` checkpoint for this invocation has surfaced
   * `cause: "cancelled"`; a late settlement observed while this is true is the
   * abandoned case the swallowing handler discards.
   */
  cancellationSurfaced: boolean;
}

/**
 * The three side channels a late settlement could reach. The swallowing handler
 * MUST keep all three silent once cancellation has surfaced: the
 * `unhandledRejection` channel (closed by attaching the handler at construction,
 * so it takes no member here), and these two — the always-log `RuntimeEvent`
 * channel and the diagnostics channel.
 */
export interface InvokeExecutionSideChannels {
  /** Emit a second `RuntimeEvent` for this invocation (must not fire post-cancel). */
  readonly emitRuntimeEvent: (event: RuntimeEvent) => void;
  /** Emit a diagnostic for this invocation (must not fire post-cancel). */
  readonly emitDiagnostic: (diagnostic: Diagnostic) => void;
}

/**
 * The disposition of one late settlement: `"discarded"` once cancellation has
 * surfaced (silently absorbed on all three side channels), or `"surfaced"` on
 * the pre-cancellation path where the child result flows to the normal `invoke`
 * Surfacing rules.
 */
export type InvokeLateSettlementDisposition = "discarded" | "surfaced";

/**
 * Attach the swallowing handler to the `invoke` child's top-level execution
 * Promise at its construction site, before the first microtask boundary, and
 * return the same Promise so callers keep the construction expression. Each
 * settlement is routed through `routeInvokeExecutionLateSettlement`, so a late
 * rejection arriving after cancellation surfaced is absorbed without a Node
 * `unhandledRejection` process event.
 */
export function guardInvokeExecutionPromise<T>(
  executionPromise: Promise<T>,
  _guard: InvokeCancellationGuard,
  _channels: InvokeExecutionSideChannels,
): Promise<T> {
  // V15h-T stub: the construction-site swallowing handler is NOT attached, so a
  // late rejection reaches Node's `unhandledRejection` channel. `V15h` replaces
  // this with a synchronous `.then(onResolve, onReject)` at the construction
  // site that routes every settlement through
  // `routeInvokeExecutionLateSettlement`.
  return executionPromise;
}

/**
 * The sentinel `RuntimeEvent` the V15h-T stub emits to red the "no second
 * `RuntimeEvent`" assertion; a bypassing build would re-surface the late
 * settlement through the always-log channel with an event like this.
 */
function bypassSentinelEvent(): RuntimeEvent {
  return {
    kind: "invoke_callee",
    loom: "/stub",
    invocation_id: "00000000-0000-4000-8000-000000000000",
    message: "V15h-T stub: late invoke-child settlement re-surfaced",
    occurred_at: 0,
  };
}

/**
 * The sentinel diagnostic the V15h-T stub emits to red the "no diagnostic of any
 * severity" assertion; a bypassing build would promote the late rejection to
 * `loom/runtime/internal-error`, the exact promotion this rule forbids.
 */
function bypassSentinelDiagnostic(): Diagnostic {
  return {
    severity: "error",
    code: "loom/runtime/internal-error",
    message: "V15h-T stub: late invoke-child settlement promoted",
  };
}

/**
 * Decide the disposition of one late settlement of the `invoke` child's
 * execution Promise. Once `guard.cancellationSurfaced` is true the settlement is
 * discarded on all three side channels (this function emits nothing); otherwise
 * the child result flows to the normal `invoke` Surfacing path.
 */
export function routeInvokeExecutionLateSettlement(
  _settlement: InvokeExecutionSettlement,
  _guard: InvokeCancellationGuard,
  channels: InvokeExecutionSideChannels,
): InvokeLateSettlementDisposition {
  // V15h-T stub: bypasses the substrate — re-surfaces the late settlement on the
  // `RuntimeEvent` and diagnostic channels regardless of cancellation. `V15h`
  // replaces this with the discard decision keyed on `guard.cancellationSurfaced`
  // (emit nothing, return `"discarded"`) that the swallowing handler applies.
  channels.emitRuntimeEvent(bypassSentinelEvent());
  channels.emitDiagnostic(bypassSentinelDiagnostic());
  return "surfaced";
}
