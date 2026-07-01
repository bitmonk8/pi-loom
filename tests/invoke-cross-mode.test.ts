import { describe, expect, it } from "vitest";
import {
  composeCalleeSession,
  selectCalleeContext,
  type CalleeSessionComposition,
  type ConversationMessage,
  type CrossModeCell,
  type InferenceConfig,
} from "../src/runtime/invoke-cross-mode";

// V15l-T — failing tests for the paired `V15l` invoke fresh-vs-attach cross-mode
// matrix.
//
// Spec: invocation.md §Cross-mode semantics (the fresh-vs-attach selection by
// callee mode), §Tools and model (the child uses its own model/tools/system,
// not the parent's), and pi-integration-contract/subagent.md "Subagent
// state-isolation matrix" (the canonical enumeration). The cross-mode matrix is
// an un-anchored (INV area) obligation — it carries no numbered PREFIX-N REQ-ID,
// so each test cites the spec §section inline rather than a REQ-ID.
//
// Scope — the three in-scope cells (prompt→subagent, subagent→subagent,
// subagent→prompt); the prompt→prompt parent-suspend + setActiveTools
// snapshot/restore cell is owned by V15d and is out of scope here.
//
// Each test reds on its own primary assertion because the V15l behaviour is
// absent: `selectCalleeContext` returns the inverted mapping (subagent →
// "attach", prompt → "fresh"), and `composeCalleeSession` returns the inverted
// context, the caller's prior messages regardless of context, and the parent's
// inference config. No test reds on a compile error, a missing fixture, or a
// harness throw.

// --------------------------------------------------------------------------
// Fixtures — a parent (caller) conversation with distinct config, and a callee
// with its own distinct config, so "uses child's config, not the parent's" is
// observable as a config-identity assertion.
// --------------------------------------------------------------------------

const PARENT_CONFIG: InferenceConfig = {
  model: "parent-model",
  tools: ["read", "bash"],
  system: "parent system prompt",
};

const CHILD_CONFIG: InferenceConfig = {
  model: "child-model",
  tools: ["write"],
  system: "child system prompt",
};

const CALLER_MESSAGES: readonly ConversationMessage[] = [
  { role: "user", text: "hello" },
  { role: "assistant", text: "hi" },
];

function compose(cell: CrossModeCell): CalleeSessionComposition {
  return composeCalleeSession({
    cell,
    caller: { messages: CALLER_MESSAGES, config: PARENT_CONFIG },
    callee: { config: CHILD_CONFIG },
  });
}

// --------------------------------------------------------------------------
// The matrix selects fresh-vs-attach by CALLEE mode alone (invocation.md
// §Cross-mode semantics: "The caller's mode is irrelevant to that decision").
// --------------------------------------------------------------------------

describe("cross-mode matrix — fresh-vs-attach is selected by callee mode (invocation.md §Cross-mode semantics)", () => {
  it("a subagent-mode callee gets a FRESH isolated conversation (prompt→subagent, subagent→subagent)", () => {
    // Both fresh cells key on the callee being subagent-mode.
    expect(selectCalleeContext("subagent")).toBe("fresh");
  });

  it("a prompt-mode callee ATTACHES to the caller's current conversation (subagent→prompt)", () => {
    expect(selectCalleeContext("prompt")).toBe("attach");
  });

  it("the caller mode is irrelevant: a subagent-mode callee is fresh under either caller mode", () => {
    const fromPrompt = compose({ callerMode: "prompt", calleeMode: "subagent" });
    const fromSubagent = compose({ callerMode: "subagent", calleeMode: "subagent" });
    // Primary: the selected context is the callee-mode-determined "fresh".
    expect(fromPrompt.context).toBe("fresh");
    expect(fromSubagent.context).toBe("fresh");
    // And the caller mode does not change the decision.
    expect(fromPrompt.context).toBe(fromSubagent.context);
  });
});

// --------------------------------------------------------------------------
// A fresh-context callee starts with no prior conversation messages
// (invocation.md §Cross-mode semantics). This is the observable session
// property for the two fresh cells.
// --------------------------------------------------------------------------

describe("cross-mode matrix — a fresh-context callee starts with no prior conversation messages (invocation.md §Cross-mode semantics)", () => {
  it("prompt→subagent: fresh context, no prior conversation messages", () => {
    const composed = compose({ callerMode: "prompt", calleeMode: "subagent" });
    expect(composed.context).toBe("fresh");
    expect(composed.priorMessages).toEqual([]);
  });

  it("subagent→subagent: fresh context (sibling, not nested), no prior conversation messages", () => {
    const composed = compose({ callerMode: "subagent", calleeMode: "subagent" });
    expect(composed.context).toBe("fresh");
    expect(composed.priorMessages).toEqual([]);
  });

  it("subagent→prompt: the callee ATTACHES to the caller subagent's own private conversation", () => {
    const composed = compose({ callerMode: "subagent", calleeMode: "prompt" });
    // Primary: this cell attaches rather than spawning fresh.
    expect(composed.context).toBe("attach");
    // Attaching carries the caller subagent's current conversation messages —
    // its own private conversation; nothing leaks to the grandparent.
    expect(composed.priorMessages).toEqual(CALLER_MESSAGES);
  });
});

// --------------------------------------------------------------------------
// Every callee's inference call uses the CHILD's configured model/tools/system
// rather than the parent's (invocation.md §Tools and model). This holds across
// all three in-scope cells, fresh and attach alike.
// --------------------------------------------------------------------------

describe("cross-mode matrix — every callee uses the child's model/tools/system, not the parent's (invocation.md §Tools and model)", () => {
  const cells: readonly CrossModeCell[] = [
    { callerMode: "prompt", calleeMode: "subagent" },
    { callerMode: "subagent", calleeMode: "subagent" },
    { callerMode: "subagent", calleeMode: "prompt" },
  ];

  for (const cell of cells) {
    it(`${cell.callerMode}→${cell.calleeMode}: the inference call uses the child's config, not the parent's`, () => {
      const composed = compose(cell);
      // Primary: the child's own config is used verbatim.
      expect(composed.inferenceConfig).toEqual(CHILD_CONFIG);
      // And the parent's config is NOT inherited.
      expect(composed.inferenceConfig).not.toEqual(PARENT_CONFIG);
    });
  }
});
