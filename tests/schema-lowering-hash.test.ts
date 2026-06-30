import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildSidecar,
  canonicalForm,
  canonicalHash,
  dedupInlineSchemas,
  lowerUnion,
  schemaSlug,
  type LoweredJsonValue,
  type LoweredUnionArm,
  type SidecarFieldInput,
  type SlugKeyedFragment,
} from "../src/parser/schema-lowering";
import type { SourceRange } from "../src/diagnostics/diagnostic";

// V5f-T — failing tests for the paired `V5f` "schema lowering and canonical
// hash" implementation.
//
// Spec: schema-subset.md (§Lowering Algorithm step 2 `__inline_<slug>` `$defs`
// dedup + §Schema-slug collision posture; step 3 SUBS-1 union lowering and the
// *Array element order* clause; step 5 the per-schema sidecar; §Canonical
// schema hash steps 2–4) and schemas.md.
//
// These tests red because the V5f lowering/hash bodies are absent: every seam
// is an inert stub (`canonicalForm`/`canonicalHash`/`schemaSlug` return `""`,
// `lowerUnion` returns `{ anyOf: [] }`, `buildSidecar` returns empty maps,
// `dedupInlineSchemas` dedups nothing and raises no diagnostic). Each test reds
// on its own primary assertion — an absent or wrong lowering, an empty
// canonical form, an absent collision diagnostic — not on a compile error,
// missing fixture, or harness throw.

/** A throwaway 1:1–1:2 span for the seam calls. */
function span(): SourceRange {
  return { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } };
}

/** A located site at the throwaway span. */
function site(): { file: string; range: SourceRange } {
  return { file: "test.loom", range: span() };
}

// --- schema-subset.md §Canonical schema hash — SHA-256 over the canonical form,
//     slug = first 16 hex --------------------------------------------------

describe("V5f-T — canonical schema hash (schema-subset.md §Canonical schema hash)", () => {
  it("canonical form sorts object keys by code point and emits no whitespace (step 2)", () => {
    // A fragment whose entries are emitted in NON-sorted order (`type` before
    // `enum`). The canonical form sorts keys (`enum` < `type`) and emits no
    // insignificant whitespace, so both source orderings serialise alike.
    const reversed: LoweredJsonValue = {
      kind: "object",
      entries: [
        { key: "type", value: { kind: "string", value: "string" } },
        {
          key: "enum",
          value: {
            kind: "array",
            items: [
              { kind: "string", value: "a" },
              { kind: "string", value: "b" },
            ],
          },
        },
      ],
    };
    const sorted: LoweredJsonValue = {
      kind: "object",
      entries: [
        {
          key: "enum",
          value: {
            kind: "array",
            items: [
              { kind: "string", value: "a" },
              { kind: "string", value: "b" },
            ],
          },
        },
        { key: "type", value: { kind: "string", value: "string" } },
      ],
    };
    const expected = '{"enum":["a","b"],"type":"string"}';
    expect(canonicalForm(reversed)).toBe(expected);
    // Key sorting is independent of emitted entry order: both forms hash alike.
    expect(canonicalForm(sorted)).toBe(expected);
    // No insignificant whitespace between tokens.
    expect(/\s/.test(canonicalForm(reversed))).toBe(false);
  });

  it("numeric const/enum literals are binder-number-rendered (step 2, BNDR-4 / BNDR-5)", () => {
    // A `const` integer at a magnitude where `String(n)` would switch to
    // exponential form renders in full base-10 (BNDR-4); a `number` `42.0`
    // renders without the trailing `.0` (BNDR-5). The canonical form borrows the
    // binder integer/number rendering algorithm.
    const integerConst: LoweredJsonValue = {
      kind: "object",
      entries: [{ key: "const", value: { kind: "integer", value: 1e21 } }],
    };
    expect(canonicalForm(integerConst)).toBe(
      '{"const":1000000000000000000000}',
    );
    const numberConst: LoweredJsonValue = {
      kind: "object",
      entries: [{ key: "const", value: { kind: "number", value: 42.0 } }],
    };
    expect(canonicalForm(numberConst)).toBe('{"const":42}');
  });

  it("the slug is the first 16 hex of SHA-256 over the canonical-form bytes (steps 3–4)", () => {
    const fragment: LoweredJsonValue = {
      kind: "object",
      entries: [{ key: "type", value: { kind: "string", value: "string" } }],
    };
    const expectedCanonical = '{"type":"string"}';
    expect(canonicalForm(fragment)).toBe(expectedCanonical);
    // Digest computed in the test (test code may use node:crypto freely) so the
    // assertion is decoupled from the inert stub.
    const fullHash = createHash("sha256")
      .update(expectedCanonical, "utf8")
      .digest("hex");
    const expectedSlug = fullHash.slice(0, 16);
    expect(expectedSlug.length).toBe(16);
    expect(canonicalHash(fragment)).toBe(fullHash);
    expect(schemaSlug(fragment)).toBe(expectedSlug);
    // The slug is lowercase hex.
    expect(/^[0-9a-f]{16}$/.test(schemaSlug(fragment))).toBe(true);
  });
});

