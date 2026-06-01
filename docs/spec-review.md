# Triaged Spec Review - spec.md

_Generated: 2026-06-01T18:10:00Z_
_Spec: docs/spec.md_
_Process: bottom-up - the last finding (T11) is addressed first; the first finding (T01) is addressed last._

_Triage tally: 4 high, 7 medium retained; 9 low discarded; 6 low findings merged into 3 medium findings; 13 nit dropped; 0 false dropped._

---

# T01 - Runtime observability scope bullet uses undefined jargon "keys on"

**Kind:** clarity
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

The Runtime observability bullet in spec.md's Orientation — Scope subsection states that on the success side "no `loom-system-note` event on this channel keys on the `Ok(v)` termination outcome itself." The verb "keys on" is not a defined spec term and admits two materially different readings: emission semantics (no event is emitted in response to the `Ok(v)` outcome) versus payload-shape semantics (no event payload is discriminated by the `Ok(v)` outcome). These yield different conformance obligations — suppress emission on success vs. omit a discriminator field — so a reader who stops at the Scope bullet without following the forward-link cannot determine which constraint is in force. The owning PIC paragraph (`id="success-side-null-policy"`) repeats the same construction ("keyed on the `Ok(v)` outcome"), mirroring the ambiguity at the owner site.

## Solution approach

Rewrite the success-side clause of spec.md's Runtime observability Scope bullet to use an unambiguous emission-semantics verb in place of "keys on". Apply the same emission verb to the owning PIC `*Success-side null-policy*` paragraph (`id="success-side-null-policy"`), where the construction "keyed on the `Ok(v)` outcome" currently repeats it, so the Scope summary and the owner paragraph read with one shared verb.

## Solution constraints

- None.

## Relationships

None
# T02 - README repository-layout table uses stale `@mariozechner` npm scope

**Kind:** doc-alignment-broad
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

The final row of the *Repository layout* table in `README.md` (the `package.json` row) describes the manifest as declaring "peer-deps on `@mariozechner/pi-*`". Everywhere else in the corpus — `package.json#peerDependencies`, the `spec.md` Pi-SDK orientation paragraph, and every citation across `docs/spec_topics/pi-integration-contract.md` — uses the `@earendil-works/` npm scope. The `@mariozechner/` scope is a stale value from before the scope rename and appears nowhere else in the tree. A contributor orienting from the README forms an incorrect mental model of the package namespace.

## Solution approach

Rename the npm scope in the `package.json` row of the *Repository layout* table in `README.md` from `@mariozechner/pi-*` to `@earendil-works/pi-*`.

## Solution constraints

- None.

## Relationships

None
# T03 - Glossary omits three coined session-shutdown cross-page terms

**Kind:** naming
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

