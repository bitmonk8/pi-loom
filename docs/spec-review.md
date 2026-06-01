# Triaged Spec Review - spec.md

_Generated: 2026-06-01T18:10:00Z_
_Spec: docs/spec.md_
_Process: bottom-up - the last finding (T11) is addressed first; the first finding (T08) is addressed last._

_Triage tally: 4 high retained; 7 medium removed by request; 9 low discarded; 13 nit dropped; 0 false dropped._

---

# T08 - SM-7c conclusion and SM-8 are authoritative-in-place on spec.md, contradicting GOV-12 and sitting outside the REQ-ID lifecycle

**Kind:** traceability
**Importance:** high
**Score:** 100
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

GOV-12 (`docs/spec_topics/governance.md`, anchor `gov-12`) states categorically that `spec.md` carries no per-page REQ-ID prefix and that every normative obligation it appears to state is owned by a topic page it forward-links to, with no exception class for obligations `spec.md` owns directly. The Session Model intro (anchor `session-model`) and the Scope intro contradict this by declaring SM-7c's prompt-mode sequential-execution conclusion and SM-8's per-invocation budget non-sharing rule the "authoritative-in-place home" on `spec.md`. Both obligations also sit outside every governed identifier class: the `sm-` anchors are absent from the REQ-ID prefix table, and the `**SM-7c.**` / `**SM-8.**` markers fit neither the `**PREFIX-N.**` REQ-ID shape (GOV-1) nor GOV-16's inline-label form, so they escape the GOV-8 substantive-edit ban, the retirement registry, and GOV-9's `#prefix-n` cross-link discipline. An auditor cannot determine whether either obligation is normative, and edits to their wording leave no audit trail under either reading.

## Solution approach

Land SM-7c's conclusion and SM-8's budgets on topic pages under those pages' registered prefixes (co-resolve with T11 and T10 respectively), then delete the authoritative-in-place framing from `spec.md`. Rewrite the Session Model intro's authoritative-in-place sentence (anchor `session-model`) and the Scope intro's authoritative-in-place clause as forward-links to the relocated owners, and retarget inbound topic-page citations to the new REQ-ID anchors per GOV-9.

## Solution constraints

- Do not amend GOV-12 to admit a `spec.md`-as-normative-owner exception; resolve the contradiction by relocation.
- Preserve the `sm-7c-prompt-mode-sequential-execution` and `sm-8-per-invocation-budget-non-sharing` umbrella anchors and the four `sm-7c-*` sub-anchors on `spec.md` so inbound citations resolve.

## Relationships

- T11 "SM-7c's normative MUST has no topic-page owner" — co-resolve (the SM-7c relocation discharges the GOV-12 contradiction and REQ-ID-lifecycle gap for SM-7c in the same edit)
- T10 "SM-8 per-invocation budget non-sharing rule lives only on the aggregator page" — co-resolve (the SM-8 relocation discharges the contradiction and lifecycle gap for SM-8)
# T09 - Forward-compatibility seams sub-bucket predicate fails for the Pi-owned-subagents blockquote, breaking the 13-seam count

**Kind:** cross-spec-consistency-broad
**Importance:** high
**Score:** 100
**Must-fix:** false
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

The *Surface extensions without a dedicated topic-page seam* sub-bucket on `future-considerations.md` (`#surface-extensions-no-dedicated-seam`) defines its membership by stating its items carry no `> **loom 1.0 seam — <name>.**` blockquote on any topic page. One member — the Pi-owned subagents item — contradicts that predicate: its *Carrier* line cites the `#v1-seam-pi-owned-subagents-collision-source-set` blockquote on `pi-integration-contract.md`. The *Forward-compatibility seams* Scope bullet on `spec.md` (`#scope`) and GOV-12 on `governance.md` (`#gov-12`) both define the source set of the "13 typed/structural seams" as the inventory of these blockquotes, so the blockquote-keyed count and the membership rule that excludes this sub-bucket from the 13 disagree about whether the subagents blockquote belongs to the tally.

## Solution approach

Rewrite the membership predicate of the no-dedicated-seam sub-bucket (`#surface-extensions-no-dedicated-seam`) so it keys on exclusion from the 13-seam tally rather than on the absence of a `> **loom 1.0 seam — <name>.**` blockquote, retaining the `#v1-seam-pi-owned-subagents-collision-source-set` blockquote as a defensive invariant pin. Apply the same predicate rewrite to the mirroring clause in the *Forward-compatibility seams* Scope bullet on `spec.md` (`#scope`). Narrow GOV-12's *13 typed/structural seams* source-set definition (`#gov-12`) so it counts blockquotes pinning items inventoried under *Surface extensions (loom 1.0 leaves a seam)*, excluding blockquotes pinning items in the no-dedicated-seam sub-bucket.

## Solution constraints

- The GOV-12 integer-count invariant binds: the 13-seam aggregator MUST retain a parseable integer literal whose value equals its newly-defined source-set count.

