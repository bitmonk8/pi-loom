// V1a / V1a-T — the lexer core seam.
//
// This module owns the load-time encoding validation, newline normalisation,
// and tokenisation of a `.loom` / `.warp` source, plus the closed
// continuation-trigger statement-joining rule, per
// spec_topics/lexical.md and spec_topics/grammar.md §"Newline continuation".
// Lexer-surfaced diagnostics (`loom/load/invalid-encoding`, `loom/parse/*`)
// are delivered through the V7d producer-facing diagnostic-emission seam
// (`emitDiagnosticBatch`), never via a direct `pi.sendMessage` call.
//
// V1a-T (tests-task) declares this seam shape and stubs `lexLoom` as an inert
// no-op so the failing tests compile and red on their own primary assertions
// (the tokeniser / validator / continuation logic is absent). The paired V1a
// implementation leaf fills it in.

import { type Diagnostic } from "../diagnostics/diagnostic";
import {
  emitDiagnosticBatch,
  type SystemNoteChannelDeps,
} from "../extension/system-note-channel";

/**
 * Token kinds the lexer emits. `stmt-sep` is a *significant* newline that
 * actually terminates a statement: a newline swallowed by a continuation
 * trigger (open bracket, trailing/leading operator, trailing comma) produces
 * no `stmt-sep` token, so the spanning lines read as one statement.
 */
export type TokenKind =
  | "keyword"
  | "ident"
  | "number"
  | "string"
  | "punct"
  | "stmt-sep"
  | "eof";

/** A single lexed token. `text` is the post-normalisation source text. */
export interface Token {
  readonly kind: TokenKind;
  readonly text: string;
  readonly range: {
    readonly start: { readonly line: number; readonly column: number };
    readonly end: { readonly line: number; readonly column: number };
  };
}

/** A raw, pre-decode source obtained via the PIC-13 `FileSystem.readBytes` seam. */
export interface LoomSource {
  /** The source file path, used in diagnostic locations. */
  readonly path: string;
  /** The raw, pre-normalisation bytes (UTF-8-validated by the lexer). */
  readonly bytes: Uint8Array;
}

/** The result of lexing a single source. */
export interface LexResult {
  /** The token stream (post-normalisation, continuation-joined). */
  readonly tokens: readonly Token[];
  /** Every diagnostic the lexer raised (also delivered through the V7d seam). */
  readonly diagnostics: readonly Diagnostic[];
  /** `true` iff the source lexed with no error-severity diagnostic. */
  readonly ok: boolean;
}

/**
 * Lex a single `.loom` / `.warp` source: UTF-8-validate the raw bytes
 * (`loom/load/invalid-encoding`), normalise `\r\n` / `\r` → `\n`, then
 * tokenise — enforcing the identifier first-letter case rule
 * (`loom/parse/schema-case-mismatch`, `loom/parse/binding-case-mismatch`),
 * the reserved-keyword-as-identifier rule, the block-comment rejection, the
 * stray-backslash rule, the single-line-body rule, and the closed
 * continuation-trigger statement-joining rule.
 *
 * Any diagnostic produced is delivered through the V7d producer-facing
 * diagnostic-emission seam (`emitDiagnosticBatch`) as exactly one batched
 * `loom-system-note` — never via a direct `pi.sendMessage` call.
 */
export function lexLoom(
  source: LoomSource,
  deps: SystemNoteChannelDeps,
): LexResult {
  // V1a-T stub: no encoding validation, no normalisation, no tokenisation, no
  // continuation handling — a deterministic inert no-op so the V1a-T tests
  // compile and red on their own primary assertions (empty token stream / no
  // delivered diagnostic). The paired V1a leaf replaces this body.
  void source;
  const diagnostics: Diagnostic[] = [];
  if (diagnostics.length > 0) {
    // Producers hand diagnostics to the V7d seam; they never call
    // `pi.sendMessage` directly.
    emitDiagnosticBatch(diagnostics, deps);
  }
  return { tokens: [], diagnostics, ok: diagnostics.length === 0 };
}
