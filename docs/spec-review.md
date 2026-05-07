# Triaged Spec Review — spec.md

_Generated: 2026-05-07T07:09:02Z_
_Source: docs/reviews/spec-review/spec-20260507-064438-enriched.md_
_Spec: spec.md_
_Process: bottom-up — the last finding (T26) is addressed first; the first finding (T01) is addressed last._

_Triage tally: 9 high, 12 medium retained; 31 low discarded; 4 low findings merged into 2 medium findings; 8 nit dropped; 0 false dropped._

---

# T01 — "Final value" in opening preamble joins tail expression and `return expr` with bare "or"

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** "Final value" definition: ambiguous precedence between trailing expression and `return expr`
**Original section:** spec.md — Opening paragraphs (before `## Orientation`)
**Kind:** clarity
**Importance:** medium

## Finding

`spec.md` (paragraph at line 5) introduces the *final value* concept with the phrase:

> "evaluation also produces a *final value* — the loom's last expression or `return expr` per [Function Definitions — Final value]"

The bare "or" admits two readings: (a) one supersedes the other when both are present (in which case the spec needs to say which fires first), or (b) they are interchangeable specifications of the same value (in which case a `return expr` mid-body and a tail expression both contribute and the relationship is left undefined). Neither reading is selected here.

The cited anchor — [`functions.md#final-value-language-definition`](./spec_topics/functions.md) — does not resolve the ambiguity either. Its definition reads "the value of its tail expression (success path only), or the literal `null` per the **Empty-tail body** rule"; `return expr` is not mentioned at all under that anchor. The actual short-circuit semantics are stated only in `return.md` ("`return expr` exits the enclosing function (or top-level loom) immediately, producing `expr` as the value of that scope … From a top-level loom, `return expr` exits the loom with `expr` as its return value, exactly as a tail expression would"). So the aggregator forwards to an anchor that, by itself, omits the very interaction the aggregator gestures at.

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

## Relationships

None

---

# T02 — `SHOULD` modal on V1.x stability guarantee contradicts the deliberate "no gate" scope choice

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** "SHOULD" modal on stability guarantee is ambiguous; no CI gate
**Original section:** spec.md — Orientation > Scope > Source-language stability
**Kind:** clarity, testability
**Importance:** medium

## Finding

`spec.md` Orientation → Scope → Source-language stability states: "A `.loom` or `.warp` file that loads cleanly under V1.0 SHOULD load and behave identically under every V1.x release." The same SHOULD-shaped claim is restated in the normative owner, [governance.md GOV-13](./spec_topics/governance.md#gov-13).

This wording is in direct tension with the rest of GOV-13 and with GOV-14:

- GOV-13 itself records: "V1.0 ships without an automated equivalence gate; equivalence between two V1.x releases is a release-process responsibility verified by reviewer inspection of the diff against the prior V1.x release."
- GOV-14 prohibits reviewers from re-raising the missing gate as a V1.0 correctness finding: "The V1.0 release decision treats the absence of an automated equivalence gate as a recorded scope choice, not a defect."

Under RFC-2119, SHOULD is a normative modal — implementers and reviewers are entitled to verify it. But GOV-13 declares the only verification mechanism is human diff inspection, and GOV-14 forbids treating its absence as a defect. The SHOULD therefore promises a property that the spec has already, deliberately, chosen not to enforce. A reader cannot tell whether they are looking at (a) a normative obligation backed by some unstated test, (b) a normative obligation that the project knows it cannot check, or (c) a non-binding aspiration miscoded as RFC-2119.

The "behave identically" predicate carries the same defect — see the related finding on equivalence-class definition — but the modal-strength problem is independent and resolvable on its own.

## Spec Documents

- `spec.md` — Orientation → Scope → Source-language stability bullet (edited)
- `spec_topics/governance.md` — GOV-13 (edited)
- `spec_topics/governance.md` — GOV-14 (read-only)
- `spec_topics/future-considerations.md` — Known V1 limitations bullet on source-language migration that quotes the equivalence claim (edited)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None. No existing plan leaf encodes a GOV-13 V1.x equivalence gate, and `coverage-matrix.md` row for governance maps only to H6 / V18s (REQ-ID anchor mechanics and the coverage closure gate), neither of which would change under the recommended fix.

## Consequence

**Severity:** advisory

A reviewer following RFC-2119 reads SHOULD as a verifiable obligation; GOV-14 then forbids them from acting on its absence. Two implementers shipping V1.0 will not diverge — neither is required to do anything — but the spec contradicts itself on whether V1.x equivalence is a contract or a goal, undermining the credibility of every other RFC-2119 modal in the corpus. No observable runtime behaviour is affected.

## Solution Space

**Shape:** single

### Recommendation

Drop the RFC-2119 modal from both `spec.md` and GOV-13. Recast the claim as a non-binding intent statement that points at the release-process discipline already named in GOV-13 and the deferred conformance suite already named in `future-considerations.md`.

- `spec.md` Source-language stability bullet: replace "SHOULD load and behave identically" with non-modal phrasing, e.g. "is intended to load and behave identically … per [Governance — GOV-13](./spec_topics/governance.md#gov-13)."
- `governance.md` GOV-13: replace "SHOULD load … and produce … identical" with "is expected to load … and to produce … identical", and rename the rule from "V1.x source-language equivalence — no mechanical gate" to "V1.x source-language equivalence — release-process goal" so the rule's own title signals informative scope. Keep the (a)/(b)/(c) enumeration of observables and the wall-clock / token-count / log-volume carve-outs.
- `governance.md` GOV-14: no edit needed once GOV-13 no longer claims to be normative; the prohibition on re-raising the gate as a correctness finding becomes redundant but harmless. Leave it in place — reviewers seeing "expected to" can still try to relitigate scope.
- `future-considerations.md` migration bullet: drop "promises" verb if it presupposes normative force; "states" or "declares the goal" suffice.

Edge cases for the implementer:

- Keep GOV-13's enumeration of equivalence observables `(a) return values, (b) ordered diagnostic-code sequences, (c) loom-system-note content strings` and the wall-clock / token-count / log-volume exclusions.
- The change to GOV-13's text is substantive under GOV-8 (modal weakening is explicitly called out as substantive in `governance.md`'s worked examples). It must be modelled as retire-GOV-13-and-add-fresh-ID, not in-place edit. The fresh ID lands at the page tail per GOV-8 *Split / Deletion-plus-add*.

## Relationships

None

---

# T03 — `@mariozechner/` scope dropped from sibling-package names on first mention

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** `@mariozechner/` scope omitted for sibling packages in spec.md
**Original section:** spec.md — Orientation > Prerequisites > Pi SDK and capabilities
**Kind:** implementability
**Importance:** medium

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

## Relationships

- T04 "`^X.Y.Z` prose label \"minor-version line\" only coincides with npm caret semantics while Pi is in 0.x" — same-cluster (same Prerequisites paragraph; both edits land in adjacent prose)

---

# T04 — `^X.Y.Z` prose label "minor-version line" only coincides with npm caret semantics while Pi is in 0.x

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** `^X.Y.Z` labeled "minor-version line" conflicts with npm caret semantics
**Original section:** spec.md — Orientation > Prerequisites > Pi SDK and capabilities
**Kind:** clarity, completeness
**Importance:** medium

## Finding

`spec.md` (Orientation > Prerequisites > Pi SDK and capabilities) and `spec_topics/pi-integration-contract.md` (Host prerequisites — Pi SDK pin) both describe the lock-step rule across `pi-coding-agent`, `pi-agent-core`, `pi-ai`, and `pi-tui` as pinning all four to "the same `^X.Y.Z` minor-version line." The `peerDependencies` literal-read test in `plan_topics/h1-scaffold.md` enforces the literal `"^0.72.1"` for each entry. The prose label and the operator disagree in the general case: npm's `^X.Y.Z` is a *major-version* range (`>=X.Y.Z, <(X+1).0.0`) when X ≥ 1, a *minor-version* range (`>=X.Y.Z, <X.(Y+1).0`) when X = 0 and Y ≥ 1, and a *patch-pinned* range (`>=X.Y.Z, <X.Y.(Z+1)`) when X = Y = 0. Only the middle case — which happens to match the current `^0.72.1` pin — produces "minor-version line" semantics.

This matters in two directions. First, an implementer reading the abstract `^X.Y.Z` template alongside the prose "minor-version line" cannot tell which constraint is normative: the prose says minor-line, the operator says (in the general case) major-line, and the only thing reconciling them is the unstated invariant "we are currently in 0.x." Should the spec ever change one without the other, lock-step intent silently widens. Second, when `pi-coding-agent` crosses to `1.0`, the same `^X.Y.Z` template — interpreted literally and copied forward to `^1.Y.Z` — becomes a major-pinned range that permits all four `peerDependencies` to drift across minor lines independently, which is precisely the skew the lock-step rule exists to forbid. The Pi version bump procedure (PIC, *Pi version bump procedure*, step 4) instructs contributors to "update the version pin in `peerDependencies` and the equivalent literal here" but never names the operator (`^` vs `~`) or the major-zero hazard, so a contributor following the checklist on the day Pi releases `1.0.0` would write `^1.0.0` and break the invariant the spec claims to enforce.

