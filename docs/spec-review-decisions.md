# pi-loom — Spec Review Decisions and Edit Plan

_Generated: 2026-05-04_
_Source: docs/spec-review.md (12 decisions resolved)_

This document records the choices made for each remaining finding in the
spec review and maps each choice to the concrete spec/plan files that
must be edited, the diagnostic codes introduced, and the leaf-level
plan changes.

---

## Decision summary

| # | Topic | Choice | Headline |
|---|---|---|---|
| 1 | `QueryError` variants placement | A | Consolidate in `errors-and-results.md` |
| 2 | `InvokeFailure` rename | B | → `InvokeInfraError` (wire kind unchanged) |
| 3 | `ToolCallError`/`ToolFailureError` rename | A | → `CodeToolError` / `ModelToolError` |
| 4 | Five `invoke` edge cases | 1A + 5D | Depth-32 panic; path-escape against any active root |
| 5 | Binder model resolution | B | Require `looms.binderModel`; fail-fast load; `binder_model:` → `bind_model:` |
| 6 | Binder envelope arms | C | Keep two arms; document forward-compat rationale |
| 7 | `argument-hint` surface | B | Binder-grounding only; document Pi gap |
| 8 | Hot-reload mechanism | A | In-process re-parse with `LoomRegistry` swap |
| 9 | `--loom` CLI flag | A | Single string flag, OS path-list separator |
| 10 | Same-source `.loom` collisions | A | Uniform load-time error |
| 11 | `retry` vs `coercion` naming | A | Rename `retry:` → `coercion:` |
| 12 | Per-rule REQ-IDs | B | Heading promotion + per-page REQ-ID prefixes |

---

## Recommended landing order

Hard ordering constraints:

- **#1 before #2, #3** — consolidating `QueryError` first makes the renames a one-file edit instead of three.
- **#2 before #4** — Decision 4's depth-cap option uses the renamed schema (`InvokeInfraError`).
- **#12 last** — REQ-IDs are a mechanical pass over every spec page; any earlier structural edits would force renumbering.

Suggested commit sequence:

1. **#1** `QueryError` consolidation
2. **#2** `InvokeFailure` → `InvokeInfraError`
3. **#3** `ToolCallError`/`ToolFailureError` → `CodeToolError`/`ModelToolError`
4. **#4** Five `invoke` edge cases
5. **#5** Binder model resolution + `binder_model:` rename
6. **#6** Binder envelope rationale + V16m fix
7. **#7** `argument-hint` rescope
8. **#8** Hot-reload mechanism
9. **#9** `--loom` CLI flag
10. **#10** Same-source `.loom` collisions
11. **#11** `retry:` → `coercion:` rename
12. **#12** Per-rule REQ-IDs (mechanical pass over all spec pages and leaves)

Decisions 5, 6, 7, 8, 9, 10, 11 are independent of each other — order between them is editorial, not technical.

---

## 1. `QueryError` variants placement → Option A

**Choice.** Add a normative `## QueryError variants` section to
`spec_topics/errors-and-results.md` containing the union declaration and
all eight variant `schema { ... }` blocks in fixed order (query-time,
then tool-call, then invoke). Each variant gets a one-line "fires when"
lead-in. Feature pages keep narrative-only and link to the canonical
section.

**Spec edits.**

- `spec_topics/errors-and-results.md` — new `## QueryError variants` section
  after the panics section.
- `spec_topics/query.md` — replace the eight `schema` blocks in the
  failure-modes section with a single cross-link to
  `errors-and-results.md#queryerror-variants`; keep the prose explaining
  query-time semantics, `validation_errors` shape, and discriminator
  field.
- `spec_topics/tool-calls.md` — drop the `ToolCallError` `schema` block;
  keep narrative + cross-link.
- `spec_topics/invocation.md` — drop the `InvokeFailure` and
  `InvokeCalleeError` `schema` blocks; keep narrative + cross-link.
