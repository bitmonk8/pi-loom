# `V11d-T` — System-prompt builder, defaulting, and echo (tests)

**Spec.** [`../spec_topics/binder/binder-model-and-context.md`](../spec_topics/binder/binder-model-and-context.md), [`../spec_topics/binder/binder-bypass-and-envelope.md`](../spec_topics/binder/binder-bypass-and-envelope.md), [`../spec_topics/binder/defaulting-system-note-echo.md`](../spec_topics/binder/defaulting-system-note-echo.md).

**Adds.** Failing tests for the paired `V11d` implementation leaf.

**Tests.**
- System-prompt structure ([`binder-bypass-and-envelope.md#system-prompt-structure-normative`](../spec_topics/binder/binder-bypass-and-envelope.md#system-prompt-structure-normative)): the builder reproduces all eight structured items (1–8) exactly, including the trigger-present **and** trigger-absent assertions for conditional items 2 (Description line), 3 (Argument-hint line), 4 (Parameters block / per-field line), and 6 (Session-context block); the *Type display* reference renderings (declared-Loom-type → rendered-string table); the *Default-literal rendering* forms (`default=Severity.High`, `default="hello"`, `default=[1, 2, 3]`, `default=[]`); and the four *Parameter-line reference renderings*, including the description-omitted form (`  language (string) required`, with no trailing space or em-dash).
- `BNDR-6`: the echo reference renderings (6a–6x) reproduce exactly, composing the canonical number renderer from `V2d` for the numeric rows.
- Fill-then-revalidate ([`defaulting-system-note-echo.md#post-default-merge-ajv-validation`](../spec_topics/binder/defaulting-system-note-echo.md#post-default-merge-ajv-validation)): absent wire names take their declared defaults, then `SchemaValidator.validate()` re-validates the merged `args`.
- Echo annotation ([`defaulting-system-note-echo.md#echo-policy`](../spec_topics/binder/defaulting-system-note-echo.md#echo-policy)): `(default)` is rendered only for a field that took its declared default; a binder-supplied value for a defaulted field is rendered untagged.

**Deps.** `V11a`, `V2a`, `V2d`, `V5d`, `V8a`

**Ships when.** The tests above — including the binder system-prompt-structure assertions (eight items, conditional presence, Type-display, Default-literal, and Parameter-line reference renderings) — exist, compile, and fail red for the intended reason.
