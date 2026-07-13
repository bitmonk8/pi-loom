<!-- S1 coverage-mapping partial — areas LEX + GRAM. READ/GREP-only; no src/tests modified. -->
# S1 coverage map — LEX + GRAM

Every "covered" row cites a `path:line` verified by reading the test (the `it(...)`
header or the primary `expect`). "PARTIAL" = the diagnostic/primary behaviour is
pinned but a named sub-clause of the requirement is not asserted. "UNCOVERED" =
no offline test exercises it. "M2" = testable only via runtime conformance, not
offline.

## AREA LEX (lexical)

| REQ id | covering test path:line | UNCOVERED / notes |
|---|---|---|
| REQ-LEX-1 | — | UNCOVERED. No offline test consumes/ignores a leading UTF-8 BOM (`EF BB BF`). |
| REQ-LEX-2 | tests/lexer-core.test.ts:118 (also tests/diagnostics-primitive.test.ts:110) | Covered. `loom/load/invalid-encoding` at zero-based byte offset (offset 2 asserted line 130). |
| REQ-LEX-3 | — | UNCOVERED. No explicit UTF-16-save-fails-fast test; only a lone `0xFF` byte is exercised (lexer-core.test.ts:118). No UTF-16 BOM / transcoding-refusal case. |
| REQ-LEX-4 | tests/lexer-core.test.ts:150 | Covered. LF vs CRLF tokenise byte-identical (`project(crlf) === project(lf)`, line 158). |
| REQ-LEX-5 | tests/descriptions.test.ts:125 | Covered. Empty `///` `RestOfLine` admitted → blank line; RestOfLine contents at descriptions.test.ts:131. |
| REQ-LEX-6 | tests/literals-and-paths.test.ts:223 (also tests/diagnostics-primitive.test.ts:50) | Covered. Backslash in path literal → `loom/parse/invalid-path-separator` (expect line 229). |
| REQ-LEX-7 | tests/lexer-core.test.ts:223 | Covered. Lone `\` at top level → `loom/parse/stray-backslash` (expect line 229). |
| REQ-LEX-8 | tests/discovery-invalid-extension.test.ts:86 (also tests/literals-and-paths.test.ts:231) | Covered. `--loom` non-`.loom` entry → `loom/load/invalid-extension`; byte-exact `.LOOM` rejected cross-OS. |
| REQ-LEX-9 | tests/diagnostics-primitive.test.ts:40 (CRLF one-newline: tests/lexer-core.test.ts:150) | Covered. 1-indexed `file:line:col` format asserted (`entry.loom:3:5:`); post-normalisation one-newline via lexer-core:150. Post-BOM offsetting not separately asserted. |
| REQ-LEX-10 | — | UNCOVERED. No test pins the identifier char-class `[A-Za-z_][A-Za-z0-9_]*` or case-sensitivity of identifier resolution. (Casing *conventions* are LEX-11/12, a different rule.) |
| REQ-LEX-11 | tests/lexer-core.test.ts:177 (also tests/system-note-channel.test.ts:204) | Covered. Lowercase-first schema name → `loom/parse/schema-case-mismatch` (expect line 182). |
| REQ-LEX-12 | tests/lexer-core.test.ts:186 | Covered. Uppercase-first binding → `loom/parse/binding-case-mismatch` (expect line 191). snake_case/lowerCamelCase acceptance not separately asserted. |
| REQ-LEX-13 | tests/lexer-core.test.ts:164 | Covered (representative). `let match = 1` → `loom/parse/reserved-keyword-as-identifier` (expect line 170). Only `match` sampled, not the full keyword set. |
| REQ-LEX-14 | tests/lexical-environment.test.ts:227 | Covered. `let _` creates no resolvable binding (`resolve("_").arm === "unresolved"`, line 233). |
| REQ-LEX-15 | tests/type-grammar.test.ts:59, tests/type-grammar.test.ts:71 | PARTIAL. `array`/`Result` as closed generic constructors covered (arity checks). Not asserted: that `array`/`Result` remain reserved in *identifier* position. |
| REQ-LEX-16 | — | UNCOVERED. No test rejects a semicolon or asserts semicolons are absent from the grammar. (Newline statement-separation is exercised via `statementGroups`, but not the "no semicolon" clause.) |
| REQ-LEX-17 | tests/lexer-core.test.ts:236 (blank-line rule: tests/lexer-core.test.ts:258) | Covered. Closed continuation-trigger set; blank lines do not break a continuation. (Same evidence as REQ-GRAM-21.) |
| REQ-LEX-18 | tests/lexer-core.test.ts:214 | Covered. `if (x) doThing()` → `loom/parse/single-line-if` (expect line 219). |
| REQ-LEX-19 | tests/descriptions.test.ts:52 | Covered. `///` lowers byte-for-byte into `description:`; `fn` `///` stays AST-only (descriptions.test.ts:78). Plain `//` regular-comment behaviour not separately asserted. |
| REQ-LEX-20 | tests/lexer-core.test.ts:201 | Covered. `/* ... */` → `loom/parse/block-comment` (expect line 206). |
| REQ-LEX-21 | tests/literals-and-paths.test.ts:106 | PARTIAL. Escape table (`\n \t \" \\`) + `\u{...}` decode covered (literals-and-paths.test.ts:98). Single-quoted ↔ double-quoted equivalence NOT asserted (only `"..."` exercised). |
| REQ-LEX-22 | tests/literals-and-paths.test.ts:133, tests/literals-and-paths.test.ts:142 | Covered. `\u{110000}` (>0x10FFFF) and `\u{D800}` (surrogate) → `loom/parse/invalid-unicode-escape`. |
| REQ-LEX-23 | tests/literals-and-paths.test.ts:120 (also tests/diagnostics-primitive.test.ts:186) | Covered. `\x` → `loom/parse/illegal-escape` (message `illegal escape sequence: \x`, line 126). |
| REQ-LEX-24 | tests/diagnostics-primitive.test.ts:32 (also tests/lexer-parser-diagnostics-production.test.ts:73) | Covered. EOF in open string → `loom/parse/unterminated-string`. |
| REQ-LEX-25 | tests/lexer-parser-diagnostics-production.test.ts:86 | Covered. Raw newline in `"..."` → `loom/parse/literal-newline-in-string`. |
| REQ-LEX-26 | — | UNCOVERED. No test asserts a regular string performs no interpolation / treats `${` as plain text. (`${...}` interpolation is exercised only for `@`...`` query templates: tests/query-render.test.ts:108.) |
| REQ-LEX-27 | tests/literals-and-paths.test.ts:212 | Covered. Hex/octal/binary + underscore-separator forms → `loom/parse/unsupported-feature` (parametrised, all four; expect line 215). Deferred-appendix Cluster-1 item, but the *rejection* is in scope. |
| REQ-LEX-28 | tests/literals-and-paths.test.ts:172 | Covered. `3.14` typed `number`, `42` typed `integer` (numericType assertions). |
| REQ-LEX-29 | tests/literals-and-paths.test.ts:182 (also tests/type-compat.test.ts:100, tests/type-layer-diagnostics-production.test.ts:167) | Covered. number→integer → `loom/parse/integer-narrowing`; integer→number widening raises nothing (literals-and-paths.test.ts:190). |
| REQ-LEX-30 | tests/literals-and-paths.test.ts:156 | Covered. `12345678901234567890` → `loom/parse/integer-literal-out-of-range` (expect line 160). Per-token-before-unary-fold `-12345…` case not separately asserted. |
| REQ-LEX-31 | tests/literals-and-paths.test.ts:164 | Covered. `1e400` → `loom/parse/number-literal-not-finite` (expect line 168). |

