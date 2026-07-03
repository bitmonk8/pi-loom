# Reference — Diagnostics registry

The closed loom 1.0 diagnostic-code registry, sharded by namespace. This page
transcribes the stable-contract columns — **Code**, **Sev**, **Phase**, and the
normative **Message** — verbatim from the four spec registry pages (see
Provenance). The Message column is normative per **DIAG-4**: renderers emit it
character-for-character with `<…>` placeholders interpolated, and tests source the
expected string from this column. The full *Trigger* / *Spec rule* / *Hint*
columns live on the spec registry pages and are not restated here to avoid drift.

## Diagnostic shape

```
{
  severity: "error" | "warning",
  code:     string,                          // e.g. "loom/parse/binding-case-mismatch"
  file?:    string,                          // absolute path; omitted for file-less codes
  range?:   { start: { line, column }, end: { line, column } },  // 1-indexed; end exclusive
  message:  string,                          // single-line summary
  hint?:    string,                          // optional suggested fix
  related?: array<{ file, range, message }>, // related sites
  masked?:  array<string>,                   // hard-ceiling co-fire enumeration
  details?: object,                          // per-row structured payload
}
```

Located-site classification (closed): **Located** (single token span in one file —
`file` and `range`); **File-only** (one file, no single span — `file`, no
`range`); **Location-less** (no single concrete file — neither `file` nor
`range`). Serialised `content` line format: `"<file>:<line>:<col>: <code>:
<message>"` (Located), `"<file>: <code>: <message>"` (File-only), `"<code>:
<message>"` (Location-less), optionally `+ "\n  hint: <hint>"`.

## Code registry rules (normative)

- **DIAG-1.** Every author-visible diagnostic carries a code from this registry.
- **DIAG-2.** The registry is closed. Adding/removing a code or changing its
  namespace, severity, or trigger is a spec change.
- **DIAG-3.** Codes are stable identifiers; renaming is a breaking change deferred
  to loom 2.0.
- **DIAG-4.** The Message column is normative; renderers emit it
  character-for-character.

Namespaces: `loom/parse/*` (lex / parse / type), `loom/load/*` (file-load,
registration, discovery), `loom/runtime/*` (execution panics, runtime-defect
surface, delivery/lifecycle failures), `loom/host/*` (host-observed anomalies,
emitted via `console.error`). `loom/typecheck/*` is a build-time `tsc` brand
namespace, **not** runtime diagnostics — no registry row, out of scope. Severity
`E/W` means the severity is resolved per diagnostic by that row's trigger.

## `loom/parse/*`

