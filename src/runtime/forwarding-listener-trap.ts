// V17b / V17b-T — the forwarding-listener throw-trap seam.
//
// A throw raised inside any of the three steady-state forwarding listeners'
// `loomAbort.abort(source.reason)` call — the slash-command `ctx.signal`-aborted
// trigger, the tool-exposed `signal`-aborted trigger, and the `invoke`-parent
// derived-controller trigger — is trapped at the listener boundary and routed
// through the runtime-defect surface (`loom/runtime/internal-error`), and at an
// `invoke` parent additionally surfaces via the `cause: "internal_error"` arm of
// `InvokeInfraError`, WITHOUT swallowing the cancellation itself: the source's
// abort has already taken effect before the throw, so `source.signal.aborted`
// stays `true` and the next `Checkpoint`-seam await still surfaces
// `Err(QueryError { kind: "cancelled" })` (cancellation.md §"Forwarding-listener
// throw"; the runtime-defect surface is errors-and-results/error-model.md
// §"Runtime panics").
//
// Because a throw inside an `AbortSignal` "abort" listener is not delivered to
// the `.abort()` caller — the WHATWG dispatch algorithm reports it out-of-band
// (Node raises it as an asynchronous `uncaughtException`) — the trap MUST wrap
// the `loomAbort.abort(source.reason)` call in a `try`/`catch` inside the
// listener so the defect is caught synchronously and routed, rather than
// escaping the listener boundary.
//
// V17b (implementation) fills in the three entry points: each registers the
// *real* forwarding listener that calls `loomAbort.abort(source.reason)` inside
// a synchronous `try`/`catch`. A throw is trapped at the listener boundary and
// routed through the runtime-defect surface (`surfaceUnexpectedThrow` →
// `loom/runtime/internal-error`); at an `invoke` parent it additionally surfaces
// via the `cause: "internal_error"` arm of `InvokeInfraError`. Because the abort
// takes effect on the underlying signal *before* the trailing throw, the trap
// does not swallow the cancellation: `source.signal.aborted` stays `true` and the
// next `Checkpoint`-seam await still surfaces `Err(QueryError { kind: "cancelled" })`.
//
// Spec: cancellation.md (§"Forwarding into `loomAbort`", §"Forwarding-listener
// throw", CNCL-4 one-shot guard); pi-integration-contract/host-interfaces-core.md
// (`ExtensionContext` `ctx.abort()` override citing this clause);
// pi-integration-contract/host-prerequisites.md.

import type { Diagnostic, SourceRange } from "../diagnostics/diagnostic";
import { surfaceUnexpectedThrow } from "./runtime-panics";
import type { InvokeInfraError } from "./query-error";

/**
 * The `loomAbort` controller-like target a forwarding listener aborts. The
 * injection point for a defect throw is its `abort(reason)` call: a faulty /
 * fault-injected `abort` sets the underlying signal (cancellation takes effect)
 * and then throws, and the trap catches only that trailing throw.
 */
export interface LoomAbortLike {
  abort(reason?: unknown): void;
  readonly signal: AbortSignal;
}

/** The source location reported on a trapped defect's runtime-defect diagnostic. */
export interface ForwardingListenerSite {
  readonly file: string;
  readonly range: SourceRange;
}

/**
 * The runtime-defect sink a trapped slash-command / tool-exposed forwarding
 * listener throw is routed to: the trap classifies the throw through the
 * runtime-defect surface (`loom/runtime/internal-error`) and emits the resulting
 * `Diagnostic` here.
 */
export interface ForwardingDefectSink {
  emitDefect(diagnostic: Diagnostic): void;
}

/**
 * The `invoke`-parent sink: in addition to the runtime-defect diagnostic, the
 * trap surfaces the trapped defect to the parent as
 * `InvokeInfraError { kind: "invoke_infra", cause: "internal_error", ... }`.
 */
export interface InvokeForwardingDefectSink extends ForwardingDefectSink {
  emitInvokeInfra(error: InvokeInfraError): void;
}

/**
 * Slash-command entry (cancellation.md §"Forwarding-listener throw"). Register
 * a listener on `ctxSignal` that calls `loomAbort.abort(ctxSignal.reason)` inside
 * the trap; a throw from that call is caught at the listener boundary and routed
 * through the runtime-defect surface without swallowing the cancellation. MUST
 * tolerate `ctxSignal` being `undefined` (idle non-turn slash entry).
 */
export function trapForwardSlashCommandCancel(
  loomAbort: LoomAbortLike,
  ctxSignal: AbortSignal | undefined,
  sink: ForwardingDefectSink,
  site: ForwardingListenerSite,
): void {
  // Pi documents `ctx.signal` as `undefined` in idle, non-turn contexts — which
  // is exactly when the slash-command handler fires — so tolerate it without
  // depending on its truthiness; there is nothing to forward yet.
  if (ctxSignal === undefined) {
    return;
  }
  forwardWithTrap(loomAbort, ctxSignal, sink, site);
}

