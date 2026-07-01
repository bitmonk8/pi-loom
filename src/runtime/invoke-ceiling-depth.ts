// V15j / V15j-T — the `invoke` ceiling-#4 depth `params` / `invoke<T>`-return
// live-carrier seam.
//
// This module owns the actual wrapping of a depth-6 JSON-document breach into
// the `InvokeInfraError` carrier at the two `invoke`-boundary ceiling-#4
// enforcement points — the runtime `invoke(...)` `params` argument boundary and
// the `invoke<T>` return-value boundary — building on the `V15a` invoke core and
// consulting `V5e`'s loom-owned depth walk. It is the delegated live-carrier
// witness for `V5e`'s `params` / `invoke<T>`-return routing rows: `V5e` proves
// the routing *decision* (`params-invoke` → `InvokeInfraError`, `invoke-return`
// → `InvokeInfraError`) in isolation, and this leaf proves the wrapping of a
// depth-6 breach into that carrier at each `invoke` site.
//
// The two enforcement points differ only in the `InvokeInfraError.cause` they
// carry (ceilings-3-and-4.md#ceiling-4-table, queryerror-variants.md
// §Invoke variants):
//
//   - `enforceInvokeParamsDepth`  — the runtime `invoke(...)` `params` argument
//     boundary, `cause: "validation"` (the input side). This is the runtime
//     `invoke` boundary, NOT the binder slash-load `params` boundary — per CIO-1
//     a ceiling-#4 breach at the slash-load `params` boundary cross-routes to
//     ceiling #3 (witnessed at `V11f` / `V4e`) and does not surface here.
//   - `enforceInvokeReturnDepth` — the `invoke<T>` return-value boundary,
//     `cause: "return_validation"`.
//
// Both run `V5e`'s depth walk over the materialised value *before* AJV (CIO-3):
// a within-cap value defers to the downstream AJV boundary (returns `undefined`)
// and a depth-6+ value trips the ceiling, wrapping the canonical depth-violation
// issue (`schema_keyword: "maxDepth"`, message `"JSON document depth exceeds 5"`)
// into the `InvokeInfraError` carrier and surfacing it as `Err(InvokeInfraError)`
// to the invoke parent.
//
// V15j-T (tests-task) declares the seam shapes and stubs both behaviour-bearing
// functions inertly — each never fires (returns `undefined`), so a depth-6 value
// yields no breach and the failing tests red on their own primary "expected a
// breach" assertion, per the per-phase TDD ritual's "fail red for the intended
// reason". The paired `V15j` implementation leaf fills in the depth-walk
// short-circuit and the `InvokeInfraError` wrapping.
//
// Spec: hard-ceilings/ceilings-3-and-4.md §"Per-boundary destination/surface
// table (ceiling #4)" (#ceiling-4-table, the `params` / `invoke<T>`-return rows)
// and CIO-1 (#cio-1) / CIO-3 (#cio-3); invocation.md §"Failures"
// (the `InvokeInfraError { cause: "validation" | "return_validation" }`
// carrier). Code-keyed obligation area `cka-10` (schema-subset.md, no numbered
// REQ-ID — `V15j` is its `params` / `invoke<T>`-return co-witness closing leaf).

import type { DepthViolationIssue } from "./depth-walk";
import type { InvokeInfraError } from "./query-error";
import type { ResultValue } from "./value";

/**
 * A depth-6 `invoke`-boundary ceiling-#4 breach, materialised at one of the two
 * `invoke` enforcement points (ceilings-3-and-4.md#ceiling-4-table, the `params`
 * and `invoke<T>`-return rows):
 *
 *   - `result` — the wrapped `Err(InvokeInfraError { cause, ... })` surfaced to
 *     the invoke parent, matching the per-boundary table's row;
 *   - `error`  — the `InvokeInfraError` carrier itself (`kind: "invoke_infra"`,
 *     the boundary-specific `cause`, canonical depth `message`, `callee_path`);
 *   - `issue`  — the loom-owned depth walk's `ValidationIssue`, carrying
 *     `schema_keyword: "maxDepth"` and the canonical
 *     `"JSON document depth exceeds 5"` message (sourced via `V5e`).
 */
export interface InvokeDepthBreach {
  readonly result: ResultValue;
  readonly error: InvokeInfraError;
  readonly issue: DepthViolationIssue;
}

/**
 * Enforce ceiling #4 at the runtime `invoke(...)` `params` argument boundary:
 * run `V5e`'s loom-owned depth walk over the materialised `params` value
 * *before* AJV (CIO-3), and — on a depth-6+ breach — surface it wrapped as
 * `Err(InvokeInfraError { cause: "validation", ... })` per the `params` /
 * `invoke(...)` row of the ceiling-#4 per-boundary table
 * (ceilings-3-and-4.md#ceiling-4-table). Returns `undefined` for a within-cap
 * value, deferring to the downstream AJV boundary.
 *
 * This is the runtime `invoke` boundary, NOT the binder slash-load `params`
 * boundary — per CIO-1 the slash-load arm cross-routes to ceiling #3 (witnessed
 * at `V11f` / `V4e`) and does not surface here.
 */
export function enforceInvokeParamsDepth(
  _calleePath: string,
  _paramsValue: unknown,
): InvokeDepthBreach | undefined {
  // V15j-T stub: never fires, so a depth-6 `params` value yields no breach and
  // the failing test reds on its own primary "expected a breach" assertion. The
  // paired `V15j` implementation runs the depth walk and wraps a depth-6 breach
  // into `Err(InvokeInfraError { cause: "validation", ... })`.
  return undefined;
}

/**
 * Enforce ceiling #4 at the `invoke<T>` return-value boundary: run `V5e`'s
 * loom-owned depth walk over the materialised return value *before* AJV
 * (CIO-3), and — on a depth-6+ breach — surface it wrapped as
 * `Err(InvokeInfraError { cause: "return_validation", ... })` per the
 * `invoke<T>` return-value row of the ceiling-#4 per-boundary table
 * (ceilings-3-and-4.md#ceiling-4-table). Returns `undefined` for a within-cap
 * value, deferring to the downstream AJV boundary.
 */
export function enforceInvokeReturnDepth(
  _calleePath: string,
  _returnValue: unknown,
): InvokeDepthBreach | undefined {
  // V15j-T stub: never fires, so a depth-6 return value yields no breach and the
  // failing test reds on its own primary "expected a breach" assertion. The
  // paired `V15j` implementation runs the depth walk and wraps a depth-6 breach
  // into `Err(InvokeInfraError { cause: "return_validation", ... })`.
  return undefined;
}