| Code | Sev | Phase | Message |
|---|---|---|---|
| `loom/parse/illegal-escape` | E | lex | `illegal escape sequence: \<char>` |
| `loom/parse/invalid-unicode-escape` | E | lex | `invalid Unicode escape: value is not a Unicode scalar value` |
| `loom/parse/literal-newline-in-string` | E | lex | `literal newline in string literal` |
| `loom/parse/unterminated-string` | E | lex | `unterminated string literal` |
| `loom/parse/invalid-path-separator` | E | lex | `invalid path separator: backslash in path literal` |
| `loom/parse/stray-backslash` | E | lex | `stray backslash in source` |
| `loom/parse/invoke-non-loom-extension` | E | parse | `invoke path '<path>' does not end in .loom` |
| `loom/parse/import-non-warp-extension` | E | parse | `import path '<path>' does not end in .warp` |
| `loom/parse/binding-case-mismatch` | E | parse | `binding name must start with a lowercase letter or _` |
| `loom/parse/schema-case-mismatch` | E | parse | `schema name must start with an uppercase letter` |
| `loom/parse/reserved-keyword-as-identifier` | E | parse | `reserved keyword '<keyword>' cannot be used as an identifier` |
| `loom/parse/single-line-if` | E | parse | `single-line body not permitted; wrap in { ... }` |
| `loom/parse/block-comment` | E | lex | `block comments are not supported` |
| `loom/parse/integer-narrowing` | E | type | `cannot narrow number to integer` |
| `loom/parse/integer-literal-out-of-range` | E | lex | `integer literal exceeds the safe-integer range` |
| `loom/parse/number-literal-not-finite` | E | lex | `number literal is not a finite IEEE-754 double` |
| `loom/parse/unsupported-feature` | E | parse | `unsupported syntactic feature: <construct>` |
| `loom/parse/immutable-rebinding` | E | parse | `cannot reassign immutable binding '<name>'` |
| `loom/parse/assignment-as-expression` | E | parse | `assignment is not an expression` |
| `loom/parse/assignment-to-member-or-index` | E | parse | `cannot assign to member or index; mutability is binding-level only` |
| `loom/parse/mut-on-immutable-context` | E | parse | `'mut' is not permitted in this binding position` |
| `loom/parse/mut-on-discard` | E | parse | `'mut' is not permitted on discard binding '_'` |
| `loom/parse/increment-decrement` | E | parse | `'<op>' operator is not supported` |
| `loom/parse/non-boolean-condition` | E | type | `condition must be boolean; got <type>` |
| `loom/parse/comparison-chaining` | E | parse | `comparison operators do not chain; use &&` |
| `loom/parse/mixed-plus-operands` | E | type | `'+' has mixed operand types: <left> and <right>` |
| `loom/parse/non-orderable-operands` | E | type | `'<op>' requires two numeric or two string operands; got <left> and <right>` |
| `loom/parse/non-indexable-receiver` | E | type | `indexed access requires an array<T> or object receiver; got <type>` |
| `loom/parse/non-string-object-index` | E | type | `object index must be string; got <type>` |
| `loom/parse/array-element-type-mismatch` | E | type | `array element type mismatch at index <i>: expected <expected>, got <actual>` |
| `loom/parse/array-no-common-type` | E | type | `array elements have no common type; annotate the binding with array<A \| B> or use a single schema` |
| `loom/parse/return-no-common-type` | E | type | `return operands have no common type; annotate the function return type or reconcile the operands` |
| `loom/parse/non-string-array-join` | E | type | `array.join requires a string element type; got array<<element>>` |
| `loom/parse/extra-object-field` | E | parse | `extra field '<field>' on schema '<schema>'` |
| `loom/parse/missing-object-field` | E | parse | `missing field '<field>' on schema '<schema>'` |
| `loom/parse/bare-object-literal` | E | parse | `bare object literal not permitted in this position; name the schema (Schema { ... })` |
| `loom/parse/default-not-literal` | E | parse | `params default RHS must be a literal-sublanguage form; offending sub-expression: <expr>` |
| `loom/parse/non-trailing-default` | E | parse | `non-defaulted param '<field>' follows a defaulted param; defaulted params must be trailing` |
| `loom/parse/tool-arg-not-literal` | E | parse | `Pi-tool argument must be a literal-sublanguage form; offending sub-expression: <expr>` |
| `loom/parse/tool-arg-arity` | E | parse | `Pi tool '<name>' takes a single object argument; got <count>` |
| `loom/parse/let-without-initialiser` | E | parse | `let binding '<name>' has no initialiser` |
| `loom/parse/let-rhs-type-mismatch` | E | type | `let binding '<name>' initialiser type mismatch: expected <expected>, got <actual>` |
| `loom/parse/statement-in-arm-body` | E | parse | `match arm body must be an expression; wrap statements in a block expression { ... }` |
| `loom/parse/by-on-object-schema` | E | parse | `the 'by' clause applies only to discriminated-union schemas (schema X by f = A \| B \| …)` |
| `loom/parse/doc-comment-misplaced` | E | parse | `'///' doc comment is not legal above this production` |
| `loom/parse/generic-arity-mismatch` | E | parse | `generic type '<ctor>' expects <expected> type argument(s); got <actual>` |
| `loom/parse/void-in-non-return-position` | E | parse | `'void' is only permitted as a function or loom return type` |
| `loom/parse/result-in-schema-position` | E | parse | `'Result' has no lowered-schema form and is not permitted in a schema-feeding position` |
| `loom/parse/unknown-identifier` | E | parse | `unknown identifier '<name>'` |
| `loom/parse/unknown-method` | E | parse | `unknown method '<method>' on type <type>` |
| `loom/parse/non-array-iterand` | E | type | `'for' expects array<T> after 'in'; got <type>` |
| `loom/parse/break-outside-loop` | E | parse | `'break' outside of a loop` |
| `loom/parse/continue-outside-loop` | E | parse | `'continue' outside of a loop` |
| `loom/parse/break-with-value` | E | parse | `'break' takes no value in loom 1.0` |
| `loom/parse/illegal-template-escape` | E | lex | `` illegal escape sequence in @`...` template: \<char> `` |
| `loom/parse/unterminated-template` | E | lex | `` unterminated @`...` query template `` |
| `loom/parse/discarded-query-result` | E | parse | `query result discarded; use ? to propagate failure or 'let _ = ...' to discard explicitly` |
| `loom/parse/empty-template` | W | parse | `query template body is empty after newline-trim and dedent` |
| `loom/parse/interpolated-result` | E | type | `Result value cannot be interpolated; unwrap with ? or match first` |
| `loom/parse/explicit-schema-mismatch` | W | parse | `explicit @<Schema> ascription is not compatible with binding annotation` |
| `loom/parse/match-arm-type-mismatch` | E | type | `match arm body type does not match the common type of the other arms` |
| `loom/parse/question-outside-result-fn` | E | type | `'?' used in a scope whose return type is not Result<T, QueryError>` |
| `loom/parse/question-on-non-result` | E | type | `'?' requires a Result operand; got <type>` |
| `loom/parse/match-guard-not-supported` | E | parse | `match guards are not supported in loom 1.0` |
| `loom/parse/rest-pattern-not-supported` | E | parse | `rest patterns are not supported in loom 1.0` |
| `loom/parse/bare-return-in-non-void` | E | type | `missing return value` |
| `loom/parse/unreachable-code` | W | parse | `unreachable code after return` |
| `loom/parse/nested-fn` | E | parse | `nested 'fn' declarations are not supported in loom 1.0` |
| `loom/parse/function-as-value` | E | parse | `function '<name>' used outside call position; functions are not first-class in loom 1.0` |
| `loom/parse/redundant-wire-name` | W | parse | `redundant 'as' clause: wire name '<name>' equals the loom-side name` |
| `loom/parse/wire-name-collision` | E | parse | `wire name '<name>' collides with another field on schema '<schema>'` |
| `loom/parse/empty-schema-body` | E | parse | `'<X>' has no fields; an empty schema cannot be validated.` |
| `loom/parse/empty-enum-body` | E | parse | `'<X>' has no variants; an empty enum cannot be validated.` |
| `loom/parse/unknown-variant` | E | parse | `unknown variant '<variant>' on enum '<enum>'` |
| `loom/parse/unresolved-named-type` | E | parse | `unresolved named type '<name>'` |
| `loom/parse/duplicate-enum-value` | E | parse | `duplicate enum value '<value>' across variants of enum '<enum>'` |
| `loom/parse/duplicate-enum-variant-name` | E | parse | `duplicate variant name '<variant>' on enum '<enum>'` |
| `loom/parse/non-string-enum-value` | E | parse | `enum variant value must be a string literal; got <kind>` |
| `loom/parse/inline-enum` | E | parse | `inline 'enum[...]' is not supported; use a top-level 'enum' declaration or a literal-union` |
| `loom/parse/ambiguous-discriminator` | E | parse | `ambiguous discriminator for <X>; candidates: <fields>. Declare explicitly with 'by <field>'.` |
| `loom/parse/missing-discriminator` | E | parse | `<X> is a union of object schemas with no shared single-literal discriminator field. Add a 'kind' (or similar) field to each variant, or declare explicitly with 'by <field>'.` |
| `loom/parse/duplicate-discriminator-value` | E | parse | `duplicate discriminator value '<value>' across variants of <X>` |
| `loom/parse/nested-discriminator` | E | parse | `discriminator field '<field>' must be at the top level of each variant of <X>` |
| `loom/parse/non-string-discriminator` | E | parse | `discriminator '<field>' on <X> must be a string-literal type; got <kind>` |
| `loom/parse/type-alias-cycle` | E | parse | `type-alias cycle: <path>` |
| `loom/parse/system-on-prompt-mode` | E | parse | `'system:' is not permitted on a mode: prompt loom` |
| `loom/parse/system-interp-not-path` | E | parse | `'system:' interpolation body must be a bare identifier path` |
| `loom/parse/system-interp-unknown-param` | E | parse | `'system:' interpolation references unknown param '<name>'` |
| `loom/parse/system-interp-bad-field` | E | parse | `'system:' interpolation '.<field>' does not name a reachable object field on <path>` |
| `loom/parse/system-interp-unterminated` | E | parse | `'system:' interpolation '${' is not closed by a matching '}'` |
| `loom/parse/timeout-field-rejected` | E | parse | `'timeout:' field is not supported in loom 1.0` |
| `loom/parse/bind-context-session-on-subagent` | W | parse | `'bind_context: session' has no effect on a mode: subagent loom` |
| `loom/parse/bind-echo-on-bypass` | W | parse | `'bind_echo: true' has no effect on a single-string-bypass loom` |
| `loom/parse/warp-top-level-statement` | E | parse | `top-level statement not permitted in .warp file; move into a fn body` |
| `loom/parse/import-name-collision` | E | parse | `imported symbol '<name>' collides with another import or top-level declaration` |
| `loom/parse/import-unknown-symbol` | E | parse | `imported symbol '<name>' is not declared or re-exported by '<path>'` |
| `loom/parse/invoke-arg-type-mismatch` | E | type | `invoke argument <i> ('<param>') type mismatch: expected <expected>, got <actual>` |
| `loom/parse/tool-arg-type-mismatch` | E | type | `tool '<name>' argument type mismatch: expected <expected>, got <actual>` |
| `loom/parse/fn-arg-type-mismatch` | E | type | `fn '<name>' argument <i> ('<param>') type mismatch: expected <expected>, got <actual>` |
| `loom/parse/invoke-return-type-mismatch` | E | type | `invoke<Schema> annotation incompatible with callee '<callee>' return type <actual>` |
| `loom/parse/invoke-arity-too-few` | E | parse | `invoke '<callee>' passes too few arguments: expected <required> non-defaulted, got <provided>` |
| `loom/parse/invoke-arity-too-many` | E | parse | `invoke '<callee>' passes too many arguments: expected at most <max>, got <provided>` |

