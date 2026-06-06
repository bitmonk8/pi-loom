# pi-loom — Consolidated Spec Review (Parked)

_Parked findings: 2._

---

## T055 - Item (i) leaves the loom-side overflow-signature regex update unspecified, and the SHOULD-item fail disposition is asymmetric across items (f)–(ad)

> **PARKED** — 2026-06-06T15:58:14Z
> **Reason:** Category 1 (malformed finding — default attribution for top-level fixer refusals; the fixer's pre-flight typically catches stale preconditions, missing destination subsections, or do-not-touch conflicts — may also be category 2 if the refusal reason is capacity-shaped, see FixerNotes). Parked as part of MULTI cluster T055 - Item (i) leaves the loom-side overflow-signature regex update unspecified, and the SHOULD-item fail disposition is asymmetric across items (f)–(ad); T115 - Provider-error-mapping table: row-selection key, Bedrock `ValidationException` discriminator, and HTTP-200 envelope discriminator unpinned (rec F). The fast loop (/spec-fix-findings-loop) could not resolve the cluster. Refusal reason: picker-cluster-violation — dispatched MULTI cluster {T055, T115} omits T115's live co-resolve sibling T084; fixer refused to land partial cluster (co-resolve is a hard bundle). Cluster discarded this cycle; fresh re-review will re-cluster.
> **Forensic report:** none (fast loop — no forensic report)

# T055 - Item (i) leaves the loom-side overflow-signature regex update unspecified, and the SHOULD-item fail disposition is asymmetric across items (f)–(ad)

**Original heading:** Provider overflow-signature fixture red has no defined loom-side signature-update resolution; falsification disposition inconsistent across SHOULD items
**Original section:** docs/spec_topics/pi-integration-contract/ (diagnostic-emission, patch-skew, provider-error, unknown-reason, subagent, version-bump-intro/triggers/step2/step2b)
**Kind:** error-model
**Importance:** medium
**Score:** 25
**Must-fix:** false

## Finding

The step-2 editorial-review checklist in `version-bump-step2.md` carries two distinct defects in its SHOULD-level items (f) through (ad).

**(A) Item (i) — provider-overflow signature.** Item (i) requires the contributor to re-run the provider-error fixtures and, separately, to keep the test corpus current by "re-capturing each provider's error-body text when it publishes an error-format or API-version change." It is silent on the third edit a real provider rewording demands: updating the *loom-side overflow signature regex* in the Provider-error-mapping table on `provider-error-mapping.md` (the four regexes such as `/(prompt is too long|exceeds .* context window|maximum context length)/i`). When the corpus is refreshed to the new wording but the loom-side regex is left untouched, the fixture stays red — or worse, ships green against a stale corpus and production silently downgrades real `ContextOverflowError`s to `TransportError` with `tokens_used`/`tokens_limit` null, exactly the failure mode `provider-overflow-wording-presupposition` warns about. The cited presupposition paragraph names the symptom but routes resolution to item (i), which then does not author it.

**(B) Items (f)–(ad) — fail-disposition asymmetry.** Five of the twenty-five SHOULD items (g, j, q, v, ad) carry an explicit fail-disposition sentence of the form *"If falsified, surface the divergence on the bump commit so [the cited paragraph] can be amended in the same edit; PIC does not author the loom-side recovery here."* The other twenty items (f, h, i, k, l, m, n, o, p, r, s, t, u, w, x, y, z, aa, ab, ac) describe only the silent-failure consequence (*"would surface as a runtime `TypeError` at the subagent spawn site…"*, *"would silently invert the predicates…"*) and then jump straight to the SHOULD-to-build-time-pin escalation boilerplate, leaving unspecified what the auditor records on a fail, whether a same-edit spec amendment is required, and whether loom-side recovery is in scope for the bump. Two conforming contributors auditing the same SDK regression on, say, item (n) will reasonably disagree on whether to record `fail`, on whether to amend `agentsession-interface` in the same commit, and on whether they owe a runtime workaround.

## Spec Documents

- `docs/spec_topics/pi-integration-contract/version-bump-step2.md` — Editorial-review checklist, items (f)–(ad) and the introductory preamble (edited)
- `docs/spec_topics/pi-integration-contract/provider-error-mapping.md` — *Provider error mapping* table and the *Provider-owned-wording presupposition* paragraph (read-only)

## Plan Impact

**Phases:** N/A

**Leaves (implementation order):** N/A

(The project plan exists at `docs/plan.md` but its Horizontal, MVP, and Vertical sections all read *"No leaves yet — author per the template"*; there are no leaf pages under `docs/plan_topics/` other than the template and conventions files. Nothing to update.)

## Consequence

**Severity:** correctness

For (A), a contributor who follows item (i) literally — re-runs the fixtures, re-captures the corpus — and stops there will ship a bump in which the loom-side regex no longer matches the provider's reworded overflow body, silently misclassifying real `ContextOverflowError`s as `TransportError` with null token fields. For (B), the asymmetry causes per-item-divergent auditor behaviour on twenty of twenty-five SHOULD items: the recorded outcome shape, the same-edit spec-amendment obligation, and the scope of loom-side recovery are all reader-inferred rather than pinned.

## Solution Space

**Shape:** single
**State:** reduced

Two independent obligations. Land the bounded item-(i) edit first so the checklist already speaks a consistent post-fail vocabulary when the disposition sweep lands.

1. **Add the overflow-signature-update obligation to item (i).** In `docs/spec_topics/pi-integration-contract/version-bump-step2.md` item (i), after the "responsibility of the contributor performing the bump" sentence, append: *"A fixture red whose root cause is that the re-captured provider body no longer matches the loom-side overflow signature in the Provider-error-mapping table on `provider-error-mapping.md` is resolved by updating that row's overflow-signature regex in the same edit as the corpus re-capture; the regex MUST end the bump matching the re-captured body."* Optionally cross-link from the *Provider-owned-wording presupposition* paragraph in `provider-error-mapping.md` to this sentence (anchor on item (i)'s existing `bump-checklist-provider-overflow-wording` id). This closes the production silent-misclassification gap.

2. **Hoist one fail-disposition clause into the checklist preamble.** In the same file's step-2 preamble, after the existing "MUST record the per-item audit outcome … in the bump commit message" sentence, add: *"On a `fail` outcome for any of items (f) through (ad), the contributor MUST (1) record the divergence in the bump commit message under the failing item, (2) amend the cited presupposition paragraph in the same edit so the spec no longer asserts the falsified property, and (3) treat loom-side recovery as out of scope for this bump unless the failing item's body says otherwise — PIC does not author the loom-side recovery here. Item (e) is the sole exception: its fail outcome is resolved per the item-(e) recovery mutex prescribed in its body."* Then delete the per-item *"If falsified, surface the divergence on the bump commit so [X] can be amended in the same edit; PIC does not author the loom-side recovery here"* sentence from items (g), (j), (q), (v), and (ad). Leave item (i)'s prose untouched (edit 1 covers its item-specific recovery). This replaces twenty-five reader-inferences with one normative sentence and removes the per-item duplication.

### Edge cases

- For edit 1, the regex update lives in `provider-error-mapping.md` but the obligation lives in `version-bump-step2.md`; the same-edit constraint is what makes the pair safe, so do not split the regex update into a follow-up commit.
- For edit 2, the deletion sweep must touch exactly items (g), (j), (q), (v), (ad) and no others. Item (e)'s longer fail-recovery prose stays (it authors a real loom-side recovery — the per-extension-instance serialisation mutex — which is why the preamble names it as the sole exception). Items (i)/(u)/(aa)/(ab) carry re-run-fixture prose that is not a fail-disposition and must not be touched.
- After edit 1, item (i)'s signature-update edit is an in-bump action distinct from "loom-side recovery", so it needs no carve-out in the preamble; the *"unless the failing item's body says otherwise"* clause already accommodates any future SHOULD item that authors its own loom-side recovery.

## Relationships

- T114 "pi-ai provider-error surface (status, body, network-failure delivery) is undefined" - same-cluster (same `provider-error-mapping.md` page, independent defect)

---

## T115 - Provider-error-mapping table: row-selection key, Bedrock `ValidationException` discriminator, and HTTP-200 envelope discriminator unpinned

> **PARKED** — 2026-06-06T15:58:14Z
> **Reason:** Category 1 (malformed finding — default attribution for top-level fixer refusals; the fixer's pre-flight typically catches stale preconditions, missing destination subsections, or do-not-touch conflicts — may also be category 2 if the refusal reason is capacity-shaped, see FixerNotes). Parked as part of MULTI cluster T055 - Item (i) leaves the loom-side overflow-signature regex update unspecified, and the SHOULD-item fail disposition is asymmetric across items (f)–(ad); T115 - Provider-error-mapping table: row-selection key, Bedrock `ValidationException` discriminator, and HTTP-200 envelope discriminator unpinned (rec F). The fast loop (/spec-fix-findings-loop) could not resolve the cluster. Refusal reason: picker-cluster-violation — dispatched MULTI cluster {T055, T115} omits T115's live co-resolve sibling T084; fixer refused to land partial cluster (co-resolve is a hard bundle). Cluster discarded this cycle; fresh re-review will re-cluster.
> **Forensic report:** none (fast loop — no forensic report)

# T115 - Provider-error-mapping table: row-selection key, Bedrock `ValidationException` discriminator, and HTTP-200 envelope discriminator unpinned

**Original heading:** Error-table row-selection key, Bedrock `ValidationException` discriminator, and HTTP-200 error-envelope discriminator unpinned
**Original section:** docs/spec_topics/pi-integration-contract/ (audit-resolution, conversation-drive, runtime-event-channel, session-shutdown-semantics, session-only-degraded-state, drain-state-contract)
**Kind:** implementability (shard-13)
**Importance:** high
**Score:** 100
**Must-fix:** false

## Finding

The **Provider error mapping** table in `provider-error-mapping.md` is the runtime's classifier for turning provider responses into `ContextOverflowError` / `TransportError`. Three pieces of the classifier's matching machinery are missing, each independently sufficient to produce divergence between two conforming implementations.

1. **Row-selection key is absent.** The table has four rows (`anthropic-messages`, `openai-completions`, `mistral`, `amazon-bedrock`) but never says how the runtime chooses which row applies to a given response. The sibling **Provider seed-field mapping** in the same file (line 31) is explicit — it is "keyed on the resolved binder model's `api` field as reported by `@earendil-works/pi-ai`'s model registry." The error-mapping table inherits no such pin. An implementer could (a) gate matching by the resolved model's `api` field — the model-registry-driven approach the seed table uses — or (b) try every row's signature against every response and accept the first match. The two strategies diverge whenever a non-openai 4xx body happens to contain `context_length_exceeded`, when an anthropic-shaped error body arrives from a non-anthropic gateway, etc.

2. **Bedrock `ValidationException` discriminator is unpinned.** Every other row pins an HTTP status (`HTTP 400`) and either a typed field (`error.type`, `error.code`) or a body regex. The bedrock row says only "`ValidationException` with body matching …". `ValidationException` is an AWS exception *class name*, not a JSON body field; the row pins neither an HTTP status nor the field/mechanism by which loom recognises it (thrown SDK class? AWS `__type` JSON field? an `errorCode` header? something pi-ai surfaces?). Two implementers cannot agree on what to match.

3. **HTTP-200 body-envelope error discriminator is openai-only.** Both the catch-all paragraph (line 5) and `TransportError.retryable` (line 11) classify "an HTTP-200 response carrying a non-overflow body-envelope error" as `TransportError`. But the only definition of what makes a 200 body an "error envelope" is the openai-completions row's `error.code: "context_length_exceeded"`. For mistral / anthropic / bedrock 200 responses there is no rule for deciding that a 200 body is an error at all — so the catch-all has no domain on those providers, and the seemingly-symmetric rule reduces in practice to "openai only."

Detection of (1) and (3) is silent: a non-openai HTTP-200 body-envelope error falls through to "ok response" and is mis-classified as a successful provider turn; a Bedrock context-overflow misread under (2) falls through to `TransportError` with `tokens_used`/`tokens_limit` null, exactly the failure mode the *Provider-owned-wording presupposition* is meant to surface to editorial review.

## Spec Documents

- `docs/spec_topics/pi-integration-contract/provider-error-mapping.md` — **Provider error mapping** table, catch-all paragraph, *Provider-owned-wording presupposition*, **`TransportError.retryable` population** (edited)
- `docs/spec_topics/pi-integration-contract/host-interfaces-core.md` — `#model-registry-pin` (read-only; supplies the `Model<Api>.api` anchor reused by the row-selection key)
- `docs/spec_topics/errors-and-results/queryerror-variants.md` — `provider` derivation paragraph that already pins `Model<Api>.api` as the `Api`-shaped key the error-mapping table is "keyed on" (read-only; the prose currently asserts a key the table does not name)
- `docs/spec_topics/binder/determinism-cancellation-failure.md` — *Failure-class taxonomy* (read-only; restates the catch-all and inherits any new HTTP-200 discriminator wording)
- `docs/spec_topics/pi-integration-contract/version-bump-step2.md` — checklist item (i), *Provider overflow-signature wording* (read-only)

## Plan Impact

**Phases:** N/A

**Leaves (implementation order):** N/A

(Project has a plan scaffold but no leaves authored.)

## Consequence

**Severity:** correctness

Two reasonable implementers will diverge on at least one of three axes — which row applies to a given response, whether a bedrock context-overflow is recognised at all, and whether a non-openai 200-body error is classified as `TransportError` or silently treated as success. Each divergence produces a different `QueryError` variant for the same provider response, which in turn changes whether the binder consumes a transport-class retry budget, whether `tokens_used`/`tokens_limit` are populated, and whether the failure even surfaces to the operator.

## Solution Space

**Shape:** single
**State:** reduced

Resolve three independent obligations against `provider-error-mapping.md` as three separate edits (ideally separate fix-loop iterations), in order, so each lands on a settled foundation and the review pass critiques each obligation in isolation.

### Step 1 — Pin the row-selection key
Add a single sentence to the **Provider error mapping** paragraph (line 5) stating that the table is keyed on the resolved model's `api` field as reported by `@earendil-works/pi-ai`'s model registry, exactly as the **Provider seed-field mapping** paragraph already states for itself (line 31), with the same `Model<Api>.api` cross-link to `host-interfaces-core.md#model-registry-pin`. A response from a provider whose `api` value matches no row maps to `TransportError` via the catch-all unconditionally (no cross-provider signature matching). This is the foundational scoping rule — it determines the domain over which the next two steps operate.

Spec edit: one sentence in the line-5 paragraph; a cross-link to `host-interfaces-core.md#model-registry-pin`; an inline `Api`-shaped key note matching the wording at `queryerror-variants.md` line 108 for `provider` derivation.

### Step 2 — Pin the Bedrock `ValidationException` discriminator
Replace the bedrock row's "ValidationException with body matching …" shorthand with a fully-specified discriminator: name the AWS-side JSON field (`__type` containing `"ValidationException"`, or whichever field pi-ai's bedrock adapter surfaces) plus the HTTP status (AWS Bedrock returns `400`), parallel to the anthropic/openai/mistral rows, keeping the body regex unchanged. If pi-ai presents bedrock errors as a typed exception class rather than a body field, cite the pi-ai-side declaration site (path + member) for that class, per the convention the sibling "pi-ai provider-error surface" finding prescribes.

Spec edit: bedrock row at line 18 — replace `ValidationException` shorthand with `HTTP 400 with <field>: "ValidationException"` (or the pi-ai-typed-class equivalent). This depends only on the row-selection convention from Step 1 and closes the silent-downgrade path where a real bedrock context-overflow falls through to `TransportError` with null token counts.

### Step 3 — Scope the HTTP-200 envelope rule
Restate the catch-all to apply *only* where a per-row signature pins an HTTP-200 envelope shape. The HTTP-200 catch-all then has a defined domain (currently just the openai-completions row's "HTTP 200 with the same code in the body envelope"); any other provider's HTTP-200 response is treated as a successful turn, with mis-classification of true 200-body errors reaching editorial review under the *Provider-owned-wording presupposition*. This keeps the diff small and matches what loom can substantiate without inventing per-provider behaviour.

Spec edits: reword the catch-all paragraph at line 5 and the parallel sentence in `TransportError.retryable` at line 11 to bound the HTTP-200 arm to "providers whose row pins an HTTP-200 envelope shape." `binder/determinism-cancellation-failure.md` lines 31 and 33 inherit the rewording without further edits.

### Edge cases
- A provider response whose model's `api` value is unknown to the runtime (e.g. a future pi-ai `Api` literal not yet listed) must map to `TransportError` via the catch-all and MUST NOT silently fall through to "ok"; cross-reference the `Api`-coverage build-time assertion in the seed-table paragraph if the same assertion gates the error table.
- An AWS gateway response that returns `ValidationException` for a non-overflow reason (e.g. malformed request) must still classify as `TransportError`-not-overflow because the body regex fails; restate this explicitly so the new discriminator wording cannot be read as "any `ValidationException` is overflow."
- The *Provider-owned-wording presupposition* paragraph already routes silent-drift detection to editorial review; confirm the Step-3 rewording does not orphan that routing for the now-scoped HTTP-200 arm. A provider quietly switching from 4xx-on-overflow to 200-on-overflow downgrades to `TransportError`/null until the fixture sweep catches it.
- If first-hand evidence (provider docs or pi-ai surface) is later brought in for each non-openai row, Step 3 may be upgraded to a per-provider HTTP-200 sub-clause (with explicit "n/a" where a provider never returns 200-on-error); the scoped-rule form lands cleanly without it.

## Relationships

- T114 "pi-ai provider-error surface (status, body, network-failure delivery) is undefined" - decision-overlap (the discriminator wording depends on the pi-ai surface that finding pins)
- T083 "Stop-reason → `QueryError` variant mapping is undefined" - same-cluster (separate classifier arm, same `QueryError`-population machinery)
- T084 "`TransportError` catch-all in `query-failure-and-repair.md` is narrower than the PIC contract" - same-cluster (sibling catch-all-completeness gap; the catch-all rewording must not collide with that finding's restatement)
- T055 "Item (i) leaves the loom-side overflow-signature regex update unspecified, and the SHOULD-item fail disposition is asymmetric across items (f)–(ad)" - co-resolve (fixture-suite shape under `version-bump-step2.md` item (i) must be re-pointed at the new discriminator wording introduced by this finding)

