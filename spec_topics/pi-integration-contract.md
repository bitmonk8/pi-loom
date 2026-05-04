# Pi Integration Contract

The runtime depends on a small, named surface from `@mariozechner/pi-coding-agent`. Each item below is the V1 contract; behaviour outside this surface is non-load-bearing and may be revised without spec changes.

**Extension entry point.** A single Pi extension module (`pi-loom/index.ts`) exporting the standard `default function (pi: ExtensionAPI)` factory. The factory:

1. Subscribes to `resources_discover` to collect `.loom` and `.warp` paths from every Pi discovery source ([Directory Convention](./discovery.md)).
2. Parses and registers each `.loom` file via `pi.registerCommand(name, { description, getArgumentCompletions, handler })` — one slash command per loom.
3. Optionally registers a file watcher (chokidar) over the discovered roots; on change, calls `ctx.reload()` from a `_loom-reload` command to re-discover and re-register.

**Per-loom registration.** For each `.loom` file:

- The slash-command `handler` runs the binder (when applicable) and then the loom interpreter against the appropriate conversation.
- If the loom is referenced by another loom's `tools:` (i.e., it is exposed as a tool to a model), the runtime *also* registers it via `pi.registerTool({ name, description, parameters: <params-schema-as-typebox>, execute })`. The `execute` adapter spawns the loom as a subagent invocation (equivalent to `invoke<T>(path, ...)`) and returns its result envelope.

**Conversation drive — prompt mode.** The loom interpreter drives the user's session by:

- Issuing untyped queries via `ctx.sendUserMessage(text)` (or `{ deliverAs: "steer" }` if the agent is mid-stream) and awaiting completion by subscribing to `agent_end`. The accumulated assistant text from the final turn is the `Ok(string)` value.
- Issuing typed queries via a synthesised one-shot tool (`__loom_respond_<schema-hash>`) registered just before the query and unregistered immediately after. The tool's `parameters` is the lowered query schema; the tool's `execute` records the validated args and resolves the query's promise. The runtime forces tool-use for that single turn (provider-specific: `tool_choice: { type: "tool", name }` for Anthropic, `tool_choice: { type: "function", function: { name } }` for OpenAI) via the `before_provider_request` hook. The forced-tool-use approach is universal across providers and produces a transparent assistant turn the user can see — matching prompt-mode's "every turn is user-visible" philosophy.

**Conversation drive — subagent mode.** The loom interpreter spawns a fresh in-process `AgentSession` via `createAgentSession({ tools, model, sessionManager: SessionManager.inMemory(), resourceLoader, ... })`. The session inherits the loom's `system:` prompt (from frontmatter, with `${param}` interpolation resolved at conversation-creation time), the loom's `tools:` set (lowered to Pi tool definitions; registered loom callees are themselves wrapped via `defineTool`), and the loom's `model`. Queries against the spawned session use the same `prompt(text)` + `agent_end` listener pattern as prompt mode, including the synthesised one-shot tool for typed queries. The session is in-memory only — the spec mandates the transcript stays private to the loom and is discarded when the loom returns.

**System notes.** Echoes (binder result), `Err`-in-prompt-mode notes, and binder failure messages are emitted via `pi.sendMessage({ customType: "loom-system-note", content, display: true, details: { ... } }, { triggerTurn: false })`. A `pi.registerMessageRenderer("loom-system-note", ...)` formats them as one-line, dim-styled notes in the transcript. The custom-type approach (rather than `ctx.ui.notify(...)`) is chosen because notes need to persist in the session transcript for replay and `/tree` navigation, not just appear transiently.

**Tool execution from loom code.** Code-side `<name>(args)` calls invoke the Pi tool's `execute(toolCallId, params, signal, onUpdate, ctx)` directly:

- `toolCallId` is a synthesised UUID prefixed `loom-direct:`.
- `params` is the loom value lowered to JSON (wire names applied).
- `signal` is the loom's current `AbortSignal`.
- `onUpdate` is a no-op (V1 does not surface streaming partial results to loom code).
- `ctx` is a synthesised `ExtensionContext` with `cwd`, `signal`, `sessionManager` (the loom's current session — Pi's user session in prompt mode, the spawned subagent session in subagent mode), and a no-op `ui`.

The tool's returned `{ content, isError }` becomes the V1 string return value: the concatenated text content blocks, returned as `Ok(string)` if `!isError` and `Err(QueryError { kind: "tool_call", cause: "execution", ... })` otherwise.

**Cancellation source.** As described in [Cancellation](./cancellation.md), the loom's `AbortSignal` is `ctx.signal` from the slash-command handler (or the `signal` parameter to a tool-exposed loom's `execute`). All downstream queries, tool calls, and child invokes derive from this signal.

**Discovery API.** The loom extension uses Pi's standard `resources_discover` event to enumerate sources, mirroring the prompt-template discovery pattern. The complete list of sources and priorities is in [Directory Convention](./discovery.md).
