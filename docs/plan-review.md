# Triaged Plan Review — plan

_Generated: 2026-06-12T00:30:00Z_
_Plan: docs/plan.md_
_Spec: docs/spec.md_
_Process: bottom-up — the last finding (T31) is addressed first; the first finding (T01) is addressed last._

_Triage tally: 0 blocker, 1 high, 4 medium retained; 9 low discarded; 9 low findings merged into 1 medium finding; 25 NIT dropped; 0 false dropped._

---

# T01 — "Sequential by default" omits the CLAUDE.md "Never block the async runtime" obligation

**Original heading:** "Sequential by default" omits CLAUDE.md "Never block the async runtime"
**Original section:** docs/plan_topics/conventions.md
**Kind:** doc-alignment-broad
**Importance:** medium
**Score:** 20
**MustFix:** false

## Finding

The project-level CLAUDE.md concurrency directive has two halves: *"Sequential by default"* and *"Never block the async runtime."* `conventions.md` adopts the first half verbatim as a cross-cutting rule, but that rule is scoped entirely to Promise-combinator concurrency — it forbids `Promise.all` / `Promise.race` / `Promise.allSettled` / `Promise.any` in `src/**` and defines the allow-list / closing-gate predicate for them. Nowhere in the plan corpus is the complementary half stated: synchronous blocking of the event loop (`fs.readFileSync`, `execSync`, busy-wait loops) is neither banned nor mentioned. A `grep` of the entire plan corpus for `readFileSync`, `execSync`, `busy-wait`, and `block`/`blocking` returns no hits.

This matters because the loom interpreter runs as plain async TypeScript on Pi's shared event loop (`spec_topics/implementation-notes.md` — "non-blocking at the runtime level, sequential at the language level"; "The loom interpreter runs as plain async TypeScript on Pi's event loop"). A synchronous blocking call in `src/**` would stall the host event loop for every concurrent invocation, which is exactly the failure the CLAUDE.md "Never block the async runtime" directive guards against — yet an implementer reading only the plan's "Sequential by default" rule sees only the Promise-combinator ban and has no documentary surface reminding them of the blocking-call prohibition.

The omission is also an enforcement-posture gap: the `no-restricted-syntax` lint wired by `H2a` matches only the four Promise-combinator forms. Blocking synchronous calls are not lint-detectable by that rule, so the blocking-runtime ban — even once stated — would carry no mechanical gate and would rest on the seam-adapter discipline (I/O routed through the `V8*` FileSystem seam) plus the Per-phase TDD ritual self-review step. The plan should state both the obligation and that it is unenforced mechanically.

## Plan Documents

- `docs/plan_topics/conventions.md` — *Sequential by default* cross-cutting rule; *Per-phase TDD ritual* self-review step (edited)
- `docs/plan_topics/H2a-cross-cutting-gates.md` — Convention / Tests bullet for *Sequential by default* (read-only) — confirms the `no-restricted-syntax` lint scope is Promise-combinators only

## Spec Documents

None

(`spec_topics/implementation-notes.md` grounds the "runs on Pi's event loop / non-blocking at the runtime level" property the fix cites, but the fix is internal to the plan and edits no spec page.)

## Affected Leaves

**Phases:** None

**Leaves (implementation order):**

None

(Cross-cutting `conventions.md` doc-alignment fix. `H2a`'s lint scope is unchanged — the blocking-call ban is explicitly non-lint-detectable — so no leaf's acceptance criteria, Deps, or sequencing change.)

## Consequence

**Severity:** advisory

An implementer following only the plan corpus has no statement of the blocking-runtime prohibition; a `fs.readFileSync` / `execSync` / busy-wait in `src/**` would stall Pi's shared event loop for all concurrent invocations, and neither the `no-restricted-syntax` lint nor any closing-gate check would catch it. Implementers can still produce working leaves (the seam-adapter discipline routes I/O off the blocking path), so this is a guidance gap rather than a hard blocker.

## Issue introduction

**Verdict:** present-since-inception
**Introducing commits:** `288f191` (2026-05-04) — "Add implementation plan with horizontal/MVP/vertical-slice phases"
**History:** The *Sequential by default* rule entered the corpus in `288f191` (then in the single-file `plan.md`) scoped to Promise-combinators only, and carried unchanged through the per-topic split (`fecb504`) into `conventions.md` and the `docs/` move (`31ff060`). `git log -S "Never block the async"`, `git log -S "readFileSync" -- docs/`, and `git log -S "execSync" -- docs/` show the blocking-runtime ban has never appeared in the plan corpus. The gap is original to the rule's authoring, not introduced by a later edit.

