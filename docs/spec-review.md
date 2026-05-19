# Triaged Spec Review — spec.md

_Generated: 2026-05-08T09:00:00Z_
_Spec: docs/spec.md_
_Process: bottom-up — the last finding in the file is addressed first; the first finding is addressed last._

# T02 — Subagent state-isolation enumeration duplicates PIC matrix in Overview opening paragraph

**Kind:** placement
**Importance:** medium
**Shape:** single
**State:** reduced

## Problem

The second paragraph of `docs/spec.md`'s `## Overview` section embeds an inline parenthetical enumerating the per-axis subagent state-isolation contract (what the spawned session inherits from the loom's frontmatter, what is forwarded from the caller's `ExtensionCommandContext`, and what is not inherited). The same sentence already forward-links to the **Subagent state-isolation matrix** at `docs/spec_topics/pi-integration-contract.md#subagent-state-isolation-matrix`, which is the canonical owner of that enumeration. Restating the axes in the Overview duplicates owner-page content in an aggregator (against the aggregator-vs-source convention in `docs/spec_topics/governance.md` GOV-12) and creates a stale-reference risk whenever the matrix's column membership changes.

## Solution approach

Delete the inline per-axis parenthetical (the em-dashed clause beginning "— what the spawned session inherits from the loom's frontmatter ...") from the second sentence of `## Overview` in `docs/spec.md`. The sentence's forward-link to `#subagent-state-isolation-matrix` and its forward-link to `./spec_topics/glossary.md` for the `callable set` definition are both retained; the `#subagent-state-isolation-matrix` anchor target is unchanged.

## Solution constraints

- Do not migrate the deleted axis names into `pi-integration-contract.md` — the matrix at `#subagent-state-isolation-matrix` is the canonical owner; restating them as PIC prose would re-create the duplication this finding fixes.
- Out of scope: the `<a id="terminal-outcomes-aggregator">` paragraph that immediately follows is owned by T26.

## Relationships

- T15a "Reduce Session-model Orientation paragraph to a four-sentence forward-linking bullet" — same-cluster (broader pattern of misplaced detail in the Overview/Orientation prose).
- T26 "Terminal-outcomes paragraph in Overview restates routing taxonomy owned by Errors and Results" — same-cluster (sibling Overview placement issue).
