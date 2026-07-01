// V5e-T — failing tests for the paired `V5e` JSON-document depth walk
// (hard ceiling #4).
//
// Spec: schema-subset.md §"Depth Enforcement" (the counting algorithm, the
// `depth ≤ 5` cap, the canonical `schema_keyword: "maxDepth"` /
// `"JSON document depth exceeds 5"` / `cause: "schema_validation"` error shape);
// hard-ceilings/ceilings-3-and-4.md §"Per-boundary destination/surface table
// (ceiling #4)" (#ceiling-4-table) and CIO-3 (#cio-3). Code-keyed obligation
// area `cka-10` (schema-subset.md, no numbered REQ-ID — the depth ceiling
// carries no numbered PREFIX-N REQ-ID; the SUBS-1/SUBS-2 IDs on the page govern
// lowering and terminology, not depth).
//
// The seam is exercised in isolation, mirroring `V16a`'s seam pattern: the
// decision is driven directly and the live AJV-boundary sites are built
// downstream (`V13c`, `V14e`, `V15j`, `V4e`). The actual wrapping of a depth-6
// breach into each carrier is asserted at the site owner — `ValidationError` at
// `V13c`, `CodeToolError` at `V14e`, `InvokeInfraError` at `V15j`, the slash-load
// cross-route at `V4e` — not here; this leaf asserts only the routing *decision*
// and the depth computation.
//
// These tests red on their own primary assertions while the V5e body is absent:
// the V5e-T stub returns a wrong depth constant (`jsonDepth`), never fires
// (`depthWalk`), and deranges the site→destination map (`routeDepthBoundary`),
// per the per-phase TDD ritual's "fail red for the intended reason".

import { describe, expect, it } from "vitest";
import {
  DEPTH_VIOLATION_MESSAGE,
  DEPTH_VIOLATION_SCHEMA_KEYWORD,
  type DepthDestination,
  depthWalk,
  jsonDepth,
  routeDepthBoundary,
} from "../src/runtime/depth-walk";

// A depth-5 value: {a:{b:{c:{d:1}}}} — five nesting levels, at the cap (accepted).
const DEPTH_5_VALUE = { a: { b: { c: { d: 1 } } } };
// A depth-6 value: schema-subset.md §Depth worked example (rejected).
const DEPTH_6_VALUE = { a: { b: { c: { d: { e: 1 } } } } };

describe("V5e-T — depth walk fires the canonical maxDepth breach (cka-10)", () => {
  it("cka-10 (schema-subset.md §Depth Enforcement): a depth-6 materialised value fires schema_keyword `maxDepth`, the canonical message, and cause `schema_validation`", () => {
    // schema-subset.md §Depth Enforcement / §Error shape: a breach always
    // carries `schema_keyword: "maxDepth"`, the canonical message
    // `"JSON document depth exceeds 5"`, and `cause: "schema_validation"` even
    // though the walk short-circuits before AJV. Driven through the loom-owned
    // walk in isolation (mirroring V16a's seam pattern); the live AJV-boundary
    // sites are built downstream.
    const result = depthWalk(DEPTH_6_VALUE);
    // Primary: the depth-6 value breaches the cap.
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("unreachable: a depth-6 value must breach the depth ceiling");
    }
    // Canonical message anchor — sourced from schema-subset.md §Error shape.
    expect(result.issue.schema_keyword).toBe(DEPTH_VIOLATION_SCHEMA_KEYWORD);
    expect(result.issue.schema_keyword).toBe("maxDepth");
    expect(result.issue.message).toBe(DEPTH_VIOLATION_MESSAGE);
    expect(result.issue.message).toBe("JSON document depth exceeds 5");
    expect(result.cause).toBe("schema_validation");
  });
});

