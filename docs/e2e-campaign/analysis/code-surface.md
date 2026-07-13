# Loom — Implementation Surface Map (e2e campaign)

Purpose: a testing-oriented map of the shipped `pi-loom` runtime — the pipeline from a
`.loom` file on disk to appended conversation turns / a final value, the concrete
entry points a test can drive, the five test runners, the deterministic seams, and the
known gaps. Every claim cites `path:line` against CWD `C:/UnitySrc/pi-loom`.

Corpus size: `src/**` = 134 `.ts` modules, 45,572 lines. Breakdown: `runtime/` 50,
`extension/` 23, `parser/` 23, `seams/` 14, `binder/` 12, `render/` 3, `discovery/` 3,
`diagnostics/` 2, `lexer/` 2, `mvp/` 1, plus `runtime-root.ts`.

Synthesized from the four slice partials under `code-parts/`:
`01-frontend-pipeline.md`, `02-runtime-execution.md`, `03-discovery-extension-seams.md`,
`04-harnesses-suites.md`.

> **Marker note (applies throughout):** nearly every `src/**` module carries a
> historical `V*-T (tests-task)` header comment saying it "stubs the behaviour
> inertly". These describe the RED test-task ancestor, not current state — the paired
> implementation leaves are filled in (git HEAD marks the production-readiness program
> complete). §5 separates these archaeological markers from the handful of real,
> spec-sanctioned deferrals.

---

## 1. Architecture overview — from `.loom` on disk to appended turns / final value

```
.loom bytes on disk
  │   discovery-walk.discoverLooms()  +  package-discovery.discoverPackageLooms()
  ▼
parseLoomDocument(source, deps)  ── lex → parse body → doc-comments → resolve query
  │                                  schemas → parse frontmatter → static checkers
  ▼   LoomDocument { frontmatter, body, diagnostics }   (no separate typed IR)
  │   composeLoomFixture() binds it into a slash-registrable LoomFixture
  ▼
pi.registerCommand(slashName, { handler })   (drain-state-gated wrapper)
  │   user types /myloom args → handler → (arg binder) → executeBody
  ▼
executeBody(body, ExecuteBodyDeps)  ── tree-walk statements/expressions
  │      effect dispatch: runQueryEffect / runToolCallEffect / runInvokeEffect
  │      model reached ONLY through the injected QueryModelDriver seam
  ▼
BodyExecution { outcome: success|fail|cancel, result, error? }   (FN-5 final value)
  + conversation turns appended by the production QueryModelDriver
  + operator system-notes emitted on the "loom-system-note" channel
```

### Composition root

- **Extension entry shim:** `extensions/index.ts:14` — `export { default } from
  "../src/extension/factory";`. Auto-discovered via `package.json#pi.extensions`. No
  logic.
- **Factory / default export:** `src/extension/factory.ts:609` —
  `export default function loomExtension(pi: ExtensionAPI): void`. Wires the production
  graph via `createLoomExtension({ fixtures: [], composeInstance })(pi)`
  (`factory.ts:609-615`). Registrations are side-effects fired from the
  `session_start` handler, not the factory body (`factory.ts:321`, `:367`).
- **Per-runtime object graph:** `createRuntimeRoot(seams)` — `src/runtime-root.ts:64`;
  `RuntimeRoot` (`:47`) holds the 7 injected seams as readonly fields, no mutable
  state, one instance per runtime.
- **Composition pass:** `composeExtensionInstance(pi, ctx)` —
  `src/extension/production-composition.ts:603` → `buildRuntimeRoot` (`:190`, calls
  `createRuntimeRoot` at `:204-212`) → `runComposePass` (`:268`) loads settings, runs
  discovery, parses+composes each loom, returns `ExtensionInstanceWiring` (`:546`) =
  `{ looms, registry, activeInvocations, forwardingSignals, clock, installHotReload }`.

### Front-end compile pipeline (offline, no model) — `parseLoomDocument`

Single whole-document entry: **`parseLoomDocument(source, deps): LoomDocument`** —
`src/parser/loom-document.ts:563`. Stages (all inside that function):

1. `splitFrontmatter` — `src/parser/loom-document.ts:851`.
2. `lexLoom(source, deps): LexResult` — `src/lexer/lexer.ts:92` (UTF-8 validate,
   tokenise; `Token` `:38`, `LexResult` `:70`).
