# pi-loom — Consolidated Spec Review

_Generated: 2026-05-06T06:31:26Z_
_Source: docs/reviews/spec-review/spec-20260506-064723.md_
_2 findings retained (collapsed from 93 by merge / subsumption), 14 false positives dropped, 0 persistent failures_

_Severity: 27 correctness · 17 advisory · 12 cosmetic · 0 blocking_
_Shape: 56 single · 0 multiple · 0 unresolved_

---

## spec.md — Introduction (paragraphs before "Orientation")

---

# Self-referential "informative orientation only" clause in spec.md introduction

**Source:** docs/reviews/spec-review/spec-20260506-064723.md
**Original heading:** Self-referential "informative orientation only" clause
**Kind:** cruft

## Finding

The second paragraph of `spec.md` ends with the trailing clause: *"The full conceptual model is normative in [Overview](./spec_topics/overview.md) and the topic pages it links; this paragraph is informative orientation only."* The clause is self-referential — it annotates the very paragraph it appears in — and reads as authoring meta-commentary that escaped a style-guide note into reader-facing prose.

The functional content the clause carries is already conveyed by other means in the same paragraph: the inline cross-links to `errors-and-results.md`, `slash-invocation.md`, and `diagnostics.md` route the reader to the normative surfaces, and the [Overview] link in the clause itself is duplicated by the [Reading order] section a few lines below. The "informative orientation only" tag adds no information a reader can act on; it only signals authorial intent.

A secondary problem: the designation is contradicted in practice. The third introductory paragraph contains normative diagnostic codes (`loom/parse/invoke-non-loom-extension`, `loom/parse/import-non-warp-extension`) and a normative discovery-glob constraint (`*.loom` only), so the "informative" label cannot be trusted at the section granularity it's being applied at — see the related finding below.

## Spec Documents

- `spec.md` — Introduction (paragraphs before "Orientation"), specifically the trailing clause of paragraph 2 (edited)

## Plan Impact

**Phases:** None

**Leaves (implementation order):**

None — no leaf has the spec.md introduction in its **Spec** field, and no leaf's acceptance criteria depend on the wording. H6 visits non-narrative spec pages to inject REQ-ID anchors but does not retouch the `spec.md` introduction's prose.

## Consequence

**Severity:** cosmetic

A reader briefly notices the awkward self-reference and moves on. No implementer behaviour diverges; no test or diagnostic is at stake. The cost is purely the editorial signal that the intro section's invariants are not yet stable, which weakens reader trust in adjacent prose.

## Solution Space

**Shape:** single

### Recommendation

Strike the trailing sentence of `spec.md` paragraph 2: "The full conceptual model is normative in [Overview](./spec_topics/overview.md) and the topic pages it links; this paragraph is informative orientation only." Leave the rest of the paragraph untouched. The [Overview] link is already reachable from the **Reading order** subsection that follows, so no information is lost.

Edge case for the implementer: do not also delete the inline `[Overview]` link target — the route to the normative model must remain, just without the meta-annotation. After the edit, paragraph 2 ends at "...the per-stage error surfaces and the partial-append contract."

## Related Findings

