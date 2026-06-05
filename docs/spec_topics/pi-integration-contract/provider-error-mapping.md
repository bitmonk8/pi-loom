# Provider error and seed-field mapping

<a id="provider-error-mapping"></a>

**Provider error mapping.** The runtime maps recognised provider error responses to `QueryError` variants per the table below. Every other 4xx/5xx response and every network-level failure maps to `TransportError`. The matching rules are version-coupled to `@earendil-works/pi-ai` and MUST be re-validated on each upgrade. *Re-validation gate (loom 1.0.0).* loom 1.0.0 ships without a CI-wired bump-procedure step that re-runs the provider-error fixtures against a candidate `@earendil-works/pi-ai` minor; the fixtures exist in `npm test` and a contributor performing the bump is expected to run them, but [Pi version bump procedure](./version-bump-intro.md#pi-version-bump-procedure) below does not yet enumerate the step. Wiring this re-validation into the bump procedure as a mechanical gate is a recognised post-loom 1.0.0 maintenance follow-up. Reviews SHOULD NOT re-raise the absence of this acceptance criterion as a loom 1.0.0 correctness finding.

<a id="provider-overflow-wording-presupposition"></a>*Provider-owned-wording presupposition.* The overflow signatures in the table below match against **provider-owned** HTTP error-body text (`error.message`, `error.type`, `error.code`, and the `ValidationException` body). That text is not part of `@earendil-works/pi-ai`'s typed surface and is not gated by pi-ai's package version: a provider can reword an overflow message — or move it to a different field — with no `@earendil-works/pi-ai` version change, so neither the SDK surface-inventory test nor the pi-ai version pin can detect the drift, and a silent rewording downgrades a real context-overflow from `ContextOverflowError` to `TransportError` with `tokens_used` / `tokens_limit` null. Detection therefore routes to editorial review: the provider-error fixtures (run under `npm test` per the *Re-validation gate* above) SHOULD be re-run on each Pi minor bump and whenever a provider publishes an error-format or API-version change, per item (i) of the *Editorial-review checklist for unpinned host presuppositions* under [Pi version bump procedure](./version-bump-intro.md#pi-version-bump-procedure) below. Wiring this fixture re-run into the bump procedure as a mechanical CI gate remains the post-loom 1.0.0 maintenance follow-up already noted under the *Re-validation gate* above.

<a id="transport-error-retryable"></a>

**`TransportError.retryable` population.** The runtime populates `TransportError.retryable` by transport-error class at the point it constructs the variant: `true` for network-level failures (no HTTP response — TCP/TLS errors, provider-SDK timeouts, end-of-stream truncation), HTTP 5xx, and HTTP 429; `false` for every other (non-429) 4xx. The unsupported-provider typed-query case described under **Provider compatibility for typed queries** above is the one path that pins `retryable: false` independent of HTTP class (the failure is a load-time capability gap, not a provider response); that pinned value is unchanged by this rule.

| Provider | Overflow signature → `ContextOverflowError` |
|---|---|
| `anthropic-messages` | HTTP 400 with `error.type: "invalid_request_error"` and `error.message` matching `/(prompt is too long\|exceeds .* context window\|maximum context length)/i`; `tokens_used` and `tokens_limit` extracted from `error.message` per *Overflow token-count extraction* below. |
| `openai-completions` | HTTP 400 with `error.code: "context_length_exceeded"` (or HTTP 200 with the same code in the body envelope); `tokens_used` and `tokens_limit` extracted from `error.message` per *Overflow token-count extraction* below. |
| `mistral` | HTTP 400 with body matching `/context.*length/i`; token counts not surfaced — both fields `null`. |
| `amazon-bedrock` | `ValidationException` with body matching `/(input is too long\|context window)/i`; token counts not surfaced — both fields `null`. |

<a id="overflow-token-extraction"></a>

*Overflow token-count extraction.* For the `anthropic-messages` and `openai-completions` rows above, `tokens_used` and `tokens_limit` are derived from `error.message` by a single deterministic rule, so two conforming implementations produce identical values on the same payload. Scan the message for *numeric runs*, where a numeric run is a maximal substring of decimal digits that may contain `,` or `_` digit-group separators (the separators are stripped before the run is parsed as a base-10 integer):

- When the scan yields **exactly two** numeric runs, the larger integer populates `tokens_used` and the smaller populates `tokens_limit` (a context-overflow response has `tokens_used ≥ tokens_limit` by construction; when the two runs are equal, both fields take that value).
- For **any other count** — zero, one, or three or more numeric runs — both `tokens_used` and `tokens_limit` are `null`.

The `null` fallback is the same value the `mistral` and `amazon-bedrock` rows fix unconditionally. This rule constrains loom's extraction only, not the provider's message text; a provider rewording that changes the numeric-run count silently moves the affected response into the `null` fallback, which the *Provider-owned-wording presupposition* above already routes to editorial review.

<a id="provider-seed-field-mapping"></a>

**Provider seed-field mapping.** Whether a binder request payload carries a fixed seed, and under which JSON field name, is governed by the static table below. The mapping is keyed on the resolved binder model's `api` field as reported by `@earendil-works/pi-ai`'s model registry; it is not derived from any pi-ai capability flag. The seed *value* (its derivation from the loom's qualified name) is specified in [Slash-Command Argument Binding — Determinism](../binder/determinism-cancellation-failure.md#determinism). Widening the seed-supporting set is a spec-versioned change. The mapping is version-coupled to `@earendil-works/pi-ai` and MUST be re-validated on each upgrade; the mechanical gate is the build-time `Api`-coverage assertion which enumerates pi-ai's exposed `Api` literal-union values and asserts every value appears as a row key in the seed-field table constant, plus the provider seed-field fixtures rerun as step 6 of [Pi version bump procedure](./version-bump-intro.md#pi-version-bump-procedure) below. A new pi-ai `Api` value lights up the assertion red at the bump commit, exactly parallel to a new SDK capability.

| Provider | Seed field in request payload |
|---|---|
| `openai-completions` | `seed` |
| `mistral` | `random_seed` |
| `anthropic-messages` | omitted |
| `amazon-bedrock` | omitted |

<!-- "Conversation drive — subagent mode" (the `createAgentSession` spawn block, its four governing rules, and the `subagent-spawn-satellite-types` pins) was relocated to its owning page, [Subagent](./subagent.md), so this page's H1 covers only the provider error mapping and provider seed-field mapping that remain. -->
