# 04 — Test Harnesses & Suite Topology

Scope: how to run each suite and what each harness gives a test author. All paths relative to repo root `C:/UnitySrc/pi-loom`.

There are **5 vitest configs** and **4 npm test scripts**. The hardening suite has **no package.json script** — it is invoked by explicit `--config` only.

---

## 1. The 5 vitest configs

No config declares `setupFiles`. All use `environment: "node"`. No config reads an API key directly; live suites resolve a model via `ModelRegistry.getAvailable()` (empty ⇒ fail loudly). `pi -p` inherits `process.env` so credentials flow into the spawned process.

| # | Config | include | exclude | Run command | Needs model/network? |
|---|--------|---------|---------|-------------|----------------------|
| 1 | `vitest.config.ts` (default) | `tests/**/*.test.ts`, `src/**/*.test.ts` | vitest defaults + `tests/live/**`, `tests/acceptance/**`, `tests/conformance/**`, `tests/hardening/**` (`vitest.config.ts:8`) | `npm test` → `vitest run` | **No** — offline, no model, no network. |
| 2 | `vitest.conformance.config.ts` | `tests/conformance/**/*.test.ts` | (only that) | `npm run test:conformance` → `vitest run --config vitest.conformance.config.ts` | **No** — drives production composition with no live model. `testTimeout/hookTimeout: 60000` for on-disk discovery walks. |
| 3 | `vitest.live.config.ts` | `tests/live/**/*.test.ts` | — | `npm run test:live` → `vitest run --config vitest.live.config.ts` | **Yes** — real provider/model + credentials + network. `testTimeout/hookTimeout: 120000`. |
| 4 | `vitest.acceptance.config.ts` | `tests/acceptance/**/*.test.ts` | — | `npm run test:acceptance` → `vitest run --config vitest.acceptance.config.ts` | **Yes** — spawns real `pi -p` binary against live model. `testTimeout/hookTimeout: 180000`. |
| 5 | `vitest.hardening.config.ts` | `tests/hardening/**/*.test.ts` | — | **No npm script.** `npx vitest run --config vitest.hardening.config.ts` | **Yes** — boots real session vs live provider. `fileParallelism: false` (serial, provider contention). `testTimeout/hookTimeout: 180000`. |

### Model / network resolution per suite
- **default + conformance**: no `ModelRegistry`, no `process.env` credential read. Conformance passes empty `getAvailable(): []` doubles (`tests/conformance/production-conformance.test.ts` `runProductionLoad`). Fully offline.
- **live** (`tests/live/harness.ts:66` `requireLiveProvider`): `ModelRegistry.create(AuthStorage.create()).getAvailable()`; empty ⇒ `failLoudly`. Prefers `claude-opus-4-8`, then any `opus`, then `available[0]`.
- **hardening** (`tests/hardening/probe-harness.ts:69` `requireLiveProvider`): same resolution pattern; same opus preference.
- **acceptance** (`tests/acceptance/harness.ts:314` `requireLiveHost`): same `getAvailable()` check; provider/model overridable via env `PI_LOOM_ACC_PROVIDER` (default `unity-messages`) and `PI_LOOM_ACC_MODEL` (default `claude-haiku-4-5`) at `tests/acceptance/harness.ts:65-66`. Credential flows through `process.env` into the spawned `pi -p` process (`harness.ts:386`).

No `ANTHROPIC_API_KEY` is read anywhere in the harnesses — auth is via `AuthStorage.create()` / the pinned Pi SDK.

---

## 2. Harness entry points

### (a) No-model / scripted driver — `tests/harness/`

The conformance-style in-process driver against a fake Pi SDK. Three modules.

**`tests/harness/index.ts` — `loadExtension(deps: LoomExtensionDeps): LoadedExtension`** (`index.ts:43`)
Constructs a loom session against a fake model. It: `new SessionDouble()` → `createLoomExtension(deps)(double.pi)` → `double.fireSessionStart()` (fires per-loom `pi.registerCommand`). Returns `{ double, dispatch(name, args) }` for end-to-end slash dispatch.