## AREA GRAM (grammar/parse)

| REQ id | covering test path:line | UNCOVERED / notes |
|---|---|---|
| REQ-GRAM-1 | tests/params-defaults.test.ts:119 (tool-arg: tests/tool-calls.test.ts:65; also tests/type-grammar.test.ts:129, :142) | Covered. Both positions: `loom/parse/default-not-literal` + `loom/parse/tool-arg-not-literal`, offending sub-expression named (type-grammar.test.ts:135,147). |
| REQ-GRAM-2 | — | UNCOVERED. No test asserts `PrimitiveLit` admits `"-" NUMBER` (unary minus counts as literal) or that `NamedValueLit` = `Ident "." Ident` (Enum.Variant) is literal-legal. params-defaults.test.ts:135 pins only a plain primitive default. |
| REQ-GRAM-3 | — | UNCOVERED. No offline test distinguishes `BareObjectLit` (external schema supplies type) from `NamedObjectLit` (`Cat { ... }`, never `Animal { species: "cat", ... }`). |
| REQ-GRAM-4 | tests/type-grammar.test.ts:153 | Covered. Constructor literal omitting a declared field → `loom/parse/missing-object-field`; full-field literal raises nothing (line 172). Field-order-free / implicit-discriminator sub-clauses not separately asserted. |
| REQ-GRAM-5 | tests/type-grammar.test.ts:131, tests/type-grammar.test.ts:142 | PARTIAL. is-literal rejects operator forms (`a + b`) and function calls (`f(x)`). Not asserted: rejection of identifier refs (other than Enum.Variant), `${...}`/`@`...`` templates, member access other than Enum.Variant. |
| REQ-GRAM-6 | tests/bindings.test.ts:171 | Covered. `let x: T` (no initialiser) → `loom/parse/let-without-initialiser` (expect line 180). |
| REQ-GRAM-7 | tests/type-grammar.test.ts:85 | Covered. `void` in value position → `loom/parse/void-in-non-return-position`; return position raises nothing (line 98). |
| REQ-GRAM-8 | tests/type-grammar.test.ts:59, tests/type-grammar.test.ts:71 | Covered. `array<T,U>` and `Result<T>` → `loom/parse/generic-arity-mismatch`. Nested-generics-parse sub-clause not separately asserted. |
| REQ-GRAM-9 | tests/type-grammar.test.ts:107 (also tests/schema-subset-gate.test.ts:193, :207) | Covered. `Result<T,E>` in schema-feeding position → `loom/parse/result-in-schema-position`; admitted in value position (type-grammar.test.ts:120); nested-in-array case at schema-subset-gate.test.ts:207. |
| REQ-GRAM-10 | tests/schema-declarations.test.ts:54 (wire-name: tests/schema-declarations.test.ts:75, :114) | Covered. `{}` → `loom/parse/empty-schema-body`; `loom/parse/wire-name-collision` (line 88) and `loom/parse/redundant-wire-name` (line 120). |
| REQ-GRAM-11 | — | UNCOVERED. No test pins type-union `\|` right-associativity or `T \| null` nullability form. |
| REQ-GRAM-12 | tests/whole-program-parser.test.ts:113 (also tests/whole-program-parser.test.ts:123) | Covered. LoomBody captures optional trailing tail `Expr`; tail left null when last form is a statement. BlockExpr-requires-tail vs FnBody/StmtBlock distinction not separately asserted. |
| REQ-GRAM-13 | tests/functions-and-return.test.ts:286 (also tests/functions-and-return.test.ts:328) | Covered. Empty-tail body infers `null` literal type; `void` fn discards tail → null. |
| REQ-GRAM-14 | tests/lexer-parser-diagnostics-production.test.ts:110 (ternary-as-expr-form: tests/expression-evaluator.test.ts:128) | PARTIAL. Bare `if` in arm-body → `loom/parse/statement-in-arm-body` (proxy for "statement form not admissible in expr position"); ternary right-assoc expr form pinned. Not asserted directly: statement `if`/`for`/`while` "produces no value" in expression position. |
| REQ-GRAM-15 | — | M2 (conformance). Tail-`Expr` discard + `?`-early-return-on-tail is runtime conformance (spec marks testability=conformance); not offline-testable. |
| REQ-GRAM-16 | — | UNCOVERED. No test asserts the always-parenthesised `FnDecl` param list, `,`-separated params with admitted trailing comma, or `FnParam = Ident ":" Type`. (whole-program-parser.test.ts:159 parses a parenthesised `fn` but does not assert the paren requirement or trailing comma.) |
| REQ-GRAM-17 | tests/bindings.test.ts:111 | Covered. `mut` on a fn parameter → `loom/parse/mut-on-immutable-context` (expect line 117). |
| REQ-GRAM-18 | tests/lexer-parser-diagnostics-production.test.ts:110 | Covered. Bare statement (`if`) in match arm-body → `loom/parse/statement-in-arm-body` (expect line 121). |
| REQ-GRAM-19 | tests/disc-unions-recursion.test.ts:201 | Covered. `by` on an object body → `loom/parse/by-on-object-schema`; union form raises nothing (expect line 205). |
| REQ-GRAM-20 | tests/descriptions.test.ts:93 (also tests/whole-program-parser.test.ts:385) | Covered. Misplaced `///` → `loom/parse/doc-comment-misplaced`; eligible anchor raises nothing (descriptions.test.ts:116). |
| REQ-GRAM-21 | tests/lexer-core.test.ts:236 (also tests/whole-program-parser.test.ts:300) | Covered. All four triggers (open bracket / trailing op / trailing comma / leading op); blank-line non-break at lexer-core.test.ts:258. |
| REQ-GRAM-22 | tests/whole-program-parser.test.ts:335 | Covered. Postfix error-propagation `?` does NOT trigger continuation — `foo()?` closes its statement, `bar()` stays separate (assertions lines 348–353). |
| REQ-GRAM-23 | tests/type-grammar.test.ts:181 (also tests/type-compat.test.ts:302, tests/type-layer-diagnostics-production.test.ts:141) | Covered. `for x in []` iterand (not a sink) → `loom/parse/array-no-common-type`; binding-annotation sink resolves (type-grammar.test.ts:195). |
| REQ-GRAM-24 | tests/functions-and-return.test.ts:60 | Covered. Nested `fn` → `loom/parse/nested-fn` (expect line 63; message line 66). |