## Solution Space

**Shape:** single

### Recommendation

Append to the *Sequential by default* cross-cutting rule in `docs/plan_topics/conventions.md` text stating that the rule subsumes the CLAUDE.md *"Never block the async runtime"* directive: synchronous blocking of the event loop in `src/**` (e.g. `fs.readFileSync`, `execSync`, busy-wait loops) is forbidden because the interpreter runs on Pi's shared event loop (cross-reference `spec_topics/implementation-notes.md`). State the enforcement posture explicitly: this half carries **no mechanical gate** — the `no-restricted-syntax` rule wired by `H2a` matches only the Promise-combinator forms — so the blocking-call ban is enforced by the seam-adapter discipline (file/process I/O routed through the `V8*` FileSystem seam) and the *Per-phase TDD ritual* self-review step.

Add a blocking-call check to the self-review enumeration in the *Per-phase TDD ritual* (the bullet that already enumerates the broad-catch, globals, and ambient-primitive checks), so the manual residue this ban concedes has a named review home — mirroring how the *No globals* and ambient-access rules route their non-mechanical residue to the same self-review step.

## Relationships

None

---

# T02 — `DISC-4` is split across two coverage-matrix rows instead of the canonical multi-close form

**Original heading:** `DISC-4` appears in two rows, differentiated only by paraphrase qualifiers
**Original section:** docs/plan_topics/coverage-matrix.md
**Kind:** traceability
**Importance:** medium
**Score:** 25
**MustFix:** false

## Finding

In `coverage-matrix.md`'s *Numbered REQ-IDs* table, the single executable REQ-ID `DISC-4` is mapped by two separate rows:

```
| DISC-4 (discovery/collision detection) | `V10a` |
| DISC-4 (superseded-entry dispatch)     | `V9b`  |
```

`DISC-4` is one REQ-ID (`spec_topics/discovery/discovery-sources.md` §DISC-4, "Slash-name collision rules"); `V10a` closes its discovery/collision-detection aspect and `V9b` closes the `LoomRegistry`-side superseded-entry-dispatch aspect (`spec_topics/pi-integration-contract/drain-state-contract.md` §superseded-entry-dispatch, which cites DISC-4). Both closures are correct.

Every other multi-leaf REQ-ID in the same table uses one row with a comma-separated leaf cell — `ERR-17 | V4d, V13d`, `ERR-19 | V4d, V13c`, `CIO-1 | V16a, V4e, V11f`, `CIO-5 | V16a, H7a`, `DIAG-4 | V7b, V7c`, `CNCL-4 | V17a, V9g`. `DISC-4` is the lone deviation: it carries two rows whose REQ-ID column holds free-text parenthetical qualifiers (`(discovery/collision detection)`, `(superseded-entry dispatch)`) that appear on no other row and are not part of the column's machine-readable `PREFIX-N` token contract. A REQ-ID extractor or closing-gate scan that builds a `Map<REQ-ID, leaves>` keyed on the bare token sees `DISC-4` twice; depending on implementation it either drops one closer (second row overwrites first) or fails to parse the qualified left cell, so two reasonable gate implementations diverge on whether `DISC-4` maps to `{V10a}`, `{V9b}`, or both.

## Plan Documents

- `docs/plan_topics/coverage-matrix.md` — *Numbered REQ-IDs (runtime obligations)* table (edited)
- `docs/plan_topics/conventions.md` — §Leaf format (Deps note) / §REQ-ID discipline — defines the REQ-ID→closing-leaf mapping contract (read-only)
- `docs/plan_topics/V10a-discovery-walk.md` — DISC-4 collision-detection closure (read-only)
- `docs/plan_topics/V9b-registration-drain-state.md` — DISC-4 superseded-entry-dispatch closure (read-only)
- `docs/plan_topics/H5b-warn-only-canary.md` — `Deps.` (read-only)
- `docs/plan_topics/H5a-closing-gate-automation.md` — transitive-completeness reconciliation arm (read-only)

