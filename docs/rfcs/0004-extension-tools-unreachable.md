# RFC 0004 — Extension-registered tools are unreachable from Theta

- **Status:** draft
- **Scope:** runtime tool resolution / production composition root (host
  integration). Not a theta 1.x language-surface change on its own — the
  `tools:` grammar and the callable-set contract already admit any Pi tool name;
  the gap is in what the production `resolvePiTool` resolves against.
- **Affects:** callable-set resolution, the composition-root `resolvePiTool`
  wiring, the query-time tool loop's active set, `theta/load/unknown-tool`.

## Summary

A Pi session exposes two kinds of tools to the model: the host built-ins
(`read`, `bash`, `grep`, `edit`, `write`, `ls`, `find`) and any tools an
installed extension registers (e.g. a project's `finding_store`, `projection`).
A Theta can reach only the first kind. Naming an extension-registered tool in
`tools:` does not resolve — it raises `theta/load/unknown-tool` and the theta
does not register. Because the frozen callable set is the sole tool boundary for
**both** code-side calls and the query-time tool loop, an extension tool is
reachable from a theta by **no** path: not `finding_store({ ... })?` in code,
and not as a tool offered to the model inside an `@` query.

This RFC states the problem and its cost. It does not settle on one fix; several
are sketched under *Possible solutions*.

## The problem

### What a theta can resolve today

`tools:` entries resolve through the callable-set resolver, whose injected
`resolvePiTool` dependency is documented as resolving "a Pi tool name against
the host tool registry" (`src/parser/callable-set.ts`, `CallableSetDeps`). The
production composition root, however, injects a `resolvePiTool` backed by a
fixed switch over seven names:

```
// src/extension/production-composition.ts
function builtinToolDefinition(name, cwd) {
  switch (name) {
    case "grep": ... case "read": ... case "find": ... case "ls":
    case "bash": ... case "edit": ... case "write": ...
    default: return undefined;          // every other name → unresolved
  }
}
function resolvePiTool(name, ctx) {
  const definition = builtinToolDefinition(name, ctx.cwd);
  if (definition === undefined) return undefined;
  ...
}
```

Any name that is not one of the seven returns `undefined`. In the callable-set
resolver an `undefined` Pi-tool resolution is a load-time rejection
(`theta/load/unknown-tool`, `src/parser/callable-set.ts`), and "the theta
registers iff no error-severity diagnostic was raised" — so a single
`tools: [finding_store]` entry un-registers the whole theta. Under `pi -p`, an
un-registered slug falls through to the ordinary agent, which can be mistaken
for a working run.

### The callable set is the only door, for code and for queries

The restriction is not confined to code-side calls. The query-time tool loop
installs *exactly* the theta's callable set as the model's active tools for the
query window, and the ambient session snapshot is **not** unioned in
(`src/runtime/conversation-drive.ts`: "install exactly the theta's callable set";
`src/runtime/invoke-prompt-suspend.ts`: "ambient snapshot NOT unioned in"). So a
theta cannot fall back to letting the model call the extension tool during an
`@` query either — if the tool cannot enter the callable set, it is absent from
the model's active set too.

The net: a session's own extension tools are visible to the plain agent but
invisible to every theta that agent could invoke.

### Why it costs

RFC 0002 established the tool call as the language's zero-token side-effect
channel and lifted the literal-only argument rule so that channel carries
computed values. That win is real for the seven built-ins. It does not reach the
tools that motivate most orchestration thetas: a domain pipeline's custom tools.
An orchestration theta that must drive a project's `finding_store` /
`projection` — mint an id, write a record, render a view, run a deterministic
projection — cannot call them at all. The deterministic parts of such a pipeline,
the exact work Theta exists to move out of the model, stay unreachable; the
pipeline either remains host/Markdown-driven or shells out (see *Possible
solutions*, workaround). The zero-token channel opens onto seven fixed tools, not
onto the session's actual tool set.

### A contract/implementation disagreement

`docs/reference/frontmatter.md` (§`tools`) states Pi tool names "resolve against
Pi's tool registry at load time" and the `CallableSetDeps.resolvePiTool` contract
says the same ("resolve … against the host tool registry"). The production
wiring resolves against a seven-name switch, not a registry. Either the docs
overstate the resolution surface or the wiring under-implements the contract.
STYLE.md requires reporting a spec/implementation disagreement rather than
papering over it; this RFC is that report. Whichever way it is reconciled is part
of the decision below.

## Non-goals

- **The tool-name literal rule.** RFC 0002 deliberately kept tool *names*
  literal to preserve load-time callable-set resolution and the arity check.
  This RFC does not ask for dynamic tool names; an extension tool would still be
  named by a literal in `tools:` / at the call site.
- **`.theta` callees.** These already resolve and are unaffected.
- **New tool capabilities.** The ask is to reach tools the host already
  registers, not to invent a new effect surface.

## Possible solutions (brainstorm — not yet chosen)

Listed to frame the decision, with the trade-off that distinguishes each. None
is adopted here.

1. **Registry-backed `resolvePiTool`.** Wire the composition root's
   `resolvePiTool` to Pi's live tool registry instead of the seven-name switch —
   the shape the `CallableSetDeps` contract already describes. Smallest surface,
   closes the contract gap directly. Open: *which* registry snapshot and *when*
   (load-time resolution vs invocation-time availability); how the tool's input
   schema reaches the RFC-0002 parse-time disjointness check; determinism if the
   registry differs between two invocations.

2. **Opt-in allowlist.** Resolve against the registry only for tools a theta (or
   settings) explicitly admits — e.g. a frontmatter/settings entry that names the
   extension tools this theta may call. Keeps a permission boundary explicit at
   the cost of a second declaration surface. Open: where the allowlist lives
   (per-theta frontmatter vs `settings.theta`), and whether it duplicates
   `tools:`.

3. **Host-injected tool set.** Have the embedding host pass an explicit tool set
   into the theta composition input, rather than the composition root hard-coding
   the seven built-ins. Moves the policy to the host that owns the tools. Open:
   the composition-input shape and how discovery/`--theta` runs supply it.

4. **Distinct declaration form for host tools.** Keep built-in resolution static
   and admit registry lookups only through a separate spelling (e.g. a marked
   `tools:` entry, or a separate `host-tools:` field), so the static built-in
   set and the dynamic registry set stay visibly different. More grammar; clearer
   provenance at the call site. Open: whether the added surface earns its keep.

5. **Shell bridge (workaround, not a fix).** Expose the extension tool's function
   as a CLI and call it via the already-reachable `bash` built-in. Unblocks
   without a runtime change but adds a process boundary, forfeits the tool's typed
   argument/return contract, and re-introduces string-marshalling — the cost
   class RFC 0002 removed. Documents the gap; does not close it.

6. **Status quo — document the limitation.** Record that Theta reaches only the
   seven built-ins and that custom-tool orchestration stays host-driven. Zero
   implementation cost; leaves the motivating pipelines unable to adopt Theta and
   the contract/impl disagreement unresolved.

## Open questions

- **Resolution time vs availability time.** Callable sets resolve at load; tool
  *execution* happens at invocation. Is an extension tool resolved against the
  registry at load (and pinned), or checked at invocation? What is the behaviour
  when a tool present at load is absent at invocation (and vice versa)?
- **Schema for the parse-time check.** RFC 0002's provable-disjointness parse
  check needs the tool's registered input schema. Do extension tools expose a
  schema in the shape the schema-subset mapping consumes?
- **Permission / safety.** Code-driven, zero-token dispatch of arbitrary
  extension tools (which may write files, call networks, spawn processes) removes
  the model-turn checkpoint. Is a capability/permission gate required, and at
  which layer (host, settings, frontmatter)?
- **Determinism and reproducibility.** A registry that varies by installed
  extensions makes a theta's load outcome depend on ambient state. How is that
  reconciled with reproducible discovery / diagnostics?
- **Subagent isolation.** How does the chosen mechanism interact with
  `subagent fn ... with { tools }` and the frozen no-ambient-inheritance rule?

## Prior art in this repository

- The resolution contract this RFC measures against:
  `src/parser/callable-set.ts` (`CallableSetDeps.resolvePiTool` — "resolve …
  against the host tool registry"; `theta/load/unknown-tool`).
- The production wiring that narrows it to seven names:
  `src/extension/production-composition.ts` (`builtinToolDefinition`,
  `resolvePiTool`).
- The callable set as the query-time active set:
  `src/runtime/conversation-drive.ts`, `src/runtime/invoke-prompt-suspend.ts`
  (ambient snapshot not unioned in).
- The documented resolution surface: [Frontmatter — `tools`](../reference/frontmatter.md).
- The zero-token channel this gap bounds: [RFC 0002 — Computed field values in
  Pi-tool arguments](./0002-computed-tool-arguments.md).
- A same-shaped Pi extension-API gap already tracked:
  [`argumentHint` on `RegisteredCommand`](../spec_topics/future-considerations/surface-extensions.md)
  — an extension-registered command surface Theta cannot reach, deferred to a
  future contributor.
