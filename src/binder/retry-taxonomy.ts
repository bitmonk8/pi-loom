// V11f / V11f-T — Binder per-class retry budget and failure taxonomy (hard
// ceiling #3).
//
// This module owns the runtime that drives the binder's per-slash-invocation
// retry budget and renders the six failure-mode templates through the shared
// V11e system-note discipline:
//
//   - `runBinderWithRetries` — the per-class retry budget driver
//     (determinism-cancellation-failure.md §"Per-invocation retry budget",
//     hard-ceilings/ceilings-3-and-4.md §HC3). Each binder attempt is classified
//     independently (the provider-error classifier of V9j, combined with the
//     post-classifier envelope / AJV checks); a transport-class or
//     malformed-envelope-class failure is eligible for a single retry of its own
//     class (HC3-a / HC3-b), an AJV-on-`args` failure is terminal (HC3-c), and
//     the two budgets interleave so the runtime issues at most 3 binder LLM
//     calls per slash invocation (HC3-d). When the chain ends with both budgets
//     exhausted the surfaced note is the most-recent failure's row (HC3-e).
//   - `renderBinderSystemNote` — the six verbatim failure-mode templates
//     (determinism-cancellation-failure.md §"Failure-mode templates"), rendered
//     through the V11e line discipline (`renderFailureNote` / `capSystemNote`).
//     `<provider>` is the classifier's `TransportError.provider` (`Model<Api>.api`);
//     `<ajv-summary>` is the joined `ValidationIssue` summary below.
//   - `renderAjvSummary` / `renderDepthWalkAjvSummary` — the `<ajv-summary>`
//     placeholder: the in-order `<path> <message>` concatenation joined by the
//     two-character separator `; ` (`renderAjvSummary`), and the depth-walk
//     fast-fail single-issue form (`renderDepthWalkAjvSummary`, no separator).
//   - `classifyBinderArgs` — the cross-ceiling `params`-boundary classification
//     (CIO-1 / CIO-3): the depth-walk runs before AJV; a depth breach at the
//     `params` boundary cross-routes (ceiling #4 → ceiling #3) into the
//     AJV-on-`args` class with the depth-walk-synthesised summary, an AJV
//     failure classifies with the joined summary, and a clean value is `ok`.
//
// V11f-T (tests-task) declares these seam shapes and stubs every behaviour-
// bearing function inertly — the renderers return the `UNIMPLEMENTED` sentinel,
// `runBinderWithRetries` returns a zero-call sentinel result without issuing any
// attempt, and `classifyBinderArgs` always reports `ok` — so the failing tests
// compile and red on their own primary assertions. The paired V11f
// implementation leaf fills them in.
//
// Spec: binder/determinism-cancellation-failure.md (§"Failure-class taxonomy",
// §"Failure-mode templates", §"Per-invocation retry budget"),
// hard-ceilings/ceilings-3-and-4.md (§HC3, CIO-1 / CIO-3).

import type { ValidationIssue } from "../runtime/query-error";
import type { DepthViolationIssue, DepthWalkResult } from "../runtime/depth-walk";

/**
 * The worst-case binder LLM-call budget per slash invocation
 * (HC3-d): 1 initial attempt + at most 1 transport-class retry + at most 1
 * malformed-envelope-class retry.
 */
export const MAX_BINDER_LLM_CALLS = 3;

/**
 * The inert sentinel every string-producing V11f-T stub returns so no rendered
 * note or summary coincides with a pinned template — each template test reds on
 * its own equality assertion. The paired V11f implementation removes it.
 */
export const UNIMPLEMENTED = "\u0000UNIMPLEMENTED\u0000";

/** The two-character `<ajv-summary>` inter-issue separator (spec: `; `). */
const AJV_SUMMARY_SEPARATOR = "; ";

// --- the six failure-mode surfaces ------------------------------------------

/**
 * A binder outcome that surfaces as one of the six failure-mode templates
 * (determinism-cancellation-failure.md §"Failure-mode templates"). `needs_info`
 * and `ambiguous` carry model-supplied `message`; `transport` carries the
 * classifier's `provider` (`Model<Api>.api`) and `message`; `ajv_args` carries
 * the rendered `<ajv-summary>`; `malformed` and `cancelled` are fixed-suffix.
 */
export type BinderFailureSurface =
  | { readonly kind: "needs_info"; readonly message: string }
  | { readonly kind: "ambiguous"; readonly message: string }
  | { readonly kind: "transport"; readonly provider: string; readonly message: string }
  | { readonly kind: "malformed" }
  | { readonly kind: "ajv_args"; readonly ajvSummary: string }
  | { readonly kind: "cancelled" };

/**
 * Render a binder failure surface to its verbatim system-note template
 * (determinism-cancellation-failure.md §"Failure-mode templates"), through the
 * V11e line discipline. Only the `<…>` placeholders are interpolated; the
 * surrounding template text is fixed.
 *
 * V11f-T stub: returns {@link UNIMPLEMENTED} for every surface so each template
 * test reds on its own equality assertion. The paired V11f implementation fills
 * this in (composing through `renderFailureNote` / `capSystemNote`).
 */
export function renderBinderSystemNote(
  _loomName: string,
  _surface: BinderFailureSurface,
): string {
  return UNIMPLEMENTED;
}

// --- the `<ajv-summary>` placeholder ----------------------------------------

