# Findings parked for reshape — pi-loom spec.md

_Produced: 2026-05-11_
_Source file: `docs/spec-review.md` (generated 2026-05-08T09:00:00Z; last modified 2026-05-11)_
_Divergence reference: `C:/Users/thomasa/.pi/tmp/monitor-running-agents/2026-05-11T18-08-06Z/divergence-analysis.md`_

## Purpose

This file collects findings extracted from `docs/spec-review.md` because their Recommendation blocks exhibit one or more content shapes that reliably cause the `spec-diff-fix-loop` to diverge — as documented in the divergence-analysis.md report from sessions pi-loom (T22a) and ap-project_service (T60a–d).

Each parked finding has been **excised** from `spec-review.md`; the source file's tally and reshape-pass notes have been updated accordingly. Findings here must be manually reshaped (split or reworded) before re-queuing in `spec-review.md`.

## Reshape criteria applied (any one triggers extraction)

1. **Bimodal obligation** — two structurally independent obligations each generating their own lens fan-out.
2. **Authority-paragraph with inline enumeration** — broad authoritative paragraph containing an inline enumeration of surfaces / behaviours / files / DBs / API entries (dominant divergence loop via spec-lens-traceability, spec-lens-completeness, spec-lens-placement, spec-lens-naming).
3. **Composite spec edits across 3+ files** without an explicit must-precede / co-resolve dependency graph in the finding.
4. **Verbatim-source-citation pattern** — new citation introduced alongside an existing paraphrase the spec already contains (clarity / consistency / contradiction triple-trigger, per divergence-analysis.md §T22a).
5. **Transient `Note` block** referencing other in-flight findings, or forward-references to material that in-queue findings will produce.

Findings NOT flagged: already-split children (Tnna/b/c form), MERGED stubs, genuinely single-targeted-edit findings, findings covered by the preamble's existing reshape-pass records (T01/T04→spec-sweeps, T03→T03a-f, T08→T08a-c, T11→T11a-c, T15→T15a-c, T16→T16a-d, T18→T18a-d, T19→T19a-e).

---

## Parked finding 1 of 1

**Reshape rationale:** T22a matches **Criterion 4 — Verbatim-source-citation pattern**. The Recommendation adds a new "Session-binding contract" sub-section to PIC whose body introduces a source-of-truth citation block (`@mariozechner/pi-coding-agent ~0.72.1`, `docs/sdk.md` extension lifecycle section, plus a corroborating fallback to `SessionShutdownEvent['reason']` as a type-side anchor) alongside the spec's existing paraphrase "A Pi extension instance is bound to exactly one active user session at a time." This is the identical structural pattern that caused the original T22a session to diverge (fixCounts [12, 13]; documented in divergence-analysis.md §T22a): the fixer produced a verbatim Pi-prose citation alongside the spec paraphrase, generating a clarity/consistency finding when the cited text and the paraphrase used slightly different phrasing. Even with the current finding's "hard edit budget ≤2 sentences" guard and explicit "No new MUSTs" constraint, the citation sub-section introduces three independently-flaggable components that the lens suite will target in the first-pass review:

- **Source reference stability** — `docs/sdk.md (extension lifecycle section)` is a prose pointer with no line anchor; spec-lens-traceability will flag "is this pointer stable across SDK minor bumps?" and spec-lens-prescription will flag "over-specifying the audit path in normative prose."
- **Fallback condition** — "If the SDK doc page is unavailable at audit time, the type-side anchor stands as the corroborating source" is a conditional that spec-lens-clarity will flag ("what exactly does 'session-scoped, not process-scoped' mean for `SessionShutdownEvent['reason']`?") and spec-lens-consistency will flag ("does the type-side anchor actually establish session-scoped lifecycle, or only shut-down-reason vocabulary?").
- **Paraphrase-vs-citation gap risk** — the Edge cases note ("if the SDK doc page turns out to say 'typically bound to one session' rather than guaranteeing it, downgrade the spec assertion accordingly") acknowledges the contradiction risk the specifier cannot resolve without inspecting the live SDK. The fixer seeing this conditional is likely to attempt to phrase-match the citation to the paraphrase or add a detection note — both of which expand the diff surface.

