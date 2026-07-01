// V6d / V6d-T — the `system:` template-interpolation seam.
//
// This module owns the `system:` frontmatter field's interpolation surface of
// frontmatter/frontmatter-fields-b-and-templates.md §`system` Interpolation:
//
//   - the **subagent-mode-only** rule — `system:` on a `mode: prompt` loom is
//     `loom/parse/system-on-prompt-mode` (the prompt-mode session's system
//     prompt belongs to Pi, not the loom);
//   - the restricted `${…}` grammar — only a bare identifier `Path`
//     (`Ident ('.' Ident)*`) is accepted; any other body fires one of the four
//     `loom/parse/system-interp-*` diagnostics:
//       * `system-interp-not-path`      — body is not a `Path`
//         (`${arr[0]}`, `${a + b}`, `${f(x)}`, `${a?.b}`, `${"x"}`);
//       * `system-interp-unknown-param` — head `Ident` names no declared param;
//       * `system-interp-bad-field`     — a `.Ident` step names no reachable
//         loom-side object field (or descends into an array / un-narrowed
//         discriminated union);
//       * `system-interp-unterminated`  — `${` is not closed by a matching `}`;
//   - the `\${` escape — a literal `${` suppresses interpolation;
//   - the resolve-then-stringify path — a validated path resolves against the
//     `params` object and its value is rendered by the **shared** canonical
//     stringification renderer of query/query-escapes-stringification.md
//     (QRY-18), the same table `@`...`` query templates use, so the model sees
//     one rendering of a given value regardless of surface. The `Result<T, E>`
//     row of that table cannot arise here: `params:` types never include
//     `Result`, so the `system:` surface never produces a `result`-typed slot.
//
// V6d-T (tests-task) declares these seam shapes — `SystemParamType`, the parsed
// `SystemTemplate`, the parse-time `checkSystemInterpolation` and the
// resolve-time `renderSystemPrompt` entry points, and the diagnostic code +
// message anchors — and stubs the two behaviour-bearing functions inertly so
// the failing tests compile and red on their own primary assertions (no
// diagnostic fires, no template is produced, and rendering yields empty text).
// The paired V6d implementation leaf fills these in.
//
// Spec: frontmatter/frontmatter-fields-b-and-templates.md,
// query/query-escapes-stringification.md.

import { type Diagnostic, type SourceRange } from "../diagnostics/diagnostic";
import { type LoomMode } from "./frontmatter";
import { type LoomValue } from "../runtime/value";
import { type InterpolationType } from "../render/query-render";

// --- Diagnostic codes + registry-anchored message strings ------------------
//
// Message strings are sourced verbatim from the diagnostics registry
// (diagnostics/code-registry-parse.md) per the *Diagnostic message anchors*
// rule.

/** `loom/parse/system-on-prompt-mode` (E). */
export const SYSTEM_ON_PROMPT_MODE_CODE = "loom/parse/system-on-prompt-mode";
/** `loom/parse/system-interp-not-path` (E). */
export const SYSTEM_INTERP_NOT_PATH_CODE = "loom/parse/system-interp-not-path";
/** `loom/parse/system-interp-unknown-param` (E). */
export const SYSTEM_INTERP_UNKNOWN_PARAM_CODE =
  "loom/parse/system-interp-unknown-param";
/** `loom/parse/system-interp-bad-field` (E). */
export const SYSTEM_INTERP_BAD_FIELD_CODE = "loom/parse/system-interp-bad-field";
/** `loom/parse/system-interp-unterminated` (E). */
export const SYSTEM_INTERP_UNTERMINATED_CODE =
  "loom/parse/system-interp-unterminated";

/** Registry Message for `loom/parse/system-on-prompt-mode`. */
export const SYSTEM_ON_PROMPT_MODE_MESSAGE =
  "'system:' is not permitted on a mode: prompt loom";
/** Registry Message for `loom/parse/system-interp-not-path`. */
export const SYSTEM_INTERP_NOT_PATH_MESSAGE =
  "'system:' interpolation body must be a bare identifier path";
/** Registry Message for `loom/parse/system-interp-unknown-param`. */
export function systemInterpUnknownParamMessage(name: string): string {
  return `'system:' interpolation references unknown param '${name}'`;
}
/** Registry Message for `loom/parse/system-interp-bad-field`. */
export function systemInterpBadFieldMessage(field: string, path: string): string {
  return `'system:' interpolation '.${field}' does not name a reachable object field on ${path}`;
}
/** Registry Message for `loom/parse/system-interp-unterminated`. */
export const SYSTEM_INTERP_UNTERMINATED_MESSAGE =
  "'system:' interpolation '${' is not closed by a matching '}'";

// --- The `system:` param-type model ----------------------------------------

/**
 * The static type of a declared `params` entry, as the `system:` interpolation
 * surface sees it for path resolution and stringification. Note the union
 * carries **no `Result` arm**: `params:` types never include `Result`, so the
 * `Result<T, E>` row of the canonical stringification table can never arise
 * from this surface.
 *
 *   - the scalar arms (`string` / `integer` / `number` / `boolean` / `null` /
 *     `enum`) and `array` terminate a path — `${param}` is always allowed and
 *     rendered by the canonical table;
 *   - `object` carries its reachable fields, so a `.Ident` step is validated
 *     against `fields`;
 *   - `discriminated-union` terminates a path: a `.Ident` step into an arm
 *     without a discriminator narrowing is rejected (loom 1.0 has no narrowing
 *     in this slot);
 *   - `array` / `object` optionally carry the wire-name-translation sidecars so
 *     the compact `JSON.stringify` rendering applies outbound translation.
 */