/**
 * Tool-exposed entry — a loom registered into another loom's `tools:`
 * (cancellation.md §"Forwarding-listener throw"). Register a listener on the
 * `execute(...)` `signal` that calls `loomAbort.abort(signal.reason)` inside the
 * trap.
 */
export function trapForwardToolExposedCancel(
  loomAbort: LoomAbortLike,
  signal: AbortSignal,
  sink: ForwardingDefectSink,
  site: ForwardingListenerSite,
): void {
  forwardWithTrap(loomAbort, signal, sink, site);
}

/**
 * `invoke(...)`-parent entry (cancellation.md §"Forwarding-listener throw" /
 * §"Propagation"). Register a listener on `parentSignal` that calls
 * `child.abort(parentSignal.reason)` inside the trap; a throw is routed through
 * the runtime-defect surface AND surfaced to the parent as
 * `InvokeInfraError { cause: "internal_error" }` without swallowing cancellation.
 */
export function trapDeriveChildLoomAbort(
  parentSignal: AbortSignal,
  child: LoomAbortLike,
  sink: InvokeForwardingDefectSink,
  site: ForwardingListenerSite,
  calleePath: string,
): void {
  forwardWithTrap(child, parentSignal, sink, site, calleePath);
}

// ---------------------------------------------------------------------------
// The shared trap.
// ---------------------------------------------------------------------------

/**
 * Register the real forwarding listener on `source` and wrap the
 * `loomAbort.abort(source.reason)` call in a synchronous `try`/`catch`
 * (cancellation.md §"Forwarding-listener throw"). The abort is issued first so
 * the cancellation takes effect on the underlying signal before any throw; a
 * throw from the `abort(...)` call is then caught synchronously at the listener
 * boundary — a throw inside an `AbortSignal` "abort" listener is otherwise
 * reported out-of-band by the WHATWG dispatch algorithm (Node raises it as an
 * asynchronous `uncaughtException`) and never reaches the `.abort()` caller — and
 * routed through the runtime-defect surface (`surfaceUnexpectedThrow` →
 * `loom/runtime/internal-error`) without swallowing the cancellation. When
 * `calleePath` is supplied the sink is an `invoke`-parent sink and the defect
 * additionally surfaces as `InvokeInfraError { cause: "internal_error" }`.
 *
 * If `source` is already aborted at attach time the forward fires synchronously
 * (mirroring the `V17a` `forwardSignalReason` seam); otherwise a one-shot
 * listener carries it. The first-source-wins one-shot guard is inherent to the
 * underlying controller: a second `abort(...)` on an already-aborted controller
 * is a no-op and does not re-stamp the reason, so a re-entrant second trigger's
 * throw is trapped without altering the stamped reason.
 */
function forwardWithTrap(
  loomAbort: LoomAbortLike,
  source: AbortSignal,
  sink: ForwardingDefectSink | InvokeForwardingDefectSink,
  site: ForwardingListenerSite,
  calleePath?: string,
): void {
  const forward = (): void => {
    try {
      // Issue the abort first: the cancellation takes effect on the underlying
      // signal before any throw, so the trap below never swallows it.
      loomAbort.abort(source.reason);
    } catch (thrown: unknown) { // allow-broad-catch: loom/runtime/internal-error — cancellation.md
      // cancellation.md §"Forwarding-listener throw" mandates trapping any throw
      // from the `loomAbort.abort(source.reason)` call at the listener boundary
      // and routing it through the runtime-defect surface; the throw's type is
      // not statically knowable (a hostile `reason` getter, a Pi-side
      // `ctx.abort()` wrapper failure, or an internal invariant violation).
      routeForwardingDefect(thrown, sink, site, calleePath);
    }
  };

  if (source.aborted) {
    forward();
    return;
  }
  source.addEventListener("abort", forward, { once: true });
}

/**
 * Route a trapped forwarding-listener throw through the runtime-defect surface.
 * `surfaceUnexpectedThrow` classifies the throw (returning `undefined` for a
 * `LoomPanic` / host-fatal, which are not runtime defects); when it yields a
 * `loom/runtime/internal-error` `Diagnostic` the trap emits it, and at an
 * `invoke` parent (`calleePath` supplied on an `InvokeForwardingDefectSink`)
 * additionally surfaces the `cause: "internal_error"` arm of `InvokeInfraError`.
 */
function routeForwardingDefect(
  thrown: unknown,
  sink: ForwardingDefectSink | InvokeForwardingDefectSink,
  site: ForwardingListenerSite,
  calleePath?: string,
): void {
  const diagnostic = surfaceUnexpectedThrow(thrown, { file: site.file, range: site.range });
  if (diagnostic === undefined) {
    return;
  }
  sink.emitDefect(diagnostic);
  if (calleePath !== undefined && "emitInvokeInfra" in sink) {
    sink.emitInvokeInfra({
      kind: "invoke_infra",
      message: diagnostic.message,
      callee_path: calleePath,
      cause: "internal_error",
    });
  }
}