- `spec_topics/descriptions.md` — replace the seven-variant illustrative
  declaration with a cross-link to the canonical section.

**Plan edits.**

- No leaf behaviour changes. Mechanical follow-up: re-point `Spec.` link
  targets in V5g, V6i, V6j, V14f–V14i, V15l, V15m to the consolidated
  section.

**Notes for implementer.**

- Variant ordering in the consolidated section must match the union
  declaration so the page reads top-to-bottom.
- The `inner: QueryError` field on `InvokeCalleeError` becomes
  self-referential within a single section (clearer than the current
  cross-file recursion).
- `slash-invocation.md`'s per-`kind` table should be made exhaustive
  against the consolidated list (separate finding, but unblocked here).

---

## 2. `InvokeFailure` → `InvokeInfraError` (Option B)

**Choice.** Rename schema `InvokeFailure` → `InvokeInfraError`. Wire
`kind: "invoke_failure"` is **unchanged** (snake_case discriminants are
a separate convention; renaming them is an unrelated, larger churn).

**Spec edits** (apply after Decision 1 lands, so this is a single-file
edit on the consolidated section):

- `spec_topics/errors-and-results.md` — schema declaration and union
  listing in the new `## QueryError variants` section.
- `spec_topics/invocation.md` — "Failures" prose; add a one-line note
  clarifying the infra-vs-callee split now that the name implies it.
- `spec_topics/descriptions.md` — already a cross-link after Decision 1;
  no further edit.
- `spec_topics/tool-calls.md` — line 41 cross-reference (search for the
  bare word `InvokeFailure`).
- `spec_topics/errors-and-results.md` panic-routing bullet — wire kind
  stays `"invoke_failure"`; no edit needed.

**Plan edits.**

- `plan_topics/v15-invoke.md`:
  - V15l header `## V15l — InvokeFailure variant` → `## V15l —
    InvokeInfraError variant`.
- `plan_topics/v18-cancellation.md`:
  - V18o "Adds" line: keep wire `kind: "invoke_failure"`; only the
    schema name changes in any test labels that reference the type.

**No new diagnostic codes.**

---

## 3. `ToolCallError` / `ToolFailureError` → `CodeToolError` / `ModelToolError` (Option A)

**Choice.** Rename:

- `ToolCallError` → `CodeToolError` (wire `kind: "tool_call"` →
  `"code_tool"`)
- `ToolFailureError` → `ModelToolError` (wire `kind: "tool_failure"` →
  `"model_tool"`)

Unlike Decision 2, both wire discriminants change here because the
existing `tool_call` (action noun) vs `tool_failure` (failure noun)
asymmetry is part of the inconsistency the rename fixes. Human-facing
message text in the slash-invocation table keeps the word "failed" even
though the type name no longer contains it.

**Spec edits.**

- `spec_topics/errors-and-results.md` — schema names + union listing
  (post-Decision 1).
- `spec_topics/query.md` — `QueryError` definition prose, separation
  paragraph.
- `spec_topics/tool-calls.md` — schema reference and "distinct from
  `ToolFailureError`" paragraph.
- `spec_topics/descriptions.md` — illustrative declaration cross-link
  text (post-Decision 1).
- `spec_topics/cancellation.md` — `kind: "tool_call"` example in
  abort-result bullet.
- `spec_topics/slash-invocation.md` — per-`kind` formatting table:
  `tool_failure` row → `model_tool`; if a `code_tool` row is added in
  the same pass, this finding closes the related "table covers only 5
  of 8 variants" gap for these two rows.
- `spec_topics/pi-integration-contract.md` — `kind: "tool_call", cause:
  "execution"` example.
- `spec.md` — TOC entry mentioning `ToolCallError`.

**Plan edits.**

- `plan_topics/v5-untyped-queries.md`:
  - V5g — `QueryError` union — initial variants: rename listing.
