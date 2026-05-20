# Findings parked from `spec-review.md` — pi-loom

_This file collects findings physically removed from the
consolidated spec-review document because they cannot be addressed
by the current `/fix-spec-shape-single-findings` pipeline. Each
entry records the reason for parking and the path to the per-finding
forensic report. Parked findings must be reshaped (typically by
splitting bimodal obligations, narrowing scope, demoting MUSTs,
or capping the prose the fix is allowed to add) before being
re-introduced into the live review document._

_Cascade-parked findings (parked solely because they depended on
another parked finding) typically un-park automatically once the
upstream finding's reshape is re-introduced and successfully fixed,
unless they have substantive shape problems of their own._

---

## T05 — `bind_*` (frontmatter) vs `binder*` / `binder-*` (settings, diagnostics, prose) — root-word inconsistency for the binder-model concept

> **PARKED** — 2026-05-20T09:11:15Z
> **Reason:** Category 1 (malformed finding — Solution approach binding surface; the approach is bimodal / two-site / multi-axis, licensing the fixer's surface-expansion as a symptom). The inner spec-diff-fix-loop's surface-expansion detector fired on two consecutive backtrack-and-exclude passes without converging, AND LoopNotes contains a Category-1 discriminator (two-site / bimodal / multi-site / multi-axis / no-canonical-home). FIXCOUNTS: 6,2,3,4,3. SCORESUMS: 161,26,11,26,40 against S=25. Loop notes: Surface-expansion-irrecoverable-bimodal at two-strikes — the originating T05 Solution approach pinned a single-canonical-home design (back-reference-only glossary entry pointing at the *Naming convention* paragraph in frontmatter.md) but the pass-1 traceability fix (fix-06) extracted the binder-model rule into a new `<a id="binder-model-root-word-delta">` sub-paragraph, creating a no-canonical-home rule situation between two viable owners of the per-surface mapping; pass-2's consistency fix then committed to the new home by re-pointing the glossary, after which the bimodal approach left the spec with a back-reference target that lenses kept re-critiquing on every subsequent pass. Trust-override classifier on pass-3-rerun kept three pre-refused scope-guard-fenced findings as fix-class even after the poisoned fix was excluded, because the structural ambiguity itself — not the reframe — is the load-bearing defect. stage1=5. Snapshots retained under refs/loom/snapshots/2026-05-20T08-01-15_fb235c/* for forensics. OriginArtefactDir: c:/UnitySrc/pi-loom/.pi/tmp/spec-fix-loop/2026-05-20T07-57-26_a66fd9/_origin. Category: 1. A human must reshape this finding — declare a canonical home, split into per-site atoms, pick one branch of the bimodal approach, or enumerate the multi-axis dimensions — before re-introducing it.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-20T06-38-04_bf2b2b/t05-bind-frontmatter-vs-binder-binder-settings-diagnostics-prose-root-word-incon.md

# T05 — `bind_*` (frontmatter) vs `binder*` / `binder-*` (settings, diagnostics, prose) — root-word inconsistency for the binder-model concept

**Kind:** naming
**Importance:** medium
**Atomicity:** atomic
**Shape:** single
**State:** reduced
**Decision axes:** 2

## Problem

The concept "the LLM the slash-command argument binder calls" appears across three surface conventions with two different root words: frontmatter uses `bind_` (`bind_model`, `bind_context`, `bind_echo`), while settings keys, diagnostic codes, anchors, and running prose use the longer root `binder` (`looms.binderModel`, `loom/load/binder-model-unresolved`, `## Binder model` in `docs/spec_topics/binder.md`, glossary entry `**binder**`). The per-surface case style (snake / camel / kebab) is already governed by documented conventions; the `binder` → `bind_` shortening inside the frontmatter family is not — the *Naming convention* paragraph in `docs/spec_topics/frontmatter.md` documents the snake-case rule but is silent on this root-word delta, and the glossary has an entry for `**binder**` (the mechanism) but no entry for the binder-model concept, so the cross-surface mapping has no canonical anchor. Author-facing remediation hints that name both surfaces in one sentence (e.g. the `loom/load/binder-model-unresolved` row in `docs/spec_topics/diagnostics.md`: ``set 'bind_model:' in frontmatter or 'looms.binderModel' in settings``) read as a typo until the convention is internalised.

## Solution approach

Declare a single canonical home for the convention: extend the *Naming convention* paragraph in `docs/spec_topics/frontmatter.md` with one sentence pinning the `bind_` (frontmatter) vs `binder` (settings, diagnostic, prose) root-word convention for the binder-related family. Add a `**binder model**` glossary entry to `docs/spec_topics/glossary.md`, alphabetised between the existing `**binder**` and `**callable set**` entries, whose body is a **back-reference** of the form `See the *Naming convention* paragraph in [frontmatter](./frontmatter.md#naming-convention) for the per-surface root-word mapping (`bind_*` frontmatter vs `binder*` / `binder-*` settings, diagnostic, prose).`, NOT a parallel statement of the convention. The convention itself is owned only by the frontmatter *Naming convention* paragraph; the glossary entry is a discoverable forward-link from a reader who lands on a `binder*` token first, not a second authoritative copy.

## Solution constraints

- Do not rename `bind_model`, `bind_context`, or `bind_echo` to `binder_model` / `binder_context` / `binder_echo`.
- Do NOT restate the per-surface mapping (the four spellings, the `bind_` vs `binder` root-word delta, the relationship to sibling `bind_` fields) inside the glossary entry — the glossary entry is a back-reference only. Any prose-level statement of the convention lives in the frontmatter *Naming convention* paragraph and only there. This is the two-site-authoring guard rec AA's mode (g) would otherwise refuse against on stage-3 passes.
- Scope the new convention sentence to the binder-model concept only: do NOT extend it to a universal claim about "every other binder-related frontmatter family surface". The `bind-context-*` and `bind-echo-*` diagnostic-code families use different patterns and are not in scope for this finding.
- Do not coin a new anchor scheme on the glossary entry; reuse the existing `<a id="..."></a>` convention sibling entries already use.

## Relationships

None

---

## T16e — PIC step 2 internal contradiction: literal `pi.setActiveTools([...snapshot, ...names])` call shape vs natural-language "exactly the loom's declared callable set"

> **PARKED** — 2026-05-20T10:38:06Z
> **Reason:** Category 2 (fixer too-hard — capability gap; fixes generate critique surface faster than they close it). The inner spec-diff-fix-loop diverged: the most recent pass produced more fix-class findings than the previous one. FIXCOUNTS: 1,3,1,1,2. Loop notes: T16e originating contradiction resolved on pass 1 (chose branch (b) snapshot-replaced). Pass 5 raised 2 net-new tier-1 traceability fixes on just-added in-page anchors (over-coverage / no structural terminus) — divergence detector fired (fixCount 1→2 at pass 5). Originating PIC step-2 reconciliation is stable and correct, but the frontmatter-side anchor-quality tail (added in passes 3+4) generates more critique surface than each fix closes — needs human reshaping (cap on per-fix anchor-restructuring obligations, or pre-author the obligation-per-anchor structure at top-level so the tail does not re-enter the loop). stage1=5; narrowings=0+1+0+0; stage1Touched=1 mode-e-refusals=0. OriginArtefactDir: c:/UnitySrc/pi-loom/.pi/tmp/spec-fix-loop/2026-05-20T10-34-06_198940/_origin. Category: 2.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-20T06-38-04_bf2b2b/t16e-pic-step-2-internal-contradiction.md

# T16e — PIC step 2 internal contradiction: literal `pi.setActiveTools([...snapshot, ...names])` call shape vs natural-language "exactly the loom's declared callable set"

**Kind:** consistency
**Importance:** high
**Score:** 100
**Atomicity:** atomic
**Shape:** single
**State:** reduced

## Problem

Step 2 of the `Around each query` enumeration under **Tool-registration lifetime and visibility** in `docs/spec_topics/pi-integration-contract.md` reads: ``Call `pi.setActiveTools([...snapshot, ...loomCallableSetNames, respondToolName?])` — the set the model sees for this turn is exactly the loom's declared callable set, plus the respond tool when the turn is a typed-query response turn.`` The literal call argument `[...snapshot, ...loomCallableSetNames, respondToolName?]` produces the **union** of the user-session snapshot and the loom's declared callable set (plus optionally the respond tool); the natural-language gloss that immediately follows asserts that the set the model sees is **exactly** the loom's declared callable set (plus optionally the respond tool), which excludes the snapshot. The two sentences are mutually exclusive — either the snapshot is part of the model's visible set for the turn or it is not — and a reader cannot determine which shape is normative. T16b's reshape of the `docs/spec.md` Trust-boundary callable-set paragraph depends on PIC owning a single, coherent prompt-mode visibility rule to forward-link to; with both shapes live in the cited owner section, T16b cannot characterise prompt-mode visibility without inheriting the contradiction.

## Solution approach

Resolve the contradiction at the source by picking one shape for prompt-mode query visibility under **Tool-registration lifetime and visibility** in `docs/spec_topics/pi-integration-contract.md`. Either (a) rewrite the natural-language gloss in step 2 to match the literal `[...snapshot, ...loomCallableSetNames, respondToolName?]` call — the set the model sees is the user-session snapshot unioned with the loom's declared callable set (and the respond tool on a typed-query response turn), keeping the snapshot/restore protocol's existing behaviour explicit; or (b) rewrite the literal call to match the natural-language gloss — `pi.setActiveTools([...loomCallableSetNames, respondToolName?])` with no snapshot union — and adjust the surrounding paragraphs (the `If another extension calls pi.setActiveTools` consequence in the same section, and any downstream `spec.md`-side framing of the per-mode callable-set rule) accordingly. Pick whichever shape is intended by the V1 prompt-mode design; do not introduce a third shape and do not preserve both.

## Solution constraints

- Do not widen the V1 prompt-mode callable surface beyond what one of the two existing shapes already authorises; the resolution picks between (a) snapshot-union (current literal call) and (b) snapshot-replaced (current natural-language gloss).
- Do not introduce a new type, a new SDK call, or a new `details.kind` discriminator; the edit is a prose / call-literal reconciliation inside the existing step 2.
- Do not touch the subagent-mode `createAgentSession({ customTools, ... })` paragraph; subagent-mode visibility is a separate mechanism unaffected by this contradiction.
- The `docs/spec.md` Trust-boundary callable-set paragraph is owned by T16b — out of scope here.

## Relationships

- T16b "Rewrite callable-set paragraph: drop inline `customTools` / `createAgentSession` / `pi.setActiveTools` names" — must-precede (T16b's prompt-mode visibility characterisation cannot land until PIC step 2 owns a single coherent rule for it to forward-link to).

---

## T16b — Rewrite callable-set paragraph: drop inline `customTools` / `createAgentSession` / `pi.setActiveTools` names

> **PARKED** — 2026-05-20T10:38:06Z
> **Reason:** Cascaded from parking of T16e — PIC step 2 internal contradiction: literal `pi.setActiveTools([...snapshot, ...names])` call shape vs natural-language "exactly the loom's declared callable set": this finding's ## Relationships block declares an ordering edge (must-precede or must-follow) on the parked finding, so its preconditions are no longer satisfied in spec-review.md.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-20T06-38-04_bf2b2b/t16e-pic-step-2-internal-contradiction.md

# T16b — Rewrite callable-set paragraph: drop inline `customTools` / `createAgentSession` / `pi.setActiveTools` names

**Kind:** placement
**Importance:** medium
**Atomicity:** atomic
**Shape:** single
**State:** reduced

## Problem

The callable-set paragraph in the Trust-boundary bullet under Orientation > Scope in `docs/spec.md` names packaging-level Pi-API identifiers — the `customTools` array on `createAgentSession` for subagent mode and the `pi.setActiveTools` snapshot/restore pair for prompt mode — to characterise how the per-mode callable-set wiring is enforced. Those identifiers are owned verbatim by the **Tool-registration lifetime and visibility** and **Conversation drive — subagent mode** sections of `docs/spec_topics/pi-integration-contract.md`; the aggregator restatement drifts the moment either Pi API surface is renamed, replaced, or restructured. The behavioural property the trust-boundary scope decision actually rests on is the per-mode wiring isolation, not the specific Pi APIs that implement it.

## Solution approach

Rewrite the callable-set paragraph in the Trust-boundary bullet so it states only the behavioural isolation rule — subagent-mode invocations see only the loom's declared callable set; prompt-mode invocations see the loom's declared callable set unioned with the user session's snapshot for the swap window — and forward-links the **Tool-registration lifetime and visibility** section in `docs/spec_topics/pi-integration-contract.md` for the SDK-call mechanism. Drop the inline `customTools`, `createAgentSession`, and `pi.setActiveTools` identifiers from the paragraph. The SDK-call mechanism remains owned by the linked PIC section.

## Solution constraints

- Do not inline the Pi-API identifiers `customTools`, `createAgentSession`, or `pi.setActiveTools` (or any other Pi-API symbol that names how callables are wired for either mode); those are owned by **Tool-registration lifetime and visibility** in `docs/spec_topics/pi-integration-contract.md`.
- Preserve the *callable set* clarification — that the loom's declared callable set is a configuration knob over the *model's* reachable callable set, NOT a host-process sandbox — and its forward-link to [Parameters and Frontmatter — `tools`](./spec_topics/frontmatter.md#tools).
- The host-side-denial paragraph and the closing capability-model sentence are owned by T16c and T16d respectively — leave them untouched here.

## Relationships

- T16a "Reduce Trust-boundary SDK-surface clause: drop the `~0.72.1` literal" — co-resolve.
- T16c "Reduce host-side-denial paragraph to one sentence with forward-links" — co-resolve.
- T16d "Replace closing capability-model paragraph with single forward-link sentence" — co-resolve.

---

## T15a — Reduce Session-model Orientation paragraph to a four-sentence forward-linking bullet

> **PARKED** — 2026-05-20T12:04:03Z
> **Reason:** Category 1 (malformed finding — default attribution for top-level fixer refusals; the fixer's pre-flight typically catches stale preconditions, missing destination subsections, or do-not-touch conflicts — may also be category 2 if the refusal reason is capacity-shaped, see FixerNotes). The top-level spec-review-fixer refused to apply the recommended resolution. Refusal reason: Deferred per Solution constraint #3. The destination `Concurrency model` subsection (owned by T15b) is absent from `## Extension Architecture` in `docs/spec.md`, and T15b is still pending in `docs/spec-review.md`. T15a/T15b/T15c form a co-resolve cluster; T15b is the binding prerequisite (T15c already resolved). OriginArtefactDir: c:/UnitySrc/pi-loom/.pi/tmp/spec-fix-loop/2026-05-20T11-59-29_13ffa4/_origin. Category: 1.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-20T06-38-04_bf2b2b/t15a-reduce-session-model-orientation-paragraph.md

# T15a — Reduce Session-model Orientation paragraph to a four-sentence forward-linking bullet

**Kind:** placement
**Importance:** medium
**Atomicity:** atomic
**Shape:** single
**State:** reduced

## Problem

The `<a id="session-model"></a>` paragraph in `docs/spec.md` Orientation > Prerequisites compresses five distinct content categories — Pi-session binding, `session_shutdown` payload contract, prompt-mode sequentiality argument with its three supporting premises, mode-qualified transcript/tool-table isolation, and admission-cap / per-invocation-budget posture — into one Orientation bullet. The architectural clauses belong in the new `Concurrency model` subsection owned by T15b, and the V1 scope deferrals (parallel-`invoke`, concurrent user sessions) belong at the V1 non-goals surfaces owned by T15c; until this reduction lands, those siblings have no room to relocate content into. The paragraph reads as a single mixed block rather than as Orientation-level forward-linking prose.

## Solution approach

Reduce the `<a id="session-model"></a>` paragraph in `docs/spec.md` Orientation > Prerequisites to orientation-level forward-link prose. The retained content categories are: the one-session-at-a-time Pi-session binding (forward-link to the Session-binding contract in `docs/spec_topics/pi-integration-contract.md`), the `session_shutdown` payload contract (forward-link to the Extension entry point in `docs/spec_topics/pi-integration-contract.md` and to the closed `event.reason` set in the SDK type at `@mariozechner/pi-coding-agent`'s `dist/core/extensions/types.d.ts`), and a pointer to the architectural `Concurrency model` subsection installed by T15b. Delete the clauses T15b relocated (mode-qualified isolation summary, prompt-mode sequentiality with premises (i)/(ii)/(iii), genuine-concurrency-only-between-subagent-invocations conclusion, cancellation-propagates-downward restatement, per-invocation budget scoping, no-admission-cap statement) and the deferrals T15c lifted (parallel-`invoke`, concurrent user sessions). Composition — sentence count, ordering of forward-links, whether closely-related pointers fold into one sentence — is the implementer's choice.

## Solution constraints

- The reduced paragraph must retain the `<a id="session-model"></a>` anchor — inbound links (the Overview's terminal-outcomes paragraph, the `[Session model](#session-model)` reference inside the V1 non-goals subsection) depend on it.
- The destination `Concurrency model` subsection is owned by T15b — do not author it under this finding.
- If the `Concurrency model` subsection (owned by T15b) is absent from `## Extension Architecture` in `docs/spec.md` at edit time, defer.

## Relationships

- T15b "Move concurrency semantics into Extension Architecture / Implementation Notes Concurrency-model subsection" — co-resolve (the reduction makes room for the relocated content).
- T15c "Lift Session-model scope deferrals into Non-goals (V1) section" — co-resolve (the reduction makes room for the lifted deferrals).
- T02 "Subagent state-isolation enumeration duplicates PIC matrix in Overview opening paragraph" — same-cluster (identical placement pattern).
- T16a "Trust boundary bullet: keep scope claim and drop SDK-pin literal" — same-cluster (sibling Scope bullet exhibiting the same mixing of categories).
- T18a "Append success-side null-policy paragraph to PIC Runtime event channel" — same-cluster (third instance of the pattern, in the Runtime-observability bullet).
- T24 "Fork-reason watcher closure leaves the extension in an unspecified, silently degraded state" — same-cluster (touches the same Session-model paragraph but addresses content correctness).

---
