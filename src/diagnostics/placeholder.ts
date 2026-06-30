// V7c / V7c-T — the diagnostic placeholder-rendering seam.
//
// The registry's *Message* column carries `<…>` placeholders the renderer
// interpolates at the diagnostic site. The normative surface (per
// diagnostics/placeholder-rendering-a.md and …-b.md) groups every V1
// placeholder into eight categories and fixes one rendering rule per category,
// so two conformant implementations produce byte-identical strings (or a
// byte-identical surround around an implementation-defined tail, for category
// 8) for the same source defect. Throughout, *byte-identical* means equal as
// UTF-8 byte sequences (GOV-15).
//
// V7c-T (tests-task) declares this seam and stubs the per-category renderers so
// the failing tests compile and red on their own primary assertions. The paired
// V7c implementation leaf fills these in. Each stub returns a benign wrong value
// (the empty string) so the byte-identical vector assertion reds for the
// intended reason (implementation absent), never on a thrown harness error.
//
// Host-derived inputs (category 8's `node-floor` `<observed>`, the running
// `process.versions.node` string) are passed in by the caller, never read from
// the ambient `process` here: the renderer is `src/**` production code and the
// *No globals, statics, singletons* ambient-primitive ban forbids a direct
// `process.versions` read. The category-8 test mocks the host version by
// passing it as an argument.

// ── Category 1 — static-type placeholders ──────────────────────────────────
// `<type>`, `<expected>`, `<actual>`, `<left>`, `<right>`, `<element>`.

/** A Loom static type, re-serialised in source-grammar form (type-system.md). */
export type LoomType =
  | { readonly kind: "primitive"; readonly name: "string" | "integer" | "number" | "boolean" | "null" }
  | { readonly kind: "literal"; readonly value: string | number | boolean }
  | { readonly kind: "union"; readonly members: readonly LoomType[] }
  | { readonly kind: "array"; readonly element: LoomType }
  | { readonly kind: "named"; readonly name: string }
  | { readonly kind: "result"; readonly ok: LoomType; readonly err: LoomType }
  | { readonly kind: "object"; readonly fields: readonly { readonly name: string; readonly type: LoomType }[] };

/** Render a Loom static type by re-serialising it in source-grammar form. */
export function renderType(_type: LoomType): string {
  // V7c-T stub: type re-serialisation is unimplemented.
  return "";
}

// ── Category 2 — runtime-value placeholders ─────────────────────────────────
// `<scrutinee summary>`, `<value>` (runtime usage).

/** A runtime value to stringify per the canonical interpolation table. */
export type RuntimeValue =
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "integer"; readonly value: number }
  | { readonly kind: "number"; readonly value: number }
  | { readonly kind: "boolean"; readonly value: boolean }
  | { readonly kind: "null" }
  | { readonly kind: "schema-object"; readonly value: Record<string, unknown> }
  | { readonly kind: "result"; readonly variant: "Ok" | "Err"; readonly inner: RuntimeValue };

/**
 * Render a runtime value per the canonical interpolation-stringification table,
 * with the category-2 string-truncation extension: a string longer than 80
 * Unicode code points is truncated to its first 77 code points followed by the
 * literal three-character ellipsis `...` (counting by code point).
 */
export function renderRuntimeValue(_value: RuntimeValue): string {
  // V7c-T stub: runtime-value stringification + truncation is unimplemented.
  return "";
}

// ── Category 3 — syntactic-construct placeholders ───────────────────────────
// `<construct>` (closed token-name table); `<expr>` (verbatim source span).

/** A category-3 placeholder: a closed-table construct, or a verbatim span. */
export type ConstructPlaceholder =
  | { readonly kind: "construct"; readonly token: string }
  | { readonly kind: "expr"; readonly sourceSpan: string };

/**
 * Render a syntactic-construct placeholder: the closed token-name for
 * `<construct>`, or the verbatim source span (byte-for-byte) for `<expr>`.
 */
export function renderConstruct(_placeholder: ConstructPlaceholder): string {
  // V7c-T stub: construct rendering is unimplemented.
  return "";
}

// ── Category 4 — numeric placeholders ───────────────────────────────────────
// `<i>`, `<length>`, `<depth>`, `<offset>`, `<count>`, `<index>`,
// `<required>`/`<provided>` (arity sites), `<max>`.

/**
 * Render an integer as the shortest decimal representation: no scientific
 * notation, no leading zeros, leading `-` for negatives, `0` for `-0`.
 */
