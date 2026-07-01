// V13f / V13f-T — the `@`-query provider abandonable-Promise swallowing-handler
// per-site routing seam.
//
// This module owns the `@`-query entry in the four-site abandonable-Promise
// routing set the cancellation core (`V17a`) delegates to its owning leaves
// (`V14f`, `V13f`, `V15h`, `V9o`). Two seams make up the one swallowing-handler
// mechanism for this site (cancellation.md §"Race semantics — swallowing-handler
// attachment on every abandonable Promise", coverage-matrix row `cka-33`, this
// leaf's `V13f` facet):
//
//   - `guardQueryProviderPromise` — the construction-site attachment. It
//     attaches the swallowing handler to the underlying `@`-query provider
//     Promise at the same site that constructs it, before the first microtask
//     boundary, so a late rejection arriving after the query checkpoint has
//     already surfaced `cause: "cancelled"` is silently absorbed and never
//     reaches Node's `unhandledRejection` process event.
//   - `routeQueryProviderLateSettlement` — the discard decision the attached
//     handler applies to each settlement. Once cancellation has surfaced for
//     this invocation, the late settlement is discarded across all three side
//     channels: no second `RuntimeEvent` on the always-log channel and no
//     diagnostic of any severity (no promotion to `loom/runtime/internal-error`).
//     The `@`-query site has its own per-checkpoint `Err` surface governed by
//     the cancellation.md Surfacing rules, so the tool-call-only `Err` clauses
//     (a)/(b) are NOT extended to this site by this seam.
//
// The `Checkpoint` seam (`V8a`) is the deterministic-test substrate for landing
// the late settlement at a chosen point without depending on JS microtask
// scheduling.
//
// `guardQueryProviderPromise` attaches the construction-site handler and routes
// every settlement through `routeQueryProviderLateSettlement`, which discards a
// settlement once cancellation has surfaced for the invocation (emitting nothing
// on any of the three side channels) and reports it live otherwise.
//
// Spec: cancellation.md (§"Race semantics — swallowing-handler attachment on
// every abandonable Promise"); host-interfaces-services.md (§"`Checkpoint`
// seam", PIC-10).

import type { Diagnostic } from "../diagnostics/diagnostic";
import type { RuntimeEvent } from "./runtime-event-channel";

/**
 * The settlement outcome of the underlying `@`-query provider Promise — the
 * value it resolved with, or the reason it rejected with. Enumerated so the
 * discard decision is independent of the late-settle kind (cancellation.md: "the
 * discriminator is whether cancellation has already been surfaced at the
 * checkpoint, not the late-settle kind").
 */
export type QueryProviderSettlement =
  | { readonly kind: "resolved"; readonly value: unknown }
  | { readonly kind: "rejected"; readonly error: unknown };

/**
 * The live cancellation state for one `@`-query invocation. Read at settlement
 * time (not snapshotted at Promise construction), because cancellation may
 * surface at the query checkpoint between the provider Promise's construction
 * and its late settlement.
 */
export interface QueryProviderCancellationGuard {
  /**
   * True once the query checkpoint for this invocation has surfaced
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
export interface QueryProviderSideChannels {
  /** Emit a second `RuntimeEvent` for this invocation (must not fire post-cancel). */
  readonly emitRuntimeEvent: (event: RuntimeEvent) => void;
  /** Emit a diagnostic for this invocation (must not fire post-cancel). */
  readonly emitDiagnostic: (diagnostic: Diagnostic) => void;
}

/**
 * The disposition of one late settlement: `"discarded"` once cancellation has
 * surfaced (silently absorbed on all three side channels), or `"surfaced"` on
 * the pre-cancellation path.
 */
export type QueryProviderLateSettlementDisposition = "discarded" | "surfaced";

/**
 * Attach the swallowing handler to the underlying `@`-query provider Promise at
 * its construction site, before the first microtask boundary, and return the
 * same Promise so callers keep the construction expression. Each settlement is
 * routed through `routeQueryProviderLateSettlement`, so a late rejection
 * arriving after cancellation surfaced is absorbed without a Node
 * `unhandledRejection` process event.
 */
export function guardQueryProviderPromise<T>(
  providerPromise: Promise<T>,
  guard: QueryProviderCancellationGuard,
  channels: QueryProviderSideChannels,
): Promise<T> {
  // Attach the swallowing handler synchronously at the construction site,
  // before the first microtask boundary: `.then(onResolve, onReject)` on the
  // provider Promise as it is constructed. A lazily-attached `.catch` would
  // miss a rejection already queued for `unhandledRejection`. Each settlement
  // is routed through `routeQueryProviderLateSettlement`, which decides
  // discard-vs-surface against the live cancellation state; a discarded late
  // rejection is absorbed here and never reaches Node's `unhandledRejection`
  // process event.
  providerPromise.then(
    (value: T): void => {
      routeQueryProviderLateSettlement(
        { kind: "resolved", value },
        guard,
        channels,
      );
    },
    (error: unknown): void => {
      routeQueryProviderLateSettlement(
        { kind: "rejected", error },
        guard,
        channels,
      );
    },
  );
  return providerPromise;
}

/**
 * Decide the disposition of one late settlement of the underlying `@`-query
 * provider Promise. Once `guard.cancellationSurfaced` is true the settlement is
 * discarded on all three side channels (this function emits nothing); otherwise
 * the query result flows to the normal `@`-query Surfacing path.
 *
 * The discriminator is whether cancellation has surfaced for this invocation,
 * not the late-settle kind: a late `resolved` value and a late `rejected` error
 * are discarded identically once `cancellationSurfaced` is true. A late
 * rejection whose `.error` would otherwise be diagnostic-worthy is still
 * discarded — promoting it to `loom/runtime/internal-error` would re-introduce
 * the second-event surface this rule forbids (cancellation.md §"Race
 * semantics — swallowing-handler attachment on every abandonable Promise").
 */
export function routeQueryProviderLateSettlement(
  _settlement: QueryProviderSettlement,
  guard: QueryProviderCancellationGuard,
  _channels: QueryProviderSideChannels,
): QueryProviderLateSettlementDisposition {
  if (guard.cancellationSurfaced) {
    // Abandoned case: cancellation already surfaced `cause: "cancelled"` at the
    // `@`-query checkpoint. Discard silently on all three side channels — emit
    // no second `RuntimeEvent` and no diagnostic of any severity; the
    // construction-site handler in `guardQueryProviderPromise` closes the
    // `unhandledRejection` channel by absorbing the rejection here.
    return "discarded";
  }
  // Pre-cancellation path: the query result flows to the normal `@`-query
  // Surfacing rules. This site emits nothing itself — the normal `@`-query
  // execution path owns the resolve/reject surfacing; routing here only
  // reports that the settlement is live so the caller does not absorb it.
  return "surfaced";
}