3. `new BodyParser(...).parseBody()` — `src/parser/loom-document.ts:1037` → `LoomBody`
   AST (`:522`).
4. `scanDocComments` / `mergeByLine` — `:905`.
5. `resolveQuerySchemas` (QRY-2 inferred response schema) — called `:613`.
6. `parseFrontmatter(source, options)` — `src/parser/frontmatter.ts:665`.
7. Static checkers over the AST: `checkStructural` (`loom-document.ts:2950`),
   `checkTypeLayer` (V20b static-type substrate), `checkWarpTopLevel` (`:597`).
8. `assembleDiagnostics(...)` — `src/diagnostics/diagnostic.ts:107` (sorted, no
   fast-fail).

Output `LoomDocument { frontmatter, body, diagnostics }` (`loom-document.ts:531`).
There is **no separate bound/typed IR** — the typed representation is the same `body`
AST, mutated in place. Diagnostics are always returned in-band, never thrown
(`Diagnostic` shape `src/diagnostics/diagnostic.ts:43`).

The `src/binder/**` "binder" is **not** a scope/name binder — it is loom's runtime
**argument binder** (binds slash args to `params:` via a model `complete()` call).
Static name/type resolution lives in the parser checker passes above.

### Runtime execution path — `executeBody`

- **Driver:** `executeBody(body, deps): Promise<BodyExecution>` —
  `src/runtime/statement-executor.ts:805` (strict top-to-bottom tree-walk; returns the
  terminal outcome + FN-5 final value). Called from the extension layer
  (`loom-composition-producer.ts:356`, `production-loom-producer.ts:2294/:2333`), not
  from within `src/runtime`.
- **Dispatchers** (all `statement-executor.ts`): `executeStatement` `:554`
  (switch on `stmt.kind`), `executeBlock` `:632`, `evalExpr` `:319`,
  `evalAsResult` `:404`, `executeIf` `:660`, `executeWhile` `:715`, `executeFor` `:753`.
- **Effect dispatch:** `StatementEvalHost` interface `:92`; concrete
  `createEffectfulStatementHost(deps)` — `src/runtime/effectful-statement-host.ts:370`;
  `runEffect` (`:387`) routes to `runQueryEffect` (`:149`), `runToolCallEffect`
  (`:227`), `runInvokeEffect` (`:303`).
- **Value / outcome model:** `LoomValue` union `src/runtime/value.ts:75`;
  `ResultValue` `:64`; `EnumValue` `:55`; structural equality `valuesEqual` `:203`.
  `TerminalOutcome = success|fail|cancel` `src/runtime/function-result.ts:34`;
  `BodyExecution { outcome, result, error? }` `statement-executor.ts:128`.
- **Turn append / observe:** production `QueryModelDriver`s append turns (prompt mode:
  `pi.sendUserMessage`); observation/extraction is `extractTrailingTurnText(messages)`
  — `src/runtime/conversation-drive.ts:202`. Operator-facing runtime events emit on the
  `loom-system-note` channel via `emitRuntimeEvent`/`emitPanic`
  (`src/runtime/runtime-event-channel.ts:309`, `:325`).

---

## 2. Entry points for testing

### (a) Parse a loom OFFLINE (no model, no session)

Call **`parseLoomDocument(source, deps)`** — `src/parser/loom-document.ts:563`.

```ts
import { parseLoomDocument } from "../src/parser/loom-document";
const doc = parseLoomDocument(
  { path: "x.loom", bytes: new TextEncoder().encode(src) }, // LoomSource (lexer.ts:62)
  { systemNote: () => {}, modelMatcher: /* inert */ }        // ParseLoomDocumentDeps (:545)
);
// assert on doc.diagnostics (in-band, never thrown), doc.frontmatter, doc.body
```

Both deps can be inert no-ops offline (see the inert-`systemNote` usage in
`parseExpressionSource`, `loom-document.ts:773-779`). Narrower entries:
`parseExpressionSource(src)` `:761`, `lexLoom(...)` `src/lexer/lexer.ts:92`,
`parseFrontmatter(...)` `src/parser/frontmatter.ts:665`. Pure binder helpers that need
no model: `classifyBinderBypass` (`src/binder/binder-envelope.ts:176`),
`buildBinderEnvelopeSchema` (`:78`), `deriveBinderSeed` (`src/binder/binder-seed.ts:43`),
`buildBinderSystemPrompt` (`src/binder/binder-system-prompt.ts:175`).