- `plan_topics/v14-tool-calls.md`:
  - V14c — bare `<name>(args)` call: rename references.
  - V14f, V14g, V14h, V14i — `ToolCallError` variant per cause: leaf
    headers and bodies use `CodeToolError`; wire kind in test fixtures
    becomes `"code_tool"`.
- `plan_topics/v18-cancellation.md`:
  - V18c — `AbortSignal` before every tool call: rename references.

**No new diagnostic codes.**

---

## 4. Five `invoke` edge cases (1A + 5D + three conservative fixes)

**Choice.** All five fixes land in the V15 round.

### Case 1 — Depth bound (Option 1A: panic)

- Fixed cap: **32**, counting direct `invoke`, registered-loom calls,
  and warp `fn` invokes.
- Overflow → runtime panic, source `loom/runtime/invoke-depth`.
- Existing panic routing applies: top-level → Pi system note; invoke
  parents see `Err(InvokeInfraError { reason: "panic", ... })`.
- Per-chain counter, not per-process (sibling invokes do not share
  budget).

### Case 2 — `invoke<Schema>` annotation vs callee return-type mismatch

- When both annotation and callee are statically resolvable (per
  Decision-resolved "Static resolution" in `invocation.md`), parse-time
  check structural compatibility using the same relation `let x: T =
  expr` uses (compatibility, not equality — upcasting allowed).
- Mismatch → parse error `loom/parse/invoke-return-type-mismatch`.
- Otherwise runtime AJV remains the safety net.

### Case 3 — Prompt → prompt callee `tools:` lifetime

- Child's `tools:` register against caller's conversation for the
  duration of the child's body; unregister on return/abort/cancel/panic.
- Model sees the **child's** tools (not the parent's) during
  child-issued queries.
- On return, the immediately-prior set is restored (idempotent under
  nested chains; not "the root").
- Same statement covers the dual case in `tool-calls.md`'s
  registered-loom-callee paragraph.

### Case 4 — Argument arity

- Too few non-defaulted args:
  - statically resolvable callee → parse error
    `loom/parse/invoke-arity-too-few`
  - otherwise → runtime `InvokeInfraError { reason: "validation" }`
- Too many args → always parse error
  `loom/parse/invoke-arity-too-many` (no runtime safety net possible).
- Arity check runs **before** per-argument type checking.
- Pi tool calls (single object argument) unaffected.

### Case 5 — Path escape (Option 5D: any active discovery root)

- Resolved path must lie within the union of discovery roots active for
  the current Pi session.
- Reject after `realpath` normalisation (symlink farms inside a root
  resolving outside it must still be rejected).
- Error code: `loom/load/invoke-path-escape`.

**Spec edits.**

- `spec_topics/invocation.md` — primary; gains:
  - Depth-cap paragraph after "Cycle detection".
  - Static `Schema`-vs-return compatibility rule in "Typed return".
  - Tools-lifetime statement in cross-mode "Tools and model".
  - Arity rules in "Argument binding".
  - Path-restriction rule in "Resolution".
- `spec_topics/tool-calls.md` — cross-reference arity rules; mirror
  tools-lifetime statement on registered-loom-callee paragraph.
- `spec_topics/frontmatter.md` — cross-link arity rule from `params:`
  defaults section.
- `spec_topics/discovery.md` — define the term "discovery root" cleanly
  so the path-restriction rule can link to it.
- `spec_topics/errors-and-results.md` — add `loom/runtime/invoke-depth`
  to the panic-sources list.

**Plan edits.**

- `plan_topics/v15-invoke.md`:
  - V15a — `invoke("./path.loom", ...)` parsing/resolution: add path-escape check.
  - V15c — typed `invoke<Schema>`: add static return-type compatibility check.
  - V15d — positional argument binding: add arity rules.
  - V15e — `.loom` paths in `tools:`: same arity + path-escape rules.
  - V15h — cross-mode prompt → prompt: tools-lifetime spec.
  - V15l — `InvokeInfraError` variant: no `depth_exceeded` reason added
    (depth surfaces as panic, not `Err`).
