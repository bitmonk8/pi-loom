# Triaged Spec Review - spec

_Generated: 2026-06-04T17:12:00Z_
_Spec: docs/spec.md_
_Process: bottom-up - the last finding (T22) is addressed first; the first finding (T01) is addressed last._

_Triage tally: 0 blocker + 4 high, 6 medium retained; 19 low discarded; 13 low findings merged into 3 medium findings; 3 nit dropped; 0 false dropped._

---

# T01 - Misplaced sections within the pi-integration-contract pages

**Kind:** placement
**Importance:** medium
**Score:** 15
**Must-fix:** false
**Decision axes:** 3
**Shape:** single
**State:** reduced

## Problem

Three blocks of normative prose in the `pi-integration-contract/` topic set live on the wrong page. `binder-inference.md` carries the **System notes**, **Delivery surface**, and **Runtime event channel** contract (including the `<a id="success-side-null-policy">` paragraph) whose subject matter is independent of binder inference and whose named owner is `runtime-event-channel.md`; five external cross-references already cite `runtime-event-channel.md` as the owner. `binder-inference.md` also carries the **Renderer registration (`pi.registerMessageRenderer`)** subsection, which pins extension-initialisation behaviour and is split from the cognate renderer-failure path that `extension-bootstrap-and-per-loom.md` already owns. `runtime-event-channel.md` carries the `estimateTokens` and `buildSessionContext` named-export contracts, which are SDK host-interface paragraphs whose `host-interfaces-core.md` "above" back-references resolve to text on a different file.

## Solution approach

Move the **System notes**, **Delivery surface**, and **Runtime event channel** blocks (including the `<a id="success-side-null-policy">` paragraph) out of `binder-inference.md` to `runtime-event-channel.md` ahead of its existing `RuntimeEvent` shape block, which realigns the five inbound owner-citations that already name that page. Repoint the `#success-side-null-policy` fragment links in `language-and-architecture.md`'s Runtime-observability bullet and the two `slash-invocation.md` bullets to `runtime-event-channel.md#success-side-null-policy`. Move the **Renderer registration (`pi.registerMessageRenderer`)** subsection to `extension-bootstrap-and-per-loom.md` beside the existing renderer-failure path, and replace the System-notes mention of it with a forward-link to its new home. Move the `estimateTokens` and `buildSessionContext` named-export paragraphs to `host-interfaces-core.md` so the existing "above" back-references resolve, and re-resolve above/below back-references inside all moved blocks.

## Solution constraints

- Preserve every moved anchor's `id` value verbatim (e.g. `success-side-null-policy`); only the hosting file changes, so inbound fragment links resolve after repoint.
- Out of scope: `glossary.md`'s `always-log set` entry already cites `runtime-event-channel.md` as owner — verify it resolves, do not edit it.

## Relationships

None
# T02 - GOV body-paragraph REQ-IDs (GOV-1, GOV-3, GOV-4..GOV-9) lack the dual-form HTML anchors GOV-1 mandates

**Kind:** traceability
**Importance:** medium
**Score:** 15
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

GOV-1 *Required HTML-anchor contexts* names body-paragraph context as one of the four contexts where the `<a id="prefix-n"></a>` HTML form MUST accompany the inline `**PREFIX-N.**` marker, because the bold-with-period marker does not by itself produce a stable URL fragment in common Markdown renderers. Eight live body-paragraph REQ-IDs carry only the bare inline marker: GOV-1 and GOV-3 on `req-id-prefix-table-active-a.md`, and GOV-4, GOV-5, GOV-6, GOV-7, GOV-8, GOV-9 on `req-id-prefix-table-active-b.md`. The omission is self-referential and locally inconsistent: GOV-9 itself mandates that every REQ-ID anchor on a non-narrative page resolve as a `#prefix-n` fragment, yet its own site does not, while GOV-12, GOV-14, and GOV-22 on the same pages already carry the dual form. Any citer reaching for `#gov-1`..`#gov-9` produces a broken deep link.

## Solution approach

Add the dual-form HTML anchor — `<a id="prefix-n"></a>` immediately preceding the existing inline `**PREFIX-N.**` marker, with a lowercase `id`, in the order GOV-1 *Dual-form layout* pins — to each of the eight defining sites that lack it: `gov-1` and `gov-3` on `req-id-prefix-table-active-a.md`, and `gov-4`, `gov-5`, `gov-6`, `gov-7`, `gov-8`, `gov-9` on `req-id-prefix-table-active-b.md`. Match the dual form already in place at GOV-12 / GOV-14 / GOV-22 on the same pages.

## Solution constraints

- Do not mutate the inline `**GOV-N.**` marker bytes; GOV-1's witness regex pins the bold-with-period form.
- Out of scope: GOV-3's extraction-glob wording (owned by T03) and the prefix-table row bindings (owned by T04); edit only the anchor tokens.

