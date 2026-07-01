import { describe, expect, it } from "vitest";
import {
  buildInvokeArgList,
  invokeArgListStyleDefinedInLoom10,
  readInvokeOptions,
  invokeFinalValueFromCalleeResult,
  type InvokeArg,
  type InvokeOptions,
} from "../src/runtime/invoke-args-options";
import { functionResult } from "../src/runtime/function-result";

// V15k-T — failing tests for the paired `V15k` invoke runtime arg/options and
// final-value propagation seam.
//
// Spec: invocation.md (INV-2 named-argument-invocation seam, INV-3 per-call-
// timeout / open-options seam, §Final-value propagation across callees),
// return.md (final-value contract), functions.md §Final value (FN-5). These
// facets are split out of V15a (invocation-core) per conventions.md
// §smallest-shippable-leaf.
//
// Each test cites its REQ-ID inline and reds on its own primary assertion
// because the V15k behaviour is absent:
//   - INV-2: `buildInvokeArgList` returns the wrong `style`; the style-defined
//     predicate is inverted.
//   - INV-3: `readInvokeOptions` drops the present known-field values.
//   - FN-5:  `invokeFinalValueFromCalleeResult` returns a fixed `propagated`
//     sentinel regardless of the callee outcome.
// No test reds on a compile error, a missing fixture, or a harness throw.

// --------------------------------------------------------------------------
// INV-2 — the AST arg list carries `style: "positional" | "named"`;
//         only positional is defined in loom 1.0.
// --------------------------------------------------------------------------

describe("INV-2 — invocation AST arg list carries a positional/named style discriminator (invocation.md INV-2)", () => {
  it("INV-2: a loom 1.0 invoke arg list is built with style 'positional', preserving its args", () => {
    const args: readonly InvokeArg[] = [{ value: "topic" }, { value: 3 }];

    const list = buildInvokeArgList(args);

    // loom 1.0's only invocation surface syntax is positional.
    expect(list.style).toBe("positional");
    expect(list.args).toEqual(args);
  });

  it("INV-2: only the 'positional' style has defined loom 1.0 behaviour; 'named' does not", () => {
    // The AST discriminator admits both arms, but the deferred named-argument
    // surface is not part of the loom 1.0 grammar — only positional is defined.
    expect(invokeArgListStyleDefinedInLoom10("positional")).toBe(true);
    expect(invokeArgListStyleDefinedInLoom10("named")).toBe(false);
  });
});

// --------------------------------------------------------------------------
// INV-3 — the invoke-options record is an open struct (additive per-call-timeout
//         seam): consumers read the known slots and tolerate unknown fields.
// --------------------------------------------------------------------------

describe("INV-3 — the runtime invoke-options record is an open struct (invocation.md INV-3)", () => {
  it("INV-3: readInvokeOptions returns the three known loom 1.0 slots verbatim", () => {
    const cancellation = { token: "abort-1" };
    const calleeHandle = { path: "/proj/child.loom" };
    const returnSchema = { $id: "Plan" };
    const options: InvokeOptions = { cancellation, calleeHandle, returnSchema };

    const resolved = readInvokeOptions(options);

    expect(resolved.cancellation).toBe(cancellation);
    expect(resolved.calleeHandle).toBe(calleeHandle);
    expect(resolved.returnSchema).toBe(returnSchema);
  });

  it("INV-3: an additive unknown field (a future per-call timeout) is tolerated and does not disturb the known slots", () => {
    const cancellation = { token: "abort-2" };
    // The open struct admits a field not in the loom 1.0 record shape — the
    // additive per-call-timeout seam — with no type error and no effect on the
    // known-slot projection.
    const options: InvokeOptions = {
      cancellation,
      calleeHandle: undefined,
      returnSchema: undefined,
      perCallTimeoutMs: 5000,
    };

    // The unknown field is readable as `unknown` (open struct), and the known
    // slot still projects correctly alongside it.
    expect(options.perCallTimeoutMs).toBe(5000);
    expect(readInvokeOptions(options).cancellation).toBe(cancellation);
  });
});

// --------------------------------------------------------------------------
// FN-5 — the callee's produced final value propagates to the invoke caller on
//        success and is absent on fail/cancel, against V3d's function-result seam.
// --------------------------------------------------------------------------

describe("FN-5 — callee final value propagates to the invoke caller on success, absent on fail/cancel (functions.md FN-5)", () => {
  it("FN-5: on the callee's success outcome the produced final value propagates to the invoke caller", () => {
    // The callee's success result comes from V3d's function-result seam.
    const calleeResult = functionResult("success", "the-plan");

    const observed = invokeFinalValueFromCalleeResult(calleeResult);

    expect(observed.kind).toBe("propagated");
    if (observed.kind === "propagated") {
      expect(observed.value).toBe("the-plan");
    }
  });

  it("FN-5: on the callee's fail outcome no final value flows to the invoke caller", () => {
    const calleeResult = functionResult("fail", "the-plan");

    expect(invokeFinalValueFromCalleeResult(calleeResult).kind).toBe("absent");
  });

  it("FN-5: on the callee's cancel outcome no final value flows to the invoke caller", () => {
    const calleeResult = functionResult("cancel", "the-plan");

    expect(invokeFinalValueFromCalleeResult(calleeResult).kind).toBe("absent");
  });
});
