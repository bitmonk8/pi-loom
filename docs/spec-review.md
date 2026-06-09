# Triaged Spec Review - spec

_Generated: 2026-06-09T12:30:00Z_
_Spec: docs/spec.md_
_Process: bottom-up - the last finding (T34) is addressed first; the first finding (T01) is addressed last._

_Triage tally: 17 high, 17 medium retained; 72 low discarded; 0 low findings merged into 0 medium findings; 109 nit dropped; 0 false dropped._

---

# T01 - `DocComment` grammar requires trailing `\n`; EOF-terminated `///` line undefined

**Kind:** implementability
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

The `DocComment` production in `docs/spec_topics/grammar.md` §"`///` placement" is `DocComment ::= ("///" RestOfLine "\n")+`, placing the `\n` terminator inside the `(...)+` group. Every `///` line — including the last in a run — must therefore be followed by `\n`, so a source file ending `…///x` with no trailing newline cannot be parsed: the final `RestOfLine` has no terminating `\n` and the repetition cannot close. Neither `docs/spec_topics/lexical.md` (Encoding / Newline normalisation) nor the `RestOfLine` terminal (lexical.md `#rest-of-line`, defined as "no `\n`") supplies an EOF escape, and the grammar gives no fall-back. Two reasonable implementers diverge on no-trailing-newline files — a realistic shape for hand-edited files and editors that do not enforce a final newline.

## Issue introduction

**Verdict:** present-since-inception
**Introducing commits:** f841b12 — spec: resolve Cluster 2 (literal sublanguage + grammar appendix) (2026-05-04, Thomas Andersen)
**History:** The grammar appendix was created in `f841b12`, and the `DocComment ::= ("///" RestOfLine "\n")+` production carried the trailing-`\n`-inside-the-`(...)+`-group form from that first commit (verified against `f841b12:spec_topics/grammar.md`), with no end-of-file escape. The later `c3b7c87` (2026-06-07) only added the `RestOfLine` cross-reference prose and left the per-line terminator unchanged. The EOF-terminated-`///`-line gap has therefore been present since the production's inception.

## Solution approach

Rewrite the `DocComment` production in `docs/spec_topics/grammar.md` §"`///` placement" so the per-line terminator accepts end-of-file as well as `\n` — e.g. introduce a `LineEnd ::= "\n" | EOF` pseudo-terminal and use it in place of the literal `\n`. Define the new terminal in the same edit (alongside `RestOfLine` at lexical.md `#rest-of-line`, or in grammar.md §"`///` placement"), grounding `EOF` as the end of the post-normalisation source stream defined by lexical.md's Encoding / Newline normalisation prose.

## Solution constraints

- Out of scope: introducing a global EOF source-normalisation rule (appending a synthetic trailing `\n` to every file) in `docs/spec_topics/lexical.md` — it would interact with the unterminated-string, span-accounting, and byte-exact-reproducibility rules.

## Relationships

None
# T02 - YAML parser dialect/version never pinned though field contracts depend on it

**Kind:** assumptions
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

Loom frontmatter is YAML, and several normative field contracts on `frontmatter-fields-a.md` and `frontmatter-fields-b-and-templates.md` are expressed in terms of the parsed-value shape a YAML library is presumed to deliver, but the spec never names a YAML dialect (1.1 vs 1.2) or a pinned library. The dependences are concrete: the `mode:` recognised-key / unrecognised-value split assumes `mode: on` / `mode: yes` arrive as strings rather than the boolean `true` (a 1.1-vs-1.2 boolean-schema difference); the `tool_loop.max_rounds` / `respond_repair.attempts` integer-ness rule (`25` and `25.0` both accepted) presumes a single numeric type; the `tools:` comma short form presumes the parser delivers it as one plain scalar; and the `system:` `\${` escape rule claims the backslash "survives YAML processing", which holds for block scalars but not double-quoted flow scalars. Two implementers picking different libraries (e.g. `js-yaml` defaulting to 1.1 vs `yaml` defaulting to 1.2) produce observably different load behaviour on the same `.loom` file.

## Issue introduction

**Verdict:** present-since-inception
**Introducing commits:** 9a53d9c — Initial scaffold: package.json, README, spec.md, extensions/ (2026-05-01, Thomas Andersen)
**History:** The initial spec scaffold (9a53d9c) adopted YAML frontmatter ("loom files accept parameters declared in YAML frontmatter:" with a `mode: prompt` example) without naming a YAML version or library; no later commit has retrofitted such a pin onto `docs/spec_topics/frontmatter*.md`. Subsequent commits accreted more contracts that lean on the absent pin without closing the gap — notably 24a8079 (`tool_loop.max_iterations validation rules`) introduced the `25` vs `25.0` integer-ness rule whose wording explicitly defers to the parsed numeric value, and c8191ce (`tools: comma-form handling`) leaned on the parser delivering the short form as a plain scalar. The defect therefore predates every contract that now depends on it.

## Solution approach

Add a YAML-library entry to the **Loom-package implementation dependencies (loom 1.0)** block in `docs/spec_topics/implementation-notes.md` (`#loom-package-implementation-dependencies-loom-1-0`), on the same footing as the `semver` / `chokidar` / `ajv` entries already pinned there, naming a single library + version range and stating that its default-settings value model is the loom 1.0 contract surface for every YAML-shape field contract. Add a normative sub-paragraph above the frontmatter field-contract table grounding the dependent contracts (`mode:` boolean-vs-string, `tool_loop.max_rounds` / `respond_repair.attempts` integer-ness, `tools:` comma-form scalar split) on that pin. Clarify the `system:` `\${` escape contract on `frontmatter-fields-b-and-templates.md` to name the node styles for which backslash-survival holds under the pin and to resolve the double-quoted flow-scalar case.

## Solution constraints

- The named value model MUST keep the existing `loom/load/frontmatter-value-out-of-range` integer-ness rule (`25` and `25.0` both accepted) and the `<observed>` parsed-scalar-kind rendering enumerated on `placeholder-rendering-b.md` satisfiable.

## Relationships

None
# T03 - Inline normative definitions of `surface-set closure` and `audited source tree` in the self-described informative Prerequisites paragraph

**Kind:** placement, scope
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Decision axes:** 3
**Shape:** single
**State:** reduced

## Problem

The `### Prerequisites` "Pi SDK and capabilities." paragraph in `docs/spec/overview-and-orientation.md` declares itself informative (*"Orientation; this paragraph is informative."* … *"this paragraph carries no MUSTs of its own."*) but inline-defines two terms with full normative content: it restates *audited source tree* as `src/**/*.ts` minus the enumerated exclusions (canonically owned at `audit-resolution.md#audit-scope`) and uses *"Define surface-set closure as …"* with the three resolution paths enumerated (canonically owned at `inventory-audit-intro.md#sdk-cap-inventory-closure-audit`). Each inline definition pins concrete boundary conditions — the include glob, the typebox allow-list members — tight enough to drift from its canonical owner on a later edit, with no tie-break rule naming which site wins. The "informative; no MUSTs" framing then suppresses the gate that would normally catch such a definitional divergence. The `glossary.md` *surface-set closure* entry compounds this: its provenance clause claims the term was "Coined … in `spec.md` Orientation/Prerequisites", which becomes false the moment the orientation and canonical texts disagree on a boundary case.

## Issue introduction

**Verdict:** single-commit
**Introducing commits:** e5cd514 — pi-loom spec: resolve "T35 SDK capability inventory closed-set negative-direction audit" (2026-05-09, Thomas Andersen)
**History:** Before commit `e5cd514` the Prerequisites paragraph (then in `docs/spec.md`) already carried the *"Orientation; this paragraph is informative … this paragraph carries no MUSTs of its own"* framing but did not mention an audited source tree or coin *surface-set closure*. Commit `e5cd514` resolved the T35 SDK-inventory finding by adding the canonical inventory-closure audit to the PIC topic page and, in the same edit, inserted the *"audited source tree, equal to `src/**/*.ts` …"* parenthetical and the *"Define *surface-set closure* as the property that …"* sentence into the orientation paragraph without revisiting its informative-orientation framing — re-stating the definitions inline at the orientation site rather than pointing at the new PIC owner. The June 4 split commit `f5e89f4` carried the same prose verbatim from `docs/spec.md` to `docs/spec/overview-and-orientation.md`, and the June 5 commit `589d9a4` later added the glossary alias whose "Coined as … in `spec.md` Orientation/Prerequisites" provenance line now hard-codes the orientation site as the coinage; the underlying placement defect has been present in the orientation paragraph since `e5cd514`.

## Solution approach

In the orientation `### Prerequisites` paragraph, replace the *audited source tree* parenthetical with a bare forward-link to `audit-resolution.md#audit-scope`. Replace the *"Define surface-set closure as …"* sentence with a forward-link to its canonical definition (`inventory-audit-intro.md#sdk-capability-inventory`) and its enforcement (`inventory-audit-intro.md#sdk-cap-inventory-closure-audit`). Repoint the `glossary.md` *surface-set closure* provenance clause to name the PIC inventory-audit page as the coining site rather than the orientation paragraph.

## Solution constraints

- Out of scope: the same paragraph's seven-capability cardinality restatement (the `CAPABILITY_OBLIGATIONS.length === 7` clause), owned by a separate finding — do not edit it in this fix.
- Do not delete the `glossary.md` *surface-set closure* entry; other spec pages cross-link it, so only its provenance clause changes.

## Relationships

None
# T04 - `FileSystem.realpath` canonicalisation/case-folding behaviour unpinned, leaving DISC-3 dedup correctness implementation-defined

**Kind:** assumptions
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

The PIC-13 `realpath` member in `host-interfaces-services.md` (`id="pic-13"`) pins symlink-following, absoluteness, and the `ELOOP` / `ENOENT` / `EACCES` rejection codes, but pins no canonicalisation, case-folding, or Unicode-normalisation behaviour for successful resolutions. DISC-3's `loom/load/non-canonical-extension` dedup in `discovery-sources.md` (the `**Non-canonical extension case.**` paragraph) and the byte-exact discovery-root-containment check in `invocation.md` Resolution both depend on `realpath` returning byte-identical strings for case-equivalent and normalisation-equivalent inputs that name the same on-disk directory entry. With that property left implicit, two conforming `FakeFileSystem` implementations — and production `realpath` across case-sensitive Linux, NTFS, and APFS — can diverge on whether the warning fires, reducing the diagnostic to a platform- and fixture-dependent flake gate.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:**
- `970a03a` (2026-05-06) — `pi-loom spec: resolve "Extension matching has no defined case-folding policy"` — first authored the "Non-canonical extension case" paragraph in `spec_topics/discovery.md`, introducing the `realpath`-based dedup language ("the loader deduplicates by `realpath` *before* the case-check fires") without pinning the canonicalisation contract the dedup depends on.
- `76c649f` (2026-06-04) — `pi-loom spec: resolve "realpath required by Resolution but absent from FileSystem seam"` — added the `realpath` member to PIC-13 with `ELOOP` / `ENOENT` / `EACCES` semantics but did not pin case-folding / Unicode-normalisation behaviour, leaving the load-bearing consumer in `970a03a` still on an implicit contract.
- `9dfbcee` (2026-06-05) — `pi-loom spec: resolve "non-canonical-extension dedup keys on realpath but claims same-inode siblings"` — replaced the original "same inode" phrasing with "alternate spellings of one directory entry that `realpath` resolves to a single canonical path", refining the consumer prose but not the seam contract; the gap survived.

**History:** The defect is the *interaction* between an introduced consumer (`970a03a`) and a later seam declaration (`76c649f`) that pinned error semantics but skipped the canonicalisation semantics the consumer relies on, plus a polish pass (`9dfbcee`) that touched the consumer wording without revisiting the seam. No single commit is the durable origin; the durable fix lands on the seam, not on any one of these commits.

## Solution approach

Clarify the PIC-13 `realpath` bullet in `host-interfaces-services.md` to pin the canonical-form property the spec relies on — successful resolutions return byte-identical strings for inputs that name the same on-disk directory entry, stated as an observable on the return value rather than a platform-conditional algorithm — and require `FakeFileSystem` to model that property against its constructor-injected symlink table. Add a forward-link from the `**Non-canonical extension case.**` paragraph in `discovery-sources.md` to the pinned seam behaviour so the consumer's dependency is discoverable.

## Solution constraints

- The canonicalisation pin MUST apply uniformly to the `invocation.md` Resolution byte-exact discovery-root-containment check (both root and callee inputs), not be scoped to the DISC-3 dedup alone.

## Relationships

None
# T05 - Underlying-error coercion does not cover all error-bearing `details` / `hint` fields

**Kind:** implementability, assumptions
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

