# RFC 0001 — `subagent fn`: in-file subagent callables

- **Status:** draft
- **Scope:** theta 1.x language surface (governed by
  `../spec_topics/governance/release-version-naming.md`)
- **Affects:** grammar, type system, runtime dispatch, diagnostics

## Summary

Add a function form whose body evaluates in a fresh, isolated subagent session:

```theta
subagent fn step(objective: string) {
  @`Objective: ${objective}. Do the next task and report status.`
}
```

Calling `step(objective)` spawns a fresh subagent conversation, runs the body
there, validates the returned value, and hands it back to the caller — the same
boundary an `invoke("./step.theta", ...)` crosses today, without a second file.

## Motivation

A subagent session (a fresh, isolated conversation whose transcript is private and
discarded on return) can currently be reached in only two ways, both of which
target a separate `.theta` file by path: an `invoke("./child.theta", ...)`
expression, or a `.theta` path entry in `tools:`. There is no way to express a
subagent inline.

The consequence surfaces in the agent-loop pattern
([How to write an agent loop](../how-to/write-an-agent-loop.md)). Running each
iteration on a fresh context — the property that makes the pattern work — forces
the worker into its own file, because:

- Within one theta, every `@` query appends to the *same* conversation; a
  single-file loop accumulates one growing context instead of a fresh one per
  round.
- A `.thetalib` `fn` does not help: a query inside an imported `fn` runs against the
  *calling* theta's conversation, so it provides no isolation.

The two-file split (loop file plus worker file) is therefore not a stylistic
choice; it is the only way to get per-iteration isolation. For a short worker
this is friction with no compensating benefit, and it scatters a single logical
unit across two files.

## Proposal

Introduce a `subagent` modifier on the top-level `fn` form. A `subagent fn` is
identical to an ordinary `fn` in its parameter list, positional call form, and
inferred-and-validated return type; it differs in one respect: **its body
evaluates in a fresh subagent session** rather than in the caller's conversation.

```theta
---
description: Re-run a fresh-context step until the objective is met
mode: subagent
tools:
  - read
  - bash
---
subagent fn step(objective: string) {
  schema Progress { done: boolean, summary: string }
  let status: Progress = @`Objective: ${objective}

Inspect the project, do the single most important unfinished task toward the
objective, run the tests with bash, commit, and report whether it is now met.`?
  status
}

let mut round = 0
while round < 20 {
  round += 1
  let status = step(objective)?
  if status.done {
    return status.summary
  }
}
"stopped at the 20-round ceiling"
```

This reuses the existing `invoke` machinery — the isolation boundary, the typed
return, the `invoke`-depth ceiling, and the `InvokeCalleeError` /
`InvokeInfraError` surfaces — and reuses the existing `fn` machinery for
parameters, positional arguments, and return-type inference. The only genuinely
new element is the per-call session boundary in the middle of a file.

### Semantics

- **Isolation.** Each call to a `subagent fn` spawns a fresh, isolated session,
  private and discarded on return, exactly as an `invoke`d subagent-mode theta.
- **Arguments cross by value, explicitly.** Parameters are passed positionally, as
  with `fn` and `invoke`. There is no lexical capture of the enclosing scope
  (consistent with the language's existing decision that functions are not
  first-class and closures do not exist). Only values that can cross the session
  boundary are admissible as arguments — the same constraint `invoke` arguments
  already meet.
- **Return.** The return type is inferred from the body tail, as for `fn`, and
  validated at the boundary. An explicit return schema uses the same annotation
  the body already supports (a typed `let`/tail), so no `invoke<Type>` analogue is
  required.
- **Query targeting.** `@` queries in a `subagent fn` body target the spawned
  session, not the enclosing conversation. This is the central runtime change: the
  evaluator's current session switches on entry and restores on return.
- **Ceilings.** A `subagent fn` call is a countable frame under the depth-32
  `invoke` ceiling ([Hard ceilings](../reference/hard-ceilings.md)). A
  `subagent fn` cannot reference itself, so a single such function introduces no
  unbounded recursion.
- **Not discoverable.** A `subagent fn` is never slash-discoverable and never a
  `tools:` entry; it is reachable only by call from within its own file. Discovery,
  slash registration, and `.thetalib` import rules are unchanged.

### Session configuration

The open design question is where the spawned session's configuration comes from —
`system`, `model`, `tools` (callable set), `tool_loop`, `respond_repair`. Two
sub-options, presented for the reviewer to choose between:

- **B1 — inherit.** The `subagent fn` inherits the enclosing theta's configuration.
  Simplest to specify and implement; the callable set and model are shared, and no
  new syntax is introduced. The cost: the body cannot narrow its callable set or
  set its own `system` prompt.
- **B2 — per-function config.** A small config clause, e.g.
  `subagent fn step(objective: string) with { tools: [read, bash], system: "…" } { … }`.
  Expressive, but introduces frontmatter-equivalent parsing, validation, and
  diagnostics in a new position. Recommended only if inheritance proves too
  restrictive in practice.

The recommendation is to ship **B1** first and treat **B2** as a follow-on once
demand for per-function configuration is demonstrated.

## Alternatives considered

- **Anonymous `subagent { … }` expression.** An inline block with no name.
  Equivalent isolation, but it must answer the same configuration question as B2
  and additionally define argument passing for an unnamed block. A named
  `subagent fn` reuses the entire existing `fn` argument/return story and reads
  more clearly at the call site. Rejected in favour of the named form.
- **Inline lambda passed to a builtin**, e.g. `invoke_inline(() => { … })`.
  Requires first-class functions and closures, which the language explicitly
  excludes (`theta/parse/function-as-value`; arrow functions and higher-order forms
  are unsupported). Rejected: it contradicts a standing language decision.
- **A context-reset primitive** (a `for … fresh { … }` loop, or `reset_context()`)
  that clears the *current* theta's history between iterations instead of spawning
  a child. This is a different feature: same session cleared, not an isolated
  child — so no private transcript, no independent `system`/`model`, and no typed
  return across a boundary. Out of scope for this RFC; recorded here so it is not
  conflated with subagent isolation.

## Open questions

- B1 vs B2 for session configuration (see above).
- Does a `subagent fn` inherit `tool_loop` / `respond_repair` from the enclosing
  theta, or take the theta 1.0 defaults? Inheritance is the proposed default under
  B1.
- Diagnostics: a body that fails to parse or type-check is a load-time error in the
  enclosing file. Confirm the code reuses or mirrors `theta/load/callee-has-errors`
  rather than coining a parallel inline code.
- Interaction with `mode: prompt`. A `subagent fn` spawns a subagent regardless of
  the enclosing theta's mode; confirm this is admissible from a prompt-mode theta, or
  restrict it.
- Whether the `subagent` modifier is also admissible on a `.thetalib` `fn` (a shared
  in-library subagent helper), and if so, which conversation its queries target
  when imported.

## Prior art in this repository

- Isolation, typed return, and depth accounting:
  [Return a typed value across a subagent boundary](../how-to/return-a-typed-value-across-a-subagent-boundary.md),
  [Hard ceilings](../reference/hard-ceilings.md).
- The pattern this RFC serves:
  [How to write an agent loop](../how-to/write-an-agent-loop.md).
- `fn` grammar and return-type inference: [Grammar](../reference/grammar.md),
  [Type system](../reference/type-system.md).
