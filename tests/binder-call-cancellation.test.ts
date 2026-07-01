// V11j-T — failing tests for the paired `V11j` in-flight binder-call
// cancellation-forwarding surface (coverage-matrix.md code-keyed-area token
// `cka-43`, `V11j` closing leaf).
//
// Spec: cancellation.md §Granularity (the binder-call clause: the signal is
// forwarded to the binder model's provider invocation, so an abort observed
// *during* the binder call also surfaces) and §Surfacing (the cancelled-binder
// arm: a cancelled binder never surfaces a `Result` to loom code — the loom
// never starts — and instead produces the cancelled-binder system note);
// binder/determinism-cancellation-failure.md §Cancellation (`ctx.signal`
// forwarded into the binder inference call as `options.signal` on the initial
// attempt and every budgeted retry) and §Failure modes (the cancelled-binder
// row `loom /<name>: argument binding cancelled`, and the per-invocation-budget
// clause "an abort observed during any retry permitted by the budget suppresses
// that retry and surfaces the cancelled-binder note immediately").
//
// This surface is distinct from the *pre-call* `binder-call` checkpoint V17c
// owns: V11j covers the abort landing *during* the in-flight provider call
// (surfaced through the forwarded `options.signal`) and its suppression of any
// remaining budgeted retry. The abort is landed at a chosen point during the
// in-flight call through the `Checkpoint` seam substrate (available via
// `Deps. V17a`).
//
// Each test cites the `cka-43` code-keyed-area token and this leaf's `V11j`
// closing-leaf-ID inline so the H5f per-facet citing-test gate associates the
// facet to its test. Each reds on its own primary assertion while `V11j` is
// absent: `runBinderCallWithCancellation` issues no attempt, forwards no signal,
// and never surfaces cancellation (it returns a zero-call `completed`/`ok`
// sentinel) — so the cancelled-outcome, note-string, forwarding, and
// loom-does-not-run expectations red rather than a compile error, a missing
// fixture, or a harness throw.

import { describe, expect, it } from "vitest";
import type {
  Checkpoint,
  CheckpointKind,
  CheckpointSite,
} from "../src/seams/checkpoint";
import type { BinderAttemptOutcome } from "../src/binder/retry-taxonomy";
import {
  runBinderCallWithCancellation,
  type BinderCallResult,
} from "../src/binder/binder-cancellation";

const LOOM_NAME = "demo";
const BINDER_SITE: CheckpointSite = { file: "loom.loom", line: 1, column: 1 };

// The cancelled-binder system note, sourced verbatim from the failure-modes
// table row "`loomAbort.signal` aborted before or during the binder call" in
// binder/determinism-cancellation-failure.md §Failure modes.
const CANCELLED_BINDER_NOTE = `loom /${LOOM_NAME}: argument binding cancelled`;

/** A transport-shaped provider outcome (the provider's abort path surfaces here). */
const TRANSPORT_ABORTED: BinderAttemptOutcome = {
  kind: "transport",
  provider: "anthropic-messages",
  message: "aborted",
};

/**
 * A `Checkpoint` substrate that lands a Pi-dispatched-style abort at a chosen
 * point *during* the in-flight binder call: when the harness attempt awaits
 * `before("binder-call", site)` on the targeted attempt index, the controller is
 * aborted, modelling the provider observing the forwarded `options.signal`
 * mid-flight. `before` resolves on the microtask queue — the deterministic test
 * substrate whose yield kind does not matter to the forwarding / surfacing arms.
 */
class MidFlightAbortCheckpoint implements Checkpoint {
  readonly kinds: CheckpointKind[] = [];
  #calls = 0;

  constructor(
    private readonly controller: AbortController,
    private readonly abortOnCall: number,
  ) {}

  before(kind: CheckpointKind, _site: CheckpointSite): Promise<void> {
    this.kinds.push(kind);
    if (this.#calls === this.abortOnCall) {
      this.controller.abort();
    }
    this.#calls += 1;
    return Promise.resolve();
  }
}

/**
 * Build a harness `attempt` that forwards through the provider call: it records
 * the signal it received (so forwarding can be asserted), awaits the checkpoint
 * substrate (the in-flight window in which the abort may land), then — if the
 * signal aborted mid-flight — surfaces the provider's abort path
 * ({@link TRANSPORT_ABORTED}); otherwise it returns the next scripted outcome.
 */
