# Triaged Spec Review — spec

_Spec: docs/spec.md_
_Process: bottom-up — the last finding (T28) is addressed first; the first finding is addressed last._

_Triage tally: 5 findings — 1 blocker, 4 high._

---

# T19c — Retarget the five `../spec.md#session-model` cross-references in future-considerations.md to specific `sm-N-...` anchors

**Kind:** traceability
**Importance:** high
**Shape:** single
**State:** reduced

## Problem

`docs/spec_topics/future-considerations.md` carries five `../spec.md#session-model` cross-references (at lines 108, 112, 113, 114, and 116 — in the V1 non-goals `Recorded at:` lines for no-concurrent-user-sessions, no-parallel-invoke, no-parallel-fan-out, and no-admission-cap, plus one inline citation inside the no-parallel-fan-out body). Each citation pins a different sub-obligation of the Session model paragraph, but all five currently resolve to the same umbrella anchor. After T19a installs the per-obligation `sm-N-...` sub-anchors on `docs/spec.md`, these citations remain link-resolved-but-meaning-ambiguous until they are retargeted: a future edit narrowing one SM-obligation will silently appear to narrow the others.

## Solution approach

Retarget each of the five `../spec.md#session-model` cross-references in `docs/spec_topics/future-considerations.md` to the specific `sm-N-...` sub-anchor whose sub-obligation the surrounding `Recorded at:` line (or in-body citation) actually pins, using T19a's authored SM-N inventory as the ground truth for anchor names.

## Solution constraints

- Out of scope: authoring or modifying any `sm-N-...` anchor on `docs/spec.md` (owned by T19a) and retargeting the three sibling cross-references in `pi-integration-contract.md` (owned by T19b).

## Relationships

- T19a "Replace session-model paragraph with eight SM-N sub-units" — must-follow (the `sm-N-...` anchor targets must exist before retargeting)
- T19b "Retarget the three `../spec.md#session-model` cross-references in pi-integration-contract.md" — co-resolve (commutative sibling retarget; bundle into the same fix pass after T19a lands)
- T22 "Extension Architecture › Concurrency model bullet duplicates the Session model concurrency prose" — same-cluster (if SM-7 collapses to a forward-link after T22, the SM-7 retargets in this edit collapse to `concurrency-model`)
# T19b — Retarget the three `../spec.md#session-model` cross-references in pi-integration-contract.md to specific `sm-N-...` anchors

**Kind:** traceability
**Importance:** high
**Shape:** single
**State:** reduced

## Problem

`docs/spec_topics/pi-integration-contract.md` carries three `../spec.md#session-model` cross-references — one in the `<a id="pi-slash-handler-promise-lifecycle-presupposition"></a>` *Pi-side slash-handler promise lifecycle* bullet, and two in the Pi-version-bump procedure (step 1's *Re-typecheck against the new package* item and step 5's *Update the capability-probe pinned constants* item). Each callsite pins a distinct sub-obligation of the Session model paragraph (cancellation-chain liveness; closed reason set; `SessionShutdownEvent` payload shape), but all three currently resolve to the same `#session-model` anchor. After T19a establishes `sm-N-...` sub-anchors on `docs/spec.md`, leaving the citations on the umbrella anchor leaves traceability ambiguous and lets a future edit narrowing one SM obligation silently appear to narrow the others.

## Solution approach

Retarget each of the three `../spec.md#session-model` cross-references in `docs/spec_topics/pi-integration-contract.md` (the Pi-side slash-handler promise lifecycle bullet and Pi-version-bump procedure steps 1 and 5) to the specific `sm-N-...` sub-anchor that names the sub-obligation that callsite is actually about, using T19a's SM-N inventory as the ground truth.

## Solution constraints

- Out of scope: authoring or naming the `sm-N-...` anchors themselves (owned by T19a) and retargeting the five `../spec.md#session-model` cross-references in `docs/spec_topics/future-considerations.md` (owned by T19c).