## `loom/load/*`

| Code | Sev | Phase | Message |
|---|---|---|---|
| `loom/load/extension-bootstrap-failed` | E | load | `extension bootstrap failed: <capability> threw <error>` |
| `loom/load/host-incompatible` | E | load | `host incompatible (<kind>): observed <observed>, required <required>` |
| `loom/load/invalid-encoding` | E | lex | `invalid UTF-8 encoding at byte offset <offset>` |
| `loom/load/unknown-frontmatter-field` | W | load | `unknown frontmatter field '<field>'` |
| `loom/load/deferred-frontmatter-field` | W | load | `frontmatter field '<field>' is reserved for a deferred loom 1.0 feature` |
| `loom/load/missing-mode` | E | load | `frontmatter is missing required field 'mode:'` |
| `loom/load/params-null` | E | load | `'params: null' is not permitted; omit 'params:' or use 'params: {}'` |
| `loom/load/frontmatter-value-out-of-range` | E | load | `frontmatter field '<dotted-key>' must be a non-negative integer; got <observed>` |
| `loom/load/bind-echo-without-params` | W | load | `'bind_echo: true' has no effect on a no-params loom` |
| `loom/load/unknown-mode-value` | E | load | `unknown 'mode:' value '<value>'; expected 'prompt' or 'subagent'` |
| `loom/load/unknown-methodology-value` | E | load | `unknown 'respond_repair.methodology:' value '<value>'; expected 'validator_error', 'schema_repeat', or 'none'` |
| `loom/load/unknown-bind-context-value` | E | load | `unknown 'bind_context:' value '<value>'; expected 'none' or 'session'` |
| `loom/load/unknown-tool` | E | load | `unknown Pi tool '<name>'` |
| `loom/load/unresolvable-loom-path` | E | load | `cannot resolve .loom path '<path>'` |
| `loom/load/prompt-mode-callable` | E | load | `'tools:' entry '<path>' points at a prompt-mode loom; only subagent-mode looms are permitted` |
| `loom/load/tool-name-collision` | E | load | `tool name '<name>' collides with another 'tools:' entry, top-level fn, or import` |
| `loom/load/invalid-tool-rename` | E | load | `'as <name>' rename target must be lowercase-first; got '<name>'` |
| `loom/load/invocation-cycle` | E | load | `invocation cycle: <A> → <B> → <A>` |
| `loom/load/invoke-path-escape` | E | load, runtime | `invoke path '<path>' resolves outside every active discovery root` |
| `loom/load/binder-model-unresolved` | E | load | `binder model unresolved: set 'bind_model:' in frontmatter or 'looms.binderModel' in settings` |
| `loom/load/model-unresolved` | E | load | `loom 'model:' value '<value>' resolves to no available model, or is ambiguous across providers` |
| `loom/load/binder-model-not-strict-capable` | E | load | `binder model '<model>' is not flagged as strict-structured-output capable` |
| `loom/load/binder-model-strict-capability-unknown` | W | load | `binder model '<model>' strict-capability flag unavailable; load-time check degraded to best-effort` |
| `loom/load/argument-hint-not-displayed` | W | load | `'argument-hint:' declared without 'description:'; Pi's autocomplete entry will be empty` |
| `loom/load/callee-has-errors` | E/W | load | `callee '<path>' has errors; see related diagnostics` |
| `loom/load/import-cycle` | E | load | `import cycle: <A>.warp → <B>.warp → <A>.warp` |
| `loom/load/unresolvable-warp-path` | E | load | `cannot resolve .warp import '<path>'` |
| `loom/load/case-collision` | W | load | `case-insensitive filename collision in <source>: '<path-a>' and '<path-b>'` |
| `loom/load/cross-source-shadow` | W | load | `slash name '<name>' shadowed across discovery sources: '<higher>' wins over '<lower>'` |
| `loom/load/cross-format-collision` | E | load | `slash name '<name>' collides at the same priority: <paths>` |
| `loom/load/invalid-slash-name` | E | load | `` slash names must be lowercase kebab/snake; rename the file (e.g. `code-review.loom`) `` |
| `loom/load/missing-source` | E/W | load | `discovery source path does not exist: <descriptor>` |
| `loom/load/unreadable-source` | E/W | load | `discovery source is unreadable: <descriptor>` |
| `loom/load/wrong-type-source` | E/W | load | `discovery source <descriptor> is neither a .loom file nor a directory of them` |
| `loom/load/unreadable` | W | load | `.loom file is unreadable: '<path>'` |
| `loom/load/settings-unreadable` | W | load | `settings file '<path>' is unreadable` |
| `loom/load/settings-invalid-json` | W | load | `settings file '<path>' is not valid UTF-8 JSON` |
| `loom/load/settings-invalid-entry` | E | load | `settings 'loomPaths[<index>]' must be a string path; got <kind>` |
| `loom/load/settings-value-out-of-range` | E | load | `settings key <key> value is out of range; got <observed>` |
| `loom/load/invalid-extension` | E | load | `'loomPaths[<index>]' resolves to '<path>' which does not end in .loom` |
| `loom/load/non-canonical-extension` | W | load | `file '<path>' has non-canonical extension case; rename to lowercase '.loom' or '.warp'` |
| `loom/load/manifest-invalid` | E | load | `package '<name>' has invalid 'pi.looms': expected string[], got <kind>` |
| `loom/load/manifest-escapes-package` | W | load | `package '<name>' 'pi.looms' entry '<path>' resolves outside the package root` |
| `loom/load/discovery-slow` | W | load | `package-discovery walk aborted at <root>: <cap> cap reached` |
| `loom/load/package-read-timeout` | W | load | `package '<name>' package.json read exceeded <deadline>ms during package discovery` |
| `loom/load/typed-query-unsupported-provider` | W | load | `provider '<provider>' (model '<model>') is outside the loom 1.0 typed-query supported set; typed queries will fail at runtime` |
| `loom/load/schema-slug-collision` | E | load | `schema-slug collision on slug <slug>: two distinct inline schemas hash alike` |

