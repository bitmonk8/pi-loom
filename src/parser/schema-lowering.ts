// V5f / V5f-T — the schema-lowering and canonical-hash seam.
//
// This module owns the parts of schema-subset.md's Lowering Algorithm and
// Canonical schema hash that the V5f implementation leaf fills in:
//
//   - SUBS-1 (Lowering Algorithm step 3, union lowering): a union all of whose
//     arms are primitive — treating `null` as a primitive — lowers to the
//     multi-type-array form `{ "type": [...] }`; a union with any non-primitive
//     arm lowers to `{ "anyOf": [...] }`. Arms follow the *Array element order*
//     clause: source order, with `"null"` last whenever the union admits it.
//   - Canonical schema hash (schema-subset.md §Canonical schema hash): SHA-256
//     over the keys-sorted, whitespace-free, binder-number-rendered canonical
//     form of the lowered fragment; the schema slug is the first 16 hex
//     characters of the digest (lowercased).
//   - Lowering Algorithm step 5 (per-schema sidecar): a two-map sidecar — a
//     wire-name translation map and a named-enum-position map keyed by JSON
//     Pointer into the lowered fragment.
//   - The `__inline_<slug>` `$defs` dedup of Lowering Algorithm step 2 under the
//     §Schema-slug collision posture byte-equality check: byte-identical
//     fragments sharing a slug dedup silently; a slug match whose fragments are
//     not byte-identical raises the load-time `loom/load/schema-slug-collision`.
//
// V5f-T (tests-task) declares these seam shapes and stubs every behaviour-
// bearing function so the failing tests compile and red on their own primary
// assertions. The paired V5f implementation leaf fills these in.

import { type Diagnostic, type SourceRange } from "../diagnostics/diagnostic";

// --- Canonical schema hash (schema-subset.md §Canonical schema hash) --------

/**
 * A lowered JSON Schema value, the input domain of the canonical schema hash.
 *
 * The `integer` / `number` kinds carry the binder-number-rendering discriminator
 * the canonical form needs for `const` / `enum` numeric positions (the lowering
 * pass knows each literal's declared kind; a plain JSON value would lose it).
 * `object` entries are an ordered list so the emitted lowered fragment can
 * retain loom-source field order while the canonical form sorts keys before
 * hashing.
 */
export type LoweredJsonValue =
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "integer"; readonly value: number }
  | { readonly kind: "number"; readonly value: number }
  | { readonly kind: "boolean"; readonly value: boolean }
  | { readonly kind: "null" }
  | { readonly kind: "array"; readonly items: readonly LoweredJsonValue[] }
  | { readonly kind: "object"; readonly entries: readonly LoweredObjectEntry[] };

/** A single key/value entry of a lowered object, in emission order. */
export interface LoweredObjectEntry {
  readonly key: string;
  readonly value: LoweredJsonValue;
}

/**
 * Serialise a lowered fragment to its canonical UTF-8 JSON form
 * (schema-subset.md §Canonical schema hash step 2): object keys sorted by
 * Unicode code-point, no insignificant whitespace, numeric `const` / `enum`
 * literals rendered by the binder integer/number algorithm (BNDR-4 / BNDR-5),
 * array elements left in lowering order, strings RFC 8259 minimal-escaped.
 */
export function canonicalForm(_value: LoweredJsonValue): string {
  // Inert stub (V5f-T): the V5f implementation produces the canonical form.
  return "";
}

/**
 * The full lowercased hex SHA-256 digest of the canonical-form bytes
 * (schema-subset.md §Canonical schema hash step 3).
 */
export function canonicalHash(_value: LoweredJsonValue): string {
  // Inert stub (V5f-T): the V5f implementation computes the digest.
  return "";
}

/**
 * The schema slug — the first 16 hex characters of the canonical hash, i.e. 64
 * bits of the digest (schema-subset.md §Canonical schema hash step 4).
 */
export function schemaSlug(_value: LoweredJsonValue): string {
  // Inert stub (V5f-T): the V5f implementation truncates the digest.
  return "";
}

// --- SUBS-1 — union lowering (schema-subset.md §Lowering Algorithm step 3) ---

/** A primitive type name, treating `null` as a primitive (SUBS-1). */
export type LoweredPrimitiveType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "null";

/**
 * One arm of a union being lowered. A `primitive` arm carries the primitive
 * type name; a `non-primitive` arm carries its already-lowered JSON Schema
 * fragment (e.g. a `$ref` object), used only in the `anyOf` lowering.
 */
export type LoweredUnionArm =
  | { readonly kind: "primitive"; readonly type: LoweredPrimitiveType }
  | { readonly kind: "non-primitive"; readonly lowered: Record<string, unknown> };

