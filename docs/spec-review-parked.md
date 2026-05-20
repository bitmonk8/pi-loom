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
