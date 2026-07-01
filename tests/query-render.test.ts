import { describe, expect, it } from "vitest";
import {
  EMPTY_TEMPLATE_CODE,
  EMPTY_TEMPLATE_MESSAGE,
  EMPTY_TEMPLATE_RENDER_MESSAGE,
  ILLEGAL_TEMPLATE_ESCAPE_CODE,
  INTERPOLATED_RESULT_CODE,
  INTERPOLATED_RESULT_MESSAGE,
  UNTERMINATED_TEMPLATE_CODE,
  UNTERMINATED_TEMPLATE_MESSAGE,
  emptyTemplateWarning,
  illegalTemplateEscapeMessage,
  lexQueryTemplate,
  renderEmptyShortCircuit,
  renderTemplateText,
  stringifyInterpolatedValue,
  type QueryTemplatePart,
} from "../src/render/query-render";
import { makeEnumValue, makeOk } from "../src/runtime/value";

// V13a-T — failing tests for the paired `V13a` "query render and escapes"
// implementation.
//
// Spec: query/query-forms.md (QRY-6, QRY-7), query/query-escapes-stringification.md
// (QRY-17, QRY-18). The pure `@`...`` render pipeline is: escape-lex → stringify
// each `${expr}` by its Loom static type → concatenate → newline-trim → dedent,
// with two degenerate-template defences (parse-time warning + runtime
// short-circuit).
//
// These tests red because the V13a behaviour is absent: `renderTemplateText` is
// an identity stub (no newline-trim / dedent), `lexQueryTemplate` emits no
// escape/termination diagnostics and never resolves escapes or splits
// interpolations, `stringifyInterpolatedValue` returns empty text and never
// rejects a `Result`, and both degenerate-template defences are no-ops. Each
// test reds on its own primary assertion, not on a compile error, missing
// fixture, or harness throw.

/** Concatenate the resolved literal text of a lexed template's `text` parts. */
function textOf(parts: readonly QueryTemplatePart[]): string {
  return parts
    .filter((p): p is Extract<QueryTemplatePart, { kind: "text" }> => p.kind === "text")
    .map((p) => p.value)
    .join("");
}

describe("V13a-T — newline-trim → dedent order (query-forms.md QRY-7)", () => {
  // The normative vector table of QRY-7. `\n`, `\r`, `\t` are literal bytes in
  // the assembled template text (post-escape, post-interpolation); `\u00A0` is a
  // literal no-break space. Order is fixed: newline-trim first, then dedent.
  const vectors: readonly { readonly name: string; readonly input: string; readonly rendered: string }[] = [
    { name: "1 uniform space indent", input: "\n    The author...\n    with...\n    Produce...\n", rendered: "The author...\nwith...\nProduce..." },
    { name: "2 whitespace-only middle line", input: "\n    a\n      \n    b\n", rendered: "a\n\nb" },
    { name: "3 tab-only indent", input: "\n\t\tx\n\t\ty\n", rendered: "x\ny" },
    { name: "4 mixed tab/space no common prefix", input: "\n\tx\n  y\n", rendered: "\tx\n  y" },
    { name: "5 single line preserves leading ws", input: "  hi", rendered: "  hi" },
    { name: "6 lone newline", input: "\n", rendered: "" },
    { name: "7 newline-trim then dedent", input: "\n    only\n", rendered: "only" },
    { name: "8 trailing whitespace line not trimmed", input: "\n    only\n  ", rendered: "only\n" },
    { name: "9 CRLF normalised to LF", input: "\n    a\r\n    b\n", rendered: "a\nb" },
    { name: "10 non-ASCII leading ws is content", input: "\n\u00A0x\n\u00A0y\n", rendered: "\u00A0x\n\u00A0y" },
  ];

  for (const vector of vectors) {
    it(`QRY-7: reproduces normative vector ${vector.name}`, () => {
      // QRY-7 — the two normalisations, newline-trim then dedent, reproduce the
      // vector's rendered text exactly.
      expect(renderTemplateText(vector.input)).toBe(vector.rendered);
    });
  }
});

