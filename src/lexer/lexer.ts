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
  /**
   * For `string` tokens: the decoded literal value with the escape table
   * (`\"`, `\'`, `\\`, `\n`, `\t`, `\r`, `\u{XXXX}`) lowered to its characters
   * (lexical.md §"String literals"). Absent on non-string tokens and until V1b
   * fills in escape decoding.
   */
  readonly value?: string;
  /**
   * For `number` tokens: the integer/number type classification — a literal
   * with no fractional or exponent part is `integer`, otherwise `number`
   * (lexical.md §"Number literals"). Absent on non-number tokens and until V1b
   * fills in numeric typing.
   */
  readonly numericType?: "integer" | "number";
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
  const file = source.path;

  // Step 1 — UTF-8 validation against the raw, pre-normalisation bytes, so the
  // first-invalid-byte offset is observable (lexical.md §Encoding). A non-UTF-8
  // BOM faults on its own leading byte, yielding offset 0 per the spec.
  const invalidOffset = firstInvalidUtf8Offset(source.bytes);
  if (invalidOffset >= 0) {
    const encodingDiag: Diagnostic = {
      severity: "error",
      code: "loom/load/invalid-encoding",
      file,
      message: `invalid UTF-8 encoding at byte offset ${invalidOffset}`,
    };
    emitDiagnosticBatch([encodingDiag], deps);
    return { tokens: [], diagnostics: [encodingDiag], ok: false };
  }

  // Step 2 — decode (skipping a leading UTF-8 BOM) and normalise CRLF / bare CR
  // to LF before any position is recorded, so spans are on the normalised
  // stream and CRLF / LF sources tokenise identically (lexical.md §Newline
  // normalisation).
  const text = normaliseNewlines(decodeUtf8(source.bytes));

  // Step 3 — tokenise, then collapse newlines into significant `stmt-sep`
  // tokens under the closed continuation-trigger rule (grammar.md §Newline
  // continuation), then run the contextual identifier / keyword / single-line
  // body checks.
  const scanned = scanTokens(text, file);
  const tokens = collapseContinuations(scanned.tokens);
  const contextual = contextualDiagnostics(tokens, file);
  const diagnostics: Diagnostic[] = [...scanned.diagnostics, ...contextual];

  if (diagnostics.length > 0) {
    // Producers hand diagnostics to the V7d seam; they never call
    // `pi.sendMessage` directly.
    emitDiagnosticBatch(diagnostics, deps);
  }
  return { tokens, diagnostics, ok: diagnostics.length === 0 };
}

/** A 1-indexed source position / range, matching the `Token` span shape. */
type Range = Token["range"];
type Pos = Range["start"];

/** An interior token kind: every {@link TokenKind} except the synthetic `eof`. */
type InteriorKind = Exclude<TokenKind, "eof">;

/** A scanned token before continuation collapsing; `newline` is a raw break. */
interface RawToken {
  readonly kind: InteriorKind | "newline";
  readonly text: string;
  readonly range: Range;
}

/** The reserved keywords that cannot be used as identifiers (lexical.md). */
function reservedKeywords(): ReadonlySet<string> {
  return new Set([
    "let", "mut", "fn", "if", "else", "for", "in", "while", "break",
    "continue", "return", "match", "schema", "enum", "import", "export",
    "from", "as", "by", "invoke", "true", "false", "null", "Ok", "Err",
    "Result", "string", "number", "integer", "boolean", "array", "void",
  ]);
}

/** Two-character operator tokens recognised greedily ahead of single chars. */
function twoCharOperators(): ReadonlySet<string> {
  return new Set(["==", "!=", "<=", ">=", "&&", "||"]);
}

/**
 * Operator texts that, as the *trailing* token of a line, trigger newline
 * continuation: the binary / ternary set from grammar.md §Newline continuation,
 * plus the binding `=` the spec's own worked example (`let x =\n\n foo` is one
 * statement) treats as an incomplete-statement continuation trigger.
 */
function trailingTriggers(): ReadonlySet<string> {
  return new Set([
    "+", "-", "*", "/", "%", "==", "!=", "<", "<=", ">", ">=", "&&", "||",
    "?", ":", "=",
  ]);
}

/**
 * Operator texts that, as the *leading* token of the next non-blank line,
 * trigger newline continuation (the binary / ternary set; `=` is not a leading
 * trigger).
 */
