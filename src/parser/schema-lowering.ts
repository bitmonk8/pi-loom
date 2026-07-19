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
//     not byte-identical raises the load-time `theta/load/schema-slug-collision`.
//
// V5f-T (tests-task) declares these seam shapes and stubs every behaviour-
// bearing function so the failing tests compile and red on their own primary
// assertions. The paired V5f implementation leaf fills these in.

import { createHash } from "node:crypto";
import { type Diagnostic, type SourceRange } from "../diagnostics/diagnostic";
import { renderCanonicalNumber } from "../render/canonical-number";

// --- Canonical schema hash (schema-subset.md §Canonical schema hash) --------

/**
 * A lowered JSON Schema value, the input domain of the canonical schema hash.
 *
 * The `integer` / `number` kinds carry the binder-number-rendering discriminator
 * the canonical form needs for `const` / `enum` numeric positions (the lowering
 * pass knows each literal's declared kind; a plain JSON value would lose it).
 * `object` entries are an ordered list so the emitted lowered fragment can
 * retain theta-source field order while the canonical form sorts keys before
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
export function canonicalForm(value: LoweredJsonValue): string {
  switch (value.kind) {
    case "string":
      // RFC 8259 minimal escape: JSON.stringify escapes only the characters
      // JSON requires and emits no gratuitous `\u` for printable ASCII.
      return JSON.stringify(value.value);
    case "integer":
    case "number":
      // Numeric `const` / `enum` literals are rendered by the binder
      // integer/number algorithm (BNDR-4 / BNDR-5) keyed off the declared kind,
      // never the value's runtime integrality.
      return renderCanonicalNumber(value.value, value.kind);
    case "boolean":
      return value.value ? "true" : "false";
    case "null":
      return "null";
    case "array":
      // Array elements are left in lowering order; never reordered.
      return `[${value.items.map(canonicalForm).join(",")}]`;
    case "object": {
      // Object keys sorted by Unicode code-point; no insignificant whitespace.
      const sorted = [...value.entries].sort((a, b) =>
        compareCodePoint(a.key, b.key),
      );
      const body = sorted
        .map((entry) => `${JSON.stringify(entry.key)}:${canonicalForm(entry.value)}`)
        .join(",");
      return `{${body}}`;
    }
  }
}

/**
 * Compare two strings by Unicode code-point (lexical) order, as the canonical
 * form's key sort requires. The default `<` on strings compares UTF-16 code
 * units, which diverges from code-point order only across the surrogate range;
 * iterating code points keeps astral keys ordered as the spec mandates.
 */
function compareCodePoint(a: string, b: string): number {
  const aPoints = [...a];
  const bPoints = [...b];
  const len = Math.min(aPoints.length, bPoints.length);
  for (let i = 0; i < len; i += 1) {
    const ap = aPoints[i]?.codePointAt(0) ?? 0;
    const bp = bPoints[i]?.codePointAt(0) ?? 0;
    if (ap !== bp) {
      return ap - bp;
    }
  }
  return aPoints.length - bPoints.length;
}

/**
 * The full lowercased hex SHA-256 digest of the canonical-form bytes
 * (schema-subset.md §Canonical schema hash step 3).
 */
export function canonicalHash(value: LoweredJsonValue): string {
  return createHash("sha256")
    .update(canonicalForm(value), "utf8")
    .digest("hex");
}

/**
 * The schema slug — the first 16 hex characters of the canonical hash, i.e. 64
 * bits of the digest (schema-subset.md §Canonical schema hash step 4).
 */
export function schemaSlug(value: LoweredJsonValue): string {
  // `digest("hex")` is already lowercase; the slug is its first 16 hex chars.
  return canonicalHash(value).slice(0, 16);
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
export function lowerUnion(arms: readonly LoweredUnionArm[]): LoweredUnion {
  const allPrimitive = arms.every((arm) => arm.kind === "primitive");
  if (allPrimitive) {
    // Multi-type-array form. Arms in source order, with `"null"` last whenever
    // the union admits it (*Array element order* clause).
    const nonNull: string[] = [];
    let hasNull = false;
    for (const arm of arms) {
      if (arm.kind === "primitive") {
        if (arm.type === "null") {
          hasNull = true;
        } else {
          nonNull.push(arm.type);
        }
      }
    }
    return { type: hasNull ? [...nonNull, "null"] : nonNull };
  }
  // Any non-primitive arm forces the `anyOf` form, variants in source order:
  // each primitive arm lowers to its `{ "type": <name> }` object; each
  // non-primitive arm carries its already-lowered fragment.
  const variants: Record<string, unknown>[] = arms.map((arm) =>
    arm.kind === "primitive" ? { type: arm.type } : { ...arm.lowered },
  );
  return { anyOf: variants };
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
  readonly thetaName: string;
  /** The explicit `as "Wire"` rename, when present. */
  readonly wireName?: string;
  /** JSON Pointer into the lowered fragment naming this field's position. */
  readonly pointer: string;
  readonly type: SidecarFieldType;
}

/** A wire-name translation entry: the theta-side name and its wire name. */
export interface WireNameEntry {
  readonly theta: string;
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
export function buildSidecar(fields: readonly SidecarFieldInput[]): SchemaSidecar {
  const wireNames: WireNameEntry[] = [];
  const namedEnumPositions: NamedEnumPosition[] = [];
  for (const field of fields) {
    // Wire-name translation: one entry per *renamed* field; un-renamed fields
    // (wire name equals theta name) are absent.
    if (field.wireName !== undefined && field.wireName !== field.thetaName) {
      wireNames.push({ theta: field.thetaName, wire: field.wireName });
    }
    // Named-enum positions: included iff the source type was a named `enum`;
    // anonymous string-literal-union positions are deliberately absent.
    if (field.type.kind === "named-enum") {
      namedEnumPositions.push({
        pointer: field.pointer,
        enumName: field.type.enumName,
      });
    }
  }
  return { wireNames, namedEnumPositions };
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
 * match whose canonical-form bytes differ raises `theta/load/schema-slug-collision`
 * and refuses to merge the two fragments.
 */
export function dedupInlineSchemas(
  fragments: readonly SlugKeyedFragment[],
  site: SchemaLoweringSite,
): InlineDedupResult {
  const entries: SlugKeyedFragment[] = [];
  const diagnostics: Diagnostic[] = [];
  // First fragment retained per slug, with its canonical-form bytes, so a slug
  // match is settled by byte comparison rather than re-serialisation.
  const retained = new Map<string, SlugKeyedFragment>();
  for (const fragment of fragments) {
    const prior = retained.get(fragment.slug);
    if (prior === undefined) {
      retained.set(fragment.slug, fragment);
      entries.push(fragment);
      continue;
    }
    if (prior.canonicalBytes === fragment.canonicalBytes) {
      // Byte-identical: cosmetic source differences that lower alike collapse to
      // one `$defs` entry, silently.
      continue;
    }
    // Slug match with differing canonical-form bytes: a genuine 64-bit slug
    // collision. Refuse to merge and raise the load-time diagnostic.
    diagnostics.push({
      severity: "error",
      code: "theta/load/schema-slug-collision",
      file: site.file,
      range: site.range,
      message: `schema-slug collision on slug ${fragment.slug}: two distinct inline schemas hash alike`,
    });
  }
  return { entries, diagnostics };
}
