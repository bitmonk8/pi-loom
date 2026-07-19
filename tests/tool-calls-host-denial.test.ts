import { describe, expect, it } from "vitest";
import type { CodeToolError } from "../src/runtime/query-error";
import {
  classifyHostDenial,
  isHostDenial,
  type HostToolOutcome,
} from "../src/runtime/tool-call-host-denial";

// V14d-T — failing tests for the paired `V14d` "Code-tool host-denial surface"
// implementation leaf.
//
// Spec: pi-integration-contract/trust-boundary.md §"No additional access
// channels" (PIC-52) — a host-side denial (a value thrown from the tool's
// `execute()`, or a tool return that signals failure via `isError: true`)
// reaches theta code as `Err(QueryError { kind: "code_tool", cause: "execution",
// ... })`, and silent success on denial is forbidden. See also
// pi-integration-contract/host-interfaces-core.md §"Tool execution from theta
// code" and tool-calls.md §"Failures".
//
// Each test reds on its own primary assertion because the V14d behaviour is
// absent: `isHostDenial` returns `false` for every outcome, and
// `classifyHostDenial` returns the *forbidden* silent-`Ok` accepted outcome for
// every input (including a denial). No test reds on a compile error, a missing
// fixture, or a harness throw.

/** Narrow a lowered `Result`'s `Err` payload back to the `CodeToolError` carrier. */
function asCodeToolError(result: {
  readonly ok: boolean;
  readonly error?: unknown;
}): CodeToolError {
  expect(result.ok, "a host-side denial lowers to Err, never Ok (PIC-52)").toBe(false);
  return result.error as unknown as CodeToolError;
}

const throwOutcome = (thrown: unknown): HostToolOutcome => ({ kind: "throw", thrown });
const returnOutcome = (
  content: readonly { type: "text"; text: string }[],
  isError?: boolean,
): HostToolOutcome =>
  isError === undefined
    ? { kind: "return", envelope: { content } }
    : { kind: "return", envelope: { content, isError } };

// ===========================================================================
// PIC-52 — a THROWN host-side denial reaches theta code as
// Err(CodeToolError { kind: "code_tool", cause: "execution" }), never silent Ok.
// ===========================================================================

describe("V14d-T — thrown host-side denial → Err(code_tool/execution) (trust-boundary.md PIC-52)", () => {
  it("PIC-52: a thrown denial classifies as `denied` (not the silent-Ok accepted path)", () => {
    const lowering = classifyHostDenial(
      throwOutcome(new Error("EACCES: permission denied, open '/etc/shadow'")),
      "read",
    );
    // Primary: a host-side denial is a `denied` outcome, not the accepted path.
    expect(lowering.kind, "a thrown host denial is a denial, not accepted (PIC-52)").toBe(
      "denied",
    );
  });

  it("PIC-52: a thrown denial lowers to Err(CodeToolError { kind: 'code_tool', cause: 'execution' })", () => {
    const lowering = classifyHostDenial(
      throwOutcome(new Error("network blocked by host grant")),
      "fetch",
    );
    expect(lowering.kind).toBe("denied");
    if (lowering.kind !== "denied") return;
    const error = asCodeToolError(lowering.result);
    expect(error.kind, "PIC-52 denial carries kind 'code_tool'").toBe("code_tool");
    expect(error.cause, "PIC-52 denial carries cause 'execution'").toBe("execution");
    expect(error.tool_name).toBe("fetch");
    // The denial reaches theta code as the *carrier* on the denied arm too.
    expect(lowering.error.kind).toBe("code_tool");
    expect(lowering.error.cause).toBe("execution");
  });

  it("PIC-52: a thrown denial NEVER resolves as a silent Ok", () => {
    const lowering = classifyHostDenial(throwOutcome("bare host denial"), "bash");
    expect(lowering.kind).toBe("denied");
    if (lowering.kind !== "denied") return;
    // Silent success on denial is forbidden.
    expect(lowering.result.ok, "silent success on denial is forbidden (PIC-52)").toBe(false);
  });
});