The current `^0.72.1` pin is not itself broken — it produces the intended `>=0.72.1, <0.73.0` range — and contrary to the original review note, npm does not interpret `^0.72.1` as patch-pinned (patch-pinning applies only to `^0.0.Z`). The defect is that the spec describes a behavioural contract ("same minor-version line") in terms of an operator (`^`) whose semantics happen to match only by accident of being in major-zero with a non-zero minor.

## Spec Documents

- `spec.md` — Orientation > Prerequisites > Pi SDK and capabilities (edited)
- `spec_topics/pi-integration-contract.md` — Host prerequisites #1 (Pi SDK pin) (edited)
- `spec_topics/pi-integration-contract.md` — Pi version bump procedure, step 4 (edited)
- `package.json` — `peerDependencies` block (edited)

## Plan Impact

**Phases:** Horizontal H1

**Leaves (implementation order):**

- H1 — Repository scaffold and test framework — (modified)

The `peerDependencies` literal-read test and the `peer-dep-range` entry of `SDK_SURFACE_INVENTORY` (both in `plan_topics/h1-scaffold.md`) assert the literal `"^0.72.1"`. The operator change to `~` requires updating both the constant and the test literal in lockstep with the spec edit.

## Consequence

**Severity:** correctness

Today the contract holds by coincidence: `^0.72.1` resolves to the intended minor-pinned range. The defect is latent — at the next major-zero exit (`pi-coding-agent 1.0.0`) a contributor following the documented bump procedure mechanically copies `^0.Y.Z → ^1.Y.Z` and silently converts a minor-line pin into a major-line pin, allowing the four `peerDependencies` to drift independently. The lock-step invariant the spec claims to enforce mechanically becomes unenforced; install-time skew across `pi-coding-agent`, `pi-agent-core`, `pi-ai`, `pi-tui` becomes possible without any spec, test, or probe firing.

## Solution Space

**Shape:** single

### Recommendation

Switch the operator to `~` and update the prose to match. Replace `^X.Y.Z` with `~X.Y.Z` in both spec sites and in `package.json`'s four `peerDependencies` entries. The `~` operator's semantics are uniform across all major versions: `~X.Y.Z := >=X.Y.Z, <X.(Y+1).0`. Keep the prose label "minor-version line."

**Spec edits.**
- `spec.md` Prerequisites: `^X.Y.Z` → `~X.Y.Z`.
- PIC Host prerequisites #1: `^X.Y.Z` → `~X.Y.Z`; the four anchor citations of `^0.72.1` become `~0.72.1`.
- PIC Pi version bump procedure step 4: no wording change required (the operator is now stable across the 0.x → 1.x transition).
- `package.json`: four entries change from `"^0.72.1"` to `"~0.72.1"`; `typebox: "*"` unchanged.
- H1 leaf: `peer-dep-range` literal in `SDK_SURFACE_INVENTORY` and the `peerDependencies` literal-read assertion both change to `"~0.72.1"`.

Operator semantics now match the prose unconditionally — no major-zero coincidence. Survives the `1.0.0` transition without contributor action. The mechanical gates (literal-read test, surface-inventory constant) continue to enforce the invariant after Pi reaches 1.0 with no further spec change. The resolved range under `^0.72.1` and `~0.72.1` is identical for the current pin (`>=0.72.1, <0.73.0`), so the change is mechanical with no behavioural risk today.

Edge cases for the implementer:

- The H1 `peerDependencies` literal-read test and the `peer-dep-range` entry of `SDK_SURFACE_INVENTORY` must change literals in the same commit as `package.json`; splitting these leaves the H1 test red on `main`.
- The four `@mariozechner/*` entries must move together; `typebox: "*"` is unaffected and remains asserted by its own one-line literal-read assertion per PIC Host prerequisites #1.
- The `^0.72.1` example literal in PIC's opening sentence and at the renderer-registration / `ExtensionContext` paragraphs must be updated to `~0.72.1` in the same commit.

## Relationships

- T03 "`@mariozechner/` scope dropped from sibling-package names on first mention" — same-cluster (same Prerequisites paragraph; co-located edits)
- T26 "`semver` not declared as a production dependency in `package.json`" — same-cluster (adjacent `package.json` defect; co-located edit window)

---

# T05 — Item 8 of binder system-prompt structure has no testable surface

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** System-prompt instruction for defaulted parameters is not testable
**Original section:** spec_topics/binder.md
**Kind:** testability
**Importance:** medium

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

## Relationships

None

---

# T06 — `cause` vs `reason` sub-discriminator fields inconsistent across error variants

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** `cause` vs `reason` sub-discriminator fields inconsistent across error variants
**Original section:** spec_topics/errors-and-results.md
**Kind:** naming
**Importance:** medium

## Finding

Three `QueryError` variants in `spec_topics/errors-and-results.md` carry a wire-level field that refines the top-level `kind` discriminator into a finer-grained sub-category, but the field is named two different things:

- `ValidationError.cause: "schema_validation" | "empty_template"`
- `CodeToolError.cause: "validation" | "execution" | "cancelled" | "unknown_tool"`
- `InvokeInfraError.reason: "load_failure" | "parse_failure" | "validation" | "panic" | "internal_error"`

The semantic role is identical in all three cases — a closed enum that partitions a single `kind` into design-level sub-arms that authors `match` on when they need arm-specific recovery. No other `QueryError` variant carries a sub-discriminator, so these three define the entire population.

The spec acknowledges the split in passing — the `ValidationError` body says `"consistent with the established `CodeToolError.cause` / `InvokeInfraError.reason` patterns"` — but that aside is the only place the divergence is mentioned, and it does not justify the choice. There is no glossary note, no naming convention page, and no rule that says "infra-class envelopes use `reason`, content-class envelopes use `cause`" (or any other rationale that would predict which name a future fourth variant should pick). Authors writing `match` patterns must memorise the variant-by-variant mapping, and a future variant author has no rule to consult.

## Spec Documents

- `spec_topics/errors-and-results.md` — `QueryError variants` (edited)
- `spec_topics/glossary.md` — new entry (edited)
- `spec_topics/invocation.md` — Failures section, references to `InvokeInfraError { reason: ... }` (edited)
- `spec_topics/query.md` — Failure-mode references to `ValidationError.cause` arms (read-only)
- `spec_topics/tool-calls.md` — Failures section, references to `CodeToolError { cause: ... }` (read-only)
- `spec_topics/cancellation.md` — references to `InvokeInfraError { reason: "panic" }` and the `CodeToolError { cause: "cancelled" }` arm (edited)

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

## Consequence

**Severity:** advisory

Authors must memorise which of two field names a given variant carries when writing `match` arms; a wrong-field destructure (e.g. `InvokeInfraError { cause: "panic" }`) does not match — under the V1 pattern grammar an unmet listed field is a non-match, not a parse error — so the arm silently falls through and authors hit a `MatchError` panic at runtime instead of getting an early signal. The runtime is unambiguous and conformant in either naming, so no observer divergence; the cost is author cognitive load and a recurring footgun for every new author and every new sub-discriminated variant added in V1.x.

## Solution Space

**Shape:** single

### Recommendation

Standardise to `cause` across all three variants. Rename `InvokeInfraError.reason` to `InvokeInfraError.cause` on the wire and in every spec / plan reference. The enum values stay unchanged. Add a one-sentence glossary entry for `cause` defining it as "the closed sub-discriminator that refines a `QueryError.kind` into design-level sub-arms; every variant whose `kind` partitions into multiple causes carries this field."

**Spec edits.**
- `errors-and-results.md`: rename the `reason` field on the `InvokeInfraError` schema; rewrite the in-body aside to drop the `/ InvokeInfraError.reason` half; update the Runtime panics paragraph (two occurrences of `reason: "panic"` and `reason: "internal_error"`).
- `invocation.md`, `cancellation.md`: rewrite every `InvokeInfraError { reason: ... }` reference.
- `glossary.md`: add a `cause` entry per above.

Two of three variants already use `cause`; the rename moves the minority, not the majority. The label "cause" reads more naturally for a sub-category-of-failure role than "reason," which is also overloaded with the runtime-event `reason` field on `resources_discover` (V14t). A single name is the only convention that scales without further glossary maintenance as future variants land.

The wire-format change is acceptable at this stage — the spec is pre-V1 and there is no shipping wire contract to break. The risk is editorial drift (missing one of the call-site references in `invocation.md` / `cancellation.md`); a coverage-matrix grep for `reason\s*:` constrained to `InvokeInfraError` contexts catches stragglers. The wire `kind: "invoke_failure"` discriminator stays unchanged (only the inner sub-discriminator field name moves), so all `match` arms keyed on `kind` are unaffected.

## Relationships

None

---

# T07 — `loom/parse/explicit-schema-mismatch`: "disagree" not anchored to the type compatibility relation

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** `loom/parse/explicit-schema-mismatch` "disagree" undefined against type compatibility relation
**Original section:** spec_topics/query.md
**Kind:** testability
**Importance:** medium

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

**Shape:** single

### Recommendation

