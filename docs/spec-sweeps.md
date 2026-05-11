# pi-loom — Spec sweeps (deferred mechanical edits)

_Generated: 2026-05-11_
_Sibling of: [`docs/spec-review.md`](./spec-review.md)_

This document tracks **spec-wide mechanical edits** that the per-finding
fix-loop (`/fix-spec-shape-single-findings`) cannot address atomically.
A *sweep* is a single conceptual edit (a rename, a terminology
replacement, a cross-file reformatting) that touches more occurrences
than the inner fix-loop can converge on without diverging.

These entries originated as findings in `docs/spec-review.md` whose
recommendations directed unbounded mechanical sweeps across the spec
corpus. The reshape pass (`/reshape-spec-review`) flagged them
`Atomicity: unbounded` and surfaced them for human disposition rather
than splitting them into per-edit children (every child would still
inherit the open-endedness).

Each sweep below is **not yet scheduled**. Before executing one,
record a scope decision under its `Bounding decision needed` block —
typically by picking one of the candidate budgets, narrowing to a
specific page subset, or choosing a uniform replacement phrase. Once
bounded, a sweep is best executed as either:

- a one-shot scripted pass (e.g. a `git grep` enumeration plus
  per-occurrence edits in a single sitting), or
- a tracking finding per page-cluster manually appended to
  `spec-review.md` with an explicit `**Edit Plan:**` block — at which
  point the per-finding fix-loop can pick it up.

Sweeps are listed in `Tnn` order matching their original spec-review
finding ID for traceability. Removing a sweep from this document means
it has been completed (or absorbed into an in-progress finding); record
the disposition in a one-line entry under "Completed sweeps" at the
bottom.

---

# T01 — `V1` denotes two distinct things across the spec and plan corpora

**Original heading:** "V1" terminology collision between spec and plan conventions
**Original section:** docs/spec.md — Document level
**Kind:** doc-alignment-broad
**Importance:** medium

## Finding

`docs/plan_topics/conventions.md` reserves the bare token `V1`–`V18` for plan-phase identifiers and states explicitly: *"When plan prose needs to refer to the initial release of the loom language, write 'loom 1.0' or 'the initial release'; never reuse 'V1' for that meaning."* `docs/plan.md` honours that — `V1` is *Lexer hardening* — and the per-phase pages under `plan_topics/` likewise treat `V1`…`V18` as phase IDs (with the exception of a handful of stray "V1 returns `[]`", "V1 Pi SDK pin" usages in `h2-di-skeleton.md`, `h3-diagnostics.md`, `h4-extension-shell.md`, `h5-pi-e2e-harness.md`, `m-mvp.md` that already breach the convention).

`docs/spec.md` and every page under `docs/spec_topics/` use the bare token `V1` to mean *the initial loom release* — 234 occurrences across 27 spec-topic pages plus the spec.md root (e.g. *"V1 targets Node exclusively"*, *"V1 enums carry string values only"*, *"V1 has no `BinderError` variant"*, *"V1 seam — automatic context escalation"*). A reader who consults both corpora encounters `V1` with two distinct referents and no in-text disambiguation.

Dotted forms (`V1.0`, `V1.x`) and the next-major form (`V2`) are unambiguous — no plan phase carries a dot — and are not part of this finding. The collision is restricted to the bare token `V1`.

## Spec Documents

- `docs/spec.md` — entire file (option-dependent: edited under Option A; read-only under Option B)
- `docs/spec_topics/*.md` — all 27 pages currently containing bare `V1` (option-dependent)
- `docs/plan_topics/conventions.md` — *Vertical slices* paragraph (option-dependent: read-only under Option A; edited under Option B)

## Plan Impact

**Phases:** None

**Leaves (implementation order):** None

The conflict is documentary; no plan leaf's `Tests` or `Ships when` criterion changes under either resolution, and no leaf is blocked by the ambiguity. (The five plan-prose breaches noted above — `V1` used to mean *the initial release* inside H2/H3/H4/H5/M leaves — should be cleaned up alongside whichever resolution is chosen, but they are editorial fixes, not modifications to the leaf's normative content.)

## Consequence

**Severity:** advisory

A reader cross-referencing `plan.md` and `spec.md` will, on first encounter with bare `V1`, have to context-switch to determine which referent applies. No implementer would ship the wrong behaviour because of this — the surrounding prose always disambiguates — but it imposes a cognitive tax on every cross-doc reading session and signals to future maintainers that the two corpora were not co-designed.

## Solution Space

**Shape:** unresolved
**Atomicity:** unbounded

### Reasoning

The original recommendation (Option A, decided 2026-05-08) directs an unbounded sweep across the spec corpus. The open-ended phrases that exceed an atomic edit budget are: *"Sweep `docs/spec.md` and `docs/spec_topics/*.md` replacing bare `V1`…"*, *"Mechanical search-and-replace across `docs/spec.md` plus all 27 affected `spec_topics/*.md` pages, with manual review of each hit"*, and *"~234 spec-prose edits, each requiring a judgement call between the two replacement phrasings"*. The recommendation's own Cons section acknowledges that each hit needs a per-site judgement call between *loom 1.0* and *the initial release*, and the Risks section forbids a blind regex replacement.

To bound this finding for the per-finding fix-loop, a scope decision must be recorded. Candidate budgets:

