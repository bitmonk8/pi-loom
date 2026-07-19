// V17b-T — failing tests for the paired `V17b` forwarding-listener throw-trap.
//
// Spec: cancellation.md §"Forwarding-listener throw" — a throw raised inside any
// of the three steady-state forwarding listeners' `thetaAbort.abort(source.reason)`
// call (the slash-command `ctx.signal`-aborted trigger, the tool-exposed
// `signal`-aborted trigger, and the `invoke`-parent derived-controller trigger)
// is trapped at the listener boundary and routed through the runtime-defect
// surface on `theta/runtime/internal-error` — and, at an `invoke` parent, via the
// `cause: "internal_error"` arm of `InvokeInfraError` — WITHOUT swallowing the
// cancellation (`source.signal.aborted` stays `true`; the next `Checkpoint`-seam
// await still surfaces `Err(QueryError { kind: "cancelled" })`).
// errors-and-results/error-model.md §"Runtime panics" defines the runtime-defect
// surface; errors-and-results/queryerror-variants.md defines `InvokeInfraError`.
//
// The injection is driven through the real V17b entry-point functions — which
// register the *real* forwarding listener — rather than a bespoke listener
// double, so the throw is raised inside the real listener boundary. The defect
// is injected by a `thetaAbort`-like controller whose `abort(reason)` first lets
// the cancellation take effect (so it is not swallowed) and then throws.
//
// These tests red on their own primary assertions while `V17b` is absent: the
// inert stubs register a no-op listener that neither forwards the abort into
// `thetaAbort` nor traps/routes the throw, so:
//   - no runtime-defect `theta/runtime/internal-error` diagnostic is emitted;
//   - the invoke parent never surfaces `InvokeInfraError`;
//   - `thetaAbort` never aborts, so the downstream `Checkpoint`-seam sequence
//     never surfaces `Err({ kind: "cancelled" })`;
//   - the one-shot guard's first-source reason is never stamped.
// No test reds on a compile error, a missing fixture, or a harness throw.

import { describe, expect, it } from "vitest";
import type { Checkpoint, CheckpointKind, CheckpointSite } from "../src/seams/checkpoint";
import type { Diagnostic } from "../src/diagnostics/diagnostic";
import type { InvokeInfraError } from "../src/runtime/query-error";
import { INTERNAL_ERROR_CODE } from "../src/runtime/runtime-panics";
import {
  runCancellableSequence,
  type CancellableStatement,
  type OperationResult,
} from "../src/runtime/cancellation-core";
import {
  trapDeriveChildThetaAbort,
  trapForwardSlashCommandCancel,
  trapForwardToolExposedCancel,
  type ForwardingDefectSink,
  type ForwardingListenerSite,
  type InvokeForwardingDefectSink,
  type ThetaAbortLike,
} from "../src/runtime/forwarding-listener-trap";

const SITE: ForwardingListenerSite = {
  file: "theta.theta",
  range: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } },
};

const CHECKPOINT_SITE: CheckpointSite = { file: "theta.theta", line: 1, column: 1 };

/**
 * A `Checkpoint` whose `before(...)` is a no-op — the production wiring shape
 * (an already-resolved promise per checkpoint). `runCancellableSequence` reads
 * the injected signal after awaiting it, so a signal aborted before the first
 * statement surfaces `Err({ kind: "cancelled" })` at the first checkpoint.
 */
class NoopCheckpoint implements Checkpoint {
  before(_kind: CheckpointKind, _site: CheckpointSite): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * A `thetaAbort`-like controller whose `abort(reason)` lets the cancellation take
 * effect on the underlying signal FIRST (so the trap must not swallow it) and
 * then throws — the injected forwarding-listener defect. The trap is expected to
 * catch only that trailing throw.
 */
class ThrowingThetaAbort implements ThetaAbortLike {
  readonly #inner = new AbortController();
  readonly boom = new Error("thetaAbort.abort() threw inside the forwarding listener");

  get signal(): AbortSignal {
    return this.#inner.signal;
  }

