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
export function renderDiagnosticLine(diagnostic: Diagnostic): string {
  const { file, range, code, message, hint, related } = diagnostic;

  // Leading location segment by located-site category: located carries the
  // full `<file>:<line>:<col>:` triple, file-only drops the `:<line>:<col>`
  // portion, location-less drops the whole leading segment.
  let line: string;
  if (file !== undefined && range !== undefined) {
    line = `${file}:${range.start.line}:${range.start.column}: ${code}: ${message}`;
  } else if (file !== undefined) {
    line = `${file}: ${code}: ${message}`;
  } else {
    line = `${code}: ${message}`;
  }

  if (hint !== undefined) {
    line += `\n  hint: ${hint}`;
  }

  if (related !== undefined) {
    for (const site of related) {
      // Related sites are always located and carry no code prefix.
      line += `\n  ${site.file}:${site.range.start.line}:${site.range.start.column}: ${site.message}`;
    }
  }

  return line;
}

/**
 * Render a multi-error batch: one content-line block per diagnostic, blocks
 * separated by a single blank line, in the array's given order.
 */
export function renderDiagnosticBatch(diagnostics: readonly Diagnostic[]): string {
  return diagnostics.map(renderDiagnosticLine).join("\n\n");
}

/**
 * Assemble per-file diagnostic groups (entry `.loom` plus transitively
 * imported `.warp` modules) into a single `Diagnostic[]` ordered by
 * `(file, line, col)`. No fast-fail: every diagnostic in every group is
 * collected with no per-error loss.
 */
export function assembleDiagnostics(
  groups: readonly (readonly Diagnostic[])[],
): Diagnostic[] {
  // No fast-fail: collect every diagnostic from every group with no loss.
  const collected: Diagnostic[] = groups.flatMap((group) => [...group]);

  // Order by (file, line, col). Location-less fields sort ahead of located
  // ones (empty file / position 0). Array.prototype.sort is stable, so
  // diagnostics tying on the full key keep their collected order.
  return collected.sort((a, b) => {
    const fileCmp = (a.file ?? "").localeCompare(b.file ?? "");
    if (fileCmp !== 0) {
      return fileCmp;
    }
    const lineCmp = (a.range?.start.line ?? 0) - (b.range?.start.line ?? 0);
    if (lineCmp !== 0) {
      return lineCmp;
    }
    return (a.range?.start.column ?? 0) - (b.range?.start.column ?? 0);
  });
}