```ts
import { loadExtension } from "../harness";
const ext = loadExtension(deps);        // deps: LoomExtensionDeps with in-memory fixtures
await ext.dispatch("myloom", "arg text");
// assert against ext.double.transcript / .systemNotes / .events
```

**`tests/harness/session-double.ts` — `class SessionDouble`** (`session-double.ts:75`)
In-memory double of the pinned `@earendil-works/pi-coding-agent` `ExtensionAPI` (`pi`) + `ExtensionCommandContext` (`ctx`). Captures `flags`, `renderers`, `commands`, `subscriptions`, `transcript`, `events`, `systemNotes`. Key methods:
- `programResponse(tokens)` (`:119`) — script streamed assistant tokens for the next driven turn.
- `driveResponses()` (`:109`) — run the embedded `ResponseProgrammer` and record `responseTranscript`.
- `dispatch(name, args)` (`:149`) — invoke a registered slash handler.
- `fireSessionStart()` (`:144`), `cancelTurn(reason)` (`:129`).
`pi.sendUserMessage` begins one prompt-mode turn (one user + one accumulating assistant message); streamed tokens fire `message_update` before terminal `agent_end`; `ctx.signal` reflects the live in-flight turn.

**`tests/harness/response-program.ts` — `class ResponseProgrammer`** (`response-program.ts:194`)
The single input-side scripting API. Chainable `script*` setters populate scripted state; `drive()` (`:288`) deterministically replays into `ResponseEvent[]` (pure — no clock/randomness). Categories:
- (a) `scriptAssistantTurns(turns)` (`:207`) — ordered turns + per-turn streamed `fragments` + optional parallel `toolUses`.
- (b) `scriptToolResult(result)` (`:215`) — `tool_use` result by id, incl. `isError:true` and mixed parallel batch.
- (c) `scriptBinderAttempts(attempts)` (`:223`) — ordered binder outcomes: `ok|needs_info|ambiguous` envelope or `transport|malformed-envelope` failure. Per-class retry budget, max 3 binder calls (`MAX_BINDER_CALLS`).
- (d) `scriptToolLoop(maxRounds, perRoundTurns)` (`:236`) — `tool_loop.max_rounds` exhaustion (ERR-19 / FRNT-1).
- (e) `scriptAbortAt(point)` (`:248`) — abort at `pre-call | in-flight | during-retry`.
- (f) `scriptInvokeChild(child)` (`:260`) — completed `invoke(...)` child final value (ERR-13 no-rollback).
- (g) `scriptSubagentCallee(callee)` (`:272`) — subagent-mode `AgentSession`; outcome from terminal `agent_end` (`willRetry:false`, ignoring PIC-43 retry decoys).

```ts
double.responses
  .scriptAssistantTurns([{ fragments: ["Hi"], toolUses: ["t1"] }])
  .scriptToolResult({ toolUseId: "t1", toolName: "read", content: "...", isError: false });
const events = double.driveResponses();   // ResponseEvent[] — assert on discriminated kinds
```

### (b) Real-model driver — `tests/live/harness.ts`
Boots a real `AgentSession` against a live provider, loading loom through the shipped `extensions/index.ts` entry (`SHIPPED_EXTENSION_ENTRY`, `:37`).
- `requireLiveProvider(): LiveProvider` (`:66`) — resolve credentialed model (fail loud if none).
- `plantLoomWorkspace(looms): LiveWorkspace` (`:114`) — materialise a throwaway temp workspace, plant `.loom` files on real disk (project `.pi/looms/` or `--loom` CLI dirs).
- **`bootShippedExtension({ workspace, provider }): Promise<LiveExtensionHandle>`** (`:157`) — the main entry: builds `DefaultResourceLoader` (loom-only, `noExtensions`), `createAgentSession`, wires `--loom` flag, `session.bindExtensions({})` (fires real discovery + registration). Handle exposes `command(stem)`, `registeredNames()`, `dispose()`.
- `driveSlashCaptureText(session, "/foo args")` (`:215`) — drive one live turn, capture streamed text.

