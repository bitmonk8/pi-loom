# pi-loom — Consolidated Spec Review

_Generated: 2026-05-06T14:41:04Z_
_Source: docs/reviews/spec-review/spec-20260506-142846.md_
_20 findings retained (correctness 20, blocking 0); 18 cosmetic and 40 advisory findings filtered out_
_Re-filtered: 2026-05-06T14:41:04Z — correctness/blocking only_

---

## spec.md — Opening paragraphs / Lead prose

---

# Partial-append boundary undefined when cancellation lands mid-stream

**Source:** docs/reviews/spec-review/spec-20260506-142846.md
**Original heading:** Partial-append / cancellation boundary undefined at orientation level
**Kind:** completeness, error-model

## Finding

The orientation commits to a strong UX contract: "turns appended *before* the terminal event remain in the conversation … and the runtime performs no implicit rollback." The word "appended" is load-bearing — it pins what the user (in prompt mode) and the parent loom (in subagent mode after `invoke`) observe after a cancellation — yet neither the orientation nor any of the pages it forward-links defines what counts as "appended" when the abort lands while a turn is still in flight. The cases that matter are concrete and observably divergent:

1. **Provider request issued, no assistant text yet streamed.** The user-turn that initiated the query was committed to the conversation before the request went out (it had to be, to send it). Is that user-turn part of the "appended" set on cancellation? The spec doesn't say.
2. **Assistant turn streaming, abort mid-stream.** `slash-invocation.md` covers prompt mode under "User-visible streaming": "whatever partial text Pi has already rendered remains visible; partial output is not rolled back. The cancellation system note is appended after the partial prefix." That is the only first-class normative answer in the corpus, and it is scoped to the user-visible transcript — not to the underlying conversation message list that subsequent queries read from.
3. **Typed-query tool loop, abort while a model-driven tool call is executing.** Prior assistant tool-use blocks and their tool-result turns are committed; the in-flight tool's result message is undefined. `errors-and-results.md`'s "No rollback" paragraph names "tool calls that have already returned" and "queries already appended" but is silent on the partial-tool-result case.
4. **Subagent mode, anywhere in the same three flows above.** The subagent conversation is disposable and unobservable to the operator, but the orientation's commitment is mode-uniform. A reader cannot tell whether the same partial-append rule applies, is moot, or is intentionally undefined.

`cancellation.md` defines *when* cancellation surfaces (checkpoints, race semantics, surfacing variants) but never describes the conversation-state postcondition. `errors-and-results.md` describes what the runtime declines to do for the author. `slash-invocation.md` describes what Pi renders. None of the three closes the loop on what `ctx.sessionManager.buildSessionContext().messages` (or its subagent equivalent) contains after the loom returns. Two implementers reading the orientation can ship transcripts that diverge in cases (1), (3), and (4) without violating any spec page.

## Spec Documents

- `spec.md` — Orientation, paragraph beginning "Loom evaluation produces one of three terminal outcomes" (edited)
- `spec_topics/cancellation.md` — new "Conversation-state postcondition" subsection or extension to **Surfacing** (edited)
- `spec_topics/slash-invocation.md` — User-visible streaming bullets (read-only; already covers prompt-mode mid-stream visible text — keep aligned)
- `spec_topics/errors-and-results.md` — "No rollback" paragraph (option-dependent: cross-reference if the new contract lands in `cancellation.md`, edited if it lands here)
- `spec_topics/pi-integration-contract.md` — Conversation drive — prompt mode; Subagent session lifecycle (read-only; the `pi.sendUserMessage` / `createAgentSession` semantics determine which messages physically reach the conversation list and pin the answer)

## Plan Impact

**Phases:** MVP, Vertical V5, Vertical V12, Vertical V14, Vertical V15, Vertical V18

**Leaves (implementation order):**