describe("V5e-T — per-boundary routing decision (ceiling-4-table, CIO-3, cka-10)", () => {
  it("ceiling-4-table / cka-10: the three loom-code Err rows route to ValidationError / CodeToolError / InvokeInfraError", () => {
    // ceilings-3-and-4.md#ceiling-4-table: typed-query response → loom-code
    // `ValidationError` (wrapped at V13c); code-driven tool args → `CodeToolError`
    // (wrapped at V14e); `params` via `invoke(...)` and the `invoke<T>` return
    // value → `InvokeInfraError` (wrapped at V15j). The wrapping into each
    // carrier is the site owner's; this seam decides only the destination class.
    const typedQuery: DepthDestination = routeDepthBoundary("typed-query-response");
    expect(typedQuery).toBe("ValidationError");
    expect(routeDepthBoundary("tool-args-code-driven")).toBe("CodeToolError");
    expect(routeDepthBoundary("params-invoke")).toBe("InvokeInfraError");
    expect(routeDepthBoundary("invoke-return")).toBe("InvokeInfraError");
  });

  it("ceiling-4-table / cka-10: the two non-`Err` rows are decision-only — model-driven → model feedback, slash-load `params` → ceiling-#3 cross-route", () => {
    // ceilings-3-and-4.md#ceiling-4-table + #ceiling-4-table-reconciliation: the
    // model-driven tool-args row produces no loom-code `Err` (the depth
    // violation feeds back to the model as a tool-result; the round counts
    // against `tool_loop.max_rounds`), and the slash-load `params` row
    // cross-routes into ceiling #3's load-time system-note classification (CIO-1)
    // rather than ceiling #4's recoverable-`Err` path (surfaced at V4e). Neither
    // produces a loom-code `Err` at this seam.
    expect(routeDepthBoundary("tool-args-model-driven")).toBe("model-feedback");
    expect(routeDepthBoundary("params-slash-load")).toBe("ceiling-3-cross-route");
  });
});

describe("V5e-T — the depth computation (cka-10, schema-subset.md §Counting algorithm)", () => {
  it("cka-10: a depth-5 value passes the walk and a depth-6 value trips the ceiling", () => {
    // schema-subset.md §Depth Enforcement: the cap is `depth ≤ 5`; five levels
    // are accepted and six are rejected. Both the depth count and the walk
    // verdict are pinned.
    expect(jsonDepth(DEPTH_5_VALUE)).toBe(5);
    expect(jsonDepth(DEPTH_6_VALUE)).toBe(6);
    // Primary: the walk verdict flips exactly at the cap.
    expect(depthWalk(DEPTH_6_VALUE).ok).toBe(false);
    expect(depthWalk(DEPTH_5_VALUE).ok).toBe(true);
  });

  it("cka-10: scalar and empty values count as depth 1", () => {
    // schema-subset.md §Counting algorithm: a scalar (string/number/integer/
    // boolean/null) has depth 1, and an empty object `{}` or empty array `[]`
    // has depth 1.
    expect(jsonDepth("hello")).toBe(1);
    expect(jsonDepth(42)).toBe(1);
    expect(jsonDepth(true)).toBe(1);
    expect(jsonDepth(null)).toBe(1);
    expect(jsonDepth({})).toBe(1);
    expect(jsonDepth([])).toBe(1);
  });

  it("cka-10: a non-empty value counts as 1 + max(depth(child))", () => {
    // schema-subset.md §Counting algorithm: a non-empty object or array has
    // depth `1 + max(depth(child))` over its members/elements — including the
    // §Depth worked example `{"a": [{"b": 1}]}` → depth 4, and max-over-children
    // (the deeper sibling drives the count).
    expect(jsonDepth({ a: 1 })).toBe(2);
    expect(jsonDepth({ a: [{ b: 1 }] })).toBe(4);
    // max over siblings: the deeper branch determines the parent's depth.
    expect(jsonDepth({ shallow: 1, deep: { x: { y: 1 } } })).toBe(4);
  });

  it("cka-10: `anyOf` arms are not counted as levels — depth is measured against the materialised value", () => {
    // schema-subset.md §Counting algorithm: `anyOf` arms are not levels; depth
    // is measured against the materialised runtime value (one arm exists, the
    // others do not). A `string | Author` union that materialised to the string
    // arm has depth 1 (the arm adds no wrapper level); materialised to the
    // object arm `{ name: "x" }`, depth 2 — never 2 / 3 as if the union nested.
    expect(jsonDepth("just-a-string")).toBe(1);
    expect(jsonDepth({ name: "x" })).toBe(2);
  });
});
