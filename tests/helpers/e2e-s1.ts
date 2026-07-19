// Shared drivers for the S1 (language-core) e2e coverage tests.
//
// These wrap the REAL production front-end entry points — `lexTheta`
// (src/lexer/lexer.ts) and `parseThetaDocument` (src/parser/theta-document.ts) —
// with inert, in-band recording seams so a test can assert on the returned
// diagnostics / tokens without a model or session. No behaviour is stubbed:
// the code paths under assertion are the shipped ones.

import { lexTheta, type LexResult, type ThetaSource } from "../../src/lexer/lexer";
import {
  parseThetaDocument,
  type ThetaDocument,
  type ParseThetaDocumentDeps,
} from "../../src/parser/theta-document";
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

/** Parse-theta-document deps whose seams are inert offline no-ops. */
export function parseDeps(): ParseThetaDocumentDeps {
  return { systemNote: inertSystemNote(), modelMatcher: resolvingMatcher };
}

/** Parse a UTF-8 `.theta` source string through the whole-document pipeline. */
export function parseDoc(src: string, path = "test.theta"): ThetaDocument {
  const source: ThetaSource = { path, bytes: new TextEncoder().encode(src) };
  return parseThetaDocument(source, parseDeps());
}

/** Parse a source given as raw bytes (for encoding-intake tests). */
export function parseDocBytes(bytes: Uint8Array, path = "test.theta"): ThetaDocument {
  return parseThetaDocument({ path, bytes }, parseDeps());
}

/** Lex a UTF-8 `.theta` source string through the shipped lexer. */
export function lexSrc(src: string, path = "test.theta"): LexResult {
  const source: ThetaSource = { path, bytes: new TextEncoder().encode(src) };
  return lexTheta(source, inertSystemNote());
}

/** Lex a source given as raw bytes (for encoding-intake tests). */
export function lexBytes(bytes: Uint8Array, path = "test.theta"): LexResult {
  return lexTheta({ path, bytes }, inertSystemNote());
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
