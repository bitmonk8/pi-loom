// V9e / V9e-T — the `ActiveInvocationRegistry` seam.
//
// This module owns the extension-instance-scoped registry of in-flight loom
// invocations (active-invocation-registry.md §"Active invocation registry"):
//
//   - the five-field entry `{ loomAbort, disposeBarrier, shutdownReason, loom,
//     invocationId }` (the `disposeBarrier` resolver is closure-scoped, not a
//     sixth field);
//   - the `Set`-backed registry whose iteration is **insertion order** (the V8
//     `Set` invariant the teardown handler relies on), with an entry-count
//     probe seam so tests assert on observable side effects rather than the
//     internal symbol (the registry name is internal);
//   - the **Dispatch-site setup wrap** (`try`/`catch`) shared by the three
//     insertion sites — slash-command handler entry, `tool.execute(...)`
//     adapter entry, and `invoke` spawn-site entry — which mints `invocationId`
//     through the injected `IdSource` seam (PIC-20) before any awaitable work,
//     adds the entry to the `Set`, attaches the inbound-signal forwarding
//     listener, and (subagent mode) awaits `createAgentSession(...)`; on a
//     throw or rejection it routes the captured error through the runtime-defect
//     surface (`loom/runtime/internal-error` / `InvokeInfraError { cause:
//     "internal_error" }`), leaks no entry when the throw precedes `Set.add`,
//     and drops a cleanup `loomAbort.abort()` throw without masking the original;
//   - the per-invocation `finally` that settles a single entry's
//     `disposeBarrier` after `AgentSession.dispose()` returns (subagent mode) /
//     immediately (prompt mode) and removes the entry.
//
// V9e-T (tests-task) declares the seam shapes and stubs the behaviour-bearing
// functions inertly so the failing tests compile and red on their own primary
// assertions. The paired V9e implementation leaf fills these in.
//
// Spec: pi-integration-contract/active-invocation-registry.md,
// errors-and-results/error-model.md §"Runtime panics" (runtime-defect surface),
// errors-and-results/queryerror-variants.md (`InvokeInfraError`),
// host-interfaces-services.md PIC-20 (`IdSource`).

import type { Diagnostic, SourceRange } from "../diagnostics/diagnostic";
import type { IdSource } from "../seams/id-source";
import type { InvokeInfraError } from "./query-error";

/** Whether the invocation runs as a prompt-mode body or a subagent session. */
export type InvocationMode = "prompt" | "subagent";

/**
 * The pinned five-field registry entry (active-invocation-registry.md). The
 * `disposeBarrier` resolver is held in the dispatch-site closure, not as a
 * sixth field, so observers see exactly these five members. `shutdownReason` is
 * the sole mutable member (populated by `session_shutdown` sub-step 2).
 */
export interface ActiveInvocationEntry {
  readonly loomAbort: AbortController;
  readonly disposeBarrier: Promise<void>;
  shutdownReason: string | undefined;
  readonly loom: string;
  readonly invocationId: string;
}

/**
 * The minimal inbound Pi-side `AbortSignal` surface a setup wrap attaches its
 * forwarding listener to (`ctx.signal`, the tool adapter's `signal`, or the
 * `invoke`-parent's parent-signal — cancellation.md §"Forwarding into
 * `loomAbort`").
 */
export interface AbortSourceLike {
  addEventListener(type: "abort", listener: () => void): void;
}

/** The minimal subagent `AgentSession` surface the setup/teardown touch. */
export interface AgentSessionLike {
  dispose(): Promise<void>;
  abort(): void;
}

/**
 * The extension-instance-scoped registry of in-flight invocations. Backed by a
 * `Set` whose iteration is insertion order; `size()` is the entry-count probe
 * seam tests assert on (the registry name itself is internal).
 */
export class ActiveInvocationRegistry {
  /** Insert an entry at a dispatch site. */
  add(entry: ActiveInvocationEntry): void {
    // V9e-T stub: inert (does not store) so the insertion-order tests red on
    // their own primary assertions while the V9e implementation is absent.
    void entry;
  }

  /** Remove an entry from the per-invocation `finally`, after the barrier settles. */
  remove(entry: ActiveInvocationEntry): void {
    void entry;
  }

