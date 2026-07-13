# S7 — live / acceptance / hardening findings

Slice S7 (M3 live triage). Each finding uses the §6 schema. Verdicts triaged per
§5 rules: {loom-defect | test-artifact | provider-infra | borderline |
deferred-not-a-bug}. Evidence is reproduced across providers/models where
possible.

Provider footprint for this run (per `code-surface.md` §3):
- **live** (`test:live`) resolved model `claude-3-opus-20240229` (harness prefers
  `claude-opus-4-8` (absent) → first `.includes("opus")` → `claude-3-opus-20240229`).
- **acceptance** (`test:acceptance`) default `unity-messages` / `claude-haiku-4-5`;
  re-run on second provider `openrouter` / `anthropic/claude-haiku-4.5`
  (`PI_LOOM_ACC_PROVIDER` / `PI_LOOM_ACC_MODEL`).
- **hardening** resolved `claude-3-opus-20240229` (same fallback as live).
- `unity-messages` was intermittently rate-limited (`403 Forbidden`) during this
  run; `openrouter` was stable and used as the confirming second provider.

Coordination with S3 (`findings/s3-query-tools-schemas-findings.md`, written to
repo-root `findings/`):
- S3 **FIND-S3-2** (live H8a typed test JSON-parses the wrong turn → test-artifact)
  is the SAME defect as S7 **FIND-S7-3**; they agree.
- S3 **FIND-S3-1** concluded CAND-1's `"must be object"` is spec-correct loom
  behaviour (a typed query correctly rejects a non-object / non-conforming
  payload — REQ-QRY-36) and must NOT be counted as a loom defect. S7 agrees for
  the `"must be object"` manifestation, which S7 traces to an EMPTY `pi -p`
  stdout under `unity-messages` `403` (provider-infra), not a lowering fault.
- S7 additionally found a distinct, offline-reproducible **loom-defect** that S3
  did not surface: FIND-S7-1. S3 tested WELL-FORMED (comma-separated) schemas and
  correctly found no lowering fault; the FIND-S7-1 defect manifests ONLY on a
  comma-MISSING (newline-separated) schema body, where the parser silently drops
  a field with no diagnostic. On a working provider, acceptance (b) prints a
  valid-but-incomplete `{"status":…}` (missing `summary`) — the loom's own
  corrupted single-field schema accepted it — so this is NOT the "correct
  rejection" path S3 describes. The two findings are complementary, not
  contradictory; orchestrator should reconcile FIND-S3-1 ↔ FIND-S7-1 when
  aggregating (S7 reduces CAND-1's `acc-typed-named` sub-case to the offline
  parse repro below).

---

### FIND-S7-1: schema object body with comma-missing (newline-separated) fields silently mis-parses — a field is dropped with no diagnostic
- Requirement: GRAM SchemaShape (`SchemaShape ::= "{" Field ("," Field)* ","? "}"`); DOC-74; QRY-22
- Spec citation: `docs/reference/grammar.md:225-226`
- Method: M1 (offline `parseLoomDocument`), corroborated M3
- Repro (offline, deterministic):
  ```
  ---
  mode: prompt
  ---
  schema Reply {
    status: string
    summary: string
  }
  let r: Reply = @`Report`
  r
  ```
  `parseLoomDocument(...)` returns `diagnostics: []` and a schema decl with a
  **single** field `{ name: "status", typeSource: "stringsummary:string" }` —
  the `summary` field is swallowed into `status`'s type source. The
  comma-separated form (`status: string,`) parses correctly to two fields.
- Expected: per the grammar, fields are comma-separated (`Field ("," Field)*`).
  A body with two fields separated only by a newline (no comma) is a grammar
  violation and MUST surface a `loom/parse/*` diagnostic (and un-register /
  refuse the schema), not silently coalesce two fields into one malformed field.
- Observed: no diagnostic; the second field is silently dropped and the first
  field's type becomes the concatenation `stringsummary:string`. The loom loads
  and runs with a corrupted single-field schema.
- Live corroboration: `docs/examples`-shaped acceptance fixture
  `tests/acceptance/fixtures/acc-typed-named.loom` (schema `Reply { status:
  string \n summary: string }`, no comma) drives `{"status":"success"}` on
  BOTH `unity-messages/claude-haiku-4-5` and `openrouter/anthropic/claude-haiku-4.5`
  and `claude-opus-4.5` — always missing `summary`, because the lowered schema
  only carries `status`. Acceptance (b) fails deterministically on both
  providers: `must have required property 'summary'`.