### (c) Hardening probe — `tests/hardening/probe-harness.ts`
A "probe" = one boot of the shipped extension over a fresh temp workspace with planted files, driving a list of real slash invocations against a **live model**, returning all deterministic observation channels.
- **`runProbe({ provider, files, drives?, projectSettings? }): Promise<ProbeResult>`** (`:164`).
  - `files: PlantedFile[]` — planted with `source: "project" | "cli" | "rel"`.
  - `drives?: string[]` — slash invocations in order; empty ⇒ registration/diagnostics only (zero tokens).
  - `ProbeResult` (`:121`): `registeredNames`, `diagnostics` (captured `ctx.ui.notify`), load-phase `systemNotes` (V4e error notes off in-memory `SessionManager`), per-drive `turns[]` (`userTexts`, `assistantText`, `toolCalls`, `systemNotes`, `error`), `dispose()`.
- `requireLiveProvider()` (`:69`), `failLoudly` (`:56`).
Deterministic channels (`registeredNames`, `userTexts`, `toolCalls`, `systemNotes`) preferred over stochastic `assistantText`.

### (d) Acceptance — `tests/acceptance/harness.ts`
Black-box: **spawns the real `pi` binary** in print mode and captures stdout/stderr/exit code.
- **`spawnPiPrint(options): Promise<PiPrintResult>`** (`:365`) — spawns `node <pi cli.js> -p -ne -e <extensions> --provider … --model … --loom <dir> "/stem"`; closes stdin (`stdio: ["ignore","pipe","pipe"]`); optional `abortAfterMs` SIGTERM.
- `FEATURE_LOOMS` (`:182`) — 9 committed feature-loom specs, areas (a)–(i) (`FeatureArea`). `featureLoom(area)` (`:272`), `resolveFeatureLoomPath(spec)` (`:285`, returns `undefined` when fixture absent → intended-reason red), `loadPermittedCodes()` (`:293`).
- `requireLiveHost()` (`:314`).
- Result parsers: `parseSystemNoteCodes(output)` (`:423`), `parseEmittedJson(output)` (`:433`), `validatesAgainstSchema` (`:477`), `validatesAgainstBinderEnvelope` (`:486`).

### (e) Production conformance — `tests/conformance/production-conformance.test.ts`
Drives the production composition **with no model**. Two drive paths:
- **Load-time**: `runProductionLoad(cwd)` plants `.loom` files under a real temp `.pi/looms/`, calls the shipped `discoverAndComposeFixtures(pi, ctx)` (re-exported by `extensions/index.ts`); `ctx.modelRegistry.getAvailable()` returns `[]`. Asserts which looms register vs un-register.
- **Runtime/pure**: `runSource(src, resolvePiTool?)` — `parseLoomDocument` (real whole-file parser) → assert no error diagnostics → `createProductionProducerDeps(...).bindPromptConversation(...)` → `executeBody(...)` (real V19d executor). Runtime root double (`rootDouble`) supplies checkpoint/idSource/clock only; no session/model/validator. Tool effects use an inline `resolvePiTool` returning a fake `PiToolDispatch`.

---

## 3. `tests/helpers/` fakes (seam doubles)

| Fake | file:line | Seam | Constructor / knobs |
|------|-----------|------|---------------------|
| `FakeClock` | `fake-clock.ts:29` | `Clock` (PIC-12) | `{ now?, wallEpoch? }`; `advance(ms)` synchronously fires due timers in deadline+registration order; `now()`/`wallNow()` not implicitly advanced. |
| `FakeFileSystem` | `fake-file-system.ts:58` | `FileSystem` (PIC-13) | `{ homedir, cwd, files?, dirs?, symlinks?, errors?, caseInsensitive? }`; `errors` injects per-path Node `.code`; `realpath` follows symlinks transitively (ELOOP). |
| `FakeFileWatcher` | `fake-file-watcher.ts:18` | `FileWatcher` (PIC-14) | no ctor args; `emit(event)` delivers a change kind; `terminate(termination)` drives terminal channel; `watch()` returns idempotent unsubscribe. |
| `FakeIdSource` | `fake-id-source.ts:13` | `IdSource` (PIC-20) | ctor `ids: string[]`; `newInvocationId()`/`newToolCallId()` hand out next id; exhaustion throws loudly. |
| `FakeTokenEstimator` | `fake-token-estimator.ts:13` | `TokenEstimator` (PIC-16) | ctor `counts: ReadonlyMap<AgentMessage, number>`; `estimate(msg)` returns configured count; unconfigured message throws (no silent 0). |

