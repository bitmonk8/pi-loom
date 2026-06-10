# `V6a` — Frontmatter field contract

**Spec.** [`../spec_topics/frontmatter.md`](../spec_topics/frontmatter.md), [`../spec_topics/frontmatter/frontmatter-fields-a.md`](../spec_topics/frontmatter/frontmatter-fields-a.md), [`../spec_topics/frontmatter/frontmatter-fields-b-and-templates.md`](../spec_topics/frontmatter/frontmatter-fields-b-and-templates.md).

**Adds.** The frontmatter parser — parsing YAML via the `yaml` dependency declared in [`H1a`](./H1a-scaffold-and-toolchain.md)'s manifest per [`implementation-notes.md` §"Loom-package implementation dependencies (loom 1.0)"](../spec_topics/implementation-notes.md#loom-package-implementation-dependencies-loom-1-0) — with defaults, required `mode:`, model/`bind_*` resolution hooks, and unknown-key tolerance emitted as a warning (forward-compat seam). The `bind_*` hooks are seams closed downstream: `bind_model` resolution by [`V11a`](./V11a-binder-model-resolution.md)'s `loom/load/binder-model-unresolved`, `bind_context` by [`V11b`](./V11b-bind-context-transcript.md), and `bind_echo`/echo by [`V11d`](./V11d-defaulting-echo.md). The loom's own `model:` resolution hook closes its present-but-unresolvable load-time error in-leaf (see Tests); the hook calls an injected model-reference matcher, so the leaf carries no forward dependency on the downstream binder-model machinery.

**Tests.**
- A missing `mode:` fires `loom/load/missing-mode`; a valid `mode:` resolves.
- An unknown frontmatter key fires `loom/load/unknown-frontmatter-field` (severity `W`) and is tolerated.
- `loom/parse/timeout-field-rejected`: a per-call timeout field is rejected (NOCEIL-1 seam).
- `loom/load/model-unresolved`: a present `model:` value resolving to no available model (a non-string scalar, a malformed reference, a reference matching no available model, or a bare `modelId` ambiguous across providers) fails the load and the loom is not registered; the parser's model-resolution hook fires the code against the injected model-reference matcher ([frontmatter-fields-a.md `model` row](../spec_topics/frontmatter/frontmatter-fields-a.md)).

**Deps.** `V6a-T`, `V1a`, `V5a`

**Ships when.** `npm test` parses frontmatter, requires `mode:`, and tolerates unknown keys as warnings.
