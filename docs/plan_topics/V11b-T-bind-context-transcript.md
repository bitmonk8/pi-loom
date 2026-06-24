# `V11b-T` — Bind context and transcript renderer (tests)

**Spec.** [`../spec_topics/binder/binder-model-and-context.md`](../spec_topics/binder/binder-model-and-context.md), [`../spec_topics/binder/binder-bypass-and-envelope.md`](../spec_topics/binder/binder-bypass-and-envelope.md), [`../spec_topics/binder/determinism-cancellation-failure.md`](../spec_topics/binder/determinism-cancellation-failure.md).

**Adds.** Failing tests for the paired `V11b` implementation leaf.

**Tests.**
- `BNDR-7`: the compact-transcript renderings (7a–7i) reproduce byte-exact, including the void-truncation whole-block omission (7i).
- `BNDR-8`: the assistant body emits the `[assistant]:` line first, then `[tool-call …]` in array order, with args JSON keys in ascending Unicode and array order verbatim.
- `BNDR-9`: a non-transcript-safe `customType` (containing any of `\n`, `\r`, `]`, or the two-byte sequence `: ` (U+003A U+0020)) fires `loom/runtime/custom-type-unsafe`; the binder rejects the message and **fails the affected slash/prompt invocation** — argument binding does not proceed and the loom does not run — and the user-facing system note renders verbatim from the custom-type-unsafe-cause row of [determinism-cancellation-failure.md — *Failure-mode templates (normative)*](../spec_topics/binder/determinism-cancellation-failure.md#failure-mode-templates-normative). The failing test asserts all three (diagnostic fires, invocation fails, note matches the row), not the diagnostic alone.
- `loom/parse/bind-context-session-on-subagent`: fires for `bind_context: session` on a `mode: subagent` loom.

**Deps.** `V11a`, `V9i`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
