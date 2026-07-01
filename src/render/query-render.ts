// V13a / V13a-T — the query-template render / escapes / stringification seam.
//
// This module owns the pure `@`...`` query-template rendering pipeline of
// query/query-forms.md and query/query-escapes-stringification.md:
//
//   - QRY-7 — newline-trim → dedent (in that fixed order), reproducing the
//     normative vector table (CR/CRLF normalised to LF first, LF-only line
//     splitting, {U+0020, U+0009} dedent alphabet, whitespace-only-line
//     normalisation).
//   - QRY-17 — template escapes (`` \` ``, `\$`, `\\`, `\n`, `\t`, `\r`) with
//     `loom/parse/illegal-template-escape` for any other backslash pair and
//     `loom/parse/unterminated-template` at EOF inside a body.
//   - QRY-18 — stringification of a `${expr}` interpolation by the Loom static
//     type of `expr`, and the static `loom/parse/interpolated-result` rejection
//     of a `Result`-valued interpolation.
//   - QRY-6 — the degenerate-template defences: the parse-time
//     `loom/parse/empty-template` warning (static body, escapes NOT applied),
//     and the runtime short-circuit to
//     `ValidationError{cause: "empty_template", attempts: 0}` (never the
//     respond-repair path).
//
// V13a-T (tests-task) declares the seam shapes and stubs the behaviour-bearing
// functions inertly so the failing tests compile and red on their own primary
// assertions (the render pipeline is an identity stub, the lexer emits no
// escape/termination diagnostics, stringification returns empty text, and both
// degenerate-template defences are no-ops). The paired V13a implementation leaf
// fills these in.
//
// Spec: query/query-forms.md, query/query-escapes-stringification.md.

import { type Diagnostic, type SourceRange } from "../diagnostics/diagnostic";
import { type ValidationError } from "../runtime/query-error";
import { type LoomValue } from "../runtime/value";
import {
  translateOutbound,
  type OutboundTranslationInput,
} from "../runtime/wire-translation";

// --- Diagnostic codes + registry-anchored message strings ------------------
//
// Message strings are sourced verbatim from the diagnostics registry
// (diagnostics/code-registry-parse.md) per the Diagnostic message anchors rule.

/** `loom/parse/illegal-template-escape` (E). */
export const ILLEGAL_TEMPLATE_ESCAPE_CODE = "loom/parse/illegal-template-escape";
/** `loom/parse/unterminated-template` (E). */
export const UNTERMINATED_TEMPLATE_CODE = "loom/parse/unterminated-template";
/** `loom/parse/empty-template` (W). */
export const EMPTY_TEMPLATE_CODE = "loom/parse/empty-template";
/** `loom/parse/interpolated-result` (E). */
export const INTERPOLATED_RESULT_CODE = "loom/parse/interpolated-result";

/**
 * Registry Message for `loom/parse/illegal-template-escape`:
 * `illegal escape sequence in @`...` template: \<char>`.
 */
export function illegalTemplateEscapeMessage(char: string): string {
  return `illegal escape sequence in @\`...\` template: \\${char}`;
}
/** Registry Message for `loom/parse/unterminated-template`. */
export const UNTERMINATED_TEMPLATE_MESSAGE = "unterminated @`...` query template";
/** Registry Message for `loom/parse/empty-template`. */
export const EMPTY_TEMPLATE_MESSAGE =
  "query template body is empty after newline-trim and dedent";
/** Registry Message for `loom/parse/interpolated-result`. */
export const INTERPOLATED_RESULT_MESSAGE =
  "Result value cannot be interpolated; unwrap with ? or match first";

/**
 * The `ValidationError.message` the runtime short-circuit carries (QRY-6). The
 * *rendered*-empty runtime message is distinct from the parse-time warning's
 * `EMPTY_TEMPLATE_MESSAGE`.
 */
export const EMPTY_TEMPLATE_RENDER_MESSAGE = "rendered query template is empty";

// --- Escape / termination lexing (QRY-17) ----------------------------------

/**
 * One lexed part of a `@`...`` template body: a literal text run (escapes
 * already resolved to their bytes) or a `${...}` interpolation carrying the
 * verbatim expression source between the braces.
 */
export type QueryTemplatePart =
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "interp"; readonly exprSource: string };

/**
 * The result of lexing a `@`...`` template literal: the ordered parts, any
 * escape / termination diagnostics, and whether a closing backtick was found
 * (`false` ⇒ EOF inside the body ⇒ `loom/parse/unterminated-template`).
 */
export interface QueryTemplateLexResult {
  readonly parts: readonly QueryTemplatePart[];
  readonly diagnostics: readonly Diagnostic[];
  readonly terminated: boolean;
}

/**
 * Lex a `@`...`` query-template literal (QRY-17). `source` begins with the
 * opening backtick and, when terminated, ends at the matching unescaped closing
 * backtick. Recognised escapes are `` \` `` (literal backtick), `\$` (literal
 * `$`, suppressing interpolation), `\\` (literal backslash), and `\n` / `\t` /
 * `\r`; any other backslash pair emits `loom/parse/illegal-template-escape`.
 * Reaching EOF before a closing backtick sets `terminated: false` and emits
 * `loom/parse/unterminated-template`. Curly braces are ordinary text; only the
 * `${` / `}` pair delimits an interpolation.
 */
