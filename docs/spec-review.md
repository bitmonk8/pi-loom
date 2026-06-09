# Triaged Spec Review - spec

_Generated: 2026-06-09T12:30:00Z_
_Spec: docs/spec.md_
_Ordered by importance (least→most important, top→bottom); processed bottom-up. IDs preserved from the prior triage (so they are not monotonic top-to-bottom)._

_Triage tally: 5 high retained in-document (5 findings); all medium and lower findings removed in a post-recalibration prune._

---

# T14 - `[custom:<type>]` role tag interpolates `CustomMessage.customType` verbatim with no safe-character constraint

**Kind:** implementability
**Importance:** high
**Score:** 100
**Must-fix:** true
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

Rule 3 of *Compact-transcript format (normative)* (`docs/spec_topics/binder/binder-model-and-context.md`) pins the `[custom:<type>]` role tag's `<type>` slot as the `CustomMessage.customType` string verbatim, and rule 5 disclaims the system-note sanitisation discipline for transcript bytes. `CustomMessage.customType` is typed only as `string` (`docs/spec_topics/pi-integration-contract/host-interfaces-core.md`), and the corpus's only `customType` constraint — the `loom-<purpose>` `SHOULD` convention in `extension-bootstrap-and-per-loom.md` — is namespace coordination, not a character class, and does not bind third-party values. A `customType` containing `\n`, `]`, or the sequence `: ` shatters the line-oriented transcript, breaking BNDR-7's MUST-reproduce-exactly contract; via the `convertToLlm` transform (`docs/spec_topics/pi-integration-contract/runtime-event-channel.md#custom-message-context-entry-presupposition`) the malformed bytes then propagate into every subsequent provider call.

## Issue introduction

**Verdict:** present-since-inception
**Introducing commits:** 20569f8 — pi-loom spec: resolve "Compact-transcript format for the session-context block is unspecified" (2026-05-07, Thomas Andersen)
**History:** The compact-transcript `[custom:<type>]` role tag, its "`<type>` is the `CustomMessage.customType` string verbatim" rule (rule 3), and the "No sanitisation" rule (rule 5) all first entered the spec corpus in `20569f8` — the earliest spec commit in which the token and the no-sanitisation rule appear under a pickaxe over the spec paths. The verbatim-with-no-character-class shape was therefore present from the section's inception. Later commits `01c9db9` (2026-06-03) and `1a41db2` (2026-06-06) extended the section and `f5e89f4` (2026-06-04) moved it into `binder-model-and-context.md`, but none narrowed the `customType` character class.

## Solution approach

Narrow the `<type>` slot at rule 3 of *Compact-transcript format (normative)* (`binder-model-and-context.md`) to a safe character class that excludes `\n`, `\r`, `]`, the two-byte sequence `: `, and the empty string, and pin that the binder MUST reject any `CustomMessage` whose `customType` falls outside the class before transcript rendering, surfacing the rejection through a `loom/runtime/*` diagnostic. Narrow the `loom-<purpose>` convention in `extension-bootstrap-and-per-loom.md`'s `customType` ownership and collision rule so the loom-internal naming class nests inside the broader safe class. Add a forward-cross-reference from `host-interfaces-core.md`'s `CustomMessage` paragraph noting the binder is stricter than Pi's `string` typing.

## Solution constraints

- The rejection diagnostic MUST be a row added to the closed `loom/runtime/*` registry (`docs/spec_topics/diagnostics/code-registry-runtime.md`) under DIAG-2, not a code coined at the binder rule site.

## Relationships

None

---

# T21 - Cross-type `==` trigger predicate is internally inconsistent on `integer` vs `number`

**Kind:** implementability
**Importance:** high
**Score:** 100
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

The cross-type-equality paragraph in `runtime-value-model.md` §Equality (anchor `id="equality"`) states the trigger for the `false` (`==`) / `true` (`!=`) cross-type disposition twice using two non-equivalent predicates in adjacent sentences: a structural predicate ("when the operand static types share no common structural ground") and a static-identity predicate ("the cross-type rule applies only when the static types differ"). The two diverge on every pair where one operand's static type is `⊑` the other — e.g. `42 == 42.0`, since `integer ⊑ number` holds per TYPE-2: the structural predicate does not fire the cross-type rule (falls through to per-shape *Primitives compare by value* → `true`), while the static-identity predicate fires it → `false`. The implementer has no principled tie-breaker, and the same ambiguity recurs for any subtype or union-arm pair not covered by the paragraph's four genuinely-disjoint worked examples. The mismatch is observable in user code and silently changes downstream control flow, schema dispatch, and `match`-arm selection.

