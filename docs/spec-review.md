# Triaged Spec Review — spec.md

_Generated: 2026-05-08T09:00:00Z_
_Spec: docs/spec.md_
_Process: bottom-up — the last finding in the file is addressed first; the first finding is addressed last._
_(Updated 2026-05-20 T05 — `bind_*` (frontmatter) vs `binder*` / `binder-*` (settings, diagnostics, prose) — root-word inconsistency for the binder-model concept finding-shape Pattern L auto-reshape: deleted 2 gratuitous content span(s) from Solution approach. Net change to retained count: 0.)_
_(Updated 2026-05-20 T05 — `bind_*` (frontmatter) vs `binder*` / `binder-*` (settings, diagnostics, prose) — root-word inconsistency for the binder-model concept finding-shape Pattern K auto-reshape: deleted 1 decision-log sentence from Solution constraints. Net change to retained count: 0.)_
_(Updated 2026-05-20 T05 — `bind_*` (frontmatter) vs `binder*` / `binder-*` (settings, diagnostics, prose) — root-word inconsistency for the binder-model concept finding-shape Pattern G auto-reshape: deleted 1 non-binding constraint bullet. Net change to retained count: 0.)_

_(Updated 2026-05-22 — T03a unparked and reshaped per forensic report `t03a-add-loom-package-implementation-dependencies-v1-sub-paragraph-in-pic-host-p.md`: dropped literal-version-range pin from Solution approach (the literal is owned by `h1-scaffold.md` per T03f); added four cap-the-elaboration-surface bullets to Solution constraints (no sub-anchors, no co-move MUSTs, no H1 fixture citations, ≤3 sentences); updated Relationships (T03c and T03f have landed; T03f reframed as must-follow context); updated Problem to surface the dangling cross-reference in `h1-scaffold.md:50` that this finding closes. Net change to retained count: +1.)_

_(Updated 2026-05-22 — T11a unparked and reshaped (Option A) per forensic report `t11a-replace-consumes-one-slot-prose-with-explicit-forced-respond-exemption-rule.md`: lifted the file-level read-only fence on `docs/spec_topics/hard-ceilings.md` and narrowed it to per-line (line 75 worked consequence remains read-only; CIO-4 parenthetical at line 46 is now in-scope); extended Solution approach with the one-sentence CIO-4 rewording the consistency lens's blocker demanded; updated Problem to distinguish the aligned line-75 site from the contradicting line-46 site; added `consistency` to Kind. Net change to retained count: +1.)_

---

# T03a — Add `**Loom-package implementation dependencies (V1).**` sub-paragraph in PIC `Host prerequisites`

**Kind:** assumptions, completeness
**Importance:** high
**Score:** 100
**Atomicity:** atomic
**Shape:** single
**State:** reduced
**Decision axes:** 1

## Problem

The `**Host prerequisites.**` paragraph in `docs/spec_topics/pi-integration-contract.md` enumerates four host-side prerequisites (Pi SDK pin, Binder model, Binder credentials, Pi-supplied `AbortSignal`) and does not name the loom package's own production dependencies needed to satisfy the Step 0 probe contracts. The runtime's `semver` dependency is mentioned only inside the parentheticals of the two `*Recommended recipe (non-normative).*` paragraphs immediately below the enumeration, both explicitly labelled non-normative. Since T03f landed (commit `a1e45d0`), `docs/plan_topics/h1-scaffold.md:50` carries a forward cross-reference to `**Loom-package implementation dependencies (V1).**` of `pi-integration-contract.md`; the sub-paragraph this finding installs is what closes that currently-dangling reference and provides the named dependency anchor for the H1 manifest test to assert against (the literal version range itself is owned by `h1-scaffold.md`'s pinned-constants block, which T03f extended to cross-package equality).

## Solution approach

Add a new sub-paragraph whose lead bold token is `**Loom-package implementation dependencies (V1).**` immediately below the four-item enumeration in `**Host prerequisites.**` of `docs/spec_topics/pi-integration-contract.md`. The sub-paragraph names the V1 implementation choices the recipe contracts consume — `semver` declared in the loom package's `dependencies` block and `@types/semver` declared in `devDependencies` — and frames the choices as implementation-side rather than normative contract. Do not pin a literal version range; the literal is owned by `h1-scaffold.md`'s pinned-constants block, which the H1 manifest test asserts cross-package equality against per T03f.

## Solution constraints

- Do not introduce a new MUST about which SemVer implementation contributors must use; the comparator-swap escape hatch already promised by the two `*Recommended recipe (non-normative).*` paragraphs must remain genuine after this sub-paragraph lands.
- Do not pin a literal version range (e.g. `^7.6.0`) in this sub-paragraph; the literal is owned by `h1-scaffold.md`'s pinned-constants block (per T03f's cross-package equality assertion). PIC names the dependency, not its version.
- Do not introduce sub-anchors below the paragraph-level `<a id>`. Single anchor only.
- Do not introduce comparator-swap co-move MUSTs in this paragraph; comparator-swap discipline belongs in the bump-procedure checklist under `pi-integration-contract.md#pi-version-bump-procedure`, which already enumerates per-step contributor obligations.
- Do not cite the H1 manifest-test fixture from this paragraph. The forward link is one-way (`h1-scaffold.md` → PIC), already authored by T03f; reciprocating it from PIC creates bidirectional cross-territory coupling that the inner loop's consistency lens flags.
- Paragraph length: at most three sentences.

## Relationships

- T03f "`h1-scaffold.md` manifest assertion: anchor at the new PIC sub-paragraph; extend engines.node literal-read test to cross-package equality" — must-follow (T03f landed at commit `a1e45d0` and currently carries a forward cross-reference to this paragraph in `h1-scaffold.md:50`; the edge is already satisfied at dispatch time and serves as historical context for the inverted ordering).