export function lexQueryTemplate(source: string): QueryTemplateLexResult {
  // V13a-T inert stub: the escape resolution, interpolation splitting, and
  // escape/termination diagnostics are absent — return the raw source as one
  // undifferentiated text part with no diagnostics and assume termination so
  // each behavioural test reds on its own primary assertion.
  return { parts: [{ kind: "text", value: source }], diagnostics: [], terminated: true };
}

// --- Newline-trim → dedent (QRY-7) -----------------------------------------

/**
 * Apply the two QRY-7 rendered-text normalisations in their fixed order —
 * **newline-trim first, then dedent** — to the fully-assembled template text
 * (post-escape, post-interpolation). Source CR / CRLF are normalised to LF
 * first; splitting is LF-only; the dedent alphabet and the whitespace-only-line
 * predicate are exactly {U+0020, U+0009}; whitespace-only lines are normalised
 * to empty lines and excluded from the common-prefix computation. Reproduces
 * the normative vector table.
 */
export function renderTemplateText(text: string): string {
  // V13a-T inert stub: neither normalisation is applied — the identity return
  // reds every vector on its own expected-rendered-text assertion.
  return text;
}

// --- Stringification of interpolated values (QRY-18) -----------------------

/**
 * The Loom static type of a `${expr}` interpolation, selecting its
 * stringification rule (QRY-18 table). `array` / `object` carry the sidecars +
 * root `$defs` so the compact `JSON.stringify` output applies outbound
 * wire-name translation recursively; `result` is the statically-rejected arm.
 */
export type InterpolationType =
  | { readonly kind: "string" }
  | { readonly kind: "integer" }
  | { readonly kind: "number" }
  | { readonly kind: "boolean" }
  | { readonly kind: "null" }
  | { readonly kind: "enum" }
  | {
      readonly kind: "array";
      readonly sidecars?: OutboundTranslationInput["sidecars"];
      readonly rootDef?: string;
    }
  | {
      readonly kind: "object";
      readonly sidecars?: OutboundTranslationInput["sidecars"];
      readonly rootDef?: string;
    }
  | { readonly kind: "result" };

/**
 * The outcome of stringifying one interpolation: the rendered text, or the
 * `loom/parse/interpolated-result` diagnostic when `expr`'s static type is
 * `Result<T, E>` (QRY-18, `Result` row).
 */
export type StringifyResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly diagnostic: Diagnostic };

/**
 * Stringify one `${expr}` interpolation by the Loom static type of `expr`
 * (QRY-18). `string` renders verbatim; `integer` / `number` via the canonical
 * decimal renderer; `boolean` / `null` as their literals; an enum as its bare
 * wire value unquoted; `array` / `object` as compact `JSON.stringify` with
 * outbound wire-name translation applied; a `Result`-typed expr is rejected
 * with `loom/parse/interpolated-result`.
 */
export function stringifyInterpolatedValue(
  value: LoomValue,
  type: InterpolationType,
): StringifyResult {
  // V13a-T inert stub: no per-type rendering and no Result rejection — the
  // empty-text success reds every per-type row and the Result-rejection test on
  // their own assertions. Reference the outbound-translation seam so the
  // array/object arm's dependency is wired for the paired V13a implementation.
  void translateOutbound;
  void value;
  void type;
  return { ok: true, text: "" };
}

// --- Degenerate rendered templates (QRY-6) ---------------------------------

/**
 * The parse-time `loom/parse/empty-template` warning (QRY-6). The predicate is
 * evaluated over the *static* body — every literal segment between
 * interpolations, newline-trim and dedent notionally applied, the escape
 * rewrites notionally **not** applied — so a whitespace-only static body warns
 * while an explicit `\n` literal (the two-character `` \n `` sequence,
 * pre-escape) suppresses it. Returns the warning diagnostic, or `undefined`
 * when the static body carries non-whitespace content.
 */
export function emptyTemplateWarning(
  staticBody: string,
  range?: SourceRange,
): Diagnostic | undefined {
  // V13a-T inert stub: the static-body degeneracy predicate is absent, so no
  // warning ever fires and the degenerate-template test reds on its own
  // presence-of-warning assertion.
  void staticBody;
  void range;
  return undefined;
}

/**
 * The runtime short-circuit of QRY-6. Immediately before the user turn would be
 * issued, if the *fully-rendered* text has length 0 or contains only characters
 * from the ASCII whitespace set {U+0009, U+000A, U+000B, U+000C, U+000D,
 * U+0020} (never the regex `\s` class, so U+00A0-only text issues a turn), the
 * query short-circuits to `Err(ValidationError{cause: "empty_template",
 * attempts: 0, validation_errors: [], raw_response: null})` without a provider
 * round-trip and without triggering respond-repair. Returns the
 * `ValidationError`, or `undefined` when the render is non-degenerate.
 */
export function renderEmptyShortCircuit(
  renderedText: string,
): ValidationError | undefined {
  // V13a-T inert stub: the degeneracy predicate is absent, so the short-circuit
  // never fires and the degenerate-template test reds on its own
  // ValidationError assertion.
  void renderedText;
  return undefined;
}
