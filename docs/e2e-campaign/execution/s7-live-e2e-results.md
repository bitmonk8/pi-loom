# S7 — live / acceptance / hardening execution results

Slice S7 (M3 live triage), per `test-plan.md` §4 row S7 and §5 triage rules.
Every live/acceptance/hardening test is listed with pass/fail and a §5 verdict.
Findings referenced as FIND-S7-n live in `findings/s7-live-e2e-findings.md`.

## Environment / providers

| Suite | Command | Provider / model this run |
|---|---|---|
| live | `npm run test:live` | resolved `claude-3-opus-20240229` (harness prefers absent `claude-opus-4-8`, falls back to first `.includes("opus")`) |
| acceptance | `npm run test:acceptance` | default `unity-messages`/`claude-haiku-4-5`; second provider `openrouter`/`anthropic/claude-haiku-4.5` |
| hardening | `npx vitest run --config vitest.hardening.config.ts` | resolved `claude-3-opus-20240229` (same fallback as live) |

`unity-messages` was intermittently returning `403 Forbidden` (rate/throttle)
throughout the run; `openrouter` was stable and used to confirm provider-infra vs
deterministic failures. `ModelRegistry.getAvailable()` returned 495 models across
providers {anthropic, openrouter, unity, unity-messages, unity-responses,
unity-pilot} — a live provider IS configured.

## 1. Live suite (`test:live`) — 4 pass / 1 fail

| # | Test | Result | Verdict | Evidence |
|---|------|--------|---------|----------|
| 1 | discovery → registration (project `.loom` → `/greetlive`) | PASS | — | command registered |
| 2 | prompt-mode turn — sentinel `LOOM-LIVE-OK` present | PASS | — | streamed reply contained sentinel |
| 3 | alternate discovery source (`--loom` CLI → `/clisource`) | PASS | — | command registered |
| 4 | typed-query lowering, bounded (`/typed`) | **FAIL** | **test-artifact** | `SyntaxError: … after JSON at position 37`; loom emits a typed-query turn (valid JSON) + a trailing prose turn; test `JSON.parse`s the concatenated stream (FIND-S7-3) |
| 5 | subagent-mode drive to success (`/subrun`) | PASS | — | resolves cleanly, no forced cancel |

## 2. Acceptance suite (`test:acceptance`) — per test, both providers

Default `unity-messages`: **5 pass / 5 fail**. Second provider `openrouter`:
**8 pass / 2 fail**. The delta isolates provider-infra from deterministic defects.

| Area | Test | unity-messages | openrouter | Verdict | Evidence |
|------|------|----------------|-----------|---------|----------|
| (a) | prompt-sentinel | PASS | PASS | — | `ACC SENTINEL OK` |
| (b) | typed-query named schema | FAIL | **FAIL** | **test-artifact + loom-defect** | deterministic on both: stdout `{"status":"success"}`, `must have required property 'summary'`. Root cause = comma-missing schema in fixture silently drops `summary` (FIND-S7-1, FIND-S7-2) |
| (c) | typed-query inline object | FAIL | PASS | **provider-infra** | unity 403 → empty stdout ("must be object"); openrouter conforms `{"ok":true,"label":…}` (CAND-1 sub-case) |
| (d) | params binder off-session | FAIL | **FAIL** | **test-artifact** | deterministic; `bind_echo` note `Running /acc-params-binder: topic=…, count=3` emitted on loom-system-note channel (probe-confirmed), not `pi -p` stdout (FIND-S7-4; CAND-2) |
| (e) | subagent success terminal | PASS | PASS | — | exit 0, no cancel marker |
| (f) | code-tool loop | PASS | PASS | — | exit 0, permitted codes |
| (g) | imports / invoke across looms | FAIL | PASS | **provider-infra** | unity `403 Forbidden` exit 1; openrouter exit 0 (CAND-3) |
| (h) | match surfacing QueryError | FAIL | PASS | **provider-infra** | unity `403 Forbidden` exit 1; openrouter exit 0 (CAND-3) |
| (i) | multi-source discovery | PASS | PASS | — | both project + `--loom` sources register |
| — | manifest self-check | PASS | PASS | — | 9 areas / distinct stems |

## 3. Hardening suite (`vitest.hardening.config.ts`) — 26 files pass / 6 fail; 94 tests pass / 25 fail (one run)

