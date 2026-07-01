// V5e / V5e-T — the loom-owned JSON-document depth walk (hard ceiling #4).
//
// Spec: schema-subset.md §"Depth Enforcement" (the counting algorithm, the
// `depth ≤ 5` cap, the canonical `schema_keyword: "maxDepth"` /
// `"JSON document depth exceeds 5"` / `cause: "schema_validation"` error shape,
// and the five enforcement points); hard-ceilings/ceilings-3-and-4.md
// §"Per-boundary destination/surface table (ceiling #4)" (#ceiling-4-table) and
// CIO-3 (#cio-3, the depth-walk-before-AJV ordering at every AJV boundary).
// Code-keyed obligation area `cka-10` (schema-subset.md, no numbered REQ-ID).
//
// This module owns two pure, stateless Class-2 seams — categorically like
// `V16a`'s cross-ceiling arbitration seam: the decision is exercised directly
// in isolation and the *live* AJV-boundary sites (typed-query response,
// model-driven / code-driven tool args, `params`, `invoke<T>` return) are built
// downstream by the site-owner leaves (`V13c`, `V14e`, `V15j`, `V4e`) that
// consult this seam. The seam runs no AJV, receives no events, and owns none of
// the per-boundary carriers:
//
//   1. `depthWalk(value)` — the recursive descent over a *materialised* JSON
//      value that fast-fails the first node whose depth would exceed 5,
//      producing the canonical depth-violation `ValidationIssue`
//      (`schema_keyword: "maxDepth"`, message `"JSON document depth exceeds 5"`,
//      `cause: "schema_validation"`). `jsonDepth(value)` exposes the depth
//      computation itself (scalar / empty → 1; non-empty → 1 + max child;
//      `anyOf` arms add no level because depth is measured against the one
//      materialised arm).
//   2. `routeDepthBoundary(site)` — the per-boundary routing *decision*: which
//      of ceiling #4's five enforcement points maps to which destination
//      surface class. The actual wrapping of a depth-6 breach into each carrier
//      is owned by the site-owner leaves; this seam decides only the routing.
//
// V5e-T (tests-task) declares the seam shapes and stubs both behaviour-bearing
// functions inertly — `jsonDepth` returns a wrong constant, `depthWalk` never
// fires, and `routeDepthBoundary` deranges the site→destination map — so the
// failing tests compile and red on their own primary assertions. The paired
// `V5e` implementation leaf fills in the counting algorithm, the fast-fail
// short-circuit, the canonical issue shape, and the routing table.

/** The JSON-document depth cap loom fixes for itself (schema-subset.md §Depth). */
export const MAX_JSON_DEPTH = 5;

/**
 * The canonical depth-violation `schema_keyword` value — the only
 * `schema_keyword` loom emits that is not a literal AJV keyword
 * (schema-subset.md §Depth Enforcement, §Error shape).
 */
export const DEPTH_VIOLATION_SCHEMA_KEYWORD = "maxDepth";

/** The canonical depth-violation message (schema-subset.md §Error shape). */
export const DEPTH_VIOLATION_MESSAGE = "JSON document depth exceeds 5";

/**
 * The single `ValidationIssue`-shaped record a depth breach produces (the
 * `ValidationIssue` element schema in errors-and-results/queryerror-variants.md:
 * `path`, `message`, `schema_keyword`). `path` is the RFC-6901 JSON Pointer to
 * the first too-deep node.
 */
export interface DepthViolationIssue {
  readonly path: string;
  readonly message: string;
  readonly schema_keyword: string;
}

/**
 * The depth-walk outcome. A breach carries `cause: "schema_validation"` even
 * though the walk short-circuits before AJV runs (schema-subset.md §Error
 * shape) plus the canonical single issue.
 */
export type DepthWalkResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly cause: "schema_validation";
      readonly issue: DepthViolationIssue;
    };

/**
 * The five ceiling-#4 enforcement points, with the `params` site split into its
 * two call-site arms (the per-boundary table's "depends on call site" row):
 *
 * - `"typed-query-response"`   — the model's final assistant JSON (row #1)
 * - `"tool-args-model-driven"` — a model-emitted `tool_use` args payload (row #2)
 * - `"tool-args-code-driven"`  — a code-driven `<name>(args)` args value (row #3)
 * - `"params-invoke"`          — `params` validation reached via `invoke(...)` (row #4, invoke arm)
 * - `"params-slash-load"`      — `params` validation reached at slash-load (row #4, slash-load arm)
 * - `"invoke-return"`          — an `invoke<T>` return value (row #5)
 */
export type DepthBoundarySite =
  | "typed-query-response"
  | "tool-args-model-driven"
  | "tool-args-code-driven"
  | "params-invoke"
  | "params-slash-load"
  | "invoke-return";

/**
 * The destination surface class each enforcement point routes a depth breach
 * to (ceiling-4-table). `"model-feedback"` and `"ceiling-3-cross-route"`
 * produce no loom-code `Err` at this seam (decision-only): the model-driven row
 * feeds a tool-result back to the model, and the slash-load `params` row
 * cross-routes into ceiling #3's load-time system-note classification.
 */
export type DepthDestination =
  | "ValidationError"
  | "model-feedback"
  | "CodeToolError"
  | "InvokeInfraError"
  | "ceiling-3-cross-route";

// --------------------------------------------------------------------------
// V5e-T inert stubs — see the module header. The paired V5e leaf fills these.
// --------------------------------------------------------------------------

/**
 * The depth computation over a materialised JSON value (schema-subset.md
 * §Counting algorithm). V5e-T stub: returns a wrong constant so every
 * depth-count assertion reds on its own primary assertion.
 */
export function jsonDepth(_value: unknown): number {
  return 0;
}

/**
 * The depth walk: fast-fails the first node whose depth would exceed
 * `MAX_JSON_DEPTH`, producing the canonical depth-violation issue. V5e-T stub:
 * never fires (always `{ ok: true }`) so the depth-6 breach assertion reds.
 */
export function depthWalk(_value: unknown): DepthWalkResult {
  return { ok: true };
}

/**
 * The per-boundary routing decision. V5e-T stub: deranges the site→destination
 * map (every site maps to a wrong destination) so each routing assertion reds.
 */
export function routeDepthBoundary(site: DepthBoundarySite): DepthDestination {
  const deranged: Record<DepthBoundarySite, DepthDestination> = {
    "typed-query-response": "model-feedback",
    "tool-args-model-driven": "ValidationError",
    "tool-args-code-driven": "InvokeInfraError",
    "params-invoke": "CodeToolError",
    "params-slash-load": "InvokeInfraError",
    "invoke-return": "ceiling-3-cross-route",
  };
  return deranged[site];
}