> Note: `src/mvp/minimal-loom.ts` (`buildMinimalLoom` `:99`) uses its OWN regex parser
> (`parseMinimalLoom` `:47`) — it does **not** exercise the real pipeline. Use
> `parseLoomDocument` for offline-parse tests.

### (b) Drive a loom through the production composition WITHOUT a model (conformance style)

Two flavours, both offline:

1. **Scripted in-process driver (`tests/harness/`)** — best for asserting exact
   behaviour against a scripted model. **`loadExtension(deps): LoadedExtension`** —
   `tests/harness/index.ts:43`. It news a `SessionDouble` (`tests/harness/session-double.ts:75`),
   runs `createLoomExtension(deps)(double.pi)`, fires `session_start`, returns
   `{ double, dispatch(name, args) }`.

   ```ts
   import { loadExtension } from "../harness";
   const ext = loadExtension(deps);           // in-memory .loom fixtures in deps
   ext.double.responses
     .scriptAssistantTurns([{ fragments: ["Hi"], toolUses: ["t1"] }])   // response-program.ts:207
     .scriptToolResult({ toolUseId: "t1", toolName: "read", content: "…", isError: false }); // :215
   await ext.dispatch("myloom", "arg text"); // session-double.ts:149
   // assert against ext.double.transcript / .systemNotes / .events
   ```

   The scripting API is `ResponseProgrammer` (`tests/harness/response-program.ts:194`,
   `drive()` `:288`): `scriptAssistantTurns` `:207`, `scriptToolResult` `:215`,
   `scriptBinderAttempts` `:223`, `scriptToolLoop` `:236`, `scriptAbortAt` `:248`,
   `scriptInvokeChild` `:260`, `scriptSubagentCallee` `:272`.

2. **Production-composition conformance** — `tests/conformance/production-conformance.test.ts`.
   Load-time: `runProductionLoad(cwd)` plants `.loom` under a temp `.pi/looms/`, calls the
   shipped `discoverAndComposeFixtures(pi, ctx)` with `ctx.modelRegistry.getAvailable()
   → []`. Runtime/pure: `runSource(src, resolvePiTool?)` = `parseLoomDocument` →
   assert no error diagnostics → `createProductionProducerDeps(...).bindPromptConversation(...)`
   → `executeBody(...)` with a runtime-root double (checkpoint/idSource/clock only, no
   model).

**The realistic no-live-SDK injection point is the `QueryModelDriver` seam** —
`src/runtime/query-tool-loop.ts:119` (members `nextFreePhaseTurn` `:121`,
`runToolBatch` `:127`, `forcedRespondTurn` `:132`; typed path also takes
`TypedQuerySchemaValidation` `:281`). A test that supplies a scripted `QueryModelDriver`
drives the full loop without any live `ExtensionAPI`/`Model<Api>`.

### (c) Drive a loom against a REAL model (live / hardening / acceptance style)

- **Live (in-process real session):** **`bootShippedExtension({ workspace, provider })`**
  — `tests/live/harness.ts:157`. Plant files with `plantLoomWorkspace(looms)` (`:114`),
  resolve a credentialed model with `requireLiveProvider()` (`:66`), then drive one turn
  with `driveSlashCaptureText(session, "/foo args")` (`:215`). Handle exposes
  `command(stem)`, `registeredNames()`, `dispose()`.

  ```ts
  const provider = requireLiveProvider();
  const ws = plantLoomWorkspace([{ name: "greet", body: "…" }]);
  const ext = await bootShippedExtension({ workspace: ws, provider });
  const text = await driveSlashCaptureText(ext.session, "/greet world");
  await ext.dispose();
  ```

- **Hardening probe (real model, many observation channels):** **`runProbe({ provider,
  files, drives?, projectSettings? })`** — `tests/hardening/probe-harness.ts:164`. A
  "probe" = one boot of the shipped extension over a fresh temp workspace + planted
  files, driving ordered slash invocations against a live model; `ProbeResult` (`:121`)
  returns `registeredNames`, load-phase `diagnostics`/`systemNotes`, and per-drive
  `turns[]` (`userTexts`, `assistantText`, `toolCalls`, `systemNotes`, `error`).
  `drives: []` ⇒ registration/diagnostics only (zero model tokens).