/**
 * The SUBS-1 union lowering result: the multi-type-array form
 * `{ "type": [...] }` when every arm is primitive, or `{ "anyOf": [...] }` when
 * any arm is non-primitive.
 */
export type LoweredUnion =
  | { readonly type: readonly string[] }
  | { readonly anyOf: readonly Record<string, unknown>[] };

/**
 * Lower a union per SUBS-1: a union all of whose arms are primitive (with
 * `null` counted as a primitive) lowers to `{ "type": [...] }`; any
 * non-primitive arm forces `{ "anyOf": [...] }`. Arms follow the *Array element
 * order* clause — source order, with `"null"` last whenever the union admits it.
 */
export function lowerUnion(_arms: readonly LoweredUnionArm[]): LoweredUnion {
  // Inert stub (V5f-T): the V5f implementation partitions primitive vs.
  // non-primitive arms and emits the correct form. The inert `anyOf` shape is
  // wrong for the all-primitive case, so the SUBS-1 tests red on their own
  // assertions.
  return { anyOf: [] };
}

// --- Per-schema sidecar (schema-subset.md §Lowering Algorithm step 5) --------

/**
 * The lowered-source shape of one field, classifying whether its position
 * carries a named-enum tag. A named-enum position is included in the sidecar
 * iff its source type was a named `enum` declaration; anonymous
 * string-literal-union positions (`"a" | "b"`) are deliberately absent.
 */
export type SidecarFieldType =
  | { readonly kind: "named-enum"; readonly enumName: string }
  | { readonly kind: "anonymous-string-literal-union" }
  | { readonly kind: "other" };

/** One field of a `$defs` entry, with its JSON Pointer into the lowered fragment. */
export interface SidecarFieldInput {
  readonly loomName: string;
  /** The explicit `as "Wire"` rename, when present. */
  readonly wireName?: string;
  /** JSON Pointer into the lowered fragment naming this field's position. */
  readonly pointer: string;
  readonly type: SidecarFieldType;
}

/** A wire-name translation entry: the loom-side name and its wire name. */
export interface WireNameEntry {
  readonly loom: string;
  readonly wire: string;
}

/** A named-enum position: a JSON Pointer keyed to the declaring enum's name. */
export interface NamedEnumPosition {
  readonly pointer: string;
  readonly enumName: string;
}

/** The two-map per-schema sidecar (Lowering Algorithm step 5). */
export interface SchemaSidecar {
  readonly wireNames: readonly WireNameEntry[];
  readonly namedEnumPositions: readonly NamedEnumPosition[];
}

/**
 * Build the per-schema sidecar: a wire-name translation map (one entry per
 * renamed field) and a named-enum-position map keyed by JSON Pointer (one entry
 * per named-`enum` position; anonymous string-literal-union positions absent).
 */
export function buildSidecar(_fields: readonly SidecarFieldInput[]): SchemaSidecar {
  // Inert stub (V5f-T): the V5f implementation populates both maps.
  return { wireNames: [], namedEnumPositions: [] };
}

// --- `__inline_<slug>` `$defs` dedup (schema-subset.md §Lowering step 2 + ----
//     §Schema-slug collision posture) -------------------------------------

/** A located site at which the inline-schema dedup runs. */
export interface SchemaLoweringSite {
  readonly file: string;
  readonly range: SourceRange;
}

/**
 * A lowered inline-schema fragment keyed by its schema slug, carrying the
 * canonical-form bytes alongside so the slug-collision posture's byte-equality
 * check is a byte comparison, not a re-serialisation.
 */
export interface SlugKeyedFragment {
  readonly slug: string;
  readonly canonicalBytes: string;
  readonly defName: string;
}

/** The dedup outcome: the retained `$defs` entries and any collision diagnostics. */
export interface InlineDedupResult {
  readonly entries: readonly SlugKeyedFragment[];
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * Dedup `__inline_<slug>` `$defs` entries (Lowering Algorithm step 2) under the
 * §Schema-slug collision posture byte-equality check: fragments sharing a slug
 * with byte-identical canonical forms collapse to one entry silently; a slug
 * match whose canonical-form bytes differ raises `loom/load/schema-slug-collision`
 * and refuses to merge the two fragments.
 */
export function dedupInlineSchemas(
  fragments: readonly SlugKeyedFragment[],
  _site: SchemaLoweringSite,
): InlineDedupResult {
  // Inert stub (V5f-T): the V5f implementation groups by slug, byte-compares on
  // a slug match, dedups byte-identical fragments, and raises the collision
  // diagnostic on a byte-mismatch. The inert pass dedups nothing and raises no
  // diagnostic, so the collision and silent-dedup tests red on their assertions.
  return { entries: [...fragments], diagnostics: [] };
}
