// V5d / V5d-T — the schema-subset reject gate seam.
//
// This module owns the parse-time JSON-Schema-subset reject gate of
// schema-subset.md. The gate is an **allowlist / reject-by-default** gate: it
// accepts only the fixed, theta-defined permitted subset (Draft 2020-12;
// `anyOf` only; objects all-required + `additionalProperties:false`; single
// `items`; null via union) and rejects *every* construct outside that subset —
// including constructs that are neither in the permitted subset nor in the
// spec's enumerated unsupported-keyword list — with
// `theta/parse/unsupported-feature`. A `Result` in a schema-feeding position is
// rejected with `theta/parse/result-in-schema-position` (schema-subset.md
// §Lowering Algorithm; grammar.md §Type grammar).
//
// The lowering pass and the canonical-hash recipe that operate on the accepted
// subset are owned by V5f.
//
// V5d implements the allowlist gate; V5d-T declared the seam shapes.

import { type Diagnostic, type SourceRange } from "../diagnostics/diagnostic";
import { parseTypeExpression } from "./type-grammar";

/** A located site at which a schema-subset construct is checked. */
export interface SchemaSubsetSite {
  readonly file: string;
  readonly range: SourceRange;
}

// The fixed, theta-defined permitted JSON-Schema-keyword subset
// (schema-subset.md): composition (`anyOf` only), validation (`enum`, `const`),
// objects (`properties`, `required`, `additionalProperties` — always emitted
// `false`), arrays (`items`, a single subschema), reuse (`$defs`, `$ref`), and
// the `type` keyword (incl. the multi-type-array null union form). The gate is
// an allowlist: this set is the *whole* of what it accepts, and every other
// keyword — enumerated-unsupported or not — is rejected by default. Immutable
// module-level data, not mutable cross-invocation state.
const PERMITTED_SUBSET_KEYWORDS: ReadonlySet<string> = new Set<string>([
  "type",
  "anyOf",
  "enum",
  "const",
  "properties",
  "required",
  "additionalProperties",
  "items",
  "$defs",
  "$ref",
]);

/**
 * Check a single candidate JSON-Schema keyword against the permitted-subset
 * allowlist (schema-subset.md). Returns `theta/parse/unsupported-feature` for
 * any keyword the theta-defined subset does not permit — whether or not it is
 * one of the spec's enumerated unsupported keywords (the gate is
 * reject-by-default / allowlist, not a denylist) — and `undefined` for a
 * permitted keyword.
 *
 * Reject-by-default: a keyword is accepted iff it is in the fixed permitted
 * subset; anything else fires, so the gate is an allowlist (not a denylist of
 * the enumerated unsupported keywords).
 */
export function checkSubsetKeyword(
  keyword: string,
  site: SchemaSubsetSite,
): Diagnostic | undefined {
  if (PERMITTED_SUBSET_KEYWORDS.has(keyword)) {
    return undefined;
  }
  // Message anchored to the diagnostics registry
  // (diagnostics/code-registry-parse.md) *Message* column:
  // `unsupported syntactic feature: <construct>`, the offending keyword as the
  // interpolated construct.
  return {
    severity: "error",
    code: "theta/parse/unsupported-feature",
    file: site.file,
    range: site.range,
    message: `unsupported syntactic feature: ${keyword}`,
  };
}

/**
 * Check a sequence of candidate JSON-Schema keywords in source order, returning
 * one diagnostic per rejected keyword in **input (array element) order** — the
 * array-element-order-preservation property of schema-subset.md. A permitted
 * keyword contributes no diagnostic.
 *
 * One diagnostic per rejected keyword, in input (array element) order — the
 * array-element-order-preservation property.
 */
export function checkSubsetKeywords(
  keywords: readonly string[],
  site: SchemaSubsetSite,
): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const keyword of keywords) {
    const diagnostic = checkSubsetKeyword(keyword, site);
    if (diagnostic !== undefined) {
      out.push(diagnostic);
    }
  }
  return out;
}

/**
 * Check a type expression as written in a **schema-feeding** position (a schema
 * field type, a `params:` field type, or any type reachable transitively from
 * those, including `array<T>` element types and union arms), returning every
 * diagnostic raised. A `Result<T, E>` application anywhere in the type fires
 * `theta/parse/result-in-schema-position` (schema-subset.md §Lowering Algorithm;
 * grammar.md §Type grammar); the recursion into `array<T>` element types and
 * union arms preserves array element order. A lowerable subset type raises no
 * diagnostic.
 *
 * Delegates to the V2a type-grammar parser at the `schema-feeding` position,
 * which walks the whole type tree (including `array<T>` element types and
 * union arms in source order) and raises `theta/parse/result-in-schema-position`
 * for any `Result` application reachable there.
 */
export function checkSchemaFeedingType(
  typeSource: string,
  site: SchemaSubsetSite,
): Diagnostic[] {
  return parseTypeExpression(typeSource, "schema-feeding", {
    file: site.file,
    range: site.range,
  });
}
