# Triaged Spec Review - spec

_Generated: 2026-05-27T11:30:00Z_
_Spec: docs/spec.md_
_Process: bottom-up - the last finding (T20) is addressed first; the first finding (T04) is addressed last._

---

# T04 - V1 non-goals heading + anchor rename in lock-step with T17

**Original heading:** Orientation → V1 non-goals (`v1-non-goals` paragraph and closing paragraph)
**Original section:** `docs/spec.md`
**Kind:** cross-spec-consistency-broad
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

`docs/spec.md` carries a `### V1 non-goals` heading anchored at `<a id="v1-non-goals">`. T17 retires the spec-corpus `V1` token (Option A — rename to `loom 1.0` / `loom 1.x`); the chosen rename applies to this heading and its anchor. If T17 lands without touching this heading the spec carries a mixed-vocabulary surface; if this heading renames in isolation the inbound `#v1-non-goals` citations from `docs/spec_topics/future-considerations.md` and the sibling Orientation prose break. The two edits must ship together.

## Solution approach

In the same commit that resolves T17, rename the `### V1 non-goals` heading and its `<a id="v1-non-goals">` anchor in `docs/spec.md` to the replacement token T17's chosen option selects (under T17 Option A: `### loom 1.0 non-goals` and `<a id="loom-1-0-non-goals">`). Enumerate the anchor redirect in the same commit per GOV-8's anchor-stability convention so inbound `#v1-non-goals` citations from `future-considerations.md` and the surrounding Orientation prose keep resolving.

## Solution constraints

- The token chosen for the heading and anchor MUST match the token T17 selects; no independent decision on the rename target is made here.
- Out of scope: the wider Orientation prose cleanup originally bundled in this finding (Source-language stability redundant sentence, `sm-anchor-scheme-stability` paragraph relocation, V1 non-goals per-item-anchor decomposition, V1 non-goals closing governance-prose trim). Those edits were dropped from the working set.

## Relationships

- T17 "`V1` denotes two different things across the spec/plan boundary" — co-resolve (the V1 non-goals heading and `#v1-non-goals` anchor must rename in the same commit as T17's V1-rename pass; the token chosen there determines the heading and anchor text here)

---

# T15 - Plan CI gate's "non-dense per-page numbering" rule contradicts GOV-8

**Kind:** doc-alignment-broad
**Importance:** high
**Shape:** single
**State:** reduced

## Problem

`docs/plan_topics/conventions.md`'s "REQ-ID discipline" bullet lists "a non-dense per-page numbering" as one of three V1.0 closing-gate CI failures. Read literally, this forbids any gap in the per-page live REQ-ID sequence — but GOV-8 on `docs/spec_topics/governance.md` deliberately produces such gaps via *Split*, *Merge*, and *Deletion* retirements, and the *Retired REQ-IDs* sub-table on `governance.md` already records four holes in the `GOV` sequence (`GOV-2`, `GOV-10`, `GOV-11`, `GOV-13`). An implementer wiring the literal check would fail the gate on every correctly-retired page, and a contributor "fixing" the spec to satisfy the gate would have to collapse IDs in violation of GOV-8 *Deletion*'s no-reuse rule.

## Solution approach

Rewrite the third closing-gate failure clause in the "REQ-ID discipline" bullet of `docs/plan_topics/conventions.md` to pin the densenes check to the per-prefix live-plus-retired union: the failure mode is a positive integer `n ≤ max(live ∪ retired)` for a page's prefix whose `n` appears in neither the live REQ-ID table nor the *Retired REQ-IDs* sub-table.

## Solution constraints

- The rewording MUST cover GOV-16 inline-label prefixes (whose retirements live in a parallel `## Retired inline labels` section per GOV-16 *Retirement section*), not only GOV-8 REQ-IDs — `hard-ceilings.md` owns the inline-label prefixes `HC3` and `NOCEIL` in V1 and the gate runs against that page.

## Relationships

- T16 "Plan-corpus cites retired GOV-10 and GOV-11 as live normative anchors" — same-cluster (both edit `conventions.md`; resolve independently, but a single PR can carry both edits)
# T16 - Plan-corpus cites retired GOV-10 and GOV-11 as live normative anchors

**Kind:** doc-alignment-broad
**Importance:** high
**Score:** 100
**Must-fix:** true
**Shape:** single
**State:** reduced

## Problem

`docs/plan_topics/conventions.md` (the "Leaf format → **Spec.**" bullet) and `docs/plan_topics/leaf-template.md` (the **Spec.** paragraph) carry MAY / MUST obligations cited as `per [`governance.md` GOV-10]` and `per [`governance.md` GOV-11]`. Both IDs are retired in `docs/spec_topics/governance.md`: GOV-10 and GOV-11 fail GOV-18's arm-(a)/arm-(b) binding-scope test (they bind downstream plan-corpus artefacts, not the spec corpus or the implementation target) and the retirement registry stubs them with HTML-comment markers at their original sites. A contributor following either link lands on a retirement stub asserting the rule no longer binds anyone — plan prose asserts the obligation, the cited anchor denies it. The underlying intents (restrict a leaf's reading scope to its listed pages; close the `**Spec**` field under normative cross-link) remain valid as plan-side conventions, which is precisely why GOV-18 ruled them out as spec rules.

