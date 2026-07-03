import { describe, expect, it } from "vitest";
import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ModelRegistry,
} from "@earendil-works/pi-coding-agent";
import {
  createProductionProducerDeps,
  type PiToolDispatch,
} from "../src/extension/production-loom-producer";
import type {
  LoomCompositionInput,
  ConversationBindInput,
} from "../src/extension/loom-composition-producer";
import { executeBody } from "../src/runtime/statement-executor";
import type { RuntimeRoot } from "../src/runtime-root";
import type { Checkpoint } from "../src/seams/checkpoint";
import type { AgentToolResultEnvelope } from "../src/runtime/tool-call-execute";
import type { LoomValue, ResultValue } from "../src/runtime/value";
import type { CallExpr, Expr, LoomBody } from "../src/parser/loom-document";
import type { ParsedFrontmatter } from "../src/parser/frontmatter";
import type { SourceRange } from "../src/diagnostics/diagnostic";

// H8b — the live tool-call / invoke resolvers wired into the production
// composition root. These tests prove the shipped `ProductionLoomProducer` no
// longer wires the inert `resolveToolCall` / `resolveInvoke` doubles (which
// fabricated `Ok(null)` / `Ok("")` without executing) but drives the REAL
// runners:
//   - a code-side `<name>(args)` Pi-tool call dispatches the resolved host
//     tool's `execute(...)` and lowers its envelope (V14g) to `Ok(text)`;
//   - an `execute()` throw / unknown host tool surfaces
//     `Err(CodeToolError{cause:"execution"})`, never a fabricated value;
//   - a `.loom`-callable `<name>(args)` call routes to the invoke path, and a
//     callee that cannot be loaded surfaces `Err(InvokeInfraError{cause:
//     "load_failure"})` across the boundary — never `Ok(null)` (FN-5).
//
// The prompt-mode binding is reached synchronously (no live session), so the
// resolver behaviour is `npm test`-assertable off the real
// `createEffectfulStatementHost` + real `runCodeSideToolCall` /
// `runInvokeChild`. The full positive spawn-and-drive typed return crossing a
// live subagent boundary is the opt-in live witness (tests/live).

// --- AST + double helpers --------------------------------------------------

function span(): SourceRange {
  return { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } };
}

function callExpr(callee: string, args: readonly Expr[] = []): CallExpr {
  return { kind: "call", callee, args, range: span() };
}

function body(tail: Expr | null): LoomBody {
  return { statements: [], tail };
}

const NOOP_CHECKPOINT: Checkpoint = {
  before(): Promise<void> {
    return Promise.resolve();
  },
};

/** A `RuntimeRoot` double exposing only the members the tool/invoke path reads. */
function rootDouble(): RuntimeRoot {
  return {
    checkpoint: NOOP_CHECKPOINT,
    idSource: {
      newInvocationId: () => "inv-1",
      newToolCallId: () => "tc-1",
    },
  } as unknown as RuntimeRoot;
}

function ctxDouble(): ExtensionCommandContext {
  return {} as unknown as ExtensionCommandContext;
}

interface ProducerOpts {
  readonly resolvePiTool?: (name: string) => PiToolDispatch | undefined;
  readonly parseCallee?: (
    callerPath: string | undefined,
    calleePath: string,
  ) => Promise<LoomCompositionInput | undefined>;
}

function producer(opts: ProducerOpts) {
  return createProductionProducerDeps({
    pi: {} as unknown as ExtensionAPI,
    root: rootDouble(),
    modelRegistry: {} as unknown as ModelRegistry,
    ...(opts.resolvePiTool !== undefined ? { resolvePiTool: opts.resolvePiTool } : {}),
    ...(opts.parseCallee !== undefined ? { parseCallee: opts.parseCallee } : {}),
  });
}

function promptLoom(tail: Expr, tools?: readonly string[]): LoomCompositionInput {
  const frontmatter: ParsedFrontmatter = {
    mode: "prompt",
    ...(tools !== undefined ? { tools } : {}),
  };
  return { slashName: "demo", sourcePath: "/looms/demo.loom", frontmatter, body: body(tail) };
}

/**
 * Drive the loom body through the real prompt-mode binding and return the tail
 * expression's produced value (the call/invoke `ResultValue`). The body succeeds
 * on every path here (a failed call produces an `Err` *value*, not a failed
 * body), so the outer execution result is always `Ok(<tail value>)`.
 */