- Verdict: **loom-defect** (silent grammar-violation acceptance + field loss +
  missing diagnostic). Provider-independent, reproduced offline.
- Severity: blocks-spec-compliance (a real schema whose author forgot a comma
  lowers to a different, smaller schema with no warning — silent data-shape
  corruption of typed-query / params / invoke-return validation).

---

### FIND-S7-2: acceptance fixture `acc-typed-named.loom` is malformed (schema fields not comma-separated)
- Requirement: GRAM SchemaShape (`docs/reference/grammar.md:226`); test-under-test
- Spec citation: `docs/reference/grammar.md:225-226`
- Method: M1 / M3
- Repro: `tests/acceptance/fixtures/acc-typed-named.loom:6-9` declares
  `schema Reply { status: string \n summary: string }` with no comma between the
  two fields. Test `tests/acceptance/noninteractive-acceptance.test.ts:135-162`
  validates the reply against a hard-coded two-field `NAMED_REPLY_SCHEMA`
  (`tests/acceptance/harness.ts:126-131`).
- Expected: the fixture should declare `status: string,` (comma-separated) so its
  lowered schema matches the test's two-field invariant.
- Observed: because of FIND-S7-1 the fixture lowers to a single-field schema; the
  model conforms to that (`{"status":...}`) and the test's two-field assertion
  fails.
- Verdict: **test-artifact** (malformed fixture). Fix: add the missing comma.
  (The silent mis-parse behind it is the separate loom-defect FIND-S7-1.)
- Severity: partial (blocks acceptance (b) going green; independent of provider).

---

### FIND-S7-3: live `test:live` typed-query test JSON.parses the whole prompt-mode stream, but the loom emits two turns
- Requirement: SLSH-2 (prompt-mode streaming of every query); DOC-14; QRY-22
- Spec citation: `docs/spec_topics/slash-invocation.md:22`; DOC-14 `doc-behaviors.md`
- Method: M3 (live)
- Repro: `tests/live/live-production-acceptance.test.ts:180-233`. Fixture
  `typedQueryLoom()` (`:44-53`) is a **two-turn prompt-mode** loom:
  `let answer: { ok: bool, label: string } = @\`…\`` (streams the typed JSON
  object) followed by `@\`${answer.label}\`` (streams a prose turn).
  `driveSlashCaptureText` concatenates ALL streamed `text_delta`s, then
  `JSON.parse(reply)` (`:211`).
- Expected: no spec requires the full prompt-mode stdout to be a single pure-JSON
  value; SLSH-2 says BOTH turns stream to the transcript.
- Observed: `SyntaxError: Unexpected non-whitespace character after JSON at
  position 37` — the first turn's JSON parses, then the second turn's prose
  follows. The typed query itself produced a valid object; the test's whole-stream
  `JSON.parse` is the failure.