- **Page-set budget.** Pick a fixed subset of the 27 spec-topic pages (e.g. the highest-traffic ones, or the pages plan leaves cite most often) for the V1.0 commit and split the remainder into a follow-up tracking finding per page-cluster.
- **Single-phrase budget.** Drop the per-hit judgement call and adopt one replacement phrase (`loom 1.0`) uniformly for every bare `V1` site, accepting any minor meaning drift as the cost of bounded execution.
- **Reframe as Option B.** Adopt the *carve spec corpus out of the convention* path (≤50 words in `plan_topics/conventions.md`), eliminating the sweep entirely; the document-level overload remains but the edit budget collapses to one file.

Until one of these is recorded as a decision, the finding cannot be addressed atomically. The original Options A and B (and the supporting prose around the `V1 seam` blockquote convention, dotted forms, and plan-prose breaches) are preserved in the source file's Decision history; this reshape only blocks the fix-loop until a bounded scope is chosen.

## Relationships

None

---

# T04 — "Load-bearing" used as an undefined technical qualifier

**Original heading:** "Load-bearing host-shape check" used without definition
**Original section:** docs/spec.md — Orientation > Prerequisites > Pi SDK and capabilities
**Kind:** clarity
**Importance:** medium

## Finding

The Pi-SDK orientation paragraph in `spec.md` uses "load-bearing" twice in adjacent sentences with two distinct meanings, neither defined and neither anchored in the Glossary:

1. *"…the **load-bearing host-shape check** that `Type.Unsafe` is a callable function is owned by [PIC — Step 0 (e)]…"* — here it qualifies a single named check.
2. *"…the capability probe owned by [PIC — Step 0 (Capability probe)]…, which is **the single load-bearing check**."* — here it qualifies the entire probe and asserts uniqueness.

A reader cannot tell from the prose whether "load-bearing" means (a) any check whose failure causes refusal to register, (b) a check that gates further checks via short-circuit, or (c) the only check with normative status at this site. The two sentences sit close enough that all three readings appear plausible. The same colloquialism recurs throughout `pi-integration-contract.md` (≥10 occurrences across host-prerequisites prose, member surfaces, and `Clock` / `FileSystem` interface descriptions), which compounds the ambiguity rather than localising it.

The probe itself is exhaustively specified at PIC Step 0 (the `(a)→(b)→(c)+(d)→(e)` short-circuit order, the per-failure `details.kind` map, the `loom/load/host-incompatible` emission contract). What is missing is the framing word. "Load-bearing" carries no operational consequence beyond the sentence it sits in; an implementer building from the topic page can still produce a conformant probe.

## Spec Documents

- `docs/spec.md` — Orientation > Prerequisites > Pi SDK and capabilities (edited)
- `docs/spec_topics/pi-integration-contract.md` — Host prerequisites; Step 0 (d), (e); `ExtensionContext` / `ExtensionCommandContext` member-surface paragraphs; renderer registration; `Clock` and `FileSystem` interface paragraphs; Pi version-bump procedure (option-dependent — only edited if the global cleanup option is taken)
- `docs/spec_topics/glossary.md` — (option-dependent — edited only if the term is promoted to a defined glossary entry)

## Plan Impact

**Phases:** None

**Leaves (implementation order):** None — the fix is a wording change in informative orientation paragraphs. No acceptance criterion, surface-inventory test, or capability-probe specification consumed by a plan leaf changes shape.

## Consequence

**Severity:** advisory

A reader of the orientation paragraph cannot pin down whether "the single load-bearing check" means "the only check at extension-factory entry that gates registration" or something narrower. The paragraph is informative and the operative rules live in PIC Step 0, so an implementer can still build a conformant probe; the cost is reader friction and ambient lexical noise across the corpus.

## Solution Space

**Shape:** unresolved
**Atomicity:** unbounded

### Reasoning

The original recommendation directs an unbounded sweep across `pi-integration-contract.md`. The open-ended phrases that exceed an atomic edit budget are: *"Apply the same pass across `pi-integration-contract.md`: replace each 'load-bearing' with the concrete consequence it implies in context"*, with a population estimated by the Finding as *"≥10 occurrences across host-prerequisites prose, member surfaces, and `Clock` / `FileSystem` interface descriptions"*. Each replacement requires a per-site judgement call between three different operational meanings ("checked at extension-factory entry by Step 0", "consumed by [section]", "required for [behaviour]"). Two `non-load-bearing` negation sites and one `dist/core/index.d.ts` re-export site each need bespoke rewrites, not the same template.

To bound this finding for the per-finding fix-loop, a scope decision must be recorded. Candidate budgets:

- **Spec.md-only budget.** Limit the edit to the two `spec.md` orientation sentences (the `Type.Unsafe` sentence and the closing capability-probe sentence); leave PIC's ≥10 occurrences for a follow-up finding per PIC subsection (host prerequisites, `ExtensionContext`/`ExtensionCommandContext` member-surface paragraphs, renderer registration, `Clock`/`FileSystem` interfaces, version-bump procedure).
- **Per-subsection split.** Carve the PIC sweep into one child finding per PIC subsection that contains "load-bearing" hits; each child becomes atomic against its subsection.
- **Mechanical-only sweep.** Replace every "load-bearing" uniformly with one phrase (e.g. "contract-bearing") regardless of context, accepting that some sentences will read awkwardly; eliminates the per-site judgement axis.

Until one of these is recorded, the finding cannot be addressed atomically. The two `spec.md` sentence rewrites and the three named edge cases (the negation sites and the `dist/core/index.d.ts` site) from the original recommendation are preserved in the source file's history; this reshape only blocks the fix-loop until a bounded scope is chosen.

## Relationships

None

---

## Completed sweeps

_None yet._