- `plan_topics/v18-cancellation.md`:
  - V18n — panic routing `invoke` parent surface: add
    `loom/runtime/invoke-depth` as a tested source.

**New diagnostic codes.**

- `loom/runtime/invoke-depth` (panic source)
- `loom/parse/invoke-return-type-mismatch`
- `loom/parse/invoke-arity-too-few`
- `loom/parse/invoke-arity-too-many`
- `loom/load/invoke-path-escape`

---

## 5. Binder model resolution → Option B (require `looms.binderModel`)

**Choice.**

- Resolution chain: `bind_model:` frontmatter → Pi setting
  `looms.binderModel`. **No further fallback.** No "tier-2" default; no
  inheritance from the loom's `model:`.
- If unresolved when any **non-bypass** loom is in scope: fail-fast at
  load with `loom/load/binder-model-unresolved`. The loom is reported in
  `LoadExtensionsResult.errors` (or whatever channel that adjacent
  finding settles on) and its slash command is **not** registered.
- Strict structured-output / strict tool-input capability is checked at
  the same load-time pass via Pi's model registry. Failure →
  `loom/load/binder-model-not-strict-capable`.
- Bypass-eligible looms (V3c) skip both checks — they never call the
  binder.
- If Pi does not expose a strict-capable flag, the load-time check
  degrades to best-effort and failures surface later as
  `loom/runtime/binder-malformed-envelope` (already covered by V16o).
  Document this fallback explicitly.
- Hot-reload of Pi settings (`looms.binderModel` changed at runtime)
  re-resolves on the next loom load; does not retroactively fix
  already-failed loads.

Co-resolved sibling: rename frontmatter key `binder_model:` → `bind_model:`
for consistency with `bind_context` / `bind_echo`.

**Spec edits.**

- `spec_topics/binder.md` — replace "Binder model" paragraph (also touched
  by the cruft-removal sibling finding; coordinate); state the two-step
  chain, both load-time error codes, and the strict-mode requirement.
- `spec_topics/frontmatter.md` — rename `binder_model:` row to
  `bind_model:`; update example block; update field bullet (line 31);
  update `looms.binderModel` Pi-setting description to "required when
  any non-bypass loom is in scope."
- `spec_topics/implementation-notes.md` — line 23 binder-call bullet:
  align with the chain and the strict-mode requirement.

**Plan edits.**

- `plan_topics/v3-frontmatter.md`:
  - V3a — frontmatter parsing: rename recognised field
    `binder_model` → `bind_model`.
- `plan_topics/v16-binder.md`:
  - V16e — `binder_model` resolution chain: rename leaf to
    `bind_model` resolution chain; ships when both load-time errors fire
    correctly and bypass looms skip both checks.
  - V16f, V16g, V16h, V16n — unblocked once V16e ships.

**New diagnostic codes.**

- `loom/load/binder-model-unresolved`
- `loom/load/binder-model-not-strict-capable`

**Cross-decision dependency.** This decision adds `looms.binderModel` as a
required setting; the separate "settings.json `looms` array shape
unspecified" finding (not in this batch) must accommodate it when
resolved.

---

## 6. Binder envelope arms → Option C (keep two arms; document rationale)

**Choice.** Schema unchanged. Add a one-paragraph rationale immediately
after the envelope description in `binder.md`:

> The two failure arms produce indistinguishable V1 user-facing
> behaviour beyond the system-note prefix; the structural distinction
> exists for the deferred binder refinement loop (cf.
> `future-considerations.md`), where only `needs_info` reopens for a
> clarifying turn.

The `candidates` field stays in the schema (binder may emit it; AJV
accepts `null`), but the runtime must **not** surface it in V1.

**Spec edits.**

- `spec_topics/binder.md` — add the rationale paragraph after the
  envelope description.

**Plan edits.**