## Relationships

- T03 "GOV-3 extraction scope and GOV-6 closure invariant exclude subdirectory REQ-IDs" — same-cluster (touches the same GOV-3 / GOV-6 paragraphs; resolves independently — extraction-scope wording vs anchor coinage)
- T04 "Prefix table binds prefixes to hub files that carry no REQ-ID anchors" — same-cluster (another GOV-1 enforcement gap on the same prefix-table pages; table-schema question vs per-paragraph anchor coinage)
# T03 - GOV-3 extraction scope and GOV-6 closure invariant exclude subdirectory REQ-IDs

**Kind:** traceability
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

GOV-3 (`governance/req-id-prefix-table-active-a.md`) scopes REQ-ID extraction to rows in `spec_topics/*.md`, and GOV-6 (`governance/req-id-prefix-table-active-b.md`) states its table-completeness closure invariant over prefixes appearing in REQ-IDs across `spec_topics/*.md`. Under POSIX single-segment glob semantics, both predicates scan only the first-level files directly inside `docs/spec_topics/`. But the live `**PREFIX-N.**` anchor sites live in subdirectory files (e.g. `BNDR-1..3` in `binder/binder-bypass-and-envelope.md`, `GOV-1/3` in `governance/req-id-prefix-table-active-a.md`), none of which match `spec_topics/*.md`. A conformant extractor returns almost no REQ-IDs and GOV-6's closure invariant holds vacuously, so a typo such as `BNRD-1` in a subdirectory file escapes the corpus-wide traceability backstop.

## Solution approach

Rewrite the `spec_topics/*.md` glob to the recursive `spec_topics/**/*.md` form at both sites: GOV-3's "all other rows in `spec_topics/*.md` are in scope" sentence and GOV-6's table-completeness invariant sentence. The `**/*.md` spelling is the corpus-internal idiom GOV-17's non-normative `grep -nE` aid already uses.

## Solution constraints

- Out of scope: the prefix table's `Page`-column binding rewrite (owned by T04).
- Out of scope: other `spec_topics/*.md` occurrences elsewhere in governance (GOV-17, GOV-14, GOV-21, the retired-alias scope paragraph) — leave them unchanged here.

## Relationships

- T04 "Prefix table binds prefixes to hub files that carry no REQ-ID anchors" — co-resolve (T04's table rewrite redefines the scan set and forces a recursive or per-row glob; same diff)
- T02 "GOV body-paragraph REQ-IDs lack dual-form HTML anchors" — same-cluster (touches the same GOV-3 paragraph; resolves independently)
# T04 - Prefix table binds prefixes to hub files that carry no REQ-ID anchors

**Kind:** traceability
**Importance:** medium
**Score:** 35
**Must-fix:** false
**Decision axes:** 3
**Shape:** single
**State:** reduced

## Problem

The REQ-ID prefix table on `req-id-prefix-table-active-a.md` and its continuation in `-b.md` binds each prefix to a *hub* file (`BNDR`→`binder.md`, `DIAG`→`diagnostics.md`, `CEIL`/`CIO`→`hard-ceilings.md`, `GOV`→`governance.md`, and the rest), but each hub file is a table-of-contents stub carrying zero `**PREFIX-N.**` markers — the live anchors sit in subdirectory files. This violates GOV-1's requirement that each non-narrative table page carry a `PREFIX-N` anchor at every live REQ-ID's defining site, and it makes every GOV-9 cross-link of the form `<hub>.md#prefix-n` non-resolving, since the fragment names a hub page that holds no such anchor. The defect compounds with T03: the closure invariant passes vacuously by never scanning where the anchors actually live, so tooling witnesses no violation.

## Solution approach

Rewrite the prefix-table rows in `req-id-prefix-table-active-a.md` and `-b.md` so each prefix binds to the anchor-bearing subdirectory file(s) rather than the hub stub. Amend GOV-4 to admit a one-prefix-to-many-pages binding reciprocal to its existing many-prefixes-to-one-page clause, and add the matching GOV-7 mutation step. Repoint the existing GOV-9 cross-references that currently target hub-file fragments, and co-resolve the GOV-3 / GOV-6 scan-set redefinition with T03 in the same diff.

## Solution constraints

- The GOV-4 binding-cardinality change is substantive per GOV-8: retire GOV-4 and add a fresh GOV-N rather than editing the binding rule in place.

## Relationships

- T03 "GOV-3 extraction scope and GOV-6 closure invariant exclude subdirectory REQ-IDs" — co-resolve (the table rewrite redefines the scan set and forces a recursive or per-row glob; same diff)
- T02 "GOV body-paragraph REQ-IDs lack dual-form HTML anchors" — same-cluster (also a GOV-1 anchor-hygiene gap, table-cell context vs body-paragraph context; resolves independently)

