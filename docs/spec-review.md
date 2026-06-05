# Triaged Spec Review - spec

_Generated: 2026-06-04T21:31:00Z_
_Spec: docs/spec.md_
_Process: bottom-up - the last finding (T34) is addressed first; the first finding (T01) is addressed last._

_Triage tally: 0 blocker, 7 high, 4 medium retained; 12 low discarded; 10 low findings merged into 4 medium findings; 3 nit dropped; 0 false dropped._

---

# T01 - Governance retirement tables ship unresolved commit-SHA placeholders

**Kind:** cruft, traceability
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

Two sibling governance retirement tables carry literal placeholder strings in their `Retired in` columns instead of concrete commit SHAs or release tags, violating each table's stated column-value contract. The Retired REQ-IDs sub-table at `docs/spec_topics/governance/anchor-scheme-and-retired.md` (anchor `id="retired-req-ids"`) lists GOV-2, GOV-4, GOV-10, and GOV-11 with the literal `<retirement commit>` placeholder; only GOV-13 carries a concrete SHA. The Retired prefixes sub-table at `docs/spec_topics/governance/req-id-prefix-table-retired.md` carries the literal `<demotion commit>` in its `PIE` row. The placeholders were meant to be overwritten at retirement/demotion time but shipped unresolved, so the only surviving evidence of retirement is the row's presence, and any tooling validating the `Retired in` columns rejects four of five REQ-ID rows and the lone `PIE` row.

## Solution approach

Backfill each placeholder cell with the abbreviated commit SHA of the historical commit that performed the retirement/demotion, following the GOV-13 row's format; the retiring commits are recoverable via git history on each retirement-row's text. Resolve the `PIE` row in `req-id-prefix-table-retired.md`: backfill its SHA when the demoting commit is in history, otherwise land the demotion first or remove the row until the demotion is performed. When the `PIE` cell is backfilled, also strip the now-dangling `<demotion commit>` parenthetical in that section's column-contract paragraph.

## Solution constraints

- Each backfilled value MUST be the SHA of the historical commit that performed the retirement/demotion, never the SHA of the repair commit that backfills the cell.

## Relationships

None
# T02 - `invocation_id` allocation site described inconsistently for non-slash entry points

**Kind:** implementability
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

The `loom/runtime/reload-teardown-timeout` row in `code-registry-runtime.md` describes `<invocation-id>` as the UUID the runtime allocates "at handler entry", but the registry source of truth (`active-invocation-registry.md`) allocates it at registry-insertion time inside the Dispatch-site setup wrap across all three insertion sites — the slash-command handler, the `tool.execute(...)` adapter, and the `invoke` spawn-site. "Handler entry" has no referent at the two non-slash arms, so an implementer reading the row in isolation may scope id allocation to the slash arm only and omit it for `tool.execute`-only and `invoke`-only invocations. Separately, the same clause attributes the canonical lowercase 8-4-4-4-12 hex form to "the runtime's `loom-direct:<uuid>` synthesis convention", but `loom-direct:` is the prefix convention for synthesised `toolCallId` values, not `invocationId`; the form's source of truth is §7 of `placeholder-rendering-b.md`.

## Solution approach

Rewrite the `<invocation-id>` clause in the `loom/runtime/reload-teardown-timeout` row of `code-registry-runtime.md` to defer to `active-invocation-registry.md#active-invocation-registry` as source of truth for the allocation site — all three insertion sites, at registry-insertion time inside the Dispatch-site setup wrap — and to cite §7 of `placeholder-rendering-b.md` for the canonical lowercase 8-4-4-4-12 hex form. Delete the `loom-direct:<uuid>` reference.

## Solution constraints

- None.

## Relationships

None