- `plan_topics/v16-binder.md`:
  - V16m — `ambiguous` envelope handling: drop "with `candidates`
    enumeration" from the Adds line; align with the failure-modes table
    (render only `<message>`); add a test asserting the V1 `ambiguous`
    system note text contains no candidate values.

**No new diagnostic codes.**

---

## 7. `argument-hint` surface → Option B (binder-grounding only)

**Choice.**

- The registered `description` is **only** `frontmatter.description`.
- `argument-hint` is wired into the binder grounding payload only.
- Emit advisory diagnostic `loom/load/argument-hint-not-displayed` when
  a loom declares `argument-hint` but no `description`, so authors are
  not surprised by an empty-looking dropdown entry.
- List the Pi extension-API gap in `future-considerations.md` so a
  future contributor can either upstream `argumentHint` to Pi's
  `RegisteredCommand` or revisit the decision.

**Spec edits.**

- `spec_topics/pi-integration.md` — slash-command discovery bullet:
  drop the "drives autocomplete" claim.
- `spec_topics/slash-invocation.md` — paragraph on `argument-hint`:
  rewrite to describe binder grounding only; add one sentence noting
  the Pi extension-API gap.
- `spec_topics/pi-integration-contract.md` — extension entry-point
  step 2 / `pi.registerCommand` shape: keep registration shape
  unchanged; document that `description` carries `frontmatter.description`
  alone.
- `spec_topics/frontmatter.md` — soften "mirrors Pi's prompt-template
  frontmatter" with a note that `argument-hint` is currently used
  internally only.
- `spec_topics/binder.md` — confirm `argument-hint` as binder grounding
  (read-only check; already implied).
- `spec_topics/future-considerations.md` — add an entry: "Pi extension
  API: `argumentHint` field on `RegisteredCommand`."

**Plan edits.**

- `plan_topics/m-mvp.md`:
  - M — minimal end-to-end loom: registered `description` is only
    `frontmatter.description`.
- `plan_topics/v3-frontmatter.md`:
  - V3a — frontmatter parsing: `argument-hint` recognised; advisory
    diagnostic when set without `description`.
- `plan_topics/v16-binder.md`:
  - V16f — `bind_context: none`: confirm `argument-hint` flows into
    binder grounding payload (read-only — already specified).

**New diagnostic codes.**

- `loom/load/argument-hint-not-displayed` (advisory)

---

## 8. Hot-reload mechanism → Option A (in-process re-parse + `LoomRegistry` swap)

**Choice.**

- Each `.loom` registered exactly once at extension load with a handler
  closing over an internal mutable `LoomRegistry`.
- On chokidar event: re-parse just the changed file plus any `.warp`
  importers (tracked via in-memory import graph) inside the extension
  process; swap the registry entry. **No `ctx.reload()`.**
- Tools exposed to LLMs are re-registered via `pi.registerTool`
  (documented as supported after startup).
- AJV validators dropped per-file as part of the swap (the same swap
  that V18g currently expects to do separately — V18g collapses into
  the swap).
- In-flight invocation rule: `LoomRegistry.dispatch` reads the entry
  once at handler entry; a swap mid-execution does not affect the
  running invocation. The next invocation sees the new version.
- Debounce chokidar at 250 ms regardless (editors emit `change` +
  `rename` bursts).
- **Structural changes** (file added or removed, as opposed to edited)
  cannot register/unregister a slash command after extension load. The
  watcher surfaces a one-line system note prompting the user to run
  `/reload`.
