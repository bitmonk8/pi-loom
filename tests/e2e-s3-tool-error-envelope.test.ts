// e2e-S3 — code-side tool-call return-envelope conformance (REQ-TOOL-15,
// tool-calls.md:36).
//
// REQ-TOOL-15: `CodeToolError` is distinct from `ModelToolError` — the same
// `execute()` outcomes are lowered to `Err(CodeToolError { cause: "execution" })`
// code-side, but a code-side call carries NO `tool_call_id` / `raw_response`,
// while a model-loop adapter failure (`ModelToolError`) carries both. The S3
// coverage map found the field presence/absence contrast unpinned (the
// existing `tool-calls-execute-lowering` proves the lowering but not the
// envelope-field contrast).
//
// Method: M2 conformance — drives the REAL `lowerToolExecuteThrow` lowering and
// asserts against the real `CodeToolError` / `ModelToolError` shapes. No model.

import { describe, expect, it } from "vitest";
import { lowerToolExecuteThrow } from "../src/runtime/tool-call-execute";
import type { CodeToolError, ModelToolError } from "../src/runtime/query-error";

describe("e2e-S3 — REQ-TOOL-15 CodeToolError envelope carries no tool_call_id / raw_response (tool-calls.md:36)", () => {
  it("an execute() throw lowers to CodeToolError{cause:'execution'} with exactly {kind,message,tool_name,cause} — no tool_call_id, no raw_response", () => {
    const lowered: CodeToolError = lowerToolExecuteThrow(
      new Error("disk offline"),
      "read_file",
    );
    expect(lowered.cause).toBe("execution");
    expect(lowered.tool_name).toBe("read_file");
    expect(lowered.message).toContain("disk offline");
    // A code-side call is code → side-effect: it has no model tool-call
    // identity, so neither field is present on the envelope.
    expect(Object.keys(lowered).sort()).toEqual(
      ["cause", "kind", "message", "tool_name"].sort(),
    );
    expect(lowered).not.toHaveProperty("tool_call_id");
    expect(lowered).not.toHaveProperty("raw_response");
  });

  it("CodeToolError is distinct from ModelToolError: only the model-loop adapter failure carries tool_call_id + raw_response", () => {
    const code: CodeToolError = lowerToolExecuteThrow(new Error("boom"), "search");
    // A model-loop adapter failure (`kind:"model_tool"`) — the same execute()
    // outcome fed back to the model — carries both identity fields.
    const modelLoop: ModelToolError = {
      kind: "model_tool",
      message: "boom",
      tool_name: "search",
      tool_call_id: "toolu_123",
      raw_response: "…",
    };
    // The two envelopes are distinguished by `kind` and by field presence.
    expect(code.kind).not.toBe(modelLoop.kind);
    expect("tool_call_id" in code).toBe(false);
    expect("raw_response" in code).toBe(false);
    expect("tool_call_id" in modelLoop).toBe(true);
    expect("raw_response" in modelLoop).toBe(true);
  });
});
