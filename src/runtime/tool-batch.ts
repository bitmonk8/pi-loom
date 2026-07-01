// V14b / V14b-T — model-driven parallel tool-call batch (settle-all and
// independent per-sibling lowering).
//
// This module owns the runtime seam the paired `V14b` implementation leaf fills
// in for Pi's model-driven "parallel tool mode": when the model emits multiple
// `tool_use` blocks in one assistant message, Pi runs them concurrently and
// loom must await *every* sibling in the batch to settle before it constructs
// the next user turn, then lower each sibling's outcome independently into its
// own `tool_use` result block (tool-calls.md §Concurrency; coverage-matrix.md
// code-keyed-area token `cka-13`):
//
//   - `settleModelToolBatch` — await every sibling call in a model-issued batch
//     to settle (the paired `V14b` leaf uses `Promise.allSettled` under its
//     `// allow: cka-13 — tool-calls.md` exemption) before returning, so the
//     caller cannot construct the next user turn until the whole batch has
//     settled. Each sibling's outcome is lowered independently into its own
//     `LoweredToolResult`, in batch order, keyed by `toolUseId`: a cleanly
//     resolving sibling lowers to an `isError: false` result carrying its joined
//     text; a failing sibling — `execute()` throwing or resolving
//     `{ content, isError: true }` — lowers to that block's `isError: true`
//     tool-result carrying the tool's text content, fed back to the model
//     alongside the successful siblings' results (query/query-tool-loop.md
//     §"Tool calls during a query").
//
// The concurrent-execution, settle-all-before-next-turn, and independent-per-
// sibling-lowering shape this leaf models is a real-Pi parallel-tool-mode
// consumption posture, not a loom-side guarantee (tool-calls.md §"Parallel-tool-
// mode batch delivery").
//
// V14b-T (tests-task) declares this surface and stubs `settleModelToolBatch`
// inertly — it settles no sibling and lowers nothing, returning an empty result
// array — so the settle-all-before-next-turn, per-sibling-independence, and
// failing-sibling `isError: true` assertions each red on their own primary
// expectation, not on a compile error, a missing fixture, or a harness throw.
// The paired V14b implementation leaf fills it in.
//
// Spec: tool-calls.md §Concurrency (cka-13); query/query-tool-loop.md §"Tool
// calls during a query"; pi-integration-contract/host-interfaces-core.md §"Tool
// execution from loom code" (per-sibling lowering, shared with code-side calls).

import type { ToolContentBlock } from "./tool-call-execute";

/**
 * One model-issued `tool_use` block within a parallel batch. `dispatch` invokes
 * the Pi tool's `execute()` — resolving a `ModelToolResultEnvelope` (possibly
 * `{ content, isError: true }`) or throwing. `toolUseId` is Pi's per-block id
 * the lowered result is keyed back to.
 */
export interface ModelToolCall {
  readonly toolName: string;
  readonly toolUseId: string;
  dispatch(): Promise<ModelToolResultEnvelope>;
}

/**
 * The model-driven `execute()` return envelope. Unlike the code-side shape
 * (F-1578 removed `isError` from the code-side `AgentToolResult`; see
 * `tool-call-execute.ts`), the model-driven tool loop preserves `isError` so a
 * failing sibling's outcome can be fed back to the model as an `isError: true`
 * tool-result.
 */
export interface ModelToolResultEnvelope {
  readonly content: readonly ToolContentBlock[];
  readonly isError?: boolean;
}

/**
 * A single sibling's lowered `tool_use` result, fed back to the model when the
 * runtime constructs the next user turn. `content` is the sibling's text content
 * (a throw lowers to a single text block carrying the coerced error message);
 * `isError` is `true` for a failing sibling (throw or `{ ..., isError: true }`).
 */
export interface LoweredToolResult {
  readonly toolUseId: string;
  readonly content: readonly ToolContentBlock[];
  readonly isError: boolean;
}

/**
 * Await every sibling call in a model-issued parallel batch to settle before
 * returning the per-sibling lowered results (in batch order). The returned
 * promise resolves only after the whole batch has settled, so the caller cannot
 * construct the next user turn until every sibling — successful and failing
 * alike — has settled (tool-calls.md §Concurrency, cka-13). Each sibling's
 * outcome is lowered independently: a cleanly resolving sibling to an
 * `isError: false` result carrying its joined text, a failing sibling (throw or
 * `{ content, isError: true }`) to that block's `isError: true` tool-result.
 *
 * V14b-T stubs this inert: it settles no sibling and returns an empty result
 * array, so the settle-all-before-next-turn, per-sibling-independence, and
 * failing-sibling `isError: true` assertions each red on their own primary
 * expectation. The paired V14b leaf implements the settle-all barrier and the
 * per-sibling lowering.
 */
export async function settleModelToolBatch(
  _batch: readonly ModelToolCall[],
): Promise<readonly LoweredToolResult[]> {
  // Inert V14b-T stub: no sibling is dispatched, nothing settles, and no result
  // is lowered — the settle-all barrier and per-sibling lowering are the paired
  // V14b leaf's to add.
  return [];
}
