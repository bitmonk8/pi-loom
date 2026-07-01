// V14b-T — failing tests for the paired `V14b` "Model-driven parallel tool-call
// batch (settle-all and independent lowering)" implementation leaf.
//
// Spec: tool-calls.md §Concurrency (coverage-matrix.md code-keyed-area token
// `cka-13`, the `V14b` model-driven-parallel-batch facet of the multi-leaf
// `cka-13` row); query/query-tool-loop.md §"Tool calls during a query"
// (per-sibling lowering, `isError: true` for a failing sibling fed back
// alongside successful siblings).
//
// Each test drives the live `V14b` surface (`settleModelToolBatch`) with a
// scripted parallel batch mixing one succeeding and one failing sibling and reds
// on its own primary assertion while `V14b` is absent: the inert stub settles no
// sibling and returns an empty result array, so the settle-all-before-next-turn
// log, the per-sibling-independence result mapping, and the failing-sibling
// `isError: true` expectations red rather than a compile error, a missing
// fixture, or a harness throw. Each `it` cites `cka-13` and the closing leaf-ID
// `V14b` inline per the coverage-matrix multi-leaf-row per-facet citing-test
// convention.

import { describe, expect, it } from "vitest";
import {
  settleModelToolBatch,
  type LoweredToolResult,
  type ModelToolCall,
  type ModelToolResultEnvelope,
} from "../src/runtime/tool-batch";
import type { ToolContentBlock } from "../src/runtime/tool-call-execute";

const text = (t: string): ToolContentBlock => ({ type: "text", text: t });

/** Join a lowered result's surviving text blocks exactly as the code-side lowering does. */
const joinText = (content: readonly ToolContentBlock[] | undefined): string =>
  (content ?? [])
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n");

/**
 * A cleanly-resolving sibling that records its settlement into `log` on
 * dispatch, so a test can witness the runtime awaited it before constructing the
 * next user turn.
 */
function succeedingSibling(
  log: string[],
  toolName: string,
  toolUseId: string,
  content: readonly ToolContentBlock[],
): ModelToolCall {
  return {
    toolName,
    toolUseId,
    dispatch: async () => {
      log.push(`settled:${toolUseId}`);
      return { content };
    },
  };
}

/**
 * A sibling whose `execute()` throws, settling *last* (after two microtask
 * turns) so a naive implementation that returned on the first settled sibling
 * would miss it — the settle-all barrier must still await it.
 */
function throwingSibling(
  log: string[],
  toolName: string,
  toolUseId: string,
  message: string,
): ModelToolCall {
  return {
    toolName,
    toolUseId,
    dispatch: async () => {
      await Promise.resolve();
      await Promise.resolve();
      log.push(`settled:${toolUseId}`);
      throw new Error(message);
    },
  };
}

/** A sibling that resolves `{ content, isError: true }` (the non-throw failure form). */
function isErrorSibling(
  log: string[],
  toolName: string,
  toolUseId: string,
  content: readonly ToolContentBlock[],
): ModelToolCall {
  return {
    toolName,
    toolUseId,
    dispatch: async (): Promise<ModelToolResultEnvelope> => {
      log.push(`settled:${toolUseId}`);
      return { content, isError: true };
    },
  };
}

// ===========================================================================
// cka-13 / V14b — settle-all before the next user turn: a model-driven parallel
// batch mixing a succeeding and a failing sibling awaits every call to settle
// before the runtime constructs the next user turn (tool-calls.md §Concurrency).
// ===========================================================================

describe("V14b-T — cka-13 settle-all before the next user turn (tool-calls.md §Concurrency)", () => {
  it("cka-13 / V14b: awaits every sibling in the batch to settle before the caller constructs the next user turn", async () => {
    const log: string[] = [];
    // A mixed batch: the succeeding sibling settles immediately; the failing
    // sibling settles last (two microtask turns later).
    const batch: readonly ModelToolCall[] = [
      succeedingSibling(log, "search", "call-a", [text("42 matches")]),
      throwingSibling(log, "grep", "call-b", "path not found"),
    ];

    const results = await settleModelToolBatch(batch);
    // The caller constructs the next user turn only now the batch has settled.
    log.push("next-turn");

    // cka-13 / V14b: every sibling settled before the next user turn was
    // constructed — both settle markers precede the "next-turn" marker (their
    // relative order is unconstrained, so compare the settled pair as a set).
    expect(log.slice(0, 2).sort()).toEqual(["settled:call-a", "settled:call-b"]);
    expect(log[2]).toBe("next-turn");
    // The whole batch is lowered — one result per sibling.
    expect(results).toHaveLength(2);
  });
});

