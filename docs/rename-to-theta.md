# Rename: Loom → Theta

Plan for renaming the project from **Loom** / `@bitmonk8/pi-loom` to **Theta** /
`@bitmonk8/pi-theta`.

## Why

- `@bitmonk8/pi-loom` did not appear in the Pi package registry after publishing.
- A second, unrelated package named `pi-loom` already exists. The suspected cause
  of the missing registry entry is the name collision; regardless of the true
  cause, two packages sharing a name is confusing for users and looks suspicious.
- New name: **Theta** (Greek capital **Θ**), after Turing's fixed-point combinator.

## Scope at a glance (git-tracked only)

Measured with `git grep` on the tracked tree (excludes `node_modules/`, `dist/`,
and the ignored `.pi/` local state).

| Surface | Count |
|---|---|
| Tracked files containing `loom` (case-insensitive) | 774 |
| Tracked occurrences of `loom` | ~15,400 |
| Occurrences of `warp` (the module-file metaphor term) | ~800 |
| `.loom` / `.warp` files in the tree | 26 |
| Source/fixture files whose **filename** contains `loom` (need `git mv`) | ~12 (+ the 26 `.loom`/`.warp` if extensions change) |
| `Loom*` / `Warp*` cased identifiers in `src` + `tests` | ~970 occurrences |
| Distinct `loom/<area>/<code>` diagnostic-code families | 199 |
| `loomPaths` (settings key) | 176 |
| `pi.looms` (package manifest key) | 84 |
| `~/.pi/agent/looms` / `.pi/looms` (discovery dirs) | ~60 |
| Permanent governance anchors containing `loom-1-0` | 57 |

This is a deep, cross-cutting rename: the name is baked into the language name,
the package identity, the file extensions, the CLI/discovery surface, the
machine-facing diagnostic codes, the runtime type names, and the governance
anchor scheme. **It is not a blind find-and-replace** — several of the surfaces
below are compatibility contracts, and one (`.warp`) is a metaphor decision, not
a mechanical substitution.

## Naming decisions

