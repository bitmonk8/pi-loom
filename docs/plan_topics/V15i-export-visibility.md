# `V15i` — Imports — export visibility and re-exports

**Spec.** [`../spec_topics/imports.md`](../spec_topics/imports.md).

**Adds.** The `.warp` export-visibility semantics layered on [`V15c`](./V15c-imports.md)'s resolution: implicit auto-export of every top-level `schema`/`enum`/`fn`, the aliased `export … from` re-export form, and the negative rule that a plain `import` is not re-exported downstream.

**Tests.**
- Auto-export visibility: a top-level `schema`, `enum`, and `fn` declared in a `.warp` file are each resolvable from an importing file with no `export` keyword on the declaration (Visibility rule in `imports.md`).
- Re-export with alias: `export { A as B } from "./x.warp"` is visible to a downstream importer as `B`, and the re-exporting file holds no local binding for `A` (Re-exports rule).
- Plain `import` is not re-exported: a plain `import { A } from "./x.warp"` leaves `A` invisible to a further downstream `import { A } from "<re-importing file>"` (negative half of the Re-exports rule).

**Deps.** `V15i-T`, `V15c`

**Ships when.** `npm test` resolves an auto-exported symbol from a `.warp` file in a downstream importer, and makes an `export … from` re-export visible to a downstream importer as its alias while a plain `import` is not re-exported.