function leadingTriggers(): ReadonlySet<string> {
  return new Set([
    "+", "-", "*", "/", "%", "==", "!=", "<", "<=", ">", ">=", "&&", "||",
    "?", ":",
  ]);
}

function isDigit(c: string): boolean {
  return c >= "0" && c <= "9";
}

function isIdentStart(c: string): boolean {
  return (c >= "A" && c <= "Z") || (c >= "a" && c <= "z") || c === "_";
}

function isIdentPart(c: string): boolean {
  return isIdentStart(c) || isDigit(c);
}

/**
 * Return the zero-based byte offset of the first byte that breaks UTF-8
 * well-formedness (including lone surrogates and overlong-range continuation
 * bytes), or `-1` when the whole sequence is valid UTF-8. A valid leading
 * UTF-8 BOM (`EF BB BF`) is itself well-formed UTF-8 and passes.
 */
function firstInvalidUtf8Offset(bytes: Uint8Array): number {
  const n = bytes.length;
  let i = 0;
  while (i < n) {
    const b = bytes[i];
    if (b === undefined) {
      break;
    }
    if (b < 0x80) {
      i += 1;
      continue;
    }
    let needed: number;
    let firstLo = 0x80;
    let firstHi = 0xbf;
    if (b >= 0xc2 && b <= 0xdf) {
      needed = 1;
    } else if (b === 0xe0) {
      needed = 2;
      firstLo = 0xa0;
    } else if (b >= 0xe1 && b <= 0xec) {
      needed = 2;
    } else if (b === 0xed) {
      needed = 2;
      firstHi = 0x9f; // exclude the UTF-16 surrogate range
    } else if (b === 0xee || b === 0xef) {
      needed = 2;
    } else if (b === 0xf0) {
      needed = 3;
      firstLo = 0x90;
    } else if (b >= 0xf1 && b <= 0xf3) {
      needed = 3;
    } else if (b === 0xf4) {
      needed = 3;
      firstHi = 0x8f;
    } else {
      // Invalid lead byte: 0xC0/0xC1, a bare continuation 0x80–0xBF, or
      // 0xF5–0xFF. The first invalid byte is this lead byte.
      return i;
    }
    for (let k = 1; k <= needed; k += 1) {
      const cb = bytes[i + k];
      if (cb === undefined) {
        // Truncated multibyte sequence at EOF: the sequence begins invalid.
        return i;
      }
      const lo = k === 1 ? firstLo : 0x80;
      const hi = k === 1 ? firstHi : 0xbf;
      if (cb < lo || cb > hi) {
        return i + k;
      }
    }
    i += needed + 1;
  }
  return -1;
}

/** Decode validated UTF-8 bytes, skipping a leading UTF-8 BOM. */
function decodeUtf8(bytes: Uint8Array): string {
  const hasBom =
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf;
  const body = hasBom ? bytes.subarray(3) : bytes;
  return new TextDecoder("utf-8", { ignoreBOM: true }).decode(body);
}

