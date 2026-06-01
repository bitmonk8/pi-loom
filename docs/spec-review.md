# Triaged Spec Review - spec

_Generated: 2026-06-01T20:15:30Z_
_Spec: docs/spec.md_
_Process: bottom-up - the last finding (T22) is addressed first; the first finding (T16) is addressed last._

_Triage tally: 4 high retained; 16 medium removed by request; 10 low discarded; 2 low merged into 1 (removed); 9 nit dropped; 0 false dropped._

---

---

# T16 - `loom/load/unreadable-source` registry row carries two message formats but only one is in the Message column

**Kind:** testability
**Importance:** high
**Score:** 100
**Must-fix:** true
**Shape:** single
**State:** reduced

## Problem

The `loom/load/unreadable-source` row in diagnostics.md's [Code registry](#code-registry) carries a single Message template, but its Trigger admits a second, structurally-distinct rendered form for the package-read-timeout sub-trigger (`package '<name>' package.json read exceeded <deadline>ms during package discovery`). That second template is not present in the Message column and is not derivable from the first by interpolation of `<descriptor>`. Code registry rule 4 pins the Message column as the byte-exact source of truth for conformance tests, so a test against the package-read-timeout sub-trigger cannot both comply with rule 4 and assert the correct rendered string — the two obligations are mutually unsatisfiable for that sub-trigger. The placeholder-rendering Closure clause compounds the gap: `<name>` and `<deadline>` appear only in Trigger prose, so they are not audited under rendering categories 1–8.

## Solution approach

Give the package-read-timeout sub-trigger its own row in diagnostics.md's [Code registry](#code-registry) with a normative Message column carrying its rendered template `package '<name>' package.json read exceeded <deadline>ms during package discovery`, and remove that sub-trigger — including its `details.kind = "package-read-timeout"` — from the `loom/load/unreadable-source` row's Trigger. Update discovery.md's package-discovery prose and Failure-modes table to cite the new code. Confirm §7 placeholder rendering already covers `<name>` and `<deadline>`.

## Solution constraints

- None.

## Relationships

- T20 "`Diagnostic.details` field unspecified despite per-row uses" — same-cluster (same row origin; the split obviates `details.kind` for this code, but the broad `Diagnostic.details` gap persists for the other rows; resolves independently).
