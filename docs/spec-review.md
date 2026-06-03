# Triaged Spec Review - spec

_Generated: 2026-06-03T08:30:00Z_
_Spec: docs/spec.md_
_Process: bottom-up - the last finding (T11) is addressed first; the first finding (T01) is addressed last._

_Triage tally: 3 high retained; 8 low discarded; 9 low findings merged into 2 medium findings; 3 nit dropped; 0 false dropped._

---

# T01 - Spec-corpus editorial and governance meta-commentary misplaced in implementer-facing orientation

**Kind:** cruft
**Importance:** high
**Score:** 25
**Must-fix:** false
**Decision axes:** 3
**Shape:** single
**State:** reduced

## Problem

Three blocks of `docs/spec.md` orientation prose carry spec-corpus editorial and governance meta-commentary aimed at spec maintainers rather than loom-runtime implementers: the `### Scope` opening paragraph's editorial-criterion meta-note, the `#v1-non-goals` section's closing paragraph (re-stating GOV-12-owned lock-step and aggregator conventions), and the `#sm-anchor-scheme-stability` paragraph (anchor-lifecycle rules, orientation-vs-obligation citation guidance, and a one-time historical tracking sentence). None constrains a runtime implementer; each pushes the section's actual content — the five Scope bullets, the eight non-goals, the SM obligations — behind maintainer-facing commentary. The conventions these blocks document are owned canonically by GOV-12 or belong in a GOV rule on `governance.md`, not in spec.md orientation prose.

## Solution approach

Delete the editorial meta-note from spec.md's `### Scope` opening paragraph, keeping the orientation sentence and its existing forward-links. Delete the closing meta-commentary paragraph from the `#v1-non-goals` section, keeping the seam-vs-non-goal navigation sentence and the opening `*Orientation aggregator*` sentence's GOV-12 link. Delete the `#sm-anchor-scheme-stability` paragraph from spec.md and relocate its anchor-lifecycle and orientation-vs-obligation citation rules to a new GOV rule on `governance.md` governing spec.md's `sm-N-…` anchor scheme; drop the historical pre-decomposition tracking sentence with no replacement.

## Solution constraints

- The umbrella `<a id="session-model"></a>` anchor on the Session Model lede MUST survive the deletion — inbound orientation-level links depend on it.
- Coining the new GOV rule on `governance.md` MUST register it per GOV-7 *Add* and GOV-1 dual-form anchoring.

## Relationships

- T07 "Trust-boundary Scope bullet carries the denial-surface rule normatively" - same-cluster (clarifying the Scope "informative orientation" framing strengthens the basis for T07's pointer-only rewrite; land in the same pass).
- T06 "Runtime observability bullet restates normative emission rules inside an informative section" - same-cluster (Scope-section hygiene; land in the same pass).
# T06 - Runtime observability bullet restates normative emission rules inside an informative section

**Kind:** placement
**Importance:** high
**Score:** 35
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

The Scope subsection in `docs/spec.md` declares its bullets *informative orientation*: each is supposed to forward-link the topic page that owns the normative contract. The **Runtime observability** bullet violates that framing — it states declaratively the always-log-set emission rule, the success-side `Ok(v)` null-policy, and the shared-channel parse/load/type/runtime-panic diagnostics rule. Each clause is the normative MUST / MUST NOT in force, not a paraphrase, and the canonical owners (`pi-integration-contract.md` **Runtime event channel** paragraph, `#success-side-null-policy`, and `diagnostics.md`) are already named, so the bullet duplicates obligations it should only point at. No GOV-12 lock-step gate covers informative-bullet body text, so the duplicate drifts silently on the next edit to either owner; the in-line success-side clause is also ambiguous (whole-run-silence vs outcome-keyed-silence) where `#success-side-null-policy` states the intended outcome-keyed reading unambiguously.

## Solution approach

Rewrite the **Runtime observability** bullet in `docs/spec.md`'s Scope subsection into a navigation pointer matching the conforming no-seam Scope bullets. Keep a one-line orientation sentence naming the operator-facing `loom-system-note` surface and forward-link the canonical owners: the **Runtime event channel** paragraph and `#success-side-null-policy` in `pi-integration-contract.md`, `diagnostics.md` for the parse/load/type/runtime-panic batches, and the deferred-telemetry link to `future-considerations.md`. Delete the in-line success-side clause rather than rewriting it at `#success-side-null-policy`.

## Solution constraints

- Out of scope: `pi-integration-contract.md` and `diagnostics.md` — they already carry the full normative content; this is a delete-and-redirect on the `spec.md` side only.

## Relationships

- T07 "Trust-boundary Scope bullet carries the denial-surface rule normatively" - same-cluster (identical defect on the adjacent Trust boundary bullet; identical pointer-only remedy; independent edits).
- T01 "Spec-corpus editorial and governance meta-commentary misplaced in implementer-facing orientation" - same-cluster (Scope-section hygiene; land in the same pass to leave the section consistent).
# T07 - Trust-boundary Scope bullet carries the denial-surface rule normatively

**Kind:** placement
**Importance:** high
**Score:** 35
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

The Orientation → Scope subsection's lead paragraph frames its bullets as *informative orientation*: each bullet forward-links the topic page that owns the normative contract. The Trust boundary bullet violates that framing by stating the denial-surface rule in its own voice — "Host-side denials of filesystem, network, or Pi-API access reach loom code **only** through the tool that issued the request, and silent success on denial is forbidden" — without forward-linking the canonical owner at `pi-integration-contract.md#no-extra-mediation`. The bullet's wording also inserts "only", a tightening the canonical PIC sentence omits, producing a divergence GOV-12 lock-step audits cannot catch because the two paragraphs share no anchor or quote-fence.

## Solution approach

In `docs/spec.md`'s Trust boundary bullet, rewrite the in-line denial-rule sentence into a navigation pointer to `pi-integration-contract.md#no-extra-mediation`, dropping the "only" tightening so the orientation copy no longer asserts a constraint the canonical owner does not. Retain the existing forward-links to Tool Calls — Failures and `#tool-execution-from-loom-code` for the observable `execute()` outcome enumeration.

## Solution constraints

- Out of scope: do not add an `<a id>` anchor to the Trust boundary Scope bullet — the missing-anchor concern is owned by T02, and adding one here would collide on the same line range.

## Relationships

- T06 "Runtime observability bullet restates normative emission rules inside an informative section" - same-cluster (identical pattern on the adjacent bullet; identical pointer-only remedy; independent edits).
- T01 "Spec-corpus editorial and governance meta-commentary misplaced in implementer-facing orientation" - same-cluster (touches the same Scope lead paragraph that establishes the "informative orientation" framing this finding relies on; clarifying that framing strengthens the basis for the pointer-only rewrite).