async function runBody(
  deps: ReturnType<typeof producer>,
  loom: LoomCompositionInput,
): Promise<LoomValue> {
  const bindInput: ConversationBindInput = { loom, args: "", ctx: ctxDouble() };
  const binding = deps.bindPromptConversation(bindInput);
  const execution = await executeBody(loom.body, binding.executeDeps);
  const outer = execution.result;
  if (!outer.present || outer.value === undefined) {
    throw new Error("body produced no final value");
  }
  return outer.value;
}

// ===========================================================================
// Real-host tool-call wiring — cka-13 / cka-46 integration witness (V14*).
// ===========================================================================

describe("H8b — real-host code-side tool-call wiring", () => {
  it("a code-side `<name>(args)` Pi-tool call dispatches the resolved host tool's execute and lowers its envelope to Ok(text)", async () => {
    let dispatched = false;
    const resolvePiTool = (name: string): PiToolDispatch | undefined => ({
      toolName: name,
      execute: (): Promise<AgentToolResultEnvelope> => {
        dispatched = true;
        return Promise.resolve({ content: [{ type: "text", text: "tool-out" }] });
      },
    });

    const inner = (await runBody(
      producer({ resolvePiTool }),
      promptLoom(callExpr("emit")),
    )) as ResultValue;

    expect(dispatched, "the real code-side tool-call path dispatched the host tool").toBe(true);
    expect(inner.ok, "a cleanly-resolving tool call lowers to Ok(...)").toBe(true);
    expect(
      (inner as { readonly ok: true; readonly value: unknown }).value,
      "the lowered value is the tool's joined text — NOT a fabricated Ok(null)/Ok('')",
    ).toBe("tool-out");
  });

  it("an execute() throw surfaces Err(CodeToolError{cause:'execution'}), never a fabricated Ok", async () => {
    const resolvePiTool = (name: string): PiToolDispatch => ({
      toolName: name,
      execute: (): Promise<AgentToolResultEnvelope> =>
        Promise.reject(new Error("tool blew up")),
    });

    const inner = (await runBody(
      producer({ resolvePiTool }),
      promptLoom(callExpr("emit")),
    )) as ResultValue;
    expect(inner.ok, "a failed tool call surfaces Err, never Ok").toBe(false);
    const err = (inner as { readonly ok: false; readonly error: { readonly cause?: string } }).error;
    expect(err.cause, "the execute() throw lowers to CodeToolError cause 'execution'").toBe(
      "execution",
    );
  });

  it("an unresolved host tool name surfaces Err(execution) rather than fabricating a value", async () => {
    // No `resolvePiTool` collaborator: the code-side call names no resolvable
    // host tool, so the dispatch throws and lowers to the execution Err.
    const inner = (await runBody(
      producer({}),
      promptLoom(callExpr("no_such_tool")),
    )) as ResultValue;
    expect(inner.ok, "an unresolved host tool surfaces Err, never Ok('')").toBe(false);
  });
});

// ===========================================================================
// Real-host invoke wiring — FN-5 failure surfacing (V15*).
// ===========================================================================

describe("H8b — `.loom`-callable routing surfaces Err on a load failure (FN-5)", () => {
  it("a `.loom`-callable `<name>(args)` call whose callee cannot be loaded surfaces Err(InvokeInfraError{cause:'load_failure'}), never Ok(null)", async () => {
    let parseAttempted = false;
    // The callee resolves to `./sentiment.loom` (the callable-set entry) but
    // fails to load, so the invoke path surfaces the load-failure Err.
    const parseCallee = (
      _callerPath: string | undefined,
      _calleePath: string,
    ): Promise<LoomCompositionInput | undefined> => {
      parseAttempted = true;
      return Promise.resolve(undefined);
    };

    const loom = promptLoom(callExpr("sentiment"), ["./sentiment.loom"]);
    const inner = (await runBody(producer({ parseCallee }), loom)) as ResultValue;

    expect(parseAttempted, "a `.loom`-callable call routes to the invoke spawn-and-drive path").toBe(
      true,
    );
    expect(inner.ok, "a callee load failure surfaces Err, never a fabricated Ok(null)").toBe(false);
    const err = (inner as { readonly ok: false; readonly error: { readonly cause?: string; readonly kind?: string } }).error;
    expect(err.kind, "the load failure is an InvokeInfraError").toBe("invoke_infra");
    expect(err.cause, "with cause 'load_failure'").toBe("load_failure");
  });
});