## Solution approach

At both call sites, delete the `per [`governance.md` GOV-10]` and `per [`governance.md` GOV-11]` parenthetical citations and restate the MAY and MUST as self-contained plan-corpus conventions. Retain the live `[`governance.md` GOV-3]` citation that governs the narrative-vs-normative cross-link exclusion inside the closure rule.

## Solution constraints

- Do not add new GOV-NN anchors on the spec side for either retired rule — doing so would re-introduce the GOV-18 binding-scope violation that motivated the retirement.
- Out of scope: `docs/spec_topics/governance.md` (the GOV-10 / GOV-11 retirement registry rows and the GOV-18 worked examples are already correct).

## Relationships

- T15 "Plan CI gate's `non-dense per-page numbering` rule contradicts GOV-8" — same-cluster (same surface — `conventions.md`'s cross-references to `governance.md` — but resolves independently)
# T17 - Rename `V1` -> `loom 1.0` across the spec corpus

**Original heading:** Cross-spec — `V1` terminology collision with the plan corpus
**Original section:** `docs/spec.md`
**Kind:** cross-spec-consistency-broad
**Importance:** high
**Score:** 100
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

`docs/spec.md` and `docs/spec_topics/*.md` use `V1` / `V1.0` / `V1.x` as the loom-language release name (~317 occurrences across the spec corpus; 13 in `spec.md`; 15 `> **V1 seam — …` blockquote labels; 10 `<a id="v1-…">` HTML anchors). `docs/plan_topics/conventions.md:9` reserves `H1`–`Hn`, `M`, and `V1`–`Vn` for plan-phase IDs and forbids reusing them for the release meaning: *"when plan prose needs to refer to the initial release of the loom language, write 'loom 1.0' or 'the initial release'; never reuse a plan ID for that meaning."* Same token, two meanings.

The plan-side rule already slips: `conventions.md:37` and `:43` write "V1.0 closing gate" (release meaning); `plan.md:11` writes "V1.0 release gate". A contributor reading SM-7d ("V1 no-cap / no-scheduler disposition") cannot tell whether the constraint is a release-line disposition or a leaf-phase scope. `README.md` lines 28–35 park the debt as a "deferred mechanical sweep" pointing at `docs/spec-sweeps.md` — that file does not exist in the tree, so the debt is currently untracked.

## Solution approach

Rename `V1` -> `loom 1.0`, `V1.0` -> `loom 1.0`, `V1.x` -> `loom 1.x` in the spec corpus, per the plan-side phrasing at `conventions.md:9` (which stays in force as the canonical rule for plan-phase IDs). Ship as one coordinated commit; anchor renames and inbound link rewrites land in the same commit per GOV-8.

### Sites — spec corpus prose

**`docs/spec.md`** (13 V1 occurrences). Rewrite `V1` / `V1.0` / `V1.x` in prose at lines 40, 44, 46, 68, 70, 78, 80, 82, 86, 100, 102, 150. Line 97 anchor and line 98 heading `### V1 non-goals` are owned by T04 (co-resolve).

**`docs/spec_topics/`** — 27 files, ~304 occurrences total. Rewrite V1 / V1.0 / V1.x in prose and rename every `> **V1 seam — <name>.**` blockquote label to `> **loom 1.0 seam — <name>.**`. Per-file occurrence counts (seam-label line numbers in parentheses):

- `binder.md` (10 occurrences; seam labels at :29, :106)
- `bindings.md` (2)
- `cancellation.md` (2)
- `control-flow.md` (1)
- `descriptions.md` (1)
- `diagnostics.md` (31)
- `discovery.md` (7)
- `errors-and-results.md` (14; seam label at :160)
- `expressions.md` (5)
- `frontmatter.md` (11; seam label at :135)
- `functions.md` (1)
- `future-considerations.md` (58; narrative seam reference at :65)
- `glossary.md` (3)
- `governance.md` (8)
- `hard-ceilings.md` (14)
- `implementation-notes.md` (4)
- `imports.md` (4; seam label at :22)
- `invocation.md` (8; seam labels at :14, :38, :40)
- `lexical.md` (1)
- `pi-integration-contract.md` (96; seam labels at :246, :250, :724)
- `query.md` (10; seam labels at :273, :295)
- `runtime-value-model.md` (2)
- `schema-subset.md` (1)
- `schemas.md` (2)
- `slash-invocation.md` (2)
- `tool-calls.md` (5; seam label at :40)
- `type-system.md` (2)

### Sites — HTML anchor renames (10 anchors)

Each `<a id="v1-…">` is rewritten to `<a id="loom-1-0-…">` and enumerated in the commit per GOV-8 anchor-stability convention:

- `docs/spec.md:97` — `v1-non-goals` -> `loom-1-0-non-goals` (T04 co-resolve)
- `docs/spec_topics/binder.md:106` — `v1-seam-binder-refinement-loop` -> `loom-1-0-seam-binder-refinement-loop`
- `docs/spec_topics/errors-and-results.md:160` — `v1-seam-discriminator-type-openness` -> `loom-1-0-seam-discriminator-type-openness`
- `docs/spec_topics/frontmatter.md:135` — `v1-seam-system-expression-sublanguage` -> `loom-1-0-seam-system-expression-sublanguage`
- `docs/spec_topics/future-considerations.md:96` — `v1-non-goals` -> `loom-1-0-non-goals`
- `docs/spec_topics/imports.md:22` — `v1-seam-resolver-interface` -> `loom-1-0-seam-resolver-interface`
- `docs/spec_topics/invocation.md:14` — `v1-seam-symlink-resolution-hardening` -> `loom-1-0-seam-symlink-resolution-hardening`
- `docs/spec_topics/pi-integration-contract.md:246` — `v1-seam-mid-loom-user-session-replacement` -> `loom-1-0-seam-mid-loom-user-session-replacement`
- `docs/spec_topics/pi-integration-contract.md:250` — `v1-seam-typed-query-supported-provider-set` -> `loom-1-0-seam-typed-query-supported-provider-set`
- `docs/spec_topics/pi-integration-contract.md:724` — `v1-seam-pi-owned-subagents-collision-source-set` -> `loom-1-0-seam-pi-owned-subagents-collision-source-set`
- `docs/spec_topics/query.md:295` — `v1-seam-pre-flight-token-nullability` -> `loom-1-0-seam-pre-flight-token-nullability`

### Sites — inbound fragment-link rewrites

Every `#v1-non-goals` and `#v1-seam-…` fragment-link citation in the spec corpus must repoint to the new anchor in the same commit. Before commit, grep:

```
grep -rn '#v1-non-goals\|#v1-seam-' docs/
```

and rewrite each hit. The largest concentration is `future-considerations.md` (Surface-extensions inventory cross-links each seam by `#v1-seam-…` fragment).

### Sites — plan corpus slip fixes

- `docs/plan.md:11` — "V1.0 release gate" -> "loom 1.0 release gate"
- `docs/plan_topics/conventions.md:37` — "V1.0 closing gate" -> "loom 1.0 closing gate"
- `docs/plan_topics/conventions.md:43` — "V1.0 closing gate" -> "loom 1.0 closing gate"

`docs/plan_topics/conventions.md:9` (the reservation rule itself) stays unchanged.

### Sites — README parking pointer

- `README.md` lines 28–35 — Rewrite the parking-pointer paragraph: remove the `"V1" terminology disambiguation across the spec corpus` mention from the deferred-mechanical-sweeps list. If the companion *load-bearing* qualifier rewrite is the only remaining sweep, simplify the paragraph to reference only that. If no remaining sweeps exist, delete the `docs/spec-sweeps.md` link entirely (the file does not exist in the tree and is not created here).

### Out-of-scope tokens that look like `V1` but stay

- Pi SDK version literals (`~0.74.1`, `0.75.5`, etc.) — these are Pi-side `peerDependencies` versions, not loom versions.
- Node version literals (`>= 20.6.0`, `>= 22.19.0`) — owned by T19; not loom-version tokens.
- Diagnostic codes (`loom/parse/non-string-enum-value` etc.) — opaque tokens; do not pattern-match.
- Inline labels `SM-N`, `HC-N`, `NOCEIL-N` — opaque page-local identifiers; only the prose attached (e.g. SM-7d's "V1 no-cap / no-scheduler disposition") rewrites to "loom 1.0 no-cap / no-scheduler disposition".
- `docs/plan_topics/leaf-template.md` and `.pi/project-config.md` carry the plan-phase `V1`–`Vn` reservation surface and are NOT edited under this finding.

## Solution constraints

- Co-resolve with T04: the `### V1 non-goals` heading and `#v1-non-goals` anchor in `docs/spec.md` rename in the same commit; the token chosen here (`loom 1.0`) dictates T04's rewrite.
- GOV-8 anchor-stability convention: every renamed anchor MUST be enumerated in the same commit so reviewers can trace pre-rename inbound links. Either add aliasing `<a id="v1-…">` stubs at the new sites or document the redirects in a single appendix; do not silently drop the pre-rename anchor.
- Out of scope: the plan-phase `V1`–`Vn` reservation surface (Option B considered and rejected — plan rule predates spec text; leaving spec V1 prose in place would perpetuate the documented slip pattern).
- Out of scope: the *load-bearing* qualifier rewrite parked alongside this debt in `README.md`. Separate sweep with its own scope decision.

## Relationships

- T04 "V1 non-goals heading + anchor rename in lock-step with T17" — co-resolve (the V1 non-goals heading and `#v1-non-goals` anchor in `docs/spec.md` must rename in the same commit as this finding's V1-rename pass; the token chosen here (`loom 1.0`) dictates T04's rewrite)
- T18 "`CompactOptions`/`CompactionResult` line-number citation" — same-cluster (the SDK references migrate from `@mariozechner/*` package paths in the same coordinated bump; resolves independently)

