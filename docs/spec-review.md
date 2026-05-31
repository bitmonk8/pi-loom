# Triaged Spec Review - spec.md

_Generated: 2026-05-31T15:30:00Z_
_Spec: docs/spec.md_
_Process: bottom-up - the last finding (T25) is addressed first; the first finding (T01) is addressed last._

_Triage tally: 9 high, 16 medium retained; 12 low discarded; 14 findings merged into 5 medium findings; 3 nit dropped; 0 false dropped._

---

# T01 - Overview and Prerequisites orientation prose restates owner-page mechanics and leaks implementation identifiers

**Kind:** placement, prescription, external-entities
**Importance:** medium
**Decision axes:** 4
**Shape:** single
**State:** reduced

## Problem

Four sites in `## Overview` and Orientation › Prerequisites prose restate owner-page mechanics or name implementation identifiers that the orientation index should forward-link rather than inline. The `terminal-outcomes-aggregator` paragraph duplicates the field-level Failure-bullet classification owned by `errors-and-results.md#terminal-outcomes` (ceiling-#4 per-arm classification, the binder argument-binding-failure exclusion, the `InvokeInfraError { cause: "validation" }` contrast, and the in-loop tool-call-args exclusion), and its cancellation clause names the runtime-internal `loomAbort` / `loomAbort.signal` controller owned by `pi-integration-contract.md#cancellation-source`. The Prerequisites cardinality sentence embeds the `CAPABILITY_OBLIGATIONS.length === 7` assertion expression instead of citing the PIC step-2(a) enforcing site, and the Node-floor bullet names a bare `semver.satisfies(...)` identifier with no owning package. None of these paragraphs is a registered aggregator, so the duplication has no editorial backstop and can drift silently.

## Solution approach

Trim the `terminal-outcomes-aggregator` paragraph to orientation grain, keeping the Success/Failure/Cancelled trichotomy naming and the forward-link to `errors-and-results.md#terminal-outcomes` and removing the inlined field-level classification and exclusions. Rewrite the cancellation clause to describe the cancellation signal behaviourally and forward-link `cancellation.md` and `pi-integration-contract.md#cancellation-source` instead of naming `loomAbort`. Rewrite the cardinality sentence to state the guarantee and forward-link `pi-integration-contract.md#bump-step-2-positive` as the enforcing site instead of embedding the assertion expression. Delete the bare `semver.satisfies(...)` mention from the Node-floor bullet and defer to `pi-integration-contract.md#entry-capability-probe`.

## Solution constraints

- Out of scope: `cancellation.md`, `pi-integration-contract.md`, and the GOV-12 carve-out paragraph on `governance.md` — these owner pages hold the legitimately-placed `loomAbort` identifier, the SemVer recipe, and the `CAPABILITY_OBLIGATIONS.length === 7` witness, and must not be edited.

## Relationships

- T04 "Orientation › Scope › Trust boundary — surface-inventory misattribution" - same-cluster (also an orientation-index-reliability defect; resolves independently).
# T02 - Governance rule inventory omits GOV-19/20/21 on both governance.md intro and spec.md appendix

**Kind:** consistency
**Importance:** medium
**Shape:** single
**State:** reduced

## Problem

Two paired orientation surfaces self-describe the live `GOV-N` rule set and both stop the enumeration at GOV-16, omitting GOV-19 (release-version naming scheme), GOV-20 (legacy version-token aliases), and GOV-21 (dual-anchor convention) — all defined as live rules on `governance.md` (`#gov-19`, `#gov-20`, `#gov-21`). `docs/spec.md`'s Appendix › Governance bullet and `docs/spec_topics/governance.md`'s intro paragraph carry the identical enumeration with the identical omission. GOV-17 and GOV-18 are both listed despite not being REQ-ID-lifecycle rules, so no stated or derivable criterion explains excluding GOV-19/20/21. The two surfaces draw from the same enumeration and must adopt the same scoping decision in lock-step.

## Solution approach

Add `GOV-19 through GOV-21` to the live-rule enumeration in both `docs/spec.md`'s Appendix › Governance bullet and `docs/spec_topics/governance.md`'s intro paragraph, keeping the two enumerations mirrored. Reconcile each surface's trailing purpose clause so it no longer scopes the listed rules to REQ-ID coining / anchoring / retirement alone.

## Solution constraints

- Out of scope: the glossary `GOV-N` entry's stale range, owned by T14.

## Relationships

- T14 "Glossary `GOV-N` entry pins a stale `GOV-1 through GOV-8` range" - decision-overlap (same stale-GOV-enumeration root cause; choose a consistent description of the GOV rule set across all three sites).
- T13 "Session Model — SM-N anchor class is outside both governance frameworks" - same-cluster (touches the governance-rule registration surface; resolves independently).
# T03 - Retirement-registry placeholder SHAs unfilled on governance.md (PIE row + GOV-2/10/11 rows)

**Kind:** cruft
**Importance:** medium
**Shape:** single
**State:** reduced

## Problem

Two sibling retirement-registry sub-tables on `governance.md` carry literal authoring placeholders in their `Retired in` columns instead of the concrete commit identifiers the page's own normative rules require. The *Retired prefixes* sub-table (`#retired-prefixes`) `PIE` row reads `<demotion commit>`, and the *Retired REQ-IDs* sub-table (`#retired-req-ids`) GOV-2, GOV-10, and GOV-11 rows each read `<retirement commit>`. Both sub-tables' adjacent prose pins the `Retired in` cell value-space to a 7-character abbreviated SHA or a release tag, with `<…commit>` named only as a temporary marker to be replaced at the retiring/demoting commit; the unfilled placeholders therefore contradict the page's own rule and fail any SHA-shape parse.

## Solution approach

Back-fill the `<demotion commit>` placeholder in the `#retired-prefixes` sub-table `PIE` row with `877d57b`. Back-fill the `<retirement commit>` placeholder in each of the `#retired-req-ids` sub-table GOV-2, GOV-10, and GOV-11 rows with `64cdc60` (the single commit that retired all three).

## Solution constraints

- None.

## Relationships

None
# T04 - Orientation › Scope › Trust boundary — surface-inventory misattribution

**Kind:** assumptions
**Importance:** medium
**Shape:** single
**State:** reduced

## Problem

The Trust-boundary bullet in `spec.md`'s Orientation › Scope subsection claims a future Pi minor adding a per-extension privilege facet "would surface at the build-time SDK surface-inventory assertion run by [Pi version bump procedure]." That mechanical gate cannot fire on this failure mode. Its two assertions only verify the seven already-listed capabilities still resolve and only fire when loom code itself references a surface; neither inspects Pi's surface for net-new additions loom does not yet consume. A reviewer auditing loom's trust posture against a future Pi minor would trust a gate that does not exist for this case and skip the step 1 editorial checklist that is the actual line of defence.

## Solution approach

Rewrite the bullet's per-extension-privilege-facet detection sentence to attribute detection to editorial review under [Pi version bump procedure](./spec_topics/pi-integration-contract.md#pi-version-bump-procedure) — step 1's editorial-review checklist for unpinned host presuppositions, with step 2(a)'s category-(3) contributor cross-reference of `ExtensionContext` / `ExtensionCommandContext` declarations as the parallel discipline that catches a member-shape change. Drop the "build-time SDK surface-inventory assertion" attribution. Keep the forward-link target `#pi-version-bump-procedure` (the canonical procedure-level anchor) rather than re-anchoring to a single step.

## Solution constraints

- The bullet stays informative orientation — do not author a new normative obligation in it; the normative contracts remain owned by the forward-linked topic pages.

## Relationships

- T01 "Overview and Prerequisites orientation prose restates owner-page mechanics and leaks implementation identifiers" - same-cluster (both concern orientation-index reliability; resolve independently).
# T05 - Normative MUST-NOT for an unanticipated second-session disposition is buried inside a non-goal bullet

**Kind:** placement
**Importance:** medium
**Shape:** single
**State:** reduced

## Problem

The `future-considerations.md` "No concurrent user sessions in the same host process" non-goal bullet closes with a normative MUST-NOT: when an unanticipated second user session reaches the extension, "the loom 1.0 runtime defines no new disposition for it (no refuse-to-load, no bind-to-first-session, no per-session registry keying, no host-incompatibility diagnostic)." This closed four-way prohibition lives only in the non-goal bullet; the canonical session-model entry points — `spec.md` SM-1 (`#sm-1-single-active-session-binding`) and the Pi Integration Contract's Session-binding contract — forward-link the non-goal for framing but carry no copy of the prohibition. A reader auditing session-binding obligations from SM-1 never encounters the rule, so an implementer can satisfy SM-1's positive contract while adopting one of the four forbidden dispositions (e.g. emitting a host-incompatibility diagnostic on the second session).

## Solution approach

Move the "Disposition for an unanticipated second session" sentence — the four-way MUST-NOT together with its scoping clause about the single factory-captured `pi`, the `ActiveInvocationRegistry`, and per-session slash-dispatch serialisation remaining so scoped — out of the `future-considerations.md` non-goal bullet and into SM-1 (`#sm-1-single-active-session-binding`). Replace it in the non-goal bullet with a forward-link to SM-1.

## Solution constraints

- Out of scope: the positive single-active-session contract owned by SM-1's existing prose and by the Session-binding contract — relocate only the disposition negative.

## Relationships

- T13 "Session Model — SM-N anchor class is outside both governance frameworks" - same-cluster (both touch the SM-N section; if SM-1 gains a sub-anchor here, its lifecycle is covered by the SM-N registration that finding proposes — resolves independently).
# T06 - NOCEIL-3 MUST binds operators, outside GOV-18 binding scope

**Kind:** testability
**Importance:** medium
**Shape:** single
**State:** reduced

## Problem

NOCEIL-3's closing sentence imposes a MUST on operators ("Operators relying on a finite heap ceiling MUST use a host-side mechanism (e.g. `--max-old-space-size`, container memory caps, `--heapsnapshot-near-heap-limit` for triage)"). GOV-18 binds the spec corpus's normative obligations to exactly two parties: arm (a) the implementation target and arm (b) the spec corpus. Operator deployment choices about host heap flags are neither, so the MUST has no observable failure surface on any spec-covered party — it is unfalsifiable. The companion runtime-facing clause ("loom 1.0 makes no claim that the loom runtime can intercept the fatal path") binds arm (a) correctly; only the operator-directed clause violates GOV-18.

## Solution approach

Rewrite NOCEIL-3's closing sentence on `hard-ceilings.md` so the operator-directed obligation is demoted to non-normative operator guidance and the MUST is removed. Preserve the runtime-facing no-claim statement, which binds GOV-18 arm (a) correctly.

## Solution constraints

- Out of scope: the audit-methodology paragraph's parallel `operator MUST rely on cancellation; no loom 1.0 termination guarantee` per-axis example later on the same page; do not edit it here.
- NOCEIL-3 is preserved as a GOV-8 *Pure rewording* (modal weakening); the inline label is not split, retired, or renamed.

## Relationships

- T05 "Normative MUST-NOT for an unanticipated second-session disposition is buried inside a non-goal bullet" - same-cluster (sibling GOV-18-adjacent placement / scope defect; resolves independently).
# T07 - GOV-15 dangling forward reference to Future Considerations

**Kind:** scope
**Importance:** medium
**Shape:** single
**State:** reduced

## Problem

GOV-15 in `governance.md` (anchored `#gov-15-fixture-suite`) ends with "see [Future Considerations](./future-considerations.md)", a forward reference promising that the conformance fixture suite is registered there as a post-loom-1.0.0 follow-up. The `## Tooling deferrals (no V1 impact)` section of `future-considerations.md` contains no such entry — its items cover LSP support, the `loom test` dry-run command, runtime-event telemetry, and Pi-patch re-import, none describing a suite that diffs the GOV-15 (a)/(b)/(c) observables against a frozen `loom 1.0.0` baseline. The forward reference is therefore dangling, and the *Ceiling-set carve-out* paragraph's `[deferred conformance-fixture suite](#gov-15-fixture-suite)` link (which itself resolves) relies on the same absent registry entry.

## Solution approach

Add a deferral entry under `## Tooling deferrals (no V1 impact)` in `future-considerations.md` describing the suite — mechanically diffs the GOV-15 (a)/(b)/(c) observables of two loom 1.x releases against a frozen `loom 1.0.0` baseline — back-linking to [Governance — GOV-15](./governance.md#gov-15) and [Governance — Ceiling-set carve-out](./governance.md#ceiling-set-carve-out), and carrying the anchor `conformance-fixture-suite`. Rewrite the GOV-15 forward reference `see [Future Considerations](./future-considerations.md)` to target that new anchor. Leave the *Ceiling-set carve-out* internal `#gov-15-fixture-suite` link unchanged.

## Solution constraints

- The new entry MUST NOT restate the GOV-15 (a)/(b)/(c) observable list or the closure-at-`loom-1.0.0` claim; both remain owned by GOV-15 and are referenced by back-link only.

## Relationships

None
# T08 - `user` used as an undeclared synonym for `operator`

**Kind:** naming
**Importance:** medium
**Shape:** single
**State:** reduced

## Problem

The glossary declares `operator` as canonical for "the human running the Pi TUI session that hosts the loom extension" but has no entry for `user`, which is in heavy unattributed circulation across the spec in two disjoint senses. The operator-sense (the human at the TUI — "the user's session", "the user types a follow-up turn") overlaps exactly the `operator` definition. The conversation-role sense (the `user` role tag rendered by the binder transcript as `[user]`, plus the "user turn" / "user message" structural units appended by the runtime) is a Pi-SDK-fixed identifier the spec has no other term for and cannot be unified with operator-sense — a binder-synthesised user turn has no operator origin, and subagent-mode user turns enter a conversation the operator cannot see. A reader cannot tell from the glossary whether `user` aliases `operator`, names the role tag, or means a third concept.

## Solution approach

Add a `user` glossary entry in alphabetical placement that declares both senses explicitly: the operator-sense as an informal synonym for `operator`, and the conversation-role sense as the SDK-fixed message role tag, noting that the two cannot be unified. Forward-cross-reference the canonical owners — `#operator` within glossary.md, the binder transcript role-rendering at `#compact-transcript-format-normative`, and pi-integration-contract.md's conversation-role usage.

## Solution constraints

- None.

## Relationships

None
# T09 - Omnibus REQ-IDs PIC-1 and BNDR-2 bundle independently testable obligations (GOV-8 Split)

**Kind:** traceability
**Importance:** medium
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

`PIC-1` (`#pic-1` on `pi-integration-contract.md`) bundles seven independently-testable obligations labelled (a)–(g) under one identifier, and `BNDR-2` (`#bndr-2` on `binder.md`) bundles a schema-presence MUST and a runtime-non-surfacing MUST whose witnesses live in disjoint subsystems. Each clause can fail conformance independently, but a test, coverage-matrix row, or bug report citing the omnibus REQ-ID cannot identify which clause it covers. Inbound citations from `hard-ceilings.md`, `query.md`, and `diagnostics.md` already reference `PIC-1`'s sub-obligations individually in prose but all resolve to the single `#pic-1` anchor.

## Solution approach

Apply a GOV-8 *Split* on each page: split `PIC-1`'s bundled obligations into atomic per-clause successors, and split `BNDR-2` into a schema-presence successor and a runtime-non-surfacing successor. Record each retirement in a `## Retired REQ-IDs` section on the same page and append the fresh dual-form REQ-IDs at the page tail per GOV-8. Narrow each inbound `PIC-1` cite to the specific successor, and repoint `binder.md`'s System-note rendering rule 5 cross-reference and the `ambiguous` failure-modes row to the runtime-non-surfacing successor.

## Solution constraints

- On `hard-ceilings.md`, `query.md`, and `diagnostics.md`, edits narrow the inbound `PIC-1` citations to the named successors only; do not mint new REQ-ID anchors on those pages (`query.md`'s `QRY-N` pass is owned by T16).

## Relationships

- T15 "`pi-integration-contract.md` lacks `PIC-N` REQ-IDs at its normative anchor sites" - must-follow (the PIC-1 split's seven successor IDs must land on the stable numbering established by the page-wide PIC-N pass; landing both in one PR avoids two rounds of inbound repointing).
- T16 "`query.md` carries no `QRY-N` REQ-ID anchors" - same-cluster (parallel GOV-8 / GOV-1 atomic-obligation hygiene; the PIC-1 (d) predicate cites query.md rules — resolves independently).
# T10 - Anchorless "per the rule above" back-references on query.md and diagnostics.md lack citable REQ-IDs

**Kind:** traceability
**Importance:** medium
**Decision axes:** 3
**Shape:** single
**State:** reduced

## Problem

Four sites cite a normative rule by prose paraphrase rather than by a stable REQ-ID, because the cited rules have no anchor on pages that carry no `DIAG-N` / no `QRY-N` anchors. `diagnostics.md` §8 ("Host-derived freeform-tail placeholders") cites its first-line-truncation **Rule.** as "per the rule above" in the test vector and reuses the paraphrase in the *Carve-out* paragraph; `query.md` cites the fresh-`tool_loop`-budget rule from the depth-6 worked example (line 265), the "history stays intact" clause of the `## Schema-validation respond-repair` intro from the cleanup bullet (line 338), and the three-item non-validation-failures handling rule from the edge-cases paragraph (line 340). Each back-reference is positional/textual, so a future reword or re-order silently desynchronises it with no link-rot signal, and no extractable identifier maps the citation to its rule for conformance tooling or the coverage matrix.

## Solution approach

On `diagnostics.md`, add a `DIAG-1` anchor in GOV-1 dual-form at the §8 first-line-truncation **Rule.** paragraph and rewrite the §8 paraphrases (test vector plus the *Carve-out* occurrences) as `per DIAG-1` citations per GOV-9. On `query.md`, after T16 mints the page's `QRY-N` anchors, rewrite the line-265 worked example and the line-340 edge-cases paragraph to cite the relevant `#qry-n` anchors in place of the prose paraphrases. Add a dual-form `QRY-N` bullet under `## Schema-validation respond-repair` carrying the "history stays intact" guarantee — covering the trigger user turn, which the line-338 bullet asserts is preserved — then rewrite the line-338 cleanup bullet to cite it.

## Solution constraints

- Out of scope: minting `DIAG-N` anchors anywhere on `diagnostics.md` beyond the §8 first-line-truncation **Rule.** paragraph — this finding adds one fresh anchor site, not a page-wide normalisation pass.

## Relationships

- T16 "`query.md` carries no `QRY-N` REQ-ID anchors" - must-follow (the three query.md sites cannot be cited until that pass mints the QRY-N anchors; this finding's fixes land as part of, or immediately after, that pass).
- T15 "`pi-integration-contract.md` lacks `PIC-N` REQ-IDs at its normative anchor sites" - same-cluster (identical paraphrase-vs-anchor problem family; resolves independently).
# T11 - SM-2 restates the SDK-owned `session_shutdown` reason union inline and labels it "the closed normative set"

**Kind:** external-entities
**Importance:** medium
**Shape:** single
**State:** reduced

## Problem

SM-2 (`sm-2-closed-shutdown-reason-set` in `docs/spec.md`) reproduces the externally-owned `SessionShutdownEvent['reason']` union inline — `"quit" | "reload" | "new" | "resume" | "fork"` — and labels that inline reproduction "the closed normative set", while the same parenthetical immediately cedes membership authority to the SDK type. The two halves contradict: one promotes the spec-side enumeration to normative status, the next clause concedes ownership to the SDK interface. SM-2 is the only corpus site still calling that restatement "the closed normative set" — every other inbound reference is already worded as a derived listing or carries an explicit lock-step obligation back to the pinned-constants snapshot. The spec-owned normative content for this obligation is the *handling* of the values (the SM-4/SM-5/SM-6 partition, PIC's unknown-reason fallback, the diagnostic-emission predicates), not the membership itself.

## Solution approach

Rewrite the parenthetical in SM-2 (`sm-2-closed-shutdown-reason-set`) to re-label the inline five-literal enumeration as a non-normative illustration of the SDK-owned union, reserving normative status for the spec's own handling rules over the set. Forward-link `SessionShutdownEvent['reason']` authority to `#pi-sdk-pin` and the diff-audit obligation to `#pi-version-bump-procedure` in `docs/spec_topics/pi-integration-contract.md`. Leave everything after the parenthetical — the unknown-reason routing and the cross-references to PIC's diagnostic-emission sub-obligations — unchanged.

## Solution constraints

- The inline five-literal enumeration MUST NOT be deleted; only its label changes (downstream consumers read SM-2 as the orientation-level listing).
- Out of scope: PIC's *Unknown-reason rule* (`#unknown-reason-rule`) and the diagnostics §7 `<reason>` closed-enum row — both already cite SDK authority and require no edit.

## Relationships

- T12 "`loom/runtime/reload-teardown-timeout` misnames a reason-agnostic timeout" - same-cluster (both touch the operator-facing surface of the `session_shutdown` reason set; resolve independently).
# T12 - `loom/runtime/reload-teardown-timeout` misnames a reason-agnostic timeout

**Kind:** naming
**Importance:** medium
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

The diagnostic code `loom/runtime/reload-teardown-timeout` names its trigger as `reload`, but the underlying teardown timeout is reason-agnostic: per SM-3a the `session_shutdown` handler runs the fixed teardown sequence for every reason in the closed set `{quit, reload, new, resume, fork}` plus the unknown-reason fallback, so the bounded-await expiry this code reports can fire on any of them, never solely on `reload`. The misnomer also leaks into the registry row's *Message* template (`reload teardown timed out after <ms>ms; …`) and the §7 test vector, which an operator who issued `/quit` reads as factually wrong. The code is part of the public diagnostics contract (Code registry rule 3), so a rename is a spec-versioned breaking change that must propagate to every citation site. Sibling codes (`subagent-dispose-failure`, `system-note-delivery-failed`, etc.) name the failing operation rather than its trigger.

## Solution approach

Rename the code to `loom/runtime/teardown-timeout` and drop the `reload ` prefix from its *Message* template, then propagate the new string to every citation site: in `diagnostics.md` the registry row, the `loom/runtime/*` namespace summary, the persistent-diagnostics carve-out, the placeholder-rendering **Closure** clause, the §7 test vector, and the `loom/runtime/cancelled-by-session-shutdown` mutual-exclusion EXCEPT clause and its discriminator prose; in `pi-integration-contract.md` the `ActiveInvocationRegistry` **Iteration order** note, the **Diagnostic-emission isolation** enumeration, the teardown-handler `console.error`-only paragraph, and the `details: { diagnostics }` always-log exclusion list. Record the rename as a spec-versioned breaking change per Code registry rule 3, creating a retired-codes table as a sibling to the retired-prefixes / retired-REQ-IDs tables if none exists.

## Solution constraints

- Only the literal `reload ` prefix is removed from the *Message* template; the `<ms>`, `<N>`, and `<list>` placeholders and their rendering are unchanged.

## Relationships

- T11 "SM-2 restates the SDK-owned `session_shutdown` reason union inline and labels it 'the closed normative set'" - same-cluster (both touch the operator-facing surface of the `session_shutdown` reason set; resolve independently).
# T13 - Session Model SM-N anchor class is outside both governance frameworks

**Kind:** traceability
**Importance:** medium
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

The eight `SM-N` obligations on `docs/spec.md`'s Session Model section carry a published anchor stability and lifecycle contract (`sm-N-…` anchors are not reused, retired anchors are not recycled, splits append sub-letters per `#sm-anchor-scheme-stability`) and are cited cross-page, so they behave as a third cross-page-citable identifier class. The `SM` prefix is registered in neither governance framework: `spec.md` has no REQ-ID prefix (GOV-12 declares it informative-orientation) and is absent from GOV-16's per-page inline-label prefix table. This violates GOV-16's *Inline-label grammar and closure invariant* — bare-numeric tokens (`SM-1`, `SM-2`, `SM-4`, `SM-5`, `SM-6`, `SM-8`) match the closure-invariant detector regex but are neither a well-formed REQ-ID nor a well-formed inline label. The compound-tail subset (`SM-3a`, `SM-7a`…`SM-7e`) escapes the detector regex but has no governance home at all.

## Solution approach

Register `SM` as an inline-label prefix hosted on `docs/spec.md` in GOV-16's per-page inline-label prefix table (`id="gov-16"`). Extend the `Tail form` taxonomy with a value covering the existing compound `SM-3a` / `SM-7c` shape (`[1-9][0-9]*[a-z]?`) and widen the *Inline-label grammar and closure invariant* detector regex to accept it while still rejecting malformed tokens. Clarify in GOV-16 / GOV-12 (`id="gov-12"`) that GOV-12's no-per-page-REQ-ID-prefix disposition governs REQ-IDs only and does not bar `spec.md` from hosting an inline-label prefix. Append a `## Retired inline labels` section stub to `docs/spec.md` per GOV-16's *Retirement section* obligation.

## Solution constraints

- Out of scope: registering `SM` as a REQ-ID prefix — GOV-12 bars `spec.md` from hosting one; `SM` must be governed as a GOV-16 inline label.

## Relationships

- T05 "Normative MUST-NOT for an unanticipated second-session disposition is buried inside a non-goal bullet" - same-cluster (if SM-1 gains a sub-anchor under that finding, its lifecycle is covered by this registration; resolves independently).
- T02 "Governance rule inventory omits GOV-19/20/21 ..." - same-cluster (both touch the governance-rule registration surface; resolve independently).
# T14 - Glossary `GOV-N` entry pins a stale `GOV-1 through GOV-8` range

**Kind:** consistency
**Importance:** medium
**Shape:** single
**State:** reduced

## Problem

The `GOV-N (governance rule)` entry in `glossary.md` defines the class as "the numbered REQ-ID-governance rules (`GOV-1` through `GOV-8`)" and asserts that the `GOV` prefix is "reserved for these rules." Both halves are stale against `governance.md`, the canonical owner: the live governance rules run `GOV-1`, `GOV-3` through `GOV-9`, `GOV-12`, and `GOV-14` through `GOV-16`, and the `GOV` prefix is in active use through `GOV-21`. A reader using the glossary as a reference would conclude the prefix tops out at 8 and miss `GOV-9` through `GOV-21`. The pinned range also embeds a count that re-breaks on every future `GOV-N` addition, with no mechanical gate forcing the update.

## Solution approach

Rewrite the `GOV-N (governance rule)` entry in `glossary.md` so it describes the class without pinning a numeric range or restating the membership, deferring the enumeration to the REQ-ID prefix table and rule listing on `governance.md` (anchor `#req-id-prefix-table`). This matches how other glossary entries point at a canonical enumerator for externally-owned sets rather than duplicating it.

## Solution constraints

- Out of scope: the GOV-rule enumerations on `governance.md` and the `spec.md` appendix (owned by T02) — do not edit them.

## Relationships

- T02 "Governance rule inventory omits GOV-19/20/21 on both governance.md intro and spec.md appendix" - decision-overlap (same root cause — stale enumerations of the `GOV` rule set; choose a consistent description across all three sites).
# T15 - `pi-integration-contract.md` lacks `PIC-N` REQ-IDs at its normative anchor sites

**Kind:** traceability
**Importance:** medium
**Shape:** single
**State:** reduced

## Problem

`pi-integration-contract.md` is registered under the `PIC` prefix in the GOV-1 REQ-ID prefix table, making it a non-narrative page. GOV-9 requires every cross-page reference to a normative rule on a non-narrative page to resolve as a `#prefix-n` URL fragment. The page mints only `PIC-1` (`<a id="pic-1">`); its remaining normative-obligation sites carry descriptive-slug HTML anchors, so the heavy inbound cross-page traffic from `spec.md` and the sibling topic pages cannot resolve to a per-rule REQ-ID. Per-obligation conformance traceability is therefore unavailable for every PIC-owned rule except `PIC-1`.

## Solution approach

Mint sequential REQ-IDs `PIC-2`, `PIC-3`, … in GOV-1 canonical dual-form (`<a id="pic-n"></a> **PIC-N.**`) at each defining site of a normative obligation on `pi-integration-contract.md` currently exposed only through a descriptive HTML anchor, assigning IDs in source order. Per GOV-1 *Per-page progressive normalisation*, normalise every anchor site on the page in the same commit. Repoint inbound descriptive-slug cross-references in `spec.md` and the sibling topic pages to the new `#pic-n` fragments, retaining the existing descriptive anchors alongside the new ones per GOV-21 *Alias permanence*.

## Solution constraints

- Out of scope: the `PIC-1` split into successor REQ-IDs, owned by T09.

## Relationships

- T09 "Omnibus REQ-IDs PIC-1 and BNDR-2 bundle independently testable obligations (GOV-8 Split)" - must-precede (this page-wide numbering establishes the scheme the PIC-1 split's successors append to; land both in one PR).
- T16 "`query.md` carries no `QRY-N` REQ-ID anchors" - same-cluster (identical GOV-1/GOV-9 traceability gap on a different page; same fix shape, independent edit surface — the two pages may share one normalisation commit).
- T13 "Session Model SM-N anchor class is outside both governance frameworks" - same-cluster (a third unregistered identifier class; resolves via a GOV-16 registry edit rather than per-page mints).
# T16 - `query.md` carries no `QRY-N` REQ-ID anchors

**Kind:** traceability
**Importance:** medium
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

`spec_topics/query.md` is a non-narrative page bound to prefix `QRY` in the GOV-3 REQ-ID prefix table, yet it carries zero `QRY-N` anchor sites. Its normative obligations — the tool-call loop bound, typed-queries-are-tool-loop-shaped, forced-respond-turn non-compliance, schema-validation respond-repair, the `validator_error` / `schema_repeat` follow-up templates, `ContextOverflowError` detection, interpolation stringification, and others — sit as free-floating prose under section headings, each independently testable but unaddressable. At least nine in-corpus cross-page links cite these rules by descriptive HTML anchor or by bare page link, violating GOV-9, which requires every cross-page link onto a normative rule of a non-narrative page to resolve as a `#prefix-n` fragment. Per-rule conformance auditing therefore has no stable target on this page.

## Solution approach

Mint sequential `QRY-N` REQ-IDs in dual-form per GOV-1 (`<a id="qry-n"></a> **QRY-N.**`) at each normative obligation on `query.md`, treating the introducing commit as engaging per-page progressive normalisation for the whole page. Repoint every in-corpus cross-reference into `query.md` to the corresponding `#qry-n` fragment in the same commit. For bare `query.md` pointers from narrative pages, judge per site whether the link references a specific rule (repoint to `#qry-n`) or general orientation (page link suffices).

## Solution constraints

- Out of scope: the anchorless "per the rule above" paraphrase back-references on `query.md` — repointing those is owned by T10.

## Relationships

- T15 "`pi-integration-contract.md` lacks `PIC-N` REQ-IDs at its normative anchor sites" - same-cluster (identical traceability failure; same fix pattern; the two pages may share a single normalisation commit or be split).
- T10 "Anchorless 'per the rule above' back-references on query.md and diagnostics.md lack citable REQ-IDs" - must-precede (the query.md paraphrase fixes cannot land until this pass mints the QRY-N anchors they cite).
- T09 "Omnibus REQ-IDs PIC-1 and BNDR-2 bundle independently testable obligations" - same-cluster (PIC-1's V1 reachable predicate cites query.md rules; the QRY-N anchors should exist before PIC-1's split products cite them precisely).
# T17 - Slash-handler registration leaves the `getArgumentCompletions` value undefined

**Kind:** implementability
**Importance:** high
**Shape:** single
**State:** reduced

## Problem

The Pi Integration Contract pins the slash-registration call shape at the `#slash-handler-registration` anchor (Extension entry point step 3) and at the `#sdk-cap-slash-command-registration` SDK capability inventory item 1 as the literal three-key object `pi.registerCommand(name, { description, getArgumentCompletions, handler })`, presenting all three keys as required surface area. The spec never states what value loom 1.0 passes for `getArgumentCompletions`. Pi's `RegisteredCommand` type makes the property optional, so omitting the key, threading `undefined`, and supplying a no-op completer are all type-legal — yet every other loom 1.0 statement says no autocomplete surface exists (`slash-invocation.md`, `frontmatter.md`, `future-considerations.md`). Two literal-reading implementers can each be conformant while producing different `pi.registerCommand` calls, and any contract test pinning the call has nothing to assert against.

## Solution approach

Rewrite the `pi.registerCommand` literal at the `#slash-handler-registration` anchor and at `#sdk-cap-slash-command-registration` to the two-key form `pi.registerCommand(name, { description, handler })`, and sweep every other restatement of the three-key literal on `pi-integration-contract.md` (including the *Drain-state-gated dispatch* clause) to match. Add a sentence at one of those sites stating that loom 1.0 omits `getArgumentCompletions` because Pi's `RegisteredCommand` types it as optional and no loom 1.0 autocomplete surface exists, with a forward-link to [Future Considerations](./future-considerations.md) for the deferred `argumentHint`-style upstream.

## Solution constraints

- None.

## Relationships

None
# T18 - Settings scalar keys lack a malformed / out-of-range rule

**Kind:** completeness
**Importance:** high
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

`discovery.md` § "Settings file reads" › "Keys read" declares four recognised scalar `looms.*` keys (`binderModel`, `scanPackages`, `scanPackagesMaxFiles`, `scanPackagesTimeoutMs`), each with a type, default, and meaning, but states no behaviour when a key is present with the wrong type or out of its implied range (e.g. `scanPackagesMaxFiles: 0` or `25.5`, `scanPackages: "yes"`, `binderModel: 42` or `null`). The "Failure modes" sub-section covers only file-level failures and the array-entry path (`loom/load/settings-invalid-entry`); scalar-key validation falls in the gap. The frontmatter side has a parallel rule, `loom/load/frontmatter-value-out-of-range`, but settings has no analogue, so two implementers diverge — one silently accepts and degrades (cap-0 disables discovery, a non-string model crashes the binder), another rejects and falls back to the default.

## Solution approach

Add a per-key validation rule to "Settings file reads" in `discovery.md` stating that a recognised `looms.*` scalar key whose JSON value fails the declared type and range is treated as absent (the built-in default applies) with one load-time diagnostic per offending key per file, mirroring the type/range shape of `loom/load/frontmatter-value-out-of-range`. Register the diagnostic in `diagnostics.md`, either generalising `frontmatter-value-out-of-range` to cover both surfaces or adding a settings sibling with the same severity-E / phase-load shape. Pin the per-key acceptance set: `binderModel` a non-empty string; `scanPackages` the JSON literal `true` or `false`; `scanPackagesMaxFiles` and `scanPackagesTimeoutMs` integers ≥ 1 judged on the parsed numeric value, with `null` out of range for every key.

## Solution constraints

- None.

## Relationships

None
# T19 - Integer-literal magnitude bound is unspecified

**Kind:** completeness
**Importance:** high
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

`lexical.md`'s **Number literals** paragraph gives a literal with no fractional or exponent part the type `integer`, and `runtime-value-model.md` pins both `integer` and `number` to a JS `number` (IEEE-754 double). The spec does not say what happens when an `integer`-typed literal exceeds the safe-integer range (`|value| > 2^53 − 1`, e.g. `12345678901234567890`): default JS behaviour silently rounds to the nearest representable double, and because the rounded value is still integral it passes an `integer` sink with no diagnostic. The same gap applies on the `number` side at a larger threshold — a literal exceeding `Number.MAX_VALUE` (e.g. `1e400`) parses to `Infinity` with no rule covering reject / warn / accept. Two conforming implementations therefore diverge between silent precision loss (or silent `Infinity`) and a parse error.

## Solution approach

Add a magnitude/finiteness clause to the **Number literals** paragraph in `lexical.md` making an over-range `integer`-typed literal (`|value| > 2^53 − 1`) and a `number`-typed literal whose parsed value is not a finite IEEE-754 double both parse errors, consistent with the existing `loom/parse/integer-narrowing` reject-at-parse-time treatment of `integer`/`number` boundary violations. Register the corresponding new `loom/parse/*` diagnostic codes in `diagnostics.md` alongside `loom/parse/integer-narrowing`. Judge magnitude on the lexed literal token before the parse-time unary-`-` fold, so `-9007199254740992` is still rejected and `9007199254740992 - 1` (two tokens) is not.

## Solution constraints

- None.

## Relationships

- T20 "`\u{XXXX}` accepts non-scalar code points" - same-cluster (sibling completeness gap on literal value ranges in the same `lexical.md` section; resolve in the same edit pass for consistency).
- T18 "Settings scalar keys lack a malformed / out-of-range rule" - same-cluster (parallel out-of-range-scalar theme on a different page; no shared edit).
- T21 "`%` by zero is unspecified" - same-cluster (sibling numeric-semantics completeness gap; expressions.md side).
# T20 — `\u{XXXX}` accepts non-scalar code points

**Kind:** completeness
**Importance:** high
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

The `**String literals.**` paragraph in `docs/spec_topics/lexical.md` defines the Unicode escape as `\u{XXXX}` with "1–6 hex digits" and no value constraint. Six hex digits encode up to `0xFFFFFF`, exceeding the maximum Unicode scalar value `U+10FFFF`, and the unconstrained range includes the UTF-16 surrogate block `0xD800`–`0xDFFF`, which are code points but not scalar values. No diagnostic covers out-of-range or surrogate content inside a recognised `\u{...}` form: `loom/parse/illegal-escape` fires only on unrecognised characters after `\`, and `loom/load/invalid-encoding` checks raw source bytes, not ASCII-source escapes. Behaviour for `\u{110000}`, `\u{FFFFFF}`, and `\u{D800}` is therefore unspecified, so conforming implementations diverge between rejecting, emitting a lone surrogate, or substituting `U+FFFD`.

## Solution approach

Rewrite the `\u{XXXX}` escape definition in lexical.md's `**String literals.**` paragraph to constrain the escaped value `v` to a Unicode scalar value — well-formed iff `v ≤ 0x10FFFF` and `v` is outside the surrogate range `0xD800`–`0xDFFF` — and to name a parse diagnostic for any other value. Add the corresponding diagnostic row to diagnostics.md's `lex` / `E` block alongside `loom/parse/illegal-escape`.

## Solution constraints

- None.

## Relationships

- T19 "Integer-literal magnitude bound is unspecified" — same-cluster (sibling completeness gap in the same lexical section; resolve in the same editorial pass).
# T21 - `%` by zero is unspecified

**Kind:** completeness
**Importance:** high
**Decision axes:** 3
**Shape:** single
**State:** reduced

## Problem

`docs/spec_topics/expressions.md` § "Other arithmetic" pins division-by-zero behaviour (IEEE-754 `Infinity` / `-Infinity` / `NaN`, "does not panic") and states that `%` "requires same-typed operands and preserves the type", but never states what `n % 0` evaluates to. In the JS host this section keys off, `n % 0` is `NaN`, which collides with the type-preservation clause for `integer % integer`: `NaN` is a `number`, not an `integer`, so applying the operator type rule literally yields a value whose runtime type contradicts its static type. The diagnostics-page panic-catalogue exclusion paragraph lists "division by zero, integer overflow, and explicit author-driven panics" but omits modulo, so an implementer cannot infer the intended channel by analogy. Two reasonable implementations diverge — one returning `NaN`, another panicking, another widening the integer result to `number`.

## Solution approach

Clarify expressions.md § "Other arithmetic" to specify modulo-by-zero behaviour by analogy with the existing division-by-zero rule: `% 0` yields IEEE-754 `NaN` and does not panic, and the `%` type-preservation rule is conditional on a non-zero divisor so an `integer % 0` result widens to `number` per the `integer ⊑ number` rule (rule 2, [Type System — Type compatibility](./type-system.md#type-compatibility)). Extend diagnostics.md's `loom/runtime/*` closing exclusion paragraph to list modulo by zero alongside division by zero among the deliberately-excluded non-panics.

## Solution constraints

- None.

## Relationships

- T19 "Integer-literal magnitude bound is unspecified" - same-cluster (independent numeric edge-case completeness gap on a different surface — lexical vs. operator).
# T22 - Typed-query non-compliance paragraph names a placeholder (`<validator-errors>`) that does not exist

**Kind:** implementability
**Importance:** high
**Shape:** single
**State:** reduced

## Problem

The typed-query non-compliance paragraph in `docs/spec_topics/pi-integration-contract.md` (the synthesised-issue clause that feeds the respond-repair pipeline) names a `<validator-errors>` placeholder on the `validator_error` template. That template, defined normatively in `query.md` under *Follow-up turn templates*, carries no such placeholder — its sole AJV-derived placeholder is `<ajv-summary>`, the same name used by the sibling binder failure-mode templates. The token `<validator-errors>` appears nowhere else in the corpus, so an implementer or test author keying on it either searches for a token that does not exist or invents a second, divergent placeholder. This citation is the only documented bridge between the PIC non-compliance arm and the normatively-pinned template.

## Solution approach

In `pi-integration-contract.md`, rename the `<validator-errors>` placeholder reference in the typed-query non-compliance paragraph to `<ajv-summary>`, matching the placeholder the `validator_error` template actually defines in `query.md`. The surrounding clause describing the placeholder as rendered from the synthesised issue as if AJV had produced it remains accurate, since `<ajv-summary>` is the AJV-derived placeholder being described.

## Solution constraints

- Out of scope: the `validator_error` template and its `<ajv-summary>` placeholder rule in `query.md` are normative and read-only — align the PIC citation to the template, not the template to the citation.

## Relationships

- T23 "Prompt-mode untyped-query `Ok(string)` extraction is unspecified" - same-cluster (both sit in the prompt-mode driver section of PIC but resolve independently).
# T23 - Prompt-mode untyped-query `Ok(string)` extraction is unspecified

**Kind:** implementability
**Importance:** high
**Decision axes:** 3
**Shape:** single
**State:** reduced

## Problem

The **Conversation drive — prompt mode** section of `pi-integration-contract.md` pins the *contract* of an untyped query's success value — the accumulated assistant text from the final turn, read from the command context after `waitForIdle()` resolves, is the `Ok(string)` value — but not the *mechanism* that produces it. Three reads are left unbound: which member of the pinned `ReadonlySessionManager` `Pick<>` is the source surface; how "the final turn" is delimited against a long-lived user session that accumulates turns across slash-command invocations; and the per-block assembly rule (which content blocks contribute, in what order, with what separator). With the mechanism unspecified, two conformant implementations produce different `Ok(string)` payloads for the same provider transcript, breaking `?` propagation, `match` arms, and string comparisons over the value.

## Solution approach

Rewrite the `Ok(string)` sentence under **Conversation drive — prompt mode** in `pi-integration-contract.md` to pin the extraction mechanism: name the `ReadonlySessionManager` `Pick<>` member the runtime reads as the source, specify how the runtime delimits "the final turn" against the long-lived user session, and specify the per-block assembly rule for assistant content. Mirror the binder's `#compact-transcript-format-normative` block/role selection and separator handling. Add a forward-link from query.md's *Untyped return type (loom 1.0)* to the new mechanism pin.

## Solution constraints

- Extraction MUST remain downstream of the cancellation (`loomAbort.signal.aborted`) and non-empty-`errorMessage` short-circuit branches already pinned in the section; the mechanism pin must not reorder or bypass them.

## Relationships

- T24 "Subagent-mode untyped-query `Ok(string)` source is unspecified" - co-resolve (the same extraction rule must be specified symmetrically for `agent_end`; the prompt-mode pin is the model the subagent-mode pin mirrors — they should land together with parallel wording).
- T22 "Typed-query non-compliance paragraph names a placeholder (`<validator-errors>`) that does not exist" - same-cluster (both in the prompt-mode driver section; resolve independently).
- T15 "`pi-integration-contract.md` lacks `PIC-N` REQ-IDs at its normative anchor sites" - decision-overlap (once `PIC-N` anchors land, this extraction-mechanism pin should be assigned its own `PIC-N`).
# T24 - Subagent-mode untyped-query `Ok(string)` source is unspecified

**Kind:** implementability
**Importance:** high
**Decision axes:** 3
**Shape:** single
**State:** reduced

## Problem

In **Conversation drive — subagent mode**, the runtime awaits a subagent query's completion via `session.subscribe(event => { if (event.type === "agent_end") … })`, but the spec never names what is read from that event to produce the query's `Ok(string)` payload. The prompt-mode counterpart in the same file pins this explicitly; the subagent-mode paragraph has no symmetric clause. The `agent_end` event offers multiple plausible read points — the event-delivered `messages: AgentMessage[]` array versus the `AgentSession.messages` getter — and `willRetry: true` is a trap: an `agent_end` fired with `willRetry === true` precedes an automatic SDK retry, so resolving on the first event hands back the failed turn's text. Two conforming implementations therefore disagree on which string crosses the `invoke<T>`/`.loom`-callable boundary for the same provider transcript.

## Solution approach

Clarify the **Conversation drive — subagent mode** section to pin the untyped-query `Ok(string)` source symmetrically with the prompt-mode rule and T23. Specify the source surface read from the `agent_end` event (the event-delivered message array rather than the session-handle getter), the `willRetry === true` filter (such an event precedes an SDK retry and does not resolve the query), and the final-assistant-text extraction rule, mirroring the prompt-mode driver and the binder's compact-transcript role handling.

## Solution constraints

- None.

## Relationships

- T23 "Prompt-mode untyped-query `Ok(string)` extraction is unspecified" - co-resolve (symmetric pair; the prompt-mode fix and the subagent-mode fix should land together and use parallel wording so the "same final-assistant-text rule on both sides" invariant is auditable).
# T25 - §2 Runtime-value placeholder rule contradicts its own `Cat { name: "fluffy" }` test vector

**Kind:** testability
**Importance:** high
**Score:** 100
**Must-fix:** true
**Shape:** single
**State:** reduced

## Problem

`diagnostics.md` § *Placeholder rendering (normative)* › *2. Runtime-value placeholders* binds `<scrutinee summary>` and `<value>` to query.md's *Stringification of interpolated values* table, which renders a schema-typed object as compact `JSON.stringify` with wire-name translation — so `{ name: "fluffy" }` renders `{"name":"fluffy"}`. The runtime representation in `runtime-value-model.md` carries no schema-name marker, so the constructor form `Cat { name: "fluffy" }` is not producible. The first §2 test vector nonetheless asserts a `match` panic renders `MatchError: no arm matched Cat { name: "fluffy" }`. The rule and the vector are both normative, and no conforming implementation can satisfy both.

## Solution approach

The defect is the wording of the test vector. Rewrite the first test vector under diagnostics.md's `### 2. Runtime-value placeholders` so its rendered output aligns with the cited query.md stringification table: a `Cat { name: "fluffy" }` scrutinee renders `MatchError: no arm matched {"name":"fluffy"}`. Optionally clarify in that section that the schema name does not surface in rendered runtime-value strings (it surfaces through the diagnostic `code` and source location).

## Solution constraints

- Out of scope: the §2 `**Rule.**`, the other two §2 test vectors, query.md's *Stringification of interpolated values* table, and runtime-value-model.md's object representation — align the failing vector to these normative surfaces rather than widening the runtime value model with a schema-name tag.

## Relationships

- T12 "`loom/runtime/reload-teardown-timeout` misnames a reason-agnostic timeout" - same-cluster (same `diagnostics.md` topic page, independent fix).
- T10 "Anchorless 'per the rule above' back-references on query.md and diagnostics.md lack citable REQ-IDs" - same-cluster (same page §8 vs §2; both involve test-vector wording but resolve independently).