- Declare `chokidar` in `package.json` `dependencies` with a concrete
  version range (this co-resolves the related `peerDependencies use *`
  finding's chokidar slot).

**Spec edits.**

- `spec_topics/pi-integration-contract.md` — extension entry point step
  3: replace with the in-process re-parse + table-swap mechanism.
  State that `ctx.reload()` is **not** called for content edits. Add the
  structural-change escape hatch and the system-note prompt.
- `spec_topics/pi-integration.md` — file-watcher bullet: tighten to
  "edits to existing `.loom` and `.warp` files take effect without a
  session restart; addition or removal of a file requires `/reload`."
- `spec_topics/implementation-notes.md` — replace "the file watcher
  invalidates the cache on change" with "the in-process re-parse path
  drops the AJV validator entry for the changed file and every
  transitive importer."
- `spec_topics/schema-subset.md` — same edit as above.
- `package.json` — add `chokidar` to `dependencies` with a concrete
  version range.

**Plan edits.**

- `plan_topics/v18-cancellation.md`:
  - V18f — file watcher (chokidar) over discovery roots: in-process
    re-parse; structural-change system note; 250 ms debounce; `.warp`
    importer graph.
  - V18g — AJV cache invalidation on file change: collapses into "the
    `LoomRegistry` swap drops the AJV validator entry"; no separate
    watcher-driven path.

**No new diagnostic codes.** (System-note prompt is an informational
runtime message, not a load/runtime error code.)

---

## 9. `--loom` CLI flag → Option A (path-list separator)

**Choice.**

- Register `--loom` once via `pi.registerFlag('loom', { type: 'string',
  description: '…' })` in the extension factory **before** subscribing
  to `resources_discover`.
- The value is a list of paths joined with the OS path-list separator
  (`Node`'s `path.delimiter`: `:` on POSIX, `;` on Windows).
- Each entry is a file or directory, resolved with the same rules as
  the settings `looms` array (co-resolved with the separate
  settings-array-shape finding).
- Document Windows behaviour (`;`) prominently in `discovery.md`.

**Spec edits.**

- `spec_topics/discovery.md` — change source list to: `CLI: --loom
  <paths> (single flag; multiple paths joined with the OS path-list
  separator — ':' POSIX, ';' Windows)`. Cross-reference settings-array
  entry shape.
- `spec_topics/pi-integration-contract.md` — entry-point bullet:
  "Registers a CLI flag via `pi.registerFlag('loom', { type: 'string',
  description: '…' })` and reads it with `pi.getFlag('loom')` during
  `resources_discover`."

**Plan edits.**

- `plan_topics/v14-tool-calls.md`:
  - V14o — discovery `--loom` CLI flag: single string flag,
    `path.delimiter` split; "multiple flags" test removed (no longer
    representable); replaced with "multiple paths in one delimited
    string" test.
  - V14p — source priority and shadowing warning: no change.

**No new diagnostic codes.**

---

## 10. Same-source `.loom` collisions → Option A (uniform load-time error)

**Choice.** Two `.loom` files at the same priority that derive the same
slash name → load-time error reported through Pi diagnostics; **neither**
registers. Identical wording and code path to the cross-format collision
rule.

Edge cases:

- Detection runs on the **final derived name** (after `pi.looms`
  mapping), not the source filename.
- CLI `--loom` repeated with `code-review.loom` and `code_review.loom`
  (both hyphen-normalising to the same wire name) → error.
- Settings entries resolving to the same absolute path post-tilde-
  expansion are deduplicated, not flagged.
- Diagnostic must list **every** conflicting path, not just two.

**Spec edits.**

- `spec_topics/discovery.md` — extend "Slash-name collisions across
  formats" paragraph to "Slash-name collisions at the same priority",
  covering both same-format (`.loom` vs `.loom`) and cross-format
  cases. State that the rule is symmetric across all source types and
  all file formats.

**Plan edits.**

- `plan_topics/v14-tool-calls.md`:
  - V14m — discovery: package `looms/` and `pi.looms`: same-priority
    error path tested.
  - V14n — discovery: settings `looms` array: same.
  - V14o — discovery: `--loom` CLI flag: same; hyphen-normalisation
    collision tested.
  - V14p — source priority and shadowing warning: cross-priority
    behaviour unchanged; same-priority error referenced.
  - V14q — cross-format slash collision: extends to cover same-format
    same-priority case (single test surface, single diagnostic).

**New diagnostic codes.**

- Extend the existing `loom/load/slash-name-collision` (or whatever the
  cross-format finding settles on) to cover same-priority same-format;
  no new code if the cross-format error already uses a generic
  collision code.

---

## 11. `retry:` → `coercion:` (Option A)

**Choice.** Rename frontmatter key `retry:` → `coercion:` everywhere.
`retry.attempts` / `retry.methodology` become `coercion.attempts` /
`coercion.methodology`. `ValidationError.attempts` field name stays
(internal; not renamed to `coercion_attempts`).

**Spec edits.**

- `spec.md` — line 28: replace ", `retry`," with ", `coercion`,".
- `spec_topics/frontmatter.md`:
  - Example block: `retry:` → `coercion:`.
  - Bullet at line 75: rewritten with the new key.
  - "When to use which" subsection: subject of a separate finding
    recommending deletion — coordinate so the rename does not
    re-introduce the deleted text.
- `spec_topics/query.md`:
  - "Schema-validation coercion" section (lines 165–168): replace
    `retry.attempts` / `retry.methodology` with `coercion.attempts` /
    `coercion.methodology`.
- `spec_topics/implementation-notes.md`:
  - Line 24 AJV bullet: clarify "AJV's built-in string-to-primitive
    coercion is disabled" to disambiguate from loom-level coercion.

**Plan edits.**

- `plan_topics/v3-frontmatter.md`:
  - Recognised-fields list: `retry` → `coercion`.
- `plan_topics/v13-wire-names.md`:
  - V13 page title: "retry/coercion" → "coercion".
  - V13f — `retry:` frontmatter parsing: rename leaf to `coercion:`
    frontmatter parsing.
  - V13g, V13h, V13i — coercion methodologies: bodies switch
    `retry.attempts` → `coercion.attempts`.
  - V13j — coercion preserves tool-call side effects: same.
- `plan_topics/coverage-matrix.md`:
  - Lines 27 and 31: row labels updated.

**No new diagnostic codes.** Existing `pi.recognised-frontmatter-field`
warning code (V3a) needs the new key in fixtures.

---

## 12. Per-rule REQ-IDs → Option B (heading promotion + REQ-IDs)

**Choice.** Two-phase mechanical pass, run **last**:

**Phase 12a — Heading promotion.** Promote every bold-prefixed paragraph
in `binder.md`, `query.md`, `schemas.md`, `expressions.md`,
`frontmatter.md` (and any sibling pages with the same pattern) to
`##`/`###` sub-headings. This restores GitHub anchors so
`coverage-matrix.md` `#fragment` links can point below file granularity.