## Spec Documents

None — the fix is purely internal to plan files; both DISC-4 aspects already trace to existing spec anchors (`discovery-sources.md` §DISC-4, `drain-state-contract.md` §superseded-entry-dispatch).

## Affected Leaves

**Phases:** None

**Leaves (implementation order):**

None — the fix edits only `coverage-matrix.md`. `V10a` and `V9b` remain DISC-4's closing leaves with no change to their acceptance criteria; the finding lives in a cross-cutting plan file and does not propagate into any leaf file.

## Consequence

**Severity:** correctness

A tool or closing-gate scan that keys DISC-4's closing set on the bare REQ-ID token can silently drop one of the two closers (`V10a` or `V9b`) or fail to parse the qualified left cell, so the matrix no longer reliably records that DISC-4 has two distinct closers. A reviewer enumerating live REQ-IDs from the table double-counts DISC-4. Both manifest as a traceability/closure-coverage divergence rather than a hard build break.

## Issue introduction

**Verdict:** single-commit-introduction
**Introducing commits:** `9d61b210479fa7103ae2ab39e31580dd005f902d` (2026-06-11 20:44:09 +0200)
**History:** The plan corpus is git-tracked. `git log -S 'superseded-entry dispatch' -- docs/plan_topics/coverage-matrix.md` and `git show 9d61b21 -- docs/plan_topics/coverage-matrix.md` show DISC-4 was a single row `DISC-1, DISC-2, DISC-3, DISC-4 | V10a` until commit `9d61b21` ("resolve 'DISC-4 superseded-dispatch assertion belongs on V9b not V10a'"). That fix correctly added `V9b` as the superseded-entry-dispatch closer but expressed the two closers as two parenthetically-qualified rows instead of the canonical comma-separated multi-close form, introducing the deviation. No earlier revision contains the two-row form.

## Solution Space

**Shape:** single

### Recommendation

In `coverage-matrix.md`'s *Numbered REQ-IDs* table, replace the two `DISC-4` rows with a single row whose REQ-ID column holds the bare token `DISC-4` and whose leaf cell lists both closers comma-separated, matching the established multi-close form used by `ERR-17`, `CIO-1`, `DIAG-4`, etc. The per-leaf aspect labels may ride as parenthetical qualifiers on each leaf inside the leaf cell so the distinct closures stay legible — for example:

```
| DISC-4 | `V10a` (collision-detection closure), `V9b` (superseded-entry-dispatch closure) |
```

Place the consolidated row where `DISC-4` sorts (immediately after the `DISC-1, DISC-2, DISC-3 | V10a` row). Leave `DISC-1, DISC-2, DISC-3 | V10a` unchanged.

Implementer edge case: under the consolidated single row, `H5a`'s transitive-completeness arm treats `DISC-4` as a multi-leaf cell that stays green when only one listed leaf is in `H5b`'s `Deps.` (the primary/co-witness rule). Both `V10a` and `V9b` genuinely close distinct DISC-4 aspects, so confirm both remain present in `H5b`'s `Deps.` (they are today, via the `V10a`–`V10c` and `V9a`–`V9j` ranges) so neither aspect's closure can be dropped without the gate firing.

## Relationships

- T03 "`diagnostic-emission-isolation.md` and `session-shutdown-semantics.md` are closed by `V9g` but absent from the coverage-matrix code-keyed table" — same-cluster (same `coverage-matrix.md` traceability surface; resolves independently)

---

# T03 — `diagnostic-emission-isolation.md` and `session-shutdown-semantics.md` are closed by `V9g` but absent from the coverage-matrix code-keyed table

**Original heading:** Two PIC teardown pages covered by V9g but not enumerated as their own coverage-matrix rows
**Original section:** Cross-cutting / global
**Kind:** spec-coverage
**Importance:** medium
**Score:** 30
**MustFix:** true

## Finding