- "Normative error-code rules embedded in informative introduction" — decision-dependency (that finding is premised on the intro being labelled "informative orientation only"; deleting the label per Option A removes its framing but not its substance — the diagnostic codes still belong in `imports.md` / `discovery.md` regardless. The two should be resolved together so the intro's normative posture is decided once.)

---

# Extension matching has no defined case-folding policy

**Source:** docs/reviews/spec-review/spec-20260506-064723.md
**Original heading:** Case-folding on case-insensitive filesystems not addressed
**Kind:** completeness

## Finding

Every place the spec mentions the `.loom` / `.warp` extensions — the discovery glob (`discovery.md` "matches only `*.loom`"), the `invoke` literal check (`invocation.md` "must end in `.loom`"), the `import` literal check (`imports.md` "must end in `.warp`"), the `tools:` `.loom` entry rule (`frontmatter.md` "must end in `.loom`"), and the settings/CLI `--loom` `loom/load/invalid-extension` check (`discovery.md`) — describes the comparison in lowercase prose without saying whether the comparison itself is case-sensitive. The spec is otherwise meticulous about case for *stems* (`discovery.md` line 70 mandates per-source case-insensitive collision detection on case-insensitive filesystems; line 72 forbids case-folding on the slash-name) but says nothing about the *extension*.

Two concrete divergences result. (1) On Windows or APFS-default macOS, a file saved as `Plan.LOOM` may or may not be picked up by the discovery walker depending on whether its glob library treats `*.loom` as case-sensitive (Node's `fast-glob`/`micromatch` defaults to case-sensitive; `globby` is the same; OS-native APIs differ). Two reasonable implementations diverge silently. (2) For the literal-extension parse-time checks, an author writing `invoke("./mod.LOOM", ...)` or `import { X } from "./mod.WARP"` either (a) gets `loom/parse/invoke-non-loom-extension` / `loom/parse/import-non-warp-extension`, (b) silently resolves on case-insensitive filesystems and parse-errors on Linux, or (c) silently resolves everywhere. The spec admits all three readings.

The decision interacts with the existing `loom/load/case-collision` rule for stems: a uniform policy on extension casing is required so the two rules compose without contradiction (e.g. is `Plan.LOOM` and `plan.loom` a case-collision pair? a single file? two distinct files? an invalid-extension rejection?).

## Spec Documents

- `spec_topics/discovery.md` — "Discovery is non-recursive and matches only `*.loom`" + "Case-insensitive filesystem collisions" + settings/CLI `loom/load/invalid-extension` rule (edited)
- `spec_topics/imports.md` — "Path resolution" paragraph defining `loom/parse/import-non-warp-extension` (edited)
- `spec_topics/invocation.md` — "Resolution" paragraph defining `loom/parse/invoke-non-loom-extension` (edited)
- `spec_topics/frontmatter.md` — `tools:` `.loom`-path rule defining `loom/load/unresolvable-loom-path` (edited)
- `spec_topics/lexical.md` — Path-literal definition (option-dependent — only edited if the policy is anchored in the path-literal rule)
- `spec.md` — Introduction paragraph naming the `.loom`/`.warp` extensions (read-only)

## Plan Impact

**Phases:** Vertical V14, Vertical V15, Vertical V17

**Leaves (implementation order):**

- V14k — Discovery: global `~/.pi/agent/looms/` — (modified)
- V14l — Discovery: project `.pi/looms/` — (modified)
- V14m — Discovery: package `looms/` and `pi.looms` — (modified)
- V14n — Discovery: settings file reads — (modified)
- V14o — Discovery: `--loom` CLI flag — (modified)
- V15a — `invoke("./path.loom", ...)` parsing and resolution — (modified)
- V15e — `.loom` paths in `tools:` (default basename naming) — (modified)
- V15f — `.loom` path with `as` rename — (modified)
- V17c — `import { X } from "./y.warp"` — (modified)

## Consequence

**Severity:** correctness

Two competent implementations choosing different glob libraries — or different parse-time string comparisons — would behave differently on the same project on Windows. A loom file saved with an uppercase extension, an `invoke("./x.LOOM", ...)` literal, or a `tools: [./x.LOOM]` entry could be valid on one host and a load-time error on another. The cross-platform reproducibility the rest of the spec works hard to preserve (the `homedir()` seam, the `path.delimiter` rule for `--loom`, the per-source case-collision rule) is undermined at the very first byte the loader inspects.

## Solution Space

**Shape:** single

### Recommendation

Adopt strict lowercase ASCII extension matching across every site, with one new diagnostic to surface the silent-invisibility case on case-insensitive filesystems.

**Spec edits.**

- `lexical.md`: add a one-paragraph normative rule — "The `.loom` and `.warp` file extensions are matched byte-exact in lowercase ASCII wherever they appear — in discovery globs, in path literals consumed by `import`, `invoke`, and `tools:`, and in settings/CLI extension checks. No case-folding is performed."
- `discovery.md`: cross-reference the rule above; add `loom/load/non-canonical-extension` (warning) to the failure-modes section and to the diagnostic-code registry section. The warning fires when discovery reads a directory and finds a file whose stem matches the slash-name regex but whose extension is a non-canonical case-variant of `.loom` or `.warp`.
- `imports.md`, `invocation.md`, `frontmatter.md`: replace each "must end in `.loom` / `.warp`" prose phrase with a cross-link to the lexical rule.

Edge cases for the implementer:

- The `loom/load/non-canonical-extension` warning fires only for files whose **stem** would otherwise be a valid slash name; files with junk stems (`.config.LOOM`, `notes.txt.LOOM`) stay silent to avoid noise.
- On case-insensitive filesystems, the warning must not fire twice if both `Plan.loom` and `Plan.LOOM` resolve to the same inode — dedupe by `realpath` first, then case-check.
- The warning is per-source (like `loom/load/case-collision`), not global.
- The literal-extension parse checks (`loom/parse/invoke-non-loom-extension`, `loom/parse/import-non-warp-extension`, `loom/load/unresolvable-loom-path`) need no new code — they already fire on `.LOOM` once the comparison is specified as byte-exact.

## Related Findings

- "Non-`.loom`/`.warp` and edge-case path failure modes not enumerated" — same-cluster (both push for a complete, named taxonomy of extension/path failure modes; the case-folding rule is one row in that taxonomy)
- "`.loom`/`.warp` namespace clearance treated as a given" — same-cluster (both concern the precise definition of the `.loom` / `.warp` extension surface)
- "Prefix uniqueness scope ambiguous (case-sensitivity; GOV prefix status)" — same-cluster (the same "is this comparison case-sensitive?" question, applied to REQ-ID prefixes; resolving both with the same policy stance — strict or folded — keeps the spec internally consistent)