// ===========================================================================
// PIC-52 — an `isError: true` host-side tool RETURN reaches theta code as
// Err(CodeToolError { kind: "code_tool", cause: "execution" }), never silent Ok.
// The content-only accepted-path lowering reads only `content`, so absent this
// guard the denial would silently lower to Ok(<content text>).
// ===========================================================================

describe("V14d-T — isError:true host-side return → Err(code_tool/execution) (trust-boundary.md PIC-52)", () => {
  it("PIC-52: an `{ content, isError: true }` return classifies as `denied`, not silently accepted", () => {
    const lowering = classifyHostDenial(
      returnOutcome([{ type: "text", text: "access denied by host policy" }], true),
      "write",
    );
    // Primary: an `isError: true` return is a denial — NOT a silent Ok(<content>).
    expect(
      lowering.kind,
      "an isError:true host return is a denial, not accepted (PIC-52)",
    ).toBe("denied");
  });

  it("PIC-52: an isError:true return lowers to Err(CodeToolError { kind: 'code_tool', cause: 'execution' })", () => {
    const lowering = classifyHostDenial(
      returnOutcome([{ type: "text", text: "denied" }], true),
      "edit",
    );
    expect(lowering.kind).toBe("denied");
    if (lowering.kind !== "denied") return;
    const error = asCodeToolError(lowering.result);
    expect(error.kind, "PIC-52 denial carries kind 'code_tool'").toBe("code_tool");
    expect(error.cause, "PIC-52 denial carries cause 'execution'").toBe("execution");
    expect(error.tool_name).toBe("edit");
  });

  it("PIC-52: an isError:true return NEVER resolves as a silent Ok, even with resolvable content text", () => {
    // A denial-signalling return carries text content; the content-only accepted
    // lowering would otherwise produce a silent Ok(<content text>).
    const lowering = classifyHostDenial(
      returnOutcome([{ type: "text", text: "you shall not pass" }], true),
      "read",
    );
    expect(lowering.kind).toBe("denied");
    if (lowering.kind !== "denied") return;
    expect(lowering.result.ok, "silent success on denial is forbidden (PIC-52)").toBe(false);
  });
});

// ===========================================================================
// PIC-52 — the denial-recognition predicate, and the non-denial complement:
// a clean (non-denial) return is NOT a denial and lowers to Ok, so the
// "never silent Ok" rule fires only on a genuine denial (the classifier does
// not over-fire and turn every return into an Err).
// ===========================================================================

describe("V14d-T — host-denial recognition and the non-denial complement (trust-boundary.md PIC-52)", () => {
  it("PIC-52: isHostDenial recognises both denial forms and rejects non-denials", () => {
    // Primary (reds against the inert stub): both denial forms are recognised.
    expect(
      isHostDenial(throwOutcome(new Error("denied"))),
      "a throw is a host-side denial (PIC-52)",
    ).toBe(true);
    expect(
      isHostDenial(returnOutcome([{ type: "text", text: "denied" }], true)),
      "an isError:true return is a host-side denial (PIC-52)",
    ).toBe(true);
    // Complement: a return with no / falsy `isError` is not a denial. Folded in
    // here (rather than a standalone test) so no test in this suite passes while
    // the V14d predicate is the inert blanket-`false` stub.
    expect(
      isHostDenial(returnOutcome([{ type: "text", text: "ok" }])),
      "a return with no isError flag is not a denial (PIC-52)",
    ).toBe(false);
    expect(
      isHostDenial(returnOutcome([{ type: "text", text: "ok" }], false)),
      "a return with isError:false is not a denial (PIC-52)",
    ).toBe(false);
  });

  it("PIC-52: a non-denial return lowers to Ok(<joined text>) (the denial guard does not over-fire)", () => {
    const lowering = classifyHostDenial(
      returnOutcome([
        { type: "text", text: "line one" },
        { type: "text", text: "line two" },
      ]),
      "read",
    );
    // Primary: a clean return is accepted and carries the joined text — the
    // denial classification does not swallow a legitimate success into an Err.
    expect(lowering.kind, "a non-denial return is accepted (PIC-52)").toBe("accepted");
    if (lowering.kind !== "accepted") return;
    expect(lowering.result.ok).toBe(true);
    if (lowering.result.ok) {
      expect(lowering.result.value).toBe("line one\nline two");
    }
  });
});
