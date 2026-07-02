import { describe, expect, it } from "vitest";
import {
  executeBody,
  type CheckpointDescriptor,
  type ExecuteBodyDeps,
  type StatementEvalHost,
} from "../src/runtime/statement-executor";
import {
  buildEnvironment,
  LexicalEnvironment,
} from "../src/runtime/lexical-environment";
import type { OperationResult } from "../src/runtime/cancellation-core";
import type {
  Checkpoint,
  CheckpointKind,
  CheckpointSite,
} from "../src/seams/checkpoint";
import type {
  CommittedConversationMutator,
  CommittedSurface,
  DrivenConversationMode,
} from "../src/runtime/terminal-outcomes";
import { valuesEqual, type LoomValue } from "../src/runtime/value";
import type { QueryError } from "../src/runtime/query-error";
import type {
  Block,
  CallExpr,
  Expr,
  ExprStmt,
  ForStmt,
  IfStmt,
  LoomBody,
  ReturnStmt,
  Stmt,
  ToolCallStmt,
} from "../src/parser/loom-document";
import type { SourceRange } from "../src/diagnostics/diagnostic";

// V19c-T — failing tests for the paired `V19c` tree-walking statement executor.
//
// Spec: implementation-notes.md §Runtime (the strictly-sequential
// statement-execution driver — `coverage-matrix.md` code-keyed-area token
// `cka-50`, the only NEW row the paired impl leaf closes), cancellation.md
// §Granularity / §"Statement boundaries are not checkpoints" / CNCL-5,
// control-flow.md CTRL-1, functions.md FN-4/FN-5, return.md RET-1/RET-2/RET-3,
// errors-and-results/error-model.md §Terminal outcomes ERR-8 … ERR-12.
//
// The control-flow (CTRL-1), final-value (FN-4/FN-5, RET-*), five-site
// checkpoint (`cka-47`), and terminal-outcome (ERR-8 … ERR-12) bullets are
// integration witnesses — asserted through the executor against the REAL
// collaborators (`V19b`'s `LexicalEnvironment`, `V3c`'s `evaluateForLoop`,
// `V17a`'s `runCancellableSequence` + `Checkpoint` seam, `V4c`'s
// `handlePartialTerminalOutcome`) — not new closures. Only the driver /
// top-to-bottom-sequencing bullet (`cka-50`) is a new closure.
//
// These tests red because the `V19c` executor is absent: `executeBody` drives
// nothing and returns the inert `{ outcome: "fail", result: { present: false } }`
// sentinel. Each test reds on its own primary assertion — an un-driven
// statement effect, an un-evaluated loop iterand, an un-preempted mid-body
// checkpoint, an absent tail/`return` final value, or a wrong terminal outcome
// — not on a compile error, a missing fixture, or a harness throw.

// --- AST construction helpers ----------------------------------------------

/** A throwaway 1:1–1:2 span for hand-built AST nodes. */
function span(): SourceRange {
  return { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } };
}

function numberExpr(text: string): Expr {
  return { kind: "number", text, numericType: "integer", range: span() };
}

function stringExpr(value: string): Expr {
  return { kind: "string", value, range: span() };
}

function boolExpr(value: boolean): Expr {
  return { kind: "bool", value, range: span() };
}

function identExpr(name: string): Expr {
  return { kind: "ident", name, range: span() };
}

function arrayExpr(elements: readonly Expr[]): Expr {
  return { kind: "array", elements, range: span() };
}

function eqExpr(left: Expr, right: Expr): Expr {
  return { kind: "binary", op: "==", left, right, range: span() };
}

function callExpr(callee: string, args: readonly Expr[] = []): CallExpr {
  return { kind: "call", callee, args, range: span() };
}

/** A code-tool call in statement position — a checkpointed effect statement. */
function toolCallStmt(callee: string, args: readonly Expr[] = []): ToolCallStmt {
  return { kind: "tool-call", call: callExpr(callee, args), range: span() };
}

/** A pure expression statement (its value discarded). */
function exprStmt(expr: Expr): ExprStmt {
  return { kind: "expr", expr, range: span() };
}

function returnStmt(operand: Expr | null): ReturnStmt {
  return { kind: "return", operand, range: span() };
}

function ifStmt(condition: Expr, then: Block, otherwise: Block | IfStmt | null = null): IfStmt {
  return { kind: "if", condition, then, otherwise, range: span() };
}

function forStmt(variable: string, iterand: Expr, body: Block): ForStmt {
  return { kind: "for", variable, iterand, body, range: span() };
}