Pin "disagree" to non-subtype under the established `⊑` relation. Replace "disagree" in both sites with: "the explicit `<Schema>` ascription is not compatible with the binding annotation under [Type System — Type compatibility](./type-system.md#type-compatibility) — i.e. `ascription ⋢ annotation`." Keep the warning severity. Add at least two normative test vectors to `query.md`: one no-warning case (`let x: number = @<integer>\`...\`?` — fires no warning, by Type-compatibility rule 2: `integer ⊑ number`), one warning case (`let x: integer = @<number>\`...\`?` — fires the warning; the explicit `number` could yield `3.5`, which the `integer` binding cannot accept).

**Spec edits.** `query.md` Explicit-form paragraph; `diagnostics.md` Description column for the row; `query.md` add a "Test vectors" subsection or inline pair.

This reuses the single normative relation already cited from every other compatibility site (`invoke` return, `match` arms, function arguments). It eliminates the "warning fires on a safe widening" surprise and is symmetric with `loom/parse/invoke-return-type-mismatch`.

Implementer edge cases:

- The check is parser-time; when either side is past the parser's static view (the `Unresolvable operands` paragraph in `type-system.md`), the warning is skipped — runtime AJV remains the safety net.
- Both directions `⊑` should be considered: the canonical "warn" condition is `ascription ⋢ annotation` (the value the explicit form produces could not be assigned through the annotation). The reverse (`annotation ⋢ ascription`) is not the warning condition — the binding annotation is the wider type by intent.
- Update the V6h leaf's **Tests** bullet to cite the same Type-compatibility anchor and to include the no-warning widening vector (otherwise the test will encode the strict-identity reading by default).

## Relationships

None

---

# T08 — Per-`package.json` read timeout: overrun is unbounded

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** Per-`package.json` read timeout: overrun is unbounded
**Original section:** spec_topics/discovery.md
**Kind:** testability
**Importance:** medium

## Finding

`spec_topics/discovery.md` (Edge cases bullet under "Package discovery") states that the `looms.scanPackagesTimeoutMs` cap is checked "*before each new candidate-package read attempt*; a single very slow read is not aborted mid-flight (deferred hardening)." The two `looms.scanPackages*` caps therefore only bound the number of *completed* reads and the elapsed wall-clock measured *between* reads — they place no upper bound on the time a single in-flight `package.json` open/read may consume.

The practical consequence is that a discovery walk can hang indefinitely on a single slow read (a stalled NFS mount, a FUSE filesystem with a wedged backing process, an EBS volume mid-failover, an antivirus driver holding an open). Because this read is performed during `session_start` (the `resources_discover` handler installed by V14t and exercised by V14m), an indefinite hang blocks slash-command registration for the whole session — not just the offending package — and the operator gets no `loom/load/discovery-slow` warning, because the cap-check site never fires while the read is suspended.

The deferral is also untestable as currently written. V14m's test list includes a `FakeClock`-driven case that "exceeds `looms.scanPackagesTimeoutMs` … stepped between candidate-package read attempts to push elapsed `Clock.now()` past the cap" — which exercises the cap *in the same shape the spec admits is the limitation*, not the slow-read case. Without a normative statement of overrun behaviour (a per-read deadline, or an explicit "no bound, tests MUST NOT assert" carve-out), conformance test authors cannot tell whether a 10-minute hang on a single read is a defect, an acceptable consequence of the deferral, or a violation of the `looms.scanPackagesTimeoutMs` contract.

## Spec Documents

- `spec_topics/discovery.md` — Package discovery → Edge cases bullet (the "package walk is bounded" paragraph) (edited)
- `spec_topics/diagnostics.md` — `loom/load/unreadable-source` registry row (edited)
- `spec_topics/pi-integration-contract.md` — `Clock` / `FakeClock` interface (read-only; the seam any per-read deadline implementation builds on already exists)

## Plan Impact

**Phases:** Vertical V14

**Leaves (implementation order):**

- V14m — Discovery: package `looms/` and `pi.looms` — (modified)

The V14m **Adds** paragraph already names the two caps and the opt-out; under the recommended fix the prose grows by one clause (per-read deadline) and the **Tests** list grows by one case. No other plan leaf grep-matches the per-read-timeout concept; V14n / V14o reuse the *settings file* read mechanism, not the package-walk read mechanism, so they are unaffected.

## Consequence

**Severity:** correctness

