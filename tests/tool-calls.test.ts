import { describe, expect, it } from "vitest";
import type { Diagnostic, SourceRange } from "../src/diagnostics/diagnostic";
import {
  checkToolCallArguments,
  codeToolErrorCauses,
  codeToolErrorKind,
  lowerAcceptedLoomCallableReturn,
  lowerAcceptedPiToolReturn,
  modelToolErrorKind,
  surfaceLoomCallableCalleeFailure,
  surfaceLoomCallableInputValidationFailure,
  type ToolCallArgCheckInput,
} from "../src/runtime/tool-call";
import type { CancelledError } from "../src/runtime/query-error";
import type { ResultValue } from "../src/runtime/value";

// V14a-T — failing tests for the paired `V14a` "Tool calls (code-side) and
// `CodeToolError`" implementation leaf.
//
// Spec: tool-calls.md; pi-integration-contract/host-interfaces-core.md
// §"Tool execution from loom code"; errors-and-results/queryerror-variants.md.
//
// Each test reds on its own primary assertion because the V14a behaviour is
// absent: `checkToolCallArguments` raises no diagnostics, the closed-enum /
// distinctness surfaces are empty / `""`, the accepted-path lowerings return an
// inert `Err`, and the `.loom`-callable failure surfaces return `kind: ""`
// values. No test reds on a compile error, a missing fixture, or a harness
// throw.

/** A throwaway 1:1–1:2 span for the located seam calls. */
function span(): SourceRange {
  return { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } };
}

const FILE = "call.loom";

/** The first diagnostic carrying `code`, if any. */
function withCode(diags: readonly Diagnostic[], code: string): Diagnostic | undefined {
  return diags.find((d) => d.code === code);
}

/** Base fields shared by every `checkToolCallArguments` input in this file. */
function argSite(
  overrides: Partial<ToolCallArgCheckInput> & Pick<ToolCallArgCheckInput, "toolName" | "calleeKind" | "positionalCount">,
): ToolCallArgCheckInput {
  return { file: FILE, range: span(), ...overrides };
}

// --- Parse-time argument checks (arity → not-literal → type) ---------------

describe("code-side tool-call argument checks (tool-calls.md §Argument shape)", () => {
  it("loom/parse/tool-arg-arity: a multi-argument Pi-tool call fires", () => {
    // A two-argument Pi-tool call `read({...}, {...})` is arity-invalid
    // regardless of the argument shapes.
    const diags = checkToolCallArguments(
      argSite({ toolName: "read", calleeKind: "pi-tool", positionalCount: 2 }),
    );
    const d = withCode(diags, "loom/parse/tool-arg-arity");
    expect(d, "loom/parse/tool-arg-arity").toBeDefined();
    // Message template from code-registry-parse.md:
    //   `Pi tool '<name>' takes a single object argument; got <count>`
    expect(d?.message).toBe("Pi tool 'read' takes a single object argument; got 2");
  });

  it("loom/parse/tool-arg-not-literal: a non-literal single Pi-tool argument fires", () => {
    // The single positional argument contains a function call — outside the
    // loom literal sublanguage.
    const diags = checkToolCallArguments(
      argSite({
        toolName: "read",
        calleeKind: "pi-tool",
        positionalCount: 1,
        argumentSource: "{ path: resolve(x) }",
      }),
    );
    const d = withCode(diags, "loom/parse/tool-arg-not-literal");
    expect(d, "loom/parse/tool-arg-not-literal").toBeDefined();
    // Message template prefix from code-registry-parse.md:
    //   `Pi-tool argument must be a literal-sublanguage form; offending sub-expression: <expr>`
    expect(d?.message).toMatch(
      /^Pi-tool argument must be a literal-sublanguage form; offending sub-expression: /,
    );
  });

  it("loom/parse/tool-arg-type-mismatch: a statically-resolvable `.loom`-callable argument mismatch fires", () => {
    const diags = checkToolCallArguments(
      argSite({
        toolName: "summarise",
        calleeKind: "loom-callable",
        positionalCount: 1,
        staticResolution: {
          resolvable: true,
          matches: false,
          expected: "string",
          actual: "number",
        },
      }),
    );
    const d = withCode(diags, "loom/parse/tool-arg-type-mismatch");
    expect(d, "loom/parse/tool-arg-type-mismatch").toBeDefined();
    // Message template from code-registry-parse.md:
    //   `tool '<name>' argument type mismatch: expected <expected>, got <actual>`
    expect(d?.message).toBe(
      "tool 'summarise' argument type mismatch: expected string, got number",
    );
  });

  it("loom/parse/tool-arg-arity / tool-arg-type-mismatch: arity is checked before type", () => {
    // A call that both over-supplies positional arguments AND type-mismatches
    // fires only the arity code — arity is checked before type.
    const diags = checkToolCallArguments(
      argSite({
        toolName: "summarise",
        calleeKind: "loom-callable",
        positionalCount: 2,
        staticResolution: {
          resolvable: true,
          matches: false,
          expected: "string",
          actual: "number",
        },
      }),
    );
    expect(withCode(diags, "loom/parse/tool-arg-arity"), "arity fires").toBeDefined();
    expect(
      withCode(diags, "loom/parse/tool-arg-type-mismatch"),
      "type-mismatch suppressed by earlier arity failure",
    ).toBeUndefined();
  });
});

