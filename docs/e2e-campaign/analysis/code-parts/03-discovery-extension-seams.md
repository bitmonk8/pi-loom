# 03 — Discovery, Extension Wiring, Seams (partial)

Slice: how Pi loads loom, discovers `.loom` files, registers slash commands, the
composition root, and the deterministic seams. Every claim cites `file:line`.

## 1. Composition root

### Entry shim → factory

- `extensions/index.ts:14` — thin delegating shim: `export { default } from "../src/extension/factory";`. No logic; auto-discovered via `package.json#pi.extensions`.
- `src/extension/factory.ts:609` — default export: `export default function loomExtension(pi: ExtensionAPI): void`. Signature is `(pi: ExtensionAPI) => void` (synchronous arm; declared host type `void | Promise<void>` pinned to void per `factory.ts:6-15`).
- `factory.ts:609-615` — the default wires the production graph by calling `createLoomExtension({ fixtures: [], composeInstance: (pi, ctx) => composeExtensionInstance(pi, ctx) })(pi)`. No static fixtures; discovery happens at `session_start`.

### Factory body (side-effect registrations)

`createLoomExtension` (`factory.ts:233`) returns `loomExtension(pi)` (`factory.ts:236`) which registers by side-effect, each host call in its own per-call `try/catch` (Pi-SDK-boundary broad-catch, never throws out of body):

- Step 1 — `pi.registerFlag("loom", …)` (`factory.ts:268`). Throw ⇒ fatal, emits `loom/load/extension-bootstrap-failed`, returns (`factory.ts:272-275`).
- Renderer — `pi.registerMessageRenderer("loom-system-note", …)` (`factory.ts:285`); non-abort degrade surface (`rendererGate.degrade()`).
- `pi.on("resources_discover", …)` (`factory.ts:307`) — no-op handler at this leaf; throw fatal.
- `pi.on("session_start", …)` (`factory.ts:321`) — dispatches to `runComposeInstanceRegistration` when `composeInstance` present (`factory.ts:328-329`), else `registerFixtures`/`runProductionRegistration`.
- `pi.on("session_shutdown", …)` (`factory.ts:514`) — five-sub-step teardown via `runSessionShutdown` (`factory.ts:581`).
- `pi.registerCommand` fires from the `session_start` handler (`registerFixtures`, `factory.ts:367`), NOT the factory body — the registration-timing split (`factory.ts:20-22`).

### Trace: factory → composition → producer → runtime-root

- `factory.ts:466` `runComposeInstanceRegistration(ctx)` → `deps.composeInstance!(pi, ctx)` (`factory.ts:471`) = `composeExtensionInstance` (`production-composition.ts:603`).
- `composeExtensionInstance` builds ONE runtime root via `buildRuntimeRoot` (`production-composition.ts:644` → def at `:190`), which calls `createRuntimeRoot({ checkpoint, schemaValidator, clock, fileSystem, fileWatcher, tokenEstimator, idSource })` (`production-composition.ts:204-212`) → `src/runtime-root.ts:64` `createRuntimeRoot(seams)`.
- Runs `runComposePass` (`production-composition.ts:670`, def `:268`): loads settings, runs `discoverLooms` + `discoverPackageLooms`, parses/composes each loom.
- Per loom, producer deps via `createProductionProducerDeps` (`production-composition.ts:368`, in `production-loom-producer.ts`) and `composeLoomFixture(composedInput, producerDeps)` (`production-composition.ts:532` → `loom-composition-producer.ts:294`).
- Returns `ExtensionInstanceWiring` (`production-composition.ts:546`, built `:692-720`): `{ looms, registry: new LoomRegistry(...), activeInvocations, forwardingSignals, clock, installHotReload }`.
- Factory publishes live resources (`factory.ts:478-487`), registers looms via `registerFixtures([...deps.fixtures, ...wiring.looms], wiring.registry)` (`factory.ts:488`), then arms `wiring.installHotReload(...)` (`factory.ts:490`).
- The `discoverFixtures` (H8a) alternative supplier is `discoverAndComposeFixtures` (`production-composition.ts:230`) — same `runComposePass` but throwaway registry; not used by the shipped default.

## 2. Discovery → slash commands

Five-source walk keyed to `ctx.cwd`, invoked from `runComposePass`:

