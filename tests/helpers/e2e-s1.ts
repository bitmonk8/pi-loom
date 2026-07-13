// Shared drivers for the S1 (language-core) e2e coverage tests.
//
// These wrap the REAL production front-end entry points — `lexLoom`
// (src/lexer/lexer.ts) and `parseLoomDocument` (src/parser/loom-document.ts) —
// with inert, in-band recording seams so a test can assert on the returned
// diagnostics / tokens without a model or session. No behaviour is stubbed:
// the code paths under assertion are the shipped ones.

import { lexLoom, type LexResult, type LoomSource } from "../../src/lexer/lexer";
import {
  parseLoomDocument,
  type LoomDocument,
  type ParseLoomDocumentDeps,
} from "../../src/parser/loom-document";
import type { Diagnostic } from "../../src/diagnostics/diagnostic";
import type {
  SystemNoteChannelDeps,
  SystemNoteSender,
} from "../../src/extension/system-note-channel";
import type { ModelReferenceMatcher } from "../../src/parser/frontmatter";

/** An in-band, no-op system-note channel that discards emitted batches. */
function inertSystemNote(): SystemNoteChannelDeps {
  const pi: SystemNoteSender = { sendMessage: (): void => {} };
  return { pi, ui: { notify: (): void => {} }, emitDiagnostic: (): void => {} };
}

/** A trivially-resolving `model:` matcher (the model hook is not under test). */
const resolvingMatcher: ModelReferenceMatcher = {
  resolve: (): "resolved" => "resolved",
};

/** Parse-loom-document deps whose seams are inert offline no-ops. */
export function parseDeps(): ParseLoomDocumentDeps {
  return { systemNote: inertSystemNote(), modelMatcher: resolvingMatcher };
}

/** Parse a UTF-8 `.loom` source string through the whole-document pipeline. */
export function parseDoc(src: string, path = "test.loom"): LoomDocument {
  const source: LoomSource = { path, bytes: new TextEncoder().encode(src) };
  return parseLoomDocument(source, parseDeps());
}

/** Parse a source given as raw bytes (for encoding-intake tests). */
export function parseDocBytes(bytes: Uint8Array, path = "test.loom"): LoomDocument {
  return parseLoomDocument({ path, bytes }, parseDeps());
}

/** Lex a UTF-8 `.loom` source string through the shipped lexer. */
export function lexSrc(src: string, path = "test.loom"): LexResult {
  const source: LoomSource = { path, bytes: new TextEncoder().encode(src) };
  return lexLoom(source, inertSystemNote());
}

/** Lex a source given as raw bytes (for encoding-intake tests). */
export function lexBytes(bytes: Uint8Array, path = "test.loom"): LexResult {
  return lexLoom({ path, bytes }, inertSystemNote());
}

/** True iff any diagnostic carries the given code. */
export function hasCode(diags: readonly Diagnostic[], code: string): boolean {
  return diags.some((d) => d.code === code);
}

/** The first diagnostic carrying the given code, if any. */
export function findCode(
  diags: readonly Diagnostic[],
  code: string,
): Diagnostic | undefined {
  return diags.find((d) => d.code === code);
}

/** All distinct diagnostic codes present (sorted, for readable failures). */
export function codes(diags: readonly Diagnostic[]): string[] {
  return [...new Set(diags.map((d) => d.code))].sort();
}

/** Error-severity diagnostics only. */
export function errors(diags: readonly Diagnostic[]): Diagnostic[] {
  return diags.filter((d) => d.severity === "error");
}
