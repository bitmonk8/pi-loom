// V15m / V15m-T — the invoke-site cancellation checkpoint (cka-47, V15m facet)
// and the completed-callee-finality live-carrier witness (ERR-13).
//
// This module owns the two cancellation facets that ride on the live `invoke`
// execution surface, split out of `V15a` (invocation-core) per conventions.md
// §smallest-shippable-leaf, mirroring the V15f/V15g/V15h and V14g carve-out
// pattern:
//
//   - cka-47 (`V15m` facet) — a cancellation checkpoint fires immediately before
//     each `invoke` call on the live execution surface. The interpreter awaits
//     `checkpoint.before("invoke", site)` immediately before dispatching the
//     child invoke, then reads `signal.aborted`; an abort observed at that
//     pre-dispatch checkpoint skips the spawn and surfaces a cancelled outcome.
//     This is the `invoke` per-site presence arm distributed off `V17c`'s
//     checkpoint-granularity surface (cancellation.md §Granularity; V8a
//     `Checkpoint` seam PIC-10, host-interfaces-services.md#checkpoint-seam).
//   - ERR-13 (delegated live-carrier witness for `V4f`'s completed-callee-
//     finality deferral) — an `invoke` child driven to completion on the live
//     execution surface keeps its committed side effect after a downstream
//     `?` / panic / cancel, with no compensating turn injected. The guarantee is
//     architectural: the runtime holds no compensating / rollback path (see
//     `handleNoRollbackTerminalEvent`), so a completed callee's side effect
//     survives by construction (errors-and-results/error-model.md#err-13).
//
// V15m-T (tests-task) declares this surface and stubs the behaviour-bearing
// function inertly: `runInvokeChild` fires no checkpoint, never drives the
// child, and returns a cancelled outcome carrying no committed side effect. The
// cka-47 presence assertions therefore red on their own primary expectation
// (the expected `invoke` checkpoint is absent and the child never runs) and the
// ERR-13 witness reds because the completed-callee value / committed side effect
// never surfaces — not on a compile error, a missing fixture, or a harness
// throw. The paired V15m implementation leaf fills this in.
//
// Spec: cancellation.md §Granularity; invocation.md; errors-and-results/
// error-model.md §"No rollback" (ERR-13); host-interfaces-services.md PIC-10.

import type { Checkpoint, CheckpointSite } from "../seams/checkpoint";
import type { ResultValue } from "./value";
import type { CommittedSideEffect } from "./no-rollback";

/**
 * One `invoke` child driven on the live execution surface.
 *
 *   - `calleePath` is the resolved callee path the child was spawned from.
 *   - `drive()` runs the child to completion and returns its top-level
 *     `Result<T, QueryError>` (an `Ok` payload on success, an `Err` envelope on
 *     the callee's own failure or an infra failure around the callee body).
 *   - `committed` exposes the side effects the completed callee produced before
 *     any downstream terminal event, so the ERR-13 witness can assert they
 *     remain final.
 */
export interface InvokeChild {
  readonly calleePath: string;
  drive(): Promise<ResultValue>;
  readonly committed: readonly CommittedSideEffect[];
}

/**
 * The outcome of driving one `invoke` child on the live surface:
 *   - `value` — the child ran to completion; `result` is its top-level `Result`
 *     and `committed` are the side effects it produced (each final under any
 *     downstream terminal event, ERR-13);
 *   - `cancelled` — the pre-dispatch checkpoint observed the abort; the child
 *     was never spawned and no side effect was committed.
 */
export type InvokeChildOutcome =
  | {
      readonly kind: "value";
      readonly result: ResultValue;
      readonly committed: readonly CommittedSideEffect[];
    }
  | { readonly kind: "cancelled"; readonly committed: readonly CommittedSideEffect[] };

/**
 * Drive one `invoke(...)` child on the live surface under the cancellation
 * granularity rule: await `checkpoint.before("invoke", site)` immediately before
 * spawning the child (cka-47, V15m facet; cancellation.md §Granularity), read
 * `signal.aborted`, and skip the spawn when it has fired. Otherwise drive the
 * child to completion via `child.drive()` and surface its top-level `Result`
 * together with the completed callee's `committed` side effects, which remain
 * final under any downstream terminal event (ERR-13; the runtime holds no
 * compensating path — see `handleNoRollbackTerminalEvent`).
 *
 * V15m-T stubs this inert: it fires no checkpoint, never drives the child, and
 * returns a cancelled outcome carrying no committed side effect. The paired V15m
 * leaf implements it.
 */
export async function runInvokeChild(
  _checkpoint: Checkpoint,
  _signal: AbortSignal,
  _site: CheckpointSite,
  _child: InvokeChild,
): Promise<InvokeChildOutcome> {
  // V15m-T inert stub: no `invoke` checkpoint fires, the child is never spawned,
  // and no side effect is committed. The paired V15m leaf awaits
  // `checkpoint.before("invoke", site)`, reads the signal, and drives the child.
  return { kind: "cancelled", committed: [] };
}