- `discoverLooms(input)` — `src/discovery/discovery-walk.ts:747`. Sources: `cli | settings | project | package | global` (`discovery-walk.ts:27`); priority high→low, smaller wins (`discovery-walk.ts:84`). CLI paths from `readLoomFlagPaths(pi)` (`production-composition.ts:300`). Returns `DiscoveryResult` (`discovery-walk.ts:61`) = `{ looms: DiscoveredLoom[], diagnostics }`; `DiscoveredLoom` (`discovery-walk.ts:54`) = `{ name, path, source }`.
- Package source is walked SEPARATELY — the walk itself defers it (`discovery-walk.ts:786` "Package (priority 4) — owned by V10b; not plumbed into this walk yet"; `discovery-walk.ts:743`). Merged at the composition root: `discoverPackageLooms(...)` (`package-discovery.ts:527`, called `production-composition.ts:319`); package loom added only when its slash name is unclaimed (`production-composition.ts:327-334`).
- Settings drive both the settings source and package bounds: `loadSettings(fs)` (`settings.ts:343`, called `production-composition.ts:292`); `mergeSettings` (`settings.ts:78`).
- Turning into slash commands: each discovered loom parsed (`parseDiscoveredLoom`, `production-composition.ts:407`), tools/imports/binder-model resolved (`production-composition.ts:435-528`), composed to a `LoomFixture` via `composeLoomFixture` (`:532`), collected into `looms: ParsedLoom[]` (`:533`). Registration = `pi.registerCommand(fixture.slashName, { description?, handler })` inside `registerFixtures` (`factory.ts:367-383`). On the composeInstance path the handler is the drain-state-gated wrapper `drainGatedHandler` (`factory.ts:406`); static/discovery paths use raw pass-through (`factory.ts:382`).
- Collision pass reads `pi.getCommands()` read-only before registering (`factory.ts:360`); on reload, own names are excluded to avoid self-drop (`production-composition.ts:301`, `:714`).

## 3. Hot reload / watcher wiring (brief)

- `installHotReload(deps)` — `src/extension/hot-reload.ts:91`; deps `InstallHotReloadDeps` (`:44`), returns `HotReloadHandle` (`:79`) with `detach()`.
- Armed from `ExtensionInstanceWiring.installHotReload` (`production-composition.ts:698-719`) over `roots` = active discovery-root union + settings-file paths (`production-composition.ts:679-684`).
- Debounce: `ReloadDebouncer` 250 ms window (`reload-debounce.ts:70`, `RELOAD_DEBOUNCE_WINDOW_MS = reload-debounce.ts:40`), constructed `hot-reload.ts:73` (drop-and-reschedule; in-flight guard defers concurrent rebuilds — `reload-debounce.ts:79,117-150`).
- ONE watcher armed via `armWatcherWithTerminalRecovery(...)` (`watcher-recovery.ts:95`, called `hot-reload.ts:168`); terminal recovery diagnostic `loom/runtime/watcher-terminated` (`watcher-recovery.ts:40`).
- Reload rebuild → `rebuildAndSwap` (`reload-wiring.ts:304`, called `hot-reload.ts:38`) atomically swaps `LoomRegistry` (`reload-wiring.ts:155`); swap failure `loom/runtime/registry-swap-failed` (`reload-wiring.ts:275`). Registry stores `ParsedLoom` (`reload-wiring.ts:54`).
- `session_shutdown` sub-step 4 detaches via `hotReloadHandle.detach()` (does unsub + `debouncer.cancel()`) — the ClosableWatcher adapter (`factory.ts:546-563`).

## 4. Seams table (deterministic-testing knobs)

All fakes live in `tests/helpers/` (`fake-clock.ts`, `fake-file-system.ts`, `fake-file-watcher.ts`, `fake-id-source.ts`, `fake-token-estimator.ts` — verified present). Production impls wired in `buildRuntimeRoot` (`production-composition.ts:195-212`).