export type SystemParamType =
  | { readonly kind: "string" }
  | { readonly kind: "integer" }
  | { readonly kind: "number" }
  | { readonly kind: "boolean" }
  | { readonly kind: "null" }
  | { readonly kind: "enum" }
  | {
      readonly kind: "array";
      readonly sidecars?: Extract<InterpolationType, { kind: "array" }>["sidecars"];
      readonly rootDef?: string;
    }
  | {
      readonly kind: "object";
      readonly fields: ReadonlyMap<string, SystemParamType>;
      readonly sidecars?: Extract<InterpolationType, { kind: "object" }>["sidecars"];
      readonly rootDef?: string;
    }
  | { readonly kind: "discriminated-union" };

// --- Parsed template shape --------------------------------------------------

/**
 * One part of a parsed `system:` template: a literal text run (with `\${`
 * escapes already resolved to a literal `${`), or a validated interpolation
 * path carrying the resolved `params` path segments and the canonical-table
 * `InterpolationType` its terminal static type maps to.
 */
export type SystemTemplatePart =
  | { readonly kind: "text"; readonly value: string }
  | {
      readonly kind: "path";
      readonly segments: readonly string[];
      readonly type: InterpolationType;
    };

/** A successfully-parsed `system:` template: its ordered parts. */
export interface SystemTemplate {
  readonly parts: readonly SystemTemplatePart[];
}

// --- Parse-time check -------------------------------------------------------

/** Inputs to the parse-time `system:` interpolation check. */
export interface CheckSystemInterpolationInput {
  /** The raw `system:` scalar value (block-scalar contents, YAML-unescaped). */
  readonly systemValue: string;
  /** The loom's `mode:` — `system:` on `prompt` is rejected. */
  readonly mode: LoomMode;
  /** The declared `params`, keyed by loom-side field name. */
  readonly params: ReadonlyMap<string, SystemParamType>;
  /** The source file, for located diagnostics. */
  readonly file: string;
  /** The `system:` value's located range, when known. */
  readonly range?: SourceRange;
}

/** The outcome of the parse-time check. */
export interface CheckSystemInterpolationResult {
  /** Every diagnostic raised, in source order. */
  readonly diagnostics: readonly Diagnostic[];
  /** The parsed template, present iff no error-severity diagnostic was raised. */
  readonly template?: SystemTemplate;
}

/**
 * Validate a `system:` field at frontmatter-parse time
 * (frontmatter/frontmatter-fields-b-and-templates.md §`system` Interpolation):
 *
 *   - `loom/parse/system-on-prompt-mode` when the loom is `mode: prompt`;
 *   - each `${…}` body restricted to the `Path` production —
 *     `loom/parse/system-interp-not-path` for any other body,
 *     `loom/parse/system-interp-unknown-param` for an undeclared head `Ident`,
 *     `loom/parse/system-interp-bad-field` for a `.Ident` step that names no
 *     reachable object field, and `loom/parse/system-interp-unterminated` for
 *     an unclosed `${`;
 *   - `\${` resolved to a literal `${` text run (interpolation suppressed).
 *
 * Returns the parsed template iff no error-severity diagnostic was raised.
 *
 * V6d-T stubs this as an inert pass (no diagnostics, no template); the paired
 * V6d implementation leaf parses the template, applies the four parse checks,
 * the prompt-mode rejection, and the `\${` escape, and maps each validated
 * path's terminal static type to its `InterpolationType`.
 */
export function checkSystemInterpolation(
  _input: CheckSystemInterpolationInput,
): CheckSystemInterpolationResult {
  return { diagnostics: [] };
}

// --- Resolve-time render ----------------------------------------------------

/** Inputs to the conversation-creation-time `system:` render. */
export interface RenderSystemPromptInput {
  /** The parsed template produced by {@link checkSystemInterpolation}. */
  readonly template: SystemTemplate;
  /** The validated `params` object the paths resolve against. */
  readonly params: Readonly<Record<string, LoomValue>>;
}

/**
 * The outcome of rendering a `system:` template. `ok: false` carries a
 * diagnostic for the runtime fallback the shared renderer defines; this arm
 * cannot carry `loom/parse/interpolated-result` from the `system:` surface
 * because `params:` types never include `Result`.
 */
export type RenderSystemPromptResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly diagnostic: Diagnostic };

/**
 * Render a parsed `system:` template at conversation-creation time: resolve
 * each interpolation path against the validated `params` object and stringify
 * the resolved value through the **shared** canonical renderer
 * (`stringifyInterpolatedValue`, QRY-18), concatenating the literal text runs.
 *
 * V6d-T stubs this as an inert pass returning empty text; the paired V6d
 * implementation leaf resolves the path segments and feeds each resolved value
 * into `stringifyInterpolatedValue`.
 */
export function renderSystemPrompt(
  _input: RenderSystemPromptInput,
): RenderSystemPromptResult {
  return { ok: true, text: "" };
}
