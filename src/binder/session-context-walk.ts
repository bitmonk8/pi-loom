// V11i / V11i-T — the `bind_context: session` session-context truncation walk
// (the input to the V11b compact-transcript renderer's included-turn slice).
//
// This module owns:
//   - the session-context truncation walk (binder/binder-model-and-context.md
//     §"Session-context truncation (`bind_context: session`)"): source the
//     message list from `buildSessionContext(...).messages`, count tokens per
//     message through the injected `TokenEstimator` seam (PIC-16, V8e), group
//     into turns (the same turn boundary the V11b renderer uses), and walk
//     newest-to-oldest including a candidate turn iff, after inclusion, the
//     running token total is ≤ 8000 AND the running turn count is ≤ 20 — the
//     first candidate that would violate either inequality is excluded entirely
//     (whole-turn truncation; partial messages are not split) and terminates the
//     walk. Both cap-equality boundaries are inclusive.
//   - the BNDR-10 subagent-mode skip
//     (binder/binder-model-and-context.md#bndr-10): a `bind_context: session`
//     declaration on a `mode: subagent` loom is treated as `bind_context: none`
//     for binder-input construction — the walk is skipped and no *Recent session
//     context* block is emitted.
//
// V11i-T (tests-task) declares these seams and stubs the walk inertly so the
// failing tests compile and red on their own primary assertions; the paired
// V11i implementation fills the walk in.
//
// Spec: binder/binder-model-and-context.md (§"Session-context truncation
// (`bind_context: session`)", BNDR-10).

import type { AgentMessage } from "@earendil-works/pi-agent-core";
import type { LoomMode } from "../parser/frontmatter";
import type { TokenEstimator } from "../seams/token-estimator";

/** The inclusive running-token-total cap of the truncation walk (8000 tokens). */
export const SESSION_CONTEXT_TOKEN_CAP = 8000;

/** The inclusive running-turn-count cap of the truncation walk (20 turns). */
export const SESSION_CONTEXT_TURN_CAP = 20;

/** The `bind_context:` field value governing whether the walk runs at all. */
export type BindContext = "none" | "session";

/** Inputs to one session-context truncation walk. */
export interface SessionContextWalkInput {
  /**
   * The message list, chronological oldest-to-newest (the newest turn sits at
   * the array tail), sourced from
   * `buildSessionContext(ctx.sessionManager.getEntries(), ctx.sessionManager.getLeafId()).messages`.
   */
  readonly messages: readonly AgentMessage[];
  /** The injected per-message token-count seam (PIC-16). */
  readonly estimator: TokenEstimator;
  /** The loom's resolved `mode:` — drives the BNDR-10 subagent-mode skip. */
  readonly mode: LoomMode;
  /** The loom's `bind_context:` value. */
  readonly bindContext: BindContext;
}

/**
 * The outcome of the session-context truncation walk.
 *
 *   - `applies` — `true` iff `bind_context: session` AND `mode: prompt`. When
 *     `false` the walk did not run (either `bind_context: none`, or the BNDR-10
 *     subagent-mode skip that treats session-on-subagent as `none`) and no
 *     *Recent session context* block is emitted; `includedMessages` is empty.
 *   - `includedMessages` — the included-turn slice, chronological
 *     oldest-to-newest, ready for the V11b compact-transcript renderer. Empty
 *     when `applies` is `false` or when zero turns survive the walk (the
 *     BNDR-7i void-truncation case, whose whole-block omission the V11b renderer
 *     owns).
 *   - `includedTurnCount` — the number of whole turns included (0 when none).
 *   - `includedTokenTotal` — the running token total of the included turns
 *     (0 when none).
 */
export interface SessionContextWalkResult {
  readonly applies: boolean;
  readonly includedMessages: readonly AgentMessage[];
  readonly includedTurnCount: number;
  readonly includedTokenTotal: number;
}

/**
 * Run the `bind_context: session` truncation walk (or the BNDR-10 subagent-mode
 * skip). The paired V11i implementation walks turns newest-to-oldest under the
 * inclusive 8000-token / 20-turn caps and returns the included slice
 * chronological oldest-to-newest.
 *
 * The V11i-T stub returns an inert sentinel: `applies: true` with a negative
 * `includedTurnCount` fails every walk-vector assertion (each expects a concrete
 * non-negative count) and the BNDR-10 subagent-skip assertion (which expects
 * `applies: false`), so every V11i-T test reds on its own primary assertion
 * because the walk is absent — not on a harness throw or a compile error. The
 * sentinel is constructed fresh per call (no module-level object binding).
 */
export function walkSessionContext(
  _input: SessionContextWalkInput,
): SessionContextWalkResult {
  return {
    applies: true,
    includedMessages: [],
    includedTurnCount: -1,
    includedTokenTotal: -1,
  };
}