**Reshape suggestion:** Split into two children: (a) a spec.md-only finding that adds the forward-link to a not-yet-created PIC anchor (the forward-link landing point is stipulated as a future anchor, so the spec.md edit is a single pointer addition that does not depend on the citation text being resolved); (b) a PIC-only finding that installs the actual "Session-binding contract" sub-section with its citation, undertaken only after a human has verified the SDK text and confirmed what it says about lifecycle guarantee vs observation. This separates the "pointer-in-spec" obligation from the "citation-sourced-sub-section" obligation, preventing the fixer from attempting to resolve the citation-vs-paraphrase gap in a single pass.

---

# T22a — Single-active-session premise lacks a Pi-source citation in PIC

**Original heading:** Concurrent user sessions: Pi guarantee uncited; fallback if Pi adds support undefined (split from T22, part 1 of 3)
**Original section:** docs/spec_topics/pi-integration-contract.md — Host prerequisites
**Kind:** assumptions
**Importance:** medium

## Finding

The Session-model paragraph in `spec.md` opens with "A Pi extension instance is bound to exactly one active user session at a time." The clause states a Pi-side lifecycle fact without citing any Pi type, interface comment, or PIC anchor that establishes it. The assertion is load-bearing: the entire concurrency model (mode-qualified isolation, prompt-mode sequentiality, registry scoping, the cancellation-fan-in argument) presupposes a single user session per extension instance. Searching `pi-integration-contract.md` finds no section that carries the citation either — PIC discusses `session_shutdown`, `ActiveInvocationRegistry`, and per-mode tool-registration plumbing on top of this premise, but never anchors the premise itself to a Pi surface (`ExtensionAPI`, `ExtensionContext`, `ExtensionRuntime`, or session-lifecycle docs).

This sub-finding installs the **citation anchor** that T22b and T22c both consume. It is the foundational fix in the T22 split.

## Spec Documents

- `docs/spec_topics/pi-integration-contract.md` — Host prerequisites (edited; one new sub-section added with stable anchor `#session-binding-contract`)
- `docs/spec.md` — Orientation > Session model (edited; opening sentence becomes a forward-link only)
- `docs/spec_topics/pi-integration.md` — read-only (cross-check whether session-lifecycle vocabulary lives here; do not duplicate)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None — the fix is a documentation/citation change. The H1 SDK surface-inventory test (`test/extension/pinned-surface.test.ts`) does not need to grow a new probe entry, because the single-active-session contract is a Pi-side lifecycle invariant rather than a probable named member; the citation lives in prose, not in the surface inventory.

## Consequence

**Severity:** advisory

A reader who tries to verify the Session-model paragraph against the pinned Pi SDK has nowhere to land — the load-bearing premise is unfalsifiable in the spec corpus as written. Implementation can still proceed because the V1 design (single extension instance, one `pi` reference captured by the factory, registry scoped to that instance) is internally consistent under the premise; the gap is a maintenance hazard. T22b (contingency) and T22c (bump-procedure step) both depend on this anchor existing before they can land coherently.

## Solution Space

**Shape:** single

### Recommendation

**Hard edit budget:** one new sub-section in PIC of ≤2 sentences plus the citation, plus the spec.md opening-sentence forward-link rewrite. No new MUSTs. No new test fixtures. No edits to `future-considerations.md` (owned by T22b) or to the version-bump procedure (owned by T22c).

1. **In `docs/spec_topics/pi-integration-contract.md`**, add a new sub-section titled "Session-binding contract" with stable HTML anchor `<a id="session-binding-contract"></a>`, placed under Host prerequisites adjacent to the existing `ActiveInvocationRegistry` material. Body:

   > A Pi extension instance is bound to exactly one active user session at a time. Source of truth: `@mariozechner/pi-coding-agent ~0.72.1`, `docs/sdk.md` (extension lifecycle section), supplemented by the closed `SessionShutdownEvent['reason']` set already pinned in this document. If the SDK doc page is unavailable at audit time, the type-side anchor (`SessionShutdownEvent['reason']` being session-scoped, not process-scoped) stands as the corroborating source.

   Do not add any further prose, behavioural claim, or normative MUST under this sub-section. Downstream consumers (forward-link from `spec.md`, contingency in `future-considerations.md`, bump-procedure step) are owned by T22b and T22c respectively and are explicitly out of scope here.