function block(statements: readonly Stmt[], tail: Expr | null = null): Block {
  return { statements, tail };
}

function body(statements: readonly Stmt[], tail: Expr | null = null): LoomBody {
  return { statements, tail };
}

// --- Real environment ------------------------------------------------------

/** A real `V19b` root environment over an empty body. */
function realEnv(): LexicalEnvironment {
  return buildEnvironment({ body: { statements: [], tail: null } });
}

// --- Checkpoint substrate (PIC-10) -----------------------------------------

const SITE: CheckpointSite = { file: "loom.loom", line: 1, column: 1 };

/**
 * A `Checkpoint` whose `before(...)` invokes an injected callback on each await
 * — the deterministic-test substrate (PIC-10) that lands an abort at a chosen
 * checkpoint boundary without depending on JS microtask scheduling.
 */
class ScriptedCheckpoint implements Checkpoint {
  #calls = 0;
  readonly #onBefore: (call: number, kind: CheckpointKind) => void;

  constructor(onBefore: (call: number, kind: CheckpointKind) => void) {
    this.#onBefore = onBefore;
  }

  before(kind: CheckpointKind): Promise<void> {
    this.#calls += 1;
    this.#onBefore(this.#calls, kind);
    return Promise.resolve();
  }
}

/** A no-op `Checkpoint` (production wiring — an already-resolved promise). */
const NOOP_CHECKPOINT: Checkpoint = {
  before(): Promise<void> {
    return Promise.resolve();
  },
};

// --- Recording partial-append mutator (V4c) --------------------------------

/**
 * A `CommittedConversationMutator` that records every mutating call. The
 * ERR-8/ERR-9 non-mutation contract forbids the runtime from calling any of
 * these on the cancellation / `?`-propagation paths, so a compliant executor
 * leaves `calls` empty.
 */
class RecordingMutator implements CommittedConversationMutator {
  readonly calls: string[] = [];
  truncate(surfaceId: string): void {
    this.calls.push(`truncate:${surfaceId}`);
  }
  rewrite(surfaceId: string): void {
    this.calls.push(`rewrite:${surfaceId}`);
  }
  replace(surfaceId: string): void {
    this.calls.push(`replace:${surfaceId}`);
  }
  remove(surfaceId: string): void {
    this.calls.push(`remove:${surfaceId}`);
  }
  injectCompensatingTurn(surface: CommittedSurface): void {
    this.calls.push(`inject:${surface.id}`);
  }
}

// --- Recording effect host (the V19d boundary) -----------------------------

/** A checkpointed `Ok` result carrying the effect's value. */
function ok(value: LoomValue): OperationResult {
  return { ok: true, value };
}

/** A checkpointed `Err` result (a non-cancel failure). */
function err(): OperationResult {
  const error: QueryError = { kind: "panic", message: "boom" };
  return { ok: false, error };
}

/**
 * A recording `StatementEvalHost` double standing in for `V19d`'s real
 * effectful hosts. It evaluates the bounded AST-expression forms the witnesses
 * need (against the REAL `V19b` environment so per-iteration bindings resolve),
 * treats `call` / `query` / `invoke` expressions as checkpointed effects, and
 * records each committed effect's ordered label.
 */
class RecordingHost implements StatementEvalHost {
  /** Ordered record of committed effects and their start/end fences. */
  readonly log: string[] = [];
  /** Ordered record of pure-expression evaluations (by a caller-set label). */
  readonly pureLog: string[] = [];
  /** How many times each callee's effect committed. */
  readonly effects: string[] = [];
  /** Per-effect override of the returned `OperationResult` (by callee name). */
  readonly results = new Map<string, OperationResult>();

  evaluatePure(expr: Expr, env: LexicalEnvironment): LoomValue {
    return this.#eval(expr, env);
  }

  checkpointFor(expr: Expr): CheckpointDescriptor | null {
    if (expr.kind === "call" || expr.kind === "query" || expr.kind === "invoke") {
      return { kind: "tool-call", site: SITE };
    }
    return null;
  }

  async runEffect(expr: Expr, env: LexicalEnvironment): Promise<OperationResult> {
    const label = this.#effectLabel(expr, env);
    // A start/end fence around a real microtask yield so a caller can witness
    // strict sequencing: an interleaved driver would show `start:1` before
    // `end:0`, a strictly-sequential one never does.
    this.log.push(`start:${label}`);
    await Promise.resolve();
    this.log.push(`end:${label}`);
    this.effects.push(label);
    return this.results.get(label) ?? ok(null);
  }

