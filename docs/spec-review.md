# Triaged Spec Review - spec

_Generated: 2026-05-27T11:30:00Z_
_Spec: docs/spec.md_
_Process: bottom-up - the last finding (T20) is addressed first; the first finding (T04) is addressed last._

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
