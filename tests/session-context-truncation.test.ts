import { describe, expect, it } from "vitest";
import type {
  AssistantMessage,
  TextContent,
  UserMessage,
} from "@earendil-works/pi-ai";
import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { FakeTokenEstimator } from "./helpers/fake-token-estimator";
import {
  walkSessionContext,
  type SessionContextWalkInput,
} from "../src/binder/session-context-walk";

// V11i-T — failing tests for the paired `V11i` "Session-context truncation walk"
// implementation.
//
// Spec: binder/binder-model-and-context.md (§"Session-context truncation
// (`bind_context: session`)", worked examples; BNDR-10 subagent-mode skip).
//
// The walk sources its message list from `buildSessionContext(...).messages`
// (chronological oldest-to-newest), counts tokens per message through the
// injected `TokenEstimator` seam (PIC-16, V8e) — here a `FakeTokenEstimator`
// configured with chosen per-message integer counts so the running total and
// turn count cross each cap at a known boundary without coupling to Pi's
// estimation heuristic — and includes a candidate turn iff, after inclusion, the
// running token total is ≤ 8000 AND the running turn count is ≤ 20. The first
// candidate that would violate either inequality is excluded entirely
// (whole-turn truncation) and terminates the walk. Both cap boundaries are
// inclusive.
//
// These tests red because the V11i walk is absent: `walkSessionContext` is an
// inert stub returning `{ applies: true, includedMessages: [],
// includedTurnCount: -1, includedTokenTotal: -1 }`. Each test reds on its own
// primary assertion (a wrong included-turn count / slice, or a wrong `applies`
// discriminant) — not on a compile error, a missing fixture, or a harness throw.

// --- AgentMessage constructors ----------------------------------------------

const USAGE = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
} as const;

function user(text: string): UserMessage {
  return { role: "user", content: text, timestamp: 0 };
}

function assistant(text: string): AssistantMessage {
  const content: TextContent[] = [{ type: "text", text }];
  return {
    role: "assistant",
    content,
    api: "anthropic-messages",
    provider: "anthropic",
    model: "test-model",
    usage: USAGE,
    stopReason: "stop",
    timestamp: 0,
  };
}

/**
 * Build a walk over `messages` with a `FakeTokenEstimator` reporting the
 * per-message `counts` (keyed by message identity). `mode`/`bindContext` default
 * to the session-context-applies case (`prompt` + `session`).
 */
function walk(
  messages: readonly AgentMessage[],
  counts: ReadonlyMap<AgentMessage, number>,
  overrides: Partial<Pick<SessionContextWalkInput, "mode" | "bindContext">> = {},
) {
  return walkSessionContext({
    messages,
    estimator: new FakeTokenEstimator(counts),
    mode: overrides.mode ?? "prompt",
    bindContext: overrides.bindContext ?? "session",
  });
}

// ============================================================================
// Session-context truncation walk — worked-example vectors
// binder/binder-model-and-context.md §"Session-context truncation"