  /** Compute an effect's label: `<callee>(<first-arg-value?>)`. */
  #effectLabel(expr: Expr, env: LexicalEnvironment): string {
    if (expr.kind === "call") {
      const arg = expr.args[0];
      if (arg === undefined) {
        return expr.callee;
      }
      return `${expr.callee}:${String(this.#eval(arg, env))}`;
    }
    return expr.kind;
  }

  /** A bounded AST-expression evaluator for the witnessed forms. */
  #eval(expr: Expr, env: LexicalEnvironment): LoomValue {
    switch (expr.kind) {
      case "number":
        return Number(expr.text);
      case "string":
        return expr.value;
      case "bool":
        return expr.value;
      case "null":
        return null;
      case "ident": {
        this.pureLog.push(`ident:${expr.name}`);
        return env.resolve(expr.name).value ?? null;
      }
      case "array":
        return expr.elements.map((e) => this.#eval(e, env));
      case "binary":
        if (expr.op === "==") {
          return valuesEqual(this.#eval(expr.left, env), this.#eval(expr.right, env));
        }
        return null;
      default:
        return null;
    }
  }
}

/** Assemble `ExecuteBodyDeps` from a host + checkpoint/signal + mutator/mode. */
function deps(opts: {
  host: StatementEvalHost;
  checkpoint?: Checkpoint;
  signal?: AbortSignal;
  mutator?: CommittedConversationMutator;
  mode?: DrivenConversationMode;
  env?: LexicalEnvironment;
}): ExecuteBodyDeps {
  return {
    env: opts.env ?? realEnv(),
    host: opts.host,
    checkpoint: opts.checkpoint ?? NOOP_CHECKPOINT,
    signal: opts.signal ?? new AbortController().signal,
    mutator: opts.mutator ?? new RecordingMutator(),
    mode: opts.mode ?? "prompt",
  };
}

// ===========================================================================
// Statement-execution driver — strictly-sequential top-to-bottom walk (cka-50).
// ===========================================================================

describe("V19c-T — statement-execution driver (cka-50, the new closure)", () => {
  it("cka-50: walks a multi-statement body top-to-bottom, each effect committing before the next is entered", async () => {
    const host = new RecordingHost();
    // Three effect statements `s0()`, `s1()`, `s2()`.
    const program = body([
      toolCallStmt("s0"),
      toolCallStmt("s1"),
      toolCallStmt("s2"),
    ]);

    await executeBody(program, deps({ host }));

    expect(
      host.effects,
      "cka-50: the body is walked top-to-bottom in source order",
    ).toEqual(["s0", "s1", "s2"]);
    expect(
      host.log,
      "cka-50: strictly sequential — each effect commits (start→end) before the next is entered, no statement runs ahead of a prior one",
    ).toEqual([
      "start:s0",
      "end:s0",
      "start:s1",
      "end:s1",
      "start:s2",
      "end:s2",
    ]);
  });

  it("cka-50: a straight-line run of pure statements evaluates every statement in order", async () => {
    const host = new RecordingHost();
    const program = body([
      exprStmt(identExpr("a")),
      exprStmt(identExpr("b")),
      exprStmt(identExpr("c")),
    ]);

    await executeBody(program, deps({ host }));

    expect(
      host.pureLog,
      "cka-50: each pure statement is evaluated once, top-to-bottom",
    ).toEqual(["ident:a", "ident:b", "ident:c"]);
  });
});

// ===========================================================================
// Control-flow statements against the real ForLoopHost / evaluateForLoop (CTRL-1).
// ===========================================================================