## Issue introduction

**Verdict:** single-commit
**Introducing commits:** 43a24f3 — pi-loom spec: resolve "== cross-type disposition + expressions/runtime-value-model equality link" (2026-06-07, Thomas Andersen)
**History:** Both contradictory trigger sentences — the structural "share no common structural ground" predicate and the static-identity "applies only when the static types differ" predicate — were introduced into `runtime-value-model.md` §Equality by the single commit `43a24f3`; a pickaxe (`-S`) over each phrase localises both to that one commit. The cross-type-equality paragraph arrived internally inconsistent in that one diff. No earlier or later commit touched the contradiction.

## Solution approach

Rewrite the cross-type trigger in `runtime-value-model.md` `id="equality"` to a single decidable predicate phrased against the `⊑` relation — the cross-type rule fires only when neither operand's static type is `⊑` the other — and delete the contradicting "applies only when the static types differ" sentence. Clarify the surviving "share no common structural ground" wording to name the `⊑`-based predicate and forward-link to `type-system.md#type-compatibility`. Add one worked example exercising the now-disambiguated subtype case (`integer`/`number` operands comparing `true`) to discriminate the chosen rule. Rewrite the `expressions.md` §Equality "share no common structural ground" link prose in lockstep so the link target and linker do not drift back into the contradiction.

## Solution constraints

- Out of scope: the per-shape equality bullets (`NaN`/`±0` primitives, arrays, objects, enums, `Result`) — do not weaken their language while editing the cross-type trigger.

## Relationships

None

---

# T26 - Direct slash-invocation of a subagent-mode loom returning top-level `Err` is unsurfaced

**Kind:** error-model
**Importance:** high
**Score:** 100
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

The user-facing surfacing rule SLSH-3 (`#slsh-3` in `slash-invocation.md`) is scoped in both its title and its trigger to *prompt mode* — it fires only when a prompt-mode loom returns `Err(QueryError)` to the user's session. The page enumerates two slash-dispatch execution modes (prompt and subagent) but supplies no parallel surfacing rule for the subagent case. A user who directly slash-invokes a subagent-mode loom that terminates in `Err` therefore has no specified observable: success is silent per the runtime-event-channel `#success-side-null-policy`, and the only `loom-system-note` the runtime issues for the failure routes `display: false` into the spawned subagent's private in-memory transcript, which PIC-9's disposal `finally` destroys before any consumer can read it. The hole sits between two adjacent rules — SLSH-3's prompt-mode scope and the runtime-event-channel cascade rule's privacy default — neither of which addresses the subagent-mode + top-level + slash-entry configuration.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** `53f5831` (2026-05-03), `b3bc4ce` (2026-05-04), `4498b31` (2026-05-06)
**History:** The hole opened across three commits that each correctly handled their own scope:

- `53f5831` — "spec: rewrite query primitive, system prompts, and schema syntax" — introduced the *Top-level `Err` in prompt mode* paragraph (later promoted to SLSH-3) scoped from inception to "When a prompt-mode loom returns `Err(QueryError)` to its caller (the user's session)". Subagent mode was deliberately out of scope at the time the rule was authored.
- `b3bc4ce` — "spec: pin failure-observability surface (Cluster A, Option C)" — added the operator-facing runtime event channel and chose `display: false` for "Subagent-mode top-level `Err` cascades", justifying it with "the subagent transcript is private". The justification is correct for the cascade-from-invoke case but silently inherits the directly-slash-invoked-subagent case as well.
- `4498b31` — "loom-system-note display:false delivery and empty content not contracted" — pinned the Delivery surface, including the rule that subagent-mode `display: false` cascades route through `pi.sendMessage` *against the spawned `AgentSession`* (i.e. into the soon-to-be-disposed private transcript). This made the unobservability concrete: the note now has a well-defined destination, but that destination is unreachable to any consumer after `dispose()` runs.

No single commit "introduced" the defect; each correctly handled the cascade-from-parent case it had in scope. The defect is the cumulative interaction between SLSH-3's prompt-mode scoping and the cascade-rule's privacy default, neither of which addresses the third configuration (subagent-mode + top-level + slash entry).

## Solution approach

Rewrite SLSH-3 in `slash-invocation.md` so its trigger fires for any loom at the slash-dispatch boundary that terminates with `Err(QueryError)`, regardless of mode, and add a forward-link from the *Once a loom is invoked* subagent-mode bullet to SLSH-3. Rewrite the runtime-event-channel Delivery-surface and `display:` rules so a directly slash-invoked top-level cascade emits `display: true`, while subagent-mode cascades reached from inside another loom via `invoke(...)` / `.loom`-callable retain `display: false` and the spawned-session delivery. Clarify the discriminator using the glossary's *caller* terminology — a direct slash invocation is a chain root with a slash caller and no invoke parent — so the prompt → prompt `invoke(...)` cascade is not misclassified. The error-model Panics table's *Slash-command / prompt-mode invocation* surface is the existing routing template for this path.

