// V7a / V7a-T — the diagnostics primitive seam.
//
// This module owns the structured `Diagnostic` shape, the serialised
// content-line format, and the multi-error `Diagnostic[]` assembly with its
// `(file, line, col)` ordering across an entry `.loom` and its transitively
// imported `.warp` modules (per diagnostics/diagnostic-shape.md and
// implementation-notes.md "Static-resolution load pass").
//
// V7a-T (tests-task) declares the seam shape and stubs the three behaviour-
// bearing functions so the failing tests compile and red on their own primary
// assertions. The paired V7a implementation leaf fills these in.

/** Diagnostic severity. */
export type Severity = "error" | "warning";

/** A 1-indexed source position. */
export interface Position {
  readonly line: number;
  readonly column: number;
}

/** A 1-indexed source range; `end` is exclusive. */
export interface SourceRange {
  readonly start: Position;
  readonly end: Position;
}

/** A related site (e.g. a colliding declaration). Always located. */
export interface RelatedSite {
  readonly file: string;
  readonly range: SourceRange;
  readonly message: string;
}

/**
 * The structured diagnostic shape per
 * diagnostics/diagnostic-shape.md "Internal diagnostic shape".
 *
 * `file` / `range` are present per the located-site classification: located
 * sites carry both, file-only sites carry `file` and omit `range`, and
 * location-less sites omit both.
 */
export interface Diagnostic {
  readonly severity: Severity;
  readonly code: string;
  readonly file?: string;
  readonly range?: SourceRange;
  readonly message: string;
  readonly hint?: string;
  readonly related?: readonly RelatedSite[];
  readonly masked?: readonly string[];
  readonly details?: Record<string, unknown>;
}

/**
 * Render the serialised content-line block for a single diagnostic, per
 * diagnostics/diagnostic-shape.md "Serialised content format":
 *   located      → `<file>:<line>:<col>: <code>: <message>`
 *   file-only    → `<file>: <code>: <message>`
 *   location-less→ `<code>: <message>`
 * followed by an optional `\n  hint: <hint>` line and one
 * `\n  <file>:<line>:<col>: <message>` line per related site.
 */
export function renderDiagnosticLine(_diagnostic: Diagnostic): string {
  // V7a-T stub: the format is unimplemented, so the assertion reds for the
  // intended reason (implementation absent).
  return "";
}

/**
 * Render a multi-error batch: one content-line block per diagnostic, blocks
 * separated by a single blank line, in the array's given order.
 */
export function renderDiagnosticBatch(_diagnostics: readonly Diagnostic[]): string {
  // V7a-T stub.
  return "";
}

/**
 * Assemble per-file diagnostic groups (entry `.loom` plus transitively
 * imported `.warp` modules) into a single `Diagnostic[]` ordered by
 * `(file, line, col)`. No fast-fail: every diagnostic in every group is
 * collected with no per-error loss.
 */
export function assembleDiagnostics(
  _groups: readonly (readonly Diagnostic[])[],
): Diagnostic[] {
  // V7a-T stub: returns an empty array, so the no-loss length and ordering
  // assertions red for the intended reason (implementation absent).
  return [];
}