- **Acceptance (black-box `pi -p` binary):** **`spawnPiPrint(options)`** —
  `tests/acceptance/harness.ts:365`. Spawns the real `pi` CLI in print mode
  (`-p -ne -e <extensions> --provider … --model … --loom <dir> "/stem"`), captures
  stdout/stderr/exit. `FEATURE_LOOMS` (`:182`) = 9 committed feature-loom specs.

---

## 3. Test suite inventory — 5 runners

5 vitest configs, **4** npm scripts. No config declares `setupFiles`; all
`environment: "node"`. No harness reads `ANTHROPIC_API_KEY` — live suites resolve a
model via `ModelRegistry.getAvailable()` (empty ⇒ fail loudly); the `pi -p` acceptance
process inherits `process.env` for credentials.

| # | Suite | Command | Config | Covers | Model/network? | ~files / ~cases |
|---|-------|---------|--------|--------|----------------|-----------------|
| 1 | **default** | `npm test` (`vitest run`) | `vitest.config.ts` | All offline unit/integration; excludes live/acceptance/conformance/hardening dirs (`vitest.config.ts:8`) | **No** | 148 / ~1616 |
| 2 | **conformance** | `npm run test:conformance` | `vitest.conformance.config.ts` | Production-composition regression net: load-time discovery + parse/type + runtime/pure drive, empty model registry (`testTimeout 60000`) | **No** | 1 / ~26 |
| 3 | **live** | `npm run test:live` | `vitest.live.config.ts` | In-process real `AgentSession` through shipped entry (`bootShippedExtension`); H8a live production acceptance (`testTimeout 120000`) | **Yes** | 1 / ~5 |
| 4 | **acceptance** | `npm run test:acceptance` | `vitest.acceptance.config.ts` | Black-box `pi -p` over 9 feature looms a–i (`spawnPiPrint`; `testTimeout 180000`) | **Yes** | 1 / ~10 |
| 5 | **hardening** | `npx vitest run --config vitest.hardening.config.ts` **(no npm script)** | `vitest.hardening.config.ts` | Live-session behavioural probes per spec axis; `fileParallelism:false` (serial, provider contention; `testTimeout 180000`) | **Yes** | 32 / ~122 |

Model resolution: live `requireLiveProvider` `tests/live/harness.ts:66`; hardening
`requireLiveProvider` `tests/hardening/probe-harness.ts:69` (both prefer
`claude-opus-4-*`); acceptance `requireLiveHost` `tests/acceptance/harness.ts:314`,
provider/model overridable via env `PI_LOOM_ACC_PROVIDER` (default `unity-messages`) /
`PI_LOOM_ACC_MODEL` (default `claude-haiku-4-5`) at `harness.ts:65-66`. Counts are
`it(`/`test(` occurrence approximations. `src/**/*.test.ts` in the default glob matches
0 files (all tests live under `tests/`).

### Test file → area map

Default suite (`tests/*.test.ts`, 148 files) — clustered:

