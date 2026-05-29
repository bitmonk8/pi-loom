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

## T17d - Heading-derived auto-id case: rename and explicit dual-anchor authoring

> **PARKED** — 2026-05-29
> **Reason:** Category 2 (fixer too-hard — capability gap in the fixer's narrowing mechanism; fix attempts systematically grow the raised-finding score). The inner spec-diff-fix-loop's surface-expansion detector (plan §Change C2) fired on two consecutive backtrack-and-exclude passes without converging: every fix the loop poisoned was followed by another fix whose application also triggered expansion. FIXCOUNTS: 1,0,3,5,1,4,3. SCORESUMS: 5,0,50,80,35,140,50 against S=15. Poisoned fixes: assumptions:01,placement:02,consistency:03,completeness:01. Snapshot refs retained at refs/loom/snapshots/2026-05-28T23-48-58_d5b792/* for forensic diffing. Loop notes: Phase-2 re-dispatch attempt 2 (status reported as surface-expansion-irrecoverable-cycle, a -cycle subkind of surface-expansion-irrecoverable; routes identically). Surface-expansion-irrecoverable on a single-site cycle confined to docs/spec_topics/governance.md §GOV-21: two consecutive backtrack-and-exclude events both triggered at pass 4 (Σ=80 then Σ=140) and neither recovered. CATEGORY 2 (fixer narrowing mechanism cannot converge on the GOV-21 text; no bimodal/two-site/multi-axis discriminator present). Snapshot refs retained under refs/loom/snapshots/2026-05-28T23-48-58_d5b792/ for forensics. Phase 2 generalization: outcome=converged-then-surface-expanded; attempts=1; axes=structural-shape-pin; peak-scoresums-trajectory=35,140; log=C:/UnitySrc/pi-loom/.pi/tmp/spec-fix-loop/2026-05-28T19-11-27_988901/_origin/_generalization-log.md. Widening regressed trajectory 4× by peak score: pre-widening (heading-only edit surface) peak=35 with constraint-contradiction-detected exit; post-widening (heading + display-name surface) peak=140 with surface-expansion-irrecoverable on GOV-21. Reshape required: re-narrow T17d to its original heading-only edit surface AND author missing T17a/T17e split point for display-name updates (or accept the original constraint-contradiction shape as the correct exit for T17d's surface as designed). A human must reshape this finding (split it into narrower pieces, demote MUSTs, or cap the prose the fix is allowed to add) before re-introducing it.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-28T17-46-50_881871/t17d-heading-derived-auto-id-case-rename-and-explicit-dual-anchor-authoring.md

# T17d - Heading-derived auto-id case: rename and explicit dual-anchor authoring

**Original heading:** Cross-spec — `V1` terminology collision with the plan corpus
**Original section:** `docs/spec.md`
**Kind:** cross-spec-consistency
**Importance:** medium
**Score:** 15
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

Four spec-corpus heading sites carry a `V1` token in the heading text. Under T17a's prose-rewrite scope, renaming these headings would shift their GitHub-rendered auto-id slugs from `v1-*` to `loom-1-0-*`, breaking any inbound `#v1-*` cross-reference whose target relies on the auto-id slug rather than an explicit `<a id>`. This finding combines the heading-text rename with explicit dual-anchor pair authoring so the rename and the back-compat preservation land atomically.

The four sites are:

- `docs/spec.md` — `### V1 non-goals`
- `docs/spec_topics/future-considerations.md` — `### V1 non-goals`
- `docs/spec_topics/future-considerations.md` — `## Tooling deferrals (no V1 impact)`
- `docs/spec_topics/future-considerations.md` — `## Surface extensions (V1 leaves a seam)`
- `docs/spec_topics/future-considerations.md` — `## Model-level changes (no V1 seam expected)`

(Five entries total; two of them are sibling `### V1 non-goals` headings on different pages.)

## Solution approach

For each of the five heading sites:

1. Rename the heading text in place: `V1` → `loom 1.0` (these are non-closure callsites per the GOV-20 closure heuristic — none of the surrounding heading bodies pin a closed enumeration).
2. Author an explicit `<a id="loom-1-0-…"></a><a id="v1-…"></a>` sibling pair on the source line immediately preceding the renamed heading, per [GOV-21 *Intensional definition*](./spec_topics/governance.md#gov-21-intensional-definition) class *at-heading explicit-pair-replacing-auto-id*. The slug derivation follows the GitHub auto-id rule: lowercase, hyphenate spaces, strip parens, `1.0` → `1-0`, applying it in-place to the post-rename heading text (canonical arm) and to the pre-rename heading text (alias arm) with no leading-token hoist and no token doubling. Examples:

   - `### loom 1.0 non-goals` → `<a id="loom-1-0-non-goals"></a><a id="v1-non-goals"></a>`
   - `## Tooling deferrals (no loom 1.0 impact)` → `<a id="tooling-deferrals-no-loom-1-0-impact"></a><a id="tooling-deferrals-no-v1-impact"></a>`
   - `## Surface extensions (loom 1.0 leaves a seam)` → `<a id="surface-extensions-loom-1-0-leaves-a-seam"></a><a id="surface-extensions-v1-leaves-a-seam"></a>`
   - `## Model-level changes (no loom 1.0 seam expected)` → `<a id="model-level-changes-no-loom-1-0-seam-expected"></a><a id="model-level-changes-no-v1-seam-expected"></a>`

3. The pre-rename auto-id slug (`v1-non-goals` etc.) is preserved by the explicit `<a id="v1-…">` arm.

4. In the same atomic commit, update every textual occurrence on the affected pages (`docs/spec.md` and `docs/spec_topics/future-considerations.md`) that *displays the name* of one of the five renamed headings — whether as a cross-reference link display text, an intro category-list / legend label that indexes a renamed heading, or an inline restatement of a renamed heading's name — so that each such occurrence presents the canonical `loom 1.0` spelling. This display-name update MUST be complete on each affected page: no occurrence that names a renamed heading may be left on the `V1` spelling, so that no intra-paragraph or cross-section `V1` / `loom 1.0` display-name split remains for the renamed headings. Folding these display-name updates into T17d (rather than deferring them) is what keeps the rename atomic; the licensed surface is bounded to occurrences that name a renamed heading, and does NOT extend to general narrative prose unrelated to the renamed heading names.

5. Link and fragment targets are NOT renamed. Every `#v1-…` fragment arm MUST remain untouched because it resolves via the permanent GOV-21 alias arm; only the human-readable display text changes. Where a cross-reference already targets a `#loom-1-0-…` or `#v1-…` anchor, the target is left exactly as the dual-anchor scheme resolves it.

Witness: after the rewrite, the five heading sites all carry an explicit `<a id="loom-1-0-…">` + `<a id="v1-…">` sibling pair and the heading text uses the canonical `loom 1.0` spelling; and every cross-reference display string, intro-legend label, and adjacent heading-name restatement on the affected pages that names a renamed heading reads `loom 1.0`, with all `#v1-…` fragment arms preserved.

## Solution constraints

- Each of the five heading sites MUST gain an explicit dual-anchor pair immediately before the renamed heading; the implicit GitHub auto-id is no longer relied on.
- The `v1-*` arm MUST be retained per GOV-21 *Alias permanence*.
- The five sites enumerated above are the complete set under this finding. Any newly-discovered heading site whose auto-id shifts under the V1 → loom 1.0 rename is treated as an extension of this finding's surface and addressed in the same commit.
- The pair authoring uses GOV-21 *Intensional definition*'s *at-heading explicit-pair-replacing-auto-id* placement class.

## Relationships

(none — depends only on commit 4a7afbf, which is landed)

---

## T17e - Inbound fragment-link `#v1-…` rewrite to canonical arm

> **PARKED** — 2026-05-29
> **Reason:** Cascaded from parking of T17d - Heading-derived auto-id case: rename and explicit dual-anchor authoring: this finding's ## Relationships block declares an ordering edge (must-precede or must-follow) on the parked finding, so its preconditions are no longer satisfied in spec-review.md.
> **Forensic report:** .pi/tmp/spec-fix-failure-forensics/2026-05-28T17-46-50_881871/t17d-heading-derived-auto-id-case-rename-and-explicit-dual-anchor-authoring.md

# T17e - Inbound fragment-link `#v1-…` rewrite to canonical arm

**Original heading:** Cross-spec — `V1` terminology collision with the plan corpus
**Original section:** `docs/spec.md`
**Kind:** cross-spec-consistency
**Importance:** medium
**Score:** 15
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

After T17c and T17d land, every `<a id="v1-…">` anchor in the spec corpus carries a sibling `<a id="loom-1-0-…">` (or `<a id="loom-1-0-0-…">`) canonical arm per [GOV-21 *Canonical arm*](./spec_topics/governance.md#gov-21-canonical-arm). Inbound cross-references in the spec corpus that cite the `v1-*` arm (e.g. `[label](path#v1-seam-binder-refinement-loop)`) still resolve correctly under [GOV-21 *Alias permanence*](./spec_topics/governance.md#gov-21-alias-permanence), but GOV-21's canonical-arm obligation says new cross-references MUST cite the `loom-1-0-*` arm. Existing inbound cross-references in the spec corpus that cite the `v1-*` arm should therefore be repointed to the canonical arm; the `v1-*` arm remains in place as a permanent back-compat alias.

## Solution approach

1. Enumerate inbound spec-corpus cross-references citing the `v1-*` arm:

   ```
   grep -rnE '#(v1-|tooling-deferrals-no-v1-impact|surface-extensions-v1-leaves-a-seam|model-level-changes-no-v1-seam-expected)' docs/spec.md docs/spec_topics/
   ```

2. For each hit, rewrite the fragment to its canonical-arm form: `#v1-foo` → `#loom-1-0-foo` (or `#loom-1-0-0-foo` for frozen-baseline anchors). The hyphen-conversion rule is mechanical (`v1-` prefix replaced with `loom-1-0-` prefix; the slug tail is unchanged).
3. Do NOT touch the target sites (the `<a id="v1-…">` anchors stay in place per GOV-21 alias permanence; T17c and T17d authored the `loom-1-0-*` sibling).

Witness: after the rewrite, `grep -rnE '#(v1-|tooling-deferrals-no-v1-impact|surface-extensions-v1-leaves-a-seam|model-level-changes-no-v1-seam-expected)' docs/spec.md docs/spec_topics/` returns no hits. Inbound cross-references from outside the spec corpus (e.g. `README.md`, `CHANGELOG.md`) are not in scope per [GOV-17](./spec_topics/governance.md#gov-17); GOV-21's *Cross-corpus scope* paragraph narrows to the spec corpus.

## Solution constraints

- Only cross-references in `docs/spec.md` and `docs/spec_topics/*.md` are in scope. Cross-corpus pages (`README.md`, `CHANGELOG.md`, plan corpus) are GOV-17 dependents and out of scope.
- The rewrite is mechanical token substitution at the fragment portion of the link only. The link text and target-file portion of the markdown link are unchanged.
- The `v1-*` target anchors MUST NOT be removed by this finding; per GOV-21 *Alias permanence* they are permanent back-compat aliases. Removal is governed by GOV-21 *Retirement discharge* and is out of scope here.

## Relationships

- T17c "HTML anchor dual-anchor authoring for `<a id="v1-…">` sites" — must-follow
- T17d "Heading-derived auto-id case: rename and explicit dual-anchor authoring" — must-follow
