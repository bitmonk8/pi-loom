// V5a / V5a-T — the schema-declaration checker seam.
//
// This module owns the parse-time well-formedness checks for the three schema
// declaration shapes of schemas.md and type-system.md:
//
//   - Object schema   — `schema X { f: T, ... }` (incl. `as "WireName"` renames):
//       * `loom/parse/empty-schema-body`   — `schema X { }` with no fields.
//       * `loom/parse/wire-name-collision` — two fields share a wire name, or a
//         wire name collides with another field's loom-side name.
//       * `loom/parse/redundant-wire-name` (W) — a rename whose wire name equals
//         the loom-side name (`field as "field"`).
//   - Enum declaration — `enum X { Low, High = "h", ... }`:
//       * `loom/parse/empty-enum-body`               — `enum X { }` with no variants.
//       * `loom/parse/duplicate-enum-variant-name`   — two variants share an
//         identifier (regardless of explicit value); this check runs BEFORE the
//         value-duplication check (schemas.md §Enum declarations).
//       * `loom/parse/duplicate-enum-value`          — two distinct-named variants
//         share one explicit string value.
//       * `loom/parse/non-string-enum-value`         — an explicit value that is
//         not a single string literal.
//       * `loom/parse/inline-enum`                   — an inline `enum[...]` form
//         (top-level `enum` only).
//   - Variant access  — `Enum.Variant`:
//       * `loom/parse/unknown-variant`               — a reference to a variant the
//         enum does not declare.
//
// V5a-T (tests-task) declares these seam shapes and stubs every check as an
// inert no-op (no diagnostic produced) so the failing tests compile and red on
// their own primary assertions (the schema-declaration checker is absent). The
// paired V5a implementation leaf fills them in.

import { type Diagnostic, type SourceRange } from "../diagnostics/diagnostic";

/** A located site at which a schema/enum declaration or access is checked. */
export interface SchemaDeclSite {
  readonly file: string;
  readonly range: SourceRange;
}

/**
 * A single object-schema field declaration. `wireName` is the explicit
 * `as "WireName"` rename when present; absent means the wire name equals the
 * loom-side identifier (`loomName`).
 */
export interface SchemaFieldDecl {
  readonly loomName: string;
  readonly wireName?: string;
}

/** An object-schema declaration (`schema X { ... }`). */
export interface ObjectSchemaDecl {
  readonly name: string;
  readonly fields: readonly SchemaFieldDecl[];
}

/**
 * Check an object-schema declaration, returning every diagnostic raised in
 * source order:
 *
 *   - `loom/parse/empty-schema-body`   — the schema declares no fields.
 *   - `loom/parse/redundant-wire-name` (W) — a field's wire name equals its
 *     loom-side name.
 *   - `loom/parse/wire-name-collision` — a field's effective wire name
 *     (`wireName ?? loomName`) collides with another field's effective wire
 *     name or with another field's loom-side name in the same schema.
 *
 * V5a-T stubs this as an inert no-op (returns `[]`); the paired V5a
 * implementation leaf fills it in.
 */
export function checkObjectSchema(
  _decl: ObjectSchemaDecl,
  _site: SchemaDeclSite,
): Diagnostic[] {
  return [];
}

/** The literal kind of an enum variant's explicit value. */
export type EnumValueKind = "string" | "integer" | "number" | "boolean" | "null";

/**
 * A single enum-variant declaration. `value` is the explicit `= "..."` value
 * when present; absent means the variant name verbatim is the wire value.
 */
export interface EnumVariantDecl {
  readonly name: string;
  readonly value?: { readonly kind: EnumValueKind; readonly text: string };
}

/** An enum declaration (`enum X { ... }`). */
export interface EnumDecl {
  readonly name: string;
  readonly variants: readonly EnumVariantDecl[];
}

/**
 * Check an enum declaration, returning every diagnostic raised in source order:
 *
 *   - `loom/parse/empty-enum-body`             — the enum declares no variants.
 *   - `loom/parse/duplicate-enum-variant-name` — two variants share an
 *     identifier; this check runs BEFORE the value-duplication check, so a
 *     distinct-explicit-value name collision (`enum X { Low = "a", Low = "b" }`)
 *     fires here, not `loom/parse/duplicate-enum-value`.
 *   - `loom/parse/non-string-enum-value`       — an explicit value whose kind is
 *     not `string`.
 *   - `loom/parse/duplicate-enum-value`        — two distinct-named variants
 *     share one explicit string value.
 *
 * V5a-T stubs this as an inert no-op (returns `[]`); the paired V5a
 * implementation leaf fills it in.
 */
export function checkEnumDeclaration(
  _decl: EnumDecl,
  _site: SchemaDeclSite,
): Diagnostic[] {
  return [];
}

/**
 * Check an inline-enum form (`enum["a", "b"]` or other inline `enum[...]`),
 * returning `loom/parse/inline-enum` — `enum` is top-level only. Returns
 * `undefined` when `source` is not an inline-enum form.
 *
 * V5a-T stubs this as an inert no-op (returns `undefined`); the paired V5a
 * implementation leaf fills it in.
 */
export function checkInlineEnumForm(
  _source: string,
  _site: SchemaDeclSite,
): Diagnostic | undefined {
  return undefined;
}

/** A `Enum.Variant` member-access reference and the enum's declared variants. */
export interface VariantAccess {
  readonly enumName: string;
  readonly variant: string;
  readonly knownVariants: readonly string[];
}

/**
 * Check a `Enum.Variant` reference, returning `loom/parse/unknown-variant` when
 * `variant` is not one of `knownVariants`. Returns `undefined` for a declared
 * variant.
 *
 * V5a-T stubs this as an inert no-op (returns `undefined`); the paired V5a
 * implementation leaf fills it in.
 */
export function checkVariantAccess(
  _access: VariantAccess,
  _site: SchemaDeclSite,
): Diagnostic | undefined {
  return undefined;
}