| Cluster (globs) | Area |
|-----------------|------|
| `binder-*` (7), `capability-probe`, `defaulting-revalidation` | Arg binder: envelope/bypass, model resolution, retry taxonomy, system prompt/note determinism, provider mapping, defaulting |
| `query-*` (8), `queryerror-variants`, `typed-query-schema-integration`, `query-schema-*` | Query surface: render/followup/discard, respond-repair, tool-loop, schema inference/resolve, QueryError variants |
| `tool-calls*` (10), `tool-registration-lifetime`, `tool-return-shape-*` | Tool calls: execute/lowering, parallel batch, depth ceiling, host denial, off-surface routing/wiring, swallowing handler |
| `invoke-*` (8), `invocation-core`, `active-invocation-*` (2), `no-rollback` | Invoke: cancellation, ceiling/depth/cycle, cross-mode, prompt-suspend, provenance, diagnostics, registry/wiring |
| `subagent-*` (3), `session-*` (context-truncation, shutdown*, swap-tripwire) | Subagent mode + session lifecycle |
| `expression-*` (4), `control-flow`, `functions-and-return`, `match-result`, `statement-executor`, `effectful-statement-host`, `runtime-*` (3), `canonical-number-render`, `pure-async-unification`, `disc-unions-recursion`, `bindings`, `lexical-environment`, `literals-and-paths`, `placeholder-rendering`, `system-interpolation` | Runtime / expression / stdlib / statement execution / value model |
| `lexer-*` (2), `whole-program-parser`, `type-*` (3), `static-type-inference`, `type-grammar`, `type-compat`, `schema-*` (4), `frontmatter-*` (2), `*-diagnostics-production` (2) | Lexer / parser / type layer / schema lowering / frontmatter |
| `discovery-*` (2), `package-discovery`, `settings-merge`, `reload-*`, `registration-reload-wiring`, `watcher-*` (2), `watch-token-seams` | Discovery walk, settings, hot-reload / watcher |
| `extension-*` (3), `composition-producer`, `production-*` (6), `minimal-slash-command`, `slash-dispatch`, `argument-echo`, `descriptions`, `scaffold`, `di-seam-skeleton`, `bind-context-transcript`, `conversation-drive`, `drain-*` (2) | Extension bootstrap/factory, production composition & live resolvers, slash dispatch, conversation drive |
| `*-seam*` (checkpoint/filesystem/schema-validator/clock-id/watch-token), `checkpoint-granularity`, `runtime-event-channel`, `system-note-channel`, `err-note-render`, `diagnostics-primitive`, `forwarding-*` (2), `cancellation-core`, `production-cancellation-wiring`, `session-shutdown-wiring` | Host seams, diagnostics/system-note channel, forwarding/cancellation |
| `imports`, `wire-name-translation`, `callable-set*` (2), `prompt-*` (2), `terminal-outcomes`, `ceiling-arbitration`, `depth-enforcement`, `unknown-reason-rule`, `frontmatter-tool-loop-respond-repair` | Imports/warp, callable set, prompt-mode transport/tool-loop governor, ceilings |
| `closing-gate`, `code-registry`, `cross-cutting-gates`, `version-bump-*` (2), `schema-subset-gate`, `inventory-closure-audit*` (2), `sdk-inventory`, `export-visibility`, `committed-fixture-parse-gate`, `live-corpus-release-gate`, `warn-only-canary`, `pre-evaluation-failures`, `load-phase-pre-eval-routing`, `integration-acceptance` | **Gates / meta**: closing gate, code registry, version bump, schema-subset, inventory audit, SDK inventory, release gates |
| `extension-factory-harness`, `modeled-behaviour-surface`, `response-programming-surface` | Self-check of the H4 harness/response-program surface |

Hardening suite (`tests/hardening/*.test.ts`, 32 files):

| Glob | Area |
|------|------|
| `_smoke` | Smoke gate |
| `exprflow-*` (7) | Expression/control-flow language behaviour under a real session |
| `session-*` (16) | Full-session live-drive behaviours per spec axis (binder, cancellation, convdrive, crossmode, discodyn, drain-gated, invoke-attach, prompt-transport, promptloop, promptstream, subagent*, systemnotes) |
| `imports-*` (2), `invoke-*` (2), `query-*` (2), `frontmatter-diagnostics`, `discovery-cli` | Imports/warp resolution, invoke parse/ceilings, query surfaces, discovery via CLI |

Opt-in single-file suites: `tests/live/live-production-acceptance.test.ts` (H8a),
`tests/acceptance/noninteractive-acceptance.test.ts` (H9a),
`tests/conformance/production-conformance.test.ts` (V20g).

`tools/` gates (run outside vitest / as gate tests): `arch-checks/no-ambient-primitives.js`
(no direct `process.env`/`Date.now`/`crypto.randomUUID`/`setTimeout` in `src/**` — must
use seams), `arch-checks/no-module-level-mutable.js` (no globals/statics/singletons),
`closing-gate/index.js` (REQ-ID ↔ coverage-matrix ↔ diagnostic-code-registry
reconciliation), `closing-gate/live-corpus.js` (warn-only canary),
`code-registry/index.js` (diagnostic-code registry, closed set + stable ids).

---

## 4. Seams & knobs (deterministic testing)

The runtime reaches wall-clock, environment, cwd, UUID minting, filesystem, and the
file watcher **only** through 7 injected seams (`RuntimeRoot`, `src/runtime-root.ts:47`;
production wiring `production-composition.ts:195-212`). Fakes live in `tests/helpers/`.
Compose-time overrides: `ComposeSeamOverrides` (`production-composition.ts:111`)
substitutes `fileWatcher`/`clock` only.