// ===========================================================================
// cka-13 / V14b — independent per-sibling lowering: each sibling's outcome is
// lowered independently into its own `tool_use` result block, in batch order,
// keyed by `toolUseId` (tool-calls.md §Concurrency).
// ===========================================================================

describe("V14b-T — cka-13 independent per-sibling lowering (tool-calls.md §Concurrency)", () => {
  it("cka-13 / V14b: each sibling's outcome is lowered independently into its own tool_use result block, in batch order, keyed by toolUseId", async () => {
    const log: string[] = [];
    const batch: readonly ModelToolCall[] = [
      succeedingSibling(log, "search", "call-a", [text("hit one"), text("hit two")]),
      succeedingSibling(log, "read", "call-b", [text("file body")]),
    ];

    const results = await settleModelToolBatch(batch);

    // One result per sibling, in batch order, each keyed by its own toolUseId.
    expect(results.map((r: LoweredToolResult) => r.toolUseId)).toEqual([
      "call-a",
      "call-b",
    ]);
    // Each sibling lowered independently to its own joined text, isError false.
    expect(results[0]?.isError).toBe(false);
    expect(joinText(results[0]?.content)).toBe("hit one\nhit two");
    expect(results[1]?.isError).toBe(false);
    expect(joinText(results[1]?.content)).toBe("file body");
  });
});

// ===========================================================================
// cka-13 / V14b — the failing sibling becomes an `isError: true` tool-result fed
// back alongside the successful siblings' results, for both failure forms
// (`execute()` throwing and resolving `{ content, isError: true }`).
// ===========================================================================

describe("V14b-T — cka-13 failing sibling lowered to isError:true alongside successes (tool-calls.md §Concurrency)", () => {
  it("cka-13 / V14b: a throwing sibling becomes its tool_use block's isError:true tool-result fed back alongside the successful sibling's result", async () => {
    const log: string[] = [];
    const batch: readonly ModelToolCall[] = [
      succeedingSibling(log, "search", "call-a", [text("42 matches")]),
      throwingSibling(log, "grep", "call-b", "path not found"),
    ];

    const results = await settleModelToolBatch(batch);

    // The successful sibling is fed back as a non-error tool-result.
    expect(results[0]?.toolUseId).toBe("call-a");
    expect(results[0]?.isError).toBe(false);
    expect(joinText(results[0]?.content)).toBe("42 matches");
    // The failing (throwing) sibling becomes its block's isError:true tool-result
    // carrying the coerced error message — fed back alongside the success.
    expect(results[1]?.toolUseId).toBe("call-b");
    expect(results[1]?.isError).toBe(true);
    expect(joinText(results[1]?.content)).toBe("path not found");
  });

  it("cka-13 / V14b: a sibling resolving { content, isError: true } is lowered to an isError:true tool-result alongside the successful sibling", async () => {
    const log: string[] = [];
    const batch: readonly ModelToolCall[] = [
      isErrorSibling(log, "write", "call-a", [text("permission denied")]),
      succeedingSibling(log, "read", "call-b", [text("ok")]),
    ];

    const results = await settleModelToolBatch(batch);

    // The non-throw failure form (`{ content, isError: true }`) also lowers to an
    // isError:true tool-result, preserving the tool's text content.
    expect(results[0]?.toolUseId).toBe("call-a");
    expect(results[0]?.isError).toBe(true);
    expect(joinText(results[0]?.content)).toBe("permission denied");
    // The successful sibling is unaffected — lowered independently, isError false.
    expect(results[1]?.toolUseId).toBe("call-b");
    expect(results[1]?.isError).toBe(false);
    expect(joinText(results[1]?.content)).toBe("ok");
  });
});