## Relationships

None
# T10 - SM-8 per-invocation budget non-sharing rule lives only on the aggregator page

**Kind:** placement, scope
**Importance:** high
**Score:** 100
**Must-fix:** true
**Decision axes:** 3
**Shape:** single
**State:** reduced

## Problem

The Session Model intro (`#session-model` on spec.md) declares SM-8 (`#sm-8-per-invocation-budget-non-sharing`) an "authoritative-in-place" normative obligation owned by spec.md, in tension with GOV-12 (`#gov-12` on governance.md), which holds that every normative obligation spec.md appears to state is owned by a topic page it forward-links to. The three per-budget contracts SM-8 references are unevenly covered: invocation.md already pins sibling-non-sharing for `invoke`-chain depth, but binder.md's per-invocation retry-budget paragraph and query.md's `#tool-call-loop-bound` paragraph scope their budgets without stating cross-sibling non-sharing. An implementer reading the topic pages encounters per-budget scoping piecemeal, never reads the cross-cutting non-sharing invariant, and may infer that `tool_loop.max_rounds` is a per-session or per-loom resource.

## Solution approach

Demote SM-8 on spec.md from an authoritative-in-place obligation to per-budget forward-links pointing at each budget's topic-page owner, mirroring the existing SM-7a…SM-7e forward-link shape, and remove SM-8 from the `#session-model` intro's authoritative-in-place enumeration. Add cross-sibling non-sharing wording to binder.md's per-invocation retry-budget paragraph and to query.md's `#tool-call-loop-bound` paragraph so each topic page owns its budget's non-sharing rule, with the `tool_loop.max_rounds` statement covering sibling invocations and not only sibling queries.

## Solution constraints

- Preserve the `#sm-8-per-invocation-budget-non-sharing` umbrella anchor on spec.md per the sm-anchor-scheme-stability paragraph.
- Out of scope: SM-7c and its sub-anchors (owned by T11).

## Relationships

- T11 "SM-7c's normative MUST has no topic-page owner" — same-cluster (parallel relocation of a sibling SM-N obligation; different content and destination; resolves independently)
- T08 "SM-7c conclusion and SM-8 are authoritative-in-place on spec.md, contradicting GOV-12 and sitting outside the REQ-ID lifecycle" — co-resolve (this relocation discharges the GOV-12 contradiction and REQ-ID-lifecycle gap for SM-8)
# T11 - SM-7c's normative MUST has no topic-page owner

**Kind:** placement, scope
**Importance:** high
**Score:** 100
**Must-fix:** true
**Shape:** single
**State:** reduced

## Problem

SM-7c on `docs/spec.md` (anchor `sm-7c-prompt-mode-sequential-execution`) carries a normative MUST — prompt-mode bodies execute strictly sequentially within a single user session, holding at most one open `pi.setActiveTools` snapshot/restore window at a time — that the Session Model intro declares "authoritative-in-place" on `spec.md`. This violates GOV-12, which requires every normative obligation `spec.md` appears to state to be owned by a topic page it forward-links to; the four supporting facts already live on topic pages while only the conclusion is stranded on the aggregator. The placement also leaves the MUST outside the REQ-ID / inline-label governance machinery (GOV-1 / GOV-8 / GOV-9), since `spec.md` has no per-page prefix and the obligation carries no anchorable governed identifier.

## Solution approach

Move SM-7c's sequential-execution conclusion to `docs/spec_topics/pi-integration-contract.md`, alongside its premises at `#tool-registration-lifetime-and-visibility` and `#concurrent-invocation-isolation`, authoring it as a normative `**PIC-N.**` paragraph with a dual-form anchor per GOV-1. Demote SM-7c on `spec.md` to a one-line forward-link matching the shape of sibling SM-7a / SM-7b / SM-7d / SM-7e.

## Solution constraints

- The relocated obligation must attribute the sequential-execution property to Pi's per-session slash-handler serialisation guarantee, not re-derive it as a runtime MUST.
- Preserve the `sm-7c-prompt-mode-sequential-execution` orientation anchor on `docs/spec.md` per `sm-anchor-scheme-stability`, even though the obligation relocates.
- Move the four sub-anchors (`#sm-7c-slash-handler-serialisation`, `#sm-7c-load-time-prompt-callee-rejection`, `#sm-7c-invoke-suspension`, `#sm-7c-subagent-to-prompt-fanout-closed`) with the rule, or re-point their inbound citations to PIC sub-anchors in the same diff.

## Relationships

- T10 "SM-8 per-invocation budget non-sharing rule lives only on the aggregator page" — same-cluster (parallel SM-N relocation; resolves independently)
- T08 "SM-7c conclusion and SM-8 are authoritative-in-place on spec.md, contradicting GOV-12 and sitting outside the REQ-ID lifecycle" — co-resolve (this relocation discharges the GOV-12 contradiction and REQ-ID-lifecycle gap for SM-7c)