| Seam | Interface (file:line) | Production impl (file:line) | Fake (file:line) & knobs |
|------|----------------------|-----------------------------|--------------------------|
| Clock | `src/seams/clock.ts:13` | `WallClock` `src/seams/wall-clock.ts:16` | `FakeClock` `tests/helpers/fake-clock.ts:29` — `{ now?, wallEpoch? }`; `advance(ms)` fires due timers in deadline+registration order |
| IdSource | `src/seams/id-source.ts:10` | `CryptoIdSource` `src/seams/crypto-id-source.ts:17` | `FakeIdSource` `tests/helpers/fake-id-source.ts:13` — ctor `ids: string[]`; exhaustion throws loudly |
| FileSystem | `src/seams/file-system.ts:16` | `PiFileSystem` `src/seams/pi-file-system.ts:24` | `FakeFileSystem` `tests/helpers/fake-file-system.ts:58` — `{ homedir, cwd, files?, dirs?, symlinks?, errors?, caseInsensitive? }`; per-path Node `.code` injection |
| FileWatcher | `src/seams/file-watcher.ts:39` | `PiFileWatcher` `src/seams/pi-file-watcher.ts:20` | `FakeFileWatcher` `tests/helpers/fake-file-watcher.ts:18` — `emit(event)`, `terminate(termination)`, idempotent unsubscribe |
| TokenEstimator | `src/seams/token-estimator.ts:11` | `PiTokenEstimator` `src/seams/pi-token-estimator.ts:16` | `FakeTokenEstimator` `tests/helpers/fake-token-estimator.ts:13` — ctor `counts: Map<AgentMessage,number>`; unconfigured msg throws (no silent 0) |
| Checkpoint | `src/seams/checkpoint.ts:21` | `ProductionCheckpoint` `src/seams/production-checkpoint.ts:20` | no dedicated fake — tests inject inline doubles |
| SchemaValidator | `src/seams/schema-validator.ts:35` | `AjvSchemaValidator` `src/seams/schema-validator.ts:104` | constructed with injected deps; no standalone fake |

Barrel: `src/seams/index.ts:6-24`. **Model seam** (not in `RuntimeRoot`; injected into
the query loop): `QueryModelDriver` `src/runtime/query-tool-loop.ts:119` +
`TypedQuerySchemaValidation` `:281` — the single boundary a test overrides to fake or
supply a model. Production implementations `LivePromptQueryModel`
(`production-loom-producer.ts:2663`), `OffSessionQueryModel` (`:2926`),
`SubagentQueryModel` (`:3029`).

---

## 5. Known gaps / DEFER / TODO / stubs

Grep `-iE 'DEFER|TODO|FIXME|not.?wired|stub|partial|unimplemented'` across `src/**`
returns many hits, but they fall into non-blocking classes. **No `FIXME`, no executable
`unimplemented` sentinel, no `not-wired` was found in any current body** across
front-end, runtime, or extension code.

