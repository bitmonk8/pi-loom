# Consolidated Spec Review — spec

_Generated: 2026-05-07T06:44:38Z_
_71 findings retained, 10 false positives dropped, 0 persistent failures_

---

## spec.md — Opening paragraphs (before `## Orientation`)

---

# Cancellation wiring detail misplaced and over-prescribed in the orientation preamble

**Original heading:** Cancellation wiring detail misplaced and over-prescribed
**Kind:** placement, prescription

## Finding

The second sentence of `spec.md`'s third introductory paragraph names a runtime-internal identifier (`loomAbort.signal`) and prescribes a forwarding mechanism (Pi's `ctx.signal` is wrapped into `loomAbort` rather than read directly). Both the identifier and the wrap-mechanism are implementation architecture: the canonical owner of the per-invocation `AbortController`, its lineage, and its forwarding listeners is [`cancellation.md`](../../spec_topics/cancellation.md) (Signal source, Forwarding into `loomAbort`), with the SDK-side cancellation prerequisites and the rationale for not consuming `ctx.signal` directly anchored at [`pi-integration-contract.md` § Cancellation source](../../spec_topics/pi-integration-contract.md#cancellation-source). Reproducing them in the executive preamble duplicates the rule and sets up GOV-12 lock-step debt — a future change to forwarding (e.g. dropping the `agent_end` forwarding leg) would have to be co-edited at three sites instead of two.

The orientation reader needs only one fact at this point: cancellation has a separate terminal disposition from `succeeds` and `fails`, and the canonical contract lives behind a forward-link. They do not need to know that the runtime owns its own `AbortController`, what that controller is named, or how Pi's signal reaches it.

There is also a name-surface ambiguity. The preamble writes `loomAbort` as if it were an externally observable handle, but neither this paragraph nor the surrounding section says whether it is reachable from loom code, from Pi callers, or from neither. (PIC's prose makes clear it is internal, but the orientation paragraph does not telegraph that.) Resolving the placement issue dissolves this ambiguity automatically — the identifier should not appear in orientation prose at all.

## Spec Documents

- `spec.md` — Opening paragraphs (before `## Orientation`), paragraph 2 sentence 2 (edited)
- `spec_topics/cancellation.md` — Signal source / Forwarding into `loomAbort` (read-only; canonical owner)
- `spec_topics/pi-integration-contract.md` — Cancellation source (read-only; canonical owner)
- `spec_topics/governance.md` — GOV-12 (aggregator-vs-source lock-step) (read-only; supplies the placement rule the finding leans on)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None. The change is editorial within `spec.md`'s preamble and touches no normative obligation that any leaf's acceptance criteria asserts. H6's introduction-link rewrite gate operates on link *targets* (forbidding `./spec_topics/<non-narrative-page>.md#<non-prefix-anchor>`), not on prose identifiers, and the existing preamble link `./spec_topics/pi-integration-contract.md` (no anchor) is unaffected by either solution option below.

## Consequence

**Severity:** cosmetic

The orientation preamble gains a duplicate of a contract owned elsewhere, plus an internal identifier presented without ownership disclosure. No implementer is misled on behaviour — the forward-link to PIC and `cancellation.md` already exists and the canonical contracts there are intact — but the preamble accumulates GOV-12 lock-step debt and a near-occasion for the reader to mistake `loomAbort` for an observable surface.

## Solution Space

**Shape:** multiple

### Option A — Behavioural one-liner, identifier dropped

**Approach.** Replace the sentence beginning "The cancellation signal is carried by the runtime-owned `loomAbort.signal`…" with a single behavioural sentence that names neither `loomAbort` nor the forwarding direction:

> Cancellation is delivered through a per-invocation `AbortSignal` that the runtime owns and that every downstream query, tool call, and child invoke observes; the controller's lineage, the Pi-side forwarding listeners, and the per-entry-point wiring are owned by [Cancellation](./spec_topics/cancellation.md) and [Pi Integration Contract — Cancellation source](./spec_topics/pi-integration-contract.md#cancellation-source).

**Spec edits.**
- `spec.md` paragraph 2: replace the existing sentence (from "The cancellation signal is carried…" through "…rather than using `ctx.signal` directly.") with the sentence above.
- No edit to `cancellation.md` or `pi-integration-contract.md` — both already own the displaced content verbatim.

**Pros.** Removes the duplication, removes the `loomAbort` identifier from orientation, preserves the existing forward-links so a reader who needs the wiring can find it in one click. Aligns the preamble with the same delegation pattern the surrounding sentences already use for terminal-outcome routing and partial-append.

**Cons.** Loses the explicit "not `ctx.signal` directly" hint that today's preamble carries. A reader skimming only the preamble would not learn that `ctx.signal` is *not* the authoritative signal — they would have to follow the link. (PIC's Cancellation source paragraph carries the same warning prominently, so the loss is recoverable on click.)

**Risks.** None material.

### Option B — Pin `loomAbort` as an observable surface in orientation

**Approach.** Keep the identifier in the preamble but explicitly disclose its observability and ownership in the same sentence: "the runtime-owned `loomAbort` (an internal `AbortController`, not exposed to loom code or to Pi callers)…", and add a glossary entry for `loomAbort`.

**Spec edits.**
- `spec.md` paragraph 2: rewrite the sentence to inline the observability disclosure.
- `spec_topics/glossary.md`: add a `loomAbort` entry forward-linking to `cancellation.md` and PIC.

**Pros.** Preserves the explicit `ctx.signal`-is-not-authoritative hint without follow-through. Makes the identifier safe to drop into prose anywhere in the spec.

**Cons.** Doubles down on the placement problem rather than fixing it: the wrap-mechanism stays in orientation, the GOV-12 lock-step debt grows by one site (glossary entry), and the orientation paragraph still leaks an implementation identifier whose details the reader does not yet need.

**Risks.** A future edit that renames `loomAbort` (e.g. to `invocationAbort` to match the registry's naming) now has four edit sites instead of two.

### Recommendation

**Option A.** The orientation paragraph already delegates terminal-outcome routing, partial-append, and pre-evaluation failure routing through forward-links to their owner pages; the cancellation sentence should follow the same pattern. The "not `ctx.signal` directly" hint is genuinely useful but it is a PIC-level concern (the PIC Cancellation source paragraph already states it as the load-bearing rule), not orientation-level. Edge case for the implementer: when retargeting the forward-link under H6's introduction-link rewrite, the link target should aim at the REQ-ID anchor PIC assigns to its Cancellation source paragraph, not at the section anchor `#cancellation-source` — same rule as every other H6-rewritten preamble link.

## Related Findings

- "Pre-evaluation failure enumeration: normative content in preamble, list not closed" — same-cluster (same paragraph cluster, same placement-vs-orientation defect; both resolve by hoisting normative content out of the preamble)
- "`.warp` top-level forms enumeration misplaced" — same-cluster (third sibling of the same placement defect in the same preamble block)
- "Opening block has no stable anchor; obligations are bundled without IDs" — same-cluster (structural defect of the same preamble; rewording the cancellation sentence does not fix it but lives inside its scope)
- "Session swap + in-flight invocations: incomplete lifecycle and error contract" — decision-dependency (resolves by adding session-shutdown semantics that name `loomAbort`; if Option A drops `loomAbort` from preamble, the session-model paragraph must also delegate rather than introduce the identifier)
- "`createAgentSession` has no `signal` option in SDK; subagent cancellation silently broken" — decision-dependency (the cited PIC sentence and `cancellation.md` mechanism that this finding delegates to are themselves wrong about the SDK shape; Option A's forward-link target must be re-examined once that finding's PIC rewrite lands)
- "`ctx.signal` lifetime/freshness not asserted" — same-cluster (same `ctx.signal`/`loomAbort` boundary; orthogonal defect in PIC, not in the preamble)

---

# Pre-evaluation failure enumeration: inline restatement in preamble, list never marked closed at owner

**Original heading:** Pre-evaluation failure enumeration: normative content in preamble, list not closed
**Kind:** placement, completeness

## Finding

The second paragraph of `spec.md`'s pre-`## Orientation` preamble carries this passage verbatim:

> Failures that occur *before* evaluation begins — host-incompatibility detected by the capability probe, lex / parse / type batches, frontmatter rejection, binder-model resolution failure, `tools:` resolution failure, watcher-time reload failures — are NOT evaluation outcomes; they surface per [Diagnostics](./spec_topics/diagnostics.md) on the `loom-system-note` channel, never produce appended turns or a final value, and are not subject to cancellation.

The same six-item enumeration and the same routing assertions appear, almost word-for-word, in `spec_topics/errors-and-results.md` immediately under the **Terminal outcomes** anchor (line 58). That topic-page paragraph is the canonical owner: it sits inside the section that GOV-12 already cites as the `## Errors and Results — Terminal outcomes` rule and is two lines below the closure phrase `the set is closed:` for the trichotomy.

Two distinct defects follow:

1. **Undeclared aggregator.** GOV-12 enumerates the spec.md aggregator surfaces by name (the four Scope bullets, the Pi-SDK-and-capabilities bullets, the three Host-runtime obligations, the four hard-runtime ceilings, and the `.warp` permitted-top-level-forms list). The pre-evaluation failure list is not in that enumeration, yet the preamble paragraph behaves like an aggregator — it restates the routing rule (`loom-system-note` channel, no appended turns, no cancellation) inline rather than confining itself to a forward-link. None of the canonical aggregator paragraphs around it carry their `*orientation aggregator per [Governance — GOV-12]*` tag here either. Either GOV-12 must list this paragraph (and the paragraph must be tagged), or the inline restatement must collapse to a forward-link.

2. **Closure absent at the owner.** Neither the preamble version nor the canonical `errors-and-results.md` version states that the six items are exhaustive. Both render the list with em-dash apposition, no count, no "the following six," no "exhaustively." A reviewer encountering a seventh failure mode (path collision between `.loom` files, secret-store unavailability at frontmatter resolution, watcher-startup failure distinct from reload failure, manifest-load failure for the binder model registry, etc.) cannot determine from either page whether it joins the bucket or constitutes an unanchored case. Closure of the trichotomy itself is asserted ("the set is closed"); closure of the pre-evaluation bucket is not.

## Spec Documents

- `spec.md` — pre-`## Orientation` preamble, paragraph 2 (`Loom evaluation produces one of three terminal outcomes…`) (edited)
- `spec_topics/errors-and-results.md` — `<a id="terminal-outcomes"></a>` block, sentence beginning `The trichotomy applies only once evaluation has begun.` (edited)
- `spec_topics/governance.md` — GOV-12 aggregator enumeration (option-dependent — edited only if the preamble paragraph is preserved as an aggregator)
- `spec_topics/diagnostics.md` — read-only (referenced as the diagnostic-code owner that the pre-evaluation bucket routes through)

## Plan Impact

**Phases:** Horizontal H6

**Leaves (implementation order):**

- H6 — REQ-ID anchor insertion and coverage-matrix re-pivot — (modified)

H6 already plans to retarget every `spec.md` introduction link from a section anchor to a `#prefix-n` REQ-ID anchor and explicitly carves out the third introductory paragraph's bundled prose pointers. Resolving this finding either tightens that carve-out (the preamble paragraph collapses to a single `[Errors and Results — Terminal outcomes](#err-N)` link, which H6 then retargets to the closed-list REQ-ID once it lands) or widens it (a new declared aggregator, with its REQ-ID-anchor target on `errors-and-results.md`). Either way, H6's introduction-link rewrite step needs to know the final shape before it runs.

## Consequence

**Severity:** advisory

A maintainer who later adds a seventh pre-evaluation failure mode has no signal from either page that the list was meant to be closed, so the new mode may be added in one place and not the other (the GOV-12 lock-step convention applies only to declared aggregators, and this paragraph is not declared). A reviewer attempting to classify a novel runtime failure cannot decide from `errors-and-results.md` alone whether it belongs in the pre-evaluation bucket or constitutes a missing case. The implementation is unaffected — every individual diagnostic code is owned and tested elsewhere.

## Solution Space

**Shape:** single

### Recommendation

Make two coordinated edits.

1. **In `spec_topics/errors-and-results.md`** — close the bucket at its owner. Rewrite the sentence under `<a id="terminal-outcomes"></a>` so the six items are presented as an explicitly closed enumeration. Suggested shape:

   > The trichotomy applies only once evaluation has begun. The complete V1 set of failures that occur *before* evaluation begins is the six below; each surfaces per [Diagnostics](./diagnostics.md) on the `loom-system-note` channel, never produces appended turns or a final value, and is not subject to cancellation:
   >
   > 1. host-incompatibility detected by the capability probe (per [Pi Integration Contract — Step 0](./pi-integration-contract.md#entry-capability-probe))
   > 2. lex / parse / type batches (per [Diagnostics](./diagnostics.md))
   > 3. frontmatter rejection (per [Parameters and Frontmatter](./frontmatter.md))
   > 4. binder-model resolution failure (per [Slash-Command Argument Binding — Strict-capability requirement](./binder.md#strict-capability-requirement))
   > 5. `tools:` resolution failure (per [Parameters and Frontmatter — `tools`](./frontmatter.md#tools))
   > 6. watcher-time reload failures (per [Discovery](./discovery.md))
   >
   > No additional pre-evaluation failure surface applies in V1 — a future leaf that introduces one updates this list and the new failure's owner page in the same commit per the GOV-12 lock-step convention extended to this paragraph.

2. **In `spec.md` preamble** — replace the inline restatement with a single forward-link sentence. Suggested replacement for the existing `Failures that occur *before* evaluation begins — …` sentence:

   > Failures that occur before evaluation begins are owned, with their closed enumeration and per-cause routing rule, by [Errors and Results — Terminal outcomes](./spec_topics/errors-and-results.md#terminal-outcomes); they never become evaluation outcomes.

   No item names, no channel name, no cancellation assertion in the preamble.

3. **In `spec_topics/governance.md` GOV-12** — leave the aggregator inventory untouched. Under this resolution the preamble paragraph is no longer an aggregator (it carries no enumeration), so it does not need to be added to GOV-12's list.

Edge cases the implementer must watch:

- The preamble paragraph still carries the trichotomy itself, the cancellation-wiring claim, and the partial-append claim. Each of those is a separate finding; do not collapse the whole paragraph to a single link in this edit. Touch only the `Failures that occur *before* evaluation begins…` sentence.
- The closure note in `errors-and-results.md` borrows the same lock-step phrasing the hard-runtime-ceilings bullet uses in `spec.md`. If GOV-12 is retitled or its lock-step paragraph rewritten by a separate fix, keep the wording aligned.
- H6's introduction-link gate greps for `./spec_topics/<non-narrative-page>.md#<non-prefix-anchor>` residue. After this edit the preamble paragraph contains exactly one such link (the new forward-link to `#terminal-outcomes`), which H6 will then retarget to the REQ-ID anchor it assigns to the closed-list rule on `errors-and-results.md`. Confirm H6's bundled-prose carve-out still recognises this link as a discrete per-page pointer.

## Related Findings

- "Cancellation wiring detail misplaced and over-prescribed" — same-cluster (same preamble paragraph, same misplacement category, different sentence)
- "`.warp` top-level forms enumeration misplaced" — same-cluster (same `replace inline restatement with forward-link` resolution pattern in the preamble; different list)
- "Opening block has no stable anchor; obligations are bundled without IDs" — co-resolve (giving the preamble a heading and per-paragraph aggregator tagging is the same edit that carries this fix's GOV-12 disposition)
- "GOV-12 aggregator labels are editor instructions embedded in normative text" — decision-dependency (the chosen tagging convention determines whether the preamble keeps any aggregator paragraphs at all, which in turn determines whether this fix needs the GOV-12 inventory edit)
- "Watcher-time reload failures introduced without context or forward-link" — same-cluster (item 6 of the same six-item list; the `errors-and-results.md` rewrite above resolves it by attaching the [Discovery] forward-link)

---

# `.warp` permitted-top-level-forms aggregator sits in preamble, not under `## Orientation`

**Original heading:** `.warp` top-level forms enumeration misplaced
**Kind:** placement

## Finding

`spec.md` paragraph 4 (the last paragraph before `## Orientation`) carries the parenthetical "(currently five: `import`, `export`, `fn`, `schema`, `enum` — *orientation aggregator per [Governance — GOV-12]*)" appended to a forward-link to `imports.md#permitted-top-level-forms`. GOV-12 explicitly enumerates this list as one of five recognised `spec.md` aggregator paragraphs and prescribes a lock-step maintenance discipline for it, so the duplication itself is sanctioned. Ownership is not in dispute — the forward-link to `imports.md` is already present and `imports.md` already carries the binding text "Top-level may contain only `import`, `export`, `schema`, `enum`, and `fn`".

What is anomalous is *placement*. The other four aggregator paragraphs that GOV-12 names — the four Scope bullets, the Pi SDK and capabilities bullet list, the three Host runtime obligations, and the four-item hard-runtime-ceilings list — all live under `## Orientation` and most carry an explicit `*Orientation aggregator (per [Governance — GOV-12])*` marker. The `.warp` enumeration is the only GOV-12-recognised aggregator embedded in the un-headed executive preamble, where it sits inside a sentence whose primary job is to introduce the `.loom` / `.warp` extension split, not to mirror a five-element source list. A reader scanning `## Orientation` for the catalogue of aggregator paragraphs will not find it.

The marker the spec uses here ("orientation aggregator per GOV-12") is also the wrong literal — every other GOV-12 aggregator uses the prefixed sentence form `*Orientation aggregator (per [Governance — GOV-12]).*` rather than the in-parenthetical form used here.

## Spec Documents

- `spec.md` — Opening paragraphs (before `## Orientation`), specifically the `.loom` / `.warp` extension paragraph (edited)
- `spec_topics/imports.md` — `Permitted top-level forms` anchor and `.warp` file rules (read-only — confirms the five-form list and that ownership already sits there)
- `spec_topics/governance.md` — GOV-12 (read-only — sanctions the aggregator pattern, names this list as one of five aggregators, and fixes the maintenance convention)

## Plan Impact

**Phases:** None

**Leaves (implementation order):** None

(`V17a — \`.warp\` files parse with body restriction` references the same five-form list, but its `Spec`, `Adds`, `Tests`, and `Ships when` fields all bind to `imports.md`; moving or collapsing the `spec.md` aggregator parenthetical does not touch its acceptance criteria or unblock anything.)

## Consequence

**Severity:** cosmetic

A reader inventorying the GOV-12 aggregators by scanning `## Orientation` will miss this one and may conclude the convention is followed in four places out of four rather than four out of five. Lock-step drift risk is unchanged either way (GOV-12 already governs maintenance and explicitly notes no CI gate detects drift). Nothing observable to implementers or runtime behaviour is affected.

## Solution Space

**Shape:** multiple

### Option A — Move the enumeration under `## Orientation` as its own aggregator bullet

**Approach.** Strip the `(currently five: …)` parenthetical from the preamble paragraph, leaving only the bare forward-link to `[Imports — Permitted top-level forms]`. Add a new aggregator entry under `## Orientation` (either as a fifth Scope bullet or as a sibling paragraph following Host runtime), formatted in the same `*Orientation aggregator (per [Governance — GOV-12]).*` style the other aggregators use, listing the five forms and forward-linking to `imports.md#permitted-top-level-forms`.

**Spec edits.**
- `spec.md` paragraph 4: replace `(currently five: \`import\`, \`export\`, \`fn\`, \`schema\`, \`enum\` — *orientation aggregator per [Governance — GOV-12](./spec_topics/governance.md)*)` with nothing (i.e. end the sentence at the link).
- `spec.md` under `## Orientation`: add a paragraph or bullet `**\`.warp\` permitted top-level forms.** *Orientation aggregator (per [Governance — GOV-12]).* The five permitted top-level forms in a \`.warp\` file are \`import\`, \`export\`, \`fn\`, \`schema\`, \`enum\`; the binding rule and the rejection diagnostic \`loom/parse/warp-top-level-statement\` are owned by [Imports — Permitted top-level forms](./spec_topics/imports.md#permitted-top-level-forms).`
- No edits to `imports.md` or `governance.md`.

**Pros.**
- Brings the placement into line with the other four GOV-12 aggregators.
- Preserves the GOV-12-sanctioned aggregator and its lock-step purpose.
- Makes the `## Orientation` section a complete catalogue of aggregator paragraphs.

**Cons.**
- Adds a new paragraph/bullet under Orientation, slightly enlarging that section.
- Two edits instead of one.

**Risks.**
- A future editor adding a sixth `.warp` form must remember the new aggregator location; GOV-12 already covers this so risk is no greater than for the other four aggregators.

### Option B — Collapse the preamble parenthetical to a bare forward-link

**Approach.** Strip `(currently five: \`import\`, \`export\`, \`fn\`, \`schema\`, \`enum\` — *orientation aggregator per [Governance — GOV-12](./spec_topics/governance.md)*)` and leave only the existing forward-link to `[Imports — Permitted top-level forms]`. Update GOV-12's enumeration of recognised aggregators to drop "the `.warp` permitted-top-level-forms list" from the list of five.

**Spec edits.**
- `spec.md` paragraph 4: remove the parenthetical as in Option A.
- `spec_topics/governance.md` GOV-12 sentence "(currently: the four Scope bullets, the Pi SDK and capabilities bullet list, the three Host runtime obligations, the four-item hard-runtime-ceilings list, and the `.warp` permitted-top-level-forms list)": drop the trailing `, and the \`.warp\` permitted-top-level-forms list` clause; correspondingly drop the parenthetical example `, adds a sixth \`.warp\` permitted form` from the change-trigger enumeration later in the same paragraph.

**Pros.**
- Smallest diff in `spec.md`.
- Removes the only aggregator that lives outside `## Orientation`, simplifying the GOV-12 catalogue rather than expanding it.

**Cons.**
- Eliminates a sanctioned aggregator the spec author deliberately chose to maintain.
- Loses the at-a-glance count ("currently five") that lets a reader notice silent growth without chasing the link.
- Requires editing `governance.md`, which is more contentious than editing `spec.md`.

**Risks.**
- A future PR adding a sixth `.warp` form would no longer have a lock-step trigger in `spec.md`; reviewers must rely on `imports.md` diff alone.

### Recommendation

Take **Option A**. The spec author has already invested in the GOV-12 aggregator pattern and applied it to four other lists; the `.warp` enumeration was clearly intended to be the fifth, and the only defect is that it landed in the wrong section. Promoting it under `## Orientation` with the standard `*Orientation aggregator (per [Governance — GOV-12]).*` marker brings it into line with its siblings and makes `## Orientation` a closed catalogue of all five aggregators. The implementer should keep the wording of the new aggregator entry minimal — list the five forms, name the diagnostic, forward-link to `imports.md#permitted-top-level-forms` — and must not restate any normative text from `imports.md` beyond the bare list.

## Related Findings

- "Cancellation wiring detail misplaced and over-prescribed" — same-cluster (different specific issue, both target placement defects in the un-headed executive preamble)
- "Pre-evaluation failure enumeration: normative content in preamble, list not closed" — same-cluster (also a preamble-placement complaint about a closed enumeration)
- "Opening block has no stable anchor; obligations are bundled without IDs" — same-cluster (overarching traceability defect on the same three-paragraph preamble block; resolving it by introducing an `## Overview` heading with anchors would render the placement question moot for this finding too)

---

# Opening introduction lacks a section heading and per-paragraph anchors

**Original heading:** Opening block has no stable anchor; obligations are bundled without IDs
**Kind:** traceability

## Finding

The four paragraphs between `# pi-loom — Extension Specification` and `## Orientation` carry the most heavily-cited orientation content in the corpus — the three terminal outcomes (success / fail / cancelled), the `loomAbort.signal` cancellation wiring, the partial-append contract, the pre-evaluation failure enumeration, the `.loom` vs `.warp` extension split, and the language's "no file/network/process primitive" claim — but they live as anonymous prose. There is no `##` heading, no `<a id>` anchor, and no `**PREFIX-N.**` marker. The only addressable handle is the file itself.

GOV-12 deliberately exempts `spec.md` from the REQ-ID prefix table and labels its content "informative orientation," and H6 (REQ-IDs leaf) confirms `spec.md` "is not in the per-page anchor loop and receives no `GOV-N` markers." So the original suggestion to assign REQ-IDs to these paragraphs is foreclosed; the legitimate complaint is that the introduction is also missing the lighter-weight citability mechanism the rest of `spec.md` already uses — a section heading and, where multiple distinct claims share a paragraph, a sub-anchor. Compare the Scope subsection just below, which itself has a heading plus an anchored hard-ceilings bullet (`<a id="hard-runtime-ceilings">`); the introduction has neither. A reviewer who wants to point at "the partial-append claim in `spec.md`" or a test author who wants to assert "the introduction enumerates exactly three terminal outcomes" must cite by paragraph index, which silently re-binds whenever the introduction is reflowed.

The introduction is also not enumerated in GOV-12's aggregator inventory ("the four Scope bullets, the Pi SDK and capabilities bullet list, the three Host runtime obligations, the four-item hard-runtime-ceilings list, and the `.warp` permitted-top-level-forms list"), which means the lock-step convention that keeps Scope bullets honest does not protect the introduction either.

## Spec Documents

- `spec.md` — introduction (prose between H1 and `## Orientation`) (edited)
- `spec_topics/governance.md` — GOV-12 aggregator inventory (edited)
- `spec_topics/governance.md` — REQ-ID prefix table, GOV-1, GOV-3 (read-only — establishes that `spec.md` carries no prefix)
- `spec_topics/errors-and-results.md` — Terminal outcomes, Partial-append contract (read-only — current owners of the claims that would become forward-link targets)
- `spec_topics/pi-integration-contract.md` — Cancellation source (read-only — current owner of `loomAbort` wiring)
- `spec_topics/imports.md` — Permitted top-level forms (read-only — current owner of the `.warp` enumeration)
- `spec_topics/diagnostics.md` — pre-evaluation failure routing (read-only — current owner of the failure-routing taxonomy)

## Plan Impact

**Phases:** Horizontal H6.

**Leaves (implementation order):**

- H6 — REQ-ID anchor insertion and coverage-matrix re-pivot — (modified)

H6 is the only leaf that already touches the introduction: its **Adds** clause rewrites every cross-reference in the introduction to point at a `#prefix-n` anchor, and its **Tests** include a gate that `grep`s the introduction (defined as "the prose between the H1 title and the `## Orientation` header") for residual section-anchor link targets. Adding a heading or sub-anchors to the introduction changes the textual span H6's grep operates over and changes the link-rewriting surface. H6 must be modified to (a) restructure the introduction in the same pass, (b) update its grep span definition if a new heading is inserted, and (c) leave the introduction's outbound links in their current form (still pointing at REQ-ID anchors on topic pages) regardless of any new local anchors added.

No other leaf references the introduction. No leaf adds REQ-IDs to `spec.md` itself, and that disposition is correct under GOV-12 — this finding does not change it.

## Consequence

**Severity:** advisory

Reviewers and test authors cannot cite an individual claim from the introduction by a stable handle, only by paragraph position. The introduction silently drifts out of GOV-12's aggregator inventory's protection because it is not listed there. Implementers are not blocked — they can still follow the forward-links to the owning topic pages — but every downstream reviewer of `spec.md` must redo the "which paragraph contains which obligation" mapping by hand, and any rewording that changes paragraph order silently invalidates external citations.

## Solution Space

**Shape:** multiple

### Option A — Heading-only

**Approach.** Insert a single `## Overview` (or `## Loom Evaluation Contract`) heading immediately after the H1, with an explicit `<a id="overview">` anchor on the heading line for stability under GitHub-slug changes. Keep the four paragraphs as prose; do not add per-paragraph anchors. Do not add the section to GOV-12's aggregator inventory (it is plain orientation prose, not an enumeration of items mirrored on topic pages).

**Spec edits.**
- `spec.md`: add heading + anchor; no prose changes.
- `plan_topics/h6-req-ids.md`: update the gate-9 grep span definition from "prose between the H1 title and the `## Orientation` header" to "prose under `## Overview` (the section between the new heading and the next `##` heading)" — the substantive scope is unchanged.

**Pros.**
- Minimal diff; no risk of losing prose flow.
- Consistent with current spec.md style (the Scope subsection is also a single heading over mostly-prose content).
- No GOV-12 edit needed.

**Cons.**
- Citability granularity stops at the section level. "The partial-append claim in `Overview`" is still ambiguous if Overview ever splits into multiple distinct claims that need separate citations.

**Risks.**
- Future editors may grow the section without re-evaluating whether per-claim anchors are now warranted.

### Option B — Heading plus aggregator restructure

**Approach.** Insert `## Overview` + anchor as in Option A, then convert the four prose paragraphs into a Scope-style bulleted aggregator: one bullet per orientation topic (terminal outcomes, cancellation source, partial-append contract, pre-evaluation failures, `.warp` extension, no-effect-primitive), each bullet with its own `<a id="overview-...">` anchor and an explicit forward-link to the REQ-ID anchor on the owning topic page. Add the new aggregator to GOV-12's enumerated inventory.

**Spec edits.**
- `spec.md`: introduction restructured into a bulleted aggregator under `## Overview`, with per-bullet anchors and forward-links.
- `spec_topics/governance.md` GOV-12: extend the aggregator inventory parenthetical from "(currently: the four Scope bullets, …, and the `.warp` permitted-top-level-forms list)" to also list "the Overview aggregator bullets."
- `plan_topics/h6-req-ids.md`: update the gate-9 grep span as in Option A; H6's outbound-link rewrite still applies (per-bullet links target the same `#prefix-n` anchors the prose links currently target).

**Pros.**
- Per-claim citability without violating GOV-12 (no REQ-IDs are added to `spec.md`; the per-bullet anchors are local-only and do not appear in the prefix table).
- Mirrors the Scope subsection's existing pattern, so the corpus has one consistent way to express "informative aggregator over normative content owned elsewhere."
- The introduction enters GOV-12's protection: PRs that retire a topic-page item must update the Overview bullet in the same commit.

**Cons.**
- Larger diff; changes prose flow into list form, which loses some narrative continuity for first-time readers.
- Adds another aggregator to GOV-12's drift surface, which is reviewer-enforced rather than CI-enforced.

**Risks.**
- The current introduction interleaves several claims per sentence (e.g., paragraph 2 mixes the trichotomy with the cancellation-wiring detail and the partial-append contract); decomposing it cleanly requires editorial judgement and may force decisions on adjacent findings ("Cancellation wiring detail misplaced and over-prescribed", "Pre-evaluation failure enumeration: normative content in preamble, list not closed", "`.warp` top-level forms enumeration misplaced") in the same edit.

### Recommendation

Take Option B. The introduction is already de facto an aggregator — every claim it makes is owned by a topic page it forward-links to — so making that structure explicit aligns it with the existing Scope and Hard-runtime-ceilings patterns and brings it under GOV-12's lock-step convention. The three same-cluster findings listed below all want to edit the same paragraphs, and bulletising the introduction is the natural carrier for those edits; resolving them as separate prose-level patches over the current run-on paragraphs would be lossier and more brittle. The implementer must (a) keep `spec.md` free of `**PREFIX-N.**` markers per GOV-12, (b) add the new aggregator to GOV-12's inventory parenthetical in the same commit, and (c) update H6's introduction grep-span definition to follow the new section boundary rather than the old "between H1 and `## Orientation`" definition.

## Related Findings

- "Cancellation wiring detail misplaced and over-prescribed" — co-resolve (same paragraph 2; bulletising forces an explicit split between cancellation orientation and the `loomAbort` mechanism)
- "Pre-evaluation failure enumeration: normative content in preamble, list not closed" — co-resolve (same paragraph 3; a dedicated bullet can carry the closure language and the forward-link)
- "`.warp` top-level forms enumeration misplaced" — co-resolve (same paragraph 4; a dedicated bullet can replace the inline enumeration with a forward-link)
- "\"Final value\" definition: ambiguous precedence between trailing expression and `return expr`" — same-cluster (same paragraph 1; resolves independently via wording)
- "\"mid-stream streaming fragments governed separately\" — link target missing" — same-cluster (same paragraph 2; resolves independently by adding the missing link)
- "No REQ-IDs assigned anywhere in spec.md; normative obligations in hub are unciteable" — decision-dependency (the cross-cutting form of this finding; both must agree that GOV-12's "no REQ-IDs in spec.md" stance stands and that the citability gap is closed by section/bullet anchors plus forward-links rather than by REQ-IDs)
- "Four Scope dispositions lack stable anchors" — same-cluster (the Scope subsection has the same per-bullet-anchor gap that Option B would address for the introduction; resolving both with the same anchoring discipline keeps the two adjacent sections symmetric)
- "GOV-12 aggregator labels are editor instructions embedded in normative text" — decision-dependency (that finding wants to remove inline GOV-12 maintenance labels from `spec.md`; Option B here adds a new aggregator that GOV-12 must list, so the two edits must agree on whether the lock-step labels live in `spec.md` prose or only in `governance.md`)

---

# "Final value" in the opening preamble joins tail expression and `return expr` with bare "or"

**Original heading:** "Final value" definition: ambiguous precedence between trailing expression and `return expr`
**Kind:** clarity

## Finding

`spec.md` (paragraph at line 5) introduces the *final value* concept with the phrase:

> "evaluation also produces a *final value* — the loom's last expression or `return expr` per [Function Definitions — Final value]"

The bare "or" admits two readings: (a) one supersedes the other when both are present (in which case the spec needs to say which fires first), or (b) they are interchangeable specifications of the same value (in which case a `return expr` mid-body and a tail expression both contribute and the relationship is left undefined). Neither reading is selected here.

The cited anchor — [`functions.md#final-value-language-definition`](../../../spec_topics/functions.md) — does not resolve the ambiguity either. Its definition reads "the value of its tail expression (success path only), or the literal `null` per the **Empty-tail body** rule"; `return expr` is not mentioned at all under that anchor. The actual short-circuit semantics are stated only in `return.md` ("`return expr` exits the enclosing function (or top-level loom) immediately, producing `expr` as the value of that scope … From a top-level loom, `return expr` exits the loom with `expr` as its return value, exactly as a tail expression would"). So the aggregator forwards to an anchor that, by itself, omits the very interaction the aggregator gestures at.

The behavior is unambiguous in implementation terms (a `return` short-circuits the block, so any tail expression after it is unreachable), but the canonical "Final value" definition does not say so, and the aggregator's "or" obscures rather than names that fact.

## Spec Documents

- `spec.md` — opening preamble, paragraph at line 5 ("On the success outcome, evaluation also produces a *final value* …") (edited)
- `spec_topics/functions.md` — `<a id="final-value-language-definition">` block, ~line 38 (edited)
- `spec_topics/return.md` — already states the short-circuit semantics; no change required (read-only)
- `spec_topics/invocation.md` — `#typed-return` anchor, downstream consumer of the definition (read-only)

## Plan Impact

**Phases:** Vertical V8, Vertical V9

**Leaves (implementation order):**

- V8f — `return` statement — (modified)
- V9c — Tail-expression return — (modified)

Both leaves already implement the underlying behavior; the modification is to add an interaction test (a body whose `return expr` precedes a different tail expression: the `return`'s operand is the final value, the tail expression is unreachable and triggers `loom/parse/unreachable-code`). V9c is the natural home for the assertion that a tail expression yields the final value *in the absence of an earlier `return`*.

## Consequence

**Severity:** advisory

A first-time reader of `spec.md` cannot tell from the paragraph or its forward-link whether `return expr` and the tail expression coexist, override, or are mutually exclusive. Implementers will reach the right answer by reading `return.md`, but a reviewer citing only the canonical "Final value" anchor in `functions.md` will find the `return` case missing entirely, weakening citability.

## Solution Space

**Shape:** single

### Recommendation

Two coordinated edits:

1. **`spec.md` line 5.** Replace
   > "the loom's last expression or `return expr` per [Function Definitions — Final value]"

   with
   > "the value of the loom's tail expression, or — if an explicit `return expr` executes first — the operand of that `return`, per [Function Definitions — Final value]."

   The phrase "executes first" makes the short-circuit precedence explicit without requiring a reader to chase two anchors.

2. **`spec_topics/functions.md` `#final-value-language-definition`.** Extend the first sentence of the **Final value (language definition)** block to acknowledge `return`:
   > "A loom or function's *final value* is the value of its tail expression on the success path, the operand of an explicit `return expr` if one short-circuits the body before the tail is reached (per [Return Statement](./return.md)), or the literal `null` per the **Empty-tail body** rule when no tail expression exists."

   This keeps `return.md` as the normative owner of `return`'s evaluation semantics while making the canonical "Final value" anchor self-contained for citation.

Edge cases the implementer must keep in mind:

- A `return expr` followed by a tail expression in the same block must continue to emit `loom/parse/unreachable-code` (already specified in `return.md`); the wording change does not weaken that.
- `return` from inside a nested control-flow construct (e.g., `if`, `for`) still exits the enclosing function/loom, not just the inner block — already covered by `return.md` and not in scope to restate at the aggregator.
- The `void` carve-out is unchanged: a `void`-typed loom or function still has no observable final value regardless of whether the body ends in `return`, a tail expression, or neither.

## Related Findings

- "Cancellation wiring detail misplaced and over-prescribed" — same-cluster (same opening paragraph; resolves independently)
- "Pre-evaluation failure enumeration: normative content in preamble, list not closed" — same-cluster (same opening paragraph; resolves independently)
- "`.warp` top-level forms enumeration misplaced" — same-cluster (same opening paragraph; resolves independently)
- "Opening block has no stable anchor; obligations are bundled without IDs" — co-resolve (assigning a REQ-ID to the *final value* obligation is the natural way to land both fixes in one edit pass)
- '"mid-stream streaming fragments governed separately" — link target missing' — same-cluster (the other forward-link gap in the same paragraph)

---

# Streaming-fragment carve-out in the preamble lacks an inline forward link

**Original heading:** "mid-stream streaming fragments governed separately" — link target missing
**Kind:** clarity

## Finding

Paragraph 2 of `spec.md` (the executive preamble, before `## Orientation`) summarises the partial-append contract as a three-clause parenthetical:

> "(turns appended before the terminal event remain in the driven conversation; the runtime performs no implicit rollback; mid-stream user-visible streaming fragments are governed separately) is owned by [Errors and Results — Partial-append contract](./spec_topics/errors-and-results.md#partial-append-contract)."

The third clause is a scope-disclaimer: the partial-append contract does *not* govern user-visible streaming fragments, those are governed elsewhere. Every other forward-reference in that paragraph carries an inline Markdown link (`Hard runtime ceilings`, `Cancellation`, `loomAbort.signal`, `Errors and Results — Terminal outcomes`, `Errors and Results — Partial-append contract`, `Diagnostics`). The streaming-fragment carve-out is the lone exception — the reader is told a separate governance regime exists but is given no pointer to it.

The destination does exist. `errors-and-results.md` (the page already linked one phrase later) carries the resolving sentence inside its `partial-append-contract` block: "Mid-stream user-visible streaming fragments are governed separately by [Slash-Command Invocation — User-visible streaming](./slash-invocation.md)." So the carve-out *is* reachable from the preamble — but only by a two-hop chase, and only by a reader who notices that the partial-append-contract target page repeats the same phrase. A direct inline link is a one-token edit that removes the friction and brings this clause into stylistic conformity with the rest of the paragraph.

A complicating detail: `spec_topics/slash-invocation.md` has no `## ` headings and no `<a id>` anchors anywhere in the file — `**User-visible streaming.**` is bold-prose label, not an ATX heading. A deep-link `#user-visible-streaming` therefore does not resolve under either branch of the V18s spec-anchor gate (no literal `<a id>`, no GFM auto-slug from an ATX heading). The fix must either add the anchor or link only at page granularity.

## Spec Documents

- `spec.md` — paragraph 2 of preamble, the partial-append-contract parenthetical (edited)
- `spec_topics/slash-invocation.md` — the `**User-visible streaming.**` block, lines 22–25 (edited — to add an `<a id="user-visible-streaming"></a>` anchor)
- `spec_topics/errors-and-results.md` — `partial-append-contract` section, line 71 (read-only — already supplies the resolved link, used as the fix template)
- `spec_topics/governance.md` — GOV-1 / GOV-9 dual-form anchor convention and link-resolution rule (read-only — constrains the fix's anchor form)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None. The fix is a textual spec edit; no leaf's `Adds` / `Tests` / `Ships when` change. `V18s — Spec-anchor gate` (in `plan_topics/v18-cancellation.md`) will mechanically validate the new link when it lands; the leaf itself needs no modification, and the new anchor is exactly the dual-form construction it already enforces.

## Consequence

**Severity:** cosmetic

A reader of the preamble who wants to know how mid-stream streaming fragments are actually governed must follow the partial-append-contract link, scan that page for the same phrase, then follow a second link. Stylistically inconsistent with the rest of the paragraph but produces no implementer divergence — the obligation is reachable, just farther than the prose suggests.

## Solution Space

**Shape:** single

### Recommendation

Two coupled edits:

1. In `spec_topics/slash-invocation.md`, immediately before line 22's `**User-visible streaming.**`, insert a standalone line:

   ```html
   <a id="user-visible-streaming"></a>
   ```

   This is the GOV-1 *Permitted alternate contexts* form for a non-heading block. No surrounding text changes.

2. In `spec.md` paragraph 2, replace the bare clause `mid-stream user-visible streaming fragments are governed separately` with:

   ```
   mid-stream user-visible streaming fragments are governed separately by [Slash-Command Invocation — User-visible streaming](./spec_topics/slash-invocation.md#user-visible-streaming)
   ```

Edge cases the implementer must watch:

- The anchor must be on its own source line (not inline within the bold prose) so V18s's GOV-1 *Permitted alternate contexts* check classifies it correctly. The `<a id>` HTML form is permitted here because the `**User-visible streaming.**` label is not an ATX heading and cannot be promoted to one without restructuring the page (which would broaden the edit beyond this finding's scope).
- Do not add an ATX heading (`### User-visible streaming`) as a shortcut — `slash-invocation.md` is currently a flat one-H1 page, and introducing a single sub-heading would create a structural inconsistency with the rest of the page that other findings about the page's organisation should resolve, not this one.
- Re-run the V18s spec-anchor gate (or its `grep`-based predecessor) after the edit to confirm `slash-invocation.md#user-visible-streaming` resolves under the GOV-1 dual-form rule.

## Related Findings

- "Cancellation wiring detail misplaced and over-prescribed" — same-cluster (same preamble paragraph, different clause; resolved independently)
- "Pre-evaluation failure enumeration: normative content in preamble, list not closed" — same-cluster (same preamble paragraph, sentence 3+; resolved independently)
- "Opening block has no stable anchor; obligations are bundled without IDs" — same-cluster (covers the entire opening block including this paragraph; if the opening block is restructured under that finding, this clause's wording survives unchanged and the same forward-link is still required)
- ""Final value" definition: ambiguous precedence between trailing expression and `return expr`" — same-cluster (paragraph 1 of the preamble; identical class of issue — a phrase needing an explicit forward-link instead of leaving the reader to guess)

## spec.md — Orientation > Scope > Source-language stability

---

# `SHOULD` modal on V1.x stability guarantee contradicts the deliberate "no gate" scope choice

**Original heading:** "SHOULD" modal on stability guarantee is ambiguous; no CI gate
**Kind:** clarity, testability

## Finding

`spec.md` Orientation → Scope → Source-language stability states: "A `.loom` or `.warp` file that loads cleanly under V1.0 SHOULD load and behave identically under every V1.x release." The same SHOULD-shaped claim is restated in the normative owner, [governance.md GOV-13](../../../spec_topics/governance.md#gov-13).

This wording is in direct tension with the rest of GOV-13 and with GOV-14:

- GOV-13 itself records: "V1.0 ships without an automated equivalence gate; equivalence between two V1.x releases is a release-process responsibility verified by reviewer inspection of the diff against the prior V1.x release."
- GOV-14 prohibits reviewers from re-raising the missing gate as a V1.0 correctness finding: "The V1.0 release decision treats the absence of an automated equivalence gate as a recorded scope choice, not a defect."

Under RFC-2119, SHOULD is a normative modal — implementers and reviewers are entitled to verify it. But GOV-13 declares the only verification mechanism is human diff inspection, and GOV-14 forbids treating its absence as a defect. The SHOULD therefore promises a property that the spec has already, deliberately, chosen not to enforce. A reader cannot tell whether they are looking at (a) a normative obligation backed by some unstated test, (b) a normative obligation that the project knows it cannot check, or (c) a non-binding aspiration miscoded as RFC-2119.

The "behave identically" predicate carries the same defect — see the related finding on equivalence-class definition — but the modal-strength problem is independent and resolvable on its own.

## Spec Documents

- `spec.md` — Orientation → Scope → Source-language stability bullet (edited)
- `spec_topics/governance.md` — GOV-13 (edited)
- `spec_topics/governance.md` — GOV-14 (option-dependent)
- `spec_topics/future-considerations.md` — Known V1 limitations bullet on source-language migration that quotes the equivalence claim (option-dependent)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None. No existing plan leaf encodes a GOV-13 V1.x equivalence gate, and `coverage-matrix.md` row for governance maps only to H6 / V18s (REQ-ID anchor mechanics and the coverage closure gate), neither of which would change under the recommended fix. Option B (below) would *add* a new leaf rather than modify or block any existing one, so no existing leaf is tagged.

## Consequence

**Severity:** advisory

A reviewer following RFC-2119 reads SHOULD as a verifiable obligation; GOV-14 then forbids them from acting on its absence. Two implementers shipping V1.0 will not diverge — neither is required to do anything — but the spec contradicts itself on whether V1.x equivalence is a contract or a goal, undermining the credibility of every other RFC-2119 modal in the corpus. No observable runtime behaviour is affected.

## Solution Space

**Shape:** multiple

### Option A — Demote to informative goal (recommended)

- **Approach.** Drop the RFC-2119 modal from both `spec.md` and GOV-13. Recast the claim as a non-binding intent statement that points at the release-process discipline already named in GOV-13 and the deferred conformance suite already named in `future-considerations.md`.
- **Spec edits.**
  - `spec.md` Source-language stability bullet: replace "SHOULD load and behave identically" with non-modal phrasing, e.g. "is intended to load and behave identically … per [Governance — GOV-13](./spec_topics/governance.md#gov-13)."
  - `governance.md` GOV-13: replace "SHOULD load … and produce … identical" with "is expected to load … and to produce … identical", and rename the rule from "V1.x source-language equivalence — no mechanical gate" to "V1.x source-language equivalence — release-process goal" so the rule's own title signals informative scope. Keep the (a)/(b)/(c) enumeration of observables and the wall-clock / token-count / log-volume carve-outs.
  - `governance.md` GOV-14: no edit needed once GOV-13 no longer claims to be normative; the prohibition on re-raising the gate as a correctness finding becomes redundant but harmless. Optionally collapse GOV-13 + GOV-14 into a single rule on a future revision.
  - `future-considerations.md` migration bullet: drop "promises" verb if it presupposes normative force; "states" or "declares the goal" suffice.
- **Pros.** Removes the contradiction in one localised edit. Consistent with the scope choice the project has already made twice (GOV-13 sentence two, GOV-14 in full). No new test infrastructure; no plan leaves added or modified.
- **Cons.** Loses the rhetorical force of an RFC-2119 promise to loom authors who care about V1.x stability — they now read "expected to" instead of "SHOULD".
- **Risks.** None operational. A future decision to add a fixture-based gate (the deferred conformance suite already cited in `future-considerations.md`) can re-promote the rule to MUST without loss.

### Option B — Strengthen to MUST plus a frozen-fixture CI gate

- **Approach.** Replace SHOULD with MUST in both `spec.md` and GOV-13. Add a new gate: a frozen fixture corpus (`.loom` / `.warp` inputs plus their V1.0-baseline `(return value, ordered diagnostic-code sequence, loom-system-note content)` triple) replayed against every V1.x release candidate, failing the release on any deviation. Retire GOV-14 outright (its premise — that the gate's absence is a recorded scope choice — no longer holds).
- **Spec edits.**
  - `spec.md` Source-language stability bullet: SHOULD → MUST.
  - `governance.md` GOV-13: SHOULD → MUST; delete the "V1.0 ships without an automated equivalence gate … verified by reviewer inspection" sentence; reference the new gate by name; rename the rule to drop "no mechanical gate".
  - `governance.md` GOV-14: retire per GOV-8 *Deletion* (append to *Retired REQ-IDs* table; ID does not reuse).
  - `future-considerations.md`: remove the "deferred conformance suite" framing — it is no longer deferred.
  - New normative anchor for the gate (likely a new GOV-N rule or a section in `governance.md`) defining: corpus location, baseline-capture procedure on V1.0 freeze, allowed carve-outs (already wall-clock / token-count / log-volume), failure-output shape, and the specific CI job that runs it.
- **Pros.** Promotes V1.x equivalence to a verifiable contract. Aligns with the loom-author-facing promise the SHOULD currently implies.
- **Cons.** Substantial new scope: a baseline-capture tool, a fixture corpus that meaningfully exercises the three observables, a CI job, and a process for landing baseline updates when a deviation is intentional. Reverses an explicit V1 scope choice that was made twice (GOV-13 + GOV-14).
- **Risks.** Fixture corpus completeness becomes the new credibility question — a gate that only exercises ten loom files will pass green while every interesting equivalence-breaker slips through. Baseline-update procedure becomes a soft escape hatch unless tightly controlled.

### Recommendation

Option A. The spec corpus has already made the scope choice deliberately and twice (GOV-13 sentence two, GOV-14 in full); the SHOULD is a vestige of an earlier framing, not a live design intent. Demoting to informative resolves the contradiction with a localised wording edit and leaves the deferred-conformance-suite path open for a future revision.

Edge cases for the implementer of Option A:

- Keep GOV-13's enumeration of equivalence observables `(a) return values, (b) ordered diagnostic-code sequences, (c) loom-system-note content strings` and the wall-clock / token-count / log-volume exclusions — those are the answer to the related "behave identically" finding and remain useful even when the rule is informative.
- Do not delete GOV-14 in this option — the prohibition on re-raising the gate's absence as a correctness finding remains a useful guard rail for review even after the modal is downgraded; reviewers seeing "expected to" can still try to relitigate scope.
- The change to GOV-13's text is substantive under GOV-8 (modal weakening is explicitly called out as substantive in `governance.md`'s worked examples). It must be modelled as retire-GOV-13-and-add-fresh-ID, not in-place edit. The fresh ID lands at the page tail per GOV-8 *Split / Deletion-plus-add*.

## Related Findings

- "\"behave identically\" undefined equivalence class" — co-resolve (same SHOULD sentence; both options here must specify the equivalence class on the same edit).
- "GOV-13/GOV-14 source-language equivalence: SHOULD with no CI gate" — co-resolve (the governance.md half of this same defect; one edit pair fixes both).
- "GOV-N range in glossary is stale (says GOV-8, actual is GOV-14)" — same-cluster (touches GOV bookkeeping; resolves independently).
- "V1 normative requirements (MUSTs) embedded inside deferred-features document" — same-cluster (also a modal-vs-scope mismatch in the spec corpus, resolves independently).

## spec.md — Orientation > Scope > Hard runtime ceilings

---

# Ceiling #3 (binder LLM-call cap) is misclassified across the hard-ceilings aggregator

**Original heading:** Ceiling #3 (Binder LLM cap) is misclassified on multiple axes — consistency failure
**Kind:** consistency, cross-spec-consistency-broad

## Finding

The "Hard runtime ceilings" bullet in `spec.md` (Orientation > Scope) lists four items meant to share a structural shape — each is a hard upper bound whose breach has a distinct, observable failure surface. Ceiling #3 (the binder LLM-call cap) does not belong to that shape and is misclassified on four interlocking axes.

1. **Category name vs. content.** The category is "Hard *runtime* ceilings," but ceiling #3 fires at slash-invocation load time, before evaluation begins. Its own bullet says so explicitly: "load-time system note. The loom does not start." It is not a runtime event in the sense the other three ceilings are.

2. **Trichotomy contradiction.** The opening paragraph of `spec.md` lists "exhausting one of the [Hard runtime ceilings] below" as a way evaluation reaches the *fail* arm of the success/fail/cancelled trichotomy. Ceiling #3 then says the opposite: "Not an evaluation outcome — nothing reaches loom code, no `Result` value is observable." The hedging clause "those ceilings split across distinct routing classes … the per-ceiling failure class is named at the bullet" is not strong enough to dissolve the contradiction — bundling a load-time failure under a clause that names "fail" as the outcome leaves the reader unable to tell whether ceiling #3 produces an `Err` or not. `errors-and-results.md#terminal-outcomes` repeats the same bundling: it lists "exhausted a hard runtime ceiling … with the per-ceiling routing class — panic / `Err` variant / load-time — named at that bullet" under the **Failure** terminal outcome, even though the very next paragraph excludes load-time events from the trichotomy.

3. **Pre-evaluation enumeration gap.** The pre-evaluation failure list in paragraph 3 of `spec.md` (and verbatim in `errors-and-results.md#terminal-outcomes`) enumerates "host-incompatibility … lex / parse / type batches, frontmatter rejection, binder-model resolution failure, `tools:` resolution failure, watcher-time reload failures." It does not include binder LLM-call exhaustion. Ceiling #3 thus has no home: the runtime-ceilings bullet says it is not an evaluation outcome, and the load-time list omits it.

4. **Cross-spec gloss hides the per-class structure.** The aggregator gloss "Binder LLM-call cap (3 per slash invocation)" reads as a single flat counter. `binder.md` actually defines two independent per-class retry budgets: at most one transport-failure retry and at most one malformed-envelope retry per slash invocation, with AJV failures not retried. The "3" is the algebraic worst-case sum (1 initial + 1 transport-class retry + 1 malformed-envelope-class retry); `binder.md` does state it normatively as "the runtime MUST issue at most **3** binder LLM calls per slash invocation," but only as a derived bound. The user-visible system-note rendered on exhaustion comes from the *most recent* failure's class template, not from a generic "cap exceeded" template — which an implementer reading only the aggregator would not realise. Two reasonable implementers can diverge: one builds a single counter that fires a generic exhaustion note at the third call regardless of class; the other builds two per-class counters and renders the most-recent-failure template. Only the second matches `binder.md`.

## Spec Documents

- `spec.md` — Opening paragraph (terminal-outcomes clause and pre-evaluation failure list) (edited)
- `spec.md` — Orientation > Scope > Hard runtime ceilings (edited)
- `spec_topics/errors-and-results.md` — `terminal-outcomes` section (edited; same trichotomy/load-time wording is mirrored here and must move in lockstep)
- `spec_topics/binder.md` — `failure-mode-templates-normative` (read-only; source of truth for the per-class budget structure)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None. The fix is entirely aggregator-level prose. V16n (transport-failure single retry), V16o (malformed-envelope single retry), and V16p (AJV no-retry) already implement the per-class structure that `binder.md` defines, and their **Adds** / **Tests** wording already routes through the per-class failure-mode templates — none of those leaves' acceptance criteria need to change. No leaf is blocked.

## Consequence

**Severity:** correctness

An implementer reading only the aggregator can build the wrong cap (a flat counter with a generic exhaustion note instead of two per-class counters with the most-recent-class template) and the wrong outcome routing (returning an `Err` to loom code instead of refusing to start the loom). A reviewer or test author also cannot cite the binder cap by stable handle without resolving four conflicting framings (runtime ceiling, fail-arm outcome, load-time non-outcome, "3 per slash invocation" counter).

## Solution Space

**Shape:** single

### Recommendation

Make four edits, all to the aggregator-level text. The per-class behaviour in `binder.md` is correct and stays untouched.

1. **Rename the category and split out the load-time ceiling.** Rename the bullet from "Hard runtime ceilings" to "Hard ceilings" (drop "runtime"). Re-order the four items so that ceilings #1, #2, #4 stay together as runtime ceilings and ceiling #3 (binder cap) is presented under a separate sub-heading or annotation marking it as load-time. Either approach is fine; the pivot is making the load-time-ness visible from the heading, not buried in the bullet body.

2. **Restrict the trichotomy clause in the opening paragraph.** Change "exhausting one of the [Hard runtime ceilings] below" to "exhausting one of the runtime-class hard ceilings below (ceilings whose routing class is panic or `Err`; the load-time binder cap is excluded — see ceiling #3 and the pre-evaluation failure list above)." Mirror the same carve-out in `errors-and-results.md#terminal-outcomes` under the **Failure** bullet.

3. **Add binder-cap exhaustion to the pre-evaluation failure enumeration.** In `spec.md` paragraph 3 and in `errors-and-results.md#terminal-outcomes`, add "binder LLM-call exhaustion" between "binder-model resolution failure" and "`tools:` resolution failure". This places ceiling #3 in the only list that already routes load-time failures to `loom-system-note`.

4. **Restate ceiling #3 using `binder.md`'s per-class framing.** Replace the parenthetical "(3 per slash invocation)" with: "Binder per-class retry budget — at most one transport-failure retry and at most one malformed-envelope retry per slash invocation; AJV-on-`args` failures are not retried (worst-case sum: 3 binder LLM calls); the loom does not start, the operator-facing note is rendered from the failure-mode template matching the *most recent* failure's class — see [Slash-Command Argument Binding — Failure-mode templates](./spec_topics/binder.md#failure-mode-templates-normative)."

Edge cases the implementer must watch:

- The two per-class budgets interleave: a transport failure observed on the retry of a malformed envelope consumes the transport budget, and vice versa (`binder.md` already specifies this; the aggregator must not contradict it by implying a flat counter).
- Cancellation observed during any retry suppresses that retry and surfaces the cancelled-binder template, irrespective of which budget remains.
- The pre-evaluation failure list is referenced from two places (`spec.md` paragraph 3 and `errors-and-results.md#terminal-outcomes`); both must be updated together to keep the aggregator-vs-source lock-step rule (GOV-12) honest.

## Related Findings

- "Pre-evaluation failure enumeration: normative content in preamble, list not closed" — co-resolve (the same pre-evaluation list is the target of both fixes; closing the list and adding binder-cap exhaustion can land in one edit)
- "Hard-ceiling items and non-goal exclusions have no stable identifiers" — same-cluster (touches the same bullet; assigning `CEIL-1`…`CEIL-4` would benefit from also pinning whether `CEIL-3` is load-time)
- "Hard-ceiling interaction (two ceilings tripped on the same event): no precedence rule" — same-cluster (precedence rule needs to know that ceiling #3 cannot co-trip with the runtime ceilings, since it fires before evaluation begins)
- "Non-goal exclusions buried inside a positive-requirements enumeration" — same-cluster (same bullet, independent fix)
- "`tool_loop.max_iterations`: bounds, validation, and configurability unspecified" — same-cluster (sibling ceiling #2)
- "Invoke-chain depth 32: counting convention and subagent boundary interaction not stated" — same-cluster (sibling ceiling #1)
- "JSON depth 5: counting convention not anchored at aggregator level" — same-cluster (sibling ceiling #4)

---

# `tool_loop.max_iterations`: validation rules and diagnostic surface unspecified

**Original heading:** `tool_loop.max_iterations`: bounds, validation, and configurability unspecified
**Kind:** completeness, prescription

## Finding

The `tool_loop.max_iterations` frontmatter field is one of the four hard runtime ceilings (`spec.md` Scope > Hard runtime ceilings, item 2), and `frontmatter.md` documents its default (`25`), what one "round" counts (free-phase tool-call rounds plus the typed-query forced respond turn), per-query and per-respond-repair-follow-up scoping, and the `0`-disables rule. Beyond that the field's input contract is undernormalized:

1. **Type ambiguity.** `frontmatter.md` line 143 calls `max_iterations` "a positive integer," but the same paragraph documents `max_iterations: 0` as the disable form. Plan leaf V13f's test list says "non-negative integers." The three statements disagree on whether `0` is in-range or a special-case escape; the spec does not pick one.
2. **No diagnostic code for invalid values.** `diagnostics.md` lists `loom/load/*` and `loom/parse/*` codes for `mode`, `params`, `tools`, `system`, and `argument-hint`, but no code covers `tool_loop.max_iterations` being negative, a non-integer number (`25.5`), a non-number (`"25"`), or a structurally bad block (`tool_loop: 25` with no `max_iterations` key, `tool_loop: null`, `tool_loop: {}`). The plan test "negative or non-integer values rejected" therefore has no spec-named code to assert against.
3. **No upper bound.** The field accepts arbitrarily large values; an author writing `max_iterations: 1000000` produces a valid loom under the current spec. Whether that is intentional (no cap) or oversight is not stated.
4. **Partial / empty block behaviour.** The field-contract table says `tool_loop` defaults to `{ max_iterations: 25 }`, but `tool_loop: {}` (block present, key absent) is not addressed: it could mean "use the default," "diagnostic for missing required sub-key," or undefined.
5. **Operator override silent.** `bind_model` documents a frontmatter → `looms.binderModel` settings chain. `tool_loop.max_iterations` documents only the frontmatter form; whether V1 deliberately omits an operator-level fallback (e.g. `looms.toolLoopMaxIterations`) is not stated, leaving readers to infer it from absence.

The semantics inside the loop (what a round is, when the cap fires, the resulting `QueryError`) are well specified; the gap is purely the input-validation perimeter.

## Spec Documents

- `spec_topics/frontmatter.md` — `tool_loop` prose (line 143) and field-contract table row (line 48) (edited)
- `spec_topics/diagnostics.md` — `loom/load/*` table (edited)
- `spec.md` — Scope > Hard runtime ceilings, ceiling #2 (read-only; the aggregator forward-link target)
- `spec_topics/query.md` — Tool-call loop bound (read-only; defines the runtime semantics that the validated value feeds)

## Plan Impact

**Phases:** V3, V6, V13

**Leaves (implementation order):**

- V3a — Frontmatter parsing — (modified — `tool_loop` is currently parsed as a deferred-frontmatter-field warning in V3a; once V13f fully parses it, V3a's deferred-warning test must drop `tool_loop` from its expected set)
- V13f — `respond_repair:` and `tool_loop:` frontmatter parsing — (modified — its test "negative or non-integer values rejected" needs the spec-named diagnostic code to assert against, and the "non-negative integers" framing must align with the spec's chosen type)
- V6k — `tool_loop` cap enforcement and `ToolLoopExhaustedError` — (modified — `max_iterations: 0` semantics ("model receives an empty `tools` set") are already in V6k's test list; once the spec resolves "positive" vs "non-negative," V6k's test wording follows)

## Consequence

**Severity:** correctness

Two reasonable implementations diverge: one rejects `max_iterations: -1` with a generic `loom/load/unknown-frontmatter-field` (wrong code), one silently coerces it to `0`, one rejects it with a new ad-hoc code. Conformance tests cannot be authored against an unnamed code. The "positive vs non-negative" contradiction means an author reading `frontmatter.md` cannot confidently predict whether `max_iterations: 0` is rejected or accepted as the disable form, which is observable behaviour at load time.

## Solution Space

**Shape:** single

### Recommendation

Tighten the `tool_loop.max_iterations` input contract in `spec_topics/frontmatter.md` and add the corresponding diagnostic code(s) to `spec_topics/diagnostics.md`:

1. **Type and range.** Reword the prose at `frontmatter.md` line 143 from "a positive integer" to "a non-negative integer (V1 imposes no upper bound). `0` disables model-driven tool calls entirely; positive values cap the loop." Drop the word "positive" from the sentence describing rounds.
2. **Single rejection code.** Add `loom/load/frontmatter-value-out-of-range` (E, load) covering: negative integer; non-integer number (e.g. `25.5`); non-number scalar (e.g. `"25"`); `null`. Message template: `frontmatter field '<dotted-key>' must be a non-negative integer; got <observed>`. Apply uniformly to `tool_loop.max_iterations` and `respond_repair.attempts` (the latter has the same gap and the plan v13f test already references "out-of-range `attempts` rejected" without a code).
3. **Empty / partial block.** Add to the field-contract table row for `tool_loop`: "`tool_loop: {}` (block present, `max_iterations` absent) is equivalent to omitting `tool_loop:` entirely; the default `25` applies." Mirror the same rule for `respond_repair: {}`.
4. **Operator override.** Add a one-sentence non-goal to `frontmatter.md`'s `tool_loop` prose: "V1 provides no operator-level override for `max_iterations`; the value is per-loom only. Adding a `looms.toolLoopMaxIterations` settings key is deferred per [Future Considerations]."
5. **Per-query scope confirmation.** The existing sentence "The cap applies independently to each query" already covers the nested-`invoke` case implicitly (each callee runs its own queries under its own frontmatter), but add an explicit half-sentence: "and to every query inside an `invoke`d callee, which uses the callee's own `tool_loop` frontmatter — the parent's budget is not debited by `invoke`."

Edge cases the implementer must watch:
- YAML coerces `25` and `25.0` to the same numeric scalar in many parsers; the validator must reject `25.0` based on the parsed-number's integer-ness, not on YAML lexical form.
- `max_iterations: 0` must round-trip through the cap-enforcement counter without producing a spurious `tool_loop_exhausted` on the very first turn — V6k already specifies the model receives an empty `tools` set in this case, but the counter must not double-charge.
- The new `loom/load/frontmatter-value-out-of-range` code must be added to `diagnostics.md` with a `<dotted-key>` placeholder rendered byte-identically; otherwise it inherits the testability gap flagged in "Diagnostic placeholder rendering: affected codes not enumerated."

## Related Findings

- "Hard-ceiling items and non-goal exclusions have no stable identifiers" — same-cluster (same Hard runtime ceilings bullet; an anchor on the `tool_loop` ceiling would let `frontmatter.md` forward-link to it precisely)
- "Hard-ceiling interaction (two ceilings tripped on the same event): no precedence rule" — same-cluster (same section, independent fix)
- "JSON depth 5: counting convention not anchored at aggregator level" — same-cluster (parallel completeness gap on a sibling ceiling)
- "Invoke-chain depth 32: counting convention and subagent boundary interaction not stated" — same-cluster (parallel completeness gap on a sibling ceiling)
- "Ceiling #3 (Binder LLM cap) is misclassified on multiple axes — consistency failure" — same-cluster (same Hard runtime ceilings bullet)
- "Diagnostic placeholder rendering: affected codes not enumerated; implementation-defined portion untestable" — decision-dependency (the new `loom/load/frontmatter-value-out-of-range` code recommended above adds another `<dotted-key>` placeholder that must be enumerated under that finding's resolution)

---

# `invoke`-chain depth-32 cap: counting origin and subagent-mode boundary semantics undefined

**Original heading:** Invoke-chain depth 32: counting convention and subagent boundary interaction not stated
**Kind:** completeness

## Finding

`spec.md` and [`invocation.md` — Invocation depth bound](../../../spec_topics/invocation.md) state that "the interpreter caps the nesting depth of an `invoke` chain at **32**, counting both direct `invoke(...)`, `.loom` callable calls through `tools:`, and `.warp` `fn` invokes (the count is per-chain, not per-process — sibling invokes do not share budget)." Two independent contracts are missing from this paragraph:

1. **Counting origin / breach inequality.** The text names *which call sites count* (direct `invoke`, registered-loom calls, cross-file `.warp` `fn` invokes) but never states what depth the slash-invoked top-level loom occupies, where counting begins, or whether the cap is `≤32` or `<32`. The diagnostic message in `errors-and-results.md` and `diagnostics.md` (`invoke chain depth exceeded: <depth> > 32`, with the worked example "A 33-deep `invoke` chain renders `33 > 32`") implies one specific reading — depth equals the number of countable frames in the chain, the slash entry is depth 0, and the breach fires when a frame would push the count past 32 — but this convention has to be reverse-engineered from a rendered example. An implementer asked "is the first nested `invoke` depth 1 or depth 2?" cannot answer from the normative text alone.

2. **Subagent-boundary interaction.** The cross-mode matrix on the same page describes subagent-mode children as spawning a *fresh isolated conversation* and (for `subagent → subagent`) as *sibling to* the caller's. The depth paragraph's "per-chain, not per-process — sibling invokes do not share budget" disclaimer addresses only *parallel* siblings (two invokes from the same parent get independent budgets); it does not say whether crossing into a subagent-mode child *resets* the depth counter, *shares* the parent's remaining budget, or *inherits* the absolute count. The choice has direct safety consequences: if subagent crossings reset the counter, runaway recursion through subagent-mode loom callees is bounded only by host stack — defeating the cap's stated rationale ("legitimate-but-runaway recursive divide-and-conquer"). The leaf V18n already encodes one specific reading in its test ("synthesized 33-deep `invoke` chain… sibling invokes do not share the depth budget"), but does not exercise the subagent-crossing case, so even the test surface does not pin the answer.

## Spec Documents

- `spec_topics/invocation.md` — *Invocation depth bound* (edited)
- `spec.md` — *Orientation > Scope > Hard runtime ceilings*, ceiling #1 (edited)
- `spec_topics/diagnostics.md` — code-registry row for `loom/runtime/invoke-depth-exceeded`, plus the worked-example bullet "A 33-deep `invoke` chain renders `invoke chain depth exceeded: 33 > 32`" (read-only — confirms the intended counting reading; no edit needed if the spec edit aligns with it)
- `spec_topics/errors-and-results.md` — message-template row for `loom/runtime/invoke-depth-exceeded` (read-only — same as above)

## Plan Impact

**Phases:** Vertical V15, Vertical V18

**Leaves (implementation order):**

- V15i — Cross-mode cell: prompt → subagent — (modified)
- V15j — Cross-mode cell: subagent → prompt — (modified)
- V15k — Cross-mode cell: subagent → subagent — (modified)
- V18n — Panic routing: `invoke` parent surface — (modified)

V15i/V15j/V15k each currently verify only conversation-isolation and transcript-leakage properties of one cross-mode cell. Each needs a small additional assertion that the depth counter passes through the boundary (i.e., a 32-level chain that crosses the relevant boundary still trips `loom/runtime/invoke-depth-exceeded` when the next frame would push to 33). V18n currently synthesizes a same-mode 33-deep chain; it needs an additional fixture chain that crosses into subagent mode partway through to make the per-chain semantics testable, and its existing depth-31-vs-32 fixture should explicitly pin the breach inequality (`33 > 32`, not `32 > 32`).

## Consequence

**Severity:** correctness

Two reasonable implementers will diverge on (a) whether the slash entry counts as a frame and (b) whether subagent-mode descents reset the counter. Divergence on (a) shifts every breach test by one frame and produces inconsistent diagnostic messages across implementations. Divergence on (b) is more serious: an implementer who resets across subagents leaves a runaway-recursion attack/footgun open precisely along the path the cap was designed to bound, and the resulting host-stack overflow falls outside the closed V1 panic-source list and is not catchable through the `invoke` boundary's `Err(InvokeInfraError)` envelope.

## Solution Space

**Shape:** single

### Recommendation

Extend the *Invocation depth bound* paragraph in `spec_topics/invocation.md` with two additional sentences and propagate the result via the existing forward-link from `spec.md` ceiling #1 (no separate aggregator edit needed; the bullet already says "per [Invocation — Invocation depth bound]"). The added contract:

> Depth is the count of *countable frames* on the active call chain, where a countable frame is any direct `invoke(...)` call, any `.loom` callable call dispatched through a `tools:` entry, or any cross-file `.warp` `fn` call. The slash-invoked top-level loom is depth 0; the first such frame nested inside it is depth 1. The cap is breached when the runtime is about to push a frame that would bring the count to 33, so the legal range is 1 ≤ depth ≤ 32 and the diagnostic renders `invoke chain depth exceeded: 33 > 32` (matching [Diagnostics — code registry](./diagnostics.md#code-registry)).
>
> The counter is per-chain and crosses subagent-mode boundaries unchanged. A `subagent → subagent` or `prompt → subagent` invocation does **not** reset the count: from the perspective of the cap, the subagent's spawned `AgentSession` is a continuation of the same call chain even though it owns a fresh conversation. The `subagent` carve-outs in the cross-mode matrix concern *conversation isolation*, not *call-chain accounting*. Two concurrent invokes spawned from the same parent (the "sibling invokes do not share budget" rule above) remain independent regardless of mode — the existing per-chain definition already covers that case.

Implementer-relevant edge cases:

- Within a `.warp` file, a `fn` calling another `fn` defined in the *same* `.warp` file is an in-file function call and does not count as a countable frame; only cross-file `.warp` `fn` invocations do. (This matches the existing wording — keep it as-is; the new paragraph does not relax it.)
- The depth counter is incremented before the child frame begins executing (so a child whose body itself overflows from depth 32 surfaces the panic at the child's very first nested `invoke`, not after some work has run).
- For subagent-mode children, the counter passes through the `customTools` / `AgentSession` boundary as a runtime-side invariant carried by the invoke trampoline; it is not part of the wire-level data passed to the spawned session and therefore does not appear anywhere in the Pi SDK surface.
- A `loom/runtime/invoke-depth-exceeded` raised inside a subagent-mode child still surfaces to its `invoke` parent as `Err(InvokeInfraError { reason: "panic", ... })` per V18n; the only thing the new contract changes is which frame trips the cap, not the routing of the resulting panic.

## Related Findings

- "JSON depth 5: counting convention not anchored at aggregator level" — same-cluster (sibling under-specified counting convention on a different ceiling; both can be addressed by the same editorial pass on the *Hard runtime ceilings* bullet but resolve independently in their own owner pages)
- "Hard-ceiling interaction (two ceilings tripped on the same event): no precedence rule" — decision-dependency (precedence rule needs to know which event the depth cap trips on; pinning the breach inequality here makes "the 32nd-deep `invoke` also exhausts the binder LLM-call cap" precisely answerable)
- "Hard-ceiling items and non-goal exclusions have no stable identifiers" — co-resolve (assigning `CEIL-1` to this ceiling gives the new counting-convention prose a citation handle; both edits land in the same bullet)
- "`tool_loop.max_iterations`: bounds, validation, and configurability unspecified" — same-cluster (sibling ceiling whose bounds/validation gap mirrors this one)
- "Subagent state-isolation matrix presupposes Pi context-passing model" — same-cluster (also concerns what does and does not cross the subagent boundary; the depth-counter answer here ("does cross") is consistent with the matrix's framing of subagent isolation as conversation-only)

---

# V1 ceiling non-goals are hidden in the tail of a positive enumeration and absent from the visible non-goal surfaces

**Original heading:** Non-goal exclusions buried inside a positive-requirements enumeration
**Kind:** scope

## Finding

The `Hard runtime ceilings` bullet under `## Orientation > Scope` enumerates four positive ceilings (#1–#4) and then continues with a single trailing paragraph beginning *"No additional V1 runtime ceiling applies — in particular …"* that quietly carries five distinct V1 non-goals: no wall-clock timeout per query / tool call / invoke; no per-query response-token cap; no cumulative-token budget; no runtime-value memory ceiling; and no host-language stack-depth ceiling within a single loom invocation distinct from the 32-level `invoke`-chain bound. Each of these is a load-bearing scope disclaimer dressed as a continuation of the positive list.

A reader scanning for V1 non-goals has three obvious places to look: (a) `## Orientation > Scope` itself, which carries no `Non-goals` sub-block and only mentions a per-loom capability model and major-version migration as out-of-scope; (b) `spec_topics/future-considerations.md`, where only one of the five exclusions ("Per-call timeouts") is recorded — the other four (response-token cap, cumulative-token budget, runtime-value memory ceiling, host-language stack-depth ceiling) appear nowhere on that page; and (c) the per-ceiling owner pages in `frontmatter.md`, `cancellation.md`, `errors-and-results.md`, etc., which assert positive contracts and not the absence of related ones. The only authoritative statement that these four are V1 non-goals lives buried in the tail prose of an unrelated positive enumeration.

The structural problem compounds the discoverability problem. The aggregator paragraph mixes positive content (recurring forward-links, a parenthetical GOV-12 maintenance note) with five normatively-deferred behaviours, with no visible label, no separate sub-list, no anchor, and no parallel structure to the four numbered ceilings above. A future leaf adding a sixth deferred ceiling (e.g. per-extension memory accounting) has no obvious slot; a future leaf promoting one of the five into a real ceiling (e.g. wall-clock timeouts) has no clean removal target.

## Spec Documents

- `spec.md` — `## Orientation > Scope > Hard runtime ceilings` (edited)
- `spec_topics/future-considerations.md` — *Surface extensions* / per-call-timeouts entry, and any new entries that mirror the four currently-unrecorded exclusions (option-dependent)
- `spec_topics/governance.md` — GOV-12 aggregator-vs-source lock-step rule (read-only; the chosen reorganization must remain GOV-12-compliant)
- `spec_topics/cancellation.md` — wall-clock-timeout deferral the spec.md tail cites (read-only)
- `spec_topics/errors-and-results.md` — `ContextOverflowError` paragraph the spec.md tail cites for the response-token disposition (read-only)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None

(H6 explicitly excludes `spec.md` from the per-page REQ-ID anchor pass — *"`spec.md` itself is not in the per-page anchor loop and receives no `GOV-N` markers from this step"* — and `future-considerations.md` is on the prefix table's narrative-page list, so neither acquires REQ-IDs even if the non-goals are surfaced there. The fix is a pure spec-text reorganization with no leaf acceptance criterion to amend and nothing it blocks or unblocks.)

## Consequence

**Severity:** advisory

A reviewer or implementer asking "is a per-query response-token cap in V1?" finds no entry under `Scope`, no entry in `future-considerations.md`, and no negative assertion on the obvious owner page (`errors-and-results.md`); the only authoritative answer is the tail clause of a paragraph titled *Hard runtime ceilings*. The information is present and correct, so a careful reader can build the right system, but the four currently-unrecorded exclusions are easy to miss when ratifying scope, when triaging proposed V1.x leaves, or when a downstream doc (e.g. an operator-facing capability matrix) is generated from non-goal lists.

## Solution Space

**Shape:** multiple

### Option A — In-place restructure under Hard runtime ceilings

**Approach.** Keep ownership inside the `Hard runtime ceilings` bullet but split the trailing paragraph into a clearly-labelled `**Deferred ceilings (V1 non-goals).**` sub-block immediately after the four numbered ceilings. Render each exclusion as its own bullet (or numbered entry) with the same shape as the positive ceilings: name, deferral rationale, forward-link to the owner page (`cancellation.md`, `future-considerations.md`, `errors-and-results.md`, etc.), and any V1-only fallback (e.g. host-OOM routes through `loom/runtime/internal-error`).

**Spec edits.**
- Replace the *"No additional V1 runtime ceiling applies — in particular …"* prose run with a labelled sub-section under the same bullet.
- Lift each of the five exclusions into its own entry; preserve every existing forward-link verbatim.
- Move the GOV-12 aggregator parenthetical to the end of the new sub-block so it covers both halves.

**Pros.** Smallest edit footprint. Stays inside the existing GOV-12 aggregator scope so no cross-file lock-step changes. Companion finding *"Hard-ceiling items and non-goal exclusions have no stable identifiers"* co-resolves naturally if each new entry gets an `EXCL-1`..`EXCL-5` anchor as part of the same edit.

**Cons.** Non-goals remain attached to one specific positive list (`Hard runtime ceilings`), so an exclusion that is conceptually orthogonal to ceilings (a hypothetical "no per-loom capability model" parallel) still has no obvious home. Discoverability improves within the bullet but not at the `## Scope` level — a reader scanning section titles still sees no `Non-goals` heading.

**Risks.** Low. The edit is local; the tail paragraph already encodes the content correctly.

### Option B — Hoist a Scope-level `Non-goals` subsection

**Approach.** Add a fifth bullet (or a separate `### Non-goals` sub-heading) under `## Orientation > Scope` that consolidates *all* V1 non-goals: the five deferred-ceiling entries from the current tail paragraph, the per-loom capability model deferral currently buried at the end of *Trust boundary*, and the major-version migration deferral currently buried at the end of *Source-language stability*. Replace the in-bullet exclusion prose with a single forward-link ("see [Scope — Non-goals]").

**Spec edits.**
- New `### Non-goals` (or fifth Scope bullet) listing all V1 deferrals as numbered entries.
- Strip exclusion clauses from `Trust boundary`, `Source-language stability`, and `Hard runtime ceilings` bullets, replacing each with an anchored forward-link to the relevant Non-goals entry.
- Add forward-links from `future-considerations.md` to the new Non-goals anchor for each currently-mirrored deferral; add new mirror entries on `future-considerations.md` for the four exclusions it does not currently record.

**Pros.** Highest discoverability — non-goals get a visible heading at the same level as positive Scope dispositions. Consolidates currently-scattered deferrals (per-loom capability model; major-version migration) into one citeable location. Future deferrals have a clear slot. Aligns with the existing "out of scope for V1" wording style at `spec.md:39` and `spec.md:45`.

**Cons.** Larger edit footprint touching three Scope bullets and `future-considerations.md`. Creates two parallel non-goal surfaces (Scope and Future Considerations) that must stay in lock-step; the duplication is already declared in the Scope preamble but the lock-step convention now spans more entries.

**Risks.** GOV-12 aggregator drift if Future Considerations grows out of sync with the new Scope sub-block. Mitigated by an explicit "duplicated in Future Considerations" callout in the new sub-block, matching the existing Scope preamble pattern.

### Option C — Delegate entirely to Future Considerations

**Approach.** Replace the trailing paragraph with one sentence: "V1 ceilings beyond the four above are explicitly out of scope; the closed list is owned by [Future Considerations — Deferred ceilings]." Move the five exclusions into `future-considerations.md` as a new `## Deferred ceilings` section, alongside the existing per-call-timeouts entry.

**Spec edits.**
- Delete the trailing paragraph from `spec.md`.
- Add a new `## Deferred ceilings` section to `future-considerations.md` with the five entries, each carrying the rationale and forward-links currently inlined in `spec.md`.
- Migrate the GOV-12 aggregator parenthetical to apply to the new forward-link.

**Pros.** Smallest `spec.md` footprint. Single source of truth for deferrals.

**Cons.** Removes a load-bearing scope disclaimer from the document the spec preamble identifies as the orientation hub. A reader of the Scope subsection no longer learns from `spec.md` that wall-clock timeouts are absent — they must follow a link. This contradicts the current Scope preamble's stated intent ("This subsection pins four cross-cutting V1 dispositions that no single topic page enumerates as a unit"); the deferred-ceilings list is exactly the kind of cross-cutting disposition the preamble says belongs here.

**Risks.** Reduces hub-level discoverability for the cost of single-source-of-truth. A future reader who doesn't follow the link will not see the negative contract.

### Recommendation

Take **Option B**. The current Scope preamble already commits to surfacing cross-cutting V1 dispositions in `spec.md` even when topic pages also cover them; a `Non-goals` sub-block honours that commitment more cleanly than burying exclusions inside a positive enumeration. Co-resolve with the companion finding *"Hard-ceiling items and non-goal exclusions have no stable identifiers"* by assigning `EXCL-1`..`EXCL-5` (or whatever stable form the Scope-level sub-block uses) in the same edit. Edge cases the implementer must watch: (a) the GOV-12 lock-step note must accompany the new sub-block since duplication with `future-considerations.md` is widening; (b) the new entries on `future-considerations.md` must not introduce REQ-IDs (it is a narrative page per H6); (c) the host-OOM fallback ("`host-OOM throws route through `loom/runtime/internal-error`") is currently embedded in the runtime-value-memory-ceiling exclusion and must travel with that entry, not be lost in the move.

## Related Findings

- "Hard-ceiling items and non-goal exclusions have no stable identifiers" — co-resolve (the same restructure that lifts the exclusions into a labelled sub-block is the natural place to assign `EXCL-1`..`EXCL-5` anchors)
- "Ceiling #3 (Binder LLM cap) is misclassified on multiple axes — consistency failure" — same-cluster (touches the same `Hard runtime ceilings` bullet but resolves independently — sub-finding (c) of that finding asks to add binder-cap exhaustion to the *pre-evaluation* failure list, not to the deferred-ceiling list this finding restructures)
- "Hard-ceiling interaction (two ceilings tripped on the same event): no precedence rule" — same-cluster (same bullet; the precedence rule lands among the four positive ceilings, not the deferred ones)
- "GOV-12 aggregator labels are editor instructions embedded in normative text" — decision-dependency (any restructure under Option B widens GOV-12 duplication; the GOV-12-cleanup finding's resolution constrains how the new lock-step note is phrased)
- "Four Scope dispositions lack stable anchors" — same-cluster (Option B adds a fifth Scope-level entry; if Scope dispositions get anchors as part of that finding, the new `Non-goals` sub-block should pick up an anchor in the same scheme)
- "Wall-clock timeout deferral: no observability for runaway looms" — decision-dependency (that finding adds an observability contract for the wall-clock-timeout non-goal; whichever entry surfaces in the new Non-goals sub-block must carry or forward-link the chosen observability disposition)

---

# Hard-ceiling items and non-goal exclusions in `spec.md` Scope are not individually citeable

**Original heading:** Hard-ceiling items and non-goal exclusions have no stable identifiers
**Kind:** traceability

## Finding

The "Hard runtime ceilings" bullet under `## Orientation > Scope` enumerates four ceilings as items 1–4 of an unnumbered Markdown list, then closes with a multi-clause sentence enumerating the V1 non-goal exclusions (no wall-clock timeout, no response-token cap, no cumulative-token budget, no runtime-value memory ceiling, no host-language stack-depth ceiling). The subsection itself carries `<a id="hard-runtime-ceilings">`, so the section as a whole is reachable, but no anchor sits on any individual ceiling and the non-goal tail is prose with no anchors at all. A reviewer, test author, or fixer who needs to cite "the tool-loop ceiling" or "the no-wall-clock-timeout exclusion" from this aggregator can only do so by quoting prose or by relying on positional ordering inside the bullet list — both fragile.

The straightforward "assign new REQ-ID prefixes (`CEIL-N`, `EXCL-N`) to `spec.md`" reading of this gap is foreclosed by GOV-12: `spec.md` is informative orientation and carries no per-page prefix, and H6 (the REQ-ID anchor insertion leaf) explicitly excludes `spec.md` from the per-page anchor loop. The aggregator bullets restate obligations whose normative owners are topic pages (`invocation.md`, `frontmatter.md`, `binder.md`, `schema-subset.md`, `errors-and-results.md`, `cancellation.md`, `future-considerations.md`); citation by `prefix-N` therefore has to land on those owner pages, not on `spec.md`. What `spec.md` itself can offer is local HTML anchors per bullet — the same affordance the subsection already uses at the section level.

The non-goal tail is the more acute half of the issue: it is the only part of the Scope subsection that bundles five independently-verifiable carve-outs into one run-on sentence with no list structure at all, so even positional citation is unavailable for it.

## Spec Documents

- `spec.md` — `## Orientation > Scope > Hard runtime ceilings` (edited)
- `spec_topics/governance.md` — GOV-12 (`spec.md` aggregator paragraphs are informative); REQ-ID prefix table (read-only — pins the constraint that `spec.md` cannot host new prefixes)
- `spec_topics/invocation.md` — Invocation depth bound (read-only — owner of ceiling 1's normative anchor)
- `spec_topics/frontmatter.md` — `tool_loop` (read-only — owner of ceiling 2's normative anchor)
- `spec_topics/binder.md` — Failure modes (read-only — owner of ceiling 3's normative anchor)
- `spec_topics/schema-subset.md` — Depth Enforcement (read-only — owner of ceiling 4's normative anchor)
- `spec_topics/errors-and-results.md` — Terminal outcomes / `QueryError` variants (read-only — co-owner of ceilings 2, 3, 4)
- `spec_topics/cancellation.md` — wall-clock-timeout deferral (read-only — owner of one non-goal)
- `spec_topics/future-considerations.md` — deferred-ceiling rationales (read-only — owner of the remaining non-goals)

## Plan Impact

**Phases:** Horizontal

**Leaves (implementation order):**

- H6 — REQ-ID anchor insertion and coverage-matrix re-pivot — (modified)

H6 already retargets `spec.md`'s outbound links to the most-specific `#prefix-n` anchors after each owner page receives REQ-IDs, which directly enables citation-by-owner-page for the four ceilings and for each non-goal. The "(modified)" tag covers the small extension of adding per-bullet HTML anchors to the Hard-ceilings aggregator — see Solution Space — which is the kind of work H6 is already doing in `spec.md` (its rewriting pass touches the same prose) without violating the H6 invariant that `spec.md` carries no `PREFIX-N` markers.

## Consequence

**Severity:** advisory

Implementers can build the four ceilings and respect the five exclusions without per-item handles in `spec.md`; the normative content lives on the owner pages, which H6 will anchor. The cost is reviewer / test-author friction: any future cross-reference to "the binder LLM-call ceiling at the aggregator" or to "the no-cumulative-token-budget exclusion" has to either chase forward-links to the owner page or quote prose, and the non-goal tail in particular cannot be cited at all without paraphrase. None of this blocks correctness; it degrades navigability and bookkeeping.

## Solution Space

**Shape:** single

### Recommendation

Add per-item HTML anchors to the `## Orientation > Scope > Hard runtime ceilings` bullet in `spec.md`, and convert the non-goal tail from prose to a sub-bulleted list with the same anchor treatment. Concretely:

- Prepend `<a id="ceiling-invoke-depth"></a>`, `<a id="ceiling-tool-loop"></a>`, `<a id="ceiling-binder-llm-call-cap"></a>`, `<a id="ceiling-json-document-depth"></a>` to ceilings 1–4 respectively (anchor names mirror the bullet's leading noun phrase, lowercased and hyphenated, so they are stable under prose rewording within the bullet).
- Split the trailing "No additional V1 runtime ceiling applies …" sentence into a labelled sub-list (`#### V1 non-goals (deferred)` or an inline `**Non-goals.**` block) with one bullet per exclusion: `<a id="non-goal-wall-clock-timeout">`, `<a id="non-goal-response-token-cap">`, `<a id="non-goal-cumulative-token-budget">`, `<a id="non-goal-runtime-value-memory-ceiling">`, `<a id="non-goal-host-stack-depth-ceiling">`. Each bullet keeps its existing forward-link to the owner page (cancellation, future-considerations, errors-and-results) so normative citation continues to land on REQ-IDs there.
- Do **not** introduce new REQ-ID prefixes (e.g. `CEIL`, `EXCL`) on `spec.md`. Per GOV-12 and H6, `spec.md` carries no per-page prefix; HTML-anchor citation is the sanctioned local mechanism on this page (the existing `<a id="hard-runtime-ceilings"></a>` is precedent).
- Land the edit alongside H6's `spec.md`-rewrite step so that the same commit (a) adds the per-bullet anchors and (b) repoints any cross-page links targeting the ceilings/non-goals at the owner pages' newly-assigned REQ-IDs.

Edge cases the implementer must watch:

- The four anchor names must not collide with anchor names already in use on `spec.md` (currently only `hard-runtime-ceilings`); a one-off `grep -E '<a id="' spec.md` before the edit suffices.
- If a future ceiling is added to the bullet (per GOV-12's lock-step rule), it must come with its own anchor in the same commit; this is consistent with the existing GOV-12 obligation.
- The bullet's leading numeric labels (1, 2, 3, 4) are now redundant with the anchor names but should remain for readability; tests citing "ceiling 2" should be migrated to cite the anchor instead.

## Related Findings

- "Opening block has no stable anchor; obligations are bundled without IDs" — same-cluster (same traceability gap on the orientation preamble; resolved by analogous local anchors)
- "Four Scope dispositions lack stable anchors" — co-resolve (same edit pass that adds per-bullet anchors to the Hard-ceilings bullet should anchor the four Scope bullets too)
- "Trust boundary: five independent obligations bundled without IDs" — same-cluster (parallel issue inside a different Scope bullet)
- "Non-goal exclusions buried inside a positive-requirements enumeration" — co-resolve (the recommended split-into-sub-bullets fix discharges both)
- "No REQ-IDs assigned anywhere in spec.md; normative obligations in hub are unciteable" — decision-dependency (the broader cross-cutting framing; both findings depend on the same GOV-12 boundary — `spec.md` cannot host prefixes, so HTML anchors and owner-page REQ-IDs are the only mechanisms either finding can recommend)

---

# Hard-ceiling interaction: no rule for which surface fires when two ceilings could trip on the same event

**Original heading:** Hard-ceiling interaction (two ceilings tripped on the same event): no precedence rule
**Kind:** error-model

## Finding

`spec.md` § *Hard runtime ceilings* asserts that each of the four ceilings has "a distinct, observable failure surface and no ceiling fails silently," but never states what happens when execution arrives at a point where two ceilings could plausibly fire for the same logical event. The owner pages do not fill the gap either: `errors-and-results.md` § *Runtime panics*, `query.md` § *Tool-call loop bound*, `invocation.md` § *Invocation depth bound*, and `schema-subset.md` § *Depth Enforcement* each describe their own surface in isolation; none names a precedence rule against the other three.

Three concrete overlaps exist within the runtime-evaluated subset (#1 invoke-depth panic, #2 `tool_loop_exhausted` `Err`, #4 JSON-depth-5 `Err`):

- A tool-call round at iteration `max_iterations` whose `tool_use` arguments are depth-6 (depth-walk runs at the tool-arg validation boundary per V14e/V14f vs. exhaustion check at the round boundary per V6k).
- A `?`-propagation point where the model's forced respond turn at iteration `max_iterations` of a typed query produces a depth-6 payload (depth-walk at the typed-query response boundary per V6i vs. exhaustion check on the same forced respond turn).
- An `invoke(...)` issued from inside iteration N of a parent's `tool_loop` that pushes the chain to depth 33 (panic at invoke entry per `loom/runtime/invoke-depth-exceeded` vs. tool_loop accounting in the parent).

Ceiling #3 (binder LLM-call cap) cannot interleave with the other three: per `binder.md` § *Binder bypass* and § *Binder model*, the binder runs once at slash-load time, only for slash invocations, and never for `invoke(...)` or registered-loom calls — by construction it cannot fire concurrently with a runtime ceiling.

The interpreter is single-threaded and each ceiling is checked at a distinct, well-defined site in evaluation order, so a working implementation will produce a deterministic answer in every overlap above. The defect is purely textual: the rule is implicit and a reader, test author, or fixer cannot cite it.

## Spec Documents

- `spec.md` — Orientation > Scope > Hard runtime ceilings (edited)
- `spec_topics/errors-and-results.md` — Terminal outcomes; Runtime panics (read-only)
- `spec_topics/query.md` — Tool-call loop bound (read-only)
- `spec_topics/invocation.md` — Invocation depth bound (read-only)
- `spec_topics/schema-subset.md` — Depth Enforcement (read-only)
- `spec_topics/binder.md` — Binder bypass; Binder model (read-only — confirms #3 cannot interleave)

## Plan Impact

**Phases:** None

**Leaves (implementation order):** None

The fix is a spec-text addition that codifies the evaluation order already implied by the per-site checks. No acceptance criterion in V6k (`tool_loop` exhaustion), V11i (depth walk), V14e/V14f (tool-arg depth), V16p (binder `args` depth), V18n (panic `invoke`-parent surface), or V18m (panic slash-command surface) needs to change — each leaf already tests its own surface in isolation, and the precedence rule does not introduce a new observable behaviour.

## Consequence

**Severity:** advisory

A reviewer or test author cannot cite the spec to justify which `loom-system-note` / `Err` variant a conformance test should expect for an event that satisfies two ceiling preconditions. Two implementers will most likely converge on the same observable behaviour because each ceiling is checked at a distinct site, but the spec leaves them no anchor to argue against an oddball implementation that, for example, defers depth-walk validation until after the tool_loop counter is incremented.

## Solution Space

**Shape:** single

### Recommendation

Add a short paragraph immediately after the four-ceiling enumeration in `spec.md` § *Hard runtime ceilings*, before the "No additional V1 runtime ceiling applies" non-goals bullet:

> **Interaction between ceilings.** Each ceiling is checked at a distinct point in single-threaded interpreter execution; the first check whose precondition is satisfied fires, and the unfired condition is then unreachable for that event. The fixed evaluation order is: ceiling #3 (binder LLM-call cap) at slash-load time, before any runtime ceiling can be checked; ceiling #1 (`invoke`-chain depth) at `invoke` entry, before the callee body runs; ceiling #4 (JSON-document depth) at every AJV validation boundary (typed-query response, `tool_use` args, `params` merge, `invoke<T>` return), before the boundary's other validation runs; ceiling #2 (`tool_loop.max_iterations`) at the tool-call-round boundary, after the round's tool calls have completed and before the next model turn is requested. Ceiling #3 never interleaves with #1, #2, or #4 — the binder runs only for slash invocations and only at load time, and `invoke(...)` calls do not invoke the binder per [Slash-Command Argument Binding — Binder bypass](./spec_topics/binder.md#bypass-cases). At most one ceiling surfaces per event; the spec does not promise reporting both.

Edge cases the implementer must watch:

- The depth-walk *precedes* AJV at every boundary per `schema-subset.md` (§ *Enforcement point*: "The walk runs **before** AJV at each site"). The precedence statement above must not silently re-order this — the depth-walk site is *the same* AJV boundary, just the first sub-check at it.
- A `tool_use` round whose tool-arg payload is depth-6 produces ceiling #4 (`validation` `Err` to the model) and the round is then permitted to continue the loop — this is one round of `tool_loop`, not exhaustion.
- An `invoke` issued from inside a tool-loop round counts against the parent chain's depth budget; if it panics with `invoke-depth-exceeded`, the panic propagates per V18n and the parent's `tool_loop` counter is irrelevant (the loop never resumes).
- A typed-query forced respond turn that produces depth-6 output surfaces as `cause: "schema_validation"` (per V6i) regardless of where the round count stands — depth-walk fires before the round-completion accounting that would tip into `tool_loop_exhausted`.

The non-overlap claim for ceiling #3 should also be added explicitly because the original review (and a reasonable reader) can wrongly imagine an "invoke also exhausts the binder cap" scenario; the rule above forecloses it.

## Related Findings

- "Ceiling #3 (Binder LLM cap) is misclassified on multiple axes — consistency failure" — decision-dependency (moving #3 out of the runtime-ceiling list, or restating its category, simplifies the precedence text proposed here)
- "Hard-ceiling items and non-goal exclusions have no stable identifiers" — same-cluster (the precedence paragraph would cite ceiling numbers; stable IDs make it less fragile, but the two fixes are independent)
- "Trichotomy contradiction" sub-point inside the Ceiling #3 finding — co-resolve (both rest on tightening which ceilings can produce evaluation outcomes)

---

# Host-OOM routing claim is incomplete for fatal V8 heap exhaustion

**Original heading:** Host-OOM routing claim incomplete for fatal V8 OOM
**Kind:** error-model

## Finding

The "no runtime-value memory ceiling" sub-clause in `spec.md` (Orientation > Scope > Hard runtime ceilings, the trailing "No additional V1 runtime ceiling applies…" paragraph) asserts that "host-OOM throws route through `loom/runtime/internal-error`." This treats every host out-of-memory condition as a catchable JavaScript throw. In V8/Node.js the assumption holds only for allocation failures that surface as `RangeError` (e.g. `RangeError: Invalid array length`, `RangeError: Maximum call stack size exceeded`, allocation requests above an engine-imposed per-object cap). True heap exhaustion — when V8 cannot satisfy an allocation after a final mark-sweep — produces `FATAL ERROR: ... JavaScript heap out of memory` and aborts the process; no JavaScript stack frame observes a throw, no `try`/`catch` runs, and `process.on('uncaughtException')` is not invoked.

The spec is silent on this fatal arm. As a result it does not say: (a) that the `loom/runtime/internal-error` routing applies only to the catchable subset; (b) what (if anything) the operator observes — the `loom-system-note` channel cannot deliver a record once the host is dead, and the post-`waitForIdle()` error-state probe never runs; (c) what state the conversation is left in — partial appends already flushed by Pi's `customType` channel persist, in-flight ones do not, and the runtime emits no terminal envelope. The omission is observably similar to the `loom-system-note` delivery-failure gap and to the engine-invariant silent-failure surface (both elsewhere in this review): a class of failure exists for which the spec has no contract.

The `loom/runtime/internal-error` routing itself is well-specified at `spec_topics/errors-and-results.md` (Runtime panics) and `spec_topics/diagnostics.md` (the registry row); the gap is at the aggregator's blanket assertion, which over-promises.

## Spec Documents

- `spec.md` — Orientation > Scope > Hard runtime ceilings, trailing "No additional V1 runtime ceiling applies" paragraph (edited)
- `spec_topics/errors-and-results.md` — Runtime panics > runtime-defect surface (read-only)
- `spec_topics/diagnostics.md` — `loom/runtime/internal-error` registry row (read-only)
- `spec_topics/pi-integration-contract.md` — Runtime event channel, Engine-assumption carve-out (read-only; analogous existing carve-out pattern)

## Plan Impact

**Phases:** Vertical V18

**Leaves (implementation order):**

- V18m — Panic routing: slash-command surface — (modified)
- V18n — Panic routing: `invoke` parent surface — (modified)

Both leaves currently scope `loom/runtime/internal-error` testing to "an unexpected interpreter throw outside the closed V1 panic-source list" — which is the catchable arm. The fatal-OOM carve-out introduced by this finding does not require new test coverage (fatal OOM cannot be exercised under the test harness in a portable, deterministic way), but the leaf's **Adds** narrative should acknowledge the carve-out so an implementer does not attempt an uncatchable-throw probe.

## Consequence

**Severity:** advisory

Operators reading the aggregator paragraph form a wrong mental model: they expect a `loom-system-note` for any out-of-memory condition. On fatal V8 OOM none arrives, the process exits, and the absence is indistinguishable from "no failure occurred" or "an engine-invariant violation silently corrupted state." Implementers are not at risk of writing divergent code (V8 dictates the response uniformly), but the missing language interacts with the partial-append contract claim and the "exactly-once terminal event" guarantee in a way that should be acknowledged rather than silently violated.

## Solution Space

**Shape:** single

### Recommendation

Replace the parenthetical `host-OOM throws route through `loom/runtime/internal-error`` with a two-arm statement that distinguishes catchable allocation failures from fatal heap exhaustion, modelled after the existing engine-assumption carve-out in `spec_topics/pi-integration-contract.md`:

> string length, array length, and total heap are bounded only by the host process; **catchable host-OOM throws** (e.g. `RangeError: Invalid array length`, `RangeError: Maximum call stack size exceeded`, and other engine-raised allocation `RangeError`s) route through `loom/runtime/internal-error` per [Errors and Results — Runtime panics](./spec_topics/errors-and-results.md). **Fatal V8 heap exhaustion** (the `FATAL ERROR: … JavaScript heap out of memory` arm that aborts the host process) is not catchable, produces no `loom-system-note` and no terminal `RuntimeEvent`, and leaves any conversation turns already flushed to Pi's `customType` channel in place per the partial-append contract; in-flight appends are lost. Operators MUST treat a missing terminal event as one of: (a) the loom did not fail; (b) the loom failed with a kind not in the always-log set; (c) an engine-assumption violation per [Pi Integration Contract — Runtime event channel — Engine-assumption carve-out](./spec_topics/pi-integration-contract.md); (d) fatal host OOM.

Edge cases the implementer must watch:

- Do **not** install a `process.on('uncaughtException')` or `process.on('exit')` handler that attempts to flush a final note: in the OOM arm V8 may have insufficient heap to allocate the diagnostic envelope, and the handler will either re-trigger OOM or run partial work that worsens the truncation.
- The catchable `RangeError` arm is exercised by V18m and V18n tests already (synthesised `TypeError` probe); a parallel `RangeError` probe is not required for conformance but is a reasonable addition.
- The "(d) fatal host OOM" enumeration entry on the operator-side disambiguation list should be added alongside the existing three in the engine-assumption carve-out so the two paragraphs stay in lock-step under GOV-12.

## Related Findings

- "`loom-system-note` emission failure: no fallback contract" — same-cluster (both describe failure modes in which the operator-visible diagnostic surface is unavailable; resolved independently — fatal OOM has no recoverable fallback while channel-down does)
- "Engine-level invariants: explicit silent-failure surface with no error model" — same-cluster (both add carve-out language acknowledging classes of failure the runtime cannot diagnose; the recommendation here references and parallels that carve-out's structure)
- "Hard-ceiling interaction (two ceilings tripped on the same event): no precedence rule" — same-cluster (both refine assertions inside the same trailing paragraph of the Hard runtime ceilings section; edits should be co-staged to avoid merge churn)
- "Ceiling #3 (Binder LLM cap) is misclassified on multiple axes — consistency failure" — same-cluster (also edits the same Hard runtime ceilings section; co-staging recommended)

---

# `timeout:` rejection in hard-ceilings paragraph: diagnostic code and owner unanchored

**Original heading:** `timeout:` frontmatter rejection: no diagnostic code named at aggregator level
**Kind:** error-model

## Finding

The Hard-runtime-ceilings closing paragraph in `spec.md` asserts a normative parse-time rejection — "V1 imposes no wall-clock timeout per query / tool-call / invoke (deferred per [Cancellation] and [Future Considerations]; enforced at parse time by rejecting any `timeout:` field)" — without naming the diagnostic code, the failing-document sites, or the owner page that defines the rule. The two parenthetical links go to the *deferral* rationale (Cancellation, Future Considerations) and to the *seam* preservation, not to the parse-time rejection mechanism itself.

The actual contract is owned by `spec_topics/cancellation.md` ("declaring a `timeout:` field on a query, tool call, or invoke is `loom/parse/timeout-field-rejected`") and registered in `spec_topics/diagnostics.md` (severity `E`, phase `parse`, message `'timeout:' field is not supported in V1`). The V1 sites are four — frontmatter, per-`@`-query option, per-tool-call option, and per-`invoke` option — not "frontmatter" alone as the heading and the parenthetical's "field" singular suggest. An implementer reading only the aggregator cannot determine the diagnostic code, the message string, the severity/phase tags, or that the rejection covers four distinct surface positions, and has no anchored hop to where any of that is defined.

## Spec Documents

- `spec.md` — Orientation > Scope > Hard runtime ceilings, the closing "No additional V1 runtime ceiling applies …" paragraph (edited)
- `spec_topics/cancellation.md` — closing paragraph naming `loom/parse/timeout-field-rejected` (read-only)
- `spec_topics/diagnostics.md` — registry row for `loom/parse/timeout-field-rejected` (read-only)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None. V18o (Per-call timeout marker — deferral confirmation) already cites both Cancellation and the diagnostics-registry row; an aggregator-only wording change does not alter its Adds, Tests, or Ships-when.

## Consequence

**Severity:** advisory

A reader stopping at the aggregator paragraph cannot answer "what code does the runtime emit?" or "which surface positions are rejected?" without chasing into Cancellation. The owner pages are correct and complete, so no implementer is misled into the wrong behaviour; the loss is navigability and the GOV-12 promise that aggregator bullets name-link each obligation back to its anchored owner.

## Solution Space

**Shape:** single

### Recommendation

Replace the parenthetical clause `enforced at parse time by rejecting any `timeout:` field` with an anchored, code-naming forward-link to Cancellation (the rule's owner) and a parallel link to the diagnostics-registry row. Suggested wording, dropped in place:

> enforced at parse time at every site where a future per-call timeout could land — frontmatter, per-`@`-query option, per-tool-call option, per-`invoke` option — by emitting `loom/parse/timeout-field-rejected` per [Cancellation — Per-call timeouts deferred](./spec_topics/cancellation.md) and [Diagnostics — `loom/parse/timeout-field-rejected`](./spec_topics/diagnostics.md)

Edge cases the implementer must watch:

- The four-site enumeration must stay in lock-step with V18o's Adds list. If the surface set ever changes, both the aggregator paragraph and V18o's leaf must move together (GOV-12).
- The link target on Cancellation is a paragraph, not an anchored heading; either add an `<a id="per-call-timeouts-deferred"></a>` to that paragraph or leave the link page-level and accept the imprecision. An anchor is preferable for `grep`-locatable cross-references.
- Do not name `loom/load/unknown-frontmatter-field` or `loom/load/deferred-frontmatter-field` here — V18o explicitly excludes `timeout` from those warners so that the parse-phase error wins at the frontmatter site; collapsing the two surfaces in aggregator prose would invite the wrong implementation.

## Related Findings

- "Wall-clock timeout deferral: no observability for runaway looms" — same-cluster (same parenthetical clause; both touch the deferral wording but resolve independently — one adds a forward-link, the other adds an observability statement or explicit non-observability disclaimer).
- "Host-OOM routing claim incomplete for fatal V8 OOM" — same-cluster (same closing paragraph of the hard-ceilings section; both are aggregator-level error-model gaps inside the negative-space enumeration).
- "JSON depth 5: counting convention not anchored at aggregator level" — same-cluster (same anchored-forward-link gap pattern, applied to a different ceiling in the same section).
- "`mode:` field: absent/invalid behavior not specified at aggregator level" — same-cluster (same pattern: aggregator names a normative obligation but supplies only a page-level link, not an anchored forward-link to the failure surface).
- "Non-goal exclusions buried inside a positive-requirements enumeration" — same-cluster (the `timeout:` rejection sits inside that very prose enumeration; restructuring the enumeration may also resolve the link target shape).
- "Hard-ceiling items and non-goal exclusions have no stable identifiers" — same-cluster (an `EXCL-N` identifier on the no-wall-clock-timeout exclusion would give the timeout-rejection clause a stable handle to anchor against).

---

# Wall-clock timeout deferral leaves no operator-visible signal for in-flight looms

**Original heading:** Wall-clock timeout deferral: no observability for runaway looms
**Kind:** error-model

## Finding

`spec.md` § Hard runtime ceilings defers wall-clock timeouts ("V1 imposes no wall-clock timeout per query / tool-call / invoke (deferred per [Cancellation] and [Future Considerations]; enforced at parse time by rejecting any `timeout:` field)") and `cancellation.md` is the named recourse. But cancellation is a *push* channel — it requires the operator to first decide that a loom is stuck. Nothing in V1 helps that decision.

Walking the always-log set (`pi-integration-contract.md` § Runtime event channel, group A: `transport`, `code_tool`, `model_tool`, `tool_loop_exhausted`, `invoke_failure`, binder failures; group B: runtime panics) confirms every entry is a *terminal* failure event. There is no progress event, no per-checkpoint heartbeat, no timer-based "still running" note, and no exposure of the `ActiveInvocationRegistry`'s contents to operators. The only positive observability surface listed is `pi-integration-contract.md` § `Clock.now()`, which is used internally to stamp `RuntimeEvent.occurred_at` at terminal-failure sites — never to emit a periodic event. `future-considerations.md` lists "Per-call timeouts" and "Richer runtime-event telemetry (per-loom token aggregation, latency histograms, cost reporting)" as deferred, but neither bullet acknowledges that V1 ships no in-flight progress observability at all.

The operational gap: a slash-invoked loom that enters a slow `tool_loop`, an oversized typed query, or a blocked subagent provider call produces zero session-transcript signal until either the call returns, the `tool_loop.max_iterations` cap (default 25) trips, or the invoke-depth-32 ceiling fires. An operator watching the transcript sees no events and has no way to distinguish "still working" from "wedged" short of `ps`-level introspection on the Pi process. Cancellation as the V1 recourse only works once the operator has decided to cancel; the spec gives them nothing on which to base that decision.

## Spec Documents

- `spec.md` — Orientation > Scope > Hard runtime ceilings (closing paragraph; the deferred-ceilings sentence) (edited)
- `spec.md` — Orientation > Scope > Runtime observability (option-dependent; option B touches this bullet)
- `spec_topics/future-considerations.md` — "Per-call timeouts" and "Richer runtime-event telemetry" bullets (option-dependent)
- `spec_topics/cancellation.md` — read to confirm cancellation is the only V1 recourse and no progress hook exists (read-only)
- `spec_topics/pi-integration-contract.md` — § Runtime event channel (always-log set), § `Clock` / `FakeClock` interface (read-only; option A would extend the always-log set defined here, option B forward-links here)

## Plan Impact

**Phases:** Vertical V18

**Leaves (implementation order):**

- V18o — Per-call timeout marker (deferral confirmation) — (modified) — already owns the timeout-deferral surface; under option B it grows a one-line "no in-flight observability in V1" assertion / test, under option A it is the natural neighbour for any new heartbeat leaf.
- V18q — Runtime event channel and always-log emission — (modified, option-dependent) — under option A this leaf gains a heartbeat member of the always-log set with its own `RuntimeEvent.kind` and a `Clock.setTimeout`-driven emission cadence; under option B unchanged except for a cross-link.

## Consequence

**Severity:** advisory

A V1 ships without in-flight progress observability either way; the question is whether that omission is documented as a deliberate V1 posture or left as an unstated gap. Implementers can deliver a working V1 under either reading. Operationally, operators of long-running looms will discover the gap empirically and will likely build out-of-band probes (process-level introspection, transcript polling for terminal events) — a documentation fix sets that expectation up front.

## Solution Space

**Shape:** multiple

### Option A — Add a heartbeat member to the always-log set

**Approach.** Introduce a new always-log group A member, `kind: "heartbeat"`, emitted by the runtime on a fixed cadence (e.g. every 10 s of monotonic `Clock.now()` elapsed since invocation start) for every entry in the `ActiveInvocationRegistry`. The `RuntimeEvent` payload reuses the existing shape (`kind: "heartbeat"`, `loom`, `occurred_at`) and adds two additive fields: `elapsed_ms: number` and `current_op: "query" | "tool_call" | "invoke" | "binder" | "idle"` (or analogous). Emission goes through the existing `loom-system-note` channel with `display: false`; renderers and external consumers can opt in.

**Spec edits.**
- `spec.md` § Hard runtime ceilings closing paragraph: replace "deferred per [Cancellation] and [Future Considerations]" with "deferred per [Cancellation] and [Future Considerations]; in-flight observability is provided by the `heartbeat` always-log member per [Pi Integration Contract — Runtime event channel]."
- `spec.md` § Runtime observability bullet: add "and a per-invocation `heartbeat` event emitted on a fixed cadence."
- `pi-integration-contract.md` § Runtime event channel: add `heartbeat` to group A; pin the cadence constant (`HEARTBEAT_INTERVAL_MS`) and its source-of-truth seam (the `Clock.setTimeout` injection); pin the additive payload fields.
- `future-considerations.md`: leave "Per-call timeouts" bullet unchanged; the heartbeat does not satisfy it.

**Pros.**
- Solves the operational problem directly: an operator sees the loom is alive and what it is doing.
- Slots cleanly into existing always-log machinery (one more emission helper call site, one more registry row, one extra `Clock.setTimeout`-driven loop).
- Heartbeat cadence and payload are easy to test against `FakeClock`.

**Cons.**
- Adds the spec's first non-failure event to a channel currently described as exhausted by failure events ("**Runtime event channel.** A subset of `QueryError` failures — the **always-log set** — emit…"). The "always-log set" framing has to widen, or the heartbeat needs its own sub-section.
- Cadence (10 s? 30 s?) is a new pinned constant with no obvious right answer; too short and the channel becomes noisy, too long and runaway detection lags.
- Exposing `current_op` widens the runtime's introspection surface and creates a new contract that must remain stable across V1.x.

**Risks.**
- Renderer assumptions baked into V18i ("per-`kind` formatting for prompt-mode top-level `Err`") presume every `RuntimeEvent` is a failure; introducing `heartbeat` requires every `kind`-keyed switch in the codebase and the spec to grow a non-failure arm.
- Subagent-mode interaction: do parent and child both emit heartbeats? Per-`ActiveInvocationRegistry`-entry emission means yes, doubling channel volume per nested invoke.

### Option B — State explicitly that V1 provides no in-flight observability

**Approach.** Make the omission a deliberate, documented V1 posture. No code changes, no new event kind. The spec adds one sentence at each of the two natural anchor sites and a `future-considerations.md` bullet that names the seam.

**Spec edits.**
- `spec.md` § Hard runtime ceilings closing paragraph: extend the wall-clock deferral parenthetical to "(deferred per [Cancellation] and [Future Considerations]; V1 emits no per-invocation progress event — operators relying on long-running looms must use Pi's process-level introspection to distinguish in-flight from wedged invocations; enforced at parse time by rejecting any `timeout:` field)".
- `spec.md` § Runtime observability bullet: add ", and no per-invocation progress signal (the channel is write-only on terminal events)" before the "Aggregation, latency histograms…" deferral.
- `future-considerations.md`: add a new bullet under deferred V1 extensions, "**In-flight progress observability** — a per-invocation heartbeat or progress event on the `loom-system-note` channel. *Anchored at:* [Pi Integration Contract — Runtime event channel]. *Depends on:* per-call timeouts (which is the natural co-design)." Cross-link from V18o's spec section.

**Pros.**
- Zero implementation cost; pure documentation fix.
- Preserves the channel's "terminal events only" framing exactly as currently written.
- Pairs cleanly with the existing per-call-timeout deferral; the two are co-designable in a future V1.x or V2.

**Cons.**
- Does not solve the operational problem; operators with long-running looms still have to instrument out-of-band.
- Codifies a known gap as a feature, which reads as defensive in a V1 that is otherwise generous about runtime observability.

**Risks.**
- The "no progress signal" assertion is testable only as a negative (no `RuntimeEvent` emitted from a wall-clock-driven probe over an idle invocation); V18q would need a small assertion that the always-log helper has no time-driven call sites.

### Recommendation

Take **Option B**. A V1 whose entire observability story is "terminal failure events on `loom-system-note`, write-only, consumer-facing read API deferred" is internally consistent — adding a heartbeat introduces the channel's first non-failure event, a new pinned cadence constant, and a new payload contract that propagates through V18i / V18q renderers and renderer-side switches, all to land a feature whose right shape (`elapsed_ms` only? `current_op` too? per-frame depth?) is genuinely uncertain without operator usage data the V1 cannot yet have. Option B costs three sentences and one `future-considerations.md` bullet, names the seam where the heartbeat would land in a future version, and sets the operator expectation explicitly so out-of-band instrumentation is a deliberate choice rather than a discovery.

Implementer edge cases for Option B:
- The negative assertion in V18q (no time-driven emission) must use `FakeClock.advance(<large value>)` over an idle `ActiveInvocationRegistry` entry and verify zero `pi.sendMessage` calls land on the `loom-system-note` channel.
- The new `future-considerations.md` bullet should sit adjacent to "Per-call timeouts" since the two are co-designable; the heartbeat-cadence question becomes much easier once timeouts exist (cadence ≪ smallest declarable timeout).

## Related Findings

- "`timeout:` frontmatter rejection: no diagnostic code named at aggregator level" — same-cluster (touches the same deferral parenthetical in `spec.md` § Hard runtime ceilings; both edits land in the same sentence and should be made together)
- "Non-goal exclusions buried inside a positive-requirements enumeration" — same-cluster (the wall-clock-timeout exclusion is one of the four non-goals that finding wants surfaced; if those non-goals are pulled into a visible "Explicitly out of V1 scope" callout, the no-observability assertion from Option B belongs in the same callout)
- "Hard-ceiling items and non-goal exclusions have no stable identifiers" — decision-dependency (if non-goal exclusions get `EXCL-N` IDs as that finding proposes, the no-observability assertion either becomes its own `EXCL-N` row or is folded under the wall-clock-timeout exclusion's row)
- "18 deferred features with no prioritization or likelihood signal" — same-cluster (Option B adds a 19th deferred feature; whatever prioritization scheme that finding lands on must accommodate it)

## spec.md — Orientation > Scope > Trust boundary

---

# Trust-boundary aggregator names `tools` for the subagent-mode tool-definition wiring; the SDK field is `customTools`

**Original heading:** Trust boundary uses `tools` where `customTools` is the correct SDK field
**Kind:** codebase-grounding-broad

## Finding

The Trust-boundary bullet in `spec.md` (Orientation > Scope) describes the per-mode tool-visibility enforcement as: "subagent mode: explicit `tools` array on `createAgentSession`; prompt mode: `pi.setActiveTools` snapshot/restore around each query." On `CreateAgentSessionOptions` (verified at `@mariozechner/pi-coding-agent` 0.73.0, `dist/core/sdk.d.ts`), the two relevant fields are distinct:

- `tools?: string[]` — a name allowlist that suppresses default built-ins.
- `customTools?: ToolDefinition[]` — the array carrying actual tool definitions (built-in `ToolDefinition`s and `defineTool`-wrapped `.loom` callables).

`spec_topics/pi-integration-contract.md` ("Conversation drive — subagent mode") models this correctly: it passes `customTools` *and* a parallel `tools` allowlist derived from the same lowered set, and Rule 2 explicitly states the allowlist is what suppresses Pi's default built-ins. The `spec.md` aggregator collapses both fields into a single mention of `tools` and drops `customTools` entirely, so a reader who treats the hub as authoritative would conclude that loom callees travel as `ToolDefinition[]` under the key `tools` — which the SDK ignores (excess option) for that shape, and which would, under the canonical reading of `tools` as `string[]`, fail TypeScript compilation outright.

The error is confined to the `spec.md` Trust-boundary bullet; PIC, the V14 plan leaves, and H4's spawner-shim test (`h4-extension-shell.md`) already use the `customTools` / `tools` pair correctly.

## Spec Documents

- `spec.md` — Orientation > Scope > Trust boundary (edited)
- `spec_topics/pi-integration-contract.md` — Conversation drive — subagent mode; Tool-registration lifetime and visibility (read-only — already canonical)

## Plan Impact

**Phases:** None

**Leaves (implementation order):** None

(All affected plan leaves — H4, V12a, V14e, V14j — already cite the `customTools` / `tools` allowlist pair correctly. No leaf acceptance criteria change.)

## Consequence

**Severity:** correctness

A reader treating `spec.md` as authoritative for the SDK shape would write `createAgentSession({ tools: customToolDefinitions })`. Under the actual SDK type, `tools` is `string[]`; the call would either fail at TypeScript compile time or — under loose typing — silently drop the entire callable set, leaving the spawned `AgentSession` with Pi's default built-ins (`read`, `bash`, `edit`, `write`) and zero loom callables, breaking subagent-mode tool dispatch wholesale.

## Solution Space

**Shape:** single

### Recommendation

Rewrite the Trust-boundary bullet's subagent-mode parenthetical to mirror PIC's wording: replace "subagent mode: explicit `tools` array on `createAgentSession`" with "subagent mode: explicit `customTools` array (with the matching tool names listed in a `tools` allowlist) on `createAgentSession`". The phrasing in `pi-integration-contract.md` ("Conversation drive — subagent mode" and Rule 2 under it) is the source of truth — copy its `customTools` / `tools` framing rather than coining a new aggregator-level shorthand. Edge case for the implementer: when the loom's callable set is empty, both fields must still be passed (`customTools: []`, `tools: []`); omitting `tools` re-enables Pi's default built-ins, per PIC Rule 2 and V14j.

## Related Findings

- "Trust boundary: five independent obligations bundled without IDs" — same-cluster (same bullet; the IDs proposed there would let this fix cite a stable sub-anchor)
- "Error-shape detail in Trust boundary belongs in Tool Calls" — same-cluster (same bullet, independent edit)
- "Filesystem/network access surface via runtime-stdlib functions not enumerated" — same-cluster (same bullet, independent edit)
- "`createAgentSession` has no `signal` option in SDK; subagent cancellation silently broken" — same-cluster (sibling SDK-grounding error against `CreateAgentSessionOptions`; resolved separately)

---

# Trust-boundary bullet duplicates the `code_tool` / `execution` mapping that Tool Calls already owns

**Original heading:** Error-shape detail in Trust boundary belongs in Tool Calls
**Kind:** placement

## Finding

The `Trust boundary` bullet under `## Orientation > Scope` (`spec.md:45`) closes with a sentence that fully specifies a tool-failure error-envelope mapping:

> Host-side denials of filesystem, network, or Pi-API access reach loom code through the tool that issued the request: a thrown or `isError: true` return is mapped to `Err(QueryError { kind: "code_tool", cause: "execution", ... })` per [Tool Calls — Failures] and [Pi Integration Contract — Tool execution from loom code]; silent success on denial is forbidden.

That is a field-level API contract — variant tag, cause discriminator, trigger conditions — not a scope disclaimer. It restates content already owned normatively by `spec_topics/tool-calls.md` (the `**Failures.**` paragraph that enumerates the four `cause` values for `CodeToolError`, including `execution` for `execute()` throws or `isError: true` returns) and `spec_topics/errors-and-results.md` (the canonical `CodeToolError` schema declaration under `## QueryError variants`). Hosting the same mapping inside the Scope subsection — which is explicitly framed as informative orientation that forward-links to topic owners — splits ownership of a normative obligation across two files and creates drift risk: a future revision to the cause enum or the `isError`/throw routing rule must remember to amend the trust-boundary prose, with no anchor to flag it.

The "silent success on denial is forbidden" clause and the cross-link to Pi Integration Contract — Tool execution from loom code are likewise normative tool-call obligations, not trust-boundary disclaimers; they belong with the same owner.

## Spec Documents

- `spec.md` — `## Orientation > Scope > Trust boundary` bullet (edited)
- `spec_topics/tool-calls.md` — `**Failures.**` paragraph (read-only; receives no new content, already owns the mapping)
- `spec_topics/errors-and-results.md` — `## QueryError variants` → `CodeToolError` schema (read-only; already owns the schema)
- `spec_topics/pi-integration-contract.md` — `Tool execution from loom code` (read-only; already linked from Tool Calls)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None. The fix is a pure editorial relocation in the aggregator. The normative obligation already lives at the topic pages that drive the affected leaves (V14g `CodeToolError` variant: `execution` cause; V14f / V14h / V14i for the other causes; V18q for the always-log emission). Their `Spec.` references already point at `tool-calls.md` and `errors-and-results.md`; no leaf reads the trust-boundary bullet for this contract.

## Consequence

**Severity:** cosmetic

No implementer observable: the duplicated content currently agrees with the topic-page owners, and `spec_topics/tool-calls.md` is the page leaves read. The cost is maintenance fragility (two locations to keep in sync on any future revision to the cause enum or denial-routing rule) and aggregator-level placement noise that obscures the trust-boundary disclaimer the bullet exists to make.

## Solution Space

**Shape:** single

### Recommendation

In the `Trust boundary` bullet of `spec.md` (`spec.md:45`), replace the trailing two clauses with a behavioral statement plus a forward-link to the owning page. Concretely, replace:

> Host-side denials of filesystem, network, or Pi-API access reach loom code through the tool that issued the request: a thrown or `isError: true` return is mapped to `Err(QueryError { kind: "code_tool", cause: "execution", ... })` per [Tool Calls — Failures] and [Pi Integration Contract — Tool execution from loom code]; silent success on denial is forbidden.

with:

> Host-side denials of filesystem, network, or Pi-API access reach loom code only through the failure surface of the tool that issued the request, per [Tool Calls — Failures](./spec_topics/tool-calls.md); silent success on denial is forbidden.

Notes for the implementer:

- Keep the "silent success on denial is forbidden" clause in the trust-boundary bullet — it is a scope claim about how denials must surface, distinct from the field-shape mapping. Do not push it into Tool Calls; that page already enumerates the four `cause` values exhaustively, and the prohibition belongs with the trust-boundary disclaimer.
- The Pi Integration Contract link disappears with the relocation; it is preserved transitively through Tool Calls' own forward-link to PIC, so no information is lost.
- Verify that `spec_topics/tool-calls.md`'s `**Failures.**` paragraph remains the single normative owner of the `kind: "code_tool"` / `cause: "execution"` mapping after the edit; do not accidentally move text into it that is already there.

## Related Findings

- "Trust boundary: five independent obligations bundled without IDs" — co-resolve (removing the error-shape clause is one of the five sub-obligations being unbundled; both edits target the same bullet)
- "Trust boundary uses `tools` where `customTools` is the correct SDK field" — same-cluster (independent SDK-naming fix in the same bullet; resolves separately)
- "Filesystem/network access surface via runtime-stdlib functions not enumerated" — same-cluster (a different placement gap in the same bullet)

---

# Trust-boundary bullet bundles independent obligations into one paragraph with no per-obligation forward-link

**Original heading:** Trust boundary: five independent obligations bundled without IDs
**Kind:** traceability

## Finding

The Scope > Trust boundary entry in `spec.md` (lines 45) is a single dense paragraph that bundles at least six independently-verifiable obligations:

1. V1 looms run at full Node host-process privilege.
2. The runtime imposes no loom-level sandbox; access available to loom code is exactly what Pi grants the extension.
3. The `tools:` frontmatter knob constrains the *model's* reachable callable set, not the host process.
4. Per-mode wiring rule: subagent mode uses `customTools` on `createAgentSession`; prompt mode uses `pi.setActiveTools` snapshot/restore.
5. Host-side denials reach loom code through the issuing tool, mapped to `Err(QueryError { kind: "code_tool", cause: "execution", ... })`.
6. Silent success on denial is forbidden.
7. A per-loom capability model is out of scope for V1 and would require a major-version migration.

Most of these are forward-linked, but the linkage is paragraph-scoped: a reader cannot tell from the surface text which prose clause is anchored at which target, and lock-step audits under GOV-12 cannot be done clause-by-clause without manual diffing against the owner pages. One obligation — "silent success on denial is forbidden" — has no dedicated forward-link at all; it is folded into the prose sentence whose link points at `Tool Calls — Failures` and `PIC — Tool execution from loom code`, neither of which is the obligation's canonical home (the canonical home is the same `PIC — No additional access channels` paragraph already linked earlier in the bullet, but a reader has no way to know that without reading PIC).

The original suggestion to "assign a REQ-ID to each sub-obligation" is incompatible with **GOV-12** (`spec.md` carries no per-page REQ-ID prefix; aggregator paragraphs are informative). The real defect is structural: a dense paragraph hides which clauses are aggregator items, defeats GOV-12's lock-step convention, and lets one obligation slip without an anchored owner.

## Spec Documents

- `spec.md` — Orientation > Scope > Trust boundary (edited)
- `spec_topics/governance.md` — GOV-9 (cross-link form), GOV-12 (`spec.md` aggregator paragraphs are informative) (read-only)
- `spec_topics/pi-integration-contract.md` — `<a id="no-extra-mediation">` "No additional access channels"; `<a id="tool-execution-from-loom-code">` "Tool execution from loom code"; "Tool-registration lifetime and visibility" (read-only)
- `spec_topics/tool-calls.md` — "Failures" (read-only)
- `spec_topics/frontmatter.md` — `tools` (read-only)
- `spec_topics/future-considerations.md` — Known V1 limitations (read-only)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None. The fix is editorial restructuring of one bullet inside `## Orientation > ## Scope`, which sits outside the prose H6 retargets (H6 *Adds* explicitly scopes its `spec.md` link rewrite to the introduction prose between the H1 title and `## Orientation`, and the gate at H6 *Tests* enforces that scope). No current plan leaf restructures aggregator bullets in `spec.md`'s Orientation, and per GOV-12 no leaf assigns REQ-IDs there.

## Consequence

**Severity:** advisory

Implementers and reviewers can still recover each obligation by reading the linked owner pages, so V1 ships correct. The cost is paid by spec maintainers: the GOV-12 lock-step audit ("a PR that adds, removes, or renames an item on a source page MUST update the corresponding `spec.md` aggregator in the same commit") is harder to perform on a dense paragraph than on a sub-bulleted list, and the "silent success on denial" clause is structurally invisible to that audit because it has no explicit forward-link anchoring it to PIC.

## Solution Space

**Shape:** single

### Recommendation

Convert the Trust boundary bullet into a parent bullet plus a nested sub-bullet list, one sub-bullet per aggregator item, each carrying its own anchored forward-link to the owner topic page. Do **not** mint REQ-IDs on `spec.md` itself — GOV-12 forbids it. Concretely:

```
- **Trust boundary.** V1 looms execute inside the Pi extension-host process at full
  Node host-process privilege. The bullets below name each obligation and link to
  its owner.
    - **No loom-level sandbox.** Filesystem, network, and Pi-API access available
      to loom code and to its declared callables are exactly those available to any
      Pi extension running in the same process — Pi exposes no per-extension
      privilege scoping the runtime can rely on. The runtime interposes no
      sandbox, capability filter, or mediated proxy in any V1.x release per
      [PIC — No additional access channels](./spec_topics/pi-integration-contract.md#no-extra-mediation).
    - **`tools:` is a model-reach knob, not a host sandbox.** The loom's `tools:`
      allowlist constrains the model's reachable callable set, not the host
      process; declaring a high-privilege callable (e.g. `bash`) exposes that
      callable's full underlying capability to the model. Default rule for
      absent or empty `tools:` is owned by [Frontmatter — `tools`](./spec_topics/frontmatter.md#tools).
    - **Per-mode tool-wiring is the mechanical enforcement.** Subagent mode wires
      callees via the `customTools` array on `createAgentSession` (with the same
      names listed in a `tools` allowlist); prompt mode wires them via a
      `pi.setActiveTools` snapshot/restore around each query. Owner:
      [PIC — Tool-registration lifetime and visibility](./spec_topics/pi-integration-contract.md#tool-registration-lifetime-and-visibility).
    - **Host-side denials surface as `code_tool` `QueryError`.** A thrown or
      `isError: true` return from a denying tool is mapped to
      `Err(QueryError { kind: "code_tool", cause: "execution", ... })` per
      [Tool Calls — Failures](./spec_topics/tool-calls.md) and
      [PIC — Tool execution from loom code](./spec_topics/pi-integration-contract.md#tool-execution-from-loom-code).
    - **Silent success on denial is forbidden.** Owner:
      [PIC — No additional access channels](./spec_topics/pi-integration-contract.md#no-extra-mediation)
      (final clause of that paragraph).
    - **Per-loom capability model is out of scope for V1.** Introducing one would
      require a major-version migration. See
      [Future Considerations — Known V1 limitations](./spec_topics/future-considerations.md).
```

Edge cases for the implementer:

- The two `customTools`-vs-`tools` and "error-shape detail" concerns flagged in adjacent findings ("Trust boundary uses `tools` where `customTools` is the correct SDK field"; "Error-shape detail in Trust boundary belongs in Tool Calls") fall out naturally from this restructuring — sub-bullet 3 is the place to fix the `customTools` wording, and sub-bullet 4 is the place to either keep or remove the error-shape detail per that finding's outcome. Coordinate the three edits in one PR.
- Anchor names: `#no-extra-mediation` and `#tool-execution-from-loom-code` already exist as `<a id>` anchors in PIC; `#tool-registration-lifetime-and-visibility` is a heading-derived GitHub auto-anchor (verify with a link check). Once H6 lands per-rule `PIC-N` REQ-ID anchors on PIC, retarget each sub-bullet to its `#pic-n` anchor; until then the section-level anchors satisfy GOV-9 because they target the most specific named site that exists.
- Do not introduce REQ-IDs (`SCOPE-1`, `TRUST-1`, etc.) on `spec.md`. The witness pattern from GOV-1 (bold-with-period inline marker) would falsely register `spec.md` as a non-narrative page under GOV-3 extraction and break GOV-12.

## Related Findings

- "Opening block has no stable anchor; obligations are bundled without IDs" — same-cluster (same defect class — bundled obligations — applied to the pre-Orientation block; same fix shape).
- "Four Scope dispositions lack stable anchors" — co-resolve (the same edit that splits Trust boundary into sub-bullets can add `<a id="scope-trust-boundary">` and siblings as part of the same restructuring pass).
- "Hard-ceiling items and non-goal exclusions have no stable identifiers" — same-cluster (same defect class for the Hard-ceiling list inside the same Scope subsection).
- "No REQ-IDs assigned anywhere in spec.md; normative obligations in hub are unciteable" — decision-dependency (the cross-cutting framing; both findings must respect GOV-12's rule that `spec.md` itself carries no REQ-IDs, so neither remedy can mint IDs on `spec.md`).
- "Trust boundary uses `tools` where `customTools` is the correct SDK field" — co-resolve (same paragraph; fix in sub-bullet 3 of the restructured list).
- "Error-shape detail in Trust boundary belongs in Tool Calls" — co-resolve (same paragraph; resolved by editing or relocating sub-bullet 4).
- "Filesystem/network access surface via runtime-stdlib functions not enumerated" — same-cluster (same Trust boundary bullet; the gap can be closed by adding a sub-bullet or by amending sub-bullet 1's forward-link to include the runtime-stdlib effect surface).
- "GOV-12 aggregator labels are editor instructions embedded in normative text" — same-cluster (touches the same Scope preamble; resolves independently of the Trust-boundary restructuring but in the same edit window).

---

# Trust boundary aggregator does not separate loom-language effect surface from runtime-internal effect surface

**Original heading:** Filesystem/network access surface via runtime-stdlib functions not enumerated
**Kind:** completeness

## Finding

`spec.md` paragraph 1 says "the loom language itself has no file-writing, network, or process-spawning primitive; effects of those kinds occur only through allowlisted tools," and forward-links to `runtime-value-model.md#effects`. The Trust boundary bullet then says "filesystem, network, and Pi-API access available to loom code and to its declared callables are exactly those available to any Pi extension running in the same process." Read together at the aggregator level, these two claims leave a third surface unaddressed: the *runtime's own* non-tool-mediated I/O — discovery walks, `import` resolution, settings-file reads via the `FileSystem` seam, settings-file watcher, the binder LLM call, and the loader file-reads for `.loom` / `.warp` source — all of which are performed by the loom extension on the operator's behalf, not through any `tools:` entry, and so do not appear under either framing.

The runtime-stdlib surface enumerated in `expressions.md` (string/array/object methods) is a value-manipulation set with no `pi.*` reach and no I/O — so the original framing's worry about "direct `pi.*` calls from runtime-stdlib functions" is not the live issue. The live issue is that `runtime-value-model.md#effects` already states the missing distinction precisely ("Filesystem reads performed by the runtime itself — discovery walks, `import` resolution, settings-file reads — are not loom-language effects and are unaffected by this rule; they are governed by [Discovery] and [Imports]"), but the Trust boundary bullet in `spec.md` does not forward-link there. A reader entering through Trust boundary and following only its outbound links (PIC `#no-extra-mediation`, Frontmatter `#tools`, Tool Calls — Failures, PIC tool-execution) reaches no page that distinguishes loom-code effects from loader effects, and is left to assume either (a) the runtime has no file I/O, or (b) the runtime's loader I/O is part of the unbounded "any Pi extension" privilege the bullet describes.

## Spec Documents

- `spec.md` — Orientation > Scope > Trust boundary (edited)
- `spec_topics/runtime-value-model.md` — `#effects` (read-only; already carries the canonical statement)
- `spec_topics/pi-integration-contract.md` — `#no-extra-mediation`, `#fakefilesystem--filesystem-interface` (read-only)
- `spec_topics/discovery.md` — `#settings-file-reads`, Home-directory expansion (read-only)
- `spec_topics/expressions.md` — Built-in methods and properties (read-only; confirms stdlib has no I/O reach)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None

## Consequence

**Severity:** advisory

A reader navigating the trust boundary from `spec.md` cannot reach the canonical statement of the loader/runtime-internal effect surface without consulting a page that the bullet does not link. Implementation is not blocked — `runtime-value-model.md#effects` and PIC's `FileSystem` seam already pin the rule — but an auditor reasoning purely from `spec.md` will either understate the runtime's I/O or wrongly fold it into the loom-code privilege envelope.

## Solution Space

**Shape:** single

### Recommendation

Add one forward-link to the Trust boundary bullet in `spec.md`, immediately after the existing "the runtime itself interposes no additional access channels" clause, naming the runtime-internal effect surface and pointing to its owner: e.g., "The runtime itself performs file reads on the operator's behalf — discovery walks, `import` resolution, settings-file reads, and the file-watcher — through the `FileSystem` and `FileWatcher` seams; these are not loom-language effects and are governed by [Runtime Value Model — Effects](./spec_topics/runtime-value-model.md#effects), [Discovery](./spec_topics/discovery.md), and [Pi Integration Contract — `FakeFileSystem` / `FileSystem` interface](./spec_topics/pi-integration-contract.md#fakefilesystem--filesystem-interface)."

Edge cases the implementer must preserve:

- The binder LLM call is also a runtime-internal effect (not user-tool-mediated). If the new sentence enumerates surfaces, list it alongside file reads, or use a closing "and the binder LLM call per [Slash-Command Argument Binding]" rather than implying file reads are exhaustive.
- Do not restate `runtime-value-model.md#effects` content verbatim — keep the aggregator bullet a forward-link, per GOV-12.
- The clarification belongs on the Trust boundary bullet, not paragraph 1: paragraph 1 already correctly forward-links to `runtime-value-model.md#effects`; the gap is downstream, in Trust boundary's own outbound link set.

## Related Findings

- "Trust boundary uses `tools` where `customTools` is the correct SDK field" — same-cluster (same Trust boundary bullet, independent fix)
- "Error-shape detail in Trust boundary belongs in Tool Calls" — same-cluster (placement fix on same bullet)
- "Trust boundary: five independent obligations bundled without IDs" — co-resolve (assigning REQ-IDs to the bullet's sub-obligations is the natural place to also pin the runtime-vs-loom-code effect-surface split as its own identified obligation)

## spec.md — Orientation > Scope (general) / Reading order

---

# GOV-12 plumbing leaks into Orientation prose

**Original heading:** GOV-12 aggregator labels are editor instructions embedded in normative text
**Kind:** cruft

## Finding

`spec.md`'s Orientation block carries a layer of meta-text whose only audience is a future spec editor maintaining GOV-12 lock-step. The labels appear in three forms:

1. Italicised reader-tags prefixed to individual paragraphs and list items: `*Orientation; this paragraph is informative.*` (Pi SDK and capabilities), `*Orientation aggregator (per [Governance — GOV-12]).*` (Host runtime), and three near-identical variants attached to each Host-runtime sub-bullet — `*Orientation; the operative rule lives in PIC.*`, `*Orientation; the canonical member-with-kind enumeration lives in PIC.*`, `*Orientation; the operative rule lives in PIC.*` (lines 17, 29, 31, 33, 35).
2. Inline parenthetical aggregator markers inside otherwise-readable sentences: `(currently five: import, export, fn, schema, enum — *orientation aggregator per [Governance — GOV-12]*)` on line 9 and `(This bullet is an aggregator under [Governance — GOV-12]; a future V1 leaf that introduces a new ceiling updates this bullet and the new ceiling's owner page in the same commit per GOV-12.)` on line 58.
3. Editor-facing maintenance prose folded into a Scope-subsection paragraph: `The aggregator-vs-source lock-step convention for keeping these bullets honest as topic pages evolve is owned by [Governance — GOV-12]` (line 43).

Each of these is redundant against three signals already present in the document: the `## Orientation` section header, the section's own opening paragraph that calls the bullets `*informative orientation*`, and GOV-12 itself, which states that all of `spec.md` is informative orientation and that aggregator paragraphs are maintained in lock-step with their sources by editorial convention. Form (3) is strictly editor-facing — implementers reading Orientation gain nothing from being told that GOV-12 owns a maintenance convention. Form (2)'s second half is worse: it restates GOV-12's lock-step rule inline ("a future V1 leaf … updates this bullet and the new ceiling's owner page in the same commit per GOV-12"), which is exactly the duplication GOV-12 was created to eliminate (its closing sentence: "previous load-bearing MUSTs scattered across `spec.md` aggregator paragraphs … are removed in favour of citing GOV-12"). Form (1) is reader-noise: a paragraph inside `## Orientation` does not need a three-word italic label declaring itself orientation.

## Spec Documents

- `spec.md` — Opening paragraph, Orientation > Prerequisites (Pi SDK and capabilities; Host runtime + 3 numbered sub-bullets), Orientation > Scope (intro paragraph; hard-runtime-ceilings closing parenthetical) (edited)
- `spec_topics/governance.md` — GOV-12 (read-only; the canonical home the labels redundantly cite)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None. The cleanup deletes editorial labels that carry no normative obligation; no leaf's Tests or Ships-when criteria reference them. H6 (`plan_topics/h6-req-ids.md`) rewrites outbound links in `spec.md`'s introduction (the prose between the H1 and `## Orientation`) but explicitly does not touch the Orientation section and assigns no REQ-IDs to `spec.md` itself, so the GOV-12 framing the labels duplicate remains intact under H6 and after.

## Consequence

**Severity:** cosmetic

A reader can still navigate the spec; nothing is misimplemented. The cost is reading friction (the same orientation hint repeated six times in adjacent paragraphs), one duplicated normative rule (GOV-12's lock-step MUST restated inline at line 58), and a maintenance trap: any future GOV-12 wording change requires a sweep over six scattered restatements in `spec.md` to keep them aligned.

## Solution Space

**Shape:** single

### Recommendation

Delete all six per-paragraph italic `*Orientation; …*` and `*Orientation aggregator …*` labels at lines 17, 29, 31, 33, 35, and the trailing italic in the line-9 parenthetical. Delete the editor-facing sentence at the end of the Scope intro paragraph (line 43): `The aggregator-vs-source lock-step convention for keeping these bullets honest as topic pages evolve is owned by [Governance — GOV-12].` Delete the trailing parenthetical on the hard-runtime-ceilings aggregator bullet (line 58): `(This bullet is an aggregator under [Governance — GOV-12]; a future V1 leaf that introduces a new ceiling updates this bullet and the new ceiling's owner page in the same commit per GOV-12.)`.

In their place, add one sentence at the top of the `## Orientation` section, immediately under the heading:

> The whole of this section is informative orientation per [Governance — GOV-12](./spec_topics/governance.md): every obligation it appears to state is owned by a topic page it forward-links to, and the lock-step maintenance convention for the aggregator paragraphs (Pi SDK capabilities, Host runtime obligations, Scope dispositions, hard runtime ceilings, `.warp` permitted top-level forms) is GOV-12's responsibility.

This collapses six scattered restatements into one canonical pointer at the section entrance. Edge cases for the implementer to honour:

- Do not delete the line-9 parenthetical wholesale — the substantive content (`currently five: import, export, fn, schema, enum`) is the actual `.warp` enumeration and must remain. Strip only the trailing `— *orientation aggregator per [Governance — GOV-12]*` clause.
- Do not delete the Scope intro sentence wholesale — the leading `This subsection pins four cross-cutting V1 dispositions … The bullets are informative orientation: each one forward-links the topic page that owns the normative contract …` is substantive and stays. Strip only the closing `The aggregator-vs-source lock-step convention …` sentence.
- Leave GOV-12's text in `spec_topics/governance.md` untouched — it is the canonical home and already enumerates which `spec.md` paragraphs are aggregators (Scope bullets, Pi SDK capabilities, Host runtime obligations, hard-runtime-ceilings, `.warp` permitted forms). The new Orientation-top sentence intentionally repeats that enumeration in compressed form so a reader who lands at `## Orientation` learns which paragraphs to treat as aggregators without leaving the page.
- The verdict that this cleanup is purely editorial relies on GOV-12's existing carve-out that drift is a "documentation defect, not a correctness defect" with no CI gate. If a later finding promotes GOV-12 lock-step to a CI-enforced rule, revisit whether the per-paragraph labels were carrying enforcement-side metadata.

## Related Findings

- "`.warp` top-level forms enumeration misplaced" — same-cluster (the line-9 `.warp` enumeration carries one of the labels this finding strips; relocating the enumeration and stripping its label are independent edits to the same sentence)
- "Reading order / Background subsection is editorial boilerplate" — co-resolve (both target editorial cruft inside the `## Orientation` block; a single Orientation-cleanup pass naturally addresses both)
- "Four Scope dispositions lack stable anchors" — same-cluster (both target the Scope subsection; anchor-assignment and label-stripping are orthogonal but touch overlapping prose)
- "Opening block has no stable anchor; obligations are bundled without IDs" — same-cluster (both concern aggregator paragraphs and their identifier/label hygiene)
- "No REQ-IDs assigned anywhere in spec.md; normative obligations in hub are unciteable" — decision-dependency (the GOV-12 informative-orientation framing is the rationale for `spec.md` carrying no REQ-IDs; the new Orientation-top sentence proposed above must be worded to preserve that framing)

---

# `Reading order` / `Background` subsection is reader-onboarding, not specification

**Original heading:** Reading order / Background subsection is editorial boilerplate
**Kind:** cruft

## Finding

`spec.md` Orientation contains a `### Reading order` subsection (lines 60–66) that instructs the reader to "Read these two topics first to understand the design" and links to `overview.md` and `comparison.md`, followed by a `**Background (non-normative). Skippable; explains design provenance, not requirements.**` paragraph (lines 67–69) that links to `influences.md`. Both blocks are reader-onboarding guidance — they advise *humans* in what sequence to consume other pages and self-label one of those pages as skippable.

Neither block carries a normative obligation, names an implementer-observable behaviour, or owns a cross-reference that any other spec page or plan leaf depends on. They duplicate function already served by (a) the introduction's first three paragraphs, which name `overview.md`, `comparison.md`, and the rest of the topic graph in context, and (b) the topic pages' own non-normative labelling (`influences.md` already declares its own scope on its title page). Carrying reader-onboarding inside a normative spec dilutes the surrounding Orientation material — which *does* hold load-bearing scope dispositions and aggregator forward-links — by mixing it with prose an implementer can ignore without consequence.

## Spec Documents

- `spec.md` — `### Reading order` subsection plus the `**Background (non-normative)…**` paragraph (edited)
- `spec_topics/overview.md` — title-page non-normative label, read to confirm the link target already self-describes (read-only)
- `spec_topics/comparison.md` — title-page framing, read-only
- `spec_topics/influences.md` — title-page "skippable; explains design provenance" label already exists on the page itself (read-only)
- `README.md` — candidate destination if any of the onboarding pointers are worth preserving outside the spec (option-dependent)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None. No leaf currently owns Orientation-subsection cleanup. H6 (`plan_topics/h6-req-ids.md`) is the only leaf that edits `spec.md`, and its remit is bounded to REQ-ID anchor insertion on non-narrative topic pages plus retargeting outbound links from `spec.md`'s *introduction* (the prose between the H1 and `## Orientation`); the Orientation subsections cited here lie below that scope and are not REQ-ID-bearing. The deletion is a pre-H6 spec edit with no test-surface or acceptance-criterion impact.

## Consequence

**Severity:** cosmetic

No implementer observes a behavioural difference whether the subsections stay or go. The cost is purely editorial: extra prose in a normative document trains readers to skim Orientation for "skippable" markers, which raises the chance that adjacent load-bearing Scope bullets get skimmed too.

## Solution Space

**Shape:** single

### Recommendation

Delete the `### Reading order` subsection and the `**Background (non-normative). Skippable…**` paragraph from `spec.md` (currently lines 60–69, between the `### Scope` block and the `---` rule that introduces `## Language`). Do not relocate the `[Overview and Conceptual Model]` and `[Comparison with Existing Pi Features]` pointers — `spec.md`'s introduction already links both pages in context, and `spec_topics/influences.md` already self-labels as non-normative on its own title page, so no destination move is required.

Edge cases for the implementer:

- Confirm no other spec page or plan leaf links to `spec.md#reading-order` before deleting (anchor stability check). A `grep -rn 'spec.md#reading-order' spec_topics/ plan.md plan_topics/` over the repo is sufficient.
- Preserve the `---` horizontal-rule separator between `### Scope` and `## Language`; the deletion removes content above the rule, not the rule itself.
- The deletion is part of an Orientation-section cleanup cluster (see Related Findings); sequencing it together with the GOV-12 aggregator-label cleanup avoids a second touch on the same prose.

## Related Findings

- "GOV-12 aggregator labels are editor instructions embedded in normative text" — co-resolve (same Orientation cleanup pass; both remove spec-editor-facing prose from the same `## Orientation` block)
- "Four Scope dispositions lack stable anchors" — same-cluster (touches the adjacent `### Scope` subsection but resolves independently — adds anchors rather than deletes prose)

---

# Scope subsection: three of four bullets lack per-bullet anchors

**Original heading:** Four Scope dispositions lack stable anchors
**Kind:** traceability

## Finding

The `## Orientation` → `### Scope` subsection of `spec.md` enumerates four cross-cutting V1 dispositions as an unordered dash-list: **Trust boundary**, **Source-language stability**, **Runtime observability**, and **Hard runtime ceilings**. Only the fourth bullet carries a stable anchor (`<a id="hard-runtime-ceilings"></a>`, present so the introductory paragraph at `spec.md:7` can deep-link to it via `[Hard runtime ceilings](#hard-runtime-ceilings)`). The other three are addressable only via the section-level `#scope` fragment plus a prose label.

This is not hypothetical drift bait — it is already biting active citations. `spec_topics/future-considerations.md` lines 90 and 92 both deep-link these bullets as `[…](../spec.md#scope)`, a fragment that resolves to the whole subsection rather than the specific disposition (Trust boundary / Source-language stability) the prose names. GOV-12 explicitly enumerates "the four Scope bullets" as one of `spec.md`'s aggregator paragraphs and codifies a lock-step convention that PRs touching the source pages must update the aggregator in the same commit; that convention assumes those bullets are individually citeable, but three of them are not. The result is fragile cross-references that silently degrade if the bullets are reordered or reworded, and an inconsistency in `spec.md`'s own anchor discipline (one bullet is anchored, three are not, with no rule explaining why).

`spec.md` itself is exempt from H6's REQ-ID anchor pass and from GOV-1 anchor-form mandates per GOV-12 ("`spec.md` carries no per-page REQ-ID prefix"), so this is a one-off documentation edit, not a REQ-ID assignment. The pattern to follow already exists in the same subsection: the `<a id="hard-runtime-ceilings"></a>` HTML anchor on the fourth bullet.

## Spec Documents

- `spec.md` — Orientation > Scope (edited)
- `spec_topics/future-considerations.md` — Known V1 limitations (no seam expected) (edited; rewrites the two `../spec.md#scope` deep-links to the new per-bullet anchors)
- `spec_topics/governance.md` — GOV-12 (read-only; defines the aggregator-vs-source lock-step convention this finding serves)

## Plan Impact

**Phases:** Horizontal phases (H6).

**Leaves (implementation order):**

- H6 — REQ-ID anchor insertion and coverage-matrix re-pivot — (modified)

H6 is the spec-anchoring leaf. Its current scope explicitly excludes `spec.md` from per-page REQ-ID anchor insertion ("`spec.md` itself is not in the per-page anchor loop and receives no `GOV-N` markers from this step"), but it does already perform an outbound-link rewrite over `spec.md`'s introduction. Folding the three Scope-bullet anchor insertions and the matching `future-considerations.md` deep-link rewrites into H6 is the natural home; the alternative is a one-off documentation commit independent of any leaf.

## Consequence

**Severity:** advisory

Cross-references from `future-considerations.md` already resolve only to the section, not the cited bullet. Future authors will continue to write fragile prose-label citations because no anchor is available. No implementer is blocked, and no observable runtime behaviour changes — this is purely a navigability and citation-stability defect.

## Solution Space

**Shape:** single

### Recommendation

Add three HTML anchors to the Scope bullets in `spec.md`, mirroring the existing `<a id="hard-runtime-ceilings"></a>` placement on the fourth bullet:

- `<a id="scope-trust-boundary"></a>` on the Trust boundary bullet.
- `<a id="scope-source-language-stability"></a>` on the Source-language stability bullet.
- `<a id="scope-runtime-observability"></a>` on the Runtime observability bullet.

Place each anchor at the start of the bullet body, immediately before the bold label, so the rendered list item layout is unchanged — same byte position the existing `hard-runtime-ceilings` anchor occupies.

Rewrite the two `../spec.md#scope` deep-links in `spec_topics/future-considerations.md` (lines 90 and 92) to `../spec.md#scope-trust-boundary` and `../spec.md#scope-source-language-stability` respectively in the same edit.

Edge cases the implementer must watch:

- These are HTML-form anchors on `spec.md`, which is exempt from GOV-1's `**PREFIX-N.**` inline marker rule (GOV-12 carves spec.md out of the REQ-ID system). Do not treat them as REQ-IDs, do not add them to the prefix table, and do not add inline `**SCOPE-N.**` markers — `spec.md` carries no prefix.
- The H6 test that asserts "`spec.md`'s introduction contains zero links of the form `./spec_topics/<non-narrative-page>.md#<non-prefix-anchor>`" governs *outbound* links from `spec.md` and is unaffected by this change. No new H6 gate is needed for the Scope-bullet anchors; they are documentation hygiene, not a CI invariant.
- The kebab-case `scope-trust-boundary` form matches the existing `hard-runtime-ceilings` precedent. Do not collide with GitHub's auto-generated `#scope` fragment for the `### Scope` heading itself — the new anchors are bullet-scoped (`scope-<disposition>`), the heading anchor is unchanged.

## Related Findings

- "Hard-ceiling items and non-goal exclusions have no stable identifiers" — same-cluster (same anchor-stability concern, but for the four ceilings *inside* the Hard runtime ceilings bullet plus the non-goal prose enumeration; resolved independently with a similar anchor pattern).
- "Trust boundary: five independent obligations bundled without IDs" — same-cluster (also a traceability gap on the same Scope subsection; that finding asks for sub-obligation IDs *within* the Trust boundary bullet, while this finding asks for an anchor *on* it; both edits can land in the same commit but neither resolves the other).
- "GOV-12 aggregator labels are editor instructions embedded in normative text" — decision-dependency (proposes deleting or radically demoting the four Scope bullets in favour of pure forward-links; if that finding's fix lands first, the bullets disappear and the anchor question is moot, so the cruft-vs-anchor decision must be made before implementing this fix).

## spec.md — Orientation > Prerequisites > Pi SDK and capabilities

---

# `^X.Y.Z` prose label "minor-version line" only coincides with npm caret semantics while Pi is in 0.x

**Original heading:** `^X.Y.Z` labeled "minor-version line" conflicts with npm caret semantics
**Kind:** clarity, completeness

## Finding

`spec.md` (Orientation > Prerequisites > Pi SDK and capabilities) and `spec_topics/pi-integration-contract.md` (Host prerequisites — Pi SDK pin) both describe the lock-step rule across `pi-coding-agent`, `pi-agent-core`, `pi-ai`, and `pi-tui` as pinning all four to "the same `^X.Y.Z` minor-version line." The `peerDependencies` literal-read test in `plan_topics/h1-scaffold.md` enforces the literal `"^0.72.1"` for each entry. The prose label and the operator disagree in the general case: npm's `^X.Y.Z` is a *major-version* range (`>=X.Y.Z, <(X+1).0.0`) when X ≥ 1, a *minor-version* range (`>=X.Y.Z, <X.(Y+1).0`) when X = 0 and Y ≥ 1, and a *patch-pinned* range (`>=X.Y.Z, <X.Y.(Z+1)`) when X = Y = 0. Only the middle case — which happens to match the current `^0.72.1` pin — produces "minor-version line" semantics.

This matters in two directions. First, an implementer reading the abstract `^X.Y.Z` template alongside the prose "minor-version line" cannot tell which constraint is normative: the prose says minor-line, the operator says (in the general case) major-line, and the only thing reconciling them is the unstated invariant "we are currently in 0.x." Should the spec ever change one without the other, lock-step intent silently widens. Second, when `pi-coding-agent` crosses to `1.0`, the same `^X.Y.Z` template — interpreted literally and copied forward to `^1.Y.Z` — becomes a major-pinned range that permits all four `peerDependencies` to drift across minor lines independently, which is precisely the skew the lock-step rule exists to forbid. The Pi version bump procedure (PIC, *Pi version bump procedure*, step 4) instructs contributors to "update the version pin in `peerDependencies` and the equivalent literal here" but never names the operator (`^` vs `~`) or the major-zero hazard, so a contributor following the checklist on the day Pi releases `1.0.0` would write `^1.0.0` and break the invariant the spec claims to enforce.

The current `^0.72.1` pin is not itself broken — it produces the intended `>=0.72.1, <0.73.0` range — and contrary to the original review note, npm does not interpret `^0.72.1` as patch-pinned (patch-pinning applies only to `^0.0.Z`). The defect is that the spec describes a behavioural contract ("same minor-version line") in terms of an operator (`^`) whose semantics happen to match only by accident of being in major-zero with a non-zero minor.

## Spec Documents

- `spec.md` — Orientation > Prerequisites > Pi SDK and capabilities (edited)
- `spec_topics/pi-integration-contract.md` — Host prerequisites #1 (Pi SDK pin) (edited)
- `spec_topics/pi-integration-contract.md` — Pi version bump procedure, step 4 (edited)
- `package.json` — `peerDependencies` block (option-dependent — only edited if the operator changes)

## Plan Impact

**Phases:** Horizontal H1

**Leaves (implementation order):**

- H1 — Repository scaffold and test framework — (modified)

The `peerDependencies` literal-read test and the `peer-dep-range` entry of `SDK_SURFACE_INVENTORY` (both in `plan_topics/h1-scaffold.md`) assert the literal `"^0.72.1"`. A prose-only fix leaves them untouched; an operator change (e.g. to `"~0.72.1"`) requires updating both the constant and the test literal in lockstep with the spec edit.

## Consequence

**Severity:** correctness

Today the contract holds by coincidence: `^0.72.1` resolves to the intended minor-pinned range. The defect is latent — at the next major-zero exit (`pi-coding-agent 1.0.0`) a contributor following the documented bump procedure mechanically copies `^0.Y.Z → ^1.Y.Z` and silently converts a minor-line pin into a major-line pin, allowing the four `peerDependencies` to drift independently. The lock-step invariant the spec claims to enforce mechanically becomes unenforced; install-time skew across `pi-coding-agent`, `pi-agent-core`, `pi-ai`, `pi-tui` becomes possible without any spec, test, or probe firing.

## Solution Space

**Shape:** multiple

### Option A — Switch the operator to `~` and update the prose to match

**Approach.** Replace `^X.Y.Z` with `~X.Y.Z` in both spec sites and in `package.json`'s four `peerDependencies` entries. The `~` operator's semantics are uniform across all major versions: `~X.Y.Z := >=X.Y.Z, <X.(Y+1).0`. Keep the prose label "minor-version line."

**Spec edits.**
- `spec.md` Prerequisites: `^X.Y.Z` → `~X.Y.Z`.
- PIC Host prerequisites #1: `^X.Y.Z` → `~X.Y.Z`; the four anchor citations of `^0.72.1` become `~0.72.1`.
- PIC Pi version bump procedure step 4: no wording change required (the operator is now stable across the 0.x → 1.x transition).
- `package.json`: four entries change from `"^0.72.1"` to `"~0.72.1"`; `typebox: "*"` unchanged.
- H1 leaf: `peer-dep-range` literal in `SDK_SURFACE_INVENTORY` and the `peerDependencies` literal-read assertion both change to `"~0.72.1"`.

**Pros.** Operator semantics match the prose unconditionally — no major-zero coincidence. Survives the `1.0.0` transition without contributor action. The mechanical gates (literal-read test, surface-inventory constant) continue to enforce the invariant after Pi reaches 1.0 with no further spec change.

**Cons.** Slightly tighter than the current effective range — `~0.72.1` and `^0.72.1` produce the same range today, but if Pi were to publish `0.72.5` the install would still resolve cleanly; the difference is theoretical. Touches `package.json` and one test literal.

**Risks.** None of substance — the resolved range under `^0.72.1` and `~0.72.1` is identical for the current pin (`>=0.72.1, <0.73.0`).

### Option B — Keep `^X.Y.Z`, document the major-zero coincidence, and add a bump-procedure step that recomputes the operator

**Approach.** Leave `^0.72.1` and the `^X.Y.Z` template as-is. Add a sentence to PIC Host prerequisites #1 stating that the operator's "minor-line" semantics depend on `pi-coding-agent` being in major-zero, and add a step to the Pi version bump procedure requiring contributors to switch the operator to `~` (or some equivalent explicit range) on the bump that crosses to `1.0`.

**Spec edits.**
- `spec.md` Prerequisites: append a sentence "(While `pi-coding-agent` remains in 0.x, npm's `^0.Y.Z` operator coincides with this minor-line semantics; the operator MUST be revisited on the bump that crosses to 1.0.)"
- PIC Host prerequisites #1: same clarifying sentence.
- PIC Pi version bump procedure: add a new numbered step "If the candidate Pi version is `1.0.0` or later, replace `^X.Y.Z` with `~X.Y.Z` (or the equivalent explicit range) across all four `peerDependencies` entries, the inventory constant, and the spec literals; the H1 `peerDependencies` literal-read test must be updated in the same commit."
- No `package.json` change today.

**Pros.** No code or test changes today. Defers the operator decision to the moment it actually matters.

**Cons.** Pushes a load-bearing decision onto a future contributor at the worst possible moment (a major-version bump under deadline pressure). Relies on the contributor reading the new step rather than mechanically copying the prior pin. The defect remains latent and the mechanical gates (literal-read test, surface-inventory constant) do not catch the operator-meaning change because they only assert string equality.

**Risks.** A contributor following the existing checklist mechanically misses the new step; nothing fails the build until skew actually appears in production.

### Recommendation

Take Option A. The `~` operator's semantics are uniform across major-zero and major-positive, so the prose ("minor-version line") and the operator agree unconditionally without depending on any external invariant. The change is mechanical, the resolved range under `^0.72.1` and `~0.72.1` is identical at today's pin, and it removes a class of latent defect (operator semantics changing under the contributor's feet at the 1.0 boundary) that no existing build-time gate detects. Edge cases for the implementer:

- The H1 `peerDependencies` literal-read test and the `peer-dep-range` entry of `SDK_SURFACE_INVENTORY` must change literals in the same commit as `package.json`; splitting these leaves the H1 test red on `main`.
- The four `@mariozechner/*` entries must move together; `typebox: "*"` is unaffected and remains asserted by its own one-line literal-read assertion per PIC Host prerequisites #1.
- The Pi version bump procedure (PIC, step 4) needs no wording change but the `^0.72.1` example literal in the prose at PIC's opening sentence and at the renderer-registration / `ExtensionContext` paragraphs must be updated to `~0.72.1` in the same commit.

## Related Findings

- "`@mariozechner/` scope omitted for sibling packages in spec.md" — co-resolve (same paragraph; the package-name fix and the operator fix touch adjacent text and should land together)
- "Peer-dep `^0.72.1` pin conflicts with Pi `packages.md` `\"*\"` convention; deviation not documented" — same-cluster (also concerns the `peerDependencies` block but resolves independently — the deviation rationale stands whether the operator is `^` or `~`)
- "Over-prescribes `peerDependencies` mechanism and `semver`-based comparator" — decision-dependency (if that finding is resolved by demoting the operator/mechanism to "recommended recipe" rather than normative, the operator-choice question reduces to PIC-level prose only and need not touch `package.json`)
- "`semver` library referenced as dependency but absent from `package.json`" — same-cluster (adjacent `package.json` defect; co-located edit window)
- "\"name-link\" coined verb; \"belt-and-braces\" idiom" — same-cluster (wording cleanup in the same Prerequisites paragraph)
- "Pi version bump procedure: existence and enforcement not documented" — decision-dependency (Option B above adds a step to the bump procedure; resolution of that finding must accommodate the operator-recheck step)

---

# `@mariozechner/` scope dropped from sibling-package names on first mention

**Original heading:** `@mariozechner/` scope omitted for sibling packages in spec.md
**Kind:** implementability

## Finding

The Prerequisites paragraph in `spec.md` (the `**Pi SDK and capabilities.**` block immediately under `### Prerequisites`) names the host as `@mariozechner/pi-coding-agent` but introduces the three sibling packages bare: "additionally pins `pi-agent-core`, `pi-ai`, and `pi-tui` as direct `peerDependencies`". The actual installable names — verified against `package.json#peerDependencies` and against `pi-coding-agent`'s own `dependencies` block — are `@mariozechner/pi-agent-core`, `@mariozechner/pi-ai`, and `@mariozechner/pi-tui`. The scope is implied by parallelism with the host name and is correctly used elsewhere in the spec corpus (e.g. PIC's *Pi SDK pin* item 1 uses the scoped form), but on this first-mention paragraph the scope is missing and no parenthetical recovers it.

The same defect appears in `pi-integration-contract.md`'s opening paragraph (line 3): "the lock-step pin requiring `pi-agent-core`, `pi-ai`, and `pi-tui` to resolve to the same minor-version line…". PIC then immediately switches to the scoped form in the very next item; the inconsistency is internal to PIC as well as between PIC's intro and `spec.md`.

A reader or automation that copies the literal package names from either first-mention sentence into a `package.json` produces an installable-but-wrong manifest (npm will resolve unscoped `pi-agent-core` to a different package on the public registry, or fail to resolve at all if no such package exists). Every other site in the corpus that the build-time `peerDependencies` literal-read assertion in H1 consumes already uses scoped names, so the defect is confined to the two introductory paragraphs.

## Spec Documents

- `spec.md` — Orientation > Prerequisites > Pi SDK and capabilities (edited)
- `spec_topics/pi-integration-contract.md` — opening paragraph (edited)
- `package.json` — `peerDependencies` (read-only; ground truth)
- `spec_topics/pi-integration-contract.md` — *Host prerequisites — Pi SDK pin* item 1 (read-only; canonical scoped reference)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None. H1's `peerDependencies` literal-read test (`plan_topics/h1-scaffold.md`) already keys on the scoped names (`peerDependencies["@mariozechner/pi-agent-core"]` etc.), and no other leaf consumes the affected sentences as a ground-truth literal. The fix is doc-only.

## Consequence

**Severity:** advisory

A human implementer is unlikely to install unscoped packages because the host-package scope makes the convention obvious, but a literal extraction (LLM-assisted manifest generation, regex-driven dependency-list scrape, or a contributor copying the sentence verbatim) yields a manifest that either resolves to the wrong package or fails to install. The cost is small but the fix is mechanical and removes a trap.

## Solution Space

**Shape:** single

### Recommendation

In both first-mention sentences (`spec.md` Prerequisites paragraph and `pi-integration-contract.md` opening paragraph), write the three sibling packages with their `@mariozechner/` scope on first mention:

- `spec.md`: "additionally pins `@mariozechner/pi-agent-core`, `@mariozechner/pi-ai`, and `@mariozechner/pi-tui` as direct `peerDependencies` …"
- `pi-integration-contract.md` opening paragraph: "the lock-step pin requiring `@mariozechner/pi-agent-core`, `@mariozechner/pi-ai`, and `@mariozechner/pi-tui` to resolve to the same minor-version line …"

Subsequent mentions in the same paragraph may abbreviate, provided the abbreviation is unambiguous (e.g. "the four `@mariozechner/*` packages"). Edge case for the implementer: do not introduce a parenthetical-only fix ("the three siblings, scoped under `@mariozechner/`") in lieu of writing the names in full — the build-time literal-read assertion in H1 keys on the scoped strings, and a future automated cross-check between the spec text and `package.json` should be able to grep the scoped name directly out of the spec.

## Related Findings

- "Peer-dep `^0.72.1` pin conflicts with Pi `packages.md` `\"*\"` convention; deviation not documented" — same-cluster (same Prerequisites paragraph, independent fix)
- "`typebox` declaration category and \"Pi's bundled-package convention\" unlinked" — same-cluster (same Prerequisites paragraph)
- "Over-prescribes `peerDependencies` mechanism and `semver`-based comparator" — same-cluster (same Prerequisites paragraph)
- "\"name-link\" coined verb; \"belt-and-braces\" idiom" — same-cluster (same Prerequisites paragraph)
- "`semver` library referenced as dependency but absent from `package.json`" — same-cluster (same Prerequisites paragraph; package-manifest correctness)
- "`semver` not declared as production dependency" — same-cluster (the `package.json` mirror of the previous finding; package-manifest correctness)

---

# `peerDependencies` for the four `@mariozechner/*` packages deviate from Pi's `"*"` convention without an in-spec acknowledgement

**Original heading:** Peer-dep `^0.72.1` pin conflicts with Pi `packages.md` `"*"` convention; deviation not documented
**Kind:** doc-alignment-broad, assumptions

## Finding

Pi's bundled-package convention (`@mariozechner/pi-coding-agent` `docs/packages.md` — *Dependencies*) states that any extension importing one of the five Pi-bundled packages — `@mariozechner/pi-ai`, `@mariozechner/pi-agent-core`, `@mariozechner/pi-coding-agent`, `@mariozechner/pi-tui`, `typebox` — MUST list it in `peerDependencies` with a `"*"` range and not bundle it, so the host's bundled copy wins. The convention is uniform across all five packages.

The loom spec follows the convention for `typebox` only. The four `@mariozechner/*` packages are pinned to `^0.72.1` in both the spec text (`spec.md` Orientation — Prerequisites — Pi SDK and capabilities; `spec_topics/pi-integration-contract.md` preamble and *Host prerequisites — Pi SDK pin*) and in `package.json#peerDependencies`. The H1 `peerDependencies` literal-read test enforces the `^0.72.1` literal on all four entries. This is a deliberate departure from `packages.md`, motivated by a lock-step invariant the spec asserts elsewhere: the four `@mariozechner/*` packages are released together from `pi-mono` at the same minor line, loom does not attempt to detect or accommodate skew across them, and a Pi minor bump is gated by the contributor checklist in *Pi version bump procedure*.

The spec cites `packages.md` to justify the `"*"` choice for `typebox` but never names the deviation for the other four. A reviewer or contributor reading both documents has no in-spec answer to the obvious question "why doesn't the same convention apply to the four `@mariozechner/*` packages?" and a well-meaning "fix" PR aligning the four entries to `"*"` would silently void the lock-step invariant — the H1 literal-read assertion would catch the manifest change, but not the underlying rationale loss. The asserted lock-step minor-version release cadence (`pi-mono` releasing the four together at the same `X.Y` line) is also stated as fact with no citation to an upstream Pi release-process document.

## Spec Documents

- `spec_topics/pi-integration-contract.md` — *Host prerequisites — Pi SDK pin* (the `typebox` sub-paragraph and the surrounding lock-step rule) (edited)
- `spec.md` — Orientation — Prerequisites — Pi SDK and capabilities (edited)
- `C:/Users/thomasa/AppData/Roaming/npm/node_modules/@mariozechner/pi-coding-agent/docs/packages.md` — *Dependencies* (read-only; upstream Pi convention being deviated from)
- `package.json` — `peerDependencies` block (read-only; the manifest already encodes the deviation)
- `plan_topics/h1-scaffold.md` — `peerDependencies` literal-read test bullet (read-only; the test already encodes the split between `^0.72.1` and `"*"` and explicitly cites the convention-anchor location that this deviation note will live at)

## Plan Impact

**Phases:** Horizontal H1

**Leaves (implementation order):**

- H1 — Repository scaffold and test framework — (modified)

The H1 `peerDependencies` literal-read test bullet already cites `pi-integration-contract.md`'s *Host prerequisites — Pi SDK pin* as the anchor for both the `^0.72.1` lock-step and the `"*"` convention. Adding the deviation acknowledgement to that anchored paragraph requires no test-shape change; only the bullet's reference to the new "deviation rationale" sentence (or sub-paragraph anchor) needs updating so a future reader following the test's anchor lands on the rationale rather than just on the literal pin.

## Consequence

**Severity:** advisory

The shipped behaviour is locked: `package.json` already encodes the deviation, the H1 literal-read test fails any drift, and the spec text in two locations consistently states `^0.72.1` for the four packages. No implementer working from the spec produces wrong code. The cost is reviewer/contributor friction — comparing the spec to `packages.md` produces an apparent contradiction with no in-spec resolution, and the asserted `pi-mono` lock-step release cadence is a load-bearing assumption about an upstream process with no cited source. A future contributor copy-pasting Pi's convention to "fix" the four entries to `"*"` would need to discover the lock-step rationale by reading the H1 test message rather than the spec.

## Solution Space

**Shape:** single

### Recommendation

In `spec_topics/pi-integration-contract.md` *Host prerequisites — Pi SDK pin*, add a short sub-paragraph (anchored, e.g., `<a id="packages-md-deviation"></a>`) immediately after the `typebox` sub-paragraph that:

1. States the deviation explicitly: "The four `@mariozechner/*` packages are pinned to `^0.72.1` rather than `"*"`. This is a deliberate departure from `@mariozechner/pi-coding-agent` `docs/packages.md` (*Dependencies*), which prescribes `"*"` uniformly for all five Pi-bundled packages."
2. Names the rationale in one sentence, anchored to the existing lock-step rule: "The lock-step invariant declared in this section — `pi-mono` releases the four packages together at the same `X.Y` line, and loom does not detect or accommodate skew — is itself load-bearing and would be voided by `"*"`, which permits any version of any of the four to resolve independently."
3. Pins the upstream cadence claim: either cite the `pi-mono` repo's release policy doc / `RELEASE.md` / changelog convention, or — if no such document exists — restate the claim defensively as "we pin to whatever lockstep `pi-mono` publishes; if that release process changes, the contributor checklist in *Pi version bump procedure* is the gate that surfaces the change."
4. Calls out that `typebox` correctly follows `"*"` because TypeBox's own release line is independent of `pi-mono` and the runtime depends only on `Type.Unsafe`, which is stable across the 0.x → 1.x line (the existing text already says this; the deviation paragraph should reference rather than restate it).

In `spec.md` Orientation — Prerequisites — Pi SDK and capabilities, replace the bare "lock-step rule and the rationale … are owned by [Pi Integration Contract — Host prerequisites — Pi SDK pin]" forward-link with one that points specifically at the new deviation anchor: "the lock-step rule, the rationale for declaring all four explicitly, and the deliberate deviation from `packages.md`'s `"*"` convention are owned by [Pi Integration Contract — Host prerequisites — Pi SDK pin — Deviation from `packages.md`](./spec_topics/pi-integration-contract.md#packages-md-deviation)."

Edge cases the implementer must watch:

- The new sub-paragraph MUST sit inside *Host prerequisites — Pi SDK pin* so the H1 literal-read test's existing anchor citation continues to land on a paragraph that contains both the literal and its rationale.
- The H1 `peerDependencies` literal-read test asserts `peerDependencies["typebox"] === "*"` separately from the four-entry `^0.72.1` block; the deviation paragraph MUST reinforce that split rather than blur it (a future reader MUST NOT be tempted to "unify" the five into a single `"*"` group on rationale grounds).
- If the upstream `pi-mono` release-process document does not exist, do not invent a citation; use the defensive restatement and route the verification through the existing *Pi version bump procedure* checklist.

## Related Findings

- "`@mariozechner/` scope omitted for sibling packages in spec.md" — same-cluster (same paragraph in `spec.md` Orientation — Prerequisites; both are doc-alignment defects in how the four-package pin is presented to readers)
- "`typebox` declaration category and \"Pi's bundled-package convention\" unlinked" — co-resolve (the deviation paragraph this finding recommends adds the anchored landing site that the `typebox` finding's forward-link already wants to exist; one edit to *Host prerequisites — Pi SDK pin* satisfies both)
- "Over-prescribes `peerDependencies` mechanism and `semver`-based comparator" — decision-dependency (if the spec demotes the `peerDependencies` mechanism to a "recommended recipe" per that finding, the deviation rationale moves with it; the deviation note must cite whichever location the lock-step invariant ends up owned by)
- "Peer-dep runtime version mismatch not detected by capability probe" — same-cluster (both findings touch the four-package pin's enforcement story; this one covers documentation alignment, that one covers runtime detection — they resolve independently)
- "Node `>=20.6.0` floor: version reference not pinned" — same-cluster (both ask for an upstream-policy citation that is currently asserted as fact; resolved independently but the same `Pi version bump procedure` checklist is the natural enforcement anchor for both)

---

# `typebox` declaration: category, link, and coexistence with the four Pi peer-deps left implicit

**Original heading:** `typebox` declaration category and "Pi's bundled-package convention" unlinked
**Kind:** implementability, assumptions

## Finding

`spec.md`'s *Orientation — Prerequisites — Pi SDK and capabilities* paragraph instructs the reader that `typebox` "is declared as `"typebox": "*"` per Pi's bundled-package convention so the host's bundled version wins." Three pieces of information needed to act on that instruction are missing from the paragraph:

1. **Dependency category.** The paragraph names the entry's range (`"*"`) but not the `package.json` block it belongs in (`dependencies`, `peerDependencies`, or `devDependencies`). The convention being cited (`@mariozechner/pi-coding-agent` `docs/packages.md` — *Dependencies*) requires `peerDependencies`; placing the entry in `dependencies` instead would bundle a redundant copy of typebox into the loom tarball, which is exactly the failure the convention exists to prevent. `pi-integration-contract.md` resolves the category obliquely — *Tool definition shape* (the `parameters` bullet) refers to "the `typebox` peer dependency declared in `package.json`" — but the *Host prerequisites — Pi SDK pin* sub-paragraph that introduces the `"*"` range does not name the block, so a reader who only consults the orientation block or the SDK-pin block has no anchor for the category.

2. **Forward-link to the convention.** Both `spec.md` and PIC name "Pi's bundled-package convention" but neither hyperlinks it. PIC supplies a textual citation (`@mariozechner/pi-coding-agent` `docs/packages.md` — *Dependencies*) which is enough to navigate by hand, but `spec.md` has no citation at all — only the bare phrase "per Pi's bundled-package convention." A reader of the orientation block has no path to the upstream rule, no path to PIC's typebox sub-paragraph, and no way to verify that loom's deviation from the same convention for the four `@mariozechner/*` packages (covered by a separate finding) is intentional rather than an oversight.

3. **Coexistence with the four Pi packages.** Neither page states explicitly that the `typebox` entry sits in the same `peerDependencies` block as the four `@mariozechner/*` entries. PIC implies coexistence by saying the `"*"` literal "MUST NOT be folded into the four-entry `^0.72.1` group asserted by the build-time lock-step assertion" — which presupposes both groups live in the same block — but never names the block. The H1 `peerDependencies` literal-read test (in `plan_topics/h1-scaffold.md`) does require all five entries to be present in `peerDependencies`, so the implementation truth is fixed; only the spec prose is silent on it.

## Spec Documents

- `spec.md` — *Orientation — Prerequisites — Pi SDK and capabilities* (edited)
- `spec_topics/pi-integration-contract.md` — *Host prerequisites — Pi SDK pin — `typebox` (the fifth Pi-bundled package)* (edited)
- `spec_topics/pi-integration-contract.md` — *Tool definition shape* (read-only; already names "peer dependency")
- `C:\Users\thomasa\AppData\Roaming\npm\node_modules\@mariozechner\pi-coding-agent\docs\packages.md` — *Dependencies* §"Pi bundles core packages" (read-only; upstream convention)
- `package.json` — `peerDependencies` block (read-only; ground truth for category and coexistence)

## Plan Impact

**Phases:** Horizontal H1

**Leaves (implementation order):**

- H1 — Repository scaffold and test framework — (modified)

The H1 `peerDependencies` literal-read test already encodes the answer (typebox lives in `peerDependencies` with `"*"`, alongside the four `^0.72.1` entries, asserted by a dedicated assertion that MUST NOT be folded into the four-entry lock-step assertion). The leaf needs no behavioural change; only its `Spec` cross-references update once `spec.md` and PIC's *Pi SDK pin* paragraph name the category, the convention link, and the coexistence relationship the test already pins.

## Consequence

**Severity:** advisory

An implementer who reads H1's leaf plan or PIC's *Tool definition shape* paragraph will arrive at the correct manifest shape, so V1 ships correctly under attentive reading. An implementer who reads only `spec.md`'s orientation paragraph could plausibly write `"typebox": "*"` into `dependencies`, producing a bundled-and-shadowed copy that breaks Pi's bundled-package guarantee under pnpm's strict resolution and silently works under flat `node_modules` — a class of bug that surfaces only on the package manager loom's own contributors do not use.

## Solution Space

**Shape:** single

### Recommendation

In `spec.md`'s *Orientation — Prerequisites — Pi SDK and capabilities* paragraph, replace the existing typebox sentence with one that names the category, names the coexistence, and forward-links to PIC. Suggested text:

> The fifth Pi-bundled package the runtime imports, `typebox` (only `Type.Unsafe`, per PIC's *Tool definition shape*), is declared as a fifth entry in the same `peerDependencies` block as the four `@mariozechner/*` packages, with range `"*"` per Pi's bundled-package convention so the host's bundled version wins. The category, the range, the coexistence, and the rationale for not folding the `"*"` literal into the four-entry `^0.72.1` lock-step assertion are owned by [Pi Integration Contract — Host prerequisites — Pi SDK pin — `typebox` (the fifth Pi-bundled package)](./spec_topics/pi-integration-contract.md).

In `spec_topics/pi-integration-contract.md`'s *Host prerequisites — Pi SDK pin* `typebox` sub-paragraph, two narrow edits:

- After "is the fifth Pi-bundled package the loom runtime imports," insert "and is declared as a fifth `peerDependencies` entry alongside the four `@mariozechner/*` packages above," so the category and coexistence are named at the point the `"*"` literal is introduced, not only later in *Tool definition shape*.
- Convert the textual citation `(`@mariozechner/pi-coding-agent` `docs/packages.md` — *Dependencies*)` into a Markdown link target. Even if `packages.md` is an upstream-package file with no committed local path, a `node_modules/@mariozechner/pi-coding-agent/docs/packages.md` reference (or a stable upstream URL) gives the reader a destination.

Edge cases the implementer must watch:

- The `"*"` literal MUST stay separated from the four-entry `^0.72.1` lock-step assertion that H1 wires (`peerDependencies` literal-read test). Adding the new prose MUST NOT phrase the five entries as a single homogeneous list — the lock-step pin and the bundled-package convention are two distinct rules and the H1 test asserts them separately on purpose.
- Re-stating the coexistence in `spec.md` is the kind of orientation-vs-source-of-truth duplication GOV-12 governs. Mark the coexistence sentence in `spec.md` as orientation, with the link as the source of truth.
- The deviation between the four-package `^0.72.1` pin and the bundled-package convention's `"*"` rule for those same four packages is the subject of a separate finding (*Peer-dep `^0.72.1` pin conflicts with Pi `packages.md` `"*"` convention*); that finding's resolution will edit the same paragraphs and should land in one combined commit.

## Related Findings

- "Peer-dep `^0.72.1` pin conflicts with Pi `packages.md` `"*"` convention; deviation not documented" — co-resolve (same paragraphs in `spec.md` orientation and PIC *Pi SDK pin*; one editorial pass should add the deviation notice, the bundled-package-convention link, the typebox category, and the coexistence sentence together)
- "`@mariozechner/` scope omitted for sibling packages in spec.md" — co-resolve (same orientation paragraph; rewriting it to name the typebox category invites scoping the four sibling names at the same time)
- "`semver` library referenced as dependency but absent from `package.json`" — same-cluster (separate dependency-declaration concern; touches `package.json` but a different block — `dependencies`, not `peerDependencies`)
- "Over-prescribes `peerDependencies` mechanism and `semver`-based comparator" — decision-dependency (a decision to drop the `peerDependencies` prescription would change which block typebox lands in and could moot part (iii) of this finding; resolve that one first)
- "`typebox.Type.Unsafe` not included in capability probe; absence failure mode unspecified" — same-cluster (touches typebox but a separate axis — capability probe vs manifest declaration)

---

# `typebox.Type.Unsafe` absence: probe exclusion is deliberate, but failure routing is unpinned

**Original heading:** `typebox.Type.Unsafe` not included in capability probe; absence failure mode unspecified
**Kind:** error-model

## Finding

`pi-integration-contract.md` — *Host prerequisites — Pi SDK pin* (the `typebox` sub-paragraph) — explicitly excludes `typebox` from the Step 0 capability probe and pins that exclusion as normative ("The capability probe under **Step 0 (d)** does not check `typebox` at all and MUST NOT be extended to do so"). The exclusion is justified by `Type.Unsafe` being stable across TypeBox 0.x → 1.x. So far so good.

What the spec does not pin is what happens when `Type.Unsafe` is nevertheless unresolvable at runtime — e.g. `typebox` resolves to a future major that drops or renames `Type.Unsafe`, an installer materialises a broken / partial copy, or a hostile transitive overrides it. Three sites in `pi-integration-contract.md` (per-loom registration's `parameters` wrap, the `customTools` wrap inside subagent-mode `createAgentSession`, and the typed-query `__loom_respond_<slug>` synthesis described in `implementation-notes.md`) all import `Type.Unsafe` from the `typebox` peer dependency and call it lazily at first tool-definition build. A missing or non-callable `Type.Unsafe` would surface there as a host-function `TypeError`.

`diagnostics.md` defines `loom/runtime/internal-error` with a trigger that already covers "host-function `TypeError`, an internal invariant violation, an unanticipated SDK reject," so the routing path exists — but the spec never name-links typebox absence to that path, and a reader following the typebox sub-paragraph or the per-loom registration text reaches the end of both without learning where the failure surfaces, when (load-time vs first-use), or under what code. The result is an implementer guessing whether to wrap the import in a try/catch, whether to fail the extension factory, or to let the bare `TypeError` escape uncategorised.

## Spec Documents

- `spec_topics/pi-integration-contract.md` — *Host prerequisites — Pi SDK pin* (`typebox` sub-paragraph) (edited)
- `spec_topics/pi-integration-contract.md` — *Per-loom registration* (`parameters` field bullet) (edited)
- `spec_topics/diagnostics.md` — `loom/runtime/internal-error` row (read-only — already covers the trigger)
- `spec_topics/implementation-notes.md` — Runtime, `__loom_respond_<slug>` synthesis (read-only)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

- None — `loom/runtime/internal-error` routing of an injected host-function `TypeError` is already asserted by V18m (per `plan_topics/v18-cancellation.md` line 111). Naming typebox absence as one such trigger does not add a new code, a new surface, or a new test obligation.

## Consequence

**Severity:** advisory

A typebox-absence failure would still route through `loom/runtime/internal-error`'s catch-all `TypeError` arm by construction, so no observer is wrong. But two reasonable implementers could diverge on whether to fail-fast at extension-factory entry (probing `Type.Unsafe` defensively despite the "MUST NOT" rule), to wrap the import call site, or to let the bare `TypeError` escape. The spec's silence here also leaves the V18m test author without a documented hook to add typebox-absence as a fixture under the `internal-error` routing test.

## Solution Space

**Shape:** single

### Recommendation

Add one sentence to `pi-integration-contract.md`'s `typebox` sub-paragraph (immediately after the existing "MUST NOT be extended to do so" clause) stating the routing:

> If `Type.Unsafe` is nevertheless unresolvable or non-callable at first tool-definition build (per-loom registration, `customTools` build, or typed-query `__loom_respond_<slug>` synthesis), the resulting host-function `TypeError` routes through `loom/runtime/internal-error` per [Diagnostics — `loom/runtime/internal-error`](./diagnostics.md). The runtime MUST NOT defensively `try`/`catch` the `Type.Unsafe` call site — the unified `internal-error` wrap at the slash and `invoke` boundaries (V18m, V18n) is the sole catcher.

Edge cases the implementer must watch:

- The failure surfaces at **first tool-definition build**, not at extension-factory entry — a loom that reaches no `customTools` build (no callees, no typed query) and no per-loom `pi.registerTool` call would never trip it.
- Subagent-mode failures fire inside the `createAgentSession({ customTools, ... })` build prior to session creation, so the slash-command surface (V18m) catches them, not the `invoke` parent surface (V18n).
- `prepareArguments` is documented as the optional shaping hook in `ToolDefinition`; loom does not use it, so the only `typebox` import surface is `Type.Unsafe`. A future leaf that adds a second typebox import (`Type.Object`, `Static`, etc.) would need to widen this routing sentence in the same edit.

## Related Findings

- "`typebox` declaration category and \"Pi's bundled-package convention\" unlinked" — same-cluster (both touch the `typebox` sub-paragraph; declaration category and absence-routing resolve independently)
- "Peer-dep runtime version mismatch not detected by capability probe" — same-cluster (both concern probe-coverage decisions; resolve independently — peer-dep mismatch *is* probed under Step 0 (d), typebox is deliberately *not* probed)
- "`semver` library referenced as dependency but absent from `package.json`" — same-cluster (adjacent peer-dep / capability-probe surface; independent fix)
- "Host-OOM routing claim incomplete for fatal V8 OOM" — same-cluster (both pin a previously-unspecified failure routing onto an existing diagnostic code)

---

# `semver` named as a production dependency but missing from `package.json`

**Original heading:** `semver` library referenced as dependency but absent from `package.json`
**Kind:** codebase-grounding-broad, prescription, assumptions

## Finding

`spec_topics/pi-integration-contract.md` Step 0 (a) and Step 0 (d) both prescribe `semver.satisfies(...)` "from the [`semver`](https://www.npmjs.com/package/semver) npm package, pinned as a direct production dependency of the loom package", and `spec.md` Orientation forward-links the same comparator under the *Node version floor* obligation. `spec_topics/diagnostics.md` (the `loom/load/host-incompatible` row) re-asserts the same dependency by naming the literal call `semver.satisfies(…, ">=20.6.0", { includePrerelease: true })` and `semver.valid` as the canonical decision functions for `node-floor`, `peer-dep-out-of-range`, and `peer-dep-malformed-version` discriminators.

The current `package.json` declares `semver` (and `@types/semver`) in **none** of `dependencies`, `devDependencies`, or `peerDependencies`. Plan leaf H1 (`plan_topics/h1-scaffold.md`, *Tests* section) is the leaf chartered to add both the package entries and a literal-read manifest assertion that gates them, so the gap is "scheduled but not yet shipped" rather than "structurally missing from the plan". An implementer reading the spec today, however, sees a present-tense assertion ("pinned as a direct production dependency") that the live tree falsifies; under `pnpm`'s strict resolution mode the runtime would also fail to resolve the import even after the source is written, because no transitive `semver` is hoisted into the loom package's own resolution scope.

A second concern is one of layering. The spec elevates a specific comparator library to a normative requirement — anchored in three separate pages — when the underlying contract is "decide whether a SemVer string satisfies a range". A future swap to a different SemVer implementation (or to a hand-rolled comparator) would require touching `pi-integration-contract.md`, `spec.md`, and `diagnostics.md`, none of which logically depend on the library identity.

## Spec Documents

- `spec_topics/pi-integration-contract.md` — Step 0 (a) Node floor; Step 0 (d) Peer-dep version (edited)
- `spec.md` — Orientation > Prerequisites > Host runtime, *Node version floor* obligation (option-dependent)
- `spec_topics/diagnostics.md` — `loom/load/host-incompatible` row (option-dependent)
- `package.json` — `dependencies` (edited)
- `plan_topics/h1-scaffold.md` — *Tests* section, capability-probe constants and manifest assertions (read-only)

## Plan Impact

**Phases:** Horizontal H1

**Leaves (implementation order):**

- H1 — Repository scaffold and test framework — (modified)

The H1 leaf already declares that it adds `semver` and `@types/semver` as direct production dependencies and adds a manifest literal-read assertion against the `dependencies` entry; the body text needs at most a one-line clarification if the spec resolution drops the `semver` library name entirely.

## Consequence

**Severity:** advisory

Until H1 lands, the spec asserts a runtime requirement that the live `package.json` cannot satisfy; an implementer trying to bring up the capability probe in isolation gets a `MODULE_NOT_FOUND` on `import { satisfies } from "semver"` and must reverse-engineer the H1 plan to recover. The risk is procedural (plan/spec out of phase) rather than design-level — H1's scaffolding leaf already captures the obligation, and the spec/plan converge once H1 ships.

## Solution Space

**Shape:** multiple

### Option A — Land H1 as planned; no spec edit

**Approach.** Treat the gap as purely temporal. H1 already specifies `semver` + `@types/semver` in `dependencies` and a `package.json` literal-read test that asserts the entry exists; no spec text changes.

**Spec edits.** None.

**Pros.** Zero spec churn; preserves the existing single-comparator anchoring; the manifest test prevents silent removal in any future leaf.

**Cons.** Anyone reading the spec before H1 ships sees a present-tense assertion the codebase falsifies; the layering critique (library name baked into three normative pages) is left in place.

**Risks.** None beyond the existing H1 sequencing risk.

### Option B — Land H1 *and* demote the library name to a recommended recipe

**Approach.** Keep H1's `semver` addition. In `pi-integration-contract.md` Step 0 (a) and (d), restate the normative contract behaviourally ("compare `process.versions.node` against the pinned floor under SemVer ordering, treating prerelease tags as eligible") and move the `semver.satisfies(...)` literal call into a non-normative recipe paragraph. Mirror the change in `spec.md` (which already uses "the `semver`-based comparator" as a forward-link phrase) and in the `diagnostics.md` row (rephrase "compared via `semver.satisfies(…, ">=20.6.0", { includePrerelease: true })`" as "compared under SemVer ordering against the pinned floor (prerelease tags eligible)").

**Spec edits.** Three pages: `pi-integration-contract.md` Step 0 (a)/(d), `spec.md` Host runtime obligation 1, `diagnostics.md` `loom/load/host-incompatible` row.

**Pros.** Decouples the library identity from the normative contract; a future comparator swap touches H1 only; the H1 manifest assertion still gates the implementation.

**Cons.** More edit surface; introduces a second finding's resolution (the related "Over-prescribes" finding) into this one's scope.

**Risks.** Behavioural restatement must preserve the `includePrerelease: true` semantic — losing it would silently break Node nightly support.

### Option C — Drop `semver` entirely; use string-comparison primitives

**Approach.** Remove the `semver` library mention from spec and plan. Express the Node floor and peer-dep range checks as direct comparisons against `process.versions.node` and the `package.json#version` string using a small in-repo comparator that handles the dotted-numeric + prerelease-tag cases the floor and `^0.72.1` range require.

**Spec edits.** Same three pages as Option B, plus removal of the `semver`/`@types/semver` lines from H1.

**Pros.** No third-party dependency for what is ultimately ~20 lines of comparator logic; eliminates the gap entirely.

**Cons.** Hand-rolling a SemVer comparator that correctly handles `includePrerelease`, build-metadata stripping, and caret-range expansion is a known foot-gun; the implementation cost dwarfs the dependency cost.

**Risks.** Subtle comparator bugs become loom's problem rather than `npm/node-semver`'s.

### Recommendation

Option B. Land H1 with `semver` + `@types/semver` and the literal-read manifest assertion exactly as planned, and in the same pass demote the library name to a recommended recipe in PIC Step 0 (a)/(d), with mirror edits in `spec.md` Host runtime obligation 1 and the `diagnostics.md` `loom/load/host-incompatible` row. The behavioural restatement must explicitly preserve the `includePrerelease: true` semantic for Node-floor comparisons (nightly/RC builds remain eligible) and the caret-range semantic for peer-dep comparisons. This option co-resolves the related "Over-prescribes" finding and removes the present-tense falsehood without forcing a hand-rolled comparator.

## Related Findings

- "Over-prescribes `peerDependencies` mechanism and `semver`-based comparator" — co-resolve (Option B's edits to PIC Step 0 (a)/(d) and `spec.md` Host runtime obligation 1 satisfy both findings in one pass)
- "`semver` not declared as production dependency" — co-resolve (the same finding restated against the `## package.json` section of the source review; one fix closes both)
- "Node `>=20.6.0` floor: version reference not pinned" — same-cluster (touches the same Step 0 (a) Node-floor obligation but resolves independently — one finding is about the comparator library, the other about the literal anchoring)
- "Peer-dep runtime version mismatch not detected by capability probe" — same-cluster (touches Step 0 (d) peer-dep-version handling but resolves independently)

---

# Spec hub names install-mechanism and comparator-library where it should state the invariants

**Original heading:** Over-prescribes `peerDependencies` mechanism and `semver`-based comparator
**Kind:** prescription

## Finding

The `spec.md` orientation hub — explicitly labeled *"Orientation; this paragraph is informative"* and *"Orientation; the operative rule lives in PIC"* — names three implementation choices in its own prose rather than the observable contracts those choices implement:

1. The package-manifest mechanism: "pins `pi-agent-core`, `pi-ai`, and `pi-tui` as direct **`peerDependencies`** … (belt-and-braces against package managers that do not auto-deduplicate transitive peer-dep ranges)" (Prerequisites — Pi SDK and capabilities).
2. The npm range syntax: "at the same **`^X.Y.Z`** minor-version line as `pi-coding-agent`" (same paragraph).
3. The comparator library: "the literal, the **`semver`-based comparator**, the `details.kind = "node-floor"` discriminator …" (Host runtime, obligation 1).

The two observable contracts these choices serve are (a) a lock-step version invariant — at runtime the four `@mariozechner/*` packages MUST resolve from the same minor line as the installed `@mariozechner/pi-coding-agent` — and (b) a Node floor predicate — at extension-factory entry the runtime MUST refuse to load when `process.versions.node` is below `20.6.0`. Neither contract requires `peerDependencies` over `dependencies`, requires `^` over `~` or an exact pin, or requires the `semver` library over hand-rolled parsing of `process.versions.node`.

The over-naming is not load-bearing for the *contracts* — but it is load-bearing for the H1 build-time literal-read tests in `plan_topics/h1-scaffold.md`, which assert exact strings (`peerDependencies["…"] === "^0.72.1"`, `engines.node === ">=20.6.0"`) and a `SDK_SURFACE_INVENTORY` constant containing `{ kind: "peer-dep-range", literal: "^0.72.1" }`. The mechanism therefore has a legitimate normative owner (PIC, anchored by H1's literal-read tests). What the orientation hub should not do is restate that mechanism in prose flagged "informative" — doing so creates a second site where `peerDependencies`, `^X.Y.Z`, and `semver` appear, undermining the "single source of truth" claim PIC's own header makes ("The `@mariozechner/pi-coding-agent ^0.72.1` range above is the single source of truth").

## Spec Documents

- `spec.md` — Orientation > Prerequisites > Pi SDK and capabilities (edited)
- `spec.md` — Orientation > Prerequisites > Host runtime, obligation 1 (Node version floor) (edited)
- `spec_topics/pi-integration-contract.md` — Host prerequisites — Pi SDK pin (read-only; remains the normative owner of the mechanism)
- `spec_topics/pi-integration-contract.md` — Step 0 (a) Node floor and Step 0 (d) Peer-dep version (read-only; remain the normative owners of the comparator and the range check)

## Plan Impact

**Phases:** Horizontal H1

**Leaves (implementation order):**

- H1 — Repository scaffold and test framework — (modified)

The H1 leaf owns the literal-read tests for `peerDependencies` (asserting `"^0.72.1"` against four package keys) and `engines.node` (asserting `">=20.6.0"`), plus the `SDK_SURFACE_INVENTORY` entry `{ kind: "peer-dep-range", literal: "^0.72.1" }`. Restating the spec hub's wording does not change the observables those tests assert, so H1's tests as written remain green; the leaf is touched only because its **Spec** field will pick up new spec.md anchors after the orientation paragraph is rewritten, and the cross-reference comments inside the literal-read tests should point at the new behavioral-invariant anchors rather than at the prose currently being removed.

## Consequence

**Severity:** advisory

A diligent implementer who reads PIC will arrive at the correct mechanism, so the spec is not broken. The cost is paid by maintenance: the lock-step rule and Node floor predicate are now restated in two places using mechanism-specific vocabulary, so any future migration (e.g. dropping `semver` for hand-rolled parsing, or moving the four packages from `peerDependencies` to `dependencies` if the bundled-package convention changes) requires editing the orientation hub in addition to PIC, and the "single source of truth" claim PIC makes about its own pin is silently false. The same paragraph is also where the related "minor-version line vs. `^` caret semantics" confusion sits — repeating mechanism vocabulary in informative orientation is what creates the surface for that confusion.

## Solution Space

**Shape:** single

### Recommendation

Rewrite the two spec.md orientation passages to state the behavioral invariants and forward-link mechanism details to PIC, deleting the mechanism vocabulary from spec.md entirely. PIC continues to own `peerDependencies` / `^X.Y.Z` / `semver` as load-bearing mechanism, anchored by H1's literal-read tests; nothing in PIC moves or weakens.

Concrete edits:

1. **Pi SDK and capabilities paragraph** (spec.md, Orientation > Prerequisites). Replace the sentence beginning "The runtime additionally pins `pi-agent-core`, `pi-ai`, and `pi-tui` as direct `peerDependencies` at the same `^X.Y.Z` minor-version line …" with a behavioral statement of the invariant:

   > The runtime requires `@mariozechner/pi-agent-core`, `@mariozechner/pi-ai`, and `@mariozechner/pi-tui` to resolve from the same minor-version line as the installed `@mariozechner/pi-coding-agent` (the *lock-step invariant*); skew across the four is unsupported. The package-manifest mechanism that enforces the invariant — declaration site, range syntax, and the build-time literal-read assertion that gates a Pi minor bump — is owned by [Pi Integration Contract — Host prerequisites — Pi SDK pin](./spec_topics/pi-integration-contract.md).

   Drop the parenthetical "(belt-and-braces against package managers …)"; that rationale belongs to PIC's mechanism paragraph, where it already appears.

2. **Host runtime obligation 1** (spec.md, Node version floor). Replace "The literal, the `semver`-based comparator, the `details.kind = "node-floor"` discriminator, and the `loom/load/host-incompatible` emission contract are all owned by …" with:

   > The runtime refuses to load when `process.versions.node` is below `20.6.0` (matching `@mariozechner/pi-coding-agent`'s `engines.node` floor). The literal floor value, the comparator implementation, the `details.kind = "node-floor"` discriminator, and the `loom/load/host-incompatible` emission contract are all owned by [Pi Integration Contract — Step 0 (a)](./spec_topics/pi-integration-contract.md#entry-capability-probe).

   The point is to name the predicate (`process.versions.node ≥ 20.6.0`) where the orientation currently names the comparator library.

3. **Leave PIC unchanged** with respect to mechanism. PIC's "Step 0 (a)" continues to specify `semver.satisfies(process.versions.node, ">=20.6.0", { includePrerelease: true })`; PIC's "Pi SDK pin" continues to specify the four-entry `peerDependencies` block at `"^0.72.1"`. These are load-bearing for H1's literal-read assertions and for the Pi version bump procedure (PIC step 4: "Move all four `peerDependencies` entries together"). Demoting them to "informative recipes" — as the original suggested-fix wording proposed — would silently weaken the build-time gate, which is the wrong outcome.

Edge cases the implementer must watch:

- The H1 literal-read test files contain comment-anchors back to the spec; update those comments to point at the new behavioral-invariant anchors in spec.md, otherwise a future spec edit that renames the new anchor leaves the H1 tests pointing at a vanished section.
- The Pi version bump procedure in PIC step 4 names "the four spec sentences cited above" that a bump commit must touch. After this edit, the spec.md sentences no longer carry the literal `^0.72.1` or `>=20.6.0`, so the bump no longer requires a spec.md edit when only the version literal moves; PIC's checklist should be re-read to confirm the count is still accurate.

## Related Findings

- "`^X.Y.Z` labeled \"minor-version line\" conflicts with npm caret semantics" — co-resolve (the recommended rewrite removes the `^X.Y.Z` token from spec.md entirely, which dissolves the caret-vs-minor-line confusion at the hub level; the same vocabulary in PIC still needs the clarification that finding describes)
- "`semver` library referenced as dependency but absent from `package.json`" — same-cluster (also about the `semver`-comparator surface, but resolves independently in PIC and `package.json` rather than in spec.md)
- "Peer-dep `^0.72.1` pin conflicts with Pi `packages.md` `\"*\"` convention; deviation not documented" — same-cluster (touches the same Pi SDK and capabilities paragraph; resolves with a separate deviation-notice edit in PIC)
- "`@mariozechner/` scope omitted for sibling packages in spec.md" — co-resolve (the rewritten sentence in edit #1 above already names the three packages with their `@mariozechner/` scope, fixing both findings in one edit)
- "`typebox` declaration category and \"Pi's bundled-package convention\" unlinked" — same-cluster (sits in the same orientation paragraph; resolves with its own targeted edit)
- "Peer-dep runtime version mismatch not detected by capability probe" — same-cluster (different surface — capability probe — but in the same lock-step / version-floor cluster)

---

# Two opaque phrasings in the Pi SDK prerequisites paragraph

**Original heading:** "name-link" coined verb; "belt-and-braces" idiom
**Kind:** clarity

## Finding

The single paragraph at `spec.md` line 17 (Orientation > Prerequisites > "Pi SDK and capabilities") contains two phrasings that obstruct a careful reader:

1. **"belt-and-braces against package managers that do not auto-deduplicate transitive peer-dep ranges"** — the parenthetical carries the load-bearing rationale for why `pi-loom` declares all four Pi packages explicitly under `peerDependencies` rather than relying on transitive resolution from `pi-coding-agent`. "Belt-and-braces" is a British English idiom for "redundant safeguard"; readers who do not recognize it are left with no rationale for an explicit normative-by-implication design choice.

2. **"the bullets below name-link each item back to its anchored obligation"** — "name-link" is a coined compound verb with no entry in the glossary and at least two plausible readings: (a) "name *and* link" (the bullets give a name and provide a hyperlink), or (b) "link by anchor name" (the bullets dispatch via a named anchor in PIC). The intended meaning is (a), but a reader cannot tell from the text alone, and the phrase appears nowhere else in the spec to disambiguate by analogy.

Both occur in a paragraph explicitly tagged "*Orientation; this paragraph is informative.*" — but the rationale clause and the bullet-list framing still need to be intelligible to readers who route from this paragraph into PIC.

## Spec Documents

- `spec.md` — Orientation > Prerequisites > "Pi SDK and capabilities" (paragraph at line 17) (edited)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None — the finding is a prose clarification in an "informative" paragraph; no leaf's Tests / Ships-when criteria depend on the wording, and no leaf is blocked or unblocked by the fix.

## Consequence

**Severity:** cosmetic

A non-native English reader hits "belt-and-braces" with no glossary anchor and either looks it up or skips the rationale; a careful reader hits "name-link" and pauses to disambiguate. Neither phrase changes any normative obligation — the operative content is owned by PIC — but both add friction at the front door of the spec. No two implementers diverge on behavior because of these phrasings.

## Solution Space

**Shape:** single

### Recommendation

Apply both substitutions in `spec.md` line 17, in place:

- Replace `belt-and-braces against package managers that do not auto-deduplicate transitive peer-dep ranges` with `as a redundant safeguard against package managers that do not auto-deduplicate transitive peer-dep ranges`.
- Replace `the bullets below name-link each item back to its anchored obligation` with `the bullets below name each item and link to its anchored obligation`.

Edge cases for the implementer:
- The paragraph is currently a single long sentence-cluster; do not restructure beyond the two substitutions, since adjacent normative-routing language (the `loom/load/host-incompatible` reference, the Step 0 anchor) is verified by other findings in this review and a structural rewrite would re-open them.
- "name and link" reads naturally as parallel verbs only if the sentence retains "each item" as the shared object; preserve that phrasing exactly.
- No glossary entry is required — the substitutions remove the need for one.

## Related Findings

- "Trust boundary: five independent obligations bundled without IDs" — same-cluster (similar paragraph-density problem in an adjacent Orientation subsection; resolves independently)
- "Reading order / Background subsection is editorial boilerplate" — same-cluster (other prose-quality finding in Orientation; independent)
- "Hard-ceiling items and non-goal exclusions have no stable identifiers" — same-cluster (a structural-clarity sibling, but unrelated to this paragraph's wording)

---

# `loom-system-note` channel ownership not stated at the orientation level

**Original heading:** `loom-system-note` channel: registration ownership unclear
**Kind:** assumptions

## Finding

`spec.md` introduces `loom-system-note` twice — once as the "Custom-message channel and renderer" capability bullet under **Pi SDK and capabilities**, and once in the **Runtime observability** scope bullet, which speaks of "the Pi `loom-system-note` channel". Neither mention identifies who owns the customType, who registers the renderer, or when. The phrasing "the Pi `loom-system-note` channel" reads as if Pi pre-defines a named channel that the runtime merely writes into.

The actual ownership model lives in `pi-integration-contract.md`: the literal `"loom-system-note"` is owned by the pi-loom extension, the loom factory MUST call `pi.registerMessageRenderer("loom-system-note", renderer)` synchronously inside the factory body before returning, Pi exposes no `unregisterMessageRenderer` so teardown is a no-op, a same-extension re-registration silently overwrites, cross-extension collisions resolve to the first-loaded extension's renderer, and a `pi.registerMessageRenderer` rejection at factory time degrades emission to the `ctx.ui.notify` fallback chain without aborting the factory. PIC's contract is complete and normative.

The gap is purely orientational: a reader of `spec.md` alone cannot tell that the channel is loom-owned rather than Pi-supplied, and the existing forward-links land on the *capability inventory* and the *runtime event channel* sections, not on the *Renderer registration* / *`customType` ownership and collision rule* paragraphs that answer the ownership question. One short re-phrase and one anchored forward-link close the gap.

## Spec Documents

- `spec.md` — Orientation > Prerequisites > Pi SDK and capabilities (capabilities-list bullet 6, "Custom-message channel and renderer") (edited)
- `spec.md` — Orientation > Scope > Runtime observability (the "Pi `loom-system-note` channel" sentence) (edited)
- `spec_topics/pi-integration-contract.md` — Renderer registration (`pi.registerMessageRenderer`); `customType` ownership and collision rule; Extension-bootstrap SDK failures > `pi.registerMessageRenderer` failure (read-only)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None. H4 already implements the registration exactly as PIC specifies (synchronous `pi.registerMessageRenderer("loom-system-note", …)` inside the factory before any discovery scan; the H4 leaf even ships an ordering-probe test for this). A clarification of `spec.md`'s orientation prose changes no acceptance criterion.

## Consequence

**Severity:** cosmetic

A first-time reader of `spec.md` may briefly believe Pi pre-defines `loom-system-note` and that the runtime is a passive writer. Following any forward-link into PIC immediately corrects the impression. No implementer would ship the wrong factory code on this basis, and the loaded ownership/timing/failure rules are normative in PIC.

## Solution Space

**Shape:** single

### Recommendation

Edit `spec.md` in two places:

1. **Pi SDK and capabilities, capability bullet 6.** Replace "Custom-message channel and renderer" with "Custom-message channel and renderer (loom registers the `loom-system-note` `customType` and its renderer at factory entry; ownership, timing, re-registration, teardown, and cross-extension collision rules per PIC)." Update the existing forward-link target from `#sdk-cap-custom-message-renderer` to point to (or additionally cite) the PIC anchors `Renderer registration (pi.registerMessageRenderer)` and `customType ownership and collision rule`. Add stable anchors at those PIC subheadings (e.g. `<a id="renderer-registration"></a>`, `<a id="custom-type-ownership"></a>`) so the spec.md link is a deep link, not a section-search.

2. **Runtime observability scope bullet.** Replace "the Pi `loom-system-note` channel" with "the loom-owned `loom-system-note` Pi `customType`" (or "the `loom-system-note` `customType` registered by the loom extension at factory entry"). Keep the existing forward-link to PIC's *Runtime event channel*; no new link is required here because the ownership clarification is one phrase.

Edge cases the implementer must watch:

- Do not import any of PIC's normative timing / failure / collision rules into `spec.md` — the orientation paragraph remains *informative*, and PIC retains sole ownership. The spec.md edit is one phrase per site, not a paragraph.
- The phrase "Pi `loom-system-note` channel" appears in `spec_topics/glossary.md` (the *operator* entry: "rendered into the active TUI session via the `loom-system-note` channel"). That sentence is correct as written (the channel exists in Pi's session log; ownership of the customType is a separate matter), so do **not** edit it as part of this fix.
- The PIC anchors added in step 1 are new anchor IDs the rest of the spec / plan may want to cite. If any other forward-link currently lands on a less-precise section header for the same content, opportunistically retarget it in the same commit (per `governance.md` GOV-12's aggregator-vs-source lock-step convention).

## Related Findings

- "`loom-system-note` emission failure: no fallback contract" — same-cluster (same channel, complementary aspect — fallback rather than registration; same `spec.md` orientation paragraphs are the natural insertion point for both forward-links)
- "`loom-system-note` channel: Pi serialization contract not pinned (messages re-entering model context)" — same-cluster (also a Runtime-observability orientation gap on the same channel)
- "Pi tool-wiring APIs mentioned without SDK citation" — same-cluster (sibling forward-link / orientation-vs-PIC-ownership gap in the same Pi SDK and capabilities paragraph)

---

# Pi tool-wiring APIs named in `spec.md` without SDK-grounded citation

**Original heading:** Pi tool-wiring APIs mentioned without SDK citation
**Kind:** assumptions

## Finding

The `Trust boundary` bullet in `spec.md` (Orientation > Scope) names two Pi SDK call sites inline as the mechanical enforcement of per-mode tool visibility:

> "subagent mode: explicit `tools` array on `createAgentSession`; prompt mode: `pi.setActiveTools` snapshot/restore around each query"

Neither of these identifiers is established at this point in the document. `spec.md` never quotes (and never deep-links to) the SDK type that exposes `createAgentSession`, the shape of its options object, or the signature of `pi.setActiveTools` / `pi.getActiveTools`. The forward-link points generically at `pi-integration-contract.md` (Tool-registration lifetime and visibility) rather than at any anchor where the signatures are pinned. A reader staying inside `spec.md` cannot tell whether `tools` is the right field name on `CreateAgentSessionOptions`, whether `pi.setActiveTools` accepts a name list or `ToolDefinition[]`, or whether either symbol exists at all on the pinned `^0.72.1` surface.

The same paragraph compounds the problem because the inline name `tools` is in fact the wrong field — PIC's own pinned signature uses `customTools` for the payload and reserves `tools` for an allowlist of names — but that drift is the subject of a separate finding ("Trust boundary uses `tools` where `customTools` is the correct SDK field"). The defect this finding flags is more general: an aggregator paragraph asserts SDK-shape facts (`createAgentSession({ tools: [...] })`, `pi.setActiveTools(...)`) without anchoring them to the document that does the SDK grounding.

## Spec Documents

- `spec.md` — Orientation > Scope > Trust boundary (edited)
- `spec_topics/pi-integration-contract.md` — Tool-registration lifetime and visibility; Conversation drive — subagent mode; SDK capability inventory items 3 and 4 (read-only — the SDK-pinned signatures already live here)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None — the leaves that consume these SDK surfaces (H4, V12a, V14a–V14j) already cite `pi-integration-contract.md` and use `customTools` / `pi.setActiveTools` per the PIC-pinned signatures. The fix is editorial inside `spec.md` and does not touch any leaf's Tests or Ships-when criteria.

## Consequence

**Severity:** advisory

A reader who treats `spec.md`'s aggregator bullets as load-bearing (a reasonable reading given they include literal SDK identifiers in code voice) will pick up `tools` and `pi.setActiveTools` as the API names to wire against without realising the actual SDK-grounded signatures are owned downstream. The non-citation also masks the `tools`-vs-`customTools` correctness defect already filed separately, because there is no in-`spec.md` pointer to the place where the right shape is pinned.

## Solution Space

**Shape:** single

### Recommendation

Replace the inline mechanism names in the `Trust boundary` bullet with a forward-link-only reference. Concretely, drop the parenthetical "(subagent mode: explicit `tools` array on `createAgentSession`; prompt mode: `pi.setActiveTools` snapshot/restore around each query)" and have the sentence close with the existing forward-link only — e.g. "…enforced mechanically by the per-mode wiring rule in [Pi Integration Contract — Tool-registration lifetime and visibility]." Leave the mechanism names, the field names, and the call shapes to PIC, where they are already pinned in code blocks (`createAgentSession({ customTools, tools, ... })` at PIC lines 199–209; the `pi.setActiveTools` snapshot/restore protocol at PIC lines 127–130; the SDK-capability-inventory entries at items 3 and 4). To make the link load-bearing, deepen the anchor — `pi-integration-contract.md` already has `<a id="...">` anchors near both subsections; reference the specific anchor rather than the bare page so the citation survives reordering inside PIC.

Edge cases the implementer must watch:

- Do not invent new mechanism prose to replace the parenthetical; the goal is removal, not paraphrase. Any restatement risks reintroducing the same drift (the current text already drifts on `tools` vs `customTools`).
- Apply the same removal posture wherever else `spec.md` names a Pi SDK identifier in code voice without an anchored citation (e.g. the `*Session model.*` paragraph names `session_shutdown`, `switchSession`, and `ActiveInvocationRegistry` under similar conditions; those are covered by separate findings, but the editorial pattern is the same).
- Coordinate the edit with the `Trust boundary uses `tools` where `customTools` is the correct SDK field` fix: removing the parenthetical resolves both findings in one stroke.

## Related Findings

- "Trust boundary uses `tools` where `customTools` is the correct SDK field" — co-resolve (deleting the inline parenthetical removes the wrong-field-name defect at the same time)
- "Trust boundary: five independent obligations bundled without IDs" — same-cluster (same paragraph, different defect: bundling vs. citation)
- "Error-shape detail in Trust boundary belongs in Tool Calls" — same-cluster (same paragraph, different defect: misplaced error-shape mapping)
- "Filesystem/network access surface via runtime-stdlib functions not enumerated" — same-cluster (same paragraph, different defect: incomplete reachable-surface enumeration)
- "`createAgentSession` has no `signal` option in SDK; subagent cancellation silently broken" — same-cluster (same SDK-grounding lens applied to a different call site; the PIC anchor this finding's recommendation points at must itself be corrected by that finding before deep-linking is fully honest)
- "`ambient tool set` not reconciled with Pi SDK's `active tools`" — same-cluster (same `setActiveTools`/`getActiveTools` surface, different defect: glossary-vs-SDK naming)
- "`ActiveInvocationRegistry`: implementation detail in Prerequisites; failure modes unspecified" — same-cluster (same editorial pattern — internal/SDK identifier named in an aggregator paragraph without grounding)

## spec.md — Orientation > Prerequisites > Host runtime

---

# Node floor "matches Pi's `engines.node`" claim is unverified at the source

**Original heading:** Node `>=20.6.0` floor: version reference not pinned
**Kind:** assumptions

## Finding

`spec.md` Orientation > Prerequisites > Host runtime obligation 1 asserts the loom runtime requires Node `>=20.6.0` "matching `@mariozechner/pi-coding-agent`'s `engines.node` floor." The literal `>=20.6.0` is duplicated in three sites (`package.json#engines.node`, `pi-integration-contract.md` Step 0 (a) comparator, the orientation prose) and is asserted by the H1 `engines.node` literal-read test against `package.json` only. The "matching Pi's floor" equality is itself never machine-checked.

The Pi version that the equality refers to is implicit: the `^0.72.1` peer-dep pin lives in `pi-integration-contract.md`, never inline at the orientation paragraph. Drift control relies on **Pi version bump procedure** step 3, a contributor checklist that says "if the upstream floor has moved, update the loom literal …; if it has not moved, the H1 test stays green and no edit is needed." There is no automated comparator that reads Pi's installed `engines.node` and fails CI when it diverges. If a Pi minor bump touches `engines.node` and step 3 is skipped (or executed sloppily), every spec site keeps stating `>=20.6.0` and the orientation paragraph's "matching" claim silently becomes false. The claim therefore behaves as documentation that ages by trust rather than by gate.

## Spec Documents

- `spec.md` — Orientation > Prerequisites > Host runtime, obligation 1 (read-only under recommended fix)
- `spec_topics/pi-integration-contract.md` — Step 0 (a) Node floor; Pi version bump procedure step 3 (edited)
- `plan_topics/h1-scaffold.md` — SDK surface-inventory literal-read test bullet (edited)

## Plan Impact

**Phases:** Horizontal H1

**Leaves (implementation order):**

- H1 — Repository scaffold and test framework — (modified)

## Consequence

**Severity:** advisory

A skipped or careless `engines.node` step during a Pi minor bump leaves the orientation paragraph asserting an equality that no longer holds. The runtime still loads under the loom-side literal `>=20.6.0`, but operators reading `spec.md` are misinformed about the actual host floor; if Pi has raised its floor (e.g. to `>=22.0.0` for a `node:test` reporter API), looms can boot under a Node version that satisfies loom's literal but violates Pi's, producing downstream Pi-side failures the loom orientation paragraph claims to rule out.

## Solution Space

**Shape:** single

### Recommendation

Add a `pi-engines-node-parity.test.ts` (or extend the H1 `SDK_SURFACE_INVENTORY` block with an `{ kind: "pi-engines-node", path: "@mariozechner/pi-coding-agent#engines.node" }` entry) under H1 that:

1. Reads the loom `package.json#engines.node` literal (the existing literal-read test source).
2. Resolves the installed `@mariozechner/pi-coding-agent` package's `engines.node` literal via `require.resolve("@mariozechner/pi-coding-agent/package.json")` (or the equivalent ESM import-attribute load).
3. Asserts byte-identical equality of the two literals; failure message names both literals and points the reader at **Pi version bump procedure** step 3.

Then simplify Pi version bump procedure step 3 to: "Run the H1 Pi `engines.node` parity test against the candidate Pi version; if red, update the loom `package.json#engines.node` literal, the [Step 0 (a)] comparator literal, and the [`spec.md`] orientation prose in one edit until green." The orientation paragraph's "matching `…pi-coding-agent`'s `engines.node` floor" claim then becomes a CI-enforced equality rather than a manual assertion, and no inline pin of the Pi version in the orientation prose is needed.

Edge cases the implementer must watch:

- Pi may publish a future `engines.node` value that uses different semver syntax (`>=20.6.0 <22` vs `>=20.6.0`). The parity assertion is byte-identical and will fail; the bump-procedure prose must direct the contributor to either align loom's literal verbatim or, if loom intentionally diverges (e.g. loom raises its floor higher than Pi's), to delete this parity test and replace it with a `semver.subset(loom, pi)` assertion plus a recorded deviation note.
- The test imports a runtime production-package `package.json`; under H1's "permits production-package imports only when the goal is to observe the real installed shape" rule this is permitted (the existing SDK surface-inventory test already does so), but the import path must use `package.json` directly, not transitive type re-exports.
- `pnpm`'s strict-resolution mode and workspace setups may surface `@mariozechner/pi-coding-agent` under hoisted vs nested layouts; use `require.resolve` (or the ESM equivalent) rather than a hard-coded `node_modules/...` path so the test stays correct under both.

## Related Findings

- "Pi version bump procedure: existence and enforcement not documented" — same-cluster (this fix removes step 3 from the manual-checklist surface that finding objects to)
- "Peer-dep `^0.72.1` pin conflicts with Pi `packages.md` `"*"` convention; deviation not documented" — same-cluster (both touch the implicit Pi-version anchor that orientation prose relies on)
- "Over-prescribes `peerDependencies` mechanism and `semver`-based comparator" — decision-dependency (a behavioural-contract rewrite of the Node-floor obligation must still preserve the parity assertion this finding adds)
- "Engine-level invariants: explicit silent-failure surface with no error model" — same-cluster (both rely on the V1 = Node-only disposition, which itself depends on the floor being correctly pinned)
- "Peer-dep runtime version mismatch not detected by capability probe" — same-cluster (parallel gap on the peer-dep side; resolved by analogous parity-assertion approach)

---

# `AbortSignal` / `AbortController` constructor source not pinned

**Original heading:** WHATWG AbortSignal/AbortController: supply source not stated
**Kind:** assumptions

## Finding

The spec is precise about the *shape* of `AbortSignal` and `AbortController` — Pi Integration Contract Step 0 (b) enumerates nine member-with-kind probes and the per-member `typeof` / `in` checks — but it never pins where the runtime *obtains* the constructors at the construction sites that consume them (`new AbortController()` per invocation in `ActiveInvocationRegistry`, the `AbortSignal.any(...)` lineage in cancellation forwarding, etc.). The probe checks unqualified bare names (`typeof AbortController === "function"`), which resolve through the JavaScript scope chain to `globalThis`, and the prose hints at the answer with the parenthetical "the Node-bundled WHATWG implementation" in PIC Host prerequisite #4 — but neither of these is a normative pin. Compare with the `Clock` seam, which explicitly names `performance.now()` / global `setTimeout` / `clearTimeout` as the production source and forbids direct calls outside the `WallClock` adapter via a build-time grep test.

The header "Pi-supplied `AbortSignal`" reinforces the ambiguity: Pi *does* supply `AbortSignal` *instances* on `ctx.signal`, the `tool.execute(...)` `signal` parameter, and `createAgentSession({ signal })`, but Pi does *not* supply the constructor itself — that comes from the host Node runtime. A reader who takes "Pi-supplied" literally could reasonably assume Pi is also the source of the constructor symbols, and could justify a future Pi monkey-patch of `globalThis.AbortController` / `globalThis.AbortSignal` (e.g. for telemetry interposition or a polyfill on a future host) as in-contract. The capability probe would catch outright shape breakage but cannot detect a conformant-shaped replacement with subtly different semantics (e.g. an `AbortSignal.any` whose parent-cleanup or memory-retention behaviour differs from the platform implementation), and the runtime would silently consume the replacement.

The right pin is two sentences: (i) the runtime takes both constructors directly from `globalThis` (every construction site reads them from the global namespace, never from a local binding, an SDK re-export, or any Pi-supplied façade), and (ii) Pi MUST NOT redefine, replace, or wrap `globalThis.AbortController` or `globalThis.AbortSignal` — the WHATWG implementation Node bundles is the contract. With that, the probe's `typeof <bare-name>` rules, the H1 surface-inventory test's `path: "<global>.<member>"` notation, and the runtime construction sites all become explicit consumers of one named source.

## Spec Documents

- `spec_topics/pi-integration-contract.md` — Host prerequisites #4 and Step 0 (b) (edited)
- `spec_topics/pi-integration-contract.md` — Cancellation source (edited)
- `spec.md` — Orientation > Prerequisites > Host runtime obligation 2 (read-only; aggregator forward-links to PIC)
- `spec_topics/cancellation.md` — Signal source (read-only)
- `plan_topics/h1-scaffold.md` — SDK surface-inventory test (read-only; already uses `path: "<global>.<member>"`, no edit needed)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None

The pin is purely textual. The existing capability probe already evaluates bare `AbortController` / `AbortSignal`, which resolve through `globalThis`; the H1 surface-inventory constant already encodes the source as `path: "<global>.<member>"`; and the runtime construction sites assigned to Mb (per-invocation `loomAbort`) and the cancellation lineage (per V18) construct via the same global names. Adding the pin and the no-redefinition obligation does not change any acceptance criterion.

## Consequence

**Severity:** advisory

A future Pi minor that monkey-patches `globalThis.AbortController` or `globalThis.AbortSignal` for telemetry, polyfilling, or test-isolation would be in-contract under the current spec wording even though it could change cancellation semantics the runtime relies on (lineage cleanup, microtask timing of the `abort` event, `reason` propagation across `AbortSignal.any` parents). The capability probe would let a shape-conformant replacement through. Implementers can still ship a correct V1 — the probe and existing call sites are unambiguous in code — but Pi has no written prohibition on the redefinition path the spec implicitly forbids.

## Solution Space

**Shape:** single

### Recommendation

In PIC Host prerequisite #4, after the "the Node-bundled WHATWG implementation" parenthetical, add: *"The runtime obtains `AbortController` and `AbortSignal` from `globalThis` at every construction site (`new AbortController()`, `AbortSignal.any(...)`, `AbortSignal.timeout(...)`); it MUST NOT import them from `node:` builtins, from the Pi SDK, or from any other source. Pi MUST NOT redefine, replace, wrap, or otherwise interpose on `globalThis.AbortController` or `globalThis.AbortSignal` — the unmodified Node-bundled WHATWG implementation is the contract."*

In PIC Step 0 (b), after the kind-table, add a one-sentence reminder that the bare-name `typeof` / `in` checks read through `globalThis` by scope-chain resolution, and that this is the same source the runtime construction sites consume — i.e. the probe and the construction sites are checking the same object.

In PIC Cancellation source, when describing `loomAbort = new AbortController()`, add a parenthetical `(constructed via globalThis.AbortController per Host prerequisites #4)` so the source pin survives a future reorder of the prerequisites block.

Edge cases the implementer should watch:
- Build-time guard: a grep test analogous to the Clock-seam ban (no direct `Date.now` outside `WallClock`) should forbid `import ... from "node:abort"` or any `require("abort_controller")`-style polyfill import in `src/`. The runtime MUST construct from the global, not from a `node:` builtin re-export, even though the two are the same constructor in current Node — the pin keeps the future-Pi-monkey-patch case observable.
- Test fakes: tests that swap `globalThis.AbortController` for a fake (e.g. to drive deterministic `abort` timing) MUST restore the original in `afterEach`. This is a test-author obligation, not a runtime obligation, but the recommendation should not preclude legitimate test interposition — only Pi-side production interposition.
- The pin does NOT extend to instances Pi delivers (`ctx.signal`, `tool.execute`'s `signal`, `createAgentSession({ signal })`); those remain Pi-supplied per the existing #4 text. Only the constructors are pinned to `globalThis`.

## Related Findings

- "`small set of named members` — vague quantity" — same-cluster (same PIC paragraph; both are clarifications to Step 0 (b) framing)
- "`H1 surface-inventory test` is an undefined identifier" — same-cluster (same spec.md sentence; the "<global>.<member>" path the H1 test consumes is the same source-pin question)
- "`ctx.signal` lifetime/freshness not asserted" — same-cluster (both touch the Pi-supplied AbortSignal contract, but resolve independently — that finding is about instance freshness, this one is about constructor source)
- "`createAgentSession` has no `signal` option in SDK; subagent cancellation silently broken" — same-cluster (both touch the AbortSignal surface area but address different layers; that finding is about an SDK shape error, this one is about constructor provenance)

---

# `H1` is used as an unintroduced cross-corpus label inside spec text

**Original heading:** "H1 surface-inventory test" is an undefined identifier
**Kind:** clarity

## Finding

`spec.md` (Orientation — Prerequisites — Host runtime, obligation 2, line 33) refers to "the source of truth the H1 surface-inventory test consumes" with no expansion, no glossary entry, and no link to where `H1` is defined. The `H1` label is plan-side taxonomy: it is introduced in `plan.md` ("H1 — Repository scaffold and test framework") and elaborated in `plan_topics/conventions.md` (the horizontal / MVP / vertical phase categories) and `plan_topics/h1-scaffold.md` (the leaf where `test/extension/pinned-surface.test.ts` lives). A reader of `spec.md` who does not also have the plan tree open cannot tell whether `H1` denotes a heading level, a hypothesis label, a milestone, a release tag, or something else.

`spec_topics/glossary.md` contains no entry for `H1` (or for the phase taxonomy generally), and `spec.md` carries no forward-link to `plan.md` from this paragraph. The same paragraph is the AbortSignal obligation that several adjacent findings target, so it is already a clarity hot-spot.

The same label leaks into `spec_topics/pi-integration-contract.md` at five sites in the **Pi version bump procedure** (lines 573, 574, 575, 578, 580) under the names `H1 SDK surface-inventory test`, `H1 'engines.node' literal-read test`, `H1 'peerDependencies' literal-read test`, and `H1 test`. Most of those sites do parenthesise `(per [`h1-scaffold.md`](../plan_topics/h1-scaffold.md))`, but they still rely on the reader recognising `H1` as a known phase label — a recognition the spec corpus never grants.

## Spec Documents

- `spec.md` — Orientation > Prerequisites > Host runtime, obligation 2 (edited)
- `spec_topics/pi-integration-contract.md` — Pi version bump procedure (edited)
- `spec_topics/glossary.md` — top-level glossary (option-dependent; only edited under the glossary-entry variant)
- `plan.md` — Horizontal phases section (read-only; confirms `H1` is a plan-side identifier)
- `plan_topics/conventions.md` — phase taxonomy (read-only)
- `plan_topics/h1-scaffold.md` — defines the SDK surface-inventory test (read-only; link target)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None — the H1 leaf already owns the test definition; no acceptance criteria change and no leaf is blocked or unblocked by clarifying the spec-side reference.

## Consequence

**Severity:** advisory

A reader trying to verify obligation 2 against the AbortSignal probe will not know what artefact `H1 surface-inventory test` names without leaving `spec.md` and discovering `plan.md` independently. Two implementers will still converge — both will eventually find `plan_topics/h1-scaffold.md` — but the spec text fails to be self-contained at a load-bearing cross-link. The same gap weakens the bump-procedure prose in PIC, where `H1` is invoked as if it were a known noun.

## Solution Space

**Shape:** single

### Recommendation

At first use in `spec.md` (Orientation obligation 2), replace `the H1 surface-inventory test` with a self-contained reference, e.g.:

> … the canonical enumeration with per-member kind tags (the source of truth consumed by the build-time SDK surface-inventory test owned by [H1 — Repository scaffold and test framework](./plan_topics/h1-scaffold.md)) lives at …

This drops the bare `H1` token in favour of a noun phrase the reader can resolve without prior plan-corpus knowledge, while still pinning the link.

In `spec_topics/pi-integration-contract.md` — Pi version bump procedure, normalise the five `H1 …` references the same way: keep the existing `(per [`h1-scaffold.md`](../plan_topics/h1-scaffold.md))` parentheticals but lead with the descriptive noun ("the build-time SDK surface-inventory test", "the `engines.node` literal-read test", "the `peerDependencies` literal-read test") rather than the `H1` label. The link to `h1-scaffold.md` already carries the phase identity for readers who care about it.

Edge cases the implementer must watch:

- Do **not** add an `H1` entry to `spec_topics/glossary.md`. The glossary is a spec-side artefact; pulling plan-phase taxonomy into it would couple the spec to plan-internal naming and create a fresh cross-corpus drift surface.
- Do **not** rename the `H1`-prefixed forms in `plan_topics/h1-scaffold.md` itself — plan-internal text may continue to use the phase label, since the plan defines it.
- The cited bump-procedure prose in PIC restates the literal `^0.72.1` and the seven SDK capability count; the rewrite must touch only the test-name phrasing, not those literals (which are governed by other findings in the same review).

## Related Findings

- `"small set of named members" — vague quantity` — same-cluster (sits in the same sentence in `spec.md` obligation 2; both are clarity gaps, resolve independently)
- `WHATWG AbortSignal/AbortController: supply source not stated` — same-cluster (same paragraph; assumption gap rather than clarity gap)
- `Node `>=20.6.0` floor: version reference not pinned` — same-cluster (sibling obligation 1 in the same Host runtime block, also pinned by an H1 literal-read test)
- `Pi version bump procedure: existence and enforcement not documented` — same-cluster (the bump procedure is the second site that uses bare `H1`; the recommended rewrite touches the same prose this finding faults for ownership)

---

# `AbortSignal` member surface in spec.md described as "a small set" — vague quantity

**Original heading:** "small set of named members" — vague quantity
**Kind:** clarity

## Finding

In `spec.md` Host runtime obligation 2 (Pi-supplied `AbortSignal` / `AbortController` shape), the runtime is described as requiring "the WHATWG `AbortSignal` and `AbortController` constructors and **a small set of named members**." The adjective "small" is a quantity word doing no work: a reader cannot tell from this page whether the set is three members or thirty, and the prose neither bounds the quantity nor names the surface.

The canonical enumeration already exists — `spec_topics/pi-integration-contract.md` Step 0 (b) carries a nine-row table (`AbortController`, `AbortSignal`, `AbortController.prototype.abort`, `AbortSignal.any`, `AbortSignal.timeout`, `AbortSignal.prototype.throwIfAborted`, `AbortSignal.prototype.addEventListener`, `AbortSignal.prototype.aborted`, `AbortSignal.prototype.reason`) with a per-member kind tag — and the spec.md sentence already forward-links to it. The vague adjective is the only weak word in an otherwise clean orientation paragraph; once dropped the sentence carries no quantity claim of its own and inherits the cardinality from the linked table.

## Spec Documents

- `spec.md` — Orientation > Prerequisites > Host runtime, obligation 2 (edited)
- `spec_topics/pi-integration-contract.md` — Step 0 (b), `AbortSignal` / `AbortController` shape (read-only)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None — H1's `pinned-surface.test.ts` (`SDK_SURFACE_INVENTORY` constant) already enumerates members from PIC's table, not from spec.md's prose, so the wording fix does not move any acceptance criterion.

## Consequence

**Severity:** cosmetic

A reader of spec.md alone forms no quantitative expectation of the `AbortSignal` surface and must follow the forward-link to learn anything concrete; nothing observable is wrong, but the adjective is dead weight in a paragraph whose stated purpose is orientation. No implementer divergence, no test affected.

## Solution Space

**Shape:** single

### Recommendation

In `spec.md` Host runtime obligation 2, drop "small" and tighten the link target so the sentence carries no implicit quantity. Replace:

> The runtime requires the WHATWG `AbortSignal` and `AbortController` constructors and a small set of named members; the canonical enumeration with per-member kind tags …

with:

> The runtime requires the WHATWG `AbortSignal` and `AbortController` constructors plus the named-member set enumerated at [Pi Integration Contract — Step 0 (b)](./spec_topics/pi-integration-contract.md#entry-capability-probe).

Edge cases for the implementer:

- Do not restate the cardinality (e.g. "nine members") in spec.md — restating couples the orientation page to the PIC table and re-creates the drift hazard the GOV-12 aggregator convention exists to prevent.
- The forward-link target (`#entry-capability-probe`) is shared by Step 0 (a)–(d); leave it as-is rather than minting a new sub-anchor for (b) alone.
- If the same paragraph is reworded as part of the related "H1 surface-inventory test" finding (see below), apply both edits in one commit so the sentence isn't touched twice.

## Related Findings

- "'H1 surface-inventory test' is an undefined identifier" — co-resolve (same sentence in spec.md obligation 2; the suggested rewrite above already removes the parenthetical that introduces the undefined "H1" identifier, so a single edit closes both)
- "WHATWG AbortSignal/AbortController: supply source not stated" — same-cluster (same obligation, different concern: who supplies the constructors vs. how many members are required)
- "`ctx.signal` lifetime/freshness not asserted" — same-cluster (adjacent `AbortSignal`-shape assumption in the same Prerequisites section, resolves independently)

---

# `loom-system-note` messages re-enter model context as `user`-role text

**Original heading:** `loom-system-note` channel: Pi serialization contract not pinned (messages re-entering model context)
**Kind:** assumptions

## Finding

The spec routes every operator-facing diagnostic — parse, load, type, runtime-panic batches; binder failures; always-log runtime events; structural watcher notes — through a single `pi.sendMessage({ customType: "loom-system-note", … }, { triggerTurn: false })` call (PIC §**System notes**), and asserts in `spec_topics/errors-and-results.md` that pre-evaluation failures "surface per [Diagnostics] on the `loom-system-note` channel, never produce appended turns or a final value." `triggerTurn: false` is treated as the load-bearing guarantee that these notes do not perturb the model.

Pi's actual contract is the opposite of what that wording invites the reader to assume. `pi.sendMessage(..., { triggerTurn: false })` only suppresses the *immediate* turn fire; the message is still appended to the session as a `CustomMessage` (role `"custom"`). On every subsequent provider call, Pi's `convertToLlm` transformer (`@mariozechner/pi-coding-agent` `dist/core/messages.js`, the `case "custom":` arm) maps each `CustomMessage` to a fresh `{ role: "user", content }` entry — unconditionally, ignoring `display`, with no opt-out flag analogous to `BashExecutionMessage.excludeFromContext`. The cumulative effect: every parse error, binder failure, AJV-validation note, runtime panic note, and `display: false` always-log event the runtime emits is silently injected as user-authored text into the next turn the user sends in their bare Pi session.

This subverts several spec invariants without being visible at the spec surface. (a) The "subagent-private" claim for subagent-mode `display: false` cascades holds inside the subagent session but the parent's `display: true` cascade still leaks the panic prose into the user session's model context. (b) The `loom-system-note` becomes a hidden injection vector — a malformed loom file emits diagnostics that the model then reads as if the user had typed them. (c) Compaction and context-budget accounting now include diagnostic prose the spec implicitly treats as out-of-band. PIC nowhere pins what Pi does with custom-channel messages on subsequent provider calls; the reader (and the implementer) is left to assume `triggerTurn: false` means "side channel, not in context," which it does not.

## Spec Documents

- `spec_topics/pi-integration-contract.md` — **System notes** / **Delivery surface** / **Runtime event channel** / SDK capability 6 (edited)
- `spec_topics/errors-and-results.md` — pre-evaluation failure paragraph using "never produce appended turns" wording (edited)
- `spec_topics/diagnostics.md` — channel description and renderer/fallback section (edited)
- `spec_topics/pi-integration-contract.md` — **Host prerequisites** SDK pin row (option-dependent — Option B requires a Pi-SDK floor bump)
- `C:/Users/thomasa/AppData/Roaming/npm/node_modules/@mariozechner/pi-coding-agent/dist/core/messages.js` — `convertToLlm`'s `case "custom"` arm (read-only — primary evidence)
- `C:/Users/thomasa/AppData/Roaming/npm/node_modules/@mariozechner/pi-coding-agent/dist/core/messages.d.ts` — `CustomMessage` interface (no `excludeFromContext` field) (read-only)
- `C:/Users/thomasa/AppData/Roaming/npm/node_modules/@mariozechner/pi-coding-agent/dist/core/agent-session.d.ts` — `sendCustomMessage` JSDoc on `triggerTurn` (read-only)

## Plan Impact

**Phases:** Horizontal H3, Horizontal H4, Vertical V18

**Leaves (implementation order):**

- H3 — Diagnostics primitive and multi-error accumulator — (modified)
- H4 — Pi extension shell — (modified)
- V18i — Per-`kind` formatting for prompt-mode top-level `Err` — (modified)
- V18q — Runtime event channel and always-log emission — (modified)
- V18r — Settings-file watcher (`~/.pi/agent/settings.json`, `.pi/settings.json`) — (modified)
- V18m — Panic routing: slash-command surface — (modified)

(The `sendSystemNote` helper in H4 is the single chokepoint; H3, V18i, V18q, V18r, V18m all emit through it. Whichever option is chosen, the helper's signature/test obligations and every leaf's "Tests" wording about `pi.sendMessage` payloads need updating.)

## Consequence

**Severity:** correctness

The runtime as specified leaks diagnostic prose into the user's bare-Pi conversation context as user-role text on every turn after a `loom-system-note` is emitted. Two implementers reading the spec will diverge: one will trust the "never produce appended turns" wording and ship the leak; another will probe Pi's `convertToLlm` and either route notes elsewhere or add a Pi-side workaround. The leak is silent, accumulates across a session, and turns parse errors and panic messages into adversarial-injection surface for the model.

## Solution Space

**Shape:** multiple

### Option A — Document the leak honestly; keep the channel

**Approach.** Replace the misleading "never produce appended turns" wording with an explicit statement that `loom-system-note` messages enter subsequent provider calls as `user`-role text (via Pi's `convertToLlm`). Add an operational note that diagnostic prose contributes to `ctx.getContextUsage()` and to compaction decisions, and that authors should treat parse/load diagnostics as durable session content.

**Spec edits.**
- `errors-and-results.md`: drop "never produce appended turns" — say "do not start a new turn (`triggerTurn: false`); subsequent turns observe the diagnostic in transcript order as a `user`-role entry per Pi's `convertToLlm` transform."
- PIC §**Delivery surface**: add a paragraph pinning the `convertToLlm` behaviour with a `dist/core/messages.js` citation. Cross-reference from PIC SDK capability 6.
- PIC §**Runtime event channel**: note that `display: false` events still enter model context — `display` only gates rendering, not LLM serialization.

**Pros.** Zero implementation cost. Honest about Pi's actual behaviour. Compatible with current Pi-SDK pin (`^0.72.1`).

**Cons.** Accepts the leak. Diagnostic prose pollutes context (model sees `loom /<name> aborted: …` as if the user said it). Parse errors during exploratory editing accumulate context tokens for the rest of the session. Adversarial loom file authors gain a prompt-injection surface.

**Risks.** A subagent-mode parent failure that emits a `display: true` panic note still injects panic prose into the parent user session's model context — this contradicts the spec's effort to keep subagent failures private.

### Option B — Add `excludeFromContext` to `CustomMessage` (Pi-SDK enhancement)

**Approach.** Coordinate with the Pi project to add an optional `excludeFromContext?: boolean` field to `CustomMessage`, mirroring `BashExecutionMessage.excludeFromContext` (which `convertToLlm` already honours — the `case "bashExecution"` arm returns `undefined` when set). The loom runtime sets it on every `loom-system-note`. Bump the PIC Pi-SDK floor to the first version that ships the field.

**Spec edits.**
- PIC §**System notes**: extend the canonical call to `pi.sendMessage({ customType: "loom-system-note", content, display, details, excludeFromContext: true }, { triggerTurn: false })`.
- PIC §**Host prerequisites** SDK pin: bump `@mariozechner/pi-coding-agent` floor to the version that lands the field; add it to SDK capability 6.
- PIC §**Step 0 capability probe**: probe for the field on `CustomMessage` and fail with `loom/load/host-incompatible` when absent.
- `errors-and-results.md`: keep the "never re-enters model context" intent and pin it to `excludeFromContext: true`.

**Pros.** Preserves transcript rendering via `pi.registerMessageRenderer`, keeps `/tree` navigation, and prevents the leak. One-line runtime change. Mirrors an existing Pi pattern (precedent reduces friction).

**Cons.** Cross-project coordination cost. Blocks until Pi ships the field and the loom Pi-SDK floor moves. Until then, the runtime ships with the Option A behaviour as a transitional state.

**Risks.** Pi may decline the addition or prefer a different shape (e.g., a generic message-filter hook). Floor bump may collide with other PIC pins.

### Option C — Split the channel: visible alerts via `ctx.ui.notify`; persisted records via `appendCustomEntry`

**Approach.** Stop using `pi.sendMessage` for loom diagnostics. Use `ctx.ui.notify(content, "error")` for the user-visible alert, and `ctx.sessionManager.appendCustomEntry("loom-system-note", details)` for the durable record (`CustomEntry` is a `SessionEntry` kind that does *not* flow through `convertToLlm`, so it persists in the session log without entering model context).

**Spec edits.**
- PIC §**System notes**: rewrite the canonical call shape; remove `pi.registerMessageRenderer` (transcript rendering is no longer applicable — `CustomEntry` does not render in the conversation pane). Keep the renderer only if the variant is shown to a user via a separate `ctx.ui.*` surface.
- Touch every leaf that asserts on `pi.sendMessage` payload shape (H3, H4, V18i, V18q, V18r, V18m); rewrite their tests against `ctx.sessionManager.appendCustomEntry` and `ctx.ui.notify`.
- Drop the `display: false` distinction entirely (the visible/audit split moves to channel choice rather than a flag).

**Pros.** Clean separation of "operator-visible alert" and "session-log audit record" with no model-context leak. No Pi-SDK change required.

**Cons.** Loses persistent in-transcript rendering — `CustomEntry` lives only in the session log file, not in the conversation view. `/tree` navigation by `loom-system-note` still works (entries are queryable) but operators no longer see notes inline with the conversation. `ctx.ui.notify` is transient (toast); persistence and visibility are now disjoint surfaces.

**Risks.** UX regression: operators currently get one inline transcript line per diagnostic; under Option C they see a transient toast plus a session-log entry. The spec's "persistent transcript surface for replay" framing in PIC §**System notes** loses its current implementation path. Subagent-mode notes also lose their "appears in subagent transcript" property.

### Recommendation

Adopt **Option A** for V1 and pursue **Option B** as a fast-follow Pi-SDK enhancement. Option A is the honest baseline; the spec must stop claiming "never produce appended turns" because Pi's `convertToLlm` contradicts it. Option C's UX regression (loss of inline transcript rendering) is too steep to take on for V1.

Concrete V1 spec edits:

1. In `errors-and-results.md`, replace "never produce appended turns or a final value" with "do not fire a new turn (`triggerTurn: false`) and produce no final value; the note enters subsequent provider calls as a `user`-role transcript entry per Pi's `convertToLlm` transform — see [PIC §Delivery surface]."
2. In PIC §**Delivery surface**, add a paragraph: "Custom-message channel persistence and LLM-context entry. Per `@mariozechner/pi-coding-agent`'s `dist/core/messages.js` `convertToLlm` transformer, every `CustomMessage` (including `loom-system-note`) is converted to `{ role: "user", content }` on every subsequent provider call. `triggerTurn: false` suppresses the immediate turn fire only; it does not exclude the message from the LLM context window. The `display` flag controls renderer behaviour, not serialization. Loom diagnostics therefore enter the user-session model context durably and contribute to `ctx.getContextUsage()` and compaction decisions. Operators authoring looms should expect parse errors, binder failures, panic notes, and always-log runtime events emitted in a session to be visible to subsequent model turns."
3. In PIC §**Runtime event channel**, add: "`display: false` gates only renderer visibility; the underlying `CustomMessage` still enters subsequent provider calls per **Delivery surface** above. Operators MUST treat all `loom-system-note` content (regardless of `display`) as durable session-context input."
4. Open a Pi-side issue requesting a `CustomMessage.excludeFromContext` field mirroring `BashExecutionMessage.excludeFromContext`. When Pi ships it, file a follow-up spec change to bump the SDK floor and set `excludeFromContext: true` on the canonical call.

Edge cases the implementer must watch:

- The H4 `sendSystemNote` helper currently has no `excludeFromContext` parameter; the V1 helper signature stays unchanged under Option A.
- The H4 fallback-chain step that emits `loom/runtime/system-note-delivery-failed` via the diagnostics channel must not invoke `pi.sendMessage` again (existing re-entry guard); under Option A this is unchanged.
- Subagent-mode `display: true` cascades land in the parent user session's transcript and therefore in the parent user session's model context — the spec must not promise subagent-private behaviour for the parent surface.
- Compaction sees these entries as ordinary `user` messages; nothing distinguishes them from real user input in token-accounting.

## Related Findings

- "`loom-system-note` channel: registration ownership unclear" — same-cluster (channel ownership / lifecycle; resolves independently of the serialization question)
- "`loom-system-note` emission failure: no fallback contract" — same-cluster (delivery semantics on the same channel; H4 fallback chain already addresses this in PIC, finding likely partially false-positive but related to channel ownership)
- "`pi.sendUserMessage` returns `void`, not `Promise`; transport-error detection path is wrong" — decision-dependency (both findings rest on the actual `dist/core/messages.js` / `agent-session.d.ts` shapes; resolving either should pin the SDK-grounded callsite contract once)
- "`display: false` `loom-system-note` events: no test interception mechanism" — co-resolve (any restructuring of the emission helper under Option B or C must specify the test seam at the same time)

## spec.md — Orientation > Prerequisites > Session model

---

# `switchSession` listed as a session-swap trigger and teardown described unconditionally

**Original heading:** `switchSession` incorrectly listed as session_shutdown trigger; teardown described as unconditional
**Kind:** cross-spec-consistency-broad, assumptions

## Finding

`spec.md` (Orientation > Prerequisites > Session model, line 39) states:

> *Session model.* A Pi extension instance is bound to exactly one active user session at a time. A session swap (`new` / `resume` / `fork` / `switchSession`) tears the extension instance down via `session_shutdown` and re-binds a fresh instance against the new session …

Two claims in this paragraph contradict the topic page it forward-links to.

1. **`switchSession` is not a `session_shutdown` reason.** The Pi Integration Contract (PIC) pins the closed normative set as `event.reason: "quit" | "reload" | "new" | "resume" | "fork"` (PIC step 4, line 76). `switchSession` appears in PIC only at line 415, in the explicit "members loom does not touch" list, where it is normatively forbidden in V1 ("the loom runtime MUST NOT call them in V1, and a future widening is a spec-versioned change"); `future-considerations.md` (line 59) anchors it under deferred mid-loom user-session-replacement. Listing it among the session-swap reasons in the hub paragraph contradicts both the PIC enumeration and the deferred-feature anchor.

2. **Teardown is not unconditional.** PIC line 92 explicitly says `reason: "new" | "resume" | "fork"` "does not always tear down the *extension* runtime (only the user session)"; the V1 acceptance is that the `session_shutdown` handler treats every reason identically because a no-teardown reason becomes a fast-path no-op. `cancellation.md` line 15 also softens the trigger language ("on `/reload`, `/new`, fork, or quit"). The hub paragraph's flat "tears the extension instance down" overstates this and would mislead a reader who never follows the link.

The orientation paragraph is meant to forward-link the normative contract, not to redefine it; here it does both, and its restatement diverges from the source on a closed enumeration and on a teardown invariant.

## Spec Documents

- `spec.md` — Orientation > Prerequisites > Session model (edited)
- `spec_topics/pi-integration-contract.md` — Extension entry point step 4; "Members loom does not touch" table (read-only)
- `spec_topics/cancellation.md` — second-trigger paragraph (read-only)
- `spec_topics/future-considerations.md` — Mid-loom user-session replacement anchor (read-only)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None. No plan leaf cites the wording of the spec.md Session-model paragraph; H4 (extension shell) and V18 (cancellation, file watcher) carry no `session_shutdown` handler leaf, and the relevant PIC/cancellation pages already encode the correct enumeration. The fix is confined to `spec.md` orientation prose.

## Consequence

**Severity:** correctness

A reader who relies on the hub paragraph without chasing the forward-link will (a) believe `switchSession` is a session-swap reason the runtime must handle, contradicting the V1 MUST-NOT-call rule, and (b) believe the extension instance is always torn down on `new`/`resume`/`fork`, missing the fast-path no-op disposition. Both errors steer implementation and review effort onto code paths the contract does not require.

## Solution Space

**Shape:** single

### Recommendation

Replace the parenthetical and the teardown clause in `spec.md` line 39 with text that mirrors PIC verbatim. Concretely:

> *Session model.* A Pi extension instance is bound to exactly one active user session at a time. Pi fires `session_shutdown` with `event.reason: "quit" | "reload" | "new" | "resume" | "fork"` (the closed normative set anchored at [Pi Integration Contract — Extension entry point, step 4](./spec_topics/pi-integration-contract.md)); the runtime's handler treats every reason identically and may fast-path to a no-op when the underlying reason did not invalidate the extension runtime. Concurrent loom invocations within a session …

Drop `switchSession` from the enumeration entirely — it is V1-forbidden and its deferred-feature home is already anchored at [Future Considerations — Mid-loom user-session replacement](./spec_topics/future-considerations.md#mid-loom-user-session-replacement); a hub mention only invites the reader to assume it is in scope.

Edge cases the editor must preserve: (a) the enumeration must remain a closed set quoted exactly as PIC quotes it (no informal abbreviations like "swap reasons"), since downstream readers grep on the literal reason values; (b) the softened teardown clause must not promise a specific fast-path detection algorithm — PIC's V1 acceptance is that the handler runs the same sequence regardless and a no-active-invocations registry trivially settles, and any tighter promise here would re-open a cross-spec inconsistency.

## Related Findings

- "Session swap + in-flight invocations: incomplete lifecycle and error contract" — co-resolve (same paragraph; the rewritten Session-model text is the natural carrier for the in-flight-invocation forward-link this finding asks for)
- "\"First-class\" undefined; concurrent invocations bounded/accounting unspecified" — same-cluster (same paragraph, different sentence; resolves independently)
- "`ActiveInvocationRegistry`: implementation detail in Prerequisites; failure modes unspecified" — same-cluster (same paragraph; resolves independently)
- "`ActiveInvocationRegistry` vs `activeInvocations` — two names for the same object in session_shutdown handler" — decision-dependency (any rewrite of the Session-model paragraph that names the registry must use the canonical name chosen by that finding's resolution)

---

# Session-swap behaviour for in-flight loom invocations is under-specified at the aggregator and partially open at the source

**Original heading:** Session swap + in-flight invocations: incomplete lifecycle and error contract
**Kind:** completeness, error-model

## Finding

The Prerequisites > Session model paragraph in `spec.md` says only that a session swap "tears the extension instance down via `session_shutdown` and re-binds a fresh instance," with a generic forward-link to `pi-integration-contract.md`'s **Extension entry point**. It says nothing about what happens to loom invocations that are mid-flight when the swap arrives. An implementer reading `spec.md` cannot tell from this paragraph (a) whether the per-invocation `loomAbort` is fired, (b) whether the runtime waits for cancellation to settle or force-aborts, (c) what the operator sees on `loom-system-note` for invocations that never reach a terminal outcome, (d) what becomes of any partially-appended turns the runtime has already pushed into the driven conversation, or (e) what an `invoke` parent observes when its child is killed by the teardown.

`pi-integration-contract.md` step 4 of **Extension entry point** answers (a) and (b) in detail: it fires `loomAbort.abort()` on every entry in `ActiveInvocationRegistry`, then awaits `disposeBarrier` for each invocation up to a hard `SHUTDOWN_AWAIT_CAP_MS = 2000` measured against the injected `Clock`, emitting one `loom/runtime/reload-teardown-timeout` diagnostic on overrun and proceeding regardless. `cancellation.md` echoes the iteration-and-abort step. So the cancellation-firing-and-bounded-await contract is real; what is missing is everything else:

1. **Per-invocation operator visibility for the non-timeout case is not specified.** The `loom/runtime/reload-teardown-timeout` diagnostic fires only on overrun; an invocation that cleanly cancels inside the 2 000 ms window leaves no per-invocation note on `loom-system-note`. An operator watching the channel sees the in-flight invocation simply stop appearing, with no diagnostic identifying which loom was interrupted by which `event.reason`.
2. **Partial-append fate during teardown is not addressed.** `errors-and-results.md` pins a no-rollback contract for partial appends in steady state, but a session swap is precisely the case where the conversation those appends sit in is being torn down or replaced. Whether partial appends remain in the outgoing transcript (and surface to the user on `resume`/`fork`), or are discarded with the session, is left to the implementer.
3. **Cross-shutdown `invoke` observation is not stated.** Under normal cancellation, a child's `cancelled` surfaces upward as `Err(QueryError { kind: "cancelled" })` and propagates through `?` per `cancellation.md`. During session_shutdown the parent is also being aborted in the same iteration, so the parent's `?`/`match` arm may never run. Whether the parent observes the child's `Err` (under what ordering), or is itself cancelled before it can, is not pinned.

The aggregator paragraph in `spec.md` should at minimum forward-link to a definite PIC anchor that resolves all five sub-questions; PIC must then close (1)–(3).

## Spec Documents

- `spec.md` — Orientation > Prerequisites > Session model (edited)
- `spec_topics/pi-integration-contract.md` — Extension entry point step 4; Subagent session lifecycle (edited)
- `spec_topics/cancellation.md` — second-trigger paragraph on `session_shutdown` (edited)
- `spec_topics/errors-and-results.md` — Partial-append contract / no-rollback (option-dependent: only edited if the resolution makes session-swap an explicit carve-out of the no-rollback rule)
- `spec_topics/diagnostics.md` — code registry (option-dependent: edited if a new `loom/runtime/session-shutdown-cancelled` (or similar) per-invocation code is introduced)

## Plan Impact

**Phases:** Horizontal H4; Vertical V12, V18.

**Leaves (implementation order):**

- H4 — Pi extension shell — (modified; H4 currently registers no `session_shutdown` handler at all; specifying this contract reveals that the `pi.on("session_shutdown", handler)` subscription, the `ActiveInvocationRegistry` data structure, the bounded-await loop, and `loom/runtime/reload-teardown-timeout` have no owning leaf today — H4 is the natural home, or a new H-phase leaf must be inserted)
- V12a — Subagent session lifecycle — (modified; subagent-mode `dispose()` invoked via the teardown path becomes a defined acceptance vector alongside the existing dispose-on-Err / dispose-on-panic / dispose-on-spawn-then-immediate-cancel cases)
- V18d — `AbortSignal` before every `invoke` — (modified; the parent-observation rule for a child killed by teardown becomes a defined test vector)
- V18e — Cancellation propagates downward only — (modified; the propagation rule's interaction with simultaneous parent-and-child shutdown abort needs at least one assertion)

(Plus the implicit gap: no leaf currently owns the `session_shutdown` handler implementation. The finding's resolution surfaces that gap but does not itself author a new leaf.)

## Consequence

**Severity:** correctness

Two implementers reading `spec.md` and following its forward-link will produce visibly different teardown UX: one may emit a per-invocation cancelled-by-shutdown note and discard the partial appends, the other may emit nothing per invocation and leave the partial appends in the outgoing session for `resume` to inherit. The `invoke`-parent observation question is the most consequential: a parent that sees `Err({kind:"cancelled"})` and runs its `?`/`match` arm during teardown can re-enter the runtime mid-shutdown, racing the bounded-await window.

## Solution Space

**Shape:** multiple

### Option A — Pure delegation: spec.md forward-links to a tightened PIC section

**Approach.** Replace the silent paragraph in `spec.md` with one anchored forward-link: "Session-swap semantics for in-flight invocations — the abort-and-await sequence, the per-invocation operator-visibility surface, partial-append fate, and the `invoke`-parent observation rule — are owned by [Pi Integration Contract — `session_shutdown` semantics]." Then close the three open sub-questions in PIC itself (and `cancellation.md` for the propagation interaction).

**Spec edits.**

- `spec.md` — Session model paragraph: drop the bare teardown sentence; add the anchored forward-link above. Optionally hedge teardown unconditionality per the related finding on `switchSession`.
- `pi-integration-contract.md` — In step 4 (or a new sub-section "Session-swap behaviour for in-flight invocations"): pin
  - per-invocation system note on the cancellation path (e.g. `loom/runtime/cancelled-by-session-shutdown`, `display: false` on `loom-system-note`, with `details.event.reason` carrying the Pi `event.reason` and `details.event.loom` carrying the invocation's slash name);
  - partial-append fate (the no-rollback rule from `errors-and-results.md` continues to apply: turns already appended remain in whatever conversation Pi assigns them to under the swap's `event.reason`; the runtime makes no rollback or migration attempt);
  - `invoke`-parent observation rule (parent and child are aborted in the same registry iteration; the parent's `?`/`match` arms do not run during the bounded-await window; the parent's `disposeBarrier` settles independently of whether its child surfaced an `Err` to it).
- `cancellation.md` — second-trigger paragraph: cross-link the propagation interaction so the downward-only rule is read with the teardown carve-out in mind.
- `diagnostics.md` — register the new code if option (1) takes the diagnostic-code shape rather than a content-only system note.

**Pros.**

- Keeps `spec.md` aggregator clean (one forward-link, no MUSTs at the hub) — consistent with GOV-12.
- All normative content lives where the implementer already has to read.
- The new diagnostic code is registry-tracked and gate-asserted under V18s.

**Cons.**

- Implementer of the session_shutdown handler must consult two pages (PIC + `cancellation.md`) for the full picture.

**Risks.**

- The new per-invocation diagnostic code adds a closed-gate obligation (V18s asserts every registry code is exercised by ≥1 test); implementer must add the assertion.

### Option B — Aggregator-level enumeration

**Approach.** Inline the five answers in `spec.md`'s session-model paragraph itself: "On `session_shutdown`, the runtime fires `loomAbort.abort()` on every active invocation (per `ActiveInvocationRegistry`), awaits cancellation up to `SHUTDOWN_AWAIT_CAP_MS` (2 000 ms), emits one per-invocation `loom-system-note` identifying each cancelled invocation and its `event.reason`, leaves any partially-appended turns in whatever transcript Pi resolves them to under the swap, and observes the standard downward-only propagation rule for `invoke` parents — except that during teardown the parent and child are aborted in the same registry iteration and the parent's `?`/`match` arms do not run on `Err({kind:"cancelled"})` surfaced from the child during the bounded-await window."

**Spec edits.**

- `spec.md` — Session-model paragraph rewritten to the inline form above.
- `pi-integration-contract.md` — step 4 unchanged for (a)/(b); the per-invocation note and partial-append fate also pinned here for the implementer who reads PIC first.

**Pros.**

- A reader of `spec.md` alone gets the full contract.

**Cons.**

- Five obligations land in the orientation aggregator without REQ-IDs and without anchored ownership — exactly the pattern flagged repeatedly elsewhere in this review (see "Opening block has no stable anchor", "Trust boundary: five independent obligations bundled without IDs").
- Duplication between `spec.md` and PIC creates the GOV-12 lock-step burden the aggregator-vs-source convention is trying to avoid.

**Risks.**

- Future edits to teardown semantics will drift between the two locations.

### Recommendation

Take Option A. Write the missing per-invocation cancellation surface and the `invoke`-parent ordering rule into PIC step 4 (or a new clearly-anchored "Session-shutdown semantics for in-flight invocations" subsection), restate the partial-append carve-out in `errors-and-results.md`'s no-rollback paragraph, and have `spec.md` forward-link to the new anchor with one sentence. The implementer who lands the `session_shutdown` handler needs PIC open in front of them anyway; the aggregator's job is to point there, not to restate.

Edge cases the implementer must watch:

- The bounded-await uses absolute deadline arithmetic against the injected `Clock` (not a refreshing slide); a slow `loomAbort.abort()` propagation in step 2 does not extend the await — already pinned in PIC, but the new per-invocation note must fire **before** the timeout diagnostic for invocations that cancel cleanly, and **only** the timeout diagnostic for invocations that do not.
- Per-invocation notes on `loom-system-note` may not be deliverable if the renderer or Pi's send path is being torn down concurrently; the existing `sendSystemNote` fallback chain (`ctx.ui.notify` → `loom/runtime/system-note-delivery-failed` → `console.error`) per H4 covers this, and the new per-invocation note must route through it.
- The new code (if introduced) must land in `diagnostics.md`'s code registry in the same edit per the V18s closing-gate rule, with at least one asserting test.
- If the resolution introduces a new `loom/runtime/cancelled-by-session-shutdown` (or analogous) code, the always-log set in PIC's runtime-event channel must state whether the new code is excluded (consistent with the existing `cancelled` exclusion) or admitted.

## Related Findings

- "`switchSession` incorrectly listed as session_shutdown trigger; teardown described as unconditional" — co-resolve (same paragraph; the `event.reason` enumeration and the teardown-conditionality hedge land in the same edit as the in-flight-invocation contract).
- "\"First-class\" undefined; concurrent invocations bounded/accounting unspecified" — same-cluster (same paragraph, same registry; the bounded-fan-out question is independent of the teardown question).
- "`ActiveInvocationRegistry`: implementation detail in Prerequisites; failure modes unspecified" — decision-dependency (the placement / observability / failure-mode treatment of the registry constrains how the in-flight-invocation contract can be expressed in `spec.md`).
- "`createAgentSession` has no `signal` option in SDK; subagent cancellation silently broken" — decision-dependency (the teardown step 2's `loomAbort.abort()` propagation into spawned subagents only works once that finding's wiring is corrected).
- "`ActiveInvocationRegistry` vs `activeInvocations` — two names for the same object in session_shutdown handler" — co-resolve (the same PIC step 4 edit that adds the missing per-invocation contract should normalise the identifier).
- "`loom-system-note` emission failure: no fallback contract" — decision-dependency (the new per-invocation cancellation note relies on the fallback chain that finding asks to be pinned).

---

# Session model: "first-class" concurrent invocations are undefined and unbounded

**Original heading:** "First-class" undefined; concurrent invocations bounded/accounting unspecified
**Kind:** clarity, completeness

## Finding

The Session model paragraph in `spec.md` (Orientation > Prerequisites) asserts:

> Concurrent loom invocations within a session (parallel tool calls, sibling subagent sessions) are **first-class** and addressed by the `ActiveInvocationRegistry` and the per-invocation `loomAbort`; concurrent *user sessions* in the same host process are out of scope for V1 because Pi does not support them.

Three problems compound at this site:

1. **"First-class" is undefined and overloaded.** The term carries no glossary entry, and a reader cannot tell which property is being claimed: that concurrent invocations are merely permitted, that they are tracked individually, that they execute in true parallel on the event loop, that they are independently cancellable, or some combination. Worse, `spec_topics/future-considerations.md:73` reserves "first-class loom values" for a deferred V1.x feature (`Loom<T>` type, higher-order composition). Using "first-class" in a load-bearing V1 sentence and again in a deferred-feature title creates a direct naming collision the glossary does not resolve.

2. **Concurrent fan-out is unbounded with no fairness or accounting rules.** The paragraph names no maximum number of in-flight invocations per session, no scheduler / fairness rule, and no statement of which existing caps are per-invocation versus per-session. The spec already commits to per-slash-invocation budgets in `binder.md` (one transport-failure retry, one malformed-envelope retry per slash invocation) and `tool_loop.max_iterations` in the Hard ceilings list, but the Session model paragraph does not aggregate or forward-link those decisions, leaving the reader to assume either per-invocation isolation or per-session pooling.

3. **Cancellation fan-out across siblings is implied but not pinned.** `cancellation.md` makes parent → child propagation downward-only and `pi-integration-contract.md` step 4 fans `loomAbort.abort()` across every registry entry on `session_shutdown`, but the Session model paragraph stops at "the per-invocation `loomAbort`" and does not link either rule. A reader who consults only this paragraph cannot tell whether cancelling one slash invocation cancels its siblings.

The downstream pages (`implementation-notes.md`, `cancellation.md`, `pi-integration-contract.md`) already commit to the underlying behaviour (per-invocation isolation, downward-only propagation, registry-wide fan-out at teardown). The defect is in the aggregator paragraph, which uses jargon and elides forward-links rather than specifying what the registry actually buys the operator.

## Spec Documents

- `spec.md` — Orientation > Prerequisites > Session model (edited)
- `spec_topics/glossary.md` — entry for "first-class" or its replacement (option-dependent)
- `spec_topics/future-considerations.md` — "First-class loom values" deferred-feature title (read-only; naming-collision source)
- `spec_topics/cancellation.md` — Signal source / Propagation (read-only)
- `spec_topics/pi-integration-contract.md` — Extension entry point step 4, `ActiveInvocationRegistry` definition (read-only)
- `spec_topics/binder.md` — Failure modes per-slash-invocation budget (read-only)
- `spec_topics/implementation-notes.md` — Per-invocation single-threaded execution (read-only)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None. The recommendation is a wording / forward-link clarification at the aggregator level. The underlying behaviour (per-invocation isolation, no concurrency cap, downward-only cancellation, registry-wide teardown abort) is already committed by leaves Mb (per-invocation `loomAbort`), V12a (subagent spawn), V14c-a (Pi-tool dispatch), V15a–V15k (`invoke` spawn including the V15k "two sibling sessions exist concurrently" test), and V18d / V18e (downward-only propagation). No acceptance criterion changes when the spec text is rewritten as recommended.

## Consequence

**Severity:** correctness

A reasonable implementer could read "first-class" as licensing implementation choices the spec does not actually want — for example, a worker-pool concurrency primitive, a bounded semaphore over invocation count, or shared per-session tool-loop budgets — none of which are contradicted by this paragraph. A second implementer could read it as merely "permitted and isolated" and ship the lock-step behaviour the rest of the spec assumes. Reviewers cannot pin either reading at this paragraph alone, and the term collides with a deferred-feature name three pages away.

## Solution Space

**Shape:** single

### Recommendation

Replace the trailing clause of the Session model paragraph with a behavioural statement that names the actual properties and forward-links each obligation to its owner page. Concretely:

> Concurrent loom invocations within a session — whether spawned by parallel tool calls into the same `.loom` callable, by sibling `invoke(...)` sites, or by independent slash dispatches — are **permitted, isolated, and independently cancellable**: each carries its own `AbortController` (`loomAbort`) per [Cancellation — Signal source](./spec_topics/cancellation.md), runs its own private subagent `AgentSession` in subagent mode (no shared transcript or `tools:` table) per [Implementation Notes — Per-invocation single-threaded execution](./spec_topics/implementation-notes.md), and is tracked as a distinct entry in the `ActiveInvocationRegistry` so that `session_shutdown` can fan `loomAbort.abort()` across every entry per [Pi Integration Contract — Extension entry point](./spec_topics/pi-integration-contract.md). V1 imposes **no maximum on the number of in-flight invocations** within a session and no fairness or scheduling rule beyond Pi's event-loop ordering. Per-invocation budgets (binder retry budget per [Slash-Command Argument Binding — Failure modes](./spec_topics/binder.md), `tool_loop.max_iterations` per [Hard ceilings](#hard-runtime-ceilings), `invoke`-chain depth) are **scoped to a single invocation** and are not shared, pooled, or replenished across sibling invocations. Cancellation propagates downward only (parent → children) per [Cancellation — Propagation](./spec_topics/cancellation.md); a sibling invocation's cancellation does not affect its siblings. Concurrent *user sessions* in the same host process are out of scope for V1 because Pi does not support them.

Implementer-relevant edge cases the rewrite must keep visible:

- The "no maximum" statement must be explicit, not implicit. Future tightening to a bounded fan-out is a deliberate change requiring a `CEIL-N` entry under Hard ceilings, not a silent implementation choice.
- Per-invocation budget scoping must enumerate the three cited budgets (binder, tool-loop, invoke depth) by name. Leaving any one off the list re-opens the per-session-vs-per-invocation ambiguity for that specific budget.
- The `ActiveInvocationRegistry` reference here remains a forward-link only; the failure-modes and observability gaps in that data structure are tracked by the companion finding `` "`ActiveInvocationRegistry`: implementation detail in Prerequisites; failure modes unspecified" ``.
- Drop the bare word "first-class" from this paragraph entirely. If a glossary entry is added, it must point at `future-considerations.md`'s `Loom<T>` deferred-feature usage and explicitly note that V1 invocation concurrency is not described by that term.

## Related Findings

- "`ActiveInvocationRegistry`: implementation detail in Prerequisites; failure modes unspecified" — co-resolve (same paragraph; the rewrite forward-links the registry rather than naming it bare, and the failure-modes gap is the natural follow-up at the registry's defining page)
- "`ActiveInvocationRegistry` vs `activeInvocations` — two names for the same object in session_shutdown handler" — decision-dependency (the aggregator's forward-link must use whichever spelling the PIC fix settles on)
- "Cancellation wiring detail misplaced and over-prescribed" — same-cluster (both findings argue the Orientation preamble names runtime-internal identifiers without pinning their observability)
- "Session swap + in-flight invocations: incomplete lifecycle and error contract" — same-cluster (adjacent paragraph; together the two define the full Session model story but resolve independently)
- "`switchSession` incorrectly listed as session_shutdown trigger; teardown described as unconditional" — same-cluster (same Session model paragraph; resolves independently)
- "Ceiling #3 (Binder LLM cap) is misclassified on multiple axes — consistency failure" — decision-dependency (the rewrite cites the binder budget as per-slash-invocation; if Ceiling #3 is restated using `binder.md`'s per-class framing, the citation must track that wording)
- "`tool_loop.max_iterations`: bounds, validation, and configurability unspecified" — decision-dependency (the rewrite asserts `tool_loop.max_iterations` is per-invocation; if that finding settles per-invocation-vs-per-nested-`invoke` differently, this paragraph's claim must follow)
- "Subagent state-isolation matrix presupposes Pi context-passing model" — same-cluster (both touch the per-invocation-isolation claim from different angles)

---

# `ActiveInvocationRegistry` named in spec.md orientation: level mix, anchor-less link, registry contract not surfaced

**Original heading:** `ActiveInvocationRegistry`: implementation detail in Prerequisites; failure modes unspecified
**Kind:** placement, prescription, error-model, assumptions

## Finding

The Session-model bullet under `spec.md` → Orientation → Prerequisites reads:

> Concurrent loom invocations within a session (parallel tool calls, sibling subagent sessions) are first-class and addressed by the `ActiveInvocationRegistry` and the per-invocation `loomAbort`; concurrent *user sessions* in the same host process are out of scope for V1 because Pi does not support them.

This sentence names two runtime-internal identifiers (`ActiveInvocationRegistry`, `loomAbort`) inside an orientation paragraph whose neighbours otherwise speak in capability-shaped, behavioural language ("the runtime requires…", "the operative rule lives in PIC…"). Per [Pi Integration Contract — Extension entry point](./spec_topics/pi-integration-contract.md), the registry is purely internal: an extension-instance-scoped `Set<{ loomAbort: AbortController; disposeBarrier: Promise<void> }>` that no author-visible API touches. Naming it in Prerequisites mixes implementation architecture into orientation and implies — without saying so — that the symbol is part of the loom-facing contract.

The forward link is also weak. The bullet links generically to `[Pi Integration Contract — Extension entry point](./spec_topics/pi-integration-contract.md)` with no anchor; PIC's `## Anchor` table has no `#active-invocation-registry` (or equivalent) target, so a reader following the link lands at the top of a long page and must scan step 4 of the `session_shutdown` handler to find the definition. The aggregator-vs-source convention recorded under [Governance — GOV-12](./spec_topics/governance.md) calls for orientation bullets to forward-link to the *anchored* normative owner, not to the page root.

Finally, PIC defines the registry as a data structure and lists its session-shutdown iteration but does not pin the registry's own behavioural contract: what it means to insert an entry, what removes one, what happens if a `loomAbort.abort()` call inside the iteration in step 4.2 throws, and what the iteration order is (currently unstated; `Set` iteration is insertion-order under the V8 invariant the rest of the spec already relies on, but PIC does not say so). These are the live unknowns implementers will hit; the original finding's "id collision" / "cancel-by-absent-id" framing was speculative — the registry has no id-keyed lookup and no externally callable cancel-by-id surface — but the iteration-throw and ordering questions are real.

## Spec Documents

- `spec.md` — Orientation > Prerequisites > Session model paragraph (edited)
- `spec_topics/pi-integration-contract.md` — Extension entry point step 4 + the `ActiveInvocationRegistry` definition paragraph that follows it (edited)
- `spec_topics/cancellation.md` — paragraph that already cross-references the registry from the `session_shutdown` cancellation path (read-only; verifies anchor target if one is added)
- `spec_topics/governance.md` — GOV-12 (read-only; the rule the orientation bullet is being held to)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None. No leaf in `plan.md` or `plan_topics/*.md` references `ActiveInvocationRegistry`, `disposeBarrier`, `session_shutdown`, or the reload-teardown sequence by name; `grep` over the plan corpus matches only the H2 `setCommandContext(undefined)` clearing comment, which is incidental. The spec edits proposed here change no leaf's Tests / Ships-when criteria. (The absence of a leaf that *implements* the registry and the `session_shutdown` handler at all is a separate gap, not in scope for this finding.)

## Consequence

**Severity:** advisory

A reader of `spec.md` cannot tell whether `ActiveInvocationRegistry` is part of the contract (and may be relied on by tests, fixers, or third-party tooling) or is a naming choice that could change in any V1.x patch. The unanchored forward link costs implementers and reviewers a manual scan of PIC. The unstated iteration-throw and iteration-order behaviour leaves two implementers free to write divergent teardown code.

## Solution Space

**Shape:** single

### Recommendation

Make three coordinated edits.

1. **`spec.md` — Session model paragraph.** Rewrite without naming the runtime data structures:

   > Concurrent loom invocations within a session (parallel tool calls, sibling subagent sessions) are permitted, tracked individually, and independently cancellable; the runtime owns a per-invocation `AbortSignal` and an extension-scoped registry of in-flight invocations whose normative shape, lifecycle, and teardown semantics live at [Pi Integration Contract — `ActiveInvocationRegistry`](./spec_topics/pi-integration-contract.md#active-invocation-registry). Concurrent *user sessions* in the same host process are out of scope for V1 because Pi does not support them.

   This keeps the orientation behavioural, drops the implementation identifiers from the host-preconditions section, and forward-links to a specific anchor.

2. **`spec_topics/pi-integration-contract.md` — Add an explicit anchor and a contract paragraph.** Insert `<a id="active-invocation-registry"></a>` immediately above the existing `The **`ActiveInvocationRegistry`** is an extension-instance-scoped Set<...>` paragraph (line 86), and extend that paragraph (or add one immediately after it) with the registry's behavioural contract:

   - **Insertion** happens at slash-command handler entry, `tool.execute(...)` adapter entry, and `invoke` spawn-site entry, before any awaitable work.
   - **Removal** happens in the same `finally` block that disposes the subagent `AgentSession`, after `disposeBarrier` settles.
   - **Iteration order** in the `session_shutdown` handler's step 4.2 and step 4.3 is insertion order (matching the V8 `Set` invariant the rest of the spec already relies on; this is observable to tests asserting on the order of `loom/runtime/reload-teardown-timeout`'s `<list>` rendering).
   - **`loomAbort.abort()` throwing inside the step 4.2 iteration** is swallowed by a per-entry `try`/`catch`; the handler continues to the next entry. No diagnostic is emitted (the abort is best-effort and the entry's own `finally` will still settle `disposeBarrier`, which step 4.3 already awaits with `Promise.allSettled`).
   - **The registry name is internal.** It is not part of the loom-facing or extension-facing contract; tests assert on observable side effects (registry-driven abort propagation, `loom/runtime/reload-teardown-timeout` emission) rather than on the symbol itself.

3. **`spec_topics/cancellation.md`** — update the existing reference at line 15 (`iterates the ActiveInvocationRegistry on /reload, /new, fork, or quit`) to use the new anchor: `[ActiveInvocationRegistry](./pi-integration-contract.md#active-invocation-registry)`.

   Edge cases the implementer must watch when applying these edits:
   - The sibling finding *"`ActiveInvocationRegistry` vs `activeInvocations` — two names for the same object in session_shutdown handler"* covers the in-PIC naming inconsistency at step 4.3; resolving that one alongside this one keeps the new anchor target's prose internally consistent.
   - The `loom/runtime/reload-teardown-timeout` row in `diagnostics.md` already names `<list>` as comma-and-space-joined still-in-flight invocations; pinning insertion-order iteration in PIC is what makes that diagnostic's rendering deterministic, so the two should land in the same change to avoid an ordering-test gap.
   - Do **not** add an "id collision" or "cancel-by-absent-id" failure mode — neither applies to a `Set<object>` with no external id-keyed surface. The original finding's framing on those points was speculative.

## Related Findings

- "Session swap + in-flight invocations: incomplete lifecycle and error contract" — co-resolve (the same Session-model paragraph is the edit site; that finding asks for the behavioural lifecycle, this one asks for the level-of-abstraction and anchor fix; one rewrite of the paragraph satisfies both)
- "\"First-class\" undefined; concurrent invocations bounded/accounting unspecified" — co-resolve (same sentence; replacing "first-class" with the behavioural triple "permitted, tracked individually, independently cancellable" is the same edit this finding's recommendation makes)
- "`ActiveInvocationRegistry` vs `activeInvocations` — two names for the same object in session_shutdown handler" — decision-dependency (this finding adds an anchor and a contract paragraph at the registry's PIC definition site; the naming-inconsistency fix needs to land against the same paragraph and should reuse the anchored name)

## spec.md — Cross-cutting / Whole-document

---

# `watcher-time reload failures` named in spec.md preamble without introducing the watcher

**Original heading:** "Watcher-time reload failures" introduced without context or forward-link
**Kind:** completeness, assumptions

## Finding

The hub page `spec.md` (paragraph 3 of the opening, line 7) enumerates the pre-evaluation failure modes that surface on `loom-system-note` rather than as evaluation outcomes:

> host-incompatibility detected by the capability probe, lex / parse / type batches, frontmatter rejection, binder-model resolution failure, `tools:` resolution failure, **watcher-time reload failures**

Every other item in the list is either self-explanatory or has been introduced earlier in the same page (the capability probe is named in *Prerequisites*, frontmatter is name-linked to `frontmatter.md`, the binder model is one of the seven SDK capabilities, `tools:` is the loom frontmatter field). "Watcher-time reload failures" is the lone outlier: nothing in `spec.md` introduces a file-watcher subsystem or hot-reload feature, and the bullet has no forward-link. The reader cannot tell from the hub whether the term names a real V1 subsystem, a placeholder for a future feature, or a typo.

The watcher is real — it is specified in `spec_topics/pi-integration-contract.md` *Extension entry point* (step 5, the chokidar-driven `.loom`/`.warp` rebuild) and `spec_topics/discovery.md` *Caching and reload* (the settings-file watcher). The fix is editorial: anchor the term on first use in the hub.

## Spec Documents

- `spec.md` — opening preamble, paragraph 3 (edited)
- `spec_topics/pi-integration-contract.md` — *Extension entry point*, step 5 (read-only; link target)
- `spec_topics/discovery.md` — *Caching and reload* (read-only; secondary link target for the settings-watcher case)
- `spec_topics/errors-and-results.md` — same enumeration, also names "watcher-time reload failures" (read-only; cross-reference)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None — the finding is editorial prose on the hub aggregator. No leaf's `Adds.` / `Tests.` / `Ships when.` changes; no leaf is blocked or unblocked.

## Consequence

**Severity:** advisory

A first-time reader of the hub page hits an undefined term in an otherwise self-contained orientation enumeration and cannot resolve it without grepping the topic corpus. No implementer behaviour diverges — the watcher contract itself is fully specified on its owning pages — but the hub fails its job of orienting the reader to every term it uses.

## Solution Space

**Shape:** single

### Recommendation

In `spec.md` paragraph 3, replace the bare phrase `watcher-time reload failures` with a name-link that pins the subsystem on first use, matching the pattern the other items in the same enumeration follow:

> …`tools:` resolution failure, watcher-time reload failures (failures emitted while the file watcher rebuilds a changed `.loom`/`.warp` file or settings source — see [Pi Integration Contract — Extension entry point](./spec_topics/pi-integration-contract.md) step 5 and [Discovery — Caching and reload](./spec_topics/discovery.md))…

Edge cases the editor should keep in mind:

- The watcher has two distinct surfaces — the discovery-roots watcher in `pi-integration-contract.md` step 5 and the settings-file watcher in `discovery.md`. Both can produce pre-evaluation failures (`loom/runtime/registry-swap-failed`, `loom/load/settings-*`). The forward-link should cover both, not just one.
- The aggregator must not introduce normative obligations of its own here — keep the parenthetical strictly orienting, with the failure-routing contract owned by `errors-and-results.md` (which already carries the same enumeration verbatim).
- The same paragraph is also flagged for moving normative content out and closing the enumeration (see related finding); the fix here should be done as part of, or compatibly with, that rewrite so the parenthetical does not get re-introduced and then deleted.

## Related Findings

- "Pre-evaluation failure enumeration: normative content in preamble, list not closed" — co-resolve (same paragraph; the enumeration-closure rewrite is the natural place to also anchor the watcher term)
- "Opening block has no stable anchor; obligations are bundled without IDs" — same-cluster (same opening prose block; resolves independently via REQ-ID anchoring rather than term-introduction)
- "Frontmatter format undefined: YAML assumed but never stated" — same-cluster (same pattern: term used in hub without first-use definition; resolves independently per-term)

---

# Frontmatter format never named at the aggregator level

**Original heading:** Frontmatter format undefined: YAML assumed but never stated
**Kind:** assumptions

## Finding

`spec.md` introduces the term "frontmatter" three times in its opening paragraphs — "what the spawned session inherits from the loom's frontmatter," "selected per-loom by the required `mode:` frontmatter field," and the [Parameters and Frontmatter](./spec_topics/frontmatter.md) entry in the topic-page index — without ever stating what surface syntax frontmatter uses. The colon in the `mode:` example hints at YAML, but a reader unfamiliar with the convention cannot tell whether it is YAML, TOML, JSON, a custom Pi format, or the Jekyll-style `---`-delimited block.

The format is defined unambiguously one click away in `spec_topics/frontmatter.md` ("Like Pi prompts and subagents, loom files declare metadata in YAML frontmatter"), so the gap is purely at the orientation hub. A reader who follows the forward-link is fine; a reader skimming the aggregator to build a mental model of the file shape gets nothing concrete and must either guess from the `:` token or chase the link to confirm.

## Spec Documents

- `spec.md` — Opening paragraphs (paragraph 1) and topic-page index (edited)
- `spec_topics/frontmatter.md` — opening sentence (read-only — already states the format)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

- None

The fix is a single-clause addition to the aggregator's prose. `V3a — Frontmatter parsing` already cites `spec_topics/frontmatter.md` (which carries the YAML statement) as its spec source, so its acceptance criteria (`YAML parse errors point at correct column`, etc.) are unaffected.

## Consequence

**Severity:** cosmetic

A first-time reader of `spec.md` cannot determine the surface syntax of frontmatter from the hub alone and must follow the forward-link to confirm the convention. No implementer behaviour diverges — the topic page is authoritative and unambiguous.

## Solution Space

**Shape:** single

### Recommendation

In `spec.md` paragraph 1, on the first occurrence of the bare term "frontmatter," qualify it as "YAML frontmatter" — matching the wording in `spec_topics/frontmatter.md`. Concretely, change "what the spawned session inherits from the loom's frontmatter" to "what the spawned session inherits from the loom's YAML frontmatter," and let the existing forward-link to [Parameters and Frontmatter](./spec_topics/frontmatter.md) carry the delimiter convention, field grammar, and parse-error codes. No further restatement is required; the topic page owns everything else.

## Related Findings

- "`mode:` field: absent/invalid behavior not specified at aggregator level" — same-cluster (same forward-link to Parameters and Frontmatter; both findings are about the aggregator under-stating frontmatter coverage, but resolve independently)
- "Opening block has no stable anchor; obligations are bundled without IDs" — same-cluster (the frontmatter-format mention sits inside the same unanchored opening paragraph; structural fix is independent of this content fix)

---

# `mode:` aggregator forward-link is page-level, not anchored to the Field contract row

**Original heading:** `mode:` field: absent/invalid behavior not specified at aggregator level
**Kind:** completeness

## Finding

`spec.md` introduces the `mode:` frontmatter field with `Mode is selected per-loom by the required `mode:` frontmatter field — see [Parameters and Frontmatter](./spec_topics/frontmatter.md).` (line 5). The forward-link is page-level: a reader who follows it lands at the top of `frontmatter.md` and must scan to find the row that pins down what "required" actually means in observable terms.

The operative contract does exist downstream: `spec_topics/frontmatter.md` `### Field contract` (anchor `#field-contract`) is a normative table whose `mode` row names `loom/load/missing-mode` for the absent case, calls out `loom/load/unknown-mode-value` for present-but-bad enum values, and is explicit that the two codes do not collapse. `spec_topics/diagnostics.md` lines 293/296 register both codes; `plan_topics/v3-frontmatter.md` V3a asserts both.

The defect is at the aggregator: the link is the wrong shape for the convention spec.md itself uses. The same opening band uses anchored forward-links to specific subsections — e.g. obligation 3 anchors `#sdk-capability-inventory`, `#strict-capability-requirement`, and `#entry-capability-probe`. The `mode:` reference is the only first-mention forward-link in the opening paragraph that points at a page root rather than at the subsection that owns the rule it's invoking.

## Spec Documents

- `spec.md` — opening paragraph, line 5 (edited)
- `spec_topics/frontmatter.md` — `### Field contract` (read-only, link target)
- `spec_topics/diagnostics.md` — `loom/load/missing-mode`, `loom/load/unknown-mode-value` rows (read-only, confirms operative contract exists)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None — the fix is a docs-edit in spec.md that does not alter any leaf's acceptance criteria. V3a already tests `loom/load/missing-mode` and `loom/load/unknown-mode-value` against the unchanged `frontmatter.md` contract.

## Consequence

**Severity:** cosmetic

A reader following the page-level link reaches the answer with one extra scroll; the operative contract is unchanged and the implementation tests are unaffected. The cost is convention drift inside the opening paragraph — every other forward-link in that band is anchored, and this one is not.

## Solution Space

**Shape:** single

### Recommendation

In `spec.md` line 5, change `see [Parameters and Frontmatter](./spec_topics/frontmatter.md)` to `see [Parameters and Frontmatter — Field contract](./spec_topics/frontmatter.md#field-contract)`. The destination anchor already exists (the `### Field contract` heading at `spec_topics/frontmatter.md:30`); no edits to `frontmatter.md` are required.

Edge cases for the implementer: the same opening paragraph forward-links `frontmatter.md` only once. If the co-resolved fix for "Frontmatter format undefined: YAML assumed but never stated" relocates the `mode:` mention or moves the link, keep the anchored-to-subsection shape rather than reverting to a page-level link.

## Related Findings

- "Frontmatter format undefined: YAML assumed but never stated" — co-resolve (same first-mention site in spec.md line 5; both fixes touch the `mode:` / Frontmatter forward-link)
- "Hard-ceiling items and non-goal exclusions have no stable identifiers" — same-cluster (both flag aggregator-level anchoring/identification gaps; resolved independently)

---

# Binder LLM model: post-load resolution drift unaddressed

**Original heading:** Binder LLM model: post-load resolution drift unaddressed
**Kind:** error-model

## Finding

Binder model resolution is a strictly load-time event: `ctx.modelRegistry.find(provider, modelId)` runs once during the load pass and the returned `Model<Api>` handle is captured for the lifetime of the registered loom. `binder.md` covers the load-time outcomes (`loom/load/binder-model-unresolved`, `loom/load/binder-model-not-strict-capable`, `loom/load/binder-model-strict-capability-unknown`) and pins the settings-drift behaviour ("already-loaded looms keep their resolved model … already-failed loads are not retroactively re-attempted"). It does not pin what happens when the captured handle stops working between load and a binder call — for example, the model is removed from `ctx.modelRegistry` after load, the credentials Pi uses for that provider are revoked, the provider is disabled in Pi settings, or the upstream provider returns 404/401 for the previously-resolved `(provider, modelId)` pair.

The runtime will still possess and dispatch through the captured `Model<Api>` handle. The provider call will fail in some manner — likely surfacing as the binder's *Binder model transport failure* row, but possibly as a malformed-envelope failure or as a host exception thrown out of `Model<Api>` itself, depending on how the SDK reports a now-invalid handle. The failure-modes table is silent on this case, so two reasonable implementations could route the same drift event to three different surfaces (transport-failure system note after one retry, a fresh `loom/binder/...` code, or `loom/runtime/internal-error` if the SDK throws). Operators reading the system note for a `…argument binder unavailable (<provider>: <message>)` line would have no way to distinguish "transient network blip" from "model permanently removed; reload to pick up the new resolved value".

The narrow miss is symmetrical with the existing settings-drift rule already in `binder.md`: that rule pins what happens when `looms.binderModel` changes after load (next-load-only re-resolution; consolidated `/reload` system note when previously-failed loads would now succeed). The same kind of disposition is owed for registry-side drift.

## Spec Documents

- `spec_topics/binder.md` — *Binder model* / *Failure modes* / *Failure-mode templates* (edited)
- `spec_topics/diagnostics.md` — diagnostic registry (option-dependent — edited only if a new code is introduced under Option B)
- `spec_topics/pi-integration-contract.md` — *SDK capability inventory* item 7 (Binder LLM model) (read-only; informative cross-reference may be added)
- `spec.md` — pre-evaluation failure enumeration / orientation paragraphs (read-only; the disposition is invocation-time, not load-time, so the pre-evaluation list does not need a new entry)

## Plan Impact

**Phases:** Vertical V16

**Leaves (implementation order):**

- V16e — `bind_model` resolution chain — (modified)
- V16n — Binder transport failure single retry — (modified)

## Consequence

**Severity:** advisory

A real but uncommon class of failure (provider deauthorization, model removal between load and first invocation, settings-driven registry change that invalidates a captured handle) routes through an unspecified surface. Two implementers will plausibly diverge on which row of the failure-modes table catches it, and operators get no actionable signal distinguishing "binder transiently flaky" from "binder model is gone — `/reload` to pick up the new resolution". A working implementation can be produced under either Option below; the gap is observability and conformance-test coverage, not correctness.

## Solution Space

**Shape:** multiple

### Option A — Subsume under existing transport-failure path

**Approach.** Pin the disposition in `binder.md` *Failure modes*: the runtime uses the load-time-captured `Model<Api>` handle for every binder call; any invocation-time failure attributable to the model handle being stale (registry removal, credential revocation, upstream 404/401, `Model<Api>` method throwing) is observed as the same provider-side failure that the binder's existing transport-failure budget already covers. After the single transport retry, the user sees the standard `loom /<name>: argument binder unavailable (<provider>: <message>)` system note, and the operator is expected to disambiguate from the `<message>` payload. Add a sentence to *Binder model*: "Binder model resolution is checked once at load time; the resolved `Model<Api>` handle is captured for the lifetime of the registered loom and is not re-resolved at invocation. Drift in `ctx.modelRegistry` after load (model removed, credentials revoked, provider disabled) surfaces at the next binder call through the *Binder model transport failure* row of the failure-modes table; no distinct code is emitted."

**Spec edits.** `binder.md` *Binder model* (one paragraph below the existing hot-reload paragraph) and *Failure modes* (one sentence in the prose introducing the transport-failure row, calling out drift as a sub-case).

**Pros.**
- No new diagnostic code; no `diagnostics.md` change.
- No new V1 plan leaf; V16n's transport-retry assertion already exercises the surface, and V16e gains one extra negative-drift test.
- Matches the likely default behaviour any straightforward implementation will produce.

**Cons.**
- Operators cannot distinguish a transient network failure from a permanent model-removal without parsing the `<message>` substring, which the spec marks model-supplied and non-deterministic.
- A binder model that fails on every retry because the model is gone consumes the transport-retry budget on every invocation — never settling, never prompting `/reload`.

**Risks.** Future operators reading runbooks built around "binder transport failure" will conflate provider-removal incidents with provider-down incidents.

### Option B — Distinct invocation-time drift code with consolidated `/reload` prompt

**Approach.** Introduce `loom/binder/model-unresolved-at-invoke` (E, runtime). On every binder call, the runtime asks `ctx.modelRegistry.find(provider, modelId)` once and compares the returned reference against the captured handle (cheap pointer-equality check; this is **not** a full re-resolution that could mask the original strict-capability decision). If `find(...)` now returns `null`, the runtime emits the new code, surfaces the matching system note (`loom /<name>: argument binder unavailable — model <provider>:<modelId> is no longer resolvable; run /reload`), skips the binder call entirely (no transport retry), and records the loom in V16e's previously-failed list so the next `looms.binderModel` change emits the consolidated `/reload` note already specified there. If `find(...)` returns a non-null handle that differs from the captured one, the runtime continues to use the captured handle (preserving load-time strict-capability decisions) but emits a one-shot informational `loom-system-note` per loom recommending `/reload`. Provider-side failures from a still-resolved handle (auth, 404, transport) continue to flow through the existing transport-failure path unchanged.

**Spec edits.** `binder.md` *Binder model* (drift sub-section), *Failure modes* (new row in the table for the new code, with the corresponding system-note template), and *Cancellation* (the new pre-call probe is a checkpoint; cancellation rules apply); `diagnostics.md` (new row for `loom/binder/model-unresolved-at-invoke`); `pi-integration-contract.md` capability 7 (one-line note that the runtime may re-query `ctx.modelRegistry.find` at invocation time as a cheap drift check).

**Pros.**
- Operators get an unambiguous, actionable signal (the system note names the missing model and tells them to `/reload`).
- Stale-handle invocations short-circuit instead of burning the transport-retry budget.
- Slots cleanly into V16e's existing previously-failed-list machinery.

**Cons.**
- New diagnostic code, new row in the failure-modes table, V16e and V16n both grow new tests.
- The pre-call probe adds a fixed cost to every binder call (one `find(...)` lookup) and a new failure surface to test.
- Requires a normative claim that `ctx.modelRegistry.find` is cheap and side-effect-free enough to call on every binder dispatch.

**Risks.** Conflation between the captured-handle failure modes (auth revocation against a still-registered model) and the new code (model unregistered): the spec must clearly carve out which side of the line each failure falls on, otherwise tests for the two surfaces collide.

### Recommendation

Take **Option A** for V1. The post-load drift cases this finding identifies are all observable as provider-side failures from the captured handle, which the existing transport-failure path already catches; the gap is documentary, not behavioural. A new diagnostic code and a per-call drift probe are not load-bearing for V1 correctness, and Option B's machinery duplicates V16e's settings-drift `/reload` prompt without sharing its trigger. Implementers must take care to: (a) confirm that `Model<Api>`-method exceptions thrown synchronously out of the captured handle are wrapped by the binder's transport-failure path rather than escaping as `loom/runtime/internal-error` (this requires a normative one-liner in the new disposition paragraph), and (b) preserve the *Binder model transport failure* row's after-one-retry semantics — drift never gets a second retry budget. Revisit Option B in a V1.x revision once operator feedback indicates the transport-failure row is being conflated with permanent removal in practice.

## Related Findings

- "Pre-evaluation failure enumeration: normative content in preamble, list not closed" — same-cluster (drift is invocation-time, not pre-evaluation, so the pre-evaluation list need not grow; the closure-language suggestion in that finding is independent)
- "Peer-dep runtime version mismatch not detected by capability probe" — same-cluster (both findings concern post-load drift in capability/dependency state; resolved independently with different surfaces)
- "Pre-evaluation failure enumeration: normative content in preamble, list not closed" — co-resolve (only if Option B is chosen — adding `loom/binder/model-unresolved-at-invoke` would be a runtime, not a load-time, code, so the pre-evaluation list still does not grow; relationship remains same-cluster under Option A)

---

# Capability probe verifies only one of four lock-step peer-dep versions

**Original heading:** Peer-dep runtime version mismatch not detected by capability probe
**Kind:** error-model

## Finding

The Step 0 capability probe in `pi-integration-contract.md` (sub-step (d)) reads the installed version of `@mariozechner/pi-coding-agent` from its `package.json` and compares it against the pinned `^0.72.1` range, surfacing mismatches as `loom/load/host-incompatible` with `details.kind ∈ { "peer-dep-out-of-range", "peer-dep-malformed-version" }`. That check covers exactly one of the four `@mariozechner/*` packages the spec declares as lock-step `peerDependencies` (`pi-coding-agent`, `pi-agent-core`, `pi-ai`, `pi-tui`) and does not touch the fifth Pi-bundled package, `typebox`, at all. The lock-step rule on the other three packages is left to the package manager's transitive resolution. Under `pnpm` strict mode, `--legacy-peer-deps`, monorepo overrides, or any tool that honours the explicit `^0.72.1` peer-dep entries independently, all four packages are pulled together; under flat resolvers with overrides or local file links the host can end up with a `pi-coding-agent ^0.72.1` install but a `pi-ai` from a different minor line.

When that skew occurs, sub-step (c)'s `typeof <path> === "function"` probes do not distinguish between minor versions that both still expose the named function members, so the loom factory completes Step 0 and proceeds to register. Failures then surface unpredictably: as a `TypeError` deep inside a tool registration or a subagent spawn (routed through `loom/runtime/internal-error` if it is even caught), as a behavioural divergence with no diagnostic at all, or — if the skew happens to break a probed surface — as `kind: "sdk-capability-missing"`, naming the missing function rather than the underlying version skew. The operator-facing message in the latter case names a removed function on a single namespace; it does not say "your `pi-ai` install is on a different minor line than your `pi-coding-agent` install," which is the actionable diagnosis.

The H1 `peerDependencies` literal-read test asserts that all four entries equal the `^0.72.1` literal in the loom package's *declared* `package.json`, but this is a declaration check, not an installed-version check; it does nothing to detect a host whose installed graph diverges from those declarations.

## Spec Documents

- `spec_topics/pi-integration-contract.md` — Step 0 (Capability probe), sub-step (d), and the failure-classification table in **On failure: refusal and diagnostic** (edited)
- `spec_topics/pi-integration-contract.md` — Host prerequisites — Pi SDK pin (the `typebox` sub-paragraph) (option-dependent)
- `spec_topics/diagnostics.md` — `loom/load/host-incompatible` row, `details.kind` enumeration (edited)
- `spec.md` — Orientation > Prerequisites > Pi SDK and capabilities (read-only; orientation aggregator)

## Plan Impact

**Phases:** Horizontal H1

**Leaves (implementation order):**

- H1 — Repository scaffold and test framework — (modified) — the `SDK_SURFACE_INVENTORY` constant under `src/extension/` (the single source of truth the probe and the `pinned-surface.test.ts` literal-read test both consume) gains the additional peer-dep packages (and possibly `typebox`); the four-pinned-constants enumeration named in the leaf body widens to include them; the test that today asserts the `peer-dep-range` entry must also assert per-package coverage.

## Consequence

**Severity:** correctness

A host whose installed `pi-agent-core`, `pi-ai`, or `pi-tui` has drifted off the lock-step minor line passes Step 0, then either silently misbehaves at evaluation time or surfaces a misleading `kind: "sdk-capability-missing"` diagnostic that points at the removed function rather than the underlying version skew. Operators have no `loom-system-note` they can use to diagnose lock-step breakage, and the `^0.72.1` invariant the spec advertises as a load-time gate is in fact only enforced for one of the four packages.

## Solution Space

**Shape:** single

### Recommendation

Extend Step 0 (d) to read and compare the installed `version` of each of the four lock-step peers (`@mariozechner/pi-coding-agent`, `@mariozechner/pi-agent-core`, `@mariozechner/pi-ai`, `@mariozechner/pi-tui`) against the same pinned `^0.72.1` literal sourced from the pinned-constants block. The check iterates over a fixed array of package names; each resolution uses `createRequire(import.meta.url).resolve("<pkg>/package.json")` and `semver.satisfies(installedVersion, "^0.72.1")` exactly as today's single-package check does. The diagnostic envelope gains a `details.package: "<scoped-name>"` field on `kind: "peer-dep-out-of-range"` and `kind: "peer-dep-malformed-version"` so the operator-visible message names the offending package; the `kind` discriminator enumeration in **On failure: refusal and diagnostic** does not need to grow.

`typebox` is not on the lock-step line (it is declared `"*"` per the bundled-package convention) and therefore is not added to the iteration; the spec should explicitly say so in (d) so a future reader does not assume `typebox` was overlooked. The check terminates on the first out-of-range or malformed package in the fixed iteration order — same short-circuit slot as today's single-package (d), no aggregation across packages.

Edge cases the implementer must observe:
- A `MODULE_NOT_FOUND` on any of the four packages routes to `kind: "peer-dep-malformed-version"` with `details.observed = "<unresolvable>"` and `details.package` naming which one, mirroring the existing single-package shape.
- The fixed iteration order is the spec's source-of-truth list order, not alphabetical, so Self-failure trapping in step (d) can name a deterministic `details.step.package`.
- The H1 `pinned-surface.test.ts` peer-dep-range entry must assert that all four packages appear in the probe's iteration array, not just that the `^0.72.1` literal is present once; otherwise a future leaf can silently drop a package from the probe loop without failing a test.
- The H1 `peerDependencies` literal-read test (declaration check) and the runtime probe (installed check) remain disjoint by design — both must pass for the lock-step invariant to hold.

## Related Findings

- "Peer-dep `^0.72.1` pin conflicts with Pi `packages.md` `"*"` convention; deviation not documented" — same-cluster (both touch the lock-step peer-dep block and its enforcement story)
- "`semver` library referenced as dependency but absent from `package.json`" — co-resolve (the extended (d) check uses `semver.satisfies` against four packages instead of one; the missing `semver` `dependencies` entry must be added either way)
- "Over-prescribes `peerDependencies` mechanism and `semver`-based comparator" — decision-dependency (a decision to drop the `semver` library prescription would change how the extended check expresses the per-package comparison)
- "`typebox.Type.Unsafe` not included in capability probe; absence failure mode unspecified" — same-cluster (both extend Step 0's coverage of the Pi-bundled-package surface; `typebox` is the fifth bundled package and its probing posture should be settled in the same edit)
- "Node `>=20.6.0` floor: version reference not pinned" — same-cluster (both depend on the same source-of-truth pinned-constants block in the extension module)

---

# Pi `ctx.signal` lifetime/freshness contract not pinned to SDK doc

**Original heading:** `ctx.signal` lifetime/freshness not asserted
**Kind:** assumptions

## Finding

The runtime's slash-command cancellation wiring depends on three Pi-side semantics for `ExtensionCommandContext.signal` that the spec consumes without quoting or citing:

1. **Live-read freshness across turns.** `cancellation.md` ("Forwarding into `loomAbort`") prescribes that the runtime re-read `ctx.signal` from inside each registered Pi event handler (`tool_call`, `tool_result`, `message_update`, `turn_end`, `agent_end`) rather than caching the reference at slash-handler entry. This is correct only because Pi rebinds `ctx.signal` to the *current* turn's `AbortSignal` on every event delivery — a property `extensions.md` documents as "the current agent abort signal" but that the loom spec never quotes or cites at the page where the re-read rule is stated.
2. **`ExtensionCommandContext` retention.** `pi-integration-contract.md` ("`ExtensionContext` (member surface loom touches)" and the override table) asserts that Pi keeps the `ExtensionCommandContext` instance handed to the slash-command handler alive — and keeps delivering events on it — for the loom's entire lifetime, which can outlast the handler's own first `await`. The Pi-side declaration of `ExtensionCommandContext` is cited only via its parent type's location (`dist/core/extensions/types.d.ts`); the lifetime guarantee is asserted prose without a doc anchor.
3. **No already-aborted-at-entry hand-off.** The runtime's wiring does not install a `loomAbort.abort()` forwarder *at* slash-handler entry; it only forwards `ctx.signal.aborted` observations made later from inside event handlers. This is correct only if Pi never delivers a slash-command handler an `ExtensionCommandContext` whose `signal` is already aborted from a prior turn (a previously-aborted handle would never re-fire `addEventListener("abort", ...)`, so the missing entry-time forwarding would silently drop the abort). The spec relies on this without pinning it.

The `undefined`-when-idle arm of `ctx.signal` is the only Pi-doc citation the spec attaches to this surface (cancellation.md and pi-integration-contract.md both quote it). The three properties above sit in the same paragraph block but are uncited.

## Spec Documents

- `spec_topics/pi-integration-contract.md` — *Cancellation source* paragraph and *`ExtensionContext` (member surface loom touches)* (edited)
- `spec_topics/cancellation.md` — *Forwarding into `loomAbort` — Slash-command entry* (edited)
- `C:/Users/thomasa/AppData/Roaming/npm/node_modules/@mariozechner/pi-coding-agent/docs/extensions.md` — `### ctx.signal` section (read-only; cited target)
- `C:/Users/thomasa/AppData/Roaming/npm/node_modules/@mariozechner/pi-coding-agent/dist/core/extensions/types.d.ts` — `ExtensionContext` and `ExtensionCommandContext` declarations (read-only; cited target)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None. The fix is a citation/clarification that pins existing, already-implemented semantics; Mb's `ctx.signal === undefined` idle-entry tolerance test, its forwarder-via-event-handler assertion, and its listener-cleanup assertion already exercise the runtime side of these properties. No leaf's `Adds` or `Tests` list needs to change.

## Consequence

**Severity:** advisory

A new implementer reading the spec sees the runtime's reliance on Pi's `ctx.signal` re-read / retention / non-pre-aborted semantics asserted in prose with no SDK-doc anchor to verify. They cannot tell which of those assertions are Pi guarantees they may rely on versus loom-side defensive coding they may simplify. A future Pi revision that weakens any of the three properties would slip past the spec's normative surface (the capability probe in *Step 0* checks AbortSignal *shape*, not lifecycle), and the spec gives no review hook for noticing the drift.

## Solution Space

**Shape:** single

### Recommendation

In `pi-integration-contract.md`'s *Cancellation source* paragraph, add a per-property citation block immediately after the existing `ctx.signal === undefined` citation:

- For the live-read property, cite `@mariozechner/pi-coding-agent`'s `docs/extensions.md` `### ctx.signal` section (the "current agent abort signal" sentence and the "typically defined during active turn events" sentence) and state the spec consequence: "the runtime MUST read `ctx.signal` from the captured `ExtensionCommandContext` *inside each event handler body* and MUST NOT cache the reference observed at slash-handler entry."
- For the `ExtensionCommandContext` retention property, cite `dist/core/extensions/types.d.ts`'s `ExtensionCommandContext extends ExtensionContext` declaration alongside the existing `ExtensionContext` citation already present in the *member surface* paragraph, and re-state that Pi continues to deliver events on the captured instance for the slash-handler's full async lifetime (i.e. across all the handler's `await` boundaries until the handler's outer Promise settles).
- For the not-already-aborted-at-entry property, state explicitly: "the runtime relies on Pi never handing a slash-command handler a `ctx.signal` that is already in the aborted state from a prior turn; an entry-time `ctx.signal?.aborted === true` observation is therefore not a path the runtime forwards (the slash handler is documented to fire from idle per the cited `extensions.md` paragraph, where `ctx.signal` is `undefined` rather than aborted)."

In `cancellation.md`'s *Slash-command entry* bullet, replace the bare "Pi documents `ctx.signal` as `undefined` in idle, non-turn contexts" reference with a forward-link to the new pinned-citations block in `pi-integration-contract.md` so the two pages do not drift.

Edge cases the implementer must watch:

- The H1 SDK surface-inventory constant covers AbortSignal *member shape* only; the new citations are about Pi behavioural semantics that no factory-time probe can verify. Do not extend the inventory or the capability probe to "check" them — the citations are themselves the enforcement mechanism, mirrored to the existing Pi-version-bump procedure.
- Mb's existing forwarder test fires the abort *during* `send`, which exercises only the live-read path. If the implementer revisits this leaf, retain the live-read fixture rather than refactoring it into a one-shot listener installed at handler entry — the spec citations make the live-read mandatory.

## Related Findings

- "WHATWG AbortSignal/AbortController: supply source not stated" — same-cluster (sibling Pi-SDK assumption gap on the AbortSignal surface; resolved independently by a separate citation).
- "Pi extension factory-refusal contract not cited" — same-cluster (sibling Pi-SDK behavioural-semantics citation gap; same fix shape, different surface).
- "Subagent state-isolation matrix presupposes Pi context-passing model" — same-cluster (sibling Pi-API assumption gap on `createAgentSession` inheritance behaviour).
- "`createAgentSession` has no `signal` option in SDK; subagent cancellation silently broken" — decision-dependency (independent finding, but if its remediation rewires subagent cancellation to a `loomAbort.signal` listener that calls `session.abort()`, the *Cancellation source* paragraph being edited here is the same paragraph and the two edits should land coherently).

---

# Hub does not point readers to the failure-path conformance machinery

**Original heading:** No acceptance criteria covering failure paths
**Kind:** error-model

## Finding

`spec.md` enumerates positive obligations (capability probe must run; ceiling-X surfaces as code Y; `loom-system-note` carries pre-evaluation diagnostics; `timeout:` is rejected at parse time) but never tells the reader where conformance for the matching *negative* paths is tracked. There is no forward-link from the hub to the plan's coverage matrix, no reference to the V18s closing CI gate, and no statement that an unasserted diagnostic code or an unmapped REQ-ID is a defect rather than a tolerated gap.

The closure machinery itself exists. `plan_topics/coverage-matrix.md` keys spec rules to closing leaves; `plan_topics/v18-cancellation.md` ("V18s — Coverage-matrix closing CI gate") enforces nine gates including (a) every REQ-ID emitted by any spec page has at least one mapping in the matrix, and (b) every diagnostic code in the registry table of `spec_topics/diagnostics.md` is asserted as a literal string by at least one test. Together those two gates are exactly the failure-path conformance pointer this finding asks for. The defect is purely that `spec.md` — the document a top-level reader opens first — does not name them, so a reviewer skimming the hub cannot tell whether failure paths are gated or best-effort.

The gap is structural rather than substantive: failure paths *are* testable obligations once the plan corpus is read, but the hub gives the reader no breadcrumb to that fact. It also leaves the reader unsure whether a missing failure-path test is a known scope concession or a defect — V18s answers "defect," but only the plan corpus says so.

## Spec Documents

- `spec.md` — Cross-cutting / Whole-document (edited)
- `plan_topics/coverage-matrix.md` — preamble (read-only; link target)
- `plan_topics/v18-cancellation.md` — V18s gate (read-only; link target)
- `spec_topics/governance.md` — GOV-2, GOV-6 (read-only; cite the same gate)
- `spec_topics/diagnostics.md` — code registry (read-only; the surface V18s gate (b) closes)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None — the V18s gate already enforces both halves of the conformance closure (REQ-ID coverage in `plan_topics/coverage-matrix.md`, per-registry-code test assertion in `plan_topics/v18-cancellation.md`). The fix is a forward-link added to `spec.md` itself; no leaf's `Adds`, `Tests`, or `Ships when` changes.

## Consequence

**Severity:** advisory

A reviewer or fixer reading `spec.md` in isolation can reasonably conclude failure paths are best-effort. The implementer-facing risk is low (the V18s gate fires regardless of what the hub says), but the reviewer-facing risk is real: cross-spec consistency reviews and external auditors who treat the hub as canonical may either re-raise the conformance question repeatedly or, worse, assume no gate exists and accept failure-path test gaps.

## Solution Space

**Shape:** single

### Recommendation

Add one short paragraph to `spec.md` immediately after the Scope subsection (or as the closing paragraph of Orientation), with the exact name of the gate it points at:

> **Conformance.** Conformance for both success and failure paths is tracked in [`plan_topics/coverage-matrix.md`](./plan_topics/coverage-matrix.md), keyed per REQ-ID. The closing CI gate ([V18s — Coverage-matrix closing CI gate](./plan_topics/v18-cancellation.md#v18s-coverage-matrix-closing-ci-gate)) treats (a) any REQ-ID emitted by a spec page that has no mapping in the matrix and (b) any diagnostic code in the [registry](./spec_topics/diagnostics.md) that is not asserted as a literal string by at least one test as a CI failure. Absence of a failure-path test for a registered diagnostic code is therefore a defect, not a tolerated gap.

Edge cases the implementer must watch:

- The V18s gate is REQ-ID-keyed and goes live only after H6 lands the initial REQ-ID anchor pass; until then `coverage-matrix.md` is section-keyed scaffolding. The conformance pointer in `spec.md` is forward-looking and accurate today (the gate exists in spec) but its REQ-ID closure is vacuous pre-H6 — that is consistent with how `coverage-matrix.md` already frames itself, so no qualifier is needed.
- The pointer paragraph is itself an aggregator under GOV-12. If the V18s gate's identifier or anchor changes, this paragraph and the V18s leaf must move in the same commit.
- The pointer should not invent a new REQ-ID or assert a new normative obligation; it forward-links existing obligations owned by the plan corpus and by `governance.md` GOV-2 / GOV-6. The hub stays orientation-only.

## Related Findings

- "No REQ-IDs assigned anywhere in spec.md; normative obligations in hub are unciteable" — same-cluster (both expose that `spec.md` lacks the traceability hooks needed to be cited from the conformance machinery; resolving REQ-ID assignment makes the V18s pointer non-vacuous, but the two edits are independent)
- "Opening block has no stable anchor; obligations are bundled without IDs" — same-cluster (same hub-traceability surface; independent fix)
- "Hard-ceiling items and non-goal exclusions have no stable identifiers" — same-cluster (the ceiling REQ-IDs would be the natural conformance-matrix keys for the failure paths this finding cites as examples)
- "Four Scope dispositions lack stable anchors" — same-cluster
- "GOV-12 aggregator labels are editor instructions embedded in normative text" — same-cluster (touches the same Scope/Orientation aggregator surface; independent fix)
- "\"SHOULD\" modal on stability guarantee is ambiguous; no CI gate" — same-cluster (also flags an absent CI gate, but for V1.x equivalence; GOV-14 explicitly records that one as a scope choice rather than a defect, so the two findings resolve under different rules)

---

# Subagent state-isolation matrix asserts non-inheritance without naming the Pi mechanism for two of its six rows

**Original heading:** Subagent state-isolation matrix presupposes Pi context-passing model
**Kind:** assumptions

## Finding

The "Subagent state-isolation matrix" in `pi-integration-contract.md` is a six-row table claiming that, for a `mode: subagent` invocation, six pieces of caller state are mechanically *not* inherited by the spawned `AgentSession`. The matrix is the canonical anchor for the V1 isolation contract and is forward-referenced from `spec.md`'s preamble, `overview.md`'s Scope of a Loom File, and the V12 plan leaves. Each "Not inherited" cell is only as strong as the Pi SDK mechanism it relies on; if no mechanism exists, the cell describes an aspiration, not an obligation an implementer can mechanically discharge.

Cross-checking the matrix against `CreateAgentSessionOptions` in `@mariozechner/pi-coding-agent` (the V1-pinned SDK at `^0.72.1`) and against the `AgentSession` constructor surface, four of the six "Not inherited" rows are mechanically grounded by the surrounding **Conversation drive — subagent mode** prose and the spawn-call snippet: caller transcript via `SessionManager.inMemory(cwd)`; ambient Pi tool set via the explicit `tools: customTools.map(t => t.name)` allowlist combined with `customTools`; caller's `params` and bindings inherently (a different file is loaded); and caller's `withActiveTools` snapshot via the choice of `customTools` over `pi.setActiveTools`. Two rows are not grounded:

1. **Caller's system prompt.** Pi has no `systemPrompt` / `system` field on `CreateAgentSessionOptions`. The system prompt the spawned `AgentSession` uses comes from `resourceLoader.getSystemPrompt()` (`AgentSessionConfig.resourceLoader`, surfaced as `agentSession.systemPrompt`). The PIC spawn snippet writes `resourceLoader,` followed by `// ...` and never explains how the supplied loader is constructed to return the loom's frontmatter `system:` value rather than the host project's default `AGENTS.md`-derived prompt. With the parent's (or a freshly-defaulted) `DefaultResourceLoader` passed unchanged, the spawned session would silently inherit the user's project system prompt — exactly what the matrix says cannot happen. Mechanism is missing, not just under-cited.

2. **Caller's `loomAbort` controller.** The matrix says cancellation forwards via `createAgentSession({ signal: loomAbort.signal })`. `CreateAgentSessionOptions` has no `signal` field. This is the subject of the dedicated sibling finding `` `createAgentSession` has no `signal` option in SDK; subagent cancellation silently broken `` and is not re-litigated here; the matrix-narration sentence under the table needs to be rewritten in lock-step with whatever fix lands there.

The two grounded gaps differ in kind: the system-prompt row needs a new mechanism to be specified (constructing the `resourceLoader`); the `loomAbort` row needs the existing narration to be replaced with whatever the sibling finding's resolution decides. Both must change, but the system-prompt gap is this finding's primary residue once the sibling finding is acknowledged.

## Spec Documents

- `spec_topics/pi-integration-contract.md` — Conversation drive — subagent mode (edited)
- `spec_topics/pi-integration-contract.md` — Subagent state-isolation matrix (edited)
- `spec_topics/pi-integration-contract.md` — `ExtensionContext` (member surface loom touches) (read-only — confirms `getSystemPrompt` is host-side, not loom-consumed in V1)
- `spec.md` — Opening paragraph (read-only — forward-references the matrix)
- `spec_topics/overview.md` — Scope of a Loom File (read-only — consumes the matrix's isolation prose)
- `spec_topics/frontmatter.md` — `system:` (read-only — defines the source value the resourceLoader must surface)
- `spec_topics/cancellation.md` — Signal source (option-dependent — narration changes if the sibling `signal` finding resolves by upstream-pinning a Pi SDK addition)

## Plan Impact

**Phases:** V12 — Subagent mode

**Leaves (implementation order):**

- V12a — `mode: subagent` accepted; AgentSession spawn — (modified)
- V12b — `system:` field declaration — (modified)
- V12c — `${param}` and `${param.field}` in `system:` — (modified)

V12a's Adds bullet currently names `customTools`, the `tools` allowlist, and `SessionManager.inMemory`, but is silent on how the resolved frontmatter `system:` value reaches the spawned session — the resourceLoader construction step belongs in this leaf. V12b and V12c specify acceptance and interpolation of `system:` at the source-language level; their Tests sections need an end-to-end assertion that the value reaches `agentSession.systemPrompt` (not just that the loader parses it).

## Consequence

**Severity:** correctness

Two competent implementers reading the matrix will diverge on the system-prompt row: one will assume Pi exposes a `systemPrompt` option and write code that silently no-ops (passing the option through to a record that ignores unknown keys); another will reason from `AgentSessionConfig` and construct a custom `ResourceLoader`. The first implementation ships subagent sessions that quietly run with the user's project `AGENTS.md` prompt instead of the loom's `system:`, breaking the isolation guarantee that drives the entire `mode: subagent` use case. No test in the V12 leaves currently asserts the delivered prompt's text, so the divergence is unobservable until a `system:` instruction visibly fails to take effect in production.

## Solution Space

**Shape:** single

### Recommendation

In `pi-integration-contract.md`'s **Conversation drive — subagent mode**, expand the spawn-call snippet's `resourceLoader,` placeholder into a concrete construction recipe and pin the delivery mechanism in normative prose. Specifically:

1. Replace the `resourceLoader, // ...` line with an explicit construction: a thin `ResourceLoader` impl whose `getSystemPrompt()` returns the resolved-and-interpolated loom frontmatter `system:` string and whose other members delegate to (or return empty/defaults from) the parent loader. Show both the `class` shape and a one-liner adapter form. State that `getAppendSystemPrompt()` returns `[]` (the loom's `system:` is the *complete* prompt, not an append).

2. Add one sentence under the matrix's "caller's system prompt" row pointing at this construction: e.g. "Mechanism: the `resourceLoader` passed to `createAgentSession` is a loom-constructed adapter whose `getSystemPrompt()` returns the loom's resolved frontmatter `system:`; see **Conversation drive — subagent mode** above. `CreateAgentSessionOptions` exposes no `systemPrompt` field — delivery via the loader is the only available channel."

3. Tighten the matrix-narration paragraph that currently asserts cancellation forwards via `createAgentSession({ signal: loomAbort.signal })` to track whatever the sibling `signal`-option finding decides; do not rewrite it here, but flag the dependency.

4. Update V12a's Adds bullet to name the resourceLoader-construction step alongside the existing `customTools` / `tools` / `SessionManager.inMemory` items, and add one Test assertion: `agentSession.systemPrompt` after spawn equals the resolved-and-interpolated loom `system:` string verbatim, and changing the host project's `AGENTS.md` between loom load and spawn does not change what the subagent sees.

Edge case the implementer must watch: `DefaultResourceLoader` accepts a `systemPromptOverride: (base) => string | undefined` constructor option which would also work, but it is a leakier choice (it still runs all of the default loader's discovery side-effects against the parent `cwd` to compute `base`, only to ignore the result). The custom-adapter form is preferred because it bypasses default-loader I/O entirely; if the spec recommends `systemPromptOverride` instead, it must be explicit that `base` is discarded and the discovery cost is accepted.

## Related Findings

- "`createAgentSession` has no `signal` option in SDK; subagent cancellation silently broken" — same-cluster (covers the `loomAbort` row of this matrix; both findings are evidence of the same "matrix presupposes mechanisms not all of which exist" pattern, but resolve via independent edits)
- "Trust boundary uses `tools` where `customTools` is the correct SDK field" — same-cluster (touches the same `createAgentSession` call surface and the same "ambient Pi tool set" matrix row, but is a terminology fix in a different section)
- "\"ambient tool set\" not reconciled with Pi SDK's \"active tools\"" — same-cluster (glossary alignment for the same matrix row)
- "`pi.getCommands()` returns `SlashCommandInfo[]`, not `readonly Command[]`" — same-cluster (another instance of PIC pinning a Pi SDK shape that does not exist verbatim; signals a class of issues to sweep on the next PIC pass)

## spec_topics/pi-integration-contract.md

---

# Subagent cancellation wiring depends on a non-existent `createAgentSession({ signal })` option

**Original heading:** `createAgentSession` has no `signal` option in SDK; subagent cancellation silently broken
**Kind:** codebase-grounding-broad

## Finding

The spec describes subagent-mode cancellation as flowing automatically through a `signal` option on `createAgentSession({ signal: loomAbort.signal })`. That option does not exist. In `@mariozechner/pi-coding-agent` (verified at the version `npm view` currently resolves to, 0.73.0), `CreateAgentSessionOptions` (in `dist/core/sdk.d.ts`) declares only `cwd`, `agentDir`, `authStorage`, `modelRegistry`, `model`, `thinkingLevel`, `scopedModels`, `noTools`, `tools`, `customTools`, `resourceLoader`, `sessionManager`, `settingsManager`, and `sessionStartEvent` — no `signal` field. JavaScript will silently ignore the extra option; the spawned `AgentSession`'s in-flight provider call will never observe `loomAbort` aborting.

The error is repeated in at least five normative places. `pi-integration-contract.md` § *Host prerequisites #4* lists "the `signal` option of `createAgentSession({ signal })`" as a Pi-supplied prerequisite; the *Subagent state-isolation matrix* prose reads "cancellation forwards via the parent's `loomAbort.abort()` call propagating through the `signal` option passed to `createAgentSession({ signal: loomAbort.signal })`"; § *Cancellation source* repeats the same claim; § *Extension entry point* step 4 sub-step 2 says `loomAbort.abort()` "propagates through … `createAgentSession({ signal })` to in-flight provider calls"; and SDK-capability inventory item 5 enumerates the same option as a `MUST`. `cancellation.md` § *Forwarding into `loomAbort`* concludes "The subagent-mode counterpart needs no separate wiring: `createAgentSession({ signal: loomAbort.signal })` already cancels the spawned `AgentSession` whenever `loomAbort` fires." Plan leaf H4 also instructs the `PiSubagentSpawner` shim to forward `signal` into `createAgentSession`.

The cascade is structural. Three downstream contracts collapse silently if an implementer follows the spec verbatim: the V1 invariant that `loomAbort.signal` is "always defined; tool adapters and Pi APIs that accept an `AbortSignal` receive it directly without optional-chaining"; the `session_shutdown` step that aborts every `ActiveInvocationRegistry` entry to drain subagent provider connections before `ExtensionRuntime.invalidate(...)` runs; and the cross-mode subagent cancellation matrix in `cancellation.md`. The actual SDK surface that *can* tear down a subagent is `AgentSession.abort(): Promise<void>` ("Abort current operation and wait for agent to become idle"), reachable on the handle returned by `createAgentSession`.

## Spec Documents

- `spec_topics/pi-integration-contract.md` — *Host prerequisites #4* (edited)
- `spec_topics/pi-integration-contract.md` — *Extension entry point* step 4 sub-step 2 (edited)
- `spec_topics/pi-integration-contract.md` — *Conversation drive — subagent mode* (edited)
- `spec_topics/pi-integration-contract.md` — *Subagent state-isolation matrix* (edited)
- `spec_topics/pi-integration-contract.md` — *Subagent session lifecycle* (edited)
- `spec_topics/pi-integration-contract.md` — *Cancellation source* (edited)
- `spec_topics/pi-integration-contract.md` — *SDK capability inventory* item 5 (edited)
- `spec_topics/pi-integration-contract.md` — *Entry capability probe* (Step 0 b) (edited — add `AgentSession.abort` to factory-probable members)
- `spec_topics/cancellation.md` — *Signal source* (edited)
- `spec_topics/cancellation.md` — *Forwarding into `loomAbort`* — slash-command bullet trailing sentence (edited)
- `spec_topics/diagnostics.md` — `loom/runtime/internal-error` row (read-only — already enumerates `createAgentSession` reject paths; no shape change)

## Plan Impact

**Phases:** Horizontal H2, Horizontal H4, Horizontal H5, Vertical V12, Vertical V18

**Leaves (implementation order):**

- H2 — Dependency-injection skeleton with fakes — (modified — `SubagentSpawner` factory seam contract must specify the `session.abort()`-via-listener wiring as the cancellation primitive, not a passthrough `signal` option)
- H4 — Pi extension shell — (modified — `PiSubagentSpawner.spawn(opts)` MUST register a one-shot `loomAbort.signal` listener that calls the returned `AgentSession.abort()` and detach it in the same `finally` that runs `dispose()`; the literal `createAgentSession({ ..., signal, ... })` argument list and the "calls the captured `createAgentSession` exactly once with the lowered `customTools` / `tools` allowlist pair" delegation-contract test both need updating)
- H5 — Pi end-to-end harness — (modified — harness wiring against the real `createAgentSession` cannot rely on a `signal` option; cancellation in integration tests must be exercised via `session.abort()`)
- V12a — `mode: subagent` accepted; AgentSession spawn — (modified — the "`dispose()` invoked on parent-`AbortSignal`-fired-before-first-turn" test must drive cancellation through the new listener path rather than through a `signal` option that the SDK ignores)
- V18d — `AbortSignal` before every `invoke` — (modified — the "for subagent-mode children, cancellation observed before the first turn still triggers `AgentSession.dispose()` via the `finally` block" assertion needs the listener+`session.abort()` pathway as its operative mechanism)
- V18e — Cancellation propagates downward only — (modified — the parent → child propagation contract for subagent-mode children depends on the listener+`session.abort()` wiring landed in H4)

## Consequence

**Severity:** correctness

A naive implementer who mirrors the spec emits `createAgentSession({ signal: loomAbort.signal, ... })`, the option is silently dropped, and subagent provider calls become uncancellable: Esc during a long subagent turn does nothing, `/reload` mid-turn cannot drain in-flight subagents before `ExtensionRuntime.invalidate(...)`, and the V1 "always defined `loomAbort.signal`" invariant becomes load-bearing for nothing on the subagent path. A sharper implementer notices the missing field and routes through `AgentSession.abort()`; the two implementations differ in observable teardown timing and in error surfaces (an `abort()` rejection has no spec-defined disposition).

## Solution Space

**Shape:** single

### Recommendation

Replace every reference to `createAgentSession({ signal })` with the actual SDK wiring: at the call site that spawns a subagent, the runtime registers a one-shot `loomAbort.signal` listener that invokes `session.abort()` on the handle returned by `createAgentSession(...)`. The listener is attached immediately after the awaited `createAgentSession(...)` returns and is removed in the same per-invocation `finally` block that calls `AgentSession.dispose()` and detaches every other forwarding listener (per the existing rule in `cancellation.md`). If `loomAbort.signal.aborted` is already true at listener-registration time, the runtime invokes `session.abort()` synchronously before issuing the first user turn so the spawn-then-immediate-cancel path tested by V12a remains correct.

Concrete spec edits required:

- `pi-integration-contract.md` *Host prerequisites #4*: drop "the `signal` option of `createAgentSession({ signal })`" from the enumerated extension entry points; the surviving entries are `ctx.signal` and `tool.execute`'s `signal` parameter.
- `pi-integration-contract.md` *Conversation drive — subagent mode* code block: remove any `signal` field; keep `customTools`, `tools`, `model`, `sessionManager`, etc.
- `pi-integration-contract.md` *Subagent state-isolation matrix* `loomAbort` row: replace "propagating through the `signal` option passed to `createAgentSession({ signal: loomAbort.signal })`" with "propagating through a one-shot `loomAbort.signal` listener that calls `session.abort()` on the spawned `AgentSession`".
- `pi-integration-contract.md` *Subagent session lifecycle*: state that the `finally` block detaches the cancellation-forwarding listener in addition to calling `dispose()`.
- `pi-integration-contract.md` *Cancellation source* and *Extension entry point* step 4 sub-step 2: rewrite both to describe the listener + `session.abort()` mechanism.
- `pi-integration-contract.md` SDK-capability inventory item 5: replace "the `signal` option of `createAgentSession({ signal })`" with "`AgentSession.abort()` on the handle returned by `createAgentSession(...)`"; add `AgentSession.abort` to the *Entry capability probe* (Step 0 b) factory-probable members so a Pi version that drops or renames it surfaces as `loom/load/host-incompatible` rather than as a runtime-time `TypeError`.
- `cancellation.md` *Signal source*: drop "the `signal` passed into `createAgentSession(...)` in subagent mode" from the single-source-of-truth enumeration.
- `cancellation.md` *Forwarding into `loomAbort`* slash-command bullet: replace the trailing "The subagent-mode counterpart needs no separate wiring …" sentence with a description of the `loomAbort.signal` → `session.abort()` listener registered at spawn and detached in the `finally`.
- H4 leaf: rewrite the `PiSubagentSpawner.spawn(opts)` shim contract and its delegation-contract test against `FakeExtensionAPI` to assert (a) `createAgentSession` is called with no `signal` field, and (b) a `loomAbort.signal` listener is registered such that firing the parent `AbortController` causes exactly one `session.abort()` call on the returned handle.

Implementer-relevant edge cases:

- The `loom/runtime/internal-error` row in `diagnostics.md` already enumerates `createAgentSession` rejecting or returning a handle whose `dispose` is non-callable. Extend the same row (or the prose at PIC *Subagent session lifecycle*) to cover an `AgentSession.abort()` that throws or rejects — the rejection MUST NOT mask the original error the `finally` was protecting, mirroring the existing `dispose()` rule.
- `AgentSession.abort()` returns `Promise<void>` and waits for the agent to become idle. The `session_shutdown` handler's `SHUTDOWN_AWAIT_CAP_MS = 2000` budget already covers the disposal phase; specify whether the `abort()` await is part of that budget or counted separately so step 4 sub-step 3's `Promise.allSettled(...)` semantics remain deterministic.
- The runtime must be re-entrancy-safe: `loomAbort.abort()` may fire after `session.abort()` has already started (e.g. operator hits Esc twice). The one-shot listener and the existing one-shot guard on `loomAbort.abort()` together make double-abort a no-op; keep both.
- Spawn-then-immediate-cancel: if `loomAbort.signal.aborted` is true at the moment `createAgentSession(...)` resolves, call `session.abort()` synchronously before the listener is registered, so V12a's "`dispose()` invoked on parent-`AbortSignal`-fired-before-first-turn" assertion holds without depending on microtask ordering.

## Related Findings

- "Trust boundary uses `tools` where `customTools` is the correct SDK field" — same-cluster (independent codebase-grounding error on the same `createAgentSession(...)` call site)
- "`pi.getCommands()` returns `SlashCommandInfo[]`, not `readonly Command[]`" — same-cluster (sibling codebase-grounding error in PIC; same lens, different Pi surface)
- "`pi.sendUserMessage` returns `void`, not `Promise`; transport-error detection path is wrong" — same-cluster (sibling codebase-grounding error in PIC's prompt-mode driver)
- "Pi tool-wiring APIs mentioned without SDK citation" — co-resolve (the same PIC sweep that pins `createAgentSession` to its actual shape should also cite the SDK type signatures the surrounding paragraphs assume)
- "Session swap + in-flight invocations: incomplete lifecycle and error contract" — decision-dependency (the unspecified `session_shutdown` cancellation contract must reference the listener-based `session.abort()` path defined here)
- "`ActiveInvocationRegistry` vs `activeInvocations` — two names for the same object in session_shutdown handler" — same-cluster (same step 4 sub-step that calls `loomAbort.abort()`; both edits land in the same paragraph)
- "Subagent state-isolation matrix presupposes Pi context-passing model" — same-cluster (the matrix's `loomAbort` row is one of the locations rewritten by this finding)

---

# `pi.getCommands()` pinned signature names a non-existent type

**Original heading:** `pi.getCommands()` returns `SlashCommandInfo[]`, not `readonly Command[]`
**Kind:** codebase-grounding-broad

## Finding

`spec_topics/pi-integration-contract.md` step 2 of *Extension entry point* pins the V1 contract as: *"The signature pinned by V1 is `pi.getCommands(): readonly Command[]` (synchronous, returns the current registered-commands snapshot)."* Both the element type and the `readonly` modifier are wrong relative to the SDK pinned in the same document.

The actual declaration in `@mariozechner/pi-coding-agent` (`dist/core/extensions/types.d.ts:861`, version `0.73.0`, satisfying the spec's own `^0.72.1` peer-dep range) is:

```ts
getCommands(): SlashCommandInfo[];
```

`SlashCommandInfo` is exported from `dist/core/slash-commands.d.ts` with fields `{ name, description?, source, sourceInfo }` where `source: SlashCommandSource = "extension" | "prompt" | "skill"`. No type named bare `Command` is exported anywhere from `@mariozechner/pi-coding-agent`. The result array is a plain mutable `SlashCommandInfo[]`, not a `readonly` view.

The same spec topic is internally inconsistent on this point: the very next sub-step (step 3, around line 75) reads the snapshot's `source` field against the literal arms `"prompt" | "extension" | "skill"`, citing `SlashCommandSource` from `core/slash-commands.d.ts` — i.e. exactly the file in which `SlashCommandInfo` is declared. Step 2 pins one type; step 3 unwittingly destructures another.

## Spec Documents

- `spec_topics/pi-integration-contract.md` — *Extension entry point*, step 2 (the pinned-signature sentence) (edited)
- `spec_topics/pi-integration-contract.md` — *Discovery API* paragraph (~line 539) referencing `pi.getCommands()` on `session_start` (read-only — no type rename needed; mentions the call but not its return type)
- `C:/Users/thomasa/AppData/Roaming/npm/node_modules/@mariozechner/pi-coding-agent/dist/core/extensions/types.d.ts` (read-only — authoritative SDK type)
- `C:/Users/thomasa/AppData/Roaming/npm/node_modules/@mariozechner/pi-coding-agent/dist/core/slash-commands.d.ts` (read-only — authoritative `SlashCommandInfo` and `SlashCommandSource` declarations)

## Plan Impact

**Phases:** MVP, Vertical V14

**Leaves (implementation order):**

- Mb — Minimal runtime + slash registration + two-root discovery + no-params overflow note — (modified)
- V14q — Slash collision at the same priority (uniform across formats and sources) — (modified)

The Mb leaf body in `plan_topics/m-mvp.md` carries an additional, distinct error: it says the `session_start` handler "drops pending entries whose name collides with an entry whose `source` is `"prompt"`, `"subagent"`, or `"extension"`". `"subagent"` is not a member of `SlashCommandSource`; the third arm is `"skill"`. Resolving the spec finding by naming the correct element type (`SlashCommandInfo`) makes this plan-side typo immediately visible and it should be fixed in the same edit.

## Consequence

**Severity:** correctness

A TypeScript implementation written verbatim against the pinned signature will not compile (no exported `Command` type to import); an implementer who silently invents a local `Command` interface will diverge from the real SDK shape. The bug is small enough to catch on first compilation, but the spec is internally contradictory — step 2 pins one element type, step 3 reads fields from another — which is exactly the kind of drift the PIC's "pinned constants + literal-read assertion" discipline is designed to prevent. Two implementers reading only step 2 versus only step 3 will form different mental models of what `getCommands()` returns.

## Solution Space

**Shape:** single

### Recommendation

In `spec_topics/pi-integration-contract.md`, replace the pinned-signature clause in the *Extension entry point* step 2 paragraph with:

> The signature pinned by V1 is `pi.getCommands(): SlashCommandInfo[]` (synchronous, returns the current registered-commands snapshot, where `SlashCommandInfo` is the interface exported from `@mariozechner/pi-coding-agent`'s `core/slash-commands.d.ts` with fields `{ name, description?, source: SlashCommandSource, sourceInfo }`); the snapshot is only meaningful on or after `session_start`.

Edge cases the implementer must handle:

- The returned array is mutable (`SlashCommandInfo[]`, not `ReadonlyArray<SlashCommandInfo>`). The runtime MUST treat the snapshot as read-only by convention — never mutate it in place — but cannot rely on a type-system guarantee. A defensive copy is unnecessary for the V1 collision check (a single forward pass) and is not required by the spec.
- `SlashCommandInfo.description` is optional; the collision check keys on `name` and `source` only, so this does not affect Mb / V14q.
- The cited declaration file (`dist/core/extensions/types.d.ts`) and the cited type (`SlashCommandInfo`) are already inside the build-time SDK surface-inventory assertion's scope per *Host prerequisites*; no new assertion is required, but the surface inventory MUST list `SlashCommandInfo` (and its three-arm `SlashCommandSource`) explicitly so a Pi minor that renames either fails the build.
- In the same edit, fix the related plan-side typo at `plan_topics/m-mvp.md` Mb: replace `"subagent"` with `"skill"` in the source-arm enumeration.

## Related Findings

- "`createAgentSession` has no `signal` option in SDK; subagent cancellation silently broken" — same-cluster (another PIC-pinned SDK signature that does not match the installed `@mariozechner/pi-coding-agent`; resolves independently but the same surface-inventory discipline catches both)
- "`pi.sendUserMessage` returns `void`, not `Promise`; transport-error detection path is wrong" — same-cluster (third PIC-pinned SDK signature that disagrees with the installed types)
- "Trust boundary uses `tools` where `customTools` is the correct SDK field" — same-cluster (wrong SDK field name in the spec; same root cause: pinned shapes were not literal-read-asserted against the installed `.d.ts`)
- "Pi tool-wiring APIs mentioned without SDK citation" — same-cluster (general gap in SDK citation discipline; co-resolving this finding strengthens but does not close that one)

---

# `pi.sendUserMessage` returns `void`; prompt-mode transport-error detection path is mis-described

**Original heading:** `` `pi.sendUserMessage` returns `void`, not `Promise`; transport-error detection path is wrong ``
**Kind:** codebase-grounding-broad

## Finding

The **Conversation drive — prompt mode** paragraph in `spec_topics/pi-integration-contract.md` (around line 151) describes the prompt-mode transport-error mapping as: *"A thrown or rejected `pi.sendUserMessage` (the call returns a `Promise`; both synchronous throw and asynchronous rejection are observable) is the transport call for a prompt-mode untyped query, so it is mapped to `Err(QueryError { kind: \"transport\", … })`."*

That parenthetical is wrong against the pinned SDK. In `@mariozechner/pi-coding-agent`'s `core/extensions/types.d.ts`, the `ExtensionAPI` surface — the `pi` reference the loom factory captures — declares both `sendUserMessage(...)` and `sendMessage(...)` as `void`-returning. (The `Promise<void>` shape exists only on `AgentSession.sendUserMessage` for subagent mode and on `ReplacedSessionContext.sendUserMessage` for post-replacement contexts — neither is in scope for prompt-mode driving, since V1 looms never trigger session replacement.) An implementer following the spec will write `try { await pi.sendUserMessage(text, …); } catch (e) { /* map to TransportError */ }`; the `await` resolves immediately on `undefined`, the `catch` only fires for synchronous throws, and every asynchronous transport/provider failure is silently lost.

The same paragraph already documents the *correct* mechanism three sentences later under *Error detection*: failures land on the user `AgentSession`'s `errorMessage` field and the runtime probes that field after `waitForIdle()` resolves. The page is therefore internally inconsistent — the parenthetical contradicts the post-`waitForIdle` probe it itself describes — and PIC's own diagnostics block (line 382) already states the dual rule for `pi.sendMessage` (*"returns `void` (synchronous); the runtime MUST NOT `await` it and MUST NOT attach a `.catch` handler"*) which `sendUserMessage` should match.

## Spec Documents

- `spec_topics/pi-integration-contract.md` — Conversation drive — prompt mode (edited)
- `spec_topics/pi-integration-contract.md` — Conversation drive — subagent mode (read-only; uses the `Promise`-returning `AgentSession.sendUserMessage`, kept distinct)
- `spec_topics/pi-integration-contract.md` — System notes / best-effort fallback chain (read-only; already states the `void`-return rule for `pi.sendMessage` and is the model wording to mirror)
- `spec_topics/diagnostics.md` — Persistent diagnostics (read-only; already correctly notes `pi.sendMessage` returns `void` with synchronous-throw-only observability)

## Plan Impact

**Phases:** MVP, V5

**Leaves (implementation order):**

- Mb — Minimal runtime + slash registration + two-root discovery + no-params overflow note — (modified)
- V5e — Prompt-mode conversation driver — (modified)
- V5h — Provider error mapping for `ContextOverflowError` — (modified)

(Mb and V5e currently call `pi.sendUserMessage` directly; their fakes and tests assume async observability of transport failure. V5h's "transport failure → `Err({kind:'transport'})`" and overflow-envelope assertions need test harnesses that seed `AgentSession.errorMessage` rather than reject `sendUserMessage`. V6's typed-query leaves consume the same prompt-mode driver but inherit the change transparently — no per-leaf edit beyond the ones above.)

## Consequence

**Severity:** correctness

Two reasonable implementers reading the current spec will produce divergent and broken code: one writes `await pi.sendUserMessage(...)` inside a try/catch and silently loses every asynchronous transport failure (the `Err({kind:"transport"})` branch never fires); the other notices the post-`waitForIdle` `errorMessage` probe and wires only that, but cannot reconcile it with the "thrown or rejected" sentence above. The runtime-event channel's always-log emission for `kind: "transport"` depends on this mapping firing, so the bug cascades into observability gaps for every non-OK prompt-mode turn.

## Solution Space

**Shape:** single

### Recommendation

Rewrite the offending sentence in the prompt-mode paragraph so that prompt-mode transport-error detection is anchored exclusively on the post-`waitForIdle()` `AgentSession.errorMessage` probe, and the `pi.sendUserMessage` call surface is correctly described as `void`-returning with synchronous-throw-only observability. Concretely:

1. Replace the parenthetical *"(the call returns a `Promise`; both synchronous throw and asynchronous rejection are observable)"* with *"(the call returns `void`; only synchronous throws — e.g. argument validation in Pi — are observable directly from this call)"*.
2. Reorder the paragraph so the *Error detection* clause is presented as the **primary** transport-failure surface, and the synchronous-throw branch as a narrow secondary mapping. Make explicit that the runtime MUST NOT `await pi.sendUserMessage(...)` and MUST NOT attach a `.catch` handler — matching the rule already pinned for `pi.sendMessage` at line 382.
3. State explicitly that the `provider` field on the resulting `TransportError` is populated from the resolved `model:` regardless of which surface (synchronous throw vs. `errorMessage` probe) detected the failure, since the `errorMessage` string carries no structured provider field.

Edge cases the implementer must handle:

- **Cancellation collision.** If `loomAbort.signal.aborted` is true on `waitForIdle()` resolution, the existing rule (synthesise `Err({kind:"cancelled"})` instead of reading `errorMessage`) takes precedence over the transport mapping — even when `errorMessage` is non-empty. Pinning the precedence here avoids ambiguity for tests that abort mid-turn after Pi has already written an error.
- **`errorMessage` lifetime.** The probe must read `errorMessage` synchronously immediately on `waitForIdle()` resolution, before any subsequent `pi.sendUserMessage` is issued on the same context — Pi may clear or overwrite the field on the next turn.
- **Subagent mode is unaffected.** `session.sendUserMessage(text)` on the spawned `AgentSession` (PIC line 219) genuinely does return `Promise<void>` and the `await`-with-try/catch shape there remains correct. The new wording must not accidentally generalise the prompt-mode rule to subagent mode.
- **`ReplacedSessionContext` carve-out.** `Future Considerations — Mid-loom user-session replacement` already pins that V1 prompt-mode looms hold a single factory-captured `pi: ExtensionAPI` for the lifetime of each invocation; the post-V1 re-acquisition seam (which would land a `Promise`-returning surface) is out of scope. State this so a future reader does not mistake the `Promise<void>` shape on `ReplacedSessionContext.sendUserMessage` for a hedge.
- **Plan ripple.** Mb / V5e / V5h test fakes and the `PromptModeConversationDriver` interface need to be updated in lock-step: the `ConversationDriver.send` implementation calls `pi.sendUserMessage(...)` without `await`, then `await ctx.waitForIdle()`, then reads `ctx.session.errorMessage` (or whichever spelling the pinned SDK exposes — the spec should pin the exact field path here). Test harnesses must seed `errorMessage` on the fake session rather than have the fake `sendUserMessage` reject.

## Related Findings

- "`createAgentSession` has no `signal` option in SDK; subagent cancellation silently broken" — same-cluster (sister PIC finding: another `Conversation drive` SDK-shape mismatch; co-resolve in the same PIC editing pass)
- "`pi.getCommands()` returns `SlashCommandInfo[]`, not `readonly Command[]`" — same-cluster (third PIC SDK signature drift; resolved by the same SDK-grounding pass)

---

# `session_shutdown` handler refers to the same registry by two different identifiers

**Original heading:** `` `ActiveInvocationRegistry` vs `activeInvocations` — two names for the same object in session_shutdown handler ``
**Kind:** naming

## Finding

In `spec_topics/pi-integration-contract.md`, the **Extension entry point** step 4 prescribes the `session_shutdown` handler. Sub-step 2 ("Cancel in-flight invocations") names the data structure being iterated as **`ActiveInvocationRegistry`** (bolded, treated as the canonical introduction). Sub-step 3 ("Await subagent disposal") immediately references the same structure as `activeInvocations` in an executable code fragment: `await Promise.allSettled(activeInvocations.map(inv => inv.disposeBarrier))`. The defining paragraph that follows the five sub-steps again uses **`ActiveInvocationRegistry`** as the type/role name.

The spec never establishes that `activeInvocations` is an alias, a member of the registry (e.g. `registry.entries`), a destructured iterable, or anything else. A reader cannot tell whether the code fragment in sub-step 3 is calling `.map` on the registry directly (implying the registry is itself the iterable, contradicting the later paragraph that types it as `Set<{ loomAbort; disposeBarrier }>`), on a snapshot variable that ought to have been introduced in sub-step 2, or on an unrelated structure.

The collision is purely editorial — both names denote the same object — but the code fragment is the only place the spec shows the iteration shape, and an implementer copying it must invent a binding the spec does not define.

## Spec Documents

- `spec_topics/pi-integration-contract.md` — Extension entry point step 4 (sub-steps 2 and 3) and the defining paragraph immediately below the sub-step list (edited)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None

## Consequence

**Severity:** cosmetic

An implementer is forced to reconcile the two names by inspection. They will land on the correct intent (iterate the registry's entries), but the spec's prescriptive code fragment as written does not type-check against the registry's stated shape, undermining the page's value as the integration contract.

## Solution Space

**Shape:** single

### Recommendation

Use a single identifier throughout step 4. Concretely, in sub-step 3 replace `activeInvocations.map(inv => inv.disposeBarrier)` with `[...activeInvocationRegistry].map(inv => inv.disposeBarrier)` (or introduce one explicit binding at the top of step 4: "let `activeInvocations = [...activeInvocationRegistry]`" and then reuse it in sub-steps 2 and 3). Pick whichever form keeps the registry name canonical and the snapshot variable, if any, derived from it by a stated operation. Apply the same identifier in the defining paragraph's `Set<…>` typing so the iteration shape matches.

Edge case: the snapshot must be taken before sub-step 2's `loomAbort.abort()` calls cause per-invocation `finally` blocks to remove their entries from the registry concurrently — otherwise sub-step 3 may iterate a registry that mutates underfoot. A snapshot variable bound once at the top of step 4 covers both the naming fix and this hazard; iterating the live registry in sub-step 2 (where mutation while iterating is unobservable because the abort is synchronous) and the snapshot in sub-step 3 is the cleanest split.

## Related Findings

- "`ActiveInvocationRegistry`: implementation detail in Prerequisites; failure modes unspecified" — same-cluster (touches the same identifier on `spec.md`'s aggregator side; resolves independently of the naming fix)
- "Session swap + in-flight invocations: incomplete lifecycle and error contract" — same-cluster (same `session_shutdown` sequence; the lifecycle/error gap is independent of the identifier collision)
- "`switchSession` incorrectly listed as session_shutdown trigger; teardown described as unconditional" — same-cluster (same handler section in `spec.md`; resolves independently)

## spec_topics/binder.md

---

# Item 8 of binder system-prompt structure has no testable surface

**Original heading:** System-prompt instruction for defaulted parameters is not testable
**Kind:** testability

## Finding

`spec_topics/binder.md` § *System-prompt structure (normative)* enumerates eight obligations the rendered binder system prompt MUST satisfy. Items 1–7 each pin at least one literal token or structural marker that a conformance test can grep for: `Loom: /<name>`, `Description:`, `Argument hint:`, `Parameters:` (plus per-field structure), `User arguments:`, the `Recent session context` opener, and the kind-name tokens `ok` / `needs_info` / `ambiguous`. Item 8 — the no-invent-defaults instruction — names no token, no structural marker, no required clause, and explicitly declares "Wording is non-normative; the instruction's presence is."

The combination is contradictory: a conformance test cannot detect "presence of an instruction directing the model not to invent values for defaulted parameters" without some pinned anchor — any non-empty system prompt arguably contains, or arguably does not contain, such an instruction depending on how the reader paraphrases the rule. Two implementers can disagree about whether a given prompt satisfies item 8, and a test asserting compliance has no fixed string to assert against. This breaks the symmetry the rest of the list relies on and leaves the only rule whose subject (defaulting) is genuinely model-behavioural — and therefore the most likely to be silently dropped — without a test.

The illustrative prompt in the same section already supplies a sentence that would do the job (`Do not invent values for defaulted parameters that the user did not specify; omit them.`); the gap is purely that the section's normative obligations do not pin any of its tokens.

## Spec Documents

- `spec_topics/binder.md` — System-prompt structure (normative), item 8 (edited)

## Plan Impact

**Phases:** V16

**Leaves (implementation order):**

- V16f — `bind_context: none` — (modified)

V16f is the only leaf that asserts on the rendered binder system prompt (currently the `Argument hint:` line). Tightening item 8 adds one structural-prompt assertion to V16f's *Tests* list; no other leaf needs to move.

## Consequence

**Severity:** advisory

A conformance suite that takes item 8 at face value cannot fail any prompt for omitting the no-invent guidance, so an implementation that ships a binder system prompt without that instruction passes structure tests while degrading binder accuracy on defaulted-parameter looms (the binder is more likely to invent values for omitted defaulted fields, which then survive AJV and reach the loom). The damage is bounded — the example prompt already shows the right sentence and most implementers will copy it — but the obligation as written cannot be enforced.

## Solution Space

**Shape:** single

### Recommendation

Rewrite item 8 to pin a literal token, mirroring the pattern items 1–7 already establish. Concretely, replace the current text with:

> **No-invent-defaults instruction.** The prompt MUST contain a single line that includes both the literal substring `defaulted` (case-sensitive) and at least one of the directive substrings `Do not`, `omit`, or `skip` (case-sensitive). The rest of the wording is non-normative.

This keeps the "wording is non-normative" posture the section uses elsewhere while giving conformance tests a deterministic predicate (`line contains "defaulted" AND line contains one of {"Do not", "omit", "skip"}`). The section's illustrative fenced prompt already satisfies this rule (`Do not invent values for defaulted parameters that the user did not specify; omit them.`) and needs no edit. The conditional-presence machinery used by items 2/3/4/6 does not apply here — the obligation is unconditional, so no negative-half assertion is required.

Edge cases for the implementer:

- Apply the predicate to a single rendered line, not to the whole prompt — the spec's existing items use line-scoped tokens (`Loom:`, `User arguments:`) and a same-line co-occurrence rule keeps the test cheap.
- The `defaulted` token is chosen over `default` because the latter collides with the `default=<literal>` markers the *Parameters block* (item 4) emits per field; requiring `defaulted` (the adjective) avoids accidental satisfaction by a Parameters line.
- V16f's test list adds one assertion: render the system prompt for a loom whose `params:` declares ≥1 defaulted field, find the no-invent line by the predicate above, fail when no line matches.

## Related Findings

None

## spec_topics/cancellation.md

---

# `CancelledError.message` has no normative content

**Original heading:** `CancelledError.message` has no normative content
**Kind:** testability

## Finding

`CancelledError` is declared in [`errors-and-results.md`](../../../spec_topics/errors-and-results.md) as `{ kind: "cancelled", message: string }` and the cancellation surfacing rule in [`cancellation.md`](../../../spec_topics/cancellation.md) writes `Err(QueryError { kind: "cancelled", message: "..." })`. The `"..."` is illustrative prose, not a template — no other clause pins the field's content, format, or even an upper bound. A conformant runtime is free to write `""`, `"cancelled"`, `"AbortError: aborted"`, the host AbortError's `.message`, or a multi-line stack trace into that slot, and conformance tests have no normative string to assert against.

The asymmetry is sharp because two adjacent surfaces *do* pin their message content: panic messages flow from the [Diagnostics code registry's *Message* column](../../../spec_topics/diagnostics.md) under the "Panic message string (normative)" rule in `errors-and-results.md`, and `TransportError.message` is fixed to the underlying `<error.message>` by [`pi-integration-contract.md`](../../../spec_topics/pi-integration-contract.md). For `CancelledError` (and the analogous fields on `ValidationError`, `ContextOverflowError`, `ModelToolError`, `ToolLoopExhaustedError`, `CodeToolError`, `InvokeInfraError`, and `InvokeCalleeError`) there is no such anchor.

The user-visible top-level surface is unaffected — the `cancelled` row in [`slash-invocation.md`](../../../spec_topics/slash-invocation.md) renders `"loom /<name> cancelled"` and never interpolates the message. The gap shows up where loom code pattern-matches on `err.message` and where conformance tests want a stable assertion target.

## Spec Documents

- `spec_topics/errors-and-results.md` — `CancelledError` declaration; `QueryError variants` section (edited)
- `spec_topics/cancellation.md` — Surfacing bullets (read-only; the `"..."` in the example may be left as illustrative)
- `spec_topics/slash-invocation.md` — per-`kind` system-note table (read-only; confirms the message is not interpolated for `cancelled`)
- `spec_topics/pi-integration-contract.md` — TransportError mapping (read-only; precedent for a field-pinning rule)
- `spec_topics/diagnostics.md` — Panic message rule (read-only; precedent for a normative-template rule)

## Plan Impact

**Phases:** Vertical V5, Vertical V18

**Leaves (implementation order):**

- V5f — `CancelledError` discriminated-union variant — (modified)
- V18b — `AbortSignal` before every `@` query — (modified)
- V18c — `AbortSignal` before every tool call — (modified)
- V18d — `AbortSignal` before every `invoke` — (modified)
- V18e — Cancellation propagates downward only — (modified)
- V18p — `AbortSignal` before and during the binder LLM call — (modified)

(All six surface `Err({kind:"cancelled"})`; their `Tests` clauses currently assert on `kind` only and would need either a literal-message assertion (Option B) or an explicit "MUST NOT assert on `message`" carve-out (Option A). `m-mvp.md`'s Mb already practices Option A by name — `"Do not assert on … err.message"` — so the plan is already self-consistent under Option A.)

## Consequence

**Severity:** advisory

Two conformant implementations can populate `CancelledError.message` with materially different strings, but no top-level user-visible surface is affected (the `cancelled` row drops the field). The risk is confined to (a) author code that pattern-matches on `err.message` for diagnostic display, which has no portable string to match, and (b) conformance authors who cannot tell whether asserting on the field is in or out of scope. The same gap recurs across seven sibling error variants, so a per-variant fix would multiply.

## Solution Space

**Shape:** multiple

### Option A — Declare `message` implementation-defined for non-pinned variants

**Approach.** Add one clause to `errors-and-results.md` (under the existing "Notes" subsection or as a new "Message field discipline" subsection above the variant list) stating: for every `QueryError` variant whose `message` is not otherwise pinned by a normative rule (Panic message string, `TransportError` ← `<error.message>`), the field is implementation-defined; conformance tests MUST NOT assert on its content (presence and `string` type are the only assertable properties).

**Spec edits.**
- `errors-and-results.md`: insert the rule, naming `CancelledError.message`, `ValidationError.message`, `ContextOverflowError.message`, `ModelToolError.message`, `ToolLoopExhaustedError.message`, `CodeToolError.message`, `InvokeInfraError.message`, and `InvokeCalleeError.message` as the covered set, with the panic-message and transport-message rules cited as the carve-outs.
- `cancellation.md`: leave the `"..."` placeholder as-is; it's already correctly illustrative under this reading.

**Pros.** One edit covers all eight affected variants. Aligns with the `m-mvp.md` Mb test discipline already in the plan. Preserves implementer freedom to surface useful debugging strings (host AbortError text, provider failure detail) without a versioned spec change.

**Cons.** Author code that wants a stable string to render or pattern-match on still has none.

**Risks.** None material — the rule formalises current de facto practice.

### Option B — Pin a literal message per variant

**Approach.** Add a normative literal to each affected variant's schema declaration, e.g. `CancelledError.message` MUST equal `"operation cancelled"`. Repeat for the other seven variants with appropriate strings (or pin a template with placeholder substitutions where the variant carries enough structured context).

**Spec edits.**
- `errors-and-results.md`: add a normative literal or template to each variant's schema block.
- `cancellation.md`: replace the `"..."` placeholder in the surfacing bullets with the pinned literal.
- All six V18* leaves and V5f gain literal-string assertions on `.message`.

**Pros.** Author code can rely on a stable string. Conformance tests assert the literal verbatim, mirroring the diagnostics-message discipline.

**Cons.** Eight new normative strings to define and version. Loses host-supplied detail (provider error text, AJV path) unless the templates carry placeholders, which then needs its own placeholder-rendering rule (the same problem the [`diagnostics.md` placeholder-rendering closure](../../../spec_topics/diagnostics.md) already wrestles with). Existing `m-mvp.md` Mb wording — *"Do not assert on … err.message"* — would need to be reversed.

**Risks.** Pulls a second axis of byte-identical-rendering surface area into V1.0. The diagnostics placeholder-rendering effort is already partial (see the related "Diagnostic placeholder rendering" finding); duplicating that machinery for error messages compounds the closure cost.

### Recommendation

Take **Option A**. Add a single "Message field discipline" clause to `errors-and-results.md` that names the eight implementation-defined `message` fields, cites the panic-message and `TransportError` rules as the closed set of carve-outs, and forbids conformance assertions on the field's content. The slash-invocation `cancelled` row already shows the message is not load-bearing on the user-visible surface, and `m-mvp.md` Mb already codifies the test discipline this rule formalises. Edge cases for the implementer: (i) the rule applies even when the underlying provider/host error supplies a message — implementations MAY thread it through but tests MUST NOT depend on it; (ii) the field remains required and typed `string` (not `string | null`), so `""` is permitted but `null`/omission is not.

## Related Findings

- "`cause` vs `reason` sub-discriminator fields inconsistent across error variants" — same-cluster (touches the same `QueryError`-variant schema surface in `errors-and-results.md`; can be edited in the same pass but resolves independently)
- "Diagnostic placeholder rendering: affected codes not enumerated; implementation-defined portion untestable" — same-cluster (analogous "implementation-defined string portion of a normative envelope" testability problem; if Option B is chosen here it inherits the same closure debt)

## spec_topics/diagnostics.md

---

# Unenumerated diagnostic-message placeholders leave the testable surface implicit

**Original heading:** Diagnostic placeholder rendering: affected codes not enumerated; implementation-defined portion untestable
**Kind:** testability

## Finding

[Diagnostics — Placeholder rendering](../../../spec_topics/diagnostics.md) pins byte-identical rendering for placeholders in six closed categories (static-type, runtime-value, syntactic-construct, numeric, source-derived, underlying-error). The "V1.0 scope" paragraph in that section then declares that registry rows whose *Message* template uses **any other** placeholder name carry no normative rendering rule — implementations "MAY render those placeholders by the obvious extension of the closest matching category" and conformance tests "MUST treat the unenumerated portion as implementation-defined." This non-normative slice is the bulk of the registry: roughly half of the rows in [Diagnostics — Code registry](../../../spec_topics/diagnostics.md#code-registry) carry at least one off-category placeholder.

The full enumeration of the unenumerated placeholders (`<schema>`, `<X>`, `<enum>`, `<method>`, `<model>`, `<provider>`, `<source>`, `<capability>`, `<slug>`, `<name1>`, `<name2>`, `<path-a>`, `<path-b>`, `<higher>`, `<lower>`, `<A>`, `<B>`, `<root>`, `<fields>`, `<paths>`, `<kind>`, `<cap>`, `<ms>`, `<N>`, `<error>`) lives in [Future Considerations — Diagnostic placeholder rendering closure](../../../spec_topics/future-considerations.md), not in `diagnostics.md`, and it lists placeholder names without mapping each one to the registry codes that emit it. A test author asking "is the rendered text of `loom/load/cross-format-collision` byte-stable across implementations?" must (a) read the diagnostics page, (b) realise the off-category deferral applies, (c) cross-page to future-considerations.md, (d) hand-correlate the placeholder list against the row's *Message* template, and (e) decide which substring of the rendered message to mask in their assertion. There is no spec-level affordance — no per-row tag, no test-side helper rule — that reduces this to a mechanical check.

The deferral also leaves a second testability hazard buried: several placeholder names are **overloaded** across rendering domains. `<path>` in `loom/parse/invoke-non-loom-extension` is a category-5 source-derived placeholder rendered as a path literal verbatim, but `<path>` in `loom/parse/type-alias-cycle` is a list of schema names joined by ` → ` (per the V4j plan-leaf test vectors). `<required>` is a numeric placeholder in category 4 but is a SemVer string in `loom/load/host-incompatible`'s `details.required`. A reader who matches by placeholder name alone will derive the wrong rendering rule.

## Spec Documents

- `spec_topics/diagnostics.md` — *Placeholder rendering* and *Code registry* (edited)
- `spec_topics/future-considerations.md` — *Diagnostic placeholder rendering closure* (option-dependent — moved or shortened depending on solution)
- `spec_topics/governance.md` — GOV-7 / GOV-8 closure posture (read-only)

## Plan Impact

**Phases:** Horizontal (H3), MVP (Mb), Verticals V4 / V11 / V14 / V15 / V18.

**Leaves (implementation order):**

- H3 — Diagnostics primitive and multi-error accumulator — (modified — owns the spec's policy surface; if rendering rules close, the registry-test harness must express which rows have byte-stable templates and which do not)
- Mb — Minimal runtime + slash registration + two-root discovery + no-params overflow note — (modified — Tests bullet asserts `loom/load/cross-source-shadow` warning text verbatim; that template uses unenumerated `<higher>`/`<lower>`)
- V4b — Object schema declaration and lowering — (modified — Tests assert exact `'X' has no fields…` message for `loom/parse/empty-schema-body`; uses unenumerated `<X>`)
- V4j — Type-alias cycle detector — (modified — Tests assert `"type-alias cycle: X → X"` template against a `<path>` placeholder whose rendering rule is **not** the category-5 path-literal rule)
- V11a — Implicit discriminator detection — (modified — `loom/parse/non-string-discriminator` template uses unenumerated `<X>`, `<kind>`)
- V11b — Ambiguous-candidate diagnostic — (modified — `loom/parse/ambiguous-discriminator` template uses unenumerated `<X>`, `<fields>`)
- V11c — Missing-discriminator diagnostic — (modified — `loom/parse/missing-discriminator` template uses unenumerated `<X>`)
- V14k — Discovery: global `~/.pi/agent/looms/` — (modified — `loom/load/case-collision` template uses unenumerated `<source>`, `<path-a>`, `<path-b>`)
- V14l — Discovery: project `.pi/looms/` — (modified — same set as V14k)
- V14m — Discovery: package `looms/` and `pi.looms` — (modified — `loom/load/manifest-invalid` uses `<kind>`; `loom/load/cross-format-collision` uses `<paths>`)
- V14n — Discovery: settings file reads — (modified — `loom/load/settings-invalid-entry` uses `<kind>`)
- V14p — Source priority and shadowing warning — (modified — `loom/load/cross-source-shadow` uses `<higher>`, `<lower>`)
- V14q — Slash collision at the same priority — (modified — `loom/load/cross-format-collision` uses `<paths>`)
- V15d — Positional argument binding for `invoke` — (modified — `loom/parse/invoke-arity-too-few` / `…-too-many` use unenumerated `<callee>`)
- V15e — `.loom` paths in `tools:` — (modified — same family)
- V15n — Parse-time cycle detection — (modified — Tests assert `"invocation cycle: A → B → A"` literal joined by ` → `; the `<A>`/`<B>` placeholders are unenumerated)
- V18s — Coverage-matrix closing CI gate — (modified — gates 1–9 do not currently include a placeholder-rendering coverage check; this finding's solution adds either an enumeration-completeness gate or an implementation-defined-mask gate)

## Consequence

**Severity:** advisory

Two conformant implementations can produce different bytes for ~half of the registry's diagnostic rows without being wrong, and the V18s closing CI gate has no mechanical way to spot a row that is byte-tested against a template carrying an unenumerated placeholder. The structured `details.diagnostics` payload and the diagnostic *code* itself remain deterministic, so test suites that assert only on `code` plus shape-of-`details` are unaffected; suites that assert message text — which the conventions in `plan_topics/conventions.md` actively encourage by sourcing the expected string from the registry's *Message* column — silently couple to one implementation's choice of "obvious extension."

## Solution Space

**Shape:** multiple

### Option A — Close the rendering rules in V1.0

**Approach.** Add three new categories (or extend the existing six) to cover the placeholder names listed in `future-considerations.md`. A first-cut grouping:

- *Identifier-shaped non-source* (`<X>`, `<schema>`, `<enum>`, `<method>`, `<model>`, `<provider>`, `<source>`, `<capability>`, `<slug>`, `<name1>`, `<name2>`, `<callee>`, `<A>`, `<B>`) — render as the loom-side identifier or the resolved descriptor's identifier component, unquoted. Subsumes most of the discriminator and discovery codes.
- *Path-shaped non-source* (`<path-a>`, `<path-b>`, `<higher>`, `<lower>`, `<root>`) — render as the absolute path (post-realpath) verbatim. Distinguished from category-5 `<path>`/`<file>` (which keeps the "literal text inside the path-literal quotes" rule for source-spelled paths).
- *List-valued* (`<fields>`, `<paths>`) — comma-and-space-joined (`, `) sequence in declaration / discovery order; element rendering recurses into the element's category.
- *Tag-valued* (`<kind>`, `<cap>`) — closed enumeration per emitting site, listed in the row's *Trigger* prose; rendered verbatim.
- *Cycle-path* (`<path>` in cycle codes only) — node sequence joined by ` → ` (literal space-arrow-space, U+2192).
- *Numeric-elsewhere* (`<ms>`, `<N>`) — fold into category 4.
- *Host-error alias* (`<error>` ≡ `<error.message>`) — fold into category 6, declare aliasing explicitly.

**Spec edits.** Append the new categories to `diagnostics.md` *Placeholder rendering*; add test vectors per category; remove the V1.0-scope deferral paragraph and the future-considerations.md entry; touch GOV-7 / GOV-8 if the closure list itself becomes spec-versioned.

**Pros.** Eliminates the implementation-defined surface entirely. V18s gains a mechanical "every placeholder name in the registry is in some category" gate. Plan leaves' Tests bullets continue asserting verbatim messages with no masking machinery.

**Cons.** Largest spec surface change of the three options; risks designing rules in haste for codes that have not yet been implemented (V14, V15, V18s are downstream of M-MVP). Each new category needs test vectors and edge cases.

**Risks.** Designed-by-grep categories may discover their first poor-fit row late; the cycle-path overload of `<path>` is itself a sign that the placeholder-name space is ad hoc.

### Option B — Per-row testability tag in the registry

**Approach.** Add one column to each `loom/parse/*` / `loom/load/*` / `loom/runtime/*` registry table: `Render` ∈ `{stable, masked}`. `stable` rows MUST render byte-identically; `masked` rows carry one or more `<…>` spans whose rendered bytes are implementation-defined and whose conformance assertions MUST mask the placeholder span. Spec a `maskRenderedMessage(code, message): string` helper that test suites call; H3 owns the implementation and exposes it from the diagnostics primitive.

**Spec edits.** Add the column; mark every row that uses an off-category placeholder as `masked`; mark every other row as `stable`; spec the helper's contract (replace each `<…>` span with the literal string `<…>` keeping the angle brackets and the placeholder name); deprecate the "obvious extension" prose. Future-considerations.md entry shrinks to "promote `masked` rows to `stable` post-V1.0."

**Pros.** Minimal new normative surface; the per-row tag is mechanically auditable. Plan leaves whose Tests bullets currently assert verbatim messages either keep doing so (`stable` rows) or switch to `expect(maskRenderedMessage(code, msg)).toBe(template)` (`masked` rows). V18s gains a one-line gate.

**Cons.** Two assertion idioms across the test suite; a row's `Render` tag can drift from its template if a placeholder name is added without re-tagging — needs a CI check that derives the tag from the template's placeholder names.

**Risks.** The masked-helper contract must specify whether multi-byte placeholder values can affect surrounding span boundaries (line position, column count); under-specifying that re-introduces the divergence the tag was meant to eliminate.

### Option C — Move the enumeration into `diagnostics.md` and require masking

**Approach.** Lift the placeholder enumeration verbatim from `future-considerations.md` into the *Placeholder rendering* section of `diagnostics.md`. State explicitly that conformance tests asserting on a rendered message containing one of these placeholders MUST mask the placeholder span; reference an authoritative regex (`/<[A-Za-z._]+>/`) that defines the mask. Leave the V1.0+ closure work tracked in `future-considerations.md` but redirect to the in-spec list.

**Spec edits.** Diagnostics.md gains a normative subsection "Implementation-defined placeholders" with the enumerated list and the masking rule; future-considerations.md entry shrinks to a back-pointer.

**Pros.** Smallest spec surface change; addresses the discoverability complaint (the relevant text is on the page test authors are already reading) without committing to category design.

**Cons.** Does not fix the divergence — two implementations still emit different bytes. Tests are explicitly required to mask, which weakens the registry's *Message*-column-as-source-of-truth convention in `plan_topics/conventions.md`. Does not address the placeholder-name overloading (`<path>` in cycle codes vs. `<path>` in path-literal codes).

### Recommendation

Option B. The per-row `Render` column is the smallest spec-surface change that simultaneously (a) makes the deferral mechanically auditable, (b) gives test authors a one-step decision per row instead of a five-step cross-page derivation, and (c) lets V18s close a CI gate that the current "obvious extension" prose cannot support. Option A is right long-term but is too much surface to design correctly in V1.0 alongside the unrelated spec work the plan has open. Option C addresses only the discoverability symptom.

Edge cases the implementer must watch:

- The `Render` tag is derived from the placeholder names appearing in the *Message* template, not declared independently — V18s must enforce the derivation, otherwise a future row addition can silently drift.
- The `maskRenderedMessage` helper must be deterministic for a given input string and registry-row pair; it must not consult the implementation that produced the message.
- The placeholder-name overloading (e.g. `<path>` in `loom/parse/type-alias-cycle` vs. `loom/parse/invoke-non-loom-extension`) means the helper's mask must operate on the rendered string post-interpolation; pre-interpolation masking against the *Message* template alone is sufficient because the masked output is the template with the `<…>` spans preserved.
- Rows using only category-1–6 placeholders (e.g. `loom/parse/binding-case-mismatch`'s `<name>` from category 5) MUST tag `stable`; a CI check that scans for off-category names in the template is the natural derivation.

## Related Findings

- "`CancelledError.message` has no normative content" — same-cluster (parallel testability gap on a different surface — message text not pinned; resolved independently)
- "`loom-system-note` emission failure: no fallback contract" — same-cluster (touches the same diagnostic delivery channel; resolves independently — that finding is about delivery, this one is about rendered text)
- "`display: false` `loom-system-note` events: no test interception mechanism" — same-cluster (both make diagnostic-channel assertions awkward to write; resolved independently)
- "`timeout:` frontmatter rejection: no diagnostic code named at aggregator level" — same-cluster (concerns the diagnostics-registry surface; resolved independently)

## spec_topics/discovery.md

---

# Untestable "well under caps" performance claim in package-discovery bounds

**Original heading:** Discovery bound "well under caps" is qualitative and untestable
**Kind:** testability

## Finding

`spec_topics/discovery.md` §"Package discovery" introduces the package-walk caps with the sentence:

> "The defaults are *upper bounds*, not target performance: a healthy install completes the walk well under both caps and never trips `loom/load/discovery-slow`."

Neither "well under" nor "healthy install" is defined anywhere in the spec. There is no reference workspace, no reference hardware profile, no quantified margin, and no diagnostic that fires before `loom/load/discovery-slow`. A conformance test cannot decide whether a given environment qualifies as a "healthy install", and an implementer cannot fail a build on the basis of this sentence.

The bounds themselves (`scanPackagesMaxFiles=2000`, `scanPackagesTimeoutMs=2000`) are normative, operator-tunable, and exercised by V14m's tests. The offending sentence adds no enforceable obligation on top of them — it is editorial colour expressing the author's intuition about typical installs. As written it sits inside the normative paragraph, so a strict reader has to wonder whether it is part of the contract; it is not.

The same paragraph is paraphrased a second time in the *Keys read* subsection ("the defaults are *upper bounds*, not target performance"), but that occurrence omits the qualitative "well under" / "healthy install" claim and is fine.

## Spec Documents

- `spec_topics/discovery.md` — §"Package discovery", final bullet of the bullet list (the package-walk-bound paragraph) (edited)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None. V14m already tests the cap-firing and cap-not-firing behaviour with deterministic counts and a `FakeClock`; removing or non-normative-tagging an editorial sentence does not change any acceptance criterion.

## Consequence

**Severity:** cosmetic

A reader who treats the sentence as normative cannot derive a test from it and may waste time trying. A reader who treats it as commentary loses nothing. No observer behaviour changes either way; no implementer is blocked.

## Solution Space

**Shape:** single

### Recommendation

Delete the sentence "The defaults are *upper bounds*, not target performance: a healthy install completes the walk well under both caps and never trips `loom/load/discovery-slow`." from the package-walk-bound bullet in `spec_topics/discovery.md` §"Package discovery".

The surrounding sentence already carries the load-bearing rationale ("Package counts and walk time vary by install … so the bounds are operator-tunable rather than hardcoded"), and the *Keys read* subsection already restates "the defaults are *upper bounds*, not target performance" without the untestable qualifiers. Nothing of normative substance is lost.

Edge cases for the editor:
- Do **not** also delete the analogous "the defaults are *upper bounds*, not target performance" phrasing in the *Keys read* subsection — that one carries no untestable qualifier and is a useful framing for the three `scanPackages*` keys.
- Do **not** replace the deleted sentence with a fabricated reference workload (e.g. "≤500 packages, ≤4 KB each, 500 ms on reference hardware"). The spec defines no reference hardware profile, V14m has no leaf for performance benchmarking, and inventing one creates a new testability problem worse than the one being fixed.

## Related Findings

- "Per-`package.json` read timeout: overrun is unbounded" — same-cluster (same paragraph in `discovery.md` §"Package discovery"; both concern the testability of the package-walk cap regime, but resolve independently — that finding adds a new per-read timeout, this one removes a sentence)

---

# Per-`package.json` read timeout: overrun is unbounded

**Original heading:** Per-`package.json` read timeout: overrun is unbounded
**Kind:** testability

## Finding

`spec_topics/discovery.md` (Edge cases bullet under "Package discovery") states that the `looms.scanPackagesTimeoutMs` cap is checked "*before each new candidate-package read attempt*; a single very slow read is not aborted mid-flight (deferred hardening)." The two `looms.scanPackages*` caps therefore only bound the number of *completed* reads and the elapsed wall-clock measured *between* reads — they place no upper bound on the time a single in-flight `package.json` open/read may consume.

The practical consequence is that a discovery walk can hang indefinitely on a single slow read (a stalled NFS mount, a FUSE filesystem with a wedged backing process, an EBS volume mid-failover, an antivirus driver holding an open). Because this read is performed during `session_start` (the `resources_discover` handler installed by V14t and exercised by V14m), an indefinite hang blocks slash-command registration for the whole session — not just the offending package — and the operator gets no `loom/load/discovery-slow` warning, because the cap-check site never fires while the read is suspended.

The deferral is also untestable as currently written. V14m's test list includes a `FakeClock`-driven case that "exceeds `looms.scanPackagesTimeoutMs` … stepped between candidate-package read attempts to push elapsed `Clock.now()` past the cap" — which exercises the cap *in the same shape the spec admits is the limitation*, not the slow-read case. Without a normative statement of overrun behaviour (a per-read deadline, or an explicit "no bound, tests MUST NOT assert" carve-out), conformance test authors cannot tell whether a 10-minute hang on a single read is a defect, an acceptable consequence of the deferral, or a violation of the `looms.scanPackagesTimeoutMs` contract.

## Spec Documents

- `spec_topics/discovery.md` — Package discovery → Edge cases bullet (the "package walk is bounded" paragraph) (edited)
- `spec_topics/discovery.md` — Package discovery → `looms.scanPackages*` settings entries (option-dependent)
- `spec_topics/diagnostics.md` — `loom/load/discovery-slow` registry row (option-dependent; reused-as-is or rephrased depending on option)
- `spec_topics/diagnostics.md` — `loom/load/unreadable-source` registry row (option-dependent; one option re-routes hung reads through this code)
- `spec_topics/future-considerations.md` — surface-extensions list (option-dependent; one option records "per-read deadline" as a deferred-feature seam)
- `spec_topics/pi-integration-contract.md` — `Clock` / `FakeClock` interface (read-only; the seam any option-A implementation would build the deadline on already exists)

## Plan Impact

**Phases:** Vertical V14

**Leaves (implementation order):**

- V14m — Discovery: package `looms/` and `pi.looms` — (modified)

The V14m **Adds** paragraph already names the two caps and the opt-out; under any option below, the prose grows by one clause (per-read deadline, or "overrun unspecified") and the **Tests** list grows by one case. No other plan leaf grep-matches the per-read-timeout concept; V14n / V14o reuse the *settings file* read mechanism, not the package-walk read mechanism, so they are unaffected.

## Consequence

**Severity:** correctness

A single hung `package.json` read on a slow or wedged filesystem can block `session_start` indefinitely, preventing every loom (not just the offending package's) from registering and producing no `loom/load/discovery-slow` warning to tell the operator what happened. Two reasonable implementations will diverge: one will wrap reads in a deadline and surface a recoverable diagnostic, the other will trust the OS and hang. The spec currently sanctions both.

## Solution Space

**Shape:** multiple

### Option A — Per-read deadline derived from the global cap

**Approach.** Define a per-`package.json` read deadline as `max(200 ms, floor(looms.scanPackagesTimeoutMs / 10))` (so the default `2000 ms` cap yields a `200 ms` per-read deadline; an operator who raises the global cap automatically raises the per-read budget). Each candidate read is wrapped in `Promise.race([read, Clock.setTimeout(deadline)])`; on timeout the in-flight read is abandoned (no cancellation contract on `fs.readFile` is required — the handle is dropped and GC'd), the package is treated as unreadable for this scan, a `loom/load/unreadable-source` warning is emitted naming the package and the per-read-deadline cause, and the walk continues with the next candidate.

**Spec edits.**
- Replace the "deferred hardening" parenthetical in `discovery.md`'s Edge cases bullet with the per-read-deadline rule, naming the formula and the diagnostic.
- Add a sentence to the `loom/load/unreadable-source` registry row in `diagnostics.md` listing the per-read deadline as one of its causes, with a `details.kind = "package-read-timeout"` discriminator and a message template like `package '<name>' package.json read exceeded <deadline>ms during package discovery`.
- No new settings key; the per-read deadline is derived, not configurable, in V1.

**Pros.** Closes the indefinite-hang hole; reuses the existing `Clock` seam and `FakeClock.advance(ms)` so the V14m test list gains a deterministic slow-read case (a `FakeFileSystem.readFile` that returns a never-resolving `Promise` advances `FakeClock` past the deadline and asserts on the diagnostic); single normative number; operator-controllable indirectly by raising the global cap.

**Cons.** Adds a `Promise.race` + timer per read on the hot path of `session_start`; needs a small spec note about what "abandoned" means for the dangling `fs.readFile` Promise (it resolves later into a void); ties the per-read budget to a derivation that some operators may find surprising (raising the global cap from `2000` to `60000` makes per-read `6000 ms`, which may be unexpectedly lax).

**Risks.** A pathological filesystem could refuse to release the file descriptor for the abandoned read, accumulating fds across discovery passes; mitigated by recording but not requiring an `AbortController`-based cancellation — the runtime drops the reference and the OS reclaims when the FS recovers.

### Option B — Document overrun as unspecified; bar tests from asserting on it

**Approach.** Replace the "deferred hardening" parenthetical with an explicit normative carve-out: "If a single `package.json` read blocks for longer than `looms.scanPackagesTimeoutMs`, V1 places no upper bound on session-startup latency; the cap measures elapsed time *between* read attempts only. Conformance tests MUST NOT assert on `looms.scanPackagesTimeoutMs` behaviour in the presence of synthetic blocking reads. Operators on slow or unreliable filesystems SHOULD set `looms.scanPackages: false` and use explicit settings `looms` entries." Record the per-read deadline on `future-considerations.md` as a named V1.x seam.

**Spec edits.**
- Rewrite the parenthetical as the normative carve-out above.
- Add a one-line note to the `looms.scanPackages: false` description in `discovery.md` cross-referencing the carve-out as the recommended escape hatch.
- Add an entry to `future-considerations.md` ("Per-read deadline for package-discovery walks") referencing this carve-out as the V1 disposition.
- No `diagnostics.md` change.

**Pros.** Zero implementation cost; consistent with the existing "deferred hardening" framing; gives operators an existing escape hatch (`looms.scanPackages: false`); makes the testability question well-defined by closing it.

**Cons.** Leaves the indefinite-hang hole open in V1 — a wedged filesystem still blocks `session_start` with no operator-visible signal; relies on operators knowing to set the opt-out *before* the first session_start tries to scan; the carve-out conflicts with the spirit of `looms.scanPackagesTimeoutMs` being labelled an "upper bound" in operator-facing wording.

**Risks.** Field reports of mysterious extension hangs become a support burden; the hot-reload path (V14t / V18f) re-runs the walk on every `reason: "reload"`, so a wedged FS keeps biting after the first occurrence.

### Recommendation

Option A. The per-read deadline closes the indefinite-hang hole, reuses the `Clock` seam V14m already depends on, and is testable with the `FakeClock` infrastructure H2 ships. The derivation `max(200 ms, floor(looms.scanPackagesTimeoutMs / 10))` keeps the operator surface (one settings key, two caps) unchanged.

Implementer must watch:

- The abandoned read's Promise will eventually resolve or reject; the runtime MUST attach a `.catch(() => {})` to silence unhandled-rejection warnings without re-routing the late result back into the discovery pass.
- The per-read timer MUST be scheduled through the injected `Clock.setTimeout` (not the global `setTimeout`), or the `FakeClock` test in V14m's list cannot drive it deterministically.
- When the deadline fires, the package is treated as unreadable for *this scan only* — a subsequent reload must re-attempt, not cache the timeout outcome — matching the existing rule that `loom/load/unreadable-source` is per-pass.
- If the per-read deadline fires but the global `looms.scanPackagesTimeoutMs` would also have tripped on the next iteration, the per-read warning is emitted first and the global `loom/load/discovery-slow` warning still fires from the cap-check site at the next candidate (no suppression rule needed).

## Related Findings

- "Discovery bound \"well under caps\" is qualitative and untestable" — same-cluster (both touch the testability of the package-walk timing contract; resolve independently — Option B above would partly subsume the "well under" issue, Option A would not)
- "`tool_loop.max_iterations`: bounds, validation, and configurability unspecified" — same-cluster (different ceiling, same shape — operator-tunable bound with under-specified validation/edge-case behaviour)

## spec_topics/errors-and-results.md

---

# `cause` vs `reason` sub-discriminator fields inconsistent across error variants

**Original heading:** `cause` vs `reason` sub-discriminator fields inconsistent across error variants
**Kind:** naming

## Finding

Three `QueryError` variants in `spec_topics/errors-and-results.md` carry a wire-level field that refines the top-level `kind` discriminator into a finer-grained sub-category, but the field is named two different things:

- `ValidationError.cause: "schema_validation" | "empty_template"`
- `CodeToolError.cause: "validation" | "execution" | "cancelled" | "unknown_tool"`
- `InvokeInfraError.reason: "load_failure" | "parse_failure" | "validation" | "panic" | "internal_error"`

The semantic role is identical in all three cases — a closed enum that partitions a single `kind` into design-level sub-arms that authors `match` on when they need arm-specific recovery. No other `QueryError` variant carries a sub-discriminator, so these three define the entire population.

The spec acknowledges the split in passing — the `ValidationError` body says `"consistent with the established `CodeToolError.cause` / `InvokeInfraError.reason` patterns"` — but that aside is the only place the divergence is mentioned, and it does not justify the choice. There is no glossary note, no naming convention page, and no rule that says "infra-class envelopes use `reason`, content-class envelopes use `cause`" (or any other rationale that would predict which name a future fourth variant should pick). Authors writing `match` patterns must memorise the variant-by-variant mapping, and a future variant author has no rule to consult.

## Spec Documents

- `spec_topics/errors-and-results.md` — `QueryError variants` (edited)
- `spec_topics/glossary.md` — new entry under Option B; structural touch under Option A (edited)
- `spec_topics/invocation.md` — Failures section, references to `InvokeInfraError { reason: ... }` (option-dependent)
- `spec_topics/query.md` — Failure-mode references to `ValidationError.cause` arms (read-only)
- `spec_topics/tool-calls.md` — Failures section, references to `CodeToolError { cause: ... }` (read-only)
- `spec_topics/cancellation.md` — references to `InvokeInfraError { reason: "panic" }` and the `CodeToolError { cause: "cancelled" }` arm (option-dependent)

## Plan Impact

**Phases:** Vertical V5, V6, V7, V11, V13, V14, V15, V18

**Leaves (implementation order):**

- V5g — `QueryError` union — initial variants — (modified)
- V6i — Synthesised respond tool: schema lowering, AJV-validating `execute`, per-mode wiring — (modified)
- V7f — Object/schema pattern with field shorthand — (modified)
- V11i — Runtime depth cap of 5 — (modified)
- V13j — Respond-repair preserves tool-call side effects — (modified)
- V14f — `CodeToolError` variant: `validation` cause — (modified)
- V14g — `CodeToolError` variant: `execution` cause — (modified)
- V14h — `CodeToolError` variant: `cancelled` cause — (modified)
- V14i — `CodeToolError` variant: `unknown_tool` cause — (modified)
- V14s — `tools:` resolution-snapshot invariants — (modified)
- V15a — `invoke("./path.loom", ...)` parsing and resolution — (modified)
- V15d — Positional argument binding for `invoke` — (modified)
- V15e — `.loom` paths in `tools:` (default basename naming) — (modified)
- V15l — `InvokeInfraError` variant — (modified)
- V18c — `AbortSignal` before every tool call — (modified)
- V18n — Panic routing: `invoke` parent surface — (modified)

(Under Option B — glossary note only — only V15l plus a single glossary leaf are modified; the leaves above are option-dependent on Option A.)

## Consequence

**Severity:** advisory

Authors must memorise which of two field names a given variant carries when writing `match` arms; a wrong-field destructure (e.g. `InvokeInfraError { cause: "panic" }`) does not match — under the V1 pattern grammar an unmet listed field is a non-match, not a parse error — so the arm silently falls through and authors hit a `MatchError` panic at runtime instead of getting an early signal. The runtime is unambiguous and conformant in either naming, so no observer divergence; the cost is author cognitive load and a recurring footgun for every new author and every new sub-discriminated variant added in V1.x.

## Solution Space

**Shape:** multiple

### Option A — Standardise to `cause` across all three variants

**Approach.** Rename `InvokeInfraError.reason` to `InvokeInfraError.cause` on the wire and in every spec / plan reference. The enum values stay unchanged. Add a one-sentence glossary entry for `cause` defining it as "the closed sub-discriminator that refines a `QueryError.kind` into design-level sub-arms; every variant whose `kind` partitions into multiple causes carries this field."

**Spec edits.**
- `errors-and-results.md`: rename the `reason` field on the `InvokeInfraError` schema; rewrite the in-body aside to drop the `/ InvokeInfraError.reason` half; update the Runtime panics paragraph (two occurrences of `reason: "panic"` and `reason: "internal_error"`).
- `invocation.md`, `cancellation.md`: rewrite every `InvokeInfraError { reason: ... }` reference.
- `glossary.md`: add a `cause` entry per above.

**Pros.**
- Two of three variants already use `cause`; the rename moves the minority, not the majority.
- The label "cause" reads more naturally for a sub-category-of-failure role than "reason," which is also overloaded with the runtime-event `reason` field on `resources_discover` (V14t).
- A single name is the only convention that scales without further glossary maintenance as future variants land.

**Cons.**
- Wire-format change. `InvokeInfraError` envelopes currently emit `{ "kind": "invoke_failure", "reason": "panic", ... }`; consumers (telemetry, log scrapers, future Pi-side tooling) must follow.
- Touches more plan leaves (sixteen, listed above) than Option B.

**Risks.** Negligible at this stage — the spec is pre-V1 and there is no shipping wire contract to break. The risk is editorial drift (missing one of the call-site references in `invocation.md` / `cancellation.md`); a coverage-matrix grep for `reason\s*:` constrained to `InvokeInfraError` contexts catches stragglers.

### Option B — Document the split as intentional

**Approach.** Keep both field names. Add a glossary entry that names the convention (e.g. "`cause` is used when the sub-arm reflects a failure mode the loom author can act on; `reason` is used when the sub-arm reflects an infrastructure outcome opaque to author recovery"), and a one-sentence note in the `QueryError variants` preamble pointing at the glossary.

**Spec edits.**
- `errors-and-results.md`: replace the single in-body aside with a normative paragraph naming the convention and forward-linking to the glossary.
- `glossary.md`: add paired `cause` and `reason` entries that state the rule and cite the variants on each side of it.

**Pros.**
- Zero wire-format change.
- Plan impact is limited to V15l (cross-link to the new glossary entry) plus the glossary work.

**Cons.**
- Bakes in a two-name convention that future variant authors must consult before naming a new sub-discriminator.
- The proposed "infra vs author-actionable" distinction is fragile: `CodeToolError.cause: "execution"` is also opaque to author recovery, and `InvokeInfraError.reason: "validation"` is just as actionable as `ValidationError.cause: "schema_validation"`. Any rule the glossary writes will have edge cases.
- Adds normative surface — every new variant requires the author to choose a side and defend it.

**Risks.** The convention prose is itself a recurring naming-discipline maintenance burden; any future variant added in V1.x triggers a debate the rename in Option A would have foreclosed.

### Recommendation

Option A — standardise to `cause`. Implementer must update every `InvokeInfraError { reason: ... }` reference, including the V18n panic-routing tests that pattern-match on the literal field name, and rename the `InvokeInfraError.reason` arm tag in V15l's enum declaration. The wire `kind: "invoke_failure"` discriminator stays unchanged (only the inner sub-discriminator field name moves), so all `match` arms keyed on `kind` are unaffected.

## Related Findings

- "`ActiveInvocationRegistry` vs `activeInvocations` — two names for the same object in session_shutdown handler" — same-cluster (same naming-discipline failure mode: one concept, two names; resolves independently).
- "'response-repair' used alongside canonical 'respond-repair'" — same-cluster (same naming-discipline failure mode; resolves independently).
- "'slug' and 'Canonical schema hash' are two names for the same concept; neither is in the glossary" — same-cluster (same failure mode; resolves independently).
- "'ambient tool set' not reconciled with Pi SDK's 'active tools'" — same-cluster (cross-surface naming reconciliation; independent).
- "Error-shape detail in Trust boundary belongs in Tool Calls" — same-cluster (touches `QueryError` variant surface; resolves independently).

## spec_topics/future-considerations.md

---

# V1 seam-preservation MUSTs hidden inside the deferred-features narrative page

**Original heading:** V1 normative requirements (MUSTs) embedded inside deferred-features document
**Kind:** scope

## Finding

`spec_topics/future-considerations.md` is classified `(no IDs — narrative)` in the GOV-3 REQ-ID prefix table. Per GOV-3 it is excluded from REQ-ID extraction; per GOV-9 a section-level link to it suffices and triggers no closure obligation; per GOV-10 / GOV-11 an implementer who restricts their reading to the topic pages listed in their plan leaf's `**Spec**` field will not transitively pick it up. The page is therefore unreachable through the corpus's own reading-discipline rules.

It nonetheless carries normative V1 obligations on implementer architecture, embedded in the *Surface extensions (V1 leaves a seam)* section as conditions the V1 carriers MUST preserve so the deferred features can land additively. Two examples:

1. The **Binder refinement loop** bullet asserts that "three V1 carriers preserve the post-V1 migration and must not be 'simplified' away": (i) the binder envelope schema's three-arm `ok | needs_info | ambiguous` discriminator (collapsing to two arms is breaking); (ii) the `ambiguous.candidates` field staying in the schema even though V1 suppresses it (dropping it is breaking); (iii) the per-arm `loom /<name>:` system-note prefix grammar (collapsing the two failure-arm prefixes is breaking). `binder.md` documents each of (i)–(iii) individually as V1 behaviour (envelope schema §; system-note rendering rule 5; failure-mode templates table). It does *not* aggregate them as a seam-preservation contract or attach the "must not be simplified" obligation to any of the three; that framing exists only in `future-considerations.md`.

2. The **Symlink-resolution hardening for invoke-path containment** bullet asserts in its *Anchored at:* clause that "the path-resolution call site in the invoke runtime is a single named function used by both load-time and invocation-time checks; replacing its body is additive." `invocation.md` describes the load-time and invocation-time `realpath`+containment checks but never pins the structural V1 mandate — that the call site MUST be factored as a single named function shared between the two sites — anywhere in its own text.

The asymmetry is visible elsewhere in the same section: the **Named-argument / key=value invocation syntax** bullet's V1 seam ("the AST node carries a `style: "positional" | "named"` discriminator; consumers MUST switch exhaustively") is correctly mirrored as a normative `> **V1 seam — named-argument invocation.**` block in `invocation.md` (with the discriminator-switch MUST stated locally), so a V15 implementer reading only `invocation.md` sees the obligation. The two cases above are the defect: a V15 / V16 implementer reading only the leaf's listed topic pages preserves neither structure, and a future revision that lands either deferred feature discovers the V1 carriers were silently simplified.

A scan of the same section turns up further candidates that carry V1 architectural mandates phrased as seam descriptions rather than as MUSTs on a topic page — at minimum the *Typed-query support* "single named runtime constant", the *Mid-loom user-session replacement* "single captured reference", the *Pi-owned subagents* "single named set", and the *Package-style imports* "single `Resolver` seam". Each is the same shape: a V1 implementation choice the deferred extension depends on, asserted only on the deferred-features page. The fix should sweep the section rather than patch the two examples.

## Spec Documents

- `spec_topics/future-considerations.md` — *Surface extensions (V1 leaves a seam)* (edited)
- `spec_topics/binder.md` — *Binder envelope schema*, *System-note rendering* rule 5, *Failure-mode templates* (edited)
- `spec_topics/invocation.md` — *Resolution* (edited)
- `spec_topics/governance.md` — GOV-3 prefix table, GOV-9 cross-link form, GOV-10 plan-leaf reading scope, GOV-11 Spec-field closure (read-only)
- `spec_topics/imports.md` — *Resolver interface* (option-dependent; edited only if the sweep covers the package-style imports seam)
- `spec_topics/pi-integration-contract.md` — *Provider compatibility for typed queries*, *Conversation drive — prompt mode*, *Extension entry point* (option-dependent; edited only if the sweep covers the typed-query, mid-loom-replacement, or Pi-owned-subagents seams)
- `plan_topics/h6-req-ids.md` — narrative-page exclusion list (read-only; remains correct as long as `future-considerations.md` stays narrative after the sweep)

## Plan Impact

**Phases:** Horizontal (H6), Vertical (V15, V16); Vertical (V17) is option-dependent.

**Leaves (implementation order):**

- H6 — REQ-ID anchor insertion and coverage-matrix re-pivot — (modified)
- V15a — `invoke("./path.loom", ...)` parsing and resolution — (modified)
- V15e — `.loom` paths in `tools:` (default basename naming) — (modified)
- V16c — Binder envelope schema construction — (modified)
- V16l — `needs_info` envelope handling — (modified)
- V16m — `ambiguous` envelope handling — (modified)
- V16o — Binder malformed envelope handling — (modified)
- V17 leaves carrying the `Resolver` seam — (option-dependent)

H6's exclusion list keys off the `(no IDs — narrative)` cell. If the sweep moves obligations *out* of `future-considerations.md` to topic pages that already carry prefixes, H6 picks them up automatically and the exclusion list is unchanged. If instead the sweep promotes `future-considerations.md` to a normative page (the rejected option below), H6's exclusion list and the prefix-table row both need to flip in the same commit.

V15 / V16 leaves are listed as *modified* because each currently sources its V1 carrier shape from the topic page only; under the fix they will additionally need to honour an explicit seam-preservation MUST that lands on the topic page (i.e. the leaf's tests grow an assertion that the structural distinction is preserved, not just that the V1 behaviour is correct).

## Consequence

**Severity:** correctness

An implementer working a V15 or V16 leaf under GOV-10 reads `invocation.md` or `binder.md` and sees no obligation to factor the path-resolution call site as a shared single function, or to keep the binder envelope's three-arm discriminator and `candidates` field structurally intact even though V1 ignores them. A reasonable optimising implementer collapses either: a single inlined `realpath`+containment block at each call site, or a two-arm envelope that conflates `needs_info` and `ambiguous` since V1 surfaces both as terminating system notes. Both choices ship a working V1 and silently break the deferred feature when it lands. The defect is unreachable through the corpus's own gates: the coverage-matrix gate (GOV-2 / GOV-6) cannot key on REQ-IDs that do not exist; the closure gate (GOV-11) does not pull narrative pages into the leaf's `**Spec**` field.

## Solution Space

**Shape:** single

### Recommendation

Sweep the *Surface extensions (V1 leaves a seam)* section of `future-considerations.md` and, for every bullet whose seam description carries a V1 architectural obligation, lift that obligation to the owning topic page as an explicit `> **V1 seam — <name>.**` block (matching the form already used by *V1 seam — named-argument invocation* and *V1 seam — per-call timeout* in `invocation.md`). Each lifted block lands inside the topic page's normative body, picks up a fresh REQ-ID under that page's prefix when H6 runs, and remains the canonical home; the `future-considerations.md` bullet retains only a description of the deferred feature plus an *Anchored at:* link to the new block.

Concretely for the two cited examples:

- **Binder refinement loop.** Add a `> **V1 seam — binder refinement loop.**` block to `binder.md` (a natural site is immediately after the existing seam paragraph at line 51) that names all three V1 carriers explicitly and binds them with MUST: "the envelope schema MUST retain the three-arm `ok | needs_info | ambiguous` discriminator; the `ambiguous.candidates` field MUST remain in the schema (binder may emit it; AJV accepts `null`); the failure-mode template table MUST keep distinct `needs_info` and `ambiguous` row prefixes." Each MUST is testable: V16c asserts the three-arm shape; V16m asserts `candidates` is schema-accepted but unrendered; V16l / V16m together assert the prefixes diverge.
- **Symlink-resolution hardening.** Add a `> **V1 seam — symlink-resolution hardening.**` block to `invocation.md` immediately after the *Resolution* paragraph that pins: "the V1 implementation of the `realpath`+discovery-root-containment check MUST be exposed as a single named function reused by the load-time check and the invocation-time re-check; future hardening replaces the function body in place." V15a's `Tests` line then grows a structural assertion (e.g. that the load-time and invocation-time call sites resolve to the same function reference, or via a code-grep test in V18-class infrastructure).

Apply the same lift to every other bullet in the section whose *Anchored at:* clause asserts a V1 structural promise rather than merely pointing at where V1 already documents the seam — at minimum the four candidates flagged in the Finding (typed-query single named constant, mid-loom-replacement single captured reference, Pi-owned-subagents single named set, package-style imports single `Resolver` seam). The sweep is bounded by the section length and is a one-pass mechanical edit; the GOV-12 lock-step convention does not apply because `future-considerations.md` is not a `spec.md` aggregator.

Edge cases for the implementer of the fix:

- The lift must preserve the deferred feature's reverse link. After lifting, the `future-considerations.md` bullet keeps a one-line summary plus *Anchored at: [Topic — V1 seam: <name>](./topic.md#…)* pointing at the new block's anchor. The reverse direction (topic-page block citing the deferred feature) already exists implicitly via the seam name; no further linking is required.
- `future-considerations.md` stays classified `(no IDs — narrative)` after the sweep — the page becomes purely descriptive, which is its declared purpose. Promoting it to a normative page would require GOV-7 *Narrative-to-normative promotion*, GOV-7 *Add* of a fresh prefix, an H6 re-run scope expansion, and a coverage-matrix re-pivot; the lift accomplishes the same outcome without those mutations.
- A bullet whose seam description merely *restates* an obligation already pinned on the topic page (e.g. *Per-call timeouts*, where `invocation.md` already carries the open-struct seam) needs no lift; the sweep skips it.
- The H6 anchor pass already excludes `future-considerations.md`. After the sweep, the bullets that remain on the page carry no MUSTs, so H6's exclusion remains correct without modification.

## Related Findings

- "Open design question left unresolved in seam anchor" — same-cluster (same section of `future-considerations.md`; the unresolved-question bullet should be addressed as part of the same sweep, since the lift forces a decision about whether the open question's resolution affects a V1 seam)
- "18 deferred features with no prioritization or likelihood signal" — same-cluster (same section, independent concern; tiering can land in the same edit pass without interaction)
- "No REQ-IDs assigned anywhere in spec.md; normative obligations in hub are unciteable" — same-cluster (parallel structural defect — normative content in a non-prefixed page; the architectural argument is the same but the remedies are independent)
- "GOV-12 aggregator labels are editor instructions embedded in normative text" — same-cluster (also concerns where normative content is allowed to live; this finding's recommendation reinforces GOV-12's discipline by removing one more source of normative drift outside topic pages)

---

# Unresolved scoping question embedded in deferred-feature seam anchor

**Original heading:** Open design question left unresolved in seam anchor
**Kind:** scope

## Finding

The "Automatic context escalation" bullet in `spec_topics/future-considerations.md` (line 47) names its V1 anchor — *Slash-Command Argument Binding — Binder-invocation re-entrancy* in `spec_topics/binder.md` — and then closes with two annotations: a conditional `Depends on:` on the binder-refinement-loop bullet, and a `Decision required before this item can be scoped:` line about whether automatic escalation surfaces a user-visible turn or stays operator-only.

A reader scanning the seam-anchor list cannot tell, from the bullet alone, whether that "decision required" gates V1 or only the post-V1 design of the deferred feature. Reading the cited V1 seam in `binder.md` (the paragraph beginning "**V1 seam — automatic context escalation.**") shows that the seam is in fact independent: the binder-invocation path is declared re-entrant per loom turn with no cached state across calls, which supports the operator-only retry shape; the user-visible-turn shape would additionally consume the binder envelope's three-arm discriminator and `ambiguous.candidates` carrier, both of which the next future-considerations bullet pins independently. Both code-paths the open question chooses between are already covered by V1 seams.

The result is a documentation defect, not a spec hole: an open scoping question is parked inside a forward-compatibility anchor, where it reads as "the V1 seam may still be incomplete." A reviewer or implementer auditing seam closure has to chase two cross-references to confirm V1 is unaffected. The fix is to state V1-independence at the bullet and route the post-V1 scoping question out of the seam-anchor list.

## Spec Documents

- `spec_topics/future-considerations.md` — "Surface extensions (V1 leaves a seam)" — *Automatic context escalation* bullet (edited)
- `spec_topics/binder.md` — "V1 seam — automatic context escalation" paragraph (read-only)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None — `future-considerations.md` is marked "(out of scope)" in `plan_topics/coverage-matrix.md`; the change is editorial and ships no leaf-visible obligation.

## Consequence

**Severity:** advisory

A reader treating the seam-anchor list as the authoritative V1 readiness checklist will perceive the *binder-invocation re-entrancy* anchor as conditionally complete, pending an unowned design decision. Implementers may waste cycles validating that V1 actually preserves the seam, or worse, raise it as a V1 blocker. Nothing actually breaks at runtime.

## Solution Space

**Shape:** single

### Recommendation

Rewrite the *Automatic context escalation* bullet so the V1-seam claim and the post-V1 scoping question are visibly separated:

- Keep `Anchored at: [Slash-Command Argument Binding — Binder-invocation re-entrancy](./binder.md)`.
- Replace the conditional `Depends on:` and `Decision required before this item can be scoped:` lines with a single explicit clause stating that **the V1 seam supports both candidate shapes** (operator-only retry uses only the re-entrant binder-invocation path; user-visible-turn variant additionally composes with the *Binder refinement loop* seam — three-arm envelope discriminator and `ambiguous.candidates` carrier — already preserved by the next bullet), and that **the choice between shapes is a post-V1 design decision that does not affect V1 seam completeness**.
- Move the open scoping question itself ("operator-only vs. user-visible turn") into a new `## Open post-V1 design questions` section at the bottom of `future-considerations.md`, cross-linked from the bullet (e.g. "post-V1 design choice tracked under [Open post-V1 design questions](#open-post-v1-design-questions)"). The new section is non-normative and explicitly outside the seam-anchor enumeration.

Edge cases the implementer must check:

- The `Depends on:` annotation form is used elsewhere in the surface-extensions list (e.g. the `BinderError as a Loom-visible QueryError variant` bullet); the rewrite must keep the form's semantics intact for those bullets and only change this one.
- If any other future-considerations bullet carries a similar "Decision required before this item can be scoped" sentence (none does today, but verify with `grep -n 'Decision required' spec_topics/future-considerations.md` before merging), apply the same routing — every such sentence either resolves inline or moves to the new appendix.
- The new appendix must not accumulate normative MUSTs; it is an unresolved-questions register, not a back-door spec section. (See related finding on V1 MUSTs embedded in this same file.)

## Related Findings

- "V1 normative requirements (MUSTs) embedded inside deferred-features document" — same-cluster (both touch the boundary between normative and non-normative content in `future-considerations.md`; resolving this one establishes a pattern — Open-questions appendix vs. seam-anchor list — that the other resolution should respect)
- "18 deferred features with no prioritization or likelihood signal" — same-cluster (also a structural-organisation gap in `future-considerations.md`; resolves independently but a single editorial pass over the file could co-fix all three)

## spec_topics/glossary.md

---

# `GOV-N` glossary range is stale (says `GOV-1` through `GOV-8`, actual range is `GOV-1` through `GOV-14`)

**Original heading:** GOV-N range in glossary is stale (says GOV-8, actual is GOV-14)
**Kind:** naming

## Finding

The glossary entry for **GOV-N (governance rule)** in `spec_topics/glossary.md` describes the rules as "(`GOV-1` through `GOV-8`)". The authoritative page, `spec_topics/governance.md`, defines rules through `GOV-14` — `GOV-9` (cross-link form), `GOV-10` (plan-leaf reading scope), `GOV-11` (Spec-field closure), `GOV-12` (`spec.md` aggregator informativeness), `GOV-13` (V1.x source-language equivalence), and `GOV-14` (review posture on the V1.0-equivalence gate) all exist as live, numbered rules. The glossary's parenthetical was last updated when the corpus stopped at `GOV-8` and was not swept when the rule set grew.

The same stale range is reproduced in `plan_topics/coverage-matrix.md`: the Governance row in the spec-coverage table reads `Governance — REQ-ID prefix table, GOV-1 through GOV-8, Retired prefixes`. Two files therefore advertise an under-counted range; a reader who trusts either of them and stops at `GOV-8` will miss the cross-link rule (`GOV-9`), the reading-scope and closure rules that govern how plan leaves consume the spec (`GOV-10` / `GOV-11`), and the V1.x-equivalence posture (`GOV-13` / `GOV-14`).

## Spec Documents

- `spec_topics/glossary.md` — `GOV-N (governance rule)` entry (edited)
- `spec_topics/governance.md` — read-only; source of truth for the live `GOV-N` range
- `plan_topics/coverage-matrix.md` — Governance row in the spec-coverage table (edited)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None — neither H6 nor V18s changes its acceptance criteria; only the descriptive label of the Governance row in `coverage-matrix.md` is touched, and no leaf cites the `GOV-1`–`GOV-8` range as a test condition.

## Consequence

**Severity:** cosmetic

The glossary and the spec-coverage table both under-state the live `GOV-N` range. No tooling consumes the parenthetical (REQ-ID extraction is regex-driven per `GOV-3` and reads `governance.md` directly), so no gate breaks. The cost is reader confusion: an implementer who treats the glossary as a checklist of governance rules to read may stop at `GOV-8` and miss `GOV-9`–`GOV-14`, including the rules that govern how their own plan leaf consumes the spec (`GOV-10` / `GOV-11`).

## Solution Space

**Shape:** single

### Recommendation

Replace the literal `GOV-1` through `GOV-8` in both occurrences with `GOV-1` through `GOV-14`:

- `spec_topics/glossary.md`, `GOV-N (governance rule)` entry: change `(\`GOV-1\` through \`GOV-8\`)` to `(\`GOV-1\` through \`GOV-14\`)`.
- `plan_topics/coverage-matrix.md`, Governance row: change `GOV-1 through GOV-8` to `GOV-1 through GOV-14`.

To prevent recurrence, prefer a phrasing that does not embed the upper bound — e.g. "the `GOV-N` rules defined in [Governance](./governance.md)" — so future additions of `GOV-15`, `GOV-16`, … do not require sweeping these two sites. The numeric form is acceptable if the editor accepts that any future `GOV-N` addition must update both citations in the same commit.

## Related Findings

- "GOV-12 aggregator labels are editor instructions embedded in normative text" — same-cluster (both touch governance-rule citations but resolve independently)
- "GOV-13/GOV-14 source-language equivalence: SHOULD with no CI gate" — same-cluster (concerns the substance of `GOV-13`/`GOV-14`, which this finding only counts; independent fixes)

---

# "response-repair" appears in prose where canonical spelling is "respond-repair"

**Original heading:** "response-repair" used alongside canonical "respond-repair"
**Kind:** naming

## Finding

The glossary establishes `respond_repair` as the YAML key and "respond-repair" as the canonical hyphenated prose form. Two spec passages then violate that convention by using "response-repair" in the same sentence as the canonical form, producing local self-contradictions:

- `spec_topics/glossary.md` line 13 (the `respond_repair` entry): "Hyphenated as `respond-repair` in prose; … the response-repair loop above is the only 'repair' mechanism the spec defines."
- `spec_topics/frontmatter.md` line 139 (`respond_repair` prose): "The block configures **respond-repair** — the response-repair mechanism specified in [Query — Schema-validation respond-repair](./query.md)."

Every other occurrence in the spec corpus (frontmatter table rows, query.md headings, plan leaves under V13) uses "respond-repair". The two stray occurrences are the only "response-repair" tokens outside the review file itself.

## Spec Documents

- `spec_topics/glossary.md` — `respond_repair` entry (edited)
- `spec_topics/frontmatter.md` — `respond_repair` prose at line 139 (edited)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None

## Consequence

**Severity:** cosmetic

A naming-convention violation that the glossary itself flags by stating the canonical form one clause before breaking it. Implementers can still reach the right understanding because each offending sentence also contains the canonical spelling, but the inconsistency undermines the glossary's authority and invites the wrong spelling to spread on the next round of edits.

## Solution Space

**Shape:** single

### Recommendation

Replace "response-repair" with "respond-repair" at both sites:

- `spec_topics/glossary.md` line 13: change "the response-repair loop above" to "the respond-repair loop above".
- `spec_topics/frontmatter.md` line 139: change "the response-repair mechanism specified in" to "the respond-repair mechanism specified in".

No other occurrences of "response-repair" exist in the spec corpus, so a single targeted edit at each site is sufficient. After the edit, a repository-wide grep for `response-repair` (case-insensitive) should match nothing under `spec.md` and `spec_topics/`.

## Related Findings

- "GOV-N range in glossary is stale (says GOV-8, actual is GOV-14)" — same-cluster (another glossary self-inconsistency; resolves independently)
- "'ambient tool set' not reconciled with Pi SDK's 'active tools'" — same-cluster (glossary naming-consistency concern; resolves independently)
- "'slug' and 'Canonical schema hash' are two names for the same concept; neither is in the glossary" — same-cluster (cross-page naming consistency; resolves independently)
- "`.warp` file has no glossary entry" — same-cluster (glossary completeness; resolves independently)

---

# "ambient tool set" not reconciled with Pi SDK's `setActiveTools` / `getActiveTools`

**Original heading:** "ambient tool set" not reconciled with Pi SDK's "active tools"
**Kind:** naming

## Finding

The spec coins **ambient tool set** for the host Pi session's currently-active tools. The Pi SDK capability that exposes that exact concept is the `pi.getActiveTools` / `pi.setActiveTools` pair (capability 4 in `pi-integration-contract.md`'s SDK capability inventory). The two names are never explicitly equated.

The glossary's `callable set` entry introduces the phrase "the Pi session's *ambient tool set* (the host's currently-active tools)" and lists `tools: set`, `tool set`, `loom's tools`, and `available tools` as prose synonyms that erode the no-inheritance invariant — but it omits `active tools`, the one phrase a reader will form by inverting the SDK call name. The pi-integration-contract page uses `pi.getActiveTools` / `pi.setActiveTools` extensively (snapshot/restore protocol, capability inventory, the `loom/runtime/active-set-restore-failed` diagnostic) without ever using the phrase "ambient tool set" itself, and `frontmatter.md` uses "ambient tools" without an SDK link. The reader has to triangulate three pages to confirm that `pi.getActiveTools()` returns "the ambient tool set" and that the no-inheritance invariant is enforced by *not* propagating that snapshot into a child loom.

The result is a soft terminology gap. Implementers will still write the right code — the SDK call names are concrete on `pi-integration-contract.md` — but spec readers reasoning about the trust boundary, authors discussing inheritance, and reviewers checking the no-inheritance invariant lose the cross-reference, and `active tools` is liable to drift in unless explicitly listed as a synonym to avoid (parallel to the existing `available tools` entry).

## Spec Documents

- `spec_topics/glossary.md` — `callable set` entry (edited)
- `spec_topics/pi-integration-contract.md` — capability 4, Tool-registration lifetime and visibility (read-only)
- `spec_topics/frontmatter.md` — `tools:` field description (read-only)
- `spec_topics/invocation.md` — prompt → prompt cross-mode snapshot/restore paragraph (read-only)

## Plan Impact

**Phases:** None

**Leaves (implementation order):** None

(Pure terminology / glossary edit. No leaf acceptance criteria change; no leaves blocked or unblocked.)

## Consequence

**Severity:** advisory

Implementers cannot diverge — the SDK call names (`pi.getActiveTools` / `pi.setActiveTools`) are explicit on `pi-integration-contract.md` and the snapshot/restore protocol is fully specified. The cost is reader friction and a vacant slot in the synonyms-to-avoid list, which lets `active tools` creep into prose unchallenged and weakens the no-inheritance invariant's verbal barrier.

## Solution Space

**Shape:** single

### Recommendation

Edit the `callable set` glossary entry in `spec_topics/glossary.md` so that the sentence introducing the ambient-tool-set concept names the SDK surface that produces it, and the synonyms-to-avoid list covers `active tools`:

> The Pi session's *ambient tool set* (the host's currently-active tools, exactly what `pi.getActiveTools()` returns and what `pi.setActiveTools(...)` replaces — see [Pi Integration Contract — Tool-registration lifetime and visibility](./pi-integration-contract.md)) is deliberately *not* inherited; …

And extend the existing avoidance list:

> the bare phrases `tools: set`, `tool set`, `loom's tools`, `available tools`, and `active tools` are spec-prose synonyms to be avoided …

(`active tools` belongs on the avoidance list specifically because the SDK call name invites it; the glossary should reserve `ambient tool set` for the host concept and `callable set` for the per-loom concept.)

Edge cases for the fixer:

- Do **not** touch `pi-integration-contract.md`'s use of `pi.getActiveTools` / `pi.setActiveTools` — those are SDK identifiers, not prose, and must remain verbatim.
- The diagnostic code `loom/runtime/active-set-restore-failed` contains the substring `active-set` — leave it untouched; diagnostic code names are wire contract.
- Do not coin a new top-level glossary entry for `ambient tool set`; folding the cross-reference into the existing `callable set` entry preserves the asymmetry the spec deliberately wants (callable set is a normative term; ambient tool set is a foil mentioned only to deny inheritance).

## Related Findings

- "`@mariozechner/` scope omitted for sibling packages in spec.md" — same-cluster (independent naming-consistency finding)
- ""response-repair" used alongside canonical "respond-repair"" — same-cluster (glossary / prose terminology drift)
- ""slug" and "Canonical schema hash" are two names for the same concept; neither is in the glossary" — same-cluster (missing glossary entry / SDK-vs-spec naming reconciliation)
- "`.warp` file has no glossary entry" — same-cluster (glossary completeness)
- ""Registered loom" deprecated term in return-type table" — same-cluster (deprecated synonym left in prose, parallel to `active tools` slipping in)
- ""name-link" coined verb; "belt-and-braces" idiom" — same-cluster (vocabulary discipline)

---

# Schema-hash identifier is referred to by six surface names; none are in the glossary

**Original heading:** "slug" and "Canonical schema hash" are two names for the same concept; neither is in the glossary
**Kind:** naming

## Finding

The 16-hex-character SHA-256 truncation that content-addresses every lowered JSON Schema fragment is the most heavily cross-referenced identifier in the runtime contract — it keys the per-extension `pi.registerTool` cache, names the synthesised `__inline_…` `$defs` entries and `__loom_respond_…` typed-query tools, and keys the AJV compiled-validator cache. `schema-subset.md` defines the recipe under the heading **Canonical schema hash** and, in step 4 of that recipe, names the resulting value the **Slug** ("first 16 hex characters of the digest, lowercased"). Everywhere else, the spec uses one of at least six interchangeable surface forms:

- `<slug>` — the placeholder used in every `__inline_<slug>`, `__loom_respond_<slug>`, and `__loom_callee_<slug>__…` template (`schema-subset.md`, `query.md`, `implementation-notes.md`, `pi-integration-contract.md`).
- `<sha12>` — the placeholder used for the same identifier in `pi-integration-contract.md`'s prompt-mode registration paragraph (`__loom_callee_<sha12>__<post-rename-name>`, `__loom_respond_<sha12>`).
- "canonical schema hash" — used as both the recipe name and (informally) the resulting value in `pi-integration-contract.md`, `implementation-notes.md`, `query.md`, and `diagnostics.md`.
- "schema hash" — the type parameter of the registration cache (`Map<schema-hash, registeredToolName>` in `pi-integration-contract.md`).
- "the colliding slug" — used by `loom/runtime/registration-cache-collision` in `diagnostics.md`.
- "lowered-schema hash" / "lowered-schema content hash" — used as the validator cache key in `implementation-notes.md` and as the registration cache key in plan leaves derived from `pi-integration-contract.md`.

None of these terms appears in `glossary.md`, despite the spec's own rule that a coined term reused on more than one page warrants an entry. The relationship between "canonical schema hash" (the recipe / algorithm) and "slug" (its 16-hex output) is buried in step 4 of one section of one page; a reader landing on `pi-integration-contract.md`'s `Map<schema-hash, registeredToolName>` or `diagnostics.md`'s "the colliding slug" has no anchor to confirm that "schema hash", "slug", "canonical schema hash", and `<sha12>` all denote the same 64-bit truncation. The drift is internally inconsistent inside single sections too (`pi-integration-contract.md` switches between `<sha12>` and `<slug>` for the same template names; `v6-typed-queries.md` does the same in adjacent sentences).

## Spec Documents

- `spec_topics/glossary.md` — alphabetised vocabulary list (edited)
- `spec_topics/schema-subset.md` — `## Canonical schema hash` section, step 4 "Slug" (edited)
- `spec_topics/pi-integration-contract.md` — *Tool-registration lifetime and visibility*, *V1 diagnostic limitation* (edited)
- `spec_topics/query.md` — typed-query forced-respond paragraph and template body (edited)
- `spec_topics/implementation-notes.md` — *Runtime* — synthesised respond tool, `LoweredSchema` interface (edited)
- `spec_topics/diagnostics.md` — `loom/runtime/registration-cache-collision` row (edited)
- `spec_topics/errors-and-results.md` — `cause: "schema_validation"` paragraph (read-only; references the synthesised respond tool by name)
- `spec_topics/future-considerations.md` — diagnostic-placeholder closure list (read-only; lists `<slug>` as an unclosed placeholder)

## Plan Impact

**Phases:** Horizontal H4, Vertical V4, V6, V12, V14, V18

**Leaves (implementation order):**

- H4 — Pi extension shell — (modified)
- V4a — AJV pipeline scaffold — (modified)
- V4f — Inline anonymous object hoisting — (modified)
- V6i — Synthesised respond tool: schema lowering, AJV-validating `execute`, per-mode wiring — (modified)
- V12a — `mode: subagent` accepted; AgentSession spawn — (modified)
- V14e — Pi tool wired into `@` queries as model-callable — (modified)
- V18f — File watcher (chokidar) over discovery roots — (modified)

Each leaf cites the schema-hash identifier under one of the surface forms above (`Map<schema-hash, registeredToolName>`, "lowered-schema content hash", "lowered-schema hash", `__loom_respond_<sha12>` / `__loom_respond_<slug>`, "the canonical hash"). All are *modified* (terminology sweep in `Adds` / `Tests` prose); none are *blocked* — the underlying mechanism is fully specified.

## Consequence

**Severity:** advisory

Every site that mentions the identifier means the same value, so an implementer following the cross-references will arrive at a working system. The cost is reviewer- and test-author-side: cross-referencing diagnostic codes, registration-cache invariants, and validator-cache hit rates requires mentally normalising five or six surface names, and within-paragraph drift (e.g. `__loom_respond_<sha12>` vs. `__loom_respond_<slug>` in `pi-integration-contract.md`) invites real typos into placeholder-rendering tests and conformance fixtures.

## Solution Space

**Shape:** single

### Recommendation

Pin two glossary entries and sweep the corpus to a two-term vocabulary:

1. **`canonical schema hash`** — the recipe defined in `schema-subset.md#canonical-schema-hash`. Use only when referring to the algorithm or the section.
2. **`schema slug`** (short form: `slug` when context is unambiguous) — the 16-lowercase-hex output of step 4 of that recipe. Use everywhere the spec or plan refers to the resulting identifier value.

Concretely:

- Add two `glossary.md` entries (alphabetised), each with a one-paragraph descriptor and a `See:` pointer to `schema-subset.md#canonical-schema-hash`. The `schema slug` entry must explicitly call out the synonyms to be avoided (`schema hash`, `schema-hash`, `sha12`, `lowered-schema hash`, `lowered-schema content hash`) so future drift is catchable by a grep gate.
- In `schema-subset.md` step 4, rename the bolded item from **Slug** to **Schema slug** so the canonical term appears at the source of truth.
- Sweep all six surface forms to `schema slug` (or `<slug>` in placeholder positions). In particular: `Map<schema-hash, registeredToolName>` becomes `Map<schemaSlug, registeredToolName>`; `__loom_callee_<sha12>__…` and `__loom_respond_<sha12>` become `__loom_callee_<slug>__…` and `__loom_respond_<slug>`; "the colliding slug" stays as-is; "lowered-schema content hash" / "lowered-schema hash" become "lowered-schema slug" or simply "schema slug".
- Plan leaves H4, V4a, V4f, V6i, V12a, V14e, V18f need the same sweep in their `Adds` / `Tests` prose.

Edge cases the implementer must watch:

- The diagnostic registry placeholder `<slug>` (called out in `future-considerations.md` as one of the still-unclosed identifier-shaped placeholders) is the same token; do not rename to `<schema-slug>` in placeholder positions, or the placeholder-rendering closure work will diverge from the rendering convention used by every other identifier-shaped placeholder.
- Wire-format identifiers (the literal characters Pi sees) must not change. The renames above are spec-prose only; the on-the-wire tool names `__loom_respond_<actual-16-hex-chars>` and `__loom_callee_<actual-16-hex-chars>__<name>` are unaffected.
- The byte-equality verification step in `pi-integration-contract.md` ("verify byte-equality of the cached canonical-form schema bytes against the new entry's canonical-form bytes before reusing the registration") still reads "canonical-form bytes" — that is the SHA-256 input, not the slug, and stays as-is. The recommendation only collapses names for the slug *output*.

## Related Findings

- "GOV-N range in glossary is stale (says GOV-8, actual is GOV-14)" — same-cluster (both are `glossary.md` corrections; co-edit naturally)
- "\"ambient tool set\" not reconciled with Pi SDK's \"active tools\"" — same-cluster (parallel glossary mapping for an SDK-vs-spec name divergence)
- "`.warp` file has no glossary entry" — same-cluster (another missing glossary entry under the same coverage rule)
- "\"response-repair\" used alongside canonical \"respond-repair\"" — same-cluster (terminology-consistency sweep with the same shape)
- "\"Registered loom\" deprecated term in return-type table" — same-cluster (terminology drift the glossary already prohibits)
- "\"name-link\" coined verb; \"belt-and-braces\" idiom" — same-cluster (coined-term hygiene in the orientation aggregator)
- "`cause` vs `reason` sub-discriminator fields inconsistent across error variants" — same-cluster (naming consistency across schemas, decided independently)

---

# `.warp` file: missing glossary entry

**Original heading:** `` `.warp` file has no glossary entry ``
**Kind:** naming

## Finding

`spec_topics/glossary.md` defines two paired entries — **loom (file unit)** and **Loom (language)** — but has no entry for `.warp`, even though the term is reused across at least 19 spec pages (`spec.md`, `imports.md`, `discovery.md`, `lexical.md`, `grammar.md`, `governance.md`, `expressions.md`, `functions.md`, `invocation.md`, `pi-integration-contract.md`, `pi-integration.md`, `errors-and-results.md`, `diagnostics.md`, `schema-subset.md`, `comparison.md`, `influences.md`, `future-considerations.md`, `implementation-notes.md`, plus the glossary's own incidental mentions). The glossary's preamble fixes the inclusion criterion explicitly: "Add new entries here when the spec coins a new term that is reused on more than one page." The `.warp` concept clears that bar by an order of magnitude.

The asymmetry is also navigationally hostile: a reader who reaches the glossary first to look up "what is a `.warp` file" finds the `.loom` answer (under **loom (file unit)**) but no parallel pointer for `.warp`, and must guess that the canonical page is `imports.md` rather than, say, `discovery.md` or `lexical.md` (both of which legitimately constrain `.warp` files too).

## Spec Documents

- `spec_topics/glossary.md` — alphabetised entry list (edited)
- `spec_topics/imports.md` — `.warp` file rules / path resolution / visibility / cycles (read-only — canonical page the new entry will reference)
- `spec_topics/discovery.md` — `.warp` excluded from slash-command discovery (read-only — secondary anchor to mention)
- `spec_topics/lexical.md` — extension matching rule for `.warp` (read-only)

## Plan Impact

**Phases:** None

**Leaves (implementation order):** None

`glossary.md` is enumerated as a pure-narrative page in `plan_topics/h6-req-ids.md` ("Pure-narrative pages (`overview.md`, `glossary.md`, …) are not visited and contribute no rows"), so it carries no REQ-IDs and no plan leaf has acceptance criteria over its content. Adding a glossary entry is a spec-only docs edit that no leaf gates or unblocks.

## Consequence

**Severity:** cosmetic

The canonical definition lives in `imports.md` and every implementer-facing rule about `.warp` is reachable by following links from the pages that introduce the term. The miss is an internal-consistency failure against the glossary's own inclusion rule, plus a small navigation papercut for readers who land on the glossary first; nothing observable changes in any implementation.

## Solution Space

**Shape:** single

### Recommendation

Insert a new alphabetised entry into `spec_topics/glossary.md`, placed between **`InvokeInfraError`** and **loom (file unit)** to preserve alphabetical ordering on the leading character `.` / `I` / `l` (treat `.warp` as sorting under `w` in the existing convention — the entry sits between **loom (file unit)** / **Loom (language)** and **loom-side name vs. wire name**, i.e. immediately after the `Loom (language)` row, mirroring how the `.loom` concept is grouped with its `Loom (language)` sibling). Body, parallel in shape to **loom (file unit)**:

> **`.warp` file (library module)** — A loom-language source file viewed as a shared library: it contains only top-level `import`, `export`, `schema`, `enum`, and `fn` declarations, has no entry point, and is invisible to slash-command discovery. Reachable only via `import` from a `.loom` or another `.warp`. Every top-level `schema` / `enum` / `fn` is implicitly exported. Queries inside a `.warp` `fn` execute against the calling `.loom`'s conversation; `invoke(...)` from a `.warp` resolves paths relative to the `.warp` file's own location. Cf. *loom (file unit)* above — the two file kinds share the Loom language but differ in role and discovery surface. See: [Imports](./imports.md), [Directory Convention](./discovery.md).

Edge cases the editor must keep consistent:

- The existing **loom (file unit)** and **Loom (language)** entries reference `.warp` in passing; do not duplicate that material — the new entry owns the cross-reference back.
- The **callable set** entry does not mention `.warp` and need not be touched.
- Honour the glossary preamble's "canonical page wins" rule by keeping the new entry descriptive: any normative tightening (e.g., the precise list of forbidden top-level forms) stays in `imports.md`.

## Related Findings

- "`slug` and `Canonical schema hash` are two names for the same concept; neither is in the glossary" — same-cluster (independent missing-glossary-entry issue with the same fix shape; resolve in the same editing pass)
- "GOV-N range in glossary is stale (says GOV-8, actual is GOV-14)" — same-cluster (another glossary-maintenance miss; co-edit in the same pass)
- "`response-repair` used alongside canonical `respond-repair`" — same-cluster (glossary self-consistency; touches the same file but resolves independently)
- "`ambient tool set` not reconciled with Pi SDK's `active tools`" — same-cluster (also a glossary completeness gap; independent fix)

## spec_topics/query.md

---

# `loom/parse/explicit-schema-mismatch`: "disagree" not anchored to the type compatibility relation

**Original heading:** `loom/parse/explicit-schema-mismatch` "disagree" undefined against type compatibility relation
**Kind:** testability

## Finding

`spec_topics/query.md` (Explicit form, paragraph after the `match` example) says the warning fires "if both a binding annotation and an explicit `<Schema>` are present, the explicit one is used (with `loom/parse/explicit-schema-mismatch` warning if they disagree)." The diagnostics-registry row for the same code (`spec_topics/diagnostics.md`, code-registry table) mirrors the wording: "Both a binding annotation and an explicit `@<Schema>` ascription are present and disagree."

"Disagree" is not a defined relation in this spec. `spec_topics/type-system.md` defines exactly one type-comparison relation, `T₁ ⊑ T₂` ("Type compatibility"), enumerated by an eight-row rule table; the same page is the normative referent for every other site that asks "may a `T₁` value be used where `T₂` is expected." Three readings of "disagree" survive this prose:

- **strict identity** — fires whenever `ascription ≠ annotation` syntactically (e.g. `let x: number = @<integer>\`...\`?` warns even though `integer ⊑ number` by Type-compatibility rule 2);
- **non-subtype** — fires only when `ascription ⋢ annotation` (i.e. when running with the explicit ascription would not produce a value the annotation would accept);
- **mutual incompatibility** — fires only when neither `⊑` direction holds.

Sibling sites in the spec already commit to one of these readings (e.g. `loom/parse/invoke-return-type-mismatch` is defined against the same `⊑` relation per `plan_topics/v15-invoke.md` V15c citation), so the omission here is asymmetric. Two implementers would diverge: a strict-equality reader fires the warning on `let x: number = @<integer>\`...\``, a subtype reader does not. The `V6h` plan leaf inherits the ambiguity verbatim — its **Tests** bullet says "wins over inference (with parse warning if it disagrees with binding annotation)" without naming the relation, so the test author cannot write the assertion.

## Spec Documents

- `spec_topics/query.md` — Explicit form (edited)
- `spec_topics/diagnostics.md` — code-registry row for `loom/parse/explicit-schema-mismatch` (edited)
- `spec_topics/type-system.md` — Type compatibility (read-only — referent)

## Plan Impact

**Phases:** Vertical slices

**Leaves (implementation order):**

- V6h — Explicit `@<Schema>`...`` ascription — (modified)

## Consequence

**Severity:** correctness

A V1.0 author writing `let x: number = @<integer>\`Rate 1-5: ${q}\`?` either gets a warning or does not, depending on which implementer read the prose. The warning is non-fatal, so divergence will not be caught by load-success tests; it surfaces only in diagnostic-tail snapshots, where two conformant implementations will disagree silently. The closing test leaf for V6h cannot write the assertion at all without the relation pinned.

## Solution Space

**Shape:** multiple

### Option A — Pin "disagree" to non-subtype under the established `⊑` relation

**Approach.** Replace "disagree" in both sites with: "the explicit `<Schema>` ascription is not compatible with the binding annotation under [Type System — Type compatibility](./type-system.md#type-compatibility) — i.e. `ascription ⋢ annotation`." Keep the warning severity. Add at least two normative test vectors to `query.md`: one no-warning case (`let x: number = @<integer>\`...\`?` — fires no warning, by Type-compatibility rule 2: `integer ⊑ number`), one warning case (`let x: integer = @<number>\`...\`?` — fires the warning; the explicit `number` could yield `3.5`, which the `integer` binding cannot accept).

**Spec edits.** `query.md` Explicit-form paragraph; `diagnostics.md` Description column for the row; `query.md` add a "Test vectors" subsection or inline pair.

**Pros.** Reuses the single normative relation already cited from every other compatibility site (`invoke` return, `match` arms, function arguments). Eliminates the "warning fires on a safe widening" surprise. Symmetric with `loom/parse/invoke-return-type-mismatch`.

**Cons.** Suppresses the warning in cases an author may genuinely want to know about — e.g. `let x: number = @<integer>\`...\`?` could indicate a planning mistake even though it is type-safe.

**Risks.** None — strictly narrows the diagnostic; never a false-positive that wasn't one before.

### Option B — Pin to strict identity (`ascription ≠ annotation`)

**Approach.** Replace "disagree" with: "the explicit `<Schema>` ascription is not the same type as the binding annotation's declared type, by reference equality on the resolved type expression (named-schema reference equal, inline objects field-by-field type-equal, generics arity-and-arg equal)." Provide test vectors covering identity success, subtype-but-not-identity warning, and a named-vs-structural-equivalent edge case.

**Spec edits.** `query.md`, `diagnostics.md`, plus a "type identity" anchor in `type-system.md` (this relation does not yet exist there — Type-compatibility is the only currently-defined relation).

**Pros.** Catches `let x: number = @<integer>\`...\`?` as suspicious — author wrote the explicit form for a reason, and the binding now silently widens it.

**Cons.** Introduces a second type relation alongside `⊑` that must be maintained, anchored, and cited from a single site. Asymmetric with `loom/parse/invoke-return-type-mismatch`. Hard to define cleanly across inline-vs-named schema combinations.

**Risks.** "Identity" needs its own normative definition; without it the relation is just as undefined as "disagree" was. Spec budget cost is non-trivial.

### Recommendation

Option A. The spec already commits to a single type-comparison relation (`⊑`) and uses it from every sibling compatibility site; the warning becomes "the explicit ascription would not satisfy the binding annotation," which is the answer the runtime AJV check would give and is the answer authors expect. Implementer edge cases to watch:

- The check is parser-time; when either side is past the parser's static view (the `Unresolvable operands` paragraph in `type-system.md`), the warning is skipped — runtime AJV remains the safety net.
- Both directions `⊑` should be considered: the canonical "warn" condition is `ascription ⋢ annotation` (the value the explicit form produces could not be assigned through the annotation). The reverse (`annotation ⋢ ascription`) is not the warning condition — the binding annotation is the wider type by intent.
- Update the V6h leaf's **Tests** bullet to cite the same Type-compatibility anchor and to include the no-warning widening vector (otherwise the test will encode the strict-identity reading by default).

## Related Findings

- "`cause` vs `reason` sub-discriminator fields inconsistent across error variants" — same-cluster (both are diagnostic-registry precision gaps; resolve independently)
- "Diagnostic placeholder rendering: affected codes not enumerated; implementation-defined portion untestable" — same-cluster (diagnostics-testability theme; resolve independently)
- "\"behave identically\" undefined equivalence class" — same-cluster (both are undefined relations cited normatively; resolve independently)

---

# `display: false` `loom-system-note` events have no normative test seam

**Original heading:** `display: false` `loom-system-note` events: no test interception mechanism
**Kind:** testability

## Finding

The spec gives the always-log runtime event channel a sharp behavioural contract: every member of the always-log set MUST emit exactly one `loom-system-note` per origin via `pi.sendMessage({ customType: "loom-system-note", content, display, details: { event } }, { triggerTurn: false })`, with `display: false` when the author handled / discarded / `?`-propagated the `Err` to a non-top-level frame, and `display: true` when it cascades to a slash boundary in prompt mode. Dedup is keyed on `(kind, query_site, message, occurred_at)`; payload shape is normative; `content === ""` co-occurs with `display: false`; `?`-chains MUST emit at the originating site only. (See `spec_topics/pi-integration-contract.md` — *System notes* / *Runtime event channel*.)

What the spec does not give is the seam through which a conformance test observes those calls. Every other deterministic side-effect surface the runtime touches is wired through a named, normatively-pinned seam: `Checkpoint` (cancellation race semantics), `Clock` / `FakeClock` (wall-clock and timers), `FileSystem` / `FakeFileSystem` (filesystem reads), `FileWatcher` / `FakeFileWatcher` (watcher events), `SchemaValidator` (AJV cache). Each is presented as "production wiring uses X, tests use Y, here is the interface." The `pi.sendMessage` call has no parallel pinning. The runtime accesses it through the `pi: ExtensionAPI` reference captured by the extension factory (this *is* the natural seam — the H4 leaf already wires a `FakeExtensionAPI` against it), but the spec never names `ExtensionAPI` as a test seam, never lists `FakeExtensionAPI` alongside `FakeClock` / `FakeFileSystem`, and never forbids the runtime from inlining a direct module-scoped `pi` reference that bypasses the captured one.

The asymmetry has two concrete consequences. First, two implementations could legitimately diverge on the seam shape (one routing through the captured `pi`, another wrapping `pi.sendMessage` in an internal `SystemNoteSink`-style helper, a third re-acquiring `pi` from a module-level singleton) and only the first would be testable through the conformance test pattern V18q already plans to use. Second, there are no normative test vectors for the `display: false` + `details: { event: RuntimeEvent }` + `content: ""` triple. Diagnostics rule 4 pins byte-identical `content` strings for the `display: true` diagnostic-batch case, but the always-log runtime-event payload (the structured `details.event` shape that the channel exists to carry) has no equivalent fixed input/output table — so V18q's tests assert against the in-house `FakeExtensionAPI` recording without an anchor that two independent implementations can converge on.

## Spec Documents

- `spec_topics/pi-integration-contract.md` — *System notes* / *Runtime event channel* / DI seams section starting at the `Checkpoint` anchor (edited)
- `spec_topics/query.md` — *Observability of discarded results* (read-only — confirms the contract that needs a test seam)
- `spec_topics/diagnostics.md` — *Placeholder rendering* / *Test vectors* (read-only — the precedent for normative test vectors that the runtime-event channel currently lacks)
- `spec_topics/governance.md` — GOV-13 (read-only — V1.x equivalence claim relies on observable `loom-system-note` content strings, so the seam pinning matters at the release-process boundary)

## Plan Impact

**Phases:** Horizontal (H2, H4), Vertical V18

**Leaves (implementation order):**

- H2 — Dependency-injection skeleton with fakes — (modified — adds `ExtensionAPI` to the spec-anchored seam list, `FakeExtensionAPI` to the in-memory fakes set; the editor warning at the top of `h2-di-skeleton.md` would otherwise block silent shape changes)
- H4 — Pi extension shell — (modified — the existing `FakeExtensionAPI` becomes a normative conformance fake rather than a project-private convenience; tests for `sendSystemNote` gain the normative `RuntimeEvent` test-vector reference)
- V18q — Runtime event channel and always-log emission — (modified — adds the normative test-vector table reference; existing tests `(a)`–`(l)` already assume the seam works, so the change is anchoring rather than reworking them)

## Consequence

**Severity:** advisory

Implementers following the path of least resistance will reach the right answer (the captured `pi: ExtensionAPI` is the obvious interception point and the H4 plan already chose it). But the spec does not foreclose alternatives that defeat the test pattern, and the `display: false` runtime-event payload — the *only* observable for the always-log channel's primary purpose, operator-facing log scraping and replay — has no normative test vectors. Two V1.x releases could ship with materially different `RuntimeEvent.message` strings or `occurred_at` stamping and GOV-13's reviewer-inspection equivalence check would have nothing to compare against.

## Solution Space

**Shape:** multiple

### Option A — Designate `ExtensionAPI` as the test seam

**Approach.** In `pi-integration-contract.md`'s DI-seams cluster (the section anchored at `checkpoint-seam` that already lists `FileSystem`, `DiagnosticsSink`, `SchemaValidator` as constructor-injected collaborators), add an `ExtensionAPI` entry: production wiring captures the `pi` reference passed to the extension factory; tests construct a `FakeExtensionAPI` that records every `pi.sendMessage`, `pi.sendUserMessage`, `pi.registerTool`, `pi.setActiveTools`, etc. invocation in call order, with deterministic stub returns. Forbid the runtime from re-acquiring `pi` from any source other than the factory-captured reference.

**Spec edits.**
- New paragraph under the DI-seams cluster naming `ExtensionAPI` as a test seam, with the same shape-pinning the other seams use.
- New subsection under *Runtime event channel* titled *Test vectors* listing at least three normative `(input → emitted RuntimeEvent)` rows: one `transport` failure originating at a discarded `let _ = @"…"`, one `tool_loop_exhausted` in a `?`-propagation chain (asserts originating-site attribution), one `code_tool` cascading to a prompt-mode top-level boundary (asserts the `display: true` flip and the dedup key invariant against the `display: false` originating event).
- Cross-link from `query.md` *Observability of discarded results* into the new test-vector subsection.

**Pros.** Zero new code surface in the runtime — the seam already exists in the H4 plan. Symmetric with how every other seam is documented. Test vectors compose with the existing GOV-13 equivalence claim.

**Cons.** `FakeExtensionAPI` is a wide surface (every `pi.*` member the runtime touches), so the conformance fake is larger and slower to evolve than a focused per-channel sink would be. Two implementations could still diverge on per-call details outside the test-vector set.

**Risks.** A future widening of `ExtensionAPI` (new Pi capability) silently widens the conformance seam unless the spec is touched at the same time; this is the same risk H2's editor warning already calls out for the other spec-anchored seams.

### Option B — Introduce a `SystemNoteSink` seam

**Approach.** Add a narrow seam between the runtime and `pi.sendMessage` for the `loom-system-note` channel only: `interface SystemNoteSink { send(note: { content: string; display: boolean; details: SystemNoteDetails }): void }`. Production wiring is a `PiSystemNoteSink` adapter that forwards to `pi.sendMessage(..., { triggerTurn: false })` and runs the documented best-effort fallback. Tests use a `FakeSystemNoteSink` that records every `send` call in order. The seam is loom-internal (not exposed through `ExtensionAPI`), parallel to `Checkpoint`. Add the same *Test vectors* subsection as Option A.

**Spec edits.**
- New seam definition under the DI-seams cluster, adjacent to `Checkpoint`, with the interface, production-vs-test wiring, and lifecycle.
- The `pi.sendMessage` call shape currently shown verbatim in *System notes* is reframed as the production adapter's behaviour; the runtime-side spec talks to `SystemNoteSink.send`.
- The fallback chain (`ctx.ui.notify` → `system-note-delivery-failed` diagnostic → `console.error`) moves into the production adapter's contract.
- Same *Test vectors* subsection as Option A.

**Pros.** Narrowest possible conformance surface; the fake records exactly the channel under test and nothing else. Insulates the runtime from `ExtensionAPI` shape churn — a new Pi capability does not change the system-note contract. The `DiagnosticsSink` reference already in `pi-integration-contract.md` line 480 hints at this layering, so a parallel `SystemNoteSink` is consistent with where the spec was already drifting.

**Cons.** Adds a runtime layer (one more interface, one more adapter, one more fake) for a single channel. The fallback chain becomes load-bearing on the adapter rather than on a runtime helper, which slightly complicates re-entry-guard reasoning. Diverges from H4's `sendSystemNote` helper plan, which would need to be reframed as the adapter rather than as a runtime wrapper around the captured `pi`.

**Risks.** Two channels (system notes via the new sink, queries / tool registration via the captured `pi`) means two test seams to keep in sync; coverage gaps now hide in the gap between them rather than under one omission.

### Recommendation

Option A. The H4 plan already wires `FakeExtensionAPI` against the captured `pi` reference and runs `sendSystemNote`-style tests through it; the spec edit codifies what the implementation already does and costs no runtime surface. Option B's narrower seam is theoretically cleaner but introduces a new layer for a problem the captured-`pi` pattern already solves cleanly. Edge cases the implementer must watch:
- The `FakeExtensionAPI` recorder MUST preserve call order across `sendMessage`, `sendUserMessage`, `registerTool`, and `setActiveTools` — V18q's `(c)` test (originating-site attribution through a `?`-chain) and Mb's cancellation-note test both depend on the order in which notes interleave with other Pi-side effects.
- Test vectors MUST include at least one case where the recorded call's `details.event.occurred_at` is asserted against a `FakeClock`-controlled value, so the dedup-key contract in V18q `(l)` is anchored.
- The forbidden re-acquisition rule (no module-level `pi` singleton, no `globalThis` access) is the load-bearing constraint that makes the seam usable; without it `FakeExtensionAPI` records a subset of calls and the test passes vacuously.

## Related Findings

- "`loom-system-note` emission failure: no fallback contract" — same-cluster (touches the same `pi.sendMessage` call site but on the production-side fallback chain rather than the test seam)
- "`loom-system-note` channel: registration ownership unclear" — same-cluster (renderer registration vs. emission interception are independent surfaces on the same channel)
- "`loom-system-note` channel: Pi serialization contract not pinned (messages re-entering model context)" — same-cluster (transcript persistence vs. test interception are independent surfaces on the same channel)
- "Diagnostic placeholder rendering: affected codes not enumerated; implementation-defined portion untestable" — decision-dependency (the *Test vectors* precedent invoked here is the same one that finding asks to extend; the two findings should land their normative-test-vector edits together to keep the conformance-vector style consistent across the diagnostic and runtime-event payloads)

## spec_topics/tool-calls.md

---

# Return-type table row label drifts from canonical `.loom callable`

**Original heading:** "Registered loom" deprecated term in return-type table
**Kind:** naming

## Finding

`spec_topics/tool-calls.md` line 21 labels the second row of the **Return type** table as `Registered loom (subagent-mode)`. The concept that row describes — a `tools:` entry that is a path to a subagent-mode `.loom` file, dispatched as a tool call — has a single canonical name in the glossary: **`.loom callable`**, established in the `Pi tool` vs. `.loom callable` glossary entry (`spec_topics/glossary.md` line 33) and reinforced by the `callable set` entry (line 11) that describes a callable set as "the unified set of Pi tools and `.loom` callables."

The rest of `tool-calls.md` is consistent with this canonical name — line 35's "**Relationship with `invoke`**" paragraph explicitly speaks of "a `.loom` callable call (`my_summariser(...)` after listing `./summariser.loom` in `tools:`)." The return-type table is the only place in the file that introduces a competing label ("Registered loom"), and it does so in the most quotable position in the topic — the row header of the central type-contract table. A reader scanning for "the type a `.loom` callable returns" sees a different noun phrase from the one the glossary mandates and the surrounding prose uses.

## Spec Documents

- `spec_topics/tool-calls.md` — Return type table, row 2 (edited)
- `spec_topics/glossary.md` — `callable set` entry; `Pi tool` vs. `.loom callable` entry (read-only)

## Plan Impact

**Phases:** None

**Leaves (implementation order):** None

(The fix is a one-cell label change in spec prose. No leaf's Adds / Tests / Ships-when text references the offending row label, and no acceptance criterion changes. V15's section title and prose use "registered loom callee" too, but that is a separate plan-prose drift outside the scope of this finding.)

## Consequence

**Severity:** cosmetic

A second name for an already-named concept — appearing in the most authoritative position of its own topic file — invites downstream prose, leaf titles, and diagnostic copy to ossify around the wrong term. Behaviour is unaffected; readers will still understand which return-type rule applies. The cost is purely terminological erosion.

## Solution Space

**Shape:** single

### Recommendation

In `spec_topics/tool-calls.md`, change the row-2 label of the **Return type** table from

```
| Registered loom (subagent-mode) | `Result<T, QueryError>` ...
```

to

```
| `.loom callable` (subagent-mode) | `Result<T, QueryError>` ...
```

The `(subagent-mode)` qualifier stays — it is informative (a `.loom callable` is by definition a subagent-mode loom path entry, but the parenthetical reminds the reader why the inference rule applies). The body of the cell needs no change.

Edge case for the implementer: do not also rewrite the V15 plan section title or `spec_topics/discovery.md` line 80's "already-registered Pi prompt template" prose — both use "registered" in a different sense (registered-with-Pi, not the canonical-name drift this finding targets). The scope is the single table cell.

## Related Findings

- "`response-repair` used alongside canonical `respond-repair`" — same-cluster (identical drift pattern: a non-canonical synonym appearing alongside the glossary-mandated term; resolves independently with the same kind of one-token edit)
- "`ambient tool set` not reconciled with Pi SDK's `active tools`" — same-cluster (callable-set-neighbourhood terminology hygiene; independent edit)
- "GOV-N range in glossary is stale (says GOV-8, actual is GOV-14)" — same-cluster (glossary hygiene; independent edit)
- "`slug` and `Canonical schema hash` are two names for the same concept; neither is in the glossary" — same-cluster (canonical-name drift; independent edit)

## package.json

---

# `semver` not declared as a production dependency in `package.json`

**Original heading:** `semver` not declared as production dependency
**Kind:** codebase-grounding-broad

## Finding

`spec_topics/pi-integration-contract.md` Step 0 (a) prescribes the Node-floor probe as `semver.satisfies(process.versions.node, ">=20.6.0", { includePrerelease: true })` "from the `semver` npm package, pinned as a direct production dependency of the loom package," and `spec.md` Host runtime §1 forwards-links to it. The H1 plan page reinforces this: "H1 also adds `semver` (and `@types/semver`) as direct production dependencies of the loom package; the probe consumes `semver.satisfies` for both the Node-floor and peer-dep comparisons … and the H1 manifest test asserts both the `dependencies` entry and the resolved-version literal."

The current `package.json` declares no `semver` entry under `dependencies`, `devDependencies`, or `peerDependencies`. A flat `node_modules` from npm or yarn would silently satisfy the import via the transitive copy that `@mariozechner/pi-coding-agent` carries, masking the gap; pnpm's strict resolution would reject the import outright. There is also no companion `@types/semver` entry, so a TypeScript build of the probe call site would fail typecheck against an untyped CommonJS module.

The spec and plan are internally consistent; the gap is between them and the as-shipped `package.json`, which still reflects pre-H1 boilerplate.

## Spec Documents

- `package.json` — top-level `dependencies` block (edited)
- `spec_topics/pi-integration-contract.md` — Step 0 (a) Node floor (read-only)
- `spec.md` — Orientation > Prerequisites > Host runtime §1 (read-only)
- `plan_topics/h1-scaffold.md` — Tests > SDK surface-inventory bullet (read-only; already prescribes the addition)

## Plan Impact

**Phases:** Horizontal (H1)

**Leaves (implementation order):**

- H1 — Repository scaffold and test framework — (modified)

The H1 leaf already names the work ("adds `semver` (and `@types/semver`) as direct production dependencies … and the H1 manifest test asserts both the `dependencies` entry and the resolved-version literal"). H1 acceptance is what closes the gap; no leaf-text edit is required, but the implementation of H1 must include the `package.json` edit and the dedicated literal-read assertion.

## Consequence

**Severity:** advisory

No observer is harmed until the Step 0 probe ships, at which point a non-flat resolver (pnpm strict mode) refuses to load the extension at factory entry, and any TypeScript build of the probe site fails without `@types/semver`. Because no production code currently imports `semver`, the gap is pre-implementation drift that H1 will close in the normal course of work; flagging it here is what prevents H1 from forgetting the entry.

## Solution Space

**Shape:** single

### Recommendation

When H1 lands, add the following to `package.json` `dependencies` (alongside `ajv`, `ajv-formats`, `chokidar`):

```json
"semver": "^7.6.0",
```

and to `devDependencies`:

```json
"@types/semver": "^7.5.0"
```

Pair the addition with the literal-read assertion the H1 page already prescribes: parse `package.json`, assert `dependencies.semver` is present and matches the pinned range string, and assert `devDependencies["@types/semver"]` is present. Co-locate the pinned range constant with the `SDK_SURFACE_INVENTORY` block so the probe and the test consume the same literal. Pick the runtime `^7.x` line that matches whatever pi-coding-agent transitively resolves at the pinned `^0.72.1` peer; verify with `pnpm why semver` so the loom package's pin does not contradict the host's resolution.

Edge cases to watch:

- pnpm's strict resolution rejects transitive imports — this is exactly the failure mode the addition prevents; do not rely on hoisting.
- `@types/semver` is required at typecheck time even though `semver` itself ships its own `.d.ts` in some 7.x releases; pinning the types package explicitly avoids divergence under different `moduleResolution` settings.
- A future pi-coding-agent minor that drops or major-bumps `semver` will surface as a peer warning; the literal-read assertion catches the silent-widen failure mode the H1 page calls out.

This recommendation is decision-dependent on the sister prescription finding (see Related Findings): if `semver` is dropped from the spec in favour of a `process.versions.node`-direct comparator, the dependency is not needed and this finding evaporates.

## Related Findings

- "`semver` library referenced as dependency but absent from `package.json`" — co-resolve (same defect, viewed from `spec.md` rather than `package.json`; one `package.json` edit closes both)
- "Over-prescribes `peerDependencies` mechanism and `semver`-based comparator" — decision-dependency (if that finding's recommendation is adopted and the spec drops the `semver` library prescription, no production dependency is required and this finding is mooted)

