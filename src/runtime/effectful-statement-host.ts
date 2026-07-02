// V19d / V19d-T — effectful statement wiring: the real query / tool-call /
// invoke hosts assembled into the `V19c` executor's `StatementEvalHost` seam.
//
// This module owns the assembly seam the paired `V19d` implementation leaf fills
// in: `createEffectfulStatementHost(deps)` builds the concrete
// `StatementEvalHost` (the `V19c` executor's effect boundary — query / tool-call
// / invoke evaluation) that dispatches each checkpointed body effect through the
// REAL effectful hosts against the driven conversation, and NOT through test
// doubles:
//
//   - an `@`-query executes through the real query-model driver — the
//     `query-tool-loop.md` two-phase loop (`runUntypedQueryLoop` /
//     `runTypedQueryLoop`) — servicing the tool-call loop and resolving to the
//     final response (QRY-13 … QRY-16 integration witnesses, owned on `V13*`);
//   - a `<name>(args)` code-tool call dispatches through the real code-side
//     tool-call path and lowering sink (`runCodeSideToolCall`) against the
//     driven conversation (`tool-calls.md`, `cka-13` / `cka-46` integration
//     witnesses, owned on `V14*`);
//   - an `invoke(...)` executes through the real invoke trampoline
//     (`runInvokeChild`) against a freshly spawned isolated session, honouring
//     argument binding and the depth bound, and honouring the invoke-dispatch
//     cancellation checkpoint (`cka-47`, `V15m` facet) on that real host
//     (INV-1 … INV-4 integration witnesses, owned on `V15*`).
//
// This leaf closes NO new coverage-matrix row; every behaviour above is an
// integration-realisation witness that the existing seams execute against the
// real driven conversation under the `V19c` executor.
//
// V19d-T (this tests task) declares the assembly seam and stubs the
// behaviour-bearing `runEffect` inertly: the returned host dispatches NO effect
// through the real query / tool-call / invoke hosts — it returns an inert
// `Ok(null)` — so every paired integration assertion reds on its own primary
// expectation (an un-serviced query loop, an un-dispatched tool call, an
// un-driven invoke child, an out-of-order effect log, or an un-interrupted
// invoke-checkpoint cancellation), not on a compile error, a missing fixture, or
// a harness throw. The paired `V19d` implementation leaf fills `runEffect` in.
//
// Spec: query.md, query/query-tool-loop.md, query/query-forms.md,
// query/query-failure-and-repair.md, tool-calls.md, invocation.md,
// pi-integration-contract/conversation-drive.md, slash-invocation.md.

import type { CallExpr, Expr, InvokeExpr, QueryExpr } from "../parser/loom-document";
import type { Checkpoint, CheckpointSite } from "../seams/checkpoint";
import type { OperationResult } from "./cancellation-core";
import type { CheckpointDescriptor, StatementEvalHost } from "./statement-executor";
import type { LexicalEnvironment } from "./lexical-environment";
import type { LoomValue } from "./value";
import type { QueryModelDriver, QueryToolLoopConfig } from "./query-tool-loop";
import type { CodeSideToolCall, ToolLoweringSink } from "./tool-call-execute";
import type { InvokeChild } from "./invoke-cancellation";

/**
 * How to drive one `@`-query through the real two-phase query loop: whether the
 * query is typed (the forced-respond terminator branch) and the real
 * `QueryModelDriver` + `QueryToolLoopConfig` the loop reads. `V19d` resolves
 * these from the query expression against the driven conversation.
 */
export interface QueryHostDispatch {
  readonly typed: boolean;
  readonly model: QueryModelDriver;
  readonly config: QueryToolLoopConfig;
}

/**
 * The collaborators the effectful `StatementEvalHost` dispatches through. The
 * real query / tool-call / invoke hosts are threaded the SAME `checkpoint` and
 * `signal` the `V19c` executor gates on, so the invoke-dispatch cancellation
 * checkpoint (`cka-47`, `V15m` facet) is honoured on the real invoke host.
 *
 *   - `evaluatePure` evaluates a pure (non-checkpointed) sub-expression.
 *   - `resolveQuery` / `resolveToolCall` / `resolveInvoke` bind one effect
 *     expression to the real host inputs (the query model driver + config, the
 *     code-side tool call, the invoke child) against the driven conversation.
 */
export interface EffectfulStatementHostDeps {
  readonly checkpoint: Checkpoint;
  readonly signal: AbortSignal;
  readonly sink: ToolLoweringSink;
  /** The loom source file the checkpoint site is stamped with. */
  readonly file: string;
  evaluatePure(expr: Expr, env: LexicalEnvironment): LoomValue;
  resolveQuery(expr: QueryExpr, env: LexicalEnvironment): QueryHostDispatch;
  resolveToolCall(expr: CallExpr, env: LexicalEnvironment): CodeSideToolCall;
  resolveInvoke(expr: InvokeExpr, env: LexicalEnvironment): InvokeChild;
}

/** Build a `CheckpointSite` from an expression's source span. */
function siteOf(expr: Expr, file: string): CheckpointSite {
  return { file, line: expr.range.start.line, column: expr.range.start.column };
}

/**
 * Assemble the concrete `StatementEvalHost` the `V19c` executor drives its body
 * effects through: `checkpointFor` classifies each `@`-query / `<name>(args)` /
 * `invoke(...)` as its checkpointed effect kind, and `runEffect` dispatches the
 * effect through the matching REAL host against the driven conversation,
 * normalising the host outcome to the executor's `OperationResult`.
 *
 * V19d-T stub: `runEffect` is inert — it dispatches NO effect through the real
 * query / tool-call / invoke hosts and returns an inert `Ok(null)`, so every
 * integration assertion reds. The paired `V19d` leaf fills it in.
 */
export function createEffectfulStatementHost(deps: EffectfulStatementHostDeps): StatementEvalHost {
  return {
    evaluatePure(expr: Expr, env: LexicalEnvironment): LoomValue {
      return deps.evaluatePure(expr, env);
    },
    checkpointFor(expr: Expr): CheckpointDescriptor | null {
      switch (expr.kind) {
        case "query":
          return { kind: "query", site: siteOf(expr, deps.file) };
        case "call":
          return { kind: "tool-call", site: siteOf(expr, deps.file) };
        case "invoke":
          return { kind: "invoke", site: siteOf(expr, deps.file) };
        default:
          return null;
      }
    },
    async runEffect(_expr: Expr, _env: LexicalEnvironment): Promise<OperationResult> {
      // V19d-T stub: the real-host assembly is absent. No effect is dispatched
      // through the real query-model driver, code-side tool-call path, or invoke
      // trampoline; an inert `Ok(null)` is returned so every integration
      // assertion reds on its own primary expectation. The paired `V19d`
      // implementation leaf dispatches through the real hosts here.
      return { ok: true, value: null };
    },
  };
}