### Passing files (26) — representative coverage confirmed live
`_smoke`, `exprflow-arith`, `exprflow-control`, `exprflow-fn-tail-bug`,
`exprflow-functions`, `exprflow-interp`, `exprflow-scoping`, `exprflow-stdlib`
(on re-run — see below), `session-binder`, `session-cancellation`,
`session-convdrive`, `session-crossmode`, `session-discodyn`, `session-drain-gated`,
`session-invoke-attach`, `session-prompt-transport`, `session-promptloop`,
`session-promptstream`, `session-subagent`, `session-subagent-toolloop`,
`session-systemnotes`, `imports-warp-fn`, `query-enums` (schema enum runtime),
`query-empty-template`, plus the smoke/harness self-checks. Notably
`session-binder` PASSES (confirms the `bind_echo` mechanism works on the note
channel — CAND-2 backing) and `session-invoke-attach` PASSES asserting prompt→prompt
child turns ARE user-visible (contradicts INV-9 below).

### Failing files (6) and per-test triage

| File | Test(s) | Result | Verdict | Evidence |
|------|---------|--------|---------|----------|
| `exprflow-stdlib` | collection (0 tests) | FAIL then **PASS on re-run** | **provider-infra / environment** | first pass threw `TypeError: … without null bytes. Received 'C:\UnitySr\x00c\pi-loom\…windows-self-update.js'` (null-byte path corruption at module load); re-run passed all 3 tests |
| `discovery-cli` | 6 (invalid-slash x6, collision, invalid-extension, settings range/entry, missing-source) | FAIL | **test-artifact** | reads empty `probe.diagnostics`; diagnostics correctly on `probe.systemNotes`, looms un-register correctly (FIND-S7-5) |
| `frontmatter-diagnostics` | 5 (FM-2..FM-6) | FAIL | **test-artifact** | same wrong-channel; e.g. `mode: agent` → `systemNotes: [loom/load/unknown-mode-value…]`, `registeredNames: []` (FIND-S7-5) |
| `imports-resolution` | 2 (IMP-D, IMP-E) | FAIL | **test-artifact** | `registered=[] diagnostics=[]`; the `warp-top-level-statement` / `import-cycle` diagnostics land on `systemNotes` (FIND-S7-5) |
| `invoke-parse-load` | 8 (INV-1,1b,2,3,3b,4,4b,5) | FAIL | **test-artifact** | zero-model-turn; every diagnostic on `systemNotes`, looms un-register; test reads `probe.diagnostics` (FIND-S7-5). Probe-confirmed e.g. `invoke("./lib.warp")` → `systemNotes:[…invoke-non-loom-extension…]`, `registeredNames:[]` |
| `invoke-runtime-ceilings` | INV-5r, INV-8, INV-1r | FAIL | **test-artifact** | fail on the `probe.diagnostics` assertion only; `registeredNames`/`userTexts` correct (FIND-S7-5) |
| `invoke-runtime-ceilings` | INV-9 | FAIL | **test-artifact** | asserts prompt→prompt child NOT visible; runtime correctly attaches it (`ATTACHEDKID` present), matching passing `session-invoke-attach` + DOC-19 (FIND-S7-7) |

Note: pervasive benign teardown stderr `loom/runtime/registry-swap-failed: … ctx
is stale after reload` appears under passing AND failing tests; it is a
post-dispose hot-reload race and fails no test (FIND-S7-9, borderline/cosmetic).

## 4. Examples verification (`docs/examples/*`)

Offline: all 9 files parse with zero error diagnostics (`parseLoomDocument`).
Live drives via the campaign-of-record command form (through a no-shell Node
spawn to avoid Git-Bash `/stem` MSYS path-mangling), provider
`openrouter`/`anthropic/claude-haiku-4.5`.

| File | Mode | Documented outcome | Observed | Match |
|------|------|--------------------|----------|-------|
| `hello.loom` | prompt | exit 0, greeting streamed to stdout | exit 0, greeting streamed (wording model-generated) | YES |
| `sentiment.loom` | subagent | exit 0, empty stdout (typed value not printed); single-string param → bypass | exit 0, empty stdout | YES |
| `call-tool.loom` | subagent | exit 0, empty stdout (`grep` tool) | exit 0, empty stdout | YES |
| `configure-tool-loop.loom` | subagent | exit 0, empty stdout | exit 0, empty stdout | YES |
| `handle-error.loom` | subagent | exit 0, empty stdout; single-string param → bypass | exit 0, empty stdout | YES |
| `typed-return.loom` | subagent | exit 0, empty stdout; depends on `sentiment.loom` tool | exit 0, empty stdout | YES |
| `arg-binding.loom` | subagent | exit 0, `bind_echo` note; `bind_model: claude-haiku` | NOT registered here — `loom/load/binder-model-unresolved` (`claude-haiku` bare id does not resolve in this env) | DOC-70 path (env-dependent) |
| `import-warp.loom` | subagent | exit 0, checklist; needs binder model (no `bind_model:`) | NOT registered — `binder-model-unresolved` (no `looms.binderModel`; and provider-qualified `looms.binderModel` did not resolve — FIND-S7-8) | DOC-70 path (env-dependent) |
| `personas.warp` | warp lib | not invocable; imported only | not a slash command (correct) | YES |

