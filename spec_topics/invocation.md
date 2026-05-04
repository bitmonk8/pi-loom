# Invocation

A loom may invoke another loom via the built-in `invoke` expression. This is the only way for a `.loom` to spawn or attach to another `.loom`'s execution by an inline path literal; for repeated or model-exposed callees, register the path in frontmatter `tools:` and call by name (see [Tool Calls](./tool-calls.md)). `import` is reserved for `.warp` library code.

```loom
let plan: Plan = invoke<Plan>("./plan.loom", topic, depth)?
let _ = invoke("./logger.loom", note)?
```

**Resolution.** `path` is a string literal, resolved at parse time relative to the calling loom's directory. It must end in `.loom`, and uses forward-slash separators only — a backslash inside the path literal is a parse error per the "Path literals" rule in [Lexical Structure](./lexical.md). Dynamic dispatch (a runtime-computed path) is not supported in V1.

<a id="static-resolution"></a>

**Static resolution.** A callee referenced by a literal `invoke("./path.loom", ...)` or by a `.loom` entry in `tools:` is *statically resolvable* if the runtime can open, parse, and lower the callee file during the calling loom's load pass. Static resolution is performed by a single per-load-pass parse cache shared by every parse-time check that needs the callee's source: argument-type checking ([Argument binding](#argument-binding) below; [Tool Calls — Argument shape](./tool-calls.md)), cross-loom return-type inference ([Function Definitions — Loom return type](./functions.md), [Tool Calls — Return type](./tool-calls.md)), and cycle detection ([Cycle detection](#cycle-detection) below). The walk is transitive: callees referenced by a callee's own literal `invoke` paths and `.loom` entries in `tools:` are loaded into the same cache. Each visited file is parsed once per pass and its diagnostics are aggregated into the entry loom's drain (sorted by `(file, line, col)` per [Diagnostics — Multi-error reporting](./diagnostics.md)).

A callee whose file is unreadable, fails to parse, or fails its own structural checks is *not statically resolvable* and the parent emits `loom/load/callee-has-errors` at the referencing site, naming the callee and listing the underlying diagnostic codes via `related`. The severity is per surface: a `tools:` `.loom` entry pointing at an unparseable callee is **error** — the callable cannot be created, and the parent loom does not register; a literal `invoke("./path.loom", ...)` whose callee is unparseable is **warning** — the parent registers, static checks against that callee are skipped, and the runtime AJV check is the safety net for the skipped checks. The asymmetry is deliberate: `tools:` exposes the callee as a callable to both code and model and therefore requires a working callable at registration; `invoke(...)` is a code-side reference that already has a documented runtime-AJV fallback. The callee, when later loaded as its own slash command, fails to register on its own merits — the warning-vs-error distinction matters only for the parent's cross-reference. Hot-reload of a callee re-runs the static-resolution pass for every parent that has the callee in its reachable graph (see [Implementation Notes — Runtime](./implementation-notes.md)).

<a id="argument-binding"></a>

**Typed return.** `invoke<Schema>(...)` annotates the expected return type; the runtime AJV-validates the child's return value against the schema. Untyped `invoke(...)` returns `Result<null, QueryError>` — the runtime discards the child's return value entirely. Use `invoke<Schema>` whenever the caller needs the value back; the untyped form exists only for fire-and-forget orchestration (loggers, side-effect-only children).

**Argument binding.** Arguments bind positionally to the callee's `params:` in declaration order, with each argument type-checked against the param's declared schema. Type mismatches surface as `loom/parse/invoke-arg-type-mismatch` when the callee is statically resolvable per [Static resolution](#static-resolution) above; otherwise the runtime AJV check is the safety net. The LLM-driven binder used at the slash-command boundary (see [Slash-Command Argument Binding](./binder.md)) does not run here — `invoke(...)` callers pass already-typed values.

**Cross-mode semantics.** The callee's mode controls whether it gets a fresh conversation or attaches to its caller's current conversation. The caller's mode is irrelevant to that decision — a subagent's "current conversation" is already its own private one, so a prompt-mode child writing into it stays inside that private context.

| Caller mode | Callee mode | Effect |
|---|---|---|
| prompt | prompt | Child attaches to caller's current conversation (the user's session). Child's queries are user-visible turns. |
| prompt | subagent | Child spawns a fresh isolated conversation; only the return value reaches the caller. |
| subagent | prompt | Child attaches to the caller's current conversation — which is the caller subagent's own private one. Nothing leaks to the grandparent. |
| subagent | subagent | Child spawns a fresh isolated conversation, sibling to (not nested under) the caller's. |

**Tools and model.** The child uses *its own* frontmatter `model`, `tools`, and `system`. The caller's settings are not inherited. Same justification as for queries: tool/model/system inheritance produces surprise.

For the **prompt → prompt** cell of the cross-mode matrix above (child attaches to the caller's existing user session), the child's `tools:` set replaces the parent's *for the duration of the child's body*: on entry the runtime snapshots the user session's active-tool set and calls `pi.setActiveTools(childCallableSet)`; on return (or any `Err` / panic / cancellation) it restores the snapshot in a `finally` block. This is the same snapshot/restore protocol used per-query in [Pi Integration Contract — Tool-registration lifetime and visibility](./pi-integration-contract.md), generalised to the child's whole body. Nested prompt → prompt invokes stack: each level snapshots the immediately-prior set and restores it on return, so peeling back the call stack restores the user session's original active-tool set in reverse order. The child's queries see only the child's tools; on child return, the parent's queries again see the parent's tools — the interleaving is invisible to the user other than via tool-call cards in the transcript.

For the other three cells (any callee in subagent mode, or a subagent caller invoking a prompt-mode child into the subagent's own private session), the child's tools reach the model through `customTools` on the spawned `AgentSession` and die with the session; no active-set mutation is involved.

**Failures.** `invoke` returns `Result<T, QueryError>`. Invoke-specific failures surface via two new `QueryError` variants in addition to the query-time variants from [Query](./query.md):

```loom
schema InvokeFailure {
  kind: "invoke_failure",
  message: string,
  callee_path: string,
  reason: "load_failure"     // callee file unreadable
        | "parse_failure"    // callee file failed to parse
        | "validation"       // typed invoke: child's return value failed AJV validation
        | "panic"            // callee aborted via runtime panic (see Errors and Results)
}

schema InvokeCalleeError {
  kind: "invoke_callee_error",
  message: string,
  callee_path: string,
  inner: QueryError                          // the original Err the callee returned
}
```

Folding invoke errors into `QueryError` keeps the loom's error type uniform: a function or loom that mixes `?` on queries and `?` on invokes still has a single `Result<_, QueryError>` return type and a single `match` shape to handle. `InvokeCalleeError.inner` is recursive — `QueryError` referencing itself via `$ref` is exactly the discriminated-union pattern from [Schema Declarations](./schemas.md), applied to Loom's own runtime type. V1 has no configurable per-invoke timeout; cancellation is the only externally driven termination.

<a id="cycle-detection"></a>

**Cycle detection.** Invocation cycles are detected at parse time by walking the per-load-pass static-resolution graph defined under [Static resolution](#static-resolution) above. If `A.loom` invokes `B.loom` invokes `A.loom`, the second discovery is `loom/load/invocation-cycle` ("invocation cycle: A → B → A"). Unresolvable callees (those that produced a `loom/load/callee-has-errors` diagnostic) terminate their own walk arm — the walker treats the unresolvable node as a leaf and the existing diagnostic at every parent invoke or `tools:` site is the visible trace; cycles routed through such a node are not detected until the underlying file is fixed and the watcher re-walks the graph (per [Implementation Notes — Runtime](./implementation-notes.md)). Recursion through subagent-mode looms is allowed where each invocation spawns a fresh sibling conversation; recursion through prompt-mode looms is allowed but must terminate via control flow, just like ordinary function recursion.