// --- schema-subset.md §Lowering Algorithm step 3 — SUBS-1 union lowering -----

describe("V5f-T — SUBS-1 union lowering (schema-subset.md §Lowering Algorithm step 3)", () => {
  it("SUBS-1: an all-primitive union lowers to the multi-type-array form { type: [...] } in source order", () => {
    // SUBS-1: `string | number` → `{ "type": ["string", "number"] }`.
    const arms: LoweredUnionArm[] = [
      { kind: "primitive", type: "string" },
      { kind: "primitive", type: "number" },
    ];
    expect(lowerUnion(arms)).toEqual({ type: ["string", "number"] });
  });

  it("SUBS-1: a `string | null` union lowers to { type: [...] } with `null` counted as a primitive, null last", () => {
    // SUBS-1: `string | null` → `{ "type": ["string", "null"] }` — `null` is
    // treated as a primitive, so the union stays in the type-array form.
    const arms: LoweredUnionArm[] = [
      { kind: "primitive", type: "string" },
      { kind: "primitive", type: "null" },
    ];
    expect(lowerUnion(arms)).toEqual({ type: ["string", "null"] });
  });

  it("SUBS-1: `\"null\"` is emitted last whenever the union admits it, regardless of source position", () => {
    // *Array element order*: arms are in source order, with `"null"` last
    // whenever the union admits it — even when `null` is declared first.
    const arms: LoweredUnionArm[] = [
      { kind: "primitive", type: "null" },
      { kind: "primitive", type: "string" },
    ];
    expect(lowerUnion(arms)).toEqual({ type: ["string", "null"] });
  });

  it("SUBS-1: a union with any non-primitive arm lowers to { anyOf: [...] } in source order", () => {
    // SUBS-1: `string | Author` (mixed) → `{ "anyOf": [{ "type": "string" },
    // { "$ref": "#/$defs/Author" }] }`. Each primitive arm lowers to its
    // `{ "type": ... }` object; the non-primitive arm carries its lowered form.
    const arms: LoweredUnionArm[] = [
      { kind: "primitive", type: "string" },
      { kind: "non-primitive", lowered: { $ref: "#/$defs/Author" } },
    ];
    expect(lowerUnion(arms)).toEqual({
      anyOf: [{ type: "string" }, { $ref: "#/$defs/Author" }],
    });
  });
});

// --- schema-subset.md §Lowering Algorithm step 5 — the per-schema sidecar ----

describe("V5f-T — per-schema sidecar (schema-subset.md §Lowering Algorithm step 5)", () => {
  it("captures a wire-name translation map (one entry per renamed field; un-renamed fields absent)", () => {
    const fields: SidecarFieldInput[] = [
      {
        loomName: "first_name",
        wireName: "FirstName",
        pointer: "/properties/FirstName",
        type: { kind: "other" },
      },
      {
        // No rename — wire name equals the loom name; absent from the map.
        loomName: "age",
        pointer: "/properties/age",
        type: { kind: "other" },
      },
    ];
    const sidecar = buildSidecar(fields);
    expect(sidecar.wireNames).toContainEqual({
      loom: "first_name",
      wire: "FirstName",
    });
    expect(sidecar.wireNames.some((e) => e.loom === "age")).toBe(false);
  });

  it("captures a named-enum position iff the source type was a named `enum`; anonymous string-literal-union positions are absent", () => {
    const fields: SidecarFieldInput[] = [
      {
        loomName: "severity",
        pointer: "/properties/severity",
        type: { kind: "named-enum", enumName: "Severity" },
      },
      {
        loomName: "mode",
        pointer: "/properties/mode",
        type: { kind: "anonymous-string-literal-union" },
      },
    ];
    const sidecar = buildSidecar(fields);
    // The named-enum position is present, keyed by its JSON Pointer.
    expect(sidecar.namedEnumPositions).toContainEqual({
      pointer: "/properties/severity",
      enumName: "Severity",
    });
    // The anonymous string-literal-union position is deliberately absent.
    expect(
      sidecar.namedEnumPositions.some(
        (p) => p.pointer === "/properties/mode",
      ),
    ).toBe(false);
  });
});