Two non-narrative `pi-integration-contract/` spec pages — `diagnostic-emission-isolation.md` and `session-shutdown-semantics.md` — carry normative MUST/MUST-NOT obligations that the `H5a` un-anchored-MUST recogniser surfaces: the obligations carry no numbered `PREFIX-N` REQ-ID, and at least several carry no `loom/...` registry code in their sentence. On `diagnostic-emission-isolation.md` these include the handler-isolation swallow obligation (`a throw out of console.error MUST be swallowed; the handler MUST continue to the next sub-step`) and the invocation-site count semantics. On `session-shutdown-semantics.md` these include the *Factory-ordering pin* (`The session_shutdown handler MUST be subscribed … only after the LoomRegistry and watcher handles … are constructed`; `a session_shutdown MUST NOT be reachable against a partially-constructed extension state`), the partial-append fate rule, and the `invoke`-parent observation rule.

Both pages are functionally covered by `V9g`: its **Spec** field lists both pages, and its **Tests** assert the wrapped host emissions, the bare/two-token/three-token serialiser-throw fallback forms, per-step isolation, and the per-invocation `loom/runtime/cancelled-by-session-shutdown` note. So there is no behavioural coverage gap. The gap is purely in the coverage-matrix *bookkeeping*: neither page name appears anywhere in `coverage-matrix.md`. The only matrix row that resolves to `V9g` is the `patch-skew-degradation.md` §`session_shutdown` sub-step 3 row, which closes a different obligation (the aggregate `Promise.allSettled` settle-all). The matrix's own *Code-keyed obligation areas* preamble states that every un-anchored MUST on a non-narrative `spec_topics/**` page is "one rule-driven row here with a named closing leaf"; these two pages have none.

## Plan Documents

- `docs/plan_topics/coverage-matrix.md` — Code-keyed obligation areas (no numbered REQ-IDs) table (edited)
- `docs/plan_topics/V9g-session-shutdown.md` — named closing leaf for the two new rows (read-only)
- `docs/plan_topics/H5a-closing-gate-automation.md` — un-anchored-MUST arm definition (read-only)
- `docs/plan_topics/H5b-warn-only-canary.md` — Deps already span `V9a`–`V9j` (read-only)
- `docs/plan_topics/H6a-live-corpus-activation.md` — hard-fail flip footing (read-only)

## Spec Documents

- `docs/spec_topics/pi-integration-contract/diagnostic-emission-isolation.md` — teardown-time `console.error` isolation MUSTs (read-only)
- `docs/spec_topics/pi-integration-contract/session-shutdown-semantics.md` — session-swap / factory-ordering MUSTs (read-only)

## Affected Leaves

**Phases:** Vertical (V9), Horizontal (release gate)

**Leaves (implementation order):**

- `V9g` — Session-shutdown teardown and emission isolation — (modified) — the two new matrix rows name `V9g` as closing leaf; its body already covers both pages and needs no edit, and it is already in `H5b`'s `Deps.` via the `V9a`–`V9j` range, so the H5a transitive-completeness arm stays green
- `H6a` — Live-corpus closing-gate activation (loom 1.0 release gate) — (blocked) — its hard-fail flip reconciles the live `spec_topics/**` MUST set against the live matrix; the un-enumerated MUSTs keep it from going green

## Consequence

**Severity:** correctness

The plan corpus is internally inconsistent: `V9g` closes both pages, but the coverage matrix never records that, so the matrix and the implementation disagree. The `H5a` un-anchored-MUST arm — surfaced as warnings by the `H5b` live-corpus canary and binding at the `H6a` release-gate flip — would flag these two pages' un-anchored MUSTs as un-enumerated, since they are absent from the *Code-keyed obligation areas* table with a closing leaf. The release gate cannot cleanly go green (and the canary will report persistent findings) until the rows are added.

## Issue introduction

**Verdict:** present-since-inception
**Introducing commits:** c6a664e — pi-loom plan: build/update plan for spec.md + review (2026-06-10, Thomas Andersen)
**History:** The *Code-keyed obligation areas* table of `coverage-matrix.md` was authored in c6a664e and never carried rows for `diagnostic-emission-isolation.md` or `session-shutdown-semantics.md`; a pickaxe (`git log -S`) over the full file history finds neither page name ever present in the matrix. Later passes that enumerated sibling `pi-integration-contract/` pages (adb521f for the V9b/V9c/V9e areas, bad3b99 for the V9h pages, 659aa21 which added the `patch-skew-degradation.md` §sub-step-3 → `V9g` row) extended the table around these two pages without adding them, so the omission has persisted since the table's inception.

## Solution Space

**Shape:** single

### Recommendation