### Historical / benign (majority — NOT gaps)
- **`V*-T` tests-first header comments** ("stubs the behaviour inertly / the paired
  leaf fills it in") — the paired bodies are implemented. Verified spot-checks:
  `parseLoomDocument` header `loom-document.ts:16` vs body `:563`; `executeBody`
  header `statement-executor.ts:4` vs body `:805`; `runEffect` header
  `effectful-statement-host.ts:29/:366` vs body `:387`. The `UNIMPLEMENTED` sentinel
  appears **only in doc comments** now (e.g. `src/binder/system-note.ts:68,96,128,180`),
  not in any executed path.
- **Domain use of "partial"** (partial-append / partial-stream contract), not
  "incomplete": `src/runtime/terminal-outcomes.ts` throughout,
  `src/runtime/no-rollback.ts:25`, `src/runtime/slash-dispatch.ts:7,178`.

### Spec-sanctioned static→runtime deferrals (intentional design boundary)
The static type engine returns `"unknown"` and defers statically-unresolvable operands
to the runtime AJV safety net — this is deliberate, not missing work:
`src/parser/type-compat.ts:323,333,382,521`;
`src/parser/static-type-inference.ts:24,85,177`;
`src/parser/match-result.ts:175,212`;
`src/parser/invoke-diagnostics.ts:200,203,277`;
`src/parser/type-layer-checks.ts:120,601`;
`src/runtime/expression-evaluator.ts:587,612`; `src/runtime/stdlib-object.ts:41`;
`src/runtime/invoke-ceiling-depth.ts:27,77,97,109`.

### Loom-1.0 language deferrals (out-of-scope grammar)
`src/lexer/lexer.ts:594` (hex/octal numeric forms deferred);
`src/parser/literal-sublanguage.ts:18,525` (partial defaults unsupported);
`src/parser/frontmatter.ts:678-680` (refuse partially-recovered YAML);
`src/parser/imports.ts:158` (package-style import extensions deferred);
`src/binder/session-context-walk.ts:13,128` (whole-turn, not partial, truncation).

### Behaviour-bearing deferrals worth a test author's attention
- **Load-phase routing gap** — `src/extension/production-composition.ts:120`: full
  `loom-system-note` routing for discovery diagnostics "deferred". Closed on the
  `composeExtensionInstance` reload/compose path via `emitLoadNote`
  (`production-composition.ts:632-642`), but the `makeLoadEmit` toast path retains the
  gap. Worth an explicit test of discovery-diagnostic surfacing on both paths.
- **Package-source discovery merged out-of-band** — the walk itself defers package
  source (`src/discovery/discovery-walk.ts:743,786`, priority 4 "not plumbed into this
  walk yet"); package looms are merged at the composition root via
  `discoverPackageLooms` (`src/discovery/package-discovery.ts:527`, merged
  `production-composition.ts:319-334`, only when the slash name is unclaimed). Test
  package-loom discovery through the composition root, not the walk in isolation.
- **Producer teardown "deferred refinement"** —
  `src/extension/production-loom-producer.ts:364` (invoke_callee suffix), `:955`
  (SLSH-5 chain suffix), `:1185,1757,1828` (leak removal deferred to
  `finishInvocation`/`teardown` DRIVE `finally`), `:390,3153` (partial-terminal /
  partial-payload handling).
- **`session_shutdown` comment/code drift** — `factory.ts:502-509` describes sub-steps
  2/3/5 as "live-but-empty until Increment B", but the shipped tree threads
  `activeInvocations`/`forwardingSignals` (`production-composition.ts:652,661`,
  `factory.ts:483,487`). The steps are wired; the comment is stale. Confirm via the
  `session-shutdown*` tests.

---

## Summary

- **Module count:** 134 `src/**` `.ts` modules (45,572 LOC): `runtime/` 50,
  `extension/` 23, `parser/` 23, `seams/` 14, `binder/` 12, others small.
- **Harness entry points found (5):**
  offline parse `parseLoomDocument` (`src/parser/loom-document.ts:563`);
  scripted no-model driver `loadExtension` (`tests/harness/index.ts:43`) +
  `ResponseProgrammer` (`tests/harness/response-program.ts:194`);
  production-composition conformance `runProductionLoad`/`runSource`
  (`tests/conformance/production-conformance.test.ts`);
  live real-model `bootShippedExtension` (`tests/live/harness.ts:157`);
  hardening `runProbe` (`tests/hardening/probe-harness.ts:164`);
  acceptance black-box `spawnPiPrint` (`tests/acceptance/harness.ts:365`).
- **The one seam that matters most for e2e:** `QueryModelDriver`
  (`src/runtime/query-tool-loop.ts:119`) — the sole model boundary; scripting it drives
  the full runtime with no live SDK.
- **Surprising gaps:**
  1. **Hardening suite has no npm script** — only runnable via
     `npx vitest run --config vitest.hardening.config.ts` (32 files, live model).
  2. **`src/mvp/minimal-loom.ts` bypasses the real parser** (its own regex parser) —
     do not treat it as a compile-pipeline entry.
  3. **Discovery package source is a two-stage merge** — the walk defers it; only the
     composition root merges package looms. Isolated walk tests won't see package
     looms.
  4. **Stale `session_shutdown` "live-but-empty" comment** (`factory.ts:502-509`)
     contradicts the wired tree — a comment/code drift, not a real gap.
  5. No `ANTHROPIC_API_KEY` read anywhere; live auth flows through
     `ModelRegistry`/`AuthStorage` and (acceptance) inherited `process.env`.
