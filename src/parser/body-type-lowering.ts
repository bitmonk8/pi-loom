// Shared body-type lowering — the single canonical place that lowers a loom
// body's `schema` / `enum` declarations to their JSON-Schema fragments. Used by
// two whole-file `NamedType` resolvers:
//
//   - the `params:` / typed-query response-schema lowering (via
//     `query-schema-lowering.ts`, which resolves a `@<Schema>` annotation to the
//     named decl's object body), and
//   - the frontmatter `params:` named-type resolution (via `collectBodyTypes`
//     in `loom-document.ts`, which supplies each body type's lowered fragment so
//     a `params:` field of a `NamedType` produces a present `loweredSchema`).
//
// Keeping the lowering here (rather than duplicated per caller) means an enum or
// named schema lowers identically wherever it is referenced.

import { lowerTypeExpr, splitTopLevel, type LowerCtx } from "./params";

/** A lowerable object-body field: a field name and its verbatim type source. */
export interface LowerableField {
  readonly name: string;
  readonly typeSource: string;
}

/** A schema declaration reduced to what lowering needs. */
export interface LowerableSchema {
  readonly name: string;
  /** Object-body field sources; absent for `= …` alias / `by … = …` union forms. */
  readonly fields?: readonly LowerableField[];
}

/** An enum declaration reduced to what lowering needs. */
export interface LowerableEnum {
  readonly name: string;
  /** Declared variant names in source order. */
  readonly variants?: readonly string[];
  /** Explicit `= "wire"` values keyed by variant name; a variant absent here uses its name. */
  readonly variantValues?: Readonly<Record<string, string>>;
}

/**
 * Lower an enum declaration to its JSON-Schema fragment: a string with the
 * declared wire values enumerated. Each variant's wire value is its explicit
 * `= "..."` value when declared, else the variant name verbatim (schemas.md
 * §Enum declarations — the name-is-wire default; matches the runtime
 * `buildVariantWireMap` mapping).
 */
export function lowerEnumToSchema(
  variants: readonly string[] | undefined,
  variantValues: Readonly<Record<string, string>> | undefined,
): Record<string, unknown> {
  const values = (variants ?? []).map((name) => variantValues?.[name] ?? name);
  return { type: "string", enum: values };
}

/**
 * Lower a list of object-body field sources to an object JSON Schema: every
 * field `required` (a declared schema field is mandatory) and
 * `additionalProperties: false` (an undeclared property is a validation
 * failure), matching the `params:` object-lowering shape.
 */
export function lowerObjectFields(
  fields: readonly LowerableField[],
  bodyTypeMap: ReadonlyMap<string, Record<string, unknown>>,
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  const defs: Record<string, Record<string, unknown>> = {};
  for (const field of fields) {
    properties[field.name] = lowerTypeSource(field.typeSource, bodyTypeMap, defs);
    required.push(field.name);
  }
  const schema: Record<string, unknown> = {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
  if (Object.keys(defs).length > 0) {
    schema["$defs"] = defs;
  }
  return schema;
}

/** Lower an inline object type's comma-separated `field: Type` body. */
export function lowerInlineObject(
  body: string,
  bodyTypeMap: ReadonlyMap<string, Record<string, unknown>>,
): Record<string, unknown> {
  const fields: LowerableField[] = [];
  for (const entry of splitTopLevel(body, ",")) {
    const colon = topLevelColon(entry);
    if (colon < 0) {
      continue;
    }
    const name = entry.slice(0, colon).trim();
    const typeSource = entry.slice(colon + 1).trim();
    if (name.length === 0 || typeSource.length === 0) {
      continue;
    }
    fields.push({ name, typeSource });
  }
  return lowerObjectFields(fields, bodyTypeMap);
}

/**
 * Lower a single type-expression source to its JSON-Schema fragment. A literal
 * union (`"a" | "b"`) lowers to an `enum`, a single literal to a `const`, and
 * every other form (primitive, `array<T>`, named type, non-literal union)
 * delegates to the `params:` `lowerTypeExpr` machinery.
 */
export function lowerTypeSource(
  source: string,
  bodyTypeMap: ReadonlyMap<string, Record<string, unknown>>,
  defs: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
  const s = source.trim();

  const arms = splitTopLevel(s, "|");
  if (arms.length > 1) {
    const literals = arms.map(parseLiteralArm);
    if (literals.every((lit) => lit !== undefined)) {
      return { enum: literals.map((lit) => (lit as { readonly value: unknown }).value) };
    }
  } else {
    const lit = parseLiteralArm(s);
    if (lit !== undefined) {
      return { const: lit.value };
    }
  }

  const ctx: LowerCtx = { bodyTypeMap, defs, unresolved: [] };
  return lowerTypeExpr(s, ctx);
}

/**
 * Build the whole-file name → lowered-fragment map for a loom body's `schema`
 * and `enum` declarations. Enums are lowered first so a schema field that
 * references an enum resolves to the enum's lowered fragment; a schema decl
 * carrying no object body (an `= …` alias or `by … = …` discriminated union)
 * contributes no entry (its callers supply a permissive fallback).
 */
export function buildBodyTypeSchemas(
  schemas: readonly LowerableSchema[],
  enums: readonly LowerableEnum[],
): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const decl of enums) {
    map.set(decl.name, lowerEnumToSchema(decl.variants, decl.variantValues));
  }
  for (const decl of schemas) {
    if (decl.fields === undefined) {
      continue;
    }
    map.set(decl.name, lowerObjectFields(decl.fields, map));
  }
  return map;
}

/**
 * Parse a literal-type atom (a quoted string, integer/number, boolean, or
 * `null`) to its JSON value, or `undefined` when the atom is not a literal.
 * Wrapped so a legitimately-`null` literal is distinguishable from "not a
 * literal".
 */
function parseLiteralArm(source: string): { readonly value: unknown } | undefined {
  const s = source.trim();
  if (
    s.length >= 2 &&
    ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))
  ) {
    return { value: s.slice(1, -1) };
  }
  if (s === "true") {
    return { value: true };
  }
  if (s === "false") {
    return { value: false };
  }
  if (s === "null") {
    return { value: null };
  }
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    return { value: Number(s) };
  }
  return undefined;
}

/** Find the top-level `:` in a `field: Type` entry, respecting `<>`/`{}` nesting. */
function topLevelColon(entry: string): number {
  let depth = 0;
  let quote: string | undefined;
  for (let i = 0; i < entry.length; i += 1) {
    const c = entry[i] ?? "";
    if (quote !== undefined) {
      if (c === quote) {
        quote = undefined;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
    } else if (c === "<" || c === "{" || c === "(") {
      depth += 1;
    } else if (c === ">" || c === "}" || c === ")") {
      depth -= 1;
    } else if (c === ":" && depth === 0) {
      return i;
    }
  }
  return -1;
}