Add two rows to the *Code-keyed obligation areas (no numbered REQ-IDs)* table in `docs/plan_topics/coverage-matrix.md`, both with closing leaf `V9g`:

- `pi-integration-contract/diagnostic-emission-isolation.md` — the teardown-time `console.error` isolation MUSTs: the per-emission `try`/`catch` wrap of the serialisation-and-emission sequence, the bare-`code` / two-token / three-token serialiser-throw fallback forms, the construction-site self-wrap, the handler-isolation swallow obligation, and the invocation-site count semantics (un-anchored; GOV-22 residue).
- `pi-integration-contract/session-shutdown-semantics.md` — the session-swap MUSTs: per-invocation clean-cancel `loom/runtime/cancelled-by-session-shutdown` emission, partial-append fate during teardown, the `invoke`-parent observation rule, and the *Factory-ordering pin* (un-anchored; GOV-22 residue).

`V9g` is already a member of `H5b`'s `Deps.` (via the `V9a`–`V9j` range), so the new closing-leaf cells satisfy the H5a transitive-completeness arm without any further plan-maintenance edit. The two spec pages are read-only for this fix — do not edit them; the change is confined to `coverage-matrix.md`. No leaf body, no `H5b`/`H6a` edit, and no spec edit is required. Watch that the `patch-skew-degradation.md` §sub-step-3 row stays distinct — the new rows cover the emission-isolation and session-swap obligations, not the aggregate `Promise.allSettled` settle-all that row already owns.

## Relationships

- T21 "Per-loom registration `ToolDefinition` field-derivation MUSTs unnamed by any leaf" — same-cluster (another missing code-keyed coverage-matrix row; different page/leaf, resolves independently)
- T31 "Extension-bootstrap SDK-failure rule and `loom/load/extension-bootstrap-failed` have no closing leaf" — same-cluster (another un-enumerated code-keyed obligation needing a matrix row; independent page/leaf)
- T02 "`DISC-4` is split across two coverage-matrix rows instead of the canonical multi-close form" — same-cluster (same `coverage-matrix.md` traceability surface; resolves independently)

---

# T04 — H7a permitted-code-list provenance is bound to a Deps set narrower than the pipeline it gates

**Original heading:** H7a Deps may not enumerate every code-emitting / turn-producing slice the pipeline exercises
**Original section:** docs/plan_topics/H7a-integration-acceptance.md
**Kind:** assumptions
**Importance:** medium
**Score:** 25
**MustFix:** false

## Finding

`H7a`'s third Tests bullet defines the committed **permitted-code list** as "the union of `loom/...` codes the slices in **Deps** … *can* emit", and the fourth bullet binds the same per-Deps-slice provenance to the golden diagnostics list and golden transcript. `H7a`'s `Deps` are `H4a, V5d, V8a, V11f, V13c, V14a, V16a, V17a`. But the leaf's own `Adds.` and `Ships when.` describe the integrated pipeline as *typed query → tool loop → code-tool invoke → schema lowering/validation → binder → cancellation* — a path that necessarily exercises the full binder slice group (`V11a`–`V11f`) and the full typed-query slice group (`V13a`–`V13d`), of which only `V11f` and `V13c` are in `Deps`.

Several of the unlisted pipeline slices emit their own `loom/...` codes: `V11a` (`loom/load/binder-model-unresolved`, `loom/load/binder-model-not-strict-capable`, `loom/load/binder-model-strict-capability-unknown`), `V11b` (`loom/parse/bind-context-session-on-subagent`, `loom/runtime/custom-type-unsafe`), and `V13b` (`loom/parse/explicit-schema-mismatch`). Because the permitted-code list is computed strictly from `Deps`-slice provenance, none of these codes is in the list even though the pipeline `H7a` drives can produce them.

This breaks the leaf's stated invariant that the permitted-code list is a **superset** of every code the fixture path can emit, and it under-specifies the reference set that `H4a`'s real-host smoke pass criterion (e) and `H6a`'s release-gate evidence record check live runs against. The non-deterministic real-host run can legitimately emit a binder-model or schema-inference code from an unlisted slice; criterion (e)'s subset check would then flag a real, in-pipeline code as out of bounds.

## Plan Documents