## Solution constraints

- SLSH-3's anchor `id="slsh-3"` is a governed identifier; this is a prose/scope edit and must not rename or re-allocate the anchor.

## Relationships

None

---

# T28 - Schema inference precedence — two models, two different answers

**Kind:** clarity, implementability
**Importance:** high
**Score:** 100
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

`docs/spec_topics/query/query-forms.md` describes typed-query schema
inference twice with incompatible precedence models. §"Schema inference
rules" enumerates three type contexts (binding annotation, enclosing
return type, call-site parameter type) "checked in order", which reads
as a priority ladder in which the outer binding annotation outranks the
inner call-site parameter type. §"Schema inference algorithm" instead
defines an outward AST walk that terminates at the first enclosing sink,
under which the innermost sink wins. For a query at a call-site inside a
typed binding (`let x: Out = process(@`...`?)` where `process(p: In)`),
the two models yield different schemas — `Out` under the ladder, `In`
under the walk — so the validator input and the bytes sent to the
provider diverge across conformant implementations.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** 53f5831 — spec: rewrite query primitive, system prompts, and schema syntax (2026-05-03, Thomas Andersen); fae85d3 — Tighten spec for implementation-plan readiness (2026-05-04, Thomas Andersen)
**History:** The "checked in order" §"Schema inference rules" ladder framing first entered the corpus in `53f5831`; the next day `fae85d3` added the §"Schema inference algorithm" outward-walk model alongside it. Each model reads coherently in isolation, but the two now describe schema-inference precedence with incompatible answers for a call-site-inside-a-typed-binding query. The defect is the interaction between the ladder framing (`53f5831`) and the later-added outward walk (`fae85d3`); both predate the `f5e89f4` (2026-06-04) split into `query-forms.md`.

## Solution approach

Adopt the outward walk as the sole authoritative precedence model.
Rewrite §"Schema inference rules" so the three contexts read as the set
of sink positions the walk recognises rather than an ordered ladder,
removing the "checked in order" framing and deferring precedence to
§"Schema inference algorithm". Add a worked example to §"Schema
inference algorithm" pinning the nearest-enclosing semantics for the
call-site-with-outer-binding case, where the call-site parameter type
is the sink and the outer binding annotation is not consulted.

## Solution constraints

- Out of scope: the explicit-ascription override clause
  (`#explicit-ascription-override`), which already delegates to the
  walk — leave it unchanged.

## Relationships

None

---

# T30 - Overflow table predicates key on structured JSON fields the `AssistantMessage.errorMessage` string does not expose

**Original heading:** Overflow table matches structured JSON fields against a flat `errorMessage` string (impossible as written)
**Original section:** docs/spec_topics/pi-integration-contract/ — host/registration/bootstrap/provider (shard-11)
**Kind:** implementability
**Importance:** high
**Score:** 100
**Must-fix:** false

## Finding

`docs/spec_topics/pi-integration-contract/provider-error-mapping.md` contains two clauses that contradict each other and leave the overflow classifier unimplementable as written.

The *Classifier input surface* note declares that the provider error-body wording reaches loom **only** as the flat `AssistantMessage.errorMessage` string produced by pi-ai's per-provider error formatter, that "pi-ai surfaces no parsed JSON error body", and that "every body-wording match in the table is a match against that string."

The overflow-signature table immediately below, however, expresses two of its four predicates against structured JSON fields the SDK does not surface:

- `anthropic-messages` requires `error.type: "invalid_request_error"` **and** `error.message` matching a regex.
- `openai-completions` requires `error.code: "context_length_exceeded"` (in the HTTP-400 case **and** in the HTTP-200 body envelope) — with no regex over any string field at all.

These two rows are not implementable from a single flat `errorMessage` string: there is no defined projection from that string back to `error.type`, `error.code`, or the HTTP-200 body envelope, and the openai row has no string predicate to fall back on. The `mistral` and `amazon-bedrock` rows, by contrast, are already phrased as a single regex over the body text and are consistent with the *Classifier input surface* claim.

