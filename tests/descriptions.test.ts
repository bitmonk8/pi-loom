import { describe, expect, it } from "vitest";
import {
  checkDocCommentPlacement,
  extractDescription,
  joinDocComment,
  lowerDescription,
  type DocAnchorKind,
} from "../src/parser/descriptions";
import type { Diagnostic, SourceRange } from "../src/diagnostics/diagnostic";

// V5c-T — failing tests for the paired `V5c` "Descriptions (`///`)"
// implementation.
//
// Spec: descriptions.md (§Placement — the eligible anchor list and the
// `theta/parse/doc-comment-misplaced` production; §Multi-line — newline-join +
// common-leading-whitespace strip + empty-line handling; §No transformation —
// byte-for-byte lowering; §`//` is a regular code comment — not propagated) and
// the normative anchor list at grammar.md §`///` placement.
//
// The lowering, multi-line join, and placement checks are asserted against the
// standalone `joinDocComment` / `extractDescription` / `lowerDescription` /
// `checkDocCommentPlacement` seams (src/parser/descriptions.ts) — the resolved
// doc-comment model the tokeniser does not carry.
//
// Diagnostic *Message* strings are sourced from the diagnostics registry
// (diagnostics/code-registry-parse.md) per the *Diagnostic message anchors*
// rule.
//
// These tests red because the V5c description lowering is absent: every seam is
// an inert stub. Each test reds on its own primary assertion (an absent
// description / an absent diagnostic / an empty join), not on a compile error,
// missing fixture, or harness throw.

/** A throwaway 1:1–1:2 span for the seam calls. */
function span(): SourceRange {
  return { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } };
}

/** A located site at the throwaway span. */
function site(): { file: string; range: SourceRange } {
  return { file: "test.theta", range: span() };
}

/** The first diagnostic carrying `code`, if any. */
function withCode(diags: readonly Diagnostic[], code: string): Diagnostic | undefined {
  return diags.find((d) => d.code === code);
}

// --- descriptions.md §No transformation / §Placement — `///` lowering -------

describe("V5c-T — `///` lowering into `description:` (DESC code-keyed area)", () => {
  it("a `///` above a schema/enum/field/variant lowers byte-for-byte into `description:`; a `fn` `///` stays AST-only", () => {
    // descriptions.md §No transformation: "Theta emits description text
    // byte-for-byte into the lowered schema; no escaping, dedenting, or
    // wrapping is performed beyond the multi-line join and common-leading-
    // whitespace strip." The four schema-bearing anchors all lower the text
    // into `description`.
    const text = "A user submitting a code review request";
    const schemaBearing: readonly DocAnchorKind[] = [
      "schema",
      "enum",
      "field",
      "variant",
    ];
    for (const anchor of schemaBearing) {
      const lowered = lowerDescription(text, anchor, { type: "object" });
      expect(
        lowered.description,
        `${anchor} anchor lowers the doc-comment text byte-for-byte into description:`,
      ).toBe(text);
      // No transformation beyond join+strip: the pre-existing fragment keys are
      // preserved untouched alongside the added description.
      expect(lowered.type, `${anchor} anchor preserves the base fragment`).toBe(
        "object",
      );
    }

    // descriptions.md §Placement: "A `///` description on a `fn` does not lower
    // into JSON Schema (functions have no schema); it is preserved on the AST
    // as human-facing documentation only." The lowered fragment carries no
    // `description`.
    const fnLowered = lowerDescription(text, "fn", { type: "object" });
    expect(
      fnLowered.description,
      "a `fn` `///` does not lower into JSON Schema — it stays AST-only",
    ).toBeUndefined();
  });
});

// --- descriptions.md §Placement / grammar.md §`///` placement ---------------

describe("V5c-T — doc-comment placement (theta/parse/doc-comment-misplaced)", () => {
  it("theta/parse/doc-comment-misplaced: a `///` not above an eligible target fires; an eligible anchor does not", () => {
    // descriptions.md §Placement + grammar.md §`///` placement: a `///` above
    // any production other than schema/enum/field/variant/fn fires
    // `theta/parse/doc-comment-misplaced`.
    const ineligible = ["let", "import", "export", "expression", "control-flow"];
    for (const production of ineligible) {
      const d = checkDocCommentPlacement(production, site());
      expect(
        d,
        `theta/parse/doc-comment-misplaced fires above '${production}'`,
      ).toBeDefined();
      expect(d?.code).toBe("theta/parse/doc-comment-misplaced");
      // Message from code-registry-parse.md.
      expect(d?.message).toBe(
        "'///' doc comment is not legal above this production",
      );
    }

    // The five eligible anchor productions raise no diagnostic.
    const eligible = ["schema", "enum", "field", "variant", "fn"];
    for (const production of eligible) {
      expect(
        checkDocCommentPlacement(production, site()),
        `an eligible '${production}' anchor raises no doc-comment-misplaced diagnostic`,
      ).toBeUndefined();
    }
  });
});

// --- descriptions.md §Multi-line / §`//` is a regular code comment ----------

describe("V5c-T — multi-line join + common-leading-whitespace strip (DESC code-keyed area)", () => {
  it("consecutive `///` lines join with newlines and common leading whitespace is stripped; empty `///` lines become blank lines", () => {
    // descriptions.md §Multi-line: "Consecutive `///` lines are joined with
    // newlines into one description string. Common leading whitespace inside
    // the description is stripped (same algorithm as query-template dedent).
    // Empty `///` lines become blank lines."
    //
    // `docLines` are the RestOfLine contents of each `///` line — the text
    // after the `///` marker, leading space(s) included. Here every non-blank
    // line shares a three-space common prefix that is stripped uniformly.
    const joined = joinDocComment(["   first line", "", "   second line"]);
    expect(
      joined,
      "common leading whitespace stripped; empty `///` line becomes a blank line",
    ).toBe("first line\n\nsecond line");

    // A single `///` line: its one-space `RestOfLine` prefix is the common
    // prefix and is stripped (byte-for-byte payload survives).
    expect(
      joinDocComment([" A user submitting a code review request"]),
      "a single `///` line strips its common leading whitespace",
    ).toBe("A user submitting a code review request");
  });

  it("a regular `//` comment is not propagated into the description", () => {
    // descriptions.md §`//` is a regular code comment: "`//` introduces a
    // regular line comment (not part of any description)." A `//` line
    // terminates the trailing `///` run and contributes nothing; only the
    // consecutive `///` run immediately above the anchor is collected.
    expect(
      extractDescription(["// a regular comment", "/// kept description"]),
      "only the trailing `///` run is collected; the `//` line is not propagated",
    ).toBe("kept description");

    // Two consecutive `///` lines join; a leading `//` line is still excluded.
    expect(
      extractDescription(["// noise", "/// line one", "/// line two"]),
      "consecutive `///` lines join; the `//` line is not propagated",
    ).toBe("line one\nline two");

    // No `///` line at all → no description.
    expect(
      extractDescription(["// only a regular comment"]),
      "a block with no `///` line yields no description",
    ).toBeUndefined();
  });
});
