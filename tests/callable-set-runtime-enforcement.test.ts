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
import type {
  CallExpr,
  Expr,
  LoomBody,
  ObjectExpr,
} from "../src/parser/loom-document";
import type { ParsedFrontmatter } from "../src/parser/frontmatter";
import type {
  CallableSetSnapshot,
  ResolvedCallable,
} from "../src/parser/callable-set";
import type { SourceRange } from "../src/diagnostics/diagnostic";

// QTL-2 (SECURITY): the frozen `tools:` callable set is enforced at RUNTIME for
// code-driven `<name>(args)` calls. The runtime dispatches ONLY through a held
// reference in the loom's resolution snapshot; a callable name absent from the
// set surfaces the code-tool `Err` instead of executing an ambient host tool,
// and the runtime never re-queries Pi's tool registry by name during execution
// (frontmatter.md §`tools:`; call-a-tool-from-loom-code.md). These are the
// deterministic, offline half of the real-CLI QTL-2 finding — no model turn is
// needed to resolve a code-driven tool call.

// --- AST + double helpers --------------------------------------------------

function span(): SourceRange {
  return { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } };
}

function strExpr(value: string): Expr {
  return { kind: "string", value, range: span() };
}

/** A single object-literal argument `{ <name>: <value> }` (the tool-call convention). */
function objArg(name: string, value: string): ObjectExpr {
  return {
    kind: "object",
    typeName: null,
    fields: [{ name, value: strExpr(value) }],
    range: span(),
  };
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
}

function producer(opts: ProducerOpts) {
  return createProductionProducerDeps({
    pi: {} as unknown as ExtensionAPI,
    root: rootDouble(),
    modelRegistry: {} as unknown as ModelRegistry,
    ...(opts.resolvePiTool !== undefined ? { resolvePiTool: opts.resolvePiTool } : {}),
  });
}

/** A `pi-tool` snapshot entry whose held dispatch records execution. */
function piToolEntry(
  toolName: string,
  onExecute: () => void,
): ResolvedCallable {
  const dispatch: PiToolDispatch = {
    toolName,
    execute: (): Promise<AgentToolResultEnvelope> => {
      onExecute();
      return Promise.resolve({ content: [{ type: "text", text: `${toolName}-out` }] });
    },
  };
  return { kind: "pi-tool", toolDefinition: dispatch };
}

/** A frozen callable-set snapshot from `{ callableName -> entry }` pairs. */
function snapshot(
  entries: readonly (readonly [string, ResolvedCallable])[],
): CallableSetSnapshot {
  return Object.freeze({ entries: new Map(entries) });
}

/** A prompt-mode loom carrying a resolved callable-set snapshot. */
function loomWithSet(tail: Expr, callableSet: CallableSetSnapshot): LoomCompositionInput {
  const frontmatter: ParsedFrontmatter = { mode: "prompt" };
  return {
    slashName: "demo",
    sourcePath: "/looms/demo.loom",
    frontmatter,
    body: body(tail),
    callableSet,
  };
}

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

describe("QTL-2 — the `tools:` callable set is enforced for code-driven calls", () => {
  it("a no-`tools:` loom (empty callable set) that calls bash() surfaces Err — the ambient tool is NOT executed and the registry is not re-queried", async () => {
    let ambientResolveQueried = false;
    // A producer-wide resolver that WOULD resolve the ambient `bash` tool. If the
    // runtime re-queried the registry (the QTL-2 bug), this would run and the
    // call would execute. With the empty callable set enforced, it must never be
    // consulted.
    const resolvePiTool = (name: string): PiToolDispatch => {
      ambientResolveQueried = true;
      return {
        toolName: name,
        execute: (): Promise<AgentToolResultEnvelope> =>
          Promise.resolve({ content: [{ type: "text", text: "LEAK" }] }),
      };
    };

    const loom = loomWithSet(
      callExpr("bash", [objArg("command", "echo LEAK")]),
      snapshot([]),
    );
    const inner = (await runBody(producer({ resolvePiTool }), loom)) as ResultValue;

    expect(
      ambientResolveQueried,
      "the runtime must not re-query Pi's tool registry for a name outside the callable set",
    ).toBe(false);
    expect(
      inner.ok,
      "a call outside the empty callable set surfaces Err, never a fabricated Ok/executed value",
    ).toBe(false);
    const err = (inner as { readonly ok: false; readonly error: { readonly kind?: string; readonly cause?: string } }).error;
    expect(err.kind, "the out-of-set call surfaces the code-tool Err").toBe("code_tool");
  });

  it("a name NOT in a non-empty set (tools: grep, code calls read) surfaces Err — read is not executed", async () => {
    let readExecuted = false;
    const set = snapshot([["grep", piToolEntry("grep", () => {})]]);
    const loom = loomWithSet(callExpr("read", [objArg("path", "docs/x")]), set);
    const inner = (await runBody(
      producer({
        resolvePiTool: (name) => ({
          toolName: name,
          execute: (): Promise<AgentToolResultEnvelope> => {
            readExecuted = true;
            return Promise.resolve({ content: [{ type: "text", text: "file" }] });
          },
        }),
      }),
      loom,
    )) as ResultValue;

    expect(readExecuted, "an undeclared `read` must not execute").toBe(false);
    expect(inner.ok, "an undeclared call surfaces Err").toBe(false);
  });

  it("a DECLARED tool (tools: grep, code calls grep()) dispatches through the held reference and lowers to Ok(text)", async () => {
    let grepExecuted = false;
    const set = snapshot([["grep", piToolEntry("grep", () => (grepExecuted = true))]]);
    const loom = loomWithSet(callExpr("grep", [objArg("pattern", "x")]), set);
    const inner = (await runBody(producer({}), loom)) as ResultValue;

    expect(grepExecuted, "a declared tool dispatches through its held reference").toBe(true);
    expect(inner.ok, "a declared tool call lowers to Ok").toBe(true);
    expect(
      (inner as { readonly ok: true; readonly value: unknown }).value,
      "the lowered value is the tool's joined text",
    ).toBe("grep-out");
  });

  it("an `as`-rename (tools: grep as search, code calls search()) dispatches to the underlying grep tool", async () => {
    let grepExecuted = false;
    // The snapshot is keyed by the post-rename callable name `search`, whose held
    // reference dispatches to the underlying `grep` tool.
    const set = snapshot([["search", piToolEntry("grep", () => (grepExecuted = true))]]);
    const loom = loomWithSet(callExpr("search", [objArg("pattern", "x")]), set);
    const inner = (await runBody(producer({}), loom)) as ResultValue;

    expect(grepExecuted, "the renamed callable dispatches to the underlying grep tool").toBe(true);
    expect(inner.ok, "the `as`-rename call lowers to Ok").toBe(true);
    expect((inner as { readonly ok: true; readonly value: unknown }).value).toBe("grep-out");
  });
});
