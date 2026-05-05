# V1 — Lexer hardening

## V1a — Numeric literals

- **Spec.** [Lexical Structure](../spec_topics/lexical.md) (number literals).
- **Adds.** `42`, `3.14`, `1e10`, `1.5e-3`, `0`, `0.5`. `integer` vs. `number` token tag based on presence of fractional/exponent parts.
- **Tests.** Each form tokenises; hex/octal/binary/underscore-separator are parse errors with hints; leading `-` is the unary operator (lexer emits `MINUS NUMBER`, not a signed-literal token).
- **Deps.** M.
- **Ships when.** Numeric literals are accepted in any future expression position; M's body parser still passes its tests.

## V1b — String literals and escapes

- **Spec.** [Lexical Structure](../spec_topics/lexical.md) (string literals).
- **Adds.** Single- and double-quoted forms; escape set `\"`, `\'`, `\\`, `\n`, `\t`, `\r`, `\u{XXXX}`. Single-line only — literal `\n` inside a regular string is a parse error. No `${...}` interpolation in regular strings.
- **Tests.** Each escape; illegal escape; literal newline in string; `${` inside regular string is plain text; unterminated string error.
- **Deps.** V1a.
- **Ships when.** String tokens flow through to later parser slices.

## V1c — Line comments (`//` and `///`)

- **Spec.** [Lexical Structure](../spec_topics/lexical.md) (comments).
- **Adds.** `//` regular-comment token (discarded); `///` doc-comment token (preserved with its text). Block comments `/* */` are a parse error.
- **Tests.** Both forms tokenise; block-comment is rejected; `///` text is captured (semantics in V13).
- **Deps.** V1a.
- **Ships when.** Doc-comment tokens reach the AST builder.

## V1d — Identifier case rule and reserved keywords

- **Spec.** [Lexical Structure](../spec_topics/lexical.md) (identifiers, reserved keywords).
- **Adds.** First-letter-case enforcement (PascalCase vs. lowercase-first / `_`); reserved-keyword recognition for the spec's full list; the reserved discard `_`.
- **Tests.** Lowercase-first identifier accepted in binding position; PascalCase identifier accepted in schema-name position; mismatch in schema-name position emits `loom/parse/schema-case-mismatch` with message `"schema name must start with an uppercase letter"`; mismatch in binding / parameter / fn-name / field-name position emits `loom/parse/binding-case-mismatch` with message `` "binding name must start with a lowercase letter or `_`" ``; every reserved keyword listed in [`spec_topics/lexical.md` — Reserved keywords](../spec_topics/lexical.md) used in identifier position emits `loom/parse/reserved-keyword-as-identifier`; `_` cannot be referenced as a regular identifier after binding. Source-of-truth note: the two quoted message strings are the parenthesised quotes in [`spec_topics/lexical.md`](../spec_topics/lexical.md)'s "Violating either rule is a parse error: …" sentence; if the spec text is later edited, this fixture must follow.
- **Deps.** V1a.
- **Ships when.** Case rule and keyword set are uniform across the lexer.

## V1e — Statement separators and newline continuation

- **Spec.** [Lexical Structure](../spec_topics/lexical.md) (statement terminators), [Grammar disambiguation](../spec_topics/expressions.md#grammar-disambiguation) (newline continuation), [Grammar Appendix — Newline continuation](../spec_topics/grammar.md#newline-continuation).
- **Adds.** Newline-as-separator; continuation across the closed trigger set: open `(`/`{`/`[`, trailing binary/ternary operator, trailing comma, leading binary/ternary operator on the next non-blank line. Blank lines do not break a continuation — when any trigger holds, the parser continues across one or more newlines regardless of how many are blank. Semicolons rejected.
- **Tests.** Each continuation form; semicolon rejected; bracket-balance error reports the unmatched opener; operator-at-end-of-line and operator-at-start-of-next-line both join; `let x =\n\n  foo` parses as one statement; `let x = a\n\n  + b` parses as one statement; a blank line with no trigger above it ends the prior statement (`let x = 1\n\nlet y = 2` is two statements).
- **Deps.** V1a–V1d.
- **Ships when.** Multi-line statements parse without explicit terminators, including across blank lines.