  abort(reason?: unknown): void {
    // Cancellation takes effect before the throw: a second `abort` on the
    // already-aborted controller is a no-op (the first source's reason wins).
    this.#inner.abort(reason);
    throw this.boom;
  }
}

/** A recording `ForwardingDefectSink` (slash / tool). */
function makeDefectSink(): {
  readonly sink: ForwardingDefectSink;
  readonly diagnostics: Diagnostic[];
} {
  const diagnostics: Diagnostic[] = [];
  const sink: ForwardingDefectSink = {
    emitDefect: (diagnostic): void => {
      diagnostics.push(diagnostic);
    },
  };
  return { sink, diagnostics };
}

/** A recording `InvokeForwardingDefectSink` (invoke parent). */
function makeInvokeDefectSink(): {
  readonly sink: InvokeForwardingDefectSink;
  readonly diagnostics: Diagnostic[];
  readonly invokeErrors: InvokeInfraError[];
} {
  const diagnostics: Diagnostic[] = [];
  const invokeErrors: InvokeInfraError[] = [];
  const sink: InvokeForwardingDefectSink = {
    emitDefect: (diagnostic): void => {
      diagnostics.push(diagnostic);
    },
    emitInvokeInfra: (error): void => {
      invokeErrors.push(error);
    },
  };
  return { sink, diagnostics, invokeErrors };
}

/** A single tool-call statement that would produce `Ok(v)` if reached. */
function okStatement(value: unknown): CancellableStatement {
  return {
    binding: "x",
    kind: "tool-call",
    site: CHECKPOINT_SITE,
    run: (): Promise<OperationResult> => Promise.resolve({ ok: true, value }),
  };
}

// ===========================================================================
// Facet (1) — the defect routes through the runtime-defect surface.
// ===========================================================================

describe("V17b-T — forwarding-listener throw routes through the runtime-defect surface", () => {
  it("slash-command: a throw from thetaAbort.abort() emits a theta/runtime/internal-error diagnostic", () => {
    const thetaAbort = new ThrowingThetaAbort();
    const ctx = new AbortController();
    const { sink, diagnostics } = makeDefectSink();

    // Drive the injection through the real entry point (registers the real
    // listener), not a bespoke listener double.
    trapForwardSlashCommandCancel(thetaAbort, ctx.signal, sink, SITE);
    ctx.abort(new Error("esc pressed"));

    // Facet (1): the trapped defect is on the `theta/runtime/internal-error`
    // channel; its `message` is the registry template `internal error: <error.message>`.
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe(INTERNAL_ERROR_CODE);
    expect(diagnostics[0]?.message).toBe(`internal error: ${thetaAbort.boom.message}`);
  });

  it("tool-exposed: a throw from thetaAbort.abort() emits a theta/runtime/internal-error diagnostic", () => {
    const thetaAbort = new ThrowingThetaAbort();
    const toolSignal = new AbortController();
    const { sink, diagnostics } = makeDefectSink();

    trapForwardToolExposedCancel(thetaAbort, toolSignal.signal, sink, SITE);
    toolSignal.abort(new Error("tool cancelled"));

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe(INTERNAL_ERROR_CODE);
  });

  it("invoke-parent: a throw from the derived controller emits internal-error AND surfaces InvokeInfraError { cause: 'internal_error' }", () => {
    const child = new ThrowingThetaAbort();
    const parent = new AbortController();
    const { sink, diagnostics, invokeErrors } = makeInvokeDefectSink();

    trapDeriveChildThetaAbort(parent.signal, child, sink, SITE, "sub/child.theta");
    parent.abort(new Error("parent cancelled"));

    // Facet (1), invoke-parent arm: both the runtime-defect diagnostic AND the
    // `cause: "internal_error"` arm of `InvokeInfraError`.
    expect(diagnostics[0]?.code).toBe(INTERNAL_ERROR_CODE);
    expect(invokeErrors).toHaveLength(1);
    expect(invokeErrors[0]?.kind).toBe("invoke_infra");
    expect(invokeErrors[0]?.cause).toBe("internal_error");
    expect(invokeErrors[0]?.callee_path).toBe("sub/child.theta");
  });
});

// ===========================================================================
// Facet (2) — the trap does not swallow the cancellation.
// ===========================================================================

describe("V17b-T — the throw-trap does not swallow the cancellation", () => {
  it("slash-command: source.signal.aborted stays true and the next Checkpoint surfaces Err({ kind: 'cancelled' })", async () => {
    const thetaAbort = new ThrowingThetaAbort();
    const ctx = new AbortController();
    const { sink } = makeDefectSink();

    trapForwardSlashCommandCancel(thetaAbort, ctx.signal, sink, SITE);
    ctx.abort(new Error("esc pressed"));

    // Facet (2a): the source signal's aborted state is unchanged by the trap.
    expect(ctx.signal.aborted).toBe(true);

    // Facet (2b): the trap let the abort take effect on `thetaAbort` before the
    // throw, so the downstream `Checkpoint`-seam await still surfaces cancelled.
    const outcome = await runCancellableSequence(
      { checkpoint: new NoopCheckpoint(), signal: thetaAbort.signal },
      [okStatement({ v: 1 })],
    );
    expect(outcome.result).toEqual({ ok: false, error: { kind: "cancelled", message: "cancelled" } });
  });

  it("tool-exposed: the next Checkpoint still surfaces Err({ kind: 'cancelled' })", async () => {
    const thetaAbort = new ThrowingThetaAbort();
    const toolSignal = new AbortController();
    const { sink } = makeDefectSink();

    trapForwardToolExposedCancel(thetaAbort, toolSignal.signal, sink, SITE);
    toolSignal.abort(new Error("tool cancelled"));

    expect(toolSignal.signal.aborted).toBe(true);
    const outcome = await runCancellableSequence(
      { checkpoint: new NoopCheckpoint(), signal: thetaAbort.signal },
      [okStatement({ v: 2 })],
    );
    expect(outcome.result).toEqual({ ok: false, error: { kind: "cancelled", message: "cancelled" } });
  });

  it("invoke-parent: the derived child stays aborted and the next Checkpoint surfaces Err({ kind: 'cancelled' })", async () => {
    const child = new ThrowingThetaAbort();
    const parent = new AbortController();
    const { sink } = makeInvokeDefectSink();

    trapDeriveChildThetaAbort(parent.signal, child, sink, SITE, "sub/child.theta");
    parent.abort(new Error("parent cancelled"));

    expect(parent.signal.aborted).toBe(true);
    const outcome = await runCancellableSequence(
      { checkpoint: new NoopCheckpoint(), signal: child.signal },
      [okStatement({ v: 3 })],
    );
    expect(outcome.result).toEqual({ ok: false, error: { kind: "cancelled", message: "cancelled" } });
  });
});

// ===========================================================================
// Edge case — the first-source-wins one-shot guard: a throw on a re-entrant
// second trigger must not re-stamp the reason.
// ===========================================================================

describe("V17b-T — first-source-wins one-shot guard under a re-entrant throwing trigger", () => {
  it("a throwing second forwarding trigger does not re-stamp thetaAbort's reason", () => {
    // A single `thetaAbort` shared by two forwarding listeners; `abort` always
    // throws after letting the underlying (idempotent) abort take effect.
    const thetaAbort = new ThrowingThetaAbort();
    const first = new AbortController();
    const second = new AbortController();
    const firstReason = new Error("first source");
    const secondReason = new Error("second source");
    const { sink, diagnostics } = makeDefectSink();

    trapForwardSlashCommandCancel(thetaAbort, first.signal, sink, SITE);
    trapForwardToolExposedCancel(thetaAbort, second.signal, sink, SITE);

    first.abort(firstReason);
    second.abort(secondReason);

    // The first source's reason wins under the one-shot guard: the re-entrant
    // second trigger's throw is trapped and does not re-stamp the reason.
    expect(thetaAbort.signal.aborted).toBe(true);
    expect(thetaAbort.signal.reason).toBe(firstReason);
    // Both trapped throws routed through the runtime-defect surface.
    expect(diagnostics.every((d) => d.code === INTERNAL_ERROR_CODE)).toBe(true);
    expect(diagnostics.length).toBeGreaterThanOrEqual(1);
  });
});
