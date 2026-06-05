# pi-loom — Consolidated Spec Review (Parked)

_Parked findings: 3._

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

## T13 - Binder *System-prompt structure (normative)* items 1–8 carry no REQ-ID anchors

> **PARKED** — 2026-06-05
> **Reason:** Category 2 (fixer too-hard — capability gap; the fast `/spec-fix-findings-loop` fix coined dual-form `BNDR-7`..`BNDR-14` anchors at items 1–8 with zero floor regressions but did not add the required umbrella anchor on the `#### System-prompt structure (normative)` subsection heading line). The fast fix loop did not resolve the finding. Loop notes: finding not resolved by fast fix (partial — fast fix coined dual-form BNDR-7..14 anchors at items 1–8 with zero floor regressions, but the required umbrella anchor on the `#### System-prompt structure (normative)` heading line was not added; reviewer marked partial)
> **Forensic report:** none (fast loop — no forensic report)

# T13 - Binder *System-prompt structure (normative)* items 1–8 carry no REQ-ID anchors

**Kind:** traceability
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

The `#### System-prompt structure (normative)` subsection of `binder-bypass-and-envelope.md` is a numbered list of eight defining obligations, each carrying RFC-2119 normative-modal tokens and naming a distinct contractual surface (item 4's `Parameters:` block, item 7's envelope-kinds enumeration, item 8's no-invent-defaults line, and so on). None of items 1–8 carries an `<a id="bndr-N"></a> **BNDR-N.**` dual-form anchor, and the subsection heading carries no umbrella anchor either. Per GOV-22 these are standing un-coined obligation sites, and per GOV-9 every cross-page reference must resolve to a `#prefix-n` fragment — citing "item 4" by prose breaks silently under any reorder or insertion without producing a dangling-anchor signal.

## Solution approach

Coin a dual-form `<a id="bndr-N"></a> **BNDR-N.**` REQ-ID anchor at each of items 1–8 of the `#### System-prompt structure (normative)` subsection, allocating the next free integers under the already-registered `BNDR` prefix (per GOV-3 the prefix counter is global across the `binder/` subtree). Add an umbrella anchor on the subsection heading line so inbound links citing the structure list as a unit have a stable target distinct from the per-item anchors.

## Solution constraints

- Out of scope: the trailing *Type display*, *Default-literal rendering*, and *Parameter-line reference renderings* tables — their per-rendering anchoring is a separate contract surface (same anchor-pattern precedent as T12).

## Relationships

- T12 "Compact-transcript reference renderings A–D — no per-rendering identifiers" - same-cluster (same GOV-22 anchor-coinage gap on the sibling `binder-model-and-context.md` page; resolves independently with the same dual-form + sub-letter pattern).
- T14 "Un-anchored normative obligations across `cancellation.md`" - same-cluster (same GOV-22 progressive-coinage residue on `cancellation.md`; resolves independently with the `CNCL-N` prefix).
- T09 "Diagnostic code-registry *Spec rule* cells bypass GOV-9 `#prefix-n` cross-link form" - must-precede (binder-routed diagnostic rows depending on these items become repointable once the per-item `BNDR-N` anchors land).

---

## T09 - Diagnostic code-registry *Spec rule* cells bypass GOV-9 `#prefix-n` cross-link form

> **PARKED** — 2026-06-05
> **Reason:** Category 2 (fixer too-hard — capability gap; the fast `/spec-fix-findings-loop` fix repointed 8 *Spec rule* cells in `code-registry-load.md` / `code-registry-runtime.md` to live `#prefix-n` anchors (DISC-2/3/4, PIC-8/9) with zero floor regressions and no dangling targets, but left the host and parse `code-registry-*.md` tables entirely untouched and left many cells with available owner-page REQ-ID anchors un-repointed). The fast fix loop did not resolve the finding. Loop notes: finding not resolved by fast fix (partial — fast fix repointed 8 cells in code-registry-load.md / code-registry-runtime.md to live anchors (DISC-2/3/4, PIC-8/9) with zero floor regressions and no dangling targets, but the host and parse code-registry tables were left entirely untouched and many cells with available owner-page REQ-ID anchors remain un-repointed; reviewer marked partial)
> **Forensic report:** none (fast loop — no forensic report)

# T09 - Diagnostic code-registry *Spec rule* cells bypass GOV-9 `#prefix-n` cross-link form

**Kind:** traceability
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

The *Spec rule* column in the four diagnostic code-registry tables (`code-registry-load.md`, `code-registry-parse.md`, `code-registry-runtime.md`, `code-registry-host.md`) links to owner topic-page roots or section-level heading slugs rather than to `#prefix-n` REQ-ID anchors. The owning pages are non-narrative, so GOV-9 (`#gov-9`) requires each cross-page reference to a normative rule to resolve as a `#prefix-n` fragment to the depended-upon rule's anchor; section-level links are licensed only where the owning page is pure-narrative. The cells therefore stand as GOV-9 defects, and a reviewer cannot trace a diagnostic row to its specific obligation without reading the whole linked section. A minority of rows already conform (e.g. the `loom/load/discovery-slow` row targets `…/package-and-settings.md#disc-6`), so the target form is achievable per-row.

## Solution approach

Rewrite each *Spec rule* cell's link target in the four `code-registry-*.md` tables to the `#prefix-n` REQ-ID anchor of the rule the diagnostic implements, keeping the link text unchanged. Where the depended-upon obligation carries no REQ-ID anchor yet (a GOV-22 standing defect on the owner page, `#gov-22`), leave the section-level link in place and flag it as anchor-pending. Where a row cites several source rules, rewrite each per-source link to its own `#prefix-n` anchor.

## Solution constraints

- Out of scope: coining or editing REQ-ID anchors on the owning topic pages; un-anchored obligations are landed by T12, T13, and T14.
- Edit only the *Spec rule* column of the four `code-registry-*.md` tables; do not modify diagnostic codes, messages, or other columns.

## Relationships

- T14 "Un-anchored normative obligations across `cancellation.md`" - must-follow (the cancellation-routed diagnostic rows cannot be repointed to `#cncl-n` anchors until those anchors exist; T14 must land first).
- T13 "Binder *System-prompt structure (normative)* items 1–8 carry no REQ-ID anchors" - must-follow (binder-routed diagnostic rows depending on those items become repointable once the per-item `BNDR-N` anchors land).
- T12 "Compact-transcript reference renderings A–D — no per-rendering identifiers" - must-follow (any diagnostic citing a specific reference rendering becomes repointable once those anchors are coined).

---