- Mb — slash-command bring-up; M-level cancellation forwarder test — (modified — assert what `FakeExtensionAPI`'s recorded message list contains after a cancellation lands mid-`send`)
- V5e — `PromptModeConversationDriver` — (modified — assert which user-turn / partial-assistant-turn entries are present after mid-flight abort)
- V5g — Provider error classifier (mid-stream truncation already names `raw_response`) — (modified — align the partial-stream conversation-state assertion with the new postcondition)
- V12a — Subagent session lifecycle / disposal — (modified — assert subagent conversation-state postcondition under spawn-then-immediate-cancel and mid-stream cancel)
- V14c-a — Code-side tool call signal forwarding — (modified — assert that a tool aborted mid-execute leaves no synthetic result turn in the conversation, since code-side calls are not turns)
- V18b — `AbortSignal` before every `@` query — (modified — extend mid-flight abort test to assert conversation message list)
- V18c — `AbortSignal` before every tool call — (modified — same, for model-driven tool loops inside typed queries)
- V18d — `AbortSignal` before every `invoke` — (modified — assert subagent and prompt-mode conversation-state postconditions per child)
- V18e — Cancellation propagates downward only — (modified — parent's conversation post-child-cancel state)
- V18p — Binder cancellation — (modified — confirm cancelled-binder leaves no user-turn appended, since the loom never starts)

## Consequence

**Severity:** correctness

Two reasonable implementers can ship transcripts that diverge in observable ways: one strips the in-flight user-turn on cancellation, another preserves it; one preserves a partial assistant-turn in the conversation list (not just the rendered transcript), another truncates it. In prompt mode this changes what the user sees on retry and what subsequent loom queries read from `ctx.sessionManager.buildSessionContext()`. In subagent mode it changes what the parent observes if it ever inspects the disposable conversation (today it doesn't, but the contract should not depend on that accident).

## Solution Space

**Shape:** single

### Recommendation

Add a `## Conversation-state postcondition` subsection to `cancellation.md` (sibling to **Race semantics** and **Surfacing**), and replace the orientation's bare "turns appended *before* the terminal event remain in the conversation" with a one-clause forward-link to that subsection. Define "appended" by enumerating the three checkpointed boundaries plus the streaming case:

1. **Pre-dispatch abort** (signal observed at a `@`-query, tool-call, `invoke`, or binder pre-call checkpoint before the underlying provider/tool/child runs): no turn is appended for that operation. The user-turn associated with a `@`-query is *not* committed until dispatch begins; an abort observed at the pre-query checkpoint leaves the conversation in its prior state.
2. **In-flight provider-side abort, no assistant tokens received yet** (signal observed by the provider before the first streamed token): the user-turn that triggered the request is committed (Pi has already accepted it via `pi.sendUserMessage`); no assistant turn is appended.
3. **In-flight provider-side abort, partial assistant tokens already streamed**: the user-turn is committed; the partial assistant turn — exactly the bytes Pi has already accepted — remains in the conversation. This generalises `slash-invocation.md`'s prompt-mode visible-prefix rule from "what the user sees" to "what the conversation list contains," and the visible-prefix rule becomes a corollary.
4. **In-flight tool-loop abort during a model-driven tool call** (typed-query free phase, or untyped-query tool loop): every assistant tool-use block and every tool-result message that completed before the abort remains in the conversation; the tool whose `execute(...)` was in flight contributes no result message.
5. **In-flight `invoke` child abort**: the parent's conversation is unaffected by the child (subagent children never write to the parent; prompt-mode children share the conversation and leave whatever turns rules 1–4 produce). The child's conversation in subagent mode is disposed with `AgentSession.dispose()` and is not observable.
6. **Binder abort** (per V18p): the loom does not run; no turn is appended.

State the rule as mode-uniform: prompt mode and subagent mode share the same postcondition; the only difference is observability (prompt mode's conversation is the user's; subagent mode's is disposed on return). The visible-prefix bullet in `slash-invocation.md` keeps its current wording but adds a sentence noting it is the prompt-mode rendering of rule (3). The "No rollback" paragraph in `errors-and-results.md` adds a forward-link to the new subsection.

Edge cases the implementer must watch:

- Pi's `pi.sendUserMessage` returns a `Promise`; the conversation commit happens inside Pi before the loom resumes. The runtime cannot un-commit a user-turn after the call returns. Rule (2) reflects that — the user-turn stays.
- For typed queries where the synthesised respond-tool turn is the boundary, the forced respond turn behaves like rule (3) for the streamed text and like rule (4) for any preceding free-phase tool-use blocks.
- The partial assistant turn in rule (3) is whatever bytes Pi has accepted — not the bytes the provider produced. The runtime does not buffer-and-replay; it relies on Pi's own streaming sink as the canonical conversation state.
- `InvokeCalleeError`'s `inner: cancelled` does not change the parent's conversation; the parent's `match` arm runs against an already-final conversation.

## Related Findings

- "Conversations append-only, host-owned — UX commitment of partial failure not stated" — co-resolve (same gap viewed through the assumptions lens; the postcondition subsection answers both the "what is appended" and "what does the user see" framings)
- "Cancellation propagation across `invoke` boundary not established at orientation level" — same-cluster (orientation-level cancellation gap; covers propagation direction rather than conversation state, but the orientation rewrite that this finding requires should land both clauses together)
- "Terminal outcome caller-observable surface not pinned" — same-cluster (orientation's three-outcome enumeration also undertspecifies the caller-side observable; the rewrite that adds the conversation-state forward-link is the natural place to also pin the per-outcome caller observable)

---

---

## spec.md — Orientation → Prerequisites → Pi SDK and capabilities

---

# "Minor-version line" is undefined and ambiguous in spec.md

**Source:** docs/reviews/spec-review/spec-20260506-142846.md
**Original heading:** "minor-version line" is ambiguous
**Kind:** clarity, consistency

## Finding

`spec.md` Orientation → Prerequisites → Pi SDK and capabilities states that `pi-agent-core`, `pi-ai`, and `pi-tui` "MUST be present at the same minor-version line as the resolved `@mariozechner/pi-coding-agent` install." The phrase **minor-version line** is never defined and admits at least two readings: (1) same `MAJOR.MINOR` exactly (so `1.4.2` and `1.4.7` are the same line, but `1.5.0` is not); (2) "compatible-minor floor" in the npm-caret sense (so `^1.4.2` matches `1.5.0` too). The two readings differ on every host whose `MAJOR > 0`, which is precisely the case the spec needs to survive.

`pi-integration-contract.md` partially clarifies the rule by saying the lock-step is "the same `^X.Y.Z`" range string declared in `peerDependencies` for all four packages, currently `"^0.72.1"`. That clarification only happens to be unambiguous because the current major is `0`: npm caret semantics for `^0.72.1` permit only patch-level moves, so all four packages co-vary at the `0.72.x` granularity. As soon as Pi reaches `1.0.0` the same `"^X.Y.Z"` literal would permit minor-level skew, and the spec would silently mean something different.

The finding compounds with two adjacent gaps: spec.md never names which `package.json` the runtime probe reads (the contract specifies only `@mariozechner/pi-coding-agent`'s), and never names the `details.kind` discriminator that fires on a sub-package mismatch (none exists, because no probe step verifies the three sub-packages — see related finding *Sub-packages MUST requirement has no load-bearing probe step*). A reader of `spec.md` alone cannot reconstruct what "the same minor-version line" means operationally, what is read to check it, or what fires when it is violated.

## Spec Documents

- `spec.md` — Orientation → Prerequisites → Pi SDK and capabilities (edited)
- `spec_topics/pi-integration-contract.md` — preamble + Host prerequisites — Pi SDK pin (edited)
- `spec_topics/glossary.md` — new entry, if the term survives (option-dependent)

## Plan Impact

**Phases:** Horizontal

**Leaves (implementation order):**

- H1 — Repository scaffold and test framework — (read-only)

The `peerDependencies` literal-read test in `plan_topics/h1-scaffold.md` already pins all four entries to the same literal `"^0.72.1"` string and is the de facto enforcement of the lock-step. The fix is editorial in the spec; H1's `Tests` and `Ships when` do not change.

## Consequence

**Severity:** correctness

Two reasonable implementers will read the prereq paragraph differently the moment Pi crosses `1.0.0`. One will gate on `MAJOR.MINOR` equality, the other on `^X.Y.Z` caret-range satisfaction; the second admits skew that the contract page elsewhere disclaims as unsupported. Until Pi bumps to `1.x` the divergence is masked by caret-on-zero semantics, which is exactly the kind of latent ambiguity that survives review and surfaces at the worst possible moment.

## Solution Space

**Shape:** single

### Recommendation

Replace "the same minor-version line as the resolved `@mariozechner/pi-coding-agent` install" in `spec.md` Orientation → Prerequisites with: *"declared in `package.json#peerDependencies` with the same range string as `@mariozechner/pi-coding-agent` (currently `^0.72.1`); the lock-step granularity is whatever that shared range admits."* Cross-link to a new named anchor `#pinned-peer-dep-range` in `pi-integration-contract.md` Host prerequisites — Pi SDK pin and reproduce the literal there, mirroring the treatment `>=20.6.0` already gets for the Node floor.

In the same edit to `pi-integration-contract.md` Host prerequisites — Pi SDK pin, replace the two occurrences of "minor-version line" (preamble, item 1) with "shared `peerDependencies` range" and add one explanatory sentence: *"Under the current `^0.72.1` pin, npm caret-on-zero semantics permit only patch-level co-variation; under any future `^X.Y.Z` with `X ≥ 1`, the same caret string would permit minor-level co-variation. The H1 `peerDependencies` literal-read test enforces that all four entries carry the identical range string, regardless of what that string permits."*

State explicitly in the same paragraph that the runtime probe reads only `@mariozechner/pi-coding-agent`'s `package.json` (the existing contract text says this implicitly via the four pinned constants enumeration; promote it to a sentence). Note that the three sub-packages are not probed at runtime by design — the H1 literal-read test is the gate — and forward-link to the related finding's resolution for the `details.kind` enumeration question.

Edge cases the implementer must watch:

- Do **not** introduce a new `details.kind` for sub-package mismatch as part of this edit; that question belongs to the related *Sub-packages MUST requirement* finding and would expand the four-pinned-constants probe surface that obligation 4 freezes.
- The glossary already lacks an entry for "minor-version line"; once the term is replaced with "shared `peerDependencies` range" it does not need a glossary entry, but a glossary cross-reference under "peer-dep range" pointing at the new anchor would help the *Peer-dep range not anchored at point of use* finding co-resolve cleanly.
- The H1 leaf's `peerDependencies` literal-read test text already cites "Host prerequisites — Pi SDK pin" as the anchor; if the section heading is altered, update that citation in `plan_topics/h1-scaffold.md` in the same commit to keep the anchor live (this is an editorial follow-through, not a leaf modification).

## Related Findings

- "Sub-packages (`pi-agent-core`, `pi-ai`, `pi-tui`) MUST requirement has no load-bearing probe step" — decision-dependency (defining the term as "shared `peerDependencies` range" makes the no-runtime-probe-for-sub-packages stance defensible; that finding then chooses between expanding the probe vs. downgrading the MUST)
- "Peer-dep range not anchored at point of use; 'four pinned constants' third constant unresolvable from this file" — co-resolve (the same edit that introduces the `#pinned-peer-dep-range` anchor closes this finding)
- "Semver comparator for the peer-dep probe unspecified" — same-cluster (touches the same paragraph; resolves independently by naming `semver.satisfies`)
- "Re-validation: narrowing `peerDependencies` not covered; acceptance criterion not defined" — same-cluster (same surface; orthogonal concern about widening vs. narrowing)
- "`peerDependencies` install-time enforcement example flag is incorrect" — same-cluster (same paragraph; orthogonal factual fix to the npm flag name)
- "Probe contract detail in Prerequisites belongs in `pi-integration-contract.md`" — decision-dependency (if probe contract is moved out of `spec.md`, the prereq paragraph collapses to the lock-step rule alone, simplifying this finding's edit)
- "`peerDependencies` uses pinned ranges but Pi's packaging docs require `\"*\"` — deviation unacknowledged" — same-cluster (justifies why a pinned range exists at all; informs the explanatory sentence proposed above)

---

---

# Sub-package version MUST contradicts the "single load-bearing check" claim

**Source:** docs/reviews/spec-review/spec-20260506-142846.md
**Original heading:** Sub-packages (`pi-agent-core`, `pi-ai`, `pi-tui`) MUST requirement has no load-bearing probe step
**Kind:** consistency, assumptions

## Finding

The orientation paragraph **Pi SDK and capabilities** in `spec.md` makes three claims that cannot all be true at once:

1. "The `pi-agent-core`, `pi-ai`, and `pi-tui` packages **MUST** be present at the same minor-version line as the resolved `@mariozechner/pi-coding-agent` install."
2. "The extension MUST verify the seven enumerated SDK capabilities … the Node version floor … the `AbortSignal` / `AbortController` shape … and the installed `@mariozechner/pi-coding-agent` version at extension-factory entry; on any mismatch it MUST refuse to register …" — i.e., the runtime verification surface enumerated by the orientation paragraph names only the `@mariozechner/pi-coding-agent` version, not the three sub-packages.
3. "`peerDependencies` declares the supported range, but install-time enforcement is package-manager-dependent … and is non-load-bearing; the factory-entry probe is the single load-bearing check."

The probe described under [`pi-integration-contract.md` — Step 0 (Capability probe)](spec_topics/pi-integration-contract.md) reads only `@mariozechner/pi-coding-agent`'s `package.json`. Its four pinned constants list a single peer-dep range and its four `details.kind` discriminators (`"node-floor"`, `"abortsignal-shape"`, `"sdk-capability-missing"`, `"peer-dep-out-of-range"`) name no sub-package check. The contract page is also explicit that the runtime *intentionally* does not probe the sub-packages: "Loom does not at runtime read `pi-coding-agent`'s `package.json` to verify the upstream pin — doing so would re-introduce the very skew-tolerance disclaimed above; the H1 literal-read assertion is the build-time gate that keeps the four `peerDependencies` minors aligned."

So the contract page settles the design — sub-package alignment is a build-time and structural-pin concern, not a runtime one — but the orientation sentence still asserts a runtime MUST whose enforcement obligation has no probe step and no diagnostic. A reader who follows `spec.md` alone will either implement an unspecified fifth probe step or conclude that the MUST is unenforced.

## Spec Documents

- `spec.md` — Orientation → Prerequisites → Pi SDK and capabilities (edited)
- `spec_topics/pi-integration-contract.md` — Host prerequisites — Pi SDK pin, Step 0 (Capability probe), Pi version bump procedure (read-only; already settles the design)
- `spec_topics/diagnostics.md` — `loom/load/host-incompatible` row (option-dependent: only edited if Option A is chosen, to add a fifth `details.kind`)

## Plan Impact

**Phases:** Horizontal

**Leaves (implementation order):**

- H1 — Repository scaffold and test framework — (modified)

H1 already owns the `package.json` `peerDependencies` literal-read test that asserts all four entries (`@mariozechner/pi-coding-agent`, `@mariozechner/pi-agent-core`, `@mariozechner/pi-ai`, `@mariozechner/pi-tui`) equal the same `"^0.72.1"` literal. Under the recommendation below, the spec edit re-anchors the orientation sentence to that test as the build-time gate; H1's test wording stays valid and only its **Spec.** anchor is touched. Under Option A, H1 is more substantially modified (the SDK surface-inventory test's "four pinned constants" claim becomes "five" and a sub-package range constant must enter the same source of truth). No leaf currently implements the runtime Step 0 probe itself, so the option-dependent fifth `details.kind` has no existing leaf home.

## Consequence

**Severity:** correctness

Two reasonable implementers diverge: one treats the orientation MUST literally and adds an unspecified runtime probe step (extra `package.json` reads, an undefined `details.kind` value, a check that the contract page explicitly forbids); the other treats the contract page as authoritative and silently downgrades the orientation MUST. The diagnostic surface (`details.kind` enumeration), the `SDK_SURFACE_INVENTORY` constant, and the wording of the H1 `peerDependencies` literal-read test all hang off the resolution.

## Solution Space

**Shape:** multiple

### Option A — Add a fifth probe step

**Approach.** Extend Step 0 to read the three sub-package `package.json` files, compare their versions against the same `^0.72.1` range, and emit `loom/load/host-incompatible` with a new `details.kind = "sub-package-skew"` on mismatch.

**Spec edits.**

- Append a fifth check (e) to the Step 0 enumeration in `pi-integration-contract.md`.
- Add `"sub-package-skew"` to the `details.kind` set in the Step 0 paragraph and in the `loom/load/host-incompatible` row in `diagnostics.md`.
- Change "four pinned constants" → "five pinned constants" everywhere (Step 0 text, Pi version bump procedure step 5, H1 SDK surface-inventory test description in `h1-scaffold.md`).
- Delete the contract page's explicit disclaimer that "Loom does not at runtime read `pi-coding-agent`'s `package.json` to verify the upstream pin."
- Reword the orientation MUST to match: "The extension MUST verify … and the installed `@mariozechner/pi-coding-agent` and `pi-agent-core` / `pi-ai` / `pi-tui` versions at extension-factory entry."

**Pros.** Honours the orientation MUST literally. Catches the rare case where a package manager (pnpm strict mode, npm with `--legacy-peer-deps`) installs a `pi-coding-agent` minor whose own `dependencies` block resolved to a sub-package outside `^0.72.1` (e.g. via overrides).

**Cons.** Re-introduces the skew-tolerance the contract page deliberately disclaims. Adds three filesystem reads to factory startup. Requires the probe to know about three sibling package names that the seven SDK capabilities have no need to mention. Multiplies the failure surface (sub-package missing, sub-package present but wrong minor, sub-package `package.json` malformed) without a corresponding implementer-relevant payoff: the H1 `peerDependencies` literal-read test already fails the build before any user can install a skewed combination from the loom side.

**Risks.** A `package.json#dependencies` skew inside Pi's monorepo would now produce a runtime `loom/load/host-incompatible` rather than a Pi-side build failure, shifting blame onto loom for an upstream packaging bug.

### Option B — Downgrade the orientation MUST to a structural statement

**Approach.** Rewrite the orientation sentence to state what the contract page already says: the three sub-packages ride along transitively from `@mariozechner/pi-coding-agent`'s own `dependencies` block (`pi-mono` releases all four together; no skew is supported), loom's `peerDependencies` declares the four belt-and-braces, the H1 `peerDependencies` literal-read test is the build-time gate, and the runtime probe deliberately checks only `@mariozechner/pi-coding-agent`'s version.

**Spec edits.**

- Replace the second sentence of **Pi SDK and capabilities** with: "The `pi-agent-core`, `pi-ai`, and `pi-tui` packages resolve transitively from `@mariozechner/pi-coding-agent`'s own `dependencies` block at the same minor-version line; loom's `peerDependencies` declares all four for surfacing install-time errors under package managers that do not auto-deduplicate transitive peer-dep ranges, and the build-time `peerDependencies` literal-read test (per [`h1-scaffold.md`](./plan_topics/h1-scaffold.md)) is the gate that keeps the four minors aligned. See [Pi Integration Contract — Host prerequisites — Pi SDK pin](./spec_topics/pi-integration-contract.md) for provenance."
- In the same paragraph, narrow the runtime-verify list to the four checks the probe actually performs: seven SDK capabilities, Node floor, `AbortSignal` shape, installed `@mariozechner/pi-coding-agent` version. Drop any implication that sub-package versions are runtime-checked.
- No edit to `pi-integration-contract.md` Step 0, the four pinned constants, the four `details.kind` discriminators, or `diagnostics.md` is needed.

**Pros.** Aligns the orientation with what the contract page already states and what H1 already tests. Removes a contradiction without inventing new diagnostic surface. Keeps the probe minimal and avoids the skew-tolerance the contract page disclaims.

**Cons.** Loosens the MUST in the orientation paragraph (becomes a structural assertion, not a runtime obligation). A reader who expects a runtime check for sub-package skew must read the contract page to learn that no such check exists.

**Risks.** None significant. The only failure mode the runtime check would have caught — a package manager installing a sub-package outside the pinned range despite the four-entry `peerDependencies` — is already unsupported per the explicit "no skew supported" rule in [`pi-integration-contract.md` — Host prerequisites — Pi SDK pin](spec_topics/pi-integration-contract.md).

### Recommendation

**Option B.** The contract page has already settled the design — sub-package alignment is build-time, not runtime — and explicitly disclaims the very probe step Option A would introduce. Option B reconciles the orientation paragraph with that decision in two sentence-level edits and requires no diagnostic-surface, plan-leaf, or test changes beyond an anchor pointer. The implementer must take care to keep the runtime-verify list in the orientation paragraph in lock-step with the four-check enumeration in `pi-integration-contract.md` Step 0; both name the same four checks and a future fifth check would have to land in both places in the same edit.

## Related Findings

- "\"minor-version line\" is ambiguous" — co-resolve (same MUST sentence; Option B's rewrite removes the ambiguous phrase entirely, so a single edit closes both)
- "Peer-dep range not anchored at point of use; \"four pinned constants\" third constant unresolvable from this file" — decision-dependency (Option A would change "four pinned constants" → "five" and renumber the cited constant; Option B leaves the count intact)
- "`pi.register*` four-name list vs. umbrella; `pi.on` missing from refusal surface" — same-cluster (touches the same orientation paragraph's refusal-surface clause; resolves independently)
- "\"System-note fallback chain\" undefined, unlinked, and creates a bootstrapping contradiction" — same-cluster (same orientation paragraph; resolves independently)
- "`peerDependencies` install-time enforcement example flag is incorrect" — same-cluster (same paragraph's `--engine-strict` aside; resolves independently)
- "Probe contract detail in Prerequisites belongs in `pi-integration-contract.md`" — same-cluster (structural concern about the same paragraph; both fixes pull detail toward the contract page)

---

---

# Probe-failure refusal surface omits `pi.on` and uses two non-equivalent enumerations

**Source:** docs/reviews/spec-review/spec-20260506-142846.md
**Original heading:** `pi.register*` four-name list vs. umbrella; `pi.on` missing from refusal surface
**Kind:** consistency, implementability

## Finding

`spec.md`'s Orientation → Prerequisites → Pi SDK and capabilities paragraph describes the probe-failure refusal in two textually different ways and neither matches the canonical set in `spec_topics/pi-integration-contract.md`.

The lead **Pi SDK and capabilities** paragraph says the extension "MUST refuse to register slash commands, tools, renderers, or flags" — four user-facing categories. Host runtime obligations 1, 2, and 3 each say the probe "refuses every `pi.register*` call" — a glob over four call names. The two phrasings are presented as if equivalent without ever being declared so.

`spec_topics/pi-integration-contract.md` step 0 names the canonical set as **five** factory-time calls: `pi.registerFlag`, `pi.registerCommand`, `pi.registerTool`, `pi.registerMessageRenderer`, **and `pi.on`** — and the contract is explicit that `pi.on` is separate from the `pi.register*` family ("skips every subsequent `pi.register*` and `pi.on` call"). The `pi.register*` glob in `spec.md` therefore does not textually capture `pi.on`, and the four-category list does not capture it either (`pi.on` subscribes to host events, it does not register a user-facing artefact). A reader of `spec.md` alone implements a probe that refuses the four register-calls but lets `pi.on("session_start", …)`, `pi.on("session_shutdown", …)`, and `pi.subscribe("resources_discover", …)` through. The resulting extension subscribes to host event channels on a host the probe deemed incompatible — leaking partial extension state, running teardown code in `session_shutdown` against a stale runtime, and ultimately driving the deferred `pi.registerCommand` through the `session_start` handler whose subscription was supposed to be gated.

## Spec Documents

- `spec.md` — Orientation → Prerequisites → Pi SDK and capabilities (edited)
- `spec.md` — Orientation → Prerequisites → Host runtime, obligations 1, 2, 3 (edited)
- `spec_topics/pi-integration-contract.md` — Extension entry point, Step 0 (read-only; canonical five-call list lives here)

## Plan Impact

**Phases:** Horizontal, MVP, Vertical V14, Vertical V18

**Leaves (implementation order):**

- H4 — Pi extension shell — (modified)
- Mb — Minimal runtime + slash registration + two-root discovery + no-params overflow note — (modified)
- V14t — `resources_discover` subscription — (modified)
- V18a — Chokidar watcher + `LoomRegistry` swap — (modified)

H4 owns the extension factory and is the natural home for the Step 0 probe and its refusal gate; once the spec enumerates `pi.on`, H4's tests must assert that `pi.on` subscriptions are also skipped on probe failure, not just `pi.register*` calls. Mb subscribes to `pi.on("session_start", …)` and would otherwise install that handler against an incompatible host. V14t subscribes to `resources_discover` (a `pi.on`/`pi.subscribe` call). V18a installs a chokidar watcher that depends on Mb's subscriptions being gated.

## Consequence

**Severity:** correctness

Two implementers reading `spec.md` alone diverge: one infers the umbrella `pi.register*` is the literal scope and lets `pi.on` through; the other infers the four-category list is the literal scope and reaches the same wrong conclusion. The resulting extension subscribes to host events on an incompatible host, runs `session_shutdown` teardown against a stale runtime, and indirectly registers slash commands through the `session_start` handler that was supposed to be gated.

## Solution Space

**Shape:** single

### Recommendation

In `spec.md` Orientation → Prerequisites → Pi SDK and capabilities, replace the four-category prose ("slash commands, tools, renderers, or flags") with a single forward-link to the canonical call list in `spec_topics/pi-integration-contract.md`'s Step 0. Concretely:

- Change the lead paragraph clause from "MUST refuse to register slash commands, tools, renderers, or flags, and MUST emit `loom/load/host-incompatible`" to "MUST skip every factory-time host-binding call enumerated by [Pi Integration Contract — Extension entry point — Step 0](./spec_topics/pi-integration-contract.md#entry-capability-probe) (the four `pi.register*` calls **and `pi.on`**), and MUST emit `loom/load/host-incompatible`".
- In Host runtime obligations 1, 2, and 3, change every "refuses every `pi.register*` call" to "refuses every factory-time host-binding call (the four `pi.register*` calls and `pi.on`) per [Pi Integration Contract — Step 0](./spec_topics/pi-integration-contract.md#entry-capability-probe)".
- Add the anchor `#entry-capability-probe` (or equivalent stable id) to `spec_topics/pi-integration-contract.md` at the Step 0 heading so the cross-link does not silently rot — this is the same anchor the related "Step 0 cross-reference is not an anchor" finding requires, so the two edits land together.

The forward-link form is preferred over inlining all five names in three places because the canonical list lives in `pi-integration-contract.md` and a future addition (e.g. a hypothetical `pi.subscribe` distinct from `pi.on`) then propagates from one source.

Implementer edge case: `pi.subscribe(eventName, handler)` (used by V14t for `resources_discover`) is the same factory-time host-binding surface as `pi.on` for refusal purposes; if the SDK actually exposes both names, the spec text and the contract's Step 0 list MUST cover both, not just `pi.on`. The H4 probe-refusal gate is implemented at the `PiExtensionAPI` adapter layer, not by per-call defensive checks.

## Related Findings

- "Sub-packages (`pi-agent-core`, `pi-ai`, `pi-tui`) MUST requirement has no load-bearing probe step" — same-cluster (both expose gaps in the Step 0 probe contract; resolved independently)
- "Probe self-failure (probe throws) has no error contract" — same-cluster (probe-failure refusal surface; independent fix)
- "Probe ordering / aggregation across simultaneous failures unspecified" — same-cluster (probe contract; independent fix)
- "Per-call `pi.register*` failure on the probe-success path unspecified" — same-cluster (uses the same `pi.register*` umbrella that this finding shows is incomplete; the post-probe-failure path under-specification mirrors this pre-probe-failure under-specification but is a distinct edit)
- "Probe contract detail in Prerequisites belongs in `pi-integration-contract.md`" — co-resolve (the recommended forward-link form is exactly the relocation that finding asks for)
- "\"Step 0\" cross-reference to `pi-integration-contract.md` is not an anchor; inconsistently named" — co-resolve (the recommendation requires adding the `#entry-capability-probe` anchor that finding also requires)
- "Prerequisites probe block has six MUST obligations with no IDs" — decision-dependency (assigning IDs to the probe MUSTs must enumerate the correct set of five gated calls, not four)
- "Obligation 2 bundles four independently testable sub-requirements under one ordinal" — same-cluster (refusal mechanism is one of the bundled sub-requirements)

---

---

# Capability probe — peer-dep version comparator and malformed-version handling unspecified

**Source:** docs/reviews/spec-review/spec-20260506-142846.md
**Original heading:** Semver comparator for the peer-dep probe unspecified
**Kind:** completeness, implementability

## Finding

`pi-integration-contract.md` Step 0 (d) says the probe "reads the installed `@mariozechner/pi-coding-agent` version from its `package.json` (via Node's package-resolution APIs) and compares against the `^0.72.1` range pinned at the top of this document," but never names the comparison algorithm. `^0.72.1` is a SemVer caret-range literal; lexicographic string compare, dotted-numeric tuple compare, and `semver.satisfies` will all return different verdicts on real-world inputs (`"100.0.0"` vs `"20.6.0"`, pre-release suffixes, build metadata). Two implementers reading this paragraph will pick two different comparators and the probe will silently pass or fail the wrong host versions.

The probe also has no defined behaviour when the installed `version` field is missing, non-SemVer (e.g. a git-URL pin, a `0.72.1-alpha.1+build.7` build-metadata variant, or a workspace `*` placeholder) or when the `package.json` itself cannot be resolved. The four enumerated `details.kind` values (`node-floor`, `abortsignal-shape`, `sdk-capability-missing`, `peer-dep-out-of-range`) do not obviously cover "version string is unparseable" or "package not resolvable from the loom factory's resolution context"; an implementer must guess whether to map those into `peer-dep-out-of-range`, throw, or silently pass.

The same gap exists for Host runtime obligation 1 (the Node floor compare) — it is tracked separately as a co-resolve sibling — but the peer-dep case is the more consequential one because the input is operator-controlled (any installed Pi version) rather than runtime-controlled.

## Spec Documents

- `spec_topics/pi-integration-contract.md` — Step 0 — Capability probe (edited)
- `spec_topics/diagnostics.md` — `loom/load/host-incompatible` row (edited under Option B; read-only under Option A)
- `spec.md` — Orientation → Prerequisites → Host runtime obligation 1 (read-only; the Node-floor sibling finding owns its edit)

## Plan Impact

**Phases:** Horizontal

**Leaves (implementation order):**

- H4 — Pi extension shell — (modified)

The capability probe is not currently enumerated by any plan leaf — H4 owns the extension factory that hosts it but its `Tests.` block does not exercise the probe. Whichever leaf eventually tests the probe will need to assert the chosen comparator and the malformed-version disposition; H4 is the only existing candidate. H1's literal-read tests are unaffected (they pin `package.json` constants, not comparator behaviour). H3's diagnostic-code registry gate is unaffected unless Option B is taken (see below), in which case the `details.kind` enumeration in `pi-integration-contract.md` and the `loom/load/host-incompatible` row in `diagnostics.md` move together.

## Consequence

**Severity:** correctness

Two reasonable implementers will diverge on the comparator. A naive `installed >= "0.72.0"` lexicographic compare passes `"100.0.0"` (correct by accident) but fails `"0.72.10"` against `"0.72.2"` (wrong). A non-SemVer install (git pin, workspace pin, missing field) currently has no defined diagnostic, so the probe may either crash inside the comparator (no `host-incompatible` emitted; factory dies) or silently let the loom load against an unverified Pi.

## Solution Space

**Shape:** multiple

### Option A — Single comparator, subsume malformed into `peer-dep-out-of-range`

**Approach.** Amend Step 0 (d) to read: "compares using `semver.satisfies(installed, range, { includePrerelease: false })` from the `semver` npm package, where `installed` is the `version` field of the resolved `package.json` and `range` is the pinned literal. If `installed` is missing, non-string, or not a valid SemVer (rejected by `semver.valid`), or the `package.json` cannot be resolved, the probe treats the precondition as violated and emits `details: { kind: "peer-dep-out-of-range", observed: <raw-string-or-"<unresolvable>">, required: "^0.72.1" }`." The `semver` package becomes a dependency listed alongside the four pinned constants.

**Spec edits.**
- `pi-integration-contract.md` Step 0 (d): name `semver.satisfies`, add the option, define the malformed/unresolvable disposition.
- `pi-integration-contract.md` step 5 of the version-bump procedure ("five pinned constants" if the chosen `semver` major is itself pinned, otherwise still four).
- `diagnostics.md` `loom/load/host-incompatible` row: extend the `peer-dep-out-of-range` parenthetical to "(the installed `@mariozechner/pi-coding-agent` version, read from its `package.json`, is outside the pinned range, malformed, or the `package.json` is unresolvable)".

**Pros.** Closed `details.kind` enumeration stays at four. Single comparator across the codebase. `semver.satisfies` is the de-facto Node ecosystem standard and matches the caret syntax the spec already uses. No churn in H3 or V18s closing gates.

**Cons.** Operator triage loses precision — a git-pinned install and an outright incompatible version surface identically. The `observed` string becomes the only triage signal.

**Risks.** Adding a new runtime dependency (`semver`) widens the H1 literal-read surface; H4's probe tests must assert that `semver.satisfies` is the actual call site (not a hand-rolled equivalent), otherwise the spec's prescription is unenforceable.

### Option B — Single comparator, separate `details.kind` for malformed input

**Approach.** Same comparator (`semver.satisfies`), but introduce a fifth `details.kind`: `"peer-dep-malformed-version"` (covering non-SemVer `version`, missing `version`, and unresolvable `package.json`).

**Spec edits.**
- `pi-integration-contract.md` Step 0 (d): name `semver.satisfies`, define malformed → `peer-dep-malformed-version`.
- `pi-integration-contract.md` Step 0 (ii): expand the `kind ∈ { … }` set to five entries.
- `diagnostics.md` `loom/load/host-incompatible` row: list the fifth kind.
- The `four pinned constants` phrasing recurs in step 5 of the version-bump procedure and in the related-finding "Peer-dep range not anchored at point of use" — those uses do not change because the comparator is not a constant, but reviewers may need to re-check that the count "four" still refers to inputs not kinds.

**Pros.** Operator triage distinguishes "Pi installed at an unsupported version" from "Pi install metadata is broken". The latter usually means a packaging mistake (workspace symlink, git-pinned dev install) rather than a real version skew, and the recovery path differs.

**Cons.** Five-element closed enum is mildly less symmetric than four. Diagnostic-table edit forces synchronised updates across two spec files.

**Risks.** None beyond the synchronised edit. H3's gate keys on the diagnostic *code* (`loom/load/host-incompatible`), not on `details.kind` values, so no closing-gate update is required.

### Recommendation

**Option B.** The comparator is `semver.satisfies(installed, range, { includePrerelease: false })` from the `semver` npm package, applied to the `version` field of the resolved `@mariozechner/pi-coding-agent/package.json`. A missing or non-SemVer `version`, or a `package.json` that cannot be resolved from the loom factory's module-resolution context, MUST emit `details: { kind: "peer-dep-malformed-version", observed: <raw-string-or-"<unresolvable>">, required: "^0.72.1" }`; an installed `version` that parses as SemVer but falls outside the pinned range MUST emit `details: { kind: "peer-dep-out-of-range", observed: <version-string>, required: "^0.72.1" }`.

Edge cases the implementer must watch:
- The `semver` package version itself is a new pinned input. Add it to the H1 literal-read coverage (peerDependency or runtime dependency, whichever the build settles on) so a silent bump cannot widen comparator behaviour.
- `package.json` resolution must use the loom factory's resolution context (not the loom runtime's `cwd`), since the extension may be installed globally. Resolve via `import.meta.resolve` or `createRequire(import.meta.url).resolve('@mariozechner/pi-coding-agent/package.json')`; the latter is the conservative choice on Node 20.6.0.
- `includePrerelease: false` is the default but stating it pins the behaviour against future `semver` major bumps that might flip the default.
- The same comparator-naming sentence should be propagated to Host runtime obligation 1's Node-floor compare (sibling finding "Obligation 1 — Node version comparison algorithm unspecified") in the same edit; pick `semver.gte(process.versions.node, "20.6.0")` for symmetry.

## Related Findings

- "Obligation 1 — Node version comparison algorithm unspecified" — co-resolve (same `semver`-package fix sentence applies to the Node-floor compare in Step 0 (a))
- "Peer-dep range not anchored at point of use; \"four pinned constants\" third constant unresolvable from this file" — same-cluster (both touch the peer-dep probe's input contract; if Option B lands the "four pinned constants" phrasing remains accurate but the related finding's anchor work is unaffected)
- "Sub-packages (`pi-agent-core`, `pi-ai`, `pi-tui`) MUST requirement has no load-bearing probe step" — decision-dependency (if that finding's resolution adds sub-package probes, each new probe inherits the comparator decision made here)
- "Probe self-failure (probe throws) has no error contract" — same-cluster (Option B's `peer-dep-malformed-version` kind narrows the surface that finding has to cover, but does not subsume it — `package.json` resolution can throw for reasons other than a malformed `version`)
- "Probe ordering / aggregation across simultaneous failures unspecified" — same-cluster (resolves the orthogonal question of which kind fires first when multiple preconditions fail; comparator choice does not constrain it)
- "Probe contract detail in Prerequisites belongs in `pi-integration-contract.md`" — decision-dependency (that finding moves Step 0's prose around; this finding's edits land at whatever location that move settles on)

---

---

# Step-0 capability probe has no error contract for its own throws

**Source:** docs/reviews/spec-review/spec-20260506-142846.md
**Original heading:** Probe self-failure (probe throws) has no error contract
**Kind:** error-model

## Finding

The Step-0 capability probe in `spec_topics/pi-integration-contract.md` enumerates four `details.kind` values for `loom/load/host-incompatible` — `"node-floor"`, `"abortsignal-shape"`, `"sdk-capability-missing"`, `"peer-dep-out-of-range"` — each describing a *determined* defect (a comparison ran and produced "no"). The contract is silent on the case where a probe step **throws** before producing a verdict, even though every step has plausible throw paths the spec itself implies:

- Step (a) reads `process.versions.node`. On an exotic host where `process.versions` is absent or its getter throws, the comparison setup throws.
- Step (b) evaluates `typeof <member>` on `AbortSignal` / `AbortController` members. `typeof obj.member` invokes member access (and any getter / Proxy `get` trap), which can throw on a hostile or partially-installed binding.
- Step (c) evaluates `typeof <member>` on the seven SDK capabilities — same getter / Proxy throw path.
- Step (d) "reads the installed `@mariozechner/pi-coding-agent` version from its `package.json` (via Node's package-resolution APIs)". `require.resolve` throws on `MODULE_NOT_FOUND`; `fs.readFileSync` throws on permission / stat errors; `JSON.parse` throws on a corrupt file.

The only adjacent rule — "the factory MUST NOT throw" — tells the implementer they must catch the throw, but does not say which `details.kind` to emit, what to put in `details.observed` / `details.required` (which have no defined value when no comparison ran), or whether the throw's message survives in the diagnostic. The `details.kind` set in the contract paragraph and in the `loom/load/host-incompatible` row of `diagnostics.md` is written as a closed enumeration ("`kind ∈ { … }`"), so an implementer cannot legally invent a fifth value, yet none of the four legal values truthfully describes "we couldn't determine the answer". Two reasonable implementers will diverge: one will let the throw propagate (violating the no-throw rule); one will mis-attribute the throw to the closest kind (e.g. force a `package.json`-read failure into `"peer-dep-out-of-range"`, losing the signal that the version is *unknown*, not *out of range*); one will silently swallow the throw and load the extension with no diagnostic at all.

## Spec Documents

- `spec_topics/pi-integration-contract.md` — Extension entry point — Step 0 (Capability probe) (edited)
- `spec_topics/diagnostics.md` — `loom/load/host-incompatible` registry row (edited)
- `spec.md` — Orientation — Prerequisites — Pi SDK and capabilities (read-only)

## Plan Impact

**Phases:** Horizontal

**Leaves (implementation order):**

- H4 — Pi extension shell — (modified)

H4 owns the extension factory and is the only leaf whose acceptance criteria implement the probe (per the `Pi Integration Contract` row of `plan_topics/coverage-matrix.md`). H4's current Tests bullets do not enumerate any throw-path case for the probe; closing this finding adds at least one test. H1 owns the four pinned constants and the literal-read SDK-surface-inventory test, but those are build-time artefacts that do not exercise the runtime throw path, so H1 is not affected.

## Consequence

**Severity:** correctness

On any host where a probe step's input is unreadable rather than merely wrong (corrupt or unresolvable `package.json`, hostile `Proxy` on a globalThis member, exotic Node embedding without `process.versions`), implementations will diverge: some will crash the extension loader, some will mis-classify the failure into one of the four existing `details.kind` values, some will silently load with degraded capabilities. The "the factory MUST NOT throw" guarantee — which the host loader and `/reload` semantics depend on — has no enforceable diagnostic counterpart, so even compliant implementations cannot be distinguished from buggy ones by inspecting their output.

## Solution Space

**Shape:** multiple

### Option A — Per-step trap; reuse existing four kinds

**Approach.** Wrap each of steps (a)–(d) in its own `try`/`catch`. A throw inside step (a) maps to `details.kind = "node-floor"`, step (b) to `"abortsignal-shape"`, step (c) to `"sdk-capability-missing"`, step (d) to `"peer-dep-out-of-range"`. Add a `details.cause` sub-field (string, the caught error's `message`) that is populated when the kind was reached via a throw rather than a comparison.

**Spec edits.**
- In the Step 0 paragraph, add: "Each of the four checks runs inside its own `try`/`catch`. A throw inside any check is treated as a failure of that check: the probe emits `loom/load/host-incompatible` with the check's `details.kind`, sets `details.observed = null`, copies the comparison's pinned constant into `details.required`, and adds `details.cause = <error.message>` to record that the verdict came from a throw rather than a comparison. The probe MUST NOT propagate the error to the host extension loader."
- In `diagnostics.md`'s `loom/load/host-incompatible` row, document the optional `details.cause` sub-field and note that `details.observed` is `null` when `details.cause` is present.

**Pros.** Closed `kind` set stays at four. Implementer's catch site is co-located with the step it guards — easy to keep the mapping correct.

**Cons.** `"node-floor"` / `"peer-dep-out-of-range"` no longer cleanly mean "version is below floor" / "version is out of range" — they also mean "we couldn't determine the version". `details.observed = null` is a discriminator that an inattentive consumer may miss.

**Risks.** Operators reading just `details.kind = "peer-dep-out-of-range"` from a log will believe they need to bump the peer dep, when in fact the install is corrupt — the actionable remediation is different.

### Option B — Add `"probe-failed"` as a fifth kind

**Approach.** Extend the closed `details.kind` set to five values by adding `"probe-failed"`. A throw in any probe step short-circuits to a single `loom/load/host-incompatible` with `details.kind = "probe-failed"`, `details.step ∈ { "node-floor", "abortsignal-shape", "sdk-capability-missing", "peer-dep-out-of-range" }` naming which step threw, and `details.cause = <error.message>` carrying the underlying error text. The four existing kinds retain their narrow meaning ("comparison ran and produced no").

**Spec edits.**
- In the Step 0 paragraph, change the kind enumeration to `kind ∈ { "node-floor", "abortsignal-shape", "sdk-capability-missing", "peer-dep-out-of-range", "probe-failed" }` and add: "If any probe step throws (including, but not limited to, `process.versions` evaluation, `typeof` evaluation against a Proxy or hostile getter, `package.json` resolution / read / parse), the probe traps the throw, emits `loom/load/host-incompatible` with `details.kind = "probe-failed"`, `details.step` naming which step threw, and `details.cause = <error.message>`. The probe MUST NOT propagate the error to the host extension loader."
- In `diagnostics.md`'s `loom/load/host-incompatible` row, extend the kind enumeration to include `"probe-failed"`, document `details.step` and `details.cause`, and update the Resolution column with "for `"probe-failed"`, inspect `details.cause` to identify the unreadable input — the host's installation is malformed rather than out of range".

**Pros.** Each of the four original kinds keeps its precise meaning. Operators see at a glance "the host is broken, not just non-conforming". The `details.step` sub-field still localises the failure for debugging.

**Cons.** Closed list grows from four to five. H1's `SDK_SURFACE_INVENTORY` constant is unaffected, but any test that pattern-matches the four kinds must learn the fifth.

**Risks.** Minimal — adding an enumerator to a load-diagnostic discriminator is a backwards-compatible shape change for any consumer that handles unknown kinds.

### Recommendation

**Option B.** Adding `"probe-failed"` keeps the four existing kinds semantically clean (each one still means "comparison ran and produced no") and forces the implementer to confront the indeterminate-verdict case explicitly, rather than smuggling unreadable inputs through a kind that suggests a determined defect. Implementer edge cases:

- The probe MUST still run all four checks if any of them succeed independently (a `package.json`-read throw in step (d) does not excuse skipping the deterministic typeof checks in steps (a)–(c) — emit one `loom/load/host-incompatible` per ordering policy, deferred to the related "Probe ordering / aggregation" finding).
- `details.cause` is the JS `Error.message` string, not the `Error` object — diagnostics are serialisable per the existing diagnostics contract.
- The `details.step` value is one of the four original kind names (reused as a discriminator inside `"probe-failed"`), not a free-form label, so it stays grep-able from the H1 surface-inventory constant.
- The "factory MUST NOT throw" rule remains the over-arching invariant; the per-step try/catch is the mechanical means of upholding it.

## Related Findings

- "Probe ordering / aggregation across simultaneous failures unspecified" — decision-dependency (the ordering / aggregation choice determines whether multiple `"probe-failed"` events can co-occur with other-kind events in one diagnostic, or are short-circuited)
- "Per-call `pi.register*` failure on the probe-success path unspecified" — same-cluster (adjacent gap in the load-diagnostic surface; resolves independently)
- "`pi.register*` four-name list vs. umbrella; `pi.on` missing from refusal surface" — same-cluster (also touches the Step 0 refusal contract)
- "Sub-packages (`pi-agent-core`, `pi-ai`, `pi-tui`) MUST requirement has no load-bearing probe step" — same-cluster (related closed-list-of-kinds debate)
- "Obligation 2 — Typeof probe rule contradicts non-function members (`signal.aborted`, `signal.reason`)" — same-cluster (defines what step (b) is allowed to evaluate, which constrains where throws are possible)
- "Obligation 3 — Capability-7 (Binder LLM model) is not a function; typeof check gives false-negative" — same-cluster (defines what step (c) is allowed to evaluate)
- "Prerequisites probe block has six MUST obligations with no IDs" — same-cluster (meta-finding about the same probe block; resolution would give this finding's edit a stable anchor)

---

---

# Probe-failure ordering is unspecified; same broken host yields nondeterministic diagnostics

**Source:** docs/reviews/spec-review/spec-20260506-142846.md
**Original heading:** Probe ordering / aggregation across simultaneous failures unspecified
**Kind:** completeness, error-model

## Finding

`spec_topics/pi-integration-contract.md` step 0 ("Capability probe") defines four host-precondition checks — labelled (a) Node floor, (b) `AbortSignal` / `AbortController` shape, (c) seven-item SDK capability surface, (d) peer-dep range — and four corresponding `details.kind` discriminators on `loom/load/host-incompatible`: `"node-floor"`, `"abortsignal-shape"`, `"sdk-capability-missing"`, `"peer-dep-out-of-range"`. The diagnostic carries a singular `kind` (not a `kinds[]` array) and the prose says the factory "emits **a single** `loom/load/host-incompatible` diagnostic" on failure. That commits to short-circuit semantics implicitly, but no normative MUST anchors either the short-circuit decision or the order in which the four checks run.

Concretely: a host that violates both (a) and (b) — e.g. Node 18 *and* a polyfilled `AbortSignal` missing `AbortSignal.any` — has four observably-correct emissions under the current text (`kind: "node-floor"` *or* `"abortsignal-shape"` *or* either if the implementer chose to accumulate into a single payload by overloading the field). The (a)–(d) lettering reads as a presentation order, not an execution order; nothing forbids an implementer from running (d) first because it's the cheapest synchronous read, or running them in parallel `Promise.all`-style and racing.

The `loom/load/host-incompatible` row in `spec_topics/diagnostics.md` inherits the same gap: it lists the four `kind` values disjunctively but is silent on which one wins under simultaneous failure. The downstream effect is that two reasonable implementers produce different diagnostics for byte-identical broken hosts, and the H4 acceptance test that asserts the diagnostic text on a known-broken fixture cannot be written without ambiguity.

## Spec Documents

- `spec_topics/pi-integration-contract.md` — Extension entry point → Step 0 (Capability probe) (edited)
- `spec_topics/diagnostics.md` — `loom/load/host-incompatible` registry row (edited)
- `spec.md` — Orientation → Prerequisites → Host runtime obligations 1–3 (read-only — sources the four pinned constants but does not own the probe sequence)

## Plan Impact

**Phases:** Horizontal

**Leaves (implementation order):**

- H4 — Pi extension shell — (modified) — H4 owns the extension factory but its current **Adds** / **Tests** make no mention of the step-0 probe at all; the ordering decision lands here as new test bullets ("≥2 simultaneous violations emit `kind: <first-in-fixed-order>`") plus the runtime implementation. The implicit gap (probe runtime not enumerated in any leaf) is exposed by this finding and should be closed at the same edit.

## Consequence

**Severity:** correctness

Two compliant implementations produce different `loom/load/host-incompatible` diagnostics on the same broken host, defeating the diagnostic's operator-facing purpose ("address the named defect first"). Test determinism is also lost: any H4 acceptance fixture that breaks more than one precondition has no single correct expected `kind`, so the test must either weaken to `kind ∈ {…}` (losing the regression value of pinning the chosen order) or be omitted.

## Solution Space

**Shape:** single

### Recommendation

Adopt short-circuit semantics with a fixed normative order matching the existing (a)–(d) presentation:

1. `node-floor`
2. `abortsignal-shape`
3. `sdk-capability-missing`
4. `peer-dep-out-of-range`

In `spec_topics/pi-integration-contract.md` step 0, replace "the factory runs a synchronous probe of the four host preconditions … (a) … (b) … (c) … (d)" with text that pins the rule explicitly: "the factory runs the four checks **in the fixed order (a) → (b) → (c) → (d) and stops at the first failure**; on a failure the factory skips the remaining checks and emits a single `loom/load/host-incompatible` diagnostic carrying the failing check's `kind`." Keep the existing "single diagnostic" / singular-`kind` wording — it already aligns. No `details.kind` shape change required; no `diagnostics.md` registry-shape change required (only a one-sentence cross-reference noting that simultaneous failures resolve to the first-in-order kind).

The order rationale, included as a non-normative aside in the spec edit:
- (a) before everything else because every later check assumes the V8/libuv version delivers WHATWG primitives the probe itself reads; (b) before (c) because the SDK capability checks dereference `pi.*` members whose contract assumes a working `AbortSignal`; (c) before (d) because a missing capability is a hard load defect regardless of peer-dep version, while an out-of-range peer-dep with the capability physically present is the most recoverable case (operator upgrades npm install).

Add an H4 acceptance test for ≥2 simultaneous violations: a `FakeExtensionAPI` fixture that fails (a) and (b) simultaneously must observe `kind: "node-floor"` exactly; one that fails (b) and (c) must observe `kind: "abortsignal-shape"`; one that fails (c) and (d) must observe `kind: "sdk-capability-missing"`. Each test also asserts no further `pi.register*` calls fired after the diagnostic emission.

Edge case for the implementer: the probe MUST evaluate just enough of each check to decide pass/fail before moving to the next; under short-circuit, lazy evaluation is the rule, not an optimisation. The "`observed`" field carries only the failing check's observation, never an aggregate.

## Related Findings

- "Probe self-failure (probe throws) has no error contract" — decision-dependency (introduces a fifth `kind: "probe-failed"`; the ordering rule must place it explicitly — recommended position is "any throw, at any check, terminates with `kind: "probe-failed"`", which supersedes the in-order kind for that check)
- "`refreshTools` cited as 'Pi documents as safe before bind' but absent from Pi's public API docs" — same-cluster (touches the same step-0 / pre-bind surface but resolves independently)
- "Per-call `pi.register*` failure on the probe-success path unspecified" — same-cluster (covers the post-probe registration path; orthogonal error contract, same diagnostic channel)

---

---

## spec.md — Orientation → Prerequisites → Host runtime

---

# Node version comparison algorithm unspecified in Host runtime obligation 1

**Source:** docs/reviews/spec-review/spec-20260506-142846.md
**Original heading:** Obligation 1 — Node version comparison algorithm unspecified
**Kind:** completeness

## Finding

Host runtime obligation 1 in `spec.md` (and the cross-referenced Step 0 capability probe in `spec_topics/pi-integration-contract.md`) says the probe "compares `process.versions.node` against the floor (`>=20.6.0`)" and emits `loom/load/host-incompatible` with `details.kind = "node-floor"` on a sub-floor host. It does not name the comparison algorithm. Three reasonable interpretations diverge on observable behaviour:

- **Lexicographic string compare** of `"20.6.0"` against `"20.6.0"` works for pinned floor and current Node, but `"100.0.0" < "20.6.0"` lexically, so Node 100 would be rejected.
- **Hand-rolled numeric-tuple parse** of `process.versions.node` works for release builds but has to define handling of pre-release Node builds (`"21.0.0-nightly20250101abcdef"`, `"22.0.0-rc.1"`), which `process.versions.node` does emit on nightly / release-candidate channels.
- **`semver` package range satisfaction** (`semver.satisfies(process.versions.node, ">=20.6.0")` or `semver.gte(process.versions.node, "20.6.0")`) is the npm-ecosystem-canonical answer, but its default "exclude pre-releases" semantics would refuse a `20.7.0-nightly` host whose stable equivalent satisfies the floor — a behaviour the spec must either accept or override with `{ includePrerelease: true }`.

The same gap exists at Step 0 sub-clause (d): "compares against the `^0.72.1` range pinned at the top of this document" — a caret range over a `0.x` version follows npm-specific rules that no implementer should re-derive by hand. Both comparison sites need a named algorithm; otherwise two reasonable implementers will pick incompatible comparators and the H1 surface-inventory test (which asserts a literal string, not a comparator behaviour) will not catch the divergence.

## Spec Documents

- `spec.md` — Orientation → Prerequisites → Host runtime, Obligation 1 (edited)
- `spec_topics/pi-integration-contract.md` — Extension entry point, Step 0 Capability probe sub-clauses (a) and (d) (edited)
- `spec_topics/diagnostics.md` — `loom/load/host-incompatible` row, `details.kind = "node-floor"` and `"peer-dep-out-of-range"` definitions (read-only; existing wording already references "running Node version" / "installed version", consistent with the named comparator)
- `plan_topics/h1-scaffold.md` — `engines.node` literal-read test and `peerDependencies` literal-read test (read-only; both explicitly say "not a semver-range comparison" — that posture is unaffected since the H1 tests verify the *literal source-of-truth string*, not the runtime probe's comparison)

## Plan Impact

**Phases:** Horizontal

**Leaves (implementation order):**

- H1 — Project scaffold — (modified) — the `SDK_SURFACE_INVENTORY` / pinned-constants block under `src/extension/` is already cited as the single source of truth for the four pinned constants (Node floor, AbortSignal member list, capability list, peer-dep range); when the spec names a comparator, H1 must add the named `semver` package to the dependency manifest (production dep, not dev) and the pinned-constants module must export a comparator function alongside the constants so the probe leaf consumes one symbol rather than re-implementing the comparison.
- H4 — Pi extension shell — (modified) — H4 already owns the extension factory entry point, the `sendSystemNote` helper, and the `loom-system-note` renderer registration. The capability probe described in `pi-integration-contract.md` Step 0 is not currently enumerated as an explicit H4 add — that is a separate plan-coverage gap — but whichever leaf eventually implements the probe consumes the named comparator from the H1 constants module.

## Consequence

**Severity:** correctness

Two reasonable implementers will pick different comparators (lexicographic, hand-rolled tuple, or `semver`). On a Node 100 host, lexicographic compare refuses to load; on a Node 21-nightly host, default `semver.satisfies(…, ">=20.6.0")` refuses to load while a hand-rolled tuple compare accepts. The defect is silent — both implementations pass the H1 literal-read test for `engines.node === ">=20.6.0"` because that test does not exercise the runtime comparator — and surfaces only as inconsistent `details.kind = "node-floor"` diagnostics in the field.

## Solution Space

**Shape:** single

### Recommendation

Name `semver.satisfies` (from the `semver` npm package) as the comparator at both Step 0 sub-clauses, and pin `semver` as a direct production dependency in the loom `package.json` (not a peer-dep — loom owns this comparator, it is not delegated to the host).

Concrete spec edits:

1. In `spec.md` Host runtime obligation 1, after "compares `process.versions.node` against the floor", append: "using `semver.satisfies(process.versions.node, ">=20.6.0", { includePrerelease: true })` from the `semver` npm package, where `includePrerelease: true` permits Node nightly and release-candidate builds whose stable equivalent satisfies the floor."
2. In `spec_topics/pi-integration-contract.md` Step 0 sub-clause (a), make the same edit and additionally state that `process.versions.node` strings that fail `semver.valid` are routed through the probe-self-failure path (cross-link to the diagnostic owned by the related "Probe self-failure" finding once that is resolved).
3. In `spec_topics/pi-integration-contract.md` Step 0 sub-clause (d), append: "using `semver.satisfies(installedVersion, "^0.72.1")` from the same `semver` package; an installed `version` string that fails `semver.valid` (or a missing `version` field on `@mariozechner/pi-coding-agent`'s `package.json`) routes through the probe-self-failure path, not `details.kind = "peer-dep-out-of-range"`."
4. Add `semver` (and `@types/semver`) to the H1 dependency manifest; export the comparator wrapper from the pinned-constants module so the probe leaf imports one symbol (`isNodeFloorSatisfied(processVersionsNode): boolean`, `isPeerDepInRange(installedVersion): boolean`) and the H1 surface-inventory test can also exercise the comparator directly against fixture version strings.

Edge cases the implementer must watch:

- `process.versions.node` is the bare version (e.g. `"20.6.0"`), no leading `"v"`. `semver.satisfies` accepts that; do not pass `process.version` (which has the `"v"` prefix).
- `includePrerelease: true` is explicit and load-bearing; the default-false behaviour rejects `"21.0.0-nightly"` even though Node 21 stable satisfies `>=20.6.0`.
- The `semver` package is sync and synchronous-throws on internal errors; wrap each call in the probe's existing try/catch posture (whichever leaf owns it) and route an internal exception to the probe-self-failure diagnostic — do not collapse a thrown comparator error into `details.kind = "node-floor"`.
- Pinning `semver` as a direct dep adds one runtime dependency to the loom package; that is acceptable because the comparator runs at extension-factory entry on every Pi process startup and the `semver` package is small, dependency-free, and already transitively present in every npm-installed Node project.

## Related Findings

- "Semver comparator for the peer-dep probe unspecified" — co-resolve (same spec edit names both comparators; the recommendation above explicitly covers Step 0 sub-clause (d) alongside (a))
- "Probe self-failure (probe throws) has no error contract" — decision-dependency (the recommendation above defers malformed-version-string handling to the probe-self-failure path; that path must be defined for this fix to be complete)
- "Obligation 1 — No upper Node version bound; `AbortSignal` members may break on a future Node major" — same-cluster (touches the same Host runtime obligation 1 sentence; resolved independently — the comparator naming does not change the no-upper-bound stance)
- "`peerDependencies` install-time enforcement example flag is incorrect" — same-cluster (touches the same Pi SDK pin / peer-dep surface but resolves independently — the install-time `--engine-strict` flag is a separate sentence from the runtime comparator)

---

---

# Obligation 2 — Probe rule prescribes `typeof === "function"` for properties that are not functions

**Source:** docs/reviews/spec-review/spec-20260506-142846.md
**Original heading:** Obligation 2 — Typeof probe rule contradicts non-function members (`signal.aborted`, `signal.reason`)
**Kind:** completeness, prescription

## Finding

Host runtime obligation 2 in `spec.md` enumerates seven `AbortSignal` / `AbortController` members the runtime depends on, then prescribes a single uniform detection rule: the factory probe checks each "by `typeof <member> === \"function\"`." `pi-integration-contract.md` Step 0(b) repeats the same prescription verbatim. Two of the seven members are not functions:

- `signal.aborted` is a boolean accessor on `AbortSignal.prototype`.
- `signal.reason` is an arbitrary-value accessor on `AbortSignal.prototype`.

A faithful implementation of the literal rule will compute `typeof signal.aborted === "function"` (false on every conformant host), conclude that obligation 2 is violated, refuse every `pi.register*` call, and emit `loom/load/host-incompatible` with `details.kind = "abortsignal-shape"` on every load — the extension cannot start anywhere.

A second issue compounds the first: even for the genuinely-callable members, the rule is under-specified about *where* to look. `signal.throwIfAborted` and `signal.addEventListener` are prototype methods, not properties of any value the probe can name without first constructing an instance; `AbortSignal.any` and `AbortSignal.timeout` are static methods on the constructor; `AbortController.prototype.abort` is a prototype method. A naïve reading of the rule that constructs `new AbortController().signal` to access the instance members may itself depend on prerequisite shape that has not yet been verified, and the spec's own "MUST NOT use any member it is itself checking" clause forbids self-referential detection without explaining how to comply.

## Spec Documents

- `spec.md` — Orientation → Prerequisites → Host runtime, obligation 2 (edited)
- `spec_topics/pi-integration-contract.md` — Extension entry point → Step 0, sub-step (b) (edited)
- `spec_topics/cancellation.md` — read-only cross-reference for member call sites (read-only)

## Plan Impact

**Phases:** Horizontal

**Leaves (implementation order):**

- H1 — `SDK_SURFACE_INVENTORY` literal-read test (modified) — the H1 page describes the inventory as the single source of truth that the Step 0 probe also consumes; if the spec splits the probe by member-kind, the constant must encode that kind alongside each name so the literal-read test asserts the kind too.
- H4 — Pi extension shell (modified) — H4 owns `extensions/index.ts` (the file Step 0 lives in) but its current Adds list does not name the capability probe at all. Whatever the chosen probe shape, H4's Adds and Tests must spell it out: per-member checks against the kind table, the `details.kind = "abortsignal-shape"` refusal, and the "MUST NOT use any member it is itself checking" guard.

## Consequence

**Severity:** correctness

A literal-conformant implementation refuses every load on every host, because two of the seven `AbortSignal` members can never satisfy `typeof === "function"`. A non-literal implementation will silently invent its own per-member detection, and two implementers will diverge — one ignoring `signal.aborted` and `signal.reason`, another testing them via `in`, a third constructing a probe instance — producing different observable refusal sets across hosts that ought to behave identically.

## Solution Space

**Shape:** multiple

### Option A — Kind-tagged member table; per-kind detection rule

**Approach.** Replace the single uniform `typeof` rule with a small fixed enumeration of member kinds. The single source of truth (the `SDK_SURFACE_INVENTORY` constant on the H1 side, plus the `AbortSignal` / `AbortController` member list) carries one `kind` tag per entry, and the probe applies the kind-appropriate check.

Concrete kind table for obligation 2:

| Member                                | Kind                | Check                                            |
|---------------------------------------|---------------------|--------------------------------------------------|
| `AbortController` (global)            | constructor         | `typeof AbortController === "function"`          |
| `AbortSignal` (global)                | constructor         | `typeof AbortSignal === "function"`              |
| `AbortController.prototype.abort`     | prototype-method    | `typeof AbortController.prototype.abort === "function"` |
| `AbortSignal.any`                     | static-method       | `typeof AbortSignal.any === "function"`          |
| `AbortSignal.timeout`                 | static-method       | `typeof AbortSignal.timeout === "function"`      |
| `AbortSignal.prototype.throwIfAborted`| prototype-method    | `typeof AbortSignal.prototype.throwIfAborted === "function"` |
| `AbortSignal.prototype.addEventListener` | prototype-method | `typeof AbortSignal.prototype.addEventListener === "function"` |
| `AbortSignal.prototype.aborted`       | prototype-property  | `"aborted" in AbortSignal.prototype`             |
| `AbortSignal.prototype.reason`        | prototype-property  | `"reason" in AbortSignal.prototype`              |

**Spec edits.** In `spec.md` obligation 2: rewrite the named-member sentence to use the prototype-rooted names above and replace the uniform `typeof` clause with "checks each member by the rule prescribed for its kind in [Pi Integration Contract — Step 0](...)". In `pi-integration-contract.md` Step 0(b): replace the bare `typeof <member>` phrasing with the per-kind enumeration; explicitly note that prototype-property checks use the `in` operator against the prototype (no instance construction required, side-stepping the self-reference clause); restate the "MUST NOT use any member it is itself checking" rule in light of the new shape.

**Pros.** Determinism preserved; H1's "single source of truth" gate keeps biting; `details.kind = "abortsignal-shape"` surface and refusal contract unchanged; matches the highly-prescriptive register of the rest of `pi-integration-contract.md`.

**Cons.** Adds a small typology (four kinds) implementers must learn. The kind table grows the source-of-truth constant.

**Risks.** A future Pi version might add a member whose kind is none of the four (e.g. a `Symbol`-keyed member); the table needs an extension point. Fixed by adding `kind: "other"` with a per-entry custom predicate, or by deferring to Option B's looser contract for that one entry.

### Option B — Drop the prescriptive algorithm; keep only the observable contract

**Approach.** Remove the `typeof`-rule sentence entirely from both files. State only the observable: "The factory probe MUST detect that any of the named members is missing or wrong-shape and on detection MUST refuse every `pi.register*` call and emit `loom/load/host-incompatible` with `details.kind = \"abortsignal-shape\"`. The detection algorithm is unspecified." Keep the "MUST NOT use any member it is itself checking" clause.

**Spec edits.** Delete the `typeof <member> === "function"` clause from both `spec.md` obligation 2 and `pi-integration-contract.md` Step 0(b). Keep the named-member list and the refusal-and-diagnostic contract.

**Pros.** Smallest spec edit. Lets implementers pick whatever check works on their target host. Sidesteps the self-reference question.

**Cons.** Two implementations may produce different refusal sets on a partially-conformant host — exactly the contract divergence the prescription was trying to prevent. Erodes the "single source of truth" invariant H1 leans on (the constant becomes a name list with no detection contract). Inconsistent with how Step 0 prescribes the Node-floor and SDK-capability checks (which remain mechanical).

**Risks.** A lazy implementer may probe nothing for property-typed members and ship a runtime that silently uses a missing `signal.aborted`; the spec has no test gate that would catch this.

### Recommendation

**Option A.** The kind-tagged table preserves the determinism the rest of Step 0 has, keeps H1's single-source-of-truth gate sharp, and resolves the obligation-3 sibling finding by the same mechanism (the `Binder LLM model` capability gets `kind: "value"` or similar).

Edge cases the implementer must watch:

- The probe MUST NOT instantiate `new AbortController()` to read instance properties — that is both unnecessary (use `"name" in AbortSignal.prototype`) and tangles the probe with the constructors it is itself checking.
- `AbortSignal.prototype.aborted` is a getter; `"aborted" in AbortSignal.prototype` returns `true` even though the descriptor is an accessor, which is the desired observable. Do not use `AbortSignal.prototype.aborted !== undefined` — that would invoke the getter on the prototype and throw `TypeError: Illegal invocation` on most engines.
- The kind-tag for the global constructors is "constructor", not "static-method"; the probe must read the global namespace, not a constructor property.
- The H1 literal-read test must assert both the name *and* the kind for every entry, so a future spec edit that flips a member from "prototype-method" to "prototype-property" without the corresponding probe edit fails loudly at the H1 gate.

## Related Findings

- "Obligation 3 — Capability-7 (Binder LLM model) is not a function; typeof check gives false-negative" — co-resolve (same root cause: a uniform `typeof === "function"` rule applied to a non-callable member; Option A's kind table fixes both in the same spec edit).
- "Obligation 2 bundles four independently testable sub-requirements under one ordinal" — same-cluster (an editorial split of obligation 2 happens in adjacent text; the kind-tagged member table is one of the natural splits).
- "Probe self-failure (probe throws) has no error contract" — same-cluster (both edit Step 0; the kind-tagged probe surface introduces new throwing sites — `in`-operator on a hypothetically-`null` prototype — that interact with the still-missing self-failure contract).
- "Sub-packages (`pi-agent-core`, `pi-ai`, `pi-tui`) MUST requirement has no load-bearing probe step" — same-cluster (both concern what Step 0 actually probes; resolves independently).
- "Semver comparator for the peer-dep probe unspecified" — same-cluster (same Step 0 sub-step; resolves independently).
- "Probe contract detail in Prerequisites belongs in `pi-integration-contract.md`" — decision-dependency (if obligation 2's probe text moves out of `spec.md`, the kind-tagged rule lands only in `pi-integration-contract.md`; Option A's spec-edit sites collapse to one file).

---

---

# Capability 7 (Binder LLM model) is not factory-probable; the blanket "typeof === function" rule contradicts the per-capability contract

**Source:** docs/reviews/spec-review/spec-20260506-142846.md
**Original heading:** Obligation 3 — Capability-7 (Binder LLM model) is not a function; typeof check gives false-negative
**Kind:** completeness, prescription

## Finding

`spec.md` Host runtime obligation 3 says of the seven SDK capabilities: "the probe checks each capability by `typeof <member> === \"function\"` (no arity, no return-shape sniffing) …". Read literally, "each capability" includes capability 7, the binder LLM model. But that capability is not factory-probable on two counts: (a) it lives at `ctx.modelRegistry`, and `ctx` does not exist at extension-factory entry — only at slash-handler invocation; (b) `pi-integration-contract.md` SDK capability inventory item 7 explicitly defines its detection contract as a **load-time** check (the model is resolved per loom against `ctx.modelRegistry.find(provider, modelId)`, with the load-time-only diagnostic `loom/load/binder-model-unresolved` — a different code from the probe's `loom/load/host-incompatible`). The factory probe in `pi-integration-contract.md` step 0(c) silently ducks the contradiction by enumerating seven specific function names — `pi.registerCommand`, `pi.sendUserMessage`, `createAgentSession`, `pi.registerTool`, `pi.setActiveTools` / `pi.getActiveTools`, `pi.registerMessageRenderer`, `pi.sendMessage` — none of which is `ctx.modelRegistry`.

So the seven probe targets in step 0(c) and the seven inventory capabilities are not 1:1: capability 5 (cancellation propagation) is covered by step 0(b)'s AbortSignal probe, capability 7 is covered at load time per its own contract, and step 0(c)'s seven function names actually cover capabilities 1, 2, 3, 4, and 6. Calling them "the seven named SDK capabilities" inside step 0(c) sustains the same fiction that the spec.md sentence creates.

The H1 leaf inherits the confusion. `plan_topics/h1-scaffold.md` describes the `SDK_SURFACE_INVENTORY` constant as enumerating seven capabilities with item 7 being "the binder LLM model resolution path — `ctx.modelRegistry.find`", and asserts "each name in `SDK_SURFACE_INVENTORY` is present on the imported namespace". `ctx.modelRegistry.find` is not on the imported namespace at any time, so the H1 test as described cannot pass against item 7 without per-entry presence-check discrimination that the leaf does not currently specify.

## Spec Documents

- `spec.md` — Orientation → Prerequisites → Host runtime, obligation 3 (edited)
- `spec.md` — Orientation → Prerequisites → "Pi SDK and capabilities" (the bullet list cross-linking each capability) (edited)
- `spec_topics/pi-integration-contract.md` — Extension entry point, Step 0 (Capability probe), the "(c) checks each of the seven named SDK capabilities" sentence (edited)
- `spec_topics/pi-integration-contract.md` — SDK capability inventory item 7 "Binder LLM model" (read-only — already correctly scopes detection to load time)
- `spec_topics/binder.md` — Binder model / Bypass cases (read-only — owns the load-time detection contract for capability 7)
- `spec_topics/diagnostics.md` — `loom/load/host-incompatible` and `loom/load/binder-model-unresolved` distinction (read-only)

## Plan Impact

**Phases:** Horizontal, Vertical V16

**Leaves (implementation order):**

- H1 — Repository scaffold and test framework — (modified) — `SDK_SURFACE_INVENTORY` shape and the `pinned-surface.test.ts` literal-read test must distinguish per-entry presence-check kinds (factory-time function vs. AbortSignal member from obligation 2 vs. load-time `ctx.modelRegistry.find` resolution); the current "each name is present on the imported namespace" assertion can only hold for factory-probable members
- H4 — Pi extension shell — (modified) — owns the factory module that consumes `SDK_SURFACE_INVENTORY` and runs Step 0; the per-capability discrimination must be honoured here
- V16e — `bind_model` resolution chain — (read-only) — already implements the load-time detection for capability 7; cited so the spec edit makes clear that V16e, not the factory probe, owns capability 7's enforcement

## Consequence

**Severity:** correctness

A literal reader of `spec.md` obligation 3 will write a probe that calls `typeof ctx.modelRegistry === "function"` (or skips the check because `ctx` is undefined at factory time) and refuse to load on every conformant host, with `details.kind = "sdk-capability-missing"` — emitting the wrong diagnostic code (the binder-model failure surface is `loom/load/binder-model-unresolved`, not `loom/load/host-incompatible`) and breaking the bypass-eligible-loom carve-out, since bypass looms are supposed to load without a binder model. A reader who follows `pi-integration-contract.md` step 0(c) instead writes a passing probe but inherits the silent assumption that "seven probe targets" and "seven inventory capabilities" are coextensive, which they are not. Two implementers will diverge.

## Solution Space

**Shape:** single

### Recommendation

Rewrite `spec.md` Host runtime obligation 3 to stop claiming the probe handles every capability uniformly. Replace the current sentence with: the factory probe checks the **factory-probable** subset of capabilities — items 1, 2, 3, 4, and 6 — by `typeof <member> === "function"` against the named member list owned by `pi-integration-contract.md` step 0(c); capability 5 (cancellation propagation) is covered by the AbortSignal/AbortController shape probe in obligation 2; capability 7 (binder LLM model) is detected at **per-loom load time** against `ctx.modelRegistry.find(...)` and surfaces as `loom/load/binder-model-unresolved` per `binder.md`, not as `loom/load/host-incompatible`. Defer the canonical member list to `pi-integration-contract.md` step 0(c) so spec.md does not duplicate it.

In the same edit, update `pi-integration-contract.md` step 0(c) to stop calling its enumeration "the seven named SDK capabilities". The accurate phrasing is "the five capabilities probable at factory time (items 1, 2, 3, 4, 6 of [SDK capability inventory](#sdk-capability-inventory)), enumerated as the following seven function members …"; the count mismatch (five capabilities, seven members) is a real consequence of capabilities 4 and 6 each requiring two function members, and naming it explicitly prevents the next reader from re-introducing the same contradiction.

In the same edit, restructure the H1 `SDK_SURFACE_INVENTORY` constant in `plan_topics/h1-scaffold.md` to carry a per-entry presence-check kind discriminator (e.g. `{ kind: "namespace-function", path: "pi.registerCommand" }`, `{ kind: "abortsignal-member", path: "AbortSignal.any" }`, `{ kind: "load-time-resolution", path: "ctx.modelRegistry.find" }`) and rewrite the `pinned-surface.test.ts` Tests bullet so that each kind has a kind-appropriate assertion: namespace-function entries are checked against the imported namespace, abortsignal-member entries delegate to the obligation-2 probe surface, and load-time-resolution entries assert that V16e owns the check (e.g. by asserting the `loom/load/binder-model-unresolved` diagnostic code is registered against V16e's anchor in the diagnostic registry). This eliminates the H1 test description's current internal contradiction.

Edge cases the implementer must watch:
- The probe MUST continue to emit `details.kind = "sdk-capability-missing"` only for factory-probable misses; cap-7 misses MUST emit `loom/load/binder-model-unresolved` (with no `details.kind` discriminator) per V16e, and the two diagnostic surfaces MUST stay disjoint.
- The four-pinned-constants invariant in step 0 ("Node floor, `AbortSignal` member list, capability list, peer-dep range" — one source of truth) still holds; the "capability list" constant is the five-of-seven factory-probable subset, not all seven.
- The Pi version bump procedure step 2 ("re-run the H1 SDK surface-inventory test") still re-validates all seven capabilities, because the H1 test now spans all three presence-check kinds rather than only the namespace one.

## Related Findings

- "Obligation 2 — Typeof probe rule contradicts non-function members (`signal.aborted`, `signal.reason`)" — co-resolve (same blanket "typeof === function" rule, same edit splits per-member presence-check kinds for both obligations 2 and 3)
- "Probe contract detail in Prerequisites belongs in `pi-integration-contract.md`" — co-resolve (the recommended deferral of the member list to the contract page is the same edit)
- "Obligation 3 cross-references 'Pi SDK and capabilities' by rendered bold text, not anchor" — same-cluster (touches the same obligation-3 paragraph; resolves independently with an anchor)
- "Sub-packages (`pi-agent-core`, `pi-ai`, `pi-tui`) MUST requirement has no load-bearing probe step" — same-cluster (probe coverage gap; resolves independently)
- "Semver comparator for the peer-dep probe unspecified" — same-cluster (Step 0 specifics)
- "Probe self-failure (probe throws) has no error contract" — same-cluster (Step 0 error model)
- "Probe ordering / aggregation across simultaneous failures unspecified" — same-cluster (Step 0 error model)
- "Per-call `pi.register*` failure on the probe-success path unspecified" — same-cluster (post-probe failure model)
- "Pi Binder LLM model — billing, credentials, and model identity unresolved in `spec.md`" — same-cluster (capability 7 surface; resolves independently)
- "Prerequisites probe block has six MUST obligations with no IDs" — same-cluster (probe surface organisation)

---

---

## spec.md — Orientation → Scope

---

# V1.x source-language stability promise has no executable conformance contract

**Source:** docs/reviews/spec-review/spec-20260506-142846.md
**Original heading:** Source-language stability guarantee has no violation contract or regression gate
**Kind:** error-model, testability

## Finding

The Orientation → Scope bullet in `spec.md` promises that "a `.loom` or `.warp` file that loads cleanly under V1.0 is guaranteed to load and behave identically under every V1.x release." The bullet then attributes that guarantee entirely to `GOV-8`'s REQ-ID lifecycle discipline — a process rule about how ID anchors retire and re-issue, not a behavioural invariant. Nothing in the spec corpus or the plan turns the promise into an observable gate:

- The two operative phrases — *loads cleanly* and *behaves identically* — are not defined. A reader cannot tell whether "behaviour" includes diagnostic codes, diagnostic message strings, runtime-event payload shapes, the order in which a multi-error batch is sorted, or the textual rendering of system notes.
- No fixture set is named. There is no V1.0 conformance suite committed under `test/`, no leaf in `plan_topics/` that owns one, and no V18 gate that runs it. `plan_topics/v18-cancellation.md` (V18s) covers REQ-ID and diagnostic-registry hygiene but explicitly does not run any `.loom`/`.warp` programs.
- `GOV-8` itself acknowledges its own limit: *"no V18s gate detects substantive in-place edits, and none is planned, because semantic equivalence between two prose paragraphs is not mechanically decidable."* The discipline therefore guarantees ID hygiene only — a renamed or split ID can still cover a behaviour-changing edit, and nothing else catches it.

The result is a normative-sounding promise (`is guaranteed`) backed by neither a definition nor a test. Two compliant V1.x implementations could disagree on whether a diagnostic-code rename, a sort-order change in `loom-system-note` batches, or a `${expr}` interpolation tweak counts as a stability violation, with neither violating any written rule.

## Spec Documents

- `spec.md` — Orientation → Scope → Source-language stability bullet (edited)
- `spec_topics/governance.md` — `GOV-8 (REQ-ID lifecycle)` and surrounding lifecycle rules (option-dependent; only edited if a new GOV rule lands here)
- `spec_topics/future-considerations.md` — *No formal source-language migration mechanism …* bullet (read-only; cross-link target)
- `spec_topics/diagnostics.md` — code registry (read-only; the suite must reference it to define equivalence on diagnostic output)
- `spec_topics/runtime-value-model.md` — value/equality semantics (read-only; the suite needs this to define "behaves identically" for return values)
- `plan_topics/v18-cancellation.md` — V18s closing gate (option-dependent; new sibling leaf may live here or co-located)
- `plan_topics/coverage-matrix.md` — REQ-ID-to-leaf table (edited; new GOV-N or equivalent obligation needs a closing leaf)

## Plan Impact

**Phases:** Vertical V18

**Leaves (implementation order):**

- V18s — Coverage-matrix closing CI gate — (modified — the new stability gate either becomes a sibling leaf in V18 or is added as an additional check under V18s)

A new V18 leaf (suggested working name `V18t — V1.0 conformance fixture suite`) is required if the recommendation below is adopted; it does not yet exist in the plan and would need to be added.

## Consequence

**Severity:** correctness

A normative promise that no test enforces is not a guarantee — it is an aspiration. Two V1.x implementers (or a V1.0 → V1.1 release of this implementation) could legitimately interpret "behaves identically" differently for diagnostic codes, message strings, multi-error sort order, or system-note rendering. A user who pins to V1.0 behaviour has no recourse: there is no fixture they can point to, no CI line that would have caught the regression, and no spec text that says the regression was a violation.

## Solution Space

**Shape:** multiple

### Option A — Define a fixture-anchored regression gate

**Approach.** Promote the stability promise from prose to a checked invariant. Spec edit to the `Source-language stability` bullet defines two terms operationally:

- *Loads cleanly* — the loom emits zero diagnostics of phase `parse` or `load` (severity `E` or `W`) on the file.
- *Behaves identically* — for a fixture invoked via the registered slash command with a recorded argument record, the loom produces (a) the same final return value (under deep equality on the runtime value model), (b) the same ordered list of `loom-system-note` event `code` values, and (c) the same diagnostic batch (codes only, in `(file, line, col)` order).

A new GOV rule (or sub-bullet under `GOV-8`) in `governance.md` makes the suite a release obligation: each V1.x release MUST run the V1.0 conformance fixture suite and pass every fixture; the suite is append-only across V1.x (a fixture committed under V1.x is part of the suite for V1.(x+1)+).

A new V18 plan leaf (`V18t — V1.0 conformance fixture suite`) owns:

- The fixture-tree shape under `test/fixtures/conformance/v1.0/`, one subdirectory per fixture containing `loom.loom` (or `warp.warp` + driver), `args.json`, `expected.json` (return value, sorted system-note code list, sorted diagnostic code list).
- The runner that invokes each fixture through the harness from H5 and asserts the three equivalence relations above.
- A seed set sized to cover one fixture per closed REQ-ID prefix at the moment V18t lands (the size grows as V1.x adds fixtures; it does not need to cover every REQ-ID at the V1.0 cut).
- `Ships when` — the runner is wired to `npm run check:conformance` and to CI; the seed fixtures pass; a synthetic spec edit that flips a diagnostic code on any seeded fixture flips the gate to non-zero.

**Spec edits.** `spec.md` Source-language stability bullet rewritten to define the two terms and forward-link the new GOV rule and V18t. `governance.md` gains a new GOV-N rule (or extends GOV-8 with a stability sub-rule) naming the suite and the release obligation. `future-considerations.md` cross-link refreshed.

**Pros.** Promise becomes a CI line. Diagnostic-code, runtime-event, and return-value scopes are all explicitly in or out of scope (the equivalence definition pins it). Implementers and downstream users can both point at the same artefact. Co-resolves the three sibling findings under "Source-language stability".

**Cons.** Adds a plan leaf and a release-time obligation. Author-facing message strings are deliberately *not* part of the equivalence relation under this option (only codes are) — this is a substantive trade-off and must be called out in the bullet. Fixture-suite maintenance is non-trivial: every new `.loom` syntax surface needs a representative fixture or it does not gain stability protection.

**Risks.** The fixture suite is only as good as its coverage. A diagnostic code never exercised by any seed fixture is not protected by the gate; the V18s diagnostic-code-coverage gate already requires every registry code to be asserted by *some* test, but those are unit tests, not stability fixtures. The two coverage axes are independent.

### Option B — Weaken the wording to "best-effort under GOV-8"

**Approach.** Drop "is guaranteed to" from the spec bullet. Rewrite as "We follow `GOV-8` REQ-ID lifecycle discipline, which is intended to make V1.x source-compatible with V1.0; we do not run a mechanical conformance suite, and a V1.x release that breaks a V1.0 fixture is a bug to be fixed in V1.(x+1), not a violation of a written contract." Add a forward-link to `future-considerations.md` for the deferred conformance-suite work.

**Spec edits.** `spec.md` Source-language stability bullet rewritten as above. `future-considerations.md` gains a new bullet for the deferred conformance suite. `governance.md` unchanged.

**Pros.** Honest about what is actually shipped. Zero plan churn; no new V18 leaf. Co-resolves the GOV-8-discipline-insufficient sibling finding (the wording no longer claims the discipline is sufficient).

**Cons.** Downstream users have no version-pinning recourse beyond "file a bug." Loses the marketing/engineering value of a stability guarantee. Does not co-resolve the diagnostic-code-coverage sibling finding (the question of whether codes are part of "behaviour" simply disappears, replaced by "we don't promise anything").

**Risks.** The promise is the kind of thing that gets cited in slide decks once and then quietly violated. Weakening it now is cleaner than discovering the violation at V1.3.

### Option C — Bound the guarantee to load-time only

**Approach.** Narrow "behaves identically" to "loads cleanly," dropping the runtime-equivalence claim. Define *loads cleanly* exactly as in Option A. Runtime equivalence is explicitly out of scope across V1.x and is deferred to the major-version migration mechanism. Fixture suite still owned by a V18 leaf, but its assertions are limited to (a) zero parse/load diagnostics and (b) successful slash registration — no execution, no return-value comparison.

**Spec edits.** `spec.md` Source-language stability bullet rewritten with the narrowed definition and a sentence stating runtime behaviour is not part of V1.x stability. `governance.md` gains the same GOV-N rule as Option A but pointing at the narrower suite. `future-considerations.md` gains a bullet for the deferred runtime-equivalence promise.

**Pros.** Cheaper to maintain than Option A's full runtime fixtures (no `args.json`, no `expected.json`). Still co-resolves the substantive-boundary and diagnostic-code-coverage siblings (load-phase diagnostics are explicitly in scope; runtime ones are explicitly out). Provides a real CI gate without committing to behaviour equivalence the spec cannot easily define.

**Cons.** A V1.x release that changes the runtime semantics of an accepted V1.0 program does not violate the (narrowed) guarantee. This is likely the most surprising failure mode for downstream users — "my program parses fine but produces a different answer under V1.1" — so the narrowing must be very explicitly stated in the bullet.

**Risks.** The narrowing is easy to miss when reading the spec. Users will infer "stability" means runtime stability unless the bullet is emphatic.

### Recommendation

Adopt **Option A**. The Source-language stability bullet is the cross-cutting V1 disposition that downstream users and the project's own future authors will read as a behavioural promise; the right shape is to make the promise checkable rather than to weaken it (Option B) or partially withdraw it (Option C). The fixture-suite maintenance cost is real but bounded — the suite grows incrementally and only at release time — and the V18s gate already establishes the precedent for closing the spec corpus with a CI check.

Edge cases the implementer must pin:

- *Equivalence on diagnostic batches uses codes only, not messages.* Message strings are author-facing prose owned by the diagnostics registry; treating them as stability-protected would block every editorial fix to a message column. The bullet must say this explicitly.
- *Sort order is part of equivalence.* Multi-error batches are sorted by `(file, line, col)` per V18j; the suite asserts the sorted list, not a set, so a sort-order regression flips the gate.
- *Runtime-event payload shape is in scope; payload `details` field values are not.* Two V1.x runs may legitimately differ on `details.duration_ms` or other timing-derived fields; the suite compares the sequence of event `code` values, not the full payload.
- *The seed fixture set need not cover every REQ-ID at V18t commit.* It only needs to cover the REQ-IDs the gate is intended to protect; coverage grows monotonically as later V1.x releases add fixtures. The V18s coverage-matrix gate is independent and continues to handle REQ-ID closure.
- *`.warp` import graphs are part of fixtures.* A fixture may be a directory containing one `.loom` and any number of imported `.warp` files; the runner discovers them via the same import resolution as production.

## Related Findings

- "Source-language stability — \"Substantive\" grammar/semantics boundary undefined" — same-cluster (the boundary question becomes moot under Option A — equivalence is defined operationally, not by inspecting the prose edit)
- "Source-language stability — GOV-8 discipline insufficient to guarantee behaviour equivalence" — co-resolve (Options A and B both fix the discipline-vs-promise mismatch in a single edit)
- "Source-language stability — Coverage of diagnostic codes not defined" — co-resolve (Option A's equivalence definition explicitly answers the diagnostic-code scope question; Option C does too; Option B sidesteps it)

---

---

# Source-language stability — GOV-8 cannot, by itself, deliver the V1.x equivalence promise

**Source:** docs/reviews/spec-review/spec-20260506-142846.md
**Original heading:** Source-language stability — GOV-8 discipline insufficient to guarantee behaviour equivalence
**Kind:** assumptions

## Finding

`spec.md` Orientation → Scope makes a strong promise — "A `.loom` or `.warp` file that loads cleanly under V1.0 is guaranteed to load and behave identically under every V1.x release" — and then derives that promise from `GOV-8`: "Substantive grammar or semantics changes follow the REQ-ID lifecycle in `GOV-8` (split / merge / deletion-plus-add, never in-place rewording), so the user-facing observable — V1.x stability — is what `GOV-8`'s change discipline produces."

`GOV-8` does no such thing. Read against `spec_topics/governance.md`, `GOV-8` is a *bookkeeping* rule: it dictates *how* a substantive edit is recorded (retire the old `PREFIX-N`, append a fresh ID at the page tail), not *whether* the edit may ship in a V1.x release. A V1.1 release that retires `LEX-7` ("identifiers SHOULD start with a lowercase letter") and appends a fresh `LEX-42` ("identifiers MUST start with `_`") is fully `GOV-8`-conformant and trivially breaks every V1.0 file. The "Pure rewording" sub-bullet draws a *substantive vs cosmetic* boundary so that semantics changes cannot be smuggled under a typo-fix cover; it does not draw a *V1.0-compatible vs V1.x-breaking* boundary, and the V18s gates that mechanise `GOV-8` (`Reused-ID`, `Dense-numbering`) check ID hygiene only.

The two ideas are orthogonal. Stability needs an equivalence test against frozen V1.0 inputs; `GOV-8` needs disjoint live and retired ID sets. Conflating them in the introduction leaves implementers with no mechanism for the V1.x promise and a false belief that REQ-ID hygiene already supplies one.

## Spec Documents

- `spec.md` — Orientation → Scope, *Source-language stability* bullet (edited)
- `spec_topics/governance.md` — `GOV-8` (read-only; the rule is correctly scoped, the spec.md bullet misuses it)
- `plan_topics/v18-cancellation.md` — V18s gate list (option-dependent; gains a ninth gate under Option A)
- `spec_topics/diagnostics.md` — Code registry (option-dependent; equivalence scope must say whether diagnostic codes are part of "behaves identically")
- `plan_topics/coverage-matrix.md` — Governance row (option-dependent; gains a closing-leaf entry if a new V18 gate lands)

## Plan Impact

**Phases:** Vertical V18 (option-dependent)

**Leaves (implementation order):**

- V18s — coverage-matrix closing CI gate — (modified, option-dependent: under Option A V18s grows a ninth `gov-9` gate that diffs a frozen V1.0 fixture suite; under Option B no leaf change)

## Consequence

**Severity:** correctness

Two reasonable implementers reading the current bullet diverge: one trusts the promise and ships no equivalence harness because "`GOV-8` produces it"; another reads `GOV-8` carefully, sees that it does not, and either invents a private fixture set or quietly downgrades the V1.x promise. Neither path produces the stated guarantee. Worse, the wording invites a future PR author to ship a behaviour-changing V1.x edit under `GOV-8`'s split/merge ceremony and believe the stability bullet is satisfied.

## Solution Space

**Shape:** multiple

### Option A — Keep the strong promise, back it with a mechanism

**Approach.** Decouple the stability promise from `GOV-8` in the spec.md bullet. State that V1.x stability is enforced by a frozen V1.0 fixture suite re-run on every release, and add the gate as a ninth V18s sub-gate. `GOV-8` continues to govern only REQ-ID hygiene.

**Spec edits.**
- Rewrite the second sentence of the *Source-language stability* bullet to: "V1.x stability is enforced by the frozen V1.0 fixture suite owned by [V18s `gov-9`](./plan_topics/v18-cancellation.md). `GOV-8`'s REQ-ID hygiene is independent: it governs how substantive edits are recorded, not whether they preserve V1.0 behaviour." Drop the "so the user-facing observable … is what `GOV-8`'s change discipline produces" clause entirely.
- Add a new `gov-9` gate under `plan_topics/v18-cancellation.md` V18s listing: enumerate `test/fixtures/v1-stability/**/*.{loom,warp}`; for each fixture, assert (a) zero `loom/parse/*` and zero `loom/load/*` errors, (b) the post-execution top-level return value matches a checked-in JSON snapshot, and (c) the multiset of diagnostic `code` strings emitted on `loom-system-note` matches a checked-in code-list snapshot. Snapshots are immutable post-V1.0 cut; updating one is a major-version-bump action.
- Append a coverage-matrix row mapping the spec.md bullet (as a referenced narrative anchor) to V18s.

**Pros.** Stability becomes observable, regressions are caught in CI on every PR, the existing user-facing promise stands, and `GOV-8`'s scope is crisp again.

**Cons.** Requires committing to a concrete equivalence definition before V1.0 cut (the "is diagnostic-code list in scope?" question this finding's `Coverage of diagnostic codes` sibling raises). Adds a non-trivial fixture-curation task to V18 closing.

**Risks.** If the fixture set is too small at V1.0 cut, the gate gives false confidence; if too large, fixture maintenance crowds out work. Mitigate by requiring at least one fixture per non-narrative spec page introduced before V1.0 cut, and per top-level diagnostic code in `spec_topics/diagnostics.md`.

### Option B — Weaken the promise to match the available mechanism

**Approach.** Acknowledge in the bullet that `GOV-8` is a discipline, not a guarantee, and downgrade the user-facing claim from "guaranteed" to "intended."

**Spec edits.**
- Rewrite the bullet to: "We follow `GOV-8`'s REQ-ID lifecycle (split / merge / deletion-plus-add) so substantive grammar or semantics changes are visible at review. V1.x releases are *intended* to remain compatible with V1.0 source files but no automated regression gate enforces this in V1." Cross-link `governance.md#gov-8`. Move the strong "is guaranteed to load and behave identically" wording to `spec_topics/future-considerations.md` as a post-V1 goal.

**Pros.** Truthful with no plan-side investment. `GOV-8`'s scope is crisp.

**Cons.** Silently retracts a stated user contract. Operators making `.loom` libraries with multi-quarter lifetimes lose a pillar they may already be relying on. Tooling consumers (the binder, slash-invocation, schema cache hashes) lose a stability anchor.

**Risks.** Stakeholders who read the original promise into a planning document will need to be re-aligned. The `### Source-language stability guarantee has no violation contract or regression gate` finding becomes a `wontfix` rather than a co-resolved item, which may surface as future review rework.

### Recommendation

Take Option A. The promise is already stated in user-facing prose and is load-bearing for any `.warp` library that ships across more than one V1.x release; retracting it is more disruptive than building the gate. Implementer must lock the equivalence scope in the same edit (return value plus emitted diagnostic-code list — the two observable surfaces a `.loom` exposes per `spec_topics/diagnostics.md` and `spec_topics/return.md`), and must pin the fixture corpus directory and snapshot format under `plan_topics/v18-cancellation.md` so the gate's failure surface follows the existing eight-gate contract (single-line `<source>:<context>: gov-9: <fixture> <reason>`). The V1.0 cut is the only opportunity to freeze the snapshot baseline; landing the gate later means re-deriving "what V1.0 did" from notes.

## Related Findings

- "Source-language stability guarantee has no violation contract or regression gate" — co-resolve (Option A is the same fixture-suite mechanism that finding proposes; both bullets must be edited together)
- "Source-language stability — Coverage of diagnostic codes not defined" — decision-dependency (the equivalence scope this finding's Option A pins answers that finding directly)
- "Source-language stability — 'Substantive' grammar/semantics boundary undefined" — same-cluster (touches the same bullet but resolves independently — that finding clarifies `GOV-8`'s `Pure rewording` boundary, this one severs the bullet's misattribution to `GOV-8`)

---

---

## spec.md — Traceability / identifiers

---

# Scope subsection bullets carry no stable IDs

**Source:** docs/reviews/spec-review/spec-20260506-142846.md
**Original heading:** Four scope bullets carry no stable IDs
**Kind:** traceability

## Finding

The four bullets in `spec.md` → Orientation → Scope (Trust boundary, Source-language stability, Runtime observability, Hard runtime ceilings) are introduced by bold inline labels with no REQ-ID or HTML anchor. Plan leaves, tests, and downstream pages can only cite them by paraphrase of the bold label. `spec.md` itself is excluded from H6's per-page anchor loop by explicit decision (see [`plan_topics/h6-req-ids.md`](../../../plan_topics/h6-req-ids.md): "`spec.md` itself is not in the per-page anchor loop and receives no `GOV-N` markers from this step"), and `spec.md` carries no row in [`governance.md`'s REQ-ID prefix table](../../../spec_topics/governance.md), so the bullets fall outside the GOV-1 / GOV-2 / V18s coverage regime entirely.

The intro paragraph above the bullets frames them as "informative orientation: each one forward-links the topic page that owns the normative contract", but at least one bullet — Hard runtime ceilings — actually carries a load-bearing obligation owned only here: *"If a future V1 leaf introduces a new ceiling, this bullet and the new ceiling MUST move in the same edit."* That MUST self-references "this bullet" (no ID to point at), is not duplicated on any topic page, and is not closed by any leaf in the coverage matrix. The Trust-boundary, Source-language stability, and Runtime-observability bullets contain weaker but still asserted V1 dispositions ("V1 imposes no loom-level sandbox", "guaranteed to load and behave identically under every V1.x release", "always-log set defined in [Pi Integration Contract — Runtime event channel]") whose precise wording is what `future-considerations.md` already cross-links by section anchor.

The result is that the only normative obligations `spec.md` owns directly are addressable only by paraphrase of bold-label headings — exactly the failure mode GOV-1 was created to prevent on every other page.

## Spec Documents

- `spec.md` — Orientation → Scope (edited)
- `spec_topics/governance.md` — REQ-ID prefix table; GOV-7 *Narrative-to-normative promotion* (edited under Option A; read-only under Option B)
- `spec_topics/future-considerations.md` — "Known V1 limitations" cross-links to the trust-boundary and source-language-stability bullets (edited — anchor target retargeted)
- `spec_topics/pi-integration-contract.md` — owns the runtime-event channel and the four ceilings' downstream contracts (read-only; option-dependent if the migration MUST relocates here under Option B)

## Plan Impact

**Phases:** Horizontal

**Leaves (implementation order):**

- H6 — REQ-ID anchor insertion and coverage-matrix re-pivot — (modified) — currently asserts a negative gate on `spec.md`'s introduction; under Option A the leaf must add `spec.md` to the per-page anchor loop and the negative gate must be reframed; under Option B the leaf is unchanged but the GOV-7 *Narrative-to-normative promotion* row needed for Option A is dropped.
- V18s — coverage-matrix closing CI gate — (modified) — coverage-matrix.md gains rows for any new SCOPE-N IDs (Option A) or remains unchanged (Option B). The completeness gate's SOT for `spec.md` must be explicit either way.

## Consequence

**Severity:** correctness

The hard-ceilings migration MUST cannot be cited by any closing-leaf row, cannot be referenced from a `// allow:` ESLint comment under the H1 sequential-by-default convention, and cannot be enforced by V18s. Two implementers introducing a new V1 ceiling could legitimately disagree about whether they have to update the spec aggregator, because no stable ID is on the obligation. The same applies in weaker form to the runtime-observability "always-log set" claim and the source-language-stability V1.x guarantee.

## Solution Space

**Shape:** multiple

### Option A — Promote `spec.md` to a normative page with prefix `SCOPE`

**Approach.** Apply GOV-7 *Narrative-to-normative promotion* to `spec.md`: append a row `| spec.md | SCOPE |` to the GOV-1 prefix table. Insert `**SCOPE-N.**` markers on the four Scope bullets and on the load-bearing MUSTs in the Pi-SDK paragraph and Host-runtime preamble (these are the same surface the related Prerequisites finding flags). Replace "this bullet" in the hard-ceilings migration MUST with a concrete `SCOPE-N` reference. Append a `## Retired REQ-IDs` skeleton to `spec.md`.

**Spec edits.**

- `spec.md`: insert `**SCOPE-N.**` anchors at the four Scope bullets and at any other normative obligation in Orientation; add `## Retired REQ-IDs` skeleton.
- `spec_topics/governance.md`: append `| spec.md | SCOPE |` to the prefix table.
- `spec_topics/future-considerations.md`: retarget the two `spec.md#scope` cross-links at the SCOPE-N anchors instead of the section anchor.
- `plan_topics/h6-req-ids.md`: remove the explicit `spec.md`-exclusion sentence and add `spec.md` to the per-page anchor loop; preserve the introduction's negative gate (zero non-prefix anchors pointing at non-narrative pages) but rewrite it so it does not assert `spec.md` itself is narrative.
- `plan_topics/coverage-matrix.md`: add one row per SCOPE-N keyed to its closing leaf (the hard-ceilings migration MUST closes at V18s as a structural gate; the trust-boundary, source-language-stability, and runtime-observability bullets close at the topic-page leaves they forward-link to).

**Pros.**

- Uses the spec corpus's existing single mechanism uniformly; no second anchor scheme.
- Co-resolves with "Hard-ceilings bullet bundles four independently testable items under one identifier" (split into SCOPE-N atomic IDs in the same edit) and with "Prerequisites probe block has six MUST obligations with no IDs" (those MUSTs get SCOPE-N anchors too).
- Makes V18s's SDK-capability and ceilings closure mechanically checkable.

**Cons.**

- Requires editing H6 to remove its load-bearing exclusion sentence; H6's existing tests assume `spec.md` is narrative.
- Increases spec.md's surface area as an obligation owner (which contradicts the soft convention that `spec.md` is an index).

**Risks.** H6 currently asserts `spec.md` introduction has zero `./spec_topics/<page>.md#<non-prefix-anchor>` links; that gate must be preserved (the rewrite is local to the spec.md exclusion sentence, not the gate's intent).

### Option B — Keep `spec.md` narrative; relocate the only load-bearing obligation

**Approach.** Move the hard-ceilings migration MUST out of `spec.md` into `governance.md` as a new GOV-N (or into a new ceilings-aggregator section in an existing topic page). Reword the four Scope bullets so each is purely a forward-link to its owning topic page with no normative force. Add navigational HTML anchors (`<a id="scope-trust-boundary"></a>` etc.) on the four bullets so cross-document links from `future-considerations.md` and review tooling resolve deterministically — these anchors are NOT REQ-IDs and live outside GOV-1's permitted-alternate-contexts list (an explicit GOV-1 carve-out for `spec.md` navigational anchors is needed, or the carve-out is encoded by `spec.md` simply not being in the prefix table).

**Spec edits.**

- `spec.md`: rewrite the four Scope bullets to remove all "MUST" / "guaranteed" / "complete set" language; insert HTML anchors at each bullet head.
- `spec_topics/governance.md`: append a new `GOV-N` for "ceiling enumeration co-edit obligation" (or relocate to `pi-integration-contract.md` as a `PIC-N`).
- `spec_topics/future-considerations.md`: retarget cross-links to the new HTML anchors.

**Pros.**

- Preserves the H6 invariant that `spec.md` carries no REQ-IDs.
- Cleaner separation: `spec.md` becomes pure orientation; obligations live where they are owned.

**Cons.**

- Two anchor mechanisms in the corpus (REQ-ID anchors elsewhere, plain HTML anchors in `spec.md`) — review tooling needs to know about both.
- The GOV-1 "permitted alternate contexts" closed list does not list `spec.md` Scope bullets; either GOV-1 grows a fourth context or `spec.md`'s carve-out is left implicit (fragile).
- Does not co-resolve with the Prerequisites-probe finding — those MUSTs remain unanchored, requiring a parallel relocation.

**Risks.** Drift between the relocated migration MUST and its narrative summary in `spec.md` (the orientation bullet would still summarise the rule, but the binding text lives elsewhere).

### Recommendation

**Option A.** The corpus already commits to one anchor mechanism (GOV-1 inline `**PREFIX-N.**`); promoting `spec.md` to a normative page with prefix `SCOPE` is the existing GOV-7 procedure for exactly this situation. Option A also discharges two related findings in the same edit (the hard-ceilings split and the Prerequisites-probe MUST identifiers), which Option B cannot. Implementer notes: (i) edit `H6`'s tests in lockstep — the exclusion sentence and the introduction's negative gate must be reworked together; (ii) the hard-ceilings bullet is split into four SCOPE-N atomic IDs concurrent with this finding's resolution, not after; (iii) the migration MUST's "this bullet" pointer is replaced with the concrete SCOPE-N for the ceilings list aggregator (not the four atomic ceilings), since the MUST is about updating the aggregator when a fifth ceiling appears.

## Related Findings

- "Hard-ceilings bullet bundles four independently testable items under one identifier" — co-resolve (the SCOPE-N split under Option A is the same edit; under Option B both findings stand)
- "Prerequisites probe block has six MUST obligations with no IDs" — co-resolve (Option A's promotion of `spec.md` covers these MUSTs in the same edit)
- "Obligation 2 bundles four independently testable sub-requirements under one ordinal" — same-cluster (same surface — Host-runtime obligations — but resolves as a sub-ordinal split rather than a new ID scheme)
- "\"Pi SDK and capabilities\" block has no navigable anchor; cross-references by bold text" — decision-dependency (Option A makes the bold sub-block headings carry SCOPE-N anchors directly; Option B requires a separate HTML-anchor decision)
- "Obligation 3 cross-references \"Pi SDK and capabilities\" by rendered bold text, not anchor" — same-cluster (resolves the moment the SDK-capabilities block has a stable anchor)
- "\"Step 0\" cross-reference to `pi-integration-contract.md` is not an anchor; inconsistently named" — same-cluster (analogous traceability gap on the PIC side, resolves independently)

---

---

# Host runtime obligation 2 bundles a normative member list with a duplicated probe contract under one ordinal

**Source:** docs/reviews/spec-review/spec-20260506-142846.md
**Original heading:** Obligation 2 bundles four independently testable sub-requirements under one ordinal
**Kind:** traceability

## Finding

`spec.md` § Orientation → Prerequisites → Host runtime obligation 2 (`Pi-supplied AbortSignal / AbortController shape`) is a single bullet that carries two distinct kinds of statement under one ordinal:

1. The **load-bearing surface declaration**: "the WHATWG `AbortSignal` and `AbortController` constructors plus the following named members: `signal.aborted`, `signal.reason`, `signal.throwIfAborted()`, `signal.addEventListener("abort", …)`, `AbortSignal.any([…])`, `AbortSignal.timeout(ms)`, `AbortController.prototype.abort(reason?)`." This is the unique normative content of obligation 2 — no other spec page enumerates the member set.
2. The **`Violation is observable`** sentence — the probe checks (`typeof AbortController === "function"`, the `typeof <member> === "function"` enumeration), the registration-refusal rule, and the `details.kind = "abortsignal-shape"` discriminator. Each of those three is *already* normatively owned by `spec_topics/pi-integration-contract.md` § Extension entry point — Step 0 (Capability probe), which spells out the probe shape, the refusal rule, and the same `kind` discriminator.

The bundling has two concrete consequences. First, "Host runtime obligation 2" is the only ordinal a plan leaf or test can cite (the spec preamble explicitly invites that citation: *"plan leaves and reviews MAY cite Host runtime obligation N"*) yet a probe that correctly refuses registration on a missing `AbortSignal.timeout` while emitting `details.kind = "node-floor"` only partially fails the obligation — and there is no sub-ordinal to name the failed half. Second, the probe contract is now stated in two places: spec.md obligation 2's tail and pi-integration-contract.md Step 0 share the same `details.kind = "abortsignal-shape"` literal, the same refusal rule, and the same `typeof` check. A future edit to one site can drift from the other silently.

The same shape — a normative claim co-mingled with a re-statement of the probe contract — also affects obligation 1 (Node floor; duplicates `details.kind = "node-floor"` and the refusal rule) and obligation 3 (named-capability surface; duplicates `details.kind ∈ { "sdk-capability-missing", "peer-dep-out-of-range" }`). Obligation 2 is the most acute instance because its unique payload (the seven-member `AbortSignal` / `AbortController` enumeration) is the densest.

## Spec Documents

- `spec.md` — Orientation → Prerequisites → Host runtime, obligation 2 (edited)
- `spec.md` — Orientation → Prerequisites → Host runtime, obligations 1 and 3 (option-dependent — same bundling pattern; see Solution Space)
- `spec_topics/pi-integration-contract.md` — Extension entry point — Step 0 (Capability probe) (read-only — already owns the probe contract; cross-reference target)
- `spec_topics/diagnostics.md` — `loom/load/*` (read-only — owns the diagnostic emission contract)

## Plan Impact

**Phases:** Horizontal

**Leaves (implementation order):**

- H1 — Repository scaffold and test framework — (modified) — the SDK surface-inventory literal-read test description in `plan_topics/h1-scaffold.md` cites "Host runtime obligation 2" by ordinal when describing the `AbortSignal`/`AbortController` member set; the citation needs to point at whatever stable anchor the fix produces.
- H4 — Pi extension shell — (modified) — H4 owns `extensions/index.ts`, the file the Pi Integration Contract assigns Step 0 to. A future leaf adding the capability-probe tests (currently neither H1 nor H4 has tests for `details.kind = "abortsignal-shape"` emission, registration-refusal under a missing `AbortSignal.any`, etc.) needs addressable IDs to bind each test to one obligation; without them, a single failing assertion cannot name what surface it covers.

## Consequence

**Severity:** correctness

A plan leaf or review that cites "Host runtime obligation 2" today is ambiguous about whether the cited rule is the member-list surface, the probe's `typeof` check shape, the refusal rule, or the `details.kind` discriminator. Two implementers reading the same citation can produce divergent test coverage — one asserts the member surface against `process` globals, another asserts the probe's emitted diagnostic shape, and neither covers the other half. The duplicated probe-contract prose between spec.md and pi-integration-contract.md additionally creates a drift hazard: a Pi version-bump procedure that updates `details.kind` literals in pi-integration-contract.md is not forced to update the parallel mention in spec.md obligation 2.

## Solution Space

**Shape:** multiple

### Option A — Trim obligation 2 to the member-surface declaration; delete the duplicated probe-contract sentence

**Approach.** Rewrite obligation 2 so its body is only the WHATWG-constructor-plus-named-member enumeration. Replace the `Violation is observable: …` sentence with a single forward-link: *"Detection, registration refusal, and the `details.kind = "abortsignal-shape"` discriminator are owned by [Pi Integration Contract — Extension entry point — Step 0 (Capability probe)](./spec_topics/pi-integration-contract.md#entry-capability-probe)."* Apply the same trimming to obligations 1 and 3 (their `Violation is observable: …` sentences likewise duplicate `details.kind` literals owned by Step 0). Add the `<a id="entry-capability-probe"></a>` anchor on pi-integration-contract.md Step 0 if not already present (the related finding *"`Step 0` cross-reference to `pi-integration-contract.md` is not an anchor; inconsistently named"* is co-resolved by this same anchor add).

**Spec edits.**
- `spec.md`: rewrite obligation 2 (and parallel-trim obligations 1 and 3) per above.
- `spec_topics/pi-integration-contract.md`: add `<a id="entry-capability-probe"></a>` immediately above the `**Step 0 — Capability probe …**` line.

**Pros.**
- Eliminates duplication root cause; `details.kind` literals now have one normative source.
- Obligation 2's single remaining claim (the member list) maps unambiguously to a single test (the H1 SDK surface-inventory test, which already covers the constructor-plus-member enumeration).
- The Pi version-bump procedure already pivots on pi-integration-contract.md as the source of truth for probe constants — Option A aligns spec.md with that pivot.

**Cons.**
- Loses the convenience of reading obligation 2 as a self-contained "what / how-detected / what-emitted" unit. Readers who land on obligation 2 must follow the forward-link to learn the failure shape.
- The preamble sentence *"obligations 1–3 (preconditions enforced by the host or by call-site failure)"* loses some of its in-place evidence; it now relies on the forward-linked Step 0 to back the "enforced" claim.

**Risks.**
- The forward-link must point at a stable anchor on pi-integration-contract.md; without the anchor add, the trimming creates a brittle paraphrase reference (the related finding called out by *"`Step 0` cross-reference to `pi-integration-contract.md` is not an anchor"*). Both edits must land in the same commit.

### Option B — Split obligation 2 into addressable sub-IDs (`OBL-2a` member list, `OBL-2b` detection, `OBL-2c` refusal, `OBL-2d` diagnostic-kind)

**Approach.** Restructure obligation 2 as a parent header plus four numbered sub-bullets, each with an explicit ID anchor. Mirror the same split for obligations 1 and 3. Update H1's surface-inventory test description to cite `OBL-2a`. Update pi-integration-contract.md's Step 0 cross-reference to spec.md to point at the parent ID (or at the four sub-IDs jointly).

**Spec edits.**
- `spec.md`: restructure obligation 2 (and 1 and 3) into parent + 4 sub-bullets with `<a id="obl-2a"></a>` … `<a id="obl-2d"></a>` anchors. Update the preamble sentence *"plan leaves and reviews MAY cite Host runtime obligation N"* to *"…obligation N or sub-ID OBL-Na/OBL-Nb/OBL-Nc/OBL-Nd"*.
- `spec_topics/pi-integration-contract.md`: update Step 0's reference to spec.md obligation 2 to cite the four sub-IDs.
- `plan_topics/h1-scaffold.md`: update the SDK surface-inventory test's citation from *"Host runtime obligation 2"* to *"`OBL-2a`"*.

**Pros.**
- Each sub-requirement is independently addressable; tests can cite `OBL-2c` (refusal) without implying coverage of `OBL-2d` (diagnostic kind).
- Matches the suggested fix from the related finding *"Prerequisites probe block has six MUST obligations with no IDs"* — same ID-introduction pattern, applied uniformly.

**Cons.**
- Preserves the duplication: `OBL-2c` (refusal) and `OBL-2d` (`details.kind = "abortsignal-shape"`) restate what Step 0 already owns. A drift between `OBL-2c` / `OBL-2d` text and Step 0 text remains possible.
- Multiplies the surface area of obligation 2 from one ordinal to five (parent + 4 children), increasing the volume of citations a future leaf must thread through.
- The existing preamble's *"plan leaves and reviews MAY cite Host runtime obligation N"* invitation now needs a second clause for the sub-IDs.

**Risks.**
- The parallel split for obligations 1 and 3 is needed for consistency, but obligation 4 (the non-checked invariant) has no symmetric structure — leaves the obligation list visually uneven.

### Recommendation

Option A. Trim obligation 2 (and parallel-trim 1 and 3) to its unique normative payload — the WHATWG constructor and named-member enumeration — and forward-link probe behaviour to a newly-anchored `<a id="entry-capability-probe"></a>` on pi-integration-contract.md Step 0. Edge cases the implementer must watch:

- The Pi-version-bump procedure already lists *"the four pinned constants (Node floor, AbortSignal member list, capability list, peer-dep range) live in **one source of truth** inside the extension module"*. The trimmed obligation 2 must remain that source of truth for the member list (Step 0 only references it, does not enumerate it); preserve the seven-member enumeration verbatim.
- The forward-link sentence must name `details.kind = "abortsignal-shape"` in passing (one sentence, not a re-statement of the probe contract) so a reader landing on obligation 2 still learns the discriminator literal without following the link.
- Apply the same trim to obligations 1 (`details.kind = "node-floor"`) and 3 (`details.kind ∈ { "sdk-capability-missing", "peer-dep-out-of-range" }`) in the same edit; trimming only obligation 2 leaves an asymmetric three-way split where 1 and 3 still bundle and 2 does not.
- Update `plan_topics/h1-scaffold.md`'s citation of *"Host runtime obligation 2"* in the SDK surface-inventory test description to point at the now-anchored member-list paragraph (e.g. via a stable `<a id="host-runtime-abortsignal-shape"></a>` on the obligation 2 line) rather than at the trimmed forward-link.

## Related Findings

- "Prerequisites probe block has six MUST obligations with no IDs" — same-cluster (same traceability/granularity pattern; resolves under either Option A's trim-and-forward-link approach or Option B's ID-introduction approach, but the structural fix differs)
- "`Step 0` cross-reference to `pi-integration-contract.md` is not an anchor; inconsistently named" — co-resolve (Option A's `<a id="entry-capability-probe"></a>` anchor add satisfies the anchor and inconsistent-naming halves of that finding in the same edit)
- "`Pi SDK and capabilities` block has no navigable anchor; cross-references by bold text" — same-cluster (same traceability lens; orthogonal text — the *Pi SDK and capabilities* block is the prose head, obligation 2 is in the *Host runtime* numbered list — but both want stable anchors and resolve through the same anchor-introduction discipline)
- "Obligation 3 cross-references `Pi SDK and capabilities` by rendered bold text, not anchor" — same-cluster (same anchor-introduction discipline)

---

---

# Prerequisites "Pi SDK and capabilities" prose bundles seven MUSTs under no addressable IDs

**Source:** docs/reviews/spec-review/spec-20260506-142846.md
**Original heading:** Prerequisites probe block has six MUST obligations with no IDs
**Kind:** traceability

## Finding

`spec.md` § Orientation → Prerequisites opens with a bolded "**Pi SDK and capabilities.**" prose paragraph that carries the V1 capability-probe contract. The paragraph is one continuous sentence-stream containing at least seven distinct normative obligations:

1. The `pi-agent-core`, `pi-ai`, and `pi-tui` packages MUST be present at the same minor-version line as the resolved `@mariozechner/pi-coding-agent` install.
2. The extension MUST verify the seven enumerated SDK capabilities at extension-factory entry.
3. The extension MUST verify the Node version floor.
4. The extension MUST verify the `AbortSignal` / `AbortController` shape.
5. The extension MUST verify the installed `@mariozechner/pi-coding-agent` peer-dep version.
6. On any mismatch the extension MUST refuse every `pi.register*` call.
7. On any mismatch the extension MUST emit `loom/load/host-incompatible` through the system-note fallback chain.

None of the seven is individually addressable. The adjacent "**Host runtime.**" sub-block immediately below names its four obligations by ordinal (and the rest of the corpus already cites them as "Host runtime obligation 1/2/3/4"); the SDK-and-capabilities block — which carries the same load-bearing weight — has no equivalent handle. The duplication is also non-trivial: items 2–4 above restate Host runtime obligations 3, 1, and 2 respectively in different prose, so a future edit can drift the two surfaces against each other without any cross-reference catching it.

The same opacity propagates downstream. `spec_topics/pi-integration-contract.md` § *Extension entry point — Step 0 (Capability probe)* — which the prose paragraph names as the canonical owner of the probe contract — is itself one ~600-word paragraph carrying the `(a)`/`(b)`/`(c)`/`(d)` probe steps, the `MUST be limited to typeof checks` rule, the `MUST NOT use any member it is itself checking` rule, the `MUST NOT execute` skip-subsequent-registers rule, the single-diagnostic emission rule, and the `MUST NOT throw` rule, all unanchored. PIC owns a registered REQ-ID prefix (`PIC`) per `spec_topics/governance.md`; spec.md does not. The fix has to live in PIC for the obligations to gain real `PIC-N` anchors usable by the V18s coverage gate; spec.md must shed the duplicated normative content and link out.

## Spec Documents

- `spec.md` — § Orientation → Prerequisites → "Pi SDK and capabilities" sub-block (edited)
- `spec_topics/pi-integration-contract.md` — § Extension entry point → Step 0 (Capability probe) (edited)
- `spec_topics/pi-integration-contract.md` — § SDK capability inventory (read-only — already anchored per item; back-links from spec.md must continue to resolve)
- `spec_topics/governance.md` — REQ-ID prefix table; GOV-1, GOV-4, GOV-9 (read-only — confirms `PIC` prefix is the canonical home and that spec.md cannot coin its own REQ-IDs)
- `spec_topics/diagnostics.md` — `loom/load/host-incompatible` row (read-only — referenced by the relocated obligations)

## Plan Impact

**Phases:** Horizontal

**Leaves (implementation order):**

- H1 — Repository scaffold and test framework — (modified — the `SDK_SURFACE_INVENTORY` literal-read test, the `engines.node` literal-read test, and the `peerDependencies` literal-read test all cite the prose surfaces; their anchor-link targets must update to the new `PIC-N` anchors but the test bodies do not change)
- H6 — REQ-ID anchor insertion and coverage-matrix re-pivot — (modified — H6 is the leaf that performs the anchor-insertion pass over PIC.md; the new per-obligation `PIC-N` IDs land in this leaf and must appear as rows in `coverage-matrix.md`)

## Consequence

**Severity:** correctness

Two consequences are concrete. (1) A capability-probe implementation that correctly refuses registration but emits the wrong `details.kind` discriminator partially fails the contract — but the spec offers no ID against which the partial failure can be reported, so test suites cannot map findings back to a single requirement and the V18s coverage gate (which keys on `PREFIX-N` IDs) cannot enforce closure over the probe surface. (2) The duplicated MUSTs in spec.md and PIC.md can drift: the spec.md prose currently lists seven probe-side obligations while PIC.md's Step 0 paragraph lists nine, with no cross-reference machinery to detect when the two diverge under a future edit.

## Solution Space

**Shape:** single

### Recommendation

Relocate the normative content into `pi-integration-contract.md` under per-obligation `PIC-N` anchors; reduce the `spec.md` prose paragraph to a non-normative orientation summary that links out to those anchors. Concretely:

1. **In `pi-integration-contract.md` § Extension entry point — Step 0 (Capability probe).** Restructure the single paragraph into a numbered list. Each MUST becomes its own item carrying a `**PIC-N.**` inline marker (per `governance.md` GOV-1, with N taken from the next free position at the `PIC` prefix's tail per GOV-4 append-only). Suggested decomposition (final numbering set by H6's append pass, not pre-committed here):
   - Probe scope: the four checks `(a)`–`(d)` already enumerated in the paragraph.
   - Probe restriction: `typeof`-only; no arity sniffing; no return-shape sniffing.
   - Self-reference prohibition: the probe MUST NOT use any member it is itself checking.
   - Single-source-of-truth rule for the four pinned constants (Node floor, `AbortSignal` member list, capability list, peer-dep range).
   - Failure consequence (i): skip every subsequent `pi.register*` and `pi.on` call.
   - Failure consequence (ii): emit exactly one `loom/load/host-incompatible` with `details.kind ∈ { "node-floor", "abortsignal-shape", "sdk-capability-missing", "peer-dep-out-of-range" }`, routed through the System notes fallback chain.
   - Failure consequence (iii): the factory MUST NOT throw; it returns normally.
   - Idempotency on `/reload`.
   - Probe-set closure: probes MUST NOT be added beyond the four enumerated checks.
   - Sub-package lockstep obligation (`pi-agent-core`, `pi-ai`, `pi-tui` at the same minor-version line as the resolved `@mariozechner/pi-coding-agent`) — this currently lives only in spec.md prose and has no PIC home; relocating it here is part of the same edit.

2. **In `spec.md` § Orientation → Prerequisites.** Replace the "Pi SDK and capabilities" prose paragraph with a short bulleted summary whose every normative claim is a link to the corresponding `PIC-N` anchor. The bullets that already name-link the seven SDK capabilities by anchor stay as they are. The `peerDependencies`-is-non-load-bearing sentence stays in spec.md because it is orientation context, not a checkable rule. The Host runtime obligations 1–4 numbered list immediately below stays unchanged — its existing ordinals continue to be the citation surface for "Host runtime obligation N" elsewhere in the corpus.

3. **In `coverage-matrix.md`.** H6's coverage-matrix re-pivot pass adds one row per new `PIC-N` ID, mapping each to `H4` (the leaf that implements the probe in the extension shell — the implementation seam already exists at H4 even though the current H4 leaf body does not name the probe; H6's pass will surface this gap if it persists) plus `H1` for the literal-read tests that anchor the four pinned constants.

Edge cases the implementer must watch:
- `governance.md` GOV-4 forbids reusing retired `PIC-N` numbers and the prefix is append-only — the new IDs land at the tail of PIC's existing numbering, never in pre-existing gaps.
- The H1 SDK surface-inventory test currently links to `pi-integration-contract.md#sdk-capability-inventory` as a section anchor; that anchor stays. The H1 tests' anchor links to the *probe* obligations migrate from "spec.md#orientation" / "Step 0 'Capability probe'" prose references to `pi-integration-contract.md#pic-n` per-obligation links — no test-body change, only link-target updates.
- The cross-reference inside PIC.md from Step 0 to "Host runtime obligations 1–4 enumerated in spec.md" stays as a back-reference; the spec.md ordinals are not migrating.
- Per GOV-9, every spec page that depends on one of the new PIC-N rules must link to its `#pic-n` anchor; H6's pass updates the existing `loom/load/host-incompatible` references in `diagnostics.md` and the binder-related references in `binder.md` if they currently cite the prose surface.

## Related Findings

- "Obligation 2 bundles four independently testable sub-requirements under one ordinal" — same-cluster (same ID-granularity gap on the adjacent Host-runtime sub-block; the four sub-items there sit alongside the obligations covered here and benefit from the same H6 pass, but the fix lives on a different sub-block with different ID hosting)
- "'Pi SDK and capabilities' block has no navigable anchor; cross-references by bold text" — co-resolve (relocating the normative content to PIC-N anchors removes the need for an in-spec.md anchor on this block; the surviving spec.md summary becomes a link-out target rather than a link-in target)
- "Obligation 3 cross-references 'Pi SDK and capabilities' by rendered bold text, not anchor" — co-resolve (the bold-text reference in Host runtime obligation 3 is replaced with a PIC-N anchor link in the same edit)
- "'Step 0' cross-reference to `pi-integration-contract.md` is not an anchor; inconsistently named" — co-resolve (the new PIC-N anchors give every "Step 0 'Capability probe'" reference a stable target and a single canonical name)
- "Sub-packages (`pi-agent-core`, `pi-ai`, `pi-tui`) MUST requirement has no load-bearing probe step" — decision-dependency (the per-package lockstep obligation is one of the seven MUSTs being relocated; whether it gains its own PIC-N or folds into the peer-dep-version PIC-N is decided as part of this fix, and that decision constrains how the sub-packages-probe finding resolves)
- "Probe ordering / aggregation across simultaneous failures unspecified" — decision-dependency (per-obligation IDs make "which probe failed first / are failures aggregated" a meaningful question with a per-PIC-N answer; the relocation must either add an aggregation rule or explicitly mark it out of scope)
- "Hard-ceilings bullet bundles four independently testable items under one identifier" — same-cluster (parallel ID-granularity gap on a different orientation bullet; same H6 pass, different surface)
- "Four scope bullets carry no stable IDs" — same-cluster (same theme — Orientation prose surfaces lack addressable IDs — but the Scope bullets are non-normative orientation; resolution there does not need to relocate to a REQ-ID prefix)

---

---

## spec_topics/binder.md

---

# Type-display reference table uses `int` / `array<int>` but the canonical primitive is `integer`

**Source:** docs/reviews/spec-review/spec-20260506-142846.md
**Original heading:** `int` / `array<int>` used in type-display table; canonical name is `integer`
**Kind:** naming

## Finding

`spec_topics/binder.md` lines 154 and 158 — inside the *Type display* normative reference-rendering table for the binder system prompt's `Parameters:` block — use the spelling `int` for the integer primitive and `array<int>` for the integer-array type. Every other normative surface in the spec spells the same primitive `integer`:

- `spec_topics/type-system.md` line 5 enumerates the primitives as `string, number, integer, boolean, null`, and the compatibility-rule rows on lines 34–35 use `integer` exclusively (`integer ⊑ number`, `42 ⊑ integer`).
- `spec_topics/diagnostics.md` line 75 lists the lowercase primitive names (`string, integer, number, boolean, null`) and uses `integer` throughout placeholder-rendering rules and the diagnostic registry (e.g. `loom/parse/integer-narrowing` on line 209, `array<integer | string>` on line 85).
- `spec_topics/query.md` line 145 stringifies the primitive as `integer`.

No glossary entry equates `int` with `integer`. Because the *Type display* table is normative ("conforming implementations MUST reproduce these exactly"), an implementer rendering a binder prompt against any field of declared type `integer` faces a contradiction: the type-system page calls the primitive `integer`, but the binder-prompt reference rendering says it must appear as `int`. Two reasonable implementers resolve that differently — one matches the table verbatim and emits `int` (passing the binder-prompt conformance test, failing every other surface that spells the primitive `integer`), the other normalises to `integer` (failing the binder-prompt conformance test). The fact that the table also lists `array<int>` rules out a typo reading: this is a self-consistent two-row mistake.

## Spec Documents

- `spec_topics/binder.md` — *Type display* table under *Binder system prompt → System-prompt structure (normative)*, lines 149–161 (edited)
- `spec_topics/type-system.md` — primitives list and compatibility table (read-only, source of canonical name)
- `spec_topics/diagnostics.md` — placeholder rendering and diagnostic registry (read-only, confirms `integer` everywhere else)
- `spec_topics/query.md` — stringification table (read-only, confirms `integer`)

## Plan Impact

**Phases:** Vertical V16

**Leaves (implementation order):**

- V16f — `bind_context: none` — (modified)

V16f is the only leaf that produces the binder system prompt and therefore the only leaf whose conformance assertions reference the *Type display* table. Its current Tests bullet ("the binder's system prompt contains `Argument hint: <value>` exactly once") does not yet pin the per-type renderings, but any test it adds against the *Parameters:* block lines must consume the corrected table values. No other leaf in V16, V11 (type system), or H1–H4 grep-matches against `int`/`integer` rendering for binder output.

## Consequence

**Severity:** correctness

A normative reference-rendering table that names the primitive differently from every other normative surface forces implementers to choose which page to obey, and a conformance test written against the table directly contradicts a conformance test written against the type-system page. The blast radius is small (two rows, one table) but the disagreement is unambiguous and machine-observable in V16f.

## Solution Space

**Shape:** single

### Recommendation

In the *Type display* table at `spec_topics/binder.md` lines 149–161, replace `int` with `integer` in both the *Declared Loom type* and *Renders as* columns of the row currently reading `` | `int` | `int` | ``, and replace `array<int>` with `array<integer>` in both columns of the row currently reading `` | `array<int>` | `array<int>` | ``. No other rows change; the surrounding paragraph ("the field's declared Loom type written in the surface syntax of [Type System]") already mandates the type-system spelling, so this edit aligns the table with the prose immediately above it.

Edge case for the implementer: the same correction must propagate to any worked example or fixture string elsewhere in `binder.md` that quotes a synthesised `Parameters:` block — grep `binder.md` for `\bint\b` after the edit to confirm the illustrative fenced block on lines 111–134 (which currently contains no `int`/`integer` field) and the Failure-mode templates table do not need follow-up.

## Related Findings

- "`loom/runtime/binder-malformed-envelope` referenced but absent from the closed diagnostic registry" — same-cluster (also a binder.md naming/registry mismatch, resolves independently)
- "Tilde approximation in binder-context summary contradicts exact normative values" — same-cluster (also a binder.md prose-vs-normative mismatch, resolves independently)
- "Binder system-prompt item 8 non-testable: \"instruction's presence\" is not machine-checkable" — same-cluster (also a *System-prompt structure (normative)* gap, resolves independently)

---

---

# `loom/runtime/binder-malformed-envelope` is referenced by spec prose and plan leaves but missing from the closed diagnostic registry

**Source:** docs/reviews/spec-review/spec-20260506-142846.md
**Original heading:** `loom/runtime/binder-malformed-envelope` referenced but absent from the closed diagnostic registry
**Kind:** naming

## Finding

`spec_topics/binder.md` introduces a diagnostic code that has no home. The strict-capability paragraph (line 14) states that, under `pi-coding-agent ^0.72.1`, every resolved binder model emits `loom/load/binder-model-strict-capability-unknown` (W) at load time and that "runtime envelope-malformed failures surface as `loom/runtime/binder-malformed-envelope` per V16o." This code is never registered: the `loom/runtime/*` table in `spec_topics/diagnostics.md` (lines 326–340) enumerates twelve runtime codes and none of them is `binder-malformed-envelope`. Rule 2 of the registry section declares the table closed — adding, removing, or renaming a code is a spec change, and emitting an unregistered code is a defect (rule 1).

The same code is propagated into the plan: `plan_topics/v16-binder.md` references it twice in V16e's Adds/Tests as the runtime code that fires when strict capability is unknown, and V16o owns the malformed-envelope handling. Tests are entitled to assert on registered codes (rule 1), so the V16e/V16o test set as written will assert against an unregistered code.

The inconsistency is also internal to `binder.md`. The Failure-mode templates table (line 252) renders the malformed-envelope outcome as a user-facing system note — `loom /<name>: argument binding failed — could not parse arguments` — with no code attached, in line with the other binder failure rows (transport, AJV, ambiguous, needs_info, cancelled). None of them carries a `loom/...` code. So `binder.md` describes the same failure two ways: once as a coded runtime diagnostic (line 14, by reference to V16o), and once as a code-less operator-facing note (line 252).

## Spec Documents

- `spec_topics/binder.md` — Strict-capability requirement paragraph, Failure-mode templates table (edited)
- `spec_topics/diagnostics.md` — `loom/runtime/*` code registry section (option-dependent)

## Plan Impact

**Phases:** Vertical V16

**Leaves (implementation order):**

- V16o — Binder malformed envelope handling — (modified)
- V16e — `bind_model` resolution chain — (modified)

## Consequence

**Severity:** correctness

The closed-registry rule and the code-emission rule are mutually load-bearing — together they let tests pin diagnostic surfaces and let downstream tooling (LSP, formatters, doc cross-links) treat each code as part of the language contract. A coded reference with no registry row breaks both. Two reasonable implementers will diverge: one will add the row to the registry to satisfy rule 1; the other will treat the spec text as an editorial slip and emit the failure as the code-less system note shown in the failure-modes table. The V16e/V16o test set as currently written cannot pass against the second implementation.

## Solution Space

**Shape:** multiple

### Option A — Add `loom/runtime/binder-malformed-envelope` to the registry

**Approach.** Insert a new row in the `loom/runtime/*` registry table in `diagnostics.md`, between `registry-swap-failed` and `internal-error` (alphabetical placement is not enforced by the table; group near other binder/load-adjacent runtime rows). Treat malformed-envelope as a code-bearing diagnostic that is *also* surfaced as the user-facing system note from `binder.md`'s failure-modes table — the two channels coexist (the diagnostic carries the code; the system note carries the operator-facing message).

**Spec edits.**
- `diagnostics.md` — add a row:
  - Code: `loom/runtime/binder-malformed-envelope`
  - Sev: `E`
  - Phase: `runtime`
  - Trigger: `The binder returned an envelope that failed JSON-parse or envelope-`anyOf` discriminator validation on both the initial attempt and its single retry (per V16o budget rules in [Slash-Command Argument Binding — Failure-mode templates](./binder.md#failure-mode-templates-normative)).`
  - Spec rule: link to `binder.md` failure-modes section
  - Message template: `argument binding failed — could not parse arguments` (matches the failure-mode row, minus the `loom /<name>:` prefix which the system-note formatter contributes).
- `binder.md` line 252 row — extend the row with a `Code` column or add an inline note that this row's system note also carries the `loom/runtime/binder-malformed-envelope` code.
- No edits required at `binder.md` line 14 or in `v16-binder.md`.

**Pros.**
- V16o/V16e tests as written remain valid.
- Operator tooling can filter binder-malformed failures by code rather than by message-string regex.
- Symmetric with `loom/runtime/system-note-delivery-failed`, `subagent-dispose-failure`, etc., which are already registered runtime-event-style codes that don't fit the panic mould.

**Cons.**
- Asymmetric with the other binder failure rows (transport, AJV, ambiguous, needs_info, cancelled), which remain code-less. Either malformed-envelope is special, or the rest of the binder failure surface eventually grows codes too.
- One more code in the closed surface to maintain.

**Risks.**
- If the spec later wants every binder failure class to be code-bearing for symmetry, this row commits to a naming pattern (`loom/runtime/binder-<class>`) that the others will have to follow.

### Option B — Remove the code reference; failure is system-note-only

**Approach.** Delete the `loom/runtime/binder-malformed-envelope` reference. The malformed-envelope failure is described entirely by the failure-mode template in `binder.md` line 252 — same shape as the other five binder failure rows. The strict-capability-unknown branch reduces to "runtime envelope-malformed failures surface via the failure-mode template" with no code distinguished.

**Spec edits.**
- `binder.md` line 14 — replace `runtime envelope-malformed failures surface as `loom/runtime/binder-malformed-envelope` per V16o` with `runtime envelope-malformed failures surface via the failure-mode template per V16o`.
- `plan_topics/v16-binder.md` — V16e Adds: replace `runtime envelope-malformed failure surfaces as `loom/runtime/binder-malformed-envelope` per V16o` with `runtime envelope-malformed failure surfaces via the failure-mode template per V16o`. V16e Tests: replace `runtime envelope-malformed failure surfaces as `loom/runtime/binder-malformed-envelope` per V16o` similarly. (Plan edits are out of this finding's scope but flagged for the implementer.)
- No edits to `diagnostics.md`.

**Pros.**
- Symmetric: every binder failure class uses the failure-mode template, none carries a code.
- Smaller closed-registry surface.
- No new test obligations.

**Cons.**
- Operator tooling must match on the system-note message string (subject to the failure-mode template's stability guarantee, which is normative).
- The strict-capability-unknown branch loses its only observable downstream signal — the load-time `loom/load/binder-model-strict-capability-unknown` (W) is the only diagnostic; there is no way to tell which malformed-envelope failures originated from a non-strict model versus a strict one.

**Risks.**
- If a future Pi minor adds the strict-capability indicator and `loom/load/binder-model-not-strict-capable` (E) starts firing, the lack of a runtime-side code makes it harder to correlate load-time and runtime failures in observability dashboards.

### Recommendation

Option B. The malformed-envelope failure is shaped like the other five binder failure rows — surfacing through the user-facing failure-mode template rather than a code-bearing diagnostic — and `binder.md` already specifies its rendering normatively at line 252. Adding the code (Option A) introduces an asymmetry with the rest of the binder failure surface that would either be sustained as an oddity or force codes onto the other five rows over time.

Edge cases the implementer must watch:
- `binder.md` line 14 still needs the `per V16o` cross-link so the strict-capability paragraph remains coupled to V16o's malformed-envelope handling; only the *code* token is removed, not the cross-link.
- `binder.md` line 14 currently distinguishes the `loom/load/binder-model-not-strict-capable` (E) and `loom/load/binder-model-strict-capability-unknown` (W) load-time codes; both remain registered and are unaffected by this finding.
- `plan_topics/v16-binder.md` carries the same code reference twice in V16e (Adds and Tests). Both must be removed in the same change.
- The malformed-envelope retry budget (V16o owns the "retried once" rule) and the system-note template wording stay normatively identical; only the diagnostic-code claim is dropped.

## Related Findings

- "Dual V1 / post-V1 normative regime in binder strict-capability gate" — same-cluster (touches the same paragraph at `binder.md` line 14 and the registry status of `loom/load/binder-model-not-strict-capable`; resolves independently but a coordinated edit pass on the strict-capability paragraph would address both)
- "Diagnostic placeholder categories incomplete — many placeholders have no rendering rule" — same-cluster (both findings are about the closed-registry contract; resolves independently)

---

---

## spec_topics/query.md + spec_topics/errors-and-results.md

---

# `ValidationError` conflates AJV-rejection of a model response with empty-template short-circuit

**Source:** docs/reviews/spec-review/spec-20260506-142846.md
**Original heading:** `kind: "validation"` overloaded for two semantically distinct failure causes
**Kind:** naming

## Finding

`QueryError { kind: "validation" }` is the wire-level discriminant for two failure modes whose causes and remediation paths have nothing in common:

1. **Schema-validation rejection** of a typed query's final response (initial AJV failure, or terminal exhaustion of the respond-repair loop, or a depth-5 violation surfaced via `ValidationIssue { schema_keyword: "maxDepth" }`). The model produced text; the runtime measured it against a schema and found it wanting; the loom author can react by tightening the schema, raising `respond_repair.attempts`, or switching methodology.
2. **Empty-template short-circuit** (`spec_topics/query.md` "Degenerate rendered templates"): the runtime refuses to emit a fully-rendered user turn whose body matches `^\s*$`. No provider round-trip occurs, no model output exists. The loom author can only react by fixing the template — the failure is a programming defect, not a model-quality signal. The spec's own rationale concedes the asymmetry: *"the runtime is refusing input it constructed itself; no model-side validation happened."*

An author writing `match err { ValidationError { … } => … }` cannot distinguish these from the discriminant. The spec has left an implicit structural discriminator in place — case (2) is uniquely identified by `validation_errors.length === 0 && raw_response === null && attempts === 0` — but this is not declared as such, is not stable under V6i (which also produces `validation_errors: [...], raw_response: null, attempts: 0` when the respond-tool's `execute` rejects a payload), and reverses the polarity of the spec's rule that authors `match` on `kind` and treat fields as scoped data.

The overload also creates a cross-page inconsistency: untyped queries (`Result<string, QueryError>` per V5a/V5g) can return `ValidationError` *only* via the empty-template short-circuit — there is no AJV step on an untyped response. `errors-and-results.md` describes `ValidationError` as the typed-query schema-failure variant and never mentions the untyped path, leaving an author who reads only that page unaware that the variant can fire under untyped queries at all.

## Spec Documents

- `spec_topics/query.md` — "Degenerate rendered templates", "Schema-validation respond-repair", "Non-validation failures during a respond-repair follow-up" (edited)
- `spec_topics/errors-and-results.md` — `ValidationError` schema and the pattern-grammar table row `QueryError { kind: "validation", attempts }` (edited)
- `spec_topics/schema-subset.md` — "Error shape" paragraph for depth violations (read-only; depth violation stays `cause: "schema_validation"`)
- `spec_topics/pi-integration-contract.md` — "Runtime event channel" always-log exclusion list (option-dependent: a new `kind` requires re-listing; a new `cause` field does not)
- `spec_topics/glossary.md` — `respond_repair` entry references `kind: "validation"` (read-only)
- `spec_topics/type-system.md` — uses `kind: "validation"` as an example literal type (read-only)

## Plan Impact

**Phases:** Vertical V5, Vertical V6, Vertical V7, Vertical V11, Vertical V13, Vertical V18

**Leaves (implementation order):**

- V5e — Prompt-mode conversation driver — (modified) — hosts the empty-template runtime short-circuit per `coverage-matrix.md`; constructs the `ValidationError` for case (2)
- V5g — `QueryError` union — initial variants — (modified, only under Option A) — would gain a tenth wire variant if a distinct `kind` is introduced
- V6i — Synthesised respond tool: schema lowering, AJV-validating `execute`, per-mode wiring — (modified) — emits `kind: "validation", attempts: 0, validation_errors: [...], raw_response: null` for AJV failure; needs to set the new `cause` (or keep `kind: "validation"` under Option A)
- V6l — Two-phase tool-loop driver for typed queries — (modified) — propagates the `ValidationError` from `execute` and from terminal respond-repair exhaustion
- V7a — `match` arm body — (modified) — the canonical pattern-grammar test uses `QueryError { kind: "validation", attempts }`; either rename the example or extend it to demonstrate the new discriminator
- V11i — Pre-AJV depth walk — (modified) — its `ValidationIssue { schema_keyword: "maxDepth" }` payload must declare which `cause` (or kind) it carries
- V13g / V13h / V13i — Respond-repair methodologies (`validator_error`, `schema_repeat`, `none`) — (modified) — terminal exhaustion error must set the new discriminator
- V13j — Respond-repair preserves tool-call side effects — (modified) — the existing rule "non-validation failures during a follow-up do not consume an `attempts` slot" needs re-phrasing in the `cause`-field option (the empty-template short-circuit on a follow-up must remain non-counting)
- V18q — Runtime event channel and always-log emission — (modified) — the test asserting "the four excluded kinds (`validation`, `context_overflow`, `cancelled`, `invoke_callee_error`) produce zero events" must keep the empty-template subcause in the excluded set under either option

## Consequence

**Severity:** correctness

Two reasonable implementers will diverge on whether the empty-template short-circuit is observable from a `match` site. One will route both subcauses through the same arm and rely on author follow-up via `validation_errors.length`; the other will silently demote case (2) to a `loom/runtime/internal-error` panic on the grounds that "the loom author shipped a degenerate prompt." Looms that programmatically retry on `ValidationError` (e.g. cycle through alternate prompts) will misbehave under case (2): they will retry an empty-template short-circuit forever because no input changed. The bug surface is small but the wire-level discriminator is the contract authors are told to rely on.

## Solution Space

**Shape:** multiple

### Option A — Distinct `kind: "empty_template"` variant

**Approach.** Introduce a tenth `QueryError` wire variant `EmptyTemplateError { kind: "empty_template", message: string, query_site: SourceLocation }` for the runtime short-circuit. `ValidationError` becomes the AJV-rejection variant exclusively; its rationale paragraph in `query.md` is deleted.

**Spec edits.**
- `errors-and-results.md`: add the new variant block alongside the eight existing query-time variants; update the `QueryError` union enumeration; update the pattern-grammar example.
- `query.md`: rewrite the "Runtime short-circuit" bullet to use `kind: "empty_template"`; delete the "variant is reused" rationale and the paragraph defending `attempts: 0` on respond-repair follow-ups (the new variant carries no `attempts` field).
- `pi-integration-contract.md`: add `empty_template` to the always-log exclusion list (it is a programming defect, not an operational event).
- `glossary.md` / `type-system.md`: refresh the example literal.

**Pros.** Clean `match` discrimination. No `attempts: 0` / `validation_errors: []` sentinel pattern. Distinguishes "model failed validation" from "loom author shipped a degenerate prompt" at the wire level.

**Cons.** Tenth variant in a union the spec already calls "closed for V1" in its conformance tests. Touches every leaf that enumerates the union (V5g, V18q always-log set, V18q test (b) "four excluded kinds").

**Risks.** A future user-defined-error-type extension already wants the `kind` type-openness seam (`errors-and-results.md` "Discriminator type-openness"); landing a new V1 wire variant first is on-trend, but each new variant adds a closed-set assertion that V1 conformance tests must enumerate.

### Option B — Add `cause: "schema_validation" | "empty_template"` to `ValidationError`

**Approach.** Keep `kind: "validation"` as the single discriminator. Add a normative required field `cause: "schema_validation" | "empty_template"` to `ValidationError`. The empty-template short-circuit emits `cause: "empty_template", validation_errors: [], raw_response: null, attempts: 0`; every other path (initial AJV, respond-repair exhaustion, depth-5 violation) emits `cause: "schema_validation"`.

**Spec edits.**
- `errors-and-results.md`: add `cause` to the `ValidationError` schema with the two-arm enum and a one-line gloss on each arm. Note that untyped queries can only produce `cause: "empty_template"`.
- `query.md`: replace the "variant is reused" paragraph with one sentence stating the empty-template short-circuit emits `cause: "empty_template"`. Update the respond-repair exhaustion text to specify `cause: "schema_validation"`.
- `schema-subset.md`: clarify that depth violations carry `cause: "schema_validation"`.
- `glossary.md`: update the `respond_repair` entry to mention `cause: "schema_validation"` exhaustion.

**Pros.** Consistent with existing variants that already carry sub-discriminators (`CodeToolError.cause`, `InvokeInfraError.reason`). Wire union stays at nine variants. Always-log set composition unchanged. V5g / V18q tests need only field-level updates.

**Cons.** Authors who want to handle the cases differently must destructure two fields. The discriminator-vs-field convention in the loom surface is now: "match on `kind` for the broad class, then on `cause`/`reason` for the subclass."

**Risks.** Authors who write `match err { ValidationError { … } => log_and_retry(); … }` and ignore the `cause` will silently misbehave on `cause: "empty_template"` exactly the same way they would today. The fix is observability, not behavioural.

### Recommendation

Take **Option B**. The two-tier `kind` + `cause` shape already exists in the spec for `CodeToolError` (four causes) and `InvokeInfraError` (five reasons); extending it to `ValidationError` is a one-field, one-enum-row change that costs no plan-leaf re-shuffling. The wire variant set stays closed at nine, the always-log set keeps a single uniform "exclude `validation`" rule, and the structural sentinel pattern (`validation_errors: []` + `raw_response: null`) becomes a redundant tell rather than the load-bearing discriminator. Edge cases the implementer must watch: (a) `errors-and-results.md` must mark `cause` as required so older AJV-only emit paths don't accidentally omit it; (b) the V11i depth-walk path must set `cause: "schema_validation"` even though it short-circuits before AJV; (c) V13j's "non-validation failures during a follow-up do not consume an `attempts` slot" rule must be re-stated as "non-`schema_validation` causes do not consume an `attempts` slot" so that an empty-template short-circuit on a follow-up (defensive case the spec already covers) remains non-counting.

## Related Findings

- "Runtime observability — \"always-log set\" undefined jargon" — same-cluster (independent fix, but both touch the always-log surface where `validation` is excluded; whichever lands first should not preclude the other)
- "`ambiguous.candidates` field is built and suppressed in V1 — belongs to a future feature" — same-cluster (both are wire-shape surface decisions on `QueryError`-adjacent envelopes; resolve independently)

---

---

## spec_topics/diagnostics.md

---

# Placeholder rendering rules cover only a fraction of the registry's placeholders

**Source:** docs/reviews/spec-review/spec-20260506-142846.md
**Original heading:** Diagnostic placeholder categories incomplete — many placeholders have no rendering rule
**Kind:** testability

## Finding

[`spec_topics/diagnostics.md` — Placeholder rendering](../../spec_topics/diagnostics.md) declares that the *Message* column is normative (rule 4) and that two conformant implementations MUST produce byte-identical strings for the same source defect. To deliver on that, the section enumerates six placeholder categories — static-type, runtime-value, syntactic-construct, numeric, source-derived, and underlying-error — and pins one rendering rule per category. The accompanying paragraph also states that the **category-to-placeholder map is closed**: introducing a new placeholder, retiring one, or moving a placeholder between categories is a GOV-7/GOV-8 spec-versioned breaking change.

The closed-map claim does not hold. The registry tables that follow use roughly two dozen placeholder names that appear in no category list and therefore have no rendering rule. Concretely:

- **Identifier-shaped, but not in category 5.** `<schema>` (`extra field '<field>' on schema '<schema>'`), `<X>` (the discriminated-union family), `<enum>` (`unknown variant '<variant>' on enum '<enum>'`), `<method>` (`unknown method '<method>' on type <type>`), `<model>` and `<provider>` (binder-model rows), `<source>` (`case-insensitive filename collision in <source>`), `<capability>` (`extension bootstrap failed: <capability> threw <error>`), `<slug>`, `<name1>`, `<name2>` (registration-cache collision).
- **Path-shaped, but not in category 5.** `<path-a>` and `<path-b>` (case-collision row), `<higher>` and `<lower>` (cross-source-shadow row), `<A>` and `<B>` (the two cycle templates), `<root>` (discovery-slow row).
- **List-valued, with no formatting rule anywhere.** `<fields>` (`ambiguous discriminator … candidates: <fields>`), `<paths>` (`slash name '<name>' collides at the same priority: <paths>`), `<list>` (`<N> invocation(s) still in flight: <list>`). The renderer cannot derive a separator, an ordering, or a truncation policy from the spec, so two conformant implementations will diverge on every multi-element case.
- **Closed-set host-supplied scalars.** `<kind>` is overloaded across at least four sites — discovery `loom/load/settings-invalid-entry` and `loom/load/manifest-invalid` (a JS-typeof-shaped tag), `loom/parse/non-string-discriminator` and `loom/parse/non-string-enum-value` (a Loom static type), and `loom/load/host-incompatible` (one of four enumerated probe outcomes). Each site needs a distinct closed-value list. `<cap>` (`package-discovery walk aborted at <root>: <cap> cap reached`) is similarly an enumerated tag.
- **Placeholder-name collisions.** `<required>` is named in category 4 (numeric) for `loom/parse/invoke-arity-too-few`, but the `loom/load/host-incompatible` row reuses the same name `<required>` for a non-numeric value (a Node version range, a peer-dep semver range, a capability shape descriptor) — the category-4 rule renders that as a decimal integer, which is wrong. `<error>` appears in `loom/load/extension-bootstrap-failed` and `loom/runtime/active-set-restore-failed` and is plainly meant to be the same first-line cut as category 6's `<error.message>`, but it is not listed there and the spelling differs.
- **Arity-1 numeric and timestamp placeholders.** `<ms>` and `<N>` (`reload teardown timed out after <ms>ms; <N> invocation(s)`) are integer-shaped but neither name is in category 4's enumeration.

A reviewer (or a conformance test author following rule 4) cannot derive the expected rendered string for any registry row that uses one of these placeholders without inventing a rule. The "two conformant implementations" guarantee fails by construction at every such site, and the V18s closing-gate test that asserts each registry message verbatim has nothing in the spec to anchor its expected strings against.

## Spec Documents

- `spec_topics/diagnostics.md` — Placeholder rendering (normative); Code registry (`loom/parse/*`, `loom/load/*`, `loom/runtime/*` tables) (edited)
- `spec_topics/lexical.md` — Identifiers; String literals (read-only — supplies the identifier-shape predicate and the escape-form catalogue category 5 already cites)
- `spec_topics/discovery.md` — Failure modes; Source priority (read-only — supplies the closed `kind` set for `<descriptor>` that the new identifier list will mirror)
- `spec_topics/governance.md` — GOV-7 / GOV-8 (read-only — the placeholder-map edit is itself a GOV-7 closed-set extension and must follow the procedure)

## Plan Impact

**Phases:** MVP, Vertical V4, Vertical V11, Vertical V12, Vertical V14, Vertical V15, Vertical V16, Vertical V17, Vertical V18

**Leaves (implementation order):**

- Mb — Minimal runtime + slash registration + two-root discovery + no-params overflow note — (modified) — asserts `cross-format-collision` (`<paths>`) and `cross-source-shadow` (`<higher>`/`<lower>`) message templates verbatim
- V4a — Type-alias cycle detection — (modified) — pins the literal message `"type-alias cycle: X → X"` (`<path>`)
- V4b — Object schema lowering — (modified) — pins `loom/parse/empty-schema-body` literal `"'X' has no fields; …"` (`<X>`)
- V11a — Discriminated-union detection — (modified) — `non-string-discriminator` (`<X>`, `<field>`, `<kind>`) and the registry *Message* template assertion
- V11b — Ambiguous-discriminator diagnostic — (modified) — `<X>`, `<fields>` list-formatting
- V11c — Missing-discriminator diagnostic — (modified) — `<X>`, `<fields>` if any
- V11d — Explicit `by` form — (modified) — `<X>`, `<value>`, `<kind>`
- V11e — Nested discriminator — (modified) — `<X>`, `<field>`
- V12a — Subagent dispose-failure — (read-only) — `<dispose error first line>` is already in category 6
- V14k — Global-root discovery — (modified) — `<source>`, `<path-a>`, `<path-b>` for `case-collision`
- V14l — Project-root discovery — (modified) — same
- V14m — Package discovery — (modified) — `<paths>` for `cross-format-collision`, `<root>`/`<cap>` for `discovery-slow`, `<kind>` for `manifest-invalid`, `<index>`/`<kind>` for `settings-invalid-entry`
- V14n — Settings discovery — (modified) — `<index>`, `<descriptor>`
- V14o — CLI flag discovery — (modified) — `<descriptor>`, `<paths>`
- V14p — Source priority — (modified) — `<higher>`, `<lower>`
- V14q — Same-priority collisions — (modified) — `<paths>` list-formatting
- V15a — `invoke` resolution and path-escape — (modified) — `<path>` (covered) plus `<A>`/`<B>` if cycle path passes through
- V15d — Argument arity — (modified) — `<required>` collision must be resolved before this leaf can pin the verbatim message
- V15e — `tools:` `.loom` registration — (modified) — `<path>`, `<paths>`
- V15j — Invocation cycle detection — (modified) — `<A>`, `<B>` for `"invocation cycle: A → B → A"`
- V16e — Binder-model resolution — (modified) — `<model>`, `<provider>`
- V17 — Import cycle — (modified) — `<A>`, `<B>` for `"import cycle: A.warp → B.warp → A.warp"`
- V18f — Watcher build-aside-then-publish swap — (modified) — `<path>` for `registry-swap-failed`
- V18j — Panic surfaces — (modified) — `<error>` (active-set-restore), `<ms>`/`<N>`/`<list>` (reload-teardown), `<slug>`/`<name1>`/`<name2>` (registration-cache collision)
- V18s — Closing gate (registry-code coverage) — (modified) — the gate's verbatim-message assertion machinery has nothing to assert against until the placeholder map is complete

## Consequence

**Severity:** correctness

Two conformant implementations following the spec literally will produce byte-divergent strings for the majority of registry rows — every row that uses an unmapped placeholder. The V18s closing gate (which mandates a literal-string test per registry code) cannot be satisfied without each test author silently inventing a rendering rule, and the rule-4 "Message column is normative" guarantee collapses to "the column is normative wherever the renderer happens to agree with the test author." Operator-facing tooling (LSP message comparison, CI golden-file tests, log-shape assertions) is downstream of the same gap.

## Solution Space

**Shape:** single

### Recommendation

Close the placeholder map by extending the existing six categories — no new "category 7" required for most cases — and resolving the three secondary issues (list formatting, name collisions, host-string rendering) with three small, surgical additions. Concretely:

1. **Extend category 5 (Source-derived) to cover the unmapped identifier-shaped and path-shaped placeholders.** Add to its placeholder list:
   - **Identifier-shaped (rendered unquoted, identifier verbatim per [`lexical.md` — Identifiers](../../spec_topics/lexical.md)):** `<schema>`, `<X>`, `<enum>`, `<method>`, `<model>`, `<provider>`, `<source>`, `<capability>`, `<slug>`, `<name1>`, `<name2>`. The `<capability>` placeholder additionally pins to the closed three-value set `"pi.registerMessageRenderer" | "pi.registerCommand" | "pi.registerFlag"` already declared in the `extension-bootstrap-failed` row.
   - **Path-shaped (rendered as the literal text inside the path-literal quotes, per the existing `<path>` rule):** `<path-a>`, `<path-b>`, `<higher>`, `<lower>`, `<A>`, `<B>`, `<root>`. State explicitly that these obey the same no-realpath / no-symlink / no-scheme-prefix rule as `<path>`.

2. **Extend category 4 (Numeric) to cover `<ms>` and `<N>`.** Both render via the existing shortest-decimal rule. Add a normative test vector for the `reload-teardown-timeout` row's "0 invocations" boundary.

3. **Add a category 7 for closed-set tag placeholders.** Cover `<kind>` (per emitting site, with the four enumerations spelled out: discovery JS-typeof set, `non-string-discriminator` Loom-static-type set, `host-incompatible` four-value probe set, descriptor-rule set) and `<cap>` (the closed two-value `"file-count" | "wall-clock"` set from `discovery-slow`). Rule: render the tag value verbatim, lowercase, from the per-site closed enumeration; an out-of-set value is `loom/runtime/internal-error`. Test vectors: one per enumeration site.

4. **Add a list-formatting rule (category 5 sub-rule or category 8) for `<fields>`, `<paths>`, `<list>`.** Pin: (a) elements rendered per the underlying placeholder rule (identifier-shaped for `<fields>`, path-shaped for `<paths>`, free-form per [`pi-integration-contract.md` — Tool active-set restore](../../spec_topics/pi-integration-contract.md) for `<list>`); (b) joined with the literal four-character separator `", "` (comma-space); (c) ordered as the underlying source orders them — schema-declaration order for `<fields>`, discovery-walk order for `<paths>`, registration order for `<list>`; (d) no truncation (the unbounded-cardinality concern is upstream of this rule). Test vectors: a 3-element `<fields>` and a 3-element `<paths>` example.

5. **Resolve the `<required>` name collision.** Rename the `host-incompatible` row's two version-string placeholders from `<observed>`/`<required>` to `<observed-version>`/`<required-version>` and add both to category 6 (Underlying-error) — they obey the same first-line-cut, no-rstrip, `<no message>`-on-empty rule already pinned there. The numeric `<required>` in category 4 then continues to mean only the arity-numeric case, with no overload.

6. **Alias `<error>` to category 6 explicitly.** Rename the spelling in the `extension-bootstrap-failed` and `active-set-restore-failed` rows to `<error.message>`, OR add `<error>` to category 6's placeholder list with a parenthetical "synonym for `<error.message>`; the renderer treats them identically." The first option is preferable (eliminates the typographic divergence) and is purely a registry-table edit; no behavioural change.

Implementer-relevant edge cases:

- The category-5 extension MUST clarify the `<X>` case where the name embeds a generic argument (e.g. an alias of `Result<T, E>`); the rule should be "render exactly as written in source," matching the existing `<descriptor>` value rule.
- The list-formatting rule's "discovery-walk order" for `<paths>` ties the rendered string to the V14k–V14p source-priority traversal; tests that compare across implementations MUST seed the discovery walk deterministically (every cited V14 leaf already does this via `FakeFileSystem`).
- The `<kind>` enumeration in category 7 must be exhaustively listed per emitting site — a future row that wants a `<kind>` placeholder for a fifth meaning is a GOV-7 closed-set extension, identical in posture to adding a category in this section.
- This whole edit is itself a GOV-7 closed-set extension to the placeholder-map declared closed in the spec; the [`governance.md`](../../spec_topics/governance.md) note that "introducing a new placeholder is a spec-versioned breaking change" applies to the placeholder names being newly enumerated, but the fix is non-breaking against any existing rendered string (the previously-undefined renderings are being pinned, not changed).

## Related Findings

- "`loom/runtime/binder-malformed-envelope` referenced but absent from the closed diagnostic registry" — same-cluster (touches the same closed-registry surface; adding that row will need its placeholders mapped under the new map this finding completes)
- "Source-language stability — Coverage of diagnostic codes not defined" — decision-dependency (the stability question for diagnostic *messages* is downstream of the closed placeholder map being complete; until the map closes, "behaviour" cannot include a stable rendered string)

---

---

## spec_topics/pi-integration-contract.md

---

# Provider error/seed-field mapping re-validation has no acceptance criterion

**Source:** docs/reviews/spec-review/spec-20260506-142846.md
**Original heading:** Provider error/seed-field mapping re-validation has no acceptance criterion
**Kind:** testability

## Finding

`spec_topics/pi-integration-contract.md` carries two normative tables that are explicitly version-coupled to `@mariozechner/pi-ai`: the **Provider error mapping** table (`anthropic-messages` / `openai-completions` / `mistral` / `amazon-bedrock` overflow signatures → `ContextOverflowError`) and the **Provider seed-field mapping** table (per-provider seed JSON field name). Both close with the same sentence — "MUST be re-validated on each upgrade" — but neither is wired to a gate.

The **Pi version bump procedure** lower in the same file enumerates a six-step contributor checklist and opens with a preamble that names exactly *four* "requires re-validating" sentences elsewhere in the spec that "all resolve to the steps below". The two table sentences above are not among the four. Step 1 (typecheck), step 2 (H1 SDK surface-inventory test), step 3 (`engines.node` floor), step 4 (`peerDependencies` literal), step 5 (capability-probe constants), and step 6 (binder strict-capability indicator) cover SDK shape, version literals, and the binder strict-capability path; none re-runs the provider-mapping fixtures or names the artefact a passing re-validation must produce for either table.

The fixture tests themselves already exist as plan-level commitments — `V5h — Provider error mapping for ContextOverflowError` enumerates one synthesised envelope per provider signature, and `V16h — Binder determinism settings` asserts the per-provider seed-field presence (`openai-completions: seed`, `mistral: random_seed`, `anthropic-messages` / `amazon-bedrock` absent). So the artefact a re-validation must produce is determinable, but the spec never names it. A contributor reading either table at bump time has no instruction beyond "re-validate" and no failure path that fires loudly the way the H1 surface-inventory test fires for capability changes.

## Spec Documents

- `spec_topics/pi-integration-contract.md` — Provider error mapping (edited)
- `spec_topics/pi-integration-contract.md` — Provider seed-field mapping (edited)
- `spec_topics/pi-integration-contract.md` — Pi version bump procedure (edited)

## Plan Impact

**Phases:** Vertical V5, Vertical V16

**Leaves (implementation order):**

- V5h — Provider error mapping for `ContextOverflowError` — (modified)
- V16h — Binder determinism settings — (modified)

## Consequence

**Severity:** correctness

A bump that changes how `@mariozechner/pi-ai` surfaces an `openai-completions` HTTP-200 overflow envelope, or that introduces a `seed` field on `anthropic-messages`, has no spec-level gate that fails loudly at the bump commit. Two bump-time contributors will diverge: one re-runs the V5h/V16h suites because they happen to be in `npm test`, the other treats "re-validate" as a manual eyeball pass and ships a stale mapping that surfaces as `TransportError` (instead of `ContextOverflowError`) at user runtime, or as a missing-determinism regression in the binder.

## Solution Space

**Shape:** single

### Recommendation

Wire both tables to the **Pi version bump procedure** in `spec_topics/pi-integration-contract.md` and bring the V5h / V16h leaves into symmetry with the H1 surface-inventory leaf:

1. Add a new step 7 to the bump procedure: *"Re-run the provider-mapping fixture tests. The V5h provider-error fixtures (one per row of the **Provider error mapping** table) and the V16h seed-field fixtures (one per row of the **Provider seed-field mapping** table) MUST pass against the candidate `@mariozechner/pi-ai` minor before merge. A red here means a recognised provider envelope or seed-field shape has changed; resolve by updating the corresponding table row and the fixture in the same edit."*
2. Update the bump-procedure preamble: change "The four 'requires re-validating' sentences elsewhere in the spec" to "The six 'requires re-validating' sentences" and extend the enumeration to include the **Provider error mapping** and **Provider seed-field mapping** sentences, anchored by the existing `provider-error-mapping` (add an anchor — none exists today) and `provider-seed-field-mapping` (anchor exists) IDs.
3. Append to the closing sentence of each table the artefact that re-validation produces: *"Re-validation passes when the V5h fixture suite is green against the candidate pi-ai minor; the procedure that gates the bump is [Pi version bump procedure](#pi-version-bump-procedure) step 7."* and the analogous wording for the seed-field table citing V16h.
4. In the `Tests.` paragraph of `plan_topics/v5-untyped-queries.md` V5h and `plan_topics/v16-binder.md` V16h, append the same boilerplate the H1 leaf already carries: *"This test is the mechanical gate cited by [Pi Integration Contract — Pi version bump procedure](../spec_topics/pi-integration-contract.md#pi-version-bump-procedure) step 7."*

Edge cases the implementer must watch:

- The closing sentence of each table currently says "version-coupled to `@mariozechner/pi-ai`" — keep that wording; the procedure step 7 covers a `pi-ai` minor change even in the lock-step case where only `pi-coding-agent` was the trigger.
- V5h's fixture set covers only the four V1-supported providers; if a future bump also widens the supported set (e.g. adds `gemini`), the new row needs both a table entry and a paired fixture in the same commit. State this co-edit obligation in the new step 7 prose.
- The seed-field table includes two "omitted" rows (`anthropic-messages`, `amazon-bedrock`); the V16h fixture already asserts absence for these, so the gate is symmetric. Do not let step 7 prose imply only the seed-supporting providers are re-validated.

## Related Findings

- "Re-validation: narrowing `peerDependencies` not covered; acceptance criterion not defined" — same-cluster (both attack missing acceptance criteria for "MUST re-validate" sentences in the bump procedure; this one targets the two provider-mapping tables, that one targets the orientation-level peer-dep narrowing case)
- "Sub-packages (`pi-agent-core`, `pi-ai`, `pi-tui`) MUST requirement has no load-bearing probe step" — same-cluster (also a missing-gate case in the SDK pin obligation surface; the pi-ai tie-in overlaps because the provider mappings are the load-bearing pi-ai surface)