- Verdict: **test-artifact** (asserts something stricter than the spec — the §5
  literal example: "`JSON.parse` of a reply the spec does not require to be pure
  JSON"). Fix: bind/assert the typed value structurally, or drive a loom whose
  only turn is the typed query.
- Severity: partial (blocks `test:live` going green; provider-independent).

---

### FIND-S7-4: acceptance (d) asserts the `bind_echo` success note on `pi -p` stdout, but it is emitted on the loom-system-note channel
- Requirement: BND-1 / DOC-66 / DOC-73 (`bind_echo` success note); PIC system-note channel
- Spec citation: DOC-73 `docs/tutorial.md:133,140`; `doc-behaviors.md` DOC-66/73
- Method: M3 (live), M2-style probe
- Repro: `tests/acceptance/noninteractive-acceptance.test.ts:225-265` drives
  `/acc-params-binder …` and asserts `/Running \/acc-params-binder:/.test(result.stdout)`.
  A hardening-harness probe of the SAME fixture
  (`tests/acceptance/fixtures/acc-params-binder.loom`) shows the note IS emitted —
  on the `loom-system-note` channel (`turn.systemNotes`):
  `Running /acc-params-binder: topic="summarise the three most recent commits", count=3`
  (with the `count=3` default correctly applied). The binder ran off-session,
  no envelope leaked, exit 0.
- Expected: the observable proof of a successful bind is the `bind_echo` note on
  the loom-system-note channel (which the passing hardening `session-binder` probe
  reads). The spec does not require the note to appear on `pi -p` text stdout;
  custom system-note renderer output is not streamed to `pi -p` print-mode stdout.
- Observed: `pi -p` stdout is empty for area (d) on both providers (the body is
  `respond "ok"`, which issues no query — see FIND-S7-6 — so no assistant turn
  streams), while the note lands on the note channel.
- Verdict: **test-artifact** (wrong observation channel — stdout vs the
  loom-system-note channel). This is CAND-2; the binder echo is present and
  correct, not absent. Fix: observe the note on the note channel (as
  `session-binder` does), not on `pi -p` stdout.
- Severity: partial.

---

### FIND-S7-5: hardening load/parse-diagnostic probes assert on `probe.diagnostics` (ctx.ui.notify), but shipped load diagnostics route to `probe.systemNotes` (V4e)
- Requirement: DIAG load-diagnostic surfacing; DOC-70/DOC-81/invoke & frontmatter parse diagnostics
- Spec citation: probe-harness contract `tests/hardening/probe-harness.ts:12-41`
  (V4e note); load routing `src/extension/production-composition.ts:120,632-642`
- Method: M3 (live probe, zero model turns)
- Repro / evidence: a zero-token probe of the exact failing fixtures shows the
  runtime behaves CORRECTLY — the malformed loom un-registers AND the correct
  diagnostic lands on `probe.systemNotes`, while `probe.diagnostics` is empty:
  - `invoke("./lib.warp")` → `registeredNames: []`, `systemNotes:
    ["…loom/parse/invoke-non-loom-extension: invoke path './lib.warp' does not end in .loom"]`
  - `mode: agent` → `registeredNames: []`, `systemNotes:
    ["…loom/load/unknown-mode-value: unknown 'mode:' value 'agent'…"]`
  - `Foo.loom` (+ `valid.loom`) → `registeredNames: ["valid"]`, `systemNotes:
    ["…loom/load/invalid-slash-name: slash names must be lowercase kebab/snake…"]`
  The probe-harness header states plainly (V4e): the shipped load path routes ALL
  error-severity load diagnostics through `emitLoadNote` → the `loom-system-note`
  channel, "So `diagnostics` is normally EMPTY at load time."
- Affected failing tests (all read the empty `probe.diagnostics` channel):
  - `discovery-cli.test.ts` — 6 tests (invalid-slash-name x6, collision,
    invalid-extension, settings range/entry, missing-source).
  - `frontmatter-diagnostics.test.ts` — 5 tests (FM-2..FM-6).
  - `imports-resolution.test.ts` — 2 tests (IMP-D warp-top-level-statement,
    IMP-E import-cycle).
  - `invoke-parse-load.test.ts` — 8 tests (INV-1,1b,2,3,3b,4,4b,5).
  - `invoke-runtime-ceilings.test.ts` — 3 tests (INV-5r, INV-8, INV-1r) fail on
    the same `probe.diagnostics` assertion (their `registeredNames` /
    `userTexts` assertions pass).
- Expected: assert load diagnostics on `probe.systemNotes` (the shipped channel),
  as the probe-harness header directs.
- Observed: tests read `probe.diagnostics` (empty) → `expected false to be true`
  / `expected [] to have length N`.
- Verdict: **test-artifact** (stale observation channel; the load-diagnostic and
  un-registration behaviour is correct). Fix: point these probes at
  `probe.systemNotes` (or both channels).
- Severity: partial (blocks hardening going green; no runtime defect behind it).

---

### FIND-S7-6: acceptance fixtures use a non-existent `respond` construct (parses as a bare undefined identifier + a separate expression)
- Requirement: GRAM (no `respond` statement form); glossary "respond-repair" is the only `respond`
- Spec citation: `docs/reference/grammar.md` (no `respond` production);
  `docs/spec_topics/glossary.md:21` (only respond-repair / synthesised respond tool)
- Method: M1 (offline parse)
- Repro: `parseLoomDocument` of `tests/acceptance/fixtures/acc-params-binder.loom`
  yields statements `[ {kind:"expr", expr:{kind:"ident", name:"respond"}},
  {kind:"expr", expr:{kind:"string"}} ]` with `diagnostics: []` — `respond "ok"`
  is two expression statements: a bare (undefined) identifier `respond` and a
  string literal. Same shape for `respond r` (b/c), `respond outcome` (h),
  `respond tagline()` (g).
- Expected: authors express a user-visible result via a final query; there is no
  `respond` keyword. The fixtures' `respond X` does not do what their comments
  claim (surface `X`).
- Observed: harmless where a query already streams the observable (b/c stream the
  typed-query turn; the bare `respond`/value statements are no-ops), but for (d)
  the body is ONLY `respond "ok"` → no query → empty stdout (feeds FIND-S7-4).
- Verdict: **test-artifact** (fixtures rely on a non-language construct). Also a
  candidate DIAG gap: a bare reference to an undefined identifier
  (`respond`) surfaced no diagnostic — flagged as borderline (see FIND-S7-8).
- Severity: cosmetic-to-partial (acceptance fixtures; no production-path defect).

---

### FIND-S7-7: hardening `invoke-runtime-ceilings` INV-9 asserts the pre-fix (buggy) prompt→prompt behaviour; the runtime now correctly attaches the child turn
- Requirement: INV / DOC-19 (modes compose; prompt→prompt attaches, child queries user-visible)
- Spec citation: DOC-19 `docs/guide.md:97`; `doc-behaviors.md` DOC-19
- Method: M3 (live)
- Repro: `tests/hardening/invoke-runtime-ceilings.test.ts:154-188` (INV-9) asserts
  the prompt→prompt child's query is NOT user-visible
  (`pproAll not to contain "ATTACHEDKID"`). Observed: `pproAll` = `"Say ATTACHEDKID
  once\nSay PROMPTPARENT…"` — the child turn IS attached to the caller
  conversation. The passing `session-invoke-attach.test.ts` ("prompt->prompt
  attach: child query is a user-visible turn in the caller's session") asserts the
  OPPOSITE and passes, matching DOC-19.
- Expected: prompt→prompt attach makes the child's queries user-visible turns in
  the caller's session (correct, observed).
- Observed: INV-9's stale `not.toContain` assertion fails because the runtime now
  delivers the documented behaviour.
- Verdict: **test-artifact** (stale bug-characterization; two hardening tests make
  opposite claims and the spec-aligned one passes). Fix: invert INV-9 to assert
  the child turn IS present (or delete — `session-invoke-attach` already covers it).
- Severity: partial.

---

### FIND-S7-8: `looms.binderModel` set to a provider-qualified id (`anthropic/claude-haiku-4.5`) did not resolve — binder-model-unresolved persisted (borderline)
- Requirement: BND / DOC-67 (binder uses `looms.binderModel`); DOC-69/70
- Spec citation: DOC-67 `docs/how-to/bind-slash-command-arguments.md:15`;
  binder-model resolution `docs/spec_topics/binder/binder-model-and-context.md:5`
- Method: M3 (live probe)
- Repro: probe of `docs/examples/import-warp.loom` (+ `personas.warp`) with
  `projectSettings: { looms: { binderModel: "anthropic/claude-haiku-4.5" } }` →
  `registeredNames: []`, load note
  `loom/load/binder-model-unresolved: … set 'bind_model:' … or 'looms.binderModel' …`.
  The provider-qualified id resolves fine as a session `--model` for `pi -p`
  (used throughout this run) but did not satisfy binder-model resolution here.
- Expected: a `looms.binderModel` naming a resolvable registry model should
  resolve the binder model and let a multi-field-params loom register.
- Observed: binder-model-unresolved persisted despite the setting.
- Verdict: **borderline** — could be a settings value-format/resolution expectation
  (bare vs provider-qualified id) rather than a defect; not reproduced to a
  minimal deterministic offline repro within S7. Flag for S2/S5 (binder-model
  resolution) follow-up. Not counted as a confirmed loom-defect.
- Severity: partial (blocks the `import-warp`/`arg-binding` example happy-path in
  environments without a bare-id binder model).

---

### FIND-S7-9: benign teardown race — `loom/runtime/registry-swap-failed` ("ctx is stale after reload") on hot-reload during dispose (observation)
- Requirement: DISC hot-reload / reload-wiring; not a spec-behaviour failure
- Spec citation: `src/extension/hot-reload.ts:128`; `src/extension/reload-wiring.ts:319,337`
- Method: M3 (live)
- Repro: nearly every live/hardening test prints, on teardown, `system-note
  delivery failed: loom/runtime/registry-swap-failed: registry swap failed: loom
  watcher … ctx is stale after session replacement or reload`. It fires from the
  `ReloadDebouncer.runReload` → `rebuildAndSwap` path after the session/ctx has
  been disposed.
- Expected: a reload debounced past session dispose should be a no-op, not attempt
  a diagnostic emit through a stale `ctx.ui`.
- Observed: the stale-ctx emit throws and is logged; it does NOT fail the tests it
  appears under (they pass), so it is cosmetic here.
- Verdict: **borderline** (teardown race / cosmetic log noise; possible small
  robustness defect in the reload debouncer's post-dispose guard). Flag for S5
  (reload/watcher) — no observable behavioural failure attributed to it in S7.
- Severity: cosmetic.