// --- schema-subset.md §Lowering step 2 + §Schema-slug collision posture ------
//     loom/load/schema-slug-collision -------------------------------------

describe("V5f-T — loom/load/schema-slug-collision (schema-subset.md §Schema-slug collision posture)", () => {
  it("loom/load/schema-slug-collision: two non-byte-identical inline schemas sharing a slug fire", () => {
    // Same slug, DIFFERENT canonical-form bytes — a genuine 64-bit slug
    // collision. The lowering pass refuses to merge them and raises the
    // load-time diagnostic per the byte-equality check.
    const colliding: SlugKeyedFragment[] = [
      { slug: "0123456789abcdef", canonicalBytes: '{"type":"string"}', defName: "__inline_0123456789abcdef" },
      { slug: "0123456789abcdef", canonicalBytes: '{"type":"number"}', defName: "__inline_0123456789abcdef" },
    ];
    const result = dedupInlineSchemas(colliding, site());
    const d = result.diagnostics.find(
      (x) => x.code === "loom/load/schema-slug-collision",
    );
    expect(
      d,
      "loom/load/schema-slug-collision for two distinct inline schemas sharing a slug",
    ).toBeDefined();
    expect(d?.severity).toBe("error");
    // Message anchored to the diagnostics registry (code-registry-load.md)
    // *Message* column: `schema-slug collision on slug <slug>: two distinct
    // inline schemas hash alike`.
    expect(d?.message).toBe(
      "schema-slug collision on slug 0123456789abcdef: two distinct inline schemas hash alike",
    );
  });

  it("byte-identical inline schemas sharing a slug dedup silently (one $defs entry, no diagnostic)", () => {
    // Same slug AND byte-identical canonical form — cosmetic source differences
    // that lower alike collapse to one `$defs` entry with no diagnostic.
    const identical: SlugKeyedFragment[] = [
      { slug: "fedcba9876543210", canonicalBytes: '{"type":"string"}', defName: "__inline_fedcba9876543210" },
      { slug: "fedcba9876543210", canonicalBytes: '{"type":"string"}', defName: "__inline_fedcba9876543210" },
    ];
    const result = dedupInlineSchemas(identical, site());
    expect(
      result.entries.length,
      "byte-identical fragments dedup to one $defs entry",
    ).toBe(1);
    expect(
      result.diagnostics.some(
        (x) => x.code === "loom/load/schema-slug-collision",
      ),
      "byte-identical dedup raises no collision diagnostic",
    ).toBe(false);
  });

  it("distinct slugs are kept while a byte-identical pair dedups, with no collision diagnostic", () => {
    // Three fragments: a byte-identical pair sharing slug `aaaa…` plus one
    // distinct fragment (slug `bbbb…`). The pair collapses to one `$defs` entry
    // and the distinct fragment is retained — two entries total, no collision.
    // The byte-identical pair forces the entry count below the input length, so
    // this arm cannot pass vacuously against the inert (no-dedup) stub.
    const fragments: SlugKeyedFragment[] = [
      { slug: "aaaaaaaaaaaaaaaa", canonicalBytes: '{"type":"string"}', defName: "__inline_aaaaaaaaaaaaaaaa" },
      { slug: "aaaaaaaaaaaaaaaa", canonicalBytes: '{"type":"string"}', defName: "__inline_aaaaaaaaaaaaaaaa" },
      { slug: "bbbbbbbbbbbbbbbb", canonicalBytes: '{"type":"number"}', defName: "__inline_bbbbbbbbbbbbbbbb" },
    ];
    const result = dedupInlineSchemas(fragments, site());
    expect(
      result.entries.length,
      "the byte-identical pair dedups; the distinct fragment is retained",
    ).toBe(2);
    expect(
      result.diagnostics.some(
        (x) => x.code === "loom/load/schema-slug-collision",
      ),
    ).toBe(false);
  });
});
