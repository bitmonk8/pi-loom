# Triaged Plan Review — plan

_Generated: 2026-06-11T11:35:00Z_
_Plan: docs/plan.md_
_Spec: docs/spec.md_
_Process: bottom-up — the last finding (T18) is addressed first; the first finding (T01) is addressed last._

_Triage tally: 0 blocker, 0 high, 1 medium retained; 38 low discarded; 0 low findings merged into 0 medium findings; 13 NIT dropped; 0 false dropped._

---

# T01 — `minimatch` runtime dependency required by V10b is never provisioned

**Original heading:** `minimatch` runtime dependency not provisioned anywhere
**Original section:** docs/plan_topics/H1a-scaffold-and-toolchain.md
**Kind:** codebase-grounding-broad
**Importance:** medium
**Score:** 25
**MustFix:** false

## Finding

Spec `DISC-5` (`spec_topics/discovery/package-and-settings.md`) pins `minimatch` as the matcher engine for `pi.looms` glob resolution: "Glob patterns are matched with the `minimatch` engine — the same package Pi applies to its own resource arrays". `V10b` (Package discovery) and `V10b-T` consume this directly — V10b's Adds names "minimatch with `!`/`+`/`-` ordering" and DISC-5 is one of its closing obligations. So `minimatch` is a hard runtime dependency of the loom package.

That dependency is provisioned nowhere. The repository `package.json#dependencies` declares `ajv`, `ajv-formats`, `chokidar`, `semver`, `yaml` — no `minimatch`. `H1a`'s Adds, which is the plan's runtime-dependency-enumeration owner, lists only `ajv`/`semver`/`chokidar`/`yaml`. The spec's own recommended-recipe list, `implementation-notes.md` §"Loom-package implementation dependencies (loom 1.0)", names `semver`, `chokidar`, and `yaml` but not `minimatch`. The spec notes `minimatch` is the same package Pi uses internally (`@earendil-works/pi-coding-agent` `dist/core/package-manager.js`), but Pi's internal use does not place `minimatch` on the SDK's public export surface, so loom cannot reach it transitively through a peer dependency.

The gap is invisible at `H1a`: a fresh `npm install && npm run build && npm test` passes against an empty `src/**` tree because nothing imports `minimatch` yet. It first manifests when `V10b` is implemented and its `minimatch` import fails to resolve — at which point the V10b implementer must provision the dependency ad hoc, diverging from the plan's stated model where `H1a` owns the runtime-dependency set.

## Plan Documents

- `docs/plan_topics/H1a-scaffold-and-toolchain.md` — Adds (runtime-dependency enumeration) (edited)
- `docs/plan_topics/V10b-package-discovery.md` — Adds / Tests (read-only)

## Spec Documents

- `docs/spec_topics/discovery/package-and-settings.md` — §DISC-5 (read-only)
- `docs/spec_topics/implementation-notes.md` — §"Loom-package implementation dependencies (loom 1.0)" (read-only)

## Affected Leaves

**Phases:** Horizontal; Vertical V10 (Discovery and settings)

**Leaves (implementation order):**

- H1a — Project scaffold and toolchain — (modified)
- V10b — Package discovery (bounded walk) — (blocked)
- V10b-T — Package discovery (tests) — (blocked)

## Consequence

**Severity:** correctness

`H1a` as authored ships an incomplete runtime-dependency set; because no H1a test reads `package.json#dependencies` for completeness, the omission stays green until V10b. Two implementers would then diverge on where to provision `minimatch` (V10b ad hoc vs. retro-fitting H1a), contradicting the plan's stated model that H1a owns the runtime-dependency set.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** `1cb54c7` (spec, 2026-06-06 — "resolve 'Glob !/+/- precedence and matcher engine unspecified for pi.looms / loomPaths'"); `c6a664e` (plan, 2026-06-10 — "build/update plan for spec.md + review")
**History:** The plan corpus is git-tracked. `git log -S minimatch` over `package.json`, `docs/plan_topics/H1a-scaffold-and-toolchain.md`, and `docs/spec_topics/implementation-notes.md` returns no commits — `minimatch` has never appeared in any provisioning surface. The runtime-dependency obligation was created in `1cb54c7`, which pinned the `minimatch` engine into spec DISC-5 (`discovery/package-and-settings.md`); that commit added no corresponding entry to the spec's dependency-recipe list (`implementation-notes.md`) or to `package.json`. The package.json runtime deps were established earlier (`d511337` 2026-05-04 ajv/ajv-formats/chokidar; `cb6cf60` 2026-05-07 semver) and never revisited for `minimatch`. When the plan leaves were authored in `c6a664e` (2026-06-10), `H1a`'s runtime-dependency enumeration faithfully mirrored the still-incomplete `implementation-notes.md` list, propagating the omission into the plan. The defect is thus the unreconciled interaction between the spec's `minimatch` matcher-engine pin and the dependency-provisioning surfaces that predate and post-date it.

## Solution Space

**Shape:** single

### Recommendation

Add `minimatch` to `H1a`'s runtime-dependency enumeration in Adds, alongside `ajv`/`semver`/`chokidar`/`yaml`, grounding it in DISC-5 (which already pins the `minimatch` engine for `pi.looms` glob matching) and citing `[discovery/package-and-settings.md §DISC-5]` as the obligation source. The H1a implementer then declares `minimatch` in `package.json#dependencies`.

The spec is read-only for this fix; DISC-5 already names `minimatch`, so the plan can ground the dependency without touching the spec. The spec's incomplete `implementation-notes.md` recipe list is a separate spec-review concern and is out of scope here.

Edge case: keep H1a's enumeration and the eventual `package.json#dependencies` in step. No H1a architectural test reads the runtime-`dependencies` set (the existing tests read `devDependencies`/`peerDependencies`), so the gap will not red until V10b — the H1a implementer must add `minimatch` even though H1a's own `npm test` passes without it.

## Relationships

None
