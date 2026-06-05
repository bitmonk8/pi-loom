# pi-loom — Consolidated Spec Review (Parked)

_Parked findings: 1._

---

## T14 - Un-anchored normative obligations across `cancellation.md`

> **PARKED** — 2026-06-05
> **Reason:** Category 2 (fixer too-hard — capability gap; the fast `/spec-fix-findings-loop` fix coined `CNCL-4`..`CNCL-8` over the uppercase-MUST obligation sites with zero floor regressions but could not complete the full per-obligation sweep). The fast fix loop did not resolve the finding. Loop notes: finding not resolved by fast fix (partial — fast fix coined CNCL-4..8 over uppercase-MUST sites with zero floor regressions, but obligation sites "listener cleanup is mandatory", the "must not retroactively rewrite a completed Ok" race rule, and the Propagation/Granularity/no-top-level-synthesis/Surfacing sites remain un-anchored)
> **Forensic report:** none (fast loop — no forensic report)

# T14 - Un-anchored normative obligations across `cancellation.md`

**Kind:** traceability
**Importance:** medium
**Score:** 35
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

`cancellation.md` coins only three `CNCL-N` anchors (`CNCL-1`, `CNCL-2`, `CNCL-3`), all on the three sub-clauses of the late-settlement discard rule. The remaining sections from **Signal source** through **Surfacing** carry a substantial body of normative MUST / MUST NOT obligations that have never been coined as REQ-IDs and can therefore be cited only by section heading plus quoted prose. GOV-22 mandates progressive coinage of un-anchored obligations so that GOV-9's `#prefix-n` cross-link form is reachable from sibling pages; until these anchors exist, GOV-9 cross-references into the cancellation rules and per-obligation conformance citations are not mechanically possible.

## Solution approach

Coin `CNCL-N` anchors at each defining obligation site on `cancellation.md`, continuing the existing sequence from the next free ID `CNCL-4` in source order down the page. Apply the GOV-1 dual-form layout used for `CNCL-1`…`CNCL-3` (`<a id="cncl-n"></a> **CNCL-N.**`). Where a single sentence carries two distinct obligations (e.g. the `ctx.signal` undefined-tolerance MUST and the MUST-NOT-depend-on-truthiness clause), split into separate anchored IDs; the **Surfacing** section can take an umbrella anchor beside its existing `<a id="surfacing"></a>`.

## Solution constraints

- Do not renumber or re-anchor existing `CNCL-1`…`CNCL-3` (GOV-23 anchor-scheme stability); new IDs start at `CNCL-4`.
- Allocate numeric tails under the already-registered `CNCL` prefix only; do not introduce a new prefix.

## Relationships

- T13 "Binder *System-prompt structure (normative)* items 1–8 carry no REQ-ID anchors" - same-cluster (same GOV-22 progressive-coinage defect on a different page; resolves independently).
- T12 "Compact-transcript reference renderings A–D — no per-rendering identifiers" - same-cluster (same GOV-22 defect on `binder-model-and-context.md`).
- T01 "Pre-evaluation failure list — stale count-pointer and non-contiguous REQ-ID numbering" - same-cluster (same traceability lens, different mechanism — non-contiguous numbering rather than missing anchors).
- T09 "Diagnostic code-registry *Spec rule* cells bypass GOV-9 `#prefix-n` cross-link form" - must-precede (the cited `code-registry-*.md` rows that depend on cancellation rules cannot be repointed to `#cncl-n` anchors until those anchors exist; coining here unblocks the citation-side fix there).

---
