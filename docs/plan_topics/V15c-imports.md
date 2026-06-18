# `V15c` — Imports (`.warp` library files)

**Spec.** [`../spec_topics/imports.md`](../spec_topics/imports.md).

**Adds.** The `.warp` import resolution and diagnostics path: the permitted top-level forms (`import`/`export`/`schema`/`enum`/`fn`), relative `.warp`-only resolution via the `Resolver` seam, and the import-cycle / unknown-symbol / name-collision diagnostics. Export-visibility semantics (auto-export, aliased re-exports, the negative plain-`import` rule) live in the dependent [`V15i`](./V15i-export-visibility.md) leaf.

**Tests.**
- `IMP-1`: the `Resolver` signals an unresolvable `.warp` path by throwing → `loom/load/unresolvable-warp-path`, and the file is not registered (unresolvable = non-relative, no byte-exact final-segment entry, or unreadable).
- `loom/parse/warp-top-level-statement`: a non-permitted top-level form fires.
- `loom/parse/import-non-warp-extension`: an `import` whose path literal does not end in byte-exact lowercase `.warp` fires the diagnostic; cover a `.loom`-suffixed path and a non-lowercase `.WARP` variant.
- `loom/load/import-cycle`: a `.warp` static-graph cycle fires with its path; `import-unknown-symbol` / `import-name-collision` fire.
- Resolver success path: a resolvable relative `.warp` import binds its symbols successfully (complements the `IMP-1` throw test).

**Deps.** `V15c-T`, `V1a`, `V15a`

**Ships when.** `npm test` binds the symbols of a resolvable relative `.warp` import in a downstream importer, rejects a non-permitted top-level form, rejects an `import` whose path literal does not end in byte-exact lowercase `.warp` (`import-non-warp-extension`), fires `import-cycle`, and surfaces `loom/load/unresolvable-warp-path` for an unresolvable path (`IMP-1`).