## `loom/runtime/*`

loom 1.0.0 has exactly six **panic sources** (the first six rows). One further
code — `loom/runtime/internal-error` — covers the runtime-defect surface (a code
stable, trigger intentionally open-ended). The remaining codes are delivery /
rebuild / registration / teardown / lifecycle failures. `reload-teardown-timeout`
is delivered via `console.error` (not the persistent channel).

| Code | Sev | Phase | Message template |
|---|---|---|---|
| `loom/runtime/match-error` | E | runtime | `MatchError: no arm matched <scrutinee summary>`. |
| `loom/runtime/index-out-of-bounds` | E | runtime | `index out of bounds: <i> not in 0..<length>`. |
| `loom/runtime/null-member-access` | E | runtime | `null member access: .<field>`. |
| `loom/runtime/null-index-access` | E | runtime | `null index access: [<i>]`. |
| `loom/runtime/missing-object-key` | E | runtime | `missing object key: <key>`. |
| `loom/runtime/invoke-depth-exceeded` | E | runtime | `invoke chain depth exceeded: <depth> > 32`. |
| `loom/runtime/system-note-delivery-failed` | E | runtime | `system-note delivery failed: <original content first line>`. |
| `loom/runtime/registry-swap-failed` | E | runtime | `registry swap failed: <path>`. |
| `loom/runtime/watcher-terminated` | E | runtime | `loom watcher terminated; hot-reload halted until /reload`. |
| `loom/runtime/internal-error` | E | runtime | `internal error: <error.message>`. |
| `loom/runtime/subagent-dispose-failure` | E | runtime | `subagent dispose failed: <dispose error first line>`. |
| `loom/runtime/registration-cache-collision` | E | runtime | `tool-registration cache collision on slug <slug>: <name1> vs <name2>`. |
| `loom/runtime/validator-cache-collision` | E | runtime | `validator-cache collision on slug <slug>: two distinct schema documents hash alike`. |
| `loom/runtime/active-set-restore-failed` | E | runtime | `failed to restore tool active-set after /<name>: <error>`. |
| `loom/runtime/cancelled-by-session-shutdown` | E | runtime | `loom /<name> cancelled by session shutdown (<reason>)`. |
| `loom/runtime/reload-teardown-timeout` | E | runtime | `reload teardown timed out after <ms>ms; <N> invocation(s) still in flight: <list>`. |
| `loom/runtime/custom-type-unsafe` | E | runtime | `custom-message type is not transcript-safe: '<value>'`. |
| `loom/runtime/subagent-model-unresolved` | E | runtime | `subagent invocation has no resolved model: frontmatter 'model:' is absent and the inherited session model is undefined` |

