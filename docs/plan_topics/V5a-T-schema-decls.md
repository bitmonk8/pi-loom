# `V5a-T` — Schema declarations (object / alias / enum) (tests)

**Spec.** [`../spec_topics/schemas.md`](../spec_topics/schemas.md), [`../spec_topics/type-system.md`](../spec_topics/type-system.md).

**Adds.** Failing tests for the paired `V5a` implementation leaf.

**Tests.**
- `loom/parse/empty-schema-body`, `loom/parse/empty-enum-body`: empty bodies fire.
- `loom/parse/wire-name-collision`, `loom/parse/redundant-wire-name` (W): wire-rename violations fire.
- `loom/parse/inline-enum`, `loom/parse/non-string-enum-value`, `loom/parse/duplicate-enum-value`, `loom/parse/duplicate-enum-variant-name`, `loom/parse/unknown-variant`: enum violations fire. Per `schemas.md` §Enum declarations the name-duplication check runs before the value-duplication check, so a distinct-explicit-value name collision (`enum X { Low = "a", Low = "b" }`) fires `duplicate-enum-variant-name`, while `duplicate-enum-value` is reserved for distinct names sharing one explicit value (`enum X { Low = "x", High = "x" }`).

**Deps.** `V2a`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