## Relationships

- T19a "Replace session-model paragraph with eight SM-N sub-units" — must-follow (the `sm-N-...` anchor targets must exist before retargeting)
- T19c "Retarget the five `../spec.md#session-model` cross-references in future-considerations.md" — co-resolve (commutative sibling retarget; bundle into the same fix pass after T19a lands)
- T22 "Extension Architecture › Concurrency model bullet duplicates the Session model concurrency prose" — same-cluster
# T19a — Replace session-model paragraph with eight SM-N sub-units, each anchored `<a id="sm-N-...">`

**Kind:** traceability
**Importance:** high
**Shape:** single
**State:** reduced

## Problem

The `<a id="session-model"></a>` *Session model.* paragraph in `docs/spec.md` (Orientation › Prerequisites, third loose paragraph) carries one anchor over at least eight independently testable normative obligations: single-active-session binding to a Pi extension instance, the closed `session_shutdown` reason set, the per-reason fixed teardown sequence, the post-teardown degraded state for the session-only reasons `{"new","resume","fork"}`, the broader tag-transition predicate scope for the `LoomRegistry` drain transition and the degraded-state slash note, the narrower diagnostic-emission predicate scope for `loom/host/session-shutdown-runtime-degraded`, the mode-qualified concurrency / isolation model, and the per-invocation budget non-sharing rule. Eight live cross-references currently land on this anchor — three in `docs/spec_topics/pi-integration-contract.md` and five in `docs/spec_topics/future-considerations.md` — each pinning a different sub-obligation but all resolving to the same paragraph. As a result no inbound link can disambiguate which obligation it cites, and a future edit narrowing one obligation will silently appear to narrow the others.

## Solution approach

Decompose the `<a id="session-model"></a>` paragraph in `docs/spec.md` into eight stably-anchored sub-units `sm-1-...` through `sm-8-...`, one per obligation enumerated in Problem (binding; closed reason set; teardown sequence; degraded state for the session-only reasons; tag-transition predicate; diagnostic-emission predicate; mode-qualified isolation; per-invocation budget non-sharing). Keep the `<a id="session-model"></a>` anchor on the wrapping surface so existing inbound `#session-model` links continue to resolve. The SM-N inventory authored here is the ground truth that T19b and T19c retarget downstream callsites against.

## Solution constraints

- Out of scope: retargeting the eight downstream `#session-model` callsites — the three in `docs/spec_topics/pi-integration-contract.md` are owned by T19b and the five in `docs/spec_topics/future-considerations.md` are owned by T19c.

## Relationships