2. **In `docs/spec.md` — Session-model paragraph**, replace the bare opening sentence "A Pi extension instance is bound to exactly one active user session at a time." with a forward-link: "A Pi extension instance is bound to exactly one active user session at a time, per [Pi Integration Contract — Session-binding contract](./spec_topics/pi-integration-contract.md#session-binding-contract)." No other `spec.md` edit (the closing sentence is owned by T22b).

Edge cases the implementer must watch:

- The citation chain must terminate at a Pi-side artefact (named SDK doc page or pinned type symbol), not loop back into the loom spec corpus.
- If the SDK doc page on inspection turns out to say "typically bound to one session" rather than guaranteeing it, downgrade the spec assertion accordingly under this finding rather than over-claiming. The contingency in T22b becomes load-bearing today, not hypothetical, in that case — note it in this finding's fix Notes so T22b's later run knows.
- Do not pre-install hooks for T22b or T22c (no Future-Considerations cross-link, no bump-procedure item). Those are deliberately out of scope to keep this finding's edit surface bounded.

## Relationships

- T22b "Multi-session contingency response is unspecified in Future Considerations" — must-follow (T22b's cross-link targets `#session-binding-contract` installed here).
- T22c "Pi version-bump procedure has no step for the session-binding contract" — must-follow (T22c's checklist item references `#session-binding-contract` installed here).
- T23 "Pi's per-session slash-handler serialisation is asserted without a verifiable Pi source" — co-resolve (same Session-model paragraph, same uncited-Pi-fact pattern; T23's citation should land in the same PIC sub-section in one edit pass if both findings are fixed close in time).
- T34 "Trust-boundary 'no privilege facet' claim is asserted but not gated by any audit the spec cites" — same-cluster (same uncited-Pi-internals pattern).
- T21 "Pi-side slash-handler promise lifecycle taken as given" — same-cluster.
- T36 "`SessionShutdownEvent.reason` closed set has no build-time pin against the SDK type" — same-cluster (same diff-audit-on-pin-bump remedy).
- T15c "Lift Session-model scope deferrals into Non-goals (V1) section" — must-precede (T15c's extraction of the 'concurrent user sessions … out of scope' sentence interacts with the forward-link this finding installs on the opening sentence).

---

## Tally — parked findings by criterion

| Criterion | Count | Finding IDs |
|-----------|-------|-------------|
| 1 — Bimodal obligation | 0 | — |
| 2 — Authority-paragraph with inline enumeration | 0 | — |
| 3 — Composite spec edits across 3+ files without dependency graph | 0 | — |
| 4 — Verbatim-source-citation pattern | 1 | T22a |
| 5 — Transient Note / forward-reference to in-flight findings | 0 | — |
| **Total parked** | **1** | **T22a** |

**Note on T22b and T22c:** These siblings remain in `spec-review.md` but are blocked pending T22a's resolution (both have `T22a — must-precede` in their Relationships). Do not queue T22b or T22c until T22a has been reshaped, resolved, and its `#session-binding-contract` anchor is in place.

**Borderline calls reviewed and kept in spec-review.md:**

- **T21** (Pi-side slash-handler promise lifecycle) — adds a new paragraph to PIC Cancellation source that includes behavioral MAY clauses referencing `pi.sendMessage` and `ExtensionCommandContext`. Reviewed against criterion 2 (authority-paragraph with inline enumeration): the paragraph does not enumerate discrete surfaces or files in the T60 sense; it makes sequential behavioral guarantees about one lifecycle scenario. Lens expansion risk is judged bounded (each potential finding reduces or clarifies existing text rather than adding new enumeration). Kept.
- **T20** (Resource exhaustion disclaimer) — replaces an existing parenthetical with a 3-category enumeration in `implementation-notes.md`. The categories are resource-exhaustion classes (heap, descriptors, rate-limit), not named spec surfaces. Single-file edit. Kept.
- **T22b** (multi-session contingency) and **T22c** (version-bump procedure step) — simple targeted edits (one appended sentence + one forward-link rewrite; one checklist item addition). Both clean. Both blocked by T22a but not themselves reshape-prone.
