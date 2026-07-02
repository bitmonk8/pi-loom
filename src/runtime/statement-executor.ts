// V19c / V19c-T — the loom tree-walking statement executor.
//
// This module owns the runtime seam the paired `V19c` implementation leaf fills
// in: `executeBody(body, deps)` walks `V19a`'s parsed `LoomBody` statement AST
// top-to-bottom against `V19b`'s lexical environment — `let`/reassign,
// `if`/`while`/`for` (driving the real `ForLoopHost` / `evaluateForLoop` from
// `V3c`), `break`/`continue`, `return`, and expression-statements — segmenting
// each checkpointed effect sub-expression onto `V17a`'s `runCancellableSequence`
// (`CancellableStatement` / `CancellableSequenceDeps`) so the five fixed
// checkpoint sites gate real work, and producing the `functions.md` FN-5
// top-level-block final value together with the `error-model.md` terminal
// outcome.
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
// Spec: implementation-notes.md (§Runtime), cancellation.md (§Granularity,
// §"Statement boundaries are not checkpoints", CNCL-5/CNCL-6), control-flow.md
// (CTRL-1), functions.md (FN-4/FN-5), return.md (RET-1/RET-2/RET-3),
// errors-and-results/error-model.md (§Terminal outcomes, ERR-8 … ERR-12).