export function renderInteger(_value: number): string {
  // V7c-T stub: integer rendering is unimplemented.
  return "";
}

// ── Category 5 — source-derived placeholders ────────────────────────────────
// `<path>`, `<file>`, `<descriptor>`, `<name>`, `<field>`, `<param>`,
// `<variant>`, `<keyword>`, `<key>`, `<char>`.

/** A category-5 placeholder rendered verbatim from the source. */
export type SourceDerivedPlaceholder =
  | { readonly kind: "identifier"; readonly text: string }
  | { readonly kind: "path"; readonly text: string }
  | { readonly kind: "key"; readonly text: string }
  | { readonly kind: "char"; readonly codePoint: number }
  | { readonly kind: "descriptor"; readonly descriptorKind: "settings" | "cli-flag" | "package"; readonly value: string };

/**
 * Render a source-derived placeholder verbatim as it appears in the source:
 * identifiers/paths bare, `<key>` quoted only when not identifier-shaped,
 * `<char>` raw when printable else escaped, `<descriptor>` as `<kind>:"<value>"`.
 */
export function renderSourceDerived(_placeholder: SourceDerivedPlaceholder): string {
  // V7c-T stub: source-derived rendering is unimplemented.
  return "";
}

// ── Category 6 — underlying-error placeholders ──────────────────────────────
// `<error.message>`, `<original content first line>`, `<dispose error first line>`.

/**
 * Render an underlying error to its first line. A caught thrown value is first
 * coerced to its underlying string (object `.message` when string, else
 * `String(v)`, else `<unreadable>`), newline-normalised, then cut at the first
 * `\n` (trailing whitespace preserved), rendering `<no message>` when empty.
 */
export function renderUnderlyingError(_caught: unknown): string {
  // V7c-T stub: underlying-error first-line coercion is unimplemented.
  return "";
}

// ── Category 7 — identifier-, descriptor-, and closed-enum placeholders ──────
// `<callee>`, `<enum>`, `<schema>`, `<slash-name>`, `<uuid>`, `<reason>`,
// `<kind>`, `<step>`, `<ctor>`, … (rendered by closed sub-rule).

/** A category-7 placeholder, rendered by its closed sub-rule. */
export type Category7Placeholder =
  | { readonly kind: "identifier"; readonly text: string }
  | { readonly kind: "uuid"; readonly value: string }
  | { readonly kind: "closed-enum"; readonly value: string }
  | { readonly kind: "numeric"; readonly value: number }
  | { readonly kind: "path"; readonly text: string }
  | { readonly kind: "descriptor"; readonly descriptorKind: "settings" | "cli-flag" | "package"; readonly value: string };

/**
 * Render a category-7 placeholder by its closed sub-rule (identifier-shaped
 * unquoted, `<uuid>` canonical lowercase 8-4-4-4-12, closed-enum verbatim,
 * numeric via the integer rule, path via the `<path>` rule, descriptor via the
 * `<descriptor>` rule).
 */
export function renderCategory7(_placeholder: Category7Placeholder): string {
  // V7c-T stub: category-7 sub-rule rendering is unimplemented.
  return "";
}

// ── Category 8 — host-derived freeform-tail placeholders ────────────────────
// `<error>`, `<message>`, `<observed>`.

/**
 * Render a host-supplied string as the implementation-defined freeform tail:
 * the same first-line truncation as category 6 (newline-normalise, cut at the
 * first `\n`, preserve trailing whitespace, render `<no message>` when empty).
 * The byte-identical surround comes from the registry *Message* template, not
 * from this function.
 */
export function renderHostDerivedTail(_hostString: string): string {
  // V7c-T stub: host-derived first-line tail is unimplemented.
  return "";
}

/** The `loom/load/host-incompatible` payload the renderer interpolates. */
export interface HostIncompatibleDetails {
  readonly kind: string;
  /** The raw `<observed>` input (host-derived for `node-floor`). */
  readonly observed: string;
  /** The `<required>` substring (pinned per `kind`). */
  readonly required: string;
}

/**
 * Render the full `loom/load/host-incompatible` *Message* string by
 * interpolating its template `host incompatible (<kind>): observed <observed>,
 * required <required>`, applying category 8's first-line truncation to a
 * host-derived `<observed>`. The prefix and suffix bytes are byte-identical
 * across implementations; only the `<observed>` tail is implementation-defined.
 */
export function renderHostIncompatible(_details: HostIncompatibleDetails): string {
  // V7c-T stub: host-incompatible message assembly is unimplemented.
  return "";
}