/**
 * The `<ajv-summary>` placeholder (determinism-cancellation-failure.md
 * §"Failure-mode templates"): the in-order `<path> <message>` concatenation of
 * the failed validation's `ValidationIssue` entries, joined by the
 * two-character separator `; ` in canonical `validation_errors` order. An empty
 * issue list renders the empty string.
 *
 * V11f-T stub: returns {@link UNIMPLEMENTED} so the summary tests red on their
 * own assertions. The paired V11f implementation fills this in.
 */
export function renderAjvSummary(_issues: readonly ValidationIssue[]): string {
  return UNIMPLEMENTED;
}

/**
 * The depth-walk fast-fail `<ajv-summary>` form (determinism-cancellation-
 * failure.md §"Failure-mode templates", Depth-walk fast-fail clause): the single
 * canonical depth-walk `ValidationIssue` rendered as `<JSON-Pointer> <message>`
 * — single-issue form, **no `; ` separator**. Synthesised from the depth-walk
 * issue (`schema_keyword: "maxDepth"`, message `"JSON document depth exceeds 5"`),
 * NOT from an `errorsText` traversal of the (empty) AJV `errors` array — AJV did
 * not run at this site.
 *
 * V11f-T stub: returns {@link UNIMPLEMENTED} so the depth-walk test reds on its
 * own assertion. The paired V11f implementation fills this in.
 */
export function renderDepthWalkAjvSummary(_issue: DepthViolationIssue): string {
  return UNIMPLEMENTED;
}

// keep the separator part of the module's declared surface for the paired impl.
void AJV_SUMMARY_SEPARATOR;

// --- cross-ceiling `params`-boundary classification (CIO-1 / CIO-3) ---------

/** The `params`-boundary classification of a `kind: "ok"` binder envelope's args. */
export type BinderArgsClassification =
  | { readonly kind: "ok" }
  | { readonly kind: "ajv_args"; readonly ajvSummary: string };

/** Inputs to {@link classifyBinderArgs}: the depth-walk result then the AJV issues. */
export interface ClassifyBinderArgsInput {
  /** The depth-walk verdict over the merged `args` (runs before AJV per CIO-3). */
  readonly depth: DepthWalkResult;
  /** The AJV `ValidationIssue`s over the merged `args`; empty when depth breached. */
  readonly ajvIssues: readonly ValidationIssue[];
}

/**
 * Classify a `kind: "ok"` binder envelope's args at the `params` boundary
 * (CIO-3: depth-walk before AJV; CIO-1: ceiling #4's slash-load `params` arm
 * cross-routes into ceiling #3's AJV-on-`args` class). A depth breach yields the
 * AJV-on-`args` class with the depth-walk-synthesised summary; a non-empty AJV
 * issue set yields the AJV-on-`args` class with the joined summary; a clean
 * value is `ok`.
 *
 * V11f-T stub: always returns `{ kind: "ok" }` so the depth-walk classification
 * test reds on its own assertion. The paired V11f implementation fills this in.
 */
export function classifyBinderArgs(
  _input: ClassifyBinderArgsInput,
): BinderArgsClassification {
  return { kind: "ok" };
}

// --- the per-class retry budget driver --------------------------------------

/**
 * The classified outcome of a single binder attempt (determinism-cancellation-
 * failure.md §"Failure-class taxonomy"). `ok` / `needs_info` / `ambiguous` /
 * `ajv_args` are terminal (no retry); `transport` and `malformed` are the two
 * retry-eligible classes. ContextOverflow folds into `transport` before it
 * reaches the driver (context-overflow-handling clause).
 */
export type BinderAttemptOutcome =
  | { readonly kind: "ok" }
  | { readonly kind: "needs_info"; readonly message: string }
  | { readonly kind: "ambiguous"; readonly message: string }
  | { readonly kind: "ajv_args"; readonly ajvSummary: string }
  | { readonly kind: "transport"; readonly provider: string; readonly message: string }
  | { readonly kind: "malformed" };

/** Inputs to {@link runBinderWithRetries}. */
export interface BinderRetryInput {
  /**
   * Issue one binder LLM call and return its classified outcome. `attemptIndex`
   * is 0 for the initial attempt and increments per retry. The driver invokes
   * this at most {@link MAX_BINDER_LLM_CALLS} times per slash invocation.
   */
  readonly attempt: (attemptIndex: number) => Promise<BinderAttemptOutcome>;
}

/** The result of the retry budget driver. */
export interface BinderRetryResult {
  /** The number of binder LLM calls issued (1 … {@link MAX_BINDER_LLM_CALLS}). */
  readonly callCount: number;
  /** The terminal (most-recent) outcome whose row surfaces per HC3-e. */
  readonly outcome: BinderAttemptOutcome;
}

/**
 * Drive the binder's per-class retry budget (HC3-a … HC3-e). Each attempt is
 * classified independently; a transport-class failure consumes the single
 * transport budget on retry (HC3-a), a malformed-envelope failure the single
 * malformed budget (HC3-b), and the two interleave so at most
 * {@link MAX_BINDER_LLM_CALLS} calls are issued (HC3-d). AJV-on-`args` failures
 * are terminal (HC3-c). The returned `outcome` is the most-recent failure's row
 * (HC3-e).
 *
 * V11f-T stub: returns a zero-call sentinel result WITHOUT issuing any attempt,
 * so every budget test reds on its own `callCount` / `outcome` assertion. The
 * paired V11f implementation fills this in.
 */
export async function runBinderWithRetries(
  _input: BinderRetryInput,
): Promise<BinderRetryResult> {
  return { callCount: 0, outcome: { kind: "ok" } };
}