---

## 4. Test counts per suite

Counts: `*.test.ts` files per include glob; `~cases` = `it(`/`test(` occurrences (approx — describe-nesting/table-driven inflate/deflate real assertions).

| Suite | Config | #files | ~#cases | Needs model? | Runner |
|-------|--------|--------|---------|--------------|--------|
| default | `vitest.config.ts` | 148 (`tests/*.test.ts`) | ~1616 | No | `npm test` |
| conformance | `vitest.conformance.config.ts` | 1 | ~26 | No | `npm run test:conformance` |
| live | `vitest.live.config.ts` | 1 | ~5 | Yes | `npm run test:live` |
| acceptance | `vitest.acceptance.config.ts` | 1 | ~10 | Yes | `npm run test:acceptance` |
| hardening | `vitest.hardening.config.ts` | 32 | ~122 | Yes | `npx vitest run --config vitest.hardening.config.ts` (no script) |

Notes: `src/**/*.test.ts` in the default include glob matches **0 files** (all tests live under `tests/`). `tests/hardening/_smoke.test.ts` is a smoke gate; other hardening files are the live probe suites.

---

## 5. Test files → behaviour AREAS

### Default suite (`tests/*.test.ts`, 148 files) — clustered

| File glob / cluster | Area |
|---------------------|------|
| `binder-*` (7), `capability-probe`, `defaulting-revalidation` | Binder pass: envelope/bypass, model resolution, retry taxonomy, system prompt/note determinism, provider mapping, param defaulting |
| `query-*` (8), `queryerror-variants`, `typed-query-schema-integration`, `query-schema-*` | Query surface: render/followup/discard, respond-repair, tool-loop, schema inference/resolve, QueryError variants |
| `tool-calls*` (10), `tool-registration-lifetime`, `tool-return-shape-*` | Tool calls: execute/lowering, parallel batch, depth ceiling, host denial, off-surface routing/wiring, swallowing handler |
| `invoke-*` (8), `invocation-core`, `active-invocation-*` (2), `no-rollback` | Invoke: cancellation facets, ceiling/depth/cycle, cross-mode, prompt-suspend, provenance, diagnostics, registry/wiring |
| `subagent-*` (3), `session-*` (session-context-truncation, session-shutdown*, session-swap-tripwire) | Subagent mode + session lifecycle (isolation, drive-teardown, model-loom-tool, shutdown/swap/truncation) |
| `expression-*` (4), `control-flow`, `functions-and-return`, `match-result`, `statement-executor`, `effectful-statement-host`, `runtime-*` (3), `canonical-number-render`, `pure-async-unification`, `disc-unions-recursion`, `bindings`, `lexical-environment`, `literals-and-paths`, `placeholder-rendering`, `system-interpolation` | Runtime / expression / stdlib / statement execution / value model |
| `lexer-*` (2), `whole-program-parser`, `type-*` (3), `static-type-inference`, `type-grammar`, `type-compat`, `schema-*` (4), `frontmatter-*` (2), `type-layer-diagnostics-production`, `lexer-parser-diagnostics-production` | Lexer / parser / type layer / schema lowering / frontmatter |
| `discovery-*` (2), `package-discovery`, `settings-merge`, `reload-debounce`, `registration-reload-wiring`, `watcher-*` (2), `watch-token-seams`, `reload-*` | Discovery walk, settings, hot-reload / watcher |
| `extension-*` (3), `composition-producer`, `production-*` (6), `minimal-slash-command`, `slash-dispatch`, `argument-echo`, `descriptions`, `scaffold`, `di-seam-skeleton`, `bind-context-transcript`, `conversation-drive`, `drain-*` (2) | Extension bootstrap/factory, production composition & live resolvers, slash dispatch, conversation drive, drain-gated dispatch |
| `*-seam*` (checkpoint-seam, filesystem-seam, schema-validator-seam, clock-id-seams, watch-token-seams), `checkpoint-granularity`, `runtime-event-channel`, `system-note-channel`, `err-note-render`, `diagnostics-primitive`, `forwarding-*` (2), `cancellation-core`, `production-cancellation-wiring`, `session-shutdown-wiring` | Host seams, diagnostics/system-note channel, forwarding/cancellation wiring |
| `imports`, `wire-name-translation`, `callable-set*` (2), `prompt-*` (prompt-tool-loop-governor, prompt-transport-mapping), `terminal-outcomes`, `ceiling-arbitration`, `depth-enforcement`, `unknown-reason-rule`, `frontmatter-tool-loop-respond-repair` | Imports/warp, callable set, prompt-mode transport/tool-loop governor, ceilings |
| `closing-gate`, `code-registry`, `cross-cutting-gates`, `version-bump-*` (2), `schema-subset-gate`, `inventory-closure-audit*` (2), `sdk-inventory`, `export-visibility`, `committed-fixture-parse-gate`, `live-corpus-release-gate`, `warn-only-canary`, `pre-evaluation-failures`, `load-phase-pre-eval-routing`, `integration-acceptance` | **Gates / meta**: closing gate, code registry, version bump, schema-subset, inventory audit, SDK inventory, release gates |
| `extension-factory-harness`, `modeled-behaviour-surface`, `response-programming-surface` | Self-check of the H4 harness/response-program surface itself |

