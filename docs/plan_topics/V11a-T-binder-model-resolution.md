# `V11a-T` — Binder-model resolution and strict-capability probe (tests)

**Spec.** [`../spec_topics/binder/binder-model-and-context.md`](../spec_topics/binder/binder-model-and-context.md), [`../spec_topics/binder.md`](../spec_topics/binder.md).

**Adds.** Failing tests for the paired `V11a` implementation leaf.

**Tests.**
- `loom/load/binder-model-unresolved` fires when no model reference matches — exercising both a bare `modelId` matched against `Model<Api>.id` and a `provider/modelId` reference matched against `Model<Api>.provider` (the short provider-id form, not the api-shaped `Model<Api>.api`) plus `Model<Api>.id` (worked example `bind_model: anthropic/claude-haiku`, per [binder-model-parse-rule](../spec_topics/binder/binder-model-and-context.md#binder-model-parse-rule)).
- The `strictCapable` probe: `false` → `loom/load/binder-model-not-strict-capable` (E); `undefined` → `loom/load/binder-model-strict-capability-unknown` (W); `true` → resolves.
- The binder-model two-step chain ([binder-model](../spec_topics/binder/binder-model-and-context.md#binder-model)) falls back to `looms.binderModel`: with merged settings `looms.binderModel` set and a non-bypass loom whose frontmatter `bind_model:` is omitted, the merged `binderModel` value resolves the binder model (no `loom/load/binder-model-unresolved`) — asserting the value reaches the binder from `V10c`'s merged settings, not a hardcoded model.
- [binder-model-and-context.md — hot-reload recovery note](../spec_topics/binder/binder-model-and-context.md#binder-model-hot-reload) (BNDR area; informational `loom-system-note`, no `loom/load/*` code): a hot reload that recovers a previously-unresolved model emits the recovery note.
- single-matcher cross-resolution reconciliation ([`host-interfaces-core.md` model-registry surface](../spec_topics/pi-integration-contract/host-interfaces-core.md#model-registry-pin)): the matcher instance `V9b` constructs and injects at the load pass is the same instance servicing both `V6a`'s `loom/load/model-unresolved` resolution and this leaf's binder-model resolution — observed by single-source-of-construction (instance identity), not equivalence-of-outcome against a shared fake.

**Deps.** `V9b`, `V10c`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
