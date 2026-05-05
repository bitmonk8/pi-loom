# V14 — Tool calls and discovery

## V14a — `tools:` parsing (Pi tool names, comma form)

- **Spec.** [Parameters and Frontmatter](../spec_topics/frontmatter.md) (`tools:`).
- **Adds.** `tools: read, grep, bash` short form; resolution against Pi tool registry at load time.
- **Tests.** Each known tool resolves; unknown tool name → `loom/load/unknown-tool` error.
- **Deps.** V3a.
- **Ships when.** Pi tools listable in frontmatter.

## V14b — `tools:` YAML list form with `as` rename

- **Spec.** [Parameters and Frontmatter](../spec_topics/frontmatter.md) (`tools:`).
- **Adds.** YAML list form; `tool as alias` renames; alias must be lowercase-first identifier-shaped; collision with another entry's final name is load error.
- **Tests.** List form parses; rename works; PascalCase alias rejected; collision diagnostics name both entries.
- **Deps.** V14a.
- **Ships when.** Renaming works.

## V14c — Bare `<name>(args)` call from loom code

- **Spec.** [Tool Calls](../spec_topics/tool-calls.md), [Expression Sublanguage — Object construction](../spec_topics/expressions.md), [Grammar Appendix — Loom literal sublanguage](../spec_topics/grammar.md#loom-literal-sublanguage), [Pi Integration Contract — Tool execution from loom code](../spec_topics/pi-integration-contract.md), [Invocation — Static resolution](../spec_topics/invocation.md#static-resolution).
- **Adds.** Resolves post-rename name against `tools:` table. For registered loom callees, argument type-checking and return-type inference at the call site use the callee's parsed form from the per-load-pass static-resolution cache (populated for `tools:` entries by V15e); type mismatches surface as `loom/parse/tool-arg-type-mismatch` when statically resolvable, otherwise the runtime AJV check is the safety net. When the callee resolves to a Pi tool, the call admits a single bare-object argument written in the Loom literal sublanguage (the second documented carve-out to the bare-object-literal prohibition; same sublanguage as `params:` defaults). Multi-argument forms (`read({...}, {...})`) are `loom/parse/tool-arg-arity`; non-Pi-tool callees with bare-object arguments remain `loom/parse/bare-object-literal`. Forms outside the literal sublanguage inside the bare-object literal (operators, function calls, `let`-bound identifier references, `${...}`) are `loom/parse/tool-arg-not-literal`. Pi tool's `execute()` invoked directly with `toolCallId` prefixed `loom-direct:`. The `ctx` argument is the live `ExtensionContext` the runtime already holds, with `signal` overridden to `loomAbort.signal`, `sessionManager` overridden to the loom's current session, and `abort()` wrapped to call `loomAbort.abort()`; all other members forward unchanged.
- **Tests.** Call returns `Result<string, QueryError>`; arguments lowered to JSON with wire names; AJV validates against Pi tool's input schema; bare-object literal accepted in single-arg position for Pi-tool callees; bare-object literal in single-arg position for `let`-bound or registered-loom callees emits `loom/parse/bare-object-literal`; multi-arg form (`read({...}, {...})`) emits `loom/parse/tool-arg-arity`; each forbidden form inside the literal (operator, call, `let`-bound reference, `${...}`) emits `loom/parse/tool-arg-not-literal` naming the offending sub-expression; `ctx.signal === loomAbort.signal` (never `undefined`); `ctx.sessionManager` matches the loom's current session in both prompt mode and subagent mode; `ctx.abort()` aborts the loom's invocation and not the parent's turn; `ctx.model`, `ctx.modelRegistry`, `ctx.cwd` forward to the live host.
- **Deps.** V14a, V13c (outbound translation), V16a (literal sublanguage parser).
- **Ships when.** Loom code can call Pi tools with bare-object arguments parsed by the Loom literal sublanguage.

## V14d — Tool calls do not add a turn to conversation

- **Spec.** [Tool Calls](../spec_topics/tool-calls.md) (no conversation turn).
- **Adds.** Code-side tool call bypasses model entirely; transcript unchanged.
- **Tests.** Conversation transcript before and after `<name>()` call is identical (modulo any other queries).
- **Deps.** V14c.
- **Ships when.** Behavioural distinction from queries verified.

## V14e — Pi tool wired into `@` queries as model-callable

- **Spec.** [Parameters and Frontmatter](../spec_topics/frontmatter.md) (`tools:`), [Pi Integration Contract — Tool-registration lifetime and visibility](../spec_topics/pi-integration-contract.md), [Implementation Notes — Runtime](../spec_topics/implementation-notes.md#runtime).
- **Adds.** Same `tools:` set presented to model during query tool-call loop. Wiring is per calling-loom mode: subagent mode passes loom callees through `customTools` on `createAgentSession` plus an explicit `tools` allowlist; prompt mode registers loom callees once per unique lowered-schema hash via the registration cache and gates visibility per-query via `pi.setActiveTools` snapshot/restore in a `finally` block.
- **Tests.** Model issuing tool-use against a registered tool runs correctly; tool absent from `tools:` is unavailable to model; subagent-mode invocation triggers zero `pi.registerTool` calls and zero `pi.setActiveTools` calls on the user session; prompt-mode invocation triggers exactly one `pi.registerTool` call per unique lowered-schema hash across the extension's lifetime (second invocation with the same shape reuses the cached registration); prompt-mode active-set restoration fires on every exit path (success, `Err`, panic, cancellation); concurrent prompt-mode invocations against the same session serialise their snapshot/restore correctly (sequential per Pi's per-session turn ordering).
- **Deps.** V14a, V5e.
- **Ships when.** Same set serves both code and model.

## V14f — `CodeToolError` variant: `validation` cause

- **Spec.** [Tool Calls](../spec_topics/tool-calls.md) (failures).
- **Adds.** Code-side call with bad arguments → `Err(CodeToolError{cause:"validation"})` (wire `kind: "code_tool"`).
- **Tests.** Bad args rejected before tool runs; `validation_errors` populated.
- **Deps.** V14c.
- **Ships when.** Bad-args case has clean error.

## V14g — `CodeToolError` variant: `execution` cause

- **Spec.** [Tool Calls](../spec_topics/tool-calls.md) (failures).
- **Adds.** Tool's `execute()` throws or returns `isError:true` → `Err(CodeToolError{cause:"execution"})` (wire `kind: "code_tool"`).
- **Tests.** Both shapes; message preserved.
- **Deps.** V14c.
- **Ships when.** Tool-execution failures surface uniformly.

## V14h — `CodeToolError` variant: `cancelled` cause

- **Spec.** [Tool Calls](../spec_topics/tool-calls.md) (failures), [Cancellation](../spec_topics/cancellation.md).
- **Adds.** AbortSignal mid-call → `Err(CodeToolError{cause:"cancelled"})` (wire `kind: "code_tool"`).
- **Tests.** Pre-flight abort and mid-flight abort both surface.
- **Deps.** V14c.
- **Ships when.** Cancellation through tool calls works.

## V14i — `CodeToolError` variant: `unknown_tool` cause

- **Spec.** [Tool Calls](../spec_topics/tool-calls.md) (failures).
- **Adds.** Safety net for tools unregistered between parse and runtime (should not occur after a clean parse; production rarely hits this).
- **Tests.** Synthetic unregister between parse and runtime triggers the variant.
- **Deps.** V14c.
- **Ships when.** Safety net verified.

## V14j — `tools: []` ≡ absent `tools:`

- **Spec.** [Parameters and Frontmatter](../spec_topics/frontmatter.md) (`tools:`), [Pi Integration Contract — Tool-registration lifetime and visibility](../spec_topics/pi-integration-contract.md).
- **Adds.** Both produce empty callable set; ambient Pi tools NOT inherited. The no-inheritance invariant is enforced mechanically by the per-mode wiring rule: subagent mode passes `tools: []` as the explicit allowlist on `createAgentSession`; prompt mode's snapshot/restore swaps in `[...snapshot]` (with no loom-callable additions) for the loom's turns and restores on exit.
- **Tests.** Both shapes; model has no tools available; loom code has no `<name>(...)` callables; subagent-mode invocation with `tools: []` shows Pi's default built-in `read` / `bash` / `edit` / `write` are NOT in the spawned session's active set; prompt-mode invocation with `tools: []` shows the user session's prior active set is unchanged after restoration (snapshot equality).
- **Deps.** V14a.
- **Ships when.** Tool-inheritance footgun closed.

## V14k — Discovery: global `~/.pi/agent/looms/`

- **Spec.** [Directory Convention](../spec_topics/discovery.md).
- **Adds.** Already in M; this leaf hardens with manifest of every spec rule (non-recursive, `*.loom` only, `.warp` excluded).
- **Tests.** Recursive subdirs not discovered; non-`.loom` ignored; `.warp` not registered as command.
- **Deps.** M.
- **Ships when.** Global discovery rule-complete.

## V14l — Discovery: project `.pi/looms/`

- **Spec.** [Directory Convention](../spec_topics/discovery.md).
- **Adds.** Already in M; harden as V14k.
- **Tests.** As V14k for project root.
- **Deps.** M.
- **Ships when.** Project discovery rule-complete.

## V14m — Discovery: package `looms/` and `pi.looms`

- **Spec.** [Directory Convention](../spec_topics/discovery.md).
- **Adds.** Walk `node_modules/*/package.json` for `pi.looms` entries; also discover `looms/` directories shipped by packages.
- **Tests.** `pi.looms` array honoured; `looms/` directory honoured; both can coexist; precedence per spec.
- **Deps.** V14k.
- **Ships when.** Package-shipped looms discoverable.

## V14n — Discovery: settings file reads (`looms` array, plus the read mechanism reused by V16e for binder model)

- **Spec.** [Directory Convention](../spec_topics/discovery.md) (Settings file reads).
- **Adds.** Settings reader for `~/.pi/agent/settings.json` and `.pi/settings.json` via the injected `FileSystem` seam (Pi exposes no settings accessor for extensions). Project-over-global precedence with deep-merge for nested objects, replace for arrays and scalars. `looms` array (`string[]` of file or directory paths, with glob patterns and `!`/`+`/`-` prefixes per Pi's resource-array convention; entries resolved relative to the settings file's base directory, `~` expanded, absolute paths supported) is the V1 consumer; the same reader is reused by V16e for `looms.binderModel`.
- **Tests.** File entry registers one loom; directory entry registers all `*.loom` in the directory non-recursively (subdirectories not walked, `.warp` files ignored); glob entry matches multiple files; `!pattern` excludes; `+path`/`-path` force-include/exclude an exact path; `~` expands; relative paths resolve against the settings file's base directory; non-`.loom` file entry (or non-`.loom` glob match) emits `loom/load/invalid-extension` and does not register; non-string entry emits `loom/load/settings-invalid-entry` and other entries still process; entries that resolve to the same absolute path are deduplicated silently; project `looms` array fully replaces global `looms` array (replace, not concat); project values deep-merge over global values for nested objects; missing file treated as `{}` with a single load-time diagnostic; malformed JSON file treated as `{}` with a single load-time diagnostic and the other file still consulted.
- **Deps.** V14k, H2.
- **Ships when.** Settings-driven discovery works.

## V14o — Discovery: `--loom` CLI flag

- **Spec.** [Directory Convention](../spec_topics/discovery.md).
- **Adds.** Repeatable `--loom <path>`; takes priority over all other sources.
- **Tests.** Single flag; multiple flags; CLI overrides settings.
- **Deps.** V14k.
- **Ships when.** CLI override works.

## V14p — Source priority and shadowing warning

- **Spec.** [Directory Convention](../spec_topics/discovery.md) (priority).
- **Adds.** Five-level priority from spec; cross-source name collision: higher priority wins, warning names both paths.
- **Tests.** Each adjacent priority pair tested; warning text matches spec.
- **Deps.** V14k–V14o.
- **Ships when.** Priority rule is uniform.

## V14q — Cross-format slash collision

- **Spec.** [Directory Convention](../spec_topics/discovery.md) (cross-format collisions).
- **Adds.** `code-review.loom` + `code-review.md` (Pi prompt or subagent) → load-time error; neither registers; symmetric across `.loom`, `.md` prompt, `.md` subagent.
- **Tests.** All three pairings tested; error names both files.
- **Deps.** V14k.
- **Ships when.** Cross-format collisions caught.
