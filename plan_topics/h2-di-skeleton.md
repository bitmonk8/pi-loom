# H2 — Dependency-injection skeleton with fakes

**Spec.** [Implementation Notes — Runtime](../spec_topics/implementation-notes.md#runtime) (Schema validation bullet — pins the `SchemaValidator` behavioural contract and declares the [`SchemaValidator` interface](../spec_topics/implementation-notes.md#schemavalidator-interface); Clock bullet — pins the `Clock` behavioural contract); [Pi Integration Contract](../spec_topics/pi-integration-contract.md) (pins `ExtensionAPI`, `ConversationDriver`, `SubagentSpawner` / `SubagentSession`, the [`FakeFileSystem` / `FileSystem` interface](../spec_topics/pi-integration-contract.md#fakefilesystem--filesystem-interface), the [`FakeFileWatcher` / `FileWatcher` interface](../spec_topics/pi-integration-contract.md#filewatcher-interface), the [`Clock` / `FakeClock` interface](../spec_topics/pi-integration-contract.md#clock--fakeclock-interface), and the [`Checkpoint` seam](../spec_topics/pi-integration-contract.md#checkpoint-seam) the interpreter awaits before each cancellation checkpoint). Other seams are loom-internal and have no normative spec page.

> **Editor warning.** The signatures of `FileSystem`, `FileWatcher`, `Clock`, `Checkpoint`, `SchemaValidator`, and `CompiledValidator` are anchored in the spec pages cited above — this leaf consumes them via `import type` and MUST NOT redeclare them. If adapter guidance later requires refining one of these signatures (a new method, a changed return shape, a renamed parameter), the spec page is updated *first*; only after the spec edit lands may this leaf's adapter / fake guidance change. Silently widening or narrowing the seam shape in this leaf without a corresponding spec edit is the failure mode the spec-anchored imports exist to prevent.

**Adds.** Pure-interface seams for every collaborator the runtime needs, declared as TypeScript signatures in the code block below. A constructor-injection factory `makeRuntime({ ... })` that wires them. In-memory fakes for every interface in `test/fakes/` — production code never imports a fake. `SubagentSpawner` is a factory seam wrapping Pi's `createAgentSession` (per [Pi Integration Contract — Conversation drive — subagent mode](../spec_topics/pi-integration-contract.md) and [Pi Integration Contract — Subagent session lifecycle](../spec_topics/pi-integration-contract.md)): `spawn(opts)` returns a `SubagentSession` handle whose `dispose()` delegates to the underlying `AgentSession.dispose()` and is the sole surface V12a, V18d, and V18n test against. `ToolHost.getCommandContext()` returns `undefined` when no slash-handler is currently retained (before the first invocation and after `session_shutdown`); production callers pass a defined `ctx` to `setCommandContext` on slash-handler entry, and `setCommandContext(undefined)` clears the retained reference. `FileSystem.homedir()` exists so production code never reads `process.env` directly (per [Pi Integration Contract — `FakeFileSystem` / `FileSystem` interface](../spec_topics/pi-integration-contract.md#fakefilesystem--filesystem-interface) and [Directory Convention — Home-directory expansion](../spec_topics/discovery.md#home-directory-expansion)).

```ts
// Re-exported Pi types — H2 does not redeclare them.
import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";

// Spec-anchored seams — H2 imports the signatures from the spec corpus and MUST NOT redeclare them.
// The anchor links below are load-bearing: refining a signature here without updating the spec page
// is forbidden by the editor warning above.
//   - FileSystem, FileStat                          → spec_topics/pi-integration-contract.md#fakefilesystem--filesystem-interface
//   - FileWatcher, FileWatchEvent, FileWatchEventKind, Unsubscribe
//                                                   → spec_topics/pi-integration-contract.md#filewatcher-interface
//   - Clock, TimerHandle                            → spec_topics/pi-integration-contract.md#clock--fakeclock-interface
//   - Checkpoint, CheckpointKind, CheckpointSite    → spec_topics/pi-integration-contract.md#checkpoint-seam
//   - SchemaValidator, CompiledValidator, ValidationError
//                                                   → spec_topics/implementation-notes.md#schemavalidator-interface
import type {
  FileSystem, FileStat,
  FileWatcher, FileWatchEvent, FileWatchEventKind, Unsubscribe,
  Clock, TimerHandle,
  Checkpoint, CheckpointKind, CheckpointSite,
  SchemaValidator, CompiledValidator, ValidationError,
} from "../src/seams";  // module path is illustrative; the binding to the spec anchors is what is normative.

// DiagnosticsSink — the universal emit path mandated by H3's Ships-when. Loom-internal; no spec page.
// `Diagnostic` is the shape introduced in H3.
interface DiagnosticsSink {
  report(d: Diagnostic): void;
  drain(): readonly Diagnostic[];                   // sorted (file, line, col); preserves report order on equal positions
}

// ModelClient — provider-agnostic chat surface used by ConversationDriver. Loom-internal; no spec page.
// `ModelRequest` / `ModelResponse` shapes are deferred to V5 / V6.
interface ModelClient {
  send(req: ModelRequest): Promise<ModelResponse>;
}

// ConversationDriver — drives one query against a session; mode-specific implementations
// (PromptModeConversationDriver in V5e, SubagentModeConversationDriver in V12a) live downstream.
interface ConversationDriver {
  send(text: string, opts?: { deliverAs?: "user" | "steer" }): Promise<string>;
}

// ToolHost — invokes a tool by registered name; concrete impls in H4 / V14.
// The retained ExtensionCommandContext is set on slash-handler entry and cleared on session_shutdown.
interface ToolHost {
  invoke(name: string, args: unknown): Promise<unknown>;
  getCommandContext(): ExtensionCommandContext | undefined;
  setCommandContext(ctx: ExtensionCommandContext | undefined): void;
}

// LoomLoader — parses a .loom (or .warp) file into the in-memory program shape used by the runtime.
// `ParsedLoom` is the shape introduced in V3 / V17; H2 forward-declares it and the downstream leaf
// that introduces the shape narrows the parameter type.
interface LoomLoader {
  load(path: string): Promise<ParsedLoom>;
}

// SubagentSpawner — factory seam wrapping Pi's createAgentSession. Loom-internal; no spec page beyond
// the behavioural contract in spec_topics/pi-integration-contract.md (Conversation drive — subagent mode,
// Subagent session lifecycle).
// `SubagentSpawnOptions` is the call shape introduced by V12a; `AgentEvent` is the event shape
// surfaced by Pi's session subscribe API. `Unsubscribe` is re-used from the spec-anchored FileWatcher import.
interface SubagentSpawner {
  spawn(opts: SubagentSpawnOptions): Promise<SubagentSession>;
}
interface SubagentSession {
  sendUserMessage(text: string): Promise<void>;
  subscribe(handler: (event: AgentEvent) => void): Unsubscribe;
  abort(): Promise<void>;                           // delegates to AgentSession.abort(); the cancellation
                                                    // primitive the runtime invokes from a one-shot
                                                    // loomAbort.signal listener registered at spawn time
                                                    // (CreateAgentSessionOptions has no signal field in the
                                                    // V1 Pi SDK pin, so the seam carries no `signal` field
                                                    // either; cancellation is wired via this method, not as
                                                    // a passthrough option). Per pi-integration-contract.md
                                                    // (Conversation drive — subagent mode, Subagent session
                                                    // lifecycle, Cancellation source).
  dispose(): Promise<void>;                         // idempotent; delegates to AgentSession.dispose()
}
```

Forward references on the loom-internal seams (`Diagnostic`, `ModelRequest`, `ModelResponse`, `ParsedLoom`, `SubagentSpawnOptions`, `AgentEvent`) are deliberate: H2 owns the *method shape* every seam exposes; the leaf that introduces each *data shape* (H3, V5/V6, V3/V17, V12a respectively) lands the data shape and narrows the placeholder type at that point. The signatures of the spec-anchored seams (`FileSystem`, `FileWatcher`, `Clock`, `Checkpoint`, `SchemaValidator` / `CompiledValidator`) are not redeclared here; refining them is a spec change.

**Tests.**
- `makeRuntime` returns a runtime whose collaborators are exactly the ones passed in (identity check).
- Each interface listed in `Adds.` (both the spec-anchored seams imported from the spec corpus and the loom-internal seams declared inline) has a TypeScript-level conformance test: the in-memory fake is assigned to the interface variable, and a separate `expectType<>` assertion confirms the production adapter (when introduced in H4) matches the same interface. The spec-anchored seams cite their HTML id (`fakefilesystem--filesystem-interface`, `filewatcher-interface`, `clock--fakeclock-interface`, `checkpoint-seam`, `schemavalidator-interface`) in the test file's header comment so a future spec edit can be traced back through the conformance test.
- `FakeModelClient` raises if its response queue is empty (no silent default).
- `FakeFileSystem.readText`, `FakeFileSystem.readdir`, and `FakeFileSystem.lstat` for an unknown path each reject with an error whose `.code` is `"ENOENT"` (matching the spec-side rejection contract); seeded `EACCES` / `EPERM` / `ENOTDIR` paths surface their seeded `.code` unchanged. `FakeFileSystem.exists` resolves `false` for `ENOENT` and rejects for any other seeded `.code`.
- `FakeFileWatcher.watch(roots, handler)` records the supplied roots; `FakeFileWatcher.emit(event)` synchronously invokes every attached handler in attach order with the supplied `FileWatchEvent`; the `Unsubscribe` returned by `watch` removes the handler so subsequent `emit` calls do not deliver to it; calling `Unsubscribe` twice is a no-op.
- `FakeDiagnosticsSink` preserves report order on drain.
- `FakeFileSystem.homedir()` returns the constructor-injected value; production `PiFileSystem.homedir()` delegates to `os.homedir()`.
- `FakeClock.advance(ms)` synchronously fires every timer whose deadline has elapsed in deadline order; equal-deadline timers fire in registration order; `clearTimeout` is a no-op for already-fired handles; `now()` returns the fake's accumulated time and is *not* implicitly advanced by `advance`. Production `WallClock.now()` delegates to `performance.now()` and `WallClock.setTimeout` / `clearTimeout` delegate to the global timer functions.
- A grep-test asserts that `Date.now`, `performance.now`, `Date.prototype.getTime`, and the global `setTimeout` / `clearTimeout` do not appear anywhere under `src/` outside the `WallClock` adapter (parallel to the existing `process.env.HOME` ban for `homedir()`).
- `FakeToolHost.getCommandContext()` returns `undefined` until `setCommandContext(ctx)` is called, then returns the most recently set `ctx`; `setCommandContext(undefined)` resets it to `undefined`.
- `FakeSubagentSpawner.spawn(...)` returns a handle whose `dispose()` is observable (call-count probe) and idempotent (a second `dispose()` is a no-op, per [Pi Integration Contract — Subagent session lifecycle](../spec_topics/pi-integration-contract.md)).
- `FakeSubagentSpawner.spawn(...)` returns a handle whose `abort()` is observable (call-count probe); the production `PiSubagentSession.abort()` delegates to the underlying `AgentSession.abort()`. The production-side wiring that arms a one-shot `loomAbort.signal` listener to invoke this method is owned by H4 / V12a (see [`h4-extension-shell.md`](./h4-extension-shell.md) and [`v12-subagent.md`](./v12-subagent.md)).
- `FakeSubagentSpawner.spawn(...)` rejects with a typed error when no scripted spawn response is queued (matches the existing "no silent default" rule for `FakeModelClient`).
- `FakeCheckpoint.before(kind, site)` records each call (kind, site, ordinal) and returns the per-call hook supplied by the test (default: an already-resolved promise); a test that registers a hook firing `loomAbort.abort()` from inside `before(...)` observes the abort *at* that checkpoint, and a test that registers the same hook on the *previous* checkpoint observes the abort *between* checkpoints (the no-retroactive-rewrite test pattern from [Cancellation](../spec_topics/cancellation.md)). The production `NoOpCheckpoint.before(...)` is asserted to return an already-resolved promise on every call and to record nothing.
- Every fake has at least one negative-path test.

**Deps.** H1.

**Ships when.** Every interface has a fake, `import` graph forbids fakes leaking into `src/`.