The rename touches every surface below. These decisions are settled; the
[Work breakdown](#work-breakdown) implements them.

### Language name and prose form

The language/product is renamed `Loom` → **Theta** everywhere in prose, headings,
and branding. Prose form is fixed:

- **"Theta" is canonical** in all running text, docs, spec, and code identifiers —
  fully ASCII and greppable.
- The glyph **Θ** is permitted only as a deliberate branding accent (README
  title/hero, tagline). It never appears in the spec corpus body, diagnostics, or
  identifiers. Its role is to carry the fixed-point-combinator identity where it
  has visual impact; the Θ origin is otherwise a one-line note.

Mixing the two forms in ordinary prose is out of bounds — "Theta" only, except at
the named branding spots.

### Package name

The package is renamed `@bitmonk8/pi-loom` → **`@bitmonk8/pi-theta`**. The `pi-`
prefix and the `pi-package` keyword are kept so the package stays discoverable as
a Pi package; the `@bitmonk8` scope makes the name collision-free regardless of
any unscoped `pi-theta`. This touches `package.json` (`name`, `keywords`,
`repository`, `description`), `package-lock.json`, `CHANGELOG.md` title, and every
doc that cites the package.

The rename is published as **`0.2.0`** — the version line continues from the old
package's `0.1.3` (the minor bump marks the rename) rather than resetting. The old
name is **already published to npm at `0.1.3`**; a rename is a new package, not a
version bump of the old one, so the old package is deprecated in place — see
§"npm registry".

### File extensions

The two-extension design is kept — program vs. library module stays distinguished
*by extension* — but both extensions are renamed:

- **`.loom` → `.theta`** — a runnable program.
- **`.warp` → `.thetalib`** — an imported library module (never run directly).

The old names came from a weaving metaphor (a `.warp` is the set of lengthwise
threads held on a loom). Theta has no weaving metaphor — it is a fixed-point /
recursion concept — so `.thetalib` is chosen as a plain, self-documenting
companion rather than a metaphor-derived one: a library file is instantly
identifiable in a directory listing, and the full extension pairs consistently
with the full `.theta`.

This choice cascades into discovery, the extension-matching code, docs, examples,
and every fixture: the 26 `.loom`/`.thetalib` files and the ~800 `warp`
references are all renamed. The byte-exact-lowercase match rule is preserved for
both new extensions (`Plan.THETA` never matches).

### CLI flag

`--loom <paths>` → **`--theta <paths>`**, a **hard rename with no alias** — the
old `--loom` flag is not registered at all and produces an unknown-flag error.
Registered by the extension via `pi.registerFlag('theta', ...)` and read with
`pi.getFlag('theta')` (`src/extension/factory.ts`). This is a breaking change for
any existing invocation or script, accepted deliberately: the package barely
propagated (the name collision blocked the registry entry), so there is little
installed base to protect, and carrying no alias keeps the flag surface clean.

### Discovery & manifest surface

These user-facing contract names coined by this extension (not by Pi, per
`docs/reference/discovery-cli.md`) are **hard-renamed** — the old names are not
scanned/read as fallbacks:

- Global dir `~/.pi/agent/looms/` → `~/.pi/agent/theta/`.
- Project dir `.pi/looms/` → `.pi/theta/`.
- Settings key `loomPaths` → `thetaPaths`.
- Package manifest key `pi.looms` → `pi.theta`.

Because these can fail *silently* (a renamed `.pi/looms/` dir or a stale
`loomPaths` key is simply not discovered — not an error), the rename adds a
**one-shot presence warning**: when discovery encounters an old-named dir
(`~/.pi/agent/looms/`, `.pi/looms/`) or an old settings/manifest key (`loomPaths`,
`pi.looms`), it emits a single deprecation diagnostic naming the new name. The old
names still do nothing functionally; the warning only converts silent
non-discovery into a loud, actionable message. This is a presence check, not real
fallback logic.

### Diagnostic-code prefix

The 199 distinct `loom/<area>/<code>` diagnostic families (e.g. `loom/load/*`,
`loom/parse/*`, `loom/host/*`) are renamed **`loom/` → `theta/`**, changing **only
the first segment** — all 199 `<area>/<code>` suffixes stay byte-for-byte
identical (`loom/load/cross-source-shadow` → `theta/load/cross-source-shadow`).

The prefix is user-visible in every error message, so it must read as Theta's;
keeping the suffixes stable minimizes the diff and preserves the codes' partial
recognizability. This is high-volume but low-risk-per-site: it touches every
emitter, every code definition, `docs/reference/diagnostics.md`, and every test
asserting a code string. The old-name presence warning (see *Discovery & manifest
surface*) is emitted under a `theta/…` code.

### Governance version-naming & anchors

`docs/spec_topics/governance/release-version-naming.md` bakes the old name into
two things, both resolved here:

- **Release-version literal.** The scheme `loom <major>.<minor>` /
  `loom <major>.<minor>.<patch>` (GOV-19) is renamed to `theta <major>.<minor>` /
  `theta <major>.<minor>.<patch>`, and every spec/plan callsite of the literal is
  converted. The legacy `V1`/`V2` alias rows re-point to the `theta` scheme.
- **Anchor scheme.** The `loom-*` anchor-permanence apparatus (GOV-25–GOV-29 and
  the 57 `loom-1-0-*` anchors it protects) is **rewritten from a clean slate**:
  the `loom`-era dual-anchor / permanence machinery is removed and the anchor
  scheme is re-authored fresh as `theta-*`. This is a deliberate governance
  rewrite, not an alias-preserving migration. It is lawful here because the corpus
  is self-contained and barely published — no external inbound `#loom-1-0-*` links
  are known, and every in-corpus cross-ref is under our control and updated in the
  same pass. The end state carries no `loom-*` anchors and no residual permanence
  rules.

Because it discards the anchor-permanence regime rather than honouring it, this is
the most rules-entangled part of the rename and is done as its own reviewed pass.

## Work breakdown

Ordered so that decisions and the high-blast-radius contract renames land before
the mechanical sweeps. Each item implements the decisions above.

### 1. Package identity

- `package.json`: `name`, `description`, `keywords` (`loom` → `theta`;
  `scripting-language`/`dsl` keep), `repository.url` (after repo rename, §8).
- `package-lock.json`: regenerate (`npm install`) after `package.json` changes so
  the lockfile `name` and the self-referential entries update.
- `CHANGELOG.md`: title line `@bitmonk8/pi-loom` → `@bitmonk8/pi-theta`; add an
  `Unreleased` entry recording the rename.
- `docs/cleanup-inventory.md`: update the two `@bitmonk8/pi-loom` references
  (note: this doc also still claims `private: true` / unreleased — stale; the
  package is published).

### 2. Local tooling package

- `tools/eslint-plugin-loom-local/` → `tools/eslint-plugin-theta-local/`
  (`git mv`), its `package.json` `name`, the `file:` devDependency in root
  `package.json` (`eslint-plugin-loom-local`), and the plugin reference in
  `eslint.config.js`.

### 3. File extensions & fixtures — do before docs/examples

`.loom` → `.theta`, `.warp` → `.thetalib`:

- `git mv` the 26 `.loom` / `.warp` files under `docs/examples/`,
  `tests/acceptance/fixtures/`, `tests/fixtures/`.
- Extension-matching logic: `src/discovery/discovery-walk.ts` (the
  `ext === "loom" | "warp"` checks at lines ~317/325/333/426/657) and
  `src/discovery/package-discovery.ts` (~429/447).
- Grammar/parser references to the extensions in `src/parser/`, `src/lexer/`.
- The `splitExtension` byte-exact-lowercase rule (`*.theta` only, `Plan.THETA`
  never matches) — replicate the exact-match semantics for both new extensions,
  and preserve the rule that `.thetalib` files are import-only (never discovered
  as slash commands).

### 4. CLI flag & discovery surface

- `src/extension/factory.ts`: `LOOM_FLAG = "loom"` → `"theta"`; register/read the
  `theta` flag. No `--loom` alias is registered (hard rename).
- `src/extension/production-composition.ts`: `pi.getFlag("loom")` at ~1192 and
  the `kind: "loom"` composition tags.
- Discovery dir/settings/manifest names across `src/discovery/` and
  `src/extension/`: `looms/` → `theta/`, `.pi/looms/` → `.pi/theta/`,
  `loomPaths` → `thetaPaths`, `pi.looms` → `pi.theta`.
- Add the one-shot presence warning when an old-named dir or settings/manifest
  key is encountered (fails loudly instead of silently non-discovering).
- `docs/reference/discovery-cli.md`: rewrite the five-sources section, the
  priority table, the failure-mode table, and the `loom/load/*` code list.

### 5. Diagnostic codes

Rename only the `loom/` prefix segment to `theta/`; keep every `<area>/<code>`
suffix byte-identical:

- `src/diagnostics/` code definitions and every emitter.
- `docs/reference/diagnostics.md`.
- Every test asserting a `loom/...` code string (broad; `tests/**`).
- Add the old-name presence-warning code (a new `theta/load/*` family).

### 6. Runtime & internal identifiers

~970 `Loom*` / `Warp*` cased identifiers (`LoomValue` ×223, `LoomRegistry`,
`LoomBody`, `LoomPanic`, `LoomDocument`, `WarpTopLevelForm`, …). Internal, not a
public contract, but touches most of `src/` and `tests/`.

- Rename symbols: `Loom*` → `Theta*`, `Warp*` → `ThetaLib*` (mirroring the
  `.theta` / `.thetalib` extensions).
- `git mv` the ~12 source files with `loom` in the name
  (`src/extension/production-loom-producer.ts`,
  `src/extension/loom-composition-producer.ts`, `src/parser/loom-document.ts`,
  `src/mvp/minimal-loom.ts`, test files, etc.) and fix imports.
- The `Warp*` types survive as `ThetaLib*`: the two-extension design is kept, so
  the library-module type family stays, only renamed.

### 7. Prose, spec, and docs

- `README.md`: title, intro, all `pi-loom`/`Loom`/`.loom`/`.warp` mentions, the
  two repo links, and the embedded `.loom` example blocks.
- `docs/guide.md`, `docs/tutorial.md`, `docs/how-to/*` (8 files — note two have
  `loom`/`warp` in the filename: `call-a-tool-from-loom-code.md`,
  `embed-the-loom-runtime-as-a-pi-extension.md`, `import-a-warp-module.md`),
  `docs/reference/*` (grammar, type-system, frontmatter, errors-and-results,
  hard-ceilings, schema-subset, coverage-matrix).
- `docs/spec.md` + `docs/spec_topics/**` (273 plan-topic + 99 spec-topic files
  contain `loom`). The largest prose surface.
- `skills/authoring-looms/` → rename dir + `SKILL.md` body.
- `docs/STYLE.md` (the `pi --loom` runnable-example rule).
- Governance (own reviewed pass): rewrite `release-version-naming.md` and
  `anchor-scheme-and-retired.md` — rename the version literal to `theta <ver>`,
  convert every spec/plan callsite, and re-author the anchor scheme as `theta-*`
  from a clean slate (removing the `loom-*` permanence machinery). Verify no
  external inbound `#loom-1-0-*` links first.

### 8. Git repository & remotes

- Rename the GitHub repo `bitmonk8/pi-loom` → `bitmonk8/pi-theta` (GitHub keeps a
  redirect from the old name, but update anyway).
- Update `git remote set-url origin` locally.
- Update `package.json` `repository.url` and all README/CHANGELOG repo links.
- Consider renaming the local working directory `C:/UnitySrc/pi-loom`.

### 9. npm registry

- A package rename is a **new package** (`@bitmonk8/pi-theta`), not a version
  bump of `@bitmonk8/pi-loom`.
- Publish `@bitmonk8/pi-theta` at **`0.2.0`**, continuing the version line from the
  old package's `0.1.3` (the minor bump marks the rename).
- `npm deprecate @bitmonk8/pi-loom "renamed to @bitmonk8/pi-theta"` on the old
  package so existing installs get a pointer. Do **not** unpublish (unpublish
  breaks anyone already depending on it and blocks re-use of the name window).

## Suggested sequencing

1. Freeze the decisions above and take a clean-tree baseline before editing.
2. Rename GitHub repo + local remote (§8) — cheap, do early so links resolve.
3. Package identity + local eslint plugin (§1, §2).
4. Extensions/fixtures (§3) and CLI/discovery contract (§4) together — they share
   the discovery code and the extension rename.
5. Diagnostic codes (§5), then internal identifiers (§6) — mechanical, high
   volume; run `npm run build`, `npm run lint`, `npm test` after each.
6. Prose/spec/governance (§7) last and in its own review pass — largest surface,
   and the governance rewrite is its own reviewed pass against its own rules.
7. Publish + deprecate on npm (§9).

## Risks & gotchas

- **No weaving metaphor under Theta.** `.warp` had no natural successor; it is
  renamed to `.thetalib` (a plain, self-documenting companion) rather than a
  metaphor-derived name. The ~800 `warp` references and the `Warp*` identifiers
  are renamed with it.
- **Governance anchor rewrite.** The `loom-1-0-*` anchors are protected by the
  project's own permanence rules (GOV-26). The rename discards that regime
  wholesale (clean slate) rather than dual-anchoring; this is safe only because no
  external inbound `#loom-1-0-*` links exist and the whole corpus is updated in
  one pass. Verify the no-external-links assumption before removing the anchors.
- **Machine-facing contracts change.** The CLI flag, settings key, manifest key,
  discovery dirs, and diagnostic codes are matched by users, settings files, and
  tests. The CLI flag and discovery/manifest names are hard-renamed with no
  functional fallback; the discovery/manifest old names get a one-shot presence
  warning so they fail loudly, not silently.
- **npm is append-only**: the old published `0.1.3` cannot be reused; deprecate,
  don't unpublish.
- **The ignored `.pi/` local state** contains ~5,300 additional `loom` hits but
  is untracked/local-only — out of scope for the rename; do not touch.
- **Two-package confusion during transition**: until the deprecation and registry
  entry settle, both names may be visible. Note the `@bitmonk8` scope makes
  `@bitmonk8/pi-theta` collision-free even if an unscoped `pi-theta` exists.