// --- CodeToolError closed enum + distinctness from ModelToolError ----------

// cka-13 / V14a: the TOOL code-keyed obligation area (tool-calls.md) closes across
// V14a (this code-side call + CodeToolError + return-type table), V14b, V14c,
// V14e; the assertions in this file witness the V14a facet against the shipped
// code-side tool-call machinery.
describe("CodeToolError (tool-calls.md TOOL code-keyed area; queryerror-variants.md)", () => {
  it("CodeToolError.cause is closed at validation / execution / cancelled / unknown_tool", () => {
    expect(codeToolErrorCauses()).toEqual([
      "validation",
      "execution",
      "cancelled",
      "unknown_tool",
    ]);
  });

  it("CodeToolError is distinct from ModelToolError (different `kind` wire tags)", () => {
    expect(codeToolErrorKind()).toBe("code_tool");
    expect(modelToolErrorKind()).toBe("model_tool");
    expect(codeToolErrorKind()).not.toBe(modelToolErrorKind());
  });
});

// --- Accepted-path return lowering (Pi tool → Ok(string); `.loom` → Ok(T)) --

describe("accepted-path return lowering (tool-calls.md §Return type)", () => {
  it("a conforming Pi-tool return lowers to Ok(string) carrying the final output", () => {
    const result: ResultValue = lowerAcceptedPiToolReturn("file contents\nsecond line");
    expect(result.ok, "Pi-tool accepted path is Ok").toBe(true);
    if (result.ok) {
      expect(result.value).toBe("file contents\nsecond line");
    }
  });

  it("a conforming subagent-mode `.loom` return lowers to Ok(T) carrying the payload", () => {
    // The callee's inferred return type `T` — here a structured object payload.
    const payload = { severity: "high", label: "bug" };
    const result: ResultValue = lowerAcceptedLoomCallableReturn(payload);
    expect(result.ok, "`.loom`-callable accepted path is Ok").toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(payload);
    }
  });
});

// --- `.loom`-callable failure surface (Invoke*Error, never CodeToolError) ---

describe("`.loom`-callable failure surface (tool-calls.md §Failures)", () => {
  it("an input-validation failure surfaces as InvokeInfraError { cause: 'validation' }", () => {
    const err = surfaceLoomCallableInputValidationFailure(
      "./summariser.loom",
      "params failed input-schema validation",
    );
    expect(err.kind, "input-validation surfaces via InvokeInfraError").toBe("invoke_infra");
    expect(err.cause).toBe("validation");
    expect(err.callee_path).toBe("./summariser.loom");
    // Never a CodeToolError — the `.loom`-callable arm uses the invoke surface.
    expect(err.kind).not.toBe("code_tool");
  });

  it("a callee-returned failure surfaces as InvokeCalleeError carrying the inner error", () => {
    const inner: CancelledError = { kind: "cancelled", message: "aborted" };
    const err = surfaceLoomCallableCalleeFailure("./triage.loom", inner, "callee failed");
    expect(err.kind, "callee failure surfaces via InvokeCalleeError").toBe("invoke_callee");
    expect(err.callee_path).toBe("./triage.loom");
    expect(err.inner).toEqual(inner);
    expect(err.kind).not.toBe("code_tool");
  });
});
