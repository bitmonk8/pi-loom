// FIX-1 (parser structural) regression tests — the front-end diagnostics landed
// for the e2e campaign findings B1/A3/A4/A1/B2/B3. These drive the shipped
// front-end (`parseLoomDocument` / `lexLoom`) via the S1 helper and assert the
// spec-registered diagnostic fires (and, for B1, that no field is dropped).
// NOT a campaign witness file: it runs in the default suite as a permanent gate.

import { describe, expect, it } from "vitest";
import { parseDoc, lexSrc, codes, hasCode } from "./helpers/e2e-s1";

describe("B1 (FIND-S7-1) — schema fields must be comma-separated", () => {
  it("a newline-separated (comma-missing) field body errors and drops no field", () => {
    const doc = parseDoc(
      ["schema Reply {", "  status: string", "  summary: string", "}"].join("\n") +
        "\n",
    );
    // A grammar-violation diagnostic fires (the loom does not load clean).
    expect(hasCode(doc.diagnostics, "loom/parse/unsupported-feature"), codes(doc.diagnostics).join(",")).toBe(true);
    // The second field is NOT silently coalesced into the first: the schema
    // must keep BOTH declared fields, not lower to a corrupted smaller shape.
    const schema = doc.body.statements.find((s) => s.kind === "schema");
    expect(schema && "fields" in schema ? schema.fields?.map((f) => f.name) : undefined).toEqual([
      "status",
      "summary",
    ]);
  });

  it("the comma-separated form parses cleanly to two fields", () => {
    const doc = parseDoc(
      ["schema Reply {", "  status: string,", "  summary: string", "}"].join("\n") +
        "\n",
    );
    expect(doc.diagnostics).toEqual([]);
    const schema = doc.body.statements.find((s) => s.kind === "schema");
    expect(schema && "fields" in schema ? schema.fields?.map((f) => f.name) : undefined).toEqual([
      "status",
      "summary",
    ]);
  });
});

describe("A3 (FIND-S1-3 / S4-5) — object-field validation is wired in body position", () => {
  it("an extra field on a declared schema is loom/parse/extra-object-field", () => {
    const doc = parseDoc(
      "schema Point { x: integer, y: integer }\nlet p = Point { x: 1, y: 2, z: 3 }\n",
    );
    expect(hasCode(doc.diagnostics, "loom/parse/extra-object-field")).toBe(true);
  });

  it("an omitted required field is loom/parse/missing-object-field", () => {
    const doc = parseDoc(
      "schema Point { x: integer, y: integer }\nlet p = Point { x: 1 }\n",
    );
    expect(hasCode(doc.diagnostics, "loom/parse/missing-object-field")).toBe(true);
  });

  it("a well-formed constructor with every declared field is clean", () => {
    const doc = parseDoc(
      "schema Point { x: integer, y: integer }\nlet p = Point { x: 1, y: 2 }\n",
    );
    expect(codes(doc.diagnostics)).not.toContain("loom/parse/extra-object-field");
    expect(codes(doc.diagnostics)).not.toContain("loom/parse/missing-object-field");
  });
});

describe("A4 (FIND-S1-4 / S4-6) — bare object literal", () => {
  it("a schemaless { … } in expression position is loom/parse/bare-object-literal", () => {
    const doc = parseDoc('let cfg = { name: "x" }\n');
    expect(hasCode(doc.diagnostics, "loom/parse/bare-object-literal")).toBe(true);
  });

  it("a bare object as the single argument of a Pi-tool call is carved out", () => {
    const doc = parseDoc(
      '---\nmode: subagent\ntools: grep\n---\ngrep({ pattern: "x", path: "src" })?\n',
    );
    expect(codes(doc.diagnostics)).not.toContain("loom/parse/bare-object-literal");
  });
});

describe("A1 (FIND-S1-1 / S4-1) — unknown identifier", () => {
  it("a bare identifier resolving to nothing is loom/parse/unknown-identifier", () => {
    const doc = parseDoc("let x = missing_binding\n");
    expect(hasCode(doc.diagnostics, "loom/parse/unknown-identifier")).toBe(true);
  });

  it("an unknown call callee is flagged", () => {
    const doc = parseDoc("let x = frobnicate()\n");
    expect(hasCode(doc.diagnostics, "loom/parse/unknown-identifier")).toBe(true);
  });

  it("params, let-bindings and imports are legitimate binding sources (no false positive)", () => {
    const doc = parseDoc(
      [
        "---",
        "mode: subagent",
        "params:",
        "  text: string",
        "---",
        'import { helper } from "./lib.warp"',
        "let s = helper(text)",
        "s",
      ].join("\n") + "\n",
    );
    expect(codes(doc.diagnostics)).not.toContain("loom/parse/unknown-identifier");
  });

  it("match-arm pattern bindings are in scope in the arm body", () => {
    const doc = parseDoc(
      'let r = match @`hi` {\n  Ok(text) => text,\n  Err(e) => "failed"\n}\nr\n',
    );
    expect(codes(doc.diagnostics)).not.toContain("loom/parse/unknown-identifier");
  });
});

describe("B2 (FIND-S1-7) — unparenthesised fn is rejected", () => {
  it("fn f x { … } (missing parens) is a parse error", () => {
    const doc = parseDoc("fn f x {\n  x\n}\n");
    expect(hasCode(doc.diagnostics, "loom/parse/unsupported-feature")).toBe(true);
  });

  it("a parenthesised fn declaration is clean", () => {
    const doc = parseDoc("fn f(x: integer): integer {\n  x\n}\n");
    expect(codes(doc.diagnostics)).not.toContain("loom/parse/unsupported-feature");
  });
});

describe("B3 (FIND-S1-8) — stray punctuation is rejected", () => {
  it("a trailing semicolon is rejected at the lexer", () => {
    const r = lexSrc("let x = 1;\n");
    expect(r.diagnostics.some((d) => d.severity === "error")).toBe(true);
  });
});
