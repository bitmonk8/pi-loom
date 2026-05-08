---
projectTitle: pi-loom
commitPrefix: pi-loom

specPath: docs/spec.md
specReviewPath: docs/spec-review.md
specTopicsDir: docs/spec_topics

planPath: docs/plan.md
planReviewPath: docs/plan-review.md
planTopicsDir: docs/plan_topics
planConventionsPath: docs/plan_topics/conventions.md
planCoverageMatrixPath: docs/plan_topics/coverage-matrix.md

topicsLayout: flat
idAllocationPolicy: no-invented-ids

commitAddPaths:
  - docs/
---
# Project config — pi-loom

## Spec rules

pi-loom currently uses no stable rule IDs in the spec — do not invent any.
If a recommendation depends on introducing an ID scheme, surface that in
"Notes" and do not silently invent prefixes.

## Plan rules

Plan-leaf IDs follow `H1`–`H4` (horizontal phases), `M` (MVP), and
`V<N><letter>` (vertical-slice leaves, e.g. `V4b`, `V18o`). When picking a
new leaf ID, use the next free letter in the target phase; never reuse a
retired ID.

The plan has cross-cutting files at `docs/plan_topics/conventions.md` (leaf
format / authoring conventions) and `docs/plan_topics/coverage-matrix.md`
(spec-rule → leaf coverage). When creating, splitting, merging, or
removing a leaf, keep both consistent — the conventions file gates leaf
shape, the coverage matrix tracks closure of spec content.