- T19b "Retarget the three `../spec.md#session-model` cross-references in pi-integration-contract.md" — must-precede (T19b's anchors-targets are established here)
- T19c "Retarget the five `../spec.md#session-model` cross-references in future-considerations.md" — must-precede (T19c's anchor-targets are established here)
- T22 "Extension Architecture › Concurrency model bullet duplicates the Session model concurrency prose" — must-follow (deduplication should land before this edit; if the concurrency content moves wholesale to `concurrency-model`, SM-7 collapses to a forward-link)
# T22 — Extension Architecture › Concurrency model bullet duplicates the Session model concurrency prose

**Kind:** cruft, naming, placement, scope, traceability
**Importance:** high
**Shape:** single
**State:** reduced

## Problem

`docs/spec.md`'s Extension Architecture section is a navigational index whose bullets follow `[Page Name](path) — short description`. The `<a id="concurrency-model"></a>` bullet breaks the pattern by embedding a ~500-word concurrency contract inline, near-verbatim duplicated from the Orientation › Session model paragraph (`<a id="session-model"></a>`): identical opening sentence, `(i)`–`(iv)` prompt-mode serialisation list, three-sources-of-overlap analysis, cancellation-propagation sentence, and per-invocation-budget paragraph. Neither copy is marked authoritative and the two anchors do not cross-reference each other, so future edits to one surface will drift independently of the other.

## Solution approach

Rewrite the body of the Extension Architecture › Concurrency model bullet in `docs/spec.md` to match the navigational `[Page Name](path) — short description` shape used by its siblings, with a forward-link to `#session-model` designated as the sole owner of the concurrency contract. Preserve the `<a id="concurrency-model"></a>` anchor in place so existing inbound `#concurrency-model` references continue to resolve.

## Solution constraints

- Out of scope: the `<a id="session-model"></a>` paragraph — owned by T19a–T19c.
- The rewritten bullet MUST NOT forward-link to `cancellation.md`, `implementation-notes.md`, `invocation.md`, or `pi-integration-contract.md`; every such link already lives inside the Session model paragraph and replicating any of them re-opens the drift surface this fix closes.

## Relationships

- T19a "Replace session-model paragraph with eight SM-N sub-units" — must-precede (decomposing `#session-model` into `SM-1`…`SM-8` is easier with one canonical body to decompose, not two)
# T23 — Pi SDK version literal `~0.72.1` is duplicated across the corpus and is stale against installed `0.74.1`

**Kind:** codebase-grounding-broad, cross-spec-consistency-broad, single-source-of-truth
**Importance:** blocker
**Shape:** single
**State:** reduced

## Problem

The Pi SDK pin literal `~0.72.1` is authored in ~30 places across the spec corpus plus 4 `package.json` `peerDependencies` entries:

- **Canonical pin (intended single source of truth):** `docs/spec_topics/pi-integration-contract.md` anchor `#pi-sdk-pin`.
- **In-corpus echoes on the canonical owner page:** ~26 further occurrences on the same `pi-integration-contract.md` page (across §*Session-binding contract*, §*Entry capability probe*, §*Patch-skew degradation contract*, §*Pi version bump procedure*, §*Conversation drive — subagent mode*, and others).
- **In-corpus echoes on other spec_topics:** `docs/spec_topics/binder.md`'s `<a id="strict-capability-requirement"></a>` paragraph (×1, as `pi-coding-agent ~0.72.1`); `docs/spec_topics/diagnostics.md`'s `loom/load/host-incompatible`, `loom/load/binder-model-not-strict-capable`, and `loom/load/binder-model-strict-capability-unknown` rows (×3); `docs/spec_topics/future-considerations.md`'s "No concurrent user sessions in the same host process." bullet (×1).
- **Build manifest:** `package.json` `peerDependencies` entries for `@mariozechner/pi-coding-agent`, `@mariozechner/pi-agent-core`, `@mariozechner/pi-ai`, `@mariozechner/pi-tui` (×4).

Two defects co-exist on this surface:

1. **The literal is stale.** The installed Pi is `0.74.1`; the `~0.72.1` tilde range does not admit it. Every echo independently reinforces the stale literal; PIC describes an SDK version that contradicts reality, and `npm install` against `main` cannot satisfy the manifest pin until the four `package.json` entries are bumped.

2. **The literal was authored in many places to begin with.** The single-source-of-truth invariant the canonical pin's anchor name (`#pi-sdk-pin`) advertises is undermined by ~30 in-corpus repetitions of the literal. Every future Pi bump becomes an N-site sweep across `pi-integration-contract.md`, `binder.md`, `diagnostics.md`, `future-considerations.md`, and the manifest; any missed echo silently re-introduces corpus self-inconsistency. The version bump exposes the structural defect: a literal whose role is to name the supported Pi version is the kind of obligation that MUST live in exactly one place.

## Solution approach

Consolidate the Pi SDK version literal to a single canonical site in the spec corpus, then bump that site once:

1. **Designate the single source of truth.** The canonical pin at `docs/spec_topics/pi-integration-contract.md#pi-sdk-pin` is the only place in the spec corpus where the `~MAJOR.MINOR.PATCH` literal MAY appear. Tighten the surrounding prose so the pin is presented as the authoritative declaration and the single-source-of-truth rule is stated explicitly (e.g. "The supported Pi minor is pinned at `~0.74.1`. Every other reference to the supported Pi version in the spec corpus MUST cite this anchor and MUST NOT restate the literal.").

2. **Replace every in-corpus echo with an anchor citation.** Sweep the four affected files and rewrite each `~0.72.1` occurrence so the surrounding prose cites the canonical pin by anchor (e.g. "the [pinned Pi minor](./pi-integration-contract.md#pi-sdk-pin)" / "the pin recorded at [PIC §Pi SDK pin](#pi-sdk-pin)") rather than restating the literal. Where a sentence's grammar required the literal as an inline token, rephrase the sentence so the anchor reference carries the same load. Apply to:
   - `docs/spec_topics/pi-integration-contract.md` — the ~26 same-page echoes outside `#pi-sdk-pin` itself.
   - `docs/spec_topics/binder.md` — the `#strict-capability-requirement` paragraph.
   - `docs/spec_topics/diagnostics.md` — the three diagnostic-code rows (`loom/load/host-incompatible`, `loom/load/binder-model-not-strict-capable`, `loom/load/binder-model-strict-capability-unknown`).
   - `docs/spec_topics/future-considerations.md` — the "No concurrent user sessions in the same host process." bullet.

3. **Bump the canonical pin in the same commit.** Once the corpus carries the literal in exactly one place, rewrite `~0.72.1` → `~0.74.1` at `pi-integration-contract.md#pi-sdk-pin`. The bump is now a one-character edit in the spec corpus; the next bump after that is the same one-character edit.

4. **Update the build manifest jointly.** `package.json`'s four `@mariozechner/*` `peerDependencies` entries (`pi-coding-agent`, `pi-agent-core`, `pi-ai`, `pi-tui`) MUST carry the literal because npm consumes the manifest mechanically — the manifest is the one legitimate non-spec restatement of the pin, since it cannot anchor-cite. Bump all four entries from `~0.72.1` to `~0.74.1` in the same commit as the spec consolidation.

5. **Lock-step the manifest to the canonical pin under GOV-12.** Add a sentence at `pi-integration-contract.md#pi-sdk-pin` requiring the four `@mariozechner/*` peerDependencies entries in `package.json` to literally equal the canonical pin's range, and register the manifest as a GOV-12 lock-step downstream of the canonical pin. This closes the loophole that would otherwise let the manifest drift from the spec's canonical pin without surfacing as a spec edit, given that the manifest is the only legitimate restatement site.

Outcome: the spec corpus carries the version literal exactly once, the manifest carries it exactly four times (one per Pi peer), and the GOV-12 lock-step makes any drift between the spec side and the manifest side a CI-detectable failure. Every future Pi bump becomes a one-character edit at the canonical site plus a four-entry manifest update.

## Solution constraints

- The single-source-of-truth rule applies to the spec corpus only. `package.json` is permitted to restate the literal because npm reads the manifest mechanically; the GOV-12 lock-step replaces the freedom-to-restate elsewhere.
- The canonical pin's anchor slug `#pi-sdk-pin` MUST NOT be renamed; downstream pages will be retargeted at it during the sweep, and any rename fans out a second time across the same surfaces.
- The `typebox` peer-dep entry remains `"*"` per PIC §*`typebox` (the fifth Pi-bundled package)*; this finding does not touch it.
- Out of scope: cross-corpus restatements in `docs/plan_topics/**` — the plan corpus is a separate concern under T24a / T25 / T26's corpus-direction rule. The plan corpus MAY cite the canonical pin by anchor but MUST NOT restate the literal under the same single-source rule once that corpus is in scope.
- The five edits (canonical-site bump, four-file in-corpus consolidation sweep, manifest bump, and the new GOV-12 lock-step sentence) MUST land in a single commit. A partial landing leaves the corpus in a state where the canonical pin and the echoes disagree, which is the failure mode the consolidation is designed to eliminate.

## Relationships

(no live cross-finding relationships)
