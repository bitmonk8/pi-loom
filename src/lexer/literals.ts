// V1b / V1b-T — the literal-and-path validation seam.
//
// String and number *lexing* (the escape table, the integer/number type
// classification, and the parse-time range checks) live in the V1a lexer core
// (`lexLoom`, src/lexer/lexer.ts): V1b fills in escape decoding onto the
// `Token.value` field, the integer/number tag onto `Token.numericType`, and the
// `loom/parse/{illegal-escape,invalid-unicode-escape,integer-literal-out-of-range,
// number-literal-not-finite,unsupported-feature}` diagnostics the lexer raises
// during scanning (per spec_topics/lexical.md §"String literals" / §"Number
// literals"). This module owns the two literal checks that need a parse / type
// context the tokeniser does not have:
//
//   - `validatePathLiteral` — the path-literal rules from
//     lexical.md §"Path literals" / §"Extension matching": forward-slash
//     separators only (`loom/parse/invalid-path-separator`) and the byte-exact
//     lowercase `.loom` / `.warp` final-segment check
//     (`loom/parse/invoke-non-loom-extension` / `loom/parse/import-non-warp-extension`).
//     Later import / invoke / `tools:` parser leaves call this against the
//     resolved path literal.
//   - `checkIntegerNarrowing` — the one-way `integer → number` widening rule from
//     lexical.md §"Number literals" (`loom/parse/integer-narrowing` when a
//     `number` value reaches an `integer` position). The full type-compatibility
//     engine (V2b) consumes this literal-level check.
//
// V1b-T (tests-task) declares the seam shapes and stubs both functions as inert
// no-ops so the failing tests compile and red on their own primary assertions
// (no diagnostic produced). The paired V1b implementation leaf fills them in.

import { type Diagnostic, type SourceRange } from "../diagnostics/diagnostic";

/** The numeric-literal type classification (lexical.md §"Number literals"). */
export type NumericLiteralType = "integer" | "number";

/** Where a path literal appears — selects the byte-exact extension check. */
export type PathLiteralKind = "import" | "invoke" | "tools";

/** A path literal as written in source (post-escape-decode value + its span). */
export interface PathLiteral {
  /** The decoded path string, exactly as written (no realpath normalisation). */
  readonly value: string;
  /** The source span of the literal, used in diagnostic locations. */
  readonly range: SourceRange;
}

/** A located site at which a numeric narrowing is judged. */
export interface NarrowingSite {
  readonly file: string;
  readonly range: SourceRange;
}

/**
 * Validate a path literal against the lexical.md path-literal rules. Produces
 * (in spec order) `loom/parse/invalid-path-separator` for any backslash, then
 * the byte-exact lowercase final-segment check: an `invoke` / `tools:` path that
 * does not end in `.loom` is `loom/parse/invoke-non-loom-extension`, and an
 * `import` path that does not end in `.warp` is
 * `loom/parse/import-non-warp-extension`. The check is byte-exact lowercase, so
 * `.LOOM` is rejected identically on case-sensitive and case-insensitive hosts.
 *
 * Stub (V1b-T): returns no diagnostics, so the tests red on the absent code.
 */
export function validatePathLiteral(
  _literal: PathLiteral,
  _kind: PathLiteralKind,
  _file: string,
): Diagnostic[] {
  return [];
}

/**
 * Judge a numeric narrowing: when a `number` value reaches an `integer`
 * position, return `loom/parse/integer-narrowing`; the reverse (`integer`
 * widening to `number`) is permitted and returns `undefined`.
 *
 * Stub (V1b-T): always returns `undefined`, so the narrowing test reds on the
 * absent diagnostic.
 */
export function checkIntegerNarrowing(
  _sourceType: NumericLiteralType,
  _targetType: NumericLiteralType,
  _site: NarrowingSite,
): Diagnostic | undefined {
  return undefined;
}