- `docs/plan_topics/H7a-integration-acceptance.md` — Deps + Tests bullets 3–4 (permitted-code list / golden-diagnostics provenance) (edited)
- `docs/plan_topics/V11a-binder-model-resolution.md` — binder slice in the named pipeline, emits `loom/load/binder-model-*` codes (edited)
- `docs/plan_topics/V11b-bind-context-transcript.md` — binder slice, emits `loom/parse/bind-context-session-on-subagent`, `loom/runtime/custom-type-unsafe` (edited)
- `docs/plan_topics/V13b-query-schema-inference.md` — typed-query slice, emits `loom/parse/explicit-schema-mismatch` (edited)
- `docs/plan_topics/V11c-bypass-envelope.md`, `docs/plan_topics/V11d-defaulting-echo.md`, `docs/plan_topics/V11e-system-note-determinism.md`, `docs/plan_topics/V13a-query-render.md`, `docs/plan_topics/V13d-query-failure-repair.md` — remaining binder/query stages the pipeline exercises (read-only)
- `docs/plan_topics/H4a-factory-shell-and-harness.md` — real-host smoke pass criterion (e) consumes the permitted-code list (read-only)
- `docs/plan_topics/H6a-live-corpus-activation.md` — release-gate evidence record consumes the permitted-code list (read-only)

## Spec Documents

None

## Affected Leaves

**Phases:** Horizontal

**Leaves (implementation order):**

- H7a — Terminal integration-acceptance run (cross-slice end-to-end gate) — (modified)

## Consequence

**Severity:** correctness

The permitted-code list is silently incomplete: a code emitted by an in-pipeline but un-`Deps` slice (`V11a`/`V11b`/`V13b`) is absent from it, so `H4a` criterion (e) / `H6a` evidence checks can falsely reject a legitimate live-run code, and if the deterministic fixture path emits such a code the golden-diagnostics-⊆-permitted-list invariant breaks at the in-process gate. Two implementers would also disagree on which slices' codes the list must cover.

## Issue introduction

**Verdict:** multi-commit-interaction
**Introducing commits:** e7e51cc — pi-loom plan: resolve "Plan has no terminal end-to-end integration-acceptance leaf" (2026-06-10, Thomas Andersen); 052b019 — pi-loom plan: resolve "Real-host smoke pass criterion (e) names a permitted code set with no committed source" (2026-06-11, Thomas Andersen)
**History:** e7e51cc created `H7a` already naming the full *typed query → … → binder → cancellation* pipeline in its `Adds.`/`Ships when.` while its `Deps` listed only `H4a, V5d, V8a, V11f, V13c, V14a, V17a` — omitting the binder (`V11a`–`V11e`) and typed-query (`V13a`/`V13b`/`V13d`) sub-slices the pipeline exercises. The omission was latent until 052b019 added the committed permitted-code list and tied both it and the golden goldens to "the union of `loom/...` codes the slices in **Deps** can emit", binding the provenance to exactly that incomplete `Deps` set and turning the inception-time gap into a concrete incompleteness defect.

## Solution Space

**Shape:** single

### Recommendation

Extend `H7a`'s `Deps` to include the code-emitting pipeline slices the integrated path actually drives, so the per-Deps-slice provenance covers every slice that can emit a code on the integrated path. In `docs/plan_topics/H7a-integration-acceptance.md`, extend the `Deps.` line to include the code-emitting binder/query slices the pipeline exercises — at minimum `V11a`, `V11b`, `V13b` (the concrete code-emitters), and the remaining named-pipeline stages `V11c`, `V11d`, `V11e`, `V13a`, `V13d` for completeness. The Tests bullets that read "the slices in **Deps**" then resolve correctly with no further wording change. This restores the superset invariant verbatim, keeps the provenance rule and the goldens mechanically derivable, and stays consistent with the leaf's own pipeline description.

Edge case for the implementer: confirm each newly listed slice's emittable-code set is sourced from that slice's own leaf when deriving the list, and that the broadened `Deps` does not introduce a sequencing cycle (`H7a` lands terminal, so all additions sequence before it). Because the broadened `Deps` is read by `H5a`'s transitive-completeness/range arms, confirm the added entries are individually enumerable (they are non-range).

## Relationships

- T05 "Depth-6 (ceiling #4) wrapping that V5e delegates to V14a and V15a is asserted at neither carrier" — same-cluster (both concern whether downstream live-surface coverage of the integrated path is complete; resolve independently)

