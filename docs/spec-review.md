# Triaged Spec Review - spec.md

_Generated: 2026-06-07T00:00:00Z_
_Spec: docs/spec.md_
_Process: bottom-up - the last finding (T18) is addressed first; the first finding (T01) is addressed last._

_Triage tally: 0 blocker, 0 high, 1 medium, 0 low retained; 197 low discarded; 0 low findings merged into 0 medium findings; 91 nit dropped; 0 false dropped._

---

# T01 - `node_modules/` walk silently skips pnpm-isolated package entries

**Kind:** assumptions
**Importance:** medium
**Score:** 15
**Must-fix:** false
**Shape:** single
**State:** reduced

## Problem

The package-discovery walk's "immediate child directory" enumeration rule (the first **Per-package resolution** bullet in `package-and-settings.md`) classifies `node_modules/` (root #3) entries through the `FileSystem.lstat` seam, which PIC-13 (`host-interfaces-services.md`, anchor `pic-13`) specifies does NOT follow symlinks. Under pnpm's default isolated layout the top-level `node_modules/` entries are symlinks (`lstat` reports `isSymbolicLink()` true and `isDirectory()` false), so under the literal "immediate child directory" rule they are neither candidate packages nor scope directories and contribute zero looms. The spec is silent on this case — it does not direct realpath-classification, scope `node_modules/` to non-pnpm layouts, or register a diagnostic — so one implementer silently drops every pnpm loom while another who follows symlinks finds those packages resolved under `.pnpm/`, with divergent containment (`loom/load/manifest-escapes-package`) and cross-source dedup behaviour, both claiming conformance. The four sibling roots are unaffected because `pi install` populates them with real directories.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** d6cbb37 — pi-loom spec: resolve "pi.looms is an extension-owned convention" (2026-05-04, Thomas Andersen); 475155c — pi-loom plan: resolve "V14m discovery walk omits scoped packages and has no upper bound" (2026-05-05, Thomas Andersen)
**History:** The package-discovery walk was assembled across two commits. d6cbb37 introduced the "Roots scanned" block listing `node_modules/` as root #3, bringing pnpm's on-disk layout into scope. 475155c then added the immediate-child-directory enumeration bullet, which classifies entries without following symlinks. The pnpm-isolated-symlink case has been silently unhandled since that second commit completed the walk, and no later edit on `package-and-settings.md` addressed it.

## Solution approach

Clarify the `node_modules/` root (#3) enumeration in `package-and-settings.md` to pin that entries whose `lstat` reports `isSymbolicLink()` true are filtered out silently — the walk does not follow symlinks, so pnpm's default isolated layout (`node_modules/<pkg>` as a symlink into `node_modules/.pnpm/…`) is out of scope for this root. Name the recourse so the out-of-scope band is actionable: pnpm projects install via `pi install` (root #1 or #4) or use pnpm's hoisted node-linker mode.

## Solution constraints

- Out of scope: the `@`-scope-directory candidate-enumeration rewrite of the same `node_modules/` walk, owned by T02.
- Out of scope: changing PIC-13's `lstat` / `realpath` member contracts in `host-interfaces-services.md`, or introducing realpath-classification of `node_modules/` entries — the clarification rests on the existing `lstat` no-follow semantics.

## Relationships

- T02 "Package-discovery candidate-enumeration rule stated two contradictory ways" — same-cluster (both touch the `node_modules/` root's candidate-enumeration walk; symlink classification vs scoped-package unwrapping; resolve independently)