The *Underlying-error coercion* paragraph (`id="underlying-error-coercion"`) in `placeholder-rendering-b.md` is written to guarantee that every producer site populating an error-message field from a caught thrown value coerces deterministically rather than emitting `undefined`, a non-string value, or a synchronous `TypeError`. Its in-scope enumeration lists `details.error`, `hint`, `message`, and `CodeToolError.message`, but omits at least two existing producer sites that bind a caught throw: `details.cause` on the `loom/load/host-incompatible` `probe-failed` arm (a non-`Error`-shaped probe throw has no rendering rule), and the `error.stack` `hint` on `loom/runtime/internal-error` (the existing falsy fallback to `"<no stack available>"` does not handle a truthy non-string `.stack`, which the paragraph's `.message`-only coercion does not reach). Two known wire shapes are therefore left undefined, so two conformant implementations can diverge byte-for-byte on a hostile `probe-failed` throw or a non-string `internal-error` `.stack`.

## Issue introduction

**Verdict:** single-commit
**Introducing commits:** bf85092 — pi-loom spec: resolve "non-Error-throw coercion + session_start pi.getCommands() failure contract" (2026-06-06, Thomas Andersen)
**History:** The *Underlying-error coercion* paragraph and its `id="underlying-error-coercion"` anchor first entered the corpus in `bf85092`, which authored the in-scope enumeration as `details.error` / `hint` / `message` / `CodeToolError.message`. The two omitted producer sites already existed at that commit's parent — `details.cause` on the `host-incompatible` `probe-failed` arm is present in `bf85092^` — so the incomplete enumeration was a property of the paragraph from the moment it was authored. No later commit narrowed or widened the list.

## Solution approach

Extend the *Underlying-error coercion* enumeration so it covers every existing diagnostic field that binds a caught thrown value, adding `details.cause` (for `loom/load/host-incompatible` `probe-failed`) and the `error.stack` `hint` on `loom/runtime/internal-error`. For the stack-bearing field, extend the coercion so a non-string `error.stack` is reduced to a string by the same rule chain before the existing falsy `"<no stack available>"` fallback and first-line truncation apply. Add an audit-pin sentence requiring any future registry row that binds a caught throw to a `details.*` or `hint` field to join this enumeration, mirroring DIAG-2's (`id="diag-2"`) closed-registry posture.

## Solution constraints

- Out of scope: the `details.step` token enumeration on the `host-incompatible probe-failed` row, owned by T29.
- The coverage extension MUST key on caught-throw binding only; it MUST NOT fold in fields that bind a string by construction (`<original content first line>`) or a non-error value (the integer `hint` on `loom/runtime/reload-teardown-timeout`).

## Relationships

- T29 "`loom/load/host-incompatible` `details.step` enumeration in the diagnostics-side row is out of sync with the canonical probe enumeration" — same-cluster (same `host-incompatible` `probe-failed` payload row, different field — `details.cause` coercion here vs `details.step` token coverage there; both must land before the `probe-failed` arm's wire contract is total).
# T06 - Prompt-mode `loomAbort.abort()` → `ctx.abort()` teardown call has no defined throw disposition

**Kind:** error-model
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Decision axes:** 3
**Shape:** single
**State:** reduced

## Problem

In prompt mode the runtime tears down the user run by calling `ctx.abort()` on the captured `ExtensionCommandContext` when `loomAbort.abort()` fires (the teardown direction of the `loomAbort` ↔ `ExtensionCommandContext` linkage, pinned in the *Slash-command entry* bullet under **Forwarding into `loomAbort`** in `docs/spec_topics/cancellation.md` and relied on as the sole bounding mechanism for a `waitForIdle()` hang in `conversation-drive.md`). The **Forwarding-listener throw** clause assigns a throw disposition only to the opposite (forwarder) direction and explicitly carves the teardown direction out as "unaffected by this rule", leaving no disposition for a throw from the runtime's own `ctx.abort()` teardown call. If such a throw is swallowed, `await ctx.waitForIdle()` can hang the invocation indefinitely (it has no internal deadline and `loomAbort.signal.aborted` does not by itself wake it); if it escapes uncaught, the failure surfaces against no named runtime diagnostic. Two implementers will diverge on whether the invocation hangs, panics, surfaces `cancelled`, or surfaces `internal-error`.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** d54d798 ("pi-loom spec: resolve \"waitForIdle resolution, error, and hang semantics not contracted\"", 2026-05-06); f20ef73 ("pi-loom spec: resolve \"Per-call AbortController/AbortSignal defect routing has gaps\"", 2026-05-07)
**History:** Commit d54d798 introduced the teardown call itself by appending to the *Slash-command entry* bullet of `spec_topics/cancellation.md` the sentence "Forwarding is also bidirectional in prompt mode: when `loomAbort.abort()` fires … the runtime calls `ctx.abort()` on the captured `ExtensionCommandContext` to tear down the user run and unblock `await ctx.waitForIdle()`", with no accompanying throw-disposition rule. The following day, f20ef73 added the **Forwarding-listener throw** paragraph and a parallel **Abort-reason propagation** paragraph; both were authored for the *forwarder* direction (`source.signal` → `loomAbort.abort(source.reason)`) and the latter explicitly excludes the teardown direction by name ("The bidirectional prompt-mode propagation (`loomAbort.abort()` → `ctx.abort()`) goes the other direction across the linkage and is unaffected by this rule"). The same commit added to `host-interfaces-core.md`'s `abort` override row a citation back to the forwarding-listener trap, but that citation is scoped to the wrapped `ctx.abort()` invoked from loom tool code, not to the unwrapped host `ctx.abort()` the runtime calls from the teardown path. The defect is therefore a gap *between* the two commits: d54d798 introduced the call without a disposition, f20ef73 introduced a disposition framework for only one of the two propagation directions and explicitly carved the other out. No single subsequent commit revisits the teardown side.

## Solution approach

Add a clause to `docs/spec_topics/cancellation.md` sibling to **Forwarding-listener throw** that assigns a throw disposition to the prompt-mode teardown direction (`loomAbort.abort()` → host `ctx.abort()`), routing a trapped throw through the same `loom/runtime/internal-error` runtime-defect surface and `InvokeInfraError` `cause: "internal_error"` arm the forwarder-direction clause uses, without masking the cancellation. Pin how the trap unblocks the pending `await ctx.waitForIdle()` so the invocation reaches its `finally` block rather than hanging, and scope the clause to prompt mode (subagent mode has no `waitForIdle()` hang surface). Add forward-links to the new clause from the `abort` row of the *Per-mode override semantics* table in `host-interfaces-core.md` (which already cites the forwarder-direction clause) and from the `waitForIdle()` hang-handling clause in `conversation-drive.md`.

## Solution constraints

- Out of scope: the `agent_end` user-cancelled discriminator naming in the *Slash-command entry* bullet of `cancellation.md`, owned by T07.

## Relationships

- T07 "`agent_end` user-cancelled discriminator field never named" — same-cluster (both pin a missing piece of the cancellation forwarding wiring in `cancellation.md`; resolve independently).
# T07 - `agent_end` user-cancelled discriminator field never named

**Original heading:** `agent_end` user-cancelled discriminator field never named
**Original section:** docs/spec_topics/cancellation.md
**Kind:** assumptions
**Importance:** medium
**Score:** 25
**Must-fix:** false

## Finding

`docs/spec_topics/cancellation.md` — Forwarding into `loomAbort` — *Slash-command entry* bullet pins a second slash-command-entry trigger for `loomAbort.abort()` distinct from the `ctx.signal`-aborted path: *"equivalently, an `agent_end` event reporting a user-cancelled turn aborts `loomAbort`."* This is the path that makes Esc-during-`@`-query work end-to-end when the runtime is sitting inside its `agent_end` handler and the per-handler `ctx.signal` is not the carrier of the cancellation signal — confirmed as a distinct trigger by the **Abort-reason propagation** paragraph in the same file, which calls it out as the one of three forwarding paths that *"has no source `AbortSignal` — there is no `reason` to forward"* and so synthesises its own `Error("loom cancelled by agent_end")` reason.

The spec never names which field on the `AgentEndEvent` payload (declared at `dist/core/extensions/types.d.ts` in `@earendil-works/pi-coding-agent` and treated as opaque per PIC-18 in `pi-integration-contract/conversation-drive.md`) carries the *"reporting a user-cancelled turn"* discriminator the trigger keys on. PIC-18 names two `AgentEndEvent` fields by hand (`willRetry`, and the terminal-`agent_end` `messages` array) but nothing about a user-cancelled marker; the cancellation forwarding paragraph itself names none. An implementer wiring this trigger has no spec-pinned answer to "which property of the event do I read, and what value indicates user cancellation?" — they may read `willRetry: false` alone (wrong: every terminal `agent_end` has it), they may invent a `cause` / `stopReason` / `reason` probe by analogy with `AssistantMessage.stopReason`, or they may give up and rely only on the `ctx.signal`-aborted handler bullet — silently degrading the Esc-during-`@`-query path on any Pi build where Pi delivers the cancellation through the event payload before flipping `ctx.signal`.

Either the discriminator is a real, named `AgentEndEvent` member that PIC must pin (alongside `willRetry`), or it is a behavioural property of Pi's `agent_end` delivery that has no typed surface and must be recorded as a named consumption-posture presupposition under [host-interfaces-core.md — *Pi-side slash-handler promise lifecycle*](./pi-integration-contract/host-interfaces-core.md) so the [Pi version bump procedure](./pi-integration-contract/version-bump-intro.md) re-audits it on every Pi minor.

## Spec Documents

- `docs/spec_topics/cancellation.md` — *Forwarding into `loomAbort`* (slash-command entry bullet) — edited
- `docs/spec_topics/pi-integration-contract/conversation-drive.md` — PIC-18 (turn-lifecycle event subscription) — option-dependent (the field, if one exists, would be pinned alongside the other `AgentEndEvent` fields named there)
- `docs/spec_topics/pi-integration-contract/host-interfaces-core.md` — *Pi-side slash-handler promise lifecycle (consumption posture)* presuppositions (i)–(vi) — option-dependent (the new presupposition, if a presupposition is what's recorded, lands in this list)
- `docs/spec_topics/pi-integration-contract/version-bump-step2.md` — Editorial-review checklist for unpinned host presuppositions — option-dependent (a new bump-checklist item, parallel to (v), would be added if the field is recorded as a presupposition)
- `docs/spec_topics/pi-integration-contract/conversation-drive.md` — *Abort-reason propagation* clause (read-only) — confirms the `agent_end`-driven trigger is genuinely distinct from the `ctx.signal`-aborted path

## Plan Impact

**Phases:** N/A

**Leaves (implementation order):** N/A

## Consequence

**Severity:** correctness

Two implementers wiring the slash-command `agent_end` handler are free to pick different probes for "this `agent_end` reports a user-cancelled turn" — `willRetry`, a `stopReason`-style field, the absence of an assistant text payload, or nothing at all (collapsing the trigger into the `ctx.signal`-aborted bullet). On the implementations that pick "nothing", Esc-during-`@`-query falls back to whatever ordering Pi happens to use between the `agent_end` event and the `ctx.signal` abort, and a Pi build that fires `agent_end` first leaves `loomAbort` un-aborted until the next `ctx.signal` observation — the path the cancellation surface explicitly cites this trigger to cover.

## Issue introduction

**Verdict:** single-commit
**Introducing commits:** 8395c03 — pi-loom spec: resolve "Cancellation source ctx.signal is undefined when a slash-handler starts" (2026-05-04, Thomas Andersen)
**History:** The "Forwarding into `loomAbort`" subsection was authored in commit 8395c03 when the spec replaced the older "Signal sources" three-bullet list with the current per-entry-point forwarding rules. That edit introduced the slash-command-entry bullet's *"equivalently, an `agent_end` event reporting a user-cancelled turn aborts `loomAbort`"* clause verbatim, with no field name. Later edits to the same paragraph (5c8e630 reworked the subagent forwarding direction; d54d798 added the prompt-mode bidirectional `ctx.abort()` propagation; fdc5115 added the single-macrotask abort-flip presupposition cross-link) refined surrounding clauses but never returned to name the `agent_end` payload field this trigger reads. The discriminator gap has been present in every released version of the section since 8395c03.

## Solution Space

**Shape:** multiple
**State:** shaped

### Option A — Pin the discriminator as a named `AgentEndEvent` field

**Approach.** Confirm against the `@earendil-works/pi-coding-agent` SDK pin which `AgentEndEvent` member carries the user-cancellation discriminator (likely candidates: a `cause` / `stopReason` / `reason` field, or the combination of `willRetry: false` and a specific `stopReason` value), then edit cancellation.md's slash-command-entry bullet to name the field and pin the value(s) that trigger `loomAbort.abort()`. Cross-link to PIC-18 in conversation-drive.md so the field joins the other named `AgentEndEvent` members (`willRetry`, the terminal `messages` array) on the same opacity footing.

**Spec edits.**
- `docs/spec_topics/cancellation.md` — replace the *"equivalently, an `agent_end` event reporting a user-cancelled turn aborts `loomAbort`"* clause with one that names the field and the discriminator value (e.g. *"…or, equivalently, an `agent_end` event whose `<field>: <value>` reports a user-cancelled turn aborts `loomAbort`"*).
- `docs/spec_topics/pi-integration-contract/conversation-drive.md` — extend PIC-18's "loom redefines none of these externally-owned types and treats each event payload as opaque apart from the cancellation-relevant fields the forwarding rules read" clause to enumerate the newly-named field by name, alongside `willRetry`.

**Pros.** Implementer reads the field name straight from the spec; PIC-18's existing "fields the forwarding rules read" framing already accommodates a third named field; bump-checklist item (v) (turn-lifecycle event delivery) already audits the per-handler `AgentEndEvent` payload semantics on every Pi minor, so no new checklist item is needed.

**Cons.** Requires confirming the field actually exists on the loom-1.0-pinned SDK; if the discriminator is *behavioural* (Pi fires `agent_end` then flips `ctx.signal`, with no payload field at all), this option collapses into Option B by default. Adds a third externally-owned field to the loom-side opacity exception, slightly broadening the SDK surface the bump audit must re-validate.

**Risks.** A future Pi minor that renames or removes the field silently degrades the trigger; mitigated by bump-checklist item (v), which already covers per-handler `AgentEndEvent` semantics.

### Option B — Record the trigger as a named consumption-posture presupposition

**Approach.** Treat the *"`agent_end` reports user-cancellation"* property as a behavioural property of Pi's `agent_end` delivery that has no typed surface (analogous to the `pi.on` process-global / no-per-session-origin-marker property bump-checklist item (ah) covers, or to the driven-turn session-commit ordering item (ac) covers). Add it to the `host-interfaces-core.md` *Pi-side slash-handler promise lifecycle (consumption posture)* presupposition list (i)–(vi), and add a parallel bump-checklist item alongside (v) so each Pi minor re-audits whether the trigger still fires.

**Spec edits.**
- `docs/spec_topics/cancellation.md` — replace the unnamed-discriminator clause with one that cross-links to the new presupposition (e.g. *"…or, equivalently, an `agent_end` event reporting a user-cancelled turn (per the consumption posture pinned at [host-interfaces-core.md](./pi-integration-contract/host-interfaces-core.md)) aborts `loomAbort`"*).
- `docs/spec_topics/pi-integration-contract/host-interfaces-core.md` — extend the (i)–(vi) presupposition list with a new entry naming the trigger and stating what falsification looks like (Pi stops firing `agent_end` on user-cancelled turns, fires it without a payload signal the runtime can distinguish from a normal `agent_end`, etc.).
- `docs/spec_topics/pi-integration-contract/version-bump-step2.md` — add a new editorial-review checklist item parallel to (v), keyed to the new presupposition.

**Pros.** Does not require asserting an SDK field exists; lines up structurally with the existing six-presupposition pattern; survives a Pi minor that delivers the discriminator behaviourally without a typed field; the bump-checklist coverage stays consistent with how comparable unpinned behaviours (`pi.on` delivery, commit-vs-resolution ordering, single-macrotask abort flip) are already audited.

**Cons.** Implementer still has no spec-named runtime probe — the presupposition tells them *what* to assume Pi guarantees, not *which property to read*; the implementation discretion stays wide. Some risk that the trigger collapses into "the `ctx.signal`-aborted path already covers this in practice" and the second trigger becomes dead spec text.

**Risks.** If the discriminator *is* a real field on `AgentEndEvent`, Option B leaves spec leaving the implementer one inference step short of a clean wiring; mitigated by naming likely candidate-field shapes in the presupposition prose without pinning any one of them.

### Recommendation

Take **Option A** if the loom-1.0-pinned SDK turn-out admits a clean answer (confirm by reading `dist/core/extensions/types.d.ts`'s `AgentEndEvent` declaration); fall back to **Option B** if the discriminator is genuinely behavioural. Order of work: first confirm against the SDK pin (cheap, decisive), then write the edit for whichever option that confirmation selects. The edit lands in `docs/spec_topics/cancellation.md` first (the home of the trigger), then in the consumer-side files (PIC-18 for Option A, host-interfaces-core.md + version-bump-step2.md for Option B). Implementer must watch one edge case either way: a Pi build that fires `agent_end` *before* flipping `ctx.signal`, where the `agent_end`-driven trigger is the only one that fires in time to catch the cancellation inside the current handler turn — the unnamed-discriminator status today silently fails that edge case.

## Relationships

- T06 "Prompt-mode `loomAbort.abort()` → `ctx.abort()` teardown call has no defined throw disposition" — same-cluster (both pin a missing piece of the cancellation forwarding wiring in `cancellation.md`; resolve independently).

---

# T08 - Mid-batch cancellation behaviour for surviving siblings in a model-driven parallel tool-call batch is undefined

**Kind:** error-model
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

The query tool loop and `tool-calls.md` §Concurrency pin two adjacent rules for model-driven parallel tool-call batches: the runtime awaits every call in a batch to settle and lowers each outcome independently (the success/failure mix), and cancellation of a model-driven `execute()` surfaces as `CancelledError` and is never fed back as a tool-result. Neither rule covers `loomAbort` firing while a parallel batch still has at least one unsettled sibling, so the fate of the surviving in-flight siblings is undefined. The `CNCL-1`/`CNCL-2`/`CNCL-3` discard rules in `cancellation.md` are scoped to the tool-call checkpoint and explicitly do not extend to the `@`-query provider Promise where model-driven siblings live, so there is no per-sibling analogue. Two reasonable implementers diverge: one awaits the batch and silently drops the computed results, the other cancels immediately and discards late settlements.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** 7ce0ffa — pi-loom spec: resolve "Tool registry mutation during execution and model-driven parallel tool calls" (2026-05-04, Thomas Andersen); 7159420 — pi-loom spec: resolve "ModelToolError firing condition + parallel mixed-outcome surfacing" (2026-06-03, Thomas Andersen); 482098b — pi-loom spec: resolve "Tool-call late-settlement discard needs three CNCL-N sub-anchors" (2026-06-04, Thomas Andersen).
**History:** Commit 7ce0ffa established the parallel-tool-mode batch protocol and the `.loom`-callable re-entrancy posture without addressing mid-batch cancellation. Commit 7159420 then pinned the two adjacent rules whose composition has the gap — the "await the whole batch to settle, lower each outcome independently" rule (success/failure mix) and the "cancellation of a model-driven `execute()` surfaces as `CancelledError` and is never fed back" rule (single in-flight call). Commit 482098b later refined the late-settlement discard at the tool-call boundary into `CNCL-1`/`CNCL-2`/`CNCL-3` and explicitly *excluded* the `@`-query provider Promise from that scope, foreclosing the most natural reading that would have closed the gap implicitly. The defect is the joint absence — none of the three commits owns the model-driven parallel-batch cancellation rule, and the explicit non-extension in 482098b makes the gap normative.

## Solution approach

Add a normative rule to `query/query-tool-loop.md` §"Tool calls during a query", following the existing model-driven-`execute()` cancellation sentence, pinning mid-batch cancellation: when `loomAbort` fires while a model-driven parallel tool-call batch has at least one unsettled sibling, the query surfaces as `Err(QueryError { kind: "cancelled", ... })` at the next checkpoint without awaiting the remaining siblings and without feeding any sibling's result back, with late settlements of every sibling Promise discarded under the swallowing-handler obligation in `cancellation.md` §"Race semantics — swallowing-handler attachment on every abandonable Promise". Add a forward-link from `tool-calls.md` §Concurrency's "awaits every call in the batch to settle" sentence scoping it to the success/failure mix and pointing at the new rule for the cancellation case.

## Solution constraints

- Out of scope: `cancellation.md`'s `CNCL-1`/`CNCL-2`/`CNCL-3` tool-call-checkpoint scoping — reference the swallowing-handler obligation by cross-reference; do not extend the discard rules or open a per-sibling `Err` channel for the `@`-query provider Promise.

## Relationships

None
# T09 - Envelope-arguments parse/schema-validation failure not routed at the extraction site

**Kind:** error-model
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

The structured-output extraction paragraph in `binder-inference.md` names only one arm of the malformed-envelope condition: an `AssistantMessage` carrying no matching `ToolCall` (plain text, or a `ToolCall` with a different `name`). It is silent on the case where a `ToolCall` matches by `name` but its `arguments` string fails JSON parsing or fails envelope-schema validation. The downstream *Failure-class taxonomy* in `determinism-cancellation-failure.md` (anchor `#failure-class-taxonomy`, *Malformed-envelope class* bullet) already covers those sub-cases, but the extraction site does not route to it. An implementer reading the extraction paragraph in isolation may conclude the `arguments` payload is implicitly trusted once `name` matches, or that a parse throw escapes the binder loop rather than consuming the malformed-envelope retry budget.

## Issue introduction

**Verdict:** single-commit
**Introducing commits:** fb3474f — pi-loom spec: resolve "Binder inference call — no pi-ai entry point pinned" (2026-06-04, Thomas Andersen)
**History:** The extraction paragraph was authored in `fb3474f`, which added the "Binder inference call" subsection to `pi-integration-contract.md` (later split into `pi-integration-contract/binder-inference.md` by `78a2f94`). The paragraph has carried the same two-arm enumeration ("no such `ToolCall` — plain text only, or a `ToolCall` with a different `name`") and the same forward link to *Failure-class taxonomy* since its first revision; the matching-name/invalid-`arguments` arm was never named at this site. Subsequent edits (`d0bcdb2`, `b884cda`, the topic split) reworded surrounding sentences but did not touch the malformed-envelope enumeration.

## Solution approach

In `binder-inference.md`, rewrite the malformed-envelope sentence in the structured-output extraction paragraph (the one following the `complete()` field enumeration) so it also names the arm where a matching-`name` `ToolCall` carries `arguments` that fail JSON parsing or envelope-schema validation, and routes that arm to the same `Failure-class taxonomy` cross-reference (`#failure-class-taxonomy`) that already governs the absent/wrong-name arm.

## Solution constraints

- Out of scope: do not modify `determinism-cancellation-failure.md` — its *Failure-class taxonomy* already enumerates the parse/schema/discriminator/`kind`-domain sub-cases and owns the retry-budget classification; the fix must route both arms to it, not restate those rules at the extraction site.

## Relationships

None
# T10 - `pi.registerTool` first-encounter throw has no failure contract at the cited deferral target

**Kind:** error-model
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

The closing sentence of the **Extension-bootstrap SDK failures** paragraph in `extension-bootstrap-and-per-loom.md` defers `pi.registerTool` failures to the **Tool-registration lifetime and visibility** section, but that section specifies only the byte-mismatch cache-collision path (`loom/runtime/registration-cache-collision`) and never states what happens when a first-encounter `pi.registerTool` call itself throws. The rule that actually covers the throw lives two pages away in `capability-probe.md`'s **Post-probe SDK-shape drift** paragraph, which routes post-probe throws to `loom/runtime/internal-error`. The deferral also mischaracterises timing: `pi.registerTool` does not run at factory time — it runs from the watcher swap (step 5, `loom/runtime/registry-swap-failed`) and lazily from prompt-mode invocation. Two implementers will diverge on which diagnostic code a first-encounter throw emits and on whether it aborts the in-flight query, fails the watcher swap, or merely degrades the registration cache.

## Issue introduction

**Verdict:** present-since-inception
**Introducing commits:** 2d2fc8e — pi-loom spec: resolve "Pi SDK capability calls have no failure contract" (2026-05-06, Thomas Andersen)
**History:** The **Extension-bootstrap SDK failures** block, including the closing sentence that defers `pi.registerTool` failures to the **Tool-registration lifetime and visibility** section, first entered the corpus in `2d2fc8e` (confirmed by the `-S 'Extension-bootstrap SDK failures'` pickaxe over the spec). The lifetime section at that point carried only the byte-mismatch `registration-cache-collision` rule and no first-encounter-throw rule, so the cross-reference was misdirected from inception. `eb33bf9` (2026-05-07) later added the post-probe catch-all routing in `capability-probe.md` that de facto covers the throw but did not reconcile the deferral pointer, leaving the stale cross-reference in place.

## Solution approach

Rewrite the closing deferral sentence of the **Extension-bootstrap SDK failures** paragraph in `extension-bootstrap-and-per-loom.md` so it no longer asserts factory-time invocation and instead routes each first-encounter `pi.registerTool` throw to its owning rule. Add a forward-link to `registration-steps.md#watcher-hot-reload-registration` for the watcher-swap path (`loom/runtime/registry-swap-failed`) and to `capability-probe.md#post-probe-sdk-shape-drift` for the prompt-mode invocation path (`loom/runtime/internal-error`), and reference the byte-mismatch cache-hit path under `tool-registration-lifetime.md` (`loom/runtime/registration-cache-collision`).

## Solution constraints

- MUST NOT introduce a new diagnostic code; the routing reuses only the existing `loom/runtime/registry-swap-failed`, `loom/runtime/internal-error`, and `loom/runtime/registration-cache-collision` codes in `code-registry-runtime.md`.
- Out of scope: the cross-extension silent-success collision posture on the same `pi.registerTool` first-encounter call site, owned by T13.

## Relationships

- T13 "`__loom_` tool-name prefix never reserved; cross-extension `pi.registerTool` collision posture unaddressed" — same-cluster (different failure mode on the same `pi.registerTool` first-encounter call site; this finding addresses the *throw* path, T13 addresses the *silent-success-into-existing-entry* path; resolve independently).
# T11 - `ToolResultMessage.content` element type and text-block discriminator unpinned

**Kind:** implementability
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

In the `SessionContext` element-shape subset on `host-interfaces-core.md`, the `ToolResultMessage` bullet states only that its `content` is "a typed-block array" and that the renderer reads "the text-block content" for the `[tool]` body. It leaves the element union, the `type` discriminator, and the text field name unstated — unlike the adjacent `AssistantMessage` bullet, which pins its union (`(TextContent | ThinkingContent | ToolCall)[]`) and each block's discriminator and field. The compact-transcript renderer (BNDR-7g) must know which element types are in the union, which `type` literal marks a text block, and which field carries the text; with none of that pinned at the load-bearing site, the renderer's contract reduces to whatever the SDK happens to declare, and a Pi minor widening the union would not surface as a version-bump audit failure.

## Issue introduction

**Verdict:** single-commit
**Introducing commits:** 01c9db9 — pi-loom spec: resolve "compact-transcript renderer references undeclared SessionContext/AgentMessage fields" (2026-06-03, Thomas Andersen)
**History:** The `SessionContext` element-shape subset was authored by `01c9db9` to fix an earlier "undeclared SessionContext/AgentMessage fields" finding. In that commit the `AssistantMessage` bullet was given a precise element union (`(TextContent | ThinkingContent | ToolCall)[]`) with per-block field reads, while the `ToolResultMessage` bullet was authored with the looser "typed-block array … text-block content" phrasing it still carries. Commit `f5e89f4` later split `pi-integration-contract.md` into the subdirectory+index layout and moved the same bullets verbatim into `host-interfaces-core.md`; it changed no content. The asymmetry has been present at this exact wording since `01c9db9`.

## Solution approach

Rewrite the `ToolResultMessage` bullet on `host-interfaces-core.md` to pin the same shape the adjacent `AssistantMessage` bullet carries: name the element union `(TextContent | ImageContent)[]`, the `type: "text"` text-block discriminator, and the `TextContent.text` field the renderer reads. Forward-link to `#bndr-7g` for the non-text-block disposition rather than restating the serialisation algorithm. Cite the `TextContent` and `ImageContent` declarations in the same `@earendil-works/pi-ai` `dist/types.d.ts` already referenced two bullets up, rather than introducing a fresh `TextContent` description.

## Solution constraints

- Out of scope: the BNDR-7g non-text-block serialisation algorithm in `binder-model-and-context.md` — forward-link to `#bndr-7g`, do not restate or modify it (same-cluster with T18).

## Relationships

- T18 "`toolResult` non-text block serialization is not key-order-stable, breaking the byte-reproducibility contract" — same-cluster (touches the renderer's handling of `ToolResultMessage.content` non-text blocks (BNDR-7g); fixing one does not fix the other, but the version-bump audit item should be threaded through both).
# T12 - `__loom_respond_<slug>` synthesised name has no reservation against the frontmatter callable set

**Kind:** assumptions
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Decision axes:** 3
**Shape:** single
**State:** reduced

## Problem

The synthesised typed-query respond-tool name `__loom_respond_<slug>` —
and the three sibling synthesised forms enumerated at
[Schema Subset — Synthesised names](docs/spec_topics/schema-subset.md#synthesised-names)
(`__loom_callee_<slug>__<post-rename-name>`, `__loom_bind_<slug>`, and the
`__inline_<slug>` `$defs` key) — is presupposed disjoint from every
frontmatter-`tools:`-derived name by three name-equality discriminators:
the name-based dispatcher in
[Query — Typed queries are tool-loop-shaped](docs/spec_topics/query/query-tool-loop.md),
the forced-respond non-compliance check in
[Query — Schema-validation respond-repair](docs/spec_topics/query/query-failure-and-repair.md),
and the flat active-set name list in
[Pi Integration Contract — Tool-registration lifetime and visibility](docs/spec_topics/pi-integration-contract/tool-registration-lifetime.md).
The spec never establishes that disjointness: the `tools:` collision check
in [Parameters and Frontmatter — `tools`](docs/spec_topics/frontmatter/frontmatter-fields-a.md)
fires only on intra-`tools:` duplicates, top-level `fn` clashes, and
imported-symbol clashes (`loom/load/tool-name-collision`) and never excludes
the synthesised `__loom_` / `__inline_` namespace, while the lexical
identifier rule (which admits a leading `_`) and the `as <name>` rule both
admit names that could land in it. The collision probability is vanishingly
small, but the runtime contract treats name-equality as the discriminator
and so requires an explicit reservation to be implementable without
defensive guesswork.

## Issue introduction

**Verdict:** present-since-inception
**Introducing commits:** fae85d3 — Tighten spec for implementation-plan readiness (2026-05-04, Thomas Andersen)
**History:** The synthesised tool name `__loom_respond_<schema-hash>` was introduced in fae85d3 alongside the typed-query mechanism, in a single commit that authored the synthesis, registration, and forced-tool-use protocol. The accompanying file later split into `docs/spec_topics/schema-subset.md`, `docs/spec_topics/implementation-notes.md`, and the `query/` and `pi-integration-contract/` clusters (fecb504 onward); each split inherited the synthesis prose verbatim without ever adding a reservation rule against frontmatter `tools:` names. The collision-check site at `docs/spec_topics/frontmatter/frontmatter-fields-a.md` (`loom/load/tool-name-collision`) has covered intra-`tools:` duplicates, top-level `fn` clashes, and imported-symbol clashes since the same split, but has never enumerated the synthesised-name namespace as an additional disjoint set. The defect is therefore the original synthesis's silent presupposition, carried forward unchanged.

## Solution approach

Reserve the `__loom_` and `__inline_` synthesised-name namespaces as
loom-owned at
[Schema Subset — Synthesised names](docs/spec_topics/schema-subset.md#synthesised-names),
declaring that no author-supplied identifier may resolve into either
namespace, and forward-link the load-time enforcement. Extend the `tools:`
collision rule at
[Parameters and Frontmatter — `tools`](docs/spec_topics/frontmatter/frontmatter-fields-a.md)
(the `loom/load/tool-name-collision` paragraph) so a `tools:` entry,
top-level `fn`, or imported symbol whose final resolved name lands in a
reserved namespace is a load-time error, with the check running on the
post-`as`-rename, post-basename-remap final name. Register the
corresponding load-phase error diagnostic in
[diagnostics/code-registry-load.md](docs/spec_topics/diagnostics/code-registry-load.md).

## Solution constraints

- Out of scope: the process-wide / cross-extension `pi.registerTool`
  collision posture, owned by T13.

## Relationships

- T13 "`__loom_` tool-name prefix never reserved; cross-extension `pi.registerTool` collision posture unaddressed" — co-resolve (both pin the `__loom_` namespace; this finding is about loom-internal collision with frontmatter `tools:`, T13 is about Pi's process-wide registry. The schema-subset.md §Synthesised names paragraph is the natural shared edit site, so co-resolving both in one diff is natural even though each obligation is independently coherent).
# T13 - `__loom_` tool-name prefix never reserved; cross-extension `pi.registerTool` collision posture unaddressed

**Original heading:** `__loom_` global tool-name uniqueness not stated; cross-extension collision behaviour unaddressed
**Original section:** docs/spec_topics/pi-integration-contract/ — host/registration/bootstrap/provider (shard-11)
**Kind:** assumptions
**Importance:** medium
**Score:** 25
**Must-fix:** false

## Finding

`tool-registration-lifetime.md` registers loom-synthesised tools (`__loom_callee_<slug>__<post-rename-name>`, `__loom_respond_<slug>`, and their counter-suffixed disambiguation variants) into Pi's *process-wide* tool registry via `pi.registerTool`, and the section's own opening sentence pins that "Pi's tool registry has no `unregisterTool` API … entries persist for the process lifetime." The runtime's content-addressing scheme is collision-free *within* its own extension instance (the registration cache dedups by canonical-form bytes and counter-suffixes any genuine slug collision), but the spec is silent on what happens when a *different* extension — or a second instance of pi-loom itself in the same Pi process — has previously called `pi.registerTool({ name: "__loom_respond_<somehash>", … })` with an unrelated `ToolDefinition`. Pi's `pi.registerTool` is documented at `dist/core/extensions/types.d.ts` as `registerTool(tool)`, and at the pin the implementation in `dist/core/extensions/loader.js` simply does `extension.tools.set(tool.name, …)` — i.e. silent last-writer-wins per *extension* (and `Runner.getAllRegisteredTools` collapses across extensions with *first*-writer-wins). Neither of those resolutions surfaces a diagnostic, and neither matches loom's expectation.

The spec needs to do two adjacent things: (a) declare the `__loom_` name prefix loom-reserved by convention, mirroring the `loom-` `customType` reservation already pinned at `extension-bootstrap-and-per-loom.md` lines 55–58 for `"loom-system-note"` and other future loom channels (which carries an explicit "Pi does not enforce ownership: collision is a coordination failure between extensions" posture); and (b) record the runtime's posture when `pi.registerTool(__loom_…)` returns to a registry that already contains that name — including the second-pi-loom-instance case, since `host-prerequisites.md` already declines to assert single-extension-instance-per-process. The forced-respond name-equality check in `conversation-drive.md` (`pic-typed-query-noncompliance`) and the free-phase respond-tool dispatch presuppose that the name a typed query forces is the same `ToolDefinition` the loom runtime synthesised; without the reservation + collision posture above, a colliding pre-existing registration silently re-routes the model's forced tool call into the foreign tool's `execute`, with no diagnostic and no recoverable surface.

## Spec Documents

- `docs/spec_topics/pi-integration-contract/tool-registration-lifetime.md` — Tool-registration lifetime and visibility (edited)
- `docs/spec_topics/pi-integration-contract/extension-bootstrap-and-per-loom.md` — `loom-` `customType` reservation paragraph, lines 55–58 (read-only — model for the reservation prose)
- `docs/spec_topics/pi-integration-contract/host-prerequisites.md` — Host preconditions, single-instance posture (read-only)
- `docs/spec_topics/pi-integration-contract/conversation-drive.md` — `pic-typed-query-noncompliance` forced-tool name-equality presupposition (read-only — the consumer that breaks)
- `docs/spec_topics/pi-integration-contract/registration-steps.md` — step 5 hot-reload `pi.registerTool` re-registration path (option-dependent — affected only if the collision posture differs at hot-reload time)
- `docs/spec_topics/diagnostics/code-registry-runtime.md` — runtime-code registry (option-dependent — only edited if a new `loom/runtime/registration-name-collision` code is added)

## Plan Impact

**Phases:** N/A

**Leaves (implementation order):**

N/A

(`docs/plan.md` scaffold exists but enumerates no leaves; `plan_topics/` contains only `conventions.md`, `coverage-matrix.md`, and `leaf-template.md`.)

## Consequence

**Severity:** correctness

Without the reservation + collision posture, a foreign extension that registers any `__loom_`-prefixed tool — accidentally or maliciously — silently shadows loom's synthesised respond / callee adapter under Pi's per-extension `tools.set` semantics, redirecting forced-tool calls and `tool.execute` adapter dispatch into a tool the loom runtime did not author. The failure is silent (no diagnostic surface today) and indistinguishable, from the operator's seat, from a typed-query model-compliance failure. The collision is statistically improbable in practice but its *contract* is undefined, which forces two reasonable implementers to invent different recovery behaviours.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** fae85d3 — Tighten spec for implementation-plan readiness (2026-05-04, Thomas Andersen); 27ec53d — Resolve Cluster-A: per-mode tool registration (2026-05-04, Thomas Andersen)
**History:** `fae85d3` introduced the synthesised `__loom_respond_<schema-hash>` tool name as a content-addressed identifier issued through `pi.registerTool`, without saying anything about the prefix's ownership or about what happens if Pi's process-wide registry already carries an entry under that name. `27ec53d` then formalised the prompt-mode wiring (the `Map<schema-hash, registeredToolName>` cache, the content-addressed name pattern `__loom_callee_<slug>__<post-rename-name>` / `__loom_respond_<slug>`, and the "entries persist for the process lifetime" framing) and addressed only the *visibility* dimension — "the user's bare Pi session — and every other extension — never sees a loom-synthesised tool in its active set". The complementary *naming* dimension (whether a second `pi.registerTool` from another extension under the `__loom_` prefix is admissible, and what loom does when it observes one) was never written; the section has since accreted PIC-8, PIC-17, PIC-19, the byte-equality slug-collision disambiguation, and the recovery-mutex paragraph (last touched at `d0083d7` and `19b193b`, 2026-06-05) but no edit has touched the cross-extension name-collision contract.

## Solution Space

**Shape:** multiple
**State:** shaped

This finding bundles two distinct obligations that should be resolved sequentially, smallest-scope first: (A) declare the `__loom_` namespace loom-reserved by convention (a one-paragraph edit modelled on the existing `loom-` `customType` reservation), then (B) on top of that reservation, state the runtime's posture when `pi.registerTool(__loom_…)` returns into a registry that already contains the name. (B) lands on a stable baseline once (A) is in.

### Option A — Reserve the `__loom_` tool-name prefix by convention (resolve first)

**Approach.** Add a *Naming convention* sub-paragraph to `tool-registration-lifetime.md` parallel to the `loom-` `customType` reservation already at `extension-bootstrap-and-per-loom.md` lines 55–58. State that every tool name the loom runtime ever passes to `pi.registerTool` (in loom 1.0: `__loom_callee_<slug>__<post-rename-name>`, `__loom_respond_<slug>`, and their counter-suffixed disambiguation variants) is drawn from a reserved namespace, that future loom-synthesised tool names MUST follow this convention, and that other extensions SHOULD NOT register tools whose `name` begins with `__loom_`. Use the same "Pi does not enforce ownership: collision is a coordination failure between extensions" framing the `customType` reservation already uses, so the reservation is documented as a convention rather than as a Pi-enforced contract.

**Spec edits.** A single new sub-paragraph in `tool-registration-lifetime.md` immediately under the section's opening "Pi's tool registry has no `unregisterTool` API …" sentence, mirroring the `loom-`/`loom-system-note` reservation prose. No diagnostic codes added. No cross-references rewritten.

**Pros.** Smallest possible diff; lands the prefix-ownership story; matches the established `loom-` `customType` convention exactly; unblocks option B by giving the collision-posture paragraph a *prefix-reserved-by-convention* baseline to discriminate against; co-resolves T12 (the synthesised-name reservation against frontmatter tools).

**Cons.** Convention-only reservation does not by itself address the *behaviour* on collision — that is option B's job.

**Risks.** None.

### Option B — Add the cross-extension collision posture on top of the reservation

**Approach.** Once option A's reservation is in, add a second sub-paragraph stating what the runtime does when its `pi.registerTool(__loom_…)` call would shadow (or be shadowed by) a pre-existing registration under the same name in Pi's process-wide registry. There are three coherent postures; pick **detect-and-diagnose** as the recommendation and document the rationale, but the spec edit is shape-stable across the three:

- **(B1) detect-and-diagnose-then-disambiguate** — before issuing `pi.registerTool` for a new `__loom_…` name, read `pi.getAllTools()` (already on the pinned SDK surface) and, if the name is already present, emit a new `loom/runtime/registration-name-collision` (E, runtime) diagnostic naming the colliding tool's `name` and `sourceInfo` and register under a disambiguated name using the same counter-suffix rule already pinned for byte-mismatch slug collisions. This is the recommendation: the convention-only reservation tells operators they should not collide; the detect-and-diagnose path tells them *that* they have.
- **(B2) accept-silently** — pin the silent last-writer-wins / first-writer-wins resolution Pi already implements, and document it as the loom 1.0 acceptance on the same footing as the `loom-system-note` `customType` first-loaded-wins acceptance.
- **(B3) refuse-and-abort-load** — emit `loom/load/host-incompatible` (or a new `loom/runtime/registration-name-collision` at refuse-severity) on any pre-existing `__loom_` registration and decline to load the loom. This is over-strict for loom 1.0 — a self-recovering operator should be able to remove the colliding extension without re-bootstrapping pi-loom.

**Spec edits.** A second sub-paragraph in `tool-registration-lifetime.md` immediately after option A's reservation paragraph, naming the posture; on B1, a new row in `docs/spec_topics/diagnostics/code-registry-runtime.md` for `loom/runtime/registration-name-collision`; on B1 or B3, also add the same posture to `registration-steps.md` step 5's hot-reload `pi.registerTool` re-registration path so the contract is uniform across factory-time and post-startup registration.

**Pros.** Closes the observable hole: forced-respond name-equality checks and `tool.execute` adapter dispatch can no longer silently re-route into a foreign tool. B1 specifically gives operators a recovery signal; B2 keeps the spec smaller; B3 is the most paranoid.

**Cons.** B1 introduces a new diagnostic code and the small overhead of a `pi.getAllTools()` read per first-encounter registration. B2 leaves the silent-shadow failure mode in place. B3 over-couples extension load to a foreign extension's registration order.

**Risks.** B1: the `pi.getAllTools()` call has its own failure surface (covered by `host-prerequisites.md`'s post-probe-SDK-shape-drift framing); no new risk. B2: an operator with a colliding extension has no signal beyond the typed-query-noncompliance limitation already pinned in `conversation-drive.md`. B3: a transient install of an unrelated extension that happens to use `__loom_…` could brick pi-loom load.

### Recommendation

Land option A first as a one-paragraph reservation edit modelled on the existing `loom-` `customType` reservation; then land option B1 (detect-and-diagnose-then-disambiguate) on top of the reservation. Splitting the resolution this way keeps each spec-fix-loop iteration small — option A's diff is line-count bounded and option B1's diff lands on a stable baseline with the reservation already in place. The implementer must watch two edge cases: (i) the disambiguation counter on a collision detected against a *foreign* `__loom_…` registration cannot use the same `(_<n>)` counter the byte-mismatch slug-collision rule uses without ambiguating wire shapes, so option B1 should use a distinct counter-suffix form (e.g. `__loom_respond_<slug>__ext<n>`) or document that the two collision sources share one counter space; (ii) the hot-reload path at `registration-steps.md` step 5 already re-issues `pi.registerTool` post-startup, so the collision check belongs in the staging phase of the build-aside-then-publish swap, not only at first-encounter.

## Relationships

- T12 "`__loom_respond_<slug>` synthesised name has no reservation against the frontmatter callable set" — co-resolve (option A's prefix-reservation paragraph also closes T12; the frontmatter-tools shadowing concern is the narrower in-extension case of the cross-extension collision concern here, both resolved by the same reservation statement).
- T10 "`pi.registerTool` first-encounter throw has no failure contract at the cited deferral target" — same-cluster (different failure mode on the same `pi.registerTool` first-encounter call site; resolves independently — T10 addresses the *throw* path, this one addresses the *silent-success-into-existing-entry* path).

---

# T14 - `[custom:<type>]` role tag interpolates `CustomMessage.customType` verbatim with no safe-character constraint

**Kind:** implementability
**Importance:** medium
**Score:** 25
**Must-fix:** true
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

Rule 3 of *Compact-transcript format (normative)* (`docs/spec_topics/binder/binder-model-and-context.md`) pins the `[custom:<type>]` role tag's `<type>` slot as the `CustomMessage.customType` string verbatim, and rule 5 disclaims the system-note sanitisation discipline for transcript bytes. `CustomMessage.customType` is typed only as `string` (`docs/spec_topics/pi-integration-contract/host-interfaces-core.md`), and the corpus's only `customType` constraint — the `loom-<purpose>` `SHOULD` convention in `extension-bootstrap-and-per-loom.md` — is namespace coordination, not a character class, and does not bind third-party values. A `customType` containing `\n`, `]`, or the sequence `: ` shatters the line-oriented transcript, breaking BNDR-7's MUST-reproduce-exactly contract; via the `convertToLlm` transform (`docs/spec_topics/pi-integration-contract/runtime-event-channel.md#custom-message-context-entry-presupposition`) the malformed bytes then propagate into every subsequent provider call.

## Issue introduction

**Verdict:** present-since-inception
**Introducing commits:** 20569f8 — pi-loom spec: resolve "Compact-transcript format for the session-context block is unspecified" (2026-05-07, Thomas Andersen)
**History:** The compact-transcript `[custom:<type>]` role tag, its "`<type>` is the `CustomMessage.customType` string verbatim" rule (rule 3), and the "No sanitisation" rule (rule 5) all first entered the spec corpus in `20569f8` — the earliest spec commit in which the token and the no-sanitisation rule appear under a pickaxe over the spec paths. The verbatim-with-no-character-class shape was therefore present from the section's inception. Later commits `01c9db9` (2026-06-03) and `1a41db2` (2026-06-06) extended the section and `f5e89f4` (2026-06-04) moved it into `binder-model-and-context.md`, but none narrowed the `customType` character class.

## Solution approach

Narrow the `<type>` slot at rule 3 of *Compact-transcript format (normative)* (`binder-model-and-context.md`) to a safe character class that excludes `\n`, `\r`, `]`, the two-byte sequence `: `, and the empty string, and pin that the binder MUST reject any `CustomMessage` whose `customType` falls outside the class before transcript rendering, surfacing the rejection through a `loom/runtime/*` diagnostic. Narrow the `loom-<purpose>` convention in `extension-bootstrap-and-per-loom.md`'s `customType` ownership and collision rule so the loom-internal naming class nests inside the broader safe class. Add a forward-cross-reference from `host-interfaces-core.md`'s `CustomMessage` paragraph noting the binder is stricter than Pi's `string` typing.

## Solution constraints

- The rejection diagnostic MUST be a row added to the closed `loom/runtime/*` registry (`docs/spec_topics/diagnostics/code-registry-runtime.md`) under DIAG-2, not a code coined at the binder rule site.

## Relationships

- T18 "`toolResult` non-text block serialization is not key-order-stable, breaking the byte-reproducibility contract" — same-cluster (another BNDR-7 reproduce-exactly byte-determinism gap in the same compact-transcript section).
- T15 "Per-field `<type>` slot is byte-reproducible but author-side surface whitespace is not normalised" — same-cluster (parallel "byte-exact but input not canonicalized" gap in the system-prompt parameters block).
- T16 "`default=<literal>` rendering pins byte-exactness but leaves author-written literals uncanonicalised" — same-cluster (same parallel gap for default literals).
# T15 - Per-field `<type>` slot is byte-reproducible but author-side surface whitespace is not normalised

**Kind:** implementability
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

The binder per-field line's `<type>` slot is delegated to the *Type display* paragraph in `docs/spec_topics/binder/binder-bypass-and-envelope.md`, which requires the field's declared Loom type "in the surface syntax of Type System" and pins eight reference renderings — all of which are already in canonical form. The Loom type grammar in `docs/spec_topics/grammar.md` § Type grammar admits multiple surface-whitespace spellings of the same logical type (`array< integer >` vs `array<integer>`; `string|null` vs `string | null`), and neither *Type display* nor `type-system.md` supplies a surface-printer or whitespace-normalisation rule mapping arbitrary admissible author spellings to the table's canonical forms. An author who writes `array< integer >` therefore has no normative basis to predict whether the per-field line emits the verbatim source slice or the canonical re-serialisation, so two conforming implementations diverge on the same input. That breaks the byte-reproducibility contract BNDR-7 and the *Parameter-line reference renderings* table depend on, and defeats any prompt-cache keyed on those bytes.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** `5a4ec51` (initial *Type display* section), `4188412` (per-field line raised to byte-reproducible + *Parameter-line reference renderings* table)
**History:** `5a4ec51` ("pi-loom spec: resolve 'Binder system prompt information content lacks verifiable field set'") introduced the *Type display* paragraph with a reference-rendering table and the "surface syntax of [Type System]" citation, but specified no whitespace canonicalisation rule for arbitrary author spellings — a latent gap, since the per-field line was at that point only an *information-content* obligation. `fc672b5` retuned the table from `int` to `integer` without changing the canonicalisation question. `4188412` ("pi-loom spec: resolve 'Parameters block: indentation and per-field token order are not normative'") then upgraded the per-field line to a byte-exact MUST-reproduce contract and added the *Parameter-line reference renderings* table, which raised the latent gap to an observable defect: byte-reproducibility now depends on a canonicalisation rule the spec never supplied. Neither commit is independently wrong; the defect lives in the interaction between the loosely-defined `<type>` slot and the byte-exact per-field contract that later wrapped it.

## Solution approach

Add a normative "Surface printer for `Type`" subsection to `type-system.md` (or `grammar.md` § Type grammar) defining a canonical surface rendering for every `Type` production (`PrimitiveType`, `NamedType`, `GenericType`, `ObjectType`, `Type "|" Type`, `LiteralType`), adopting the canonical whitespace and bracket forms the existing *Type display* reference table already shows. Rewrite the *Type display* paragraph in `binder-bypass-and-envelope.md` so item 4's `<type>` slot emits the printer's output, replacing the eight stipulated reference renderings with a pointer to that printer. Add a reference rendering whose author input is non-canonical (e.g. `array< integer >`) and whose emitted form is canonical (`array<integer>`).

## Solution constraints

- The printer's `LiteralType` arm MUST reuse the literal-sublanguage printer defined by T16's resolution rather than defining a second literal print discipline.

## Relationships

- T16 "`default=<literal>` rendering pins byte-exactness but leaves author-written literals uncanonicalised" — co-resolve (same defect on the `default=<literal>` slot; the surface printer naturally covers the `LiteralType` arm via the literal-sublanguage printer already cited by *Default-literal rendering*).
- T18 "`toolResult` non-text block serialization is not key-order-stable, breaking the byte-reproducibility contract" — same-cluster (third byte-reproducibility hole in the binder transcript / prompt; resolves independently via key-sort, not surface-printer).
- T14 "`[custom:<type>]` role tag interpolates `CustomMessage.customType` verbatim with no safe-character constraint" — same-cluster (also a byte-reproducibility hole in the binder prompt, on a free-form string field rather than a typed surface form; resolves independently).
# T16 - `default=<literal>` rendering pins byte-exactness but leaves author-written literals uncanonicalised

**Kind:** implementability
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

The *Default-literal rendering* paragraph in `docs/spec_topics/binder/binder-bypass-and-envelope.md` (below item 4 of the per-field line spec) requires `<literal>` in `default=<literal>` to be "the field's default value rendered in the [Loom literal sublanguage](../grammar.md#loom-literal-sublanguage) surface syntax", while the adjacent *Parameter-line reference renderings* table pins those lines to "MUST reproduce these exact byte sequences". The literal sublanguage admits multiple surface spellings for the same value (single- vs double-quoted strings, optional trailing commas, free internal whitespace, alternative brace spacing), and the rule never says whether the renderer emits a verbatim source-byte slice or re-serialises the parsed value under a canonical print discipline. The four "round-trips as" examples are all unambiguous, so they neither resolve nor expose the gap. Two conforming implementations can therefore emit different bytes for the same `Parameters:` line, breaking the BNDR-7 input-reproducibility contract.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** 5a4ec51 — pi-loom spec: resolve "Binder system prompt information content lacks verifiable field set" (2026-05-06, Thomas Andersen); 4188412 — pi-loom spec: resolve "Parameters block: indentation and per-field token order are not normative" (2026-05-07, Thomas Andersen)
**History:** `5a4ec51` introduced the `*Default-literal rendering.*` paragraph (then in `spec_topics/binder.md`) and pinned `<literal>` to "Loom literal sublanguage surface syntax" with four round-trip examples but no canonicalisation discipline over the multiple surface spellings the sublanguage admits. The next day, `4188412` added the *Parameter-line reference renderings* table with its "MUST reproduce these exact byte sequences" obligation and the `MUST emit those bytes verbatim` framing in the section opener, hardening the byte-exactness contract without filling the canonicalisation gap — the defect's bite (divergent bytes between conforming implementations) crystallised at this commit, even though the underspecified rule itself dates from the prior commit. The 2026-06-04 split of `binder.md` into the `binder/` cluster (commit `f5e89f4`) moved the paragraph to `binder-bypass-and-envelope.md` without semantic change.

## Solution approach

Rewrite the *Default-literal rendering* paragraph in `binder-bypass-and-envelope.md` to require the renderer to parse the author's default expression and emit a single canonical surface form of the literal sublanguage, rather than slicing source bytes — pinning quote style, escape set, separators, trailing-comma policy, brace spacing, and field order, recursively for nested literals. Extend the *Parameter-line reference renderings* table with rows that exercise each spelling choice point the sublanguage admits (quote style, internal whitespace, trailing comma, brace spacing, nesting) so the canonicalisation is locked in by the oracle set rather than only the four already-unambiguous examples. Co-resolve with T15, whose `<type>`-slot fix shares the same surface printer.

## Solution constraints

- The chosen canonical form MUST continue to render the four existing round-trip examples (`Severity.High`, `"hello"`, `[1, 2, 3]`, `[]`) and every existing *Parameter-line reference renderings* row to their currently-pinned bytes.

## Relationships

- T15 "Per-field `<type>` slot is byte-reproducible but author-side surface whitespace is not normalised" — co-resolve (identical shape; resolve in the same edit, the surface printer covering the `LiteralType` arm).
- T18 "`toolResult` non-text block serialization is not key-order-stable, breaking the byte-reproducibility contract" — same-cluster (separate byte-reproducibility gap in the same binder-system-prompt area; independent resolution).
# T17 - Canonical-form escaping rule omits non-ASCII code point policy

**Kind:** testability
**Importance:** medium
**Score:** 25
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

In `docs/spec_topics/schema-subset.md` §"Canonical schema hash" step 2 *Canonical form*, the "strings escaped per RFC 8259 minimal-escape rules" bullet pins only the printable-ASCII case ("no gratuitous `\u` escapes for printable ASCII") and leaves the non-ASCII case (`U+0080` and above) unspoken. RFC 8259 §7 explicitly leaves each such code point a free choice between a raw UTF-8 byte sequence and a `\uXXXX` (or surrogate-pair) escape, so "minimal-escape" does not pin it. Because the canonical form is the input to the SHA-256 schema slug that identifies `$defs` dedup entries, the AJV validator cache, and the synthesised `__inline_<slug>` / `__loom_respond_<slug>` tool names, two conforming encoders that disagree on whether to emit `"café"` raw or as `"caf\u00e9"` produce different slugs for byte-identical loom source — breaking the cross-implementation identity property and tripping spurious `loom/load/schema-slug-collision` diagnostics.

## Issue introduction

**Verdict:** single-commit
**Introducing commits:** e21449b — pi-loom spec: resolve "__inline_<hash> hash function is not pinned" (2026-05-04, Thomas Andersen)
**History:** The "Canonical schema hash" section, including the step-2 *Canonical form* bullet `strings escaped per RFC 8259 minimal-escape rules (only the characters JSON requires escaping; no gratuitous \u escapes for printable ASCII)`, was added wholesale by commit e21449b on 2026-05-04 (verified by `git log -L /strings escaped per RFC/,+1` on the file, which returns only that commit). Subsequent edits to the section (c5bb5e1's numeric-rendering rewrite, 111e533's keyword pruning, 7321f01's array-order clause, and the slug-collision/byte-equality additions in 2128e5f) all touched neighbouring bullets but never the escape clause, so the non-ASCII gap has been present since the recipe's inception and was not introduced by any later edit.

## Solution approach

Rewrite the "strings escaped per RFC 8259 minimal-escape rules" bullet in step 2 *Canonical form* to pin the non-ASCII code-point case: code points `U+0080` and above emit as the raw UTF-8 byte sequence, never as `\uXXXX` or surrogate-pair escapes, consistent with the step's "deterministic UTF-8 JSON byte sequence" preamble. Pin the control-character (`U+0000`–`U+001F`) escape form as `\u00XX` with lowercase hex so two conforming encoders agree byte-for-byte. Make the rule apply to every string position in the lowered fragment (`const` values, `enum` entries, `$ref` pointers, `properties` keys), not just user-visible literals.

## Solution constraints

- None.

## Relationships

None
# T18 - `toolResult` non-text block serialization is not key-order-stable, breaking the byte-reproducibility contract

**Kind:** implementability
**Importance:** high
**Score:** 100
**Must-fix:** false
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

The Compact-transcript format's Rule 4 `toolResult` body (`docs/spec_topics/binder/binder-model-and-context.md` §Compact-transcript format (normative)) specifies that any non-text block is `JSON.stringify`'d with no whitespace and concatenated in array order, but plain `JSON.stringify` emits object keys in engine property-insertion order — the exact instability BNDR-8 already diagnoses and corrects for `ToolCall.arguments`. Non-text `toolResult` blocks are arbitrary host-supplied structured objects on the MUST-reproduce-exactly transcript byte path, so two conformant implementations can emit different transcript bytes — and therefore different prompt bytes and potentially different binder outputs at `temperature: 0` — for the same `ToolResultMessage` purely from object-key insertion-order differences. The single-key BNDR-7g reference rendering (`{"chartId":7}`) cannot detect this divergence because one key has no order.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** 20569f8 — pi-loom spec: resolve "Compact-transcript format for the session-context block is unspecified" (2026-05-07, Thomas Andersen); 1a41db2 — pi-loom spec: resolve "Compact-transcript BNDR-7 oracle coverage and assistant byte-determinism (T034/T106)" (2026-06-06, Thomas Andersen)
**History:** Commit 20569f8 first introduced the Compact-transcript format and the Rule 4 `toolResult` clause as "structured (non-string) content is `JSON.stringify`'d with no whitespace and used as the body", without any key-order canonicalisation. Commit 1a41db2 then added BNDR-8 — which explicitly diagnoses that "`JSON.stringify` alone is not key-order-stable across SDK property-insertion orders, so a key-sorting canonicalisation step is required" — and applied the canonicalisation to `ToolCall.arguments` (with BNDR-7e as the witness), but left Rule 4's `toolResult` non-text-block branch on the original un-sorted `JSON.stringify` and extended BNDR-7g with only a single-key non-text block (`{"chartId":7}`) that cannot exercise the gap. The defect is the interaction: 20569f8 created the unsanitised serialisation site, 1a41db2 raised the reproducibility bar (and acknowledged the JSON.stringify hazard) for the sibling site without propagating the fix to this one.

## Solution approach

Rewrite Rule 4's `toolResult` non-text-block clause in `docs/spec_topics/binder/binder-model-and-context.md` §Compact-transcript format (normative) to require the canonical key-sorted no-whitespace JSON serialisation BNDR-8 (`#bndr-8`) already mandates for `ToolCall.arguments`, referencing the BNDR-8 anchor rather than re-deriving the rule. Add a BNDR-7 reference rendering under the next free sub-letter (`BNDR-7j`) pinning a `toolResult` whose non-text block exercises key ordering at both the top level and a nested level. Update BNDR-7g (`#bndr-7g`) to cite the multi-key witness.

## Solution constraints

- The non-text block's internal shape is owned by the Pi-SDK tool-result type family (`docs/spec_topics/pi-integration-contract/host-interfaces-core.md#sessioncontext-shape`, read-only); the canonicalisation applies to the serialised form only and must not redefine the SDK type.

## Relationships

- T15 "Per-field `<type>` slot is byte-reproducible but author-side surface whitespace is not normalised" — same-cluster (sibling "MUST-reproduce-exactly content with an under-specified canonicalisation step" gap on the parameters block).
- T16 "`default=<literal>` rendering pins byte-exactness but leaves author-written literals uncanonicalised" — same-cluster (same canonicalisation-gap pattern on default literals).
- T14 "`[custom:<type>]` role tag interpolates `CustomMessage.customType` verbatim with no safe-character constraint" — same-cluster (another byte-exact transcript field whose source bytes are unconstrained).
- T11 "`ToolResultMessage.content` element type and text-block discriminator unpinned" — same-cluster (the renderer's handling of `ToolResultMessage.content` non-text blocks; the version-bump audit item should be threaded through both).
- T19 "Interpolated object/array key order unpinned, breaking prompt-byte reproducibility" — same-cluster (identical key-order gap on the interpolation surface; both borrow the same shape of fix but resolve independently).
# T19 - Interpolated object/array key order unpinned, breaking prompt-byte reproducibility

**Kind:** implementability
**Importance:** high
**Score:** 100
**Must-fix:** false
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

`docs/spec_topics/query/query-escapes-stringification.md` § "Stringification of interpolated values" specifies that a `${expr}` whose static type is `array<T>` or a schema-typed object renders as compact `JSON.stringify` with recursive wire-name translation, but pins everything about the rendering *except* the order in which an object's keys appear in the emitted JSON. `JSON.stringify` emits own-enumerable keys in insertion order, and the outbound wire-name-translation walk in `docs/spec_topics/runtime-value-model.md` says nothing about field visit/assignment order, so two semantically-equal values assembled differently can produce different prompt bytes and two conforming implementations can disagree on the byte sequence for the same input. This contradicts the byte-reproducibility property the spec relies on for the companion `<schema-json>` placeholder and the canonical-hash recipe in `docs/spec_topics/schema-subset.md`; interpolated values sit on the same prompt-byte path but carry no equivalent pin.

## Issue introduction

**Verdict:** single-commit-introduction
**Introducing commits:** `0c9ce54` (2026-05-04, *pi-loom spec: resolve "Stringification rule for `${expr}` interpolations is unspecified"*)
**History:** `git log --follow` over `docs/spec_topics/query/query-escapes-stringification.md` and its predecessor `spec_topics/query.md` resolves to three touches: `0c9ce54` (the table's original introduction, in the pre-split `spec_topics/query.md`), `f5e89f4` (2026-06-04, the spec-set split that relocated the table into `docs/spec_topics/query/query-escapes-stringification.md` byte-for-byte), and two later, unrelated edits (`a9c5d7b` BNDR-4/5 numeric pin, `13e58fe` discard_site). `git show 0c9ce54 -- spec_topics/query.md` shows the original `array<T>` and *Schema-typed object* rows authored verbatim as today's text — `JSON.stringify of the value, compact, with wire-name translation applied recursively` — with no key-order clause. The defect therefore entered with the rule itself and has been carried unchanged through the split.

## Solution approach

Add a normative key-order clause to the "Stringification of interpolated values" section of `docs/spec_topics/query/query-escapes-stringification.md` pinning that emitted JSON object keys follow declaring-field order of the static type (after wire-name translation), recursing through nested objects inside `array<T>` interpolands and inside other objects so the entire interpolated subtree is byte-stable. Anchor it as the value-side analogue of the `schema-subset.md` § *Array element order* rule and its canonical-hash key sort. Pin a disposition for the case where the static type is unresolvable (no declaration to consult): either refuse with the same error code the unresolvable-`Result` path already uses, or define a canonical fallback order mirroring the canonical-hash recipe.

## Solution constraints

- Out of scope: the `toolResult` non-text-block rendering surface owned by T18.

## Relationships

- T18 "`toolResult` non-text block serialization is not key-order-stable, breaking the byte-reproducibility contract" — same-cluster (the identical key-order gap on a different surface — `toolResult` non-text-block rendering — that BNDR-8 already solves for `ToolCall.arguments`; both findings can borrow the same shape of fix but resolve independently).
# T20 - Post-`ok` abort racing an AJV-on-`args` failure has no defined surfacing precedence

**Kind:** error-model
**Importance:** high
**Score:** 100
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

The final paragraph of §Failure modes in `docs/spec_topics/binder/determinism-cancellation-failure.md` defines the success branch of the post-`ok`-abort race — an abort observed after the binder returns `ok` but before AJV runs lets validation complete and the cancellation surfaces at the loom body's next checkpoint — but is silent on the failure branch. When AJV then rejects `args`, the loom never starts, so there is no loom-body checkpoint for the cancellation to surface at, while the AJV-on-`args` row of the [Failure-mode templates](docs/spec_topics/binder/determinism-cancellation-failure.md#failure-mode-templates-normative) table is independently obligated to fire. Two normative rows are eligible — the cancelled-binder row and the AJV-on-`args` row — and the spec does not state which surfaces, whether both do, or in what order. Two conforming implementations diverge on the same observable race.

## Issue introduction

**Verdict:** single-commit
**Introducing commits:** 7cb4cc3 — pi-loom spec: resolve "Binder LLM call has no cancellation checkpoint" (2026-05-04, Thomas Andersen)
**History:** The post-`ok`-abort sentence was first added by 7cb4cc3, which introduced both the **Cancellation** subsection and the trailing sentence in **Failure modes** that pins the race semantics. That commit also added the AJV-on-`args` failure row's prior form. The sentence was written for the AJV-pass branch (cancellation surfaces "at the next checkpoint inside the loom body") and never addressed the AJV-fail branch where no loom body runs; the gap has carried verbatim through the subsequent 100KB-cap split (f5e89f4), which only relocated the paragraph from `spec_topics/binder.md` into `docs/spec_topics/binder/determinism-cancellation-failure.md` without touching the wording. No later commit has revisited the race.

## Solution approach

Extend the post-`ok`-abort sentence in `docs/spec_topics/binder/determinism-cancellation-failure.md` §Failure modes (the final paragraph) to define the AJV-fail branch: when AJV runs under this rule and rejects `args`, the AJV-on-`args` row fires and the racing cancellation is absorbed, so exactly one failure-template row surfaces per binder outcome. Keep the existing reference to the no-retroactive-`Ok`-to-`Err` rule, with which the new clause is consistent.

## Solution constraints

- Out of scope: the existing budgeted-retry abort sentence in the same paragraph (an abort during a permitted retry already surfaces the cancelled-binder note immediately); the new clause must not weaken or contradict it.

## Relationships

None
# T21 - Cross-type `==` trigger predicate is internally inconsistent on `integer` vs `number`

**Kind:** implementability
**Importance:** high
**Score:** 100
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

The cross-type-equality paragraph in `runtime-value-model.md` §Equality (anchor `id="equality"`) states the trigger for the `false` (`==`) / `true` (`!=`) cross-type disposition twice using two non-equivalent predicates in adjacent sentences: a structural predicate ("when the operand static types share no common structural ground") and a static-identity predicate ("the cross-type rule applies only when the static types differ"). The two diverge on every pair where one operand's static type is `⊑` the other — e.g. `42 == 42.0`, since `integer ⊑ number` holds per TYPE-2: the structural predicate does not fire the cross-type rule (falls through to per-shape *Primitives compare by value* → `true`), while the static-identity predicate fires it → `false`. The implementer has no principled tie-breaker, and the same ambiguity recurs for any subtype or union-arm pair not covered by the paragraph's four genuinely-disjoint worked examples. The mismatch is observable in user code and silently changes downstream control flow, schema dispatch, and `match`-arm selection.

## Issue introduction

**Verdict:** single-commit
**Introducing commits:** 43a24f3 — pi-loom spec: resolve "== cross-type disposition + expressions/runtime-value-model equality link" (2026-06-07, Thomas Andersen)
**History:** Both contradictory trigger sentences — the structural "share no common structural ground" predicate and the static-identity "applies only when the static types differ" predicate — were introduced into `runtime-value-model.md` §Equality by the single commit `43a24f3`; a pickaxe (`-S`) over each phrase localises both to that one commit. The cross-type-equality paragraph arrived internally inconsistent in that one diff. No earlier or later commit touched the contradiction.

## Solution approach

Rewrite the cross-type trigger in `runtime-value-model.md` `id="equality"` to a single decidable predicate phrased against the `⊑` relation — the cross-type rule fires only when neither operand's static type is `⊑` the other — and delete the contradicting "applies only when the static types differ" sentence. Clarify the surviving "share no common structural ground" wording to name the `⊑`-based predicate and forward-link to `type-system.md#type-compatibility`. Add one worked example exercising the now-disambiguated subtype case (`integer`/`number` operands comparing `true`) to discriminate the chosen rule. Rewrite the `expressions.md` §Equality "share no common structural ground" link prose in lockstep so the link target and linker do not drift back into the contradiction.

## Solution constraints

- Out of scope: the per-shape equality bullets (`NaN`/`±0` primitives, arrays, objects, enums, `Result`) — do not weaken their language while editing the cross-type trigger.

## Relationships

None
# T22 - Array-literal / `concat` LUB undefined for named-schema mixed with primitive or `null`

**Kind:** implementability
**Importance:** high
**Score:** 100
**Must-fix:** false
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

`expressions.md` § Array construction states the common-type rules for array literals (and, via the `concat(other)` row's delegation, for `array<T>.concat`) in three numbered cases, but the case-2 / case-3 partition is not total. Case 2 computes a free LUB illustrated only with primitives and `null`, while case 3 carves out a sink requirement for "two different named schemas" — leaving undefined which case governs a named schema mixed with `null` (`[author, null]`, an explicitly admitted `Author | null` shape per `schemas.md`), a named schema mixed with a primitive (`[author, "x"]`), or three-or-more mixed arms. A reader can route these through case 2 (free `array<Author | null>`) or read case 3's nominal carve-out as dominant (requiring a sink), and the spec specifies no fold order for ≥3 mixed arms, so left-fold and pairwise-gather paths reach different diagnostics. The same ambiguity flows into `concat` through the row's "Disjoint element types union exactly as the array-literal LUB rule (case 2) computes" sentence.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** fae85d3 — Tighten spec for implementation-plan readiness (2026-05-04, Thomas Andersen); deea483 — pi-loom spec: resolve "array<T>.concat(other) admissibility routed through ⊑" (2026-06-04, Thomas Andersen)
**History:** The three-case common-type enumeration was authored in `fae85d3`, which added rule 3's "two different named schemas" carve-out while case 2's worked examples covered only primitives + `null`; the partition has been incomplete (no rule for named-schema ∪ primitive, named-schema ∪ `null`, or ≥3 mixed arms) since that commit. `deea483` later rewrote the `array<T>.concat(other)` row to delegate to the same array-literal LUB ("Disjoint element types union exactly as the array-literal LUB rule (case 2) computes"), propagating the existing gap to the `concat` surface as well. Intervening commits (`0226b80`, `c1e5d64`, `839db71`, `3343890`) only renumbered references into the type-compatibility table and did not touch the case-2 / case-3 boundary.

## Solution approach

Restructure common-type rules 2–3 in `expressions.md` § Array construction so exactly one rule fires for any element list, making the case-2 / case-3 partition total: clarify that a named schema mixed with `null`, a primitive, or an enum folds via TYPE-5 / TYPE-6, since TYPE-10 blocks unification only between two distinct nominal schemas. Narrow case 3 to its remaining responsibility — two-or-more distinct named object schemas require a sink expecting their union — and state the multi-arm fold order so the offending-element position reported by `loom/parse/array-no-common-type` is deterministic. Add worked examples pinning the previously-undefined results: `[author, null]` → `array<Author | null>`, `[author, "x"]` → `array<Author | string>`, and `[author, dog]` without a sink → `loom/parse/array-no-common-type`. Confirm the `concat(other)` row needs no further change once case 2 is total.

## Solution constraints

- Out of scope: case-1's sink-set enumeration and trailing `etc.` wording, owned by T23.
- Do not modify `type-system.md`; TYPE-1 / TYPE-2 / TYPE-5 / TYPE-6 / TYPE-10 are read-only relations the fold invokes.
- The narrowed case 3 MUST preserve the existing TYPE-4 variant-to-union treatment (`[cat, dog]` admitted only via a sink expecting the discriminated union).

## Relationships

- T23 "`expressions.md` array-construction sink list is open-ended (\"etc.\") while `grammar.md` declares the sink set exhaustive" — same-cluster (touches the case-1 sink-set reference in the same enumeration block; independently resolvable).
# T23 - `expressions.md` array-construction sink list is open-ended ("etc.") while `grammar.md` declares the sink set exhaustive

**Kind:** clarity
**Importance:** high
**Score:** 100
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

`docs/spec_topics/grammar.md` §"`array<T>` literal type-sink rule" declares the array-literal type-sink set **exhaustive** and enumerates exactly four members (binding annotation, call-site parameter type, surrounding constructor field, and the element type of an enclosing array-typed sink). `docs/spec_topics/expressions.md` §"Array construction" describes the same set open-endedly: rule 1 names two members and closes with `etc.`, and the `[]` element-type inference sentence above it names three members with no `etc.` and no statement of exhaustiveness. An implementer reading expressions.md alone cannot tell whether the sink set is closed at four members or whether `etc.` reserves room for further sinks — for example the iterand of `for x in expr`, which grammar.md explicitly excludes.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** `fae85d3` (2026-05-04, "Tighten spec for implementation-plan readiness"); `f841b12` (2026-05-04, "spec: resolve Cluster 2 (literal sublanguage + grammar appendix)")
**History:** The "binding annotation, parameter type, etc." phrasing was authored in `fae85d3` as part of the array-literal common-type rules (then on `spec.md` line 698, later carried into `spec_topics/expressions.md` by the file split in `fecb504`). At the time it was written the spec had no exhaustive sink-set declaration anywhere, so the trailing `etc.` was open-ended but not contradictory. `f841b12` introduced `grammar.md` §"`array<T>` literal type-sink rule" with the explicit "sink set is exhaustive" framing and the four-member enumeration; it did not back-update the `etc.` phrasing in expressions.md, and the two files have drifted ever since. The defect is the interaction — the `etc.` becomes a contradiction only once the exhaustive declaration exists — not either commit alone.

## Solution approach

Make `grammar.md` §"`array<T>` literal type-sink rule" (anchor `#arrayt-literal-type-sink-rule`) the single authoritative enumeration of the sink set, and rewrite expressions.md to defer to it. In §"Array construction" rule 1, replace the open-ended `(binding annotation, parameter type, etc.)` parenthetical with a forward-link to that grammar.md anchor. Apply the same treatment to the `[]` element-type inference sentence in the lead paragraph — either delete its partial parenthetical or forward-link to the same anchor — so expressions.md no longer names a partial sink list.

## Solution constraints

- Out of scope: which file owns the canonical four-member enumeration (a separate placement decision). Do not duplicate the enumeration into expressions.md — one file owns it and the other cross-references.

## Relationships

- T22 "Array-literal / `concat` LUB undefined for named-schema mixed with primitive or `null`" — same-cluster (sits in the same §"Array construction" common-type-rules block but resolves independently).
# T24 - Pi-tool bare-object field-presence check has contradictory parse-time vs runtime preconditions

**Kind:** assumptions
**Importance:** high
**Score:** 100
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

`grammar.md`'s Field rules assert a parse-time field-presence check against a bare object Pi-tool argument (`read({ ... })`), emitting `loom/parse/missing-object-field` / `loom/parse/extra-object-field` against "the Pi tool's registered input schema" per the Position rules. This presumes that schema is visible at parse time, but `tool-calls.md` (Argument shape) says a Pi-tool argument mismatch "is never a parse error — it is always caught by the runtime AJV check", and `type-system.md` (Unresolvable operands) names a Pi-tool registered schema "not visible at parse time" as the canonical operand the parse-time check is skipped for. An implementer reading only `grammar.md` writes a parse-time check the tool-calls/type-system contract forbids; the `params:`-default and named-schema arms are unaffected because their schema is statically known.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** f841b12 — spec: resolve Cluster 2 (literal sublanguage + grammar appendix) (2026-05-04, Thomas Andersen); 0226b80 — pi-loom plan: resolve "V15c references an undefined compatibility relation" (2026-05-05, Thomas Andersen); 4385d86 — pi-loom spec: resolve "Pi-tool argument type-checking timing" (2026-06-04, Thomas Andersen)
**History:** `f841b12` introduced the grammar appendix with the Position rule that "a Pi-tool call argument supplies [the schema] via the Pi tool's registered input schema" and the Field rule that omissions are `loom/parse/missing-object-field`, framing both as parse-time. The day after, `0226b80` added the `type-system.md` "Unresolvable operands" paragraph that explicitly names a Pi-tool registered schema "not visible at parse time" as past the parser's static view, routing such cases to the runtime AJV safety net. A month later `4385d86` reconciled type-mismatch handling in `tool-calls.md` to the same posture — "is never a parse error … always caught by the runtime AJV check" for the Pi-tool arm — but only for the type-mismatch axis; it did not touch grammar.md's field-presence framing, leaving the bare-object field-presence rule on grammar.md as the lone parse-time assertion against the now-runtime-only Pi-tool schema.

## Solution approach

Reframe `grammar.md`'s Field rules so the bare-object Pi-tool argument arm defers field-presence and field-extra to the runtime AJV check, surfacing as `Err(CodeToolError { cause: "validation", ... })`, with cross-references to `tool-calls.md` (Argument shape) and `type-system.md` (Unresolvable operands). Mirror the same carve-out in `expressions.md` (Object construction). Extend `tool-calls.md`'s "is never a parse error … always caught by the runtime AJV check" sentence so it names field-presence and field-extra alongside type-mismatch, and update the `loom/parse/missing-object-field` and `loom/parse/extra-object-field` Description rows in `code-registry-parse.md` to scope them to the schema-constructor and `params:`-default arms.

## Solution constraints

- Out of scope: the `params:`-default arm and the named-schema / variant-constructor arm, which keep parse-time `loom/parse/missing-object-field` / `loom/parse/extra-object-field`. The carve-out is confined to the Pi-tool argument arm; `loom/parse/tool-arg-not-literal` and `loom/parse/tool-arg-arity` remain parse-time on that arm.

## Relationships

None
# T25 - Two normative per-boundary tables exist for ceiling #4 and have already begun to drift

**Kind:** placement, scope
**Importance:** high
**Score:** 100
**Must-fix:** false
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

Ceiling #4's per-boundary destination/surface table appears in normative form in two places: `docs/spec_topics/schema-subset.md` § Depth Enforcement (the "Per-boundary surfaces:" table) and `docs/spec_topics/hard-ceilings/ceilings-3-and-4.md` § Per-boundary destination/surface table (ceiling #4) (anchor `#ceiling-4-table`). No MUST nominates one as the authoritative owner and the other as the derived copy, and the schema-subset.md table's closing forward-link still aims at `overview-and-orientation.md#hard-runtime-ceilings` rather than at the page that owns the table today. The two tables have already drifted on load-bearing per-row prose: `ceilings-3-and-4.md` row #4 carries an HC3-d budget-accounting sentence absent from schema-subset.md, while schema-subset.md row #2 carries a `ModelToolError` carve-out and row #4 a `<ajv-summary>` placeholder mapping absent from `ceilings-3-and-4.md`. The GOV-30 lock-step and the Five-site list co-edit obligation constrain only enumeration-level edits, not the per-row surface prose where the drift lives.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** `1750848` (2026-05-07 16:27:54 +0200) "pi-loom spec: resolve \"Ceiling #4 routing class collapses four boundaries whose destinations differ\""; `1c7f550` (2026-05-07 21:20:29 +0200) "pi-loom spec: resolve \"Hard ceilings block does load-bearing definitional work inside informative orientation\""; `6ff9971` (2026-05-10 21:40:09 +0200) "pi-loom spec: resolve \"Hard ceilings aggregator duplicates owner-page error codes and sub-obligation labels\""
**History:** The `schema-subset.md` per-boundary table was added in `1750848` (5 rows, with the prose admission "this section's table mirrors it with the depth-walk-specific carrier details"). At that moment a *single* sibling table existed on `spec.md` (the cross-cutting-dispositions block), so the schema-subset prose pointed at a real authoritative owner. Later the same day, `1c7f550` introduced `spec_topics/hard-ceilings.md` with its own normatively-shaped 5-row "Per-boundary destination/surface table (ceiling #4)" — a *second* full table — without retiring the schema-subset copy. `6ff9971` then reduced the `spec.md` aggregator to a one-line forward-link, removing the third table; the two surviving tables (schema-subset + hard-ceilings) are the ones in tension today. The defect is the interaction: each commit individually was a coherent edit, but in combination they left two normative tables with no MUST nominating one as derived. The `f5e89f4` split (2026-06-04) relocated the second table to `hard-ceilings/ceilings-3-and-4.md` without altering the duplication. Row-level prose drift (HC3-d accounting sentence, `ModelToolError` carve-out, `<ajv-summary>` placeholder) has accumulated across subsequent commits on each page independently.

## Solution approach

Make `ceilings-3-and-4.md`'s `#ceiling-4-table` the sole normative owner of ceiling #4's per-boundary table, folding in the row-level prose that currently lives only on schema-subset.md — row #2's `ModelToolError` carve-out and row #4's `<ajv-summary>` placeholder mapping to the depth-walk's canonical issue. Rewrite schema-subset.md § Depth Enforcement's "Per-boundary surfaces:" table down to a cross-reference to `#ceiling-4-table`, retaining the depth-walk-specific material the table page does not own (the counting algorithm, worked examples, edge cases, and error-shape prose). Repoint schema-subset.md's closing forward-link from `overview-and-orientation.md#hard-runtime-ceilings` to `ceilings-3-and-4.md#ceiling-4-table`.

## Solution constraints

- The Five-site list co-edit obligation on `hard-ceilings/ceiling-invariants-and-audit.md` MUST continue to name the same triangle of anchors (CIO-3, `#ceiling-4-table`, and PIC-1's mask-domain table).
- Do not remove or rename the `#ceiling-4-table` anchor or the `schema-subset.md#depth-enforcement` anchor — both are cited by cross-page forward-links (e.g. ERR-16, `cancellation.md`, `binder/defaulting-system-note-echo.md`).

## Relationships

None
# T26 - Direct slash-invocation of a subagent-mode loom returning top-level `Err` is unsurfaced

**Kind:** error-model
**Importance:** high
**Score:** 100
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

The user-facing surfacing rule SLSH-3 (`#slsh-3` in `slash-invocation.md`) is scoped in both its title and its trigger to *prompt mode* — it fires only when a prompt-mode loom returns `Err(QueryError)` to the user's session. The page enumerates two slash-dispatch execution modes (prompt and subagent) but supplies no parallel surfacing rule for the subagent case. A user who directly slash-invokes a subagent-mode loom that terminates in `Err` therefore has no specified observable: success is silent per the runtime-event-channel `#success-side-null-policy`, and the only `loom-system-note` the runtime issues for the failure routes `display: false` into the spawned subagent's private in-memory transcript, which PIC-9's disposal `finally` destroys before any consumer can read it. The hole sits between two adjacent rules — SLSH-3's prompt-mode scope and the runtime-event-channel cascade rule's privacy default — neither of which addresses the subagent-mode + top-level + slash-entry configuration.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** `53f5831` (2026-05-03), `b3bc4ce` (2026-05-04), `4498b31` (2026-05-06)
**History:** The hole opened across three commits that each correctly handled their own scope:

- `53f5831` — "spec: rewrite query primitive, system prompts, and schema syntax" — introduced the *Top-level `Err` in prompt mode* paragraph (later promoted to SLSH-3) scoped from inception to "When a prompt-mode loom returns `Err(QueryError)` to its caller (the user's session)". Subagent mode was deliberately out of scope at the time the rule was authored.
- `b3bc4ce` — "spec: pin failure-observability surface (Cluster A, Option C)" — added the operator-facing runtime event channel and chose `display: false` for "Subagent-mode top-level `Err` cascades", justifying it with "the subagent transcript is private". The justification is correct for the cascade-from-invoke case but silently inherits the directly-slash-invoked-subagent case as well.
- `4498b31` — "loom-system-note display:false delivery and empty content not contracted" — pinned the Delivery surface, including the rule that subagent-mode `display: false` cascades route through `pi.sendMessage` *against the spawned `AgentSession`* (i.e. into the soon-to-be-disposed private transcript). This made the unobservability concrete: the note now has a well-defined destination, but that destination is unreachable to any consumer after `dispose()` runs.

No single commit "introduced" the defect; each correctly handled the cascade-from-parent case it had in scope. The defect is the cumulative interaction between SLSH-3's prompt-mode scoping and the cascade-rule's privacy default, neither of which addresses the third configuration (subagent-mode + top-level + slash entry).

## Solution approach

Rewrite SLSH-3 in `slash-invocation.md` so its trigger fires for any loom at the slash-dispatch boundary that terminates with `Err(QueryError)`, regardless of mode, and add a forward-link from the *Once a loom is invoked* subagent-mode bullet to SLSH-3. Rewrite the runtime-event-channel Delivery-surface and `display:` rules so a directly slash-invoked top-level cascade emits `display: true`, while subagent-mode cascades reached from inside another loom via `invoke(...)` / `.loom`-callable retain `display: false` and the spawned-session delivery. Clarify the discriminator using the glossary's *caller* terminology — a direct slash invocation is a chain root with a slash caller and no invoke parent — so the prompt → prompt `invoke(...)` cascade is not misclassified. The error-model Panics table's *Slash-command / prompt-mode invocation* surface is the existing routing template for this path.

## Solution constraints

- SLSH-3's anchor `id="slsh-3"` is a governed identifier; this is a prose/scope edit and must not rename or re-allocate the anchor.

## Relationships

None
# T27 - SLSH-4 restates the runtime-event dedup tuple as a second normative surface (already drifted)

**Kind:** placement
**Importance:** high
**Score:** 100
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

The dedup tuple for the `loom-system-note` runtime-event channel is normatively owned by `pi-integration-contract/runtime-event-channel.md` under **Deduplication and lifetime rules** and PIC-1 clause (g) ("Dedup-key non-inclusion rule"), which fixes it as `(kind, query_site, message, occurred_at)`. The trailing paragraph of the SLSH-4/SLSH-5 block in `slash-invocation.md` restates the same tuple as a parenthetical normative aside, spelled `(kind, query_site, message, occurrence-timestamp)`. The two surfaces have already drifted: `occurrence-timestamp` matches no `RuntimeEvent` field, while the owner uses the wire field `occurred_at`. The duplicate surface also shadows PIC-1 (g)'s prohibition on including `masked` in the tuple, which is invisible from the slash-invocation site.

## Issue introduction

**Verdict:** present-since-introduction-of-cited-surface

**Introducing commits:**

- `0cb7b697` — *pi-loom spec: resolve "pi.sendMessage delivery paragraph duplicates pi-integration-contract"* (2026-05-05) — rewrote the trailing paragraph of `spec_topics/slash-invocation.md` from a `pi.sendMessage` recipe duplicate into the current shape, and in doing so inserted the parenthetical `(consumers deduplicate on (kind, query_site, message, occurrence-timestamp))`. The paragraph predecessor carried no dedup-key restatement, so this is the commit that materialised the duplicate normative surface at this site.

**Supporting / pre-existing surface:**

- `b3bc4ce8` — *spec: pin failure-observability surface (Cluster A, Option C)* (2026-05-04) — first established `(kind, query_site, message, occurrence-timestamp)` as a normative dedup tuple on the runtime-event/pi-integration-contract side, then phrased as "consumers MUST deduplicate on …". This is the **owner-side** origin; the slash-invocation copy in `0cb7b697` was written against this wording.
- The canonical owner-side rule was later moved into `pi-integration-contract/runtime-event-channel.md` and the timestamp slot was renamed to `occurred_at` (consistent with the wire field name introduced by `bc50e69` on 2026-05-05 and reinforced by `d75f2a8` on 2026-06-06's "Runtime-event channel occurrence/origin" rework). The slash-invocation copy was not updated in lockstep, which is why the two surfaces now differ in spelling.

**History:** the slash-invocation paragraph has never carried any wording other than `occurrence-timestamp` since `0cb7b697` introduced it (verified with `git log -L /occurrence-timestamp/,+1:docs/spec_topics/slash-invocation.md`). The duplicate-surface defect was therefore present from the moment the paragraph took its current shape; the drift on the timestamp slot accumulated subsequently on the owner side without a corresponding edit here.

## Solution approach

In the SLSH-4/SLSH-5 trailing paragraph of `slash-invocation.md`, delete the in-line dedup-tuple parenthetical that restates `(kind, query_site, message, occurrence-timestamp)`. Extend the existing cross-reference to the runtime-event-channel page so it also names the deduplication / lifetime rules (including the `masked` non-inclusion rule) as owned there, leaving exactly one normative surface for the tuple.

## Solution constraints

- Out of scope: the `details: { event: RuntimeEvent }` shape statement and the "same value emitted at the originating failure site" clause in the same paragraph — they are SLSH-4/SLSH-5-owned and not duplicated on the owner side.

## Relationships

None
# T28 - Schema inference precedence — two models, two different answers

**Kind:** clarity, implementability
**Importance:** high
**Score:** 100
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

`docs/spec_topics/query/query-forms.md` describes typed-query schema
inference twice with incompatible precedence models. §"Schema inference
rules" enumerates three type contexts (binding annotation, enclosing
return type, call-site parameter type) "checked in order", which reads
as a priority ladder in which the outer binding annotation outranks the
inner call-site parameter type. §"Schema inference algorithm" instead
defines an outward AST walk that terminates at the first enclosing sink,
under which the innermost sink wins. For a query at a call-site inside a
typed binding (`let x: Out = process(@`...`?)` where `process(p: In)`),
the two models yield different schemas — `Out` under the ladder, `In`
under the walk — so the validator input and the bytes sent to the
provider diverge across conformant implementations.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** 53f5831 — spec: rewrite query primitive, system prompts, and schema syntax (2026-05-03, Thomas Andersen); fae85d3 — Tighten spec for implementation-plan readiness (2026-05-04, Thomas Andersen)
**History:** The "checked in order" §"Schema inference rules" ladder framing first entered the corpus in `53f5831`; the next day `fae85d3` added the §"Schema inference algorithm" outward-walk model alongside it. Each model reads coherently in isolation, but the two now describe schema-inference precedence with incompatible answers for a call-site-inside-a-typed-binding query. The defect is the interaction between the ladder framing (`53f5831`) and the later-added outward walk (`fae85d3`); both predate the `f5e89f4` (2026-06-04) split into `query-forms.md`.

## Solution approach

Adopt the outward walk as the sole authoritative precedence model.
Rewrite §"Schema inference rules" so the three contexts read as the set
of sink positions the walk recognises rather than an ordered ladder,
removing the "checked in order" framing and deferring precedence to
§"Schema inference algorithm". Add a worked example to §"Schema
inference algorithm" pinning the nearest-enclosing semantics for the
call-site-with-outer-binding case, where the call-site parameter type
is the sink and the outer binding annotation is not consulted.

## Solution constraints

- Out of scope: the explicit-ascription override clause
  (`#explicit-ascription-override`), which already delegates to the
  walk — leave it unchanged.

## Relationships

None
# T29 - `loom/load/host-incompatible` `details.step` enumeration in the diagnostics-side row is out of sync with the canonical probe enumeration

**Kind:** implementability
**Importance:** high
**Score:** 100
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

The `"probe-failed"` clause of the `loom/load/host-incompatible` row in `docs/spec_topics/diagnostics/code-registry-load.md` pins `details.step ∈ { "node-floor", "abortsignal-shape", "sdk-capability-missing", "peer-dep-out-of-range", "typebox-shape" }`, and pegs the `details.package` sibling field to the `"peer-dep-out-of-range"` token. The canonical Step-0 Self-failure paragraph in `docs/spec_topics/pi-integration-contract/capability-probe.md` (anchor `#entry-capability-probe`) instead uses the neutral step token `"peer-dep-version"` for the step-(d) slot, because a throw during step (d) cannot determine whether the `peer-dep-out-of-range` or `peer-dep-malformed-version` arm would have fired. The diagnostics-side row therefore has no token covering a `peer-dep-malformed-version`-arm step-(d) throw, and an implementer following it emits `details.step = "peer-dep-out-of-range"`, misclassifying the failure and diverging from the canonical wire contract.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** 9371309 — pi-loom spec: resolve "foreseeable shape failure clause leaves kind discriminator under-specified" (2026-06-05, Thomas Andersen); 949d1fc — pi-loom spec: resolve "details.step overloads peer-dep-out-of-range" (2026-06-06, Thomas Andersen)
**History:** Commit 9371309 rewrote the `peer-dep-malformed-version` partition into a closed four-condition enumeration in both `capability-probe.md` step (d) and the `code-registry-load.md` row. At that point the two pages still agreed on the `details.step` token set, which used the `"peer-dep-out-of-range"` `kind` value for the step-(d) slot. The next day, commit 949d1fc resolved the follow-up finding that this overload was itself ambiguous (the same token doing duty as a `kind` and a step) by renaming the slot to the neutral `"peer-dep-version"` — but the diff touched only `capability-probe.md`'s Self-failure paragraph and never updated the matching enumeration in `code-registry-load.md`. The diagnostics-side row has carried the pre-rename enumeration since.

## Solution approach

In `docs/spec_topics/diagnostics/code-registry-load.md`, rewrite the `"probe-failed"` clause of the `loom/load/host-incompatible` row to match the canonical Self-failure paragraph at `capability-probe.md#entry-capability-probe`: replace the `details.step` token `"peer-dep-out-of-range"` with `"peer-dep-version"` in the enumeration, and replace it in the `details.package` qualifier so that field is pegged to `details.step = "peer-dep-version"`. Alternatively, replace the in-row literal enumeration with a forward-link to that canonical paragraph so the row stops carrying a parallel copy of the token set.

## Solution constraints

- Out of scope: the seven-`kind` discriminator enumeration in the same row is correct and MUST NOT be edited — the defect is confined to the `details.step` token set.
- Out of scope: the `details.cause` coercion clause on the same `probe-failed` payload row, owned by T05.

## Relationships

- T05 "Underlying-error coercion does not cover all error-bearing `details` / `hint` fields" — same-cluster (same `host-incompatible` `probe-failed` payload row; that finding pins `details.cause` coercion, this one pins the `details.step` token set; both must land before the `probe-failed` arm's wire contract is total).
- T32 "Step 0 opening sentence claims three preconditions in order `(a) → (b) → (c)`, contradicting the five-sub-step `(a)`–`(e)` body" — same-cluster (separate Step-0 internal contradiction on the same canonical probe page; resolve independently).
- T31 "Probe peer-dep `createRequire(...).resolve(<peer>)` recipe collides with the non-exemptible family-(4) CJS-reach prohibition" — same-cluster (also Step 0(d); independent fix).
# T30 - Overflow table predicates key on structured JSON fields the `AssistantMessage.errorMessage` string does not expose

**Original heading:** Overflow table matches structured JSON fields against a flat `errorMessage` string (impossible as written)
**Original section:** docs/spec_topics/pi-integration-contract/ — host/registration/bootstrap/provider (shard-11)
**Kind:** implementability
**Importance:** high
**Score:** 100
**Must-fix:** false

## Finding

`docs/spec_topics/pi-integration-contract/provider-error-mapping.md` contains two clauses that contradict each other and leave the overflow classifier unimplementable as written.

The *Classifier input surface* note declares that the provider error-body wording reaches loom **only** as the flat `AssistantMessage.errorMessage` string produced by pi-ai's per-provider error formatter, that "pi-ai surfaces no parsed JSON error body", and that "every body-wording match in the table is a match against that string."

The overflow-signature table immediately below, however, expresses two of its four predicates against structured JSON fields the SDK does not surface:

- `anthropic-messages` requires `error.type: "invalid_request_error"` **and** `error.message` matching a regex.
- `openai-completions` requires `error.code: "context_length_exceeded"` (in the HTTP-400 case **and** in the HTTP-200 body envelope) — with no regex over any string field at all.

These two rows are not implementable from a single flat `errorMessage` string: there is no defined projection from that string back to `error.type`, `error.code`, or the HTTP-200 body envelope, and the openai row has no string predicate to fall back on. The `mistral` and `amazon-bedrock` rows, by contrast, are already phrased as a single regex over the body text and are consistent with the *Classifier input surface* claim.

The HTTP-200-overflow side-channel widens the gap: the *Provider error mapping* opening paragraph and the openai row both rely on detecting "the recognised overflow code in the openai-completions row" inside an HTTP-200 body envelope, but pi-ai's `onResponse` callback only yields `{ status, headers }` and the resolved `AssistantMessage` carries no parsed body — there is no surface that distinguishes the HTTP-200 overflow envelope from any other 200 response that resolves with `stopReason: "error"`.

## Spec Documents

- `docs/spec_topics/pi-integration-contract/provider-error-mapping.md` — *Classifier input surface* note, overflow-signature table, opening *Provider error mapping* paragraph (edited)
- `docs/spec_topics/pi-integration-contract/binder-inference.md` — Binder inference call (read-only; cited as the authoritative source for `StreamOptions`, `AssistantMessage`, and `ProviderResponse`)
- `docs/spec_topics/pi-integration-contract/version-bump-step2.md` — *Editorial-review checklist for unpinned host presuppositions* item (i) (option-dependent; the per-bump fixture-rerun pointer must continue to match the chosen predicate shape)
- `docs/spec_topics/query/query-failure-and-repair.md` — *Detection of `ContextOverflowError`* (read-only; counterpart to the stop-reason classification rule)

## Plan Impact

**Phases:** N/A

**Leaves (implementation order):** N/A

(The plan exists at `docs/plan.md` with `docs/plan_topics/`, but no leaves have been authored yet; `grep -rn 'provider-error\|errorMessage\|overflow\|ContextOverflow\|TransportError' docs/plan.md docs/plan_topics/` returns no matches.)

## Consequence

**Severity:** correctness

Two of the four overflow rows cannot be implemented from the surface the spec pins as the only available classifier input, and the openai row has no regex at all to fall back on. Two conforming implementations would either (a) read undeclared pi-ai internals to recover the structured fields, (b) reverse-engineer the formatter output with ad-hoc regexes the spec does not prescribe, or (c) classify every anthropic/openai overflow as `TransportError` with null token counts — three observably different outcomes for the same provider response. The HTTP-200 openai overflow envelope is unrecoverable under (c) and silently degrades a real `ContextOverflowError` to a non-retryable `TransportError`.

## Issue introduction

**Verdict:** single-commit
**Introducing commits:** `44782e9` (2026-06-06) — *pi-loom spec: resolve "TransportError catch-all / pi-ai provider-error surface"*
**History:** `provider-error-mapping.md` was created in commit `f5e89f4` (2026-06-04, the spec-set split). The overflow-signature table at that point already keyed `anthropic-messages` on `error.type` + `error.message` and `openai-completions` on `error.code` (with the HTTP-200 body-envelope variant), but the file made no claim about which pi-ai surface delivered those fields, so there was no internal contradiction yet — just a latent grounding gap. Commit `44782e9` then added the *Classifier input surface* note (`git show 44782e9 -- docs/spec_topics/pi-integration-contract/provider-error-mapping.md` shows the +1 paragraph insertion) declaring that "the provider error-body wording … reaches loom only as the `AssistantMessage.errorMessage` string produced by pi-ai's per-provider error formatter — pi-ai surfaces no parsed JSON error body — so every body-wording match in the table is a match against that string." That sentence is the moment the table's structured-field predicates became unimplementable against the spec's own stated input surface. `git log -G "errorMessage" -- …/provider-error-mapping.md` confirms `44782e9` is the only commit to introduce `errorMessage` into the file.

## Solution Space

**Shape:** multiple
**State:** shaped

### Option A — Rephrase every row as a regex over `errorMessage`

**Approach.** Keep the *Classifier input surface* note as authoritative ("flat `errorMessage` string is the only body input"), and rewrite each table row's predicate as an explicit regex over that string — the shape `mistral` and `amazon-bedrock` already use. For `anthropic-messages` drop the `error.type` requirement and rely on the wording regex alone (constrained to HTTP 400). For `openai-completions` introduce a wording regex that matches whatever pi-ai's formatter emits for the `context_length_exceeded` code; document the HTTP-200 overflow envelope as detected by the same wording regex regardless of status (since the structured `error.code` is unavailable), or delete the HTTP-200 side-channel entirely.

**Spec edits.**
- `provider-error-mapping.md` — rewrite the `anthropic-messages` and `openai-completions` rows so their body-wording predicates are regexes against `errorMessage`; remove `error.type` / `error.code` field references from the predicate columns (they may stay in prose as "the pi-ai formatter is known to surface the `context_length_exceeded` code as substring X").
- `provider-error-mapping.md` — adjust the opening *Provider error mapping* paragraph's "the recognised overflow code in the openai-completions row below" phrase to refer to the new wording-regex match, or strike the HTTP-200 body-envelope side-channel if it cannot be detected from `errorMessage` alone.
- `version-bump-step2.md` — the *Editorial-review checklist* item (i) already routes fixture re-runs through the bump procedure; add a one-line note that the canonical fixture corpus must include pi-ai-formatted bodies (post-formatter), not raw provider HTTP bodies.

**Pros.** Internally consistent with the *Classifier input surface* note as written today. Reuses the existing fixture-rerun gate. The two SDK-only providers already work this way, so the pattern is uniform.

**Cons.** Regex over a formatted string is fragile and couples loom to pi-ai's formatter output (not just pi-ai's typed surface). A pi-ai formatter change is invisible to the version pin and would silently downgrade overflow classification — exactly the drift the *Provider-owned-wording presupposition* already names, but here it would also cover pi-ai's own formatter rewordings, not just provider rewordings.

**Risks.** Loss of the structured `error.code` exact-match for openai (currently the most reliable signal). Requires confirming, against the pinned pi-ai version, that the formatter actually emits `context_length_exceeded` substring in the formatted message for both HTTP 400 and HTTP 200 cases.

### Option B — Pin a parsed body field on the pi-ai surface and rewrite the *Classifier input surface* note

**Approach.** Treat the *Classifier input surface* note as overstated. Identify a pi-ai surface that does expose parsed error-body fields (or add an `onResponse`-like callback contract that delivers the raw body bytes, which loom then parses), pin it the same way `StreamOptions.onResponse` is pinned today, and amend the *Classifier input surface* note to acknowledge two body inputs: the formatted `errorMessage` string and the structured parsed body. Keep the table rows as structured-field predicates.

**Spec edits.**
- `provider-error-mapping.md` — replace the "pi-ai surfaces no parsed JSON error body" clause with the actual pi-ai surface that exposes the parsed body (cite `dist/types.d.ts` per the pattern already used for `ProviderResponse`). Adjust the closing sentence "so every body-wording match in the table is a match against that string" to "so structured-field matches read from the parsed body and string-wording matches read from `errorMessage`."
- `provider-error-mapping.md` — leave the four table rows largely unchanged; clarify per row whether the predicate reads from the parsed body or the formatted string.
- `binder-inference.md` — extend the binder's options enumeration to register whatever callback delivers the parsed body, parallel to the existing `onResponse` registration.

**Pros.** Preserves the table's high-fidelity structured matches (the openai `context_length_exceeded` exact-code match is the strongest classifier signal available). Closes the HTTP-200 body-envelope path properly.

**Cons.** Requires a pi-ai surface that may not exist at the pinned version; if it does not exist, the option collapses into either Option A or "wait for pi-ai to add one" (which the spec cannot unilaterally promise). The *Classifier input surface* note becomes longer and tracks two surfaces.

**Risks.** If the chosen parsed-body surface is added by extending pi-ai rather than discovered in the pinned version, this option is out of scope for loom 1.0.0 and reduces to Option A in practice.

### Recommendation

Resolve in two ordered steps so the second step lands on a stable baseline:

1. **First**, verify against `@earendil-works/pi-ai` at the pinned version whether `StreamOptions` (or any sibling callback declared in `dist/types.d.ts`) delivers a parsed JSON error body or the raw body bytes. This is the scope-bounding question — its answer determines whether Option B is even available.
2. **Then**, if a parsed-body surface exists, take **Option B**: it preserves the openai `error.code` exact-match (the only reliable signal for the HTTP-200 overflow envelope) and keeps every other row's structured-field grounding. If no parsed-body surface exists at the pin, take **Option A** and explicitly drop the HTTP-200 body-envelope side-channel from the *Provider error mapping* paragraph (it is unrecoverable from `errorMessage` alone — pretending otherwise re-introduces the same defect).

Edge cases the implementer must watch under either option:
- The `anthropic-messages` row's `error.type: "invalid_request_error"` predicate currently disambiguates an HTTP 400 overflow from an HTTP 400 schema-validation error; if Option A drops that field, the wording regex must be strict enough to avoid mis-classifying validation errors as overflow.
- The `openai-completions` HTTP-200 body-envelope path under Option A may need to be deleted entirely, not merely re-phrased; an HTTP-200 response whose `errorMessage` happens to contain the right substring is indistinguishable from a successful 200 carrying that wording in tool output unless the predicate is also gated on `AssistantMessage.stopReason: "error"`.
- The *Editorial-review checklist* item (i) fixture corpus changes meaning under Option A (must capture post-formatter pi-ai output) versus Option B (must capture pre-formatter provider HTTP bodies); whichever option is taken, the bump-procedure prose pointing at item (i) must say which.

## Relationships

None

---

# T31 - Probe peer-dep `createRequire(...).resolve(<peer>)` recipe collides with the non-exemptible family-(4) CJS-reach prohibition

**Original heading:** Probe peer-dep `createRequire(...).resolve(<peer>)` recipe collides with the non-exemptible family-(4) CJS-reach prohibition
**Original section:** docs/spec_topics/pi-integration-contract/ — audit cluster (shard-12)
**Kind:** implementability
**Importance:** high
**Score:** 100
**Must-fix:** false

## Finding

`docs/spec_topics/pi-integration-contract/capability-probe.md` Step 0(d) normatively prescribes that the factory read each of the four lock-step `@earendil-works/*` peer-dep `package.json` files by calling `createRequire(import.meta.url).resolve("<pkg>")` and then walking parents — and the matching non-normative recipe under `#step-0-d-recommended-recipe` says the same. The factory module lives in `src/` (it is the extension entry point that the audited source tree owns), so the call site falls inside the closed include glob `src/**/*.ts` that `audit-resolution.md` *Audit scope* fixes.

`docs/spec_topics/pi-integration-contract/audit-target-categories.md` *Recognised import/access shapes* enumerates, in family (4), exactly this shape — "`createRequire(...)` plus `req("@earendil-works/<peer>")` style indirection … defined as any function call whose call site uses `createRequire` imported from the Node `"module"` package and whose result is invoked with one of the in-scope package specifiers (bare-package or sub-path form)" — and the prohibition holds "regardless of whether `createRequire` is imported under its canonical name, under an aliased rebinding, through a namespace import, … or through any other re-binding shape", on "the four `@earendil-works/*` peer packages" specifically. `audit-resolution.md` *Exemption mechanism* then states that "Family (4) … is **not** exemptible: … a contributor confronted with such a shape MUST rewrite the source line into a recognised shape … rather than annotate it" and that "an `// allow-pi-surface:` marker on a family (4) line MUST NOT suppress the family (4) discriminator and is itself an audit failure".

The probe's own resolver call is therefore the canonical shape the audit page declares forbidden and unexemptible, but it is also the only mechanic the probe page authorises for reading peer-dep versions. The two pages cannot both be satisfied: the audit fires on the probe's own implementation site on every `npm test` run (the test-side gate that `audit-wire-and-canary.md` pins), and the version-bump remediation branch list under `version-bump-step2b.md` offers no recognised rewrite — none of "per-symbol named import, `pi.<member>` static member-access, or canonical-`ctx` member access" can replace a `package.json#version` read from a peer's install directory.

## Spec Documents

- `docs/spec_topics/pi-integration-contract/capability-probe.md` — Step 0(d) peer-dep version check, and `#step-0-d-recommended-recipe` non-normative recipe (edited)
- `docs/spec_topics/pi-integration-contract/audit-target-categories.md` — *Recognised import/access shapes*, family-(4) `createRequire` clause (option-dependent)
- `docs/spec_topics/pi-integration-contract/audit-resolution.md` — *Audit scope* (include glob), *Exemption mechanism* (family-(4) non-exemptibility) (option-dependent)
- `docs/spec_topics/pi-integration-contract/audit-wire-and-canary.md` — `npm test` gate that makes the collision observable (read-only)
- `docs/spec_topics/pi-integration-contract/version-bump-step2b.md` — branch (5) "Rewrite into a recognised shape" (read-only)
- `docs/spec_topics/pi-integration-contract/host-prerequisites.md` — `engines.node` floor `>=22.19.0` that admits `import.meta.resolve` (read-only)

## Plan Impact

**Phases:** N/A

**Leaves:** N/A

(`docs/plan.md` and `docs/plan_topics/` carry no implementation leaves yet — only `conventions.md`, `coverage-matrix.md`, and `leaf-template.md`.)

## Consequence

**Severity:** correctness

The build-side audit and the runtime probe are both load-bearing and cannot ship simultaneously as written: a faithful implementation lands the probe per Step 0(d) and the audit fails on its first run on `main`, blocking adoption of the inventory-closure gate that PIC-15 / GOV-31 hang downstream behaviour on. Two reasonable implementers diverge — one disables the audit on the probe file (an undocumented exclusion that defeats the gate's exhaustiveness), the other rewrites the probe via an unspecified mechanism (silently widening the recognised-shape list).

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** 126ff8a — pi-loom spec: Step 0 capability probe rewrite + V1.0 deferrals + Choice B (2026-05-06, Thomas Andersen); d2a6d6f — pi-loom spec: resolve "Capability probe verifies only one of four lock-step peer-dep versions" (2026-05-07, Thomas Andersen); e5cd514 — pi-loom spec: resolve "T35 SDK capability inventory closed-set negative-direction audit" (2026-05-09, Thomas Andersen)
**History:** The `createRequire(import.meta.url).resolve(<peer>/package.json)` probe recipe entered Step 0(d) in `126ff8a` (for a single peer; verified against its diff) and was generalised to all four lock-step peers in `d2a6d6f`. The collision was created when `e5cd514` added the family-(4) `createRequire` prohibition to the SDK-inventory audit without a probe carve-out, turning the already-present probe recipe into a forbidden, non-exemptible shape. `4c27f32` (2026-06-03) later reshaped the probe (subpath read → main-entry resolution) but did not retire the collision; the defect is the interaction of the probe-recipe commits and the prohibition commit.

## Solution Space

**Shape:** multiple
**State:** shaped

### Option A — Rewrite the probe to `import.meta.resolve(<pkg>)`

**Approach.** Replace the `createRequire(import.meta.url).resolve("<pkg>")` recipe in Step 0(d) with `import.meta.resolve("<pkg>")` (synchronous, returning a `file:` URL string), followed by `fileURLToPath(...)` and the same parent-directory walk to the first `package.json` whose `name` matches the iteration's `<pkg>`. Do the same in `#step-0-d-recommended-recipe`. Leave family-(4) untouched.

**Spec edits.**
- Step 0(d): swap the resolution mechanic; keep the parent walk, the four enumerated `peer-dep-malformed-version` conditions, and the `details` payload shape verbatim. Note that `import.meta.resolve` is stable in Node ≥20.6, well below the pinned floor of `>=22.19.0` (per `host-prerequisites.md`), so the prerequisite is already satisfied.
- `#step-0-d-recommended-recipe`: replace the `createRequire`/`semver` pairing with the `import.meta.resolve` form; the `semver.satisfies` / `semver.valid` clause is unchanged.

**Pros.** ESM-native; no widening of family-(4); the audit page stays the absolute prohibition it advertises. Removes the `createRequire` import from the runtime entirely, so a future auditor extension to flag `import { createRequire } from "module"` itself does not need a carve-out. Matches the spec's "the runtime MUST be ES-modules-only at loom 1.0" framing.

**Cons.** Synchronous `import.meta.resolve` is a relatively recent stabilisation; some downstream tooling (bundlers, transformers) historically rewrote it. The probe is in `src/` and never transformed for runtime, so this is a soft surface, but worth a one-line note that the call MUST NOT be re-mechanised through a `createRequire` shim by any build step.

**Risks.** Low. A subsequent audit-page edit that adds an `import.meta.resolve(<peer>)` prohibition would re-collide; pre-empt by noting the resolve-only / no-module-load distinction in the same edit.

### Option B — Add a resolve-only carve-out to family (4)

**Approach.** Amend the family-(4) `createRequire` clause in `audit-target-categories.md` *Recognised import/access shapes* to exclude calls whose only consumption of the `createRequire` return value is the `.resolve(<specifier>)` accessor (i.e. no `req(<specifier>)` invocation that loads the module). Keep `createRequire(...)(<specifier>)` and `const req = createRequire(...); req(<specifier>)` prohibited. State the structural justification — `.resolve()` returns a path string, does not load the peer module, and does not transport peer-package surface past the canonical-carrier rules.

**Spec edits.**
- `audit-target-categories.md`: insert the carve-out next to the existing clause; the discriminator the audit emits for the prohibited shapes is unchanged.
- `audit-resolution.md` *Exemption mechanism*: no change (family (4) remains non-exemptible; the carve-out narrows what falls in family (4) rather than allowing markers to suppress it).
- `capability-probe.md` Step 0(d): no normative change; add a one-sentence pointer to the carve-out so future readers do not re-raise the collision.

**Pros.** Preserves the existing probe recipe and its `MODULE_NOT_FOUND` / `ERR_PACKAGE_PATH_NOT_EXPORTED` semantics that `4c27f32` was specifically authored to navigate. Keeps the audit syntax-recognisable: `.resolve(` is a textual discriminator.

**Cons.** Widens the family-(4) source-text closure that the audit page presents as exhaustive ("MUST NOT exist anywhere in the audited source tree"). Adds a behavioural discrimination (resolve-only vs load-bearing) that the audit's stated tooling-independent design has so far avoided. Two `createRequire`-shaped call sites now produce different verdicts, and a contributor refactor that moves the `.resolve` result through an intermediate binding before any subsequent `req(...)` call needs a dataflow story the audit cannot give.

**Risks.** A subsequent contributor adds `const req = createRequire(import.meta.url); const p = req.resolve("@earendil-works/pi-ai"); const mod = req("@earendil-works/pi-ai");` on adjacent lines; the carve-out's per-call shape recognition would have to forbid the second line independently, which is what the existing clause already does, but the new clause introduces a footgun.

### Recommendation

Take **Option A** (rewrite the probe to `import.meta.resolve`). The Node floor pinned in `host-prerequisites.md` (`>=22.19.0`) admits the stable synchronous form, the rewrite is a one-line normative-recipe change confined to `capability-probe.md`, and the audit page stays the absolute prohibition it advertises. Implementer-relevant edge cases: (i) `import.meta.resolve` returns a `file:` URL, not a path — the parent walk MUST consume `fileURLToPath(...)` of the returned URL; (ii) the four enumerated `peer-dep-malformed-version` conditions stay valid but condition (1)'s throw class changes from `MODULE_NOT_FOUND` (`Error`-with-`code`) to the ESM resolver's `ERR_MODULE_NOT_FOUND` shape, so the catch-arm discriminator MUST be widened or replaced with a name-or-code test; (iii) note in the same edit that a build step MUST NOT rewrite `import.meta.resolve(<peer>)` into a `createRequire` shim, since that would re-collide with family (4).

Option B is acceptable if the team prefers to preserve the literal recipe across the four-package iteration; the cost is a permanent annotation in family-(4) and a small footgun on adjacent `createRequire` / `req` use.

## Relationships

- T29 "`loom/load/host-incompatible` `details.step` enumeration in the diagnostics-side row is out of sync with the canonical probe enumeration" — same-cluster (also Step 0(d) / `host-incompatible` `probe-failed`; independent fix).

---

# T32 - Step 0 opening sentence claims three preconditions in order `(a) → (b) → (c)`, contradicting the five-sub-step `(a)`–`(e)` body

**Kind:** clarity
**Importance:** high
**Score:** 100
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

The Step 0 opening sentence at `id="entry-capability-probe"` in
`docs/spec_topics/pi-integration-contract/capability-probe.md` asserts
that the factory probes **three host preconditions** in the **fixed
order `(a) → (b) → (c)`**, but the body of the same section defines
**five** sub-steps `(a)`–`(e)`, the reconciliation paragraph fixes the
short-circuit order as `(a) → (b) → (c)+(d) → (e)`, and PIC-5 caps the
probe at "five enumerated checks". Both the opening sentence and the
reconciliation paragraph are normative ("fixed order" / "fixed normative
order") yet disagree on the count (three vs five) and on the terminal
sub-step of the short-circuit chain (`(c)` vs `(e)`). The contradiction
is internal to a page that declares itself the canonical source of truth
for every probe rule: an implementation following the opening sentence
literally would not emit `kind: "typebox-shape"` or
`kind: "peer-dep-out-of-range"` / `"peer-dep-malformed-version"`
diagnostics, and a conformance test cannot decide which behaviour the
spec endorses.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** 126ff8a — pi-loom spec: Step 0 capability probe rewrite + V1.0 deferrals + Choice B (2026-05-06, Thomas Andersen); f072903 — pi-loom spec: resolve "T09 typebox host-shape probe + diagnostic" (2026-05-08, Thomas Andersen)
**History:** Commit 126ff8a introduced the Step 0 capability probe in `spec_topics/pi-integration-contract.md` with an opening sentence committing to "three host preconditions in the fixed order (a) → (b) → (c)" while the body defined four sub-steps `(a)`–`(d)` and the reconciliation paragraph stated "(a)→(b)→(c)+(d)" — so a three-vs-four mismatch was already present at inception. Commit f072903 added the `typebox` host-shape sub-step `(e)`, updated the reconciliation paragraph to "(a)→(b)→(c)+(d)→(e)" and the Probe-wide invariants from "four enumerated checks" to "five enumerated checks", but left the opening "three host preconditions / (a) → (b) → (c)" sentence untouched — widening the count gap from three-vs-four to three-vs-five and the terminal-step gap from `(c)`-vs-`(d)` to `(c)`-vs-`(e)`. The defect therefore arises from the interaction: the original sentence was always slightly stale, and the typebox extension propagated through every neighbour except the opening, which is the only normative location still claiming "three" / "ending at `(c)`".

## Solution approach

Rewrite the Step 0 opening sentence at `id="entry-capability-probe"` so
its count and order match the body and the reconciliation paragraph:
**five** host preconditions in the fixed short-circuit order
`(a) → (b) → (c)+(d) → (e)`. Use the same `(c)+(d)` glyphs the
reconciliation paragraph uses so the two sites stay grep-aligned, and
preserve the existing "stops at the first failure (short-circuit)"
clause, the canonical-source-of-truth claim, the floor-literal
reference, and the JS-engine-not-probed disclaimer.

## Solution constraints

- Out of scope: the `(ii)` payload `kind` enumeration and the
  diagnostics-side `details.step` list, owned by T29.

## Relationships

- T29 "`loom/load/host-incompatible` `details.step` enumeration in the diagnostics-side row is out of sync with the canonical probe enumeration" — same-cluster (separate Step-0 internal contradiction on the same canonical probe page; resolve independently, but verify in the same edit that no new contradictions are introduced between the opening sentence, the `(ii)` payload enumeration, and the `kind` discriminator list).
# T33 - Terminal-outcomes aggregator sentence packs the trichotomy and three carve-outs into one ~15-line nested parenthetical

**Kind:** clarity
**Importance:** high
**Score:** 100
**Must-fix:** false
**Decision axes:** 2
**Shape:** single
**State:** reduced

## Problem

The `<a id="terminal-outcomes-aggregator">` paragraph in `docs/spec/overview-and-orientation.md` packs the success / fail / cancelled trichotomy, three lettered hard-ceiling carve-outs, a carve-out-within-a-carve-out for the `invoke(...)` `params` arm, and several forward-links into one ~15-line sentence running three-plus concurrent parenthetical / em-dash nesting levels, so a reader cannot place a clause's subject without re-scanning. Independently, the umbrella phrase "the following hard-ceiling cases are excluded from the Failure-cause enumeration" is genuinely ambiguous between two readings — "not a Failure at all" (correct for ceiling #4's in-loop model-driven tool-call args row) and "a real Failure whose enumeration is owned by a different section" (correct for binder argument-binding failure, owned by the pre-evaluation ERR-1…ERR-7/ERR-16 list). A single carve-out item carries both polarities at once: the inner parenthetical asserts the `invoke(...)` `params` arm IS an evaluation Failure surfacing as `Err(InvokeInfraError { cause: "validation", ... })`, the reverse of what the umbrella just excluded, with no syntactic cue telling the reader which polarity applies to which sub-case. Downstream sites that cite this paragraph for the closed Failure-cause set inherit the wrong polarity, which propagates into operator-channel routing and the per-cause caller-surface map.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:**
- `a5ad529` (2026-05-06) — *pi-loom spec: resolve "Orientation conflates cancellation with a separate failure mode"*. Introduced a concise three-clause trichotomy sentence (~2 lines) — no carve-outs, no nesting.
- `52219c4` (2026-05-06) — *Address all 41 spec-review findings*. Same-day rewrite grew the sentence with the `Hard runtime ceilings` forward-link plus the per-cause caller-surface and partial-append-contract forward-link tails. Still single-level parentheticals.
- `8168ea8` (2026-05-10) — *pi-loom spec: resolve "T30 ceiling #4 model-driven row trichotomy carve-out"*. Added the first nested carve-out parenthetical (the lettered "(a) the load-time binder cap, (b) ceiling #4's model-driven tool-arg row, (c) ceiling #4's slash-load `params` arm" structure) and the umbrella phrase **"the following hard-ceiling cases are excluded from the Failure-cause enumeration"**. The umbrella's ambiguity dates from this commit.
- `a90a58a` (2026-05-10) — *pi-loom spec: resolve "T29 pre-evaluation exclusion clause names ceiling #3 only"*. Restructured case (a) to fold the former separate "(c)" cross-route into "(a)" as an inline sub-parenthetical, and added the polarity-inverting inner parenthetical asserting the `invoke(...)` `params` arm IS an evaluation Failure with `Err(InvokeInfraError { cause: "validation", … })`. This commit raised the nesting depth to 3+ and introduced the mid-sentence polarity flip.
- `f5e89f4` (later) — *docs: enforce 100KB hard / 30KB recommended size cap on spec set*. Pure relocation of `spec.md` into `docs/spec/overview-and-orientation.md`; no content change to this paragraph.

**History:** Two clean, individually-defensible fixes (the T30 carve-out and the T29 cross-route correction) landed four days apart against the same already-load-bearing sentence; each was scoped to its own narrow correctness defect and did not split the sentence. The current ambiguity is the emergent property of those two carve-outs sharing one umbrella phrase plus the second fix's inner polarity-flip — neither commit individually crossed the legibility threshold, but together they did. The durable fix addresses the *interaction* (decompose the sentence) rather than reverting either correctness fix.

## Solution approach

Restructure the `id="terminal-outcomes-aggregator"` paragraph so the trichotomy, the per-arm gloss, and the hard-ceiling carve-out list each read as separate legible units instead of one nested sentence. Disambiguate the umbrella phrase so each carve-out case explicitly states its polarity — whether it is a real failure whose enumeration is owned by a different section (binder argument-binding failure, owned by the pre-evaluation ERR-1…ERR-7/ERR-16 list at `error-model.md#terminal-outcomes`) or a case that never terminates the query (ceiling #4's `#in-loop` model-driven tool-call args row) — and lift the `invoke(...)` `params`-arm reversal out of its inner parenthetical so it is no longer buried under the excluding umbrella. Preserve the forward-links the current sentence carries (`#ceiling-4-table`, `#terminal-outcomes`, `#partial-append-contract`, `#query-terminating`, `#in-loop`) and keep the `id="terminal-outcomes-aggregator"` anchor on the lead so inbound citations do not silently retarget.

## Solution constraints

- Out of scope: the `error-model.md#terminal-outcomes` Failure-bullet mirror is owned by T34; do not restructure it independently of T34's resolution.
- This is a structural / legibility fix: preserve every existing normative disposition; do not change which cases are Failures versus non-Failures.

## Relationships

- T34 "Failure terminal-outcome bullet packs definition, Err/panic split, and lettered hard-ceiling exclusions into one ~300-word sentence" — co-resolve (the owner-page mirror of this aggregator paragraph; the same decomposition must be applied in the same commit to honour the GOV-30 aggregator-vs-source lock-step rule that the aggregator paragraph itself cites).
# T34 - Failure terminal-outcome bullet packs definition, Err/panic split, and lettered hard-ceiling exclusions into one ~300-word sentence

**Kind:** clarity
**Importance:** high
**Score:** 100
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

The `Failure` bullet of the closed Terminal-outcomes trichotomy in `docs/spec_topics/errors-and-results/error-model.md` (under `id="terminal-outcomes"`) is a single ~307-word sentence that conflates four independent things: the core definition of `Failure` as a terminal outcome; the `?`-propagation / explicit-`Err` / panic / hard-ceiling sub-causes; the panic-unconditional-vs-`Err`-only-when-unhandled disposition rule; and two lettered hard-ceiling carve-outs, each carrying a multi-clause parenthetical naming surfaces, runtime events, and the excluded `QueryError` carriers. The semantic spine ("Failure means X; the following exclusions apply") is unrecoverable under skim, and carve-out (a) packs two opposite dispositions of the same ceiling-#4 row into one nested parenthetical. The obligations are correct; their packaging defeats comprehension and invites a future editor to break the embedded conditions during a routine touch-up.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** 52219c4 — Address all 41 spec-review findings (2026-05-06, Thomas Andersen); 8168ea8 — pi-loom spec: resolve "T30 ceiling #4 model-driven row trichotomy carve-out" (2026-05-10, Thomas Andersen); a90a58a — pi-loom spec: resolve "T29 pre-evaluation exclusion clause names ceiling #3 only" (2026-05-10, Thomas Andersen); 0321a3d — pi-loom spec: resolve "Pre-evaluation failure list lacks per-item ERR-N anchors" (2026-05-30, Thomas Andersen); cdfdc0f — pi-loom spec: resolve "ERR-5 conflates two pre-evaluation failure surfaces" (2026-06-05, Thomas Andersen)
**History:** Commit 52219c4 introduced the `Failure` bullet as a single, compact sentence ("returned `Err`, panicked, or exhausted a hard runtime ceiling…"). Subsequent per-finding fixes each accreted a clause without re-shaping the bullet: 8168ea8 inserted the lettered exclusion structure (a)/(b)/(c) and the long ceiling-#4 in-loop carve-out with its `ValidationError`/`CodeToolError`/`InvokeInfraError` enumeration; a90a58a folded (c) back into (a) as "binder argument-binding failure — including ceiling #4's slash-load `params` arm cross-routed through ceiling #3" with the `invoke(...)` vs slash-load disambiguation parenthetical; 0321a3d wrapped "binder argument-binding failure item" in an `#err-5` anchor link; cdfdc0f added the parallel `#err-16` anchor link for the slash-load `params` arm. Each individual edit was small and locally justified, but the cumulative effect is the present ~307-word, 2-deep-parenthetical sentence — the defect is the *unresolved structural pressure* across the commit chain, not any one commit's content.

## Solution approach

Restructure the `Failure` bullet under `id="terminal-outcomes"` into a short lead clause plus a nested exclusion list, redistributing the existing obligations across explicit list items. Split the `Err`/panic disposition rule into its own nested bullet, and break each hard-ceiling carve-out into its own item — surfacing carve-out (a)'s "slash-load only vs `invoke(...)` `params` arm IS an evaluation Failure" disambiguation as a separate sub-item rather than a packed parenthetical. Carry the `#err-5` and `#err-16` anchor links into their natural items.

## Solution constraints

- The change is structural only: no normative obligation, anchor link, `kind`/carrier enumeration, or disposition rule may be added, removed, or altered.
- Out of scope: the `terminal-outcomes-aggregator` paragraph in `docs/spec/overview-and-orientation.md`, owned by T33.

## Relationships

- T33 "Terminal-outcomes aggregator sentence packs the trichotomy and three carve-outs into one ~15-line nested parenthetical" — co-resolve (the aggregator-side sibling of this owner-page bullet; the same restructure resolves both, with a one-line touch-up on the aggregator paragraph, to honour the GOV-30 aggregator-vs-source lock-step rule).
