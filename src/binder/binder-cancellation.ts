// V11j / V11j-T — in-flight binder-call cancellation forwarding (cka-43).
//
// This module owns the cancellation-aware binder-call driver
// (cancellation.md §Granularity binder-call clause, §Surfacing cancelled-binder
// arm; binder/determinism-cancellation-failure.md §Cancellation, §Failure
// modes cancelled-binder row):
//
//   - `loomAbort.signal` is forwarded into the binder's provider invocation as
//     the inference call's `options.signal` on the initial attempt AND on every
//     retry permitted by the V11f per-class budget.
//   - An abort observed *before or during* the binder call — whether on the
//     initial attempt or during a budgeted retry — suppresses that attempt/retry
//     and surfaces the cancelled-binder system note
//     (`loom /<name>: argument binding cancelled`) immediately, irrespective of
//     which class's retry budget remains. The loom does not run: no `Result`
//     ever reaches loom code, because a cancelled binder means the loom never
//     started.
//
// This is distinct from the *pre-call* `binder-call` `CheckpointKind` V17c owns
// (the checkpoint firing immediately before the binder's LLM call is issued):
// V11j covers the abort landing *during* the in-flight provider call, surfacing
// through the forwarded `options.signal`, and its suppression of any remaining
// budgeted retry.
//
// V11j-T (tests-task) declares this seam and stubs the driver inertly: it issues
// no binder call, never forwards the signal, and never surfaces cancellation
// (it returns a zero-call `completed`/`ok` sentinel). The cancellation
// assertions therefore red on their own primary expectation — no cancelled-binder
// note surfaces, the signal is never forwarded to an attempt, and the loom would
// wrongly run — not on a compile error, a missing fixture, or a harness throw.
// The paired V11j implementation leaf fills it in.
//
// Spec: cancellation.md (§Granularity binder-call clause, §Surfacing
// cancelled-binder arm); binder/determinism-cancellation-failure.md
// (§Cancellation, §Failure modes cancelled-binder row).

import type { BinderAttemptOutcome } from "./retry-taxonomy";

/**
 * The outcome of a cancellation-aware binder run.
 *
 *   - `cancelled` — an abort landed before or during a binder call (the initial
 *     attempt or a budgeted retry). The cancelled-binder system `note` is
 *     surfaced and the loom does not run; no `Result` reaches loom code.
 *   - `completed` — the binder chain settled without an abort. `outcome` is the
 *     V11f most-recent-attempt outcome that flows to the normal binder surfacing
 *     / loom-start path, and `callCount` is the number of binder LLM calls
 *     issued (1 … {@link MAX_BINDER_LLM_CALLS}).
 */
export type BinderCallResult =
  | { readonly kind: "cancelled"; readonly note: string }
  | {
      readonly kind: "completed";
      readonly callCount: number;
      readonly outcome: BinderAttemptOutcome;
    };

/** Inputs to {@link runBinderCallWithCancellation}. */
export interface BinderCallInput {
  /** The loom's bare command name (shown as `loom /<name>:`). */
  readonly loomName: string;
  /**
   * `loomAbort.signal` — the single source of truth (never `ctx.signal`
   * directly). Forwarded into every attempt below as its `options.signal`, and
   * read after each attempt settles to detect an abort observed during the call.
   */
  readonly signal: AbortSignal;
  /**
   * Issue one binder LLM call with the loom's abort `signal` forwarded as the
   * provider invocation's `options.signal`. `attemptIndex` is 0 for the initial
   * attempt and increments per budgeted retry. The driver forwards the same
   * `input.signal` on every call.
   */
  readonly attempt: (
    attemptIndex: number,
    signal: AbortSignal,
  ) => Promise<BinderAttemptOutcome>;
}

/**
 * Drive the binder call under cancellation (cka-43): forward `input.signal` into
 * every attempt as its `options.signal`, run the V11f per-class retry budget,
 * and — when an abort is observed before or during any attempt (initial or
 * budgeted retry) — suppress that attempt/retry and surface the cancelled-binder
 * system note immediately, so the loom does not run.
 *
 * V11j-T stubs this inert: it issues no attempt, forwards no signal, and never
 * surfaces cancellation. The paired V11j leaf implements it.
 */
export async function runBinderCallWithCancellation(
  input: BinderCallInput,
): Promise<BinderCallResult> {
  // V11j-T inert stub: issue no binder call and never surface cancellation, so
  // the cancelled-binder assertions red on their own primary expectation. The
  // paired V11j implementation leaf forwards the signal into each attempt and
  // surfaces the cancelled-binder note on an abort observed before/during a call.
  void input;
  return { kind: "completed", callCount: 0, outcome: { kind: "ok" } };
}