### Hardening suite (`tests/hardening/*.test.ts`, 32 files)

| File glob | Area |
|-----------|------|
| `_smoke` | Smoke gate |
| `exprflow-*` (7: arith, control, fn-tail-bug, functions, interp, scoping, stdlib) | Expression/control-flow language behaviour under a real session |
| `session-*` (16: bind-context, binder, cancellation, convdrive, crossmode, discodyn, drain-gated, invoke-attach, prompt-transport, promptloop, promptstream, subagent*, systemnotes) | Full-session live-drive behaviours per spec axis |
| `imports-*` (2), `invoke-*` (2), `query-*` (2: empty-template, enums), `frontmatter-diagnostics`, `discovery-cli` | Imports/warp resolution, invoke parse/ceilings, query surfaces, discovery via CLI |

### Opt-in single-file suites
- `tests/live/live-production-acceptance.test.ts` — live H8a.
- `tests/acceptance/noninteractive-acceptance.test.ts` — `pi -p` H9a (9 feature-loom areas a–i).
- `tests/conformance/production-conformance.test.ts` — V20g production-path conformance (load-time + parse/type + runtime/pure + discovery).

---

## 6. tools/ gates (skim)

| Tool | Enforces |
|------|----------|
| `tools/arch-checks/no-ambient-primitives.js` | `src/**` may not directly reference ambient primitives (`process.env`, `process.cwd`, `crypto.randomUUID`, `Date.now`, `performance.now`, `Date.prototype.getTime`, `setTimeout`, `clearTimeout`) — must use injected seams. Exempt only with same-line `// allow-ambient:` comment. |
| `tools/arch-checks/no-module-level-mutable.js` | No module-level mutable bindings in `src/**` (top-level `let`/`var`, or `const` with object/array-literal initializer). "No globals/statics/singletons." |
| `tools/closing-gate/index.js` | H5a REQ-ID ↔ coverage-matrix ↔ diagnostic-code-registry reconciliation. Gap kinds: unmapped-executable-req-id, mapped-req-id-no-citing-test, registry-code-no-asserting-test, asserted-code-not-in-registry. Pure; caller decides disposition. |
| `tools/closing-gate/live-corpus.js` | H5b warn-only live-corpus canary over the same gate machinery (4 arms: REQ-ID set, citing tests, per-facet tests, normative MUSTs). |
| `tools/code-registry/index.js` | V7b diagnostic code registry parse (`loom/parse|load|runtime|host/*`) + closed-set (DIAG-2) + stable-id (DIAG-3) + Message-column lookup (DIAG-4) that asserting tests source expected strings from. |

(`tools/eslint-plugin-loom-local` — local ESLint plugin, wired via `npm run lint`.)