Division by zero, modulo by zero, integer overflow, and explicit author-driven
panics are deliberately not in the panic catalogue.

## `loom/host/*`

Emitted via `console.error` (typical observation site is the `session_shutdown`
teardown handler, where the persistent channel may already be invalidated).

| Code | Sev | Phase | Message |
|---|---|---|---|
| `loom/host/session-shutdown-reason-unknown` | W | runtime | `session_shutdown event.reason outside closed set: <observed>`. |
| `loom/host/session-shutdown-pinned-constant-unreadable` | W | runtime | `session_shutdown pinned-constant read failed: <failure>`. |
| `loom/host/session-swap-instance-survived` | E | runtime | `extension instance survived a session-only session_shutdown (reason: <reason>); Pi lifecycle contract violated — terminating`. |
| `loom/host/session-shutdown-teardown-step-failed` | W | runtime | `session_shutdown teardown step <step> failed at <call>: <error>`. |

## `masked` field (hard-ceiling co-fire)

Each entry is one of `"ceiling#1"`, `"ceiling#2"`, `"ceiling#3"`, `"ceiling#4"`;
the field is omitted when no co-fire occurred (never `masked: []`). Wire location:
`details.masked` for diagnostic surfaces, `details.event.masked` for runtime-event
surfaces. In loom 1.0 `masked` is never populated on a diagnostic-shape surface;
the only non-empty enumeration reachable is `["ceiling#2"]` on the runtime-event
channel (see [Hard ceilings](./hard-ceilings.md)).