`arg-binding`/`import-warp` reproduce the documented DOC-69/DOC-70 failure path
(binder-model-unresolved → not registered) in this environment because neither a
bare `claude-haiku` nor a provider-qualified `looms.binderModel` resolved a binder
model here; their happy-path (bind_echo / checklist) is designed for the
campaign-of-record `unity-messages`/`claude-haiku-4-5` host where `claude-haiku`
resolves. Not a loom defect; see FIND-S7-8 (borderline) for the
`looms.binderModel` provider-qualified-id non-resolution.

## 5. CAND triage (baseline candidate defects)

| CAND | Description | Verdict | Notes |
|------|-------------|---------|-------|
| CAND-1 | typed-query non-conforming output | **decomposed** | live `/typed` = test-artifact (FIND-S7-3, multi-turn stream `JSON.parse`); acceptance (c) inline = provider-infra (conforms on openrouter); acceptance (b) named = test-artifact fixture (FIND-S7-2) + **loom-defect** silent comma-missing schema mis-parse (FIND-S7-1) |
| CAND-2 | binder off-session echo note absent | **test-artifact** | note IS emitted on the loom-system-note channel (`Running /acc-params-binder: topic=…, count=3`), probe-confirmed; acceptance (d) reads `pi -p` stdout, the wrong channel (FIND-S7-4) |
| CAND-3 | provider 403 Forbidden | **provider-infra** | `unity-messages` rate/throttle; the same looms (c),(g),(h) pass on `openrouter` (FIND-S7-4 evidence table §2) |

## 6. Summary

| Verdict | Count | Items |
|---------|-------|-------|
| **loom-defect** | **1** | FIND-S7-1 (silent mis-parse of comma-missing schema fields; drops a field, no diagnostic) |
| **test-artifact** | 6 findings, ~28 test-cases | FIND-S7-2 (malformed fixture), FIND-S7-3 (live typed JSON.parse), FIND-S7-4 (bind_echo channel), FIND-S7-5 (~24 hardening diag-channel tests), FIND-S7-6 (`respond` non-construct in fixtures), FIND-S7-7 (INV-9 stale) |
| **provider-infra** | 4 test-cases + 1 environment | acceptance (c),(g),(h) `unity-messages` 403; live typed only if provider-empty (n/a here); hardening `exprflow-stdlib` null-byte-path runner glitch (transient, passed on re-run) |
| **borderline** | 2 | FIND-S7-8 (`looms.binderModel` provider-qualified id non-resolution), FIND-S7-9 (post-dispose reload-swap teardown race, cosmetic) |
| **deferred-not-a-bug** | 0 | — |

Net: exactly **one confirmed loom-defect** (FIND-S7-1). Every other
live/acceptance/hardening failure is a test-artifact (stale observation channel,
malformed fixture, non-language construct, or stale bug-characterization),
provider-infra (`unity-messages` 403; conform/pass on `openrouter`), a transient
runner glitch (null-byte module path), or a borderline config/teardown
observation. `arg-binding`/`import-warp` examples reproduce their DOC-70
binder-model-unresolved path in this env (not a defect).

Recommended fixes (for Phase-D aggregation):
1. FIND-S7-1 (loom-defect): make a comma-missing schema body a `loom/parse/*`
   diagnostic (or accept newline separators uniformly) — no silent field loss.
2. Test fixes: add the comma in `acc-typed-named.loom` (FIND-S7-2); assert typed
   value structurally in `test:live` (FIND-S7-3); read the note channel for the
   binder echo (FIND-S7-4); point hardening diag probes at `probe.systemNotes`
   (FIND-S7-5); drop the `respond` non-construct from acceptance fixtures
   (FIND-S7-6); invert/retire INV-9 (FIND-S7-7).
3. Follow-ups: S2/S5 to confirm `looms.binderModel` resolution semantics
   (FIND-S7-8) and the reload debouncer post-dispose guard (FIND-S7-9).