describe("V13a-T — template escapes and termination (query-escapes-stringification.md QRY-17)", () => {
  it("QRY-17: resolves the recognised escapes to their literal bytes", () => {
    // `` \` `` → literal backtick, `\\` → literal backslash, `\n` → newline byte.
    expect(textOf(lexQueryTemplate("`a\\`b`").parts)).toBe("a`b");
    expect(textOf(lexQueryTemplate("`a\\\\b`").parts)).toBe("a\\b");
    expect(textOf(lexQueryTemplate("`a\\nb`").parts)).toBe("a\nb");
  });

  it("QRY-17: `\\$` suppresses interpolation (literal `$`, no interp part)", () => {
    // `\$` renders a literal `$` and does not open a `${...}` interpolation.
    const result = lexQueryTemplate("`price \\${x}`");
    expect(textOf(result.parts)).toBe("price ${x}");
    expect(result.parts.some((p) => p.kind === "interp")).toBe(false);
  });

  it("QRY-17: an unescaped `${...}` splits into an interpolation part", () => {
    // Only the `${` / `}` pair delimits an interpolation; braces alone are text.
    const result = lexQueryTemplate("`hi ${name}!`");
    expect(result.parts).toEqual([
      { kind: "text", value: "hi " },
      { kind: "interp", exprSource: "name" },
      { kind: "text", value: "!" },
    ]);
  });

  it("QRY-17: a backslash before any other character fires loom/parse/illegal-template-escape", () => {
    // `\x` is not a recognised escape → loom/parse/illegal-template-escape,
    // message from the diagnostics registry (code-registry-parse.md).
    const result = lexQueryTemplate("`a\\xb`");
    const diag = result.diagnostics.find((d) => d.code === ILLEGAL_TEMPLATE_ESCAPE_CODE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe("error");
    expect(diag?.message).toBe(illegalTemplateEscapeMessage("x"));
  });

  it("QRY-17: EOF inside a body fires loom/parse/unterminated-template", () => {
    // No closing backtick → loom/parse/unterminated-template and terminated:false.
    const result = lexQueryTemplate("`no closing backtick");
    expect(result.terminated).toBe(false);
    const diag = result.diagnostics.find((d) => d.code === UNTERMINATED_TEMPLATE_CODE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe("error");
    expect(diag?.message).toBe(UNTERMINATED_TEMPLATE_MESSAGE);
  });
});

describe("V13a-T — stringification of interpolated values (query-escapes-stringification.md QRY-18)", () => {
  it("QRY-18: `string` renders the value itself, unquoted and unescaped", () => {
    const r = stringifyInterpolatedValue("hello \"x\"", { kind: "string" });
    expect(r).toEqual({ ok: true, text: 'hello "x"' });
  });

  it("QRY-18: `integer` renders the canonical decimal", () => {
    expect(stringifyInterpolatedValue(42, { kind: "integer" })).toEqual({ ok: true, text: "42" });
  });

  it("QRY-18: `number` renders the shortest round-trip decimal", () => {
    expect(stringifyInterpolatedValue(3.14, { kind: "number" })).toEqual({ ok: true, text: "3.14" });
  });

  it("QRY-18: `boolean` renders `true` / `false`", () => {
    expect(stringifyInterpolatedValue(true, { kind: "boolean" })).toEqual({ ok: true, text: "true" });
  });

  it("QRY-18: `null` renders the literal text `null`", () => {
    expect(stringifyInterpolatedValue(null, { kind: "null" })).toEqual({ ok: true, text: "null" });
  });

  it("QRY-18: an enum variant renders its bare wire value, unquoted", () => {
    // The declaring-enum brand is dropped — the model only ever sees wire forms.
    const value = makeEnumValue("Severity", "high");
    expect(stringifyInterpolatedValue(value, { kind: "enum" })).toEqual({ ok: true, text: "high" });
  });

  it("QRY-18: `array<T>` renders compact JSON.stringify", () => {
    expect(stringifyInterpolatedValue([1, 2, 3], { kind: "array" })).toEqual({ ok: true, text: "[1,2,3]" });
  });

  it("QRY-18: a schema-typed object renders compact JSON.stringify", () => {
    const value = { a: 1, b: "x" };
    expect(stringifyInterpolatedValue(value, { kind: "object" })).toEqual({ ok: true, text: '{"a":1,"b":"x"}' });
  });

  it("QRY-18: a `Result`-valued interpolation fires loom/parse/interpolated-result", () => {
    // Static rejection resolved from the expression's type (query-escapes-
    // stringification.md, `Result` row); message from the diagnostics registry.
    const result = stringifyInterpolatedValue(makeOk("x"), { kind: "result" });
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected a Result interpolation to be rejected");
    }
    expect(result.diagnostic.code).toBe(INTERPOLATED_RESULT_CODE);
    expect(result.diagnostic.severity).toBe("error");
    expect(result.diagnostic.message).toBe(INTERPOLATED_RESULT_MESSAGE);
  });
});

describe("V13a-T — degenerate rendered templates (query-forms.md QRY-6)", () => {
  it("QRY-6: parse-time warning fires on a whitespace-only static body and is suppressed by an explicit `\\n` literal", () => {
    // Positive half (reds on the inert stub): a whitespace-only static body
    // (escapes NOT applied) emits the loom/parse/empty-template warning.
    const diag = emptyTemplateWarning("   \n  \n");
    expect(diag).toBeDefined();
    expect(diag?.code).toBe(EMPTY_TEMPLATE_CODE);
    expect(diag?.severity).toBe("warning");
    expect(diag?.message).toBe(EMPTY_TEMPLATE_MESSAGE);
    // Suppression hatch: pre-escape the body is the non-whitespace two-character
    // sequence `\n`, so no warning fires.
    expect(emptyTemplateWarning("\\n")).toBeUndefined();
  });

  it("QRY-6: an empty rendered template short-circuits to ValidationError{empty_template, attempts:0} (not respond-repair)", () => {
    // Runtime short-circuit — never the respond-repair path: attempts is 0.
    const error = renderEmptyShortCircuit("");
    expect(error).toBeDefined();
    expect(error?.kind).toBe("validation");
    expect(error?.cause).toBe("empty_template");
    expect(error?.message).toBe(EMPTY_TEMPLATE_RENDER_MESSAGE);
    expect(error?.attempts).toBe(0);
    expect(error?.validation_errors).toEqual([]);
    expect(error?.raw_response).toBeNull();

    // An ASCII-whitespace-only render short-circuits identically (attempts 0,
    // no respond-repair follow-up).
    const wsError = renderEmptyShortCircuit("  \t\n ");
    expect(wsError?.cause).toBe("empty_template");
    expect(wsError?.attempts).toBe(0);

    // Negative halves: a render of only non-ASCII whitespace (U+00A0 lies
    // outside the ASCII whitespace set) and a non-degenerate render both issue
    // a turn rather than short-circuiting.
    expect(renderEmptyShortCircuit("\u00A0")).toBeUndefined();
    expect(renderEmptyShortCircuit("hello")).toBeUndefined();
  });
});