## Provenance

- `loom/parse/*` table (Code/Sev/Phase/Message transcribed verbatim):
  `docs/spec_topics/diagnostics/code-registry-parse.md`.
- `loom/load/*` table: `docs/spec_topics/diagnostics/code-registry-load.md`.
- `loom/runtime/*` table: `docs/spec_topics/diagnostics/code-registry-runtime.md`.
- `loom/host/*` table: `docs/spec_topics/diagnostics/code-registry-host.md`.
- Diagnostic shape, located-site classification, serialised content format,
  DIAG-1…DIAG-4, `loom/typecheck/*` out-of-scope note:
  `docs/spec_topics/diagnostics/diagnostic-shape.md`.
- Diagnostics hub / delivery channels: `docs/spec_topics/diagnostics.md`.
- `masked` field closed set and wire-location split:
  `docs/spec_topics/hard-ceilings/ceilings-3-and-4.md#masked-field`.
- Implementation confirmation: panic codes in `src/runtime/runtime-panics.ts`
  (`INDEX_OUT_OF_BOUNDS_CODE`, `MISSING_OBJECT_KEY_CODE`, `NULL_INDEX_ACCESS_CODE`,
  `NULL_MEMBER_ACCESS_CODE`, `INVOKE_DEPTH_EXCEEDED_CODE`) match the registry;
  `INVOKE_DEPTH_CAP = 32` (`src/runtime/runtime-panics.ts:51`), template
  `invoke chain depth exceeded: <depth> > 32`.
