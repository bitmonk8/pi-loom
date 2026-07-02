// V19c / V19c-T — the loom tree-walking statement executor.
//
// This module owns the runtime seam the paired `V19c` implementation leaf fills
// in: `executeBody(body, deps)` walks `V19a`'s parsed `LoomBody` statement AST
// top-to-bottom against `V19b`'s lexical environment — `let`/reassign,
// `if`/`while`/`for` (driving the real `ForLoopHost` / `evaluateForLoop` from
// `V3c`), `break`/`continue`, `return`, `match`, and expression-statements —
// segmenting each linear run of checkpointed sub-expressions onto `V17a`'s
// `runCancellableSequence` (`CancellableStatement` / `CancellableSequenceDeps`)
// so the five fixed checkpoint sites gate real work, and producing the
// `functions.md` FN-5 top-level-block final value together with the
// `error-model.md` terminal outcome.
//
// The un-anchored driver / top-to-bottom-sequencing obligation this seam closes
// is the `coverage-matrix.md` code-keyed-area token `cka-50`
// (implementation-notes.md §Runtime — "drives it turn-by-turn"; "Within a
// single invocation the interpreter is strictly sequential … the next loom
// expression cannot run until the awaited Promise resolves"). The five
// checkpoint sites are owned by `cka-47` (`V17a` / `V17c`); the final-value rule
// by FN-5 (`V3d`); the mid-stream-cancellation non-mutation obligations by
// ERR-8 … ERR-12 (`V4c`) — this executor witnesses those at real hosts without
// re-closing them.
//
// This executor is the seam `V19d` supplies real effectful hosts to (the
// `StatementEvalHost` boundary — query / tool-call / invoke evaluation) and
// `V19e`'s composition producer drives.
//
// V19c-T (tests-task) declares the seam shapes — the `StatementEvalHost`
// effect boundary, the `CheckpointDescriptor`, the `ExecuteBodyDeps`, the
// `BodyExecution` result, and the `executeBody` entry point — and stubs
// `executeBody` inertly: it walks nothing, drives no host, segments nothing onto
// `runCancellableSequence`, drives no `evaluateForLoop`, and routes no terminal
// event through `handlePartialTerminalOutcome`; it returns the inert
// `{ outcome: "fail", result: { present: false } }` sentinel regardless of
// input. Every paired V19c-T test therefore reds on its own primary assertion —
// an un-driven statement effect, an un-evaluated loop iterand, an un-preempted
// mid-body checkpoint, an absent tail / `return` final value, or a wrong
// terminal outcome — not on a compile error, a missing fixture, or a harness
// throw. The paired V19c implementation leaf fills the executor in.
//
// Spec: implementation-notes.md (§Runtime), cancellation.md (§Granularity,
// §"Statement boundaries are not checkpoints", CNCL-5/CNCL-6), control-flow.md
// (CTRL-1), functions.md (FN-4/FN-5), return.md (RET-1/RET-2/RET-3),
// errors-and-results/error-model.md (§Terminal outcomes, ERR-8 … ERR-12).

import type { Expr, LoomBody } from "../parser/loom-document";
import type { Checkpoint, CheckpointKind, CheckpointSite } from "../seams/checkpoint";
import type { OperationResult } from "./cancellation-core";
import type { FunctionResult, TerminalOutcome } from "./function-result";
import type { LexicalEnvironment } from "./lexical-environment";
import type {
  CommittedConversationMutator,
  DrivenConversationMode,
} from "./terminal-outcomes";
import type { LoomValue } from "./value";

/**
 * The checkpoint a checkpointed effect sub-expression gates on (one of the five
 * fixed sites of cancellation.md §Granularity — `query`, `tool-call`, `invoke`;
 * a loop's per-iteration `loop-iter` boundary is driven by the loop path). Its
 * `kind` and `site` are handed to `V17a`'s `runCancellableSequence` /
 * `Checkpoint.before(kind, site)`.
 */
export interface CheckpointDescriptor {
  readonly kind: CheckpointKind;
  readonly site: CheckpointSite;
}

