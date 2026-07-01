// V11d / V11d-T — Binder system-prompt builder.
//
// This module owns the code-keyed obligation area `cka-45`
// (binder/binder-bypass-and-envelope.md §"System-prompt structure (normative)"):
// the runtime constructs a system prompt conveying the loom's binding context to
// the binder model. The exact wording is non-normative; the structural
// obligations are the contract:
//
//   1. Loom identity line — `Loom: /<name>` (exactly one).
//   2. Description line — `Description: <description>` iff frontmatter
//      `description:` is non-empty; omitted entirely otherwise.
//   3. Argument-hint line — `Argument hint: <value>` iff `argument-hint:` is
//      non-empty; omitted entirely otherwise.
//   4. Parameters block — a `Parameters:` header (unindented) plus one per-field
//      line per declared field in declaration order, each indented with exactly
//      two U+0020 SPACE, matching `<wire-name> (<type>) <requirement>[ — <desc>]`;
//      the whole block (header and lines) omitted when `params:` is absent/empty.
//   5. User-arguments line — `User arguments: <raw>` (always present; `<raw>` is
//      the slash text after the command name with leading/trailing
//      slash-argument whitespace stripped, no other normalisation).
//   6. Session-context block — an opening line beginning with the literal token
//      `Recent session context` and ending with `:`, then the compact transcript
//      body, then a terminating blank line (the block ends `\n\n`); emitted iff
//      `bind_context: session` and the truncation walk produced ≥1 turn; omitted
//      entirely otherwise.
//   7. Envelope-kinds enumeration — the three `kind` tokens `ok`, `needs_info`,
//      `ambiguous` all listed.
//   8. No-invent-defaults instruction — one line containing the literal
//      substring `defaulted` and at least one of `Do not` / `omit` / `skip`.
//
//   *Type display* — the per-field `<type>` is the declared Loom type in the
//   surface syntax of Type System, not the JSON-Schema lowering.
//   *Default-literal rendering* — the `<literal>` in `default=<literal>` is the
//   field default in the Loom literal sublanguage surface syntax.
//   *Parameter-line reference renderings* — the four reference per-field lines
//   are reproduced byte-exact, including the description-omitted form
//   (`  language (string) required`, no trailing space or em-dash).
//
// V11d-T (tests-task) declares these seams and stubs every behaviour-bearing
// function inertly (`renderBinderParamLine` and `buildBinderSystemPrompt` both
// return `""`) so the paired failing tests compile and red on their own primary
// assertions (every structural item, the Type-display / Default-literal
// renderings, and the byte-exact Parameter-line renderings are all absent). The
// paired V11d implementation leaf fills them in.
//
// Spec: binder/binder-bypass-and-envelope.md (§"System-prompt structure
// (normative)", §"Binder system prompt", Type display, Default-literal
// rendering, Parameter-line reference renderings); the compact-transcript body
// referenced by item 6 is rendered by V11b (BNDR-7/8/9) and the truncation walk
// by V11i (cka-39) — both are inputs to this builder, not its responsibility.

// --- per-field descriptor ---------------------------------------------------

/**
 * The requirement token of one per-field line (item 4): exactly one of the
 * literal `required` or `default=<literal>`.
 *
 *   - `{ kind: "required" }` — a required-without-default field.
 *   - `{ kind: "default"; literal }` — a defaulted field; `literal` is the
 *     field's default already rendered in the Loom literal sublanguage surface
 *     syntax (the *Default-literal rendering* rule: `Severity.High`, `"hello"`,
 *     `[1, 2, 3]`, `[]`), emitted verbatim after `default=`.
 */
export type ParamRequirement =
  | { readonly kind: "required" }
  | { readonly kind: "default"; readonly literal: string };

/** One declared `params:` field, for the per-field system-prompt line (item 4). */
export interface SystemPromptParamField {
  /** The field's wire name (the leading token of the per-field line). */
  readonly wireName: string;
  /**
   * The field's declared Loom type in the *surface syntax* of Type System
   * (e.g. `string`, `array<integer>`, `string | null`, `Author`) — never the
   * JSON-Schema lowering. Emitted verbatim inside the `(<type>)` parentheses.
   */
  readonly type: string;
  /** The requirement token — `required` or `default=<literal>`. */
  readonly requirement: ParamRequirement;
  /**
   * The field's description, already normalised per Descriptions. When present
   * and non-empty the ` — <description>` segment is appended (U+0020 U+2014
   * U+0020 separator); when absent or empty the segment (and its leading space
   * and em-dash) is omitted and the line ends immediately after the requirement
   * with no trailing whitespace.
   */
  readonly description?: string;
}

// --- session-context block input --------------------------------------------

/**
 * The Session-context block input (item 6). Present iff `bind_context: session`
 * and the truncation walk (V11i) produced ≥1 included turn; absent (`undefined`
 * on the builder input) otherwise, in which case the whole block is omitted.
 */
export interface SystemPromptSessionContext {
  /**
   * The compact transcript body rendered by V11b (BNDR-7/8/9): the bytes that
   * follow the opening line up to (but not including) the terminating blank
   * line, ending with the trailing `\n` of its last turn block.
   */
  readonly transcriptBody: string;
}

// --- builder input -----------------------------------------------------------

/** Inputs to constructing one binder system prompt. */
export interface BuildBinderSystemPromptInput {
  /** The bare slash command name (no leading `/`) — item 1. */
  readonly name: string;
  /**
   * The loom's frontmatter `description:`. When absent or empty the Description
   * line (item 2) is omitted entirely.
   */
  readonly description?: string;
  /**
   * The loom's frontmatter `argument-hint:`. When absent or empty the
   * Argument-hint line (item 3) is omitted entirely.
   */
  readonly argumentHint?: string;
  /**
   * The declared `params:` fields in declaration order. Empty ⇒ the whole
   * Parameters block (header and lines) is omitted (item 4).
   */
  readonly params: readonly SystemPromptParamField[];
  /**
   * The raw slash text after the command name (untrimmed). The builder strips
   * leading/trailing slash-argument whitespace for the User-arguments line
   * (item 5) and applies no other normalisation.
   */
  readonly rawArguments: string;
  /** The Session-context block input (item 6); omitted ⇒ block omitted. */
  readonly sessionContext?: SystemPromptSessionContext;
}

// --- the per-field line (item 4) --------------------------------------------

/**
 * Render one per-field line of the Parameters block (item 4): the indent-and-
 * content portion, ending immediately before its terminating `\n`. The two
 * leading bytes are U+0020 U+0020; the content is
 * `<wire-name> (<type>) <requirement>[ — <description>]`.
 *
 * V11d-T stub: returns `""` so the Type-display, Default-literal, and
 * byte-exact Parameter-line reference-rendering tests red on their own primary
 * assertions. The paired V11d implementation fills this in.
 */
export function renderBinderParamLine(_field: SystemPromptParamField): string {
  return "";
}

// --- the full prompt ---------------------------------------------------------

/**
 * Construct the binder system prompt for one binder attempt (item list above).
 *
 * V11d-T stub: returns `""` so every structural-item test (identity line,
 * conditional Description / Argument-hint / Parameters / Session-context blocks,
 * User-arguments line, envelope-kinds enumeration, no-invent-defaults
 * instruction) reds on its own primary assertion. The paired V11d implementation
 * fills this in.
 */
export function buildBinderSystemPrompt(_input: BuildBinderSystemPromptInput): string {
  return "";
}
