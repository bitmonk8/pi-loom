// V5c / V5c-T — the `///` doc-comment description seam.
//
// This module owns the parse-time lowering of Rust-style `///` doc comments
// into JSON Schema `description:` fields, the multi-line join + common-leading-
// whitespace strip, and the placement check (descriptions.md §Placement /
// §Multi-line / §`//` is a regular code comment, and grammar.md
// §`///` placement):
//
//   - `///` above a `schema` / `enum` / schema field / enum variant lowers its
//     joined text byte-for-byte into the anchor's `description:`; a `///` above
//     a top-level `fn` lowers nowhere (functions have no JSON Schema) and is
//     preserved on the AST as human-facing documentation only.
//   - `loom/parse/doc-comment-misplaced` — a `///` above any other production
//     (`let`, `import`, `export`, expression / control-flow statements).
//   - Consecutive `///` lines join with newlines; common leading whitespace is
//     stripped (same algorithm as query-template dedent); empty `///` lines
//     become blank lines; a regular `//` comment is never propagated.
//
// V5c-T (tests-task) declares these seam shapes and stubs the behaviour-bearing
// functions so the failing tests compile and red on their own primary
// assertions. The paired V5c implementation leaf fills these in.

import { type Diagnostic, type SourceRange } from "../diagnostics/diagnostic";

/** A located site at which a `///` doc comment is checked. */
export interface DocCommentSite {
  readonly file: string;
  readonly range: SourceRange;
}

/**
 * The eligible anchor productions a `///` may sit above per descriptions.md
 * §Placement and grammar.md §`///` placement. `schema`/`enum`/`field`/`variant`
 * lower into JSON Schema; `fn` is eligible but lowers nowhere (AST-only).
 */
export type DocAnchorKind = "schema" | "enum" | "field" | "variant" | "fn";

/**
 * Join a multi-line `///` doc comment into one description string. Each element
 * of `docLines` is the `RestOfLine` content of one `///` line — the text after
 * the `///` marker, leading whitespace included. The lines are joined with
 * `\n`, the common leading whitespace shared by every non-blank line is then
 * stripped (the same dedent algorithm as query templates), and empty `///`
 * lines become blank lines. No other transformation is performed.
 */
export function joinDocComment(docLines: readonly string[]): string {
  // Stub: the V5c implementation performs the newline-join + common-leading-
  // whitespace strip. An inert empty string reds the multi-line-join tests on
  // their own primary assertion.
  void docLines;
  return "";
}

/**
 * Extract the description text from the maximal run of `///` lines immediately
 * above an anchor. Each element of `commentLines` is one raw comment line,
 * including its `//` or `///` marker. Only `///` lines contribute; a regular
 * `//` line is not propagated into the description and terminates the run.
 * Returns `undefined` when no trailing `///` line is present.
 */
export function extractDescription(
  commentLines: readonly string[],
): string | undefined {
  // Stub: the V5c implementation isolates the trailing `///` run, strips the
  // `///` marker, and delegates to `joinDocComment`. An inert `undefined` reds
  // the `//`-not-propagated test on its own primary assertion.
  void commentLines;
  return undefined;
}

/**
 * Lower a doc comment onto an anchor's JSON Schema fragment. For a
 * `schema`/`enum`/`field`/`variant` anchor the `description` text is written
 * byte-for-byte as the fragment's `description` (no escaping, dedenting, or
 * wrapping beyond the join the caller already applied). For a `fn` anchor the
 * fragment is returned unchanged — functions have no JSON Schema, so the
 * description stays AST-only.
 */
export function lowerDescription(
  description: string,
  anchor: DocAnchorKind,
  fragment: Record<string, unknown>,
): Record<string, unknown> {
  // Stub: the V5c implementation writes `description` for the schema-bearing
  // anchors and leaves the fragment untouched for `fn`. An inert pass-through
  // (never writing `description`) reds the byte-for-byte lowering tests on
  // their own primary assertions while leaving the `fn` AST-only case correct.
  void description;
  void anchor;
  return fragment;
}

/**
 * Check a `///` doc comment's placement, returning
 * `loom/parse/doc-comment-misplaced` when the production the `///` sits above is
 * not one of `schema` / `enum` / schema field / enum variant / top-level `fn`.
 * Returns `undefined` for an eligible anchor production.
 */
export function checkDocCommentPlacement(
  production: string,
  site: DocCommentSite,
): Diagnostic | undefined {
  // Stub: the V5c implementation fires the diagnostic for ineligible
  // productions. An inert `undefined` reds the placement test on its own
  // primary assertion (an absent expected diagnostic).
  void production;
  void site;
  return undefined;
}