/**
 * The effect boundary the executor drives expression evaluation through — the
 * seam `V19d` supplies the real effectful hosts to (query / tool-call / invoke
 * evaluation), and a V19c-T test supplies a recording double.
 *
 *   - `evaluatePure` evaluates a pure (non-checkpointed) sub-expression
 *     synchronously to its value. Pure work is not a checkpoint and runs to
 *     completion (cancellation.md §Granularity — "Synchronous in-process work …
 *     is not a checkpoint").
 *   - `checkpointFor` reports whether `expr` is a checkpointed effect (an
 *     `@`-query, a code-tool call, or an `invoke`) and its checkpoint kind/site,
 *     or `null` for a pure expression. The executor segments each checkpointed
 *     effect in a linear run onto `runCancellableSequence`.
 *   - `runEffect` runs one checkpointed effect sub-expression — committing its
 *     effect — and returns its `OperationResult` (`V17a`). It is invoked from
 *     inside `runCancellableSequence`, after that statement's pre-dispatch
 *     `Checkpoint.before(...)` signal read.
 */
export interface StatementEvalHost {
  evaluatePure(expr: Expr, env: LexicalEnvironment): LoomValue;
  checkpointFor(expr: Expr): CheckpointDescriptor | null;
  runEffect(expr: Expr, env: LexicalEnvironment): Promise<OperationResult>;
}

/**
 * The collaborators the executor walks the body against. `env` is `V19b`'s
 * real lexical environment; `host` is the `V19d` effect boundary; `checkpoint`
 * and `signal` are `V17a`'s `Checkpoint` seam substrate and the `loomAbort`
 * signal (never `ctx.signal` directly) the linear-run `runCancellableSequence`
 * reads through; `mutator` and `mode` are the `V4c` partial-append /
 * non-mutation surface a mid-stream terminal event routes through
 * (`handlePartialTerminalOutcome`).
 */
export interface ExecuteBodyDeps {
  readonly env: LexicalEnvironment;
  readonly host: StatementEvalHost;
  readonly checkpoint: Checkpoint;
  readonly signal: AbortSignal;
  readonly mutator: CommittedConversationMutator;
  readonly mode: DrivenConversationMode;
}

/**
 * The outcome of driving a `LoomBody` to completion: the `error-model.md`
 * terminal outcome (`success` / `fail` / `cancel`) and the FN-5 top-level-block
 * final value (present only on the success path).
 */
export interface BodyExecution {
  readonly outcome: TerminalOutcome;
  readonly result: FunctionResult;
}

/**
 * Drive a `LoomBody` top-to-bottom, strictly sequentially, against `deps`:
 * each statement's effect commits before the next statement is entered (no
 * statement runs ahead of a prior one — `cka-50`); each linear run of
 * checkpointed sub-expressions is segmented onto `V17a`'s
 * `runCancellableSequence` so the five fixed checkpoint sites gate real work
 * (`cka-47`) and a signal flipped mid-body preempts at the next checkpointed
 * sub-expression while a straight-line statement boundary is not a checkpoint;
 * `for` loops drive `V3c`'s real `evaluateForLoop` (CTRL-1); the body's tail
 * expression / explicit `return` / empty body yield the FN-5 final value; and a
 * mid-stream terminal event routes through `V4c`'s `handlePartialTerminalOutcome`
 * so no Pi-committed surface is mutated and no compensating turn is injected
 * (ERR-8 … ERR-12).
 *
 * V19c-T stubs this inert — it drives nothing and returns
 * `{ outcome: "fail", result: { present: false } }` regardless of `body` /
 * `deps` — so every obligation test reds on its own primary assertion. The
 * paired V19c leaf implements the walk.
 */
export async function executeBody(
  body: LoomBody,
  deps: ExecuteBodyDeps,
): Promise<BodyExecution> {
  // V19c-T inert stub: no walk, no host drive, no checkpoint segmentation, no
  // `evaluateForLoop`, no terminal-event routing. The paired V19c leaf fills
  // this in. The parameters carry the contract a caller injects; the stub
  // reads neither.
  void body;
  void deps;
  return { outcome: "fail", result: { present: false } };
}
