# `V8b-T` — `Clock`, `FileSystem`, `IdSource`, `FileWatcher`, `TokenEstimator` seams (tests)

**Spec.** [`../spec_topics/pi-integration-contract/host-interfaces-core.md`](../spec_topics/pi-integration-contract/host-interfaces-core.md), [`../spec_topics/pi-integration-contract/host-interfaces-services.md`](../spec_topics/pi-integration-contract/host-interfaces-services.md).

**Adds.** Failing tests for the paired `V8b` implementation leaf.

**Tests.**
- `PIC-12`: `Clock` is per-runtime; an architectural test asserts no *direct* ambient timing reference outside the `WallClock` adapter, whose `now()`→`performance.now()`, `wallNow()`→`Date.now()`, and `setTimeout`/`clearTimeout` sites each carry their own same-line `// allow-ambient: <primitive> — Clock` comment the *No globals, statics, singletons* rule ([`conventions.md`](./conventions.md)) requires (that comment is itself the allow-list entry; there is no separate registry) (the `H3a` identifier-keyed scan enforces the spec's full WallClock ban surface — `Date.now`, `performance.now`, `Date.prototype.getTime`, `setTimeout`, `clearTimeout`; indirect forms are not mechanically detected and are owned by the *Per-phase TDD ritual* self-review step in [`conventions.md`](./conventions.md))).
- `PIC-13`: `FileSystem` maps Node `.code` values; `readBytes` returns raw pre-decode bytes (`Uint8Array`) with the same `.code` rejection mapping (`ENOENT`/`EACCES`/`EPERM`) as `readText`; no `src/**` module reads `process.env`/`process.cwd` directly.
- `PIC-20`: `IdSource.newInvocationId()` is the only *direct* `crypto.randomUUID` reference, registered as an exempt ambient site by its same-line `// allow-ambient: crypto.randomUUID — IdSource` comment (which is itself the allow-list entry; there is no separate registry) per the *No globals, statics, singletons* rule ([`conventions.md`](./conventions.md)) (the `H3a` identifier-keyed scan); indirect forms are owned by the *Per-phase TDD ritual* self-review step in [`conventions.md`](./conventions.md).
- `PIC-14`: `FileWatcher.watch` returns an `Unsubscribe` and reports the three change kinds.
- `PIC-16`: `TokenEstimator.estimate` delegates to `estimateTokens` and is per-runtime.

**Deps.** `H3a`

**Ships when.** The tests above exist, compile, and fail red for the intended reason.