A single hung `package.json` read on a slow or wedged filesystem can block `session_start` indefinitely, preventing every loom (not just the offending package's) from registering and producing no `loom/load/discovery-slow` warning to tell the operator what happened. Two reasonable implementations will diverge: one will wrap reads in a deadline and surface a recoverable diagnostic, the other will trust the OS and hang. The spec currently sanctions both.

## Solution Space

**Shape:** single

### Recommendation

Add a per-`package.json` read deadline derived from the global cap: `max(200 ms, floor(looms.scanPackagesTimeoutMs / 10))` (so the default `2000 ms` cap yields a `200 ms` per-read deadline; an operator who raises the global cap automatically raises the per-read budget). Each candidate read is wrapped in `Promise.race([read, Clock.setTimeout(deadline)])`; on timeout the in-flight read is abandoned (no cancellation contract on `fs.readFile` is required — the handle is dropped and GC'd), the package is treated as unreadable for this scan, a `loom/load/unreadable-source` warning is emitted naming the package and the per-read-deadline cause, and the walk continues with the next candidate.

**Spec edits.**
- Replace the "deferred hardening" parenthetical in `discovery.md`'s Edge cases bullet with the per-read-deadline rule, naming the formula and the diagnostic.
- Add a sentence to the `loom/load/unreadable-source` registry row in `diagnostics.md` listing the per-read deadline as one of its causes, with a `details.kind = "package-read-timeout"` discriminator and a message template like `package '<name>' package.json read exceeded <deadline>ms during package discovery`.
- No new settings key; the per-read deadline is derived, not configurable, in V1.

This closes the indefinite-hang hole, reuses the existing `Clock` seam V14m already depends on, and is testable with the `FakeClock` infrastructure H2 ships. The derivation `max(200 ms, floor(looms.scanPackagesTimeoutMs / 10))` keeps the operator surface (one settings key, two caps) unchanged.

Implementer must watch:

- The abandoned read's Promise will eventually resolve or reject; the runtime MUST attach a `.catch(() => {})` to silence unhandled-rejection warnings without re-routing the late result back into the discovery pass.
- The per-read timer MUST be scheduled through the injected `Clock.setTimeout` (not the global `setTimeout`), or the `FakeClock` test in V14m's list cannot drive it deterministically.
- When the deadline fires, the package is treated as unreadable for *this scan only* — a subsequent reload must re-attempt, not cache the timeout outcome — matching the existing rule that `loom/load/unreadable-source` is per-pass.
- If the per-read deadline fires but the global `looms.scanPackagesTimeoutMs` would also have tripped on the next iteration, the per-read warning is emitted first and the global `loom/load/discovery-slow` warning still fires from the cap-check site at the next candidate (no suppression rule needed).

## Relationships

None

---

# T09 — Schema-hash identifier is referred to by six surface names; none are in the glossary

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** "slug" and "Canonical schema hash" are two names for the same concept; neither is in the glossary
**Original section:** spec_topics/glossary.md
**Kind:** naming
**Importance:** medium

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

Each leaf cites the schema-hash identifier under one of the surface forms above. All are *modified* (terminology sweep in `Adds` / `Tests` prose); none are *blocked* — the underlying mechanism is fully specified.

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

## Relationships

None

---

# T10 — Hard-ceiling interaction: no rule for which surface fires when two ceilings could trip on the same event

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** Hard-ceiling interaction (two ceilings tripped on the same event): no precedence rule
**Original section:** spec.md — Orientation > Scope > Hard runtime ceilings
**Kind:** error-model
**Importance:** medium

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

## Relationships

- T12 "`invoke`-chain depth-32 cap: counting origin and subagent-mode boundary semantics undefined" — decision-overlap (precedence rule needs to know which event the depth cap trips on; pinning the breach inequality there makes "the 32nd-deep `invoke` also exhausts the binder LLM-call cap" precisely answerable)
- T15 "Ceiling #3 (binder LLM-call cap) is misclassified across the hard-ceilings aggregator" — co-resolve (both rest on tightening which ceilings can produce evaluation outcomes)

---

# T11 — `loom-system-note` messages re-enter model context as `user`-role text

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** `loom-system-note` channel: Pi serialization contract not pinned (messages re-entering model context)
**Original section:** spec.md — Orientation > Prerequisites > Host runtime
**Kind:** assumptions
**Importance:** high

## Finding

The spec routes every operator-facing diagnostic — parse, load, type, runtime-panic batches; binder failures; always-log runtime events; structural watcher notes — through a single `pi.sendMessage({ customType: "loom-system-note", … }, { triggerTurn: false })` call (PIC §**System notes**), and asserts in `spec_topics/errors-and-results.md` that pre-evaluation failures "surface per [Diagnostics] on the `loom-system-note` channel, never produce appended turns or a final value." `triggerTurn: false` is treated as the load-bearing guarantee that these notes do not perturb the model.

Pi's actual contract is the opposite of what that wording invites the reader to assume. `pi.sendMessage(..., { triggerTurn: false })` only suppresses the *immediate* turn fire; the message is still appended to the session as a `CustomMessage` (role `"custom"`). On every subsequent provider call, Pi's `convertToLlm` transformer (`@mariozechner/pi-coding-agent` `dist/core/messages.js`, the `case "custom":` arm) maps each `CustomMessage` to a fresh `{ role: "user", content }` entry — unconditionally, ignoring `display`, with no opt-out flag analogous to `BashExecutionMessage.excludeFromContext`. The cumulative effect: every parse error, binder failure, AJV-validation note, runtime panic note, and `display: false` always-log event the runtime emits is silently injected as user-authored text into the next turn the user sends in their bare Pi session.

This subverts several spec invariants without being visible at the spec surface. (a) The "subagent-private" claim for subagent-mode `display: false` cascades holds inside the subagent session but the parent's `display: true` cascade still leaks the panic prose into the user session's model context. (b) The `loom-system-note` becomes a hidden injection vector — a malformed loom file emits diagnostics that the model then reads as if the user had typed them. (c) Compaction and context-budget accounting now include diagnostic prose the spec implicitly treats as out-of-band. PIC nowhere pins what Pi does with custom-channel messages on subsequent provider calls; the reader (and the implementer) is left to assume `triggerTurn: false` means "side channel, not in context," which it does not.

## Spec Documents

- `spec_topics/pi-integration-contract.md` — **System notes** / **Delivery surface** / **Runtime event channel** / SDK capability 6 (edited)
- `spec_topics/errors-and-results.md` — pre-evaluation failure paragraph using "never produce appended turns" wording (edited)
- `spec_topics/diagnostics.md` — channel description and renderer/fallback section (edited)
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

(The `sendSystemNote` helper in H4 is the single chokepoint; H3, V18i, V18q, V18r, V18m all emit through it.)

## Consequence

**Severity:** correctness

The runtime as specified leaks diagnostic prose into the user's bare-Pi conversation context as user-role text on every turn after a `loom-system-note` is emitted. Two implementers reading the spec will diverge: one will trust the "never produce appended turns" wording and ship the leak; another will probe Pi's `convertToLlm` and either route notes elsewhere or add a Pi-side workaround. The leak is silent, accumulates across a session, and turns parse errors and panic messages into adversarial-injection surface for the model.

## Solution Space

**Shape:** single

### Recommendation

Document the leak honestly for V1 and pursue a Pi-SDK enhancement (`CustomMessage.excludeFromContext` field, mirroring `BashExecutionMessage.excludeFromContext`) as a fast-follow.

Concrete V1 spec edits:

1. In `errors-and-results.md`, replace "never produce appended turns or a final value" with "do not fire a new turn (`triggerTurn: false`) and produce no final value; the note enters subsequent provider calls as a `user`-role transcript entry per Pi's `convertToLlm` transform — see [PIC §Delivery surface]."
2. In PIC §**Delivery surface**, add a paragraph: "Custom-message channel persistence and LLM-context entry. Per `@mariozechner/pi-coding-agent`'s `dist/core/messages.js` `convertToLlm` transformer, every `CustomMessage` (including `loom-system-note`) is converted to `{ role: "user", content }` on every subsequent provider call. `triggerTurn: false` suppresses the immediate turn fire only; it does not exclude the message from the LLM context window. The `display` flag controls renderer behaviour, not serialization. Loom diagnostics therefore enter the user-session model context durably and contribute to `ctx.getContextUsage()` and compaction decisions. Operators authoring looms should expect parse errors, binder failures, panic notes, and always-log runtime events emitted in a session to be visible to subsequent model turns."
3. In PIC §**Runtime event channel**, add: "`display: false` gates only renderer visibility; the underlying `CustomMessage` still enters subsequent provider calls per **Delivery surface** above. Operators MUST treat all `loom-system-note` content (regardless of `display`) as durable session-context input."
4. Open a Pi-side issue requesting a `CustomMessage.excludeFromContext` field mirroring `BashExecutionMessage.excludeFromContext`. When Pi ships it, file a follow-up spec change to bump the SDK floor and set `excludeFromContext: true` on the canonical call.

This is the honest baseline; the spec must stop claiming "never produce appended turns" because Pi's `convertToLlm` contradicts it. A channel-split alternative (using `ctx.ui.notify` plus `ctx.sessionManager.appendCustomEntry`) would lose the inline transcript rendering and is too steep a UX regression for V1.

Edge cases the implementer must watch:

- The H4 `sendSystemNote` helper currently has no `excludeFromContext` parameter; the V1 helper signature stays unchanged.
- The H4 fallback-chain step that emits `loom/runtime/system-note-delivery-failed` via the diagnostics channel must not invoke `pi.sendMessage` again (existing re-entry guard); under this disposition this is unchanged.
- Subagent-mode `display: true` cascades land in the parent user session's transcript and therefore in the parent user session's model context — the spec must not promise subagent-private behaviour for the parent surface.
- Compaction sees these entries as ordinary `user` messages; nothing distinguishes them from real user input in token-accounting.

## Relationships

None

---

# T12 — `invoke`-chain depth-32 cap: counting origin and subagent-mode boundary semantics undefined

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** Invoke-chain depth 32: counting convention and subagent boundary interaction not stated
**Original section:** spec.md — Orientation > Scope > Hard runtime ceilings
**Kind:** completeness
**Importance:** high

## Finding

`spec.md` and [`invocation.md` — Invocation depth bound](./spec_topics/invocation.md) state that "the interpreter caps the nesting depth of an `invoke` chain at **32**, counting both direct `invoke(...)`, `.loom` callable calls through `tools:`, and `.warp` `fn` invokes (the count is per-chain, not per-process — sibling invokes do not share budget)." Two independent contracts are missing from this paragraph:

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

## Relationships

- T10 "Hard-ceiling interaction: no rule for which surface fires when two ceilings could trip on the same event" — decision-overlap (precedence rule needs to know which event the depth cap trips on; pinning the breach inequality here makes "the 32nd-deep `invoke` also exhausts the binder LLM-call cap" precisely answerable)
- T13 "`tool_loop.max_iterations`: validation rules and diagnostic surface unspecified" — same-cluster (parallel completeness gap on a sibling ceiling)

---

# T13 — `tool_loop.max_iterations`: validation rules and diagnostic surface unspecified

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** `tool_loop.max_iterations`: bounds, validation, and configurability unspecified
**Original section:** spec.md — Orientation > Scope > Hard runtime ceilings
**Kind:** completeness, prescription
**Importance:** high

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
- The new `loom/load/frontmatter-value-out-of-range` code must be added to `diagnostics.md` with a `<dotted-key>` placeholder rendered byte-identically; otherwise it inherits the testability gap that affects unenumerated diagnostic placeholders generally.

## Relationships

- T12 "`invoke`-chain depth-32 cap: counting origin and subagent-mode boundary semantics undefined" — same-cluster (parallel completeness gap on a sibling ceiling)
- T15 "Ceiling #3 (binder LLM-call cap) is misclassified across the hard-ceilings aggregator" — same-cluster (same Hard runtime ceilings bullet)

---

# T14 — Pre-evaluation failure enumeration: inline restatement in preamble, list never marked closed at owner

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** Pre-evaluation failure enumeration: normative content in preamble, list not closed
**Original section:** spec.md — Opening paragraphs (before `## Orientation`)
**Kind:** placement, completeness
**Importance:** medium

## Finding

The second paragraph of `spec.md`'s pre-`## Orientation` preamble carries this passage verbatim:

> Failures that occur *before* evaluation begins — host-incompatibility detected by the capability probe, lex / parse / type batches, frontmatter rejection, binder-model resolution failure, `tools:` resolution failure, watcher-time reload failures — are NOT evaluation outcomes; they surface per [Diagnostics](./spec_topics/diagnostics.md) on the `loom-system-note` channel, never produce appended turns or a final value, and are not subject to cancellation.

The same six-item enumeration and the same routing assertions appear, almost word-for-word, in `spec_topics/errors-and-results.md` immediately under the **Terminal outcomes** anchor (line 58). That topic-page paragraph is the canonical owner: it sits inside the section that GOV-12 already cites as the `## Errors and Results — Terminal outcomes` rule and is two lines below the closure phrase `the set is closed:` for the trichotomy.

Two distinct defects follow:

1. **Undeclared aggregator.** GOV-12 enumerates the spec.md aggregator surfaces by name. The pre-evaluation failure list is not in that enumeration, yet the preamble paragraph behaves like an aggregator — it restates the routing rule (`loom-system-note` channel, no appended turns, no cancellation) inline rather than confining itself to a forward-link.

2. **Closure absent at the owner.** Neither the preamble version nor the canonical `errors-and-results.md` version states that the six items are exhaustive. A reviewer encountering a seventh failure mode (path collision between `.loom` files, secret-store unavailability at frontmatter resolution, watcher-startup failure distinct from reload failure, manifest-load failure for the binder model registry, etc.) cannot determine from either page whether it joins the bucket or constitutes an unanchored case. Closure of the trichotomy itself is asserted ("the set is closed"); closure of the pre-evaluation bucket is not.

## Spec Documents

- `spec.md` — pre-`## Orientation` preamble, paragraph 2 (`Loom evaluation produces one of three terminal outcomes…`) (edited)
- `spec_topics/errors-and-results.md` — `<a id="terminal-outcomes"></a>` block, sentence beginning `The trichotomy applies only once evaluation has begun.` (edited)
- `spec_topics/diagnostics.md` — read-only (referenced as the diagnostic-code owner that the pre-evaluation bucket routes through)

## Plan Impact

**Phases:** Horizontal H6

**Leaves (implementation order):**

- H6 — REQ-ID anchor insertion and coverage-matrix re-pivot — (modified)

H6 already plans to retarget every `spec.md` introduction link from a section anchor to a `#prefix-n` REQ-ID anchor. Resolving this finding tightens that carve-out: the preamble paragraph collapses to a single `[Errors and Results — Terminal outcomes](#err-N)` link, which H6 then retargets to the closed-list REQ-ID once it lands.

## Consequence

**Severity:** advisory

A maintainer who later adds a seventh pre-evaluation failure mode has no signal from either page that the list was meant to be closed, so the new mode may be added in one place and not the other. A reviewer attempting to classify a novel runtime failure cannot decide from `errors-and-results.md` alone whether it belongs in the pre-evaluation bucket or constitutes a missing case. The implementation is unaffected — every individual diagnostic code is owned and tested elsewhere.

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

2. **In `spec.md` preamble** — replace the inline restatement with a single forward-link sentence:

   > Failures that occur before evaluation begins are owned, with their closed enumeration and per-cause routing rule, by [Errors and Results — Terminal outcomes](./spec_topics/errors-and-results.md#terminal-outcomes); they never become evaluation outcomes.

   No item names, no channel name, no cancellation assertion in the preamble.

Edge cases the implementer must watch:

- The preamble paragraph still carries the trichotomy itself, the cancellation-wiring claim, and the partial-append claim. Each of those is a separate concern; do not collapse the whole paragraph to a single link in this edit. Touch only the `Failures that occur *before* evaluation begins…` sentence.
- H6's introduction-link gate greps for `./spec_topics/<non-narrative-page>.md#<non-prefix-anchor>` residue. After this edit the preamble paragraph contains exactly one such link (the new forward-link to `#terminal-outcomes`), which H6 will then retarget to the REQ-ID anchor it assigns to the closed-list rule on `errors-and-results.md`.

## Relationships

- T15 "Ceiling #3 (binder LLM-call cap) is misclassified across the hard-ceilings aggregator" — co-resolve (the same pre-evaluation list is the target of both fixes; closing the list and adding binder-cap exhaustion can land in one edit)

---

# T15 — Ceiling #3 (binder LLM-call cap) is misclassified across the hard-ceilings aggregator

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** Ceiling #3 (Binder LLM cap) is misclassified on multiple axes — consistency failure
**Original section:** spec.md — Orientation > Scope > Hard runtime ceilings
**Kind:** consistency, cross-spec-consistency-broad
**Importance:** high

## Finding

The "Hard runtime ceilings" bullet in `spec.md` (Orientation > Scope) lists four items meant to share a structural shape — each is a hard upper bound whose breach has a distinct, observable failure surface. Ceiling #3 (the binder LLM-call cap) does not belong to that shape and is misclassified on four interlocking axes.

1. **Category name vs. content.** The category is "Hard *runtime* ceilings," but ceiling #3 fires at slash-invocation load time, before evaluation begins. Its own bullet says so explicitly: "load-time system note. The loom does not start." It is not a runtime event in the sense the other three ceilings are.

2. **Trichotomy contradiction.** The opening paragraph of `spec.md` lists "exhausting one of the [Hard runtime ceilings] below" as a way evaluation reaches the *fail* arm of the success/fail/cancelled trichotomy. Ceiling #3 then says the opposite: "Not an evaluation outcome — nothing reaches loom code, no `Result` value is observable." The hedging clause "those ceilings split across distinct routing classes … the per-ceiling failure class is named at the bullet" is not strong enough to dissolve the contradiction.

3. **Pre-evaluation enumeration gap.** The pre-evaluation failure list in paragraph 3 of `spec.md` (and verbatim in `errors-and-results.md#terminal-outcomes`) enumerates six pre-evaluation failures. It does not include binder LLM-call exhaustion. Ceiling #3 thus has no home: the runtime-ceilings bullet says it is not an evaluation outcome, and the load-time list omits it.

4. **Cross-spec gloss hides the per-class structure.** The aggregator gloss "Binder LLM-call cap (3 per slash invocation)" reads as a single flat counter. `binder.md` actually defines two independent per-class retry budgets: at most one transport-failure retry and at most one malformed-envelope retry per slash invocation, with AJV failures not retried. The "3" is the algebraic worst-case sum (1 initial + 1 transport-class retry + 1 malformed-envelope-class retry). The user-visible system-note rendered on exhaustion comes from the *most recent* failure's class template, not from a generic "cap exceeded" template — which an implementer reading only the aggregator would not realise. Two reasonable implementers can diverge: one builds a single counter that fires a generic exhaustion note at the third call regardless of class; the other builds two per-class counters and renders the most-recent-failure template. Only the second matches `binder.md`.

## Spec Documents

- `spec.md` — Opening paragraph (terminal-outcomes clause and pre-evaluation failure list) (edited)
- `spec.md` — Orientation > Scope > Hard runtime ceilings (edited)
- `spec_topics/errors-and-results.md` — `terminal-outcomes` section (edited; same trichotomy/load-time wording is mirrored here and must move in lockstep)
- `spec_topics/binder.md` — `failure-mode-templates-normative` (read-only; source of truth for the per-class budget structure)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None. The fix is entirely aggregator-level prose. V16n (transport-failure single retry), V16o (malformed-envelope single retry), and V16p (AJV no-retry) already implement the per-class structure that `binder.md` defines, and their **Adds** / **Tests** wording already routes through the per-class failure-mode templates — none of those leaves' acceptance criteria need to change.

## Consequence

**Severity:** correctness

An implementer reading only the aggregator can build the wrong cap (a flat counter with a generic exhaustion note instead of two per-class counters with the most-recent-class template) and the wrong outcome routing (returning an `Err` to loom code instead of refusing to start the loom). A reviewer or test author also cannot cite the binder cap by stable handle without resolving four conflicting framings.

## Solution Space

**Shape:** single

### Recommendation

Make four edits, all to the aggregator-level text. The per-class behaviour in `binder.md` is correct and stays untouched.

1. **Rename the category and split out the load-time ceiling.** Rename the bullet from "Hard runtime ceilings" to "Hard ceilings" (drop "runtime"). Re-order the four items so that ceilings #1, #2, #4 stay together as runtime ceilings and ceiling #3 (binder cap) is presented under a separate sub-heading or annotation marking it as load-time.

2. **Restrict the trichotomy clause in the opening paragraph.** Change "exhausting one of the [Hard runtime ceilings] below" to "exhausting one of the runtime-class hard ceilings below (ceilings whose routing class is panic or `Err`; the load-time binder cap is excluded — see ceiling #3 and the pre-evaluation failure list above)." Mirror the same carve-out in `errors-and-results.md#terminal-outcomes` under the **Failure** bullet.

3. **Add binder-cap exhaustion to the pre-evaluation failure enumeration.** In `spec.md` paragraph 3 and in `errors-and-results.md#terminal-outcomes`, add "binder LLM-call exhaustion" between "binder-model resolution failure" and "`tools:` resolution failure". This places ceiling #3 in the only list that already routes load-time failures to `loom-system-note`.

4. **Restate ceiling #3 using `binder.md`'s per-class framing.** Replace the parenthetical "(3 per slash invocation)" with: "Binder per-class retry budget — at most one transport-failure retry and at most one malformed-envelope retry per slash invocation; AJV-on-`args` failures are not retried (worst-case sum: 3 binder LLM calls); the loom does not start, the operator-facing note is rendered from the failure-mode template matching the *most recent* failure's class — see [Slash-Command Argument Binding — Failure-mode templates](./spec_topics/binder.md#failure-mode-templates-normative)."

Edge cases the implementer must watch:

- The two per-class budgets interleave: a transport failure observed on the retry of a malformed envelope consumes the transport budget, and vice versa (`binder.md` already specifies this; the aggregator must not contradict it by implying a flat counter).
- Cancellation observed during any retry suppresses that retry and surfaces the cancelled-binder template, irrespective of which budget remains.
- The pre-evaluation failure list is referenced from two places (`spec.md` paragraph 3 and `errors-and-results.md#terminal-outcomes`); both must be updated together to keep the aggregator-vs-source lock-step rule (GOV-12) honest.

## Relationships

- T14 "Pre-evaluation failure enumeration: inline restatement in preamble, list never marked closed at owner" — co-resolve (same pre-evaluation list edit; closing the list and adding binder-cap exhaustion can land in one edit)
- T13 "`tool_loop.max_iterations`: validation rules and diagnostic surface unspecified" — same-cluster (same Hard runtime ceilings bullet)
- T10 "Hard-ceiling interaction: no rule for which surface fires when two ceilings could trip on the same event" — co-resolve (both rest on tightening which ceilings can produce evaluation outcomes)

---
# T16 — `switchSession` listed as a session-swap trigger and teardown described unconditionally

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** `switchSession` incorrectly listed as session_shutdown trigger; teardown described as unconditional
**Original section:** spec.md — Orientation > Prerequisites > Session model
**Kind:** cross-spec-consistency-broad, assumptions
**Importance:** high

## Finding

`spec.md` (Orientation > Prerequisites > Session model, line 39) states:

> *Session model.* A Pi extension instance is bound to exactly one active user session at a time. A session swap (`new` / `resume` / `fork` / `switchSession`) tears the extension instance down via `session_shutdown` and re-binds a fresh instance against the new session …

Two claims in this paragraph contradict the topic page it forward-links to.

1. **`switchSession` is not a `session_shutdown` reason.** The Pi Integration Contract (PIC) pins the closed normative set as `event.reason: "quit" | "reload" | "new" | "resume" | "fork"` (PIC step 4, line 76). `switchSession` appears in PIC only at line 415, in the explicit "members loom does not touch" list, where it is normatively forbidden in V1; `future-considerations.md` (line 59) anchors it under deferred mid-loom user-session-replacement. Listing it among the session-swap reasons in the hub paragraph contradicts both the PIC enumeration and the deferred-feature anchor.

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

Replace the parenthetical and the teardown clause in `spec.md` line 39 with text that mirrors PIC verbatim:

> *Session model.* A Pi extension instance is bound to exactly one active user session at a time. Pi fires `session_shutdown` with `event.reason: "quit" | "reload" | "new" | "resume" | "fork"` (the closed normative set anchored at [Pi Integration Contract — Extension entry point, step 4](./spec_topics/pi-integration-contract.md)); the runtime's handler treats every reason identically and may fast-path to a no-op when the underlying reason did not invalidate the extension runtime. Concurrent loom invocations within a session …

Drop `switchSession` from the enumeration entirely — it is V1-forbidden and its deferred-feature home is already anchored at [Future Considerations — Mid-loom user-session replacement](./spec_topics/future-considerations.md#mid-loom-user-session-replacement); a hub mention only invites the reader to assume it is in scope.

Edge cases the editor must preserve: (a) the enumeration must remain a closed set quoted exactly as PIC quotes it (no informal abbreviations like "swap reasons"), since downstream readers grep on the literal reason values; (b) the softened teardown clause must not promise a specific fast-path detection algorithm — PIC's V1 acceptance is that the handler runs the same sequence regardless and a no-active-invocations registry trivially settles, and any tighter promise here would re-open a cross-spec inconsistency.

## Relationships

- T17 "Session model: rewrite of concurrent-invocations and `ActiveInvocationRegistry` framing" — co-resolve (same paragraph; both fixes land in the same rewrite)
- T18 "Session-swap behaviour for in-flight loom invocations is under-specified" — co-resolve (same Session-model paragraph; the lifecycle/error gap is the larger half of this same paragraph rewrite)

---

# T17 — Session model: rewrite of concurrent-invocations and `ActiveInvocationRegistry` framing

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original headings:**
- "First-class" undefined; concurrent invocations bounded/accounting unspecified
- `ActiveInvocationRegistry`: implementation detail in Prerequisites; failure modes unspecified

**Original section:** spec.md — Orientation > Prerequisites > Session model
**Kind:** clarity, completeness, placement, prescription, error-model, assumptions
**Importance:** medium

## Finding

The Session-model paragraph in `spec.md` (Orientation > Prerequisites) asserts:

> Concurrent loom invocations within a session (parallel tool calls, sibling subagent sessions) are **first-class** and addressed by the `ActiveInvocationRegistry` and the per-invocation `loomAbort`; concurrent *user sessions* in the same host process are out of scope for V1 because Pi does not support them.

Three problems compound at this site:

1. **"First-class" is undefined and overloaded.** The term carries no glossary entry, and a reader cannot tell which property is being claimed: that concurrent invocations are merely permitted, that they are tracked individually, that they execute in true parallel on the event loop, that they are independently cancellable, or some combination. Worse, `spec_topics/future-considerations.md:73` reserves "first-class loom values" for a deferred V1.x feature (`Loom<T>` type, higher-order composition). Using "first-class" in a load-bearing V1 sentence and again in a deferred-feature title creates a direct naming collision the glossary does not resolve.

2. **Concurrent fan-out is unbounded with no fairness or accounting rules.** The paragraph names no maximum number of in-flight invocations per session, no scheduler / fairness rule, and no statement of which existing caps are per-invocation versus per-session. The spec already commits to per-slash-invocation budgets in `binder.md` and `tool_loop.max_iterations` in the Hard ceilings list, but the Session model paragraph does not aggregate or forward-link those decisions.

3. **`ActiveInvocationRegistry` named at orientation level without anchor or contract.** The paragraph names two runtime-internal identifiers (`ActiveInvocationRegistry`, `loomAbort`) inside an orientation paragraph whose neighbours otherwise speak in capability-shaped, behavioural language. Per PIC, the registry is purely internal: an extension-instance-scoped `Set<{ loomAbort: AbortController; disposeBarrier: Promise<void> }>` that no author-visible API touches. The forward link is also weak: no anchor on `pi-integration-contract.md`, so a reader follows the link and must scan step 4 of the `session_shutdown` handler to find the definition. Finally, PIC defines the registry as a data structure and lists its session-shutdown iteration but does not pin: what it means to insert an entry, what removes one, what happens if a `loomAbort.abort()` call inside the iteration in step 4.2 throws, and what the iteration order is.

## Spec Documents

- `spec.md` — Orientation > Prerequisites > Session model (edited)
- `spec_topics/pi-integration-contract.md` — Extension entry point step 4 + the `ActiveInvocationRegistry` definition paragraph that follows it (edited)
- `spec_topics/cancellation.md` — paragraph that already cross-references the registry from the `session_shutdown` cancellation path (edited; updated to use new anchor)
- `spec_topics/future-considerations.md` — "First-class loom values" deferred-feature title (read-only; naming-collision source)
- `spec_topics/binder.md` — Failure modes per-slash-invocation budget (read-only)
- `spec_topics/implementation-notes.md` — Per-invocation single-threaded execution (read-only)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None. The recommendation is a wording / forward-link clarification at the aggregator level plus a contract paragraph at the registry's PIC definition site. The underlying behaviour (per-invocation isolation, no concurrency cap, downward-only cancellation, registry-wide teardown abort) is already committed by leaves Mb (per-invocation `loomAbort`), V12a (subagent spawn), V14c-a (Pi-tool dispatch), V15a–V15k (`invoke` spawn including the V15k "two sibling sessions exist concurrently" test), and V18d / V18e (downward-only propagation).

## Consequence

**Severity:** correctness

A reasonable implementer could read "first-class" as licensing implementation choices the spec does not actually want — for example, a worker-pool concurrency primitive, a bounded semaphore over invocation count, or shared per-session tool-loop budgets — none of which are contradicted by this paragraph. A second implementer could read it as merely "permitted and isolated" and ship the lock-step behaviour the rest of the spec assumes. Reviewers cannot pin either reading at this paragraph alone, and the term collides with a deferred-feature name three pages away. The unanchored `ActiveInvocationRegistry` link costs implementers and reviewers a manual scan of PIC; the unstated iteration-throw and iteration-order behaviour leaves two implementers free to write divergent teardown code.

## Solution Space

**Shape:** single

### Recommendation

Make three coordinated edits.

1. **`spec.md` — Session model paragraph.** Rewrite without naming the runtime data structures, naming the actual properties and forward-linking each obligation to its owner page:

   > Concurrent loom invocations within a session — whether spawned by parallel tool calls into the same `.loom` callable, by sibling `invoke(...)` sites, or by independent slash dispatches — are **permitted, isolated, and independently cancellable**: each carries its own `AbortController` (`loomAbort`) per [Cancellation — Signal source](./spec_topics/cancellation.md), runs its own private subagent `AgentSession` in subagent mode (no shared transcript or `tools:` table) per [Implementation Notes — Per-invocation single-threaded execution](./spec_topics/implementation-notes.md), and is tracked as a distinct entry in an extension-scoped registry of in-flight invocations whose normative shape, lifecycle, and teardown semantics live at [Pi Integration Contract — `ActiveInvocationRegistry`](./spec_topics/pi-integration-contract.md#active-invocation-registry). V1 imposes **no maximum on the number of in-flight invocations** within a session and no fairness or scheduling rule beyond Pi's event-loop ordering. Per-invocation budgets (binder retry budget per [Slash-Command Argument Binding — Failure modes](./spec_topics/binder.md), `tool_loop.max_iterations` per [Hard ceilings](#hard-runtime-ceilings), `invoke`-chain depth) are **scoped to a single invocation** and are not shared, pooled, or replenished across sibling invocations. Cancellation propagates downward only (parent → children) per [Cancellation — Propagation](./spec_topics/cancellation.md); a sibling invocation's cancellation does not affect its siblings. Concurrent *user sessions* in the same host process are out of scope for V1 because Pi does not support them.

2. **`spec_topics/pi-integration-contract.md` — Add an explicit anchor and a contract paragraph.** Insert `<a id="active-invocation-registry"></a>` immediately above the existing `ActiveInvocationRegistry` definition paragraph, and extend it (or add one immediately after) with the registry's behavioural contract:

   - **Insertion** happens at slash-command handler entry, `tool.execute(...)` adapter entry, and `invoke` spawn-site entry, before any awaitable work.
   - **Removal** happens in the same `finally` block that disposes the subagent `AgentSession`, after `disposeBarrier` settles.
   - **Iteration order** in the `session_shutdown` handler's step 4.2 and step 4.3 is insertion order (matching the V8 `Set` invariant the rest of the spec already relies on; this is observable to tests asserting on the order of `loom/runtime/reload-teardown-timeout`'s `<list>` rendering).
   - **`loomAbort.abort()` throwing inside the step 4.2 iteration** is swallowed by a per-entry `try`/`catch`; the handler continues to the next entry. No diagnostic is emitted (the abort is best-effort and the entry's own `finally` will still settle `disposeBarrier`, which step 4.3 already awaits with `Promise.allSettled`).
   - **The registry name is internal.** It is not part of the loom-facing or extension-facing contract; tests assert on observable side effects rather than on the symbol itself.

3. **`spec_topics/cancellation.md`** — update the existing reference (`iterates the ActiveInvocationRegistry on /reload, /new, fork, or quit`) to use the new anchor: `[ActiveInvocationRegistry](./pi-integration-contract.md#active-invocation-registry)`.

Implementer-relevant edge cases:

- The "no maximum" statement must be explicit, not implicit. Future tightening to a bounded fan-out is a deliberate change requiring a `CEIL-N` entry under Hard ceilings, not a silent implementation choice.
- Per-invocation budget scoping must enumerate the three cited budgets (binder, tool-loop, invoke depth) by name. Leaving any one off the list re-opens the per-session-vs-per-invocation ambiguity for that specific budget.
- Drop the bare word "first-class" from this paragraph entirely. Do not add a glossary entry that conflicts with `future-considerations.md`'s `Loom<T>` deferred-feature usage.
- Do **not** add an "id collision" or "cancel-by-absent-id" failure mode — neither applies to a `Set<object>` with no external id-keyed surface.

## Relationships

- T16 "`switchSession` listed as a session-swap trigger and teardown described unconditionally" — co-resolve (same Session-model paragraph; both fixes land in the same rewrite)
- T18 "Session-swap behaviour for in-flight loom invocations is under-specified" — co-resolve (same paragraph; this finding's contract paragraph at the registry definition site is what unblocks the in-flight-invocation contract)
- T25 "Subagent cancellation wiring depends on a non-existent `createAgentSession({ signal })` option" — must-follow (the same PIC step 4 sub-step that calls `loomAbort.abort()` must use the listener-based `session.abort()` wiring T25 introduces)

---
# T18 — Session-swap behaviour for in-flight loom invocations is under-specified at the aggregator and partially open at the source

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** Session swap + in-flight invocations: incomplete lifecycle and error contract
**Original section:** spec.md — Orientation > Prerequisites > Session model
**Kind:** completeness, error-model
**Importance:** high

## Finding

The Prerequisites > Session model paragraph in `spec.md` says only that a session swap "tears the extension instance down via `session_shutdown` and re-binds a fresh instance," with a generic forward-link to `pi-integration-contract.md`'s **Extension entry point**. It says nothing about what happens to loom invocations that are mid-flight when the swap arrives. An implementer reading `spec.md` cannot tell from this paragraph (a) whether the per-invocation `loomAbort` is fired, (b) whether the runtime waits for cancellation to settle or force-aborts, (c) what the operator sees on `loom-system-note` for invocations that never reach a terminal outcome, (d) what becomes of any partially-appended turns the runtime has already pushed into the driven conversation, or (e) what an `invoke` parent observes when its child is killed by the teardown.

`pi-integration-contract.md` step 4 of **Extension entry point** answers (a) and (b) in detail: it fires `loomAbort.abort()` on every entry in `ActiveInvocationRegistry`, then awaits `disposeBarrier` for each invocation up to a hard `SHUTDOWN_AWAIT_CAP_MS = 2000` measured against the injected `Clock`, emitting one `loom/runtime/reload-teardown-timeout` diagnostic on overrun and proceeding regardless. So the cancellation-firing-and-bounded-await contract is real; what is missing is everything else:

1. **Per-invocation operator visibility for the non-timeout case is not specified.** The `loom/runtime/reload-teardown-timeout` diagnostic fires only on overrun; an invocation that cleanly cancels inside the 2 000 ms window leaves no per-invocation note on `loom-system-note`. An operator watching the channel sees the in-flight invocation simply stop appearing, with no diagnostic identifying which loom was interrupted by which `event.reason`.
2. **Partial-append fate during teardown is not addressed.** `errors-and-results.md` pins a no-rollback contract for partial appends in steady state, but a session swap is precisely the case where the conversation those appends sit in is being torn down or replaced. Whether partial appends remain in the outgoing transcript (and surface to the user on `resume`/`fork`), or are discarded with the session, is left to the implementer.
3. **Cross-shutdown `invoke` observation is not stated.** Under normal cancellation, a child's `cancelled` surfaces upward as `Err(QueryError { kind: "cancelled" })` and propagates through `?` per `cancellation.md`. During session_shutdown the parent is also being aborted in the same iteration, so the parent's `?`/`match` arm may never run. Whether the parent observes the child's `Err` (under what ordering), or is itself cancelled before it can, is not pinned.

The aggregator paragraph in `spec.md` should at minimum forward-link to a definite PIC anchor that resolves all five sub-questions; PIC must then close (1)–(3).

## Spec Documents

- `spec.md` — Orientation > Prerequisites > Session model (edited)
- `spec_topics/pi-integration-contract.md` — Extension entry point step 4; Subagent session lifecycle (edited)
- `spec_topics/cancellation.md` — second-trigger paragraph on `session_shutdown` (edited)
- `spec_topics/errors-and-results.md` — Partial-append contract / no-rollback (edited)
- `spec_topics/diagnostics.md` — code registry (edited if a new `loom/runtime/session-shutdown-cancelled` per-invocation code is introduced)

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

**Shape:** single

### Recommendation

Pure delegation: replace the silent paragraph in `spec.md` with one anchored forward-link to a tightened PIC section, then close the three open sub-questions in PIC itself (and `cancellation.md` for the propagation interaction).

- `spec.md` — Session model paragraph: drop the bare teardown sentence; add the anchored forward-link "Session-swap semantics for in-flight invocations — the abort-and-await sequence, the per-invocation operator-visibility surface, partial-append fate, and the `invoke`-parent observation rule — are owned by [Pi Integration Contract — `session_shutdown` semantics]."
- `pi-integration-contract.md` — In step 4 (or a new sub-section "Session-swap behaviour for in-flight invocations"): pin
  - per-invocation system note on the cancellation path (e.g. `loom/runtime/cancelled-by-session-shutdown`, `display: false` on `loom-system-note`, with `details.event.reason` carrying the Pi `event.reason` and `details.event.loom` carrying the invocation's slash name);
  - partial-append fate (the no-rollback rule from `errors-and-results.md` continues to apply: turns already appended remain in whatever conversation Pi assigns them to under the swap's `event.reason`; the runtime makes no rollback or migration attempt);
  - `invoke`-parent observation rule (parent and child are aborted in the same registry iteration; the parent's `?`/`match` arms do not run during the bounded-await window; the parent's `disposeBarrier` settles independently of whether its child surfaced an `Err` to it).
- `cancellation.md` — second-trigger paragraph: cross-link the propagation interaction so the downward-only rule is read with the teardown carve-out in mind.
- `diagnostics.md` — register the new code and its asserting test under V18s.

Edge cases the implementer must watch:

- The bounded-await uses absolute deadline arithmetic against the injected `Clock` (not a refreshing slide); a slow `loomAbort.abort()` propagation in step 2 does not extend the await — already pinned in PIC, but the new per-invocation note must fire **before** the timeout diagnostic for invocations that cancel cleanly, and **only** the timeout diagnostic for invocations that do not.
- Per-invocation notes on `loom-system-note` may not be deliverable if the renderer or Pi's send path is being torn down concurrently; the existing `sendSystemNote` fallback chain (`ctx.ui.notify` → `loom/runtime/system-note-delivery-failed` → `console.error`) per H4 covers this, and the new per-invocation note must route through it.
- The new code (if introduced) must land in `diagnostics.md`'s code registry in the same edit per the V18s closing-gate rule, with at least one asserting test.
- If the resolution introduces a new `loom/runtime/cancelled-by-session-shutdown` (or analogous) code, the always-log set in PIC's runtime-event channel must state whether the new code is excluded (consistent with the existing `cancelled` exclusion) or admitted.

Aggregator-level enumeration of all five obligations was rejected: it would land five obligations in the orientation aggregator without anchored ownership, exactly the pattern flagged repeatedly elsewhere in this review, and would create GOV-12 lock-step burden.

## Relationships

- T16 "`switchSession` listed as a session-swap trigger" — co-resolve (same paragraph; the `event.reason` enumeration and the teardown-conditionality hedge land in the same edit as the in-flight-invocation contract)
- T17 "Session model: rewrite of concurrent-invocations and `ActiveInvocationRegistry` framing" — co-resolve (same paragraph; this finding's contract paragraph at the registry definition site is what unblocks the in-flight-invocation contract)
- T25 "Subagent cancellation wiring depends on a non-existent `createAgentSession({ signal })` option" — must-follow (the teardown step 2's `loomAbort.abort()` propagation into spawned subagents only works once that finding's wiring is corrected)

---
# T19 — Subagent state-isolation matrix asserts non-inheritance without naming the Pi mechanism for two of its six rows

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** Subagent state-isolation matrix presupposes Pi context-passing model
**Original section:** spec.md — Cross-cutting / Whole-document
**Kind:** assumptions
**Importance:** high

## Finding

The "Subagent state-isolation matrix" in `pi-integration-contract.md` is a six-row table claiming that, for a `mode: subagent` invocation, six pieces of caller state are mechanically *not* inherited by the spawned `AgentSession`. The matrix is the canonical anchor for the V1 isolation contract and is forward-referenced from `spec.md`'s preamble, `overview.md`'s Scope of a Loom File, and the V12 plan leaves. Each "Not inherited" cell is only as strong as the Pi SDK mechanism it relies on; if no mechanism exists, the cell describes an aspiration, not an obligation an implementer can mechanically discharge.

Cross-checking the matrix against `CreateAgentSessionOptions` in `@mariozechner/pi-coding-agent` (the V1-pinned SDK at `^0.72.1`) and against the `AgentSession` constructor surface, four of the six "Not inherited" rows are mechanically grounded by the surrounding **Conversation drive — subagent mode** prose and the spawn-call snippet: caller transcript via `SessionManager.inMemory(cwd)`; ambient Pi tool set via the explicit `tools: customTools.map(t => t.name)` allowlist combined with `customTools`; caller's `params` and bindings inherently (a different file is loaded); and caller's `withActiveTools` snapshot via the choice of `customTools` over `pi.setActiveTools`. Two rows are not grounded:

1. **Caller's system prompt.** Pi has no `systemPrompt` / `system` field on `CreateAgentSessionOptions`. The system prompt the spawned `AgentSession` uses comes from `resourceLoader.getSystemPrompt()` (`AgentSessionConfig.resourceLoader`, surfaced as `agentSession.systemPrompt`). The PIC spawn snippet writes `resourceLoader,` followed by `// ...` and never explains how the supplied loader is constructed to return the loom's frontmatter `system:` value rather than the host project's default `AGENTS.md`-derived prompt. With the parent's (or a freshly-defaulted) `DefaultResourceLoader` passed unchanged, the spawned session would silently inherit the user's project system prompt — exactly what the matrix says cannot happen. Mechanism is missing, not just under-cited.

2. **Caller's `loomAbort` controller.** The matrix says cancellation forwards via `createAgentSession({ signal: loomAbort.signal })`. `CreateAgentSessionOptions` has no `signal` field. This is the subject of the dedicated sibling finding `createAgentSession has no signal option in SDK` and is not re-litigated here; the matrix-narration sentence under the table needs to be rewritten in lock-step with whatever fix lands there.

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

## Relationships

- T25 "Subagent cancellation wiring depends on a non-existent `createAgentSession({ signal })` option" — must-follow (the matrix's `loomAbort` row narration is rewritten by that finding; this finding's edit must land coherently with the wiring change there)
- T24 "Trust-boundary aggregator names `tools` for the subagent-mode tool-definition wiring" — same-cluster (both touch the same `createAgentSession` call surface and same matrix area)

---
# T20 — V1 seam-preservation MUSTs hidden inside the deferred-features narrative page

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** V1 normative requirements (MUSTs) embedded inside deferred-features document
**Original section:** spec_topics/future-considerations.md
**Kind:** scope
**Importance:** high

## Finding

`spec_topics/future-considerations.md` is classified `(no IDs — narrative)` in the GOV-3 REQ-ID prefix table. Per GOV-3 it is excluded from REQ-ID extraction; per GOV-9 a section-level link to it suffices and triggers no closure obligation; per GOV-10 / GOV-11 an implementer who restricts their reading to the topic pages listed in their plan leaf's `**Spec**` field will not transitively pick it up. The page is therefore unreachable through the corpus's own reading-discipline rules.

It nonetheless carries normative V1 obligations on implementer architecture, embedded in the *Surface extensions (V1 leaves a seam)* section as conditions the V1 carriers MUST preserve so the deferred features can land additively. Two examples:

1. The **Binder refinement loop** bullet asserts that "three V1 carriers preserve the post-V1 migration and must not be 'simplified' away": (i) the binder envelope schema's three-arm `ok | needs_info | ambiguous` discriminator (collapsing to two arms is breaking); (ii) the `ambiguous.candidates` field staying in the schema even though V1 suppresses it (dropping it is breaking); (iii) the per-arm `loom /<name>:` system-note prefix grammar (collapsing the two failure-arm prefixes is breaking). `binder.md` documents each of (i)–(iii) individually as V1 behaviour but does not aggregate them as a seam-preservation contract or attach the "must not be simplified" obligation to any of the three; that framing exists only in `future-considerations.md`.

2. The **Symlink-resolution hardening for invoke-path containment** bullet asserts in its *Anchored at:* clause that "the path-resolution call site in the invoke runtime is a single named function used by both load-time and invocation-time checks; replacing its body is additive." `invocation.md` describes the load-time and invocation-time `realpath`+containment checks but never pins the structural V1 mandate — that the call site MUST be factored as a single named function shared between the two sites — anywhere in its own text.

The asymmetry is visible elsewhere in the same section: the **Named-argument / key=value invocation syntax** bullet's V1 seam is correctly mirrored as a normative `> **V1 seam — named-argument invocation.**` block in `invocation.md` (with the discriminator-switch MUST stated locally), so a V15 implementer reading only `invocation.md` sees the obligation. The two cases above are the defect: a V15 / V16 implementer reading only the leaf's listed topic pages preserves neither structure, and a future revision that lands either deferred feature discovers the V1 carriers were silently simplified.

A scan of the same section turns up further candidates that carry V1 architectural mandates phrased as seam descriptions rather than as MUSTs on a topic page — at minimum the *Typed-query support* "single named runtime constant", the *Mid-loom user-session replacement* "single captured reference", the *Pi-owned subagents* "single named set", and the *Package-style imports* "single `Resolver` seam". Each is the same shape: a V1 implementation choice the deferred extension depends on, asserted only on the deferred-features page. The fix should sweep the section rather than patch the two examples.

## Spec Documents

- `spec_topics/future-considerations.md` — *Surface extensions (V1 leaves a seam)* (edited)
- `spec_topics/binder.md` — *Binder envelope schema*, *System-note rendering* rule 5, *Failure-mode templates* (edited)
- `spec_topics/invocation.md` — *Resolution* (edited)
- `spec_topics/governance.md` — GOV-3 prefix table, GOV-9 cross-link form, GOV-10 plan-leaf reading scope, GOV-11 Spec-field closure (read-only)
- `spec_topics/imports.md` — *Resolver interface* (edited if the sweep covers the package-style imports seam)
- `spec_topics/pi-integration-contract.md` — *Provider compatibility for typed queries*, *Conversation drive — prompt mode*, *Extension entry point* (edited if the sweep covers the typed-query, mid-loom-replacement, or Pi-owned-subagents seams)
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

H6's exclusion list keys off the `(no IDs — narrative)` cell. The sweep moves obligations *out* of `future-considerations.md` to topic pages that already carry prefixes, so H6 picks them up automatically and the exclusion list is unchanged. V15 / V16 leaves are listed as *modified* because each currently sources its V1 carrier shape from the topic page only; under the fix they will additionally need to honour an explicit seam-preservation MUST that lands on the topic page (i.e. the leaf's tests grow an assertion that the structural distinction is preserved, not just that the V1 behaviour is correct).

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

Apply the same lift to every other bullet in the section whose *Anchored at:* clause asserts a V1 structural promise rather than merely pointing at where V1 already documents the seam — at minimum the four candidates flagged in the Finding (typed-query single named constant, mid-loom-replacement single captured reference, Pi-owned-subagents single named set, package-style imports single `Resolver` seam). The sweep is bounded by the section length and is a one-pass mechanical edit.

Edge cases for the implementer of the fix:

- The lift must preserve the deferred feature's reverse link. After lifting, the `future-considerations.md` bullet keeps a one-line summary plus *Anchored at: [Topic — V1 seam: <name>](./topic.md#…)* pointing at the new block's anchor.
- `future-considerations.md` stays classified `(no IDs — narrative)` after the sweep — the page becomes purely descriptive, which is its declared purpose. Promoting it to a normative page would require GOV-7 *Narrative-to-normative promotion*, GOV-7 *Add* of a fresh prefix, an H6 re-run scope expansion, and a coverage-matrix re-pivot; the lift accomplishes the same outcome without those mutations.
- A bullet whose seam description merely *restates* an obligation already pinned on the topic page (e.g. *Per-call timeouts*, where `invocation.md` already carries the open-struct seam) needs no lift; the sweep skips it.
- The H6 anchor pass already excludes `future-considerations.md`. After the sweep, the bullets that remain on the page carry no MUSTs, so H6's exclusion remains correct without modification.

## Relationships

None

---
# T21 — `pi.sendUserMessage` returns `void`; prompt-mode transport-error detection path is mis-described

**Source:** docs/reviews/spec-review/spec-20260507-064438-enriched.md
**Original heading:** `pi.sendUserMessage` returns `void`, not `Promise`; transport-error detection path is wrong
**Original section:** spec_topics/pi-integration-contract.md
**Kind:** codebase-grounding-broad
**Importance:** high

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

## Relationships

- T25 "`createAgentSession` has no `signal` option in SDK" — same-cluster (third PIC SDK signature drift; same SDK-grounding pass)