describe("session-context truncation walk (bind_context: session)", () => {
  it("token cap, inclusive boundary + whole-turn drop: [3000, 2500, 2500, 100] (newest first) → 3 turns / 8000 tokens", () => {
    // binder-model-and-context.md §"Session-context truncation" — *Token-cap
    // equality*: the first three turns total exactly 8000 (inclusive), the
    // fourth would make 8100 > 8000 so it is dropped entirely. Each turn is a
    // single user message; `messages` is chronological oldest-to-newest, so the
    // newest-first counts [3000, 2500, 2500, 100] reverse to the array order.
    const oldest = user("t-100"); // newest-first index 3 (oldest)
    const mid1 = user("t-2500a");
    const mid2 = user("t-2500b");
    const newest = user("t-3000"); // newest-first index 0 (array tail)
    const messages: AgentMessage[] = [oldest, mid1, mid2, newest];
    const counts = new Map<AgentMessage, number>([
      [oldest, 100],
      [mid1, 2500],
      [mid2, 2500],
      [newest, 3000],
    ]);

    const result = walk(messages, counts);
    expect(result.includedTurnCount).toBe(3);
    expect(result.includedTokenTotal).toBe(8000);
    // The three newest turns, chronological oldest-to-newest (the 100-token
    // oldest turn is excluded).
    expect(result.includedMessages).toEqual([mid1, mid2, newest]);
    expect(result.applies).toBe(true);
  });

  it("token cap, over-budget mid-walk: [1200, 900, 1500, 2000, 2800] (newest first) → 4 turns / 5600 tokens", () => {
    // binder-model-and-context.md §"Session-context truncation" — *Worked
    // example*: running total after four turns is 5600; the fifth would make
    // 5600 + 2800 = 8400 > 8000, so it and everything older is dropped.
    const t2800 = user("t-2800"); // newest-first index 4 (oldest)
    const t2000 = user("t-2000");
    const t1500 = user("t-1500");
    const t900 = user("t-900");
    const t1200 = user("t-1200"); // newest-first index 0 (array tail)
    const messages: AgentMessage[] = [t2800, t2000, t1500, t900, t1200];
    const counts = new Map<AgentMessage, number>([
      [t2800, 2800],
      [t2000, 2000],
      [t1500, 1500],
      [t900, 900],
      [t1200, 1200],
    ]);

    const result = walk(messages, counts);
    expect(result.includedTurnCount).toBe(4);
    expect(result.includedTokenTotal).toBe(5600);
    expect(result.includedMessages).toEqual([t2000, t1500, t900, t1200]);
    expect(result.applies).toBe(true);
  });

  it("turn cap, inclusive boundary: 21 turns under the token budget → exactly the 20 newest included, 21st excluded", () => {
    // binder-model-and-context.md §"Session-context truncation" — *Turn-cap
    // equality*: the 20-turn boundary is inclusive; the 21st turn is excluded
    // regardless of its token weight (running count would become 21 > 20). Each
    // of the 21 turns weighs 100 tokens (total 2100 < 8000, so only the turn cap
    // bites).
    const messages: UserMessage[] = [];
    const counts = new Map<AgentMessage, number>();
    for (let i = 0; i < 21; i += 1) {
      const m = user(`turn-${i}`); // index 0 oldest, index 20 newest
      messages.push(m);
      counts.set(m, 100);
    }

    const result = walk(messages, counts);
    expect(result.includedTurnCount).toBe(20);
    expect(result.includedTokenTotal).toBe(2000);
    // The 20 newest turns are indices 1..20; the oldest (index 0) is excluded.
    expect(result.includedMessages).toEqual(messages.slice(1));
    expect(result.includedMessages).not.toContain(messages[0]);
  });

  it("single oversized newest turn (alone > 8000) → zero turns included", () => {
    // binder-model-and-context.md §"Session-context truncation" — *Single
    // oversized turn at the front*: the newest turn alone exceeds 8000, so the
    // walk includes nothing (no special-case; the same exclusive rule applies on
    // the first turn evaluated). Distinct from the BNDR-7i rendering assertion
    // the V11b renderer owns — here the walk simply hands zero turns onward.
    const solo = user("t-8001");
    const messages: AgentMessage[] = [solo];
    const counts = new Map<AgentMessage, number>([[solo, 8001]]);

    const result = walk(messages, counts);
    expect(result.includedTurnCount).toBe(0);
    expect(result.includedMessages).toEqual([]);
    // The walk still ran (bind_context: session, prompt mode); it just produced
    // an empty slice, which the V11b renderer turns into the void-truncation
    // whole-block omission.
    expect(result.applies).toBe(true);
  });

  it("whole-turn truncation: an over-budget multi-message turn is dropped entirely (no partial-message split)", () => {
    // binder-model-and-context.md §"Session-context truncation": "The over-budget
    // turn is excluded entirely (whole-turn truncation; partial messages are not
    // split)." The newest turn is a single 100-token user message; the older turn
    // is a user (4000) + assistant (4500) = 8500-token turn. After including the
    // newest (100), the older turn would make 100 + 8500 = 8600 > 8000, so BOTH
    // of its messages are dropped — neither the 4000 user nor the 4500 assistant
    // sneaks in.
    const olderUser = user("older-user-4000");
    const olderAssistant = assistant("older-assistant-4500");
    const newestUser = user("newest-100");
    // Chronological oldest-to-newest: the older turn's two messages, then the
    // newest turn's single message.
    const messages: AgentMessage[] = [olderUser, olderAssistant, newestUser];
    const counts = new Map<AgentMessage, number>([
      [olderUser, 4000],
      [olderAssistant, 4500],
      [newestUser, 100],
    ]);

    const result = walk(messages, counts);
    expect(result.includedTurnCount).toBe(1);
    expect(result.includedTokenTotal).toBe(100);
    expect(result.includedMessages).toEqual([newestUser]);
    // The dropped turn is whole: neither of its two messages appears.
    expect(result.includedMessages).not.toContain(olderUser);
    expect(result.includedMessages).not.toContain(olderAssistant);
  });
});

// ============================================================================
// BNDR-10 — subagent-mode session-context skip
// binder/binder-model-and-context.md#bndr-10

describe("BNDR-10 — bind_context: session on a mode: subagent theta is treated as bind_context: none", () => {
  it("skips the truncation walk and emits no Recent session context block on a subagent-mode theta", () => {
    // binder-model-and-context.md#bndr-10 — at slash-invocation time the runtime
    // MUST treat `bind_context: session` on a `mode: subagent` theta as
    // `bind_context: none` for binder-input construction: the walk is skipped
    // and no *Recent session context* block is emitted (binder input as for
    // `bind_context: none` — slash text plus frontmatter only). The two turns
    // below would otherwise be included, so a non-skipping implementation would
    // return them.
    const older = user("older");
    const newer = user("newer");
    const messages: AgentMessage[] = [older, newer];
    const counts = new Map<AgentMessage, number>([
      [older, 100],
      [newer, 100],
    ]);

    const subagent = walk(messages, counts, {
      mode: "subagent",
      bindContext: "session",
    });
    // The walk is skipped: no session context applies, and no turns are handed
    // to the renderer.
    expect(subagent.applies).toBe(false);
    expect(subagent.includedTurnCount).toBe(0);
    expect(subagent.includedMessages).toEqual([]);

    // Contrast: the identical session on a prompt-mode theta runs the walk and
    // includes both turns (200 tokens, 2 turns — both under the caps).
    const prompt = walk(messages, counts, {
      mode: "prompt",
      bindContext: "session",
    });
    expect(prompt.applies).toBe(true);
    expect(prompt.includedTurnCount).toBe(2);
    expect(prompt.includedMessages).toEqual([older, newer]);
  });
});
