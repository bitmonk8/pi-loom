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
// V17b-T (tests-task) declares the seam and stubs each entry point inertly: a
// no-op listener that neither forwards the abort into `loomAbort` nor traps and
// routes a throw. The failing tests therefore red on their own primary
// assertions (no runtime-defect diagnostic emitted; the downstream checkpoint
// never observes cancellation; the invoke parent never surfaces
// `InvokeInfraError`) because the paired `V17b` implementation is absent.
//
// Spec: cancellation.md (§"Forwarding into `loomAbort`", §"Forwarding-listener
// throw", CNCL-4 one-shot guard); pi-integration-contract/host-interfaces-core.md
// (`ExtensionContext` `ctx.abort()` override citing this clause);
// pi-integration-contract/host-prerequisites.md.

import type { Diagnostic, SourceRange } from "../diagnostics/diagnostic";
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
  void loomAbort;
  void sink;
  void site;
  if (ctxSignal === undefined) {
    return;
  }
  // Inert V17b-T stub: subscribe so the source listener exists, but neither
  // forward the abort into `loomAbort` nor trap/route a throw. The paired V17b
  // implementation wraps `loomAbort.abort(ctxSignal.reason)` in the trap.
  ctxSignal.addEventListener("abort", () => {}, { once: true });
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
  void loomAbort;
  void sink;
  void site;
  // Inert V17b-T stub: see `trapForwardSlashCommandCancel`.
  signal.addEventListener("abort", () => {}, { once: true });
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
  void child;
  void sink;
  void site;
  void calleePath;
  // Inert V17b-T stub: see `trapForwardSlashCommandCancel`.
  parentSignal.addEventListener("abort", () => {}, { once: true });
}