describe("V19c-T — control-flow through the executor at real hosts (CTRL-1 witness)", () => {
  it("CTRL-1: a `for` loop evaluates its iterand exactly once at loop entry and runs the body per element", async () => {
    const host = new RecordingHost();
    // `for x in ["a","b","c"] { record(x) }`
    const loop = forStmt(
      "x",
      arrayExpr([stringExpr("a"), stringExpr("b"), stringExpr("c")]),
      block([toolCallStmt("record", [identExpr("x")])]),
    );

    await executeBody(body([loop]), deps({ host }));

    expect(
      host.effects,
      "CTRL-1: the body runs once per snapshot element, in order, with the per-iteration `x` binding",
    ).toEqual(["record:a", "record:b", "record:c"]);
  });

  it("CTRL-1: `break` steers the real loop — iteration stops at the break", async () => {
    const host = new RecordingHost();
    // `for x in ["a","b","c"] { if x == "b" { break } record(x) }`
    const loop = forStmt(
      "x",
      arrayExpr([stringExpr("a"), stringExpr("b"), stringExpr("c")]),
      block([
        ifStmt(eqExpr(identExpr("x"), stringExpr("b")), block([{ kind: "break", range: span() }])),
        toolCallStmt("record", [identExpr("x")]),
      ]),
    );

    await executeBody(body([loop]), deps({ host }));

    expect(
      host.effects,
      "CTRL-1: `break` stops the loop, so only elements before the break are recorded",
    ).toEqual(["record:a"]);
  });

  it("CTRL-1: `continue` steers the real loop — the rest of the body is skipped for that iteration", async () => {
    const host = new RecordingHost();
    // `for x in ["a","b","c"] { if x == "b" { continue } record(x) }`
    const loop = forStmt(
      "x",
      arrayExpr([stringExpr("a"), stringExpr("b"), stringExpr("c")]),
      block([
        ifStmt(eqExpr(identExpr("x"), stringExpr("b")), block([{ kind: "continue", range: span() }])),
        toolCallStmt("record", [identExpr("x")]),
      ]),
    );

    await executeBody(body([loop]), deps({ host }));

    expect(
      host.effects,
      "CTRL-1: `continue` skips the rest of the body for the matching element only",
    ).toEqual(["record:a", "record:c"]);
  });
});

// ===========================================================================
// Tail-expression / empty-body final value (FN-4/FN-5, RET-1/RET-2/RET-3).
// ===========================================================================

describe("V19c-T — final value at the executor's FunctionResult seam (FN-5 witness)", () => {
  it("FN-5: a body ending in a tail expression yields that expression's value", async () => {
    const host = new RecordingHost();
    const program = body([], numberExpr("42"));

    const r = await executeBody(program, deps({ host }));

    expect(r.outcome, "FN-5: a body that completes on the success path").toBe("success");
    expect(r.result.present, "FN-5: a final value is present on the success path").toBe(true);
    expect(r.result.value, "FN-5: the final value is the tail expression's value").toBe(42);
  });

  it("FN-5: a statement-terminated (no-tail) body yields the literal `null`", async () => {
    const host = new RecordingHost();
    // A body whose last form is a statement, not a tail expression.
    const program = body([toolCallStmt("s0")], null);

    const r = await executeBody(program, deps({ host }));

    expect(r.outcome, "FN-5: the body completes on the success path").toBe("success");
    expect(r.result.present, "FN-5: a final value is present on the success path").toBe(true);
    expect(r.result.value, "FN-5: a statement-terminated body yields the literal null").toBeNull();
  });

  it("FN-5: an empty body yields the literal `null`", async () => {
    const host = new RecordingHost();
    const program = body([], null);

    const r = await executeBody(program, deps({ host }));

    expect(r.outcome, "FN-5: an empty body completes on the success path").toBe("success");
    expect(r.result.present, "FN-5: a final value is present for an empty body").toBe(true);
    expect(r.result.value, "FN-5: an empty body yields the literal null").toBeNull();
  });

  it("RET-1: an explicit `return expr` short-circuits to its operand", async () => {
    const host = new RecordingHost();
    // `return 7` followed by an effect statement that must NOT run.
    const program = body([returnStmt(numberExpr("7")), toolCallStmt("after")], numberExpr("99"));

    const r = await executeBody(program, deps({ host }));

    expect(r.outcome, "RET-1: a `return` completes on the success path").toBe("success");
    expect(r.result.value, "RET-1: the final value is the `return` operand, not the tail").toBe(7);
    expect(
      host.effects,
      "RET-1: `return` short-circuits — statements after it do not run",
    ).toEqual([]);
  });
});

// ===========================================================================
// Five-site checkpoint gating on the real runCancellableSequence (cka-47 witness).
// ===========================================================================