## UNCOVERED reqs that are behaviourally important → warrant a NEW test

- **REQ-LEX-1 / REQ-LEX-3 (BOM + encoding intake).** New topic: *"lexer BOM/encoding intake"* — assert a leading `EF BB BF` BOM is consumed and ignored (byte-identical token stream to the no-BOM source) and that a UTF-16 (BOM-led) source fails `loom/load/invalid-encoding` rather than producing mojibake. Load-phase gate with no offline coverage today.
- **REQ-LEX-26 (no interpolation in regular strings).** New topic: *"regular-string no-interpolation"* — assert `"${x}"` lexes as literal text (value contains `${x}`), separating regular strings from `@`...`` query-template interpolation. Real footgun for authors coming from JS template literals.
- **REQ-LEX-16 (semicolons rejected).** New topic: *"semicolon rejection"* — assert a `;` statement terminator is a diagnostic (not silently accepted), pinning the "semicolons are not part of the grammar" clause.
- **REQ-GRAM-16 (fn parameter-list grammar).** New topic: *"FnDecl param-list grammar"* — assert `fn f` (unparenthesised) is rejected, an admitted trailing comma parses, and `FnParam` requires `Ident ":" Type`. Core surface-syntax guarantee with only incidental parse coverage.
- **REQ-GRAM-2 / REQ-GRAM-3 (literal sublanguage positives).** New topic: *"literal-sublanguage admitted forms"* — assert `-5` (unary-minus numeric) and `Enum.Variant` ARE literal-legal in `params:` defaults, and that `NamedObjectLit` (`Cat { ... }`) is required where the type is not externally supplied. Currently only the *rejection* side (GRAM-1/5) is pinned; the admitted-forms side is unverified.
- **REQ-GRAM-11 (type-union nullability).** New topic: *"type-union `T \| null` / right-associativity"* — assert `T | null` parses as nullability and `A | B | C` associates right. No coverage today.
