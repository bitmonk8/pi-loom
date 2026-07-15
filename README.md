# pi-loom

`pi-loom` is a [Pi Coding Agent](https://github.com/earendil-works/pi-mono)
extension that adds **Loom**, a scripting language for Pi agents. Write the
predictable parts of an agent task as code and leave only the genuinely fuzzy
parts to the model — no custom extension required.

A `.loom` file mixes ordinary code — variables, loops, conditionals, functions —
with the text you send to the model. Running a loom adds turns to a conversation:
either the caller's current one (*prompt mode*) or a fresh, isolated one
(*subagent mode*). When it succeeds it can also return a
[*final value*](./docs/reference/errors-and-results.md#final-value-fn-5) — the
loom's last expression, or the value you `return` — which callers can use and pass
back across the subagent boundary. Looms can't write files, use the network, or
spawn processes on their own; those effects happen only through the Pi tools a
loom is allowed to call (its
[callable set](./docs/reference/frontmatter.md#tools-callable-set)).
`.warp` files are library modules that share Loom's grammar and types and are
imported by `.loom` files; they are never run directly.

## The problem

Pi's built-in `prompt` and `subagent` features are just Markdown with some
fill-in-the-blanks — static text with YAML frontmatter. They can't branch, loop,
read a model's response, carry a conversation across several turns, or hand a
typed value back to the caller. Loom does all of that: your code decides what text
goes to the model, the model's replies come back as values, and every run ends in
one of three ways — success, failure, or cancellation — defined in
[Errors and Results](./docs/reference/errors-and-results.md#terminal-outcomes-closed-set).

## Example: an agent loop

The pattern people call an *agent loop* (or a *Ralph loop*) is: run the model,
check the result, then stop or go again. The usual version is a shell loop that
re-runs the model and hopes it eventually declares itself done. In Loom the loop
is real code, so your code owns the stop condition and the model just does the
work inside each round. Each call to a subagent worker starts on a fresh context,
and the worker hands back a typed result the loop can branch on:

```loom
---
description: Re-run the worker on a fresh context until it reports done (a Ralph loop)
mode: subagent
tools:
  - ./ralph-step.loom
---
let mut round = 0
while round < 20 {
  round += 1
  let status = ralph_step()?
  if status.done {
    return status.summary
  }
}
"stopped at the 20-round ceiling"
```

The `while` bound, the `done` check, and the round ceiling are ordinary code —
not a magic "done" string grepped out of the model's prose. See
[How to write an agent loop](./docs/how-to/write-an-agent-loop.md) for the worker
file and a second, self-contained example.

## Status

Loom is at its initial version (**0.1.x**). The whole documented language works and
is tested end-to-end, but this is an early release and may still contain bugs.

Report issues against the behaviour the [Reference](./docs/reference/) defines.

## Documentation

- **[Guide](./docs/guide.md)** — how Loom works: mixing code with the text you
  send to the model, prompt vs. subagent mode, `.loom` vs. `.warp`, and the final
  value.
- **[Tutorial](./docs/tutorial.md)** — build your first loom, from an empty file
  to a working one.
- **[How-to guides](./docs/how-to/)** — short recipes for specific tasks, including
  [writing an agent loop](./docs/how-to/write-an-agent-loop.md).
- **[Reference](./docs/reference/)** — the full details: grammar, type system,
  frontmatter fields, errors and results, limits, diagnostics, and the CLI.
</content>
</invoke>