/** Normalise `\r\n` and bare `\r` to `\n` (lexical.md §Newline normalisation). */
function normaliseNewlines(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

/**
 * Tokenise the normalised stream into raw tokens (newlines preserved as
 * `newline` markers for the continuation pass) and the lexical diagnostics that
 * surface during scanning (`loom/parse/block-comment`,
 * `loom/parse/stray-backslash`). A block comment aborts scanning after its
 * diagnostic, since the rest of the stream is not lexable as line comments.
 */
function scanTokens(
  text: string,
  file: string,
): { tokens: RawToken[]; diagnostics: Diagnostic[] } {
  const tokens: RawToken[] = [];
  const diagnostics: Diagnostic[] = [];
  const reserved = reservedKeywords();
  const twoChar = twoCharOperators();
  const n = text.length;

  let i = 0;
  let line = 1;
  let column = 1;

  const pos = (): Pos => ({ line, column });
  const advance = (): string => {
    const c = text[i] ?? "";
    i += 1;
    if (c === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
    return c;
  };

  while (i < n) {
    const c = text[i];
    if (c === undefined) {
      break;
    }

    if (c === "\n") {
      const start = pos();
      advance();
      tokens.push({ kind: "newline", text: "\n", range: { start, end: pos() } });
      continue;
    }
    if (c === " " || c === "\t" || c === "\r") {
      advance();
      continue;
    }

    // Comments. `//` and `///` run to end of line and emit no token.
    if (c === "/" && text[i + 1] === "/") {
      while (i < n && text[i] !== "\n") {
        advance();
      }
      continue;
    }
    // Block comments are rejected and abort the scan.
    if (c === "/" && text[i + 1] === "*") {
      const start = pos();
      diagnostics.push({
        severity: "error",
        code: "loom/parse/block-comment",
        file,
        range: { start, end: { line: start.line, column: start.column + 2 } },
        message: "block comments are not supported",
      });
      return { tokens, diagnostics };
    }

    // String literals: single- or double-quoted, single-line, `\` escapes the
    // next character (so `\"` does not close). Span recording only; the
    // unterminated / illegal-escape diagnostics belong to later leaves.
    if (c === '"' || c === "'") {
      const start = pos();
      let value = advance();
      while (i < n && text[i] !== "\n") {
        const ch = text[i];
        if (ch === undefined) {
          break;
        }
        if (ch === "\\") {
          value += advance();
          if (i < n && text[i] !== "\n") {
            value += advance();
          }
          continue;
        }
        value += advance();
        if (ch === c) {
          break;
        }
      }
      tokens.push({ kind: "string", text: value, range: { start, end: pos() } });
      continue;
    }

    // A backslash outside any literal is a stray backslash (loom has no
    // line-continuation marker).
    if (c === "\\") {
      const start = pos();
      advance();
      diagnostics.push({
        severity: "error",
        code: "loom/parse/stray-backslash",
        file,
        range: { start, end: pos() },
        message: "stray backslash in source",
      });
      continue;
    }

    if (isDigit(c)) {
      const start = pos();
      let value = "";
      while (i < n) {
        const d = text[i];
        if (d === undefined || !isDigit(d)) {
          break;
        }
        value += advance();
      }
      if (text[i] === ".") {
        value += advance();
        while (i < n) {
          const d = text[i];
          if (d === undefined || !isDigit(d)) {
            break;
          }
          value += advance();
        }
      }
      if (text[i] === "e" || text[i] === "E") {
        value += advance();
        if (text[i] === "+" || text[i] === "-") {
          value += advance();
        }
        while (i < n) {
          const d = text[i];
          if (d === undefined || !isDigit(d)) {
            break;
          }
          value += advance();
        }
      }
      tokens.push({ kind: "number", text: value, range: { start, end: pos() } });
      continue;
    }

    if (isIdentStart(c)) {
      const start = pos();
      let value = "";
      while (i < n) {
        const d = text[i];
        if (d === undefined || !isIdentPart(d)) {
          break;
        }
        value += advance();
      }
      tokens.push({
        kind: reserved.has(value) ? "keyword" : "ident",
        text: value,
        range: { start, end: pos() },
      });
      continue;
    }

    // Operators / punctuation: greedily prefer a recognised two-char operator.
    const start = pos();
    const pair = text.slice(i, i + 2);
    if (pair.length === 2 && twoChar.has(pair)) {
      advance();
      advance();
      tokens.push({ kind: "punct", text: pair, range: { start, end: pos() } });
      continue;
    }
    advance();
    tokens.push({ kind: "punct", text: c, range: { start, end: pos() } });
  }

  return { tokens, diagnostics };
}

/**
 * Collapse raw newline markers into significant `stmt-sep` tokens, applying the
 * closed continuation-trigger rule (grammar.md §Newline continuation): a run of
 * one or more newlines is swallowed (no `stmt-sep`) when the bracket depth is
 * open, the prior token is a trailing trigger, or the next token is a leading
 * trigger — otherwise it collapses to exactly one `stmt-sep`. Collapsing the
 * whole run in one decision is what makes blank lines transparent to a
 * continuation. A trailing `eof` token is always appended.
 */
function collapseContinuations(raw: readonly RawToken[]): Token[] {
  const out: Token[] = [];
  const trailing = trailingTriggers();
  const leading = leadingTriggers();
  let depth = 0;
  let i = 0;

  const isTrailing = (t: Token | undefined): boolean =>
    t !== undefined && t.kind === "punct" && trailing.has(t.text);
  const isLeading = (t: RawToken | undefined): boolean =>
    t !== undefined && t.kind === "punct" && leading.has(t.text);

  while (i < raw.length) {
    const t = raw[i];
    if (t === undefined) {
      break;
    }
    if (t.kind === "newline") {
      let j = i;
      while (j < raw.length && raw[j]?.kind === "newline") {
        j += 1;
      }
      const prev = out.length > 0 ? out[out.length - 1] : undefined;
      const next = j < raw.length ? raw[j] : undefined;
      const swallow = depth > 0 || isTrailing(prev) || isLeading(next);
      if (!swallow) {
        out.push({ kind: "stmt-sep", text: "\n", range: t.range });
      }
      i = j;
      continue;
    }

    if (t.kind === "punct") {
      if (t.text === "(" || t.text === "[" || t.text === "{") {
        depth += 1;
      } else if (t.text === ")" || t.text === "]" || t.text === "}") {
        if (depth > 0) {
          depth -= 1;
        }
      }
    }
    out.push({ kind: t.kind, text: t.text, range: t.range });
    i += 1;
  }

  const last = out.length > 0 ? out[out.length - 1] : undefined;
  const eofPos: Pos = last !== undefined ? last.range.end : { line: 1, column: 1 };
  out.push({ kind: "eof", text: "", range: { start: eofPos, end: eofPos } });
  return out;
}

/**
 * Run the parser-enforced identifier rules the lexer core owns at
 * declarator-name and control-header positions: reserved-keyword-as-identifier
 * and the first-letter case rules at `let` / `let mut` / `fn` (binding) and
 * `schema` / `enum` (type) name positions, and the single-line-body rule for
 * `if` / `for` / `while` / `fn` headers whose logical line carries no `{`.
 *
 * Scope note: full identifier-position coverage (every reserved word in every
 * identifier slot) is a parser-leaf obligation; the lexer core enforces the
 * positions its closed Tests obligations name. See notes.md.
 */
function contextualDiagnostics(tokens: readonly Token[], file: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const controlHeads = new Set(["if", "for", "while", "fn"]);

  const checkName = (index: number, kind: "binding" | "type"): void => {
    const name = tokens[index];
    if (name === undefined) {
      return;
    }
    if (name.kind === "keyword") {
      diagnostics.push({
        severity: "error",
        code: "loom/parse/reserved-keyword-as-identifier",
        file,
        range: name.range,
        message: `reserved keyword '${name.text}' cannot be used as an identifier`,
      });
      return;
    }
    if (name.kind !== "ident") {
      return;
    }
    const first = name.text[0] ?? "";
    const isUpper = first >= "A" && first <= "Z";
    if (kind === "binding" && isUpper) {
      diagnostics.push({
        severity: "error",
        code: "loom/parse/binding-case-mismatch",
        file,
        range: name.range,
        message: "binding name must start with a lowercase letter or _",
      });
    } else if (kind === "type" && !isUpper) {
      diagnostics.push({
        severity: "error",
        code: "loom/parse/schema-case-mismatch",
        file,
        range: name.range,
        message: "schema name must start with an uppercase letter",
      });
    }
  };

  for (let k = 0; k < tokens.length; k += 1) {
    const t = tokens[k];
    if (t === undefined || t.kind !== "keyword") {
      continue;
    }
    if (t.text === "let") {
      let nameIdx = k + 1;
      const after = tokens[nameIdx];
      if (after !== undefined && after.kind === "keyword" && after.text === "mut") {
        nameIdx += 1;
      }
      checkName(nameIdx, "binding");
    } else if (t.text === "fn") {
      checkName(k + 1, "binding");
    } else if (t.text === "schema" || t.text === "enum") {
      checkName(k + 1, "type");
    }

    if (controlHeads.has(t.text)) {
      let m = k + 1;
      let braced = false;
      while (m < tokens.length) {
        const body = tokens[m];
        if (body === undefined || body.kind === "stmt-sep" || body.kind === "eof") {
          break;
        }
        if (body.kind === "punct" && body.text === "{") {
          braced = true;
          break;
        }
        m += 1;
      }
      if (!braced) {
        diagnostics.push({
          severity: "error",
          code: "loom/parse/single-line-if",
          file,
          range: t.range,
          message: "single-line body not permitted; wrap in { ... }",
        });
      }
    }
  }

  return diagnostics;
}
