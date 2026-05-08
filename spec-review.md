# Triaged Spec Review — spec.md

_Generated: 2026-05-07T17:37:47Z_
_Spec: spec.md_
_Process: bottom-up — the last finding (T28) is addressed first; the first finding (T01) is addressed last._

_Triage tally: 0 high, 1 medium retained; 10 low discarded; 0 low findings merged into 0 medium findings; 19 nit dropped; 0 false dropped._

---

# T01 — Pre-Orientation prose: missing section heading, missing anchors, broken self-reference, and forward-link drift

**Original heading:** No section heading, no anchors, inline normative definitions, pre-evaluation list unfulfilled
**Original section:** spec.md — Pre-Orientation / Opening paragraphs
**Kind:** traceability, placement, error-model, completeness, consistency
**Importance:** medium
## Finding

The three paragraphs between the H1 (`# pi-loom — Extension Specification`) and the first second-level heading (`## Orientation`) carry the spec's executive framing: mode selection, the success / fail / cancelled trichotomy, the partial-append contract, the pre-evaluation-vs-evaluation boundary rule, the per-ceiling routing claim, the cancellation-signal source, and the `.loom` / `.warp` file-extension grammar. None of this prose lives under a named section, and no paragraph (or bold-italic label such as *Session model.*) carries an `<a id="…">` anchor. Other spec pages and downstream tests have no stable target to cite when they need to refer to material that is, in practice, the spec's introduction.

The paragraph that begins "Loom evaluation produces one of three terminal outcomes" contains an internal cross-reference — `(see ceiling #3 in *Hard ceilings* and the pre-evaluation failure list later in this paragraph)` — that promises a list that the paragraph never delivers. The only further sentence in that paragraph is a single forward-link to `errors-and-results.md#terminal-outcomes`. A reader who follows the self-reference looking for an enumeration will find none. The plan corpus already names this prose ("`spec.md`'s introduction (the prose between the H1 title and the `## Orientation` header)" — see H6's link-rewrite gate), confirming that the absence of a heading is felt elsewhere in the corpus, not just in the prose itself.

Per [`governance.md` GOV-12](spec_topics/governance.md), `spec.md` is informative orientation and every obligation it appears to state is owned by a forward-linked topic page. The introduction's restatements (the trichotomy, the partial-append contract, the pre-evaluation boundary rule, the per-ceiling routing claim) therefore are not normatively load-bearing — but GOV-12 also commits the spec to maintain the aggregator paragraphs in lock-step with their source pages, and the lack of anchors makes every such restatement a free-floating piece of prose that can drift from its owning page without any specific target a reviewer or tooling gate can pin down. The combined effect is navigational: an unanchored, unnamed introduction with one self-reference that resolves to nothing.

## Spec Documents

- `spec.md` — Pre-Orientation prose (paragraphs between H1 and `## Orientation`) (edited)
- `spec_topics/governance.md` — GOV-12 *(`spec.md` aggregator paragraphs are informative)* (read-only — establishes that the introduction's restatements are aggregator orientation, not duplicate normative text)
- `spec_topics/errors-and-results.md` — Terminal outcomes / pre-evaluation failures owner page (read-only — replacement target for the broken self-reference)

## Plan Impact

**Phases:** Horizontal H6

**Leaves (implementation order):**

- H6 — REQ-ID anchor insertion and coverage-matrix re-pivot — (modified)

H6 already rewrites every cross-link in "`spec.md`'s introduction (the prose between the H1 title and the `## Orientation` header)" to retarget non-narrative pages at their per-rule `#prefix-n` anchors, and its closing gate greps that same span. If a `## Overview` heading is inserted ahead of the introduction prose, H6's gate prose ("between the H1 title and the `## Orientation` header") must be amended to reflect the new boundary (between the H1 title and the `## Orientation` header *with* the new `## Overview` section in scope). Adding `<a id>` anchors inside the introduction does not affect H6's gate; it only adds new link-targets that other pages may use.

## Consequence

**Severity:** advisory

Other spec pages and tests cannot deep-link into the introduction; cross-page references must use prose paraphrase rather than a stable anchor. The "pre-evaluation failure list later in this paragraph" self-reference resolves to nothing, leaving a reader who follows it briefly stranded. None of this blocks implementation — by GOV-12 the prose is informative — but it degrades the navigational and traceability properties the rest of the corpus relies on.

## Solution Space

**Shape:** single

### Recommendation

Apply three edits to the pre-orientation prose:

1. **Insert a section heading.** Add `## Overview` (with `<a id="overview"></a>` immediately above it, per the GOV-1 dual-form convention used elsewhere in the corpus) directly after the H1, so the introduction prose lives under a named, anchored section. Keep the prose itself unchanged in placement.

2. **Anchor the load-bearing labels inside the introduction.** Add `<a id="…">` markers immediately before the bold-italic labels and structurally significant sentences that downstream pages or tests are likely to cite — at minimum: `<a id="terminal-outcomes-aggregator"></a>` before "Loom evaluation produces one of three terminal outcomes", `<a id="file-extension-grammar"></a>` before "A loom is stored in one of two file extensions", and `<a id="session-model"></a>` before the *Session model.* paragraph (this third anchor is also called for by the related "Session model paragraph has no stable HTML anchor" finding and should be made in the same edit). Anchor names use the same kebab-case convention as the existing `hard-runtime-ceilings` anchor.

3. **Repair the broken self-reference.** Replace the parenthetical `(see ceiling #3 in *Hard ceilings* and the pre-evaluation failure list later in this paragraph)` with `(see ceiling #3 in [Hard ceilings](#hard-runtime-ceilings) and [Errors and Results — Terminal outcomes](./spec_topics/errors-and-results.md#terminal-outcomes) for the closed pre-evaluation failure enumeration)`. Do not inline the list in `spec.md`: the aggregator-vs-source lock-step rule (GOV-12) and the H6 gate that bars introduction links from targeting non-prefix anchors on non-narrative pages both prefer a forward-link to a per-rule anchor over a duplicated enumeration. After H6 lands, retarget the `errors-and-results.md` link at the most specific `EAR-N` (or equivalent) REQ-ID anchor for the pre-evaluation enumeration rule.

Edge cases the implementer must watch:

- The H6 gate prose ("between the H1 title and the `## Orientation` header") must be amended to include the new `## Overview` section, or the gate's grep window must be widened to "between the H1 title and the `## Orientation` header (inclusive of any intervening section headings)". Pick whichever the gate's actual implementation supports.
- The new anchors must use the GOV-1 HTML form (`<a id="…"></a>`) rather than ATX-heading auto-slugs, because they sit on prose paragraphs and bold-italic labels, not on headings.
- Do not re-introduce a numbered list inside the parenthetical; that would re-create the aggregator-vs-source drift risk GOV-12 calls out.

## Relationships

- T21 "Hard ceilings block does load-bearing definitional work inside informative orientation" — same-cluster (if the Hard ceilings block is extracted into its own top-level section, the `#hard-runtime-ceilings` anchor target in recommendation step 3 must be updated to follow it)