The HTTP-200-overflow side-channel widens the gap: the *Provider error mapping* opening paragraph and the openai row both rely on detecting "the recognised overflow code in the openai-completions row" inside an HTTP-200 body envelope, but pi-ai's `onResponse` callback only yields `{ status, headers }` and the resolved `AssistantMessage` carries no parsed body — there is no surface that distinguishes the HTTP-200 overflow envelope from any other 200 response that resolves with `stopReason: "error"`.

## Spec Documents

- `docs/spec_topics/pi-integration-contract/provider-error-mapping.md` — *Classifier input surface* note, overflow-signature table, opening *Provider error mapping* paragraph (edited)
- `docs/spec_topics/pi-integration-contract/binder-inference.md` — Binder inference call (read-only; cited as the authoritative source for `StreamOptions`, `AssistantMessage`, and `ProviderResponse`)
- `docs/spec_topics/pi-integration-contract/version-bump-step2.md` — *Editorial-review checklist for unpinned host presuppositions* item (i) (option-dependent; the per-bump fixture-rerun pointer must continue to match the chosen predicate shape)
- `docs/spec_topics/query/query-failure-and-repair.md` — *Detection of `ContextOverflowError`* (read-only; counterpart to the stop-reason classification rule)

## Plan Impact

**Phases:** N/A

**Leaves (implementation order):** N/A

(The plan exists at `docs/plan.md` with `docs/plan_topics/`, but no leaves have been authored yet; `grep -rn 'provider-error\|errorMessage\|overflow\|ContextOverflow\|TransportError' docs/plan.md docs/plan_topics/` returns no matches.)

## Consequence

**Severity:** correctness

Two of the four overflow rows cannot be implemented from the surface the spec pins as the only available classifier input, and the openai row has no regex at all to fall back on. Two conforming implementations would either (a) read undeclared pi-ai internals to recover the structured fields, (b) reverse-engineer the formatter output with ad-hoc regexes the spec does not prescribe, or (c) classify every anthropic/openai overflow as `TransportError` with null token counts — three observably different outcomes for the same provider response. The HTTP-200 openai overflow envelope is unrecoverable under (c) and silently degrades a real `ContextOverflowError` to a non-retryable `TransportError`.

## Issue introduction

**Verdict:** single-commit
**Introducing commits:** `44782e9` (2026-06-06) — *pi-loom spec: resolve "TransportError catch-all / pi-ai provider-error surface"*
**History:** `provider-error-mapping.md` was created in commit `f5e89f4` (2026-06-04, the spec-set split). The overflow-signature table at that point already keyed `anthropic-messages` on `error.type` + `error.message` and `openai-completions` on `error.code` (with the HTTP-200 body-envelope variant), but the file made no claim about which pi-ai surface delivered those fields, so there was no internal contradiction yet — just a latent grounding gap. Commit `44782e9` then added the *Classifier input surface* note (`git show 44782e9 -- docs/spec_topics/pi-integration-contract/provider-error-mapping.md` shows the +1 paragraph insertion) declaring that "the provider error-body wording … reaches loom only as the `AssistantMessage.errorMessage` string produced by pi-ai's per-provider error formatter — pi-ai surfaces no parsed JSON error body — so every body-wording match in the table is a match against that string." That sentence is the moment the table's structured-field predicates became unimplementable against the spec's own stated input surface. `git log -G "errorMessage" -- …/provider-error-mapping.md` confirms `44782e9` is the only commit to introduce `errorMessage` into the file.

## Solution Space

**Shape:** multiple
**State:** shaped

### Option A — Rephrase every row as a regex over `errorMessage`

**Approach.** Keep the *Classifier input surface* note as authoritative ("flat `errorMessage` string is the only body input"), and rewrite each table row's predicate as an explicit regex over that string — the shape `mistral` and `amazon-bedrock` already use. For `anthropic-messages` drop the `error.type` requirement and rely on the wording regex alone (constrained to HTTP 400). For `openai-completions` introduce a wording regex that matches whatever pi-ai's formatter emits for the `context_length_exceeded` code; document the HTTP-200 overflow envelope as detected by the same wording regex regardless of status (since the structured `error.code` is unavailable), or delete the HTTP-200 side-channel entirely.

**Spec edits.**
- `provider-error-mapping.md` — rewrite the `anthropic-messages` and `openai-completions` rows so their body-wording predicates are regexes against `errorMessage`; remove `error.type` / `error.code` field references from the predicate columns (they may stay in prose as "the pi-ai formatter is known to surface the `context_length_exceeded` code as substring X").
- `provider-error-mapping.md` — adjust the opening *Provider error mapping* paragraph's "the recognised overflow code in the openai-completions row below" phrase to refer to the new wording-regex match, or strike the HTTP-200 body-envelope side-channel if it cannot be detected from `errorMessage` alone.
- `version-bump-step2.md` — the *Editorial-review checklist* item (i) already routes fixture re-runs through the bump procedure; add a one-line note that the canonical fixture corpus must include pi-ai-formatted bodies (post-formatter), not raw provider HTTP bodies.