**Phase 12b — REQ-ID assignment.** Each atomic obligation gets a
per-page identifier (`BIND-1`, `BIND-2`, `QRY-1`, `SCHM-1`, ...).
Inline as `**BIND-7.**` at the start of the rule paragraph or as
`<a id="bind-7"></a>` anchors. Then:

- Rewrite `plan_topics/coverage-matrix.md` to map `REQ-ID → leaf`.
- Update `plan_topics/conventions.md` `Tests.` definition: "one bullet
  per REQ-ID; cite the ID."
- One mechanical pass over every leaf's `Tests.` bullets to add REQ-ID
  citations.

**Discipline rules.**

- IDs are immutable. When a rule is split, the original ID retires; two
  new IDs appear. **Never renumber to fill holes.**
- Pick the prefix from the spec page's filename stem at first numbering
  and freeze it. Document the prefix table in `spec.md`. For
  ambiguous cases (`errors-and-results.md` → `ERR` or `RES`?), pick
  once and document.
- Pure-narrative pages carry **no** IDs: `overview.md`, `influences.md`,
  `comparison.md`, `related-work.md`, `future-considerations.md`.

**Spec edits.** Touches every spec page with rules:

`binder.md`, `query.md`, `schemas.md`, `expressions.md`, `frontmatter.md`,
`lexical.md`, `type-system.md`, `schema-subset.md`, `bindings.md`,
`control-flow.md`, `errors-and-results.md`, `return.md`, `functions.md`,
`tool-calls.md`, `invocation.md`, `imports.md`, `discovery.md`,
`slash-invocation.md`, `cancellation.md`, `diagnostics.md`,
`runtime-value-model.md`, `pi-integration-contract.md`,
`implementation-notes.md`, `descriptions.md`, `pi-integration.md`,
`grammar.md`, `glossary.md`.

