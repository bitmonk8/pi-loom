// V15k / V15k-T — the invoke runtime arg/options and final-value seam.
//
// This module owns the three facets split out of `V15a` (invocation-core) per
// conventions.md §smallest-shippable-leaf, mirroring the V15f/V15g/V15h
// carve-out pattern:
//
//   - INV-2 — the invocation AST arg-list `style: "positional" | "named"`
//     discriminator. loom 1.0's only invocation surface syntax is positional,
//     so the `"positional"` arm is the only one with defined behaviour; the
//     deferred named-argument / `key=value` surface is not part of the loom 1.0
//     grammar. The seam lets that deferred surface land without rewriting AST
//     consumers (invocation.md INV-2).
//   - INV-3 — the runtime-internal invoke-options record is an **open struct**
//     (not a closed positional record): it carries the loom 1.0 per-call
//     configuration slots (cancellation hookup, resolved callee handle, typed-
//     return schema slot) and tolerates additive future fields (e.g. a per-call
//     timeout) without breaking consumers (invocation.md INV-3).
//   - FN-5 — the callee's produced *final value* propagates to the `invoke`
//     caller on the success outcome and is absent on fail/cancel, projected off
//     the `V3d` function-result seam (`FunctionResult`): on success the caller
//     receives the value; on failure (`?` propagation, panic, exhausted
//     ceiling) and cancellation no final value flows — the caller observes only
//     the corresponding `Err` envelope (functions.md FN-5, invocation.md
//     §Final-value propagation across callees, return.md).
//
// V15k (implementation) fills in the behaviour V15k-T's tests pin:
//   - `buildInvokeArgList` builds the arg list with `style: "positional"`.
//   - `invokeArgListStyleDefinedInLoom10` returns `true` only for `"positional"`.
//   - `readInvokeOptions` projects the three known slots verbatim while
//     tolerating additive unknown fields (open struct).
//   - `invokeFinalValueFromCalleeResult` propagates the callee's final value on
//     success and reports it absent on fail/cancel, off the V3d seam.
//
// Spec: invocation.md (INV-2, INV-3, §Final-value propagation across callees),
// return.md, functions.md §Final value (language definition).

import { type LoomValue } from "./value";
import { type FunctionResult } from "./function-result";

// --------------------------------------------------------------------------
// INV-2 — the invocation AST arg-list `style` discriminator
// --------------------------------------------------------------------------

/**
 * The invocation AST arg-list style discriminator (invocation.md INV-2). loom
 * 1.0's only invocation surface syntax is positional; `"named"` is the seam for
 * the deferred named-argument / `key=value` surface and has no defined loom 1.0
 * behaviour.
 */
export type InvokeArgListStyle = "positional" | "named";

/** One argument node in an invocation AST arg list. */
export interface InvokeArg {
  /** The already-typed argument value bound positionally to the callee param. */
  readonly value: LoomValue;
}

/**
 * The invocation AST arg-list node. It carries an explicit `style` discriminator
 * on each argument list so every AST consumer (argument-binding, arity checks,
 * the runtime trampoline, the lowered-tool-spec emitter) can switch on it
 * exhaustively rather than assuming positional (invocation.md INV-2).
 */
export interface InvokeArgList {
  readonly style: InvokeArgListStyle;
  readonly args: readonly InvokeArg[];
}

/**
 * Build the invocation AST arg-list node for a loom 1.0 `invoke(...)` call.
 * loom 1.0's only surface syntax is positional, so the built list always carries
 * `style: "positional"` (invocation.md INV-2).
 */
export function buildInvokeArgList(args: readonly InvokeArg[]): InvokeArgList {
  return { style: "positional", args };
}

/**
 * Whether an arg-list `style` has defined behaviour in loom 1.0 (invocation.md
 * INV-2): only `"positional"` does; `"named"` is a reserved seam with no loom
 * 1.0 grammar or behaviour.
 */
export function invokeArgListStyleDefinedInLoom10(
  style: InvokeArgListStyle,
): boolean {
  return style === "positional";
}

// --------------------------------------------------------------------------
// INV-3 — the open invoke-options struct
// --------------------------------------------------------------------------

/**
 * The runtime-internal options record passed into the invoke primitive
 * (invocation.md INV-3). It is an **open struct**, not a closed positional
 * record: it carries the loom 1.0 per-call configuration slots and tolerates
 * unknown (additive future) fields — the index signature is what lets the
 * deferred per-call-timeout extension land additively without breaking call
 * sites or fixtures. Consumers read the known slots and ignore the rest.
 */
export interface InvokeOptions {
  /** The per-call cancellation hookup (opaque at this seam). */
  readonly cancellation?: unknown;
  /** The resolved callee handle (opaque at this seam). */
  readonly calleeHandle?: unknown;
  /** The typed-return schema slot (opaque at this seam). */
  readonly returnSchema?: unknown;
  /** Open struct: additive future fields (e.g. a per-call timeout) are tolerated. */
  readonly [extra: string]: unknown;
}

/** The loom 1.0 known-field projection of the open invoke-options struct. */
export interface ResolvedInvokeOptions {
  readonly cancellation: unknown;
  readonly calleeHandle: unknown;
  readonly returnSchema: unknown;
}

/**
 * Project the loom 1.0 known configuration slots out of the open invoke-options
 * struct, tolerating (ignoring) any additive unknown field (invocation.md
 * INV-3). Reading the known slots must be unaffected by an unknown field's
 * presence — the additive-seam property.
 */
export function readInvokeOptions(options: InvokeOptions): ResolvedInvokeOptions {
  return {
    cancellation: options.cancellation,
    calleeHandle: options.calleeHandle,
    returnSchema: options.returnSchema,
  };
}

// --------------------------------------------------------------------------
// FN-5 — final-value propagation from the callee to the `invoke` caller
// --------------------------------------------------------------------------

/**
 * What the `invoke` caller observes of the callee's final value (functions.md
 * FN-5): on the callee's success outcome the produced final value propagates
 * (`propagated`); on failure and cancellation no final value flows and the
 * caller observes only the corresponding `Err` envelope (`absent`).
 */
export type InvokeFinalValueObservation =
  | { readonly kind: "propagated"; readonly value: LoomValue }
  | { readonly kind: "absent" };

/**
 * Project the `V3d` function-result seam's `FunctionResult` onto what the
 * `invoke` caller observes of the callee's final value (functions.md FN-5,
 * invocation.md §Final-value propagation across callees): a `present` result
 * propagates its value to the caller; an absent result (fail / cancel) yields no
 * final value.
 */
export function invokeFinalValueFromCalleeResult(
  result: FunctionResult,
): InvokeFinalValueObservation {
  if (result.present) {
    return { kind: "propagated", value: result.value as LoomValue };
  }
  return { kind: "absent" };
}
