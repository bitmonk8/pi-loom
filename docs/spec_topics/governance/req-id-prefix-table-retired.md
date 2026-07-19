# Req id prefix table retired

### Retired prefixes

| Prefix | Formerly | Retired in |
|---|---|---|
| `BIND` | `binder.md` | `7851d7c` |
| `BNDG` | `bindings.md` | `7851d7c` |
| `PIE` | `pi-integration.md` | `877d57b` |

The Retired prefixes sub-table is itself append-only — a retired prefix cannot be un-retired or reassigned. The `Retired in` column carries either the 7-character abbreviated commit SHA (e.g. `7851d7c`) or a release tag (e.g. `v0.42.0`), nothing else — no prose, no parentheticals, no qualifiers. The `Formerly` column names the page that historically carried the prefix; for rows recording a GOV-7 *Merge*, the cell takes the standard form `<absorbed-page> (merged into <surviving-page> at <sha>)` so future merges produce consistent rows. A fourth `Reason` column MAY be added without breaking the GOV-6 gate; if added, it carries free-form prose, while the `Retired in` cell remains strictly SHA-or-tag.

<!-- GOV-15 (theta 1.x source-language equivalence) and its sub-sections (loads-cleanly predicate, ceiling-set carve-out, attribution test, operational definitions) moved to [Source-language stability](./source-language-stability.md) so the live release-process policy is not buried in this retired-prefix-table page. The #gov-15, #gov-15-fixture-suite, #gov-15-loads-cleanly, #ceiling-set-carve-out, #attribution-test, and #operational-definitions anchors now live there. -->