  /** Entry-count probe (observable side effect; the registry name is internal). */
  size(): number {
    return 0;
  }

  /** Insertion-order snapshot of the live entries. */
  snapshot(): readonly ActiveInvocationEntry[] {
    return [];
  }
}

/** Inputs to the dispatch-site setup wrap, common to the three insertion sites. */
export interface DispatchSetupRequest {
  readonly registry: ActiveInvocationRegistry;
  readonly idSource: IdSource;
  /** Canonical-key slash name (final derived form, no leading `/`). */
  readonly loom: string;
  readonly mode: InvocationMode;
  /** Inbound Pi-side abort signal the forwarding listener attaches to. */
  readonly source: AbortSourceLike;
  /** Located dispatch site for the runtime-defect diagnostic. */
  readonly site: { readonly file: string; readonly range: SourceRange };
  /** Subagent mode only: the awaited session factory. */
  readonly createAgentSession?: () => Promise<AgentSessionLike>;
  /** Test seam: the entry's `AbortController` factory (default `new AbortController()`). */
  readonly makeAbortController?: () => AbortController;
}

/** Successful setup: the registered entry plus its closure-held barrier resolver. */
export interface DispatchSetupOk {
  readonly kind: "ok";
  readonly entry: ActiveInvocationEntry;
  /** The closure-held `disposeBarrier` resolver the per-invocation `finally` invokes. */
  readonly settleDisposeBarrier: () => void;
  /** The subagent session (subagent mode) or `undefined` (prompt mode). */
  readonly session: AgentSessionLike | undefined;
}

/** Failed setup: routed through the runtime-defect surface. */
export interface DispatchSetupDefect {
  readonly kind: "defect";
  readonly diagnostic: Diagnostic;
  readonly error: InvokeInfraError;
}

export type DispatchSetupOutcome = DispatchSetupOk | DispatchSetupDefect;

/**
 * The Dispatch-site setup wrap (active-invocation-registry.md §"Registry
 * contract → Dispatch-site setup wrap"). Runs the pre-evaluation setup sequence
 * inside a `try`/`catch`; on a throw or rejection it routes the captured error
 * through the runtime-defect surface, leaks no entry when the throw precedes
 * `Set.add`, and drops a cleanup `loomAbort.abort()` throw without masking the
 * original setup throw.
 */
export async function dispatchSiteSetup(
  request: DispatchSetupRequest,
): Promise<DispatchSetupOutcome> {
  // V9e-T stub: returns a sentinel defect with a deliberately WRONG code/cause
  // so both the ok-path tests (which red on `kind === "ok"`) and the
  // failure-path tests (which red on the `loom/runtime/internal-error` code and
  // `cause: "internal_error"`) red on their own primary assertions while the
  // V9e implementation is absent.
  void request;
  await Promise.resolve();
  return {
    kind: "defect",
    diagnostic: {
      severity: "error",
      code: "loom/runtime/__v9e-unimplemented__",
      message: "internal error: ActiveInvocationRegistry dispatch-site setup not implemented",
    },
    error: {
      kind: "invoke_infra",
      message: "ActiveInvocationRegistry dispatch-site setup not implemented",
      callee_path: "",
      cause: "load_failure",
    },
  };
}

/** Inputs to the per-invocation `finally` that settles one entry's barrier. */
export interface PerInvocationFinallyRequest {
  readonly registry: ActiveInvocationRegistry;
  readonly entry: ActiveInvocationEntry;
  readonly settleDisposeBarrier: () => void;
  readonly mode: InvocationMode;
  readonly session: AgentSessionLike | undefined;
}

/**
 * The per-invocation `finally` (active-invocation-registry.md intro paragraph):
 * subagent mode awaits `session.dispose()` then settles `disposeBarrier`;
 * prompt mode settles immediately. It then removes the entry. It settles only
 * *this* entry's barrier — never the aggregate settle-all.
 */
export async function runPerInvocationFinally(
  request: PerInvocationFinallyRequest,
): Promise<void> {
  // V9e-T stub: inert — does not dispose, does not settle the barrier, does not
  // remove the entry. The disposeBarrier tests red on the prior `kind === "ok"`
  // assertion before they await the barrier, so this stub never deadlocks them.
  void request;
  await Promise.resolve();
}
