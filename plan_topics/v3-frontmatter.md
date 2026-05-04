# V3 — Frontmatter and `params` (excluding binder)

## V3a — Frontmatter parsing

- **Spec.** [Parameters and Frontmatter](../spec_topics/frontmatter.md).
- **Adds.** Real YAML frontmatter; recognised fields: `description`, `argument-hint`, `mode`, `model`, `tools`, `system`, `bind_model`, `bind_context`, `bind_echo`, `retry`, `params`. Unknown fields produce `loom/load/unknown-frontmatter-field` warning. Loom-specific fields other than `mode` and `description`/`argument-hint`/`params` are recognised but ignored with a "not yet implemented in this leaf" warning until their implementing leaf lands.
- **Tests.** YAML parse errors point at correct column; unknown field warning shape; `mode: subagent` is the documented "not implemented yet" parse error referencing V12a; `params` field type-grammar fragment recognised (primitive types only here; array/named types in V3b).
- **Deps.** V2.
- **Ships when.** Frontmatter parses; later leaves can attach semantics non-breakingly.

## V3b — `params` typed declaration

- **Spec.** [Parameters and Frontmatter](../spec_topics/frontmatter.md) (params).
- **Adds.** `params:` with primitive types, `array<T>` over primitives, and `T | null`. Named-schema references parse but resolution defers to V4. Defaults defer to V16a.
- **Tests.** Each primitive type binds; `array<string>` binds; `T | null` binds; named-schema reference parses but errors with "schema not yet declarable" until V4b.
- **Deps.** V3a.
- **Ships when.** Loom body can read `${param}` of primitive type (interpolation arrives in V5b).

## V3c — Bypass binder for single-string param

- **Spec.** [Slash-Command Argument Binding](../spec_topics/binder.md) (binder bypass).
- **Adds.** Detect at load time: exactly one `params:` field, type `string`, no default. The runtime sets that param to the trimmed slash text and skips the binder. AJV runs as safety net.
- **Tests.** Bypass detection is purely static (decided at load); slash text trimmed; multiple-params, non-string, or default-having shapes do not bypass; AJV still runs.
- **Deps.** V3b.
- **Ships when.** A single-string-param loom can be invoked with arbitrary slash text without an LLM binder.