describe("V19c-T — five-site checkpoint gating on the real runCancellableSequence (cka-47 witness)", () => {
  it("cka-47: a signal flipped mid-body preempts at the next checkpointed sub-expression", async () => {
    const host = new RecordingHost();
    const controller = new AbortController();
    // Abort at the SECOND checkpoint `before(...)` — after `s0` committed but
    // before `s1` is dispatched.
    const checkpoint = new ScriptedCheckpoint((call) => {
      if (call === 2) {
        controller.abort();
      }
    });
    const program = body([toolCallStmt("s0"), toolCallStmt("s1")]);

    const r = await executeBody(
      program,
      deps({ host, checkpoint, signal: controller.signal }),
    );

    expect(
      host.effects,
      "cka-47: `s0` committed; `s1` is preempted at its pre-dispatch checkpoint and never runs",
    ).toEqual(["s0"]);
    expect(r.outcome, "cka-47: a mid-body abort surfaces as the cancel terminal outcome").toBe(
      "cancel",
    );
  });

  it("cka-47: a straight-line statement boundary is not a checkpoint — a pre-aborted pure run completes", async () => {
    const host = new RecordingHost();
    const controller = new AbortController();
    controller.abort();
    // A straight-line run of pure statements with the signal already aborted:
    // no checkpointed sub-expression, so the run completes regardless of abort.
    const program = body([
      exprStmt(identExpr("a")),
      exprStmt(identExpr("b")),
    ]);

    const r = await executeBody(program, deps({ host, signal: controller.signal }));

    expect(
      host.pureLog,
      "cka-47: statement boundaries are not checkpoints — a straight-line pure run completes despite the abort",
    ).toEqual(["ident:a", "ident:b"]);
    expect(r.outcome, "cka-47: a straight-line run that never reaches a checkpoint completes success").toBe(
      "success",
    );
  });
});

// ===========================================================================
// Terminal-outcome production and mid-stream non-mutation (ERR-8 … ERR-12 witness).
// ===========================================================================

describe("V19c-T — terminal-outcome production at real hosts (ERR-8 … ERR-12 witness)", () => {
  it("ERR terminal outcome: a body whose effects all succeed drives to the success outcome", async () => {
    const host = new RecordingHost();
    const program = body([toolCallStmt("s0")], numberExpr("1"));

    const r = await executeBody(program, deps({ host }));

    expect(host.effects, "success: the body's effect committed").toEqual(["s0"]);
    expect(r.outcome, "success: an all-`Ok` body drives to the success terminal outcome").toBe(
      "success",
    );
    expect(r.result.present, "success: a final value is present on the success path").toBe(true);
  });

  it("ERR terminal outcome: an `Err`-returning effect drives to the fail outcome with no final value", async () => {
    const host = new RecordingHost();
    host.results.set("s0", err());
    const program = body([toolCallStmt("s0")], numberExpr("1"));

    const r = await executeBody(program, deps({ host }));

    expect(host.effects, "fail: the failing effect was reached and committed").toEqual(["s0"]);
    expect(r.outcome, "fail: an `Err`-returning effect drives to the fail terminal outcome").toBe(
      "fail",
    );
    expect(r.result.present, "fail: no final value flows on the failure path (FN-5)").toBe(false);
  });

  it("ERR-8/ERR-9/ERR-10: a mid-stream cancellation mutates no committed surface and injects no compensating turn", async () => {
    const host = new RecordingHost();
    const mutator = new RecordingMutator();
    const controller = new AbortController();
    const checkpoint = new ScriptedCheckpoint((call) => {
      if (call === 2) {
        controller.abort();
      }
    });
    const program = body([toolCallStmt("s0"), toolCallStmt("s1")]);

    const r = await executeBody(
      program,
      deps({ host, checkpoint, signal: controller.signal, mutator }),
    );

    expect(host.effects, "ERR-10: the body was driven to the mid-stream cancellation").toEqual([
      "s0",
    ]);
    expect(r.outcome, "ERR-10: a mid-stream cancellation drives to the cancel terminal outcome").toBe(
      "cancel",
    );
    expect(
      mutator.calls,
      "ERR-8/ERR-9: no committed surface is truncated/rewritten/replaced/removed and no compensating turn is injected",
    ).toEqual([]);
  });

  it("ERR-12: the non-mutation obligation holds identically inside a subagent-mode body", async () => {
    const host = new RecordingHost();
    const mutator = new RecordingMutator();
    const controller = new AbortController();
    const checkpoint = new ScriptedCheckpoint((call) => {
      if (call === 2) {
        controller.abort();
      }
    });
    const program = body([toolCallStmt("s0"), toolCallStmt("s1")]);

    const r = await executeBody(
      program,
      deps({ host, checkpoint, signal: controller.signal, mutator, mode: "subagent" }),
    );

    expect(host.effects, "ERR-12: the subagent-mode body was driven to the cancellation").toEqual([
      "s0",
    ]);
    expect(r.outcome, "ERR-12: a subagent-mode mid-stream cancellation drives to cancel").toBe(
      "cancel",
    );
    expect(
      mutator.calls,
      "ERR-12: the non-mutation obligation holds inside a subagent loom too",
    ).toEqual([]);
  });
});