Plus `spec.md` — Appendix list documenting the prefix table.

**Plan edits.**

- `plan_topics/conventions.md` — `Tests.` definition rewrite.
- `plan_topics/coverage-matrix.md` — mapping rewrite from sections to
  REQ-IDs.
- Every leaf in `plan_topics/*.md` — `Tests.` bullets gain REQ-ID
  citations (mechanical, no behaviour change).
- `plan_topics/v18-cancellation.md`:
  - V18o — coverage-matrix closing gate: acceptance criterion shifts
    from "every executable spec section is mapped" to "every REQ-ID is
    mapped". Implementable as a CI check (e.g.
    `comm -23 <(grep spec REQ-IDs) <(grep matrix REQ-IDs)`).

**No new diagnostic codes.**

**Why last.** Any of the other 11 decisions that adds, splits, or
renames a rule would otherwise force REQ-ID renumbering. Landing 12
last means each REQ-ID is assigned to text in its final form.

---

## Cross-decision dependencies summary

| Dependency | Reason |
|---|---|
| #2 after #1 | Single-file rename instead of three-file rename. |
| #3 after #1 | Same. |
| #4 after #2 | Depth-cap option references `InvokeInfraError` schema. |
| #6 (V16m fix) does not block #5 | Different leaves in V16. |
| #7 advisory diagnostic does not block #4 path-escape diagnostic | Both add codes to the same `loom/load/*` namespace; coordinate naming. |
| #10 cross-references future settings-array shape finding | Not in this batch; do not block #10 on it — settle the array shape later and apply this rule on top. |
| #5 introduces two new `loom/load/*` codes | The separate "no diagnostic codes assigned to named parse errors" finding's resolution must enumerate them. |
| #12 last | Mechanical pass over every spec page; any earlier structural edits would force renumbering. |

---

## New diagnostic codes introduced (all decisions)

| Code | Severity | Decision |
|---|---|---|
| `loom/runtime/invoke-depth` | panic source | #4 |
| `loom/parse/invoke-return-type-mismatch` | parse error | #4 |
| `loom/parse/invoke-arity-too-few` | parse error | #4 |
| `loom/parse/invoke-arity-too-many` | parse error | #4 |
| `loom/load/invoke-path-escape` | load error | #4 |
| `loom/load/binder-model-unresolved` | load error | #5 |
| `loom/load/binder-model-not-strict-capable` | load error | #5 |
| `loom/load/argument-hint-not-displayed` | advisory | #7 |

The separate "no diagnostic codes assigned to named parse errors"
finding (not in this batch) must include these eight in its enumeration
when it resolves.

---

## Files touched (rough scope)

- **Spec pages edited by ≥ 3 decisions:**
  `errors-and-results.md` (#1, #2, #3, #4, #12), `invocation.md` (#1, #2,
  #4, #12), `query.md` (#1, #3, #11, #12), `binder.md` (#5, #6, #12),
  `frontmatter.md` (#5, #7, #11, #12), `discovery.md` (#4, #9, #10, #12),
  `pi-integration-contract.md` (#7, #8, #9, #12).
- **Plan files edited:** `v3-frontmatter.md`, `v5-untyped-queries.md`,
  `v13-wire-names.md`, `v14-tool-calls.md`, `v15-invoke.md`,
  `v16-binder.md`, `v18-cancellation.md`, `m-mvp.md`,
  `coverage-matrix.md`, `conventions.md`.
- **Other:** `package.json` (#8), `spec.md` (#11, #12).