import type { Block, Expr, ForStmt, IfStmt, LoomBody, Stmt } from "../parser/loom-document";
import type { Checkpoint, CheckpointKind, CheckpointSite } from "../seams/checkpoint";
import type { CancellableStatement, OperationResult } from "./cancellation-core";
import { runCancellableSequence } from "./cancellation-core";
import { evaluateForLoop, type ForLoopHost } from "./control-flow";
import { functionResult, type FunctionResult, type TerminalOutcome } from "./function-result";
import type { LexicalEnvironment } from "./lexical-environment";
import {
  handlePartialTerminalOutcome,
  type CommittedConversationMutator,
  type DrivenConversationMode,
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

// ---------------------------------------------------------------------------
// Internal control-flow signal
// ---------------------------------------------------------------------------

/**
 * The control-flow signal one statement or block produces as the walk unwinds.
 *
 *   - `normal`   — fall through to the next statement; `value` is the last
 *     evaluated value (a block's tail value, or `null`).
 *   - `return`   — an explicit `return expr` short-circuits the body to `value`.
 *   - `break` / `continue` — steer the nearest enclosing loop.
 *   - `fail`     — a non-cancel effect `Err` (a `?`-propagation, a panic) — the
 *     `error-model.md` fail terminal outcome; no final value flows (FN-5).
 *   - `cancel`   — a mid-body cancellation surfaced at a checkpoint — the cancel
 *     terminal outcome; no final value flows (FN-5).
 */
type Flow =
  | { readonly kind: "normal"; readonly value: LoomValue }
  | { readonly kind: "return"; readonly value: LoomValue }
  | { readonly kind: "break" }
  | { readonly kind: "continue" }
  | { readonly kind: "fail" }
  | { readonly kind: "cancel" };

/** The outcome of evaluating a single sub-expression (pure or checkpointed). */
type EvalResult =
  | { readonly flow: "value"; readonly value: LoomValue }
  | { readonly flow: "fail" }
  | { readonly flow: "cancel" };

/** Lift a terminal `EvalResult` (`fail` / `cancel`) onto the matching `Flow`. */
function terminalFlow(result: Exclude<EvalResult, { flow: "value" }>): Flow {
  return result.flow === "fail" ? { kind: "fail" } : { kind: "cancel" };
}

/** A loom condition is a boolean; only the literal `true` steers control flow. */
function isTruthy(value: LoomValue): boolean {
  return value === true;
}

/** Apply a compound-assignment operator to two numeric operands. */
function applyCompound(
  op: "+=" | "-=" | "*=" | "/=" | "%=",
  current: LoomValue,
  delta: LoomValue,
): LoomValue {
  const a = typeof current === "number" ? current : 0;
  const b = typeof delta === "number" ? delta : 0;
  switch (op) {
    case "+=":
      return a + b;
    case "-=":
      return a - b;
    case "*=":
      return a * b;
    case "/=":
      return a / b;
    case "%=":
      return a % b;
  }
}

// ---------------------------------------------------------------------------
// Expression evaluation — pure vs. checkpointed effect
// ---------------------------------------------------------------------------

/**
 * Evaluate one sub-expression. A pure expression (`host.checkpointFor` returns
 * `null`) is evaluated synchronously through `host.evaluatePure` and is NOT a
 * cancellation checkpoint (cancellation.md §Granularity — synchronous in-process
 * work is not a checkpoint; a straight-line statement boundary is not a
 * checkpoint). A checkpointed effect is segmented onto `V17a`'s
 * `runCancellableSequence` as a single-statement sequence so the five fixed
 * checkpoint sites gate the effect: the runner awaits `checkpoint.before(...)`
 * and reads `signal` before dispatching the effect, so a signal flipped
 * mid-body preempts at the next checkpointed sub-expression and every completed
 * effect is retained verbatim (CNCL-5). A completed `Err` whose kind is
 * `cancelled` surfaces the cancel outcome and routes through `V4c`'s
 * `handlePartialTerminalOutcome` (ERR-8 … ERR-12); any other `Err` surfaces the
 * fail outcome.
 */
async function evalExpr(expr: Expr, env: LexicalEnvironment, deps: ExecuteBodyDeps): Promise<EvalResult> {
  const checkpoint = deps.host.checkpointFor(expr);
  if (checkpoint === null) {
    // Pure, synchronous, non-checkpointed work — runs to completion regardless
    // of the abort signal (a straight-line statement boundary is not a
    // checkpoint).
    return { flow: "value", value: deps.host.evaluatePure(expr, env) };
  }

  // A checkpointed effect: segment it onto the real `runCancellableSequence` so
  // the effect gates on `Checkpoint.before(kind, site)` and the pre-dispatch
  // signal read. Each checkpointed effect is its own single-statement sequence
  // so a preceding effect's completed `Err` short-circuits the walk before the
  // next effect is entered (see notes.md — per-effect sequencing decision).
  const statement: CancellableStatement = {
    binding: "_effect",
    kind: checkpoint.kind,
    site: checkpoint.site,
    run: () => deps.host.runEffect(expr, env),
  };
  const outcome = await runCancellableSequence(
    { checkpoint: deps.checkpoint, signal: deps.signal },
    [statement],
  );
  const result = outcome.result;
  if (result.ok) {
    return { flow: "value", value: result.value as LoomValue };
  }
  if (result.error.kind === "cancelled") {
    // A mid-stream cancellation: turns Pi has committed remain final — the
    // runtime mutates no committed surface and injects no compensating turn
    // (ERR-8 / ERR-9 / ERR-10 / ERR-12). `handlePartialTerminalOutcome` calls
    // nothing on the mutator; routing through it makes the contract explicit.
    handlePartialTerminalOutcome({ path: "cancelled", mode: deps.mode, committed: [] }, deps.mutator);
    return { flow: "cancel" };
  }
  return { flow: "fail" };
}

// ---------------------------------------------------------------------------
// Statement / block execution
// ---------------------------------------------------------------------------

/**
 * Execute one statement against `env`. Declaration statements (`fn` / `schema` /
 * `enum` / `import` / `export` / doc-comments) are hoisted / registered by
 * `V19b`'s environment at build time, so they are inert at execution time.
 */
async function executeStatement(stmt: Stmt, env: LexicalEnvironment, deps: ExecuteBodyDeps): Promise<Flow> {
  switch (stmt.kind) {
    case "expr": {
      const r = await evalExpr(stmt.expr, env, deps);
      return r.flow === "value" ? { kind: "normal", value: r.value } : terminalFlow(r);
    }
    case "tool-call": {
      const r = await evalExpr(stmt.call, env, deps);
      return r.flow === "value" ? { kind: "normal", value: r.value } : terminalFlow(r);
    }
    case "query": {
      const r = await evalExpr(stmt.query, env, deps);
      return r.flow === "value" ? { kind: "normal", value: r.value } : terminalFlow(r);
    }
    case "invoke": {
      const r = await evalExpr(stmt.invoke, env, deps);
      return r.flow === "value" ? { kind: "normal", value: r.value } : terminalFlow(r);
    }
    case "let": {
      let value: LoomValue = null;
      if (stmt.init !== null) {
        const r = await evalExpr(stmt.init, env, deps);
        if (r.flow !== "value") {
          return terminalFlow(r);
        }
        value = r.value;
      }
      env.defineLocal(stmt.name, value, stmt.mutable);
      return { kind: "normal", value: null };
    }
    case "reassign": {
      const r = await evalExpr(stmt.value, env, deps);
      if (r.flow !== "value") {
        return terminalFlow(r);
      }
      const next =
        stmt.op === "=" ? r.value : applyCompound(stmt.op, env.resolve(stmt.target).value ?? null, r.value);
      env.writeBinding(stmt.target, next);
      return { kind: "normal", value: null };
    }
    case "if":
      return executeIf(stmt, env, deps);
    case "while":
      return executeWhile(stmt, env, deps);
    case "for":
      return executeFor(stmt, env, deps);
    case "break":
      return { kind: "break" };
    case "continue":
      return { kind: "continue" };
    case "return": {
      if (stmt.operand === null) {
        return { kind: "return", value: null };
      }
      const r = await evalExpr(stmt.operand, env, deps);
      if (r.flow !== "value") {
        return terminalFlow(r);
      }
      return { kind: "return", value: r.value };
    }
    case "fn":
    case "schema":
    case "enum":
    case "import":
    case "export":
    case "doc-comment":
      // Declarations are hoisted / registered by `V19b`'s environment; inert here.
      return { kind: "normal", value: null };
  }
}

/**
 * Execute a `{ … }` block: walk its statements top-to-bottom, strictly
 * sequentially (each statement's effect commits before the next is entered —
 * `cka-50`), short-circuiting on the first non-`normal` control-flow signal;
 * then, if none fired, produce the block's final value (its tail expression, or
 * the literal `null` for a statement-terminated / empty block — FN-5).
 */
async function executeBlock(block: Block, env: LexicalEnvironment, deps: ExecuteBodyDeps): Promise<Flow> {
  for (const stmt of block.statements) {
    const flow = await executeStatement(stmt, env, deps);
    if (flow.kind !== "normal") {
      return flow;
    }
  }
  if (block.tail !== null) {
    const r = await evalExpr(block.tail, env, deps);
    return r.flow === "value" ? { kind: "normal", value: r.value } : terminalFlow(r);
  }
  return { kind: "normal", value: null };
}

/** Execute a statement-form `if` / `else if` / `else` (control-flow.md). */
async function executeIf(stmt: IfStmt, env: LexicalEnvironment, deps: ExecuteBodyDeps): Promise<Flow> {
  const condition = await evalExpr(stmt.condition, env, deps);
  if (condition.flow !== "value") {
    return terminalFlow(condition);
  }
  if (isTruthy(condition.value)) {
    return executeBlock(stmt.then, env.child(), deps);
  }
  if (stmt.otherwise === null) {
    return { kind: "normal", value: null };
  }
  // The `else` arm is a chained `IfStmt` (an `else if`) or an `else` `Block`.
  if ("statements" in stmt.otherwise) {
    return executeBlock(stmt.otherwise, env.child(), deps);
  }
  return executeIf(stmt.otherwise, env, deps);
}

/**
 * Execute a statement-form `while` loop. `break` / `continue` steer the loop;
 * `return` / `fail` / `cancel` unwind out of it.
 */
async function executeWhile(
  stmt: { readonly condition: Expr; readonly body: Block },
  env: LexicalEnvironment,
  deps: ExecuteBodyDeps,
): Promise<Flow> {
  for (;;) {
    const condition = await evalExpr(stmt.condition, env, deps);
    if (condition.flow !== "value") {
      return terminalFlow(condition);
    }
    if (!isTruthy(condition.value)) {
      return { kind: "normal", value: null };
    }
    const flow = await executeBlock(stmt.body, env.child(), deps);
    if (flow.kind === "break") {
      return { kind: "normal", value: null };
    }
    if (flow.kind === "continue" || flow.kind === "normal") {
      continue;
    }
    return flow;
  }
}

/**
 * Execute a statement-form `for x in <iterand>` loop (CTRL-1). The iterand is
 * evaluated exactly once at loop entry; the resulting `array<T>` snapshot is
 * then iterated through `V3c`'s real `evaluateForLoop` — the snapshot is fixed
 * before iteration, so a body-side `let mut` reassignment cannot change the
 * iterated sequence. Each iteration runs in a per-iteration fresh scope binding
 * the loop variable (bindings.md); `break` / `continue` steer the loop and
 * `return` / `fail` / `cancel` unwind out of it.
 */
async function executeFor(stmt: ForStmt, env: LexicalEnvironment, deps: ExecuteBodyDeps): Promise<Flow> {
  const iterand = await evalExpr(stmt.iterand, env, deps);
  if (iterand.flow !== "value") {
    return terminalFlow(iterand);
  }
  const snapshot: readonly LoomValue[] = Array.isArray(iterand.value) ? iterand.value : [];

  // Drive `V3c`'s real `evaluateForLoop` to fix the iteration order over the
  // snapshot (iterand evaluated exactly once — CTRL-1). The body's effects are
  // async, so the synchronous loop host captures each element in order; the
  // async body walk below honours `break` / `continue`.
  const plan: { readonly element: LoomValue }[] = [];
  const host: ForLoopHost = {
    evaluateIterand: () => snapshot,
    runIteration: (element) => {
      plan.push({ element });
    },
  };
  evaluateForLoop(host);

  for (const { element } of plan) {
    const iterationScope = env.bindIterationVariable(stmt.variable, element);
    const flow = await executeBlock(stmt.body, iterationScope, deps);
    if (flow.kind === "break") {
      break;
    }
    if (flow.kind === "continue" || flow.kind === "normal") {
      continue;
    }
    return flow;
  }
  return { kind: "normal", value: null };
}

/**
 * Drive a `LoomBody` top-to-bottom, strictly sequentially, against `deps`:
 * each statement's effect commits before the next statement is entered (no
 * statement runs ahead of a prior one — `cka-50`); each checkpointed
 * sub-expression is segmented onto `V17a`'s `runCancellableSequence` so the
 * five fixed checkpoint sites gate real work (`cka-47`) and a signal flipped
 * mid-body preempts at the next checkpointed sub-expression while a
 * straight-line statement boundary is not a checkpoint; `for` loops drive
 * `V3c`'s real `evaluateForLoop` (CTRL-1); the body's tail expression / explicit
 * `return` / empty body yield the FN-5 final value; and a mid-stream terminal
 * event routes through `V4c`'s `handlePartialTerminalOutcome` so no Pi-committed
 * surface is mutated and no compensating turn is injected (ERR-8 … ERR-12).
 */
export async function executeBody(body: LoomBody, deps: ExecuteBodyDeps): Promise<BodyExecution> {
  const flow = await executeBlock(body, deps.env, deps);
  switch (flow.kind) {
    case "return":
      return { outcome: "success", result: functionResult("success", flow.value) };
    case "normal":
      return { outcome: "success", result: functionResult("success", flow.value) };
    case "fail":
      return { outcome: "fail", result: functionResult("fail", null) };
    case "cancel":
      return { outcome: "cancel", result: functionResult("cancel", null) };
    case "break":
    case "continue":
      // A `break` / `continue` with no enclosing loop completes the body
      // normally with the literal `null` final value (FN-5).
      return { outcome: "success", result: functionResult("success", null) };
  }
}
