# `V8b-T` — `Clock`, `FileSystem`, `IdSource`, `FileWatcher`, `TokenEstimator` seams (tests)

**Spec.** [`../spec_topics/pi-integration-contract/host-interfaces-core.md`](../spec_topics/pi-integration-contract/host-interfaces-core.md), [`../spec_topics/pi-integration-contract/host-interfaces-services.md`](../spec_topics/pi-integration-contract/host-interfaces-services.md).

**Adds.** Failing tests for the paired `V8b` implementation leaf.

**Tests.**
- `PIC-12`: `Clock` is per-runtime; an architectural test asserts no *direct* ambient timing reference outside the `WallClock` adapter, whose `Date.now`/`setTimeout` sites carry the `// allow-ambient` comment and allow-list entry the *No globals, statics, singletons* rule ([`conventions.md`](./conventions.md)) requires (the `H3a` identifier-keyed scan; indirect forms are not mechanically detected and are owned by the *Per-phase TDD ritual* self-review step in [`conventions.md`](./conventions.md)).
- `PIC-13`: `FileSystem` maps Node `.code` values; `readBytes` returns raw pre-decode bytes (`Uint8Array`) with the same `.code` rejection mapping (`ENOENT`/`EACCES`/`EPERM`) as `readText`; no `src/**` module reads `process.env`/`process.cwd` directly.
- `PIC-20`: `IdSource.newInvocationId()` is the only *direct* `crypto.randomUUID` reference, registered as an exempt ambient site (`// allow-ambient: crypto.randomUUID — IdSource` plus allow-list entry) per the *No globals, statics, singletons* rule ([`conventions.md`](./conventions.md)) (the `H3a` identifier-keyed scan); indirect forms are owned by the *Per-phase TDD ritual* self-review step in [`conventions.md`](./conventions.md).
- `PIC-14`: `FileWatcher.watch` returns an `Unsubscribe` and reports the three change kinds.
- `PIC-16`: `TokenEstimator.estimate` delegates to `estimateTokens` and is per-runtime.

**Deps.** `H3a`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
