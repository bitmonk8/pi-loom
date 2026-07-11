// V13e — lower a typed `@<Schema>` query's declared response schema to the
// validating JSON Schema (QRY-22 / SUBS-1), reusing the `params:` type-lowering
// machinery (`lowerTypeExpr` / `splitTopLevel`).
//
// A typed query's declared schema annotation is one of:
//   - a named `schema` decl (`@<Triage>`), resolved whole-file against the
//     loom body's `schema` declarations to its retained object-body field
//     sources;
//   - an inline object type (`@<{ status: "ok" | "degraded", summary: string }>`);
//   - an inline primitive / union / `array<T>` type (`@<string>`, `@<A | B>`).
//
// Each lowers to an AJV-validatable `LoweredSchema` so the runtime execution
// path validates the response against the declared schema rather than binding an
// unvalidated payload (the QRY-22 obligation V13e integrates). String / number /
// boolean / null literal unions lower to `enum`, so a declared literal set is
// validated; a nested cross-schema `NamedType` inside another schema's body
// lowers permissively (`{}`) — the query's own declared shape is the validated
// contract, its structural fields (`type`, `required`, `additionalProperties`)
// caught precisely.
//
// Spec: schema-subset.md (SUBS-1 lowering), query/query-failure-and-repair.md
// (QRY-22).

import type { LoweredSchema } from "../seams/schema-validator";
import type { SchemaDecl } from "../parser/loom-document";
import {
  lowerInlineObject,
  lowerObjectFields,
  lowerTypeSource,
} from "../parser/body-type-lowering";

/** An identifier-shaped atom (a bare `NamedType` reference). */
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Lower a typed query's declared response-schema annotation to its
 * AJV-validatable JSON Schema (QRY-22 / SUBS-1), or `undefined` when the
 * annotation carries no lowerable shape. `annotation` is the verbatim
 * `@<Schema>` text; `schemas` are the loom body's `schema` declarations, used to
 * resolve a named reference whole-file to its retained object-body fields.
 */
export function lowerQueryResponseSchema(
  annotation: string,
  schemas: readonly SchemaDecl[],
): LoweredSchema | undefined {
  const bodyTypeMap = buildBodyTypeMap(schemas);
  const s = annotation.trim();
  if (s.length === 0) {
    return undefined;
  }

  // A named `schema` decl: its retained object body is the response schema
  // (returned directly so the root is the object shape, not a `$ref` wrapper).
  if (IDENTIFIER.test(s)) {
    const named = bodyTypeMap.get(s);
    if (named !== undefined) {
      return named as LoweredSchema;
    }
  }

  // An inline object type `{ field: Type, … }`.
  if (s.startsWith("{") && s.endsWith("}")) {
    return lowerInlineObject(s.slice(1, -1), bodyTypeMap) as LoweredSchema;
  }

  // An inline primitive / union / `array<T>` type.
  const defs: Record<string, Record<string, unknown>> = {};
  const root = lowerTypeSource(s, bodyTypeMap, defs);
  const result: Record<string, unknown> = { ...root };
  if (Object.keys(defs).length > 0) {
    result["$defs"] = defs;
  }
  return result as LoweredSchema;
}

/**
 * Lower every named `schema` decl's retained object body to its JSON-Schema
 * object fragment, keyed by name so a query annotation resolves a `NamedType`
 * whole-file (declaration order does not matter). A decl carrying no object body
 * (an `= …` alias or `by … = …` discriminated union) contributes no entry.
 */
function buildBodyTypeMap(
  schemas: readonly SchemaDecl[],
): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const decl of schemas) {
    if (decl.fields === undefined) {
      continue;
    }
    map.set(decl.name, lowerObjectFields(decl.fields, map));
  }
  return map;
}