**Pros.** Internally consistent with the *Classifier input surface* note as written today. Reuses the existing fixture-rerun gate. The two SDK-only providers already work this way, so the pattern is uniform.

**Cons.** Regex over a formatted string is fragile and couples loom to pi-ai's formatter output (not just pi-ai's typed surface). A pi-ai formatter change is invisible to the version pin and would silently downgrade overflow classification — exactly the drift the *Provider-owned-wording presupposition* already names, but here it would also cover pi-ai's own formatter rewordings, not just provider rewordings.

**Risks.** Loss of the structured `error.code` exact-match for openai (currently the most reliable signal). Requires confirming, against the pinned pi-ai version, that the formatter actually emits `context_length_exceeded` substring in the formatted message for both HTTP 400 and HTTP 200 cases.

### Option B — Pin a parsed body field on the pi-ai surface and rewrite the *Classifier input surface* note

**Approach.** Treat the *Classifier input surface* note as overstated. Identify a pi-ai surface that does expose parsed error-body fields (or add an `onResponse`-like callback contract that delivers the raw body bytes, which loom then parses), pin it the same way `StreamOptions.onResponse` is pinned today, and amend the *Classifier input surface* note to acknowledge two body inputs: the formatted `errorMessage` string and the structured parsed body. Keep the table rows as structured-field predicates.

**Spec edits.**
- `provider-error-mapping.md` — replace the "pi-ai surfaces no parsed JSON error body" clause with the actual pi-ai surface that exposes the parsed body (cite `dist/types.d.ts` per the pattern already used for `ProviderResponse`). Adjust the closing sentence "so every body-wording match in the table is a match against that string" to "so structured-field matches read from the parsed body and string-wording matches read from `errorMessage`."
- `provider-error-mapping.md` — leave the four table rows largely unchanged; clarify per row whether the predicate reads from the parsed body or the formatted string.
- `binder-inference.md` — extend the binder's options enumeration to register whatever callback delivers the parsed body, parallel to the existing `onResponse` registration.

**Pros.** Preserves the table's high-fidelity structured matches (the openai `context_length_exceeded` exact-code match is the strongest classifier signal available). Closes the HTTP-200 body-envelope path properly.

**Cons.** Requires a pi-ai surface that may not exist at the pinned version; if it does not exist, the option collapses into either Option A or "wait for pi-ai to add one" (which the spec cannot unilaterally promise). The *Classifier input surface* note becomes longer and tracks two surfaces.

**Risks.** If the chosen parsed-body surface is added by extending pi-ai rather than discovered in the pinned version, this option is out of scope for loom 1.0.0 and reduces to Option A in practice.

### Recommendation

Resolve in two ordered steps so the second step lands on a stable baseline:

1. **First**, verify against `@earendil-works/pi-ai` at the pinned version whether `StreamOptions` (or any sibling callback declared in `dist/types.d.ts`) delivers a parsed JSON error body or the raw body bytes. This is the scope-bounding question — its answer determines whether Option B is even available.
2. **Then**, if a parsed-body surface exists, take **Option B**: it preserves the openai `error.code` exact-match (the only reliable signal for the HTTP-200 overflow envelope) and keeps every other row's structured-field grounding. If no parsed-body surface exists at the pin, take **Option A** and explicitly drop the HTTP-200 body-envelope side-channel from the *Provider error mapping* paragraph (it is unrecoverable from `errorMessage` alone — pretending otherwise re-introduces the same defect).

Edge cases the implementer must watch under either option:
- The `anthropic-messages` row's `error.type: "invalid_request_error"` predicate currently disambiguates an HTTP 400 overflow from an HTTP 400 schema-validation error; if Option A drops that field, the wording regex must be strict enough to avoid mis-classifying validation errors as overflow.
- The `openai-completions` HTTP-200 body-envelope path under Option A may need to be deleted entirely, not merely re-phrased; an HTTP-200 response whose `errorMessage` happens to contain the right substring is indistinguishable from a successful 200 carrying that wording in tool output unless the predicate is also gated on `AssistantMessage.stopReason: "error"`.
- The *Editorial-review checklist* item (i) fixture corpus changes meaning under Option A (must capture post-formatter pi-ai output) versus Option B (must capture pre-formatter provider HTTP bodies); whichever option is taken, the bump-procedure prose pointing at item (i) must say which.

## Relationships

None