| Seam | Interface (file:line) | Production impl (file:line) | Fake |
|------|----------------------|-----------------------------|------|
| Clock | `src/seams/clock.ts:13` (`interface Clock`; `TimerHandle` `:11`) | `WallClock` `src/seams/wall-clock.ts:16` | `tests/helpers/fake-clock.ts` |
| IdSource | `src/seams/id-source.ts:10` | `CryptoIdSource` `src/seams/crypto-id-source.ts:17` | `tests/helpers/fake-id-source.ts` |
| FileSystem | `src/seams/file-system.ts:16` (`FileStat` `:10`) | `PiFileSystem` `src/seams/pi-file-system.ts:24` | `tests/helpers/fake-file-system.ts` |
| FileWatcher | `src/seams/file-watcher.ts:39` (events `:9-37`) | `PiFileWatcher` `src/seams/pi-file-watcher.ts:20` | `tests/helpers/fake-file-watcher.ts` |
| Checkpoint | `src/seams/checkpoint.ts:21` (`CheckpointKind` `:8`, `CheckpointSite` `:15`) | `ProductionCheckpoint` `src/seams/production-checkpoint.ts:20` | (no dedicated fake found in helpers) |
| SchemaValidator | `src/seams/schema-validator.ts:35` (`LoweredSchema` `:14`, `CompiledValidator` `:29`) | `AjvSchemaValidator` `src/seams/schema-validator.ts:104` | (validator constructed with injected deps) |
| TokenEstimator | `src/seams/token-estimator.ts:11` | `PiTokenEstimator` `src/seams/pi-token-estimator.ts:16` | `tests/helpers/fake-token-estimator.ts` |

Barrel re-export: `src/seams/index.ts:6-24`. Test seam overrides for compose: `ComposeSeamOverrides` (`production-composition.ts:111`) substitutes `fileWatcher`/`clock` only.

## 5. DEFER / TODO / stub / partial markers

Grep `-iE 'DEFER|TODO|FIXME|not.?wired|stub|partial|unimplemented'` over `src/extension src/discovery src/seams`. Most are TDD `V*-T` "tests-task declares seam, stubs behaviour" markers; the behaviour-bearing gaps are noted below.

Load-phase routing / discovery merge:
- `production-composition.ts:120` — full `loom-system-note` routing for discovery diagnostics "deferred (the known load-phase routing gap)". (Note: `composeExtensionInstance` closes this for the reload/compose path via `emitLoadNote`, `production-composition.ts:632-642`.)
- `production-composition.ts:316` — package-merge point the walk itself defers.
- `discovery-walk.ts:786`, `discovery-walk.ts:743`, `discovery-walk.ts:15` — package source (priority 4) "not plumbed into this walk yet" (owned by V10b; merged at composition root instead).

Producer deferred-teardown / refinement:
- `production-loom-producer.ts:364` — invoke_callee suffix "deferred refinement".
- `production-loom-producer.ts:955` — SLSH-5 chain suffix "deferred refinement".
- `production-loom-producer.ts:1185,1757,1828` — leak removal deferred to `finishInvocation`/`teardown` (DRIVE `finally`).
- `production-loom-producer.ts:3153`, `:390` — partial-payload / partial-terminal-outcome handling.

TDD stubs (seam declared, behaviour stubbed by paired impl task):
- `capability-probe.ts:13`; `drain-state.ts:9`; `inventory-closure-audit.ts:37,467`; `load-pre-eval.ts:30,179`; `loom-composition-producer.ts:27`; `reload-debounce.ts:16-20`; `reload-wiring.ts:17,211,223,235` (V9m no-op stubs); `sdk-inventory.ts:25`; `session-shutdown.ts:12,128,135,197,220,250,279,334,401` (V9g-T placeholder diagnostics / no-op teardown); `session-swap-tripwire.ts:24`; `unknown-reason-rule.ts:12`; `watcher-recovery.ts:20`; `version-bump-acceptance.ts:20`; `version-bump-gates.ts:46,112,139,165,189,230,271,287,341` (inert gate stubs).
- `discovery/discovery-walk.ts:11`; `discovery/package-discovery.ts:17`; `discovery/settings.ts:13,75,339`.
- `seams/schema-validator.ts:44` (V8c-T inert stub note); `seams/wall-clock.ts:3` (comment "deferred work", not a stub).

Note: `session_shutdown` sub-steps 2/3/5 are described "live-but-empty" until Increment B threads real shared registry/signals (`factory.ts:502-509`); the shipped default now threads `activeInvocations`/`forwardingSignals` (`production-composition.ts:652,661`, `factory.ts:483,487`), so those are wired in the current tree.