Three terms coined in `docs/spec.md`'s Session model and reused across more than one page lack glossary entries, violating the glossary's own admission rule ("Add new entries here when the spec coins a new term that is reused on more than one page"): *session-only reasons* (the `{"new", "resume", "fork"}` subset of `SessionShutdownEvent.reason` used in SM-4/SM-5/SM-6 and owned by PIC's `#session-only-reason-degraded-state` bullet), *tag-transition predicate* (cited in SM-5), and *diagnostic-emission predicate* (coined in SM-6). All three are defined canonically on the PIC bullet's *Predicate split* clause but have no glossary landing pad, so a reader hitting any of them in an SM bullet must thread to PIC and reconstruct the definition and the deliberate predicate asymmetry.

## Solution approach

Add three alphabetised, descriptive entries to `docs/spec_topics/glossary.md` for the coined terms *session-only reasons*, *tag-transition predicate*, and *diagnostic-emission predicate*, each carrying a `See:` reference to the canonical PIC anchor `#session-only-reason-degraded-state`. The two predicate entries should make their broader/narrower relationship to each other explicit.

## Solution constraints

- Glossary entries are descriptive only: do not mint a fresh normative closed-set pin — the `{"new", "resume", "fork"}` / `{"quit", "reload"}` authority stays with SM-2 and the PIC clause.
- Out of scope: editing the SM-4 / SM-5 / SM-6 bullets on `docs/spec.md` or the PIC `#session-only-reason-degraded-state` clause; the change is additive on `glossary.md`.

## Relationships

None
# T04 - Cross-page citations omit or mis-target precise anchor fragments

**Kind:** placement, implementability, traceability
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Decision axes:** 3
**Shape:** single
**State:** reduced

## Problem

Three independent citation surfaces in the corpus target a non-ideal anchor, violating the "cite the precise owning anchor" / GOV-9 cross-link convention. (1) The Hard ceilings cross-ceiling paragraph at `spec.md` line 61 defines inline `<a id="ceiling-interaction-order"></a><a id="no-additional-ceilings"></a>` tags that duplicate identically-named anchors on the owner page `hard-ceilings.md`; two inbound citations on `diagnostics.md` and `errors-and-results.md` cite `../spec.md#no-additional-ceilings` and so land readers in an orientation aggregator rather than at the NOCEIL-3 definition. (2) SM-2 (`#sm-2-closed-shutdown-reason-set`) and SM-3a (`#sm-3a-teardown-sequence`) cite `pi-integration-contract.md` with no `#` fragment, gesturing in prose at "Extension entry point, step 4" on an ~851-line page where that sub-step is not uniquely greppable. (3) `spec.md` cites GOV-12 nine times as a bare page link with no `#gov-12` fragment, even though `governance.md` carries `<a id="gov-12"></a>` and GOV-14 / GOV-15 are cited correctly with fragments, leaving the GOV-12 cluster the lone hold-out.

## Solution approach

On `spec.md`, delete the inline `<a id="ceiling-interaction-order"></a><a id="no-additional-ceilings"></a>` tags in the Hard ceilings cross-ceiling paragraph (line 61), and repoint the two inbound citations on `diagnostics.md` and `errors-and-results.md` from `../spec.md#no-additional-ceilings` to the `hard-ceilings.md#no-additional-ceilings` owner anchor. Add a document-internal anchor at `pi-integration-contract.md`'s Extension entry point step 4 (the `session_shutdown` teardown sub-step) and re-point both the SM-2 and SM-3a citations at it. Add the `#gov-12` fragment to the nine bare GOV-12 rule citations on `spec.md`, matching GOV-9's cross-link form.

## Solution constraints

- When deleting the inline anchor tags at `spec.md` line 61, preserve the paragraph's existing outbound links to `hard-ceilings.md#…`, which are already correct.
- Out of scope: the Appendix Governance composite index link on `spec.md`, which covers the whole Governance page and is not a single-rule GOV-12 citation.

## Relationships

- T05 "SM-7c sub-point (i) cites the wrong PIC anchor for the slash-dispatch serialisation guarantee" — same-cluster (same anchor-citation hygiene class on the same PIC target file; resolve independently with the same precise-anchor pattern)
# T05 - SM-7c sub-point (i) cites the wrong PIC anchor for the slash-dispatch serialisation guarantee

**Kind:** assumptions, implementability
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

SM-7c sub-point (i) in `docs/spec.md` (anchor `sm-7c-slash-handler-serialisation`) is a bare page link to PIC's `#tool-registration-lifetime-and-visibility` section, with no `#` fragment. The concurrency guarantee SM-7c depends on — per-session slash-command dispatch serialisation — lives one paragraph deeper at `#snapshot-restore-pi-behavioural-preconditions`, where PIC states it as behavioural precondition (b). A reader landing at the registration-scoped section header sees registration-cache machinery, may infer the premise is unsupported and reach for a defensive per-session mutex (the recovery path PIC reserves for failed Pi-version-bump audits), or escalate the citation as broken. The "pinned at" framing also overstates what PIC claims: PIC treats this as a descriptive behavioural precondition, not a flat fact.

## Solution approach

Rewrite sub-point (i)'s citation to target `#snapshot-restore-pi-behavioural-preconditions` (not the enclosing `#tool-registration-lifetime-and-visibility` section header) and update its link text to name that destination. Frame the guarantee as PIC's behavioural precondition rather than a flat "pinned" claim, and add a forward-link to the per-Pi-minor re-audit at `#bump-checklist-slash-dispatch-serialisation`.

## Solution constraints

- Out of scope: SM-7c's operative-clause rewrite and acceptance criterion, owned by T06; this finding changes only sub-point (i)'s citation and framing.
- Do not introduce a new normative MUST about Pi's surface — the behavioural-precondition framing is descriptive and must not be silently strengthened.

## Relationships

- T11 "SM-7c's normative MUST has no topic-page owner" — must-follow (if SM-7c's conclusion is relocated to a topic page, this anchor fix lands at the new owner location)
- T06 "SM-7c states its guarantee in implementation terms and supplies no observable acceptance criterion" — same-cluster (touches SM-7c; resolves independently of the citation target)
- T04 "Cross-page citations omit or mis-target precise anchor fragments" — same-cluster (same anchor-citation hygiene class; this finding additionally carries a behavioural-framing concern)
# T06 - SM-7c states its guarantee in implementation terms and supplies no observable acceptance criterion

**Kind:** prescription, testability
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

SM-7c (`docs/spec.md`, anchor `sm-7c-prompt-mode-sequential-execution`) binds its operative MUST to a single SDK mechanism — at most one prompt-mode body holds an open `pi.setActiveTools` snapshot/restore window at a time — rather than to the observable sequencing behaviour its italicised lead-in names. A conformant implementation that serialises prompt-mode bodies by another mechanism would appear to violate the letter, while a defective implementation that opens a window per body but interleaves work between open and close could claim letter-compliance. SM-7c also supplies no acceptance criterion phrased over observable artefacts (conversation turns, tool-call cards, diagnostics, return values): sub-points (i)–(iv) explain why bodies cannot overlap but yield no checkable predicate distinguishing a conformant serialisation from a brief two-body overlap defect.

## Solution approach

Rewrite SM-7c's operative clause at anchor `sm-7c-prompt-mode-sequential-execution` to state the sequencing guarantee over prompt-mode bodies in observable terms, and demote the `pi.setActiveTools` snapshot/restore window to supporting rationale referencing [Pi Integration Contract — Tool-registration lifetime and visibility](./spec_topics/pi-integration-contract.md). Add an acceptance criterion phrased over observable conversation events that distinguishes a conformant serialisation — including the prompt→prompt `invoke` suspension nesting case — from a defect that overlaps two prompt-mode bodies against one session.

## Solution constraints

- Preserve the `sm-7c-slash-handler-serialisation`, `sm-7c-load-time-prompt-callee-rejection`, `sm-7c-invoke-suspension`, and `sm-7c-subagent-to-prompt-fanout-closed` sub-anchors verbatim; they are inbound citation targets.
- Out of scope: the sub-point (i) PIC anchor-citation target, owned by T05.

## Relationships

- T11 "SM-7c's normative MUST has no topic-page owner" — must-follow (if SM-7c is relocated, the behavioural rewrite and acceptance criterion must land at the new owner)
- T05 "SM-7c sub-point (i) cites the wrong PIC anchor for the slash-dispatch serialisation guarantee" — same-cluster (anchor-citation fix on the same sub-point; independent of the operative-clause rewrite)
# T07 - SM-8 bundles three budgets under one anchor and supplies no observable acceptance criterion

**Kind:** traceability, testability
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

SM-8 (anchor `sm-8-per-invocation-budget-non-sharing` in `docs/spec.md`) states a single non-sharing obligation ranging over three distinct per-invocation budgets — the binder retry budget (owned by `binder.md`), `tool_loop.max_rounds` (owned by `hard-ceilings.md`/`query.md`), and `invoke`-chain depth (owned by `invocation.md`) — each living in a different subsystem and independently implementable, breakable, and verifiable. Because all three share one anchor and one obligation, an inbound citation cannot pin a single budget and a coverage-matrix row cannot map a test to a single sub-obligation. SM-8 also supplies no observable predicate by which a conformance test demonstrates non-sharing: there is no stated outcome for the failure mode where one sibling exhausts its ceiling while a concurrent sibling has not yet entered its loop, and nothing an external caller observes that distinguishes independent budgets from a pooled budget.

## Solution approach

Split SM-8 into three per-budget sub-letters, each carrying its own `<a id>` anchor and a forward-link to its owning topic page — the binder retry budget to `binder.md`, `tool_loop.max_rounds` to its `hard-ceilings.md`/`query.md` owner, and `invoke`-chain depth to `invocation.md` — mirroring the existing `sm-7` → `sm-7a`…`sm-7e` decomposition. Attach to each sub-letter an observable, black-box acceptance criterion for sibling non-sharing, using the `ActiveInvocationRegistry`'s distinct `invocationId` entries (per `pi-integration-contract.md`) as the concurrent-sibling observability seam. Preserve the `sm-8-per-invocation-budget-non-sharing` anchor as an orientation umbrella whose body points over the sub-letters, and extend the Session Model intro's anchor-scheme-stability decomposition enumeration to record the `sm-8` split.

## Solution constraints

- The acceptance criteria MUST restate the existing non-sharing prohibition in black-box-verifiable form and MUST NOT introduce new normative behaviour or strengthen the obligation.
- Do not coin a new REQ-ID or inline-label prefix for the sub-identifiers; a new prefix requires a GOV-7 / GOV-16 prefix-table row.

## Relationships

- T10 "SM-8 per-invocation budget non-sharing rule lives only on the aggregator page" — must-follow (relocate SM-8 to its per-budget topic-page owners first, then decompose and attach criteria at those homes to avoid a later anchor migration)
- T08 "SM-7c conclusion and SM-8 are authoritative-in-place on spec.md, contradicting GOV-12 and sitting outside the REQ-ID lifecycle" — decision-overlap (the sub-unit identifiers this decomposition introduces must match whatever REQ-ID scheme the relocation/lifecycle resolution assigns)
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
- T07 "SM-8 bundles three budgets under one anchor and supplies no observable acceptance criterion" — decision-overlap (the REQ-ID scheme assigned here must match the sub-unit identifiers the SM-8 decomposition introduces)
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
- T07 "SM-8 bundles three budgets under one anchor and supplies no observable acceptance criterion" — must-precede (relocate first so the SM-8a/SM-8b/SM-8c decomposition and acceptance criteria land on single per-budget owners)
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

- T06 "SM-7c states its guarantee in implementation terms and supplies no observable acceptance criterion" — must-precede (relocate first; the behavioural rewrite and acceptance criterion must land at SM-7c's new owner, not on the residual aggregator stub)
- T05 "SM-7c sub-point (i) cites the wrong PIC anchor for the slash-dispatch serialisation guarantee" — must-precede (relocate first; the sub-point (i) anchor fix lands at the relocated location)
- T10 "SM-8 per-invocation budget non-sharing rule lives only on the aggregator page" — same-cluster (parallel SM-N relocation; resolves independently)
- T08 "SM-7c conclusion and SM-8 are authoritative-in-place on spec.md, contradicting GOV-12 and sitting outside the REQ-ID lifecycle" — co-resolve (this relocation discharges the GOV-12 contradiction and REQ-ID-lifecycle gap for SM-7c)
