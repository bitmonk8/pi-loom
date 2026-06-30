// V5d / V5d-T — the schema-subset reject gate seam.
//
// This module owns the parse-time JSON-Schema-subset reject gate of
// schema-subset.md. The gate is an **allowlist / reject-by-default** gate: it
// accepts only the fixed, loom-defined permitted subset (Draft 2020-12;
// `anyOf` only; objects all-required + `additionalProperties:false`; single
// `items`; null via union) and rejects *every* construct outside that subset —
// including constructs that are neither in the permitted subset nor in the
// spec's enumerated unsupported-keyword list — with
// `loom/parse/unsupported-feature`. A `Result` in a schema-feeding position is
// rejected with `loom/parse/result-in-schema-position` (schema-subset.md
// §Lowering Algorithm; grammar.md §Type grammar).
//
// The lowering pass and the canonical-hash recipe that operate on the accepted
// subset are owned by V5f.
//
// V5d-T (tests-task) declares these seam shapes and stubs the three checks as
// inert no-ops (no diagnostic produced) so the failing tests compile and red on
// their own primary assertions (the allowlist gate is absent). The paired V5d
// implementation leaf fills them in.

import { type Diagnostic, type SourceRange } from "../diagnostics/diagnostic";

/** A located site at which a schema-subset construct is checked. */
export interface SchemaSubsetSite {
  readonly file: string;
  readonly range: SourceRange;
}

/**
 * Check a single candidate JSON-Schema keyword against the permitted-subset
 * allowlist (schema-subset.md). Returns `loom/parse/unsupported-feature` for
 * any keyword the loom-defined subset does not permit — whether or not it is
 * one of the spec's enumerated unsupported keywords (the gate is
 * reject-by-default / allowlist, not a denylist) — and `undefined` for a
 * permitted keyword.
 *
 * V5d-T stubs this as an inert accept-all no-op (returns `undefined`); the
 * paired V5d implementation leaf supplies the allowlist and the rejection.
 */
export function checkSubsetKeyword(
  keyword: string,
  site: SchemaSubsetSite,
): Diagnostic | undefined {
  void keyword;
  void site;
  return undefined;
}

/**
 * Check a sequence of candidate JSON-Schema keywords in source order, returning
 * one diagnostic per rejected keyword in **input (array element) order** — the
 * array-element-order-preservation property of schema-subset.md. A permitted
 * keyword contributes no diagnostic.
 *
 * V5d-T stubs this as an inert no-op (returns `[]`); the paired V5d
 * implementation leaf supplies the per-keyword allowlist gate and the
 * order-preserving collection.
 */
export function checkSubsetKeywords(
  keywords: readonly string[],
  site: SchemaSubsetSite,
): Diagnostic[] {
  void keywords;
  void site;
  return [];
}

/**
 * Check a type expression as written in a **schema-feeding** position (a schema
 * field type, a `params:` field type, or any type reachable transitively from
 * those, including `array<T>` element types and union arms), returning every
 * diagnostic raised. A `Result<T, E>` application anywhere in the type fires
 * `loom/parse/result-in-schema-position` (schema-subset.md §Lowering Algorithm;
 * grammar.md §Type grammar); the recursion into `array<T>` element types and
 * union arms preserves array element order. A lowerable subset type raises no
 * diagnostic.
 *
 * V5d-T stubs this as an inert no-op (returns `[]`); the paired V5d
 * implementation leaf wires the schema-feeding type gate.
 */
export function checkSchemaFeedingType(
  typeSource: string,
  site: SchemaSubsetSite,
): Diagnostic[] {
  void typeSource;
  void site;
  return [];
}
