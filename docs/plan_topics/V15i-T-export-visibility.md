# `V15i-T` — Imports — export visibility and re-exports (tests)

**Spec.** [`../spec_topics/imports.md`](../spec_topics/imports.md).

**Adds.** Failing tests for the paired `V15i` implementation leaf.

**Tests.**
- Auto-export visibility: a top-level `schema`, `enum`, and `fn` declared in a `.warp` file are each resolvable from an importing file with no `export` keyword on the declaration (Visibility rule in `imports.md`).
- Re-export with alias: `export { A as B } from "./x.warp"` is visible to a downstream importer as `B`, and the re-exporting file holds no local binding for `A` (Re-exports rule).
- Plain `import` is not re-exported: a plain `import { A } from "./x.warp"` leaves `A` invisible to a further downstream `import { A } from "<re-importing file>"` (negative half of the Re-exports rule).

**Deps.** `V15c`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
