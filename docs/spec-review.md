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

The previous fix attempt (2026-05-27, parked) showed that a pure mechanical rename leaves two dangling normative invariants the lens corpus correctly raises: (a) the renamed token `loom 1.0` is overloaded — it names both the 1.0.0 frozen-baseline release (e.g. GOV-15's "loads cleanly under <baseline>", the *Ceiling-set carve-out* "closed at <baseline>", the PIC `Re-validation gate` carve-out) and the design scope of the 1.x line (e.g. "<major-line> targets Node exclusively", the `loom-1-0-non-goals` aggregator); (b) the dual `<a id="loom-1-0-…">` + `<a id="v1-…">` anchor pattern introduced by GOV-8 anchor-stability has no canonicality rule for new citations and no defined lifecycle under future GOV-8 *Split* / *Retire* / *Rename* operations. The constraints below pre-empt those lens findings so the fixer authors against them on pass 1 rather than reactively on pass 4.

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

### Sites — companion mechanical sweep folded in (carry-over)

The 2026-05-27 parked run accumulated two additional mechanical sweeps the lens corpus flagged on pass 1. They are folded into this finding so they land in the same commit:

- **`V2` → `loom 2.0` sweep.** `docs/spec_topics/governance.md` §"Ceiling-set carve-out" and §"Operational definitions"; `docs/spec_topics/future-considerations.md` no-formal-migration-mechanism bullet; any other `V2` callsite under `docs/spec_topics/` whose context is loom-release naming (not a Pi SDK or Node version literal). Rewrite to `loom 2.0` for uniformity with the `V1` → `loom 1.0` scheme. The spec corpus uses a single uniform release-version naming scheme post-fix.
- **`Tooling deferrals` anchor alias.** `docs/spec_topics/future-considerations.md` §"Tooling deferrals (no loom 1.0 impact)" MUST carry an `<a id="tooling-deferrals-no-v1-impact"></a>` alias immediately before the renamed heading so the inbound link from `docs/spec_topics/pi-integration-contract.md:125` keeps resolving. This is the standard GOV-8 alias pattern applied to one further heading the original site enumeration missed.

### Out-of-scope tokens that look like `V1` but stay

- Pi SDK version literals (`~0.74.1`, `0.75.5`, etc.) — these are Pi-side `peerDependencies` versions, not loom versions.
- Node version literals (`>= 20.6.0`, `>= 22.19.0`) — owned by T19; not loom-version tokens.
- Diagnostic codes (`loom/parse/non-string-enum-value` etc.) — opaque tokens; do not pattern-match.
- Inline labels `SM-N`, `HC-N`, `NOCEIL-N` — opaque page-local identifiers; only the prose attached (e.g. SM-7d's "V1 no-cap / no-scheduler disposition") rewrites to "loom 1.0 no-cap / no-scheduler disposition".
- `docs/plan_topics/leaf-template.md` and `.pi/project-config.md` carry the plan-phase `V1`–`Vn` reservation surface and are NOT edited under this finding.

## Solution constraints

### Cluster-coordination constraints

- Co-resolve with T04: the `### V1 non-goals` heading and `#v1-non-goals` anchor in `docs/spec.md` rename in the same commit; the token chosen here (`loom 1.0`) dictates T04's rewrite.

### Mechanical-rename and anchor-stability constraints

- GOV-8 anchor-stability convention: every renamed anchor MUST be enumerated in the same commit so reviewers can trace pre-rename inbound links. Either add aliasing `<a id="v1-…">` stubs at the new sites or document the redirects in a single appendix; do not silently drop the pre-rename anchor.
- The companion `V2` → `loom 2.0` sweep listed in *Sites — companion mechanical sweep folded in* MUST land in the same commit as the `V1` → `loom 1.0` rename; the post-fix spec corpus MUST use a single uniform release-version naming scheme with no bare `V<N>` token used as a loom release name anywhere under `docs/spec_topics/`.

### Critique-anticipation constraints (folded in from the 2026-05-27 parked run's accumulated lens findings)

These pre-state what the post-fix spec corpus must satisfy so the fixer authors against them on pass 1 rather than reacting to lens findings against partial work. Each item is sourced from a lens finding raised against the parked run; the citation in parentheses identifies the lens and the accumulated-constraints entry it derives from.

- **Sense disambiguation between the two `loom 1.0` referents (spec-lens-assumptions; C4 + C6).** The spec corpus MUST disambiguate the two senses of the renamed `loom 1.0` token — the 1.0.0 frozen-baseline sense (GOV-15's "loads cleanly under <baseline>", the *Ceiling-set carve-out* "closed at <baseline>" phrasing, the PIC `Re-validation gate` carve-out) versus the design-scope sense of the entire 1.x line (e.g. "<major-line> targets Node exclusively", "out of <major-line> scope", the `loom-1-0-non-goals` aggregator). Disambiguation MUST be lexical: introduce `loom 1.0.0` as the distinct baseline spelling at every callsite that pins the frozen-release sense, leaving bare `loom 1.0` for the design-scope sense. The fixer MUST perform a per-callsite sense audit and apply the lexical distinction site-by-site. No convention paragraph is authored to "delegate disambiguation to surrounding prose" — that path was the parked run's testability blocker (C9) and is forbidden.
- **Dual-anchor convention placement and shape (spec-lens-assumptions + spec-lens-traceability; C5 + C7 + C10).** If a convention paragraph governing the `loom-1-0-*` / `v1-*` dual-anchor pattern is authored, it MUST be sited under GOV-8 (anchor lifecycle), NOT under GOV-15 (release process). The paragraph MUST: (i) name `loom-1-0-*` as the canonical arm for new cross-references, (ii) state explicitly that `v1-*` is a permanent back-compat alias (not a deprecated arm), (iii) define "dual-anchored heading" intensionally — *any heading where both `<a id="v1-…">` and `<a id="loom-1-0-…">` anchors co-occur in the spec corpus* — and NOT by enumerated page-list, (iv) pin the convention with a stable `<a id>` and give each independently-falsifiable sub-obligation its own per-obligation `<a id>`. Authoring the convention is OPTIONAL — the dangling invariant can also be resolved by leaving the dual-anchor pattern as a pure GOV-8 anchor-stability enumeration and not authoring any convention paragraph at all. If authored, the constraints above bind; if not authored, the fixer MUST verify that GOV-7 *Rename* and GOV-8 *Split* / *Retire* operations as written cover the dual-anchored case without addition.
- **Mechanically-checkable MUSTs only (spec-lens-testability; C9).** Any `MUST` clause introduced by this fix MUST either name a mechanically-checkable witness predicate (e.g. a grep-able pattern, a build-time literal-read test on the same terms as GOV-3's *Unknown-prefix closure invariant*, or a CI gate criterion) OR be authored as `SHOULD` instead. Undecidable `MUST preserve` clauses (e.g. "MUST preserve sense classification" with no extractor) are forbidden — the parked run's pass-10 testability blocker was raised against exactly this shape and any recurrence will block again.
- **Per-paragraph and per-sub-obligation anchors on net-new normative prose (spec-lens-traceability; C10).** Any new normative paragraph authored under this fix MUST carry a stable `<a id="...">` so subsequent cross-references can cite it unambiguously. Each independently-falsifiable sub-obligation within a paragraph (e.g. each numbered clause of the dual-anchor convention if authored) MUST also carry its own per-obligation `<a id>`. Anchorless normative paragraphs introduced into `governance.md` are forbidden.
- **Glossary registration of `loom <version>` token sense (spec-lens-consistency; C3).** `docs/spec_topics/glossary.md` MUST register the `loom <version>` use of the bare token `loom` (where `<version>` is a `loom 1.0` / `loom 1.x` / `loom 1.0.0` / `loom 2.0` form) as a licensed sense alongside the existing file-unit sense, OR document a disambiguation rule that distinguishes the version-suffixed use from the file-unit use. The registration is a one-bullet edit to the glossary's existing sense table; no new section is authored.
- **Retirement-audit witness for dual-anchor `v1-*` retirement (spec-lens-assumptions; C8).** If clause (iv) of the dual-anchor convention is authored permitting `v1-*` arm retirement, the clause MUST name a concrete witness extractor for the "no inbound `#v1-...` link remains in the spec corpus" predicate (e.g. `grep -r '#v1-' docs/ | wc -l == 0`), OR MUST defer the retirement audit to GOV-7 *Rename* unmodified. A permission predicate without a named discharge instrument is forbidden.

### Cluster-internal out-of-scope constraints

- Out of scope: the plan-phase `V1`–`Vn` reservation surface (Option B considered and rejected — plan rule predates spec text; leaving spec V1 prose in place would perpetuate the documented slip pattern). `docs/plan_topics/leaf-template.md` and `.pi/project-config.md` carry the canonical home of the plan-phase `V1` token reservation and are NOT edited under this finding.
- Out of scope: the *load-bearing* qualifier rewrite parked alongside this debt in `README.md`. Separate sweep with its own scope decision.

## Relationships

- T04 "V1 non-goals heading + anchor rename in lock-step with T17" — co-resolve (the V1 non-goals heading and `#v1-non-goals` anchor in `docs/spec.md` must rename in the same commit as this finding's V1-rename pass; the token chosen here (`loom 1.0`) dictates T04's rewrite)
