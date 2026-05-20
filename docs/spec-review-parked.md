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

## T15a — Reduce Session-model Orientation paragraph to a four-sentence forward-linking bullet

> **PARKED** — 2026-05-20T16:01:36Z
> **Reason:** Category 1 (malformed finding — constraints binding surface; an ordering-prediction phrase in Solution constraints is stale against current spec-review.md state). The orchestrator detected pre-dispatch that this finding's ## Solution constraints contained an ordering-prediction phrase that no longer holds (Rec M). No inner loop ran. Loop notes: Rec M: detected 1 stale ordering prediction(s) in ## Solution constraints. "If the `Concurrency model` subsection (owned by T15b) is absent from `## Extension Architecture` in `docs/spec.md` at edit time, defer": predicted T15b's Concurrency model subsection authored, actual T15b still live in spec-review.md at line 131 (its Concurrency model subsection has not yet been installed). A human must rewrite the offending constraint as a content-level check (e.g. 'if <subsection> is absent in <file>, defer') rather than a structural-ordering prediction, OR drop the constraint entirely if the prediction is purely informational, before re-introducing this finding.
> **Forensic report:** `.pi/tmp/spec-fix-failure-forensics/2026-05-20T16-01-36_59fbed/t15a-reduce-session-model-orientation-paragraph-to-a-four-sentence-forward-linki.md`

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

## T16e — PIC step 2 internal contradiction: literal `pi.setActiveTools([...snapshot, ...names])` call shape vs natural-language "exactly the loom's declared callable set"

> **PARKED** — 2026-05-20T17:21:16Z
> **Reason:** Category 1 (malformed finding — Solution approach binding surface; the approach is bimodal / two-site / multi-axis, licensing the fixer's surface-expansion as a symptom). The inner spec-diff-fix-loop's surface-expansion detector fired on two consecutive backtrack-and-exclude passes without converging, AND LoopNotes contains a Category-1 discriminator (two-site / bimodal / multi-site / multi-axis / no-canonical-home). FIXCOUNTS: 1,0,1,1. SCORESUMS: 100,0,5,25 against S=100. Loop notes: Surface-expansion two-strikes exit (sub-variant surface-expansion-irrecoverable-bimodal, CATEGORY 1). T16e's Solution approach is bimodal ("Either (a) snapshot-union or (b) snapshot-replaced"); the top-level fixer picked shape (b), and every loop iteration that added prose to justify the snapshot-replaced semantics attracted multi-axial lens critique. Trigger trajectory: pass-2 assumptions:01 (no-inheritance rationale) → pass-3 3-finding surface; pass-3 re-run traceability:01 → pass-4 contradiction with Restore-failure protocol; backtrack-and-exclude assumptions:02 + placement:01 → pass-5 re-cascade; backtrack consistency:01 → same surface again. Score-sum 100, 0, 5, 25 against k=1.5. Two consecutive backtrack passes poisoned placement:01 and consistency:01. Side-effect: pass-1 applied a cross-doc edit to docs/plan_topics/v14-tool-calls.md (out-of-loop-scope); reverted before parking. Human action: reshape T16e's Solution approach — pick one shape at authoring time and remove the bimodal "Either (a)... or (b)..." phrasing, OR split T16e per-shape, OR cap the prose-budget. OriginDir: /c/UnitySrc/pi-loom/.pi/tmp/spec-fix-loop/2026-05-20T17-18-09_1d907a/_origin. A human must reshape this finding — declare a canonical home, split into per-site atoms, pick one branch of the bimodal approach, or enumerate the multi-axis dimensions — before re-introducing it.
> **Forensic report:** `.pi/tmp/spec-fix-failure-forensics/2026-05-20T16-01-36_59fbed/t16e-pic-step-2-internal-contradiction-literal-pi-setactivetools-snapshot-name.md`

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
