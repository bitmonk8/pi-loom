# V16 — Slash-command argument binder (LLM path)

## V16a — Param defaults

- **Spec.** [Parameters and Frontmatter](../spec_topics/frontmatter.md) (defaults), [Grammar Appendix — Loom literal sublanguage](../spec_topics/grammar.md#loom-literal-sublanguage).
- **Adds.** `field: type = literal` defaults. The RHS is parsed by the Loom literal sublanguage — primitive literals (including unary-`-` on numeric literals), `null`, array literals, bare-key object literals against the LHS schema, `Enum.Variant` access, and variant-schema construction (`Cat { ... }`). The is-literal check runs at parse time against the Loom AST; failures emit `loom/parse/default-not-literal` naming the offending sub-expression. No operators, function calls, identifier references other than `Enum.Variant`, `${...}` interpolation, or `@`...`` templates.
- **Tests.** Each admitted literal shape parses and lowers (string, number, negative number, boolean, `null`, array, bare-key object, `Enum.Variant`, variant-schema constructor). Object-literal field order is free; missing required field is `loom/parse/missing-object-field`; extra field is `loom/parse/extra-object-field`. Discriminated-union variant default written as `Cat { name: "x" }` produces a value with the correct discriminator (no `species:` written by the author). `Enum.Variant` default arrives at the loom body with the runtime enum brand attached — cross-enum equality (`Severity.High` default equals body-constructed `Severity.High`; not equal to `OtherEnum.High`). Each forbidden form (operator, function call, `let`-bound identifier reference, `${...}`, `@`...``) emits `loom/parse/default-not-literal` and the message names the offending sub-expression. Defaults apply only when the slash arg omits the corresponding positional argument.
- **Deps.** V3b, V10a (enum), V11a (discriminated unions).
- **Ships when.** Defaults declarable in Loom literal syntax with full enum and union support.

## V16b — Default merging after binder

- **Spec.** [Slash-Command Argument Binding](../spec_topics/binder.md) (defaulting).
- **Adds.** After binder returns `ok`, runtime fills defaults for any field omitted from `args`, *then* AJV validates merged result.
- **Tests.** Omitted defaulted field filled; binder-provided value overrides default; AJV runs against merged shape.
- **Deps.** V16a.
- **Ships when.** Default-merge order correct.

## V16c — Binder envelope schema construction

- **Spec.** [Slash-Command Argument Binding](../spec_topics/binder.md) (binder envelope).
- **Adds.** Per-loom dynamic envelope schema with three `anyOf` arms (`ok`, `needs_info`, `ambiguous`); built once at load and reused.
- **Tests.** Envelope shape matches spec verbatim; reused across invocations (cache hit); per-loom uniqueness.
- **Deps.** V11a (discriminated unions), V3b.
- **Ships when.** Envelope schema constructable.

## V16d — Defaulted-fields-relaxed in envelope's `args` arm

- **Spec.** [Slash-Command Argument Binding](../spec_topics/binder.md) (binder envelope).
- **Adds.** In the `ok` arm, copy of params schema with each defaulted field removed from `required` (type unchanged).
- **Tests.** Required-without-default fields stay required; defaulted fields removed from `required`; types preserved.
- **Deps.** V16c, V16a.
- **Ships when.** Binder isn't asked to invent defaults.

## V16e — `bind_model` resolution chain

- **Spec.** [Slash-Command Argument Binding](../spec_topics/binder.md) (binder model).
- **Adds.** Frontmatter `bind_model:` → `settings.json` `looms.binderModel` (read via the V14n mechanism) → built-in default (cheap tier-2 model identifier).
- **Tests.** Each resolution step; missing all → built-in default.
- **Deps.** V3a, V14n.
- **Ships when.** Binder model resolves predictably.

## V16f — `bind_context: none`

- **Spec.** [Slash-Command Argument Binding](../spec_topics/binder.md) (binder context).
- **Adds.** Default mode; binder sees only slash text + frontmatter.
- **Tests.** No session context attached; deterministic output for identical inputs (modulo provider non-determinism).
- **Deps.** V16c, V16e.
- **Ships when.** Default binder path works end-to-end.

## V16g — `bind_context: session` truncation

- **Spec.** [Slash-Command Argument Binding](../spec_topics/binder.md) (session-context truncation).
- **Adds.** Walk caller-session turns newest-to-oldest; accumulate until 20 turns or 8000 tokens (whichever smaller); whole-turn boundary.
- **Tests.** Exact 20-turn boundary; exact 8000-token boundary (token count via `estimateTokens` from `@mariozechner/pi-coding-agent`), including a turn whose inclusion would push the running sum over 8000 is excluded entirely; partial messages not split.
- **Deps.** V16f.
- **Ships when.** Session-context binder path works.

## V16h — Binder determinism settings

- **Spec.** [Slash-Command Argument Binding](../spec_topics/binder.md) (determinism).
- **Adds.** `temperature: 0` and fixed seed (where provider supports). Acknowledged near-deterministic, not guaranteed reproducible.
- **Tests.** Request payload includes `temperature: 0`; seed included for providers that support it.
- **Deps.** V16e.
- **Ships when.** Determinism budget minimised.

## V16i — `bind_echo` formatter

- **Spec.** [Slash-Command Argument Binding](../spec_topics/binder.md) (echo policy).
- **Adds.** One-line system note: fields in declaration order, comma-separated; quote strings only with whitespace/special chars; arrays truncated `[a, b, c, …+N more]` past 3; objects shown as `{first-field-value, …}`; defaulted tagged `(default)`; 120-char cap with `…`.
- **Tests.** Each formatting rule against spec's exact examples.
- **Deps.** V3b.
- **Ships when.** Echoes match spec format.

## V16j — `bind_echo: false` suppression

- **Spec.** [Slash-Command Argument Binding](../spec_topics/binder.md) (echo policy).
- **Adds.** Frontmatter flag suppresses echo.
- **Tests.** Set false → no echo emitted; set true (default) → echo emitted.
- **Deps.** V16i.
- **Ships when.** Echo opt-out works.

## V16k — `bind_echo` auto-suppression on bypass

- **Spec.** [Slash-Command Argument Binding](../spec_topics/binder.md) (echo policy + bypass).
- **Adds.** Both bypass cases (no-params and single-string) auto-suppress echo regardless of `bind_echo:`. `bind_echo: true` on a single-string-bypass loom is `loom/parse/bind-echo-on-bypass` (parse warning); `bind_echo: true` on a no-params loom is `loom/load/bind-echo-without-params` (load warning). The two warnings are distinct because the underlying state differs (the parser sees a typed single-string `params:` field for one, the load pass sees no `params:` at all for the other) but the runtime behaviour is identical: no echo.
- **Tests.** Single-string bypass + `bind_echo: true` → `loom/parse/bind-echo-on-bypass` warning + no echo; no-params + `bind_echo: true` → `loom/load/bind-echo-without-params` warning + no echo; either bypass + `bind_echo: false` → no warning, no echo; either bypass + `bind_echo` absent → no warning, no echo.
- **Deps.** V16i, V3c.
- **Ships when.** Both bypass cases have no spurious echoes and emit the correct distinguishing diagnostic when authors set `bind_echo: true`.

## V16l — `needs_info` envelope handling

- **Spec.** [Slash-Command Argument Binding](../spec_topics/binder.md) (failure modes).
- **Adds.** `kind: "needs_info"` envelope produces system note `loom /<name>: <message>` and loom does not run.
- **Tests.** Message reaches user; loom never starts; runtime returns from invocation cleanly.
- **Deps.** V16c.
- **Ships when.** Insufficient-info case handled.

## V16m — `ambiguous` envelope handling

- **Spec.** [Slash-Command Argument Binding](../spec_topics/binder.md) (failure modes).
- **Adds.** `kind: "ambiguous"` envelope produces system note with `candidates` enumeration; loom does not run.
- **Tests.** Message + candidates reach user; loom never starts.
- **Deps.** V16c.
- **Ships when.** Ambiguity case handled.

## V16n — Binder transport failure single retry

- **Spec.** [Slash-Command Argument Binding](../spec_topics/binder.md) (failure modes).
- **Adds.** Transport failure on binder gets exactly one retry; second failure surfaces as system note.
- **Tests.** Retry happens; second failure system-note text matches spec.
- **Deps.** V16e.
- **Ships when.** Transient failures don't fail-closed unnecessarily.

## V16o — Binder malformed envelope handling

- **Spec.** [Slash-Command Argument Binding](../spec_topics/binder.md) (failure modes).
- **Adds.** Malformed-envelope returns (JSON-parse failure or envelope-`anyOf` discriminator failure) get exactly one retry against the same envelope schema; the second failure surfaces as system note `loom /<name>: argument binding failed — could not parse arguments`.
- **Tests.** Malformed envelope retried once on JSON-parse or envelope-`anyOf` failure; final failure system-note text matches spec.
- **Deps.** V16c.
- **Ships when.** Malformed-envelope case handled.

## V16p — AJV validation of `args` post-default-merge

- **Spec.** [Slash-Command Argument Binding](../spec_topics/binder.md) (failure modes).
- **Adds.** AJV validates merged `args` (binder output + filled defaults) against full params schema; failure surfaces as system note `argument binding produced invalid args — <ajv-summary>`. No retry on AJV failure of merged `args`.
- **Tests.** Hallucinated field shape caught; AJV summary readable; no re-prompt issued on AJV failure.
- **Deps.** V16b.
- **Ships when.** Hallucinations caught at boundary.
