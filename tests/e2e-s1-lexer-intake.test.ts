import { describe, expect, it } from "vitest";
import { lexBytes, lexSrc, codes, hasCode } from "./helpers/e2e-s1";

// e2e S1 — lexical intake coverage gap-fill (LEX area).
//
// Drives the shipped lexer (`src/lexer/lexer.ts`, via `lexTheta`) to cover
// REQ-LEX rows the existing suite leaves UNCOVERED per the coverage map:
//   - REQ-LEX-1  leading UTF-8 BOM consumed and ignored (spec-requirements.md:96)
//   - REQ-LEX-3  no transcoding; a UTF-16 save fails fast (spec-requirements.md:98)
//   - REQ-LEX-26 regular strings perform no interpolation (spec-requirements.md:121)
//   - REQ-LEX-16 semicolons are not part of the grammar (spec-requirements.md:111)
//   - REQ-LEX-10 identifiers match [A-Za-z_][A-Za-z0-9_]* (spec-requirements.md:105)
// Spec: docs/spec_topics/lexical.md.

describe("REQ-LEX-1 — leading UTF-8 BOM is consumed and ignored", () => {
  it("a BOM-prefixed source tokenises byte-identically to the BOM-free source", () => {
    const src = "let x = 1\n";
    const bom = new TextEncoder().encode("\uFEFF" + src);
    const plain = new TextEncoder().encode(src);

    const withBom = lexBytes(bom);
    const noBom = lexBytes(plain);

    expect(hasCode(withBom.diagnostics, "theta/load/invalid-encoding")).toBe(false);
    expect(withBom.ok).toBe(true);
    // Token streams must match kind+text+value (the BOM leaves no trace).
    const project = (r: typeof withBom) =>
      r.tokens.map((t) => ({ kind: t.kind, text: t.text, value: t.value }));
    expect(project(withBom)).toEqual(project(noBom));
  });
});

describe("REQ-LEX-3 — no transcoding; UTF-16 fails fast", () => {
  it("a UTF-16LE (BOM-led) source is theta/load/invalid-encoding at byte offset 0, not mojibake", () => {
    // UTF-16LE BOM 0xFF 0xFE then 'l','\0','e','\0','t','\0' — 0xFF is not a
    // valid UTF-8 lead byte, so validation faults on its own leading byte.
    const utf16 = new Uint8Array([0xff, 0xfe, 0x6c, 0x00, 0x65, 0x00, 0x74, 0x00]);
    const r = lexBytes(utf16);
    const diag = r.diagnostics.find((d) => d.code === "theta/load/invalid-encoding");
    expect(diag, `expected invalid-encoding; got ${codes(r.diagnostics).join(",")}`).toBeDefined();
    expect(diag?.message).toContain("byte offset 0");
    expect(r.ok).toBe(false);
    // No usable tokens are produced from mojibake.
    expect(r.tokens.filter((t) => t.kind !== "eof")).toEqual([]);
  });
});

describe("REQ-LEX-26 — regular strings perform no interpolation", () => {
  it('a double-quoted "${x}" lexes as literal text, not an interpolation', () => {
    const r = lexSrc('let s = "${x}"\n');
    expect(hasCode(r.diagnostics, "theta/load/invalid-encoding")).toBe(false);
    const strTok = r.tokens.find((t) => t.kind === "string");
    expect(strTok, "a string token").toBeDefined();
    // The decoded value contains the literal `${x}` characters.
    expect(strTok?.value).toBe("${x}");
  });

  it("single-quoted '${y}' is likewise literal text", () => {
    const r = lexSrc("let s = '${y}'\n");
    const strTok = r.tokens.find((t) => t.kind === "string");
    expect(strTok?.value).toBe("${y}");
  });
});

describe("REQ-LEX-16 — semicolons are not part of the grammar", () => {
  it("a trailing semicolon statement terminator is rejected (not silently accepted)", () => {
    const r = lexSrc("let x = 1;\n");
    const errs = r.diagnostics.filter((d) => d.severity === "error");
    expect(
      errs.length,
      `expected a diagnostic for the ';'; got codes ${codes(r.diagnostics).join(",")}`,
    ).toBeGreaterThan(0);
  });
});

describe("REQ-LEX-10 — identifiers match [A-Za-z_][A-Za-z0-9_]*", () => {
  it("the identifier char-class boundary excludes a non-ASCII letter", () => {
    // `café` — the `é` is outside the class, so the identifier token stops at
    // `caf`; the char-class is enforced at the lexer boundary. (The stray `é`
    // punct that follows is swallowed silently — see FIND-S1-8.)
    const r = lexSrc("let café = 1\n");
    const idents = r.tokens.filter((t) => t.kind === "ident").map((t) => t.text);
    expect(idents).toContain("caf");
    expect(idents).not.toContain("café");
  });

  it("a valid ASCII identifier with digits and underscores lexes whole", () => {
    const r = lexSrc("let my_var2 = 1\n");
    const idents = r.tokens.filter((t) => t.kind === "ident").map((t) => t.text);
    expect(idents).toContain("my_var2");
  });
});
