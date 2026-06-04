# Triaged Spec Review - spec

_Generated: 2026-06-04T17:12:00Z_
_Spec: docs/spec.md_
_Process: bottom-up - the last finding (T22) is addressed first; the first finding (T01) is addressed last._

_Triage tally: 0 blocker + 4 high, 4 medium retained; 19 low discarded; 13 low findings merged into 3 medium findings; 3 nit dropped; 0 false dropped._

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