function providerAttempt(
  checkpoint: Checkpoint,
  script: readonly BinderAttemptOutcome[],
): {
  attempt: BinderAttemptScript;
  receivedSignals: () => readonly AbortSignal[];
} {
  const received: AbortSignal[] = [];
  const last = script[script.length - 1] ?? TRANSPORT_ABORTED;
  const attempt: BinderAttemptScript = async (index, signal) => {
    received.push(signal);
    // The provider call is in flight; the abort may land during this window.
    await checkpoint.before("binder-call", BINDER_SITE);
    if (signal.aborted) {
      // The provider observed the forwarded `options.signal` mid-flight and
      // surfaced its abort path.
      return TRANSPORT_ABORTED;
    }
    return script[index] ?? last;
  };
  return { attempt, receivedSignals: () => received };
}

type BinderAttemptScript = (
  attemptIndex: number,
  signal: AbortSignal,
) => Promise<BinderAttemptOutcome>;

// ===========================================================================
// cka-43 / V11j — abort during the in-flight binder call on the INITIAL attempt.
// ===========================================================================

describe("V11j-T — in-flight binder-call cancellation, initial attempt (cka-43 / V11j)", () => {
  it("cka-43 / V11j: an abort during the in-flight binder call surfaces the cancelled-binder note and the loom does not run", async () => {
    const controller = new AbortController();
    // Abort during the first (index 0) in-flight call.
    const checkpoint = new MidFlightAbortCheckpoint(controller, 0);
    const { attempt } = providerAttempt(checkpoint, [{ kind: "ok" }]);

    const result: BinderCallResult = await runBinderCallWithCancellation({
      loomName: LOOM_NAME,
      signal: controller.signal,
      attempt,
    });

    // Primary: the abort observed during the call surfaces the cancelled-binder
    // system note; the loom does not run (a `cancelled` result carries no
    // outcome that could reach loom code).
    expect(result.kind).toBe("cancelled");
    if (result.kind !== "cancelled") {
      expect.unreachable("expected a cancelled binder result");
    }
    expect(result.note).toBe(CANCELLED_BINDER_NOTE);
  });

  it("cka-43 / V11j: loomAbort.signal is forwarded into the binder provider invocation as options.signal", async () => {
    const controller = new AbortController();
    // Never abort — assert the forwarded signal identity on a clean initial call.
    const checkpoint = new MidFlightAbortCheckpoint(controller, -1);
    const { attempt, receivedSignals } = providerAttempt(checkpoint, [
      { kind: "ok" },
    ]);

    await runBinderCallWithCancellation({
      loomName: LOOM_NAME,
      signal: controller.signal,
      attempt,
    });

    // Primary: the driver forwarded `input.signal` (loomAbort.signal) into the
    // attempt — one forwarded signal for the single initial call, and it is the
    // loom signal itself, not a fresh or `undefined` signal.
    const forwarded = receivedSignals();
    expect(forwarded.length).toBe(1);
    expect(forwarded[0]).toBe(controller.signal);
  });
});

// ===========================================================================
// cka-43 / V11j — abort during a BUDGETED RETRY of the binder call.
// ===========================================================================

describe("V11j-T — in-flight binder-call cancellation, budgeted retry (cka-43 / V11j)", () => {
  it("cka-43 / V11j: an abort during a budgeted retry suppresses the retry and surfaces the cancelled-binder note immediately", async () => {
    const controller = new AbortController();
    // Initial call (index 0) fails transport with no abort; the abort lands
    // during the budgeted transport-class retry (the second in-flight call).
    const checkpoint = new MidFlightAbortCheckpoint(controller, 1);
    const { attempt, receivedSignals } = providerAttempt(checkpoint, [
      TRANSPORT_ABORTED,
      { kind: "ok" },
    ]);

    const result = await runBinderCallWithCancellation({
      loomName: LOOM_NAME,
      signal: controller.signal,
      attempt,
    });

    // Primary: an abort observed during the retry surfaces the cancelled-binder
    // note immediately, irrespective of the remaining budget; the loom does not
    // run.
    expect(result.kind).toBe("cancelled");
    if (result.kind !== "cancelled") {
      expect.unreachable("expected a cancelled binder result on the budgeted retry");
    }
    expect(result.note).toBe(CANCELLED_BINDER_NOTE);

    // The signal was forwarded on both the initial attempt and the budgeted
    // retry, and is the same loomAbort.signal each time.
    const forwarded = receivedSignals();
    expect(forwarded.length).toBe(2);
    expect(forwarded.every((s) => s === controller.signal)).toBe(true);
  });
});
